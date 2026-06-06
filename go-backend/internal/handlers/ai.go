package handlers

import (
	"encoding/json"
	"net/http"
	"sort"
	"strings"

	"time-space-go/internal/models"
)

// ── Emotion tag definitions ─────────────────────────────────────

var emotionTags = []string{
	"怀旧", "温暖", "感恩", "浪漫", "思念", "快乐",
	"遗憾", "鼓励", "幽默", "神秘", "孤独", "希望",
	"青春", "友情", "亲情", "爱情",
}

var positiveTags = map[string]bool{
	"温暖": true, "感恩": true, "浪漫": true, "快乐": true,
	"鼓励": true, "幽默": true, "希望": true, "青春": true,
	"友情": true, "亲情": true, "爱情": true,
}

var negativeTags = map[string]bool{
	"遗憾": true, "孤独": true, "思念": true,
}

// keywordMap is the fallback dictionary for emotion keyword matching
var keywordMap = map[string][]string{
	"怀旧": {"回忆", "从前", "曾经", "过去", "那年", "小时候", "旧时光", "往事", "记忆", "当年"},
	"温暖": {"温暖", "温馨", "暖", "幸福", "安心", "陪伴", "踏实", "感动"},
	"感恩": {"感谢", "感恩", "谢谢", "感激", "珍惜", "幸运"},
	"浪漫": {"浪漫", "心动", "甜蜜", "牵手", "约会", "月光", "星星"},
	"思念": {"想你", "思念", "想念", "远方", "盼", "等你", "好想你", "牵挂"},
	"快乐": {"开心", "快乐", "高兴", "笑", "哈哈", "太好了", "棒"},
	"遗憾": {"遗憾", "可惜", "错过", "来不及", "如果当初", "再也"},
	"鼓励": {"加油", "坚持", "勇敢", "别放弃", "你可以", "相信自己", "努力"},
	"幽默": {"哈哈", "搞笑", "笑死", "段子", "逗", "乐了"},
	"神秘": {"秘密", "神秘", "未知", "奇遇", "魔法", "奇迹", "不可思议"},
	"孤独": {"一个人", "孤独", "寂寞", "独自", "没人", "空荡荡"},
	"希望": {"希望", "期待", "未来", "梦想", "相信", "明天会", "憧憬"},
	"青春": {"青春", "毕业", "校园", "同学", "高中", "大学", "年少", "十八"},
	"友情": {"朋友", "兄弟", "闺蜜", "友情", "友谊", "伙伴", "一起"},
	"亲情": {"家人", "爸妈", "妈妈", "爸爸", "奶奶", "爷爷", "家", "亲人"},
	"爱情": {"爱", "喜欢", "恋人", "对象", "男朋友", "女朋友", "表白", "在一起"},
}

// ── POST /api/ai/analyze-emotion ─────────────────────────────────

func AnalyzeEmotion(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Message string `json:"message"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Message == "" {
		WriteError(w, http.StatusBadRequest, "message is required")
		return
	}

	// Always use keyword analysis (no GPT dependency)
	// Could add GPT call with timeout here later
	result := analyzeWithKeywords(req.Message)
	WriteJSON(w, http.StatusOK, result)
}

// ── GET /api/ai/location-context ─────────────────────────────────

func LocationContext(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	latStr := q.Get("lat")
	lngStr := q.Get("lng")

	// Parse coordinates
	var lat, lng float64
	if latStr != "" && lngStr != "" {
		// Simple parse for query params
		json.Unmarshal([]byte(latStr), &lat)
		json.Unmarshal([]byte(lngStr), &lng)
	}

	// Fallback: no external API call (Nominatim unreachable in this env)
	// Use coordinate-based heuristics for location description
	result := locationFallback(lat, lng)
	WriteJSON(w, http.StatusOK, result)
}

// ── POST /api/ai/scene ───────────────────────────────────────────

func AnalyzeScene(w http.ResponseWriter, r *http.Request) {
	// Accept multipart image but always return fallback (no GPT Vision in Go)
	// Parse to validate the request
	if strings.HasPrefix(r.Header.Get("Content-Type"), "multipart/form-data") {
		if err := r.ParseMultipartForm(10 << 20); err != nil {
			WriteError(w, http.StatusBadRequest, "Failed to parse form data")
			return
		}
	}

	result := sceneFallback()
	WriteJSON(w, http.StatusOK, result)
}

// ── POST /api/ai/voice-clone ─────────────────────────────────────

func VoiceClone(w http.ResponseWriter, r *http.Request) {
	// Accept multipart but always return fallback (no ElevenLabs in Go)
	if strings.HasPrefix(r.Header.Get("Content-Type"), "multipart/form-data") {
		if err := r.ParseMultipartForm(10 << 20); err != nil {
			WriteError(w, http.StatusBadRequest, "Failed to parse form data")
			return
		}
	}

	result := voiceCloneFallback()
	WriteJSON(w, http.StatusOK, result)
}

// ── Keyword-based emotion analysis ───────────────────────────────

func analyzeWithKeywords(message string) models.EmotionAnalysisResponse {
	tagScores := make(map[string]int)

	for tag, keywords := range keywordMap {
		count := 0
		for _, kw := range keywords {
			if strings.Contains(message, kw) {
				count++
			}
		}
		if count > 0 {
			tagScores[tag] = count
		}
	}

	var emotions []string
	var intensity float64

	if len(tagScores) > 0 {
		// Sort by score descending
		type scored struct {
			tag   string
			score int
		}
		var sorted []scored
		for t, s := range tagScores {
			sorted = append(sorted, scored{t, s})
		}
		sort.Slice(sorted, func(i, j int) bool { return sorted[i].score > sorted[j].score })

		for i := 0; i < len(sorted) && i < 4; i++ {
			emotions = append(emotions, sorted[i].tag)
		}
		if len(emotions) < 2 {
			emotions = append(emotions, "温暖", "希望")
			emotions = emotions[:2]
		}

		totalMatches := 0
		for _, s := range tagScores {
			totalMatches += s
		}
		intensity = float64(totalMatches) / 5.0
		if intensity > 1.0 {
			intensity = 1.0
		}
	} else {
		emotions = []string{"温暖", "希望"}
		intensity = 0.3
	}

	sentiment := classifySentiment(emotions)
	summary := "包含" + strings.Join(emotions[:min(2, len(emotions))], "、") + "情感的留言"

	return models.EmotionAnalysisResponse{
		Emotions:  emotions,
		Sentiment: sentiment,
		Intensity: float64(int(intensity*100)) / 100,
		Summary:   summary,
	}
}

// ── Location fallback ────────────────────────────────────────────

func locationFallback(lat, lng float64) models.LocationContext {
	// Without Nominatim access, provide coordinate-based fallback
	name := "未知位置"
	description := "一个值得探索的地点"
	moods := []string{"温暖", "希望"}

	// Simple heuristic: coordinate quadrant suggests region type
	if lat > 30 && lat < 40 && lng > 110 && lng < 125 {
		name = "中国东部城区"
		description = "繁华的东部沿海地区，历史与现代交融"
		moods = []string{"怀旧", "希望", "温暖"}
	} else if lat > 20 && lat < 30 && lng > 100 && lng < 120 {
		name = "南方城市"
		description = "温暖湿润的南方城市，充满活力与生机"
		moods = []string{"温暖", "希望", "快乐"}
	} else if lat > 35 && lat < 45 && lng > 115 && lng < 130 {
		name = "北方城区"
		description = "四季分明的北方地区，人文底蕴深厚"
		moods = []string{"思念", "温暖", "鼓励"}
	}

	return models.LocationContext{
		Name:               name,
		Description:        description,
		NearbyCapsuleCount: 0,
		SuggestedMoods:     moods,
	}
}

// ── Scene fallback ───────────────────────────────────────────────

func sceneFallback() models.SceneResponse {
	return models.SceneResponse{
		SceneType:   "未知",
		Description: "场景识别暂时不可用，正在为您探索周围环境",
		Atmosphere:  "神秘而有趣",
		MoodMatch:   []string{"温暖", "希望"},
	}
}

// ── Voice clone fallback ─────────────────────────────────────────

func voiceCloneFallback() models.VoiceCloneResponse {
	return models.VoiceCloneResponse{
		VoiceID:         "fallback",
		AudioURL:        "/uploads/voice_clones/fallback.mp3",
		DurationSeconds: 3.0,
	}
}

// ── Helpers ──────────────────────────────────────────────────────

func classifySentiment(emotions []string) string {
	posCount := 0
	negCount := 0
	for _, e := range emotions {
		if positiveTags[e] {
			posCount++
		}
		if negativeTags[e] {
			negCount++
		}
	}
	if posCount > negCount {
		return "positive"
	}
	if negCount > posCount {
		return "negative"
	}
	return "neutral"
}
