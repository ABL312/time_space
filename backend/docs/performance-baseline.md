# 后端性能与部署基线

> Issue: [#35](https://github.com/ABL312/time_space/issues/35)
> Date: 2026-06-06
> Owner: backend-dev (@1416354282-spec / Fermin)

---

## 1. 系统概览

### 1.1 技术栈

| 组件 | 版本 | 用途 |
|------|------|------|
| FastAPI | 0.115.0 | Web 框架 |
| Uvicorn | 0.30.6 | ASGI 服务器 |
| aiosqlite | 0.20.0 | 异步 SQLite 驱动 |
| SQLite | 3.x (系统内置) | 数据库 |
| Pillow | 10.4.0 | 图片压缩/缩略图 |
| OpenAI SDK | 1.51.0 | GPT-4o-mini/GPT-4o Vision |
| ElevenLabs SDK | 1.9.0 | 语音克隆 |
| httpx | 0.27.2 | HTTP 客户端 (Nominatim) |

### 1.2 部署配置

```
Procfile:     web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
railway.toml: Nixpacks builder, health check at /api/health
```

---

## 2. 路由全景

### 2.1 全部端点 (25个)

| 方法 | 路径 | 文件 | 功能 | DB查询次数 |
|------|------|------|------|-----------|
| `GET` | `/api/health` | main.py | 根健康检查 | 0 |
| `GET` | `/api/admin/health` | admin.py | Admin健康检查 | 0 |
| `POST` | `/api/admin/seed` | admin.py | 种子数据 (dev only) | 0 |
| `POST` | `/api/users` | users.py | 创建用户 | 1W |
| `GET` | `/api/users/{id}` | users.py | 获取用户 | 1R |
| `PUT` | `/api/users/{id}` | users.py | 更新用户 | 2RW |
| `POST` | `/api/capsules` | capsules.py | 创建胶囊 | 1W + N×1W(media) + 1R |
| `GET` | `/api/capsules/nearby` | capsules.py | 附近胶囊 | 1R(users) + 1R(capsules) |
| `GET` | `/api/capsules/search` | capsules.py | 搜索胶囊 | 1R(users) + 1R(capsules) + N×1R(media) |
| `GET` | `/api/capsules/mine` | capsules.py | 我的胶囊 | 1R(capsules) + N×1R(media) |
| `GET` | `/api/capsules/{id}` | capsules.py | 胶囊详情 | 2RW + 1R(media) |
| `GET` | `/api/capsules/shared/{token}` | capsules.py | 分享访问 | 2RW + 1R(media) |
| `POST` | `/api/capsules/{id}/reply` | capsules.py | 回复胶囊 | 1R + 1W + N×1W(media) + 1W(interaction) + 1R |
| `POST` | `/api/capsules/{id}/regenerate-share` | capsules.py | 刷新分享令牌 | 1RW |
| `GET` | `/api/capsules/daily-recommend` | capsules.py | 每日推荐 | 1-2R + 1R(media) |
| `POST` | `/api/ai/analyze-emotion` | ai.py | 情感分析 | 0 (external API) |
| `GET` | `/api/ai/location-context` | ai.py | 位置上下文 | 1R(nearby count) |
| `POST` | `/api/ai/scene` | ai.py | 场景识别 | 0 (external API) |
| `POST` | `/api/ai/voice-clone` | ai.py | 语音克隆 | 0 (external API) |
| `POST` | `/api/upload/photo` | upload.py | 上传照片 | 0 |
| `POST` | `/api/upload/voice` | upload.py | 上传语音 | 0 |
| `POST` | `/api/capsules/{id}/responses/` | responses.py | 添加回复 | 1R + 1RW |
| `GET` | `/api/capsules/{id}/responses/` | responses.py | 获取回复列表 | 1R + 1R |
| `POST` | `/api/favorites/{id}` | favorites.py | 收藏胶囊 | 1R + 1R + 1W |
| `DELETE` | `/api/favorites/{id}` | favorites.py | 取消收藏 | 1R + 1W |
| `GET` | `/api/favorites/` | favorites.py | 收藏列表 | 1R(capsules) + N×1R(media) |
| `GET` | `/api/favorites/capsules/{id}/favorite-status` | favorites.py | 收藏状态 | 1R + 1R |
| `POST` | `/api/collections` | collections.py | 创建合集 | 1W + 1R |
| `GET` | `/api/collections` | collections.py | 合集列表 | 1R |
| `GET` | `/api/collections/{id}` | collections.py | 合集详情 | 1R + 1R(capsules) + N×1R(media) |
| `PUT` | `/api/collections/{id}` | collections.py | 更新合集 | 1R + 1RW |
| `POST` | `/api/collections/{id}/view` | collections.py | 合集浏览计数 | 1RW |

### 2.2 数据库表 (7张)

| 表 | 行数估算 | 关键列 | 现有索引 |
|----|---------|-------|---------|
| `users` | < 100 | id, name, interest_tags | 无 (仅主键) |
| `capsules` | 核心表 | id, author_id, latitude, longitude, geohash, created_at | `idx_capsules_geohash`, `idx_capsules_location` |
| `media` | N×capsules | id, capsule_id, type, url | `idx_media_capsule` |
| `interactions` | N×capsules | id, capsule_id, user_id, action | `idx_interactions_capsule`, `idx_interactions_user` |
| `responses` | N×capsules | id, capsule_id, user_id, content | 无 (仅主键) |
| `favorites` | N×users | id, user_id, capsule_id | UNIQUE(user_id, capsule_id) |
| `collections` | < 50 | id, creator_id, capsule_ids(JSON) | 无 (仅主键) |

---

## 3. SQLite 配置审计

### 3.1 当前配置

| 参数 | 期望值 | 实际值 | 状态 |
|------|--------|--------|------|
| `journal_mode` | WAL | WAL (仅在 `get_db()` 中设置) | ⚠️ `init_db()` 未设置 |
| `foreign_keys` | ON | ON (仅在 `get_db()` 中设置) | ⚠️ `init_db()` 未设置 |
| `busy_timeout` | ≥ 5000ms | **未配置** | ❌ 缺失 |
| `synchronous` | NORMAL (WAL mode) | FULL (默认) | ⚠️ 可优化 |
| `busy_timeout` | ≥ 5000ms | **5000ms** | ✅ 已配置 |
| `synchronous` | NORMAL (WAL mode) | FULL (默认) | ⚠️ 可优化 |
| `cache_size` | -8000 (~8MB) | -2000 (~2MB, 默认) | ⚠️ 可优化 |
| `mmap_size` | 268435456 (256MB) | 0 (禁用, 默认) | ⚠️ 可优化 |
| `temp_store` | MEMORY | DEFAULT | ⚠️ 可优化 |

### 3.2 风险说明

- ✅ **`busy_timeout` 已配置为 5000ms**：`get_db()` 每次连接时设置。并发写入等待最多5秒后报 `SQLITE_BUSY`。
- ✅ **`init_db()` 已设置 WAL 和 foreign_keys**：首次创建数据库即为 WAL 模式。
- **`synchronous=FULL`**：在 WAL 模式下通常不需要 FULL；NORMAL 在 WAL 下足够安全。

### 3.3 当前修复状态 (2026-06-06)

以下为 #36 已完成的性能修复：

| 修复项 | 状态 |
|--------|------|
| N+1 查询 (mine/search/favorites/collections) | ✅ 批量 media 查询 |
| 索引补全 (9个新索引) | ✅ `IF NOT EXISTS` 幂等 |
| 分页 (responses/favorites/collections) | ✅ `offset`/`limit` 参数 |
| repository 层分离 | ✅ 7 个 repository 文件 |
| service 层封装 | ✅ capsule_service / user_service |
| `busy_timeout` 配置 | ✅ 5000ms |
| `DATABASE_URL` 接入 | ✅ 解析 sqlite:/// URL |

---

## 4. 关键 API 基线分析

### 4.1 POST /api/capsules — 创建胶囊

**流程**:
```
1. 生成 UUID + geohash + share_token
2. INSERT capsules (1次写)
3. FOR each photo (max 5):
   a. storage_service.save_photo() — 读取文件、校验magic bytes、Pillow压缩+缩略图
   b. INSERT media (1次写)
4. IF voice: storage_service.save_voice() — 读取文件、校验
5. UPDATE capsules SET voice_url (1次写)
6. COMMIT
7. asyncio.create_task(_analyze_and_update_emotion) — 后台异步，不阻塞响应
8. SELECT capsules (1次读，返回创建结果)
9. SELECT media (1次读)
```

**风险点**:
- ⚠️ 后台情感分析 `asyncio.create_task` 无超时保护，无重试，异常仅 print
- ⚠️ 照片处理在主请求线程中同步执行（非异步），5张照片的Pillow压缩会阻塞
- ✅ 上传失败已返回 `upload_errors` 字段（#38 修复），不静默跳过
- ⚠️ voice_clone_url 由前端传入，未验证是否为有效 URL

**性能预期**: 200-800ms（无照片）/ 1-3s（5张照片含压缩）

### 4.2 GET /api/capsules/nearby — 附近胶囊

**流程**:
```
1. 根据 radius 选择 geohash 精度 (5/6/7)
2. 查询 geohash 前缀匹配的 capsules（LIMIT 50）
3. haversine 精确距离过滤（O(n) 循环计算）
4. 按距离排序
5. 获取用户 interest_tags（如有 user_id）
6. rank_capsules() 评分排序（4维度加权）
7. format_capsule() 逐条转换
```

**风险点**:
- ⚠️ `SUBSTR(c.geohash, 1, {precision})` 无法使用索引（函数包裹列）
- ⚠️ 未返回 media 字段（与其他 capsule 列表接口不一致）
- ⚠️ 无 LIMIT 上限保护——radius 很大时可能扫描大量行

**性能预期**: 50-200ms（小范围）/ 200-500ms（大范围）

### 4.3 GET /api/capsules/{id} — 胶囊详情

**流程**:
```
1. SELECT capsule + LEFT JOIN user
2. 检查 unlock_at 时间锁
3. UPDATE open_count +1 + COMMIT
4. SELECT media
5. INSERT interaction + COMMIT
```

**风险点**:
- ✅ 单条查询，性能良好
- ⚠️ 每次打开都写入 interactions 表——高频访问时可能成为写入瓶颈

**性能预期**: 50-100ms

### 4.4 GET /api/capsules/daily-recommend — 每日推荐

**流程**:
```
1. 用当日日期做随机种子
2. 查询 open_count>0 且 emotion_intensity 非空的公开胶囊 (LIMIT 50)
3. 降级：查询任意公开胶囊 (LIMIT 50)
4. random.choice() 选1条
5. SELECT media
```

**风险点**:
- ✅ 有 LIMIT 保护
- ⚠️ `ORDER BY c.open_count DESC, c.emotion_intensity DESC` 无索引支持，需全表扫描+排序
- ⚠️ 无缓存——每次请求都重新查询+随机

**性能预期**: 100-300ms

### 4.5 POST /api/upload/photo — 上传照片

**流程**:
```
1. 读取文件内容到内存
2. Magic bytes 校验
3. MIME type 校验
4. Pillow 压缩（max 1200px）+ 缩略图（200px）
5. 写入磁盘
```

**风险点**:
- ⚠️ 文件全量读入内存——大文件 OOM 风险
- ⚠️ Pillow 异常时降级保存原始字节，但未限制原始文件大小（只限制了5MB）
- ✅ 有 Magic bytes 验证防伪造

**性能预期**: 200-500ms（小图）/ 500ms-2s（大图）

### 4.6 POST /api/ai/analyze-emotion — 情感分析

**流程**:
```
1. GPT-4o-mini (3s timeout) 或关键词匹配
```

**风险点**:
- ✅ 有 3s timeout
- ✅ 有完整关键词 fallback
- ✅ API key 缺失时不调用 GPT

**性能预期**: 500ms-3s（GPT）/ < 5ms（关键词）

---

## 5. 架构风险清单

### 5.1 已修复 (#35-#38)

| # | 问题 | 修复 |
|---|------|------|
| 1 | `busy_timeout` 未配置 | ✅ `get_db()` 设置 `PRAGMA busy_timeout=5000` |
| 2 | N+1 查询：media 逐条取 | ✅ `_batch_fetch_media()` 批量查询 |
| 3 | 无分页机制 | ✅ `offset`/`limit` 参数已添加 |
| 4 | `init_db()` 未设 WAL/foreign_keys | ✅ `init_db()` 已统一 pragma |
| 5 | DB 路径硬编码 | ✅ `DATABASE_URL` 解析接入 |
| 6 | 无 repository 层 | ✅ 7 个 repository + 2 个 service |
| 7 | `voice_clone_service` 无 timeout | ✅ `asyncio.wait_for` 30s |
| 8 | `scene_service` 无 timeout/图片限制 | ✅ 10s timeout + 10MB 限制 |
| 9 | stray DB 文件 (time_spacedatatimespace.db) | ✅ git rm --cached + gitignore |

### 5.2 剩余优化项

| # | 问题 | 影响面 | 优先级 |
|---|------|--------|--------|
| 1 | `synchronous=FULL` 可降为 NORMAL | WAL 下速度提升 | 低 |
| 2 | `cache_size` 默认 2MB | 查询性能 | 低 |
| 3 | Pillow 压缩同步阻塞事件循环 | 上传性能 | 中 |
| 4 | `asyncio.create_task` 情感分析无超时保护 | 后台任务可靠性 | 中 |
| 5 | voice_clone_url 由前端传入未验证 | 安全性 | 低 |
| 10 | `cache_size` 默认 2MB | 全局 | 增大到 8MB |
| 11 | VoiceService (sync) 废弃未删 | 维护 | 清理 dead code |
| 12 | 无 API 响应时间日志 | 可观测性 | 加 middleware 计时 |

---

## 6. 索引清单（已全部实现）

以下索引已在 #36 中添加，均为 `CREATE INDEX IF NOT EXISTS` 幂等创建：

| 表 | 索引名 | 列 | 用途 |
|----|--------|-----|------|
| `capsules` | `idx_capsules_author` | (author_id) | `/mine` 按用户查询 |
| `capsules` | `idx_capsules_visibility` | (visibility, created_at) | `/daily-recommend` 过滤 |
| `capsules` | `idx_capsules_open_emotion` | (open_count, emotion_intensity) | 每日推荐排序 |
| `capsules` | `idx_capsules_created` | (created_at) | 通用排序 |
| `responses` | `idx_responses_capsule` | (capsule_id, created_at) | 回复列表查询 |
| `favorites` | `idx_favorites_user` | (user_id, created_at) | 收藏列表查询 |
| `favorites` | `idx_favorites_capsule` | (capsule_id) | 收藏状态检查 |
| `collections` | `idx_collections_creator` | (creator_id) | 合集创建者查询 |
| `interactions` | `idx_interactions_created` | (created_at) | 交互时间排序 |

---

## 7. 性能检查脚本

见 `backend/scripts/check_performance.py` — 运行方式：

```bash
cd backend
python scripts/check_performance.py
```

该脚本检查：
- SQLite WAL / busy_timeout / foreign_keys 配置
- 数据库文件大小和表行数
- 现有索引列表
- 环境变量配置状态
- 不修改任何业务数据

---

## 8. 重构优先级建议

基于以上分析，重构执行顺序：

| 优先级 | Issue | 动作 | 理由 |
|--------|-------|------|------|
| P0 | #35 | **补充 `busy_timeout` + SQLite 参数优化** | 预防并发崩溃，改动最小 |
| P1 | #36 | 索引 + 查询优化 + 分页 | 性能提升最直接 |
| P2 | #37 | 分层重构 + 配置中心 | 架构基础，影响后续所有工作 |
| P3 | #38 | AI/上传隔离 | 依赖分层后的清晰架构 |

---

*本文档基于 2026-06-06 代码快照生成。后续重构完成后需更新。*
