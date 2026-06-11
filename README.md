# InsureMind PDF Analyzer

An AI-powered Document Analyzer that uses Gemini and OCR to extract insights, clauses, and structured data from health insurance policies and complex PDFs.

## Tech Stack
- **Frontend**: React, Vite, Axios, HTML2PDF
- **Backend**: FastAPI, Python 3.10
- **AI/ML**: Google Gemini (LLM), Tesseract OCR (Optical Character Recognition)
- **Database**: Supabase
- **Orchestration**: Docker, Docker Compose

## Features
- **Intelligent PDF Upload**: Easily upload multi-page health insurance policies.
- **AI Document Analysis**: Automatically extracts key details (sum insured, copay, exclusions, waiting periods).
- **Interactive Chat**: Chat with the document using an AI assistant to get quick answers.
- **Export to PDF**: Generate a clean, branded "Document Summary" PDF with all extracted insights.
- **Admin Dashboard**: A centralized view for managing and inspecting previously analyzed documents.

## Local Development Setup

### Backend
1. `cd backend`
2. Create a `.env` file containing:
   ```env
   GEMINI_API_KEY=your_gemini_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   ```
3. Install dependencies: `pip install -r requirements.txt` (Make sure you have Tesseract OCR installed on your system).
4. Run the server: `uvicorn main:app --reload` (runs on port 8000).

### Frontend
1. `cd frontend`
2. Install dependencies: `npm install`
3. Start the dev server: `npm run dev`

## Deployment (AWS Lightsail / Docker)

This application is fully containerized for easy deployment to AWS Lightsail (or any VPS).

1. Clone the repository to your instance.
2. Create `backend/.env` with your API keys.
3. Run the orchestration:
   ```bash
   sudo docker-compose up -d --build
   ```
4. The React frontend will be served on port `80`, automatically proxying `/api` requests to the Python FastAPI backend on port `8000`.

## License
Proprietary - Share India.
