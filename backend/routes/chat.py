from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.models.database import get_db, ChatMessage, Conversation
from backend.services.llm_service import generate_chat_response
from backend.services.agent_service import run_agent_task
from backend.services.auth_service import get_current_user
from backend.models.database import User
from backend.core.security import limiter

router = APIRouter()

from typing import Optional

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[int] = None
    model: str = "llama3.1"
    temperature: float = 0.7

class ChatResponse(BaseModel):
    reply: str

@router.post("/conversations")
def create_conversation(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    conv = Conversation(user_id=current_user.id, title="New Chat")
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return {"id": conv.id, "title": conv.title, "created_at": conv.created_at}

@router.get("/conversations")
def get_conversations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    convs = db.query(Conversation).filter(Conversation.user_id == current_user.id).order_by(Conversation.created_at.desc()).all()
    return [{"id": c.id, "title": c.title, "created_at": c.created_at} for c in convs]

@router.get("/conversations/{conversation_id}/messages")
def get_conversation_messages(conversation_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id, Conversation.user_id == current_user.id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    messages = db.query(ChatMessage).filter(ChatMessage.conversation_id == conversation_id).order_by(ChatMessage.timestamp.asc()).all()
    return [{"id": m.id, "message": m.message, "response": m.response, "timestamp": m.timestamp} for m in messages]

@router.post("/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        conversation_id = request.conversation_id
        if conversation_id is None:
            conv = Conversation(user_id=current_user.id, title="New Chat")
            db.add(conv)
            db.commit()
            db.refresh(conv)
            conversation_id = conv.id

        # Generate reply using Ollama
        reply = generate_chat_response(request.message)
        
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

class AgentRequest(BaseModel):
    task: str
    model: str = "llama3.1"
    temperature: float = 0.7

from fastapi.responses import StreamingResponse

@router.post("/chat/stream")
@limiter.limit("15/minute")
async def chat_stream_endpoint(request: Request, payload: ChatRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        from backend.services.llm_service import generate_chat_stream
        
        conversation_id = payload.conversation_id
        if conversation_id is None:
            conv = Conversation(user_id=current_user.id, title="New Chat")
            db.add(conv)
            db.commit()
            db.refresh(conv)
            conversation_id = conv.id
            
        return StreamingResponse(
            generate_chat_stream(payload.message, conversation_id, current_user.id, db, payload.model, payload.temperature), 
            media_type="text/event-stream"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/agent")
def agent_endpoint(request: AgentRequest, current_user: User = Depends(get_current_user)):
    try:
        reply = run_agent_task(request.task, request.model, request.temperature)
        return {"reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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

@router.post("/vision")
async def vision_endpoint(prompt: str = "What is in this image?", file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
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
