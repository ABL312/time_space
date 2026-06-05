"""
时空信箱 (Time-Space Mailbox) - FastAPI Backend
================================================
PWA-based AR geolocation emotional messaging platform.

Run: uvicorn app.main:app --reload --port 8000
"""
import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

from .database import init_db
from .routers import capsules, users, ai, upload, admin

# Load environment variables
load_dotenv()

# Upload directory
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./data/uploads"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup
    print("🚀 时空信箱 Backend starting...")
    
    # Initialize database
    await init_db()
    
    # Ensure upload directories exist
    for subdir in ["photos", "voices", "voice_clones", "thumbnails"]:
        (UPLOAD_DIR / subdir).mkdir(parents=True, exist_ok=True)
    
    print("✅ Backend ready!")
    yield
    # Shutdown
    print("👋 Backend shutting down...")


app = FastAPI(
    title="时空信箱 API",
    description="Time-Space Mailbox - AR Geolocation Messaging Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# ==========================================
# CORS Configuration
# ==========================================
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# Static files (uploads)
# ==========================================
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# ==========================================
# Routers
# ==========================================
app.include_router(users.router)
app.include_router(capsules.router)
app.include_router(ai.router)
app.include_router(upload.router)
app.include_router(admin.router)


# ==========================================
# Health check
# ==========================================
@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "时空信箱 API",
        "version": "1.0.0",
    }
