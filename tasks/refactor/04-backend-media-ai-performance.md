## Owner
backend-dev (@1416354282-spec / Fermin)

## Goal
优化文件上传、媒体处理、AI 服务调用的性能与失败隔离。

## Scope
- 上传文件大小/类型校验、图片压缩策略、静态访问路径确认。
- AI emotion/location/scene/voice/recommend 服务 timeout、fallback、缓存策略。
- 外部 API 失败不能阻塞创建胶囊主流程。
- 输出接口卡片：upload / ai endpoints 如有变更。

## Acceptance
- multipart 上传稳定，错误码清晰。
- 无 API key、外部超时、文件异常均有明确 JSON 错误或 fallback。
- 后端测试/导入/关键 curl 通过。

## Must follow
遇到报错/不确定/接口需要对接：立即停止并向 Tostar 汇报。禁止自行猜测绕过。
