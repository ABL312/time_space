你是时空信箱项目的 backend-dev，当前在 Ubuntu VPS 上开发。

目标：完成 GitHub issue #49，分支 `refactor/go-ubuntu-deploy`，工作区 `/srv/time_space/orchestrator`。

必须完成：
1. Linux binary build script
2. systemd service template (`time-space-go.service`)
3. Nginx reverse proxy config
4. `.env.example`（不含 secret）
5. 部署文档与 rollback 步骤

硬规则：
- 只允许在 `/srv/time_space/orchestrator` 和 `refactor/go-ubuntu-deploy` 上工作
- 遇到任何报错、权限问题、merge conflict、测试失败、分支不确定，必须立即停止并完整汇报
- 禁止提交 `.env`、`*.db`、`*.sqlite`、uploads、node_modules、dist
- 需要 git commit + push

验收至少执行：
- `CGO_ENABLED=0 go test ./...`
- `CGO_ENABLED=0 go build ./cmd/server`

交付时必须给出：
- commit SHA
- push 分支名
- 修改文件列表
- 简短部署对接卡片
\n## NEW REQUIREMENT\n- 对外必须走 HTTPS 加密协议\n- 对外端口必须是 443\n- 目的：保证浏览器正确获取 GPS/相机/方向传感器等隐私权限\n- Nginx 配置必须体现 443 TLS 终止，并反代到内网 Go 端口\n- 部署文档必须包含证书位点与续期/替换说明\n
