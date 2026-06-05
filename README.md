# 时空信箱 (Time-Space Mailbox) 📬

> 基于 GPS + AR 的地理位置情感信息传递平台 —— 在物理空间留下 AR 信息，后来者到达此地时"发现"它。

**48h Hackathon MVP** | PWA 应用

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + Vite + TypeScript + Tailwind CSS |
| 地图 | Mapbox GL JS (暗色主题) |
| 3D/AR | Three.js (WebGL + 陀螺仪定位) |
| 状态 | Zustand |
| 后端 | FastAPI + Uvicorn |
| 数据库 | SQLite + aiosqlite (异步) |
| AI | OpenAI GPT-4o/4o-mini + ElevenLabs |

## 快速启动

### 1. 后端

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # 填入 API keys (可选, 有 fallback)
uvicorn app.main:app --reload --port 8000
```

访问 http://localhost:8000/api/health 确认运行正常。

### 2. 前端

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:5173 开始使用。

### 环境变量

- `OPENAI_API_KEY` — 情感分析 + 场景识别 (可选, 有关键词 fallback)
- `ELEVENLABS_API_KEY` — 声音克隆 (可选, 有 demo 音频 fallback)
- `VITE_MAPBOX_TOKEN` — 地图显示 (需要到 mapbox.com 申请)

## 项目结构

```
time_space/
├── frontend/              # Vite + React PWA
│   ├── src/
│   │   ├── components/    # MapView, ARScene
│   │   ├── pages/         # Home, Onboarding, Create, AR, CapsuleDetail
│   │   ├── stores/        # Zustand: userStore, capsuleStore
│   │   ├── hooks/         # useGeolocation, useOrientation
│   │   ├── lib/           # API client
│   │   └── types/         # TypeScript type definitions
│   └── vite.config.ts     # Proxy + PWA + Tailwind
│
├── backend/               # FastAPI + SQLite
│   ├── app/
│   │   ├── routers/       # capsules, users, ai
│   │   ├── services/      # geohash, recommend
│   │   ├── database.py    # SQLite schema + connection
│   │   ├── models.py      # Pydantic models
│   │   └── main.py        # App entry point
│   └── data/uploads/      # 文件存储
│
└── planning/              # PRD, issues, impl docs
```

## 页面路由

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | 地图视图 | 暗色地图 + 胶囊标记 + 推荐列表 |
| `/onboarding` | 新手引导 | 昵称 + 3个兴趣标签 |
| `/create` | 创建胶囊 | 文字 + 照片 + 语音 + GPS |
| `/ar` | AR 视图 | 摄像头 + Three.js 3D 信封叠加 |
| `/capsule/:id` | 胶囊详情 | 展开动画 + 媒体展示 |

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| POST | `/api/users` | 创建用户 |
| POST | `/api/capsules` | 创建胶囊 (multipart) |
| GET | `/api/capsules/nearby` | 附近查询 |
| GET | `/api/capsules/:id` | 胶囊详情 |
| POST | `/api/ai/analyze-emotion` | 情感分析 |
| GET | `/api/ai/location-context` | 位置上下文 |
| POST | `/api/ai/scene` | 场景识别 |
| POST | `/api/ai/voice-clone` | 声音克隆 |

## 开发约定

- **分支策略**: `main` (稳定) → feature branches → PR
- **Commit 格式**: `feat|fix|chore(scope): description`
- **前端**: Tailwind utility classes, 暗色主题 `bg-bg` / `text-white`
- **后端**: async/await, Pydantic 验证, 4张表严格 schema

---

*Built with ❤️ during a 48h hackathon*
