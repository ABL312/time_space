## Owner
backend-dev (@1416354282-spec / Fermin)

## Goal
建立后端性能与部署基线，先量化再重构。

## Scope
- 梳理当前 FastAPI routes、DB 表、关键查询路径。
- 输出关键 API 的基线：health / nearby / detail / create / recommend / upload。
- 增加轻量性能检查脚本或 README 命令。
- 检查 SQLite 配置：WAL、busy_timeout、foreign_keys。

## Acceptance
- 提交 `backend/docs/performance-baseline.md` 或等价文档。
- 列出最慢/最高风险 API 与重构建议。
- 不改业务行为。

## Must follow
遇到报错/不确定/接口需要对接：立即停止并向 Tostar 汇报。禁止自行猜测绕过。
