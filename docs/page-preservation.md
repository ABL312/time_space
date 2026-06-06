# 页面保留/差异清单

> 基于 `refactor/go-ubuntu-deploy` 分支，从 `origin/main` 恢复前端页面成果
> 生成时间: 2026-06-06

## 恢复概述

所有页面从 `origin/main` 完整恢复，Ubuntu 分支页面完成度 = main 完成度。

## 页面清单与状态

| 页面 | 文件 | 恢复状态 | Loading | Empty | Error | Offline | 375px |
|---|---|---|---|---|---|---|---|
| Home | `pages/HomePage.tsx` | 完整恢复 | 有 | 有 | 有 | 有 | 适配 |
| Map | `components/MapView.tsx` | 完整恢复 | 有 | 有 | 有 | 有 | 适配 |
| Capsule Detail | `pages/CapsuleDetailPage.tsx` | 完整恢复 | 有 | 有 | 有 | 有 | 适配 |
| Create | `pages/CreatePage.tsx` | 完整恢复 | 有 | — | 有 | 有 | 适配 |
| Profile | `pages/ProfilePage.tsx` | 完整恢复 | 有 | 有 | 有 | 有 | 适配 |
| Collections | `pages/CollectionsPage.tsx` | 完整恢复 | 有 | 有 | 有 | 有 | 适配 |
| Collection Detail | `pages/CollectionDetailPage.tsx` | 完整恢复 | 有 | 有 | 有 | 有 | 适配 |
| Favorites | `pages/FavoritesPage.tsx` | 完整恢复 | 有 | 有 | 有 | 有 | 适配 |
| AR | `pages/ARPage.tsx` | 完整恢复 | 有 | — | 有 | 有 | 适配 |
| My Capsules | `pages/MyCapsulesPage.tsx` | 完整恢复 | 有 | 有 | 有 | 有 | 适配 |
| Onboarding | `pages/OnboardingPage.tsx` | 完整恢复 | — | — | 有 | — | 适配 |
| Shared Capsule | `pages/SharedCapsulePage.tsx` | 完整恢复 | 有 | 有 | 有 | 有 | 适配 |

## UI 组件恢复清单

| 组件 | 恢复状态 | 用途 |
|---|---|---|
| `Button.tsx` | 恢复 | 统一按钮样式 |
| `Card.tsx` | 恢复 | 胶囊卡片 |
| `Badge.tsx` | 恢复 | 标签/状态徽标 |
| `Input.tsx` | 恢复 | 表单输入 |
| `PageShell.tsx` | 恢复 | 页面容器 (标题+返回) |
| `SectionHeader.tsx` | 恢复 | 分区标题 |
| `BottomSheet.tsx` | 恢复 | 底部弹出面板 |
| `LoadingState.tsx` | 恢复 | 通用加载态 |
| `EmptyState.tsx` | 恢复 | 通用空态 |
| `ErrorState.tsx` | 恢复 | 通用错误态 |
| `OfflineBanner.tsx` | 恢复 | 断网横幅 |

## 差异说明

**无差异** — Ubuntu 分支前端页面与 `origin/main` 完全一致。

## 验证

- `npm run build` 通过
- `npm run lint` 通过
- TypeScript 编译无错误
