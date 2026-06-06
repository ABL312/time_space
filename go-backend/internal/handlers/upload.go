package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"

	"time-space-go/internal/config"
)

// Allowed MIME types
var allowedImageTypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,
}

var allowedVoiceTypes = map[string]bool{
	"audio/webm":  true,
	"audio/mpeg":  true,
	"audio/mp4":   true,
	"audio/ogg":   true,
	"audio/wav":   true,
	"audio/x-wav": true,
}

// extensionByMIME maps MIME types to file extensions
var extensionByMIME = map[string]string{
	"audio/webm":  "webm",
	"audio/mpeg":  "mp3",
	"audio/mp4":   "m4a",
	"audio/ogg":   "ogg",
	"audio/wav":   "wav",
	"audio/x-wav": "wav",
}

// UploadPhoto handles POST /api/upload/photo
func UploadPhoto(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		maxBytes := int64(cfg.MaxPhotoSizeMB) * 1024 * 1024

		// Limit request body size
		r.Body = http.MaxBytesReader(w, r.Body, maxBytes+1024) // +1KB for form overhead

		if err := r.ParseMultipartForm(maxBytes); err != nil {
			if _, ok := err.(*http.MaxBytesError); ok {
				WriteError(w, http.StatusRequestEntityTooLarge,
					fmt.Sprintf("Photo exceeds maximum size of %d MB", cfg.MaxPhotoSizeMB))
			} else {
				WriteError(w, http.StatusBadRequest, "Failed to parse form data")
			}
			return
		}

		file, header, err := r.FormFile("file")
		if err != nil {
			WriteError(w, http.StatusBadRequest, "Missing 'file' field in form data")
			return
		}
		defer file.Close()

		// Validate content type
		contentType := strings.ToLower(header.Header.Get("Content-Type"))
		if !allowedImageTypes[contentType] {
			WriteError(w, http.StatusBadRequest,
				fmt.Sprintf("Image type '%s' not supported. Accepted: jpeg, png, webp", contentType))
			return
		}

		// Read file bytes for validation
		fileBytes, err := io.ReadAll(file)
		if err != nil {
			WriteError(w, http.StatusInternalServerError, "Failed to read file")
			return
		}

		// Size check
		if len(fileBytes) > int(maxBytes) {
			WriteError(w, http.StatusRequestEntityTooLarge,
				fmt.Sprintf("Photo exceeds maximum size of %d MB", cfg.MaxPhotoSizeMB))
			return
		}

		// Magic bytes validation
		if !validateImageMagic(fileBytes) {
			WriteError(w, http.StatusBadRequest,
				"File content does not match any supported image format")
			return
		}

		// Generate unique filename and save
		filename := uuid.New().String() + ".jpg"
		photoDir := filepath.Join(cfg.UploadDir, "photos")
		if err := os.MkdirAll(photoDir, 0755); err != nil {
			WriteError(w, http.StatusInternalServerError, "Failed to create upload directory")
			return
		}

		photoPath := filepath.Join(photoDir, filename)
		// Prevent path traversal: verify the resolved path is within upload dir
		resolvedPath, err := filepath.Abs(photoPath)
		absUploadDir, _ := filepath.Abs(cfg.UploadDir)
		if err != nil || !strings.HasPrefix(resolvedPath, absUploadDir+string(filepath.Separator)) {
			WriteError(w, http.StatusInternalServerError, "Invalid file path")
			return
		}

		if err := os.WriteFile(resolvedPath, fileBytes, 0644); err != nil {
			WriteError(w, http.StatusInternalServerError, "Failed to save file")
			return
		}

		WriteJSON(w, http.StatusOK, map[string]string{
			"url":       "/uploads/photos/" + filename,
			"filename":  filename,
		})
	}
}

// UploadVoice handles POST /api/upload/voice
func UploadVoice(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		maxBytes := int64(cfg.MaxVoiceSizeMB) * 1024 * 1024

		r.Body = http.MaxBytesReader(w, r.Body, maxBytes+1024)

		if err := r.ParseMultipartForm(maxBytes); err != nil {
			if _, ok := err.(*http.MaxBytesError); ok {
				WriteError(w, http.StatusRequestEntityTooLarge,
					fmt.Sprintf("Voice file exceeds maximum size of %d MB", cfg.MaxVoiceSizeMB))
			} else {
				WriteError(w, http.StatusBadRequest, "Failed to parse form data")
			}
			return
		}

		file, header, err := r.FormFile("file")
		if err != nil {
			WriteError(w, http.StatusBadRequest, "Missing 'file' field in form data")
			return
		}
		defer file.Close()

		// Validate content type
		contentType := strings.ToLower(header.Header.Get("Content-Type"))
		if !allowedVoiceTypes[contentType] {
			WriteError(w, http.StatusBadRequest,
				fmt.Sprintf("Voice type '%s' not supported", contentType))
			return
		}

		fileBytes, err := io.ReadAll(file)
		if err != nil {
			WriteError(w, http.StatusInternalServerError, "Failed to read file")
			return
		}

		if len(fileBytes) > int(maxBytes) {
			WriteError(w, http.StatusRequestEntityTooLarge,
				fmt.Sprintf("Voice file exceeds maximum size of %d MB", cfg.MaxVoiceSizeMB))
			return
		}

		// Determine extension
		ext := extensionByMIME[contentType]
		if ext == "" {
			ext = "webm"
		}
		filename := uuid.New().String() + "." + ext

		voiceDir := filepath.Join(cfg.UploadDir, "voices")
		if err := os.MkdirAll(voiceDir, 0755); err != nil {
			WriteError(w, http.StatusInternalServerError, "Failed to create upload directory")
			return
		}

		voicePath := filepath.Join(voiceDir, filename)
		resolvedPath, err := filepath.Abs(voicePath)
		absUploadDir, _ := filepath.Abs(cfg.UploadDir)
		if err != nil || !strings.HasPrefix(resolvedPath, absUploadDir+string(filepath.Separator)) {
			WriteError(w, http.StatusInternalServerError, "Invalid file path")
			return
		}

		if err := os.WriteFile(resolvedPath, fileBytes, 0644); err != nil {
			WriteError(w, http.StatusInternalServerError, "Failed to save file")
			return
		}

		WriteJSON(w, http.StatusOK, map[string]string{
			"url":      "/uploads/voices/" + filename,
			"filename": filename,
		})
	}
}

// validateImageMagic checks file magic bytes for known image formats.
// Supports JPEG (FF D8 FF), PNG (89 50 4E 47), WebP (RIFF....WEBP).
func validateImageMagic(data []byte) bool {
	if len(data) < 12 {
		return false
	}
	// JPEG
	if data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF {
		return true
	}
	// PNG
	if data[0] == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47 {
		return true
	}
	// WebP: RIFF????WEBP
	if string(data[:4]) == "RIFF" && len(data) >= 12 && string(data[8:12]) == "WEBP" {
		return true
	}
	return false
}
