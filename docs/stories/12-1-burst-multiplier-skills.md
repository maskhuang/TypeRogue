# Story 12.1: 爆发流与倍率流技能

Status: done

## Story

As a 玩家,
I want 爆发流（burst/lone/void/gamble）和倍率流（amp/chain/overclock）7 个技能通过 Modifier 管道注册并在游戏中生效,
so that 我可以在商店中购买并体验两种核心进攻流派的构筑路线。

## Acceptance Criteria

1. burst: base 层 +5 分（已实现，验证匹配即可）
2. lone: base 层 +8 分，条件 skills_triggered_this_word = 1（注意：代码中 wordSkillCount++ 在 context 之前，value=1 表示"仅 lone 自身触发"，等价于 AC 原文的"无其他技能"）（已实现，验证匹配即可）
3. void: base 层 +12 分，减去本词其他触发数（已实现，验证匹配即可）
4. gamble: base 层 random(0.5) 条件下 +15 分
5. amp: base 层 +0.2 倍率（已实现，验证匹配即可）
6. chain: base 层 +0.1 倍率，条件：本词前一个触发的技能与当前不同
7. overclock: enhance 层 ×1.5，条件：本词已触发 ≥3 个技能
8. 所有 7 个技能有 Modifier 定义、SKILLS 数据条目、generateFeedback 反馈、单元测试

## Tasks / Subtasks

- [x] Task 1: 扩展类型定义 (AC: #4, #6, #7)
  - [x] 1.1 在 `core/types.ts` 的 `SkillType` 联合类型中添加 `'gamble' | 'chain' | 'overclock'`
  - [x] 1.2 在 `systems/modifiers/ModifierTypes.ts` 的 `ModifierCondition` 中添加 `| { type: 'skills_triggered_gte'; value: number }` 和 `| { type: 'different_skill_from_last' }`
  - [x] 1.3 在 `systems/modifiers/ModifierTypes.ts` 的 `PipelineContext` 中添加 `currentSkillId?: string` 和 `lastTriggeredSkillId?: string`
  - [x] 1.4 在 `core/types.ts` 的 `SynergyState` 接口中添加 `lastTriggeredSkillId: string | null`
  - [x] 1.5 在 `core/state.ts` 的 `createSynergyState()` 中初始化 `lastTriggeredSkillId: null`

- [x] Task 2: 实现新条件评估 (AC: #6, #7)
  - [x] 2.1 在 `ConditionEvaluator.ts` 的 switch 中添加 `skills_triggered_gte`: `return (ctx.skillsTriggeredThisWord ?? 0) >= condition.value`
  - [x] 2.2 在 `ConditionEvaluator.ts` 的 switch 中添加 `different_skill_from_last`: `return ctx.lastTriggeredSkillId != null && ctx.currentSkillId !== ctx.lastTriggeredSkillId`

- [x] Task 3: 添加新技能 SKILLS 数据 (AC: #4, #6, #7)
  - [x] 3.1 `data/skills.ts` SKILLS 添加 gamble: `{ name: '豪赌', icon: '🎲', type: 'gamble', category: 'active', base: 15, grow: 5, desc: '50%概率+15分' }`
  - [x] 3.2 `data/skills.ts` SKILLS 添加 chain: `{ name: '连锁', icon: '🔗', type: 'chain', category: 'active', base: 10, grow: 5, desc: '连续不同技能触发时+0.1倍率' }`
  - [x] 3.3 `data/skills.ts` SKILLS 添加 overclock: `{ name: '超频', icon: '⚡', type: 'overclock', category: 'active', base: 50, grow: 10, desc: '本词第3+技能时效果×1.5' }`

- [x] Task 4: 添加新技能 SKILL_MODIFIER_DEFS 工厂 (AC: #4, #6, #7)
  - [x] 4.1 gamble 工厂: `[{ ...baseModifier(id, 'score', 'score', skillVal(id, lvl)), condition: { type: 'random', probability: 0.5 } }]`
  - [x] 4.2 chain 工厂: `[{ ...baseModifier(id, 'multiply', 'multiply', skillVal(id, lvl) / 100), condition: { type: 'different_skill_from_last' } }]`
  - [x] 4.3 overclock 工厂: enhance 层 score multiplicative，value = `1 + skillVal(id, lvl) / 100`，condition: `{ type: 'skills_triggered_gte', value: 3 }`

- [x] Task 5: 集成到技能系统 (AC: #6, #7)
  - [x] 5.1 `systems/skills.ts` `triggerSkill()` 中在 `buildTriggerContext()` 之后追加 context 字段: `context.currentSkillId = skillId; context.lastTriggeredSkillId = synergy.lastTriggeredSkillId ?? undefined`
  - [x] 5.2 `triggerSkill()` 中在设置 context 后更新: `synergy.lastTriggeredSkillId = skillId`（注意必须在 buildTriggerContext 之后、pipeline resolve 之前）
  - [x] 5.3 `systems/battle.ts` `setWord()` 的 per-word 重置块中添加: `synergy.lastTriggeredSkillId = null`

- [x] Task 6: 添加技能反馈 (AC: #8)
  - [x] 6.1 `generateFeedback()` 添加 gamble case: win → `豪赌! +${score}` #f1c40f; lose → `豪赌...空手` #666
  - [x] 6.2 `generateFeedback()` 添加 chain case: active → `连锁! +${multiply.toFixed(1)}` #e67e22; inactive → `连锁断裂...` #666
  - [x] 6.3 `generateFeedback()` 添加 overclock case: `超频!` #e74c3c

- [x] Task 7: 验证现有技能 (AC: #1, #2, #3, #5)
  - [x] 7.1 确认 burst SKILL_MODIFIER_DEFS: base 层 score +5 at level 1 ✓
  - [x] 7.2 确认 lone SKILL_MODIFIER_DEFS: base 层 score +8 at level 1, condition skills_triggered_this_word=1 ✓
  - [x] 7.3 确认 void SKILL_MODIFIER_DEFS: base 层 score +12 at level 1, 动态扣减 ✓
  - [x] 7.4 确认 amp SKILL_MODIFIER_DEFS: base 层 multiply +0.2 at level 1 ✓

- [x] Task 8: 测试 (AC: #8)
  - [x] 8.1 新增条件评估测试 in `ConditionEvaluator.test.ts`: `skills_triggered_gte` 3 条 + `different_skill_from_last` 4 条
  - [x] 8.2 新增 SKILL_MODIFIER_DEFS 工厂测试 in `skills.modifiers.test.ts`: gamble（结构+升级）、chain（结构+条件+升级）、overclock（enhance 层+条件+升级）
  - [x] 8.3 新增管道集成测试 in `skills.pipeline.test.ts`: gamble win/lose、chain different/same/no-prior、overclock 3rd+/2nd/solo
  - [x] 8.4 新增反馈测试 in `skills.pipeline.test.ts`: gamble win/lose、chain active/inactive、overclock feedback
  - [x] 8.5 回归测试: 全量 1641 tests 通过，零回归（新增 27 条）

## Dev Notes

### 技能 → Modifier 映射表

| 技能 | 层 | 阶段 | 效果类型 | 值 (Lv1) | 条件 | 状态 |
|------|------|------|---------|----------|------|------|
| burst | base | calculate | score +5 | skillVal | — | 已实现 |
| lone | base | calculate | score +8 | skillVal | skills_triggered_this_word=1 | 已实现 |
| void | base | calculate | score +12-N | 动态 | — | 已实现 |
| gamble | base | calculate | score +15 | skillVal | random(0.5) | **新增** |
| amp | base | calculate | multiply +0.2 | skillVal/100 | — | 已实现 |
| chain | base | calculate | multiply +0.1 | skillVal/100 | different_skill_from_last | **新增** |
| overclock | enhance | calculate | score ×1.5 | 1+skillVal/100 | skills_triggered_gte(3) | **新增** |

### 新增 SKILLS 数据设计

| 技能 | base | grow | 公式 | Lv1 效果 | Lv2 效果 | Lv3 效果 |
|------|------|------|------|----------|----------|----------|
| gamble | 15 | 5 | skillVal = base + grow*(lvl-1) | 50% +15分 | 50% +20分 | 50% +25分 |
| chain | 10 | 5 | skillVal/100 | +0.1 倍率 | +0.15 倍率 | +0.2 倍率 |
| overclock | 50 | 10 | 1 + skillVal/100 | ×1.5 | ×1.6 | ×1.7 |

### 新增条件类型

**`skills_triggered_gte`**: 大于等于比较（区别于现有 `skills_triggered_this_word` 的严格等于）
```typescript
case 'skills_triggered_gte':
  return (ctx.skillsTriggeredThisWord ?? 0) >= condition.value
```

**`different_skill_from_last`**: 本词前一个触发的技能与当前不同
```typescript
case 'different_skill_from_last':
  return ctx.lastTriggeredSkillId != null
    && ctx.currentSkillId !== ctx.lastTriggeredSkillId
```

- 第一个触发的技能（无前置）→ 条件不满足（chain 不触发）
- 与前一个相同的技能触发 → 条件不满足
- 与前一个不同的技能触发 → 条件满足

### PipelineContext 扩展

```typescript
// 新增字段
currentSkillId?: string       // 当前触发的技能 ID
lastTriggeredSkillId?: string // 本词前一个触发的技能 ID
```

### SynergyState 扩展

```typescript
lastTriggeredSkillId: string | null  // 初始化 null，每词重置
```

在 `triggerSkill()` 中的时序：
```
synergy.wordSkillCount++          // ← 已有
context = buildTriggerContext()    // ← 已有
context.currentSkillId = skillId          // ← 新增
context.lastTriggeredSkillId = synergy.lastTriggeredSkillId  // ← 新增
synergy.lastTriggeredSkillId = skillId    // ← 新增（更新给下一次触发用）
registry = createScopedRegistry()  // ← 已有
result = EffectPipeline.resolve()  // ← 已有
```

### overclock 设计决策

overclock 是 enhance 层，提供 score 类型乘法加成。当相邻技能触发时（通过 `createScopedRegistry` 注入），如果本词已触发 ≥3 个技能，该增强生效。

**自触发行为**: overclock 自身触发时，其 enhance 层被注册但 base 层无 score 产出，最终 score = 0 × 1.5 = 0。overclock 的价值在于**被动增强相邻技能**，而非自身产出。

**仅增强 score 类型**: 当前设计与 aura 模式一致，仅增强 score 类型效果。如需增强所有效果类型，可在未来扩展为多 Modifier（score + multiply + time）。

**位置策略**: 玩家应将 overclock 放在高频触发的 score 技能（burst/gamble/void）旁边，并确保键盘上有足够技能达到 3+ 触发条件。

### lone 条件值说明

Epic AC 原文写 `skills_triggered_this_word = 0`，但实际实现使用 `value: 1`。这是因为 `triggerSkill()` 中 `synergy.wordSkillCount++` 在 `buildTriggerContext()` 之前执行，所以 lone 触发时 `skillsTriggeredThisWord` 已经包含 lone 自身 (=1)。条件 `value=1` 等价于"无其他技能触发"。

### gamble 反馈检测

gamble 使用 `random(0.5)` 条件。当条件不满足时，Modifier 不生效，pipeline 返回 `effects.score = 0`。`generateFeedback()` 通过 `effects.score > 0` 判断 win/lose 状态。

### References

- [Source: docs/epics.md#Story 12.1] 原始需求定义
- [Source: docs/brainstorming-skills-relics-refactor-2026-02-20.md#方向 B] 技能设计参考
- [Source: src/src/data/skills.ts] 现有技能数据 + SKILL_MODIFIER_DEFS
- [Source: src/src/core/types.ts] SkillType、SynergyState 类型定义
- [Source: src/src/systems/skills.ts] 技能系统：triggerSkill、buildTriggerContext、createScopedRegistry、generateFeedback
- [Source: src/src/systems/modifiers/ModifierTypes.ts] Modifier 接口、PipelineContext、ModifierCondition
- [Source: src/src/systems/modifiers/ConditionEvaluator.ts] 条件评估器（14 种条件原语）
- [Source: docs/stories/11-5-skill-migration.md] Story 11.5 技能迁移参考（SKILL_MODIFIER_DEFS 模式）

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- 3 个新技能（gamble/chain/overclock）完整实现：SKILLS 数据 + SKILL_MODIFIER_DEFS 工厂 + generateFeedback 反馈
- 2 个新条件原语（skills_triggered_gte, different_skill_from_last）添加到 ModifierCondition + ConditionEvaluator
- PipelineContext 扩展 currentSkillId + lastTriggeredSkillId 字段
- SynergyState 扩展 lastTriggeredSkillId 跟踪（每词重置）
- triggerSkill() 集成：context 字段追加 + synergy 更新时序正确
- battle.ts setWord() 中添加 lastTriggeredSkillId 重置
- 4 个已有技能（burst/lone/void/amp）验证匹配 AC
- gamble 使用已有 random 条件，chain 使用新增 different_skill_from_last 条件，overclock 使用新增 skills_triggered_gte 条件
- overclock 设计为 enhance 层 score-only 增强器（与 aura 模式一致），自身触发不产出
- 新增 27 条测试（7 条件 + 9 工厂 + 6 管道集成 + 5 反馈），全量 1641 tests 通过
- [Code Review] H1: different_skill_from_last 添加 currentSkillId null guard + 新增测试
- [Code Review] M1: ActiveSkillType 补充 gamble/chain/overclock
- [Code Review] M2: overclock 反馈区分条件满足/不满足状态 + 新增测试
- [Code Review] L1: 条件原语计数注释 12→15
- [Code Review] L2: CHAIN_SKILL_TYPES 添加澄清注释

### Change Log

- 2026-02-20: Story 12.1 实现完成
- 2026-02-20: Code Review — 修复 5 个 findings (1H+2M+2L), 全量 1643 tests 通过

### File List

**修改:**
- `src/src/core/types.ts` — SkillType 添加 gamble/chain/overclock; SynergyState 添加 lastTriggeredSkillId
- `src/src/core/state.ts` — createSynergyState 初始化 lastTriggeredSkillId: null
- `src/src/systems/modifiers/ModifierTypes.ts` — ModifierCondition 添加 skills_triggered_gte/different_skill_from_last; PipelineContext 添加 currentSkillId/lastTriggeredSkillId
- `src/src/systems/modifiers/ConditionEvaluator.ts` — 添加 skills_triggered_gte 和 different_skill_from_last 评估逻辑
- `src/src/data/skills.ts` — SKILLS 添加 gamble/chain/overclock 数据; SKILL_MODIFIER_DEFS 添加 3 个工厂
- `src/src/systems/skills.ts` — triggerSkill() 添加 context.currentSkillId/lastTriggeredSkillId + synergy 更新; generateFeedback() 添加 gamble/chain/overclock case
- `src/src/systems/battle.ts` — setWord() 添加 synergy.lastTriggeredSkillId = null 重置
- `src/tests/unit/systems/modifiers/ConditionEvaluator.test.ts` — 新增 7 条条件测试
- `src/tests/unit/data/skills.modifiers.test.ts` — 新增 9 条工厂测试; 全部技能数从 10 更新为 13
- `src/tests/unit/systems/skills.pipeline.test.ts` — 新增 11 条管道集成+反馈测试
