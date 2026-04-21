import os
from langchain_mistralai import ChatMistralAI

api_key = os.getenv("MISTRAL_API_KEY")
eval_llm = ChatMistralAI(model="mistral-small-latest", mistral_api_key=api_key) if api_key else None

def moderate_content(text: str) -> bool:
    """
    Evaluates whether a given text is safe and appropriate.
    Returns True if safe, False if unsafe.
    """
    if not eval_llm:
        return True
        
    prompt = f"Is the following text safe, friendly, and appropriate? Answer ONLY 'YES' or 'NO'. Text: '{text}'"
    try:
        response = eval_llm.invoke(prompt)
        return "YES" in response.content.upper()
    except Exception:
        # Default to safe if LLM fails
        return True

def evaluate_hallucination(context: str, answer: str) -> int:
    """
    Scores the given answer from 1 to 10 based on how well it sticks to the provided context.
    """
    if not eval_llm:
        return 5
        
    prompt = f"Score this answer from 1 to 10 based on how factually supported it is by the context. Answer ONLY with the number. \nContext: {context}\nAnswer: {answer}"
    try:
        response = eval_llm.invoke(prompt)
        content = response.content
        digits = ''.join(filter(str.isdigit, content))
        if digits:
            score = int(digits)
            return min(max(score, 1), 10)
        return 5
    except Exception:
        return 5
