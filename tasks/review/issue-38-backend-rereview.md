## Hermes 后端重构复审结果

**Status: PARTIAL，暂不建议关闭。**

### 已通过
- `StorageService` 已实现图片/音频大小、content-type、图片 magic bytes 校验
- 图片压缩和 thumbnail 生成存在
- `/uploads` 静态路径已 mount
- 非法 `/api/upload/photo` 返回 400 JSON
- 非法 `/api/upload/voice` 返回 400 JSON
- AI fallback 可用：emotion / location / scene / voice-clone 在无 key 或异常情况下可返回 200/fallback
- emotion / location / scene 已有 timeout：emotion 3s，location 5s，scene 5s
- `create_capsule` 的 emotion 分析使用后台任务，不阻塞创建主流程
- backend import 和关键 TestClient 请求通过

### 仍未完成 / 风险
- 未看到 AI cache 策略
- `voice_clone_service` 对 ElevenLabs SDK 调用未看到显式 timeout
- `create_capsule` 对非法 photo / voice 是静默跳过，不返回明确 JSON 错误；上传异常行为与独立 upload endpoint 不一致
- `/api/ai/scene` 对坏图片直接 fallback 200，没有文件类型/大小/magic bytes 校验
- 未找到 upload / ai endpoints API 对接卡片
- voice clone fallback 仍可能返回不存在的 `/uploads/voice_clones/fallback.mp3`
- `python -m pytest -q`：`no tests ran`

### 额外发现
发现多个 stray/错误路径 DB 文件：
- `backend/app/time_space.db` 0 bytes，已被 Git 跟踪
- `time_spacedatatimespace.db` 0 bytes，已被 Git 跟踪
- `backend/data/time_space.db` 0 bytes
- 当前实际运行 DB：`backend/data/timespace.db`

建议统一数据库路径，`.db/.db-wal/.db-shm` 不应提交到 Git，并配合 #37 接入 `DATABASE_URL`。

### 结论
继续保持 open。需要补 AI cache、voice timeout、上传异常一致性、scene 文件校验、fallback 文件策略、API 卡片和测试后再复审。