from langchain_ollama import OllamaLLM

# Removed global LLM instance for dynamic Settings payload overrides
from sqlalchemy.orm import Session
from backend.models.database import ChatMessage, Conversation

# Dictionary to maintain session memories dynamically
session_memories = {}



def get_history(user_id: str):
    if user_id not in session_memories:
        session_memories[user_id] = []
    return session_memories[user_id]

def generate_chat_stream(message: str, conversation_id: int, user_id: int, db: Session, model_name: str = "llama3.1", temperature: float = 0.7):
    """Generate a streamed response token by token using custom Memory Buffer and archive to database."""
    history = get_history(str(user_id))
    dynamic_llm = OllamaLLM(model=model_name, temperature=temperature, base_url="http://localhost:11434")
    
    # Retrieve formatted string history (keep last few for context)
    context = ""
    for msg in history[-10:]:
        context += f"{msg['role']}: {msg['content']}\n"
    
    prompt = f"System: You are MindBot, an intelligent and helpful AI assistant. Refer to the previous context if necessary.\nContext:\n{context}\n\nUser: {message}\nBot:"
    
    full_response = ""
    for chunk in dynamic_llm.stream(prompt):
        full_response += chunk
        yield chunk
        
    # Persist the full response safely to the database explicitly since stream bypasses routes
    chat_msg = ChatMessage(
        conversation_id=conversation_id,
        user_id=user_id,
        message=message,
        response=full_response
    )
    db.add(chat_msg)
    
    # Auto-Titling Engine
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if conversation and conversation.title == "New Chat":
        try:
            suggested_title = dynamic_llm.invoke(f"Give a punchy, 3-word title for this user message: '{message}'. Respond with just the title, no quotes.").strip()
            conversation.title = suggested_title
        except Exception as e:
            pass  # Fail gracefully if Ollama stumbles
            
    db.commit()
    
    # Save the interaction to memory
    history.append({"role": "User", "content": message})
    history.append({"role": "Bot", "content": full_response})
    
    # Dynamic summarization to preserve context window
    if len(history) > 12:
        try:
            summary_prompt = "Summarize this conversation concisely:\n" + "\n".join([f"{m['role']}: {m['content']}" for m in history[:6]])
            summary = dynamic_llm.invoke(summary_prompt)
            # Replace oldest items with the summary
            session_memories[str(user_id)] = [{"role": "System", "content": f"Previous conversation summary: {summary}"}] + history[6:]
        except Exception:
            pass

def generate_chat_response(message: str, user_id: int = 1, model_name: str = "llama3.1", temperature: float = 0.7) -> str:
    """Fallback non-streaming response."""
    history = get_history(str(user_id))
    dynamic_llm = OllamaLLM(model=model_name, temperature=temperature, base_url="http://localhost:11434")
    context = "".join([f"{msg['role']}: {msg['content']}\n" for msg in history[-10:]])
    prompt = f"System: You are MindBot. Refer to the previous context if necessary.\nContext:\n{context}\n\nUser: {message}\nBot:"
    response = dynamic_llm.invoke(prompt)
    
    history.append({"role": "User", "content": message})
    history.append({"role": "Bot", "content": response})
    return response
