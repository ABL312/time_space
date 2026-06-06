# Go 后端 API 对接卡片

> Go 后端入口: `go-backend/cmd/server/main.go`
> 端口: 8002 (Fermin 默认), 可配环境变量 `PORT`
> 契约来源: `origin/main` Python FastAPI (`backend/app/routers/`)

---

## 已实现端点总览

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/health` | 健康检查 |
| `POST` | `/api/users` | 创建用户 |
| `GET` | `/api/users/{user_id}` | 获取用户 |
| `PUT` | `/api/users/{user_id}` | 更新用户 |
| `GET` | `/api/users/{user_id}/stats` | 用户统计 |
| `POST` | `/api/capsules` | 创建胶囊 (JSON/multipart) |
| `GET` | `/api/capsules/{capsule_id}` | 获取胶囊详情 |
| `GET` | `/api/capsules/mine` | 我的胶囊列表 |
| `GET` | `/api/capsules/nearby` | 附近胶囊 |
| `GET` | `/api/capsules/search` | 搜索胶囊 |
| `GET` | `/api/capsules/daily-recommend` | 每日推荐 |
| `GET` | `/api/capsules/shared/{share_token}` | 分享链接获取 |
| `POST` | `/api/capsules/{capsule_id}/reply` | 回复胶囊 |
| `POST` | `/api/capsules/{capsule_id}/regenerate-share` | 重新生成分享令牌 |
| `POST` | `/api/upload/photo` | 上传照片 (multipart) |
| `POST` | `/api/upload/voice` | 上传语音 (multipart) |
| `GET`  | `/uploads/*` | 静态文件访问 |
| `POST` | `/api/ai/analyze-emotion` | 情感分析 (关键词 fallback) |
| `GET` | `/api/ai/location-context` | 位置上下文 |
| `POST` | `/api/ai/scene` | 场景识别 (fallback) |
| `POST` | `/api/ai/voice-clone` | 语音克隆 (fallback) |

---

## `GET /api/health`

- 请求体: 无
- 响应体:
  ```json
  {
    "status": "ok",
    "service": "go-backend",
    "version": "1.0.0",
    "environment": "development",
    "timestamp": "2026-06-06T07:47:36Z",
    "db": {"status": "ok"},
    "media": {"status": "ok"},
    "config": {"database_url_set": true, "upload_dir": "./data/uploads"}
  }
  ```
- 错误码: 无 (始终 200)

---

## Users API

### `POST /api/users`
- 请求体 (JSON):
  ```json
  {"name": "小明", "interest_tags": ["校园", "家庭", "旅行"]}
  ```
- 响应 201:
  ```json
  {"id": "uuid", "name": "小明", "avatar_url": null, "interest_tags": ["校园","家庭","旅行"], "created_at": "2026-06-06T08:00:00Z"}
  ```

### `GET /api/users/{user_id}`
- 响应 200: 同上 UserResponse
- 错误: 404 `{"error":"User not found","code":404}`

### `PUT /api/users/{user_id}`
- 请求体 (JSON, 部分字段可选):
  ```json
  {"name": "新名字", "interest_tags": ["标签1","标签2","标签3"], "avatar_url": "https://..."}
  ```
- 响应 200: UserResponse

### `GET /api/users/{user_id}/stats`
- 响应 200:
  ```json
  {
    "created_count": 3,
    "opened_count": 5,
    "favorited_count": 1,
    "total_capsules": 10,
    "recent_opened": [...],
    "recent_created": [...]
  }
  ```

---

## Capsules API

### `POST /api/capsules`
- 支持 JSON 和 multipart/form-data
- JSON 请求体:
  ```json
  {
    "message": "消息内容(10-500字)",
    "latitude": 31.2304,
    "longitude": 121.4737,
    "mood_tag": "怀旧",
    "visibility": "public",
    "author_id": "user-uuid",
    "unlock_at": "2026-06-07T00:00:00Z"
  }
  ```
- 响应 201: CapsuleResponse (含 geohash, author, media, share_token)

### `GET /api/capsules/{capsule_id}`
- 自动递增 open_count + 记录 interaction
- 时间锁胶囊返回: `{"locked":true,"unlock_at":"...","countdown_seconds":3600}`
- 响应 200: CapsuleResponse (含 media 列表)

### `GET /api/capsules/mine?user_id={user_id}`
- 响应 200: `{"capsules": [...], "total": N}`

### `GET /api/capsules/nearby`
- 参数: `lat`, `lng`, `radius`(默认1200m), `limit`(默认50, 最大100), `user_id`, `scene_mood_match`
- Geohash 预过滤 + Haversine 精确距离排序
- 推荐引擎四维加权: 距离40% + 情感30% + 场景20% + 热度10%
- 响应 200:
  ```json
  {
    "location_context": null,
    "total": 5,
    "recommended": [{...CapsuleResponse, "distance_m": 50.0, "match_score": 0.85, "match_reasons": ["就在你附近"]}],
    "others": [...]
  }
  ```

### `GET /api/capsules/search`
- 参数: `q`(全文), `tag`(逗号分隔情感标签), `lat`, `lng`, `radius`
- 响应 200: `{"capsules": [...], "total": N}`
- user_id 存在时按兴趣标签排序

### `GET /api/capsules/daily-recommend`
- 基于日期 seed 随机选取
- 优先高评分胶囊 (open_count>0 AND emotion_intensity NOT NULL)
- 响应 200:
  ```json
  {"capsule": {...}, "reason": "今日最受欢迎、情感强烈推荐", "expires_at": "2026-06-07T00:00:00Z"}
  ```

### `GET /api/capsules/shared/{share_token}`
- 同 get capsule，支持时间锁
- 自动递增 open_count

### `POST /api/capsules/{capsule_id}/reply`
- JSON/multipart: `{"message": "回复内容", "author_id": "..."}`
- 在同位置创建新胶囊 (visibility=public)
- 响应 201: CapsuleResponse

### `POST /api/capsules/{capsule_id}/regenerate-share`
- 响应 200: `{"share_token": "newToken1234"}`

---

## 错误响应格式

所有错误统一格式:
```json
{"error": "描述信息", "code": 400}
```

常见状态码: 201(Created), 400(Bad Request), 404(Not Found)

---

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `8080` | 服务端口 |
| `DATABASE_URL` | `./data/timespace.db` | SQLite 数据库路径 |
| `UPLOAD_DIR` | `./data/uploads` | 上传文件目录 |
| `CORS_ORIGINS` | `*` | CORS 允许源 |
| `ENVIRONMENT` | `development` | 运行环境 |
| `MAX_PHOTO_SIZE_MB` | `5` | 照片最大上传大小 (MB) |
| `MAX_VOICE_SIZE_MB` | `10` | 语音最大上传大小 (MB) |

---

## Upload API

### `POST /api/upload/photo`
- 请求: `multipart/form-data`, 字段 `file`
- 支持类型: `image/jpeg`, `image/png`, `image/webp`
- Magic bytes 校验: JPEG(FFD8FF) / PNG(89504E47) / WebP(RIFF…WEBP)
- 大小限制: `MAX_PHOTO_SIZE_MB` (默认 5MB)
- 文件名: UUID + `.jpg` (路径穿越免疫)
- 响应 200:
  ```json
  {"url": "/uploads/photos/uuid.jpg", "filename": "uuid.jpg"}
  ```
- 错误:
  - 400 `"Image type 'xxx' not supported"`
  - 400 `"File content does not match any supported image format"`
  - 400 `"Missing 'file' field in form data"`
  - 413 `"Photo exceeds maximum size of 5 MB"`

### `POST /api/upload/voice`
- 请求: `multipart/form-data`, 字段 `file`
- 支持类型: `audio/webm`, `audio/mpeg`, `audio/mp4`, `audio/ogg`, `audio/wav`, `audio/x-wav`
- 大小限制: `MAX_VOICE_SIZE_MB` (默认 10MB)
- 扩展名从 MIME 映射: webm→.webm, mpeg→.mp3, mp4→.m4a, ogg→.ogg, wav→.wav
- 响应 200:
  ```json
  {"url": "/uploads/voices/uuid.ext", "filename": "uuid.ext"}
  ```

### `GET /uploads/*`
- 静态文件服务, 映射到 `UPLOAD_DIR` 目录
- 示例: `GET /uploads/photos/abc.jpg` → `{UPLOAD_DIR}/photos/abc.jpg`

### curl 示例
```bash
# 上传照片
curl -F "file=@photo.jpg;type=image/jpeg" http://localhost:8002/api/upload/photo

# 上传语音
curl -F "file=@recording.webm;type=audio/webm" http://localhost:8002/api/upload/voice

# 访问上传的文件
curl -I http://localhost:8002/uploads/photos/uuid.jpg
```

---

## AI API (全部支持 fallback，无需 API key)

所有 AI 端点不依赖外部 API key，始终返回 200。若未来接入 GPT/ElevenLabs，fallback 作为超时/失败的兜底。

### `POST /api/ai/analyze-emotion`
- 请求体 (JSON): `{"message": "想你了，好想你"}`
- 策略: 中文关键词匹配 → 标签打分 → 情感分类
- 支持 16 种情感标签: 怀旧/温暖/感恩/浪漫/思念/快乐/遗憾/鼓励/幽默/神秘/孤独/希望/青春/友情/亲情/爱情
- 响应 200:
  ```json
  {"emotions":["思念","温暖"],"sentiment":"neutral","intensity":0.6,"summary":"包含思念、温暖情感的留言"}
  ```
- 无匹配时返回默认: `{"emotions":["温暖","希望"],"sentiment":"positive","intensity":0.3}`
- 错误: 400 `"message is required"`

### `GET /api/ai/location-context?lat=31.23&lng=121.47`
- 策略: 坐标象限推断 (无 Nominatim 依赖)
- 响应 200:
  ```json
  {"name":"中国东部城区","description":"繁华的东部沿海地区...","nearby_capsule_count":0,"suggested_moods":["怀旧","希望","温暖"]}
  ```

### `POST /api/ai/scene`
- 请求: multipart/form-data (image) 或 JSON
- 策略: 始终返回 fallback (无 GPT Vision)
- 响应 200:
  ```json
  {"scene_type":"未知","description":"场景识别暂时不可用...","atmosphere":"神秘而有趣","mood_match":["温暖","希望"]}
  ```

### `POST /api/ai/voice-clone`
- 请求: multipart/form-data (sample + text) 或 JSON
- 策略: 始终返回 fallback (无 ElevenLabs)
- 响应 200:
  ```json
  {"voice_id":"fallback","audio_url":"/uploads/voice_clones/fallback.mp3","duration_seconds":3.0}
  ```

### curl 示例
```bash
curl -X POST http://localhost:8002/api/ai/analyze-emotion -H 'Content-Type: application/json' -d '{"message":"想你了"}'
curl "http://localhost:8002/api/ai/location-context?lat=31.23&lng=121.47"
curl -X POST http://localhost:8002/api/ai/scene
curl -X POST http://localhost:8002/api/ai/voice-clone
```

---

## 验收命令

```bash
cd go-backend
CGO_ENABLED=0 go test ./...      # 全部测试通过
CGO_ENABLED=0 go build ./cmd/server  # 编译成功
```
