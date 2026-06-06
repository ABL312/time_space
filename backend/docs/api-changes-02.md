# API 对接卡片 — 后端重构 02

> Issue: [#36](https://github.com/ABL312/time_space/issues/36)
> Date: 2026-06-06
> 原则: 保持 API 响应结构兼容前端，仅新增分页参数（可选）、优化查询性能

---

## 变更摘要

| 类型 | 端点 | 变更 |
|------|------|------|
| 🔧 性能优化 | `GET /api/capsules/mine` | N+1→1 次 media 查询，响应结构不变 |
| 🔧 性能优化 | `GET /api/capsules/search` | N+1→1 次 media 查询，响应结构不变 |
| 🔧 性能优化 | `GET /api/favorites/` | N+1→1 次 media 查询，新增分页参数 |
| 🔧 性能优化 | `GET /api/collections/{id}` | N+1→1 次 media 查询，响应结构不变 |
| ➕ 新增分页 | `GET /api/favorites/` | 新增 `offset`/`limit` 参数 |
| ➕ 新增分页 | `GET /api/collections` | 新增 `offset`/`limit` 参数 |
| ➕ 新增分页 | `GET /api/capsules/{id}/responses/` | 新增 `offset`/`limit` 参数 |
| 📊 新增索引 | 全部 | 9个新索引，零停机（`CREATE INDEX IF NOT EXISTS`） |

---

## 分页参数说明

以下端点新增可选分页参数，**不传则使用默认值，行为向后兼容**：

### `GET /api/favorites/`

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `user_id` | string | 必填 | 用户ID |
| `offset` | int | 0 | 偏移量 |
| `limit` | int | 50 | 每页条数（最大100） |

```
# 旧调用方式（仍可用）
GET /api/favorites/?user_id=xxx

# 新分页调用
GET /api/favorites/?user_id=xxx&offset=0&limit=20
```

### `GET /api/collections`

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `offset` | int | 0 | 偏移量 |
| `limit` | int | 50 | 每页条数（最大100） |

```
# 旧调用方式（仍可用）
GET /api/collections

# 新分页调用
GET /api/collections?offset=0&limit=20
```

### `GET /api/capsules/{id}/responses/`

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `offset` | int | 0 | 偏移量 |
| `limit` | int | 50 | 每页条数（最大100） |

```
# 旧调用方式（仍可用）
GET /api/capsules/xxx/responses/

# 新分页调用
GET /api/capsules/xxx/responses/?offset=0&limit=20
```

---

## 性能优化详情

### N+1 查询修复

**问题**：列表接口对每条 capsule 单独查询 media，N 条 capsule = N 次额外 DB 查询。

**修复**：先用一条查询取回所有 media，再按 capsule_id 分组分配。

| 接口 | 修复前 | 修复后 |
|------|--------|--------|
| `mine` (50条) | 1 + 50 = 51 次查询 | 1 + 1 = 2 次查询 |
| `search` (100条) | 1 + 100 = 101 次查询 | 1 + 1 = 2 次查询 |
| `favorites` (50条) | 1 + 50 = 51 次查询 | 1 + 1 = 2 次查询 |
| `collections/{id}` (N条) | 1 + N 次查询 | 1 + 1 = 2 次查询 |

**前端兼容性**：响应结构完全不变，`capsule.media` 字段仍为 `[{id, capsule_id, type, url, thumbnail_url, sort_order}]`。

---

## 新增索引清单

| 索引名 | 表 | 列 | 用途 |
|--------|-----|-----|------|
| `idx_capsules_author` | capsules | (author_id) | `/mine` 按作者查询 |
| `idx_capsules_visibility` | capsules | (visibility, created_at) | `/daily-recommend` 过滤 |
| `idx_capsules_open_emotion` | capsules | (open_count, emotion_intensity) | 每日推荐排序 |
| `idx_capsules_created` | capsules | (created_at) | 通用排序/游标分页 |
| `idx_responses_capsule` | responses | (capsule_id, created_at) | 回复列表查询+排序 |
| `idx_favorites_user` | favorites | (user_id, created_at) | 收藏列表查询+排序 |
| `idx_favorites_capsule` | favorites | (capsule_id) | 收藏状态检查 |
| `idx_collections_creator` | collections | (creator_id) | 按创建者查询合集 |
| `idx_interactions_created` | interactions | (created_at) | 交互时间排序 |

所有索引使用 `CREATE INDEX IF NOT EXISTS`，重复运行安全。

---

## 验证命令

```bash
# 1. 重启后端（自动执行 init_db 创建新索引）
cd backend
uvicorn app.main:app --reload --port 8000

# 2. 核心 curl 验证

# 健康检查
curl http://localhost:8000/api/health

# 我的胶囊（验证 N+1 修复）
curl "http://localhost:8000/api/capsules/mine?user_id=<demo-user-id>"

# 收藏列表（验证分页+N+1修复）
curl "http://localhost:8000/api/favorites/?user_id=<demo-user-id>&offset=0&limit=10"

# 回复列表（验证分页）
curl "http://localhost:8000/api/capsules/<capsule-id>/responses/?offset=0&limit=10"

# 合集列表（验证分页）
curl "http://localhost:8000/api/collections?offset=0&limit=10"

# 性能检查（验证索引）
python scripts/check_performance.py
```
