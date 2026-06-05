# #13 — AI 声音克隆服务 (ElevenLabs)

- **GitHub**: https://github.com/ABL312/time_space/issues/13
- **工时**: 3h
- **标签**: `MVP` `backend` `frontend`
- **依赖**: #1, #9, #11

---

## 目标

后端集成 ElevenLabs API，实现语音样本克隆 + 文字转语音。

## 做什么

- **VoiceService**: ElevenLabs SDK
- **POST /api/ai/voice-clone** (multipart: sample + text)
- 前端 VoiceClone 组件

## 为什么

声音克隆是演示情感高潮（奶奶的声音）。

## 技术细节

- ElevenLabs SDK
- 上传 10s 语音样本 + 文字 → 返回克隆语音
- 延迟 <10 秒
- API 失败时 fallback 音频可用

## 验收标准

- [ ] 上传 10s 样本 + 文字 → 返回克隆语音 URL
- [ ] 中文朗读正确
- [ ] 延迟 <10 秒
- [ ] API 失败时 fallback 音频可用
- [ ] voice_clone_url 存入 DB

## 相关文件

- `backend/app/routers/ai.py`
- `backend/app/services/` (待创建 VoiceService)
- `frontend/src/components/` (待创建 VoiceClone)
