package handlers

import (
	"database/sql"
	"encoding/json"
	"math"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

type Capsule struct {
	ID               string         `json:"id"`
	AuthorID         string         `json:"author_id"`
	Author           *CapsuleAuthor `json:"author,omitempty"`
	Latitude         float64        `json:"latitude"`
	Longitude        float64        `json:"longitude"`
	Geohash          string         `json:"geohash"`
	LocationName     *string        `json:"location_name,omitempty"`
	Message          string         `json:"message"`
	VoiceURL         *string        `json:"voice_url,omitempty"`
	VoiceCloneURL    *string        `json:"voice_clone_url,omitempty"`
	EmotionTags      []string       `json:"emotion_tags,omitempty"`
	Sentiment        *string        `json:"sentiment,omitempty"`
	EmotionIntensity *float64       `json:"emotion_intensity,omitempty"`
	EmotionSummary   *string        `json:"emotion_summary,omitempty"`
	MoodTag          *string        `json:"mood_tag,omitempty"`
	Visibility       string         `json:"visibility"`
	OpenCount        int            `json:"open_count"`
	CreatedAt        string         `json:"created_at"`
	UnlockAt         *string        `json:"unlock_at,omitempty"`
	Media            []CapsuleMedia `json:"media,omitempty"`
	DistanceM        *float64       `json:"distance_m,omitempty"`
	MatchScore       *float64       `json:"match_score,omitempty"`
	MatchReasons     []string       `json:"match_reasons,omitempty"`
}

type CapsuleAuthor struct {
	Name   string  `json:"name"`
	Avatar *string `json:"avatar,omitempty"`
}

type CapsuleMedia struct {
	ID           string  `json:"id"`
	CapsuleID    string  `json:"capsule_id"`
	Type         string  `json:"type"`
	URL          string  `json:"url"`
	ThumbnailURL *string `json:"thumbnail_url,omitempty"`
	SortOrder    int     `json:"sort_order"`
}

type NearbyResponse struct {
	Total       int       `json:"total"`
	Recommended []Capsule `json:"recommended"`
	Others      []Capsule `json:"others"`
}

type TextResponse struct {
	ID        string  `json:"id"`
	CapsuleID string  `json:"capsule_id"`
	UserID    *string `json:"user_id,omitempty"`
	Nickname  string  `json:"nickname"`
	Content   string  `json:"content"`
	CreatedAt string  `json:"created_at"`
}

type createTextResponseRequest struct {
	Content  string  `json:"content"`
	UserID   *string `json:"user_id"`
	Nickname string  `json:"nickname"`
}

func CapsulesHandler(database *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/api/capsules")
		path = strings.Trim(path, "/")

		switch {
		case r.Method == http.MethodPost && path == "":
			createCapsule(w, r, database)
		case r.Method == http.MethodGet && path == "nearby":
			getNearbyCapsules(w, r, database)
		case strings.HasSuffix(path, "/responses"):
			capsuleID := strings.TrimSuffix(path, "/responses")
			capsuleID = strings.Trim(capsuleID, "/")
			if capsuleID == "" {
				WriteError(w, http.StatusNotFound, "Capsule not found")
				return
			}
			if r.Method == http.MethodGet {
				listResponses(w, database, capsuleID)
				return
			}
			if r.Method == http.MethodPost {
				createTextResponse(w, r, database, capsuleID)
				return
			}
			WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
		case strings.HasSuffix(path, "/reply") && r.Method == http.MethodPost:
			capsuleID := strings.TrimSuffix(path, "/reply")
			capsuleID = strings.Trim(capsuleID, "/")
			replyCapsule(w, r, database, capsuleID)
		case r.Method == http.MethodGet && path != "":
			getCapsule(w, database, path)
		default:
			WriteError(w, http.StatusNotFound, "Capsule not found")
		}
	}
}

func createCapsule(w http.ResponseWriter, r *http.Request, database *sql.DB) {
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	message := strings.TrimSpace(r.FormValue("message"))
	if len([]rune(message)) < 10 || len([]rune(message)) > 500 {
		WriteError(w, http.StatusBadRequest, "Message must be 10-500 characters")
		return
	}

	lat, err := strconv.ParseFloat(r.FormValue("latitude"), 64)
	if err != nil {
		WriteError(w, http.StatusBadRequest, "Invalid latitude")
		return
	}
	lng, err := strconv.ParseFloat(r.FormValue("longitude"), 64)
	if err != nil {
		WriteError(w, http.StatusBadRequest, "Invalid longitude")
		return
	}

	visibility := r.FormValue("visibility")
	if visibility == "" {
		visibility = "public"
	}
	authorID := strings.TrimSpace(r.FormValue("author_id"))
	if err := ensureUser(database, authorID); err != nil {
		WriteError(w, http.StatusInternalServerError, "Failed to prepare author")
		return
	}

	capsuleID := uuid.NewString()
	if hasColumn(database, "capsules", "author_id") {
		shareToken := randomToken(8)
		_, err = database.Exec(`
INSERT INTO capsules (id, author_id, latitude, longitude, geohash, message, mood_tag, visibility, target_user_id, voice_clone_url, unlock_at, share_token)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`, capsuleID, nullString(authorID), lat, lng, simpleGeohash(lat, lng), message, nullString(r.FormValue("mood_tag")), visibility, nullString(r.FormValue("target_user_id")), nullString(r.FormValue("voice_clone_url")), nullString(r.FormValue("unlock_at")), shareToken)
	} else {
		_, err = database.Exec(`
INSERT INTO capsules (id, user_id, author_name, message, latitude, longitude, emotion_tags, visibility, media, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`, capsuleID, authorIDOrAnonymous(authorID), "匿名用户", message, lat, lng, emotionTagsJSON(r.FormValue("mood_tag")), visibility, "[]", time.Now().UTC().Format(time.RFC3339))
	}
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "Failed to create capsule")
		return
	}

	capsule, err := loadCapsule(database, capsuleID, nil)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "Failed to load capsule")
		return
	}
	WriteJSON(w, http.StatusCreated, capsule)
}

func getNearbyCapsules(w http.ResponseWriter, r *http.Request, database *sql.DB) {
	lat, err := strconv.ParseFloat(r.URL.Query().Get("lat"), 64)
	if err != nil {
		WriteError(w, http.StatusBadRequest, "Invalid lat")
		return
	}
	lng, err := strconv.ParseFloat(r.URL.Query().Get("lng"), 64)
	if err != nil {
		WriteError(w, http.StatusBadRequest, "Invalid lng")
		return
	}
	radius := 1200.0
	if raw := r.URL.Query().Get("radius"); raw != "" {
		if parsed, err := strconv.ParseFloat(raw, 64); err == nil && parsed > 0 {
			radius = parsed
		}
	}

	query := `
SELECT c.id
FROM capsules c
ORDER BY c.created_at DESC
LIMIT 100
`
	if hasColumn(database, "capsules", "unlock_at") {
		query = `
SELECT c.id
FROM capsules c
WHERE (c.unlock_at IS NULL OR c.unlock_at <= CURRENT_TIMESTAMP)
ORDER BY c.created_at DESC
LIMIT 100
`
	}
	rows, err := database.Query(query)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "Failed to query capsules")
		return
	}
	defer rows.Close()

	capsules := make([]Capsule, 0)
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			continue
		}
		c, err := loadCapsule(database, id, nil)
		if err != nil {
			continue
		}
		d := haversineMeters(lat, lng, c.Latitude, c.Longitude)
		if d <= radius {
			c.DistanceM = &d
			capsules = append(capsules, c)
		}
	}

	WriteJSON(w, http.StatusOK, NearbyResponse{Total: len(capsules), Recommended: firstN(capsules, 3), Others: restAfter(capsules, 3)})
}

func getCapsule(w http.ResponseWriter, database *sql.DB, capsuleID string) {
	if _, err := database.Exec("UPDATE capsules SET open_count = COALESCE(open_count, 0) + 1 WHERE id = ?", capsuleID); err != nil {
		WriteError(w, http.StatusInternalServerError, "Failed to update capsule")
		return
	}
	capsule, err := loadCapsule(database, capsuleID, nil)
	if err == sql.ErrNoRows {
		WriteError(w, http.StatusNotFound, "Capsule not found")
		return
	}
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "Failed to load capsule")
		return
	}
	WriteJSON(w, http.StatusOK, capsule)
}

func listResponses(w http.ResponseWriter, database *sql.DB, capsuleID string) {
	if !capsuleExists(database, capsuleID) {
		WriteError(w, http.StatusNotFound, "Capsule not found")
		return
	}
	rows, err := database.Query("SELECT id, capsule_id, user_id, nickname, content, created_at FROM responses WHERE capsule_id = ? ORDER BY created_at ASC", capsuleID)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "Failed to query responses")
		return
	}
	defer rows.Close()

	responses := make([]TextResponse, 0)
	for rows.Next() {
		resp, err := scanTextResponse(rows)
		if err == nil {
			responses = append(responses, resp)
		}
	}
	WriteJSON(w, http.StatusOK, responses)
}

func createTextResponse(w http.ResponseWriter, r *http.Request, database *sql.DB, capsuleID string) {
	if !capsuleExists(database, capsuleID) {
		WriteError(w, http.StatusNotFound, "Capsule not found")
		return
	}
	var req createTextResponseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	req.Content = strings.TrimSpace(req.Content)
	if req.Content == "" || len([]rune(req.Content)) > 500 {
		WriteError(w, http.StatusBadRequest, "Content must be 1-500 characters")
		return
	}
	if req.Nickname == "" {
		req.Nickname = "匿名"
	}

	responseID := uuid.NewString()
	_, err := database.Exec("INSERT INTO responses (id, capsule_id, user_id, nickname, content, created_at) VALUES (?, ?, ?, ?, ?, ?)", responseID, capsuleID, req.UserID, req.Nickname, req.Content, time.Now().UTC().Format(time.RFC3339))
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "Failed to create response")
		return
	}

	row := database.QueryRow("SELECT id, capsule_id, user_id, nickname, content, created_at FROM responses WHERE id = ?", responseID)
	resp, err := scanTextResponse(row)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "Failed to load response")
		return
	}
	WriteJSON(w, http.StatusOK, resp)
}

func replyCapsule(w http.ResponseWriter, r *http.Request, database *sql.DB, capsuleID string) {
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	var lat, lng float64
	err := database.QueryRow("SELECT latitude, longitude FROM capsules WHERE id = ?", capsuleID).Scan(&lat, &lng)
	if err == sql.ErrNoRows {
		WriteError(w, http.StatusNotFound, "Original capsule not found")
		return
	}
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "Failed to load capsule")
		return
	}

	message := strings.TrimSpace(r.FormValue("message"))
	if len([]rune(message)) < 10 || len([]rune(message)) > 500 {
		WriteError(w, http.StatusBadRequest, "Message must be 10-500 characters")
		return
	}
	authorID := strings.TrimSpace(r.FormValue("author_id"))
	if err := ensureUser(database, authorID); err != nil {
		WriteError(w, http.StatusInternalServerError, "Failed to prepare author")
		return
	}
	replyID := uuid.NewString()
	if hasColumn(database, "capsules", "author_id") {
		_, err = database.Exec("INSERT INTO capsules (id, author_id, latitude, longitude, geohash, message, visibility) VALUES (?, ?, ?, ?, ?, ?, 'public')", replyID, nullString(authorID), lat, lng, simpleGeohash(lat, lng), message)
	} else {
		_, err = database.Exec(`
INSERT INTO capsules (id, user_id, author_name, message, latitude, longitude, emotion_tags, visibility, media, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?, 'public', ?, ?)
`, replyID, authorIDOrAnonymous(authorID), "匿名用户", message, lat, lng, "[]", "[]", time.Now().UTC().Format(time.RFC3339))
	}
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "Failed to create reply")
		return
	}
	capsule, err := loadCapsule(database, replyID, nil)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "Failed to load reply")
		return
	}
	WriteJSON(w, http.StatusCreated, capsule)
}

type scanner interface{ Scan(dest ...any) error }

func loadCapsule(database *sql.DB, id string, distance *float64) (Capsule, error) {
	if !hasColumn(database, "capsules", "author_id") {
		return loadLegacyCapsule(database, id, distance)
	}

	row := database.QueryRow(`
SELECT c.id, COALESCE(c.author_id, ''), c.latitude, c.longitude, c.geohash, c.location_name,
       c.message, c.voice_url, c.voice_clone_url, c.emotion_tags, c.sentiment, c.emotion_intensity,
       c.emotion_summary, c.mood_tag, COALESCE(c.visibility, 'public'), COALESCE(c.open_count, 0),
       c.created_at, c.unlock_at, u.name, u.avatar_url
FROM capsules c
LEFT JOIN users u ON c.author_id = u.id
WHERE c.id = ?`, id)

	var c Capsule
	var locationName, voiceURL, voiceCloneURL, emotionTags, sentiment, emotionSummary, moodTag, unlockAt sql.NullString
	var emotionIntensity sql.NullFloat64
	var authorName, authorAvatar sql.NullString
	err := row.Scan(&c.ID, &c.AuthorID, &c.Latitude, &c.Longitude, &c.Geohash, &locationName, &c.Message, &voiceURL, &voiceCloneURL, &emotionTags, &sentiment, &emotionIntensity, &emotionSummary, &moodTag, &c.Visibility, &c.OpenCount, &c.CreatedAt, &unlockAt, &authorName, &authorAvatar)
	if err != nil {
		return Capsule{}, err
	}
	c.LocationName = nullableStringPtr(locationName)
	c.VoiceURL = nullableStringPtr(voiceURL)
	c.VoiceCloneURL = nullableStringPtr(voiceCloneURL)
	c.Sentiment = nullableStringPtr(sentiment)
	c.EmotionSummary = nullableStringPtr(emotionSummary)
	c.MoodTag = nullableStringPtr(moodTag)
	c.UnlockAt = nullableStringPtr(unlockAt)
	c.DistanceM = distance
	if emotionIntensity.Valid {
		c.EmotionIntensity = &emotionIntensity.Float64
	}
	if emotionTags.Valid && emotionTags.String != "" {
		_ = json.Unmarshal([]byte(emotionTags.String), &c.EmotionTags)
	}
	if len(c.EmotionTags) == 0 && c.MoodTag != nil {
		c.EmotionTags = []string{*c.MoodTag}
	}
	if authorName.Valid {
		c.Author = &CapsuleAuthor{Name: authorName.String, Avatar: nullableStringPtr(authorAvatar)}
	}
	c.Media = loadMedia(database, c.ID)
	return c, nil
}

func loadLegacyCapsule(database *sql.DB, id string, distance *float64) (Capsule, error) {
	row := database.QueryRow(`
SELECT c.id, c.user_id, c.author_name, c.message, c.latitude, c.longitude, c.emotion_tags,
       COALESCE(c.visibility, 'public'), COALESCE(c.open_count, 0), c.created_at, c.media, u.avatar_url
FROM capsules c
LEFT JOIN users u ON c.user_id = u.id
WHERE c.id = ?`, id)

	var c Capsule
	var authorName string
	var emotionTags, mediaJSON string
	var authorAvatar sql.NullString
	if err := row.Scan(&c.ID, &c.AuthorID, &authorName, &c.Message, &c.Latitude, &c.Longitude, &emotionTags, &c.Visibility, &c.OpenCount, &c.CreatedAt, &mediaJSON, &authorAvatar); err != nil {
		return Capsule{}, err
	}
	c.Geohash = simpleGeohash(c.Latitude, c.Longitude)
	c.DistanceM = distance
	_ = json.Unmarshal([]byte(emotionTags), &c.EmotionTags)
	c.Author = &CapsuleAuthor{Name: authorName, Avatar: nullableStringPtr(authorAvatar)}
	c.Media = loadMedia(database, c.ID)
	return c, nil
}

func loadMedia(database *sql.DB, capsuleID string) []CapsuleMedia {
	rows, err := database.Query("SELECT id, capsule_id, type, url, thumbnail_url, COALESCE(sort_order, 0) FROM media WHERE capsule_id = ? ORDER BY sort_order", capsuleID)
	if err != nil {
		return nil
	}
	defer rows.Close()
	media := make([]CapsuleMedia, 0)
	for rows.Next() {
		var m CapsuleMedia
		var thumb sql.NullString
		if rows.Scan(&m.ID, &m.CapsuleID, &m.Type, &m.URL, &thumb, &m.SortOrder) == nil {
			m.ThumbnailURL = nullableStringPtr(thumb)
			media = append(media, m)
		}
	}
	return media
}

func scanTextResponse(s scanner) (TextResponse, error) {
	var resp TextResponse
	var userID sql.NullString
	if err := s.Scan(&resp.ID, &resp.CapsuleID, &userID, &resp.Nickname, &resp.Content, &resp.CreatedAt); err != nil {
		return TextResponse{}, err
	}
	resp.UserID = nullableStringPtr(userID)
	return resp, nil
}

func capsuleExists(database *sql.DB, id string) bool {
	var exists int
	return database.QueryRow("SELECT 1 FROM capsules WHERE id = ?", id).Scan(&exists) == nil
}

func ensureUser(database *sql.DB, authorID string) error {
	if strings.TrimSpace(authorID) == "" {
		return nil
	}
	_, err := database.Exec(
		"INSERT OR IGNORE INTO users (id, name, interest_tags, created_at) VALUES (?, ?, ?, ?)",
		authorID,
		"匿名用户",
		"[]",
		time.Now().UTC().Format(time.RFC3339),
	)
	return err
}

func hasColumn(database *sql.DB, table string, column string) bool {
	rows, err := database.Query("PRAGMA table_info(" + table + ")")
	if err != nil {
		return false
	}
	defer rows.Close()
	for rows.Next() {
		var cid int
		var name, typ string
		var notNull int
		var defaultValue any
		var pk int
		if err := rows.Scan(&cid, &name, &typ, &notNull, &defaultValue, &pk); err == nil && name == column {
			return true
		}
	}
	return false
}

func authorIDOrAnonymous(authorID string) string {
	if strings.TrimSpace(authorID) == "" {
		return "anonymous"
	}
	return authorID
}

func emotionTagsJSON(moodTag string) string {
	moodTag = strings.TrimSpace(moodTag)
	if moodTag == "" {
		return "[]"
	}
	data, err := json.Marshal([]string{moodTag})
	if err != nil {
		return "[]"
	}
	return string(data)
}

func nullString(value string) any {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	return value
}

func nullableStringPtr(value sql.NullString) *string {
	if !value.Valid || value.String == "" {
		return nil
	}
	return &value.String
}

func randomToken(length int) string {
	const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	b := make([]byte, length)
	for i := range b {
		b[i] = alphabet[r.Intn(len(alphabet))]
	}
	return string(b)
}

func simpleGeohash(lat, lng float64) string {
	return strconv.FormatFloat(lat, 'f', 4, 64) + ":" + strconv.FormatFloat(lng, 'f', 4, 64)
}

func haversineMeters(lat1, lng1, lat2, lng2 float64) float64 {
	const earthRadius = 6371000
	dLat := (lat2 - lat1) * math.Pi / 180
	dLng := (lng2 - lng1) * math.Pi / 180
	rLat1 := lat1 * math.Pi / 180
	rLat2 := lat2 * math.Pi / 180
	a := math.Sin(dLat/2)*math.Sin(dLat/2) + math.Cos(rLat1)*math.Cos(rLat2)*math.Sin(dLng/2)*math.Sin(dLng/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return earthRadius * c
}

func firstN(capsules []Capsule, n int) []Capsule {
	if len(capsules) < n {
		return capsules
	}
	return capsules[:n]
}

func restAfter(capsules []Capsule, n int) []Capsule {
	if len(capsules) <= n {
		return []Capsule{}
	}
	return capsules[n:]
}
