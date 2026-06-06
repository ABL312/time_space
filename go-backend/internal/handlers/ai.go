package handlers

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strconv"
	"strings"
	"time"

	"time-space-go/internal/config"
)

const maxVisionImageBytes = 6 << 20

type ARSceneLayoutResponse struct {
	SceneType     string         `json:"scene_type"`
	GroundVisible bool           `json:"ground_visible"`
	Placement     ARPlacement    `json:"placement"`
	SafeZones     []ARLayoutZone `json:"safe_zones"`
	AvoidZones    []ARLayoutZone `json:"avoid_zones"`
	Atmosphere    string         `json:"atmosphere"`
	BlessingCopy  string         `json:"blessing_copy"`
	Confidence    float64        `json:"confidence"`
	Source        string         `json:"source"`
}

type ARPlacement struct {
	Anchor    string  `json:"anchor"`
	X         float64 `json:"x"`
	Y         float64 `json:"y"`
	Scale     float64 `json:"scale"`
	DepthHint string  `json:"depth_hint"`
}

type ARLayoutZone struct {
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
	Width  float64 `json:"width"`
	Height float64 `json:"height"`
	Reason string  `json:"reason"`
}

type qwenChatRequest struct {
	Model       string            `json:"model"`
	Messages    []qwenChatMessage `json:"messages"`
	MaxTokens   int               `json:"max_tokens"`
	Temperature float64           `json:"temperature"`
}

type qwenChatMessage struct {
	Role    string            `json:"role"`
	Content []qwenContentPart `json:"content"`
}

type qwenContentPart struct {
	Type     string        `json:"type"`
	Text     string        `json:"text,omitempty"`
	ImageURL *qwenImageURL `json:"image_url,omitempty"`
}

type qwenImageURL struct {
	URL string `json:"url"`
}

type qwenChatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
		Type    string `json:"type"`
	} `json:"error,omitempty"`
}

func AIHandler(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/api/ai")
		path = strings.Trim(path, "/")

		switch {
		case r.Method == http.MethodPost && path == "ar-scene-layout":
			arSceneLayout(w, r, cfg)
		default:
			WriteError(w, http.StatusNotFound, "AI endpoint not found")
		}
	}
}

func arSceneLayout(w http.ResponseWriter, r *http.Request, cfg *config.Config) {
	if err := r.ParseMultipartForm(12 << 20); err != nil {
		WriteError(w, http.StatusBadRequest, "Invalid multipart request")
		return
	}

	capsuleCount := parseOptionalInt(r.FormValue("capsule_count"), 0)
	lat := parseOptionalFloat(r.FormValue("latitude"))
	lng := parseOptionalFloat(r.FormValue("longitude"))

	file, header, err := r.FormFile("image")
	if err != nil {
		WriteJSON(w, http.StatusOK, fallbackARLayout(capsuleCount, lat, lng, "fallback_no_image"))
		return
	}
	defer file.Close()

	imageBytes, contentType, err := readVisionImage(file, header)
	if err != nil {
		WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	if cfg.QwenAPIKey == "" {
		WriteJSON(w, http.StatusOK, fallbackARLayout(capsuleCount, lat, lng, "fallback_no_qwen_key"))
		return
	}

	layout, err := callQwenARLayout(cfg, imageBytes, contentType, capsuleCount, lat, lng)
	if err != nil {
		fallback := fallbackARLayout(capsuleCount, lat, lng, "fallback_qwen_error")
		fallback.Atmosphere = "视觉识别暂时不可用，已使用稳定的屏幕下方摆放方案"
		WriteJSON(w, http.StatusOK, fallback)
		return
	}

	layout.Source = "qwen_vl"
	layout = sanitizeARLayout(layout, capsuleCount)
	WriteJSON(w, http.StatusOK, layout)
}

func readVisionImage(file multipart.File, header *multipart.FileHeader) ([]byte, string, error) {
	limited := io.LimitReader(file, maxVisionImageBytes+1)
	data, err := io.ReadAll(limited)
	if err != nil {
		return nil, "", fmt.Errorf("Failed to read image")
	}
	if len(data) == 0 {
		return nil, "", fmt.Errorf("Image is empty")
	}
	if len(data) > maxVisionImageBytes {
		return nil, "", fmt.Errorf("Image too large; max 6MB")
	}

	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = http.DetectContentType(data)
	}
	if contentType != "image/jpeg" && contentType != "image/png" && contentType != "image/webp" {
		return nil, "", fmt.Errorf("Unsupported image type")
	}

	return data, contentType, nil
}

func callQwenARLayout(cfg *config.Config, imageBytes []byte, contentType string, capsuleCount int, lat *float64, lng *float64) (ARSceneLayoutResponse, error) {
	prompt := buildARLayoutPrompt(capsuleCount, lat, lng)
	imageDataURL := "data:" + contentType + ";base64," + base64.StdEncoding.EncodeToString(imageBytes)

	requestBody := qwenChatRequest{
		Model: cfg.QwenModel,
		Messages: []qwenChatMessage{{
			Role: "user",
			Content: []qwenContentPart{
				{Type: "text", Text: prompt},
				{Type: "image_url", ImageURL: &qwenImageURL{URL: imageDataURL}},
			},
		}},
		MaxTokens:   700,
		Temperature: 0.2,
	}

	body, err := json.Marshal(requestBody)
	if err != nil {
		return ARSceneLayoutResponse{}, err
	}

	client := &http.Client{Timeout: 25 * time.Second}
	req, err := http.NewRequest(http.MethodPost, "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return ARSceneLayoutResponse{}, err
	}
	req.Header.Set("Authorization", "Bearer "+cfg.QwenAPIKey)
	req.Header.Set("Content-Type", "application/json")

	res, err := client.Do(req)
	if err != nil {
		return ARSceneLayoutResponse{}, err
	}
	defer res.Body.Close()

	resBody, err := io.ReadAll(io.LimitReader(res.Body, 2<<20))
	if err != nil {
		return ARSceneLayoutResponse{}, err
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return ARSceneLayoutResponse{}, fmt.Errorf("qwen status %d", res.StatusCode)
	}

	var qwenRes qwenChatResponse
	if err := json.Unmarshal(resBody, &qwenRes); err != nil {
		return ARSceneLayoutResponse{}, err
	}
	if qwenRes.Error != nil {
		return ARSceneLayoutResponse{}, fmt.Errorf("%s", qwenRes.Error.Message)
	}
	if len(qwenRes.Choices) == 0 || strings.TrimSpace(qwenRes.Choices[0].Message.Content) == "" {
		return ARSceneLayoutResponse{}, fmt.Errorf("empty qwen response")
	}

	var layout ARSceneLayoutResponse
	content := strings.TrimSpace(qwenRes.Choices[0].Message.Content)
	content = strings.TrimPrefix(content, "```json")
	content = strings.TrimPrefix(content, "```")
	content = strings.TrimSuffix(content, "```")
	content = strings.TrimSpace(content)
	if err := json.Unmarshal([]byte(content), &layout); err != nil {
		return ARSceneLayoutResponse{}, err
	}

	return layout, nil
}

func buildARLayoutPrompt(capsuleCount int, lat *float64, lng *float64) string {
	location := "unknown"
	if lat != nil && lng != nil {
		location = fmt.Sprintf("lat=%.6f,lng=%.6f", *lat, *lng)
	}
	return fmt.Sprintf(`你是移动端智能 AR 场景布局助手。请分析手机摄像头画面，为“时空信箱”的留言胶囊卡片选择稳定的屏幕摆放位置。

上下文：附近有 %d 个胶囊，位置 %s。

要求：
1. 判断 scene_type，例如 campus_outdoor, street, indoor, park, building, unknown。
2. 判断画面中是否能看到地面、桌面、路面、草地等可承载区域。
3. 给出一个最适合放置 AR 胶囊卡片的位置，使用 0~1 归一化屏幕坐标。
4. 避免遮挡人脸、文字、主要物体；没有明显地面时，给屏幕下方保守位置。
5. scale 控制在 0.65 到 1.15；confidence 控制在 0 到 1。
6. blessing_copy 字段保留兼容旧前端，但内容必须是中性的胶囊提示，例如“这里有几个附近胶囊”；不要使用节日问候类措辞。
7. 只返回严格 JSON，不要 markdown。

JSON 格式：
{
  "scene_type": "campus_outdoor",
  "ground_visible": true,
  "placement": {"anchor":"bottom_center", "x":0.5, "y":0.72, "scale":0.9, "depth_hint":"middle"},
  "safe_zones": [{"x":0.35,"y":0.62,"width":0.3,"height":0.25,"reason":"地面区域"}],
  "avoid_zones": [{"x":0.4,"y":0.15,"width":0.2,"height":0.2,"reason":"主体区域"}],
  "atmosphere": "校园道路旁，适合锚定附近留言胶囊",
  "blessing_copy": "这里有几个附近胶囊",
  "confidence": 0.82
}`, capsuleCount, location)
}

func fallbackARLayout(capsuleCount int, lat *float64, lng *float64, source string) ARSceneLayoutResponse {
	copy := "这里有 1 个附近胶囊"
	if capsuleCount > 1 {
		copy = fmt.Sprintf("这里有 %d 个附近胶囊", capsuleCount)
	}
	return ARSceneLayoutResponse{
		SceneType:     "unknown",
		GroundVisible: false,
		Placement: ARPlacement{
			Anchor:    "bottom_center",
			X:         0.5,
			Y:         0.68,
			Scale:     0.9,
			DepthHint: "middle",
		},
		SafeZones: []ARLayoutZone{{
			X:      0.32,
			Y:      0.56,
			Width:  0.36,
			Height: 0.28,
			Reason: "稳定的屏幕下方展示区域",
		}},
		AvoidZones:   []ARLayoutZone{},
		Atmosphere:   "请把镜头对准地面或周围环境，智能 AR 会把胶囊卡片锚定在合适位置",
		BlessingCopy: copy,
		Confidence:   0.45,
		Source:       source,
	}
}

func sanitizeARLayout(layout ARSceneLayoutResponse, capsuleCount int) ARSceneLayoutResponse {
	if layout.SceneType == "" {
		layout.SceneType = "unknown"
	}
	if layout.Placement.Anchor == "" {
		layout.Placement.Anchor = "bottom_center"
	}
	layout.Placement.X = clampFloat(layout.Placement.X, 0.12, 0.88, 0.5)
	layout.Placement.Y = clampFloat(layout.Placement.Y, 0.18, 0.84, 0.68)
	layout.Placement.Scale = clampFloat(layout.Placement.Scale, 0.65, 1.15, 0.9)
	if layout.Placement.DepthHint == "" {
		layout.Placement.DepthHint = "middle"
	}
	layout.Confidence = clampFloat(layout.Confidence, 0, 1, 0.7)
	if layout.Atmosphere == "" {
		layout.Atmosphere = "已识别当前环境，正在锚定附近胶囊"
	}
	if layout.BlessingCopy == "" {
		layout.BlessingCopy = fallbackARLayout(capsuleCount, nil, nil, "fallback_copy").BlessingCopy
	}
	return layout
}

func parseOptionalInt(value string, fallback int) int {
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func parseOptionalFloat(value string) *float64 {
	if value == "" {
		return nil
	}
	parsed, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return nil
	}
	return &parsed
}

func clampFloat(value float64, min float64, max float64, fallback float64) float64 {
	if value == 0 {
		value = fallback
	}
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}
