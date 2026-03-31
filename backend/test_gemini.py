import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
import sys

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

def test_gemini():
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("❌ GOOGLE_API_KEY not found")
        return
    
    print(f"Checking Gemini connection with key: {api_key[:5]}...{api_key[-4:]}")
    
    try:
        llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash-001", google_api_key=api_key)
        response = llm.invoke("Hi MindBot, speak in one word only.")
        print(f"✅ Success! Gemini responded: {response.content}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    test_gemini()
