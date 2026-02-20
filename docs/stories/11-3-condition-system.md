# Story 11.3: 条件系统

Status: done

## Story

As a 开发者,
I want 一个 ConditionEvaluator，根据 PipelineContext 评估 ModifierCondition 的 12 种条件原语,
so that 修饰器可以有条件地生效，支持连击阈值、相邻技能、词语属性等条件触发。

## Acceptance Criteria

1. `ConditionEvaluator.evaluate(condition, context)` 返回 `boolean`
2. 战斗状态条件 (4): `combo_gte`, `combo_lte`, `no_errors`, `random(probability)`
3. 位置条件 (3): `adjacent_skills_gte(n)`, `adjacent_empty_gte(n)`, `adjacent_has_type(skillType)`
4. 词语条件 (3): `word_length_gte(n)`, `word_length_lte(n)`, `word_has_letter(letter)`
5. 上下文条件 (2): `skills_triggered_this_word(n)` (精确匹配), `nth_word(n)` (每 N 个词触发，取模)
6. 无条件的修饰器始终生效（`condition` 为 undefined 时返回 true）
7. 扩展 `PipelineContext` 接口，添加条件评估所需的上下文字段（全部可选，向后兼容）
8. 更新 `EffectPipeline.resolve()` 在三个阶段插入条件评估（替换 TODO 注释）
9. 单元测试覆盖所有 12 种条件类型 + 无条件情况 + EffectPipeline 集成
10. 不修改任何现有技能或遗物代码（纯新增 + 修改 modifiers 模块内部）
11. 所有现有测试通过，零回归

## Tasks / Subtasks

- [x] Task 1: 扩展 PipelineContext 接口 (AC: #7)
  - [x] 1.1 在 `ModifierTypes.ts` 的 `PipelineContext` 中添加字段：combo?, hasError?, adjacentSkillCount?, adjacentEmptyCount?, adjacentSkillTypes?, currentWord?, skillsTriggeredThisWord?, wordNumber?
  - [x] 1.2 所有字段标记为可选（向后兼容，现有测试不需要修改）

- [x] Task 2: 实现 ConditionEvaluator (AC: #1, #2, #3, #4, #5, #6)
  - [x] 2.1 创建 `src/src/systems/modifiers/ConditionEvaluator.ts`
  - [x] 2.2 实现 `evaluate(condition, context)` 静态方法：condition 为 undefined 时返回 true
  - [x] 2.3 实现战斗状态条件：combo_gte (combo >= value), combo_lte (combo <= value), no_errors (!hasError), random (Math.random() < probability)
  - [x] 2.4 实现位置条件：adjacent_skills_gte (adjacentSkillCount >= value), adjacent_empty_gte (adjacentEmptyCount >= value), adjacent_has_type (adjacentSkillTypes 包含 skillType)
  - [x] 2.5 实现词语条件：word_length_gte (currentWord.length >= value), word_length_lte (currentWord.length <= value), word_has_letter (currentWord 包含 letter)
  - [x] 2.6 实现上下文条件：skills_triggered_this_word (skillsTriggeredThisWord === value), nth_word (wordNumber > 0 && wordNumber % value === 0)
  - [x] 2.7 缺失上下文字段时的默认行为：数值默认 0，hasError 默认 false，字符串默认 ''，数组默认 []

- [x] Task 3: 集成到 EffectPipeline (AC: #8)
  - [x] 3.1 在 Phase 1 (before) 循环中添加条件检查：`if (mod.condition && !ConditionEvaluator.evaluate(mod.condition, context)) continue`
  - [x] 3.2 在 Phase 2 (calculate) 循环中添加条件检查（在 effect.type 过滤之前）
  - [x] 3.3 在 Phase 3 (after) filter 中添加条件检查

- [x] Task 4: 模块导出 (AC: #10)
  - [x] 4.1 更新 `src/src/systems/modifiers/index.ts` 导出 ConditionEvaluator

- [x] Task 5: 单元测试 (AC: #9, #11)
  - [x] 5.1 创建 `src/tests/unit/systems/modifiers/ConditionEvaluator.test.ts`
  - [x] 5.2 测试 condition=undefined → true
  - [x] 5.3 测试 combo_gte: combo=10, value=5 → true; combo=3, value=5 → false; 边界 combo=5 → true
  - [x] 5.4 测试 combo_lte: combo=3, value=5 → true; combo=10, value=5 → false
  - [x] 5.5 测试 no_errors: hasError=false → true; hasError=true → false; 默认 → true
  - [x] 5.6 测试 random: mock Math.random()，probability=0.5, random=0.3 → true; 0.7 → false; 0.5 → false (不含边界)
  - [x] 5.7 测试 adjacent_skills_gte: adjacentSkillCount=3, value=2 → true; adjacentSkillCount=1, value=2 → false
  - [x] 5.8 测试 adjacent_empty_gte: adjacentEmptyCount=2, value=1 → true; adjacentEmptyCount=0, value=1 → false
  - [x] 5.9 测试 adjacent_has_type: adjacentSkillTypes=['score','time'], skillType='score' → true; skillType='multiply' → false; 默认 → false
  - [x] 5.10 测试 word_length_gte: currentWord='hello'(5), value=5 → true; value=6 → false
  - [x] 5.11 测试 word_length_lte: currentWord='hi'(2), value=3 → true; value=1 → false
  - [x] 5.12 测试 word_has_letter: currentWord='hello', letter='e' → true; letter='z' → false; 默认 → false
  - [x] 5.13 测试 skills_triggered_this_word: skillsTriggeredThisWord=0, value=0 → true; value=1 → false; value=3, count=3 → true
  - [x] 5.14 测试 nth_word: wordNumber=6, value=3 → true; wordNumber=5, value=3 → false; wordNumber=0 → false; 默认 → false
  - [x] 5.15 测试缺失上下文字段的默认行为
  - [x] 5.16 EffectPipeline 集成测试：条件不满足的修饰器被跳过
  - [x] 5.17 EffectPipeline 集成测试：条件满足的修饰器正常计算
  - [x] 5.18 全部 1476 个测试通过（+38 新增, 1 更新），零回归

## Dev Notes

### 核心设计

**条件系统是"中等复杂度"：**
- 12 种条件原语，不做 AND/OR 组合
- 每个修饰器最多一个条件（或无条件）
- 条件评估是纯函数，无副作用

### PipelineContext 扩展

```typescript
export interface PipelineContext {
  // 战斗状态
  combo?: number                    // state.combo
  hasError?: boolean                // 本场战斗是否出过错

  // 位置（由调用方预计算）
  adjacentSkillCount?: number       // 相邻键中有技能的数量
  adjacentEmptyCount?: number       // 相邻键中无技能的数量
  adjacentSkillTypes?: string[]     // 相邻键上技能的类型列表

  // 词语
  currentWord?: string              // state.player.word

  // 上下文
  skillsTriggeredThisWord?: number  // synergy.wordSkillCount
  wordNumber?: number               // 本场战斗第几个词（1-indexed）
}
```

**所有字段可选** — 这保证向后兼容：
- 11.2 的现有测试不传 context，所有条件字段 undefined
- 未提供的字段使用安全默认值（数值 0，布尔 false，字符串 ''，数组 []）

### ConditionEvaluator API

```typescript
class ConditionEvaluator {
  static evaluate(condition: ModifierCondition | undefined, context?: PipelineContext): boolean {
    if (!condition) return true  // 无条件 = 始终生效

    const ctx = context ?? {}

    switch (condition.type) {
      case 'combo_gte':    return (ctx.combo ?? 0) >= condition.value
      case 'combo_lte':    return (ctx.combo ?? 0) <= condition.value
      case 'no_errors':    return !(ctx.hasError ?? false)
      case 'random':       return Math.random() < condition.probability
      // ... 其余 8 种
    }
  }
}
```

### EffectPipeline 集成模式

三处 TODO 替换为相同的条件检查模式：

```typescript
// Phase 1 (before) — 在 intercept 检查前
for (const mod of beforeMods) {
  if (mod.condition && !ConditionEvaluator.evaluate(mod.condition, context)) continue
  if (mod.behavior?.type === 'intercept') { ... }
}

// Phase 2 (calculate) — 在 effect.type 过滤前
for (const mod of calcMods) {
  if (mod.condition && !ConditionEvaluator.evaluate(mod.condition, context)) continue
  if (mod.effect?.type !== effectType) continue
  // ... 三层计算
}

// Phase 3 (after) — 在 filter 中添加
const pendingBehaviors = afterMods
  .filter(mod => mod.behavior != null && (!mod.condition || ConditionEvaluator.evaluate(mod.condition, context)))
  .map(mod => mod.behavior!)
```

### 各条件的评估逻辑

| 条件类型 | 逻辑 | 默认值 |
|---------|------|--------|
| combo_gte | `combo >= value` | combo=0 |
| combo_lte | `combo <= value` | combo=0 |
| no_errors | `!hasError` | hasError=false → true |
| random | `Math.random() < probability` | — |
| adjacent_skills_gte | `adjacentSkillCount >= value` | count=0 |
| adjacent_empty_gte | `adjacentEmptyCount >= value` | count=0 |
| adjacent_has_type | `adjacentSkillTypes.includes(skillType)` | types=[] |
| word_length_gte | `currentWord.length >= value` | word='' → length=0 |
| word_length_lte | `currentWord.length <= value` | word='' → length=0 |
| word_has_letter | `currentWord.includes(letter)` | word='' → false |
| skills_triggered_this_word | `skillsTriggeredThisWord === value` | count=0 |
| nth_word | `wordNumber > 0 && wordNumber % value === 0` | wordNumber=0 → false |

### 与现有系统的关系

**本 Story 修改 modifiers 模块内部，不改外部文件：**
- 修改 `ModifierTypes.ts` — 扩展 PipelineContext
- 修改 `EffectPipeline.ts` — 插入条件评估
- 修改 `index.ts` — 新增导出
- 新增 `ConditionEvaluator.ts` — 评估器实现
- 新增 `ConditionEvaluator.test.ts` — 单元测试
- 不改 `skills.ts`, `battle.ts`, `relics/` — Story 11.5/11.6

**参考现有模式：**
- `RelicEffects.checkCondition()` — 类似的条件检查模式（3 种 → 扩展为 12 种）
- `getAdjacentSkills()` / `getAdjacentEmptyCount()` — 位置条件的数据来源参考
- 位置数据由调用方预计算后放入 PipelineContext，ConditionEvaluator 保持纯函数

### 测试中 random 条件的处理

```typescript
import { vi } from 'vitest'

it('random: probability=0.5, Math.random()=0.3 → true', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.3)
  expect(ConditionEvaluator.evaluate(
    { type: 'random', probability: 0.5 },
    {}
  )).toBe(true)
  vi.restoreAllMocks()
})
```

### Project Structure Notes

```
src/src/systems/modifiers/
├── ModifierTypes.ts          # 扩展 PipelineContext（修改）
├── ModifierRegistry.ts       # 不修改
├── EffectPipeline.ts         # 插入条件评估（修改）
├── ConditionEvaluator.ts     # 条件评估器（新增）
└── index.ts                  # 更新导出（修改）

src/tests/unit/systems/modifiers/
├── ModifierRegistry.test.ts  # 不修改
├── EffectPipeline.test.ts    # 不修改（现有测试不传 context，条件全部通过）
└── ConditionEvaluator.test.ts # 单元测试（新增）
```

### References

- [Source: docs/brainstorming-skills-relics-refactor-2026-02-20.md#方向 A — 条件系统]
- [Source: docs/epics.md#Epic 11, Story 11.3]
- [Source: docs/stories/11-1-modifier-interface-registry.md — ModifierCondition 类型]
- [Source: docs/stories/11-2-three-layer-pipeline.md — EffectPipeline TODO 插入点]
- [Source: src/src/systems/modifiers/ModifierTypes.ts — 现有 PipelineContext 空接口]
- [Source: src/src/systems/modifiers/EffectPipeline.ts — 3 处 TODO 注释]
- [Source: src/src/systems/relics/RelicEffects.ts — checkCondition() 参考模式]
- [Source: src/src/systems/skills.ts — getAdjacentSkills() 位置数据参考]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- 扩展 PipelineContext 接口：8 个可选字段（combo, hasError, adjacentSkillCount, adjacentEmptyCount, adjacentSkillTypes, currentWord, skillsTriggeredThisWord, wordNumber）
- 实现 ConditionEvaluator.evaluate() 静态方法，支持全部 12 种条件原语：
  - 战斗状态 (4): combo_gte, combo_lte, no_errors, random
  - 位置 (3): adjacent_skills_gte, adjacent_empty_gte, adjacent_has_type
  - 词语 (3): word_length_gte, word_length_lte, word_has_letter
  - 上下文 (2): skills_triggered_this_word (精确匹配), nth_word (取模)
- 所有缺失上下文字段有安全默认值（数值 0，布尔 false，字符串 ''，数组 []）
- 集成到 EffectPipeline：替换 3 处 TODO 为条件检查（before/calculate/after 三阶段）
- EffectPipeline 参数 `_context` 重命名为 `context`（去掉下划线前缀，现在实际使用）
- 更新 EffectPipeline.test.ts 的条件测试：从"始终通过"改为验证条件满足/不满足两种情况
- 38 个新增单元测试（36 ConditionEvaluator + 2 集成测试），1 个更新测试
- 全部 1476 个测试通过，零回归
- 纯模块内修改，未改动任何技能或遗物文件
- [Code Review] Calculate 阶段条件检查移至 effectType 过滤之后，避免冗余评估（尤其 random 条件）
- [Code Review] 新增 2 个集成测试：before-phase 条件拦截跳过 + after-phase 条件行为排除
- 全部 1478 个测试通过（+2 review 新增），零回归

### File List

- `src/src/systems/modifiers/ModifierTypes.ts` — 扩展 PipelineContext 接口（修改）
- `src/src/systems/modifiers/ConditionEvaluator.ts` — 条件评估器实现（新增）
- `src/src/systems/modifiers/EffectPipeline.ts` — 集成条件评估（修改）
- `src/src/systems/modifiers/index.ts` — 更新导出（修改）
- `src/tests/unit/systems/modifiers/ConditionEvaluator.test.ts` — 单元测试（新增）
- `src/tests/unit/systems/modifiers/EffectPipeline.test.ts` — 更新条件测试（修改）
