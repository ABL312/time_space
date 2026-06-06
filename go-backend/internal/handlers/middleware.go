package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/rs/cors"
)

// CORSMiddleware adds CORS headers to responses
func CORSMiddleware(corsOrigins string) func(http.Handler) http.Handler {
	c := cors.New(cors.Options{
		AllowedOrigins: []string{corsOrigins},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"*"},
	})

	return c.Handler
}

// TimeoutMiddleware adds a timeout to requests
func TimeoutMiddleware(timeout time.Duration) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.TimeoutHandler(next, timeout, "Request timeout")
	}
}