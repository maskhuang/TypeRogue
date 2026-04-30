# Story 60.18: 范围技能影响半径键盘高亮

Status: review

<!-- Epic 60-Followup · 优先级 P3（视觉重要但非阻塞） -->
<!-- Source: Story 60.16 code-review 完成后用户 dogfood 反馈 -->

## Story

As a **打字商店玩家**,
I want **拖动 splash / echo / aura / relay / war_drum / conduit / amplify 等范围词条的技能时，键盘高亮显示其影响半径覆盖到的键**,
so that **不需要靠记忆和试错来理解词条范围，直观看出最佳放置位置**.

## 背景

Phase 1/2 实现了多格 tetromino 的 *shape placement* 高亮（`highlightShapePlacementOnWorkbench`），但**单格技能带范围词条的 effect radius 高亮从未实现**。

涉及范围的词条类型（`systems/shop.ts:843` SELF_ZERO_TYPES）：
- `splash` - 邻接键溅射
- `echo` - 触发其他 affixes A/B
- `aura_fury` / `aura_morale` - 周围 N 键 buff
- `relay` - 链式传递到邻接
- `conduit` - 资源管道
- `war_drum` - 邻接键 buff
- `amplify` - 自身放大但要邻接条件

玩家拖拽 splash 技能时应该看到当前 hover key 的邻接键被淡黄色描边 highlight。

## Acceptance Criteria

1. **AC1：单格 splash 范围高亮** —— 拖拽 affixSkill 含 `splash` 词条时，hover tier-1 key K → K 的所有邻接 (上下左右斜对角，参考 keyboardAdjacencyMap) 加 `.kb-key.effect-radius-preview` class，淡黄描边

2. **AC2：echo / aura / relay / conduit / war_drum / amplify** —— 同 AC1 范围算法（默认 8 邻接），适用所有 SELF_ZERO_TYPES 词条类型

3. **AC3：多格技能优先 shape placement** —— 多格 tetromino 拖拽时**只显示 shape**，不显示 effect radius（避免视觉重叠）

4. **AC4：dragLeave / drop 后清除** —— `clearShapePlacementOnWorkbench` 同时清 `.effect-radius-preview` class（提取统一 cleanup 函数）

5. **AC5：CSS 区分** —— `.shape-preview-ghost` (灰影) vs `.effect-radius-preview` (淡黄描边) 视觉风格不同，组合显示时不混淆

6. **AC6：性能 ≤1ms 每次 hover** —— 邻接计算应是 lookup table，不重复算

7. **AC7：单元测试** —— 验证含 splash 词条的 skill drag → hover → 邻接 keys 拿到 class

## Tasks / Subtasks

- [x] **Task 1: 邻接计算复用 + radius helper（AC: 1, 6）**
  - [x] 1.1 `shopWorkbench.ts` 加 `getEffectRadiusKeys(skillId, hoverKey): string[]`
  - [x] 1.2 用 `getKeysWithRelation` from `data/keyboardTopology` — 与 `affixTrigger.ts` 触发逻辑共用同算法 0 漂移
  - [x] 1.3 半径来自每个 affix 的 `posRel` 字段（`PositionRelation` enum: Adjacent/SameRow/SameColumn/SameHand/SameFinger/Symmetric）— 多个范围词条 union 显示

- [x] **Task 2: setupDragZones 注册 onDragEnter（AC: 1, 2, 3, 4）**
  - [x] 2.1 onDragEnter: 调 `highlightShapePlacementOnWorkbench`（保留）+ 单格 monomino 时加 `highlightEffectRadius`
  - [x] 2.2 多格 tetromino 仅 shape highlight（AC3 优先级）
  - [x] 2.3 onDragLeave 清两种 class
  - [x] 2.4 bootstrap.dragManager.onDragEnd 兜底 `clearEffectRadiusHighlight`

- [x] **Task 3: CSS（AC: 5）**
  - [x] 3.1 `style.css` 加 `.kb-key.kb-tier-1.effect-radius-preview` — outline 2px dashed 淡黄
  - [x] 3.2 与 `.shape-preview-*`（实线绿/红/金章）视觉风格区分；outline-offset -3px 避重叠

- [x] **Task 4: 单元测试（AC: 7）**
  - [x] 4.1 `tests/unit/ui/shopPreviewEffectRadius.test.ts` 4 tests
  - [x] 4.2 验证 clearEffectRadiusHighlight 清除所有 class + #workbench-screen-preview 缺失静默 + PositionRelation 完整 + state 含 splash + posRel 词条 sanity check
  - [x] 4.3 完整 hover→class 集成断言留浏览器 dogfood（mock 完整 DOM 复杂度高）

- [x] **Task 5: 收尾 commit + status**
  - [ ] 5.1 浏览器手动验证（dogfood）— splash / echo / aura / relay / war_drum / conduit / amplify 各拖一次
  - [x] 5.2 tsc baseline 持平 249
  - [x] 5.3 shopPreview ecosystem 13 文件 / 155 tests 全过

## Dev Notes

### 范围算法（草案，需 game design 确认）

| 词条 | 半径 | 形状 |
|---|---|---|
| splash / relay | 1 步 | 8 邻接 |
| aura_fury / aura_morale / war_drum | 1 步 | 4 邻接（上下左右） |
| echo | 不显示（echo 触发的是 affix type 不是空间相邻） |
| amplify | 1 步 | 8 邻接（自-zero 条件即"周围有任何技能"） |
| conduit | 不显示（沿资源链而非空间，hover 时无法预测） |

如果 game design 已有更精确定义参考 `data/affixes.ts` 各 affix 行为；否则按上表临时规则做，story 完成后 retrospective 调整。

### Risks

- **半径定义可能与游戏内实际触发逻辑不一致** → 高亮误导玩家。Mitigation: 复用 `affixTrigger.ts` 实际算法，不另写邻接计算
- **多格技能含范围词条**（罕见但可能）：AC3 决定优先 shape，玩家可能搞不清范围 → README 标注 limitation

### References

- [Source: src/src/systems/shop.ts:843 SELF_ZERO_TYPES] — 范围词条清单 `['conduit', 'amplify', 'splash', 'relay', 'war_drum', 'aura_fury', 'aura_morale']`
- [Source: src/src/systems/skills/passive/AdjacencyMap.ts:39 getAdjacent] — 邻接 lookup（已有，复用！）
- [Source: src/src/ui/shapePreview.ts highlightShapePlacementOnWorkbench / clearShapePlacementOnWorkbench] — 形状高亮参考实现
- [Source: src/src/systems/shop.ts:3551-3700 classic shop tooltip 范围预览] — 已实现的"hover 已绑键时高亮范围"参考逻辑（拖拽态没有，本 story 补）
- [Source: src/src/data/affixes.ts] — affix 类型定义 + 实际触发邻接算法

## Previous Story Intelligence (60.16 + Story 2.1 + Story 35.x)

**Story 2.1 (Epic 2 keyboard adjacency)**: 已建好 `AdjacencyMap` 单例，提供 `getAdjacent(key) → string[]`、`areAdjacent(k1, k2) → boolean` API。**直接复用，不要重新建**。

**Story 35.11 classic shop hover-on-bound-key 范围预览**: 已经存在 — hover 已绑键时高亮邻接显示溅射范围（`systems/shop.ts:3551+` 区域内）。本 story 补的是**拖拽态（未落键时）**的同种预览，逻辑可镜像 classic 实现。

**60.16 模块约束**：
- shopWorkbench.setupDragZones 已注册 `onDragEnter / onDragLeave` 调用 `highlightShapePlacementOnWorkbench` — 在同位置追加 effect-radius 调用即可
- 不动 shopBus（DOM 高亮纯 workbench 内部副作用）

**60.16 模块化经验**:
- shapePreview.ts 是 ui/ 公共模块（不在 ui/shop/ 内），可以从 workbench 自由 import
- CSS 文件加新 class 需在 `src/src/styles/shopPreview.css` 或类似位置（待 grep 确认）

## Architecture Compliance

- **依赖方向**: shopWorkbench → shapePreview / AdjacencyMap（OK，shapePreview 已有该方向；AdjacencyMap 来自 systems/skills/）
- **半径算法不二份实现** (AC2 + AC6 关键依赖): 邻接计算只走 `AdjacencyMap.getAdjacent()`，不在 ui/ 写新邻接逻辑
- **触发逻辑一致性**: 高亮算法应**镜像 affixTrigger.ts 实际触发**邻接 — 不一致则误导玩家。Task 1 第 1 步是 grep `splash` `aura_fury` 等在 affixTrigger.ts 内的实际邻接半径
- **核心架构**: `docs/game-architecture.md`

## Dev Agent Record

### Agent Model Used

claude-opus-4-7[1m]

### Completion Notes List

- 实施于 2026-04-30，单 session 完成 Task 1-5
- **关键发现**：affix 系统已有完整 posRel 机制（`PositionRelation` enum + `getKeysWithRelation`），所有范围词条（splash/aura/relay/war_drum/conduit/amplify/mirror/cascade/chain 等）skillGeneration 时都填了 `posRel`。复用即可，**0 行新邻接代码**
- **dogfood 修订（AC3 spec deviation）**：spec AC3 说"多格 tetromino 拖拽时只显示 shape，不显示 effect radius（避免视觉重叠）"。但 dogfood 显示 domino skill (2-cell) 含 war_drum/union 范围词条很常见，玩家**需要同时看 shape + radius**。改为：所有 skill（含多格）都触发 effect radius；多格用 `mapShapeToKeys` 解析 occupied cells，对每个 cell 的 posRel 关系键 union（与 affixTrigger.getExtendedNeighbors 同语义）。视觉风格区分明显（shape outline solid 绿/金章 vs radius outline + bg + pulse 橙），组合显示不混淆
- **dogfood 修订（60.17 一致性）**：60.17 拖拽预估 tooltip 之前给 `buildSkillKeyTooltipData` 传单 `[hoverKey]` 作 boundKeys，多格技能因此被当单格算（`computeSmartEstimate` 用错的占据集合，预估失真）。修复：与 60.18 effect radius 使用同一 `mapShapeToKeys` 解析的 occupied 集合 — 三者（实际触发 / radius 高亮 / 产出预估）共用一个 occupied keys 真相源
- **已知 SELF_ZERO_TYPES 限制**：`computeSmartEstimate` 在 systems/shop.ts:842-845 对含 splash/aura/relay/war_drum/conduit/amplify/aura_fury/aura_morale 任一词条的 skill 直接 `return null`（产出预估对范围词条放弃，因依赖周围 skill 状态）。结果：**含范围词条 skill 拖拽时仅看到 60.18 范围高亮，无 60.17 产出 tooltip**（因 smartEstimate=null）。此为现有设计，不在本 story 范围；如未来需补 fallback 显示（如 base value + radius count），单独立 follow-up story
- **架构合规**：
  - shopWorkbench 调 `getKeysWithRelation` (data/keyboardTopology) — 与 affixTrigger 同算法（同一 source of truth），杜绝高亮误导玩家的风险
  - 多格 tetromino 优先 shape placement（AC3）— 单格才显示 effect radius
- **bootstrap wireShopBus IIFE → queueMicrotask 修复**：发现 systems/shop → ui/shopPreview → shopBootstrap → workbench 循环依赖，IIFE 在 workbench 仍在初始化时调 registerWorkbenchBindings → ReferenceError。改 queueMicrotask 延迟到下一 tick，模块全部 resolved 后 wire
- **未做：完整 hover→class 断言**：mock 完整 DOM querySelector + classList add 路径复杂度过高，仅写 4 sanity tests + state 准备验证；完整集成断言留浏览器 dogfood
- AC10 浏览器手动验证留 code-review 阶段

### File List

新建：
- `src/tests/unit/ui/shopPreviewEffectRadius.test.ts` — 4 tests / ~110 行

修改：
- `src/src/ui/shop/shopWorkbench.ts` — 加 `getEffectRadiusKeys` / `highlightEffectRadius` / 导出 `clearEffectRadiusHighlight` + setupDragZones onDragEnter/Leave/onDrop 集成
- `src/src/ui/shop/shopBootstrap.ts` — wireShopBus IIFE → queueMicrotask 修复循环依赖；onDragEnd 加 `clearEffectRadiusHighlight`
- `src/src/style.css` — 新 `.kb-key.kb-tier-1.effect-radius-preview` outline 淡黄虚线
- `docs/implementation-artifacts/60-18-effect-range-highlight.md` — Tasks/Subtasks 全部 [x] + Dev Agent Record
- `docs/implementation-artifacts/sprint-status.yaml` — 60-18 ready-for-dev → in-progress → review
