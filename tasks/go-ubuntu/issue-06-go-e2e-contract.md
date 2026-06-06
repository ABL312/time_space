## Owner
ABL312

## Goal
完成 Go 后端与现有 React 前端的 API 契约联调与验收，确保可替换 FastAPI 部署。

## Scope
- 输出 Go 后端 API 对接总表。
- 编写 smoke test 脚本验证 health/register/nearby/search/detail/upload/recommend。
- 前端代理可切换 Go 后端端口。
- 对比 FastAPI 与 Go 响应结构，列出差异。
- 修复不兼容点；如必须变更前端契约，写清变更卡片。

## Acceptance
- `npm run build` 通过。
- Go smoke test 通过。
- 至少验证核心页面依赖的 API 响应结构。
- README 或 docs 中说明 Go 后端启动/切换方式。

## Must follow
遇到报错/不确定/接口需要对接：立即停止并向 Tostar 汇报。禁止自行猜测绕过。
