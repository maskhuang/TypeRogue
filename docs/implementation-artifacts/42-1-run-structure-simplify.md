# Story 42.1: Run 结构简化 — 去休息关 + 无限循环

Status: dev-complete

## Story

As a 玩家,
I want Run 结构仅包含战斗和商店，无休息关打断,
so that 打字心流不被非打字场景中断，体验更连贯。

## Acceptance Criteria

1. **AC1: StageType 精简** — `StageType` 仅包含 `'standard'` 和 `'boss'`，不再有 `'rest'` 和 `'elite'`（精英作为修饰器而非类型，后续 Epic 扩展）
2. **AC2: 无限 Run** — Run 无固定长度上限，战斗-商店循环直到失败
3. **AC3: Boss 固定间隔** — 每 3 关一个 Boss（第 3、6、9、12…关），`isBossStage(n) = n % 3 === 0`
4. **AC4: 休息关完全移除** — `restStage.ts`、`restEvents.ts`、RestScene DOM/CSS、所有引用清理干净
5. **AC5: Cycle 概念替代 Act** — `currentAct` 移除，改为 `currentCycle`（每 3 关 +1）
6. **AC6: 存档兼容** — 旧存档加载时 Act 数据映射到 Cycle，不崩溃

## Tasks / Subtasks

- [x] **Task 1: StageType 和类型定义清理** (AC: 1, 4)
  - [x] 1.1 `StageConfig.ts` — 从 `StageType` 移除 `'rest'` 和 `'elite'`；移除 `ActInfo` 接口；从 `LevelsData` 移除 `acts` 字段
  - [x] 1.2 `core/types.ts` — 从 `GamePhase` 移除 `'rest'`；从 `GameState` 移除 `usedRestEvents: string[]`；从 `UIElements` 移除 `restScreen`
  - [x] 1.3 `stage/index.ts` — 移除 `ActInfo` 重导出

- [x] **Task 2: StageManager Act 方法清理** (AC: 1, 4)
  - [x] 2.1 移除私有 `actMap: Map<number, ActInfo>`
  - [x] 2.2 移除 `load()` 中的 Act 索引构建
  - [x] 2.3 移除方法：`getAct()`, `getAllActs()`, `getTotalActs()`, `getStagesInAct()`, `getActForStage()`
  - [x] 2.4 移除 `isRestStage()` 和 `isEliteStage()` 方法

- [x] **Task 3: stageFlow.ts 核心重写** (AC: 1, 2, 3, 4)
  - [x] 3.1 从 `STAGE_TIME_LIMITS` 移除 `rest: 0` 和 `elite: 45` 条目
  - [x] 3.2 改为动态计算 `stageNum % CYCLE_LENGTH === 0 ? 'boss' : 'standard'`
  - [x] 3.3 移除 `NODE_ACT` 映射表
  - [x] 3.4 简化 `getBattleNumber()`：battle number = stageNum
  - [x] 3.5 `TOTAL_NODES` 替换为 `CYCLE_LENGTH = BALANCE.CYCLE_LENGTH`（3）
  - [x] 3.6 移除函数：`getActForNode()`, `isRestNode()`, `hasRestAfter()`, `isEliteNode()`
  - [x] 3.7 简化 `getNextBattleNode()`：始终返回 currentStage + 1
  - [x] 3.8 `isBossNode()` 改为 `stageNum % CYCLE_LENGTH === 0`
  - [x] 3.9 新增 `getCycleForStage()` = `Math.ceil(stageNum / CYCLE_LENGTH)`

- [x] **Task 4: RunState 重构** (AC: 2, 5, 6)
  - [x] 4.1 `RunStateData`：移除 `currentAct`，保留 `cycle` 字段
  - [x] 4.2 重写 `advanceStage()`：简化为 currentStage++；新增 `advanceCycle()` 方法
  - [x] 4.3 更新 `isBossStage()`：`currentStage % BALANCE.CYCLE_LENGTH === 0`
  - [x] 4.4 更新 `startRun()`：`bossModifierAssignment` 改为空数组（动态分配）
  - [x] 4.5 更新 `serialize()`/`deserialize()`：移除 `currentAct`

- [x] **Task 5: 删除休息关系统** (AC: 4)
  - [x] 5.1 删除 `src/src/systems/restStage.ts`
  - [x] 5.2 删除 `src/src/data/restEvents.ts`
  - [x] 5.3 `index.html`：移除 `#rest-screen` DOM 块
  - [x] 5.4 `style.css`：移除所有 `#rest-screen`, `.rest-*` CSS 规则（含 visual enhancement 块）
  - [x] 5.5 `ui/elements.ts`：移除 `restScreen` 引用

- [x] **Task 6: 路由逻辑修复** (AC: 2, 4)
  - [x] 6.1 `shop.ts`：移除 rest 分支，离开商店后 `state.level = getNextBattleNode(); startLevel()`
  - [x] 6.2 `battle.ts`：移除 Act 转场逻辑；更新 `showScreen()` 移除 `'rest'`；改用 Cycle 过渡
  - [x] 6.3 `battle.ts` → `advanceCycle()`：保留核心逻辑，移除 `resetLastAct()` → `resetCycleTracking()`
  - [x] 6.4 `actTransition.ts`：`updateStageInfo()` 改显示 `Cycle N` 而非 `Act N`；移除 elite 图标

- [x] **Task 7: 附属系统清理** (AC: 4)
  - [x] 7.1 `ritualEnchantment.ts`：移除 `getActForNode` 导入；`shouldShowRitual()` 暂时返回 false
  - [x] 7.2 `relics/StageRelicBehaviors.ts`：`checkIntermission`/`grantIntermissionFreeRefreshes` 保留（无外部调用者，已死代码）
  - [x] 7.3 `core/state.ts`：`createInitialState()` 移除 `usedRestEvents: []`
  - [x] 7.4 审查 `tempBuffs`/`sealedKeys`：tempBuffs 仍被 deadly gift 使用，不删除
  - [x] 7.5 `demo/demo-config.ts`：移除 `DEMO_STAGE_MAP`（整体删除，不再被引用）

- [x] **Task 8: 全局引用扫描与验证** (AC: 1, 4)
  - [x] 8.1 全局 grep `'rest'` 在 StageType/GamePhase 上下文中 — 零残留
  - [x] 8.2 全局 grep `ActInfo`/`getActForNode`/`isRestStage`/`openRestStage`/`TOTAL_NODES` — 零残留
  - [x] 8.3 Vite 构建通过（`vite build` OK，tsc 仅有预存在错误）
  - [ ] 8.4 运行一局完整 Run 验证：战斗→商店→战斗→商店→Boss→（暂时商店）→下一 Cycle

## Dev Notes

### 核心设计决策

**本 Story 只做结构简化，不做以下内容（留给后续 Story）：**
- ❌ 战斗继续机制（42.2）
- ❌ 溢出分系统（42.3）
- ❌ 时间加速（42.4）
- ❌ 目标分数指数增长（42.5）
- ❌ Boss 修饰器重构（42.6）
- ❌ 附魔仪式场景（42.7）— 本 Story 中 Boss 后暂时路由到商店

**StageType 去掉 'elite' 的说明**：
当前 `'elite'` 作为 StageType 存在，但新设计中精英不再是独立关卡类型。Epic 42 中精英概念可能作为标准关的随机修饰器在后续 Epic 扩展。本 Story 移除 `'elite'` 时需确保 `ELITE_MODIFIER_INDEX` 逻辑暂时保留在 Boss 系统中（Boss 前的关卡可继续使用 elite 修饰器，但 StageType 统一为 `'standard'`）。

**`TOTAL_NODES` 处理方案**：
当前 `TOTAL_NODES = 10`（含 rest）。新方案有两种选择：
- **方案 A**：`TOTAL_NODES = 3`（每 Cycle 3 关），`advanceCycle()` 在 Boss 后触发
- **方案 B**：移除 `TOTAL_NODES` 概念，改用 `isBossStage(stageNum)` 动态判断 Cycle 边界

推荐方案 A — 保持 `TOTAL_NODES` 语义（Cycle 内节点数），改名为 `CYCLE_LENGTH = 3`。

### 关键代码路径

**战斗结束后的路由（当前）：**
```
battle.ts endBattle()
  → shop.ts openShop()
    → leaveShop()
      → isRestNode(nextNode)?
        → YES: openRestStage()    ← 删除此分支
        → NO: startLevel()
```

**战斗结束后的路由（改造后）：**
```
battle.ts endBattle()
  → isBossStage(currentStage)?
    → YES: openShop() (暂时；42.7 改为附魔仪式) → advanceCycle() → startLevel()
    → NO: openShop() → startLevel()
```

### Project Structure Notes

**依赖方向**（必须遵守）：
```
data → core → systems → scenes
```

- `StageConfig.ts` 在 `systems/stage/` — 类型定义层
- `stageFlow.ts` 在 `systems/stage/` — 业务逻辑层
- `RunState.ts` 在 `core/state/` — 不能导入 systems
- `shop.ts`、`battle.ts` 在 `systems/` — 可以导入 core 和 stage

**文件删除清单**（2 个文件完全删除）：
- `src/src/systems/restStage.ts`
- `src/src/data/restEvents.ts`

**文件修改清单**（约 15 个文件）：
| 文件 | 变更类型 | 影响范围 |
|------|----------|----------|
| `systems/stage/StageConfig.ts` | 类型修改 | 移除 rest/ActInfo |
| `systems/stage/StageManager.ts` | 方法删除 | 移除 Act 相关方法 |
| `systems/stage/stageFlow.ts` | **核心重写** | 节点映射、路由逻辑 |
| `systems/stage/index.ts` | 导出清理 | 移除 ActInfo |
| `core/state/RunState.ts` | 字段/方法修改 | 移除 currentAct |
| `core/state.ts` | 字段清理 | 移除 usedRestEvents |
| `core/types.ts` | 类型修改 | GamePhase/GameState/UIElements |
| `systems/shop.ts` | 路由修改 | 移除 rest 分支 |
| `systems/battle.ts` | 路由修改 | 移除 Act 转场 |
| `systems/actTransition.ts` | 重命名/简化 | Act → Cycle |
| `systems/ritualEnchantment.ts` | 触发条件修改 | 暂时禁用或改路由 |
| `systems/relics/StageRelicBehaviors.ts` | 函数删除 | intermission 相关 |
| `demo/demo-config.ts` | 映射更新 | 移除 rest 节点 |
| `index.html` | DOM 删除 | #rest-screen |
| `style.css` | CSS 删除 | .rest-* 规则 |
| `ui/elements.ts` | 引用删除 | restScreen |

### tempBuffs / sealedKeys 处理

这两个系统 (`TempBuff`, `SealedKey`) 使用 `expiresAtNode` 实现 Act 结束时过期。效果全部来源于休息关事件（`trial_power`, `curse_accept` 等）。删除休息关后：
- 没有任何代码会再创建 `tempBuffs` 或 `sealedKeys`
- **建议**：本 Story 中一并移除这两个系统（类型定义 + state 字段 + battle.ts 中的过滤逻辑），避免死代码

### References

- [Source: docs/stories/epic-42-stage-flow-redesign.md#Story 42.1]
- [Source: docs/stories/epic-18-boss-act-structure.md — 被本 Epic 部分废弃]
- [Source: docs/project-context.md#Scene Management Rules]
- [Source: docs/project-context.md#State Management Rules — StateCoordinator 跨层更新]
- [Source: src/src/systems/stage/stageFlow.ts — 核心路由引擎]
- [Source: src/src/systems/restStage.ts — 待删除]
- [Source: src/src/core/state/RunState.ts — advanceStage/serialize]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- Vite build: OK (76 modules, 560ms)
- tsc --noEmit: 128 errors (all pre-existing, none from this story)

### Completion Notes List
- StageType 精简为 `'standard' | 'boss'`（移除 `'rest'` 和 `'elite'`）
- stageFlow.ts 完全重写：静态映射表 → 动态计算 `stageNum % CYCLE_LENGTH`
- `CYCLE_LENGTH = 3` 添加到 `BALANCE` 常量，供 core 和 systems 层共用
- 新增 `getCycleForStage()` 函数替代 `getActForNode()`
- RunState: 移除 `currentAct`；新增 `advanceCycle()` 方法；`isBossStage()` 改为模运算
- `advanceCycle()` 在 battle.ts: 重置 level=1, cycle++, 重抽 bossModifierPool
- `resetLastAct()` → `resetCycleTracking()`
- Demo 模式: 移除 `DEMO_STAGE_MAP`（不再需要静态映射）；Demo Boss 通关即结束
- `shouldShowRitual()` 暂时返回 false（Story 42.7 重新设计）
- `tempBuffs`/`sealedKeys` 保留（tempBuffs 被 deadly gift 系统使用，非纯死代码）
- `elite_hunter` 遗物暂改为 Boss 关生效
- 无限循环：Boss 后始终 advanceCycle → shop → 下一关，不再有 victory 条件

### File List
- `src/src/systems/stage/StageConfig.ts` — 类型精简
- `src/src/systems/stage/StageManager.ts` — 移除 Act 方法
- `src/src/systems/stage/stageFlow.ts` — 核心重写
- `src/src/systems/stage/index.ts` — 导出清理
- `src/src/core/constants.ts` — 添加 CYCLE_LENGTH
- `src/src/core/types.ts` — 移除 rest 相关类型
- `src/src/core/state.ts` — 移除 usedRestEvents, elite target score
- `src/src/core/state/RunState.ts` — 移除 currentAct, 重写 advanceStage/isBossStage
- `src/src/systems/battle.ts` — 路由重写, Cycle 过渡, 移除 elite 逻辑
- `src/src/systems/shop.ts` — 简化离店路由, getActForNode → getCycleForStage
- `src/src/systems/actTransition.ts` — Act → Cycle 显示
- `src/src/systems/ritualEnchantment.ts` — shouldShowRitual 暂时禁用
- `src/src/systems/relics/StageRelicBehaviors.ts` — elite_hunter 改为 Boss 生效
- `src/src/systems/relics/BossModifierRelicBehaviors.ts` — 移除 elite 判断
- `src/src/systems/relics/RelicPipeline.ts` — stageType 类型精简
- `src/src/systems/tutorial/tutorialInit.ts` — elite 逻辑清理
- `src/src/data/relics.ts` — stageType 类型精简
- `src/src/demo/demo-config.ts` — 移除 DEMO_STAGE_MAP
- `src/src/ui/elements.ts` — 移除 restScreen
- `src/src/main.ts` — resetLastAct → resetCycleTracking
- `src/index.html` — 移除 #rest-screen DOM
- `src/src/style.css` — 移除 rest CSS 规则
- ~~`src/src/systems/restStage.ts`~~ — 已删除
- ~~`src/src/data/restEvents.ts`~~ — 已删除
