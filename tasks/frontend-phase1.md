# frontend-dev Phase 1 任务

你是「时空信箱」项目的 frontend-dev。

## 项目信息
- 仓库: D:\time_space
- 分支: feature/phase2-enhancements (已切换)
- GitHub: https://github.com/ABL312/time_space
- 技术栈: Vite + React + TypeScript + Tailwind CSS v4

## 重要：先拉最新代码
```bash
git pull origin feature/phase2-enhancements
```

## 任务清单（3个Issue，都是纯前端）

### Issue #26 - 探索成就系统
**实现：**
1. 创建 src/hooks/useAchievements.ts：
   - 用 localStorage 存储成就进度
   - 成就定义：
     - 初次探索：打开第1个胶囊
     - 好奇者：打开5个胶囊
     - 故事收集者：打开20个胶囊
     - 探索达人：打开50个胶囊
     - 分享者：创建第1个胶囊
     - 多产创作者：创建10个胶囊
2. 创建 src/components/AchievementPanel.tsx：
   - 展示所有成就卡片
   - 已解锁的显示彩色图标+解锁时间
   - 未解锁的显示灰色+进度条
3. 在 HomePage 添加入口按钮（右下角或顶部）

### Issue #34 - 天气/时间氛围主题
**实现：**
1. 创建 src/hooks/useTimeTheme.ts：
   - 根据当前小时返回主题：
     - 6-11点: morning (暖色调)
     - 12-17点: afternoon (明亮)
     - 18-21点: evening (橙紫渐变)
     - 22-5点: night (深蓝+星光)
2. 在 index.css 添加CSS变量：
   ```css
   :root {
     --bg-primary: #0f172a;
     --bg-secondary: #1e293b;
     --accent: #6366f1;
   }
   [data-theme="morning"] { --bg-primary: #fef3c7; --accent: #f59e0b; }
   [data-theme="afternoon"] { --bg-primary: #f0f9ff; --accent: #0ea5e9; }
   [data-theme="evening"] { --bg-primary: #1e1b4b; --accent: #a855f7; }
   [data-theme="night"] { --bg-primary: #020617; --accent: #818cf8; }
   ```
3. 在 App.tsx 应用主题：document.documentElement.dataset.theme = theme
4. 地图样式也随主题切换（用不同的 tile URL 或 CSS filter）

### Issue #33 - 胶囊弹幕效果
**实现：**
1. 创建 src/components/DanmakuLayer.tsx：
   - 定时从 /api/capsules/recent?limit=20 获取最新消息
   - 消息以弹幕形式从右向左飘过地图
   - 每条弹幕显示：消息前20字 + 情感标签
   - CSS动画：transform: translateX(-100%) 10s linear
   - 随机高度，避免重叠
2. 在 HomePage 的地图区域叠加 DanmakuLayer
3. 添加开关按钮让用户可以关闭弹幕

## 开发规范
- 用 Tailwind utility classes
- 暗色主题为主（配合时间主题切换）
- 中文 UI
- 动画用 CSS transition/animation，不用 JS 动画库
- 完成后：
  ```bash
  git add -A
  git commit -m "feat: 成就系统+时间主题+弹幕效果 (#26,#34,#33)"
  git push origin feature/phase2-enhancements
  ```

## 遇到任何错误立即停止并报告，不要猜测修复。
