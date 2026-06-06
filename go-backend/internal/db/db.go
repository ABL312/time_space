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

	return db, nil
}