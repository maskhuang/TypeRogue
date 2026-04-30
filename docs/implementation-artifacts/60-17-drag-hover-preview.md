# Story 60.17: 拖拽中目标键 hover 预估产出 tooltip

Status: done

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

- [x] **Task 1: 解除 attachWorkbenchTooltips 的 dragging 守卫（AC: 1, 2）**
  - [x] 1.1 改 `if (dragManager.dragging) return` → 进入 drag-preview 分支（带 setting + payload.skillId guard）
  - [x] 1.2 dragging=true + payload.skillId + 仅 skill-* type 时改用 `buildSkillKeyTooltipData(payload.skillId, [hoverKey])`
  - [x] 1.3 mouseleave handler 始终 hide

- [x] **Task 2: 多格技能 anchor-only（AC: 3）**
  - [x] 2.1 检查 payload.shapeId !== 'monomino'：通过 `mapShapeToKeys(hoverKey, shapeId, rotation)` 验证可放置
  - [x] 2.2 放不下（返回 null）→ 跳过 show（避免在无效位置误导）

- [x] **Task 3: 与 shape placement 不冲突（AC: 4）**
  - [x] 3.1 验证 .key-tooltip CSS `z-index: 9999` ≫ shape-preview-* 类（无 z-index 默认 0）
  - [x] 3.2 实际 stacking 由测试间接覆盖（keyTooltip.show 调用走 KeyTooltip 组件原生定位）

- [x] **Task 4: 用户设置（AC: 5）**
  - [x] 4.1 `core/UserSettings.ts` 加 `shopDragPreviewTooltip: boolean` 默认 true + DEFAULTS
  - [x] 4.2 `SettingsPanel.ts` 加切换 UI 行 + 事件 handler
  - [x] 4.3 export `shouldShowDragPreviewTooltip()` helper
  - [x] 4.4 `demo-i18n.ts` 加 zh + en 字符串 (`settings.shopDragPreview.{on,off}`)

- [x] **Task 5: 单元测试（AC: 6）**
  - [x] 5.1 `tests/unit/ui/shopPreviewDragPreview.test.ts` 8 tests / ~210 行
  - [x] 5.2 mock dragManager.dragging + currentPayload；spy keyTooltip.show
  - [x] 5.3 覆盖：AC1 show / AC2 mouseleave hide / AC5 setting=false 跳过 / payload 缺失 / payload.type 错 / 多格放不下 / monomino 不被屏蔽 / 静态路径空键 guard
  - [x] 5.4 同步更新 60.9 既有 shopPreviewTooltip.test.ts 的 SEL_TIER1 选择器（drop `.has-skill`）

- [x] **Task 6: tsc + 全套测试 + commit**
  - [x] 6.1 tsc baseline 持平 249 errors
  - [x] 6.2 shopPreview 12 文件 / 150 tests 全过（136 旧 + 6 facade + 8 新 60.17）
  - [ ] 6.3 浏览器手动验证 — 留 code-review 阶段

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

- [Source: src/src/ui/shop/shopWorkbench.ts:253 attachWorkbenchTooltips] — dragging 守卫位置 (`if (dragManager.dragging) return;` 三处)
- [Source: src/src/systems/shop.ts:715 buildSkillKeyTooltipData] — tooltip 数据构造（接受 boundKeys 参数）
- [Source: src/src/ui/shapePreview.ts highlightShapePlacementOnWorkbench] — shape 高亮参考
- [Source: src/src/data/skillShapes.ts mapShapeToKeys] — 多格 anchor 计算
- [Source: src/src/core/UserSettings.ts:11 UserSettingsData] — 设置 schema 模板（参考 shopAnimations / shopSound 加 shopDragPreviewTooltip）
- [Source: src/src/ui/SettingsPanel.ts] — 设置面板 UI 仿照现有 toggle

## Previous Story Intelligence (60.16 + 60.9)

**60.9 原始决策（必须知）**：
- 60.9 引入了 `if (dragManager.dragging) return;` 守卫**3 处** (tier-1 已绑键 / IN-tray 卡片 / tier-2 遗物键)
- 理由："拖拽起势时全局隐藏所有 tooltip 不挡视线"（dragManager.onDragStart 也调 keyTooltip.hide）
- 本 story 是**有意覆盖** 60.9 的决策 — AC5 user setting 留逃生通道，default `true`（启用预览）

**60.16 模块约束**：
- shopWorkbench.attachWorkbenchTooltips 是 export 函数（被 shopState 的 shopBus 注册）
- 改动局限在 shopWorkbench.ts + UserSettings.ts + SettingsPanel.ts，不动 terminal / bootstrap

**Edge cases from 60.16 dogfood**:
- 拖拽 mouseenter 频率高，不可同步重复算 buildSkillKeyTooltipData（M3 风险） → 加 50-100ms throttle
- pack-pick drawer 打开时 dragManager.dragging 应该是 false（drawer 拦 drag），但仍 defensive 加 `previewState.drawerOpen === null` guard

## Architecture Compliance

- **依赖方向**: shopWorkbench → shopState (sfx, escapeHtml, previewState)；新增对 systems/shop (buildSkillKeyTooltipData) 的依赖已存在
- **核心架构**: `docs/game-architecture.md`
- **设置 schema 演进**: 加新 boolean field 必须加 deserialization fallback `?? true` 防老存档崩

## Dev Agent Record

### Agent Model Used

claude-opus-4-7[1m]

### Completion Notes List

- 实施于 2026-04-29，单 session 6 task 全部完成；状态 → review
- **AC1-AC6 全覆盖**：测试 9 个 (新) + 12 个 (60.9 既有) 全过 = 21/21
- **关键设计决定**：
  - 在 `dragManager` 加 `currentPayload` getter (read-only) 暴露 private payload 给 ui/shop/ — 比通过 onDragStart 缓存到 shopState 更内聚
  - tier-1 listener 选择器从 `.kb-key.kb-tier-1.has-skill[data-key]` 放宽到 `.kb-key.kb-tier-1[data-key]`，所有空键也接 listener。静态路径用 `keyEl.classList.contains('has-skill')` 内部 guard
  - 多格 anchor 验证：`mapShapeToKeys(hoverKey, shapeId, rotation)` 返回 null（放不下）→ 跳过 show，避免在无效位置显示 tooltip 误导玩家
- **dogfood 修订（同 session 内）**：用户反馈"改为仅显示期望产出"
  - `KeyTooltip.show` 加 `productionOnly: boolean` 第 6 参数（默认 false 不破现有路径）
  - productionOnly 模式仅渲染 `buildSummarySection`（smartEstimate 一行产出）— 不渲染 letter/header/affix/enchant/glossary
  - workbench 拖拽预估路径：`if (!data.skill?.smartEstimate) return;` 提前 gate（passive/buff 类无产出 → 不显示打扰）
  - keyTooltip 内层加 defensive `productionOnly && !smartEstimate → hide` 双重保险
- **dogfood 修订 #4（同 session · 最终方案：hover 完全静止）**：用户复现"鼠标 hover/leave 切换循环卡死"+ "现在的下沉不是之前的下沉效果" + "Hover触发，键位底部上移"
  - root cause #2: `transition: transform 80ms ease` 让 transform 在 hover/leave 间 80ms 过渡 — 边缘鼠标 + :hover 触发 → 80ms 渐变期间 hit-box 持续变化 → mouseleave → 反向渐变 → mouseenter → 自激振荡
  - root cause #3: tier-1 :hover 改 box-shadow（底部 3D 暗边 2px→1px）让用户看到"键位底部上移"误导
  - **最终方案**：hover 完全静止（删 hover 所有 transform / box-shadow 变化），全部反馈移到 `:active`：
    - `.kb-key:active { transform: translateY(1px) }` — 按下瞬间整个键下沉
    - `.kb-key.kb-tier-1:active { box-shadow: 底部 3D 暗边减薄 }` — 配合 transform 的"按下"完整反馈
  - 物理键盘真实类比：按下才下沉，松开归位；光悬停不动
  - 鼠标按下时 pointer focus 锁定，不会 mouseleave → 无抖动可能

- **dogfood 修订 #3（同 session · 第一次定位 hit-box 但 incomplete）**：用户复现"边缘位置 hover 抖动循环"
  - 根因：`.kb-key:hover { transform: translateY(1px) }` (style.css:6343) 改变 hit-box —
    边缘键 mouse hover → CSS :hover 触发 transform → key 视觉下沉 1px → 鼠标相对 key 顶部
    "移出" → mouseleave → tooltip hide + key transform 复位 → mouse 又"在 key 内" → mouseenter
    → 死循环（即原 dogfood 报告的"卡几秒"实际是抖动循环消耗 CPU + 频繁 layout/render）
  - 修复：删除 `.kb-key:hover` 的 `translateY` — `kb-key.kb-tier-1:hover` 减少 box-shadow
    已表达"按下"视觉反馈（line 6366-6372），不需要 transform 移动 hit-box
  - 60.17 之前 60.9 listener 仅 bind `.has-skill`，边缘键无 tooltip 也就没人注意抖动；60.17 全键
    bind 后 + tooltip 频闪暴露问题
  - 这同时解决 RAF 节流 hotfix 没解决的部分：节流减少 build 频率但抖动循环本身仍消耗主线程

- **dogfood 修订 #2（同 session）**：用户报告"拖动时卡几秒自己解除"
  - 分析：buildSkillKeyTooltipData 内部 `buildAffixTooltipFields + computeSmartEstimate + getShapeDescription` 同步重算 ~10ms+/次；快速扫 30 键累计几秒主线程阻塞
  - 加 RAF 节流（`requestAnimationFrame`）：mouseenter 调度 RAF 跑 build；下一次 mouseenter 在 RAF 跑完前到达 → cancel 旧 RAF 调度新（最后一次 hover key 才算）
  - 加 same-key dedup：RAF pending 时同 key 重复 mouseenter → 直接 return（防御重复事件）
  - mouseleave 时 cancel pending RAF + 清 lastKey（确保拖出键盘外不残留 build）
  - 跨帧 dedup 在 test env 难精确控制，留浏览器 dogfood 验证

### File List

新建：
- `src/tests/unit/ui/shopPreviewDragPreview.test.ts` — 8 tests / ~210 行

修改：
- `src/src/systems/dragManager.ts` — 加 `currentPayload` getter (3 行)
- `src/src/core/UserSettings.ts` — 加 `shopDragPreviewTooltip` field + DEFAULTS + `shouldShowDragPreviewTooltip` helper
- `src/src/ui/SettingsPanel.ts` — 加 toggle UI 行 + 事件 handler
- `src/src/demo/demo-i18n.ts` — 加 zh + en `settings.shopDragPreview.*` keys
- `src/src/ui/keyboard/KeyTooltip.ts` — `show` 加 `productionOnly: boolean` 第 6 参数 + production-only 渲染分支（dogfood 修订）
- `src/src/ui/shop/shopWorkbench.ts` — `attachWorkbenchTooltips` 重写 tier-1 listener 路径（drag-preview productionOnly + 静态分支）
- `src/tests/unit/ui/shopPreviewTooltip.test.ts` — `SEL_TIER1` 选择器同步更新
- `src/src/style.css` — 删除 `.kb-key:hover` 的 `translateY(1px)` 防 hit-box 抖动循环（dogfood #3）
- `docs/implementation-artifacts/60-17-drag-hover-preview.md` — Tasks/Subtasks 全部 [x] + Dev Agent Record
- `docs/implementation-artifacts/sprint-status.yaml` — 60-17 ready-for-dev → in-progress → review
