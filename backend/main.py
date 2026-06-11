import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load env vars
load_dotenv()

from routers import api

app = FastAPI(title="PDF Reader AI Backend")

# Allow frontend to communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "PDF Reader AI API is running"}
