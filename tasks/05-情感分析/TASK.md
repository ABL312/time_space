# #5 — AI 留言情感分析服务

- **GitHub**: https://github.com/ABL312/time_space/issues/5
- **工时**: 2h
- **标签**: `MVP` `backend`
- **依赖**: #1, #6

---

## 目标

用户创建胶囊时，AI 自动提取情感标签和摘要。

## 做什么

- **EmotionService**: 调用 GPT-4o-mini 分析留言文本
- **POST /api/ai/analyze-emotion** 端点
- 关键词 fallback（API 失败时）

## 为什么

情感标签是推荐引擎的核心维度（30% 权重）。

## 技术细节

- openai Python SDK，`model=gpt-4o-mini`
- `response_format={"type": "json_object"}`
- 16 个情感标签体系
- 超时 3 秒自动 fallback

## 验收标准

- [ ] POST /api/ai/analyze-emotion 正确返回 `emotions` + `sentiment` + `intensity` + `summary`
- [ ] 胶囊创建后 1-3 秒内结果写入数据库
- [ ] API 失败时 fallback 正常工作
- [ ] 情感标签在详情中正确返回

## 相关文件

- `backend/app/routers/ai.py`
- `backend/app/services/` (待创建 EmotionService)
