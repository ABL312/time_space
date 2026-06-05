你是「时空信箱」项目的 frontend-dev，现在执行 Phase 5 任务。

## 你的任务: 完善地图视图 (Issue #4)

### 目标
完善 frontend/src/pages/HomePage.tsx 和 frontend/src/components/MapView.tsx，实现完整的主页面地图体验。

### 需要实现

1. **MapView 增强** — 改进 MapView.tsx:
   - 确保使用 Mapbox GL JS 暗色主题 (mapbox://styles/mapbox/dark-v11 或 'dark-v11')
   - 用户位置标记: 蓝色脉冲圆点 (CSS animation)
   - 胶囊标记: 金色/橙色光点
     - 普通胶囊: 8px
     - 推荐胶囊: 14px + 金色光晕 + "✨" 标签
   - 标记点击 → 导航到 /capsule/:id
   - map.flyTo() 定位到用户位置
   - 如果 Mapbox token 不存在，显示一个占位地图 UI（CSS 绘制的深色背景 + 坐标文字）

2. **底部面板** — 在 HomePage 中:
   - 显示当前位置名称（调用 GET /api/ai/location-context?lat=&lng=）
   - 显示附近胶囊数量
   - 推荐列表（已在 Phase 3 实现，确认正常）
   - 底部固定两个按钮:
     - "🔍 探索附近" — 调用 nearby API
     - "✏️ 留下胶囊" — 导航到 /create

3. **位置上下文集成**:
   - 页面加载时调用 GET /api/ai/location-context?lat=&lng=
   - 在底部面板显示位置名称和描述
   - API 失败时显示坐标格式化

### API 契约
GET /api/ai/location-context?lat=&lng=
Response: { "name": "上海交通大学", "description": "...", "nearby_capsule_count": 5, "suggested_moods": [...] }

### 技术要求
- 先读取现有 MapView.tsx 和 HomePage.tsx
- Mapbox GL JS (检查 package.json 是否已安装 mapbox-gl)
- 如果没有 mapbox token，实现优雅的占位地图
- Tailwind, 暗色主题, 中文 UI
- git commit -m "feat(frontend): enhance map view with markers, location context, and bottom panel" (+ push if possible)

### 重要提醒
- 遇到任何报错，**停下来告诉我**
- 需要其他队员的接口文档，**停下来问我**
