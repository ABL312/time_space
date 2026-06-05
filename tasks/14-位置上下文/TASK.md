# #14 — AI 位置上下文服务

- **GitHub**: https://github.com/ABL312/time_space/issues/14
- **工时**: 2h
- **标签**: `enhancement` `backend` `frontend`
- **依赖**: #1, #4

---

## 目标

GPS 坐标 → Reverse Geocode → GPT 生成地点描述和推荐标签。

## 做什么

- **LocationService**: Nominatim 逆地理编码 + GPT-4o-mini 生成描述
- **GET /api/ai/location-context?lat=&lng=**
- 前端地图底部面板显示结果

## 为什么

通道1：让用户看到当前位置的 AI 描述和推荐心情。

## 技术细节

- Nominatim (OSM) 逆地理编码
- GPT-4o-mini 生成描述文案
- 基于坐标的 5 分钟缓存
- Nominatim 空结果时降级处理

## 验收标准

- [ ] 返回 `name`、`description` 和 `suggested_moods`
- [ ] 同一坐标 5 分钟内命中缓存
- [ ] 前端地图面板正确显示
- [ ] Nominatim 返回空时降级正常

## 相关文件

- `backend/app/routers/ai.py`
- `backend/app/services/` (待创建 LocationService)
- `frontend/src/components/MapView.tsx`
