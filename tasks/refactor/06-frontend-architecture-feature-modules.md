## Owner
frontend-dev (@lisnshsjwkz)

## Goal
重构前端目录和状态管理，提高可维护性。

## Scope
- 将 API/types/hooks/components 按 feature 拆分：capsules/map/ar/profile/collections/recommend。
- 统一 API client 错误处理与 loading 状态。
- Zustand 状态只保留跨页面必要状态，页面本地状态下沉。
- 清理重复类型、重复请求、重复 UI 逻辑。

## Acceptance
- 路由行为保持兼容。
- npm run build 通过。
- 输出前端架构说明：目录结构、组件约定、API 调用约定。

## Must follow
遇到报错/不确定/接口需要对接：立即停止并向 Tostar 汇报。禁止自行猜测绕过。
