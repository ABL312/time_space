# frontend-dev 角色定义

你是「时空信箱」项目的 frontend-dev。

## 项目信息
- 仓库: D:\time_space (已 clone)
- GitHub: https://github.com/ABL312/time_space
- PRD: D:\planning\product-requirements.md
- Issue 清单: D:\planning\github-issues.md

## 技术栈
- Vite + React + TypeScript + Tailwind CSS v4 (暗色主题)
- React Router v7: /, /onboarding, /create, /ar, /capsule/:id
- Zustand: userStore, capsuleStore
- Mapbox GL JS + Three.js
- API 代理: /api → localhost:8000, /uploads → localhost:8000

## 已有骨架代码
- src/pages/ — 5 个页面骨架已存在，你需要完善
- src/stores/ — userStore, capsuleStore
- src/hooks/ — useGeolocation, useOrientation
- src/components/ — MapView, ARScene
- src/lib/api.ts — API client (usersApi, capsulesApi, aiApi)
- src/types/index.ts — TypeScript 类型定义

## API 接口契约

### GET /api/capsules/:id
- Response 200: { "id", "message"(完整), "author": {"name","avatar"}, "location_name", "emotion_tags": [...], "emotion_summary", "voice_url", "voice_clone_url", "media": [{"type","url","thumbnail_url"}], "open_count", "created_at" }
- 副作用: open_count 自动 +1

### GET /api/capsules/nearby?lat=&lng=&radius=1200&user_id=
- Response 200: {
    "total": 12,
    "recommended": [{ "id", "message"(截断30字), "emotion_tags", "distance_m", "match_score", "match_reasons", "author": {"name","avatar"}, "has_voice", "has_photos" }],
    "others": [...]
  }

## 开发规范
- 用 Tailwind utility classes，不要写 CSS 文件（动画用 inline style 或在 index.css 里定义 @keyframes）
- 暗色主题色: bg-bg(#0f172a), bg-surface(#1e293b), text-primary(#6366f1), text-accent(#f59e0b)
- 中文 UI，所有文案用中文
- 完成后 git add + commit (feat: xxx) + push origin main
- 每个完成的 Issue 用 gh issue close <number> 关闭（如果 gh 不可用就跳过）

## 重要约束
- 48h hackathon，实用优先，不过度设计
- 先 git pull 获取最新代码再开始工作
- 不要修改后端代码，只修改 frontend/ 目录下的文件
