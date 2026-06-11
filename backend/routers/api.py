import os
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
from pydantic import BaseModel

from services.document_processor import extract_and_chunk_pdf
from services.vector_db import store_chunks_in_db, search_similar_chunks
from services.llm_generator import generate_insurance_answer, extract_document_details

router = APIRouter()

from typing import List, Optional

class QueryRequest(BaseModel):
    query: str
    document_name: Optional[str] = None

class DetailsRequest(BaseModel):
    document_name: str

@router.post("/extract_details")
async def extract_details(req: DetailsRequest):
    try:
        # Search for key chunks related to schedule, dates, and plan
        schedule_chunks = search_similar_chunks("policy schedule insured name insurance company plan type sum insured premium start date end date", top_k=15, document_name=req.document_name)
        # Search specifically for covers/benefits table
        benefits_chunks = search_similar_chunks("Covers Benefits Inclusions Exclusions table features hospitalisation ambulance reset wellness donor", top_k=20, document_name=req.document_name)
        # Search specifically for exclusions
        exclusions_chunks = search_similar_chunks("What is not covered Exclusions Waiting periods Permanent exclusions", top_k=20, document_name=req.document_name)
        
        # Merge and deduplicate
        seen_content = set()
        relevant_chunks = []
        for chunk in schedule_chunks + benefits_chunks + exclusions_chunks:
            content = chunk.get('content', '')
            if content not in seen_content:
                seen_content.add(content)
                relevant_chunks.append(chunk)
                
        details = extract_document_details(req.document_name, relevant_chunks)
        return {"details": details}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def upload_documents(files: List[UploadFile] = File(...)):
    if not os.path.exists("temp"):
        os.makedirs("temp")
        
    results = []
    
    for file in files:
        file_path = f"temp/{file.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        try:
            chunks = extract_and_chunk_pdf(file_path, file.filename)
            if chunks:
                store_chunks_in_db(chunks)
            results.append({"filename": file.filename, "status": "processed", "chunks": len(chunks)})
        except Exception as e:
            results.append({"filename": file.filename, "status": "error", "error": str(e)})
        finally:
            if os.path.exists(file_path):
                os.remove(file_path)
            
    return {"message": "Upload complete", "details": results}

@router.post("/query")
async def query_documents(req: QueryRequest):
    try:
        relevant_chunks = search_similar_chunks(req.query, document_name=req.document_name)
        answer = generate_insurance_answer(req.query, relevant_chunks)
        return {"answer": answer, "sources": relevant_chunks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
