package handlers

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	_ "modernc.org/sqlite"

	"time-space-go/internal/models"
)

// setupTestDB creates an in-memory SQLite database with schema
func setupTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("failed to open in-memory db: %v", err)
	}

	// Enable WAL and foreign keys
	db.Exec("PRAGMA journal_mode=WAL")
	db.Exec("PRAGMA foreign_keys=ON")

	// Create tables
	schema := `
	CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL, avatar_url TEXT, interest_tags TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
	CREATE TABLE capsules (id TEXT PRIMARY KEY, author_id TEXT, latitude REAL NOT NULL, longitude REAL NOT NULL, geohash TEXT NOT NULL, location_name TEXT, message TEXT NOT NULL, voice_url TEXT, voice_clone_url TEXT, voice_sample_url TEXT, emotion_tags TEXT, sentiment TEXT, emotion_intensity REAL, emotion_summary TEXT, visibility TEXT DEFAULT 'public', target_user_id TEXT, unlock_at TIMESTAMP, share_token TEXT UNIQUE, mood_tag TEXT, open_count INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, expires_at TIMESTAMP);
	CREATE TABLE media (id TEXT PRIMARY KEY, capsule_id TEXT, type TEXT NOT NULL, url TEXT NOT NULL, thumbnail_url TEXT, sort_order INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
	CREATE TABLE interactions (id TEXT PRIMARY KEY, capsule_id TEXT, user_id TEXT, action TEXT NOT NULL, reaction TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
	CREATE TABLE responses (id TEXT PRIMARY KEY, capsule_id TEXT NOT NULL, user_id TEXT, nickname TEXT DEFAULT '匿名', content TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
	CREATE TABLE favorites (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, capsule_id TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, capsule_id));
	`
	if _, err := db.Exec(schema); err != nil {
		t.Fatalf("failed to create schema: %v", err)
	}

	return db
}

func TestCreateUser(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	body := `{"name": "测试用户", "interest_tags": ["校园", "家庭", "人生"]}`
	req := httptest.NewRequest("POST", "/api/users", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handler := CreateUser(db)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d: %s", rr.Code, rr.Body.String())
	}

	var resp models.UserResponse
	json.Unmarshal(rr.Body.Bytes(), &resp)
	if resp.Name != "测试用户" {
		t.Errorf("expected name '测试用户', got '%s'", resp.Name)
	}
	if len(resp.InterestTags) != 3 {
		t.Errorf("expected 3 interest tags, got %d", len(resp.InterestTags))
	}
	if resp.ID == "" {
		t.Error("expected non-empty ID")
	}
}

func TestGetUser(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	// Create a user first
	db.Exec("INSERT INTO users (id, name, interest_tags) VALUES (?, ?, ?)", "test-id", "张三", `["校园","家庭"]`)

	req := httptest.NewRequest("GET", "/api/users/test-id", nil)
	req.SetPathValue("user_id", "test-id")
	rr := httptest.NewRecorder()

	handler := GetUser(db)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var resp models.UserResponse
	json.Unmarshal(rr.Body.Bytes(), &resp)
	if resp.Name != "张三" {
		t.Errorf("expected name '张三', got '%s'", resp.Name)
	}
}

func TestGetUserNotFound(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	req := httptest.NewRequest("GET", "/api/users/nonexistent", nil)
	req.SetPathValue("user_id", "nonexistent")
	rr := httptest.NewRecorder()

	handler := GetUser(db)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", rr.Code)
	}
}

func TestUpdateUser(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	db.Exec("INSERT INTO users (id, name, interest_tags) VALUES (?, ?, ?)", "test-id", "张三", `["校园","家庭"]`)

	newName := "李四"
	body, _ := json.Marshal(models.UserUpdateRequest{Name: &newName})
	req := httptest.NewRequest("PUT", "/api/users/test-id", bytes.NewReader(body))
	req.SetPathValue("user_id", "test-id")
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handler := UpdateUser(db)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var resp models.UserResponse
	json.Unmarshal(rr.Body.Bytes(), &resp)
	if resp.Name != "李四" {
		t.Errorf("expected name '李四', got '%s'", resp.Name)
	}
}

func TestGetUserStats(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	db.Exec("INSERT INTO users (id, name, interest_tags) VALUES (?, ?, ?)", "test-id", "张三", `["校园"]`)
	db.Exec("INSERT INTO capsules (id, author_id, latitude, longitude, geohash, message, visibility) VALUES (?, ?, ?, ?, ?, ?, 'public')", "cap-1", "test-id", 31.23, 121.47, "wtw3sj", "测试消息")

	req := httptest.NewRequest("GET", "/api/users/test-id/stats", nil)
	req.SetPathValue("user_id", "test-id")
	rr := httptest.NewRecorder()

	handler := GetUserStats(db)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var stats models.UserStats
	json.Unmarshal(rr.Body.Bytes(), &stats)
	if stats.CreatedCount != 1 {
		t.Errorf("expected created_count=1, got %d", stats.CreatedCount)
	}
}

func TestCreateCapsule(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	body := `{"message": "这是一条测试消息至少十个字", "latitude": 31.2304, "longitude": 121.4737, "visibility": "public"}`
	req := httptest.NewRequest("POST", "/api/capsules", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handler := CreateCapsule(db)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d: %s", rr.Code, rr.Body.String())
	}

	var resp models.CapsuleResponse
	json.Unmarshal(rr.Body.Bytes(), &resp)
	if resp.Message != "这是一条测试消息至少十个字" {
		t.Errorf("message mismatch: %s", resp.Message)
	}
	if resp.Geohash == "" {
		t.Error("expected non-empty geohash")
	}
}

func TestGetCapsule(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	db.Exec(`INSERT INTO capsules (id, latitude, longitude, geohash, message, visibility, share_token)
		VALUES (?, ?, ?, ?, ?, 'public', ?)`,
		"cap-1", 31.23, 121.47, "wtw3sj", "测试消息内容", "abc12345")

	req := httptest.NewRequest("GET", "/api/capsules/cap-1", nil)
	req.SetPathValue("capsule_id", "cap-1")
	rr := httptest.NewRecorder()

	handler := GetCapsule(db)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var resp models.CapsuleResponse
	json.Unmarshal(rr.Body.Bytes(), &resp)
	if resp.ID != "cap-1" {
		t.Errorf("expected id 'cap-1', got '%s'", resp.ID)
	}
}

func TestGetCapsuleNotFound(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	req := httptest.NewRequest("GET", "/api/capsules/nonexistent", nil)
	req.SetPathValue("capsule_id", "nonexistent")
	rr := httptest.NewRecorder()

	handler := GetCapsule(db)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", rr.Code)
	}
}

func TestGetMyCapsules(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	db.Exec(`INSERT INTO capsules (id, author_id, latitude, longitude, geohash, message, visibility)
		VALUES (?, ?, ?, ?, ?, ?, 'public')`,
		"cap-1", "user-1", 31.23, 121.47, "wtw3sj", "消息一")
	db.Exec(`INSERT INTO capsules (id, author_id, latitude, longitude, geohash, message, visibility)
		VALUES (?, ?, ?, ?, ?, ?, 'public')`,
		"cap-2", "user-1", 31.24, 121.48, "wtw3sk", "消息二")

	req := httptest.NewRequest("GET", "/api/capsules/mine?user_id=user-1", nil)
	rr := httptest.NewRecorder()

	handler := GetMyCapsules(db)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var resp models.MineResponse
	json.Unmarshal(rr.Body.Bytes(), &resp)
	if resp.Total != 2 {
		t.Errorf("expected total=2, got %d", resp.Total)
	}
}

func TestGetMyCapsulesMissingUserID(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	req := httptest.NewRequest("GET", "/api/capsules/mine", nil)
	rr := httptest.NewRecorder()

	handler := GetMyCapsules(db)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
}

func TestReplyToCapsule(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	db.Exec(`INSERT INTO capsules (id, latitude, longitude, geohash, message, visibility)
		VALUES (?, ?, ?, ?, ?, 'public')`,
		"cap-1", 31.23, 121.47, "wtw3sj", "原消息")

	body := `{"message": "这是一条回复消息至少十个字长度"}` 
	req := httptest.NewRequest("POST", "/api/capsules/cap-1/reply", strings.NewReader(body))
	req.SetPathValue("capsule_id", "cap-1")
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handler := ReplyToCapsule(db)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d: %s", rr.Code, rr.Body.String())
	}

	var resp models.CapsuleResponse
	json.Unmarshal(rr.Body.Bytes(), &resp)
	if resp.Message != "这是一条回复消息至少十个字长度" {
		t.Errorf("message mismatch: %s", resp.Message)
	}
}

func TestRegenerateShareToken(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	db.Exec(`INSERT INTO capsules (id, latitude, longitude, geohash, message, visibility, share_token)
		VALUES (?, ?, ?, ?, ?, 'public', ?)`,
		"cap-1", 31.23, 121.47, "wtw3sj", "原消息", "oldtoken")

	req := httptest.NewRequest("POST", "/api/capsules/cap-1/regenerate-share", nil)
	req.SetPathValue("capsule_id", "cap-1")
	rr := httptest.NewRecorder()

	handler := RegenerateShareToken(db)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var resp models.ShareTokenResponse
	json.Unmarshal(rr.Body.Bytes(), &resp)
	if resp.ShareToken == "" || resp.ShareToken == "oldtoken" {
		t.Errorf("expected new share token, got '%s'", resp.ShareToken)
	}
}

func TestGetNearbyNoParams(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	req := httptest.NewRequest("GET", "/api/capsules/nearby?lat=0&lng=0", nil)
	rr := httptest.NewRecorder()

	handler := GetNearby(db)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing lat/lng, got %d", rr.Code)
	}
}

func TestGetDailyRecommendEmpty(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	req := httptest.NewRequest("GET", "/api/capsules/daily-recommend", nil)
	rr := httptest.NewRecorder()

	handler := GetDailyRecommend(db)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Errorf("expected 404 for empty capsules, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestSearchCapsulesEmpty(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	req := httptest.NewRequest("GET", "/api/capsules/search", nil)
	rr := httptest.NewRecorder()

	handler := SearchCapsules(db)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}

	var resp models.SearchResponse
	json.Unmarshal(rr.Body.Bytes(), &resp)
	if resp.Total != 0 {
		t.Errorf("expected 0 results, got %d", resp.Total)
	}
}
