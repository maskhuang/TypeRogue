---
title: "Story 18.1: Stage Type 系统与 Act 结构重构"
epic: "Epic 18: Boss 战与 Act 结构"
story_key: "18-1-stage-type-act-structure"
status: "done"
created: "2026-03-02"
depends_on: []
---

# Story 18.1: Stage Type 系统与 Act 结构重构

## Story

作为一个 **玩家**，
我想要 **体验包含标准关、精英关、休息关和 Boss 关的差异化关卡流程**，
以便 **Run 的 8 关结构拥有节奏感和高潮，而非 8 个同质化关卡**。

## 验收标准

- [x] AC1: StageType 枚举定义完成（standard / elite / boss / rest）
- [x] AC2: StageConfig 接口包含 stageType 字段，levels.json 同步更新
- [x] AC3: 固定时间规则生效：标准关 30s、精英关 45s、Boss 关 60s
- [x] AC4: levels.json 更新为 10 节点结构（4 标准 + 3 精英 + 1 Boss + 2 休息）
- [x] AC5: 关卡进度逻辑正确处理 10 节点流程（含休息关跳转）
- [x] AC6: Act 边界正确：Act1(1-4) → Act2(5-8) → Act3(9-10)
- [x] AC7: Run 开始时从 Boss 池抽 3 个修饰器 ID（A/B/C）存入 RunState

## Tasks / Subtasks

- [x] Task 1: 新增 StageType 枚举与更新 StageConfig (AC: 1, 2)
  - [x] 1.1 在 `src/src/systems/stage/StageConfig.ts` 新增 `StageType` 类型
  - [x] 1.2 在 `StageConfig` 接口添加 `stageType: StageType` 字段
  - [x] 1.3 在 `StageModifier` 类型添加 `'elite'` 修饰器值
- [x] Task 2: 更新 levels.json 为 10 节点结构 (AC: 3, 4)
  - [x] 2.1 标准节点 (1,2,5,7) → `stageType: "standard"`, timeLimit 30s
  - [x] 2.2 精英节点 (3,6,9) → `stageType: "elite"`, timeLimit 45s
  - [x] 2.3 Boss 节点 (10) → `stageType: "boss"`, timeLimit 60s
  - [x] 2.4 休息节点 (4,8) → `stageType: "rest"`, timeLimit 0s
  - [x] 2.5 精英关 `baseGoldReward` ×2+，更新 acts 分组
- [x] Task 3: 更新 StageManager 支持新关卡类型 (AC: 5, 6)
  - [x] 3.1 新增 `getStageType(stageId): StageType` 方法
  - [x] 3.2 新增 `isEliteStage(stageId)` 和 `isRestStage(stageId)` 方法
  - [x] 3.3 新增 `getNextStageId(currentStageId): number | 'victory'` 方法
- [x] Task 4: 更新关卡进度逻辑 (AC: 5, 6)
  - [x] 4.1 创建 `stageFlow.ts` 轻量辅助模块（节点映射、时间规则、跳转逻辑）
  - [x] 4.2 更新 `state.ts` — `calculateTargetScore()` 接受 stageType 参数（elite ×1.3, boss ×1.5）
  - [x] 4.3 更新 `battle.ts` — `startLevel()` 使用固定时间和 stageType 目标分数
  - [x] 4.4 更新 `battle.ts` — `endLevel()` Boss 关 → victory()，标准/精英 → shop
  - [x] 4.5 更新 `battle.ts` — 新增 `victory()` 函数
  - [x] 4.6 更新 `shop.ts` — 使用 `getNextBattleNode()` 跳过休息节点
- [x] Task 5: RunState 存储修饰器池 (AC: 7)
  - [x] 5.1 创建 `bossModifiers.ts` — 13 个修饰器 ID 定义 + drawBossModifiers()
  - [x] 5.2 RunState 新增 `bossModifierPool: string[]` 和 `bossModifierAssignment`
  - [x] 5.3 `startRun()` 抽 3 个不重复修饰器分配到 Stage 3/6/9
  - [x] 5.4 更新 `advanceStage()` 上限 8→10，`isBossStage()` 检查 ===10
  - [x] 5.5 更新 `serialize()`/`deserialize()` 包含新字段
- [x] Task 6: 测试
  - [x] 6.1 更新 RunState.test.ts 适配 10 节点流程（act 边界、boss 关、上限）
  - [x] 6.2 新增 stageFlow.test.ts（47 tests）— 节点映射、时间、跳转
  - [x] 6.3 新增 bossModifiers.test.ts（12 tests）— 修饰器池、随机抽取

## Dev Notes

### 关键架构发现（CRITICAL）

**当前存在两套并行系统：**

1. **Legacy DOM 系统**（实际运行中）：`battle.ts` + `state.ts` + `shop.ts`
   - 使用 `state.level` 扁平计数器
   - `startLevel()` → `endLevel()` → `openShop()` 循环
   - `calculateTargetScore(level)` 使用二次函数
   - 关卡进度由 shop 流程驱动

2. **New Pixi 系统**（已编写但未接入）：`BattleScene` + `BattleFlowController` + `StageManager` + `RunState`
   - 完整类型定义但未连接到 `main.ts`
   - `StageManager` 是未使用的单例
   - 无 scene 编排器驱动关卡流转

**Story 18.1 应针对 Legacy DOM 系统实现**，因为这是当前运行的游戏。同时更新 Pixi 系统的类型定义保持同步。

### StageConfig 命名冲突

- `systems/stage/StageConfig.ts` 导出 `StageConfig`（含 id, name, act, isBoss...）
- `scenes/battle/BattleFlowController.ts` 导出同名 `StageConfig`（含 difficulty, targetScore, timeLimit...）
- **不要重命名现有接口**，在 import 时使用别名区分即可

### 10 节点流程设计

```
节点 1: Stage 1 [standard] 30s
节点 2: Stage 2 [standard] 30s
节点 3: Stage 3 [elite]    45s ← 修饰器 A
节点 4: 休息关 [rest]      ← 随机事件（Story 18.3 实现，本 Story 只留占位）
节点 5: Stage 4 [standard] 30s
节点 6: Stage 5 [elite]    45s ← 修饰器 B
节点 7: Stage 6 [standard] 30s
节点 8: 休息关 [rest]      ← 随机事件（Story 18.3 实现）
节点 9: Stage 7 [elite]    45s ← 修饰器 C
节点10: Stage 8 [boss]     60s ← A/B/C 交替切换
```

### Legacy 系统关键修改点

| 文件 | 修改内容 |
|------|----------|
| `systems/stage/StageConfig.ts` | 新增 StageType，更新 StageConfig 接口 |
| `assets/data/levels.json` | 添加 stageType 字段，调整时间和奖励参数 |
| `systems/stage/StageManager.ts` | 新增 getStageType/isElite/isRest 方法 |
| `core/state.ts` | 可能需要新增 stageType 到 state 对象 |
| `systems/battle.ts` | `startLevel()` 使用固定时间；`endLevel()` 根据 stageType 路由 |
| `core/state/RunState.ts` | 新增 bossModifierPool 和 assignment 字段 |

### 目标分数平衡注意

时间从 60-120s 统一变为 30/45/60s，目标分数需要重新平衡：
- 标准关 30s：目标分数应该比现在低（原来 60s 对应的分数太高了）
- 精英关 45s：目标分数 = 标准关 ×1.3
- Boss 关 60s：保持或略调

建议使用新的 `calculateTargetScore(level, stageType)` 公式。

### 休息关占位

本 Story 只需要在关卡进度逻辑中 **识别** 休息节点并跳转到占位状态（如直接进入下一 Act），实际 RestScene 由 Story 18.3 实现。

### Boss 修饰器池占位

本 Story 只需要：
1. 在 RunState 中存储 3 个修饰器 ID
2. 记录分配关系（Stage 3→A, Stage 5→B, Stage 7→C）
3. 不需要实现修饰器逻辑（Story 18.4 实现）

### Project Structure Notes

- 新文件应放在现有目录结构中，不创建新目录
- `StageType` 添加到 `systems/stage/StageConfig.ts`（与现有 StageModifier 同文件）
- Boss 修饰器 ID 列表可暂时硬编码在 `data/` 目录的常量中

### References

- [Source: docs/stories/epic-18-boss-act-structure.md — Epic 18 完整设计]
- [Source: docs/game-architecture.md — 场景管理、状态管理架构]
- [Source: docs/project-context.md — 三层状态规则、依赖方向]
- [Source: src/src/systems/stage/StageConfig.ts — 现有 StageConfig 定义]
- [Source: src/src/systems/stage/StageManager.ts — 现有 StageManager 实现]
- [Source: src/src/core/state/RunState.ts — advanceStage 逻辑]
- [Source: src/src/core/state.ts — calculateTargetScore 公式]
- [Source: src/src/systems/battle.ts — startLevel/endLevel 流程]
- [Source: src/assets/data/levels.json — 关卡配置数据]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- Pre-existing test failures (63 tests in 7 files): skills evolution/modifiers/pipeline, audio/SoundPool — unrelated to Story 18.1
- RunState.test.ts required 5 assertion updates for 10-node flow (act boundaries, boss stage, advance cap)

### Completion Notes List
- Created `stageFlow.ts` as lightweight helper instead of using StageManager (which is unused by the legacy system)
- `calculateTargetScore()` kept backward-compatible with default `stageType = 'standard'` parameter
- Rest nodes (4, 8) are skipped via `getNextBattleNode()` in shop advancement
- Boss win routes to `victory()` function (no shop after Boss)
- `getBattleNumber()` maps 10 nodes → 8 battle numbers for display
- AC6 adjusted: Act1=[1-4], Act2=[5-8], Act3=[9-10] (includes rest nodes in act boundaries)
- Boss modifier assignment: Stage 3→A, Stage 6→B, Stage 9→C (elite nodes)

### File List
**Modified:**
- `docs/stories/sprint-status.yaml` — Story status tracking (backlog → in-progress → review)
- `src/src/systems/stage/StageConfig.ts` — StageType enum, 'elite' modifier, stageType field
- `src/src/systems/stage/StageManager.ts` — getStageType, isEliteStage, isRestStage, getNextStageId
- `src/src/systems/stage/index.ts` — StageType export
- `src/assets/data/levels.json` — 10-node structure with stageType fields
- `src/src/core/state.ts` — calculateTargetScore with stageType multipliers
- `src/src/systems/battle.ts` — stageType-based time/routing, victory() function
- `src/src/systems/shop.ts` — getNextBattleNode() for rest-skipping
- `src/src/core/state/RunState.ts` — bossModifierPool, assignment, 10-node advanceStage

**Created:**
- `src/src/systems/stage/stageFlow.ts` — 10-node flow helper (mappings, time limits, navigation)
- `src/src/data/bossModifiers.ts` — 13 boss modifier IDs, drawBossModifiers()
- `src/tests/unit/systems/stage/stageFlow.test.ts` — 47 tests
- `src/tests/unit/data/bossModifiers.test.ts` — 12 tests

**Updated Tests:**
- `src/tests/unit/core/state/RunState.test.ts` — 5 assertions updated for 10-node flow
