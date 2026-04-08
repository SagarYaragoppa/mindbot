import requests
import numexpr as ne

# =========================
# ✅ LOCAL OLLAMA CONFIG
# =========================
OLLAMA_URL = "http://localhost:11434/api/generate"
AGENT_MODEL = "llama3:8b"

def calculate(expression: str) -> str:
    """Helper to solve math problems."""
    try:
        return str(ne.evaluate(expression))
    except Exception as e:
        return f"Error: {e}"

def run_agent_task(task_instruction: str, model_name: str = "llama3:8b", temperature: float = 0.7) -> str:
    """
    Executes a task instruction using local Ollama.
    Simplified version: No LangChain, no complex ReAct loops.
    """
    try:
        # We ignore the passed model_name if it looks like a cloud model (from old routes)
        # but the user said "Use model: phi3 (fallback: llama3:8b)" for LLM service.
        # For agent task, we'll try llama3:8b as default.
        
        payload = {
            "model": model_name if ":" in model_name else AGENT_MODEL,
            "prompt": f"You are a helpful AI agent. Task: {task_instruction}",
            "stream": False,
            "options": {
                "temperature": temperature
            }
        }
        
        response = requests.post(OLLAMA_URL, json=payload, timeout=90)
        
        if response.status_code == 200:
            return response.json().get("response", "No agent response content.")
        else:
            return f"Agent Error ({response.status_code}): {response.text}"

    except Exception as e:
        return f"Local Agent Error: {str(e)}"
