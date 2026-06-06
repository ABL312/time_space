## Owner
ABL312

## Goal
用 Go 实现媒体上传与静态文件服务，提高 Ubuntu 小服务器上的 IO 稳定性。

## Scope
- 实现 `/api/upload/photo`、`/api/upload/voice` multipart 上传。
- 图片/音频大小限制、MIME/magic bytes 校验。
- 图片缩略图/压缩策略，失败返回明确 JSON 错误。
- `/uploads/*` 静态访问。
- 文件路径防穿越，文件名安全化。
- UPLOAD_DIR 支持环境变量和 Ubuntu 持久化目录。

## Acceptance
- 非法文件返回 400 JSON。
- 合法图片/音频上传后可通过 URL 访问。
- `go test ./...` 通过。
- 提供 API 对接卡片。

## Must follow
遇到报错/不确定/接口需要对接：立即停止并向 Tostar 汇报。禁止自行猜测绕过。
