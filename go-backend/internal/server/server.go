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

	// Health check
	mux.HandleFunc("GET /api/health", handlers.HealthHandler(s.config, s.db))

	// Users
	mux.HandleFunc("POST /api/users", handlers.CreateUser(s.db))
	mux.HandleFunc("POST /api/users/register", handlers.CreateUser(s.db)) // legacy compat
	mux.HandleFunc("GET /api/users/{user_id}", handlers.GetUser(s.db))
	mux.HandleFunc("PUT /api/users/{user_id}", handlers.UpdateUser(s.db))
	mux.HandleFunc("GET /api/users/{user_id}/stats", handlers.GetUserStats(s.db))

	// Capsules — exact paths first, then parameterized
	mux.HandleFunc("POST /api/capsules", handlers.CreateCapsule(s.db))
	mux.HandleFunc("GET /api/capsules/mine", handlers.GetMyCapsules(s.db))
	mux.HandleFunc("GET /api/capsules/nearby", handlers.GetNearby(s.db))
	mux.HandleFunc("GET /api/capsules/search", handlers.SearchCapsules(s.db))
	mux.HandleFunc("GET /api/capsules/daily-recommend", handlers.GetDailyRecommend(s.db))
	mux.HandleFunc("GET /api/capsules/shared/{share_token}", handlers.GetCapsuleByShareToken(s.db))
	mux.HandleFunc("GET /api/capsules/{capsule_id}", handlers.GetCapsule(s.db))
	mux.HandleFunc("POST /api/capsules/{capsule_id}/reply", handlers.ReplyToCapsule(s.db))
	mux.HandleFunc("POST /api/capsules/{capsule_id}/regenerate-share", handlers.RegenerateShareToken(s.db))

	// File upload
	mux.HandleFunc("POST /api/upload/photo", handlers.UploadPhoto(s.config))
	mux.HandleFunc("POST /api/upload/voice", handlers.UploadVoice(s.config))

	// AI endpoints (all use fallback, no external API dependency)
	mux.HandleFunc("POST /api/ai/analyze-emotion", handlers.AnalyzeEmotion)
	mux.HandleFunc("GET /api/ai/location-context", handlers.LocationContext)
	mux.HandleFunc("POST /api/ai/scene", handlers.AnalyzeScene)
	mux.HandleFunc("POST /api/ai/voice-clone", handlers.VoiceClone)

	// Serve static files from uploads directory
	fs := http.FileServer(http.Dir(s.config.UploadDir))
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", fs))

	// Apply middleware (outermost first)
	var handler http.Handler = mux
	handler = handlers.LoggingMiddleware(handler)
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
