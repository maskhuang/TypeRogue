# Story 60.17: 拖拽中目标键 hover 预估产出 tooltip

Status: backlog

<!-- Epic 60-Followup · 优先级 P1（最高频 dogfood 痛点） -->
<!-- Source: Story 60.16 code-review 完成后用户 dogfood 反馈 -->

## Story

As a **打字商店玩家**,
I want **拖着技能在键盘上找最佳位置时，hover 不同候选键能预览"如果绑这里产出 X"的 tooltip**,
so that **不用先放下试一遍再改 — 比对各键预估产出后一次落键到位**.

## 背景

Story 60.9 (`workbench-hover-tooltips`) 实现了静态 hover tooltip — 显示已绑键 / IN-tray 卡片 / 数字键遗物的详情。但其 `attachWorkbenchTooltips` 显式守卫：

```ts
keyEl.addEventListener('mouseenter', (e: MouseEvent) => {
  if (dragManager.dragging) return;  // ← Story 60.9 屏蔽拖拽中 tooltip
  ...
})
```

理由是"拖拽时全局隐藏所有 tooltip 不挡视线"。但 Story 60.16 done 后 dogfood 显示**寻找最佳键位时反而需要**比对各键预估 — 当前必须先落键 → hover → 不满意 → 卸下 → 重试。

## Acceptance Criteria

1. **AC1：拖拽中 hover tier-1 letter key → 显示预估 tooltip** —— `dragManager.dragging === true` 且 `dragManager.payload.skillId` 存在时，hover 任何 `.kb-key.kb-tier-1[data-key]` 触发 `keyTooltip.show` 显示该 skill 在该 key 的预估产出（基础 baseValue + 资源 + level，复用 `buildSkillKeyTooltipData`）

2. **AC2：拖拽离开键 → tooltip 消失** —— mouseleave 触发 `keyTooltip.hide`

3. **AC3：多格技能拖拽时仅在 anchor key 显示** —— 多格 tetromino 拖拽时 hover 形状的"主键"(anchor) 显示 tooltip，hover 形状内其他 cell 不重复显示（避免 N 个 tooltip 抖动）

4. **AC4：tooltip 不与 shape placement 高亮冲突** —— Story 60.1 的 `highlightShapePlacementOnWorkbench` 已显示形状灰影，本 story 的 tooltip 在灰影顶部 z-index 显示

5. **AC5：用户可在设置中关闭** —— `UserSettings.shopDragPreviewTooltip: boolean` 默认 `true`；关闭则恢复 60.9 的"拖拽中无 tooltip"行为

6. **AC6：单元测试覆盖** —— 模拟 dragManager.dragging=true + payload，断言 hover 触发 tooltip.show；AC5 关闭后断言不触发

## Tasks / Subtasks

- [ ] **Task 1: 解除 attachWorkbenchTooltips 的 dragging 守卫（AC: 1, 2）**
  - [ ] 1.1 改 `if (dragManager.dragging) return` → `if (dragManager.dragging && !shouldShowDragPreview()) return`
  - [ ] 1.2 dragging=true + payload.skillId 存在时改用 `buildSkillKeyTooltipData(payload.skillId, [keyEl.dataset.key!])`（boundKeys 用 hover key 做"假设绑这里"上下文）
  - [ ] 1.3 mouseleave handler 始终 hide

- [ ] **Task 2: 多格技能 anchor-only（AC: 3）**
  - [ ] 2.1 检查 payload.shapeId !== 'monomino'：仅当 hover key 是 shape anchor 才显示
  - [ ] 2.2 通过 `mapShapeToKeys(payload.shapeId, payload.rotation, hoverKey)` 算 anchor，对比 hoverKey

- [ ] **Task 3: 与 shape placement 不冲突（AC: 4）**
  - [ ] 3.1 验证 keyTooltip CSS z-index 高于 .shape-preview-ghost
  - [ ] 3.2 浏览器手动验证

- [ ] **Task 4: 用户设置（AC: 5）**
  - [ ] 4.1 `core/UserSettings.ts` 加 `shopDragPreviewTooltip: boolean` 默认 true
  - [ ] 4.2 `SettingsPanel` 加切换 UI
  - [ ] 4.3 export `shouldShowDragPreviewTooltip()` helper

- [ ] **Task 5: 单元测试（AC: 6）**
  - [ ] 5.1 `tests/unit/ui/shopPreviewDragPreview.test.ts` ~50 行
  - [ ] 5.2 mock dragManager.dragging + payload；spy keyTooltip.show
  - [ ] 5.3 验证设置 false 时不触发

- [ ] **Task 6: tsc + 浏览器手动验证 + commit**

## Dev Notes

### 关键调用链

```
mouseenter on .kb-key.kb-tier-1
  → check dragManager.dragging + dragManager.payload?.skillId
  → if dragging:
      data = buildSkillKeyTooltipData(payload.skillId, [hoverKey])  // hover key as boundKeys context
    else:
      (existing 60.9 path - bound skill / inbox card)
  → keyTooltip.show(x, y, data)
```

### Risks

- **60.9 原始顾虑可能成立**：拖拽中频繁 mouseenter→show→mouseleave→hide 导致 tooltip 闪烁 → 加 100ms throttle/debounce
- **`buildSkillKeyTooltipData` 当前接受 boundKeys[] 假设技能"已绑这里"** — 拖拽预览语境是"假设要绑"，语义略不同；可能需要新增 `buildSkillKeyTooltipDataPreview(skillId, hoverKey)` 变体
- **多格技能 anchor 计算** 需要 `mapShapeToKeys` (data/skillShapes.ts)，已在 Story 60.1 用过，复用即可

### References

- [Source: src/src/ui/shop/shopWorkbench.ts:253 attachWorkbenchTooltips] — dragging 守卫位置
- [Source: src/src/systems/shop.ts:715 buildSkillKeyTooltipData] — tooltip 数据构造
- [Source: src/src/ui/shapePreview.ts highlightShapePlacementOnWorkbench] — shape 高亮参考

## Dev Agent Record

(to be filled by implementing dev)
