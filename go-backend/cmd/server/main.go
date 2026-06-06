package main

import (
	"log"
	"net/http"
	"time-space-go/internal/config"
	"time-space-go/internal/db"
	"time-space-go/internal/server"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Initialize database
	database, err := db.Init(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	// Create and start server
	srv := server.New(cfg, database)

	if err := srv.Start(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Failed to start server: %v", err)
	}
}
