# #10 — 智能推荐引擎

- **GitHub**: https://github.com/ABL312/time_space/issues/10
- **工时**: 2h
- **标签**: `MVP` `backend`
- **依赖**: #3, #7

---

## 目标

后端实现四维加权推荐算法。

## 做什么

- **RecommendService**: 权重为 距离40% + 情感匹配30% + 场景匹配20% + 热度10%
- 集成到 `GET /api/capsules/nearby` 接口
- 返回 `match_score` 和 `match_reasons` 字段

## 为什么

附近12个胶囊，3个和你相关。

## 技术细节

- 纯算法计算，无外部 API 调用
- 四维加权: 距离(40%) + 情感(30%) + 场景(20%) + 热度(10%)

## 验收标准

- [ ] 返回 `match_score` 字段
- [ ] 按 `match_score` 降序排列
- [ ] `match_reasons` 包含原因文案
- [ ] 纯算法，响应时间 <50ms

## 相关文件

- `backend/app/services/recommend_service.py` (已有骨架)
- `backend/app/routers/capsules.py`
