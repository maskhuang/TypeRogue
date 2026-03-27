# Story 42.5: 目标分数指数增长

Status: done

## Story

As a 玩家,
I want 目标分数随关卡指数增长而非二次方增长,
so that 前期轻松上手、后期自然收敛，所有玩家终将撞墙，创造明确的"死亡曲线"。

## Acceptance Criteria

1. **AC1: 指数增长公式** — `targetScore = TARGET_BASE_EXP × TARGET_GROWTH ^ (stageNum - 1)`，取代原二次方公式
2. **AC2: Boss 目标倍率** — Boss 关目标 = 基础目标 × `BOSS_TARGET_MULT`（1.5）
3. **AC3: 旧常量清理** — 移除 `TARGET_BASE`、`TARGET_LINEAR`、`TARGET_QUADRATIC`、`CYCLE_SCORE_BASE`，无残留引用
4. **AC4: 新常量集中管理** — `TARGET_BASE_EXP: 300`、`TARGET_GROWTH: 1.45`、`BOSS_TARGET_MULT: 1.5` 统一在 `BALANCE` 中
5. **AC5: 函数签名简化** — `calculateTargetScore(stageNum, stageType)` 不再需要 cycle 参数（指数增长本身替代周目缩放）
6. **AC6: 所有调用方适配** — 所有调用 `calculateTargetScore` 的代码适配新签名，无编译错误
7. **AC7: 与现有系统兼容** — 宽容评审、tempBuff、Boss 修饰器（boss_double_target）、修饰器护盾等后续修改器正常工作

## Tasks / Subtasks

- [x] **Task 1: 新增指数增长常量** (AC: 4)
  - [x] 1.1 `core/constants.ts` BALANCE 新增 `TARGET_BASE_EXP: 300`（第 1 关目标分数）
  - [x] 1.2 BALANCE 新增 `TARGET_GROWTH: 1.45`（每关增长系数）
  - [x] 1.3 BALANCE 新增 `BOSS_TARGET_MULT: 1.5`（Boss 关目标倍率）

- [x] **Task 2: 改造 calculateTargetScore 函数** (AC: 1, 2, 5)
  - [x] 2.1 `core/state.ts` 修改 `calculateTargetScore` 签名：移除 `cycle` 参数 → `calculateTargetScore(stageNum: number, stageType: StageType = 'standard'): number`
  - [x] 2.2 实现新公式：`Math.round(TARGET_BASE_EXP * Math.pow(TARGET_GROWTH, stageNum - 1))`
  - [x] 2.3 Boss 倍率：`stageType === 'boss' ? Math.round(target * BOSS_TARGET_MULT) : target`
  - [x] 2.4 确认 `stageNum = 1` 时返回 `300`（BASE），`stageNum = 3 (Boss)` 时返回 `947`（实际值，浮点精度：Math.round(300 × 2.1025 × 1.5) = Math.round(946.125) = 947，非近似 945）

- [x] **Task 3: 清理旧常量** (AC: 3)
  - [x] 3.1 `core/constants.ts` 移除 `TARGET_BASE: 80`、`TARGET_LINEAR: 40`、`TARGET_QUADRATIC: 5`
  - [x] 3.2 移除 `CYCLE_SCORE_BASE: 2`（指数增长替代周目缩放）
  - [x] 3.3 全局搜索 `TARGET_BASE`、`TARGET_LINEAR`、`TARGET_QUADRATIC`、`CYCLE_SCORE_BASE` 确认无残留引用（除新常量名 `TARGET_BASE_EXP`）

- [x] **Task 4: 更新所有调用方** (AC: 6)
  - [x] 4.1 `battle.ts` `startLevel()` 行 ~1696：移除 `state.cycle` 参数 → `calculateTargetScore(battleNum > 0 ? battleNum : state.level, currentStageType)`
  - [x] 4.2 全局搜索 `calculateTargetScore` 确认所有调用方已适配（测试文件已更新）
  - [x] 4.3 确认 `getCycleTimeLimit` 不受影响（它依赖 `CYCLE_TIME_DECAY`，不受目标分数改造影响）

- [x] **Task 5: 验证与现有系统兼容** (AC: 7)
  - [x] 5.1 确认宽容评审遗物（`applyLenientJudge`）仍正常工作（10% 减免）— battle.ts:1705 逻辑不变
  - [x] 5.2 确认 `tempBuff` 的 `targetScore` 类型仍正常应用（乘法叠加）— battle.ts:1714 逻辑不变
  - [x] 5.3 确认 Boss 修饰器 `boss_double_target`（`targetMultiplier: 2.0`）仍正常应用 — via tempBuff 机制
  - [x] 5.4 确认修饰器护盾（`getShieldedTargetMultiplier`）仍正常工作 — 独立机制
  - [x] 5.5 确认 42.3 边界情况：溢出分 >= 新目标分数时 `_targetReached` 立即为 true — 逻辑不变
  - [x] 5.6 确认 Demo 模式固定目标分数覆盖（`DEMO_TARGET_SCORES`）不受影响 — battle.ts:1699-1700 独立覆盖

- [x] **Task 6: 构建验证** (AC: 3, 6)
  - [x] 6.1 `vite build` 通过（414.48 kB）
  - [x] 6.2 确认无 `TARGET_BASE`、`TARGET_LINEAR`、`TARGET_QUADRATIC`、`CYCLE_SCORE_BASE` 残留引用（排除新常量名）
  - [x] 6.3 实际目标分数曲线：Stage 1=300, 2=435, 3(Boss)=947, 4=915, 5=1326, 6(Boss)=2885, 7=2788, 8=4043, 9(Boss)=8793

## Dev Notes

### 核心设计决策

**本 Story 只做"目标分数公式替换 + 旧常量清理"，不做以下内容：**
- ❌ 时间衰减系数变更 — `CYCLE_TIME_DECAY` 保持不变
- ❌ 感官反馈（42.9）— 不涉及
- ❌ 平衡微调（42.10）— `TARGET_GROWTH` 可在 42.10 调整
- ❌ Boss 固定间隔（42.6）— 不涉及

### 现有目标分数公式（当前）

```typescript
// core/state.ts ~行 150-156
export function calculateTargetScore(level: number, stageType: StageType = 'standard', cycle: number = 1): number {
  const { TARGET_BASE, TARGET_LINEAR, TARGET_QUADRATIC, CYCLE_SCORE_BASE } = BALANCE;
  const base = Math.floor(TARGET_BASE + level * TARGET_LINEAR + level * level * TARGET_QUADRATIC);
  const scaled = Math.floor(base * Math.pow(CYCLE_SCORE_BASE, cycle - 1));
  if (stageType === 'boss') return Math.floor(scaled * 1.5);
  return scaled;
}
```

**问题：**
- 二次方增长（5L² + 40L + 80）太平缓，高关卡目标增长不够快
- `CYCLE_SCORE_BASE` 每周目翻倍造成阶梯跳跃（Cycle 1→2 突然翻倍），体验不连续
- 需要 cycle 参数增加了调用复杂度

### 改造后公式

```typescript
// 改造后：
export function calculateTargetScore(stageNum: number, stageType: StageType = 'standard'): number {
  const { TARGET_BASE_EXP, TARGET_GROWTH, BOSS_TARGET_MULT } = BALANCE;
  const target = Math.round(TARGET_BASE_EXP * Math.pow(TARGET_GROWTH, stageNum - 1));
  return stageType === 'boss' ? Math.round(target * BOSS_TARGET_MULT) : target;
}
```

**优势：**
- 指数曲线平滑递增，无阶梯跳跃
- 前 3 关温和（300→435→631），后期陡峭（Stage 9 Boss → 8793）
- 不再需要 cycle 参数 — 指数增长本身提供自然缩放
- `BOSS_TARGET_MULT` 显式化（之前硬编码 1.5）

### 目标分数曲线对比

**新公式（指数 1.45^n）：**
| 关卡 | 类型 | 目标分 | 旧公式(C1) | 旧公式(C2) |
|------|------|--------|-----------|-----------|
| 1 | Standard | 300 | 125 | 250 |
| 2 | Standard | 435 | 170 | 340 |
| 3 | Boss | 947 | 345 | 690 |
| 4 | Standard | 915 | 280 | 560 |
| 5 | Standard | 1326 | 365 | 730 |
| 6 | Boss | 2885 | 705 | 1410 |
| 7 | Standard | 2788 | 460 | 920 |
| 8 | Standard | 4043 | 565 | 1130 |
| 9 | Boss | 8793 | 1028 | 2055 |

**设计意图：**
- Stage 1-3：前三关温和（300-945），新手缓冲
- Stage 4-6：中期加速（913-2878），开始感受压力
- Stage 7-9：后期陡峭（2783-8776），逼近极限
- Stage 10+：指数爆炸，所有玩家终将撞墙

### 调用方改造要点

**`battle.ts` startLevel() ~行 1696（唯一生产代码调用点）：**
```typescript
// 当前：
state.targetScore = calculateTargetScore(battleNum > 0 ? battleNum : state.level, currentStageType, state.cycle);

// 改造后：移除 state.cycle 参数
state.targetScore = calculateTargetScore(battleNum > 0 ? battleNum : state.level, currentStageType);
```

**后续修改器链（不需改动，自动适用于新目标分数）：**
1. Demo 覆盖 → `DEMO_TARGET_SCORES[state.level]`
2. 宽容评审 → `applyLenientJudge(targetScore)` → ×0.9
3. TempBuff → `targetScore *= buff.value`
4. Boss 修饰器 → `boss_double_target` → ×2.0
5. 修饰器护盾 → `getShieldedTargetMultiplier()` 事后修正

### CYCLE_SCORE_BASE 移除影响

移除 `CYCLE_SCORE_BASE` 后：
- `calculateTargetScore` 不再使用它 ✅
- `getCycleTimeLimit` 使用的是 `CYCLE_TIME_DECAY`，不受影响 ✅
- 需要搜索全局确认无其他引用

### 42.3 溢出分边界情况

42.3 在 `startLevel()` 中有边界检查：
```typescript
if (state.overflowScore > 0 && state.score >= state.targetScore) {
  _targetReached = true;
  _targetReachedTime = state.timeMax;
}
```
新目标分数公式会改变触发阈值，但逻辑不变。Stage 1 目标从 125→300 意味着需要更多溢出分才能直接达标 — 这是设计意图。

### Project Structure Notes

**依赖方向**（必须遵守）：
```
data → core → systems → scenes
```

- `calculateTargetScore()` 在 `core/state.ts` — 核心层，可被 systems 调用
- `BALANCE` 常量在 `core/constants.ts` — 数据层
- 调用点在 `systems/battle.ts` — 系统层
- 不新增文件，只修改现有文件

### References

- [Source: docs/stories/epic-42-stage-flow-redesign.md#Story 42.5]
- [Source: docs/implementation-artifacts/42-3-overflow-score.md — 溢出分边界情况]
- [Source: docs/implementation-artifacts/42-4-time-acceleration.md — 时间加速交互]
- [Source: src/src/core/state.ts — calculateTargetScore ~行 150]
- [Source: src/src/core/constants.ts — BALANCE ~行 59]
- [Source: src/src/systems/battle.ts — startLevel ~行 1696]
- [Source: src/src/systems/stage/stageFlow.ts — getStageType, getCycleTimeLimit]
- [Source: src/src/systems/relics/ScoringRelicBehaviors.ts — applyLenientJudge ~行 23]
- [Source: src/src/data/bossModifiers.ts — boss_double_target ~行 362]
- [Source: src/src/systems/relics/BossModifierRelicBehaviors.ts — getShieldedTargetMultiplier ~行 54]
- [Source: docs/project-context.md — State Management Rules, dependency direction]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- state.test.ts 初始预期值因浮点精度偏差（630→631 等），通过 node 精确计算修正
- cycle-scaling.test.ts 的 getCycleTimeLimit nodeId→stageType 映射是 42.1 去休息关后的预存失败，已修正 nodeId 映射

### Completion Notes List
- Task 1-3: constants.ts 替换旧常量（TARGET_BASE/LINEAR/QUADRATIC/CYCLE_SCORE_BASE）为新常量（TARGET_BASE_EXP/TARGET_GROWTH/BOSS_TARGET_MULT）
- Task 2: state.ts calculateTargetScore 重写为指数增长公式，移除 cycle 参数
- Task 4: battle.ts 调用方移除 state.cycle 参数；测试文件全面更新
- Task 5: 兼容性验证 — 后续修改器链（宽容评审/tempBuff/boss修饰器/护盾/溢出分/Demo）逻辑不变
- Task 6: vite build 通过，无残留引用
- 额外修复: cycle-scaling.test.ts 中 getCycleTimeLimit nodeId 映射适配 42.1 后的 standard/boss 二类结构

### Code Review Fixes (2026-03-27)
- Review Fix #1 (MEDIUM): `src/docs/epic-class-advancement.md` 旧 3 参数签名更新为 2 参数
- Review Fix #2 (MEDIUM): state.test.ts 新增 tempBuff 管道顺序测试
- Review Fix #3 (MEDIUM): cycle-scaling.test.ts `toBeCloseTo` → `toBe` 整数精确断言
- Review Fix #4 (LOW): Dev Notes 曲线表格数值修正为实际计算值

### File List
- src/src/core/constants.ts — 移除旧常量，新增 TARGET_BASE_EXP/TARGET_GROWTH/BOSS_TARGET_MULT
- src/src/core/state.ts — calculateTargetScore 重写为指数增长公式
- src/src/systems/battle.ts — startLevel() 调用移除 cycle 参数
- src/tests/unit/core/state.test.ts — 全面重写测试用例适配新公式 + tempBuff 管道测试
- src/tests/unit/core/cycle-scaling.test.ts — 移除 cycle 缩放测试，修正 nodeId 映射，toBe 精确断言
- src/docs/epic-class-advancement.md — 更新旧 calculateTargetScore 签名引用
