你是「时空信箱」项目的 backend-dev，现在执行 Phase 1 任务。

## 你的任务: 实现文件上传服务和媒体处理 (Issue #9/#11)

### 目标
将 backend/app/routers/capsules.py 中内联的文件上传逻辑提取为独立的 StorageService，并增强功能。

### 当前状态
capsules.py 中已有内联的图片压缩和缩略图逻辑（用 Pillow），但缺少：
- 独立的 StorageService 模块
- 文件类型校验（magic bytes，不仅看扩展名）
- 文件大小限制检查
- 语音文件存储独立处理
- 错误处理不够完善

### 需要实现的文件

1. **backend/app/services/storage_service.py** — 新建：
   ```python
   class StorageService:
       UPLOAD_DIR = Path("data/uploads")
       MAX_PHOTO_SIZE = 5 * 1024 * 1024  # 5MB
       MAX_VOICE_SIZE = 10 * 1024 * 1024  # 10MB
       ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
       ALLOWED_VOICE_TYPES = {"audio/webm", "audio/mpeg", "audio/mp4", "audio/ogg"}
       IMAGE_MAGIC = {
           b"\xff\xd8\xff": "jpeg",
           b"\x89PNG": "png", 
           b"RIFF": "webp",  # WebP starts with RIFF...WEBP
       }
       
       async def save_photo(self, file: UploadFile) -> dict:
           """Compress, save photo + thumbnail, return urls."""
           # 1. Check size
           # 2. Check content type
           # 3. Validate magic bytes
           # 4. Pillow compress (max 1200px)
           # 5. Save to photos/
           # 6. Generate thumbnail (200px) to thumbnails/
           # 7. Return {"url": "...", "thumbnail_url": "...", "filename": "..."}
       
       async def save_voice(self, file: UploadFile) -> dict:
           """Save voice file, return url."""
           # 1. Check size
           # 2. Check content type  
           # 3. Save to voices/
           # 4. Return {"url": "...", "filename": "..."}
       
       def _validate_image_magic(self, header: bytes) -> bool:
           """Check file magic bytes for image types."""
       
       @staticmethod
       def get_photo_url(filename: str) -> str:
           return f"/uploads/photos/{filename}"
       
       @staticmethod
       def get_thumbnail_url(filename: str) -> str:
           return f"/uploads/thumbnails/{filename}"
       
       @staticmethod
       def get_voice_url(filename: str) -> str:
           return f"/uploads/voices/{filename}"
   ```

2. **修改 backend/app/routers/capsules.py** — 使用 StorageService：
   - 将 create_capsule 中的内联图片处理替换为 storage_service.save_photo()
   - 将语音处理替换为 storage_service.save_voice()
   - 添加适当的 HTTPException 错误处理

3. **backend/app/routers/upload.py** — 新建独立上传端点（可选，用于单独上传）：
   ```python
   @router.post("/api/upload/photo")
   async def upload_photo(file: UploadFile = File(...)):
       """Standalone photo upload, returns url."""
       
   @router.post("/api/upload/voice")  
   async def upload_voice(file: UploadFile = File(...)):
       """Standalone voice upload, returns url."""
   ```

4. **确保 main.py 挂载静态文件**：
   ```python
   app.mount("/uploads", StaticFiles(directory="data/uploads"), name="uploads")
   ```

### 技术要求
- 所有函数 async/await
- Pydantic 做输入验证
- UUID 文件名避免冲突
- 文件大小超限返回 413
- 文件类型错误返回 400
- 没有 Pillow 时 fallback（直接存储原图）

### 完成标准
- [ ] StorageService 类完整实现
- [ ] 文件类型 magic bytes 校验
- [ ] 文件大小限制 (5MB 图片, 10MB 语音)
- [ ] capsules.py 重构为使用 StorageService
- [ ] 独立上传端点可用
- [ ] 静态文件挂载正确
- [ ] 错误处理完善 (413/400)

### 工作流
1. 先 cd 到 D:/time_space && git pull
2. 读取现有的 capsules.py、main.py、models.py
3. 创建 storage_service.py
4. 重构 capsules.py
5. 添加 upload.py 路由
6. 确保 main.py 注册路由和静态文件
7. git add . && git commit -m "feat(backend): implement StorageService with file validation, compression, and standalone upload endpoints"
8. git push origin main
