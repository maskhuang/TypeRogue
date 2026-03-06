# Story 25.2: 三维难度缩放

Status: done

## Story

As a 玩家,
I want 每个新周目的目标分数翻倍、时间限制衰减，
so that 我的构筑在递增难度中面临真正的极限测试，「成长速度追不上难度速度的那一关」成为我的天然终点.

## Acceptance Criteria

1. **AC1 — 目标分数指数缩放**
   - 公式: `baseTarget × (2 ^ (cycle - 1))`
   - 周目 1 不变，周目 2 翻倍，周目 3 ×4，周目 4 ×8...
   - 在 `calculateTargetScore()` 中实现，接受 cycle 参数
   - stageType 倍率（elite ×1.3, boss ×1.5）在 cycle 缩放之后叠加

2. **AC2 — 时间限制指数衰减**
   - 公式: `baseTime × (decayFactor ^ (cycle - 1))`
   - 衰减系数暂定 0.9（可调）
   - 无下限（理论上可无限衰减）
   - 在 `getTimeLimit()` 或新函数中实现

3. **AC3 — 衰减系数可配置**
   - `CYCLE_TIME_DECAY` 常量加入 `BALANCE` 对象，默认 0.9
   - `CYCLE_SCORE_BASE` 常量加入 `BALANCE` 对象，默认 2（翻倍系数）
   - 后续可通过调参精调难度曲线

4. **AC4 — 战斗 HUD 显示缩放后的值**
   - `announceLevel()` 显示的目标分数已是缩放后的值（当前已从 state.targetScore 读取）
   - 确认所有 HUD 路径读取的都是缩放后的 state.targetScore 和 state.timeMax

5. **AC5 — 现有 stageType / tempBuff 交互不变**
   - elite ×1.3 和 boss ×1.5 倍率仍正常生效
   - tempBuffs 在 cycle 缩放之后叠加（顺序: 基础分 → cycle缩放 → stageType倍率 → tempBuff）
   - Boss 修饰器 boss_double_target 的 targetMultiplier 仍正常叠加

6. **AC6 — 单元测试**
   - 目标分数: 验证 cycle 1-5 的正确缩放值
   - 时间限制: 验证 cycle 1-5 对 standard/elite/boss 的衰减值
   - stageType 倍率与 cycle 缩放正确叠加
   - 衰减系数可配置（修改常量后结果变化）
   - tempBuff 在 cycle 缩放后仍正常生效

## Tasks / Subtasks

- [x] Task 1: BALANCE 常量扩展 (AC: 3)
  - [x] 1.1 在 `core/constants.ts` BALANCE 中添加 `CYCLE_SCORE_BASE: 2` 和 `CYCLE_TIME_DECAY: 0.9`

- [x] Task 2: 目标分数 cycle 缩放 (AC: 1, 5)
  - [x] 2.1 修改 `calculateTargetScore()` 签名：添加 `cycle: number = 1` 参数
  - [x] 2.2 在基础分计算后、stageType 倍率之前乘以 `CYCLE_SCORE_BASE ^ (cycle - 1)`
  - [x] 2.3 更新 `startLevel()` 中的调用，传入 `state.cycle`

- [x] Task 3: 时间限制 cycle 衰减 (AC: 2, 5)
  - [x] 3.1 创建 `getCycleTimeLimit(nodeId: number, cycle: number): number` 函数（或修改 `getTimeLimit`）
  - [x] 3.2 公式: `STAGE_TIME_LIMITS[stageType] × (CYCLE_TIME_DECAY ^ (cycle - 1))`
  - [x] 3.3 更新 `startLevel()` 中的调用，传入 `state.cycle`

- [x] Task 4: HUD 确认 (AC: 4)
  - [x] 4.1 确认 `announceLevel()` 读取的 `state.targetScore` 已是缩放后的值
  - [x] 4.2 确认 `updateHUD()` 和商店结算显示的值已是缩放后的

- [x] Task 5: 单元测试 (AC: 6)
  - [x] 5.1 测试 calculateTargetScore cycle=1 无变化
  - [x] 5.2 测试 calculateTargetScore cycle=2 翻倍
  - [x] 5.3 测试 calculateTargetScore cycle=3 ×4
  - [x] 5.4 测试 stageType 倍率与 cycle 缩放正确叠加
  - [x] 5.5 测试 getCycleTimeLimit cycle=1 无变化
  - [x] 5.6 测试 getCycleTimeLimit cycle=2 = baseTime × 0.9
  - [x] 5.7 测试 getCycleTimeLimit cycle=5 对三种 stageType
  - [x] 5.8 测试修改 CYCLE_TIME_DECAY 后结果变化
  - [x] 5.9 运行全部现有测试确认无回归

## Dev Notes

### 核心设计意图

**三维难度 vs 双层成长：**
- 难度增长: 分数 ×2/周目 + 时间 ×0.9/周目 + Boss 修饰器堆叠（Story 25.3）
- 玩家成长: 成长附魔（永久 +%）+ 增幅者（关内叠层）
- 天然终点: 成长速率追不上难度增速的那一关 = 构筑极限

### 公式详解

**目标分数缩放：**
```
calculateTargetScore(level, stageType, cycle) =
  floor(baseScore × CYCLE_SCORE_BASE^(cycle-1)) × stageTypeMultiplier

其中:
  baseScore = TARGET_BASE + level × TARGET_LINEAR + level² × TARGET_QUADRATIC
  CYCLE_SCORE_BASE = 2（默认，指数底数）
  stageTypeMultiplier = 1.0 (standard) | 1.3 (elite) | 1.5 (boss)
```

**示例（Level 1 Standard）：**
| 周目 | 基础分 | cycle缩放 | 最终 |
|------|--------|-----------|------|
| 1 | 125 | ×1 | 125 |
| 2 | 125 | ×2 | 250 |
| 3 | 125 | ×4 | 500 |
| 4 | 125 | ×8 | 1000 |
| 5 | 125 | ×16 | 2000 |

**时间衰减：**
```
getCycleTimeLimit(nodeId, cycle) =
  STAGE_TIME_LIMITS[stageType] × CYCLE_TIME_DECAY^(cycle-1)

其中:
  CYCLE_TIME_DECAY = 0.9（默认）
```

**示例（Standard, baseTime=30s）：**
| 周目 | 衰减系数 | 时间(秒) |
|------|----------|----------|
| 1 | 0.9^0 = 1.0 | 30.0 |
| 2 | 0.9^1 = 0.9 | 27.0 |
| 3 | 0.9^2 = 0.81 | 24.3 |
| 4 | 0.9^3 = 0.729 | 21.87 |
| 5 | 0.9^4 = 0.6561 | 19.68 |

### 实现顺序与注意事项

**计算顺序（startLevel 中）：**
1. `getTimeLimit(state.level)` → 基础时间
2. cycle 衰减 → `timeMax × CYCLE_TIME_DECAY^(cycle-1)`
3. `calculateTargetScore(battleNum, stageType, cycle)` → 已含 cycle 缩放
4. tempBuff 叠加 → 在 cycle 缩放之后
5. `resetResources()` → 使用最终 timeMax
6. Boss 修饰器 → 额外叠加（如 boss_double_target ×2）

**关键点：**
- `calculateTargetScore` 新增 cycle 参数时设默认值 1，确保现有调用不受影响
- 时间衰减无下限：不需要 `Math.max` 限制，让高周目自然变得极其紧张
- 现有 `calculateTargetScore` 的测试（`tests/unit/core/state.test.ts`）不传 cycle，应保持通过

### 现有常量参考

```typescript
// core/constants.ts — BALANCE
TARGET_BASE: 80
TARGET_LINEAR: 40
TARGET_QUADRATIC: 5
TIME_PER_LEVEL: 30  // 注意：实际使用 STAGE_TIME_LIMITS 而非此值

// systems/stage/stageFlow.ts — STAGE_TIME_LIMITS
standard: 30
elite: 45
boss: 60
rest: 0
```

### 与后续 Story 的关系

- **Story 25.3 (Boss 修饰器堆叠)**: 第三维难度，在 cycle 缩放之上额外叠加
- **Story 25.4 (稀有商铺)**: 高周目解锁稀有物品，不影响本 Story 的分数/时间缩放
- **Story 25.5 (排行榜)**: 需要 cycle 数作为排名依据

### Project Structure Notes

- 修改文件: `core/constants.ts`, `core/state.ts`, `systems/stage/stageFlow.ts`, `systems/battle.ts`
- 新增测试: `tests/unit/core/cycle-scaling.test.ts`
- 不新建源码文件
- 依赖: 无新依赖

### References

- [Source: docs/epics.md#Epic25-Story25.2 (line 1553-1567)] — AC 定义
- [Source: docs/brainstorming-session-2026-03-05.md#Section-A+ (line 54-87)] — 三维难度设计
- [Source: src/core/state.ts#calculateTargetScore (line 135-141)] — 当前目标分数公式
- [Source: src/core/constants.ts#BALANCE (line 45-69)] — 平衡常量
- [Source: src/systems/stage/stageFlow.ts#STAGE_TIME_LIMITS (line 24-29)] — 时间限制
- [Source: src/systems/battle.ts#startLevel (line 635-784)] — 关卡初始化流程
- [Source: src/systems/battle.ts#advanceCycle (line 48-55)] — 周目推进函数
- [Source: docs/stories/25-1-cycle-state-loop-structure.md] — 前置 Story 实现

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Task 1: Added `CYCLE_SCORE_BASE: 2` and `CYCLE_TIME_DECAY: 0.9` to BALANCE object in constants.ts
- Task 2: Modified `calculateTargetScore()` to accept `cycle: number = 1` parameter. Applies `CYCLE_SCORE_BASE^(cycle-1)` scaling after base calculation, before stageType multiplier. Updated `startLevel()` to pass `state.cycle`.
- Task 3: Created `getCycleTimeLimit(nodeId, cycle)` in stageFlow.ts applying `CYCLE_TIME_DECAY^(cycle-1)` decay. Updated `startLevel()` to use `getCycleTimeLimit(state.level, state.cycle)` instead of `getTimeLimit(state.level)`.
- Task 4: Confirmed all HUD paths (announceLevel, updateHUD, startTimer, updateTimerDisplay) read from `state.targetScore` and `state.timeMax` which are set in startLevel() after cycle scaling is applied.
- Task 5: 28 unit tests covering cycle 1-5 score scaling, cycle 1-5 time decay for standard/elite/boss, stageType×cycle interaction, BALANCE configurability, tempBuff interaction, integer return validation, and backward compatibility. All 359 core tests pass with no regressions.

### Senior Developer Review (AI)

**Review Date:** 2026-03-06
**Review Outcome:** Approve (after fixes)

**Findings (4 total: 0 High, 2 Medium, 2 Low):**

- [x] [MEDIUM] AC6 tempBuff 测试缺失 — 添加了 targetScore/time tempBuff 与 cycle 缩放交互的 2 个测试
- [x] [MEDIUM] getCycleTimeLimit 返回浮点数导致计时器显示偏差 — 添加 Math.round() 取整
- [x] [LOW] battle.ts 中 getTimeLimit 已无使用但仍被导入 — 移除未使用导入
- [x] [LOW] 测试文件中 STAGE_TIME_LIMITS 导入未使用 — 移除未使用导入

### File List

- src/src/core/constants.ts (modified: added CYCLE_SCORE_BASE, CYCLE_TIME_DECAY to BALANCE)
- src/src/core/state.ts (modified: calculateTargetScore() gains cycle parameter with scaling)
- src/src/systems/stage/stageFlow.ts (modified: added getCycleTimeLimit() with Math.round, import BALANCE)
- src/src/systems/battle.ts (modified: startLevel() uses getCycleTimeLimit, passes state.cycle, removed unused getTimeLimit import)
- src/tests/unit/core/cycle-scaling.test.ts (new: 28 unit tests including tempBuff interaction and integer validation)
