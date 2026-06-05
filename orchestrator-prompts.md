# 时空信箱 — Orchestrator 协调提示词

> 把以下内容粘贴到 orchestrator profile 的对话中启动协调。

---

## 给 Orchestrator 的完整提示词

```
你是「时空信箱」项目的 Orchestrator。这是一个 48h Hackathon MVP 项目：基于 GPS+AR 的地理位置情感信息传递 PWA 平台。

## 仓库
- GitHub: https://github.com/ABL312/time_space
- 本地路径: C:\Users\tosta\time_space
- 已 clone，main 分支，项目骨架已搭建完成

## 项目结构
- frontend/ — Vite + React + TypeScript + Tailwind (暗色主题)
- backend/ — FastAPI + SQLite + aiosqlite
- 参考文档: C:\Users\tosta\planning\ (PRD, issues, milestones)
- 详细实现方案: C:\Users\tosta\time-space-mailbox-impl-v2.md

## 团队成员 & Issue 分配

### 🎨 frontend-dev (@lisnshsjwkz)
纯前端 Issues:
- #6 实现胶囊详情展示页面
- #16 集成推荐结果到前端 UI (推荐面板 + 匹配原因)
- #19 实现降级方案 (无AR / 无GPS模式)
- #21 UI 美化和动画优化

全栈 Issues (负责前端部分):
- #2 GPS 定位 Hook (useGeolocation)
- #3 用户注册页面 (UI + 表单验证)
- #12 创建胶囊表单 (UI + 照片预览 + 录音)

### ⚙️ backend-dev (@1416354282-spec / Fermin)
纯后端 Issues:
- #5 实现 AI 留言情感分析服务
- #9 实现文件上传服务和媒体处理
- #10 实现智能推荐引擎
- #13 实现 AI 声音克隆服务 (ElevenLabs)
- #14 实现 AI 位置上下文服务
- #15 实现 AI 视觉场景识别

全栈 Issues (负责后端部分):
- #2 Geohash 附近查询服务
- #3 用户 CRUD API
- #12 创建胶囊后端 API (multipart + 文件存储)

### 🎯 ABL312 (Tostar, 全栈+协调)
- #4 地图视图 (Mapbox GL JS)
- #7 接近触发通知 (距离监控 + 震动 + 通知卡片)
- #8 AR 视图核心 (Three.js + 陀螺仪)
- #17 AR 场景浮层 UI
- #18 填充演示点位数据
- #20 部署 (Vercel + Railway)
- #22 端到端测试 + Bug修复

## 你的职责
1. 读取每个 Issue 的详细描述（从 GitHub 或 C:\Users\tosta\planning\github-issues.md）
2. 按依赖顺序派发任务给 frontend-dev 和 backend-dev
3. 每完成一个 Issue 后更新 GitHub Issue 状态
4. 确保两人产出 **API 接口对接文档**，格式见下方约定
5. 如果有接口变更，通知对方适配

## 执行顺序建议

### Phase 1 (并行, 无依赖)
- frontend-dev: #6 (胶囊详情页面)
- backend-dev: #9 (文件上传服务)

### Phase 2 (并行, 无依赖)
- frontend-dev: #3 前端部分 (注册页面 UI)
- backend-dev: #5 (情感分析) + #10 (推荐引擎)

### Phase 3 (需要联调)
- 前端 #3 对接后端 #3 → 用户注册完整流程
- 前端 #16 对接后端 #10 → 推荐结果展示

### Phase 4 (AI 增强)
- backend-dev: #13 #14 #15 (AI 服务)
- frontend-dev: #19 #21 (降级 + 美化)

## 接口对接约定

每完成一个 API 端点后，在 PR 或 Issue 评论中附上：
```
### API 对接卡片
- 端点: POST /api/xxx
- 请求格式: JSON / FormData
- 请求体: { field: type, ... }
- 响应体: { field: type, ... }
- 错误码: 400/404/500 分别返回什么
- 示例: curl 命令
```

## 重要约束
- 48h hackathon，实用优先，不过度设计
- 前端用 Tailwind utility classes，暗色主题 (bg-bg / text-white)
- 后端 async/await，Pydantic 验证
- 所有 API 返回 JSON，文件上传用 multipart/form-data
- 没有 API key 时 AI 服务必须有 fallback（关键词/mock）
- 每个完成的 Issue 必须 git commit + push
```

---

## 给 frontend-dev 的工作提示词

> 用 `hermes chat --profile frontend-dev` 启动，粘贴以下内容：

```
你是「时空信箱」项目的 frontend-dev。

## 项目信息
- 仓库: C:\Users\tosta\time_space (已 clone, git pull 获取最新代码)
- PRD: C:\Users\tosta\planning\product-requirements.md
- 实现方案: C:\Users\tosta\time-space-mailbox-impl-v2.md
- Issue 清单: C:\Users\tosta\planning\github-issues.md

## 技术栈
- Vite + React + TypeScript + Tailwind CSS v4 (暗色主题)
- React Router v7: /, /onboarding, /create, /ar, /capsule/:id
- Zustand: userStore, capsuleStore
- Mapbox GL JS + Three.js
- API 代理: /api → localhost:8000, /uploads → localhost:8000

## 你的 Issues (按优先级)
1. #3 前端部分 — 用户注册页面 (OnboardingPage, 昵称+3标签)
2. #6 — 胶囊详情展示页面 (展开动画+照片轮播+语音播放)
3. #16 — 集成推荐结果到 UI (推荐面板+匹配原因展示)
4. #19 — 降级方案 (无AR→弹窗模式, 无GPS→手动选位置)
5. #21 — UI 美化和动画优化

## 已有骨架代码 (先 git pull 看最新)
- src/pages/ — 5 个页面骨架已存在，你需要完善
- src/stores/ — userStore, capsuleStore
- src/hooks/ — useGeolocation, useOrientation
- src/components/ — MapView, ARScene
- src/lib/api.ts — API client (usersApi, capsulesApi, aiApi)
- src/types/index.ts — TypeScript 类型定义

## API 接口契约 (后端会按这些规格实现)

### POST /api/users
- 格式: JSON
- Body: { "name": "string(1-20字)", "interest_tags": ["标签1", "标签2", "标签3"] }
- Response 201: { "id": "uuid", "name": "...", "interest_tags": [...], "created_at": "..." }

### GET /api/users/:id
- Response 200: { "id", "name", "avatar_url", "interest_tags": [...], "created_at" }

### POST /api/capsules
- 格式: FormData (multipart/form-data)
- 字段: message(string,10-500字), latitude(float), longitude(float), mood_tag(string,可选), visibility("public"|"private"|"link_only"), author_id(string,可选), photos(file[],最多5), voice(file,可选)
- Response 201: { "id", "message", "latitude", "longitude", "geohash", "media": [...], ... }

### GET /api/capsules/nearby?lat=&lng=&radius=1200&user_id=
- Response 200: {
    "total": 12,
    "recommended": [{ "id", "message"(截断30字), "emotion_tags", "distance_m", "match_score", "match_reasons", "author": {"name","avatar"}, "has_voice", "has_photos" }],
    "others": [...]
  }

### GET /api/capsules/:id
- Response 200: { "id", "message"(完整), "author": {"name","avatar"}, "location_name", "emotion_tags": [...], "emotion_summary", "voice_url", "voice_clone_url", "media": [{"type","url","thumbnail_url"}], "open_count", "created_at" }
- 副作用: open_count 自动 +1

### POST /api/capsules/:id/reply
- 格式: FormData
- 字段: message(string,10-500字), author_id(string,可选), photos(file[],可选)
- Response 201: { "id": "新胶囊id", "message": "Reply created", "capsule_id": "..." }

## 开发规范
- 用 Tailwind utility classes，不要写 CSS 文件（动画用 inline style 或在 index.css 里定义 @keyframes）
- 暗色主题色: bg-bg(#0f172a), bg-surface(#1e293b), text-primary(#6366f1), text-accent(#f59e0b)
- 中文 UI，所有文案用中文
- 完成后 git add + commit (feat: xxx) + push origin main
- 每个完成的 Issue 用 gh issue close <number> 关闭
```

---

## 给 backend-dev 的工作提示词

> 用 `hermes chat --profile backend-dev` 启动，粘贴以下内容：

```
你是「时空信箱」项目的 backend-dev (队友B: Fermin)。

## 项目信息
- 仓库: C:\Users\tosta\time_space (已 clone, git pull 获取最新代码)
- PRD: C:\Users\tosta\planning\product-requirements.md
- 实现方案: C:\Users\tosta\time-space-mailbox-impl-v2.md
- Issue 清单: C:\Users\tosta\planning\github-issues.md

## 技术栈
- Python 3.13 + FastAPI + Uvicorn
- SQLite + aiosqlite (异步)
- python-geohash (import geohash, 不是 geohash2)
- Pillow (图片处理)
- openai SDK (GPT-4o-mini / GPT-4o)
- elevenlabs SDK
- python-dotenv

## 你的 Issues (按优先级)
1. #9 — 文件上传服务 (Pillow 压缩+缩略图, 类型校验, 大小限制)
2. #5 — AI 留言情感分析 (GPT-4o-mini + 关键词 fallback)
3. #10 — 智能推荐引擎 (四维加权: 距离40%+情感30%+场景20%+热度10%)
4. #13 — AI 声音克隆 (ElevenLabs, 10s样本→克隆语音)
5. #14 — AI 位置上下文 (Nominatim reverse geocode → GPT描述)
6. #15 — AI 视觉场景识别 (摄像头截图 → GPT-4o Vision)

## 已有骨架代码 (先 git pull 看最新)
- app/main.py — FastAPI app + CORS + lifespan + 路由注册
- app/database.py — SQLite schema (4张表) + init_db()
- app/models.py — Pydantic models (请求/响应)
- app/routers/users.py — 用户 CRUD (POST/GET/PUT)
- app/routers/capsules.py — 胶囊 CRUD (创建/详情/附近查询/回应)
- app/routers/ai.py — AI 服务骨架 (情感分析/场景识别/位置上下文/声音克隆)
- app/services/geohash_service.py — geohash 编码 + 9格附近查询 + haversine
- app/services/recommend_service.py — 推荐评分算法
- .env.example — 环境变量模板
- data/uploads/{photos,voices,voice_clones,thumbnails}/ — 上传目录

## API 接口契约 (你必须严格遵循)

### POST /api/users
- 格式: JSON | Body: { "name": "string", "interest_tags": ["x","y","z"] }
- Response 201: { "id", "name", "avatar_url", "interest_tags": [...], "created_at" }

### GET /api/users/:id
- Response 200: { "id", "name", "avatar_url", "interest_tags": [...], "created_at" }

### PUT /api/users/:id
- 格式: JSON | Body: { "name"?: "string", "interest_tags"?: [...], "avatar_url"?: "string" }
- Response 200: 同 GET

### POST /api/capsules
- 格式: FormData | 字段: message, latitude, longitude, mood_tag?, visibility?, author_id?, photos[](file), voice?(file)
- Response 201: { "id", "message", "latitude", "longitude", "geohash", "media": [{"id","type","url","thumbnail_url","sort_order"}], "voice_url" }

### GET /api/capsules/nearby?lat=&lng=&radius=&user_id=
- Response 200: {
    "total": int,
    "recommended": [CapsuleResponse],  // top-N, 按 match_score 降序
    "others": [CapsuleResponse]
  }
- 每个 CapsuleResponse 包含: id, author:{name,avatar}, message, emotion_tags, distance_m, match_score, match_reasons

### GET /api/capsules/:id
- Response 200: 完整 CapsuleResponse + media[]
- 副作用: open_count +1, 写入 interactions 表

### POST /api/capsules/:id/reply
- 格式: FormData | 字段: message, author_id?, photos[]
- Response 201: { "id", "message": "Reply created", "capsule_id" }

### POST /api/ai/analyze-emotion
- 格式: JSON | Body: { "message": "string" }
- Response 200: { "emotions": ["怀旧","温暖"], "sentiment": "positive", "intensity": 0.85, "summary": "..." }

### GET /api/ai/location-context?lat=&lng=
- Response 200: { "name", "description", "nearby_capsule_count", "suggested_moods": [...] }

### POST /api/ai/scene
- 格式: FormData | 字段: image(file), latitude(float), longitude(float)
- Response 200: { "scene_type", "description", "atmosphere", "mood_match": [...] }

### POST /api/ai/voice-clone
- 格式: FormData | 字段: sample(file,10s音频), text(string)
- Response 200: { "voice_id", "audio_url", "duration_seconds" }

## 16 个情感标签 (情感分析和 UI 共用)
怀旧、温暖、感恩、浪漫、思念、快乐、遗憾、鼓励、幽默、神秘、孤独、希望、青春、友情、亲情、爱情

## 推荐算法精确公式
- 距离: max(0, 1 - distance_m / 1000) × 0.4
- 情感匹配: |用户兴趣标签 ∩ 胶囊情感标签| / max(|胶囊情感标签|, 1) × 0.3
- 场景匹配: |场景mood_match ∩ 胶囊情感标签| / max(|场景mood_match|, 1) × 0.2
- 热度: min(open_count / 50, 1.0) × 0.1
- 返回 top-3 为 recommended，其余为 others

## 开发规范
- 所有函数 async/await
- Pydantic 做输入验证，不要裸 dict
- 没有 API key 时必须有 fallback（关键词匹配 / mock 数据），不能让 API 500
- 错误返回: raise HTTPException(status_code=..., detail="...")
- geohash 用 `import geohash`（不是 geohash2）
- 完成后 git add + commit (feat: xxx) + push origin main
- 每个完成的 Issue 用 gh issue close <number> 关闭
- 每完成一个 API 端点，在对应 Issue 评论中附上对接卡片:

### 对接卡片模板
```
### API 对接卡片: POST /api/xxx
- 请求格式: JSON / FormData
- 请求体: { field: type, ... }
- 响应体: { field: type, ... }
- 错误码: 400 → ..., 404 → ..., 500 → fallback
- 示例: curl -X POST http://localhost:8000/api/xxx ...
```
```

---

## 接口对接注意事项汇总

| 端点 | 格式 | 关键约定 |
|------|------|----------|
| POST /api/users | JSON | interest_tags 必须是恰好 3 个 |
| POST /api/capsules | **FormData** | 不要设 Content-Type header，浏览器自动加 boundary |
| GET /api/capsules/:id | - | 自动 open_count+1，返回 author:{name,avatar} |
| GET /api/capsules/nearby | Query params | 返回 {total, recommended[], others[]}，每个含 match_score + match_reasons |
| POST /api/capsules/:id/reply | **FormData** | 在同一 GPS 位置创建新胶囊 |
| POST /api/ai/analyze-emotion | JSON | emotions 从 16 标签中选 2-4 个 |
| POST /api/ai/scene | **FormData** | image 字段是文件，不是 base64 |
| POST /api/ai/voice-clone | **FormData** | sample 是音频文件，text 是朗读文字 |
