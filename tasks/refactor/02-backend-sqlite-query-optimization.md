## Owner
backend-dev (@1416354282-spec / Fermin)

## Goal
优化 SQLite 查询、索引、分页与连接使用，让小服务器部署更稳。

## Scope
- 为 capsules/users/favorites/responses/collections 常用查询补索引。
- nearby/search/recommend/daily-recommend 增加 LIMIT、分页、必要字段选择。
- 修复可能的 N+1 查询，统一 DB helper/repository。
- 保持 API 响应结构兼容前端。

## Acceptance
- 核心列表接口响应字段不破坏现有前端。
- 有迁移/初始化索引逻辑，重复运行安全。
- 提供 API 对接卡片（如有响应字段变化）。
- backend import/核心 curl 验证通过。

## Must follow
遇到报错/不确定/接口需要对接：立即停止并向 Tostar 汇报。禁止自行猜测绕过。
