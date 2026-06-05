"""
Database setup and connection management.
Uses aiosqlite for async SQLite access.
"""
import aiosqlite
import os
from pathlib import Path

# Database file path
DB_DIR = Path(__file__).parent.parent / "data"
DB_PATH = DB_DIR / "timespace.db"

# SQL schema
SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar_url TEXT,
    interest_tags TEXT,  -- JSON array: ["校园回忆","家庭传承","人生感悟"]
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS capsules (
    id TEXT PRIMARY KEY,
    author_id TEXT REFERENCES users(id),
    
    -- Location
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    geohash TEXT NOT NULL,
    location_name TEXT,
    
    -- Content
    message TEXT NOT NULL,
    voice_url TEXT,
    voice_clone_url TEXT,
    voice_sample_url TEXT,
    
    -- Emotion analysis (AI-generated)
    emotion_tags TEXT,  -- JSON: ["怀旧","温暖","感恩"]
    sentiment TEXT,     -- positive/neutral/negative
    emotion_intensity REAL,
    emotion_summary TEXT,
    
    -- Visibility
    visibility TEXT DEFAULT 'public',  -- public/private/link_only
    target_user_id TEXT,
    
    -- Metadata
    mood_tag TEXT,
    open_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,
    capsule_id TEXT REFERENCES capsules(id),
    type TEXT NOT NULL,  -- photo/video/audio
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS interactions (
    id TEXT PRIMARY KEY,
    capsule_id TEXT REFERENCES capsules(id),
    user_id TEXT REFERENCES users(id),
    action TEXT NOT NULL,  -- open/reply/react
    reaction TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast nearby queries
CREATE INDEX IF NOT EXISTS idx_capsules_geohash ON capsules(geohash);
CREATE INDEX IF NOT EXISTS idx_capsules_location ON capsules(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_media_capsule ON media(capsule_id);
CREATE INDEX IF NOT EXISTS idx_interactions_capsule ON interactions(capsule_id);
CREATE INDEX IF NOT EXISTS idx_interactions_user ON interactions(user_id);
"""


async def get_db() -> aiosqlite.Connection:
    """Get a database connection. Creates DB file and tables if needed."""
    DB_DIR.mkdir(parents=True, exist_ok=True)
    db = await aiosqlite.connect(str(DB_PATH))
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    return db


async def init_db():
    """Initialize database schema (call on app startup)."""
    DB_DIR.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(str(DB_PATH)) as db:
        await db.executescript(SCHEMA_SQL)
        await db.commit()
    print(f"✅ Database initialized at {DB_PATH}")
