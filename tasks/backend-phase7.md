你是「时空信箱」项目的 backend-dev，现在执行 Phase 7 任务。

## 项目信息
- 仓库: D:\time_space
- 后端目录: D:\time_space\backend
- 技术栈: Python 3.13 + FastAPI + SQLite + aiosqlite

## 你的任务

### 任务 A: 接口修复 (接口对接文档要求)

根据和队友的接口对接文档，需要修复 3 个问题：

#### 1. POST /api/users 返回真实 created_at

文件: `backend/app/routers/users.py`

当前代码（约第 33 行）：
```python
return UserResponse(
    id=user_id,
    name=data.name,
    interest_tags=data.interest_tags,
    created_at="just now",  # ← 这里有问题
)
```

修改为：
```python
from datetime import datetime

# INSERT 后获取 created_at（数据库有 DEFAULT CURRENT_TIMESTAMP）
cursor = await db.execute("SELECT created_at FROM users WHERE id = ?", (user_id,))
row = await cursor.fetchone()
created_at = row[0] if row else datetime.now().isoformat()

return UserResponse(
    id=user_id,
    name=data.name,
    interest_tags=data.interest_tags,
    created_at=created_at,
)
```

或者更简单：直接用 `datetime.now().isoformat()` 作为 created_at。

#### 2. POST /api/capsules/:id/reply 返回完整 CapsuleResponse

文件: `backend/app/routers/capsules.py`

当前代码（约第 353 行）：
```python
return {"id": reply_id, "message": "Reply created", "capsule_id": reply_id}
```

修改为：查询刚创建的 reply capsule，返回完整结构（和 POST /api/capsules 一样的格式）。

参考 `get_capsule` 函数的逻辑：
```python
# 查询刚创建的 reply
cursor = await db.execute("SELECT * FROM capsules WHERE id = ?", (reply_id,))
row = await cursor.fetchone()
capsule = _parse_capsule_row(dict(row))

# 查询 media
cursor = await db.execute("SELECT * FROM media WHERE capsule_id = ? ORDER BY sort_order", (reply_id,))
media_rows = await cursor.fetchall()
capsule["media"] = [dict(m) for m in media_rows]

return capsule
```

#### 3. POST /api/capsules 接受 voice_clone_url 字段

文件: `backend/app/routers/capsules.py`

在 `create_capsule` 函数的参数中添加：
```python
voice_clone_url: Optional[str] = Form(None),
```

在 INSERT 语句中加入 voice_clone_url：
```python
await db.execute(
    """
    INSERT INTO capsules (id, author_id, latitude, longitude, geohash, message, 
                          mood_tag, visibility, voice_clone_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """,
    (capsule_id, author_id, latitude, longitude, geohash, message, 
     mood_tag, visibility, voice_clone_url),
)
```

### 任务 B: 演示数据验证 (#18)

1. **确认 seed_demo.py 可以正常运行**：
   ```bash
   cd backend && python -m scripts.seed_demo
   ```

2. **验证数据正确插入**：
   - 启动服务器: `uvicorn app.main:app --port 8000`
   - 调用 `GET /api/capsules/nearby?lat=31.23&lng=121.47&radius=5000`
   - 确认返回 3 个演示胶囊

3. **如果 seed_demo.py 有问题，修复它**

### 任务 C: 全面测试 (#22 后端部分)

1. **启动服务器并测试所有端点**：
   ```bash
   cd backend && uvicorn app.main:app --port 8000
   ```

2. **测试清单**：
   - POST /api/users — 创建用户
   - GET /api/users/:id — 获取用户
   - POST /api/capsules — 创建胶囊（带照片+语音）
   - GET /api/capsules/nearby — 附近查询
   - GET /api/capsules/:id — 详情（确认 open_count +1）
   - POST /api/capsules/:id/reply — 回复（确认返回完整结构）
   - POST /api/ai/analyze-emotion — 情感分析
   - GET /api/ai/location-context — 位置上下文
   - POST /api/admin/seed — 演示数据

3. **修复发现的问题**

### 技术要求
- 所有函数 async/await
- Pydantic 做输入验证
- geohash 用 `import geohash`（不是 geohash2）

### 工作流
1. 先 `git pull` 获取最新代码
2. 读取 users.py, capsules.py 了解当前代码
3. 修复 3 个接口问题
4. 验证 seed_demo.py
5. 启动服务器测试所有端点
6. git add . && git commit -m "fix(backend): interface fixes + demo data verification + testing"
7. git push（如果可能）

### 重要提醒
- 如果遇到任何报错，**停下来告诉我（Tostar）**
- 不要修改前端代码
- 不要删除任何现有功能
