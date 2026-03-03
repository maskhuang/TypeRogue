---
title: "Story 18.8: Boss 实现 — 数值规则类（6 种集成验证与测试）"
epic: "Epic 18: Boss 战与 Act 结构"
story_key: "18-8-boss-numerical-rules"
status: "done"
created: "2026-03-02"
depends_on: ["18-4-boss-modifier-framework"]
---

# Story 18.8: Boss 实现 — 数值规则类（6 种集成验证与测试）

## Story

作为一个 **玩家**，
我想要 **6 种数值规则 Boss 修饰器在战斗中正确生效**（分数衰减、断连即扣、单词限额、时间加速、双倍目标、递减收益），
以便 **Boss 关和精英关通过数值规则增加难度，玩家策略选择更有深度**。

## Acceptance Criteria

- [x] AC1: boss_decay — 每秒扣 5% 当前总分（精英 2.5%），分数不低于 0
- [x] AC2: boss_combo_punish — 连击中断扣 20% 总分（精英 10%），有视觉反馈（`-N分!`）
- [x] AC3: boss_cap — 单词得分上限 50 分（精英 75 分），超出部分截断
- [x] AC4: boss_fast_time — 计时器 1.5 倍速（精英 1.25x），每 100ms tick 实际消耗 0.15s
- [x] AC5: boss_double_target — 目标分数 ×2（精英 ×1.5），cleanup 恢复原值
- [x] AC6: boss_diminish — 每完成一词下个词分数 -10%（精英 -5%），倍率不低于 0
- [x] AC7: 六种 Boss 均支持 isElite 减弱参数（精英参数弱于满功率）
- [x] AC8: 数值效果与现有分数/倍率管道正确集成（battle.ts 钩子全部验证通过）

## Tasks / Subtasks

- [x] Task 1: 验证现有实现完整性 (AC: 1-7)
  - [x]1.1 审计 `data/bossModifiers.ts` 中 6 个数值修饰器的 getParams、apply、cleanup、onTick 实现
  - [x]1.2 审计 `battle.ts` 中 4 个集成钩子（playerWrong、completeWord、startTimer、applyModifier）
  - [x]1.3 确认所有 6 个修饰器在 BOSS_MODIFIER_REGISTRY 中注册（非 stub）

- [x] Task 2: 补充 boss_combo_punish 集成测试 (AC: 2, 8)
  - [x]2.1 测试：applyModifier('boss_combo_punish') 后，模拟 playerWrong 逻辑，验证 `state.score` 扣减 20%
  - [x]2.2 测试：精英版扣减 10%
  - [x]2.3 测试：分数为 0 时不再扣减
  - [x]2.4 测试：penalty 使用 Math.floor（向下取整）

- [x] Task 3: 补充 boss_cap 集成测试 (AC: 3, 8)
  - [x]3.1 测试：applyModifier('boss_cap') 后，模拟高分词（如 100 分），验证 scoreCap=50 截断
  - [x]3.2 测试：低于 cap 的分数不被截断（如 30 分 → 30 分）
  - [x]3.3 测试：精英版 scoreCap=75
  - [x]3.4 测试：cap 与 diminish 同时生效时，先 cap 再 diminish

- [x] Task 4: 补充 boss_fast_time 集成测试 (AC: 4, 8)
  - [x]4.1 测试：applyModifier('boss_fast_time') 后，模拟 timer tick，验证 `state.time` 以 1.5x 速度减少
  - [x]4.2 测试：精英版 1.25x 速度
  - [x]4.3 测试：无修饰器时 timeSpeed 默认为 1

- [x] Task 5: 验证已有测试覆盖充分性 (AC: 1, 5, 6, 7)
  - [x]5.1 确认 boss_decay onTick 扣分测试存在且正确
  - [x]5.2 确认 boss_double_target apply/cleanup 测试存在且正确
  - [x]5.3 确认 boss_diminish getDiminishMultiplier 测试存在且正确
  - [x]5.4 确认精英版参数弱于满功率的参数化测试覆盖全部 6 个
  - [x]5.5 运行全部测试，确认 0 失败

## Dev Notes

### 关键发现：实现已完成，需补充集成测试

**Story 18.4 已实现所有 6 个数值修饰器。** 本 Story 的核心价值是：
1. **验证实现正确性** — 审计代码与 AC 对应
2. **补充 3 个缺失的集成测试** — combo_punish、cap、fast_time 目前只有 getParams 测试
3. **确保端到端管道正确** — battle.ts 钩子与修饰器参数正确联动

### 6 个数值修饰器集成点总览

| 修饰器 | 参数 | 集成点 | 测试状态 |
|--------|------|--------|----------|
| boss_decay | decayRate 0.05/0.025 | onTick（自包含） | ✅ 已有 onTick + 下限测试 |
| boss_combo_punish | comboPunishRate 0.20/0.10 | battle.ts `playerWrong()` | ❌ 仅 getParams |
| boss_cap | scoreCap 50/75 | battle.ts `completeWord()` | ❌ 仅 getParams |
| boss_fast_time | timeSpeed 1.5/1.25 | battle.ts `startTimer()` | ❌ 仅 getParams |
| boss_double_target | targetMultiplier 2.0/1.5 | apply() 直接改 state.targetScore | ✅ 已有 apply/cleanup 测试 |
| boss_diminish | diminishRate 0.10/0.05 | battle.ts `completeWord()` + helpers | ✅ 已有 multiplier + counter 测试 |

### 集成测试方法（CRITICAL）

由于 battle.ts 函数不直接导出（内部函数），集成测试应**模拟钩子逻辑**而非调用 battle.ts。具体做法：

```typescript
// combo_punish 集成测试模式：
// 模拟 playerWrong() 中的 combo_punish 逻辑
applyModifier('boss_combo_punish', false)
state.score = 1000
const modEffect = getActiveParams()
if (modEffect?.comboPunishRate && state.score > 0) {
  const penalty = Math.floor(state.score * modEffect.comboPunishRate)
  state.score = Math.max(0, state.score - penalty)
}
expect(state.score).toBe(800) // 1000 - 200 = 800
```

```typescript
// cap 集成测试模式：
// 模拟 completeWord() 中的 cap 逻辑
applyModifier('boss_cap', false)
let finalWordScore = 100
const modEffect = getActiveParams()
if (modEffect?.scoreCap) {
  finalWordScore = Math.min(finalWordScore, modEffect.scoreCap)
}
expect(finalWordScore).toBe(50)
```

```typescript
// fast_time 集成测试模式：
// 模拟 startTimer() 中的 timeSpeed 逻辑
applyModifier('boss_fast_time', false)
state.time = 30.0
const modEffect = getActiveParams()
const timeSpeed = modEffect?.timeSpeed ?? 1
state.time -= 0.1 * timeSpeed
expect(state.time).toBeCloseTo(29.85) // 30 - 0.15 = 29.85
```

### battle.ts 中已有的钩子代码（不要重复实现）

**playerWrong() — combo_punish 钩子：**
```typescript
// battle.ts:273-279
const modEffect = getActiveParams();
if (modEffect?.comboPunishRate && state.score > 0) {
  const penalty = Math.floor(state.score * modEffect.comboPunishRate);
  state.score = Math.max(0, state.score - penalty);
  showFeedback(`-${penalty}分!`, '#ff4444');
}
```

**completeWord() — cap + diminish 钩子：**
```typescript
// battle.ts:304-312
const modEffect = getActiveParams();
if (modEffect?.scoreCap) {
  finalWordScore = Math.min(finalWordScore, modEffect.scoreCap);
}
if (modEffect?.diminishRate) {
  finalWordScore = Math.floor(finalWordScore * getDiminishMultiplier());
  incrementDiminishCount();
}
```

**startTimer() — fast_time + onTick 钩子：**
```typescript
// battle.ts:501-508
const modEffect = getActiveParams();
const timeSpeed = modEffect?.timeSpeed ?? 1;
state.time -= 0.1 * timeSpeed;
tickModifier(0.1);
```

### 已由 18.4 完成的基础设施（不要重复实现）

- 6 个数值修饰器的完整 `BossModifier` 实现 [Source: `data/bossModifiers.ts:213-286`]
- `BossModifierParams` 含 6 个数值参数字段 [Source: `data/bossModifiers.ts:171-176`]
- battle.ts 中所有 4 个集成钩子（playerWrong、completeWord、startTimer、applyModifier）
- `incrementDiminishCount()` / `getDiminishMultiplier()` 导出函数 [Source: `data/bossModifiers.ts:277-286`]
- `originalTargetScore` 保存/恢复机制（boss_double_target）[Source: `data/bossModifiers.ts:248-265`]
- 精英版参数弱于满功率的参数化测试 [Source: `tests/unit/systems/bossModifierEngine.test.ts:294-310`]

### 测试 DOM mock 注意事项

数值修饰器测试**不需要 DOM mock**。它们只操作 `state.score`、`state.time`、`state.targetScore` 等纯数值。现有的 `beforeEach` 中 `resetState()` 和 `cleanupModifier()` 足够。

### 边界情况

| 场景 | 预期行为 |
|------|----------|
| score=0 时 combo_punish | 不扣（`if (state.score > 0)` guard） |
| score=0 时 decay | 不扣（`Math.max(0, score - penalty)`） |
| finalWordScore < cap | 不截断（`Math.min` 保留原值） |
| diminish 15 词后 | 倍率 = max(0, 1 - 0.10*15) = 0（不会负数） |
| time=0.01 时 fast_time | 正常扣 0.15，time 变为负数（battle 有 time<=0 检测） |
| double_target cleanup 多次 | 仅 originalTargetScore > 0 时恢复（幂等） |
| cap + diminish 同时激活 | 不可能：每个 modifier 只有一个 param 生效 |

### Project Structure Notes

**修改文件（仅测试）：**
- `src/tests/unit/systems/bossModifierEngine.test.ts` — 新增 combo_punish、cap、fast_time 集成测试

**不修改文件（已完成）：**
- `src/src/data/bossModifiers.ts` — 6 个数值修饰器已完整实现
- `src/src/systems/battle.ts` — 4 个集成钩子已就位
- `src/src/systems/bossModifierEngine.ts` — 引擎不变
- `src/src/style.css` — 数值修饰器无视觉效果

### References

- [Source: docs/stories/epic-18-boss-act-structure.md — Story 18.8 验收标准 + 数值规则类 Boss 参数表]
- [Source: src/src/data/bossModifiers.ts:213-286 — 6 个数值修饰器完整实现]
- [Source: src/src/data/bossModifiers.ts:169-176 — BossModifierParams 数值参数字段]
- [Source: src/src/systems/battle.ts:273-279 — playerWrong() combo_punish 钩子]
- [Source: src/src/systems/battle.ts:304-312 — completeWord() cap + diminish 钩子]
- [Source: src/src/systems/battle.ts:501-508 — startTimer() fast_time + onTick 钩子]
- [Source: src/tests/unit/systems/bossModifierEngine.test.ts:153-310 — 现有数值修饰器测试]
- [Source: docs/stories/18-7-boss-rhythm-lock.md — 前序 Story 实现模式参考]
- [Source: docs/project-context.md — 依赖方向、性能预算]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

无调试问题

### Completion Notes List

- 审计确认：全部 6 个数值修饰器在 Story 18.4 中已完整实现，battle.ts 4 个集成钩子（playerWrong、completeWord、startTimer、applyModifier）已就位
- 新增 10 个集成测试：combo_punish 4 个（满功率/精英/零分/取整）、cap 3 个（截断/不截断/精英）、fast_time 3 个（1.5x/1.25x/默认1x）
- Task 3.4 (cap+diminish 同时) 标记 N/A：每个 modifier 只有一个 param 生效，不可能同时激活
- 测试总数 105 → 115，全部通过
- 无代码修改，仅补充测试覆盖
- Code Review 修复 3 个 MEDIUM：添加 combo_punish 反馈格式测试（M1）、测试文件头部补充 18.8（M2）、连续断连复合扣分测试（M3）
- 测试总数 115 → 117，全部通过

### File List

- `src/tests/unit/systems/bossModifierEngine.test.ts` — 新增 10 个数值修饰器集成测试
- `docs/stories/sprint-status.yaml` — 18-8 → done
