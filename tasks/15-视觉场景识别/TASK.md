# #15 — AI 视觉场景识别

- **GitHub**: https://github.com/ABL312/time_space/issues/15
- **工时**: 3h
- **标签**: `enhancement` `backend` `frontend`
- **依赖**: #1, #8, #14

---

## 目标

AR 视图中截取摄像头帧发送 GPT-4o Vision 分析场景。

## 做什么

- **SceneService**: GPT-4o Vision API
- **POST /api/ai/scene** (multipart: image + lat + lng)
- **useSceneCapture** Hook
- **SceneOverlay** 组件

## 为什么

通道2：AR 模式下实时识别周围环境，匹配推荐。

## 技术细节

- GPT-4o Vision API 分析图片场景
- 前端每 10 秒截取一次摄像头帧
- 结果在浮层显示
- 摄像头拒绝时降级到通道1（#14）

## 验收标准

- [ ] 上传图片返回 `scene_type` + `mood_match`
- [ ] 每 10 秒截取一次帧
- [ ] 结果在浮层显示
- [ ] `mood_match` 触发推荐更新
- [ ] 摄像头拒绝时降级到通道1

## 相关文件

- `backend/app/routers/ai.py`
- `backend/app/services/` (待创建 SceneService)
- `frontend/src/hooks/` (待创建 useSceneCapture)
- `frontend/src/components/` (待创建 SceneOverlay)
