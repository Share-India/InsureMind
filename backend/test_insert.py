import traceback
from dotenv import load_dotenv
load_dotenv('.env')
from services.vector_db import store_chunks_in_db

chunks = [{'document_name': 'test.pdf', 'page_number': 1, 'content': 'This is a test document'}]
try:
    store_chunks_in_db(chunks)
    print('Stored successfully')
except Exception as e:
    print('Error storing:')
    traceback.print_exc()
