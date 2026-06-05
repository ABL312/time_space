# Phase 9: Mapbox GL → Leaflet 迁移

## 背景
当前使用 Mapbox GL JS 显示地图，但需要有效的 Mapbox token 才能正常工作。为了简化部署和演示，需要迁移到 Leaflet + OpenStreetMap。

## 任务
将 `frontend/src/components/MapView.tsx` 从 Mapbox GL 迁移到 Leaflet。

## 要求

### 1. 安装依赖
```bash
cd frontend
npm uninstall mapbox-gl
npm install leaflet @types/leaflet
```

### 2. 修改 MapView.tsx
- 移除所有 `mapbox-gl` 相关代码
- 使用 `leaflet` 替代
- 使用 CartoDB Dark Matter 暗色主题瓦片（免费，无需 token）：
  ```
  https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png
  ```
- 保持相同的组件接口：
  ```typescript
  interface MapViewProps {
    latitude: number
    longitude: number
    capsules: Capsule[]
    onCapsuleClick?: (capsule: Capsule) => void
  }
  ```

### 3. 功能要求
- 用户位置：青色圆点 + 发光效果（#22d3ee）
- 胶囊标记：
  - 推荐胶囊（match_score > 50）：金色圆点 + 发光（#f5a623），14px
  - 普通胶囊：半透明金色，10px
- 点击胶囊标记触发 `onCapsuleClick`
- 位置变化时平滑飞行动画
- 缩放控件放在右上角

### 4. 样式要求
- 导入 Leaflet CSS：`import 'leaflet/dist/leaflet.css'`
- 使用 L.divIcon 自定义标记样式
- 保持深空信号站主题的暗色风格

### 5. 验证
- 确保 TypeScript 编译通过：`npm run build`
- 确保没有 Mapbox 相关依赖残留
- 确保地图能正常显示（不需要 token）

## 提交
```bash
git add -A
git commit -m "refactor(frontend): migrate from Mapbox GL to Leaflet

- Remove mapbox-gl dependency
- Add leaflet + @types/leaflet
- Use CartoDB Dark Matter tiles (free, no token required)
- Keep same MapView interface and visual style"
```

## 注意事项
- 不要修改其他文件，只改 MapView.tsx 和 package.json
- 确保所有功能保持不变
- 确保暗色主题视觉效果一致
