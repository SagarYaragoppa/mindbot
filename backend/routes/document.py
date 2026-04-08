from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
import os
import shutil
from backend.services.rag_service import process_pdf, query_rag, delete_and_rebuild_index, list_documents
from backend.services.auth_service import get_current_user
from backend.models.database import User
from fastapi import Depends

router = APIRouter()

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
os.makedirs(DATA_DIR, exist_ok=True)

class RAGRequest(BaseModel):
    question: str

class URLRequest(BaseModel):
    url: str

@router.get("/list-docs")
def list_docs_endpoint(current_user: User = Depends(get_current_user)):
    try:
        docs = list_documents()
        return {"documents": docs}
    except Exception as e:
        import traceback
        print("Error in /list-docs:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete-doc/{filename}")
def delete_doc_endpoint(filename: str, current_user: User = Depends(get_current_user)):
    try:
        success = delete_and_rebuild_index(filename)
        if not success:
            raise HTTPException(status_code=404, detail="File not found")
        return {"status": "deleted and re-indexed"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print("Error in /delete-doc:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload-url")
def upload_url(request: URLRequest, current_user: User = Depends(get_current_user)):
    try:
        from backend.services.rag_service import process_url
        chunks = process_url(request.url)
        return {"status": "url parsed and indexed", "chunks": chunks}
    except Exception as e:
        import traceback
        print("Error in /upload-url:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload-doc")
async def upload_document(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
    file_path = os.path.join(DATA_DIR, file.filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        chunks = process_pdf(file_path)
        return {"status": "uploaded and indexed", "chunks": chunks}
    except Exception as e:
        import traceback
        print("Error in /upload-doc:", traceback.format_exc())
        import os
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ask-rag")
def ask_rag_endpoint(request: RAGRequest, current_user: User = Depends(get_current_user)):
    try:
        answer = query_rag(request.question)
        return {"reply": answer}
    except Exception as e:
        import traceback
        print("Error in /ask-rag:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
