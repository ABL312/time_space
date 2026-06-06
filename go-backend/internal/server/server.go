package server

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"time"

	"time-space-go/internal/config"
	"time-space-go/internal/handlers"
)

// Server wraps the HTTP server with our application dependencies
type Server struct {
	httpServer *http.Server
	config     *config.Config
	db         *sql.DB
}

// New creates a new Server instance
func New(cfg *config.Config, database *sql.DB) *Server {
	return &Server{
		config: cfg,
		db:     database,
	}
}

// Start starts the HTTP server
func (s *Server) Start() error {
	// Create router
	mux := http.NewServeMux()

	// Register health check endpoint
	mux.HandleFunc("/api/health", handlers.HealthHandler(s.config, s.db))

	// Serve static files from uploads directory
	fs := http.FileServer(http.Dir(s.config.UploadDir))
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", fs))

	// Apply middleware
	var handler http.Handler = mux
	handler = handlers.CORSMiddleware(s.config.CORSOrigins)(handler)
	handler = handlers.TimeoutMiddleware(30 * time.Second)(handler)

	// Create HTTP server
	s.httpServer = &http.Server{
		Addr:    ":" + s.config.Port,
		Handler: handler,
	}

	log.Printf("Starting server on port %s", s.config.Port)
	return s.httpServer.ListenAndServe()
}

// Stop gracefully shuts down the server
func (s *Server) Stop() error {
	if s.httpServer == nil {
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	return s.httpServer.Shutdown(ctx)
}
