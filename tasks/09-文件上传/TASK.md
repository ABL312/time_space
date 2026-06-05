# #9 — 文件上传服务和媒体处理

- **GitHub**: https://github.com/ABL312/time_space/issues/9
- **工时**: 2h
- **标签**: `MVP` `backend`
- **依赖**: #1

---

## 目标

后端实现完整的文件上传、存储和媒体处理服务。

## 做什么

- **StorageService**: 文件接收、压缩、缩略图生成
- 静态文件服务 (mount /uploads)
- 图片: Pillow 压缩 + 缩略图
- 文件类型校验 + 大小限制

## 为什么

照片和语音是胶囊内容的重要组成部分。

## 技术细节

- Pillow 进行图片压缩与缩略图生成
- mount /uploads 提供静态文件服务
- 非图片返回 400，超过 5MB 返回 413

## 验收标准

- [ ] 上传图片返回 URL + 缩略图 URL
- [ ] 超 5MB 返回 413，非图片返回 400
- [ ] GET /uploads/photos/{filename} 可访问
- [ ] 语音文件可正常播放

## 相关文件

- `backend/app/services/` (待创建 StorageService)
- `backend/data/uploads/` (存储目录)
- `backend/app/main.py` (mount static)
