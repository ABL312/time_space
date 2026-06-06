# Go 后端 API 对接卡片

> Go 后端入口: `go-backend/cmd/server/main.go`
> 端口: 8002 (Fermin 默认), 可配环境变量 `PORT`

---

## `GET /api/health`

### API 对接卡片

- 端点: `GET /api/health`
- 请求格式: 无请求体
- 请求体: 无
- 响应体:
  ```json
  {
    "status": "ok",
    "service": "go-backend",
    "version": "1.0.0",
    "environment": "development",
    "timestamp": "2026-06-06T07:47:36Z",
    "db": {
      "status": "ok"
    },
    "media": {
      "status": "ok"
    },
    "config": {
      "database_url_set": true,
      "upload_dir": "./data/uploads"
    }
  }
  ```
- 字段说明:
  - `status`: 服务状态, 正常为 `"ok"`
  - `service`: 后端标识, 固定 `"go-backend"`
  - `version`: 服务版本
  - `environment`: 运行环境 (`development` / `production`)
  - `timestamp`: 响应时间戳 (UTC)
  - `db.status`: 数据库连接状态 (`"ok"` / `"error"` / `"unknown"`)
  - `media.status`: 上传目录状态 (`"ok"` / `"error"` / `"unknown"`)
- 错误码:
  - 无 (health check 始终返回 200)
- 示例:
  ```bash
  curl http://localhost:8002/api/health
  ```

---

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `8080` | 服务端口 |
| `DATABASE_URL` | `./data/timespace.db` | SQLite 数据库路径 |
| `UPLOAD_DIR` | `./data/uploads` | 上传文件目录 |
| `CORS_ORIGINS` | `*` | CORS 允许源 |
| `ENVIRONMENT` | `development` | 运行环境 |

---

## 启动命令

```bash
cd go-backend

# 开发
DATABASE_URL=./data/fermin.db UPLOAD_DIR=./data/uploads-fermin PORT=8002 \
  go run ./cmd/server

# 生产编译
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o server ./cmd/server
```
