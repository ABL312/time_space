# 前端架构说明

## 目录结构

```
frontend/src/
├── components/          # 共享组件
│   ├── ui/             # Design System 基础组件
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Input.tsx
│   │   ├── PageShell.tsx
│   │   ├── SectionLabel.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ErrorState.tsx
│   │   ├── LoadingState.tsx
│   │   ├── BottomSheet.tsx
│   │   └── OfflineBanner.tsx
│   ├── MapView.tsx      # 地图组件 (lazy loaded)
│   ├── RecommendPanel.tsx # 推荐面板 (lazy loaded)
│   ├── ARScene.tsx      # AR 场景 (Three.js, lazy loaded)
│   ├── DanmakuLayer.tsx # 弹幕层
│   ├── ProximityAlert.tsx # 近距离提醒
│   └── AchievementPanel.tsx # 成就系统
├── pages/              # 路由页面
│   ├── HomePage.tsx
│   ├── CreatePage.tsx
│   ├── CapsuleDetailPage.tsx
│   ├── ProfilePage.tsx
│   ├── CollectionsPage.tsx
│   ├── CollectionDetailPage.tsx
│   ├── FavoritesPage.tsx
│   ├── MyCapsulesPage.tsx
│   ├── ARPage.tsx
│   ├── OnboardingPage.tsx
│   └── SharedCapsulePage.tsx
├── features/           # Feature modules (按业务域组织)
│   ├── capsules/       # 胶囊相关功能
│   ├── map/           # 地图相关功能
│   ├── ar/            # AR 相关功能
│   ├── profile/       # 用户资料相关
│   ├── collections/   # 合集相关
│   └── recommend/     # 推荐相关
├── hooks/              # 自定义 Hooks
│   ├── useGeolocation.ts
│   ├── useVirtualLocation.ts
│   ├── useOnline.ts
│   ├── useOrientation.ts
│   ├── useCapabilityCheck.ts
│   ├── useProximityAlert.ts
│   ├── useAchievements.ts
│   └── useApiWithTimeout.ts
├── stores/             # 状态管理 (Zustand)
│   ├── capsuleStore.ts
│   └── userStore.ts
├── lib/                # API 客户端和工具
│   ├── client.ts       # 统一请求层 (request/upload)
│   ├── api.ts          # 向后兼容的 re-exports
│   ├── capsulesApi.ts  # 胶囊 API
│   ├── usersApi.ts     # 用户API
│   ├── collectionsApi.ts # 合集API
│   └── aiApi.ts        # AI 服务 API
└── types/              # TypeScript 类型定义
    └── index.ts
```

## 组件设计原则

### Design System 组件

所有 UI 组件应优先使用 `components/ui/` 中的 Design System 组件：

- **Button**: 替代所有 `.btn` 类
- **Card**: 替代所有 `.panel` 类，可点击时传 `interactive` prop
- **Badge**: 状态标签和徽章
- **Input**: 表单输入
- **PageShell**: 页面布局容器
- **LoadingState/EmptyState/ErrorState**: 统一状态展示

### 可访问性 (a11y)

- 可点击的 Card 必须传 `interactive` prop，自动获得 `role="button"`, `tabIndex=0`, 键盘事件支持
- 所有交互元素应有明确的 `aria-label`
- 使用 `focus-visible` ring 而非 `focus`
- 最小触摸目标 44px (WCAG 2.5.8)

### z-index 层级

为避免与 Leaflet 地图冲突 (400-800)，统一使用以下层级：

- **500**: 弹幕层 (装饰性，不拦截点击)
- **1000**: HUD 面板、浮动按钮、推荐面板
- **1100**: 近距离提醒 (ProximityAlert)
- **1500**: 底部菜单 (BottomSheet)
- **2000**: 模态对话框 (AchievementPanel)

## API 调用约定

### 统一请求层

所有 API 调用应通过 `lib/client.ts` 的 `request()` 或 `upload()` 函数：

```typescript
// 正确 ✅
import { capsulesApi } from '../lib/api'
const data = await capsulesApi.getNearby({ lat, lng })

// 错误 ❌ 不要直接 fetch
const res = await fetch('/api/capsules/nearby')
```

### API 返回结构

后端返回的包装结构：

- `search`: `{ capsules: Capsule[], total: number }`
- `getDailyRecommend`: `{ capsule: Capsule, reason: string, expires_at: string }`
- `collections.list`: `{ collections: CapsuleCollection[], total: number }`
- `favorites.list`: 返回 `CapsuleResponse[]`，前端包装为 `FavoriteCapsule[]`
- `users.getStats`: `{ created_count, opened_count, favorited_count, total_capsules, recent_opened, recent_created }`

### 错误处理

使用 `getErrorMessage()` 提取用户友好的错误信息：

```typescript
import { getErrorMessage } from '../lib/api'

try {
  await capsulesApi.create(formData)
} catch (err) {
  setError(getErrorMessage(err, '创建失败'))
}
```

## PWA 缓存策略

- **API 请求**: NetworkFirst (5秒超时，1天缓存，最多50条)
- **媒体文件**: CacheFirst (30天缓存，最多100条)
- **静态资源**: Workbox precache (构建时生成)

## 性能优化

### 代码分割

- 路由页面: `React.lazy` + `Suspense`
- 重组件: MapView, RecommendPanel, ARScene 动态导入
- Three.js: 仅在 ARPage 中动态导入

### 图片优化

- 使用 `loading="lazy"` 延迟加载
- 优先使用 `thumbnail_url` 而非原图
- 错误时隐藏破损图片

## 状态管理

使用 Zustand 管理全局状态：

- **capsuleStore**: 附近胶囊、选中胶囊、位置上下文
- **userStore**: 当前用户信息

页面级状态使用 `useState`/`useReducer`，避免过度使用全局 store。
