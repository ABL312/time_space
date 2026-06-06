# Go Backend Ubuntu 部署说明

本文档用于将 `go-backend` 部署到 Ubuntu，并通过 `systemd + nginx` 对外提供服务。

## 目录约定

- 项目根目录：`/var/www/time-space`
- Go 后端目录：`/var/www/time-space/go-backend`
- 前端静态目录：`/var/www/time-space/frontend/dist`
- systemd 配置：`/etc/systemd/system/time-space-go.service`
- nginx 配置：`/etc/nginx/sites-available/time-space-go.conf`

## 1. 准备目录

```bash
sudo mkdir -p /var/www/time-space
sudo chown -R "$USER":"$USER" /var/www/time-space
```

将仓库内容放到 `/var/www/time-space` 后，准备 Go 运行目录：

```bash
cd /var/www/time-space/go-backend
mkdir -p data/uploads scripts deploy/systemd deploy/nginx docs
cp .env.example .env
```

根据实际域名修改 `.env` 中的 `CORS_ORIGINS`。

## 2. 构建 Go Linux 二进制

```bash
cd /var/www/time-space/go-backend
chmod +x scripts/build-linux.sh
./scripts/build-linux.sh
```

默认产物为 `/var/www/time-space/go-backend/server`。

## 3. 配置 systemd

复制服务文件：

```bash
sudo cp deploy/systemd/time-space-go.service /etc/systemd/system/time-space-go.service
sudo systemctl daemon-reload
sudo systemctl enable time-space-go.service
sudo systemctl start time-space-go.service
```

常用命令：

```bash
sudo systemctl status time-space-go.service
sudo systemctl restart time-space-go.service
sudo journalctl -u time-space-go.service -n 100
sudo journalctl -u time-space-go.service -f
```

## 4. 配置 nginx

复制 nginx 配置并启用站点：

```bash
sudo cp deploy/nginx/time-space-go.conf /etc/nginx/sites-available/time-space-go.conf
sudo ln -sf /etc/nginx/sites-available/time-space-go.conf /etc/nginx/sites-enabled/time-space-go.conf
sudo nginx -t
sudo systemctl reload nginx
```

此配置行为：

- `/` 指向前端静态文件 `frontend/dist`
- `/api/` 反向代理到 `127.0.0.1:8080`
- `/uploads/` 反向代理到 `127.0.0.1:8080`

## 5. 健康检查

本机检查：

```bash
curl http://127.0.0.1:8080/api/health
curl http://127.0.0.1/api/health
```

确认返回 JSON 且包含 `status: ok`。

## 6. 发布流程

每次更新 Go 后端后执行：

```bash
cd /var/www/time-space/go-backend
git pull
./scripts/build-linux.sh
sudo systemctl restart time-space-go.service
curl http://127.0.0.1:8080/api/health
```

## 7. 回滚流程

推荐在发布前备份当前二进制：

```bash
cd /var/www/time-space/go-backend
cp server "server.$(date +%Y%m%d%H%M%S).bak"
```

若新版本异常，回滚到上一个备份：

```bash
cd /var/www/time-space/go-backend
cp server.<timestamp>.bak server
sudo systemctl restart time-space-go.service
curl http://127.0.0.1:8080/api/health
```

回滚后继续通过 `journalctl` 与 `systemctl status` 检查服务状态。
