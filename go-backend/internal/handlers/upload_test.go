package handlers

import (
	"bytes"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"time-space-go/internal/config"
)

func TestUploadPhotoJPEG(t *testing.T) {
	cfg := testUploadConfig(t)

	// Minimal valid JPEG: FF D8 FF E0 00 10 4A 46 49 46 00 01 ... (JFIF header)
	jpegData := []byte{
		0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
		0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
		0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB,
	}

	body, contentType := createMultipartBody("file", "test.jpg", "image/jpeg", jpegData)

	req := httptest.NewRequest("POST", "/api/upload/photo", body)
	req.Header.Set("Content-Type", contentType)
	rr := httptest.NewRecorder()

	handler := UploadPhoto(cfg)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var resp map[string]string
	json.Unmarshal(rr.Body.Bytes(), &resp)
	if resp["url"] == "" || !strings.HasPrefix(resp["url"], "/uploads/photos/") {
		t.Errorf("unexpected url: %s", resp["url"])
	}

	// Verify file exists on disk
	expectedPath := filepath.Join(cfg.UploadDir, "photos", resp["filename"])
	if _, err := os.Stat(expectedPath); os.IsNotExist(err) {
		t.Errorf("file not saved at %s", expectedPath)
	}
}

func TestUploadPhotoPNG(t *testing.T) {
	cfg := testUploadConfig(t)

	// Minimal valid PNG
	pngData := []byte{
		0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
		0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
		0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
		0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
		0xDE, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
		0x44, 0xAE, 0x42, 0x60, 0x82,
	}

	body, contentType := createMultipartBody("file", "test.png", "image/png", pngData)

	req := httptest.NewRequest("POST", "/api/upload/photo", body)
	req.Header.Set("Content-Type", contentType)
	rr := httptest.NewRecorder()

	handler := UploadPhoto(cfg)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestUploadPhotoInvalidType(t *testing.T) {
	cfg := testUploadConfig(t)

	fakeData := []byte("not an image")
	body, contentType := createMultipartBody("file", "test.txt", "text/plain", fakeData)

	req := httptest.NewRequest("POST", "/api/upload/photo", body)
	req.Header.Set("Content-Type", contentType)
	rr := httptest.NewRecorder()

	handler := UploadPhoto(cfg)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid type, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestUploadPhotoInvalidMagicBytes(t *testing.T) {
	cfg := testUploadConfig(t)

	// Claims to be JPEG but isn't
	fakeData := []byte{0x00, 0x01, 0x02, 0x03}
	body, contentType := createMultipartBody("file", "fake.jpg", "image/jpeg", fakeData)

	req := httptest.NewRequest("POST", "/api/upload/photo", body)
	req.Header.Set("Content-Type", contentType)
	rr := httptest.NewRecorder()

	handler := UploadPhoto(cfg)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid magic bytes, got %d", rr.Code)
	}
}

func TestUploadPhotoMissingFile(t *testing.T) {
	cfg := testUploadConfig(t)

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	writer.Close() // No file field added

	req := httptest.NewRequest("POST", "/api/upload/photo", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rr := httptest.NewRecorder()

	handler := UploadPhoto(cfg)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing file, got %d", rr.Code)
	}
}

func TestUploadPhotoSizeLimit(t *testing.T) {
	cfg := testUploadConfig(t)
	cfg.MaxPhotoSizeMB = 1 // Set very small limit for testing

	// Create oversized "jpeg"
	largeData := make([]byte, 2*1024*1024) // 2MB
	largeData[0] = 0xFF
	largeData[1] = 0xD8
	largeData[2] = 0xFF

	body, contentType := createMultipartBody("file", "large.jpg", "image/jpeg", largeData)

	req := httptest.NewRequest("POST", "/api/upload/photo", body)
	req.Header.Set("Content-Type", contentType)
	rr := httptest.NewRecorder()

	handler := UploadPhoto(cfg)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusRequestEntityTooLarge {
		t.Errorf("expected 413 for oversized file, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestUploadVoice(t *testing.T) {
	cfg := testUploadConfig(t)

	voiceData := []byte("fake audio data")
	body, contentType := createMultipartBody("file", "recording.webm", "audio/webm", voiceData)

	req := httptest.NewRequest("POST", "/api/upload/voice", body)
	req.Header.Set("Content-Type", contentType)
	rr := httptest.NewRecorder()

	handler := UploadVoice(cfg)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var resp map[string]string
	json.Unmarshal(rr.Body.Bytes(), &resp)
	if resp["url"] == "" || !strings.HasPrefix(resp["url"], "/uploads/voices/") {
		t.Errorf("unexpected url: %s", resp["url"])
	}

	expectedPath := filepath.Join(cfg.UploadDir, "voices", resp["filename"])
	if _, err := os.Stat(expectedPath); os.IsNotExist(err) {
		t.Errorf("voice file not saved at %s", expectedPath)
	}
}

func TestUploadVoiceInvalidType(t *testing.T) {
	cfg := testUploadConfig(t)

	fakeData := []byte("not audio")
	body, contentType := createMultipartBody("file", "test.txt", "text/plain", fakeData)

	req := httptest.NewRequest("POST", "/api/upload/voice", body)
	req.Header.Set("Content-Type", contentType)
	rr := httptest.NewRecorder()

	handler := UploadVoice(cfg)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid voice type, got %d", rr.Code)
	}
}

func TestUploadVoiceSizeLimit(t *testing.T) {
	cfg := testUploadConfig(t)
	cfg.MaxVoiceSizeMB = 1

	largeData := make([]byte, 2*1024*1024) // 2MB

	body, contentType := createMultipartBody("file", "large.webm", "audio/webm", largeData)

	req := httptest.NewRequest("POST", "/api/upload/voice", body)
	req.Header.Set("Content-Type", contentType)
	rr := httptest.NewRecorder()

	handler := UploadVoice(cfg)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusRequestEntityTooLarge {
		t.Errorf("expected 413 for oversized voice, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestValidateImageMagic(t *testing.T) {
	tests := []struct {
		name     string
		data     []byte
		expected bool
	}{
		{"valid JPEG", []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01}, true},
		{"valid PNG", []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D}, true},
		{"valid WebP", []byte("RIFF\x00\x00\x00\x00WEBP"), true},
		{"too short", []byte{0xFF}, false},
		{"plain text", []byte("hello world!!"), false},
		{"empty", []byte{}, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := validateImageMagic(tt.data)
			if result != tt.expected {
				t.Errorf("validateImageMagic(%v) = %v, want %v", tt.name, result, tt.expected)
			}
		})
	}
}

// ── Helpers ─────────────────────────────────────────────────────

func testUploadConfig(t *testing.T) *config.Config {
	t.Helper()
	tmpDir := t.TempDir()
	return &config.Config{
		UploadDir:      tmpDir,
		MaxPhotoSizeMB: 5,
		MaxVoiceSizeMB: 10,
		Environment:    "test",
	}
}

func createMultipartBody(fieldName, fileName, contentType string, data []byte) (*bytes.Buffer, string) {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	// Use CreatePart to set both Content-Disposition and Content-Type
	h := make(map[string][]string)
	h["Content-Disposition"] = []string{`form-data; name="` + fieldName + `"; filename="` + fileName + `"`}
	h["Content-Type"] = []string{contentType}
	part, _ := writer.CreatePart(h)
	part.Write(data)
	writer.Close()
	return body, writer.FormDataContentType()
}

// Ensure io import is used
var _ = io.EOF
