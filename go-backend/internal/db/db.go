package db

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

// Init initializes the SQLite database with proper settings and schema
func Init(databaseURL string) (*sql.DB, error) {
	// Ensure parent directory exists
	dir := filepath.Dir(databaseURL)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create db directory: %w", err)
	}

	db, err := sql.Open("sqlite", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Configure SQLite settings
	settings := []string{
		"PRAGMA journal_mode=WAL;",
		"PRAGMA foreign_keys=ON;",
		"PRAGMA busy_timeout=5000;",
	}

	for _, setting := range settings {
		_, err := db.Exec(setting)
		if err != nil {
			log.Printf("Warning: failed to execute '%s': %v", setting, err)
		}
	}

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Initialize schema
	if err := initSchema(db); err != nil {
		return nil, fmt.Errorf("failed to init schema: %w", err)
	}

	return db, nil
}

// initSchema creates tables and indexes (idempotent)
func initSchema(db *sql.DB) error {
	schema := `
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar_url TEXT,
    interest_tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS capsules (
    id TEXT PRIMARY KEY,
    author_id TEXT REFERENCES users(id),
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    geohash TEXT NOT NULL,
    location_name TEXT,
    message TEXT NOT NULL,
    voice_url TEXT,
    voice_clone_url TEXT,
    voice_sample_url TEXT,
    emotion_tags TEXT,
    sentiment TEXT,
    emotion_intensity REAL,
    emotion_summary TEXT,
    visibility TEXT DEFAULT 'public',
    target_user_id TEXT,
    unlock_at TIMESTAMP,
    share_token TEXT UNIQUE,
    mood_tag TEXT,
    open_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,
    capsule_id TEXT REFERENCES capsules(id),
    type TEXT NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS interactions (
    id TEXT PRIMARY KEY,
    capsule_id TEXT REFERENCES capsules(id),
    user_id TEXT REFERENCES users(id),
    action TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS favorites (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    capsule_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, capsule_id),
    FOREIGN KEY (capsule_id) REFERENCES capsules(id)
);

CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    cover_image TEXT,
    creator_id TEXT,
    capsule_ids TEXT,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_capsules_geohash ON capsules(geohash);
CREATE INDEX IF NOT EXISTS idx_capsules_location ON capsules(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_media_capsule ON media(capsule_id);
CREATE INDEX IF NOT EXISTS idx_interactions_capsule ON interactions(capsule_id);
CREATE INDEX IF NOT EXISTS idx_interactions_user ON interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_capsules_author ON capsules(author_id);
CREATE INDEX IF NOT EXISTS idx_capsules_visibility ON capsules(visibility, created_at);
CREATE INDEX IF NOT EXISTS idx_capsules_open_emotion ON capsules(open_count, emotion_intensity);
CREATE INDEX IF NOT EXISTS idx_capsules_created ON capsules(created_at);
CREATE INDEX IF NOT EXISTS idx_responses_capsule ON responses(capsule_id, created_at);
CREATE INDEX IF NOT EXISTS idx_interactions_created ON interactions(created_at);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_favorites_capsule ON favorites(capsule_id);
CREATE INDEX IF NOT EXISTS idx_collections_creator ON collections(creator_id);
`
	_, err := db.Exec(schema)
	return err
}