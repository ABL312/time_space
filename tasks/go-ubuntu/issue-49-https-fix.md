你是时空信箱项目的 backend-dev，当前只修复 issue #49 的剩余阻塞。

工作区：`/srv/time_space/orchestrator`
分支：`refactor/go-ubuntu-deploy`

当前已知阻塞：
1. `go-backend/nginx/time-space-go.conf` 仍然是 `listen 80`，不符合要求
2. 必须改成：对外 HTTPS 443，TLS termination，Go 仍监听内网 8002
3. 允许增加 80 -> 443 redirect server block
4. 部署文档必须明确写：
   - 证书路径模板（例如 /etc/letsencrypt/live/<domain>/fullchain.pem）
   - 续期/替换说明
   - 80 -> 443 跳转说明
   - 为什么必须 HTTPS 才能拿到 GPS/相机/方向传感器权限

严格要求：
- 只改与上述 blocker 直接相关的文件
- 不要重做 build/systemd/.env 的其他内容
- 如遇任何报错、git push 认证失败、测试失败，立即停止并完整汇报
- 允许 commit；如果 push 失败，要明确停下并报告，不准伪装成功

验收最少自查：
- grep/读取 nginx 配置，确认出现 `listen 443 ssl` 或等效 TLS 443 配置
- 部署文档包含 certificate / renewal / 443 / https / privacy permissions 说明

交付：
- commit SHA
- 是否 push 成功
- 修改文件列表
- 剩余阻塞（如有）
