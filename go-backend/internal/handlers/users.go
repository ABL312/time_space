package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID           string   `json:"id"`
	Name         string   `json:"name"`
	AvatarURL    *string  `json:"avatar_url,omitempty"`
	InterestTags []string `json:"interest_tags"`
	CreatedAt    string   `json:"created_at"`
}

type userRequest struct {
	Name         *string  `json:"name"`
	InterestTags []string `json:"interest_tags"`
	AvatarURL    *string  `json:"avatar_url"`
}

func UsersHandler(database *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/api/users")
		path = strings.Trim(path, "/")

		switch {
		case r.Method == http.MethodPost && path == "":
			createUser(w, r, database)
		case r.Method == http.MethodGet && path != "" && !strings.HasSuffix(path, "/stats"):
			getUser(w, database, path)
		case r.Method == http.MethodPut && path != "":
			updateUser(w, r, database, path)
		case r.Method == http.MethodGet && strings.HasSuffix(path, "/stats"):
			getUserStats(w, database, strings.TrimSuffix(path, "/stats"))
		default:
			WriteError(w, http.StatusNotFound, "User not found")
		}
	}
}

func createUser(w http.ResponseWriter, r *http.Request, database *sql.DB) {
	var req userRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	name := ""
	if req.Name != nil {
		name = strings.TrimSpace(*req.Name)
	}
	if name == "" || len([]rune(name)) > 20 {
		WriteError(w, http.StatusBadRequest, "Name must be 1-20 characters")
		return
	}
	if len(req.InterestTags) != 3 {
		WriteError(w, http.StatusBadRequest, "Exactly 3 interest tags are required")
		return
	}

	userID := uuid.NewString()
	createdAt := time.Now().UTC().Format(time.RFC3339)
	interestTags, _ := json.Marshal(req.InterestTags)
	_, err := database.Exec(
		"INSERT INTO users (id, name, interest_tags, created_at) VALUES (?, ?, ?, ?)",
		userID,
		name,
		string(interestTags),
		createdAt,
	)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "Failed to create user")
		return
	}

	WriteJSON(w, http.StatusCreated, User{ID: userID, Name: name, InterestTags: req.InterestTags, CreatedAt: createdAt})
}

func getUser(w http.ResponseWriter, database *sql.DB, userID string) {
	user, err := loadUser(database, userID)
	if err == sql.ErrNoRows {
		WriteError(w, http.StatusNotFound, "User not found")
		return
	}
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "Failed to load user")
		return
	}
	WriteJSON(w, http.StatusOK, user)
}

func updateUser(w http.ResponseWriter, r *http.Request, database *sql.DB, userID string) {
	if !userExists(database, userID) {
		WriteError(w, http.StatusNotFound, "User not found")
		return
	}
	var req userRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if req.Name != nil {
		name := strings.TrimSpace(*req.Name)
		if name == "" || len([]rune(name)) > 20 {
			WriteError(w, http.StatusBadRequest, "Name must be 1-20 characters")
			return
		}
		if _, err := database.Exec("UPDATE users SET name = ? WHERE id = ?", name, userID); err != nil {
			WriteError(w, http.StatusInternalServerError, "Failed to update user")
			return
		}
	}
	if req.InterestTags != nil {
		data, _ := json.Marshal(req.InterestTags)
		if _, err := database.Exec("UPDATE users SET interest_tags = ? WHERE id = ?", string(data), userID); err != nil {
			WriteError(w, http.StatusInternalServerError, "Failed to update user")
			return
		}
	}
	if req.AvatarURL != nil {
		if _, err := database.Exec("UPDATE users SET avatar_url = ? WHERE id = ?", *req.AvatarURL, userID); err != nil {
			WriteError(w, http.StatusInternalServerError, "Failed to update user")
			return
		}
	}
	getUser(w, database, userID)
}

func getUserStats(w http.ResponseWriter, database *sql.DB, userID string) {
	if !userExists(database, userID) {
		WriteError(w, http.StatusNotFound, "User not found")
		return
	}
	var createdCount int
	column := "author_id"
	if !hasColumn(database, "capsules", "author_id") {
		column = "user_id"
	}
	_ = database.QueryRow("SELECT COUNT(*) FROM capsules WHERE "+column+" = ?", userID).Scan(&createdCount)
	WriteJSON(w, http.StatusOK, map[string]any{
		"created_count":   createdCount,
		"opened_count":    0,
		"favorited_count": 0,
		"total_capsules":  createdCount,
		"recent_opened":   []Capsule{},
		"recent_created":  []Capsule{},
	})
}

func loadUser(database *sql.DB, userID string) (User, error) {
	row := database.QueryRow("SELECT id, name, avatar_url, interest_tags, created_at FROM users WHERE id = ?", userID)
	var user User
	var avatar sql.NullString
	var tags string
	if err := row.Scan(&user.ID, &user.Name, &avatar, &tags, &user.CreatedAt); err != nil {
		return User{}, err
	}
	user.AvatarURL = nullableStringPtr(avatar)
	if tags != "" {
		_ = json.Unmarshal([]byte(tags), &user.InterestTags)
	}
	if user.InterestTags == nil {
		user.InterestTags = []string{}
	}
	return user, nil
}

func userExists(database *sql.DB, userID string) bool {
	var exists int
	return database.QueryRow("SELECT 1 FROM users WHERE id = ?", userID).Scan(&exists) == nil
}
