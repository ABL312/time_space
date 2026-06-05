你是「时空信箱」项目的 frontend-dev，现在执行 Phase 1 任务。

## 你的任务: 完善胶囊详情展示页面 (Issue #6/#8)

### 目标
完善 frontend/src/pages/CapsuleDetailPage.tsx，使其成为完整的胶囊打开体验页面。

### 当前状态
文件已存在且有基础骨架（作者信息、留言展示、情感标签、照片横滚、audio控件、位置信息、回应按钮）。

### 需要增强的功能

1. **信封展开动画** — 添加 CSS @keyframes 动画到 frontend/src/index.css：
   - 从折叠（scaleY(0) + opacity(0)）到展开（scaleY(1) + opacity(1)）
   - 时长 0.8s, ease-out
   - 信封图标（✉️）先出现，然后内容渐入

2. **照片全屏查看** — 点击照片可以全屏查看：
   - 添加全屏 overlay（z-50, fixed, bg-black/90）
   - 左右滑动/点击切换照片
   - 点击空白处或×关闭
   - 用 useState 管理当前查看的照片索引

3. **自定义语音播放器** — 替换原生 audio controls：
   - 播放/暂停按钮（▶/⏸）
   - 进度条（可拖动的 div）
   - 时间显示 (当前/总时长)
   - 优先播放 voice_clone_url，fallback 到 voice_url
   - 使用 useRef 获取 audio 元素

4. **照片轮播增强** — 改进现有的横向滚动：
   - 添加左右箭头按钮（当照片>1张时）
   - 当前照片指示器（小圆点）
   - 使用 useRef + scrollIntoView 实现

5. **情感标签动画** — 标签依次淡入（stagger animation）

### 技术要求
- Tailwind utility classes，暗色主题 (bg-bg=#0f172a, bg-surface=#1e293b)
- 动画 CSS 写在 frontend/src/index.css 中（@keyframes）
- 中文 UI 文案
- 所有新增组件内联在 CapsuleDetailPage.tsx 中（不拆文件，hackathon 优先）
- TypeScript 严格类型

### 完成标准
- [ ] 打开页面有信封展开动画
- [ ] 照片可以点击查看全屏
- [ ] 全屏照片可以左右切换
- [ ] 语音有自定义播放UI（非原生controls）
- [ ] 情感标签有淡入动画
- [ ] 所有功能在暗色主题下美观

### 工作流
1. 先 cd 到 C:/Users/tosta/time_space && git pull
2. 读取现有 CapsuleDetailPage.tsx 和 index.css
3. 实现上述增强
4. git add . && git commit -m "feat(frontend): enhance capsule detail page with animations, fullscreen photos, custom audio player"
5. git push origin main
