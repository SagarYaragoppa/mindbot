from langchain_ollama import OllamaLLM

eval_llm = OllamaLLM(model="llama3", base_url="http://localhost:11434")

def moderate_content(text: str) -> bool:
    """
    Evaluates whether a given text is safe and appropriate.
    Returns True if safe, False if unsafe.
    """
    prompt = f"Is the following text safe, friendly, and appropriate? Answer ONLY 'YES' or 'NO'. Text: '{text}'"
    try:
        response = eval_llm.invoke(prompt)
        return "YES" in response.upper()
    except Exception:
        # Default to safe if LLM fails
        return True

def evaluate_hallucination(context: str, answer: str) -> int:
    """
    Scores the given answer from 1 to 10 based on how well it sticks to the provided context.
    10/10 means it is perfectly supported by the context without hallucination.
    """
    prompt = f"Score this answer from 1 to 10 based on how factually supported it is by the context. Answer ONLY with the number. \nContext: {context}\nAnswer: {answer}"
    try:
        response = eval_llm.invoke(prompt)
        digits = ''.join(filter(str.isdigit, response))
        if digits:
            score = int(digits)
            return min(max(score, 1), 10)
        return 5
    except Exception:
        return 5
