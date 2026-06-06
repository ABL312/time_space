"""
Database setup and connection management.
Uses aiosqlite for async SQLite access.
"""
import aiosqlite
import os
from pathlib import Path
from urllib.parse import urlparse

from .config import config


def _resolve_db_path() -> Path:
    """Resolve database file path from DATABASE_URL or default."""
    url = config.database_url
    # Parse sqlite:/// (3 slashes for relative, 4 for absolute on unix)
    # sqlite:///./data/timespace.db → path = /./data/timespace.db
    if url.startswith("sqlite:///"):
        # Relative path: sqlite:///./data/timespace.db or sqlite:///C:/abs/path
        path_str = url[len("sqlite:///"):]
        if path_str.startswith("./") or path_str.startswith(".\\"):
            # Relative to backend/ directory
            return (Path(__file__).parent.parent / path_str[2:]).resolve()
        return Path(path_str).resolve()
    elif url.startswith("sqlite://"):
        # sqlite:///path → same as above
        parsed = urlparse(url)
        return Path(parsed.path).resolve()
    # Fallback: use url as direct path
    return Path(url).resolve()

DB_PATH = _resolve_db_path()
DB_DIR = DB_PATH.parent

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
    
    -- Time lock
    unlock_at TIMESTAMP,  -- NULL means immediately available
    
    -- Share token for link sharing
    share_token TEXT UNIQUE,
    
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

CREATE TABLE IF NOT EXISTS responses (
    id TEXT PRIMARY KEY,
    capsule_id TEXT NOT NULL,
    user_id TEXT,
    nickname TEXT DEFAULT '匿名',
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (capsule_id) REFERENCES capsules(id)
);

-- Indexes for fast nearby queries (legacy)
CREATE INDEX IF NOT EXISTS idx_capsules_geohash ON capsules(geohash);
CREATE INDEX IF NOT EXISTS idx_capsules_location ON capsules(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_media_capsule ON media(capsule_id);
CREATE INDEX IF NOT EXISTS idx_interactions_capsule ON interactions(capsule_id);
CREATE INDEX IF NOT EXISTS idx_interactions_user ON interactions(user_id);

-- Performance indexes added in backend-refactor-02 (#36)
-- capsules indexes
CREATE INDEX IF NOT EXISTS idx_capsules_author ON capsules(author_id);
CREATE INDEX IF NOT EXISTS idx_capsules_visibility ON capsules(visibility, created_at);
CREATE INDEX IF NOT EXISTS idx_capsules_open_emotion ON capsules(open_count, emotion_intensity);
CREATE INDEX IF NOT EXISTS idx_capsules_created ON capsules(created_at);
-- responses index
CREATE INDEX IF NOT EXISTS idx_responses_capsule ON responses(capsule_id, created_at);
-- interactions index
CREATE INDEX IF NOT EXISTS idx_interactions_created ON interactions(created_at);

CREATE TABLE IF NOT EXISTS favorites (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    capsule_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, capsule_id),
    FOREIGN KEY (capsule_id) REFERENCES capsules(id)
);

-- favorites indexes (#36)
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_favorites_capsule ON favorites(capsule_id);

CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    cover_image TEXT,
    creator_id TEXT,
    capsule_ids TEXT,  -- JSON array of capsule IDs, ordered
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- collections index (#36)
CREATE INDEX IF NOT EXISTS idx_collections_creator ON collections(creator_id);
"""


async def get_db() -> aiosqlite.Connection:
    """Get a database connection. Creates DB file and tables if needed.
    
    Caller is responsible for closing: await db.close()
    """
    DB_DIR.mkdir(parents=True, exist_ok=True)
    db = await aiosqlite.connect(str(DB_PATH))
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    await db.execute("PRAGMA busy_timeout=5000")
    return db


async def get_db_session():
    """Async generator for FastAPI Depends — auto-closes connection.
    
    Usage:
        @app.get("/")
        async def route(db = Depends(get_db_session)):
            ...
    """
    db = await get_db()
    try:
        yield db
    finally:
        await db.close()


async def init_db():
    """Initialize database schema (call on app startup)."""
    DB_DIR.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(str(DB_PATH)) as db:
        await db.execute("PRAGMA journal_mode=WAL")
        await db.execute("PRAGMA foreign_keys=ON")
        await db.executescript(SCHEMA_SQL)
        await db.commit()
    print(f"✅ Database initialized at {DB_PATH}")
