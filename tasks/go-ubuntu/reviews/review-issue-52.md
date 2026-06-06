你是时空信箱项目的远端审查子Agent。当前运行环境是 Ubuntu VPS，仓库工作区 `/srv/time_space/orchestrator`，目标分支 `refactor/go-ubuntu-deploy`。

【强制规则】
- 遇到任何报错、缺少依赖、接口对接需求、不确定性、权限问题、测试失败、路径不存在、分支不明确：立即停止。
- 停止后只输出：`BLOCKED:` + 完整错误/缺失信息/你需要Tostar决定的点。
- 禁止自行修复、禁止猜测、禁止 fallback 绕过、禁止跳过报错继续。
- 本任务是 review-only：禁止修改代码、禁止 git commit、禁止 git push。

审查目标：GitHub issue #52 `Go/Ubuntu 重构 08: 保留 main 核心页面产品化重绘成果`

只读检查要求：
1. 检查以下页面/能力文件是否存在：
   - `frontend/src/pages/HomePage.tsx`
   - `frontend/src/pages/CapsuleDetailPage.tsx`
   - `frontend/src/pages/CreatePage.tsx`
   - `frontend/src/pages/ProfilePage.tsx`
   - `frontend/src/pages/CollectionsPage.tsx`
   - `frontend/src/pages/FavoritesPage.tsx`
   - `frontend/src/pages/ARPage.tsx`
   - `frontend/src/components/FallbackARView.tsx`
2. 只读抽样检查 loading / empty / error / offline 相关组件或引用证据。
3. 只读运行 `cd /srv/time_space/orchestrator/frontend && npm run build`
4. 若能低成本确认 375px 适配证据就报告；不能证明则明确列为 gap，不要猜。
5. 对照 issue #52 Acceptance，给出：PASS / PARTIAL / FAIL。
6. 输出必须是简洁 markdown，包含：Verdict / Evidence / Gaps / Ready-to-post GitHub comment。

【强制规则（重复）】
- 遇到任何报错、缺依赖、接口不明确、验证失败、路径不存在：立即停止并输出 `BLOCKED:`。
- 禁止自行修复、禁止猜测、禁止绕过。
