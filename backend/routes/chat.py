from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from backend.models.database import get_db, ChatMessage, Conversation, User
from backend.services.llm_service import generate_chat_response, generate_chat_stream
from backend.services.agent_service import run_agent_task
from backend.services.auth_service import get_current_user
from backend.core.security import limiter
from backend.services.rag_service import query_rag

from fastapi.responses import StreamingResponse

router = APIRouter()

# =========================
# MODELS
# =========================
class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[int] = None
    model: Optional[str] = "phi3"
    temperature: float = 0.7


class ChatResponse(BaseModel):
    reply: str


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


# =========================
# CHAT (🔥 CLOUD FAST)
# =========================
@router.post("/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        conversation_id = request.conversation_id

        # Create new conversation if not exists
        if conversation_id is None:
            conv = Conversation(user_id=current_user.id, title="New Chat")
            db.add(conv)
            db.commit()
            db.refresh(conv)
            conversation_id = conv.id

        # 🚀 FAST CLOUD RESPONSE
        reply = generate_chat_response(request.message, model=request.model)

        # Save to DB
        chat_msg = ChatMessage(
            conversation_id=conversation_id,
            user_id=current_user.id,
            message=request.message,
            response=reply
        )
        db.add(chat_msg)
        db.commit()

        return ChatResponse(reply=reply)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================
# RAG (ASK DOCUMENTS)
# =========================
@router.post("/ask-rag")
def ask_rag(request: dict):
    try:
        query = request.get("message", "")

        if not query:
            return {"response": "No query provided"}

        response = query_rag(query)
        return {"response": response}

    except Exception as e:
        print(f"ERROR in /ask-rag: {str(e)}")
        return {"response": f"RAG Error: {str(e)}"}


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
                payload.temperature
            ),
            media_type="text/event-stream"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================
# AGENT
# =========================
class AgentRequest(BaseModel):
    task: str
    temperature: float = 0.7


@router.post("/agent")
def agent_endpoint(request: AgentRequest, current_user: User = Depends(get_current_user)):
    try:
        reply = run_agent_task(request.task, "llama3-8b-8192", request.temperature)
        return {"reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================
# VOICE
# =========================
@router.post("/voice-transcribe")
async def voice_endpoint(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    try:
        from backend.services.audio_service import transcribe_audio
        import shutil
        import os

        file_path = f"temp_{file.filename}"

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        text = transcribe_audio(file_path)
        os.remove(file_path)

        return {"text": text}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================
# VISION
# =========================
@router.post("/vision")
async def vision_endpoint(
    prompt: str = "What is in this image?",
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    try:
        from backend.services.vision_service import analyze_image
        import shutil
        import os

        file_path = f"temp_vision_{file.filename}"

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        description = analyze_image(file_path, prompt)
        os.remove(file_path)

        return {"reply": description}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))