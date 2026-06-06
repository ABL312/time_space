package config

import (
	"os"
	"path/filepath"
	"strconv"
)

// Config holds the application configuration
type Config struct {
	Port           string
	DatabaseURL    string
	UploadDir      string
	CORSOrigins    string
	Environment    string
	MaxPhotoSizeMB int
	MaxVoiceSizeMB int
}

// Load loads configuration from environment variables
func Load() *Config {
	cfg := &Config{
		Port:           getEnvOrDefault("PORT", "8080"),
		DatabaseURL:    getEnvOrDefault("DATABASE_URL", ""),
		UploadDir:      getEnvOrDefault("UPLOAD_DIR", filepath.Join(".", "data", "uploads")),
		CORSOrigins:    getEnvOrDefault("CORS_ORIGINS", "*"),
		Environment:    getEnvOrDefault("ENVIRONMENT", "development"),
		MaxPhotoSizeMB: getEnvIntOrDefault("MAX_PHOTO_SIZE_MB", 5),
		MaxVoiceSizeMB: getEnvIntOrDefault("MAX_VOICE_SIZE_MB", 10),
	}

	// If DATABASE_URL is not set, use default SQLite database path
	if cfg.DatabaseURL == "" {
		cfg.DatabaseURL = filepath.Join(".", "data", "timespace.db")
	}

	// Ensure upload directory exists
	os.MkdirAll(cfg.UploadDir, 0755)

	return cfg
}

// getEnvOrDefault returns the value of the environment variable or the default value
func getEnvOrDefault(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

// getEnvIntOrDefault returns an int from env var or default
func getEnvIntOrDefault(key string, defaultVal int) int {
	value := os.Getenv(key)
	if value == "" {
		return defaultVal
	}
	v, err := strconv.Atoi(value)
	if err != nil || v < 1 {
		return defaultVal
	}
	return v
}