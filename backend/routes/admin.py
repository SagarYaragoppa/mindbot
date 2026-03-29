from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.models.database import get_db, User, Conversation, ChatMessage
from backend.services.auth_service import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])

def get_current_admin(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

@router.get("/stats")
def get_admin_stats(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    total_users = db.query(User).count()
    total_conversations = db.query(Conversation).count()
    total_messages = db.query(ChatMessage).count()
    
    return {
        "total_users": total_users,
        "total_conversations": total_conversations,
        "total_messages": total_messages,
    }

@router.get("/users")
def list_users(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    users = db.query(User).all()
    return [
        {"id": u.id, "username": u.username, "is_admin": u.is_admin}
        for u in users
    ]

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.is_admin:
        raise HTTPException(status_code=400, detail="Cannot delete other administrators")
        
    # Explicit cascade to purge LLM history
    db.query(ChatMessage).filter(ChatMessage.user_id == user_id).delete()
    db.query(Conversation).filter(Conversation.user_id == user_id).delete()
    db.delete(user)
    db.commit()
    
    return {"status": "User and history successfully purged"}
