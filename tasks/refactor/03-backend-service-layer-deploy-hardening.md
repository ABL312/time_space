## Owner
backend-dev (@1416354282-spec / Fermin)

## Goal
后端结构服务化，适配服务器部署与长期维护。

## Scope
- router / service / repository 分层，减少 router 内 SQL/业务堆叠。
- 统一配置读取：DATABASE_URL、UPLOAD_DIR、CORS_ORIGINS、AI keys。
- 增强 health endpoint：返回 db/media/config 基础状态。
- 生产启动命令、日志、静态媒体路径整理。

## Acceptance
- 本地和服务器环境变量都可启动。
- 无 AI key 时主流程不失败。
- 文档写清部署命令和环境变量。
- 不引入不必要新依赖。

## Must follow
遇到报错/不确定/接口需要对接：立即停止并向 Tostar 汇报。禁止自行猜测绕过。
