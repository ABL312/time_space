# backend-dev Phase 2 任务

你是「时空信箱」项目的 backend-dev。

## 项目信息
- 仓库: D:\time_space
- 分支: feature/phase2-enhancements (已切换)
- GitHub: https://github.com/ABL312/time_space
- 技术栈: Python 3.13 + FastAPI + SQLite + aiosqlite

## 重要：先拉最新代码
```bash
git pull origin feature/phase2-enhancements
```

## 任务清单（3个Issue）

### Issue #27 - 胶囊分享链接/二维码
**后端实现：**
1. capsules 表添加字段：
   - share_token TEXT UNIQUE (用于生成短链)
2. 创建胶囊时自动生成 share_token (uuid短码)
3. 添加API：
   - GET /api/capsules/shared/{share_token} - 通过share_token获取胶囊（不需要user_id）
   - POST /api/capsules/{capsule_id}/regenerate-share - 重新生成share_token
4. 修改创建胶囊API返回share_token

### Issue #29 - 每日推荐胶囊
**后端实现：**
1. 添加API：
   - GET /api/capsules/daily-recommend - 返回今日推荐胶囊
   - 逻辑：基于日期种子随机选择一个高评分胶囊（open_count高、emotion_intensity高）
   - 同一天返回同一个胶囊（用日期做随机种子）
2. 返回格式：
   ```json
   {
     "capsule": {完整胶囊对象},
     "reason": "推荐理由（如：今日最受欢迎/怀旧主题精选等）",
     "expires_at": "明天0点时间戳"
   }
   ```

### Issue #30 - 胶囊合集/故事路线
**后端实现：**
1. 添加 collections 表：
   ```sql
   CREATE TABLE IF NOT EXISTS collections (
       id TEXT PRIMARY KEY,
       title TEXT NOT NULL,
       description TEXT,
       cover_image TEXT,
       creator_id TEXT,
       capsule_ids TEXT,  -- JSON array of capsule IDs, ordered
       view_count INTEGER DEFAULT 0,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   )
   ```
2. 添加API：
   - GET /api/collections - 获取合集列表
   - GET /api/collections/{id} - 获取合集详情（含胶囊列表）
   - POST /api/collections - 创建合集（需要creator_id）
   - PUT /api/collections/{id} - 更新合集
   - POST /api/collections/{id}/view - 增加浏览量
3. 预置2个示例合集：
   - "校园四景" - 包含4个校园相关胶囊
   - "爱情故事线" - 包含3个爱情相关胶囊

## 开发规范
- 所有函数 async/await
- Pydantic 做输入验证
- 错误返回 HTTPException
- 完成后：
  ```bash
  git add -A
  git commit -m "feat: 分享链接+每日推荐+合集后端 (#27,#29,#30)"
  git push origin feature/phase2-enhancements
  ```

## 遇到任何错误立即停止并报告，不要猜测修复。
