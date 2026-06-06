### main → Go/Ubuntu 迁移契约补充

本 Issue 的目标不是新增业务功能，而是确保 Go/Ubuntu 主线基础设施可作为后续迁移承载层。

必须完成：

1. Go 后端基础骨架可在 VPS `/srv/time_space/fermin/go-backend` 通过：
   ```bash
   CGO_ENABLED=0 go test ./...
   CGO_ENABLED=0 go build ./cmd/server
   ```
2. `/api/health` 可运行 smoke：
   ```bash
   curl http://localhost:8002/api/health
   ```
3. 清理并禁止提交 DB/上传/临时文件：
   ```txt
   go-backend/data/timespace.db
   backend/app/time_space.db
   time_spacedatatimespace.db
   *.db
   *.sqlite
   uploads/
   backend/data/
   ```
4. `.gitignore` 必须覆盖上述文件。
5. 验收命令：
   ```bash
   git ls-files '*db' '*sqlite*'
   # 期望无输出
   ```

注意：后续业务 API 行为以 `origin/main` 的 Python/FastAPI 实现为契约来源，在 #46-#48 中迁移到 Go。