# Deployment对接卡片

## 交付内容概览

已完成Go后端在Ubuntu上的部署准备工作，包括构建脚本、系统服务配置、Nginx反向代理配置、环境变量示例文件以及完整的部署文档。

## 提交信息

- **Commit SHA**: d591a56
- **分支名称**: refactor/go-ubuntu-deploy
- **修改文件列表**:
  - go-backend/.env.example
  - go-backend/DEPLOYMENT.md
  - go-backend/build.sh
  - go-backend/nginx/time-space-go.conf
  - go-backend/systemd/time-space-go.service

## 部署组件说明

### 1. 构建脚本 (build.sh)
- 创建静态链接的Linux二进制文件
- 支持跨平台编译 (AMD64)
- 包含错误处理和验证步骤

### 2. systemd服务配置
- 服务名称: time-space-go.service
- 运行用户: www-data
- 端口: 8002
- 环境变量支持
- 自动重启机制

### 3. Nginx反向代理配置
- 监听80端口
- 代理到本地8002端口
- 静态文件直接服务 (/uploads/)
- WebSocket支持
- 安全头设置

### 4. 环境配置示例
- 端口和环境配置
- 数据库路径设置
- 上传目录配置
- CORS配置
- AI服务API密钥占位符

### 5. 部署文档 (DEPLOYMENT.md)
- 完整的部署步骤
- systemd服务设置指南
- Nginx配置说明
- 环境变量配置方法
- 回滚程序
- 监控和日志查看方法
- 健康检查指令

## 验收命令

```bash
# 构建应用
cd /srv/time_space/orchestrator/go-backend
chmod +x build.sh
./build.sh

# 检查生成的二进制文件
ls -lh ./server

# 启动服务前的准备
sudo mkdir -p /srv/time_space/orchestrator/data/uploads
sudo chown -R www-data:www-data /srv/time_space/orchestrator/data

# 设置systemd服务
sudo cp /srv/time_space/orchestrator/go-backend/systemd/time-space-go.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable time-space-go.service
sudo systemctl start time-space-go.service

# 检查服务状态
sudo systemctl status time-space-go.service

# 设置Nginx反向代理
sudo cp /srv/time_space/orchestrator/go-backend/nginx/time-space-go.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/time-space-go.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 环境配置
cp /srv/time_space/orchestrator/go-backend/.env.example /srv/time_space/orchestrator/go-backend/.env
# 编辑.env文件填入实际值
nano /srv/time_space/orchestrator/go-backend/.env

# 健康检查
curl http://127.0.0.1:8002/api/health
curl http://<server-ip>/api/health
```

## 回滚步骤

如果部署出现问题，可以按照以下步骤回滚:

1. 停止服务:
   ```bash
   sudo systemctl stop time-space-go.service
   ```

2. 替换二进制文件为备份版本:
   ```bash
   sudo cp /path/to/backup/server /srv/time_space/orchestrator/go-backend/server
   ```

3. 重启服务:
   ```bash
   sudo systemctl start time-space-go.service
   ```

或者使用Git回退到之前的提交:
```bash
cd /srv/time_space/orchestrator
git checkout <previous-commit-hash>
cd go-backend
./build.sh
sudo systemctl restart time-space-go.service
```