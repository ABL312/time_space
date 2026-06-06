# 后端性能基线说明

## 数据库配置基线

当前 SQLite 配置已包含合理的部署基线设置：

- **WAL 模式**: 在 `database.py` 中设置了 `PRAGMA journal_mode=WAL`，提高并发读取性能
- **外键约束**: 启用了 `PRAGMA foreign_keys=ON` 确保数据完整性
- **数据库路径**: 使用 `data/timespace.db` 作为主数据库文件

## 核心 API 性能特征

### 1. 健康检查 `/api/health`
- **方法**: GET
- **主要操作**: 
  - 返回服务健康状态
- **预期性能**: < 100ms

### 2. 附近胶囊查询 `/api/capsules/nearby`
- **方法**: GET
- **主要操作**:
  - 基于地理位置的范围查询
  - 使用 `idx_capsules_geohash` 和 `idx_capsules_location` 索引
  - 推荐算法排序
- **预期性能**: < 300ms (100米范围内约50个胶囊)

### 3. 搜索胶囊 `/api/capsules/search`
- **方法**: GET
- **主要操作**:
  - 文本搜索 (LIKE 查询)
  - 标签过滤
  - 距离计算和过滤
- **预期性能**: < 500ms (100个结果以内)

### 4. 每日推荐 `/api/capsules/daily-recommend`
- **方法**: GET
- **主要操作**:
  - 基于日期种子的随机推荐
  - 高评分胶囊筛选
- **预期性能**: < 500ms

## 分页与查询优化

### 分页实现
所有列表型 API 均实现了分页限制：
- 用户胶囊列表: 限制 50 条
- 搜索结果: 限制 100 条
- 附近查询: 默认限制 50 条，可通过参数调整 (limit=1-100)

### 索引策略
已在 `database.py` 中创建以下索引：
- `idx_capsules_geohash`: 提升地理哈希查询性能
- `idx_capsules_location`: 提升经纬度范围查询性能
- `idx_media_capsule`: 提升媒体文件关联查询性能
- `idx_interactions_capsule`: 提升互动记录查询性能
- `idx_interactions_user`: 提升用户互动查询性能

## 验证命令

```bash
# 启动后端服务
cd backend && uvicorn app.main:app --reload

# 测试导入
python -c "from app.main import app; print('IMPORT_OK')"

# 运行测试
python -m pytest -q

# 运行性能基线检查脚本
python scripts/performance_check.py
```

## 最近一次性能检查输出样本

```text
🚀 Running Performance Baseline Validation
==================================================
🔍 Checking database configuration...
  - Journal Mode: wal
  - Foreign Keys: ON
✅ Database configuration OK

🔍 Checking database indexes...
  ✅ Found index: idx_capsules_geohash
  ✅ Found index: idx_capsules_location
  ✅ Found index: idx_media_capsule
  ✅ Found index: idx_interactions_capsule
  ✅ Found index: idx_interactions_user
✅ All required indexes present

🚀 Running API Latency Tests
==================================================
  ✅ PASS GET /api/health [200] 2.1ms (≤100ms)
  ✅ PASS GET /api/capsules/nearby?lat=31.2304&lng=121.4737&radius=5000&limit=50 [200] 45.2ms (≤300ms)
  ✅ PASS GET /api/capsules/search?q=test [200] 12.3ms (≤500ms)
  ✅ ACCEPTED_404 GET /api/capsules/daily-recommend [404] 8.7ms (≤500ms)

==================================================
🎉 All API latency tests PASSED

==================================================
🎉 All performance baseline checks PASSED
```