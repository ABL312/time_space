## Hermes 前端重构审查结果

**Status: FAIL / PARTIAL 偏 FAIL，暂不建议关闭。**

### 已验证
- 新增统一请求层：`frontend/src/lib/client.ts`
- 新增/拆分 API 模块：`capsulesApi` / `usersApi` / `collectionsApi` / `aiApi`
- `api.ts` 保留 backward-compatible re-exports
- `frontend npm run build` ✅ 通过

### 阻塞问题
- Issue 要求的 feature module 目录未建立：
  - `features/capsules`
  - `features/map`
  - `features/ar`
  - `features/profile`
  - `features/collections`
  - `features/recommend`
- 未发现前端架构说明文档：目录结构、组件约定、API 调用约定
- `capsuleStore.ts` / `userStore.ts` 仍直接 `fetch`，未统一走 `client.ts`
- 前后端 API contract 多处不匹配：
  - 前端调用 `/api/users/{id}/stats`，后端不存在
  - favorite status 前端路径 `/api/capsules/{id}/favorite-status`，后端实际 `/api/favorites/capsules/{id}/favorite-status`
  - `favoritesApi.list` 前端期待 favorite wrapper，后端返回 `CapsuleResponse[]`
  - `collectionsApi.list` 前端期待数组，后端返回 `{ collections, total }`
  - `capsulesApi.search` 前端期待数组，后端返回 `{ capsules, total }`
  - `dailyApi.getRecommend` 前端期待 `Capsule`，后端返回 `{ capsule, reason, expires_at }`
- `npm run lint` ❌ 失败：34 errors / 5 warnings

### 结论
保留 open。优先修复 API contract，再补 feature modules / 架构文档 / store fetch 统一。