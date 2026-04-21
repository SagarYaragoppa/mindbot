import mistralai
print(dir(mistralai))
try:
    from mistralai import Mistral
    print("Mistral imported successfully")
except ImportError as e:
    print(f"ImportError: {e}")
