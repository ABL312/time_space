package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoad(t *testing.T) {
	// Save original environment variables
	originalPort := os.Getenv("PORT")
	originalDatabaseURL := os.Getenv("DATABASE_URL")
	originalUploadDir := os.Getenv("UPLOAD_DIR")
	originalCORSOrigins := os.Getenv("CORS_ORIGINS")
	originalEnvironment := os.Getenv("ENVIRONMENT")

	// Clean up environment variables
	defer func() {
		os.Setenv("PORT", originalPort)
		os.Setenv("DATABASE_URL", originalDatabaseURL)
		os.Setenv("UPLOAD_DIR", originalUploadDir)
		os.Setenv("CORS_ORIGINS", originalCORSOrigins)
		os.Setenv("ENVIRONMENT", originalEnvironment)
	}()

	tests := []struct {
		name             string
		port             string
		databaseURL      string
		uploadDir        string
		corsOrigins      string
		environment      string
		expectedPort     string
		expectedDatabase string
		expectedUpload   string
		expectedCORS     string
		expectedEnv      string
	}{
		{
			name:             "default values",
			port:             "",
			databaseURL:      "",
			uploadDir:        "",
			corsOrigins:      "",
			environment:      "",
			expectedPort:     "8080",
			expectedDatabase: filepath.Join(".", "data", "timespace.db"),
			expectedUpload:   filepath.Join(".", "data", "uploads"),
			expectedCORS:     "*",
			expectedEnv:      "development",
		},
		{
			name:             "custom values",
			port:             "9090",
			databaseURL:      "/custom/path.db",
			uploadDir:        "/custom/uploads",
			corsOrigins:      "http://localhost:3000",
			environment:      "production",
			expectedPort:     "9090",
			expectedDatabase: "/custom/path.db",
			expectedUpload:   "/custom/uploads",
			expectedCORS:     "http://localhost:3000",
			expectedEnv:      "production",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Set environment variables
			os.Setenv("PORT", tt.port)
			os.Setenv("DATABASE_URL", tt.databaseURL)
			os.Setenv("UPLOAD_DIR", tt.uploadDir)
			os.Setenv("CORS_ORIGINS", tt.corsOrigins)
			os.Setenv("ENVIRONMENT", tt.environment)

			// Load config
			cfg := Load()

			// Assert values
			if cfg.Port != tt.expectedPort {
				t.Errorf("Expected Port %s, got %s", tt.expectedPort, cfg.Port)
			}

			if cfg.DatabaseURL != tt.expectedDatabase {
				t.Errorf("Expected DatabaseURL %s, got %s", tt.expectedDatabase, cfg.DatabaseURL)
			}

			if cfg.UploadDir != tt.expectedUpload {
				t.Errorf("Expected UploadDir %s, got %s", tt.expectedUpload, cfg.UploadDir)
			}

			if cfg.CORSOrigins != tt.expectedCORS {
				t.Errorf("Expected CORSOrigins %s, got %s", tt.expectedCORS, cfg.CORSOrigins)
			}

			if cfg.Environment != tt.expectedEnv {
				t.Errorf("Expected Environment %s, got %s", tt.expectedEnv, cfg.Environment)
			}
		})
	}
}