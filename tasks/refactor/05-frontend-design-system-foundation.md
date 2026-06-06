## Owner
frontend-dev (@lisnshsjwkz)

## Goal
建立去 AI 味、可维护的前端 Design System 基础。

## Design reference
- Linear：深色原生、精密、低噪声、半透明边界。
- Vercel：信息架构清晰、Geist/mono 技术感、shadow-as-border。
- Stripe：少量高级渐变与品牌级留白，不滥用。

## Scope
- 建立 tokens：color / spacing / typography / radius / elevation / motion。
- 建立基础组件：Button, Card, Badge, Input, PageShell, SectionHeader, EmptyState, ErrorState, LoadingState。
- 收敛 Tailwind class，避免页面内重复大段样式。
- 不新增重型 UI 库；优先现有 Tailwind + React。

## Acceptance
- 关键页面可复用基础组件。
- npm run build 通过。
- 视觉明显减少“AI 堆砌感”。

## Must follow
遇到报错/不确定/接口需要对接：立即停止并向 Tostar 汇报。禁止自行猜测绕过。
