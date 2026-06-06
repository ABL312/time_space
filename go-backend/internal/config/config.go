package config

import (
	"os"
	"path/filepath"
)

// Config holds the application configuration
type Config struct {
	Port        string
	DatabaseURL string
	UploadDir   string
	CORSOrigins string
	Environment string
	QwenAPIKey  string
	QwenModel   string
}

// Load loads configuration from environment variables
func Load() *Config {
	cfg := &Config{
		Port:        getEnvOrDefault("PORT", "8080"),
		DatabaseURL: getEnvOrDefault("DATABASE_URL", ""),
		UploadDir:   getEnvOrDefault("UPLOAD_DIR", filepath.Join(".", "data", "uploads")),
		CORSOrigins: getEnvOrDefault("CORS_ORIGINS", "*"),
		Environment: getEnvOrDefault("ENVIRONMENT", "development"),
		QwenAPIKey:  getEnvOrDefault("QWEN_API_KEY", getEnvOrDefault("DASHSCOPE_API_KEY", "")),
		QwenModel:   getEnvOrDefault("QWEN_MODEL", "qwen-vl-plus"),
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
