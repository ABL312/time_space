# Go/Ubuntu Backend Refactor Execution Task

你是 time_space 项目的 backend-dev 子Agent，负责在当前分支 `refactor/go-ubuntu-deploy` 完成 Go/Ubuntu 部署优化与 Go 后端渐进式重构。

## 项目
- Repo: https://github.com/ABL312/time_space
- Path: `D:/time_space`
- 当前分支: `refactor/go-ubuntu-deploy`
- 现有后端: `backend/` FastAPI + SQLite
- 新增目标: `go-backend/` Go 服务，面向 Ubuntu 小服务器部署优化

## 最高优先级规则
- 你可以修改代码、文档、配置并提交 commit。
- **遇到任何阻塞报错、接口对接不确定、需求不明确、依赖无法安装/拉取、无法继续验证时：立即停止，完整汇报给 Tostar，不要自行猜测绕过。**
- 不要删除现有 `backend/` FastAPI；Go 后端作为并行/渐进替代服务。
- 保持现有前端 API 路径和响应结构尽量兼容。
- 每完成一组 issue 必须 commit。
- 最后 push 当前分支；如果网络 push 失败，保留本地 commit 并报告。

## Go 环境
Windows Git Bash 里 Go 已安装在：
```bash
export PATH="/c/Program Files/Go/bin:$PATH"
go version
```
预期：`go version go1.26.4 windows/amd64`

## Issues
已创建并全部分配给 ABL312：
- #45 Go/Ubuntu 重构 01: Go 后端基础骨架与健康检查
- #46 Go/Ubuntu 重构 02: 核心用户/胶囊 API 与 SQLite 查询优化
- #47 Go/Ubuntu 重构 03: 媒体上传与静态文件服务
- #48 Go/Ubuntu 重构 04: AI/推荐 fallback 与超时隔离
- #49 Go/Ubuntu 重构 05: Ubuntu systemd/Nginx 部署文档与脚本
- #50 Go/Ubuntu 重构 06: 前端契约联调与端到端验收

详细 issue body 在：
```txt
tasks/go-ubuntu/issue-01-go-backend-foundation.md
tasks/go-ubuntu/issue-02-go-core-api.md
tasks/go-ubuntu/issue-03-go-media-upload.md
tasks/go-ubuntu/issue-04-go-ai-recommend-fallback.md
tasks/go-ubuntu/issue-05-ubuntu-deploy-go.md
tasks/go-ubuntu/issue-06-go-e2e-contract.md
```

## 执行路线

### Phase A — Go 基础骨架 (#45)
1. 创建 `go-backend/`。
2. 建立 Go module。
3. 实现：
   - `cmd/server/main.go`
   - internal config
   - router/middleware
   - SQLite connection
   - `/api/health`
   - `/uploads/*` 静态文件 mount
4. SQLite 设置：WAL / foreign_keys / busy_timeout。
5. JSON error response 统一。
6. 验证：`go test ./...`、`go run ./cmd/server`、curl `/api/health`。
7. commit: `feat(go): add ubuntu-ready backend foundation`

### Phase B — 核心 API (#46)
实现与 FastAPI 前端契约兼容的核心 API，优先 MVP 可用：
- `POST /api/users/register`
- `GET /api/capsules/nearby`
- `GET /api/capsules/{id}`
- `GET /api/capsules/search`
- `GET /api/capsules/daily-recommend`
- `POST /api/capsules`（JSON 或 multipart 兼容，如 multipart 复杂则先实现最小可用并写清卡片）

要求：
- 读取现有 `backend/app/routers/*.py` 和前端 API client，保持字段兼容。
- 附近查询支持 lat/lng/radius/limit/offset。
- 列表批量加载 media，避免明显 N+1。
- 初始化必要索引。
- commit: `feat(go): implement core capsule APIs`

### Phase C — 媒体上传 (#47)
实现：
- `POST /api/upload/photo`
- `POST /api/upload/voice`
- MIME/大小/magic bytes 校验
- 安全文件名
- `/uploads/*` 可访问
- 明确 400 JSON 错误
- commit: `feat(go): add media upload service`

### Phase D — AI/recommend fallback (#48)
实现 fallback endpoints/逻辑：
- emotion keyword fallback
- location context fallback
- scene fallback
- recommend fallback
- voice clone mock/fallback
- 所有外部调用/预留代理必须 timeout；无 key 不失败
- capsule create 不被 AI 失败阻塞
- commit: `feat(go): add ai fallback and recommendation endpoints`

### Phase E — Ubuntu 部署 (#49)
新增：
- `go-backend/scripts/build-linux.sh`
- `go-backend/deploy/systemd/time-space-go.service`
- `go-backend/deploy/nginx/time-space.conf`
- `go-backend/.env.example`
- `go-backend/docs/ubuntu-deploy.md`

要求说明：
- build linux amd64 二进制
- systemd start/restart/logs
- nginx `/api` + `/uploads`
- SQLite / uploads 持久化目录
- health check
- rollback
- commit: `docs(go): add ubuntu deployment guide`

### Phase F — 契约与 smoke test (#50)
新增：
- `go-backend/docs/api-contract.md`，每个端点包含 API 对接卡片。
- `go-backend/scripts/smoke-test.sh`
- 如需，补前端 proxy 文档，不要破坏现有 Vite 配置。

验证：
- `go test ./...`
- `go build ./cmd/server`
- 启动 Go server 后执行 smoke test
- 如可行，`cd frontend && npm run build`
- commit: `test(go): add contract smoke tests`

## 输出要求
最终汇报：
- 完成的 issue 列表
- commits
- 验证命令与真实结果
- 未完成/阻塞项
- 是否已 push
- 建议可贴到 GitHub issue 的评论
