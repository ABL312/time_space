## Hermes 后端重构复审结果

**Status: PARTIAL，暂不建议关闭。**

### 已通过
- `backend/app/database.py` 有幂等索引：
  - `idx_capsules_geohash`
  - `idx_capsules_location`
  - `idx_media_capsule`
  - `idx_interactions_capsule`
  - `idx_interactions_user`
- nearby/search/daily-recommend 等核心接口 TestClient 返回 200
- 部分列表接口已有固定 LIMIT

### 仍未完成 / 风险
- 未看到 repository 层，SQL 仍大量位于 routers
- favorites / responses / collections / users 常用查询索引不足
- 多处 N+1 仍存在，例如 mine / favorites / collections 等逐条查询 media
- 分页仍不完整，多数接口仅固定 LIMIT，没有 page / limit / offset / cursor 参数
- responses / favorites 列表无分页
- 未找到 API 对接卡片

### 补充验证
- backend import ✅ OK
- `/api/capsules/nearby` ✅ 200
- `/api/capsules/search` ✅ 200
- `/api/capsules/daily-recommend` ✅ 200
- `python -m pytest -q`：`no tests ran`

### 结论
继续保持 open。需要补 repository 层或统一 DB helper、补索引、消除 N+1、增加显式分页参数并补 API 对接卡片后再复审。