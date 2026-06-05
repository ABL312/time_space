# Phase 8: 地图显示 + 虚拟定位 + HTTPS

## 问题清单

### 1. 地图不显示胶囊标记
**现象：** 地图只显示自己的位置图标，不显示附近的胶囊

**排查方向：**
- 检查 `frontend/src/components/MapView.tsx` 是否正确渲染胶囊标记
- 检查 `frontend/src/stores/capsuleStore.ts` 的 `nearby` 数据是否正确加载
- 检查 `frontend/src/pages/HomePage.tsx` 是否正确传递数据给 MapView
- 检查 Mapbox token 是否配置（可能是 placeholder）

**验证步骤：**
1. 打开浏览器控制台，检查 `capsuleStore.nearby` 是否有数据
2. 检查 `MapView` 组件的 `capsules` prop 是否为空
3. 检查 Mapbox 控制台是否有错误

**可能原因：**
- Mapbox token 无效或未配置
- capsuleStore 的 fetchNearby 没有正确调用
- MapView 的标记渲染逻辑有问题
- 后端返回的数据格式不匹配前端期望

### 2. 局域网访问时隐私权限被禁用
**现象：** HTTP 局域网访问时，摄像头、GPS 等隐私 API 被浏览器禁用

**原因：** 现代浏览器要求隐私 API（getUserMedia、geolocation）必须在 HTTPS 环境下使用

**解决方案：**
1. 配置 Vite HTTPS 支持
2. 使用 `@vitejs/plugin-basic-ssl` 生成自签名证书
3. 或者使用 mkcert 生成本地受信任的证书

**实现步骤：**
```bash
# 安装插件
npm install -D @vitejs/plugin-basic-ssl

# 修改 vite.config.ts
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [
    react(),
    basicSsl(), // 添加这行
    // ...
  ],
  server: {
    https: true, // 添加这行
    host: '0.0.0.0',
    // ...
  }
})
```

**访问地址变为：**
- https://192.168.5.10:5173

**注意：** 浏览器会提示证书不受信任，需要手动接受。

### 3. 虚拟定位功能
**需求：** 开发模式下可以模拟 GPS 坐标，用于测试胶囊触发逻辑

**实现方案：**
1. 创建 `useVirtualLocation` Hook
2. 在开发模式下，允许通过 URL 参数或 UI 控件设置虚拟位置
3. 优先使用虚拟位置，否则使用真实 GPS

**实现细节：**
```typescript
// frontend/src/hooks/useVirtualLocation.ts
export function useVirtualLocation() {
  const [virtualLocation, setVirtualLocation] = useState<{lat: number, lng: number} | null>(null)
  
  // 从 URL 参数读取虚拟位置
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const lat = params.get('lat')
    const lng = params.get('lng')
    if (lat && lng) {
      setVirtualLocation({ lat: parseFloat(lat), lng: parseFloat(lng) })
    }
  }, [])
  
  // 提供设置方法
  const setVirtual = (lat: number, lng: number) => {
    setVirtualLocation({ lat, lng })
    // 更新 URL
    const url = new URL(window.location.href)
    url.searchParams.set('lat', lat.toString())
    url.searchParams.set('lng', lng.toString())
    window.history.replaceState({}, '', url.toString())
  }
  
  return { virtualLocation, setVirtual }
}
```

**在 HomePage 中使用：**
```typescript
const { virtualLocation, setVirtual } = useVirtualLocation()
const realLocation = useGeolocation()

// 优先使用虚拟位置
const latitude = virtualLocation?.lat ?? realLocation.latitude
const longitude = virtualLocation?.lng ?? realLocation.longitude
```

**添加虚拟定位 UI 控件：**
- 在 HomePage 底部添加一个浮动按钮
- 点击后弹出输入框，可以输入经纬度
- 或者提供几个预设位置（演示胶囊的位置）

**预设位置（演示胶囊）：**
1. 校园门口: 31.0282, 121.4346
2. 图书馆前: 31.0295, 121.4358
3. 老树下: 31.0271, 121.4335

## 任务分配

### frontend-dev
1. 修复地图不显示胶囊的问题
2. 配置 HTTPS 支持
3. 实现虚拟定位功能（Hook + UI 控件）

### backend-dev
1. 检查后端 nearby API 返回的数据格式是否正确
2. 确保演示数据的 geohash 和坐标匹配
3. 如果需要，调整 geohash 精度逻辑

## 验收标准

1. ✅ 地图正确显示 3 个演示胶囊标记
2. ✅ 局域网可以通过 HTTPS 访问，摄像头和 GPS 权限正常
3. ✅ 可以通过虚拟定位切换到演示胶囊位置，触发接近通知
4. ✅ 点击胶囊标记可以跳转到详情页

## 提交信息

```
feat(frontend): fix map display + add HTTPS + virtual location for testing
feat(backend): verify nearby API data format
```
