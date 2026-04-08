from fastapi import APIRouter, UploadFile, File, HTTPException
import os
import shutil

from backend.services.rag_service import index_document, clear_index

router = APIRouter()

# Folder to store uploaded files
UPLOAD_DIR = "backend/data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# -------------------------------
# UPLOAD DOCUMENT API
# -------------------------------
@router.post("/upload-doc")
def upload_document(file: UploadFile = File(...)):
    try:
        # Validate file type
        if not file.filename.endswith((".pdf", ".txt")):
            raise HTTPException(
                status_code=400,
                detail="Only PDF and TXT files are supported"
            )

        # Save file
        file_path = os.path.join(UPLOAD_DIR, file.filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        print(f"File saved at: {file_path}")

        # Index document (RAG)
        chunk_count = index_document(file_path)

        print(f"Indexed chunks: {chunk_count}")

        return {
            "message": f"{chunk_count} chunks indexed successfully"
        }

    except Exception as e:
        print("UPLOAD ERROR:", str(e))
        raise HTTPException(status_code=500, detail=str(e))


# -------------------------------
# LIST DOCUMENTS API
# -------------------------------
@router.get("/list-docs")
def list_documents():
    try:
        if not os.path.exists(UPLOAD_DIR):
            return {"documents": []}

        files = os.listdir(UPLOAD_DIR)

        # Filter for pdf and txt
        docs = [f for f in files if f.endswith((".pdf", ".txt"))]

        return {"documents": docs}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------------------
# DELETE DOCUMENT API
# -------------------------------
@router.delete("/delete-doc/{filename}")
def delete_document(filename: str):
    try:
        # Prevent path traversal (extract only the filename)
        safe_filename = os.path.basename(filename)
        file_path = os.path.join(UPLOAD_DIR, safe_filename)

        if not os.path.exists(file_path):
            return {"error": "File not found"}

        # Delete the file
        os.remove(file_path)
        print(f"Deleted file: {file_path}")

        # Reset/Clear FAISS index to keep it consistent
        clear_index()

        return {"message": "Document deleted successfully"}

    except Exception as e:
        print("DELETE ERROR:", str(e))
        raise HTTPException(status_code=500, detail=str(e))