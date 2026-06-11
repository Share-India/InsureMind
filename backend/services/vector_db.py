import os
from supabase import create_client, Client
import google.generativeai as genai

# Configure Supabase
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def get_embedding(text: str):
    result = genai.embed_content(
        model="models/gemini-embedding-2",
        content=text,
        task_type="retrieval_document",
        output_dimensionality=768
    )
    return result['embedding']

def get_query_embedding(text: str):
    result = genai.embed_content(
        model="models/gemini-embedding-2",
        content=text,
        task_type="retrieval_query",
        output_dimensionality=768
    )
    return result['embedding']

def store_chunks_in_db(chunks: list):
    # Get embeddings for all chunks
    for chunk in chunks:
        chunk['embedding'] = get_embedding(chunk['content'])
        
    # Insert into Supabase
    response = supabase.table('document_chunks').insert(chunks).execute()
    return response

import numpy as np
import json

def cosine_similarity(v1, v2):
    return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))

def search_similar_chunks(query: str, top_k: int = 5, document_name: str = None):
    query_embedding = get_query_embedding(query)
    
    # Fetch all chunks (For MVP, later add user_id filter)
    q = supabase.table('document_chunks').select('id, document_name, page_number, content, embedding')
    if document_name:
        q = q.eq('document_name', document_name)
    res = q.execute()
    
    if not res.data:
        return []

    results = []
    q_emb = np.array(query_embedding)
    
    for row in res.data:
        # Parse embedding string to list if necessary
        emb_data = row['embedding']
        if isinstance(emb_data, str):
            emb_data = json.loads(emb_data)
            
        c_emb = np.array(emb_data)
        sim = cosine_similarity(q_emb, c_emb)
        
        if sim > 0.4:  # Match threshold
            results.append({
                'id': row['id'],
                'document_name': row['document_name'],
                'page_number': row['page_number'],
                'content': row['content'],
                'similarity': float(sim)
            })
            
    # Sort by highest similarity
    results.sort(key=lambda x: x['similarity'], reverse=True)
    return results[:top_k]
