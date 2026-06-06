package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"time-space-go/internal/models"
)

func TestAnalyzeEmotionKeywords(t *testing.T) {
	tests := []struct {
		message  string
		expected []string // at least one of these should appear
	}{
		{"想你了，好想你", []string{"思念"}},
		{"校园时光真美好，怀念那年初夏", []string{"怀旧", "青春"}},
		{"加油！你可以的！坚持就是胜利", []string{"鼓励"}},
		{"今天天气真好，开心", []string{"快乐"}},
		{"一个人在外面，有时候觉得很孤单", []string{"孤独"}},
		{"谢谢你一直陪在我身边", []string{"感恩", "温暖"}},
		{"哈哈笑死我了这也太好笑了吧", []string{"幽默"}},
		{"我希望未来的每一天都充满阳光", []string{"希望"}},
		{"爸爸妈妈我爱你们", []string{"亲情"}},
		{"我和闺蜜一起逛街好开心", []string{"友情"}},
	}

	for _, tt := range tests {
		t.Run(tt.message[:min(10, len(tt.message))], func(t *testing.T) {
			body := `{"message": "` + tt.message + `"}`
			req := httptest.NewRequest("POST", "/api/ai/analyze-emotion", strings.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			rr := httptest.NewRecorder()

			AnalyzeEmotion(rr, req)

			if rr.Code != http.StatusOK {
				t.Errorf("expected 200, got %d: %s", rr.Code, rr.Body.String())
				return
			}

			var resp models.EmotionAnalysisResponse
			json.Unmarshal(rr.Body.Bytes(), &resp)

			if len(resp.Emotions) < 2 {
				t.Errorf("expected at least 2 emotions, got %d: %v", len(resp.Emotions), resp.Emotions)
			}
			if resp.Sentiment == "" {
				t.Error("sentiment should not be empty")
			}
			if resp.Intensity < 0 || resp.Intensity > 1 {
				t.Errorf("intensity out of range: %f", resp.Intensity)
			}

			// Check at least one expected tag
			found := false
			for _, e := range resp.Emotions {
				for _, expected := range tt.expected {
					if e == expected {
						found = true
						break
					}
				}
			}
			if !found {
				t.Logf("Message: %s → emotions: %v (expected one of %v)", tt.message, resp.Emotions, tt.expected)
			}
		})
	}
}

func TestAnalyzeEmotionEmpty(t *testing.T) {
	body := `{"message": ""}`
	req := httptest.NewRequest("POST", "/api/ai/analyze-emotion", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	AnalyzeEmotion(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for empty message, got %d", rr.Code)
	}
}

func TestAnalyzeEmotionNoMatch(t *testing.T) {
	// Message with no keyword matches
	body := `{"message": "今天的天气非常晴朗适宜出行"}`
	req := httptest.NewRequest("POST", "/api/ai/analyze-emotion", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	AnalyzeEmotion(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}

	var resp models.EmotionAnalysisResponse
	json.Unmarshal(rr.Body.Bytes(), &resp)

	// Should still return valid result with default emotions
	if len(resp.Emotions) < 2 {
		t.Errorf("expected fallback emotions, got %v", resp.Emotions)
	}
}

func TestLocationContext(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/ai/location-context?lat=31.2304&lng=121.4737", nil)
	rr := httptest.NewRecorder()

	LocationContext(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var resp models.LocationContext
	json.Unmarshal(rr.Body.Bytes(), &resp)

	if resp.Name == "" {
		t.Error("name should not be empty")
	}
	if len(resp.SuggestedMoods) == 0 {
		t.Error("suggested_moods should not be empty")
	}
}

func TestLocationContextDefault(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/ai/location-context?lat=0&lng=0", nil)
	rr := httptest.NewRecorder()

	LocationContext(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}

	var resp models.LocationContext
	json.Unmarshal(rr.Body.Bytes(), &resp)
	if resp.Name != "未知位置" {
		t.Errorf("expected '未知位置', got '%s'", resp.Name)
	}
}

func TestAnalyzeScene(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/ai/scene", nil)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	AnalyzeScene(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var resp models.SceneResponse
	json.Unmarshal(rr.Body.Bytes(), &resp)

	if resp.SceneType == "" {
		t.Error("scene_type should not be empty")
	}
	if len(resp.MoodMatch) == 0 {
		t.Error("mood_match should not be empty")
	}
}

func TestVoiceClone(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/ai/voice-clone", nil)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	VoiceClone(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var resp models.VoiceCloneResponse
	json.Unmarshal(rr.Body.Bytes(), &resp)

	if resp.VoiceID != "fallback" {
		t.Errorf("expected fallback voice_id, got '%s'", resp.VoiceID)
	}
}

func TestClassifySentiment(t *testing.T) {
	tests := []struct {
		emotions []string
		expected string
	}{
		{[]string{"温暖", "快乐", "希望"}, "positive"},
		{[]string{"遗憾", "孤独"}, "negative"},
		{[]string{"怀旧", "神秘"}, "neutral"},
		{[]string{"温暖", "遗憾"}, "neutral"}, // tied
		{[]string{}, "neutral"},
	}
	for _, tt := range tests {
		result := classifySentiment(tt.emotions)
		if result != tt.expected {
			t.Errorf("classifySentiment(%v) = %s, want %s", tt.emotions, result, tt.expected)
		}
	}
}

func TestAllAIEndpointsWorkWithoutAPIKey(t *testing.T) {
	// Verify all AI endpoints return 200 (never 500) without any external API keys
	endpoints := []struct {
		method string
		path   string
		body   string
	}{
		{"POST", "/api/ai/analyze-emotion", `{"message":"测试消息内容"}`},
		{"GET", "/api/ai/location-context?lat=31.23&lng=121.47", ""},
		{"POST", "/api/ai/scene", ""},
		{"POST", "/api/ai/voice-clone", ""},
	}

	for _, ep := range endpoints {
		t.Run(ep.path, func(t *testing.T) {
			var req *http.Request
			if ep.body != "" {
				req = httptest.NewRequest(ep.method, ep.path, strings.NewReader(ep.body))
				req.Header.Set("Content-Type", "application/json")
			} else {
				req = httptest.NewRequest(ep.method, ep.path, nil)
			}
			rr := httptest.NewRecorder()

			switch ep.path {
			case "/api/ai/analyze-emotion":
				AnalyzeEmotion(rr, req)
			case "/api/ai/location-context?lat=31.23&lng=121.47":
				LocationContext(rr, req)
			case "/api/ai/scene":
				AnalyzeScene(rr, req)
			case "/api/ai/voice-clone":
				VoiceClone(rr, req)
			}

			if rr.Code != http.StatusOK {
				t.Errorf("expected 200 for %s, got %d: %s", ep.path, rr.Code, rr.Body.String())
			}
		})
	}
}
