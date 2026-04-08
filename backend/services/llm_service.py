import requests

OLLAMA_URL = "http://localhost:11434/api/generate"
DEFAULT_MODEL = "phi3"
ALLOWED_MODELS = ["phi3", "tinyllama", "llama3:8b", "llava"]


def generate_chat_response(message: str, model: str = None):
    try:
        # Ensure only allowed local models are used, default to phi3
        selected_model = model if model in ALLOWED_MODELS else DEFAULT_MODEL

        # Task 5: Use dedicated system instruction for cleaner prompts
        system_instruction = "Answer clearly and completely in a concise way."

        # Task 1 & 3: Performance optimized with increased token limit
        payload = {
            "model": selected_model,
            "system": system_instruction,
            "prompt": message,
            "stream": False,
            "options": {
                "num_predict": 200,  # Increased for completeness
                "temperature": 0.7
            }
        }

        response = requests.post(OLLAMA_URL, json=payload, timeout=120)
        data = response.json()
        text = data.get("response", "").strip()
        context = data.get("context")

        # Task 2: Stop-safe response handling
        # If response ends abruptly (no punctuation or hit length limit), try a short continuation
        if data.get("done_reason") == "length" or (text and text[-1] not in ".!?;"):
            try:
                # Use context to continue generation without re-prompting
                followup = requests.post(
                    OLLAMA_URL,
                    json={
                        "model": selected_model,
                        "context": context,
                        "prompt": "",  # Continue from last token
                        "stream": False,
                        "options": {
                            "num_predict": 100,
                            "temperature": 0.5
                        }
                    },
                    timeout=60
                )
                if followup.status_code == 200:
                    more_text = followup.json().get("response", "").strip()
                    if more_text:
                        text = f"{text} {more_text}"
            except:
                pass # Fallback to original text if followup fails

        # Clean "Assistant" prefix but keep the logic robust
        if text.lower().startswith("assistant"):
            text = text[len("assistant"):].strip()
        if text.startswith(":") or text.startswith("-"):
             text = text[1:].strip()

        return text

    except Exception as e:
        return f"Local LLM Error: {str(e)}"

def generate_chat_stream(*args, **kwargs):
    """
    Flexible streaming fallback to avoid argument mismatch errors
    """
    # Extract message safely
    message = args[0] if len(args) > 0 else kwargs.get("message", "")
    model = args[4] if len(args) > 4 else kwargs.get("model", None)

    response = generate_chat_response(message, model=model)

    yield response