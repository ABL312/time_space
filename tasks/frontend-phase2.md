你是「时空信箱」项目的 frontend-dev，现在执行 Phase 2 任务。

## 你的任务: 实现用户注册页面 (Issue #3/#4 前端部分)

### 目标
完善 frontend/src/pages/OnboardingPage.tsx，实现完整的用户引导注册流程。

### 当前状态
先 git pull 获取最新代码，然后读取 OnboardingPage.tsx 看现有骨架。

### 需要实现的功能

1. **昵称输入** — 1-20字验证
   - 输入框 (暗色主题 glass 样式)
   - 字数提示 (当前字数/20)
   - 空值时提交按钮禁用

2. **兴趣标签选择** — 8个预设标签，必须选恰好3个
   - 8个标签: 校园回忆、爱情故事、家庭传承、历史文化、人生感悟、搞笑趣事、励志鼓励、未来信件
   - 每个标签是一个可选 chip/button
   - 选中状态: bg-primary text-white
   - 未选中: bg-surface text-slate-400 border border-slate-600
   - 显示已选数量 "已选 X/3"
   - 不等于3个时提交按钮禁用

3. **提交流程**
   - 调用 POST /api/users (JSON)
   - Body: { "name": "昵称", "interest_tags": ["标签1", "标签2", "标签3"] }
   - 成功后: 存储 user_id 到 localStorage('time_space_user_id')
   - 跳转到 / (首页地图)
   - 失败: 显示错误提示

4. **页面设计**
   - 全屏居中卡片布局
   - 顶部: ✉️ 图标 + "欢迎来到时空信箱" + 副标题
   - 中间: 昵称输入 + 标签选择
   - 底部: 提交按钮 (disabled 时 opacity-50)
   - 入场动画: 卡片从下方滑入

5. **首次访问检测**
   - 在 App.tsx 或 main.tsx 中: 如果 localStorage 没有 user_id，自动跳转到 /onboarding
   - 如果已有 user_id，正常进入应用

### API 契约
- POST /api/users
  - 格式: JSON
  - Body: { "name": "string(1-20字)", "interest_tags": ["标签1", "标签2", "标签3"] }
  - Response 201: { "id": "uuid", "name": "...", "interest_tags": [...], "created_at": "..." }

### 技术要求
- Tailwind utility classes, 暗色主题
- 使用 src/lib/api.ts 中的 usersApi.createUser() 方法（如果有的话）
- 中文 UI
- 动画 CSS 写在 index.css
- 完成后 git add . && git commit -m "feat(frontend): implement onboarding page with nickname + interest tags" && git push origin main

### 工作流
1. git pull
2. 读取现有 OnboardingPage.tsx, App.tsx, lib/api.ts, stores/userStore.ts
3. 实现完整注册页面
4. 在 App.tsx 添加首次访问重定向逻辑
5. git commit + push
