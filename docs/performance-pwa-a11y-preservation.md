# 性能/PWA/可访问性保留说明

> 基于 `refactor/go-ubuntu-deploy` 分支，从 `origin/main` 恢复前端优化成果
> 生成时间: 2026-06-06

## 1. 性能优化

### 路由级 Lazy Loading
- `App.tsx` 使用 `React.lazy()` + `Suspense` 按路由拆分
- 所有页面组件按需加载，首屏只加载 Home 相关代码

### 重组件按需加载
- Three.js 相关 (ARScene, Starfield) → `three-vendor` chunk (722KB)
- Leaflet 地图 → `leaflet` chunk (148KB)
- 独立 vendor chunk 避免首屏加载

### 代码分割结果 (build output)
| Chunk | Size | Gzip |
|---|---|---|
| index (core) | 190KB | 60KB |
| client (API) | 42KB | 15KB |
| HomePage | 20KB | 6KB |
| CapsuleDetailPage | 33KB | 11KB |
| three-vendor | 722KB | 184KB |
| leaflet | 148KB | 43KB |
| **总计** | **~1.3MB** | **~384KB** |

### 图片/媒体懒加载
- 地图组件使用 Leaflet lazy loading
- 胶囊媒体资源通过 `/uploads/` 路径按需加载
- PWA workbox 对 `/uploads/` 使用 CacheFirst 策略

### 骨架屏
- 各页面使用 `LoadingState` 组件作为加载占位
- `CapsuleDetailPage` 有专用的骨架屏布局

## 2. PWA / Offline

### 文件保留状态

| 文件 | 状态 | 说明 |
|---|---|---|
| `frontend/public/manifest.json` | **保留** | PWA 安装配置 (name, icons, theme_color) |
| `frontend/public/offline.html` | **保留** | 离线回退页面 (73行, 含主题样式) |
| `frontend/src/hooks/useOnline.ts` | **保留** | 网络状态检测 hook (online/offline events) |
| `frontend/src/components/ui/OfflineBanner.tsx` | **保留** | 断网横幅组件 (aria-live=assertive) |

### Service Worker 策略 (vite-plugin-pwa)
- **registerType**: autoUpdate
- **Precache**: 34 entries (1315KB)
- **Runtime Caching**:
  - `/api/*` → NetworkFirst (5s timeout, 50 entries, 24h max)
  - `/uploads/*` → CacheFirst (100 entries, 30d max)

### 离线体验
- 断网时 OfflineBanner 自动滑入提示
- API 请求超时后显示 cached data 提示
- offline.html 作为完全离线时的回退页面

## 3. 可访问性 (Accessibility)

### ARIA 属性使用
| 组件 | ARIA 用法 |
|---|---|
| `OfflineBanner.tsx` | `role="alert"`, `aria-live="assertive"` |
| `BottomSheet.tsx` | `role="dialog"`, `aria-modal`, `aria-label` |
| `RecommendPanel.tsx` | `role="region"`, `aria-label` |
| `MapView.tsx` | `role="application"`, `aria-label` |
| `PageShell.tsx` | `role="main"` |
| `ProximityAlert.tsx` | `role="alert"` |

### Focus Management
- `focus:ring-2` 焦点环用于所有可交互元素
- CreatePage: 4个焦点环 (表单输入)
- Input.tsx: 内置焦点环样式
- CapsuleDetailPage, OnboardingPage, VoiceClone: 焦点环覆盖

### 触摸目标
- 所有按钮/操作入口最小 44x44px
- 移动端 375px 布局不溢出
- 底部操作区域使用 safe-area-inset

### 对比度
- 暗色主题 `#0f172a` 背景 + 高对比文字
- 状态色 (红/黄/绿) 满足 WCAG AA 标准

## 4. 隐私 API 降级

### useCapabilityCheck.ts 降级策略

| API | 检测方法 | 降级行为 |
|---|---|---|
| Camera (getUserMedia) | `navigator.mediaDevices.getUserMedia` | `useCSSFallback: true` → CSS 动画替代 Three.js |
| GPS (geolocation) | `navigator.geolocation` | `useExpandedGPS: true` → 扩大搜索半径 |
| WebGL | `canvas.getContext('webgl2')` | `shouldSkipAR: true` → 跳过 AR 直接显示详情 |
| Network | `navigator.onLine` + events | OfflineBanner 提示 + API cache fallback |
| PWA/SW | `serviceWorker in navigator` | 提示用户可安装 PWA |

### 降级明确性
- Camera 不可用: 显示 FallbackARView (CSS 动画)
- GPS 不可用: 使用城市级定位 (expanded radius)
- WebGL 不可用: 自动跳过 AR 页面
- 所有降级路径有明确的用户提示文案

## 5. 验证

- `npm run build` 通过 ✓
- `npm run lint` 通过 ✓
- PWA manifest 正确生成 ✓
- Service Worker 正确注册 (sw.js + workbox) ✓
- Precache 34 entries ✓
