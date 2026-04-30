# Story 60.16: shopPreview 模块拆分

Status: backlog

<!-- Epic 60 Phase 2 · 优先级 P2.4（清理）· P2.4 第 3 项 · Epic 60 收官 -->
<!-- Note: 拆自原 60-14 三主题中"模块拆分"部分 — 风险最高，独立 PR -->

## Story

As a **未来维护者**,
I want **`shopPreview.ts` 从 2548 行单文件拆成 4 个职能清晰的模块（terminal / workbench / state / bootstrap）每个 ≤ 400 行**,
so that **后续 epic（60-x feedback / 新机制接入）能基于干净拆分继续叠加，不重复 1100+ 行单文件的痛苦**.

## 背景

60-14（死代码清理）+ 60-15（i18n 全覆盖）完成后开本 story。这是原 60-14 spec 三主题中**风险最高**的部分 —— 2548 行 / 99 函数搬运，潜在回归面广，**独立 PR + 多 commit + git bisect** 走。

## Acceptance Criteria

1. **AC1：4 个新模块文件创建** —— `src/src/ui/shop/` 目录：
   - `shopState.ts` ≤ 200 行
   - `shopTerminal.ts` ≤ 400 行
   - `shopWorkbench.ts` ≤ 400 行
   - `shopBootstrap.ts` ≤ 400 行

2. **AC2：原 `shopPreview.ts` 改 facade** ≤ 80 行 —— 仅 `export * from './shop/...'` + `__test` API 桥接

3. **AC3：模块级状态全部迁入 `shopState.ts`** —— terminal/workbench/bootstrap 通过 state.X 读写

4. **AC4：依赖严格单向** —— bootstrap → terminal + workbench + state；terminal/workbench 互不依赖（用 callback 注入协调切屏 / submit）

5. **AC5：facade 兼容性** —— `from '../../../src/ui/shopPreview'` import 路径仍能拿到 `enterTerminalShop` / `__test` 等关键 export；现有 11 个 `shopPreview*.test.ts` 测试 0 改动

6. **AC6：facade 兼容性单测** —— 新建 `tests/unit/ui/shopPreviewFacade.test.ts` 验证关键 export 链路

7. **AC7：Story 60.x ecosystem 全套不退化**

8. **AC8：tsc baseline 持平** —— shopPreview.ts 既有 2 个 tsc 错误（其中之一是 sound.ts type alias 推导问题）拆分后总数不变

9. **AC9：commit 拆 5+ 条** 便于 git bisect：
   - `refactor(shop): extract shopState module` — Task 1
   - `refactor(shop): extract shopTerminal module` — Task 2
   - `refactor(shop): extract shopWorkbench module` — Task 3
   - `refactor(shop): extract shopBootstrap + facade` — Task 4-5
   - `chore(shop): cleanup TODO + dead exports surfaced by split` — Task 6

10. **AC10：手动验证留 code-review** —— 浏览器全套主流程跑（购买 / 装备 / 卸下 / 蜕变 / 提交 / 转场）行为不变

## Tasks / Subtasks

- [ ] **Task 1：建 `shop/shopState.ts`（AC: 1, 3）**
  - [ ] 1.1 新建文件 + 迁所有模块级 `let` / `const` 状态
  - [ ] 1.2 export `previewState` 对象 + getter / setter 函数
  - [ ] 1.3 import 自 shopPreview.ts，把所有 `let` 删，改 `previewState.X`
  - [ ] 1.4 commit：`refactor(shop): extract shopState module`
  - [ ] 1.5 跑全套测试确认 0 退化

- [ ] **Task 2：建 `shop/shopTerminal.ts`（AC: 1）**
  - [ ] 2.1 迁所有 `cmd*` 函数 + `renderListRow` / `renderInfoBlock` / `appendLine` / `appendBlank` / `setPrompt` / `escapeHtml` / `wrapAt` / `levenshtein` / `expandVerb` / `suggestSku` / `classForRow` / `pad` / `visualWidth` 等
  - [ ] 2.2 commit：`refactor(shop): extract shopTerminal module`

- [ ] **Task 3：建 `shop/shopWorkbench.ts`（AC: 1）**
  - [ ] 3.1 迁 `syncWorkbench*` / `setupDragZones` / `bindSkillToKey` / `unbindSkillFromKey` / `triggerInboxWhoosh` / `attachWorkbenchTooltips` / `openDrawer` / `closeDrawer` / `renderWordsDrawerHtml` / `renderInboxCardHtml` / `renderPackPickDrawerHtml` / `setupPackPickHandlers` / `finalizePackPick` / `cancelPackPick`
  - [ ] 3.2 commit：`refactor(shop): extract shopWorkbench module`

- [ ] **Task 4：建 `shop/shopBootstrap.ts`（AC: 1, 4）**
  - [ ] 4.1 迁 `enterTerminalShop` / `initShopPreview` / `restoreFromPreview` / `injectScreens` / `hideAllRealScreens` / `setupDrawerHandlers` / `onKey` / `triggerSubmit` / `proceedSubmit` / `executeSubmitTransition` / `createSubmitStampOverlay` / `triggerCrtFlicker` / `showOnly` / `updateTerminalChrome` / `handleSubmitConfirmation` / `handleConfirmation` / `triggerInboxWhoosh`
  - [ ] 4.2 通过 callback 协调：`onKey` 调 terminal 的 `execute()` + workbench 的 `bindSkillToKey()`
  - [ ] 4.3 commit：`refactor(shop): extract shopBootstrap module`

- [ ] **Task 5：facade（AC: 2, 5）**
  - [ ] 5.1 `shopPreview.ts` 内容删 → 仅 re-export + `__test` 合并
  - [ ] 5.2 commit：`refactor(shop): convert shopPreview to facade`

- [ ] **Task 6：清理拆分浮现的死代码（AC: 9）**
  - [ ] 6.1 拆分后某些 internal helper 暴露成 cross-module export，不必要的去掉
  - [ ] 6.2 commit：`chore(shop): cleanup post-split dead exports`

- [ ] **Task 7：facade 兼容性单测（AC: 6）**
  - [ ] 7.1 新建 `tests/unit/ui/shopPreviewFacade.test.ts`，~50 行
  - [ ] 7.2 验证关键 export 路径

- [ ] **Task 8：tsc + 全套测试 + 手动验证（AC: 7, 8, 10）**

## Dev Notes

### 模块依赖图

```
shopBootstrap (lifecycle + DOM 注入)
  ├── shopTerminal (cmd + 渲染)
  │     └── shopState
  ├── shopWorkbench (拖拽 + drawer)
  │     └── shopState
  └── shopState (mutable state)

shopPreview (facade)
  └── re-export from shop/*
```

### 跨模块协调 callback 模式

terminal 不该直接调 workbench（avoid coupling）：

```ts
// shopBootstrap.ts
import { setOnSwitchToWorkbench } from './shopTerminal'
import { syncWorkbenchInbox } from './shopWorkbench'

setOnSwitchToWorkbench(() => {
  syncWorkbenchInbox()
  showOnly('workbench')
})
```

### Risks

- **风险 A：模块拆分发现未预期的循环依赖** —— 缓解：先做 Task 1 shopState（无依赖），跑测试 → 再 Task 2 terminal → 再 Task 3 workbench → 最后 bootstrap。逐层增加确认。
- **风险 B：`__test` API 跨模块拆分后聚合困难** —— 缓解：每个新模块 export 自己的 `_test` 子集，facade `__test = { ...terminal._test, ...workbench._test, ...bootstrap._test, ...state._test }`
- **风险 C：测试套硬编码 `from '../../../src/ui/shopPreview'`** —— 缓解：facade 100% 兼容旧 import 路径，0 测试改动
- **风险 D：模块拆分后浏览器实际行为破坏** —— 缓解：Task 1-5 每个 commit 后都跑手动 smoke + 全套测试

### References

- [Source: docs/implementation-artifacts/60-14-module-split-i18n.md（原合并 spec）] — 已拆为 60-14 / 60-15 / 60-16
- [Source: src/src/ui/shopPreview.ts] — 2548 行待拆

## Dev Agent Record

### Agent Model Used

claude-opus-4-7[1m]

### Debug Log References

### Completion Notes List

- Story 创建于 2026-04-29，Epic 60 P2.4 第 3 项 / Epic 60 收官
- 等 60-14（死代码）+ 60-15（i18n）都完成后开始
- **Epic 60 完成后 14/14 → 15/15 → 16/16**（拆分后 Epic 总 story 数从 14 升到 16）

### File List
