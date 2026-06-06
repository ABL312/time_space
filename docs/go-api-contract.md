# Go API 对接总表

> 文档状态: 基于 `refactor/go-ubuntu-deploy` 分支，Go 后端仅实现 `health`，其余 API 待迁移。
> 生成时间: 2026-06-06

## 1. 前端 API 调用清单 vs Go 后端实现状态

| # | 前端调用 (client.ts → /api/*) | FastAPI 路由 | Go 后端状态 | 备注 |
|---|---|---|---|---|
| **Health** |
| 1 | `GET /api/health` | `admin.py /health` | **已实现** `/api/health` | Go 响应字段更丰富 (service, version, db, media) |
| **Capsules** |
| 2 | `POST /api/capsules` (multipart) | `capsules.py POST ""` | **未实现** | 需支持 multipart form (content/media/voice/location) |
| 3 | `GET /api/capsules/nearby?lat&lng&radius&user_id` | `capsules.py GET /nearby` | **未实现** | 需要 geohash 空间查询 |
| 4 | `GET /api/capsules/mine?user_id` | `capsules.py GET /mine` | **未实现** | |
| 5 | `GET /api/capsules/{id}` | `capsules.py GET /{capsule_id}` | **未实现** | |
| 6 | `POST /api/capsules/{id}/reply` (multipart) | `capsules.py POST /{capsule_id}/reply` | **未实现** | |
| 7 | `GET /api/capsules/search?q&tag&lat&lng&radius` | `capsules.py GET /search` | **未实现** | |
| 8 | `GET /api/capsules/daily-recommend` | `capsules.py GET /daily-recommend` | **未实现** | |
| 9 | `GET /api/capsules/shared/{token}` | `capsules.py GET /shared/{share_token}` | **未实现** | |
| 10 | `POST /api/capsules/{id}/regenerate-share` | `capsules.py POST /{capsule_id}/regenerate-share` | **未实现** | |
| **Responses** |
| 11 | `POST /api/capsules/{id}/responses` | `responses.py POST /` | **未实现** | |
| 12 | `GET /api/capsules/{id}/responses` | `responses.py GET /` | **未实现** | |
| **Favorites** |
| 13 | `POST /api/favorites/{capsule_id}?user_id` | `favorites.py POST /{capsule_id}` | **未实现** | |
| 14 | `DELETE /api/favorites/{capsule_id}?user_id` | `favorites.py DELETE /{capsule_id}` | **未实现** | |
| 15 | `GET /api/favorites?user_id` | `favorites.py GET /` | **未实现** | |
| 16 | `GET /api/favorites/capsules/{id}/favorite-status?user_id` | `favorites.py GET /capsules/{id}/favorite-status` | **未实现** | |
| **Users** |
| 17 | `POST /api/users` | `users.py POST ""` | **未实现** | |
| 18 | `GET /api/users/{id}` | `users.py GET /{user_id}` | **未实现** | |
| 19 | `PUT /api/users/{id}` | `users.py PUT /{user_id}` | **未实现** | |
| **AI** |
| 20 | `POST /api/ai/analyze-emotion` | `ai.py POST /analyze-emotion` | **未实现** | 需 rule-based fallback |
| 21 | `GET /api/ai/location-context?lat&lng` | `ai.py GET /location-context` | **未实现** | |
| 22 | `POST /api/ai/scene` (multipart) | `ai.py POST /scene` | **未实现** | |
| 23 | `POST /api/ai/voice-clone` (multipart) | `ai.py POST /voice-clone` | **未实现** | |
| **Collections** |
| 24 | `GET /api/collections` | `collections.py GET ""` | **未实现** | |
| 25 | `GET /api/collections/{id}` | `collections.py GET /{collection_id}` | **未实现** | |
| **Upload** |
| 26 | `POST /api/upload/photo` | `upload.py POST /photo` | **未实现** | |
| 27 | `POST /api/upload/voice` | `upload.py POST /voice` | **未实现** | |

## 2. 响应结构差异

### 2.1 Health (唯一已实现的接口)

**FastAPI 响应:**
```json
{ "status": "ok" }
```

**Go 响应:**
```json
{
  "status": "ok",
  "service": "go-backend",
  "version": "1.0.0",
  "environment": "development",
  "timestamp": "2026-06-06T...",
  "db": { "status": "ok" },
  "media": { "status": "ok" },
  "config": { "database_url_set": true, "upload_dir": "..." }
}
```

**差异:** Go 响应是超集，前端 `healthCheck()` 只读 `status` 字段，**向后兼容**。

### 2.2 错误格式差异

**FastAPI 错误:**
```json
{ "detail": "Capsule not found" }
```

**Go 错误 (WriteError):**
```json
{ "error": "Capsule not found", "code": 404 }
```

**影响:** 前端 `client.ts` 解析 `body.detail` 作为错误消息。Go 用 `error` 字段，**不兼容**。
**修复方案:** Go 的错误响应需增加 `detail` 字段，或前端 client.ts 增加对 `error` 字段的 fallback。

### 2.3 预期数据结构 (需保持与 FastAPI 一致)

前端 types/index.ts 定义的 Capsule 结构：
```typescript
interface Capsule {
  id: string
  user_id: string
  content_type: 'text' | 'voice' | 'image'
  content: string
  media_url?: string
  latitude: number
  longitude: number
  location_name?: string
  emotion_tags: string[]
  scene_tags: string[]
  time_lock_until?: string  // ISO datetime
  is_opened: boolean
  created_at: string
  updated_at: string
  // ... more fields
}
```

Go 迁移时必须输出完全一致的 JSON 字段名 (snake_case)。

## 3. 前端代理切换方式

### 3.1 当前 Vite 配置 (指向 FastAPI :8000)

```ts
// frontend/vite.config.ts
server: {
  proxy: {
    '/api': { target: 'http://localhost:8000', changeOrigin: true },
    '/uploads': { target: 'http://localhost:8000', changeOrigin: true },
  }
}
```

### 3.2 切换到 Go 后端 (:8080)

修改 `vite.config.ts`:
```ts
server: {
  proxy: {
    '/api': { target: 'http://localhost:8080', changeOrigin: true },
    '/uploads': { target: 'http://localhost:8080', changeOrigin: true },
  }
}
```

或通过环境变量:
```ts
const API_TARGET = process.env.API_TARGET === 'go'
  ? 'http://localhost:8080'
  : 'http://localhost:8000'
```

### 3.3 VPS/Nginx 部署切换

```nginx
# 指向 Go 后端
location /api/ {
    proxy_pass http://127.0.0.1:8080;
}
location /uploads/ {
    proxy_pass http://127.0.0.1:8080;
}
```

## 4. Go 后端启动方式

```bash
cd go-backend

# 设置环境变量
export DATABASE_URL=./data/timespace.db
export UPLOAD_DIR=../data/uploads
export PORT=8080
export CORS_ORIGINS=*

# 构建 & 运行
go build -o time-space-go ./cmd/server
./time-space-go
```

## 5. 迁移优先级建议

按前端核心流程依赖排序：

| 优先级 | API | 原因 |
|---|---|---|
| P0 | `GET /api/capsules/nearby` | Home 页核心功能 |
| P0 | `GET /api/capsules/{id}` | CapsuleDetail 核心 |
| P0 | `POST /api/capsules` | Create 页核心 |
| P0 | `POST /api/users`, `GET /api/users/{id}` | Profile 页 & 用户注册 |
| P1 | `GET /api/capsules/search` | 搜索功能 |
| P1 | `POST/GET /api/capsules/{id}/responses` | 回应功能 |
| P1 | `POST/DELETE/GET /api/favorites/*` | 收藏功能 |
| P1 | `GET /api/users/{id}/stats` | 用户统计 |
| P2 | `POST /api/ai/analyze-emotion` | AI 情感分析 (可 fallback 到 rule-based) |
| P2 | `GET /api/collections`, `GET /api/collections/{id}` | 合集页 |
| P2 | `GET /api/capsules/daily-recommend` | 每日推荐 |
| P3 | `POST /api/ai/scene`, `POST /api/ai/voice-clone` | AR 场景 / 声音克隆 |
| P3 | `POST /api/upload/*` | 独立上传接口 |

## 6. 不兼容点清单

| # | 问题 | 影响 | 修复方案 |
|---|---|---|---|
| 1 | Go 错误响应用 `error` 字段，前端期望 `detail` | 所有错误消息显示异常 | Go 端增加 `detail` 字段或前端 client.ts 增加 fallback |
| 2 | Go health 响应结构与 FastAPI 不同 | 无影响 (前端只读 `status`) | 无需修改 |
| 3 | 前端 `capsulesApi.getRecent()` 调 `/capsules/recent` | FastAPI 也未实现 | 前端已有 fallback，Go 可后补 |
| 4 | 前端 `usersApi.getStats()` 调 `/users/{id}/stats` | FastAPI 也未实现 | 需要前端+后端同时补 |
