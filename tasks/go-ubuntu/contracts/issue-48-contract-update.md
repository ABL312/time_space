### main → Go/Ubuntu 迁移契约补充

本 Issue 的目标是把 `origin/main` 已实现的 AI/推荐相关接口行为迁移到 `go-backend/`，并保证无 API key 时可 fallback。

契约来源：

```txt
origin/main:backend/app/routers/ai.py
origin/main:backend/app/services/emotion_service.py
origin/main:backend/app/services/location_service.py
origin/main:backend/app/services/scene_service.py
origin/main:backend/app/services/voice_clone_service.py
origin/main:backend/app/services/recommend_service.py
origin/main:backend/app/routers/capsules.py 的 daily-recommend
```

必须覆盖的 API 行为：

| API | 目标 |
|---|---|
| `POST /api/ai/analyze-emotion` | 情感分析 |
| `GET /api/ai/location-context` | 位置上下文 |
| `POST /api/ai/scene` | 场景识别 |
| `POST /api/ai/voice-clone` | 语音克隆 fallback |
| `GET /api/capsules/daily-recommend` | 每日推荐 |

必须实现：

- 无 API key 不返回 500
- fallback 使用关键词/mock/规则结果
- 外部 AI 调用必须有 context timeout
- AI 超时不拖垮主 API
- 返回 JSON shape 尽量兼容 main 前端
- API 对接卡片 + curl 示例

验收：

```bash
cd /srv/time_space/fermin/go-backend
CGO_ENABLED=0 go test ./...
CGO_ENABLED=0 go build ./cmd/server
unset AI_API_KEY
curl -X POST http://localhost:8002/api/ai/analyze-emotion -H 'Content-Type: application/json' -d '{"text":"想你了"}'
curl http://localhost:8002/api/capsules/daily-recommend
```

禁止事项：

- 不因缺 API key 阻塞 MVP
- 不用假成功掩盖错误；fallback 要明确标识