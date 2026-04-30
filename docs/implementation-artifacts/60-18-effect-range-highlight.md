# Story 60.18: 范围技能影响半径键盘高亮

Status: ready-for-dev

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

- [ ] **Task 1: 邻接计算复用 + radius helper（AC: 1, 6）**
  - [ ] 1.1 `src/src/ui/shop/shopWorkbench.ts` 加 `getEffectRadiusKeys(skillId, hoverKey): string[]`
  - [ ] 1.2 复用 `keyboardAdjacencyMap` (Story 2.1)
  - [ ] 1.3 词条类型决定半径：splash/relay/aura = adjacent 8；amplify/war_drum = adjacent 4 (待与 game design 确认)

- [ ] **Task 2: setupDragZones 注册 onDragEnter（AC: 1, 2, 3, 4）**
  - [ ] 2.1 当前 `onDragEnter: (p) => highlightShapePlacementOnWorkbench(key, p)` 扩展
  - [ ] 2.2 if payload.shapeId === 'monomino' && skill 含范围词条 → 调 `highlightEffectRadius(key, p)`
  - [ ] 2.3 if shapeId !== 'monomino' → 仅 shape highlight (AC3 优先级)
  - [ ] 2.4 onDragLeave 清两种 class

- [ ] **Task 3: CSS（AC: 5）**
  - [ ] 3.1 `src/src/styles/shopPreview.css` 加 `.kb-key.effect-radius-preview` 描边样式
  - [ ] 3.2 与 `.shape-preview-ghost` 不冲突（z-index / outline 而非 background）

- [ ] **Task 4: 单元测试（AC: 7）**
  - [ ] 4.1 `tests/unit/ui/shopPreviewEffectRadius.test.ts` ~80 行
  - [ ] 4.2 mock dragManager + payload (splash skill)
  - [ ] 4.3 模拟 hover → 验证邻接 keys 拿到 class

- [ ] **Task 5: 浏览器手动验证 + commit**
  - [ ] 5.1 splash / echo / aura / relay / war_drum / conduit / amplify 各拖一次验证

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

(to be filled by implementing dev)

### File List

(待实施时填)
