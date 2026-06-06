"""
时空信箱 (Time-Space Mailbox) - FastAPI Backend
================================================
PWA-based AR geolocation emotional messaging platform.

Run: uvicorn app.main:app --reload --port 8000
"""
import os
import sys
import time
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

from .config import config
from .database import init_db, DB_PATH

# ── Load .env ────────────────────────────────────────────────────
load_dotenv()

# ── Routers ──────────────────────────────────────────────────────
from .routers import (
    capsules, users, ai, upload, admin, responses, favorites, collections,
)


# ── Lifespan ─────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    t0 = time.time()
    print(f"🚀 时空信箱 Backend starting... [env={config.environment}]")

    # Initialize database
    await init_db()

    # Ensure upload directories exist
    for subdir in ["photos", "voices", "voice_clones", "thumbnails"]:
        (config.upload_dir / subdir).mkdir(parents=True, exist_ok=True)

    elapsed = time.time() - t0
    print(f"✅ Backend ready! (startup in {elapsed:.2f}s)")
    print(f"   DB: {DB_PATH}")
    print(f"   Uploads: {config.upload_dir}")
    print(f"   CORS: {config.cors_origins}")
    print(f"   AI emotion: {'enabled' if config.ai_emotion_enabled else 'fallback'}")
    print(f"   AI voice:   {'enabled' if config.ai_voice_enabled else 'fallback'}")
    yield
    print("👋 Backend shutting down...")


# ── App ──────────────────────────────────────────────────────────
app = FastAPI(
    title="时空信箱 API",
    description="Time-Space Mailbox - AR Geolocation Messaging Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# ── Middleware: UTF-8 ────────────────────────────────────────────
@app.middleware("http")
async def utf8_encoding_middleware(request, call_next):
    response = await call_next(request)
    if "content-type" not in response.headers:
        response.headers["Content-Type"] = "application/json; charset=utf-8"
    return response

# ── CORS ─────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static files ─────────────────────────────────────────────────
config.upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(config.upload_dir)),
          name="uploads")

# ── Routers ──────────────────────────────────────────────────────
app.include_router(users.router)
app.include_router(capsules.router)
app.include_router(ai.router)
app.include_router(upload.router)
app.include_router(admin.router)
app.include_router(responses.router)
app.include_router(favorites.router)
app.include_router(collections.router)


# ── Health check (enhanced) ──────────────────────────────────────
@app.get("/api/health")
async def health_check():
    """Health check — returns DB, media, and config status."""
    import aiosqlite

    health = {
        "status": "ok",
        "service": "时空信箱 API",
        "version": "1.0.0",
        "environment": config.environment,
    }

    # DB status
    try:
        db = await aiosqlite.connect(str(DB_PATH))
        cursor = await db.execute("SELECT COUNT(*) FROM capsules")
        capsule_count = (await cursor.fetchone())[0]
        cursor = await db.execute("SELECT COUNT(*) FROM users")
        user_count = (await cursor.fetchone())[0]
        await db.close()
        health["database"] = {
            "status": "connected",
            "capsules": capsule_count,
            "users": user_count,
        }
    except Exception as e:
        health["database"] = {"status": "error", "detail": str(e)}

    # Media uploads status
    try:
        photos_dir = config.upload_dir / "photos"
        voices_dir = config.upload_dir / "voices"
        health["media"] = {
            "photos_dir_exists": photos_dir.exists(),
            "voices_dir_exists": voices_dir.exists(),
            "total_photos": len(list(photos_dir.glob("*")))
            if photos_dir.exists() else 0,
        }
    except Exception as e:
        health["media"] = {"status": "error", "detail": str(e)}

    # Config (safe subset, no secrets)
    health["config"] = config.summary()

    return health
