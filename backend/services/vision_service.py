import requests
import base64

# =========================
# ✅ LOCAL OLLAMA VISION
# =========================
OLLAMA_URL = "http://localhost:11434/api/generate"
VISION_MODEL = "llava"

def analyze_image(image_path: str, prompt: str = "Describe this image in detail.") -> str:
    """
    Analyzes an image using local Ollama llava model via raw HTTP request.
    Requires: ollama pull llava
    """
    try:
        with open(image_path, "rb") as image_file:
            image_data = base64.b64encode(image_file.read()).decode("utf-8")
            
        payload = {
            "model": VISION_MODEL,
            "prompt": prompt,
            "images": [image_data],
            "stream": False,
            "options": {
                "num_predict": 200,
                "temperature": 0.7
            }
        }
        
        response = requests.post(OLLAMA_URL, json=payload, timeout=120)
        
        if response.status_code == 200:
            return response.json().get("response", "No vision response content.")
        else:
            return f"Ollama Vision Error ({response.status_code}): {response.text}"

    except Exception as e:
        return f"Local Vision Error: {str(e)}"
