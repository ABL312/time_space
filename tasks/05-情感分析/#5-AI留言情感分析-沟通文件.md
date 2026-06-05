# #5 AI 留言情感分析 — 完成沟通

## 概述

用户创建时空胶囊时，AI 自动分析留言文本的情感特征，提取2-4个情感标签、情感倾向、强度和摘要。

## 变更清单

### 新增文件

| 文件 | 说明 |
|------|------|
| `backend/app/services/emotion_service.py` | EmotionService 类，封装情感分析逻辑 |

### 修改文件

| 文件 | 变更 |
|------|------|
| `backend/app/routers/ai.py` | 移除内联情感分析代码，改用 EmotionService |
| `backend/app/routers/capsules.py` | 胶囊创建流程集成 AI 情感分析 |

## 架构设计

```
POST /api/capsules (创建胶囊)
    │
    ├─ 1. INSERT 胶囊基础信息
    ├─ 2. 处理照片/语音上传
    ├─ 3. EmotionService.analyze(message)  ← 新增
    │       ├─ 有 API Key → GPT-4o-mini（3秒超时）
    │       └─ 无/失败   → 关键词匹配 fallback
    ├─ 4. UPDATE 胶囊写入 emotion_tags/sentiment/intensity/summary
    └─ 5. COMMIT + 返回胶囊（含情感数据）

POST /api/ai/analyze-emotion (独立调用)
    └─ EmotionService.analyze(message)  ← 可单独调试
```

## 16 个情感标签

怀旧、温暖、感恩、浪漫、思念、快乐、遗憾、鼓励、幽默、神秘、孤独、希望、青春、友情、亲情、爱情

## API 响应示例

```json
// POST /api/ai/analyze-emotion
{
  "message": "回忆起大学时光，和朋友们一起的日子真让人怀念"
}
// →
{
  "emotions": ["怀旧", "青春", "友情"],
  "sentiment": "positive",
  "intensity": 0.6,
  "summary": "包含怀旧、青春情感的留言"
}
```

```json
// POST /api/capsules 创建胶囊后
{
  "id": "667fbd95-...",
  "message": "回忆起大学时光，和朋友们一起的日子真让人怀念",
  "emotion_tags": ["怀旧", "青春", "友情"],
  "sentiment": "positive",
  "emotion_intensity": 0.6,
  "emotion_summary": "包含怀旧、青春情感的留言"
}
```

## 验收状态

| # | 标准 | 状态 |
|---|------|------|
| 1 | POST /api/ai/analyze-emotion 返回 emotions+sentiment+intensity+summary | ✅ |
| 2 | 胶囊创建后 1-3 秒内结果写入数据库 | ✅ |
| 3 | API 失败时 fallback 正常工作 | ✅ |
| 4 | 情感标签在详情中正确返回 | ✅ |

## 注意事项

- 情感分析失败**不影响**胶囊创建（仅打印警告日志）
- 关键词 fallback 无需任何 API key，离线可用
- `emotion_tags` 在数据库中以 JSON 数组存储
- EmotionService 已导出 `EMOTION_TAGS` 常量，scene 端点仍在使用
- 推荐引擎直接读取 `emotion_tags` 列（30% 权重），无需额外改动
