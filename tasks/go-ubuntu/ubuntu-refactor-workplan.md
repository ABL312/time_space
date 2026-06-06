# Go/Ubuntu 重构分工方案（#45-#50）

> 适用环境：Ubuntu VPS `/srv/time_space/*` 三人协作工作区。
> 原则：每个人只在自己的目录、自己的分支、自己的端口、自己的数据库里开发；main 只由 orchestrator 合并；遇到不确定就停下汇报。

## 0. 工作区 / 角色

| 角色 | 工作区 | 主要职责 |
|---|---|---|
| backend-dev / Fermin | `/srv/time_space/fermin` | Go 后端实现：#46 #47 #48 |
| frontend-dev / lisnshsjwkz | `/srv/time_space/lisnshsjwkz` | 前端契约适配：#50 前端部分 |
| Tostar | `/srv/time_space/tostar` | 全栈/部署/E2E 参与 |
| Orchestrator | `/srv/time_space/orchestrator` | Issue 迁移、任务分发、验收、合并、部署 |

## 1. 已迁移关闭的旧 Issues

| 旧 Issue | 迁移目标 |
|---|---|
| #35 后端重构 01: 性能与部署基线 | #45 / #49 |
| #36 后端重构 02: SQLite 查询/索引/分页优化 | #46 |
| #37 后端重构 03: 服务层分层与部署加固 | #45 / #49 |
| #38 后端重构 04: 媒体上传与 AI 服务性能隔离 | #47 / #48 |
| #43 全栈联调: API 契约与服务器部署验收 | #50 |

## 2. Ubuntu 主线 Issues

### #45 Go/Ubuntu 重构 01: Go 后端基础骨架与健康检查

**责任**：backend-dev 实现，orchestrator 复验。

**当前目标**：确认 Go 后端基础骨架、配置、SQLite 初始化、health endpoint 能在 VPS 通过。

**验收命令**：

```bash
cd /srv/time_space/fermin/go-backend
CGO_ENABLED=0 go test ./...
CGO_ENABLED=0 go build ./cmd/server
```

**需要补齐**：

- health API 对接卡片
- server run smoke：`curl http://localhost:8002/api/health`
- 不提交 `.env`、`*.db`、uploads

---

### #46 Go/Ubuntu 重构 02: 核心用户/胶囊 API 与 SQLite 查询优化

**责任**：backend-dev。

**分支建议**：`dev/backend/go-core-api`

**子任务**：

| 子任务 | 内容 | API |
|---|---|---|
| #46-A | 用户注册 | `POST /api/users/register` |
| #46-B | 胶囊创建/详情 | `POST /api/capsules`, `GET /api/capsules/{id}` |
| #46-C | 附近查询/搜索/分页 | `GET /api/capsules/nearby`, `GET /api/capsules/search` |
| #46-D | SQLite 索引/分页/N+1 优化 | schema/index/repository |
| #46-E | API 对接卡片 | docs/API comments |

**验收命令**：

```bash
cd /srv/time_space/fermin/go-backend
CGO_ENABLED=0 go test ./...
CGO_ENABLED=0 go build ./cmd/server
```

**smoke**：

```bash
curl http://localhost:8002/api/health
curl -X POST http://localhost:8002/api/users/register -H 'Content-Type: application/json' -d '{...}'
curl -X POST http://localhost:8002/api/capsules -H 'Content-Type: application/json' -d '{...}'
curl 'http://localhost:8002/api/capsules/nearby?lat=31.2304&lng=121.4737&radius=1000&page=1&page_size=10'
```

---

### #47 Go/Ubuntu 重构 03: 媒体上传与静态文件服务

**责任**：backend-dev。

**分支建议**：`dev/backend/go-media-upload`

**子任务**：

| 子任务 | 内容 | API |
|---|---|---|
| #47-A | multipart 上传 | `POST /api/upload` 或 `POST /api/media/upload` |
| #47-B | 类型/大小校验 | image/audio/video whitelist |
| #47-C | 静态文件访问 | `/uploads/<file>` |
| #47-D | 上传目录隔离 | `UPLOAD_DIR=./data/uploads-fermin` |
| #47-E | API 对接卡片 | FormData + curl |

**验收**：

```bash
curl -F "file=@demo.jpg" http://localhost:8002/api/upload
curl -I http://localhost:8002/uploads/<file>
```

---

### #48 Go/Ubuntu 重构 04: AI/推荐 fallback 与超时隔离

**责任**：backend-dev。

**分支建议**：`dev/backend/go-ai-fallback`

**子任务**：

| 子任务 | 内容 | API |
|---|---|---|
| #48-A | 情感分析 fallback | `POST /api/ai/analyze` |
| #48-B | 推荐 fallback | `GET /api/recommendations/daily` |
| #48-C | 超时隔离 | context timeout，不拖垮主 API |
| #48-D | 无 API key mock/关键词结果 | 不返回 500 |
| #48-E | API 对接卡片 | JSON + curl |

**验收**：

```bash
unset AI_API_KEY
curl -X POST http://localhost:8002/api/ai/analyze -H 'Content-Type: application/json' -d '{"text":"想你了"}'
curl http://localhost:8002/api/recommendations/daily
```

---

### #49 Go/Ubuntu 重构 05: Ubuntu systemd/Nginx 部署文档与脚本

**责任**：orchestrator 主导，backend-dev 配合。

**分支建议**：`dev/tostar/deploy-vps` 或 orchestrator merge 分支。

**子任务**：

| 子任务 | 内容 |
|---|---|
| #49-A | Linux binary build script |
| #49-B | systemd service template |
| #49-C | Nginx reverse proxy config |
| #49-D | `.env.example`，不包含 secret |
| #49-E | 部署文档与 rollback 步骤 |

**验收**：

```bash
systemctl status time-space-go
curl http://127.0.0.1:8002/api/health
curl http://<server-ip>/api/health
```

---

### #50 Go/Ubuntu 重构 06: 前端契约联调与端到端验收

**责任**：orchestrator 主导；frontend-dev 做前端适配；backend-dev 修后端契约问题。

**分支建议**：

- frontend-dev：`dev/frontend/go-contract`
- orchestrator：merge/e2e 分支

**子任务**：

| 子任务 | 内容 | 责任 |
|---|---|---|
| #50-A | 汇总 Go API 契约文档 | orchestrator/backend-dev |
| #50-B | 前端 API base URL / response shape 适配 | frontend-dev |
| #50-C | 注册/创建胶囊/上传/推荐/详情 smoke | orchestrator |
| #50-D | 前端 build/lint | frontend-dev |
| #50-E | VPS E2E 验收报告 | orchestrator |

**验收**：

```bash
cd /srv/time_space/orchestrator/go-backend
CGO_ENABLED=0 go test ./...
CGO_ENABLED=0 go build ./cmd/server

cd /srv/time_space/orchestrator/frontend
npm install
npm run build
npm run lint
```

## 3. API 对接卡片要求

每个 API 完成后必须在 Issue 评论或 PR 描述附：

```md
### API 对接卡片
- 端点: POST /api/xxx
- 请求格式: JSON / FormData
- 请求体: { field: type }
- 响应体: { field: type }
- 错误码:
  - 400: xxx
  - 404: xxx
  - 500: xxx
- 示例: curl 命令
```

## 4. 停下汇报条件

遇到以下情况必须停下：

```txt
报错 / 测试失败 / 接口不一致 / 跨职责修改 / merge conflict / 端口冲突 / 数据库路径不确定 / API key需求 / 不确定保留哪边代码
```

汇报格式：

```md
### 阻塞
- 文件/命令:
- 错误:
- 已尝试:
- 需要 Tostar 决策:
```

## 5. 下一步执行顺序

1. Orchestrator 在 #45-#50 评论分工说明。
2. backend-dev 从 #46-A 开始，在 `/srv/time_space/fermin` 开发。
3. 每完成一个子任务：commit + push + API 卡片 + orchestrator 验收。
4. #46 完成后进入 #47、#48。
5. #49 部署脚本和文档。
6. #50 前端契约/E2E。
