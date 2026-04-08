import sys
import os
from backend.models.database import SessionLocal, User
from backend.services.auth_service import get_password_hash

db = SessionLocal()
users = db.query(User).all()
for u in users:
    print(f"Updating user {u.username}")
    # Using 'admin123' for admin, or 'password' for others (default fallback)
    new_pass = "admin123" if u.username == "admin" else "password"
    u.hashed_password = get_password_hash(new_pass)

db.commit()
print("Passwords updated successfully!")
db.close()
