package handlers

import (
	"crypto/rand"
	"database/sql"
	"encoding/json"
	"math"
	"math/big"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	"time-space-go/internal/models"
	"time-space-go/internal/services"
)

// ── Create capsule ──────────────────────────────────────────────

// CreateCapsule handles POST /api/capsules (JSON or multipart)
func CreateCapsule(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req models.CapsuleCreateRequest

		contentType := r.Header.Get("Content-Type")
		if strings.HasPrefix(contentType, "multipart/form-data") {
			// Parse multipart form (files handled by #47)
			if err := r.ParseMultipartForm(10 << 20); err != nil {
				WriteError(w, http.StatusBadRequest, "Failed to parse form data")
				return
			}
			req.Message = r.FormValue("message")
			req.Latitude, _ = strconv.ParseFloat(r.FormValue("latitude"), 64)
			req.Longitude, _ = strconv.ParseFloat(r.FormValue("longitude"), 64)
			moodTag := r.FormValue("mood_tag")
			if moodTag != "" {
				req.MoodTag = &moodTag
			}
			req.Visibility = r.FormValue("visibility")
			if req.Visibility == "" {
				req.Visibility = "public"
			}
			if tuid := r.FormValue("target_user_id"); tuid != "" {
				req.TargetUserID = &tuid
			}
			if aid := r.FormValue("author_id"); aid != "" {
				req.AuthorID = &aid
			}
			if vcu := r.FormValue("voice_clone_url"); vcu != "" {
				req.VoiceCloneURL = &vcu
			}
			if ua := r.FormValue("unlock_at"); ua != "" {
				req.UnlockAt = &ua
			}
		} else {
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				WriteError(w, http.StatusBadRequest, "Invalid request body")
				return
			}
		}

		if req.Message == "" || len(req.Message) < 10 || len(req.Message) > 500 {
			WriteError(w, http.StatusBadRequest, "message is required (10-500 chars)")
			return
		}
		if req.Latitude == 0 && req.Longitude == 0 {
			WriteError(w, http.StatusBadRequest, "latitude and longitude are required")
			return
		}
		if req.Visibility == "" {
			req.Visibility = "public"
		}

		id := uuid.New().String()
		geohash := services.Encode(req.Latitude, req.Longitude, 6)
		shareToken := generateShareToken(8)

		// Parse unlock_at if provided
		var unlockAt interface{}
		if req.UnlockAt != nil && *req.UnlockAt != "" {
			t, err := time.Parse(time.RFC3339, *req.UnlockAt)
			if err != nil {
				WriteError(w, http.StatusBadRequest, "Invalid unlock_at format. Use ISO format.")
				return
			}
			unlockAt = t.UTC().Format(time.RFC3339)
		}

		_, err := db.Exec(
			`INSERT INTO capsules (id, author_id, latitude, longitude, geohash,
			 message, mood_tag, visibility, target_user_id, voice_clone_url,
			 unlock_at, share_token)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			id, req.AuthorID, req.Latitude, req.Longitude, geohash,
			req.Message, req.MoodTag, req.Visibility, req.TargetUserID,
			req.VoiceCloneURL, unlockAt, shareToken,
		)
		if err != nil {
			WriteError(w, http.StatusInternalServerError, "Failed to create capsule")
			return
		}

		capsule := queryCapsule(db, id)
		if capsule == nil {
			WriteError(w, http.StatusInternalServerError, "Failed to retrieve created capsule")
			return
		}
		WriteJSON(w, http.StatusCreated, capsule)
	}
}

// ── Get capsule ─────────────────────────────────────────────────

// GetCapsule handles GET /api/capsules/{capsule_id}
func GetCapsule(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		capsuleID := r.PathValue("capsule_id")
		if capsuleID == "" {
			WriteError(w, http.StatusBadRequest, "Missing capsule_id")
			return
		}

		capsule := queryCapsule(db, capsuleID)
		if capsule == nil {
			WriteError(w, http.StatusNotFound, "Capsule not found")
			return
		}

		// Time-lock check
		if capsule.UnlockAt != nil && *capsule.UnlockAt != "" {
			unlockTime, err := time.Parse(time.RFC3339, *capsule.UnlockAt)
			if err == nil && unlockTime.After(time.Now().UTC()) {
				countdown := int(unlockTime.Sub(time.Now().UTC()).Seconds())
				WriteJSON(w, http.StatusOK, models.LockedResponse{
					Locked:           true,
					UnlockAt:         *capsule.UnlockAt,
					CountdownSeconds: countdown,
				})
				return
			}
		}

		// Increment open count and record interaction in a transaction
		tx, err := db.Begin()
		if err != nil {
			WriteError(w, http.StatusInternalServerError, "Transaction failed")
			return
		}
		defer tx.Rollback()

		tx.Exec("UPDATE capsules SET open_count = open_count + 1 WHERE id = ?", capsuleID)
		interactionID := uuid.New().String()
		tx.Exec("INSERT INTO interactions (id, capsule_id, action) VALUES (?, ?, 'open')",
			interactionID, capsuleID)

		if err := tx.Commit(); err != nil {
			WriteError(w, http.StatusInternalServerError, "Failed to record view")
			return
		}

		// Re-query to get updated open_count
		capsule = queryCapsule(db, capsuleID)
		WriteJSON(w, http.StatusOK, capsule)
	}
}

// GetCapsuleByShareToken handles GET /api/capsules/shared/{share_token}
func GetCapsuleByShareToken(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		shareToken := r.PathValue("share_token")
		if shareToken == "" {
			WriteError(w, http.StatusBadRequest, "Missing share_token")
			return
		}

		capsule := queryCapsuleByShareToken(db, shareToken)
		if capsule == nil {
			WriteError(w, http.StatusNotFound, "Capsule not found")
			return
		}

		// Time-lock check
		if capsule.UnlockAt != nil && *capsule.UnlockAt != "" {
			unlockTime, err := time.Parse(time.RFC3339, *capsule.UnlockAt)
			if err == nil && unlockTime.After(time.Now().UTC()) {
				countdown := int(unlockTime.Sub(time.Now().UTC()).Seconds())
				WriteJSON(w, http.StatusOK, models.LockedResponse{
					Locked:           true,
					UnlockAt:         *capsule.UnlockAt,
					CountdownSeconds: countdown,
				})
				return
			}
		}

		tx, err := db.Begin()
		if err != nil {
			WriteError(w, http.StatusInternalServerError, "Transaction failed")
			return
		}
		defer tx.Rollback()

		tx.Exec("UPDATE capsules SET open_count = open_count + 1 WHERE id = ?", capsule.ID)
		interactionID := uuid.New().String()
		tx.Exec("INSERT INTO interactions (id, capsule_id, action) VALUES (?, ?, 'open')",
			interactionID, capsule.ID)

		if err := tx.Commit(); err != nil {
			WriteError(w, http.StatusInternalServerError, "Failed to record view")
			return
		}

		capsule = queryCapsule(db, capsule.ID)
		WriteJSON(w, http.StatusOK, capsule)
	}
}

// ── List capsules ───────────────────────────────────────────────

// GetMyCapsules handles GET /api/capsules/mine?user_id=xxx&limit=50&offset=0
func GetMyCapsules(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := r.URL.Query().Get("user_id")
		if userID == "" {
			WriteError(w, http.StatusBadRequest, "user_id query parameter is required")
			return
		}

		limit, offset := parsePagination(r, 50, 100)

		capsules := queryCapsulesByAuthor(db, userID, limit, offset)
		// Count total
		var total int
		db.QueryRow("SELECT COUNT(*) FROM capsules WHERE author_id = ?", userID).Scan(&total)
		resp := models.MineResponse{
			Capsules: capsules,
			Total:    total,
		}
		WriteJSON(w, http.StatusOK, resp)
	}
}

// GetNearby handles GET /api/capsules/nearby
func GetNearby(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()

		lat, _ := strconv.ParseFloat(q.Get("lat"), 64)
		lng, _ := strconv.ParseFloat(q.Get("lng"), 64)
		radius := 1200
		if r := q.Get("radius"); r != "" {
			if v, err := strconv.Atoi(r); err == nil && v > 0 {
				radius = v
			}
		}
		limit := 50
		if l := q.Get("limit"); l != "" {
			if v, err := strconv.Atoi(l); err == nil && v >= 1 && v <= 100 {
				limit = v
			}
		}
		userID := q.Get("user_id")
		sceneMoodMatch := q.Get("scene_mood_match")

		if lat == 0 && lng == 0 {
			WriteError(w, http.StatusBadRequest, "lat and lng are required")
			return
		}

		// Determine geohash precision based on radius
		precision := 6
		if radius <= 200 {
			precision = 7
		} else if radius > 2000 {
			precision = 5
		}

		hashes := services.GetNearbyHashes(lat, lng, precision)
		placeholders := make([]string, len(hashes))
		args := make([]interface{}, 0, len(hashes)+3)
		for i, h := range hashes {
			placeholders[i] = "?"
			args = append(args, h)
		}

		currentTime := time.Now().UTC().Format(time.RFC3339)
		args = append(args, currentTime, limit*2) // Fetch more for filtering

		query := `SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
			FROM capsules c
			LEFT JOIN users u ON c.author_id = u.id
			WHERE SUBSTR(c.geohash, 1, ` + strconv.Itoa(precision) + `) IN (` +
			strings.Join(placeholders, ",") + `)
			AND c.visibility = 'public'
			AND (c.unlock_at IS NULL OR c.unlock_at <= ?)
			ORDER BY c.created_at DESC LIMIT ?`

		rows, err := db.Query(query, args...)
		if err != nil {
			WriteError(w, http.StatusInternalServerError, "Query failed")
			return
		}
		defer rows.Close()

		type rawCapsule struct {
			capsule  models.CapsuleResponse
			distance float64
		}
		var scored []rawCapsule

		for rows.Next() {
			capsule := scanFullCapsule(rows)
			if capsule == nil {
				continue
			}
			dist := services.HaversineDistance(lat, lng, capsule.Latitude, capsule.Longitude)
			if dist > float64(radius) {
				continue
			}
			dist = math.Round(dist*10) / 10
			capsule.DistanceM = &dist
			scored = append(scored, rawCapsule{capsule: *capsule, distance: dist})
		}

		// Get user interest tags
		var userTags []string
		if userID != "" {
			userTags = queryUserInterestTags(db, userID)
		}

		// Parse scene moods
		var sceneMoods []string
		if sceneMoodMatch != "" {
			json.Unmarshal([]byte(sceneMoodMatch), &sceneMoods)
		}

		// Rank using the recommendation engine
		var scorables []services.CapsuleScorable
		for _, s := range scored {
			scorables = append(scorables, services.CapsuleScorable{
				ID:          s.capsule.ID,
				DistanceM:   s.distance,
				EmotionTags: s.capsule.EmotionTags,
				OpenCount:   s.capsule.OpenCount,
			})
		}

		recommendedScorables, othersScorables := services.RankCapsules(
			scorables, userTags, sceneMoods, limit, float64(radius),
		)

		// Map back to capsule responses
		scoredMap := make(map[string]models.CapsuleResponse)
		for _, s := range scored {
			scoredMap[s.capsule.ID] = s.capsule
		}

		var recommended, others []models.CapsuleResponse
		for _, rs := range recommendedScorables {
			if c, ok := scoredMap[rs.ID]; ok {
				c.MatchScore = rs.MatchScore
				c.MatchReasons = rs.MatchReasons
				recommended = append(recommended, c)
			}
		}
		for _, os := range othersScorables {
			if c, ok := scoredMap[os.ID]; ok {
				c.MatchScore = os.MatchScore
				c.MatchReasons = os.MatchReasons
				others = append(others, c)
			}
		}
		if recommended == nil {
			recommended = []models.CapsuleResponse{}
		}
		if others == nil {
			others = []models.CapsuleResponse{}
		}

		// Ensure total doesn't exceed limit
		if len(recommended)+len(others) > limit {
			remaining := limit - len(recommended)
			if remaining > 0 && remaining < len(others) {
				others = others[:remaining]
			}
		}

		// Batch load media + interaction counts (N+1 prevention)
		allCapsules := append(recommended, others...)
		capsuleIDs := make([]string, len(allCapsules))
		for i, c := range allCapsules {
			capsuleIDs[i] = c.ID
		}
		mediaMap := batchQueryMedia(db, capsuleIDs)
		for i := range recommended {
			recommended[i].Media = mediaMap[recommended[i].ID]
		}
		for i := range others {
			others[i].Media = mediaMap[others[i].ID]
		}

		resp := models.NearbyResponse{
			Total:       len(scored),
			Recommended: recommended,
			Others:      others,
		}
		WriteJSON(w, http.StatusOK, resp)
	}
}

// SearchCapsules handles GET /api/capsules/search
func SearchCapsules(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		searchQ := q.Get("q")
		tag := q.Get("tag")
		latStr := q.Get("lat")
		lngStr := q.Get("lng")
		radiusStr := q.Get("radius")
		userID := q.Get("user_id")

		limit, offset := parsePagination(r, 100, 200)

		radius := 5000
		if radiusStr != "" {
			if v, err := strconv.Atoi(radiusStr); err == nil {
				radius = v
			}
		}

		var lat, lng float64
		hasLocation := false
		if latStr != "" && lngStr != "" {
			lat, _ = strconv.ParseFloat(latStr, 64)
			lng, _ = strconv.ParseFloat(lngStr, 64)
			hasLocation = true
		}

		// Build query
		baseQuery := `SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
			FROM capsules c LEFT JOIN users u ON c.author_id = u.id WHERE 1=1`
		var args []interface{}

		if searchQ != "" {
			baseQuery += " AND c.message LIKE ?"
			args = append(args, "%"+searchQ+"%")
		}
		if tag != "" {
			tags := strings.Split(tag, ",")
			conditions := make([]string, len(tags))
			for i, t := range tags {
				conditions[i] = "c.emotion_tags LIKE ?"
				args = append(args, "%"+strings.TrimSpace(t)+"%")
			}
			baseQuery += " AND (" + strings.Join(conditions, " OR ") + ")"
		}
		if hasLocation {
			minLat, maxLat, minLng, maxLng := services.CalculateBoundingBox(lat, lng, float64(radius))
			baseQuery += " AND c.latitude BETWEEN ? AND ? AND c.longitude BETWEEN ? AND ?"
			args = append(args, minLat, maxLat, minLng, maxLng)
		}

		currentTime := time.Now().UTC().Format(time.RFC3339)
		baseQuery += " AND (c.unlock_at IS NULL OR c.unlock_at <= ?)"
		args = append(args, currentTime)
		baseQuery += " ORDER BY c.created_at DESC LIMIT ? OFFSET ?"
		args = append(args, limit, offset)

		rows, err := db.Query(baseQuery, args...)
		if err != nil {
			WriteError(w, http.StatusInternalServerError, "Query failed")
			return
		}
		defer rows.Close()

		var capsules []models.CapsuleResponse
		for rows.Next() {
			capsule := scanFullCapsule(rows)
			if capsule == nil {
				continue
			}

			if hasLocation {
				dist := services.HaversineDistance(lat, lng, capsule.Latitude, capsule.Longitude)
				if dist > float64(radius) {
					continue
				}
				dist = math.Round(dist*10) / 10
				capsule.DistanceM = &dist
			}

			capsules = append(capsules, *capsule)
		}
		if capsules == nil {
			capsules = []models.CapsuleResponse{}
		}

		// Batch fetch media for N+1 prevention
		ids := make([]string, len(capsules))
		for i, c := range capsules {
			ids[i] = c.ID
		}
		mediaMap := batchQueryMedia(db, ids)
		for i := range capsules {
			capsules[i].Media = mediaMap[capsules[i].ID]
		}

		// User interest-based ranking
		if userID != "" && len(capsules) > 0 {
			userTags := queryUserInterestTags(db, userID)
			if len(userTags) > 0 {
				for i := range capsules {
					matchScore := 0
					var reasons []string
					for _, t := range userTags {
						for _, et := range capsules[i].EmotionTags {
							if t == et {
								matchScore++
								reasons = append(reasons, "匹配情感标签: "+t)
							}
						}
					}
					score := float64(matchScore)
					capsules[i].MatchScore = &score
					capsules[i].MatchReasons = reasons
				}

				// Sort by match score
				sortCapsulesByScore(capsules)
			}
		}

		resp := models.SearchResponse{
			Capsules: capsules,
			Total:    len(capsules),
		}
		WriteJSON(w, http.StatusOK, resp)
	}
}

// GetDailyRecommend handles GET /api/capsules/daily-recommend
func GetDailyRecommend(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		today := time.Now().UTC()
		seed := today.Year()*10000 + int(today.Month())*100 + today.Day()
		currentTime := today.Format(time.RFC3339)

		// Try highly rated first
		rows, err := db.Query(
			`SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
			 FROM capsules c LEFT JOIN users u ON c.author_id = u.id
			 WHERE c.visibility = 'public'
			 AND (c.unlock_at IS NULL OR c.unlock_at <= ?)
			 AND c.emotion_intensity IS NOT NULL AND c.open_count > 0
			 ORDER BY c.open_count DESC, c.emotion_intensity DESC LIMIT 50`,
			currentTime,
		)
		if err != nil {
			WriteError(w, http.StatusInternalServerError, "Query failed")
			return
		}

		var capsules []models.CapsuleResponse
		for rows.Next() {
			if c := scanFullCapsule(rows); c != nil {
				capsules = append(capsules, *c)
			}
		}
		rows.Close()

		// Fallback to public capsules
		if len(capsules) == 0 {
			rows2, err := db.Query(
				`SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
				 FROM capsules c LEFT JOIN users u ON c.author_id = u.id
				 WHERE c.visibility = 'public'
				 AND (c.unlock_at IS NULL OR c.unlock_at <= ?)
				 ORDER BY c.created_at DESC LIMIT 50`,
				currentTime,
			)
			if err != nil {
				WriteError(w, http.StatusInternalServerError, "Query failed")
				return
			}
			for rows2.Next() {
				if c := scanFullCapsule(rows2); c != nil {
					capsules = append(capsules, *c)
				}
			}
			rows2.Close()
		}

		if len(capsules) == 0 {
			WriteError(w, http.StatusNotFound, "No capsules available for recommendation")
			return
		}

		selected := capsules[seed%len(capsules)]

		// Build reasons
		var reasons []string
		if selected.OpenCount > 10 {
			reasons = append(reasons, "今日最受欢迎")
		}
		if selected.EmotionIntensity != nil && *selected.EmotionIntensity > 0.7 {
			reasons = append(reasons, "情感强烈推荐")
		}
		if selected.MoodTag != nil && *selected.MoodTag != "" {
			reasons = append(reasons, *selected.MoodTag+"主题精选")
		}
		if len(reasons) == 0 {
			reasons = append(reasons, "今日特别推荐")
		}

		tomorrow := time.Date(today.Year(), today.Month(), today.Day()+1, 0, 0, 0, 0, time.UTC)
		expiresAt := tomorrow.Format(time.RFC3339)

		resp := models.DailyRecommendResponse{
			Capsule:   selected,
			Reason:    strings.Join(reasons, "、"),
			ExpiresAt: expiresAt,
		}
		WriteJSON(w, http.StatusOK, resp)
	}
}

// ── Reply ───────────────────────────────────────────────────────

// ReplyToCapsule handles POST /api/capsules/{capsule_id}/reply
func ReplyToCapsule(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		capsuleID := r.PathValue("capsule_id")

		var req models.ReplyRequest
		contentType := r.Header.Get("Content-Type")
		if strings.HasPrefix(contentType, "multipart/form-data") {
			if err := r.ParseMultipartForm(10 << 20); err != nil {
				WriteError(w, http.StatusBadRequest, "Failed to parse form data")
				return
			}
			req.Message = r.FormValue("message")
			if aid := r.FormValue("author_id"); aid != "" {
				req.AuthorID = &aid
			}
		} else {
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				WriteError(w, http.StatusBadRequest, "Invalid request body")
				return
			}
		}

		if req.Message == "" || len(req.Message) < 10 || len(req.Message) > 500 {
			WriteError(w, http.StatusBadRequest, "message is required (10-500 chars)")
			return
		}

		// Get original capsule location
		var lat, lng float64
		err := db.QueryRow("SELECT latitude, longitude FROM capsules WHERE id = ?", capsuleID).Scan(&lat, &lng)
		if err != nil {
			WriteError(w, http.StatusNotFound, "Original capsule not found")
			return
		}

		replyID := uuid.New().String()
		geohash := services.Encode(lat, lng, 6)

		_, err = db.Exec(
			`INSERT INTO capsules (id, author_id, latitude, longitude, geohash, message, visibility)
			 VALUES (?, ?, ?, ?, ?, ?, 'public')`,
			replyID, req.AuthorID, lat, lng, geohash, req.Message,
		)
		if err != nil {
			WriteError(w, http.StatusInternalServerError, "Failed to create reply")
			return
		}

		// Record interaction
		interactionID := uuid.New().String()
		db.Exec("INSERT INTO interactions (id, capsule_id, user_id, action) VALUES (?, ?, ?, 'reply')",
			interactionID, capsuleID, req.AuthorID)

		capsule := queryCapsule(db, replyID)
		WriteJSON(w, http.StatusCreated, capsule)
	}
}

// ── Share token ─────────────────────────────────────────────────

// RegenerateShareToken handles POST /api/capsules/{capsule_id}/regenerate-share
func RegenerateShareToken(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		capsuleID := r.PathValue("capsule_id")

		var exists bool
		db.QueryRow("SELECT EXISTS(SELECT 1 FROM capsules WHERE id = ?)", capsuleID).Scan(&exists)
		if !exists {
			WriteError(w, http.StatusNotFound, "Capsule not found")
			return
		}

		newToken := generateShareToken(8)
		db.Exec("UPDATE capsules SET share_token = ? WHERE id = ?", newToken, capsuleID)

		WriteJSON(w, http.StatusOK, models.ShareTokenResponse{ShareToken: newToken})
	}
}

// ── Capsule query helpers ───────────────────────────────────────

func queryCapsule(db *sql.DB, capsuleID string) *models.CapsuleResponse {
	row := db.QueryRow(
		`SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
		 FROM capsules c LEFT JOIN users u ON c.author_id = u.id
		 WHERE c.id = ?`, capsuleID,
	)
	c := scanFullCapsuleRow(row)
	if c != nil {
		c.Media = queryMedia(db, capsuleID)
	}
	return c
}

func queryCapsuleByShareToken(db *sql.DB, token string) *models.CapsuleResponse {
	row := db.QueryRow(
		`SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
		 FROM capsules c LEFT JOIN users u ON c.author_id = u.id
		 WHERE c.share_token = ?`, token,
	)
	c := scanFullCapsuleRow(row)
	if c != nil {
		c.Media = queryMedia(db, c.ID)
	}
	return c
}

func queryCapsulesByAuthor(db *sql.DB, authorID string, limit, offset int) []models.CapsuleResponse {
	rows, err := db.Query(
		`SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
		 FROM capsules c LEFT JOIN users u ON c.author_id = u.id
		 WHERE c.author_id = ?
		 ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
		authorID, limit, offset,
	)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var capsules []models.CapsuleResponse
	capsuleIDs := []string{}
	for rows.Next() {
		if c := scanFullCapsule(rows); c != nil {
			capsules = append(capsules, *c)
			capsuleIDs = append(capsuleIDs, c.ID)
		}
	}
	if capsules == nil {
		capsules = []models.CapsuleResponse{}
	}

	// Batch load media (N+1 prevention)
	mediaMap := batchQueryMedia(db, capsuleIDs)
	for i := range capsules {
		capsules[i].Media = mediaMap[capsules[i].ID]
	}
	return capsules
}

func queryMedia(db *sql.DB, capsuleID string) []models.MediaResponse {
	rows, err := db.Query(
		"SELECT id, capsule_id, type, url, thumbnail_url, sort_order FROM media WHERE capsule_id = ? ORDER BY sort_order",
		capsuleID,
	)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var media []models.MediaResponse
	for rows.Next() {
		var m models.MediaResponse
		var thumbnailURL sql.NullString
		rows.Scan(&m.ID, &m.CapsuleID, &m.Type, &m.URL, &thumbnailURL, &m.SortOrder)
		if thumbnailURL.Valid {
			m.ThumbnailURL = &thumbnailURL.String
		}
		media = append(media, m)
	}
	if media == nil {
		return []models.MediaResponse{}
	}
	return media
}

func batchQueryMedia(db *sql.DB, capsuleIDs []string) map[string][]models.MediaResponse {
	if len(capsuleIDs) == 0 {
		return map[string][]models.MediaResponse{}
	}

	placeholders := make([]string, len(capsuleIDs))
	args := make([]interface{}, len(capsuleIDs))
	for i, id := range capsuleIDs {
		placeholders[i] = "?"
		args[i] = id
	}

	rows, err := db.Query(
		"SELECT id, capsule_id, type, url, thumbnail_url, sort_order FROM media WHERE capsule_id IN ("+
			strings.Join(placeholders, ",")+") ORDER BY sort_order",
		args...,
	)
	if err != nil {
		return map[string][]models.MediaResponse{}
	}
	defer rows.Close()

	result := make(map[string][]models.MediaResponse)
	for rows.Next() {
		var m models.MediaResponse
		var thumbnailURL sql.NullString
		rows.Scan(&m.ID, &m.CapsuleID, &m.Type, &m.URL, &thumbnailURL, &m.SortOrder)
		if thumbnailURL.Valid {
			m.ThumbnailURL = &thumbnailURL.String
		}
		result[m.CapsuleID] = append(result[m.CapsuleID], m)
	}
	return result
}

// batchQueryInteractionCounts loads interaction counts for multiple capsules in one query (N+1 prevention)
func batchQueryInteractionCounts(db *sql.DB, capsuleIDs []string) map[string]int {
	if len(capsuleIDs) == 0 {
		return map[string]int{}
	}

	placeholders := make([]string, len(capsuleIDs))
	args := make([]interface{}, len(capsuleIDs))
	for i, id := range capsuleIDs {
		placeholders[i] = "?"
		args[i] = id
	}

	rows, err := db.Query(
		"SELECT capsule_id, COUNT(*) FROM interactions WHERE capsule_id IN ("+
			strings.Join(placeholders, ",")+") GROUP BY capsule_id",
		args...,
	)
	if err != nil {
		return map[string]int{}
	}
	defer rows.Close()

	result := make(map[string]int)
	for rows.Next() {
		var capsuleID string
		var count int
		rows.Scan(&capsuleID, &count)
		result[capsuleID] = count
	}
	return result
}

func queryUserInterestTags(db *sql.DB, userID string) []string {
	var raw sql.NullString
	db.QueryRow("SELECT interest_tags FROM users WHERE id = ?", userID).Scan(&raw)
	return parseTags(raw)
}

// ── Scanner helpers ─────────────────────────────────────────────

// scanner is an interface satisfied by both *sql.Row and *sql.Rows
type scanner interface {
	Scan(dest ...interface{}) error
}

func scanCapsuleSummary(s scanner) *models.CapsuleSummary {
	var c models.CapsuleSummary
	var authorID, emotionTagsRaw, sentiment, moodTag sql.NullString
	var emotionIntensity sql.NullFloat64
	var authorName, authorAvatar sql.NullString
	var createdAt time.Time

	err := s.Scan(&c.ID, &authorID, &c.Latitude, &c.Longitude, &c.Geohash, &c.Message,
		&emotionTagsRaw, &sentiment, &emotionIntensity, &moodTag,
		&c.Visibility, &c.OpenCount, &createdAt,
		&authorName, &authorAvatar)
	if err != nil {
		return nil
	}

	if authorID.Valid {
		c.AuthorID = &authorID.String
	}
	if authorName.Valid {
		c.Author = &models.AuthorInfo{Name: authorName.String}
		if authorAvatar.Valid {
			c.Author.Avatar = &authorAvatar.String
		}
	}
	c.EmotionTags = parseTags(emotionTagsRaw)
	if sentiment.Valid {
		c.Sentiment = &sentiment.String
	}
	if emotionIntensity.Valid {
		c.EmotionIntensity = &emotionIntensity.Float64
	}
	if moodTag.Valid {
		c.MoodTag = &moodTag.String
	}
	c.CreatedAt = models.FormatTime(createdAt)
	return &c
}

func scanFullCapsule(s scanner) *models.CapsuleResponse {
	var c models.CapsuleResponse
	var authorID, locationName, voiceURL, voiceCloneURL, emotionTagsRaw sql.NullString
	var sentiment, emotionSummary, moodTag, unlockAt sql.NullString
	var emotionIntensity sql.NullFloat64
	var targetUserID, shareToken sql.NullString
	var authorName, authorAvatar sql.NullString
	var createdAt time.Time
	var expiresAt sql.NullTime

	err := s.Scan(
		&c.ID, &authorID, &c.Latitude, &c.Longitude, &c.Geohash, &locationName,
		&c.Message, &voiceURL, &voiceCloneURL, &sql.NullString{}, // voice_sample_url
		&emotionTagsRaw, &sentiment, &emotionIntensity, &emotionSummary,
		&c.Visibility, &targetUserID, &unlockAt, &shareToken,
		&moodTag, &c.OpenCount, &createdAt, &expiresAt,
		&authorName, &authorAvatar,
	)
	if err != nil {
		return nil
	}

	if authorID.Valid {
		c.AuthorID = &authorID.String
	}
	if authorName.Valid {
		c.Author = &models.AuthorInfo{Name: authorName.String}
		if authorAvatar.Valid {
			c.Author.Avatar = &authorAvatar.String
		}
	} else {
		c.Author = &models.AuthorInfo{}
	}
	if locationName.Valid {
		c.LocationName = &locationName.String
	}
	if voiceURL.Valid {
		c.VoiceURL = &voiceURL.String
	}
	if voiceCloneURL.Valid {
		c.VoiceCloneURL = &voiceCloneURL.String
	}
	c.EmotionTags = parseTags(emotionTagsRaw)
	if sentiment.Valid {
		c.Sentiment = &sentiment.String
	}
	if emotionIntensity.Valid {
		c.EmotionIntensity = &emotionIntensity.Float64
	}
	if emotionSummary.Valid {
		c.EmotionSummary = &emotionSummary.String
	}
	if moodTag.Valid {
		c.MoodTag = &moodTag.String
	}
	if unlockAt.Valid && unlockAt.String != "" {
		c.UnlockAt = &unlockAt.String
	}
	c.CreatedAt = models.FormatTime(createdAt)
	c.Media = []models.MediaResponse{}
	c.MatchReasons = []string{}
	return &c
}

func scanFullCapsuleRow(row *sql.Row) *models.CapsuleResponse {
	return scanFullCapsule(row)
}

// ── Utility ─────────────────────────────────────────────────────

// parsePagination extracts limit and offset from query params.
// Supports both limit/offset and page/page_size.
// Default limit, max limit are configurable.
func parsePagination(r *http.Request, defaultLimit, maxLimit int) (limit, offset int) {
	limit = defaultLimit
	offset = 0

	q := r.URL.Query()

	// Support page/page_size as alternative
	if pageStr := q.Get("page"); pageStr != "" {
		page, _ := strconv.Atoi(pageStr)
		pageSize := defaultLimit
		if ps := q.Get("page_size"); ps != "" {
			if v, err := strconv.Atoi(ps); err == nil && v > 0 {
				pageSize = v
			}
		}
		if page < 1 {
			page = 1
		}
		limit = pageSize
		offset = (page - 1) * pageSize
	}

	// limit/offset override page/page_size
	if l := q.Get("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 {
			limit = v
		}
	}
	if o := q.Get("offset"); o != "" {
		if v, err := strconv.Atoi(o); err == nil && v >= 0 {
			offset = v
		}
	}

	// Cap limit
	if limit > maxLimit {
		limit = maxLimit
	}
	if limit < 1 {
		limit = 1
	}

	return
}

func generateShareToken(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	charsetLen := big.NewInt(int64(len(charset)))
	for i := range b {
		n, err := rand.Int(rand.Reader, charsetLen)
		if err != nil {
			// Fallback: use time-based random (should never happen)
			n = big.NewInt(int64(time.Now().UnixNano() % int64(len(charset))))
		}
		b[i] = charset[n.Int64()]
	}
	return string(b)
}

func sortCapsulesByScore(capsules []models.CapsuleResponse) {
	sort.Slice(capsules, func(i, j int) bool {
		si := 0.0
		if capsules[i].MatchScore != nil {
			si = *capsules[i].MatchScore
		}
		sj := 0.0
		if capsules[j].MatchScore != nil {
			sj = *capsules[j].MatchScore
		}
		return si > sj
	})
}
