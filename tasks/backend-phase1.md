# backend-dev Phase 1 任务

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

## 任务清单（4个Issue）

### Issue #23 - 用户回应/留言系统
**后端实现：**
1. 在 database.py 添加 responses 表：
   ```sql
   CREATE TABLE IF NOT EXISTS responses (
       id TEXT PRIMARY KEY,
       capsule_id TEXT NOT NULL,
       user_id TEXT,
       nickname TEXT DEFAULT '匿名',
       content TEXT NOT NULL,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (capsule_id) REFERENCES capsules(id)
   )
   ```
2. 创建 app/routers/responses.py：
   - POST /api/capsules/{capsule_id}/responses - 添加回应
   - GET /api/capsules/{capsule_id}/responses - 获取回应列表
3. 在 main.py 注册路由

### Issue #25 - 胶囊收藏/书签
**后端实现：**
1. 添加 favorites 表：
   ```sql
   CREATE TABLE IF NOT EXISTS favorites (
       id TEXT PRIMARY KEY,
       user_id TEXT NOT NULL,
       capsule_id TEXT NOT NULL,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       UNIQUE(user_id, capsule_id),
       FOREIGN KEY (capsule_id) REFERENCES capsules(id)
   )
   ```
2. 创建 app/routers/favorites.py：
   - POST /api/favorites/{capsule_id} - 收藏
   - DELETE /api/favorites/{capsule_id} - 取消收藏
   - GET /api/favorites - 获取我的收藏列表（需user_id参数）
   - GET /api/capsules/{capsule_id}/favorite-status - 查询是否已收藏

### Issue #31 - 胶囊搜索/筛选
**后端实现：**
1. 在 capsules.py 添加搜索端点：
   - GET /api/capsules/search?q=关键词&tag=情感标签&lat=&lng=&radius=5000
   - 支持按消息内容模糊搜索
   - 支持按emotion_tags筛选（逗号分隔多标签）
   - 支持按距离筛选

### Issue #24 - 时间锁胶囊
**后端实现：**
1. capsules 表添加字段（用ALTER TABLE或重建表）：
   - unlock_at TIMESTAMP (可选，NULL表示立即可用)
2. 修改创建胶囊API接受 unlock_at 参数
3. 修改获取胶囊详情API：
   - 如果 unlock_at > 当前时间，返回特殊响应：
     ```json
     {"locked": true, "unlock_at": "2026-12-25T00:00:00", "countdown_seconds": 1234567}
     ```
   - 否则正常返回胶囊内容

## 开发规范
- 所有函数 async/await
- Pydantic 做输入验证
- 错误返回 HTTPException
- 完成后：
  ```bash
  git add -A
  git commit -m "feat: 回应/收藏/搜索/时间锁后端 (#23,#25,#31,#24)"
  git push origin feature/phase2-enhancements
  ```

## 遇到任何错误立即停止并报告，不要猜测修复。
