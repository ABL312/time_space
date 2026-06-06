## Owner
ABL312

## Goal
用 Go 实现推荐/AI 辅助接口的低成本 fallback 与超时隔离，避免 Ubuntu 部署时外部 API 阻塞主流程。

## Scope
- 实现 emotion/location/scene/recommend/voice-clone 的 Go fallback 或代理接口。
- 无 API key 时必须 mock/关键词 fallback。
- 外部调用必须 timeout，失败返回 fallback 或明确 JSON 错误。
- 创建胶囊主流程不能被 AI 失败阻塞。
- 推荐接口保留 match_score / match_reason 等前端字段。

## Acceptance
- 无任何 AI key 时核心接口可用。
- AI 失败不会阻塞 capsule create。
- `go test ./...` 通过。
- 关键 curl：emotion / recommend / scene / voice fallback 通过。
- 提供 API 对接卡片。

## Must follow
遇到报错/不确定/接口需要对接：立即停止并向 Tostar 汇报。禁止自行猜测绕过。
