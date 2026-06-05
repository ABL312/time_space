你是「时空信箱」项目的 backend-dev，现在执行 Phase 6 任务。

## 项目信息
- 仓库: D:\time_space
- 后端目录: D:\time_space\backend
- 技术栈: Python 3.13 + FastAPI + SQLite + aiosqlite

## 你的任务

### 任务 A: 验证并完善创建胶囊 API (Issue #12 后端部分)

当前 `backend/app/routers/capsules.py` 已有 355 行代码，POST /api/capsules 端点可能已存在。

1. **读取并验证现有代码**:
   - 读取 `backend/app/routers/capsules.py` 确认 POST /api/capsules 是否完整
   - 确认它接受: FormData (message, latitude, longitude, mood_tag?, visibility?, author_id?, photos[], voice?)
   - 确认它返回 201 + 正确的 JSON 结构
   - 确认 geohash 计算正确（用 `import geohash`，不是 geohash2）
   - 确认文件保存到 data/uploads/photos/ 和 data/uploads/voices/

2. **如果 POST /api/capsules 不完整，补充**:
   - 接受 multipart/form-data
   - 处理照片上传（保存到 data/uploads/photos/，生成 thumbnail）
   - 处理语音上传（保存到 data/uploads/voices/）
   - 计算 geohash
   - 插入数据库
   - 异步触发情感分析（调用 emotion_service）
   - 返回 201 + capsule 对象

3. **验证 GET /api/capsules/:id**:
   - 返回完整 capsule 数据（包括 media 列表、author 信息、emotion_tags）
   - open_count 自动 +1

### 任务 B: 全面 API 健康检查 (Issue #22 后端准备)

确保所有端点可以正常启动和响应：

1. **验证数据库初始化**:
   - 确认 `init_db()` 正确创建所有表
   - 确认 seed_demo.py 数据可以正确加载

2. **验证所有路由注册**:
   - 读取 `backend/app/main.py` 确认所有 router 已注册
   - capsules, users, ai, upload, admin 全部注册

3. **启动测试**:
   - 尝试 `cd backend && python -c "from app.main import app; print('OK')"` 验证无 import 错误
   - 检查 requirements.txt 是否包含所有依赖

4. **修复发现的问题**:
   - 如果有 import 错误、缺失依赖、类型错误等，直接修复
   - 确保 `uvicorn app.main:app` 可以成功启动

### 技术要求
- 所有函数 async/await
- Pydantic 做输入验证
- 没有 API key 时必须有 fallback
- geohash 用 `import geohash`（不是 geohash2）
- 错误返回: raise HTTPException(status_code=..., detail="...")

### 工作流
1. 先 `git pull` 获取最新代码
2. 读取 main.py, capsules.py, database.py, models.py
3. 验证 POST /api/capsules 完整性
4. 验证所有路由注册
5. 运行 import 测试
6. 如有问题，修复
7. git add . && git commit -m "feat(backend): verify capsule creation API + health check all endpoints"
8. git push（如果可能）

### 重要提醒
- 如果遇到任何报错，**停下来告诉我（Tostar）**
- 不要修改前端代码
- 不要删除任何现有功能，只做验证和修复
