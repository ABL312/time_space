### main → Go/Ubuntu 迁移契约补充

本 Issue 的目标是把 `origin/main` 已实现的媒体上传行为迁移到 `go-backend/`。

契约来源：

```txt
origin/main:backend/app/routers/upload.py
origin/main:backend/app/services/storage_service.py
```

必须覆盖的 API 行为：

| API | 请求 | 目标 |
|---|---|---|
| `POST /api/upload/photo` | multipart/form-data | 上传照片 |
| `POST /api/upload/voice` | multipart/form-data | 上传语音 |
| `/uploads/<file>` | static | 返回可访问媒体 |

必须实现：

- multipart/form-data 解析
- 文件类型白名单
- 文件大小限制
- `UPLOAD_DIR=./data/uploads-fermin` 隔离
- 返回 JSON：文件 URL、类型、大小、文件名等
- API 对接卡片 + curl 示例

验收：

```bash
cd /srv/time_space/fermin/go-backend
CGO_ENABLED=0 go test ./...
CGO_ENABLED=0 go build ./cmd/server
curl -F "file=@demo.jpg" http://localhost:8002/api/upload/photo
curl -I http://localhost:8002/uploads/<file>
```

禁止事项：

- 不提交 uploads 文件
- 不提交 DB 文件
- 不改前端上传逻辑，除非 #50 联调确认需要