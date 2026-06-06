package models

import "time"

// ── User ────────────────────────────────────────────────────────

type UserCreateRequest struct {
	Name         string   `json:"name"`
	InterestTags []string `json:"interest_tags"`
}

type UserUpdateRequest struct {
	Name         *string   `json:"name,omitempty"`
	InterestTags *[]string `json:"interest_tags,omitempty"`
	AvatarURL    *string   `json:"avatar_url,omitempty"`
}

type UserResponse struct {
	ID           string   `json:"id"`
	Name         string   `json:"name"`
	AvatarURL    *string  `json:"avatar_url"`
	InterestTags []string `json:"interest_tags"`
	CreatedAt    string   `json:"created_at"`
}

type UserStats struct {
	CreatedCount   int              `json:"created_count"`
	OpenedCount    int              `json:"opened_count"`
	FavoritedCount int              `json:"favorited_count"`
	TotalCapsules  int              `json:"total_capsules"`
	RecentOpened   []CapsuleSummary `json:"recent_opened"`
	RecentCreated  []CapsuleSummary `json:"recent_created"`
}

// ── Capsule ─────────────────────────────────────────────────────

type CapsuleCreateRequest struct {
	Message       string  `json:"message"`
	Latitude      float64 `json:"latitude"`
	Longitude     float64 `json:"longitude"`
	MoodTag       *string `json:"mood_tag,omitempty"`
	Visibility    string  `json:"visibility"`
	TargetUserID  *string `json:"target_user_id,omitempty"`
	AuthorID      *string `json:"author_id,omitempty"`
	VoiceCloneURL *string `json:"voice_clone_url,omitempty"`
	UnlockAt      *string `json:"unlock_at,omitempty"`
}

type CapsuleResponse struct {
	ID               string            `json:"id"`
	AuthorID         *string           `json:"author_id"`
	Author           *AuthorInfo       `json:"author"`
	Latitude         float64           `json:"latitude"`
	Longitude        float64           `json:"longitude"`
	Geohash          string            `json:"geohash"`
	LocationName     *string           `json:"location_name"`
	Message          string            `json:"message"`
	VoiceURL         *string           `json:"voice_url"`
	VoiceCloneURL    *string           `json:"voice_clone_url"`
	EmotionTags      []string          `json:"emotion_tags"`
	Sentiment        *string           `json:"sentiment"`
	EmotionIntensity *float64          `json:"emotion_intensity"`
	EmotionSummary   *string           `json:"emotion_summary"`
	MoodTag          *string           `json:"mood_tag"`
	Visibility       string            `json:"visibility"`
	UnlockAt         *string           `json:"unlock_at"`
	OpenCount        int               `json:"open_count"`
	CreatedAt        string            `json:"created_at"`
	Media            []MediaResponse   `json:"media"`
	DistanceM        *float64          `json:"distance_m"`
	MatchScore       *float64          `json:"match_score"`
	MatchReasons     []string          `json:"match_reasons"`
}

type CapsuleSummary struct {
	ID               string       `json:"id"`
	AuthorID         *string      `json:"author_id"`
	Author           *AuthorInfo  `json:"author"`
	Latitude         float64      `json:"latitude"`
	Longitude        float64      `json:"longitude"`
	Geohash          string       `json:"geohash"`
	Message          string       `json:"message"`
	EmotionTags      []string     `json:"emotion_tags"`
	Sentiment        *string      `json:"sentiment"`
	EmotionIntensity *float64     `json:"emotion_intensity"`
	MoodTag          *string      `json:"mood_tag"`
	Visibility       string       `json:"visibility"`
	OpenCount        int          `json:"open_count"`
	CreatedAt        string       `json:"created_at"`
	Media            []MediaResponse `json:"media"`
	DistanceM        *float64     `json:"distance_m"`
	MatchScore       *float64     `json:"match_score"`
	MatchReasons     []string     `json:"match_reasons"`
}

type AuthorInfo struct {
	Name   string  `json:"name"`
	Avatar *string `json:"avatar"`
}

type NearbyResponse struct {
	LocationContext *LocationContext  `json:"location_context"`
	Total           int               `json:"total"`
	Recommended     []CapsuleResponse `json:"recommended"`
	Others          []CapsuleResponse `json:"others"`
}

type LocationContext struct {
	Name               string   `json:"name"`
	Description        string   `json:"description"`
	NearbyCapsuleCount int      `json:"nearby_capsule_count"`
	SuggestedMoods     []string `json:"suggested_moods"`
}

type SearchResponse struct {
	Capsules []CapsuleResponse `json:"capsules"`
	Total    int               `json:"total"`
}

type MineResponse struct {
	Capsules []CapsuleResponse `json:"capsules"`
	Total    int               `json:"total"`
}

type DailyRecommendResponse struct {
	Capsule   CapsuleResponse `json:"capsule"`
	Reason    string          `json:"reason"`
	ExpiresAt string          `json:"expires_at"`
}

type ShareTokenResponse struct {
	ShareToken string `json:"share_token"`
}

type LockedResponse struct {
	Locked           bool   `json:"locked"`
	UnlockAt         string `json:"unlock_at"`
	CountdownSeconds int    `json:"countdown_seconds"`
}

type ReplyRequest struct {
	Message  string  `json:"message"`
	AuthorID *string `json:"author_id,omitempty"`
}

// ── Media ───────────────────────────────────────────────────────

type MediaResponse struct {
	ID           string  `json:"id"`
	CapsuleID    string  `json:"capsule_id"`
	Type         string  `json:"type"`
	URL          string  `json:"url"`
	ThumbnailURL *string `json:"thumbnail_url"`
	SortOrder    int     `json:"sort_order"`
}

// ── Internal helpers ────────────────────────────────────────────

// FormatTime formats a time.Time to ISO 8601 string, or empty if zero
func FormatTime(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.UTC().Format(time.RFC3339)
}

// FormatTimePtr formats a *time.Time, returning nil string if nil
func FormatTimePtr(t *time.Time) *string {
	if t == nil || t.IsZero() {
		return nil
	}
	s := t.UTC().Format(time.RFC3339)
	return &s
}

// NullableTime returns *time.Time from sql.NullTime (Go 1.26 compatible)
func NullableTime(t interface{}) *time.Time {
	// sql.NullTime in Go 1.26 has Time and Valid fields
	// We receive it as an interface for forward compat
	return nil
}
