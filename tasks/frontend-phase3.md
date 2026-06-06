# frontend-dev Phase 3 任务

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

## 任务清单（5个Issue）

### Issue #27 - 胶囊分享链接/二维码（前端）
**实现：**
1. 安装 qrcode.react: `npm install qrcode.react`
2. 在 api.ts 添加：
   ```typescript
   export const shareApi = {
     getByToken: (token: string) => fetch(`/api/capsules/shared/${token}`).then(r => r.json()),
     regenerate: (capsuleId: string) => fetch(`/api/capsules/${capsuleId}/regenerate-share`, { method: 'POST' }).then(r => r.json())
   }
   ```
3. 在 CapsuleDetailPage 添加分享按钮，点击弹出分享面板：
   - 显示二维码（用QRCodeSVG from qrcode.react）
   - 分享链接：`${window.location.origin}/s/${capsule.share_token}`
   - 复制按钮
4. 创建 /s/:token 路由 → SharedCapsulePage（展示分享的胶囊，无需登录）

### Issue #29 - 每日推荐胶囊（前端）
**实现：**
1. 在 api.ts 添加：
   ```typescript
   export const dailyApi = {
     getRecommend: () => fetch('/api/capsules/daily-recommend').then(r => r.json())
   }
   ```
2. 在 HomePage 顶部添加"今日推荐"卡片：
   - 显示胶囊消息前30字 + 情感标签
   - 点击跳转到胶囊详情
   - 显示推荐理由

### Issue #32 - 地图热力图效果
**实现：**
1. 安装 leaflet.heat: `npm install leaflet.heat` 和 `npm install -D @types/leaflet.heat`
2. 在 MapView.tsx 添加热力图层：
   ```typescript
   import L from 'leaflet'
   import 'leaflet.heat'
   
   // 在地图初始化后
   const heatData = capsules.map(c => [c.latitude, c.longitude, c.open_count / 100])
   const heatLayer = L.heatLayer(heatData, {
     radius: 25,
     blur: 15,
     maxZoom: 17,
     gradient: {0.4: 'blue', 0.6: 'lime', 0.8: 'yellow', 1.0: 'red'}
   }).addTo(map.current)
   ```
3. 添加热力图开关按钮

### Issue #26 - 用户主页/足迹面板
**实现：**
1. 创建 src/pages/ProfilePage.tsx：
   - 用户信息（昵称、头像）
   - 统计卡片：创建数、打开数、收藏数
   - 成就徽章展示（复用AchievementPanel数据）
   - 最近打开的胶囊列表
   - 最近创建的胶囊列表
2. 在 api.ts 添加：
   ```typescript
   export const profileApi = {
     getStats: (userId: string) => fetch(`/api/users/${userId}/stats`).then(r => r.json())
   }
   ```
3. 在路由添加 /profile
4. 在 HomePage 添加用户头像入口

### Issue #30 - 胶囊合集/故事路线（前端）
**实现：**
1. 在 api.ts 添加：
   ```typescript
   export const collectionsApi = {
     list: () => fetch('/api/collections').then(r => r.json()),
     get: (id: string) => fetch(`/api/collections/${id}`).then(r => r.json())
   }
   ```
2. 创建 src/pages/CollectionsPage.tsx - 合集列表页
3. 创建 src/pages/CollectionDetailPage.tsx - 合集详情页：
   - 合集标题、描述
   - 胶囊列表（有序）
   - 地图显示路线（用polyline连接各胶囊位置）
4. 在路由添加 /collections 和 /collections/:id
5. 在 HomePage 添加入口

## 开发规范
- 用 Tailwind utility classes
- 暗色主题
- 中文 UI
- 完成后：
  ```bash
  git add -A
  git commit -m "feat: 分享二维码+每日推荐+热力图+用户主页+合集 (#27,#29,#32,#26,#30)"
  git push origin feature/phase2-enhancements
  ```

## 遇到任何错误立即停止并报告，不要猜测修复。
