# Story 14.3: 词语条件扩展

Status: done

## Story

As a 玩家,
I want 技能和遗物的触发条件能感知词语特征（重复字母、元音比例、技能命中率等），
so that 选词决策从"含不含技能字母"扩展到"这个词的特征适不适合我的构筑"，增加策略深度。

## Acceptance Criteria

1. `word_has_double_letter`: 词含重复字母时为 true（如 jazz, book, see）
2. `word_all_unique_letters`: 词无重复字母时为 true（如 words, flame）
3. `word_vowel_ratio_gte(n)`: 元音占比 ≥ n（0.0~1.0 比例值）
4. `skill_density_gte(n)`: 技能键命中率 ≥ n（词中绑定技能的字母数 / 词长，含重复计数）
5. 所有条件为运行时计算，零数据维护
6. 单元测试覆盖所有新条件
7. 至少 1 个遗物使用新条件作为示例

## Tasks / Subtasks

- [x] Task 1: 扩展条件类型 (AC: #1-#4)
  - [x] 1.1 `ModifierTypes.ts` ModifierCondition 新增 4 个类型：`word_has_double_letter`, `word_all_unique_letters`, `word_vowel_ratio_gte`, `skill_density_gte`
  - [x] 1.2 `ModifierTypes.ts` PipelineContext 新增 `skillDensity?: number`（预计算的技能键命中率）
  - [x] 1.3 注意：`currentWord` 已在 PipelineContext 定义但未被 `buildTriggerContext()` 填充，此 Task 一并修复

- [x] Task 2: 实现条件评估 (AC: #1-#5)
  - [x] 2.1 `ConditionEvaluator.ts` 新增 `word_has_double_letter` 分支：遍历 currentWord 检查是否有重复字母
  - [x] 2.2 `ConditionEvaluator.ts` 新增 `word_all_unique_letters` 分支：检查 currentWord 所有字母是否唯一
  - [x] 2.3 `ConditionEvaluator.ts` 新增 `word_vowel_ratio_gte` 分支：统计元音(aeiou)占比 ≥ condition.value
  - [x] 2.4 `ConditionEvaluator.ts` 新增 `skill_density_gte` 分支：读取 ctx.skillDensity 与 condition.value 比较

- [x] Task 3: 管道上下文补全 (AC: #4, #5)
  - [x] 3.1 `skills.ts` `buildTriggerContext()` 添加 `currentWord: state.player.word`（修复现有缺失）
  - [x] 3.2 `skills.ts` `buildTriggerContext()` 添加 `skillDensity` 预计算：词中每个字母检查是否有 binding，命中数 / 词长
  - [x] 3.3 新增辅助函数 `computeSkillDensity(word: string): number`

- [x] Task 4: 示例遗物 (AC: #7)
  - [x] 4.1 `data/relics.ts` 新增遗物 `rhyme_master`（韵律大师）：`word_has_double_letter` 时所有技能底分 +3
  - [x] 4.2 `data/relics.ts` RELIC_MODIFIER_DEFS 新增 `rhyme_master` 工厂
  - [x] 4.3 `systems/relics/RelicTypes.ts` — 无需修改（RelicData 接口已支持）

- [x] Task 5: 单元测试 (AC: #6)
  - [x] 5.1 `ConditionEvaluator.test.ts` 新增 `word_has_double_letter` 测试（6 个：含重复/无重复/空词/大写/单字母/多种重复）
  - [x] 5.2 `ConditionEvaluator.test.ts` 新增 `word_all_unique_letters` 测试（6 个：全唯一/有重复/空词/大写/单字母/全相同）
  - [x] 5.3 `ConditionEvaluator.test.ts` 新增 `word_vowel_ratio_gte` 测试（6 个：高元音/低元音/边界/不足/空词/大写）
  - [x] 5.4 `ConditionEvaluator.test.ts` 新增 `skill_density_gte` 测试（4 个：高密度/零密度/边界/undefined）
  - [x] 5.5 管道集成测试：遗物 `rhyme_master` 条件满足/不满足时的分数差异（2 个测试）
  - [x] 5.6 互斥性测试 + 所有现有测试不回归（1789/1789 passed）

## Dev Notes

### 关键实现模式

**新增 4 个条件类型（添加到 ModifierCondition 联合类型）：**
```typescript
// ModifierTypes.ts — ModifierCondition 新增
| { type: 'word_has_double_letter' }
| { type: 'word_all_unique_letters' }
| { type: 'word_vowel_ratio_gte'; value: number }   // 0.0~1.0 比例
| { type: 'skill_density_gte'; value: number }       // 0.0~1.0 比例
```

**ConditionEvaluator 新增 4 个分支：**
```typescript
// ConditionEvaluator.ts — switch 新增
case 'word_has_double_letter': {
  const w = (ctx.currentWord ?? '').toLowerCase()
  return w.length > 0 && new Set(w).size < w.length
}

case 'word_all_unique_letters': {
  const w = (ctx.currentWord ?? '').toLowerCase()
  return w.length > 0 && new Set(w).size === w.length
}

case 'word_vowel_ratio_gte': {
  const w = (ctx.currentWord ?? '').toLowerCase()
  if (w.length === 0) return false
  const vowelCount = [...w].filter(c => 'aeiou'.includes(c)).length
  return vowelCount / w.length >= condition.value
}

case 'skill_density_gte':
  return (ctx.skillDensity ?? 0) >= condition.value
```

**PipelineContext 扩展 + buildTriggerContext 补全：**
```typescript
// ModifierTypes.ts — PipelineContext 新增
skillDensity?: number  // 词中技能键命中率 (0.0~1.0)

// skills.ts — buildTriggerContext() 补全
export function buildTriggerContext(triggerKey: string, adjacent: AdjacentSkill[]): PipelineContext {
  return {
    // ...现有字段...
    currentWord: state.player.word,  // ← 修复：之前未填充
    skillDensity: computeSkillDensity(state.player.word),  // ← 新增
  };
}

function computeSkillDensity(word: string): number {
  if (!word || word.length === 0) return 0
  const w = word.toLowerCase()
  let hits = 0
  for (const ch of w) {
    if (state.player.bindings.has(ch)) hits++
  }
  return hits / w.length
}
```

**示例遗物 — 韵律大师：**
```typescript
// data/relics.ts — RELICS 新增
rhyme_master: {
  id: 'rhyme_master',
  name: '韵律大师',
  icon: '🎵',
  description: '词含重复字母时所有技能底分 +3',
  rarity: 'rare',
  basePrice: 55,
  effects: [
    { type: 'on_skill_trigger', modifier: 'score_bonus', value: 3 }
  ],
  flavor: '重复的韵律中蕴藏着力量。'
}

// data/relics.ts — RELIC_MODIFIER_DEFS 新增
rhyme_master: (id) => [
  relicMod(id, 'score', 'on_skill_trigger', 'calculate', {
    effect: { type: 'score', value: 3, stacking: 'additive' },
    condition: { type: 'word_has_double_letter' },
  }),
],
```

### 防坑指南

1. **`currentWord` 在 PipelineContext 已定义但未填充** — `buildTriggerContext()` 目前没有设置 `currentWord`。必须补上 `currentWord: state.player.word`，否则所有词语条件都将失效（默认空串 → 所有条件返回 false）
2. **`state.player.word` 是大写** — `pickWord()` 返回 `.toUpperCase()`。条件评估时必须 `.toLowerCase()` 统一处理，包括元音检查和重复字母检查
3. **`skill_density_gte` 需要预计算** — 不要在 ConditionEvaluator 中访问 state（违反纯函数原则）。在 `buildTriggerContext()` 中预计算 `skillDensity` 并传入 PipelineContext
4. **空词边界** — `word_has_double_letter` 和 `word_all_unique_letters` 对空词应返回 false；`word_vowel_ratio_gte` 对空词应返回 false（避免除零）
5. **`word_has_double_letter` 和 `word_all_unique_letters` 互斥** — 对非空词，二者必定一真一假。不需要特别处理，但测试应验证这一点
6. **元音常量复用** — `VOWELS` 已在 `LetterUpgradeSystem.ts` 导出为 `['a', 'e', 'i', 'o', 'u'] as const`。ConditionEvaluator 可直接用字符串 `'aeiou'` 内联（避免跨层引入依赖），因为元音集合是稳定常量
7. **不要修改现有条件的行为** — 只新增 case 分支，不修改任何已有条件的逻辑
8. **`skill_density_gte` 计数含重复** — "book" 绑定了 b 和 o → b(1)+o(1)+o(1)+k(0)=3/4=0.75，不是 2/4=0.5。每个字母位置独立计数

### 与现有系统的交互

- **ConditionEvaluator.ts**：新增 4 个 case 分支到 switch，不改已有分支
- **ModifierTypes.ts**：ModifierCondition 联合类型新增 4 项 + PipelineContext 新增 `skillDensity`
- **skills.ts**：`buildTriggerContext()` 补全 `currentWord` 和 `skillDensity`
- **data/relics.ts**：新增 1 个示例遗物 `rhyme_master`（RELICS + RELIC_MODIFIER_DEFS）
- **battle.ts**：无修改 — currentWord 通过 skills.ts 的 buildTriggerContext 传递
- **data/words.ts**：无修改 — 所有条件运行时计算，零数据维护
- **LetterUpgradeSystem.ts**：无修改

### Project Structure Notes

修改文件：
```
src/src/systems/modifiers/ModifierTypes.ts       ← 4 条件类型 + skillDensity
src/src/systems/modifiers/ConditionEvaluator.ts   ← 4 case 分支
src/src/systems/skills.ts                         ← buildTriggerContext 补全 + computeSkillDensity
src/src/data/relics.ts                            ← rhyme_master 遗物
src/tests/unit/systems/modifiers/ConditionEvaluator.test.ts  ← +27 新测试
```

新文件：
```
（无）
```

依赖方向：`data ← core ← systems ← scenes`（所有修改在 systems 和 data 层）

### References

- [Source: docs/epics.md#Epic 14] Story 14.3 完整 AC
- [Source: docs/brainstorming-skills-relics-refactor-2026-02-20.md#方向E] 词语条件扩展设计
- [Source: docs/stories/14-2-letter-upgrade-shop.md] Story 14.2 实现记录（前置依赖）
- [Source: docs/stories/14-1-letter-upgrade-system.md] Story 14.1 — LetterUpgradeSystem + key_is 条件
- [Source: src/src/systems/modifiers/ModifierTypes.ts] 管道类型定义（PipelineContext.currentWord 已定义）
- [Source: src/src/systems/modifiers/ConditionEvaluator.ts] 条件评估器（当前 19 条件）
- [Source: src/src/systems/skills.ts#L59-71] buildTriggerContext — 需补全 currentWord
- [Source: src/src/data/relics.ts] 遗物数据 + Modifier 工厂模式参考

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

None required — all tests passed on first full run after fixing relic count assertions.

### Completion Notes List

- Fixed pre-existing bug: `buildTriggerContext()` was not populating `currentWord` in PipelineContext despite the field being defined. Added `currentWord: state.player.word`.
- All 4 new conditions use `.toLowerCase()` because `state.player.word` stores uppercase words.
- `computeSkillDensity()` exported as standalone helper for testability, counts each letter position independently (including duplicates) per story spec.
- Empty word edge cases return `false` for all conditions (avoids division by zero in vowel ratio).
- `word_has_double_letter` and `word_all_unique_letters` are verified mutually exclusive for non-empty words.
- Updated existing relic count tests (18→19, rare 9→10) after adding `rhyme_master`.
- Total tests: 1789 passed across 70 test files.

**Code Review Fixes (Claude Opus 4.6):**
- Fixed relics.test.ts test description mismatch ("18 relics" → "19 relics")
- Added `computeSkillDensity()` direct unit tests (6 tests in skills.pipeline.test.ts)
- Added `rhyme_master` to `getAllRelicIds` explicit assertion list
- Added `rhyme_master` property validation test in Rare relics section
- Fixed stale Dev Notes test count (+16 → +27)
- Total tests after review: 1796 passed across 70 test files.

### File List

Modified:
- `src/src/systems/modifiers/ModifierTypes.ts` — 4 condition types + `skillDensity` context field
- `src/src/systems/modifiers/ConditionEvaluator.ts` — 4 new case branches
- `src/src/systems/skills.ts` — `buildTriggerContext()` fix + `computeSkillDensity()` helper
- `src/src/data/relics.ts` — `rhyme_master` relic data + modifier factory
- `src/tests/unit/systems/modifiers/ConditionEvaluator.test.ts` — +27 new tests (83 total)
- `src/tests/unit/systems/relics/relics.test.ts` — relic count/rarity assertions + rhyme_master property test
- `src/tests/unit/systems/skills.pipeline.test.ts` — +6 computeSkillDensity unit tests
