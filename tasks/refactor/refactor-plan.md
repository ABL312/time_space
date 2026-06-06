# 时空信箱代码重构方案（性能部署 + 前端去 AI 味）

## 目标
- 后端：提升 SQLite/FastAPI 在小服务器上的稳定性、响应速度、可观测性，能低成本部署。
- 前端：从“炫技 AI 生成感”改成克制、可维护、产品化的深色地理情感 PWA。
- 协作：Orchestrator 不改业务代码；所有代码改动由 frontend-dev / backend-dev / ABL312 执行。

## 设计方向
- 主视觉：Linear 深色精密系统 + Vercel 信息架构 + Stripe 局部高级渐变。
- 关键词：克制、空间感、低噪声、产品感、移动优先、可复用组件。
- 避免：大量霓虹、过度毛玻璃、随机动效、堆砌文案、每页重复 HUD 装饰。

## 前端重构原则
1. 先建 Design System：tokens、基础组件、页面壳、状态组件。
2. 再做信息架构：页面分层、路由组织、feature modules。
3. 最后重绘关键页面：Home / Map / Detail / Create / AR / Profile / Collections。
4. 不新增重型依赖；优先 Tailwind + React + Zustand 现有栈。
5. 每个页面必须有 loading / empty / error / offline 状态。

## 后端重构原则
1. 先做性能基线：启动、健康检查、关键 API latency、DB 查询路径。
2. SQLite 优化：WAL、busy_timeout、索引、分页、LIMIT、避免 N+1。
3. 服务层拆分：router 只做请求/响应，service 做业务，repository 做 DB。
4. AI 服务降级必须稳定：无 key 不阻塞主流程。
5. 部署优先：环境变量、日志、静态媒体路径、CORS、健康检查、进程配置。

## 分阶段
| Phase | 内容 | 负责人 |
|---|---|---|
| 1 | 基线审计 + 架构方案落地 | backend-dev / frontend-dev |
| 2 | 后端性能/部署重构 + 前端 design system | backend-dev / frontend-dev |
| 3 | 前端页面重绘 + 后端 API 稳定性 | frontend-dev / backend-dev |
| 4 | 联调、压测、移动端验收、部署演练 | ABL312 + 两端 |

## 验收底线
- `frontend`: npm run build 通过。
- `backend`: app 可 import，核心 API curl 通过，健康检查通过。
- 服务端：冷启动不依赖外部 AI key；无 key 时 mock/fallback 可用。
- 移动端：主要页面 375px 可用，地图/AR 降级清晰。
- GitHub Issue 每项完成后 commit + push + 附 API/设计变更说明。
