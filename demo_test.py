import requests
import json

BASE_URL = "http://localhost:8000"

def run_demo():
    print("--- MindBot Backend Demo (CLI) ---")
    
    # 1. Register
    reg_url = f"{BASE_URL}/auth/register"
    reg_data = {"username": "demouser_cli", "password": "password123"}
    try:
        r = requests.post(reg_url, json=reg_data)
        print(f"Registration: {r.status_code} - {r.text}")
    except Exception as e:
        print(f"Registration failed (might already exist): {e}")

    # 2. Login
    login_url = f"{BASE_URL}/auth/login"
    login_data = {"username": "demouser_cli", "password": "password123"}
    r = requests.post(login_url, json=login_data)
    if r.status_code != 200:
        print(f"Login failed: {r.text}")
        return
    
    auth_resp = r.json()
    token = auth_resp['access_token']
    headers = {"Authorization": f"Bearer {token}"}
    print(f"Login successful. Token: {token[:20]}...")

    # 3. Create Conversation
    conv_url = f"{BASE_URL}/conversations"
    r = requests.post(conv_url, headers=headers)
    if r.status_code != 200:
        print(f"Failed to create conversation: {r.text}")
        return
    
    conv_id = r.json()['id']
    print(f"Created Conversation ID: {conv_id}")

    # 4. Send Message
    chat_url = f"{BASE_URL}/chat"
    chat_data = {
        "message": "Hello MindBot! This is an automated demo check. Tell me about yourself in 1 sentence.",
        "conversation_id": conv_id,
        "model": "llama3.1",
        "temperature": 0.7
    }
    print("Sending message and waiting for AI response (this may take a moment)...")
    r = requests.post(chat_url, json=chat_data, headers=headers)
    if r.status_code == 200:
        reply = r.json()['reply']
        print(f"\nMindBot Response: {reply}")
    else:
        print(f"Chat failed: {r.status_code} - {r.text}")

if __name__ == "__main__":
    run_demo()
