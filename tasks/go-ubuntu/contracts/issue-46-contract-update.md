### main → Go/Ubuntu 迁移契约补充

本 Issue 的目标是把 `origin/main` 已实现的 Python/FastAPI 用户与胶囊 API 行为迁移到 `go-backend/`，不是重新设计 API。

契约来源：

```txt
origin/main:backend/app/routers/users.py
origin/main:backend/app/routers/capsules.py
origin/main:backend/app/services/geohash_service.py
origin/main:backend/app/services/recommend_service.py
```

必须覆盖的 API 行为：

| 模块 | API |
|---|---|
| users | `POST /api/users` 或兼容注册入口 |
| users | `GET /api/users/{user_id}` |
| users | `PUT /api/users/{user_id}` |
| users | `GET /api/users/{user_id}/stats` |
| capsules | `POST /api/capsules` |
| capsules | `GET /api/capsules/mine` |
| capsules | `GET /api/capsules/nearby` |
| capsules | `GET /api/capsules/search` |
| capsules | `GET /api/capsules/daily-recommend` |
| capsules | `GET /api/capsules/shared/{share_token}` |
| capsules | `GET /api/capsules/{capsule_id}` |
| capsules | `POST /api/capsules/{capsule_id}/reply` |
| capsules | `POST /api/capsules/{capsule_id}/regenerate-share` |

必须实现：

- SQLite schema / indexes / pagination
- nearby 查询 limit/page 参数
- JSON 错误响应
- API 对接卡片
- 单测 + smoke curl

验收：

```bash
cd /srv/time_space/fermin/go-backend
CGO_ENABLED=0 go test ./...
CGO_ENABLED=0 go build ./cmd/server
```

禁止事项：

- 不提交 DB 文件
- 不回退 main 前端
- 不自行改前端契约；如接口不一致，停下汇报