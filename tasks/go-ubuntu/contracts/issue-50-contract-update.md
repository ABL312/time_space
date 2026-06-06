### main → Go/Ubuntu 迁移契约补充

本 Issue 的目标是：**前端以 `origin/main` 为基准保留功能，只适配 Go API 契约，不允许 Ubuntu 分支回退/删除 main 已有前端功能。**

必须保留/恢复 main 前端功能：

```txt
frontend/public/manifest.json
frontend/public/offline.html
frontend/src/hooks/useOnline.ts
frontend/src/components/ui/OfflineBanner.tsx
frontend/src/components/ui/BottomSheet.tsx
frontend/src/features/*
frontend/src/lib/usersApi.ts
frontend/src/lib/aiApi.ts
frontend/src/lib/capsulesApi.ts
frontend/src/lib/collectionsApi.ts
```

E2E 覆盖：

| 流程 | 目标 |
|---|---|
| 注册用户 | Go users API |
| 创建胶囊 | Go capsules API |
| 上传媒体 | Go upload API |
| 附近查询 | Go nearby API |
| 推荐展示 | Go daily-recommend / AI fallback |
| 胶囊详情 | Go detail/share API |
| PWA/offline | main 前端能力不回退 |

验收：

```bash
cd /srv/time_space/orchestrator/go-backend
CGO_ENABLED=0 go test ./...
CGO_ENABLED=0 go build ./cmd/server

cd /srv/time_space/orchestrator/frontend
npm install
npm run build
npm run lint
```

禁止事项：

- 不用 Ubuntu 分支旧前端覆盖 main 前端
- 不删除 PWA/offline/feature module 文件
- 前端发现 Go API 不一致时，停下汇报，不直接改后端