from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys
import os

# Add the parent directory to sys.path so we can import from backend models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.models.database import init_db

from backend.core.security import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

# Initialize database
init_db()

app = FastAPI(title="MindBot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://mindbot-gold.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Setup CORS to allow React frontend
origins = os.getenv("ALLOW_ORIGINS", "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174").split(",")


@app.get("/")
def read_root():
    return {"message": "MindBot API is running"}

from backend.routes import chat, document, auth, admin

app.include_router(auth.router, prefix="/auth")
app.include_router(chat.router)
app.include_router(document.router)
app.include_router(admin.router)


