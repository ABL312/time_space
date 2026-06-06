## Owner
ABL312

## Goal
为 Ubuntu 服务器部署 Go 后端提供完整生产化脚本与文档。

## Scope
- 新增 Go 后端 build 脚本，产出 Linux amd64 二进制。
- systemd service 示例。
- Nginx reverse proxy 示例：前端静态站 + `/api` + `/uploads`。
- `.env.example` / production env 文档。
- SQLite 数据目录、uploads 目录持久化说明。
- 健康检查、日志查看、重启、回滚命令。

## Acceptance
- 文档可按步骤在 Ubuntu 上部署。
- build 命令可在本地或 CI 产出 Linux 二进制。
- systemd/nginx 配置路径清晰。
- 不影响现有 Vercel/Railway 配置。

## Must follow
遇到报错/不确定/接口需要对接：立即停止并向 Tostar 汇报。禁止自行猜测绕过。
