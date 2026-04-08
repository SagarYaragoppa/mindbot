from langchain_ollama import OllamaLLM
from langchain_google_genai import ChatGoogleGenerativeAI
import os
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from backend.models.database import ChatMessage, Conversation

load_dotenv()

# Dictionary to maintain session memories dynamically
session_memories = {}

def get_llm(model_name: str = "llama3.1", temperature: float = 0.7):
    """Factory to get Google Gemini API explicitly."""
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("ERROR: GOOGLE_API_KEY not found in environment for LLM Service.")
        raise ValueError("GOOGLE_API_KEY environment variable is required but not set.")

    # Enforce using gemini-1.0-pro universally
    gemini_model_name = "gemini-1.0-pro"
    return ChatGoogleGenerativeAI(model=gemini_model_name, temperature=temperature, google_api_key=api_key)

def get_history(user_id: str):
    if user_id not in session_memories:
        session_memories[user_id] = []
    return session_memories[user_id]

def generate_chat_stream(message: str, conversation_id: int, user_id: int, db: Session, model_name: str = "llama3.1", temperature: float = 0.7):
    """Generate a streamed response token by token using custom Memory Buffer and archive to database."""
    history = get_history(str(user_id))
    llm = get_llm(model_name=model_name, temperature=temperature)
    
    # Retrieve formatted string history (keep last few for context)
    context = ""
    for msg in history[-10:]:
        context += f"{msg['role']}: {msg['content']}\n"
    
    prompt = f"System: You are MindBot, an intelligent and helpful AI assistant. Refer to the previous context if necessary.\nContext:\n{context}\n\nUser: {message}\nBot:"
    
    full_response = ""
    try:
        # Standardize streaming across different LLM types
        if hasattr(llm, "stream"):
            for chunk in llm.stream([("user", prompt)]):
                content = chunk.content if hasattr(chunk, "content") else str(chunk)
                full_response += content
                yield content
        else:
            # Fallback for LLMs that don't support stream or have different interface
            content = llm.invoke([("user", prompt)])
            full_response = content.content if hasattr(content, "content") else str(content)
            yield full_response
    except Exception as e:
        import traceback
        print("Error during streaming generation:", traceback.format_exc())
        error_msg = f"\n[Backend Connection Error]: {str(e)}"
        full_response += error_msg
        yield error_msg
        
    # Persist the full response safely to the database
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
            title_prompt = f"Give a punchy, 3-word title for this user message: '{message}'. Respond with just the title, no quotes."
            res = llm.invoke(title_prompt)
            suggested_title = res.content if hasattr(res, 'content') else str(res)
            conversation.title = suggested_title.strip()
        except Exception:
            pass  # Fail gracefully
            
    db.commit()
    
    # Save the interaction to memory
    history.append({"role": "User", "content": message})
    history.append({"role": "Bot", "content": full_response})
    
    # Dynamic summarization to preserve context window
    if len(history) > 12:
        try:
            summary_prompt = "Summarize this conversation concisely:\n" + "\n".join([f"{m['role']}: {m['content']}" for m in history[:6]])
            res = llm.invoke(summary_prompt)
            summary = res.content if hasattr(res, 'content') else str(res)
            # Replace oldest items with the summary
            session_memories[str(user_id)] = [{"role": "System", "content": f"Previous conversation summary: {summary}"}] + history[6:]
        except Exception:
            pass

def generate_chat_response(message: str, user_id: int = 1, model_name: str = "llama3.1", temperature: float = 0.7) -> str:
    """Fallback non-streaming response."""
    history = get_history(str(user_id))
    llm = get_llm(model_name=model_name, temperature=temperature)
    context = "".join([f"{msg['role']}: {msg['content']}\n" for msg in history[-10:]])
    prompt = f"System: You are MindBot. Refer to the previous context if necessary.\nContext:\n{context}\n\nUser: {message}\nBot:"
    
    res = llm.invoke(prompt)
    response = res.content if hasattr(res, 'content') else str(res)
    
    history.append({"role": "User", "content": message})
    history.append({"role": "Bot", "content": response})
    return response
