审核结论：PARTIAL

已通过：
- `StorageService` 已实现图片/音频大小、content-type、图片 magic bytes 校验；图片有压缩和 thumbnail。
- `/uploads` 静态路径已 mount。
- 子Agent验证：非法 `/api/upload/photo` 返回 400 JSON；非法 `/api/upload/voice` 返回 400 JSON。
- AI fallback 可用：emotion/scene/location/voice-clone 均有无 key 或失败 fallback。
- timeout 部分存在：emotion 3s、location 5s、scene 5s。
- 创建胶囊的 emotion 分析使用后台任务，不阻塞创建主流程。
- backend import 和关键 TestClient 请求通过。

未完成/风险：
- 未看到 AI cache 策略。
- voice_clone_service 对 ElevenLabs SDK 调用未看到显式 timeout。
- `create_capsule` / `reply` 对非法 photo/voice 是静默跳过，不返回明确 JSON 错误；和“文件异常均有明确 JSON 错误或 fallback”不完全一致。
- `/api/ai/scene` 对坏图片直接 fallback 200，没有文件类型/大小校验。
- 未找到 upload / ai endpoints API 对接卡片。
- `voice_clone_service` fallback 可能返回不存在的 `/uploads/voice_clones/fallback.mp3`。
- `python -m pytest -q` 无测试运行。

建议：补 AI 缓存策略；给 ElevenLabs 调用加显式 timeout；统一上传异常行为；补 upload / ai endpoints 对接卡片和测试后再复审。

---
Reviewed by Hermes backend review subAgent. 未关闭 issue。
