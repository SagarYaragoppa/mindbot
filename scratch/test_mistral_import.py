try:
    from mistralai.client import Mistral
    print("Mistral imported from mistralai.client")
except ImportError as e:
    print(f"ImportError: {e}")
