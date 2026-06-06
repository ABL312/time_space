package db

import (
	"database/sql"
	"fmt"

	_ "modernc.org/sqlite"
)

// Init initializes the SQLite database with proper settings
func Init(databaseURL string) (*sql.DB, error) {
	// For modernc.org/sqlite, we need to use sqlite:// scheme
	// But we'll keep the same interface for compatibility
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
			// Log warning but don't fail
			fmt.Printf("Warning: failed to execute '%s': %v\n", setting, err)
		}
	}

	// Test connection
	err = db.Ping()
	if err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	if err := initSchema(db); err != nil {
		return nil, fmt.Errorf("failed to initialize schema: %w", err)
	}

	return db, nil
}

func initSchema(db *sql.DB) error {
	const schema = `
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

CREATE INDEX IF NOT EXISTS idx_capsules_location ON capsules(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_media_capsule ON media(capsule_id);
CREATE INDEX IF NOT EXISTS idx_interactions_capsule ON interactions(capsule_id);
CREATE INDEX IF NOT EXISTS idx_responses_capsule ON responses(capsule_id);
`
	_, err := db.Exec(schema)
	return err
}
