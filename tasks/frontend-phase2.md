# frontend-dev Phase 2 任务

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

## 任务清单（4个Issue，都是前端对接后端API）

### Issue #23 - 用户回应/留言系统（前端）
**实现：**
1. 在 src/lib/api.ts 添加：
   ```typescript
   export const responsesApi = {
     list: (capsuleId: string) => fetch(`/api/capsules/${capsuleId}/responses`).then(r => r.json()),
     create: (capsuleId: string, content: string, userId?: string, nickname?: string) =>
       fetch(`/api/capsules/${capsuleId}/responses`, {
         method: 'POST',
         headers: {'Content-Type': 'application/json'},
         body: JSON.stringify({ content, user_id: userId, nickname: nickname || '匿名' })
       }).then(r => r.json())
   }
   ```
2. 在 CapsuleDetailPage 添加：
   - 回应列表区域（显示nickname + content + created_at）
   - 回应输入框 + 发送按钮
   - 发送后刷新列表

### Issue #25 - 胶囊收藏/书签（前端）
**实现：**
1. 在 api.ts 添加：
   ```typescript
   export const favoritesApi = {
     add: (capsuleId: string, userId: string) =>
       fetch(`/api/favorites/${capsuleId}?user_id=${userId}`, { method: 'POST' }),
     remove: (capsuleId: string, userId: string) =>
       fetch(`/api/favorites/${capsuleId}?user_id=${userId}`, { method: 'DELETE' }),
     list: (userId: string) => fetch(`/api/favorites?user_id=${userId}`).then(r => r.json()),
     status: (capsuleId: string, userId: string) =>
       fetch(`/api/capsules/${capsuleId}/favorite-status?user_id=${userId}`).then(r => r.json())
   }
   ```
2. 在 CapsuleDetailPage 添加收藏按钮（心形图标，已收藏=实心红色）
3. 创建 src/pages/FavoritesPage.tsx - 我的收藏列表页
4. 在路由中添加 /favorites

### Issue #31 - 胶囊搜索/筛选（前端）
**实现：**
1. 在 api.ts 添加：
   ```typescript
   export const searchApi = {
     search: (params: { q?: string; tag?: string; lat?: number; lng?: number; radius?: number }) => {
       const query = new URLSearchParams()
       if (params.q) query.set('q', params.q)
       if (params.tag) query.set('tag', params.tag)
       if (params.lat) query.set('lat', String(params.lat))
       if (params.lng) query.set('lng', String(params.lng))
       if (params.radius) query.set('radius', String(params.radius))
       return fetch(`/api/capsules/search?${query}`).then(r => r.json())
     }
   }
   ```
2. 在 HomePage 顶部添加搜索栏（输入框 + 搜索按钮）
3. 搜索结果以列表形式展示（覆盖地图或侧边栏）
4. 添加情感标签筛选按钮组

### Issue #24 - 时间锁胶囊（前端）
**实现：**
1. 在 CreatePage 添加"时间锁"选项：
   - 开关按钮"设置开启时间"
   - 日期时间选择器（min=明天）
   - 提交时传递 unlock_at 参数
2. 在 CapsuleDetailPage 处理锁定状态：
   - 如果API返回 {locked: true, unlock_at, countdown_seconds}
   - 显示锁定界面：大锁图标 + 倒计时（天:时:分:秒）
   - 倒计时结束自动刷新页面
   - 不显示消息内容

## 开发规范
- 用 Tailwind utility classes
- 暗色主题
- 中文 UI
- 完成后：
  ```bash
  git add -A
  git commit -m "feat: 回应/收藏/搜索/时间锁前端 (#23,#25,#31,#24)"
  git push origin feature/phase2-enhancements
  ```

## 遇到任何错误立即停止并报告，不要猜测修复。
