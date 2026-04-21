from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys
import os

# Add the parent directory to sys.path so we can import from backend models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.models.database import init_db

from backend.core.security import limiter
from backend.core.text_utils import setup_unicode_stdout, sanitize_text

# Configure stdout/stderr for Unicode safety
setup_unicode_stdout()

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

# Initialize database
init_db()

app = FastAPI(title="MindBot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "https://mindbot-gold.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    safe_exc = sanitize_text(str(exc))
    print(f"CRITICAL UNHANDLED ERROR: {safe_exc}")
    traceback.print_exc()
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": safe_exc},
    )

@app.get("/")
def root():
    return {"status": "ok", "message": "MindBot backend running"}

from backend.routes import chat, document, auth, admin

app.include_router(auth.router, prefix="/auth")
app.include_router(chat.router)
app.include_router(document.router)
app.include_router(admin.router)


