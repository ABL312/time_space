# 项目上下文 (Agent Context)

## 项目
**时空信箱 (Time-Space Mailbox)** — GPS + AR 地理位置情感信息平台，48h 黑客松 MVP。
- 仓库: https://github.com/ABL312/time_space
- 后端: FastAPI + SQLite + OpenAI + ElevenLabs
- 前端: React 18 + Vite + TypeScript + Tailwind + Three.js

## 我的身份
GitHub: **1416354282-spec**，负责全部 AI 相关后端 + 部分前端。

## 我的任务 (6个，全部 Open)

按建议执行顺序：

| 序 | # | 任务 | 工时 | 涉及 |
|----|---|------|------|------|
| 1 | #9 | 文件上传服务和媒体处理 | 2h | 后端 StorageService + Pillow |
| 2 | #5 | AI 留言情感分析 | 2h | GPT-4o-mini 情感标签 |
| 3 | #14 | AI 位置上下文 | 2h | Nominatim + GPT 地点描述 |
| 4 | #10 | 智能推荐引擎 | 2h | 四维加权算法 |
| 5 | #13 | AI 声音克隆 (ElevenLabs) | 3h | 后端 + 前端 VoiceClone |
| 6 | #15 | AI 视觉场景识别 | 3h | GPT-4o Vision + AR截图 |

详细任务卡片在 `tasks/` 目录下，每个有验收标准 checkbox。

## 关键文件

```
backend/app/
├── main.py              # FastAPI 入口
├── database.py          # SQLite schema
├── models.py            # Pydantic models
├── routers/
│   ├── ai.py            # AI 端点 (情感/场景/声音/位置)
│   ├── capsules.py      # 胶囊 CRUD + nearby
│   └── users.py         # 用户
└── services/
    ├── geohash_service.py
    └── recommend_service.py  # 推荐引擎骨架

frontend/src/
├── components/
│   ├── MapView.tsx       # 地图视图
│   └── ARScene.tsx       # AR 场景
├── pages/                # 各页面
├── hooks/                # useGeolocation, useOrientation
└── lib/api.ts            # API client
```

## 工作方式

对我说「开始 #5」或「做情感分析」我就直接对照 `tasks/` 下的任务卡片和代码开工。
