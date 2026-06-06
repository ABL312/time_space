package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"time-space-go/internal/models"
)

// ── User handlers ───────────────────────────────────────────────

// CreateUser handles POST /api/users
func CreateUser(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req models.UserCreateRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			WriteError(w, http.StatusBadRequest, "Invalid request body")
			return
		}

		if req.Name == "" || len(req.Name) > 20 {
			WriteError(w, http.StatusBadRequest, "name is required (1-20 chars)")
			return
		}
		if len(req.InterestTags) != 3 {
			WriteError(w, http.StatusBadRequest, "interest_tags must contain exactly 3 tags")
			return
		}

		id := uuid.New().String()
		tagsJSON, _ := json.Marshal(req.InterestTags)

		_, err := db.Exec(
			"INSERT INTO users (id, name, interest_tags) VALUES (?, ?, ?)",
			id, req.Name, string(tagsJSON),
		)
		if err != nil {
			WriteError(w, http.StatusInternalServerError, "Failed to create user")
			return
		}

		resp := models.UserResponse{
			ID:           id,
			Name:         req.Name,
			InterestTags: req.InterestTags,
			CreatedAt:    time.Now().UTC().Format(time.RFC3339),
		}
		WriteJSON(w, http.StatusCreated, resp)
	}
}

// GetUser handles GET /api/users/{user_id}
func GetUser(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := r.PathValue("user_id")
		if userID == "" {
			WriteError(w, http.StatusBadRequest, "Missing user_id")
			return
		}

		user, err := queryUser(db, userID)
		if err != nil || user == nil {
			WriteError(w, http.StatusNotFound, "User not found")
			return
		}
		WriteJSON(w, http.StatusOK, user)
	}
}

// UpdateUser handles PUT /api/users/{user_id}
func UpdateUser(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := r.PathValue("user_id")
		if userID == "" {
			WriteError(w, http.StatusBadRequest, "Missing user_id")
			return
		}

		var req models.UserUpdateRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			WriteError(w, http.StatusBadRequest, "Invalid request body")
			return
		}

		// Check user exists
		existing, err := queryUser(db, userID)
		if err != nil || existing == nil {
			WriteError(w, http.StatusNotFound, "User not found")
			return
		}

		// Build update
		var sets []string
		var args []interface{}

		if req.Name != nil {
			sets = append(sets, "name = ?")
			args = append(args, *req.Name)
		}
		if req.InterestTags != nil {
			tagsJSON, _ := json.Marshal(*req.InterestTags)
			sets = append(sets, "interest_tags = ?")
			args = append(args, string(tagsJSON))
		}
		if req.AvatarURL != nil {
			sets = append(sets, "avatar_url = ?")
			args = append(args, *req.AvatarURL)
		}

		if len(sets) > 0 {
			args = append(args, userID)
			_, err = db.Exec(
				"UPDATE users SET "+strings.Join(sets, ", ")+" WHERE id = ?",
				args...,
			)
			if err != nil {
				WriteError(w, http.StatusInternalServerError, "Failed to update user")
				return
			}
		}

		user, _ := queryUser(db, userID)
		WriteJSON(w, http.StatusOK, user)
	}
}

// GetUserStats handles GET /api/users/{user_id}/stats
func GetUserStats(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := r.PathValue("user_id")

		// Check user exists
		user, err := queryUser(db, userID)
		if err != nil || user == nil {
			WriteError(w, http.StatusNotFound, "User not found")
			return
		}

		stats := models.UserStats{}

		// Created count
		db.QueryRow("SELECT COUNT(*) FROM capsules WHERE author_id = ?", userID).Scan(&stats.CreatedCount)
		// Opened count
		db.QueryRow("SELECT COUNT(*) FROM interactions WHERE user_id = ? AND action = 'open'", userID).Scan(&stats.OpenedCount)
		// Favorited count
		db.QueryRow("SELECT COUNT(*) FROM favorites WHERE user_id = ?", userID).Scan(&stats.FavoritedCount)
		// Total capsules
		db.QueryRow("SELECT COUNT(*) FROM capsules").Scan(&stats.TotalCapsules)

		// Recent opened
		stats.RecentOpened = queryRecentOpened(db, userID, 5)
		// Recent created
		stats.RecentCreated = queryRecentCreated(db, userID, 5)

		WriteJSON(w, http.StatusOK, stats)
	}
}

// ── User query helpers ──────────────────────────────────────────

func queryUser(db *sql.DB, userID string) (*models.UserResponse, error) {
	row := db.QueryRow(
		"SELECT id, name, avatar_url, interest_tags, created_at FROM users WHERE id = ?",
		userID,
	)

	var u models.UserResponse
	var avatarURL, interestTagsRaw sql.NullString
	var createdAt time.Time

	err := row.Scan(&u.ID, &u.Name, &avatarURL, &interestTagsRaw, &createdAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	if avatarURL.Valid {
		u.AvatarURL = &avatarURL.String
	}
	u.InterestTags = parseTags(interestTagsRaw)
	u.CreatedAt = models.FormatTime(createdAt)
	return &u, nil
}

func queryRecentOpened(db *sql.DB, userID string, limit int) []models.CapsuleSummary {
	rows, err := db.Query(
		`SELECT c.id, c.author_id, c.latitude, c.longitude, c.geohash, c.message,
		        c.emotion_tags, c.sentiment, c.emotion_intensity, c.mood_tag,
		        c.visibility, c.open_count, c.created_at,
		        u.name as author_name, u.avatar_url as author_avatar
		 FROM interactions i
		 JOIN capsules c ON i.capsule_id = c.id
		 LEFT JOIN users u ON c.author_id = u.id
		 WHERE i.user_id = ? AND i.action = 'open'
		 ORDER BY i.created_at DESC LIMIT ?`,
		userID, limit,
	)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var result []models.CapsuleSummary
	for rows.Next() {
		cs := scanCapsuleSummary(rows)
		if cs != nil {
			result = append(result, *cs)
		}
	}
	return result
}

func queryRecentCreated(db *sql.DB, userID string, limit int) []models.CapsuleSummary {
	rows, err := db.Query(
		`SELECT c.id, c.author_id, c.latitude, c.longitude, c.geohash, c.message,
		        c.emotion_tags, c.sentiment, c.emotion_intensity, c.mood_tag,
		        c.visibility, c.open_count, c.created_at,
		        u.name as author_name, u.avatar_url as author_avatar
		 FROM capsules c
		 LEFT JOIN users u ON c.author_id = u.id
		 WHERE c.author_id = ?
		 ORDER BY c.created_at DESC LIMIT ?`,
		userID, limit,
	)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var result []models.CapsuleSummary
	for rows.Next() {
		cs := scanCapsuleSummary(rows)
		if cs != nil {
			result = append(result, *cs)
		}
	}
	return result
}

func parseTags(raw sql.NullString) []string {
	if !raw.Valid || raw.String == "" {
		return []string{}
	}
	var tags []string
	if err := json.Unmarshal([]byte(raw.String), &tags); err != nil {
		return []string{}
	}
	if tags == nil {
		return []string{}
	}
	return tags
}
