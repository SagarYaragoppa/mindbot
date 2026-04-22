import os
import requests
import traceback
from backend.core.text_utils import sanitize_text, safe_response

from dotenv import load_dotenv
from mistralai.client import Mistral

# Explicitly load the root .env file to avoid using dummy keys from subdirectories
env_path = os.path.join(os.path.dirname(__file__), "../../.env")
load_dotenv(dotenv_path=env_path, override=True)

# Initialize Mistral client safely
try:
    api_key = os.getenv("MISTRAL_API_KEY")
    client = Mistral(api_key=api_key) if api_key else None
    if not client:
        print("WARNING: MISTRAL_API_KEY not found. Mistral provider will be unavailable.")
except Exception as e:
    safe_error = sanitize_text(str(e))
    print(f"CRITICAL: Failed to initialize Mistral client: {safe_error}")
    client = None

DEFAULT_MISTRAL_MODEL = "mistral-small"

# In-memory memory storage: conversation_id -> list of messages
# Format: {"role": "user"|"assistant", "content": str}
# 10 entries = 5 user+assistant pairs (last 5 turns)
MAX_HISTORY = 10
conversation_memory = {}


def generate_mistral_response(prompt: str, history: list = None) -> str:
    """
    Sends a prompt to Mistral and returns plain text.
    Includes history if provided.
    """
    if not client:
        return "Mistral API client is not initialized. Please check your MISTRAL_API_KEY."
        
    try:
        # Sanitize prompt before sending to model
        clean_prompt = sanitize_text(prompt, remove_emojis=True)
        
        # Sanitize all history entries before sending
        clean_history = []
        for msg in (history or []):
            clean_history.append({
                "role": msg.get("role", "user"),
                "content": sanitize_text(str(msg.get("content", "")), remove_emojis=True)
            })
        
        # Prepare messages: history + current prompt
        messages = clean_history + [{"role": "user", "content": clean_prompt}]
        
        chat_response = client.chat.complete(
            model=DEFAULT_MISTRAL_MODEL,
            messages=messages,
        )
        if not chat_response or not chat_response.choices:
            raise RuntimeError("Mistral API returned an empty response.")

        text = chat_response.choices[0].message.content.strip()
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
    Always routes to Mistral.
    """
    try:
        return generate_mistral_response(prompt, history=history)
    except Exception as e:
        safe_error = sanitize_text(str(e))
        print(f"ERROR [LLM routing]: {safe_error}")
        return f"Routing Error: {safe_error}"


def generate_chat_response(message: str, model: str = None, provider: str = "mistral", conversation_id: int = None) -> str:
    """
    Drop-in replacement for old LLM calls.
    Manages in-memory history (last 5 turns) and ensures NO exceptions bubble up.
    Sanitizes all inputs before storing or sending to the model.
    """
    try:
        # 1. Sanitize the incoming message to prevent garbage input
        clean_message = sanitize_text(message, remove_emojis=True).strip()
        if not clean_message:
            return "Please provide a valid message."

        # 2. Fetch the last 5 turns (10 entries) from structured memory
        history = []
        if conversation_id and conversation_id in conversation_memory:
            # Always slice to the last MAX_HISTORY entries before passing
            history = conversation_memory[conversation_id][-MAX_HISTORY:]

        # 3. Generate response with clean message + structured history
        reply = generate_response(clean_message, provider=provider, model=model, history=history)

        # 4. Sanitize reply and run garbage detection before storing
        raw_reply = sanitize_text(str(reply), remove_emojis=True).strip() if reply else ""
        clean_reply = safe_response(raw_reply) if raw_reply else "Something went wrong. Please try again."

        # 5. Store ONLY the clean user message + clean reply (never embed previous context strings)
        if conversation_id:
            if conversation_id not in conversation_memory:
                conversation_memory[conversation_id] = []
            
            conversation_memory[conversation_id].append({"role": "user", "content": clean_message})
            conversation_memory[conversation_id].append({"role": "assistant", "content": clean_reply})
            
            # Keep only last MAX_HISTORY entries (5 turns)
            if len(conversation_memory[conversation_id]) > MAX_HISTORY:
                conversation_memory[conversation_id] = conversation_memory[conversation_id][-MAX_HISTORY:]

        return clean_reply
    except Exception as e:
        safe_error = sanitize_text(str(e))
        print(f"CRITICAL ERROR in generate_chat_response: {safe_error}")
        traceback.print_exc()
        return f"System Error: {safe_error}"


def generate_chat_stream(*args, **kwargs):
    """
    Streaming-compatible wrapper with memory support.
    Yields chunks safely and handles memory persistence.
    """
    try:
        message = args[0] if args else kwargs.get("message", "")
        conversation_id = args[1] if len(args) > 1 else kwargs.get("conversation_id")
        model = kwargs.get("model")
        provider = kwargs.get("provider", "mistral")
        
        # If called from a route that only passes positionals, try to extract model
        if len(args) >= 5:
            model = args[4]

        # Use the non-streaming logic to handle history and response generation
        response = generate_chat_response(message, model=model, provider=provider, conversation_id=conversation_id)
        yield response
        
    except Exception as e:
        safe_error = sanitize_text(str(e))
        print(f"CRITICAL ERROR in generate_chat_stream: {safe_error}")
        traceback.print_exc()
        yield f"\n[Backend Error]: {safe_error}"