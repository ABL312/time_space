## Owner
ABL312

## Goal
建立 Ubuntu 服务器部署友好的 Go 后端基础骨架，作为 FastAPI 后端的渐进式替代/并行服务。

## Scope
- 新增 `go-backend/` Go module。
- 提供 HTTP server、路由注册、CORS、JSON error envelope、request logging。
- 统一配置：`PORT`、`DATABASE_URL`、`UPLOAD_DIR`、`CORS_ORIGINS`、`ENVIRONMENT`。
- 接入 SQLite，支持 WAL / foreign_keys / busy_timeout。
- 提供 `/api/health`，返回 service/db/media/config 基础状态。
- 保持现有前端 API 路径前缀 `/api/*`。

## Acceptance
- `go test ./...` 通过。
- `go run ./cmd/server` 可启动。
- `curl /api/health` 返回 JSON 且包含 db/media/config 状态。
- 不删除现有 `backend/` FastAPI，允许并行迁移。
- 提供 API 对接卡片。

## Must follow
遇到报错/不确定/接口需要对接：立即停止并向 Tostar 汇报。禁止自行猜测绕过。
