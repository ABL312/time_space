你是「时空信箱」项目的 frontend-dev，现在执行 Phase 4 任务。

## 你的任务: 降级方案 (#19) + UI 美化动画优化 (#21)

### 任务 A: 降级方案 (Issue #19)

为各种异常场景实现降级体验，确保演示不会因技术问题中断。

1. **无摄像头权限降级** — 在 ARPage.tsx 中:
   - 检测 `navigator.mediaDevices.getUserMedia` 是否可用
   - 如果摄像头权限被拒绝，不报错，显示一个精美的弹窗卡片代替 AR 视图
   - 弹窗显示胶囊信息（情感标签 + 留言 + 作者），类似胶囊详情的精简版
   - "查看详情" 按钮跳转到 /capsule/:id

2. **无 GPS 信号降级** — 在 HomePage.tsx 或 useGeolocation hook 中:
   - 检测 `position.coords.accuracy > 50` → 显示"GPS 信号弱"提示
   - 自动扩大搜索半径到 100m（或更大）
   - 在地图顶部显示黄色提示条: "📡 GPS 信号较弱，搜索范围已扩大"
   - 提供手动选择位置的入口（可选，简单实现即可）

3. **WebGL 不可用降级** — 在 ARPage 或 ARScene 组件中:
   - 检测 `canvas.getContext('webgl')` 是否成功
   - 失败时降级为 CSS 3D 动画模式（用 div + transform 代替 Three.js）
   - 信封用 CSS 动画替代 Three.js 渲染

4. **API 超时处理** — 在 api.ts 或各页面中:
   - fetch 请求设置 5 秒超时 (AbortController)
   - 超时后显示友好提示 + 重试按钮
   - 不要让用户看到空白页面或原始错误

5. **React Error Boundary** — 新建组件:
   - 包裹 AR 视图页面
   - 崩溃时显示 "AR 视图暂时不可用" + 返回按钮

### 任务 B: UI 美化和动画优化 (Issue #21)

1. **统一色彩方案** — 确保所有页面暗色主题一致:
   - 主色: bg-bg(#0f172a), bg-surface(#1e293b)
   - 强调色: gold(#fbbf24), cyan(#22d3ee), primary(#6366f1)
   - 检查所有页面没有刺眼白色区域

2. **页面转场动画** — 在 App.tsx 中添加:
   - 路由切换时的淡入淡出效果（CSS transition 即可，不装 framer-motion）
   - 新页面从 opacity(0) → opacity(1), translateY(10px) → translateY(0)

3. **按钮和卡片微交互**:
   - 所有按钮: hover 时 scale(1.02) + shadow 增强
   - 所有卡片: hover 时 border-color 变化 + 轻微 translateY(-2px)
   - active 状态: scale(0.98)

4. **加载状态优化**:
   - 骨架屏: 用 animate-pulse 的 div 占位
   - 加载图标: 信封旋转动画
   - 各页面的 loading 状态统一样式

5. **移动端适配**:
   - 添加 `env(safe-area-inset-*)` padding
   - 触控反馈: active 态有颜色变化

### 技术要求
- Tailwind utility classes, 暗色主题
- CSS 动画写在 index.css
- 中文 UI
- 不要安装新的 npm 包（hackathon 优先，用现有依赖）
- 完成后 git add . && git commit -m "feat(frontend): implement fallback modes + UI polish and animations" (+ push if possible)

### 重要提醒
- 如果遇到任何报错，**停下来告诉我**
- 如果需要其他队员的接口文档，**停下来问我**

### 工作流
1. 读取现有 ARPage.tsx, HomePage.tsx, App.tsx, index.css, api.ts, useGeolocation.ts
2. 先实现降级方案
3. 再做 UI 美化
4. git commit (+ push if possible)
