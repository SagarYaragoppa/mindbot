import os
import traceback
from backend.core.text_utils import sanitize_text, safe_response
from dotenv import load_dotenv
from langchain_mistralai import ChatMistralAI

# Explicitly load the root .env file to avoid using dummy keys from subdirectories
env_path = os.path.join(os.path.dirname(__file__), "../../.env")
load_dotenv(dotenv_path=env_path, override=True)

# Initialize Mistral client via LangChain
api_key = os.getenv("MISTRAL_API_KEY")
DEFAULT_MISTRAL_MODEL = "mistral-small-latest"

try:
    if api_key:
        llm = ChatMistralAI(model=DEFAULT_MISTRAL_MODEL, mistral_api_key=api_key)
    else:
        print("WARNING: MISTRAL_API_KEY not found. Mistral provider will be unavailable.")
        llm = None
except Exception as e:
    safe_error = sanitize_text(str(e))
    print(f"CRITICAL: Failed to initialize ChatMistralAI: {safe_error}")
    llm = None

# In-memory memory storage: conversation_id -> list of messages
MAX_HISTORY = 10
conversation_memory = {}

def generate_mistral_response(prompt: str, history: list = None) -> str:
    """
    Sends a prompt to Mistral via LangChain and returns plain text.
    """
    if not llm:
        return "Mistral API client is not initialized. Please check your MISTRAL_API_KEY."
        
    try:
        # Sanitize prompt before sending to model
        clean_prompt = sanitize_text(prompt, remove_emojis=True)
        
        # Prepare messages: history + current prompt
        from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
        
        messages = []
        for msg in (history or []):
            role = msg.get("role", "user")
            content = sanitize_text(str(msg.get("content", "")), remove_emojis=True)
            if role == "user":
                messages.append(HumanMessage(content=content))
            elif role == "assistant":
                messages.append(AIMessage(content=content))
                
        messages.append(HumanMessage(content=clean_prompt))
        
        response = llm.invoke(messages)
        text = response.content.strip()
        
        if not text:
            raise RuntimeError("Mistral API returned blank content.")

        return text
    except Exception as e:
        error_msg = sanitize_text(str(e))
        print(f"ERROR [Mistral]: {error_msg}")
        return f"Mistral API Error: {error_msg}"

def generate_response(prompt: str, provider: str = "mistral", model: str = None, history: list = None) -> str:
    """
    Main entry point for generating a response.
    Updated to only support Mistral Cloud.
    """
    # Force mistral regardless of input
    return generate_mistral_response(prompt, history=history)

def generate_chat_response(message: str, model: str = None, provider: str = "mistral", conversation_id: int = None) -> str:
    """
    Manages in-memory history and ensures NO exceptions bubble up.
    """
    try:
        clean_message = sanitize_text(message, remove_emojis=True).strip()
        if not clean_message:
            return "Please provide a valid message."

        history = []
        if conversation_id and conversation_id in conversation_memory:
            history = conversation_memory[conversation_id][-MAX_HISTORY:]

        reply = generate_response(clean_message, history=history)

        raw_reply = sanitize_text(str(reply), remove_emojis=True).strip() if reply else ""
        clean_reply = safe_response(raw_reply) if raw_reply else "Something went wrong. Please try again."

        if conversation_id:
            if conversation_id not in conversation_memory:
                conversation_memory[conversation_id] = []
            
            conversation_memory[conversation_id].append({"role": "user", "content": clean_message})
            conversation_memory[conversation_id].append({"role": "assistant", "content": clean_reply})
            
            if len(conversation_memory[conversation_id]) > MAX_HISTORY:
                conversation_memory[conversation_id] = conversation_memory[conversation_id][-MAX_HISTORY:]

        return clean_reply
    except Exception as e:
        safe_error = sanitize_text(str(e))
        print(f"CRITICAL ERROR in generate_chat_response: {safe_error}")
        return f"System Error: {safe_error}"

def generate_chat_stream(*args, **kwargs):
    """
    Streaming-compatible wrapper (simplified for cloud mode).
    """
    try:
        message = args[0] if args else kwargs.get("message", "")
        conversation_id = args[1] if len(args) > 1 else kwargs.get("conversation_id")
        
        response = generate_chat_response(message, conversation_id=conversation_id)
        yield response
        
    except Exception as e:
        safe_error = sanitize_text(str(e))
        print(f"CRITICAL ERROR in generate_chat_stream: {safe_error}")
        yield f"\n[Backend Error]: {safe_error}"