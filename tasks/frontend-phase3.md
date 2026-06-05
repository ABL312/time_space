你是「时空信箱」项目的 frontend-dev，现在执行 Phase 3 任务。

## 你的任务: 集成推荐结果到前端 UI (Issue #16)

### 目标
在首页 HomePage.tsx 的底部面板中展示推荐结果，让用户看到"和你相关的胶囊"。

### 当前状态
先读取现有代码：
- frontend/src/pages/HomePage.tsx
- frontend/src/components/MapView.tsx
- frontend/src/stores/capsuleStore.ts
- frontend/src/lib/api.ts
- frontend/src/types/index.ts

### 需要实现的功能

1. **推荐面板组件** — 在首页底部添加推荐面板：
   - 标题: "✨ 和你相关" + 推荐数量
   - 卡片列表（水平滚动或垂直堆叠）
   - 每个推荐卡片显示:
     - 情感标签 chips（彩色）
     - 截断留言（30字+...）
     - 匹配原因（match_reasons 数组，如 "和你关注的「校园回忆」相关"）
     - 距离（如 "45m"）
     - 匹配分数（可选，进度条或小圆点）
     - 作者昵称
     - 点击跳转到 /capsule/:id

2. **capsuleStore 增强** — 确保 fetchNearby 正确解析推荐数据：
   - 从 GET /api/capsules/nearby 响应中提取 recommended[] 和 others[]
   - Store 中分两个字段: recommendedCapsules, otherCapsules

3. **地图标记区分** — 在 MapView 中区分推荐和普通胶囊：
   - 推荐胶囊标记: 更大(14px) + 金色/橙色光晕 + 标签浮层
   - 普通胶囊标记: 较小(8px) + 白色/蓝色
   - （如果 MapView 已有此逻辑就跳过）

4. **"探索附近" 按钮行为** — 点击底部"🔍 探索附近"按钮：
   - 调用 GET /api/capsules/nearby?lat=xxx&lng=xxx&radius=1200&user_id=xxx
   - 更新推荐面板和地图标记
   - 显示加载状态

5. **UI 设计** — 暗色主题：
   - 推荐面板: glass 背景，从底部滑入动画
   - 推荐卡片: bg-surface 圆角，左边框高亮(金色)
   - 匹配原因: text-xs text-accent 斜体
   - 距离: text-xs text-slate-400

### API 契约 (后端已实现)
GET /api/capsules/nearby?lat=&lng=&radius=1200&user_id=
Response 200: {
  "total": 12,
  "recommended": [{
    "id": "uuid",
    "message": "截断30字的留言内容...",
    "emotion_tags": ["怀旧", "温暖"],
    "distance_m": 45,
    "match_score": 0.82,
    "match_reasons": ["和你关注的「校园回忆」相关", "就在你附近 (45m)"],
    "author": {"name": "小明", "avatar": null},
    "has_voice": true,
    "has_photos": true
  }],
  "others": [...]
}

### 技术要求
- Tailwind utility classes, 暗色主题
- 中文 UI
- 动画 CSS 写在 index.css
- 完成后 git add . && git commit -m "feat(frontend): integrate recommendation results into homepage UI" && git push origin main

### 重要提醒
- 如果遇到后端 API 返回格式和上面契约不一致的问题，**停下来，不要自己猜**，把实际返回的错误或差异告诉我
- 如果 git push 失败（网络问题），跳过 push 即可，commit 就好

### 工作流
1. 读取现有 HomePage.tsx, MapView.tsx, capsuleStore.ts, api.ts, types/index.ts
2. 增强 capsuleStore 的 nearby 数据解析
3. 在 HomePage 添加推荐面板
4. 更新地图标记区分
5. git commit (+ push if possible)
