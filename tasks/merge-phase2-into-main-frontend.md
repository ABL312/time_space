# Merge Flow Task: phase2-enhancements -> main

## Role
You are frontend-dev for the 时空信箱 project. You are allowed to modify frontend code only. Orchestrator has already created branch `merge/phase2-into-main` from `origin/main` and performed `git merge --no-commit --no-ff origin/feature/phase2-enhancements`. Git reported automatic merge success with no unmerged files.

## Current blocker
Merged branch frontend build fails with TypeScript errors:

```txt
src/pages/CapsuleDetailPage.tsx(5,38): error TS6133: 'shareApi' is declared but its value is never read.
src/pages/CapsuleDetailPage.tsx(179,60): error TS2339: Property 'share_token' does not exist on type 'Capsule'.
src/pages/CollectionDetailPage.tsx(4,15): error TS2305: Module '"../types"' has no exported member 'CapsuleCollection'.
src/pages/CollectionDetailPage.tsx(153,74): error TS2339: Property 'title' does not exist on type 'CollectionWithCapsules'.
src/pages/CollectionDetailPage.tsx(154,58): error TS2339: Property 'description' does not exist on type 'CollectionWithCapsules'.
src/pages/CollectionDetailPage.tsx(160,42): error TS2339: Property 'updated_at' does not exist on type 'CollectionWithCapsules'.
src/pages/CollectionsPage.tsx(4,15): error TS2305: Module '"../types"' has no exported member 'CapsuleCollection'.
src/pages/HomePage.tsx(30,10): error TS6133: 'isLoadingDaily' is declared but its value is never read.
src/pages/ProfilePage.tsx(137,90): error TS2322: Type '{ achievements: Achievement[]; isOpen: true; onClose: () => void; minimal: boolean; }' is not assignable to type 'IntrinsicAttributes & AchievementPanelProps'.
  Property 'minimal' does not exist on type 'IntrinsicAttributes & AchievementPanelProps'.
src/pages/SharedCapsulePage.tsx(221,18): error TS6133: 'setActive' is declared but its value is never read.
src/pages/SharedCapsulePage.tsx(255,20): error TS2304: Cannot find name 'useRef'.
```

## Goal
Fix the known TypeScript build failures introduced by the merged feature branch while preserving:
- origin/main IP geolocation fallback behavior
- origin/feature/phase2-enhancements functionality: responses, favorites, search, time-lock, sharing, daily recommend, collections, profile, heatmap, achievements

## Constraints
- Do NOT edit backend code.
- Do NOT add dependencies unless already in package.json/package-lock after merge.
- Do NOT change API contracts unless unavoidable.
- Keep fixes minimal and type-safe.
- If you hit a new unexpected error, merge conflict, API uncertainty, or are unsure how to proceed: STOP and report the full error to Tostar. Do not guess or bypass.

## Required commands
1. Confirm branch: `git branch --show-current` should be `merge/phase2-into-main`.
2. Inspect relevant files before editing.
3. Fix the known TS errors.
4. Run `cd frontend && npm run build`.
5. If build passes, commit the merge + frontend fixes:
   `git add -A && git commit -m "merge: integrate phase2 enhancements into main"`
6. Push branch:
   `git push -u origin merge/phase2-into-main`

## Report
Return:
- commit SHA
- build result
- files changed
- whether any issue remains
