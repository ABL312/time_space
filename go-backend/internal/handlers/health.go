package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"os"
	"time"

	"time-space-go/internal/config"
)

// HealthResponse represents the health check response structure
type HealthResponse struct {
	Status      string                 `json:"status"`
	Service     string                 `json:"service"`
	Version     string                 `json:"version"`
	Environment string                 `json:"environment"`
	Timestamp   time.Time              `json:"timestamp"`
	DB          map[string]interface{} `json:"db"`
	Media       map[string]interface{} `json:"media"`
	Config      map[string]interface{} `json:"config"`
}

// JSONError represents a standard error response structure
type JSONError struct {
	Error  string `json:"error"`
	Detail string `json:"detail"` // Compatible with frontend client.ts which reads body.detail
	Code   int    `json:"code"`
}

// HealthHandler handles health check requests
func HealthHandler(cfg *config.Config, database *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Check database connectivity
		dbStatus := map[string]interface{}{
			"status": "unknown",
		}

		if database != nil {
			ctx, cancel := createContextWithTimeout(5)
			defer cancel()

			err := database.PingContext(ctx)
			if err != nil {
				dbStatus["status"] = "error"
				dbStatus["error"] = err.Error()
			} else {
				dbStatus["status"] = "ok"
			}
		}

		// Check media directory
		mediaStatus := map[string]interface{}{
			"status": "unknown",
		}

		if cfg.UploadDir != "" {
			_, err := os.Stat(cfg.UploadDir)
			if err != nil {
				mediaStatus["status"] = "error"
				mediaStatus["error"] = err.Error()
			} else {
				mediaStatus["status"] = "ok"
			}
		}

		response := HealthResponse{
			Status:      "ok",
			Service:     "go-backend",
			Version:     "1.0.0",
			Environment: cfg.Environment,
			Timestamp:   time.Now().UTC(),
			DB:          dbStatus,
			Media:       mediaStatus,
			Config: map[string]interface{}{
				"database_url_set": cfg.DatabaseURL != "",
				"upload_dir":       cfg.UploadDir,
			},
		}

		WriteJSON(w, http.StatusOK, response)
	}
}

// WriteJSON writes a JSON response with the proper content type
func WriteJSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
	}
}

// WriteError writes a standardized JSON error response
func WriteError(w http.ResponseWriter, statusCode int, message string) {
	errorResponse := JSONError{
		Error:  message,
		Detail: message, // Same as Error for backward compatibility with frontend client.ts
		Code:   statusCode,
	}
	WriteJSON(w, statusCode, errorResponse)
}

// createContextWithTimeout creates a context with a timeout
func createContextWithTimeout(seconds int) (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), time.Duration(seconds)*time.Second)
}
