# Story 37.2: 辅助函数（getRelicIndex）

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 开发者,
I want 一个 `getRelicIndex(relicId)` 辅助函数将遗物 ID 转换为 HUD 图标索引,
so that 后续 Story 37-3~37-5 可以通过遗物 ID 定位图标元素，作为飞行动画和闪光连线的起点.

## Acceptance Criteria

1. **函数实现** — `getRelicIndex(relicId: string): number` 在 `battle.ts` 中可用，返回遗物在 `state.player.relics`（Set）中的插入顺序索引
2. **索引与渲染一致** — 返回值与 `renderRelicDisplay()` 中 `[...state.player.relics]` 的索引一致，即 `getElements().playerRelics.children[index]` 就是该遗物的图标元素
3. **未持有遗物返回 -1** — 若玩家未持有该 relicId，返回 -1
4. **模块私有** — 函数不加 `export`，仅在 `battle.ts` 内部使用（与 `flashRelicLine` 同级）
5. **插入位置** — 放在 `flashRelicLine` 函数之前，与闪光连线系统同区块
6. **编译通过** — `npm run build` 无新增错误

## Tasks / Subtasks

- [x] Task 1: 实现 `getRelicIndex` 函数 (AC: #1, #2, #3)
  - [x] 1.1 在 `battle.ts` 的 `flashRelicLine` 函数之前添加 `getRelicIndex`
  - [x] 1.2 实现：`return [...state.player.relics].indexOf(relicId);`（Set 转数组后查找，未找到自然返回 -1）
  - [x] 1.3 确认与 `renderRelicDisplay()`（L1987）的 `[...state.player.relics]` 索引转换方式一致

- [x] Task 2: 编译验证 (AC: #4, #5, #6)
  - [x] 2.1 确认函数声明为模块内私有（不加 export）
  - [x] 2.2 运行 `npm run build` 确认编译通过（TS6133 unused warning 预期存在，37-3 开始使用）

## Dev Notes

### 函数签名

```typescript
/** 获取遗物在 HUD 图标列表中的索引，未持有返回 -1 */
function getRelicIndex(relicId: string): number {
  return [...state.player.relics].indexOf(relicId);
}
```

### 关键文件位置与行号

| 文件 | 行号 | 内容 |
|------|------|------|
| `src/src/systems/battle.ts` | L1987-2011 | `renderRelicDisplay()` — 用 `[...state.player.relics]` 渲染图标 |
| `src/src/systems/battle.ts` | L2197-2199 | `getRelicIndex()` — 新增辅助函数 |
| `src/src/systems/battle.ts` | L2201-2231 | `flashRelicLine()` — 通过 `el.playerRelics.children[relicIndex]` 获取图标 |
| `src/src/systems/battle.ts` | L2234 | `clearFlashLines()` |
| `src/src/core/state.ts` | L67 | `relics: new Set()` — Set\<string\> 类型 |

### 插入位置

`flashRelicLine` 函数之前（~L2197），与闪光连线系统同区块。顺序为：

```
getRelicIndex()    ← 新增
flashRelicLine()   ← 已有（Story 37-1）
clearFlashLines()  ← 已有（Story 37-1）
clearFloatQueue()  ← 已有
```

### Set 索引一致性说明

`Set` 保持插入顺序（ES6 规范）。`[...set]` 展开后索引与 `Set.prototype.forEach` 遍历顺序一致。`renderRelicDisplay()` 使用相同的 `[...state.player.relics]` 转换，因此 `getRelicIndex` 返回的索引天然与 `playerRelics.children[index]` 对应的 DOM 元素匹配。

### 边界

- 仅实现 `getRelicIndex` 一个函数
- 不改 `flashRelicLine` 签名或逻辑
- 不改 `showFeedback` 签名
- 后续 Story 37-3 将首次实际调用此函数

### Project Structure Notes

- `getRelicIndex` 放在 `battle.ts` 内部模块私有，与 `flashRelicLine` / `clearFlashLines` 共享作用域
- 遵循现有模式：`battle.ts` 中的内部辅助函数不 export（如 `flashRelicLine`、`clearFlashLines`）

### References

- [Source: src/docs/epic-relic-feedback-flight.md#Story 2: 辅助函数]
- [Source: src/src/systems/battle.ts#L1987-2011 renderRelicDisplay]
- [Source: src/src/systems/battle.ts#L2197-2199 getRelicIndex]
- [Source: src/src/core/state.ts#L67 relics Set]
- [Source: docs/implementation-artifacts/37-1-flash-line-system.md — 前置 Story 完成记录]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Senior Developer Review (AI)

**Review Date:** 2026-03-14
**Outcome:** Approve
**Issues Found:** 0 High, 0 Medium, 3 Low — All acceptable, no fixes needed

**Notes:**
- [L1] Set spread `[...state.player.relics]` per call: acceptable for max 12 elements, consistent with renderRelicDisplay pattern
- [L2] Epic spec changes not in File List: correctly scoped to epic discussion, not 37-2
- [L3] JSDoc complete and accurate

### Debug Log References

- TS6133 warning for `getRelicIndex` is expected — function is unused until Story 37-3 integrates it

### Completion Notes List

- Implemented `getRelicIndex(relicId: string): number` in battle.ts L2197-2199
- Placed before `flashRelicLine` in the 闪光连线系统 section
- Uses `[...state.player.relics].indexOf(relicId)` — identical Set expansion as `renderRelicDisplay()` (L1989)
- Module-private (no export), returns -1 for missing relics
- Vite build passes (528ms, 0 new errors)

### Change Log

- 2026-03-14: Implemented getRelicIndex helper function (Story 37-2)

### File List

- `src/src/systems/battle.ts` — Added `getRelicIndex()` function before `flashRelicLine()`
- `docs/implementation-artifacts/sprint-status.yaml` — Status tracking updates
