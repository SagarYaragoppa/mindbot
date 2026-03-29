from langchain_core.messages import HumanMessage
from langchain_ollama import ChatOllama
import base64

# Requires "ollama pull llava"
llm_vision = ChatOllama(model="llava", base_url="http://localhost:11434")

def analyze_image(image_path: str, prompt: str = "Describe this image in detail.") -> str:
    """Analyzes an image using local Ollama llava model."""
    with open(image_path, "rb") as image_file:
        image_data = base64.b64encode(image_file.read()).decode("utf-8")
        
    message = HumanMessage(
        content=[
            {"type": "text", "text": prompt},
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{image_data}"},
            },
        ]
    )
    
    response = llm_vision.invoke([message])
    return response.content
