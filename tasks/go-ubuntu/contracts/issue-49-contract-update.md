### main → Go/Ubuntu 迁移契约补充

本 Issue 的目标是部署 Go 后端，不再依赖 Python backend 作为生产后端。

必须完成：

| 项 | 要求 |
|---|---|
| Go binary | `CGO_ENABLED=0 go build ./cmd/server` 可产出 Linux binary |
| systemd | `time-space-go.service` 模板 |
| Nginx | reverse proxy 到 Go 后端端口 |
| env | `.env.example`，不包含 secret |
| uploads | 配置 `UPLOAD_DIR`，不提交实际文件 |
| DB | 配置 `DATABASE_URL`，不提交实际 DB |
| rollback | 部署失败回滚步骤 |

验收：

```bash
cd /srv/time_space/orchestrator/go-backend
CGO_ENABLED=0 go test ./...
CGO_ENABLED=0 go build ./cmd/server
systemctl status time-space-go
curl http://127.0.0.1:8002/api/health
curl http://<server-ip>/api/health
```

禁止事项：

- 不提交 `.env`
- 不提交 `*.db` / `*.sqlite`
- 不提交 uploads
- 不使用 Python backend 作为最终生产服务