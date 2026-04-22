from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, Form
import shutil
import os
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from backend.models.database import get_db, ChatMessage, Conversation, User
from backend.services.llm_service import generate_chat_response, generate_chat_stream
from backend.services.agent_service import run_agent_task
from backend.services.auth_service import get_current_user
from backend.core.security import limiter
from backend.services.rag_service import query_rag
from backend.core.text_utils import sanitize_text, safe_print


from fastapi.responses import StreamingResponse

router = APIRouter()

# =========================
# MODELS
# =========================
class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[int] = None
    model: Optional[str] = "phi3"
    provider: Optional[str] = "mistral"
    temperature: float = 0.7


import time

class ChatResponse(BaseModel):
    reply: str
    latency_ms: Optional[int] = None
    model: Optional[str] = None
    provider: Optional[str] = None


# =========================
# CONVERSATIONS
# =========================
@router.post("/conversations")
def create_conversation(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    conv = Conversation(user_id=current_user.id, title="New Chat")
    db.add(conv)
    db.commit()
    db.refresh(conv)

    return {
        "id": conv.id,
        "title": conv.title,
        "created_at": conv.created_at
    }


@router.get("/conversations")
def get_conversations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    convs = db.query(Conversation)\
        .filter(Conversation.user_id == current_user.id)\
        .order_by(Conversation.created_at.desc())\
        .all()

    return [
        {
            "id": c.id,
            "title": c.title,
            "created_at": c.created_at
        } for c in convs
    ]


@router.get("/conversations/{conversation_id}/messages")
def get_conversation_messages(conversation_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    conv = db.query(Conversation)\
        .filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        ).first()

    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = db.query(ChatMessage)\
        .filter(ChatMessage.conversation_id == conversation_id)\
        .order_by(ChatMessage.timestamp.asc())\
        .all()

    return [
        {
            "id": m.id,
            "message": m.message,
            "response": m.response,
            "timestamp": m.timestamp
        } for m in messages
    ]


@router.delete("/conversations/{conversation_id}/messages")
def clear_conversation_messages(conversation_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    conv = db.query(Conversation)\
        .filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        ).first()

    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # 1. Clear database messages
    db.query(ChatMessage)\
        .filter(ChatMessage.conversation_id == conversation_id)\
        .delete()
    db.commit()

    # 2. Clear in-memory buffers
    from backend.services.llm_service import conversation_memory
    if conversation_id in conversation_memory:
        del conversation_memory[conversation_id]

    return {"message": "Conversation history cleared successfully"}




# =========================
# CHAT (CLOUD FAST)
# =========================
@router.post("/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        start_time = time.time()
        conversation_id = request.conversation_id

        # Create new conversation if not exists
        if conversation_id is None:
            conv = Conversation(user_id=current_user.id, title="New Chat")
            db.add(conv)
            db.commit()
            db.refresh(conv)
            conversation_id = conv.id

        # Generate cloud response
        reply = generate_chat_response(
            request.message,
            model=request.model,
            provider=request.provider,
            conversation_id=conversation_id
        )

        # Guarantee a valid string and sanitize
        if not reply:
            reply = "Something went wrong. Please try again."
        reply = sanitize_text(reply, remove_emojis=True)

        # Save to DB
        chat_msg = ChatMessage(
            conversation_id=conversation_id,
            user_id=current_user.id,
            message=request.message,
            response=reply
        )
        db.add(chat_msg)
        db.commit()

        latency = int((time.time() - start_time) * 1000)

        return ChatResponse(
            reply=reply, 
            latency_ms=latency, 
            model=request.model, 
            provider=request.provider
        )

    except Exception as e:
        safe_error = sanitize_text(str(e))
        safe_print(f"ERROR [chat_endpoint]: {safe_error}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {safe_error}")


# =========================
# RAG (ASK DOCUMENTS)
# =========================
@router.post("/ask-rag")
def ask_rag(request: ChatRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        start_time = time.time()
        if not request.message:
            raise HTTPException(status_code=400, detail="No query provided")

        # 1. Generate RAG response with combined memory
        response = query_rag(
            request.message,
            conversation_id=request.conversation_id,
            model=request.model,
            provider=request.provider
        )

        # Guarantee a valid string and sanitize
        if not response:
            response = "Something went wrong. Please try again."
        response = sanitize_text(response, remove_emojis=True)

        # 2. Persist to DB if conversation context exists
        if request.conversation_id:
            chat_msg = ChatMessage(
                conversation_id=request.conversation_id,
                user_id=current_user.id,
                message=request.message,
                response=response
            )
            db.add(chat_msg)
            db.commit()

        latency = int((time.time() - start_time) * 1000)

        return {
            "response": response,
            "latency_ms": latency,
            "model": request.model,
            "provider": request.provider
        }

    except HTTPException:
        raise  # Re-raise 400/401/404 as-is
    except Exception as e:
        safe_error = sanitize_text(str(e))
        safe_print(f"ERROR in /ask-rag: {safe_error}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"RAG Error: {safe_error}")


# =========================
# STREAMING (LIKE CHATGPT)
# =========================
@router.post("/chat/stream")
@limiter.limit("15/minute")
async def chat_stream_endpoint(
    request: Request,
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        conversation_id = payload.conversation_id

        if conversation_id is None:
            conv = Conversation(user_id=current_user.id, title="New Chat")
            db.add(conv)
            db.commit()
            db.refresh(conv)
            conversation_id = conv.id

        return StreamingResponse(
            generate_chat_stream(
                payload.message,
                conversation_id,
                current_user.id,
                db,
                payload.model,
                payload.temperature,
                provider=payload.provider
            ),
            media_type="text/event-stream"
        )

    except Exception as e:
        safe_error = sanitize_text(str(e))
        safe_print(f"ERROR [chat_stream_endpoint]: {safe_error}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Streaming Error: {safe_error}")


# =========================
# AGENT
# =========================
class AgentRequest(BaseModel):
    task: str
    conversation_id: Optional[int] = None
    model: Optional[str] = "phi3"
    provider: Optional[str] = "mistral"
    temperature: float = 0.7




@router.post("/agent")
async def agent_endpoint(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    image_path = None
    try:
        start_time = time.time()
        content_type = request.headers.get("Content-Type", "")
        
        if "application/json" in content_type:
            data = await request.json()
            task = data.get("task") or data.get("message")
            conversation_id = data.get("conversation_id")
            model = data.get("model", "mistral")
            provider = data.get("provider", "mistral")
            temperature = float(data.get("temperature", 0.7))
            file_obj = None
        else:
            form = await request.form()
            task = form.get("task") or form.get("message")
            conversation_id = form.get("conversation_id")
            model = form.get("model", "mistral")
            provider = form.get("provider", "mistral")
            temperature = float(form.get("temperature", 0.7) if form.get("temperature") else 0.7)
            file_obj = form.get("file")

        if not task:
            raise HTTPException(status_code=422, detail="Missing 'task' or 'message' in request")

        if conversation_id:
            conversation_id = int(conversation_id)

        if file_obj and hasattr(file_obj, "filename"):
            image_path = f"temp_agent_{file_obj.filename}"
            with open(image_path, "wb") as buffer:
                shutil.copyfileobj(file_obj.file, buffer)

        reply = run_agent_task(
            task,
            conversation_id=conversation_id,
            model=model,
            provider=provider,
            temperature=temperature,
            image_path=image_path
        )

        # Guarantee a valid string and sanitize
        if not reply:
            reply = "Something went wrong. Please try again."
        reply = sanitize_text(reply, remove_emojis=True)

        # Persist to DB if conversation context exists
        if conversation_id:
            chat_msg = ChatMessage(
                conversation_id=conversation_id,
                user_id=current_user.id,
                message=f"[Image Attached] {task}" if file_obj else task,
                response=reply
            )
            db.add(chat_msg)
            db.commit()

        latency = int((time.time() - start_time) * 1000)

        return {
            "reply": reply,
            "latency_ms": latency,
            "model": model,
            "provider": provider
        }
    except Exception as e:
        safe_error = sanitize_text(str(e))
        safe_print(f"ERROR [agent_endpoint]: {safe_error}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=safe_error)
    finally:
        # Always delete the temp image file, success or failure
        if image_path and os.path.exists(image_path):
            try:
                os.remove(image_path)
            except OSError:
                pass


# =========================
# VOICE
# =========================
@router.post("/voice-transcribe")
async def voice_endpoint(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    from backend.services.audio_service import transcribe_audio
    file_path = f"temp_{file.filename}"
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        text = transcribe_audio(file_path)
        return {"text": text}

    except Exception as e:
        safe_error = sanitize_text(str(e))
        safe_print(f"ERROR [voice_endpoint]: {safe_error}")
        raise HTTPException(status_code=500, detail=safe_error)
    finally:
        # Always delete the temp audio file
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass


# =========================
# VISION
# =========================
@router.post("/vision")
async def vision_endpoint(
    prompt: str = "What is in this image?",
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    from backend.services.vision_service import analyze_image
    file_path = f"temp_vision_{file.filename}"
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        description = analyze_image(file_path, prompt)
        return {"reply": description}

    except Exception as e:
        safe_error = sanitize_text(str(e))
        safe_print(f"ERROR [vision_endpoint]: {safe_error}")
        raise HTTPException(status_code=500, detail=safe_error)
    finally:
        # Always delete the temp image file
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass