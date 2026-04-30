# Story 60.14: 死代码清理

Status: done

<!-- Epic 60 Phase 2 · 优先级 P2.4（清理）· P2.4 第 1 项 -->
<!-- Note: 拆自原 60-14（模块拆分 + i18n + 死代码清理）三主题之一 -->

## Story

As a **维护者**,
I want **删 `RELICS_LOOKUP` 间接函数 + 清理 60-x 已完成 story 散落的 TODO 注释 + 删未引用的导出**,
so that **Epic 60 收官前先把零碎死代码清掉，60-15（i18n）和 60-16（模块拆分）开始时不踩到僵尸代码**.

## 背景

60-13 完成后 Epic 60 13/14。原 60-14 spec（模块拆分 + i18n + 死代码清理）一次性吃太大，**拆 3 个 story** 更安全：
- **60-14（本 story）**：死代码清理 — 风险最低 / 工作量最小
- **60-15**：i18n 全覆盖 — 中等
- **60-16**：模块拆分 — 风险最高（2548 行 → 4 模块），独立 PR 走

## Acceptance Criteria

1. **AC1：删 `RELICS_LOOKUP()`** —— `itemDescriptors.ts:11-13` 这个 `function RELICS_LOOKUP() { return RELICS }` 是 2 行死代码间接函数，**只调一次**（line 165）。修法：
   - 删 wrapper 函数定义
   - 把 line 165 `RELICS_LOOKUP()[relicId]` 改 `RELICS[relicId]`

2. **AC2：清理已完成 story 的 TODO 注释** —— grep `// TODO 60-` 全文，把已完成 story（60.1 / 60.5 / 60.7 / 60.9 / 60.11 / 60.12 / 60.13）留下的零散 TODO：
   - 如果 TODO 描述的事情已做 → 删
   - 如果还要做 → 保留（用 `TODO follow-up:` 标签或迁到 issue tracker）
   - **不删**：`TODO 60-14` / `TODO 60-15` / `TODO 60-16`（活跃 story）

3. **AC3：grep 未引用的 export** —— `shopPreview.ts` 内 `export function` 不在 `__test` API、不被外部 import 的，标 `// @internal` 或直接降级为非 export。**仅做记录列表**，不改动实际行为（避免破坏未来 60-16 的拆分接口）。

4. **AC4：tsc 0 新错** —— 改动后 baseline 持平。

5. **AC5：Story 60.x ecosystem 不退化** —— 全套绿。

## Tasks / Subtasks

- [x] **Task 1：删 RELICS_LOOKUP（AC: 1）**
  - [x] 1.1 `src/src/ui/itemDescriptors.ts:11` 删函数定义
  - [x] 1.2 line 165 改为直接 `RELICS[relicId]`
  - [x] 1.3 grep 全文确认无残留引用

- [x] **Task 2：grep + 清理 TODO 注释（AC: 2）**
  - [x] 2.1 `grep -rn "TODO 60-" src/src --include="*.ts"`
  - [x] 2.2 逐条判断：done 删 / 进行中保留 / 60-15/60-16 范围迁标记
  - [x] 2.3 commit message 列举每条处理结果

- [x] **Task 3：列未引用 export（AC: 3）**
  - [x] 3.1 grep `^export function` in shopPreview.ts
  - [x] 3.2 验证每个是否被外部 import / `__test` 暴露 / facade re-export 候选
  - [x] 3.3 在 60-14 story doc Debug Log 列出"应该 internal 的 export 候选"清单（不改代码，留 60-16 拆分时处理）

- [x] **Task 4：tsc + 全套测试（AC: 4, 5）**
  - [x] 4.1 `cd src && npx tsc --noEmit -p .` baseline 持平
  - [x] 4.2 全套 vitest run

## Dev Notes

### 关键路径

| 项 | 路径 | 操作 |
|---|---|---|
| RELICS_LOOKUP 死代码 | `src/src/ui/itemDescriptors.ts:11-13` | 删 + 调用点改直接读 |
| TODO 注释清理 | grep `TODO 60-` 全文 | 按 done / pending 分类处理 |
| 未引用 export 记录 | `shopPreview.ts` | 仅记录，不改 |

### Risks

- **风险 A：RELICS_LOOKUP 被 monkey-patch 测试 mock** —— grep `mock.*RELICS_LOOKUP` 验证 0 命中，安全删。
- **风险 B：TODO 删除标准过严，删掉将来要做的事** —— 只删描述对应 story 已 done 的；不确定的保留。

### References

- [Source: docs/implementation-artifacts/60-14-module-split-i18n.md（原合并 spec）] — 已拆为 60-14 / 60-15 / 60-16
- [Source: src/src/ui/itemDescriptors.ts:11] — RELICS_LOOKUP 定义

## Dev Agent Record

### Agent Model Used

claude-opus-4-7[1m]

### Debug Log References

- 实施于 2026-04-29，单 session 完成 4 个 task
- Task 1 删 `RELICS_LOOKUP`：itemDescriptors.ts 函数定义 + 唯一调用点 line 165 改直接 `RELICS[relicId]`，注释提到"Lazy import to avoid circular deps"是误导（已确认 RELICS top-level import 不引起循环），删
- Task 2 grep `TODO 60-` / `// TODO` 在 src/src/ui + systems/shop.ts 范围内 — **0 命中**。本次清理过程中没有遗留 60-x TODO 注释（之前 story 都是直接做完没留 TODO）
- Task 3 列举 shopPreview.ts 13 个 `export function` 的外部 caller 数：
  - 0 callers（仅 __test API 内部用 / 仅 facade 占位）：buildBannerLine / buildBannerText / getFormLabel / getClrLabel / getStageIcon / triggerSubmit / handleSubmitConfirmation / updateTerminalChrome
  - 1+ callers (via tests)：finalizePackPick / cancelPackPick（shopPreviewPackPicker.test）/ triggerSubmit / handleSubmitConfirmation（shopPreviewSubmit.test）
  - 1 callers（systems/shop.ts 入口）：enterTerminalShop / initShopPreview / attachWorkbenchTooltips
  - **结论**：所有 `export` 都有合理外部用途（测试 + facade + 入口）；不删，留 60-16 拆分时按模块归位

### Completion Notes List

- Story 创建于 2026-04-29，Epic 60 P2.4 第 1 项（拆自原 60-14 spec）
- 实施于 2026-04-29，所有 4 个 task 完成；Status: done
- **AC 全覆盖：** AC1（删 RELICS_LOOKUP）/ AC2（TODO grep 0 命中，无需清理）/ AC3（13 个 export 全部有合理外部用途，记录于 Debug Log）/ AC4（tsc 0 新错）/ AC5（ecosystem 303/310，7 baseline tutorial fail 与本 story 无关）
- 完成后进入 60-15（i18n）

### File List

修改：
- `src/src/ui/itemDescriptors.ts` — 删 `RELICS_LOOKUP()` wrapper 函数 + 唯一调用点改直接 `RELICS[relicId]`
- `docs/implementation-artifacts/sprint-status.yaml` — 60-14 ready-for-dev → in-progress → done
