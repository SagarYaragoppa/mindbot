import requests
try:
    print("Trying to register Admin...")
    r = requests.post("https://mindbot-1.onrender.com/auth/register", json={"username":"Admin", "password":"admin123"})
    print("Register Status:", r.status_code)
    print("Register Response:", r.text)
except Exception as e:
    print("Register Error:", e)

try:
    print("\nTrying to log in as Admin...")
    r = requests.post("https://mindbot-1.onrender.com/auth/login", json={"username":"Admin", "password":"admin123"})
    print("Login Status:", r.status_code)
    print("Login Response:", r.text)
except Exception as e:
    print("Login Error:", e)
