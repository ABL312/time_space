## Owner
ABL312

## Goal
用 Go 实现核心用户/胶囊 API，优先保证前端契约兼容与 SQLite 查询性能。

## Scope
- 迁移/实现 users CRUD/register 基础接口。
- 迁移/实现 capsules create/detail/nearby/search/daily-recommend 核心接口。
- nearby 使用 geohash/距离过滤，保留前端现有响应字段。
- 列表接口增加 limit/offset，上限保护。
- 修复 N+1：列表接口批量加载 media/interactions。
- SQLite 索引初始化幂等。

## Acceptance
- 前端现有关键 API 响应结构不破坏。
- `go test ./...` 通过。
- 关键 curl：register / nearby / detail / search / daily-recommend 通过。
- 提供 API 对接卡片，如字段有任何变化必须明确说明。

## Must follow
遇到报错/不确定/接口需要对接：立即停止并向 Tostar 汇报。禁止自行猜测绕过。
