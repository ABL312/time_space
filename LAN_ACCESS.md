# 局域网访问指南

## 问题

浏览器要求 **HTTPS** 才能访问摄像头和 GPS（安全上下文限制）。  
自签名证书会导致浏览器显示"不安全"警告，需要手动信任。

---

## 方案一：信任自签名证书（推荐）

### 桌面端（电脑）

1. 启动服务后，访问 **https://localhost:5173**
2. 浏览器显示"您的连接不是私密连接"
3. 点击 **"高级"** → **"继续前往 localhost（不安全）"**
4. 证书已信任，可正常使用

### 移动端（手机/平板）

1. 确保手机和电脑在同一 WiFi
2. 手机浏览器访问 **https://192.168.x.x:5173**（电脑的局域网 IP）
3. 同样会显示安全警告
4. **Chrome**: 点击"高级" → "继续前往"
5. **Safari**: 点击"显示详细信息" → "访问此网站" → "访问"
6. **Firefox**: 点击"高级" → "接受风险并继续"

### 查看局域网 IP

```bash
# Windows
ipconfig | findstr "IPv4"

# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1
```

---

## 方案二：Chrome Flags（备选）

如果不想每次都点警告，可以让 Chrome 把 HTTP 当作安全上下文：

1. 访问 **chrome://flags/#unsafely-treat-insecure-origin-as-secure**
2. 在输入框填入：**http://localhost:5173,http://192.168.x.x:5173**
3. 点击 **"Relaunch"** 重启浏览器
4. 现在可以用 **http://** 访问（无需 HTTPS）

⚠️ **注意**: 此方法仅对 Chrome 有效，且需要每台设备单独配置。

---

## 方案三：mkcert 生成受信任证书（高级）

彻底消除警告，生成系统信任的本地证书：

### 安装 mkcert

```bash
# Windows (需要 scoop 或 choco)
scoop install mkcert
# 或
choco install mkcert

# macOS
brew install mkcert

# Linux
sudo apt install mkcert
```

### 生成证书

```bash
# 初始化本地 CA（只需一次）
mkcert -install

# 生成证书
cd frontend
mkcert localhost 192.168.x.x 127.0.0.1 ::1

# 会生成：
# - localhost+3.pem
# - localhost+3-key.pem
```

### 配置 Vite

编辑 `vite.config.ts`：

```typescript
import fs from 'fs'

export default defineConfig({
  server: {
    https: {
      key: fs.readFileSync('./localhost+3-key.pem'),
      cert: fs.readFileSync('./localhost+3.pem'),
    },
    // ... 其他配置
  }
})
```

重启服务后，浏览器不再显示警告。

---

## 常见问题

### Q: 手机访问显示"拒绝连接"

**A**: Windows 防火墙阻止了 5173 端口。

```bash
# Windows 添加防火墙规则
netsh advfirewall firewall add rule name="Vite Dev Server" dir=in action=allow protocol=TCP localport=5173
```

### Q: 访问后显示空白页

**A**: 浏览器缓存了旧的 HTTP 版本。

- 清除缓存：Ctrl+Shift+Delete
- 或使用无痕模式

### Q: 摄像头/GPS 仍然无法使用

**A**: 检查是否真的在 HTTPS 下访问（地址栏应有🔒图标）。

```javascript
// 浏览器控制台检查
console.log(window.isSecureContext) // 应为 true
```

### Q: Safari 一直显示"无法验证服务器身份"

**A**: Safari 对自签名证书更严格。

1. 在 Mac 上访问 https://localhost:5173
2. 打开"钥匙串访问"
3. 找到 "Vite 开发服务器" 证书
4. 双击 → 信任 → "始终信任"

---

## 推荐流程

**演示时**：
1. 电脑启动服务：`npm run dev`
2. 电脑浏览器访问 https://localhost:5173，信任证书
3. 手机浏览器访问 https://192.168.x.x:5173，信任证书
4. 两台设备都可以正常使用摄像头和 GPS

**开发时**：
- 用 http://localhost:5173（无需 HTTPS，虚拟定位绕过）
- 需要测试真实摄像头/GPS 时切换到 HTTPS
