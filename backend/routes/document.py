from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
import os
import shutil

from backend.services.rag_service import index_document, clear_index
from backend.core.text_utils import sanitize_text, safe_print
from backend.models.database import get_db, User
from backend.services.auth_service import get_current_user


router = APIRouter()

# Folder to store uploaded files
UPLOAD_DIR = "backend/data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Maximum allowed upload size (10 MB)
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB


# -------------------------------
# UPLOAD DOCUMENT API
# -------------------------------
@router.post("/upload-doc")
def upload_document(
    file: UploadFile = File(...),
    model: str = "mistral-small-latest",
    provider: str = "mistral",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # 🔒 Auth guard
):
    file_path = None
    try:
        # Validate file type
        if not file.filename.endswith((".pdf", ".txt")):
            raise HTTPException(
                status_code=400,
                detail="Only PDF and TXT files are supported"
            )

        # ── File size validation ──────────────────────────────────────────
        # Read the full content once so we can check size before writing.
        contents = file.file.read()
        if len(contents) > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum allowed size is {MAX_UPLOAD_BYTES // (1024 * 1024)} MB."
            )

        # Save file
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            buffer.write(contents)

        safe_path = sanitize_text(file_path)
        safe_print(f"File saved at: {safe_path}")

        # Index document (RAG) and generate summary
        chunk_count, summary = index_document(file_path, model=model, provider=provider)
        safe_print(f"Indexed chunks: {chunk_count}")

        return {
            "message": f"{chunk_count} chunks indexed successfully",
            "summary": summary
        }

    except HTTPException:
        raise  # Re-raise validation errors as-is
    except Exception as e:
        safe_error = sanitize_text(str(e))
        safe_print(f"UPLOAD ERROR: {safe_error}")
        raise HTTPException(status_code=500, detail=safe_error)
    finally:
        # Always clean up the saved file if indexing failed mid-way
        # (only remove if it exists AND an exception caused a non-return path)
        pass  # Persistent uploads are intentional; file stays after success


# -------------------------------
# LIST DOCUMENTS API
# -------------------------------
@router.get("/list-docs")
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # 🔒 Auth guard
):
    try:
        if not os.path.exists(UPLOAD_DIR):
            return {"documents": []}

        files = os.listdir(UPLOAD_DIR)
        docs = [f for f in files if f.endswith((".pdf", ".txt"))]

        return {"documents": docs}

    except Exception as e:
        safe_error = sanitize_text(str(e))
        raise HTTPException(status_code=500, detail=safe_error)


# -------------------------------
# DELETE DOCUMENT API
# -------------------------------
@router.delete("/delete-doc/{filename}")
def delete_document(
    filename: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # 🔒 Auth guard
):
    try:
        # Prevent path traversal – extract only the basename
        safe_filename = os.path.basename(filename)
        file_path = os.path.join(UPLOAD_DIR, safe_filename)

        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")

        os.remove(file_path)
        safe_print(f"Deleted file: {sanitize_text(file_path)}")

        # Reset/Clear index to keep it consistent
        clear_index()

        return {"message": "Document deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        safe_error = sanitize_text(str(e))
        safe_print(f"DELETE ERROR: {safe_error}")
        raise HTTPException(status_code=500, detail=safe_error)