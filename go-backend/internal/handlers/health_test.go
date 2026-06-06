package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time-space-go/internal/config"
)

func TestHealthHandler(t *testing.T) {
	// Create a temporary directory for uploads
	tempDir := t.TempDir()

	// Create a test config
	cfg := &config.Config{
		Port:        "8080",
		DatabaseURL: "../data/timespace.db",
		UploadDir:   tempDir, // Use the temporary directory
		CORSOrigins: "*",
		Environment: "test",
	}

	// Create a mock database (we won't actually connect to a real database in tests)
	// In a real test, you might use a library like sqlmock to mock the database

	// Create a request to pass to our handler
	req, err := http.NewRequest("GET", "/api/health", nil)
	if err != nil {
		t.Fatal(err)
	}

	// Create a ResponseRecorder to record the response
	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(HealthHandler(cfg, nil)) // Pass nil for database in test

	// Our handlers satisfy http.Handler, so we can call their ServeHTTP method
	// directly and pass in our Request and ResponseRecorder
	handler.ServeHTTP(rr, req)

	// Check the status code is what we expect
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("Handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	// Check the content type is what we expect
	expectedContentType := "application/json"
	if contentType := rr.Header().Get("Content-Type"); contentType != expectedContentType {
		t.Errorf("Handler returned unexpected Content-Type: got %v want %v",
			contentType, expectedContentType)
	}

	// Check the response body is what we expect
	var response HealthResponse
	err = json.Unmarshal(rr.Body.Bytes(), &response)
	if err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	// Validate response fields
	if response.Status != "ok" {
		t.Errorf("Expected Status to be 'ok', got '%s'", response.Status)
	}

	if response.Service != "go-backend" {
		t.Errorf("Expected Service to be 'go-backend', got '%s'", response.Service)
	}

	if response.Version != "1.0.0" {
		t.Errorf("Expected Version to be '1.0.0', got '%s'", response.Version)
	}

	if response.Environment != "test" {
		t.Errorf("Expected Environment to be 'test', got '%s'", response.Environment)
	}

	// Since we passed nil for database, db.status should be "unknown"
	if response.DB["status"] != "unknown" {
		t.Errorf("Expected DB status to be 'unknown', got '%s'", response.DB["status"])
	}

	// Since we're using a temporary directory, media status should be "ok"
	if response.Media["status"] != "ok" {
		t.Errorf("Expected Media status to be 'ok', got '%s'", response.Media["status"])
	}

	if response.Config["database_url_set"] != true {
		t.Errorf("Expected Config.database_url_set to be true, got '%v'", response.Config["database_url_set"])
	}

	if response.Config["upload_dir"] != tempDir {
		t.Errorf("Expected Config.upload_dir to be '%s', got '%s'", tempDir, response.Config["upload_dir"])
	}
}
