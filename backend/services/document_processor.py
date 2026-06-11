import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import io
import os

# You may need to uncomment and set this if pytesseract cannot find the executable automatically
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200):
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks

def extract_and_chunk_pdf(file_path: str, document_name: str):
    doc = fitz.open(file_path)
    all_chunks = []
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()
        
        # Fallback to OCR if scanned
        if not text.strip():
            pix = page.get_pixmap()
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            try:
                text = pytesseract.image_to_string(img)
            except Exception as e:
                print(f"OCR failed for page {page_num}: {e}")
                
        if text.strip():
            page_chunks = chunk_text(text.strip())
            for chunk in page_chunks:
                all_chunks.append({
                    "document_name": document_name,
                    "page_number": page_num + 1,
                    "content": chunk
                })
                
    return all_chunks
