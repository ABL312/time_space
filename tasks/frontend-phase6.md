你是「时空信箱」项目的 frontend-dev，现在执行 Phase 6 任务。

## 项目信息
- 仓库: D:\time_space
- 前端目录: D:\time_space\frontend
- 主题风格: 队友已实现「深空信号站」科幻HUD风格（Starfield星空背景, hud/panel/label/btn/data-value 等 CSS class），你必须保持一致

## 你的任务

### 任务 A: 接近触发通知 (Issue #7) — 核心功能

实现"走近胶囊"的核心体验：持续监控 GPS 距离，触发震动和通知卡片。

1. **新建 `src/hooks/useProximityAlert.ts`**
   - 输入: 用户当前位置 (lat, lng) + 附近胶囊列表
   - 每次位置更新时，计算与所有附近胶囊的 haversine 距离
   - 当任一胶囊距离 < 50m 时触发通知
   - 已通知过的胶囊不重复通知（用 localStorage 记录已通知的 capsule id 列表）
   - 返回: `{ triggeredCapsule: Capsule | null, distance: number, dismiss: () => void }`
   - 触发时调用 `navigator.vibrate([200, 100, 200])` (如果支持)

2. **新建 `src/components/ProximityAlert.tsx`**
   - 底部固定弹出卡片，从下滑入动画
   - 显示: 胶囊情感标签 + 距离（如"就在你附近 32m"）+ 作者昵称
   - "查看" 按钮 → 跳转到 /capsule/:id 或 /ar
   - "关闭" 按钮 → 调用 dismiss()
   - 样式必须匹配「深空信号站」主题（hud/panel/label/data-value class, 暗色背景, signal 金色强调色）

3. **集成到 `src/pages/HomePage.tsx`**
   - 在 HomePage 中使用 useProximityAlert hook
   - 当有 triggeredCapsule 时渲染 ProximityAlert 组件
   - 确保不影响现有地图和推荐面板功能

### 任务 B: 修复 AR 点击交互 (#8 遗留)

当前 `ARScene.tsx` 中 `onCapsuleClick` 参数被标记为 `_onCapsuleClick`（未使用）。

1. 在 `ARScene.tsx` 中实现点击检测：
   - 使用 Three.js Raycaster 检测鼠标/触摸点击
   - 点击到信封 mesh 时调用 `onCapsuleClick(capsuleId)`
   
2. 在 `ARPage.tsx` 中传入正确的回调：
   - `onCapsuleClick={(id) => navigate(\`/capsule/${id}\`)}`

### 技术要求
- 使用队友的深空信号站主题 class（hud, panel, label, data-value, btn, signal, bg-bg, bg-surface 等）
- Tailwind utility classes，不写新 CSS 文件（动画用 inline style 或 index.css 的 @keyframes）
- 暗色主题: bg-bg(#0f172a), bg-surface(#1e293b), text-signal(#fbbf24), text-primary(#6366f1)
- 中文 UI
- 不安装新 npm 包
- haversine 距离计算可复用 useGeolocation.ts 中已有的 `haversineDistance` 函数

### 工作流
1. 先 `git pull` 获取最新代码
2. 读取现有 HomePage.tsx, ARPage.tsx, ARScene.tsx, useGeolocation.ts, index.css 了解当前代码和主题风格
3. 实现 useProximityAlert hook
4. 实现 ProximityAlert 组件
5. 集成到 HomePage
6. 修复 ARScene onCapsuleClick
7. git add . && git commit -m "feat(frontend): proximity alert notification + AR click interaction"
8. git push（如果可能）

### 重要提醒
- 如果遇到任何报错，**停下来告诉我（Tostar）**
- 不要修改后端代码
- 不要修改队友的 Starfield.tsx, useCapabilityCheck.ts, RecommendPanel.tsx 等核心组件
