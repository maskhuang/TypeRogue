# Story 14.1: 字母升级系统

Status: done

## Story

As a 玩家,
I want 每个字母（A-Z）可从 Lv0 升级到 Lv3，打出升级过的字母时获得额外底分,
so that 打字不再只是触发技能，每个字母都成为可投资的资源，创造"升级字母→选词库→最大化收益"的策略闭环。

## Acceptance Criteria

1. PlayerState 新增 `letterLevels: Map<string, number>`（默认 Lv0）
2. 字母升级 = base 层 Modifier，trigger=`on_correct_keystroke`，condition=`key_is(letter)`
3. Lv1=+1, Lv2=+2, Lv3=+3 底分（每次该字母正确击键时累加）
4. `upgradeLetter(key)` 方法，最高 Lv3
5. 键盘可视化显示字母等级（等级徽标或颜色区分）
6. 单元测试覆盖所有 AC

## Tasks / Subtasks

- [x] Task 1: 扩展类型系统 (AC: #1, #2)
  - [x] 1.1 `ModifierTypes.ts` ModifierCondition 添加 `| { type: 'key_is'; key: string }`
  - [x] 1.2 `ModifierTypes.ts` PipelineContext 添加 `currentKeystrokeKey?: string`
  - [x] 1.3 `ConditionEvaluator.ts` 实现 `key_is` 条件评估：`ctx.currentKeystrokeKey?.toLowerCase() === condition.key.toLowerCase()`
  - [x] 1.4 `core/types.ts` PlayerState 将 `letterBonus: number`（当前未使用）替换为 `letterLevels: Map<string, number>`
  - [x] 1.5 `core/state.ts` 初始化 `letterLevels: new Map()` + synergy.letterBaseScore

- [x] Task 2: 字母升级核心逻辑 (AC: #3, #4)
  - [x] 2.1 新建 `systems/letters/LetterUpgradeSystem.ts`
  - [x] 2.2 `upgradeLetter(key: string): boolean` — 升级指定字母（0→1→2→3），超过 Lv3 返回 false
  - [x] 2.3 `getLetterLevel(key: string): number` — 返回字母当前等级
  - [x] 2.4 `getLetterModifiers(): Modifier[]` — 返回所有已升级字母的 base 层修饰器
  - [x] 2.5 `resetLetters(): void` — 通过 resetState→createInitialState 清除（letterLevels: new Map()）

- [x] Task 3: 管道集成 — 击键时累加字母底分 (AC: #2, #3)
  - [x] 3.1 `battle.ts` 正确击键处理中：构建 PipelineContext（含 `currentKeystrokeKey`）
  - [x] 3.2 注册字母修饰器到临时 Registry，通过 `EffectPipeline.resolve('on_correct_keystroke', ctx)` 计算
  - [x] 3.3 将字母底分累加到 `synergy.letterBaseScore`（新字段），在词语完成时参与总分计算
  - [x] 3.4 `core/state.ts` synergy 新增 `letterBaseScore: number`，battle 开局和每词重置为 0
  - [x] 3.5 `battle.ts` 词语完成分数公式更新：`(wordBaseScore + synergy.skillBaseScore + synergy.letterBaseScore) × multiplier`

- [x] Task 4: 键盘可视化 (AC: #5)
  - [x] 4.1 `ui/keyboard/KeyVisual.ts` 添加 setLetterLevel/getLetterLevel 方法
  - [x] 4.2 等级视觉区分：Lv0=默认，Lv1=淡蓝边框，Lv2=蓝色边框，Lv3=金色边框+加粗
  - [x] 4.3 `KeyboardVisualizer.ts` 监听 `letter:upgraded` 事件 + syncLetterLevels 方法

- [x] Task 5: 单元测试 (AC: #6)
  - [x] 5.1 `ConditionEvaluator.test.ts` 添加 6 个 `key_is` 条件测试（大小写、不匹配、空值）
  - [x] 5.2 新建 `tests/unit/systems/letters/LetterUpgradeSystem.test.ts`（20 个测试：升级/查询/重置/上限/事件）
  - [x] 5.3 管道集成测试：字母修饰器 + 技能修饰器叠加验证 + "sleep" 示例
  - [x] 5.4 确保所有现有测试不回归（1805 total tests passing, 72 files）

## Dev Notes

### 关键实现模式

**修饰器工厂模式（与 skills/relics 一致）：**
```typescript
// 字母 E 升级到 Lv2 时生成的修饰器
{
  id: 'letter:e:score',
  source: 'letter:e',
  sourceType: 'letter',       // ModifierSourceType 已有 'letter'
  layer: 'base',
  trigger: 'on_correct_keystroke',
  phase: 'calculate',
  condition: { type: 'key_is', key: 'e' },
  effect: { type: 'score', value: 2, stacking: 'additive' },
  priority: 50,               // 字母优先级 < 技能(100) < 遗物(200)
}
```

**击键分数累加流程：**
```
正确击键 → 构建 PipelineContext(currentKeystrokeKey='e')
         → EffectPipeline.resolve(letterRegistry, 'on_correct_keystroke', ctx)
         → result.effects.score 累加到 synergy.letterBaseScore
         → 词语完成时：finalScore = (wordBase + skillBase + letterBase) × multiplier
```

**示例计算：**
```
词语 "sleep": s(Lv0) l(Lv0) e(Lv2) e(Lv2) p(Lv0)
字母底分: 0 + 0 + 2 + 2 + 0 = 4
总分: (wordBase + skillBase + 4) × multiplier
```

### 防坑指南

1. **不要用 ScoreCalculator.letterBonus** — 旧字段是单一数字，无法区分每个字母。直接删除或忽略，通过 modifier pipeline 实现
2. **`on_correct_keystroke` 已定义在 ModifierTrigger** — 无需新增 trigger 类型，只需在 battle.ts 击键处添加 pipeline 调用
3. **字母修饰器注册时机** — 不是每次击键创建，而是 `upgradeLetter()` 时生成并缓存，击键时只做 resolve
4. **大小写** — `key_is` 条件统一用 `.toLowerCase()` 比较，PlayerState 中 key 统一存小写
5. **`sourceType: 'letter'` 已在 ModifierTypes.ts 定义** — 无需添加
6. **synergy 重置** — `letterBaseScore` 每词重置为 0（与 `skillBaseScore` 一样）

### 与现有系统的交互

- **技能系统**：字母底分与技能底分在 base 层各自 additive 叠加，互不干扰
- **遗物系统**：未来遗物可通过 enhance/global 层乘以字母底分（Story 14.2 预留）
- **商店系统**：Story 14.2 负责购买界面，本 Story 只实现核心升级逻辑
- **结算面板**：字母底分应在 settlement chips 中单独显示（如"字母+4"）

### Project Structure Notes

新文件放置：
```
src/src/systems/letters/LetterUpgradeSystem.ts   ← 新目录 letters/
src/tests/unit/systems/letters/LetterUpgradeSystem.test.ts
```

修改文件：
```
src/src/systems/modifiers/ModifierTypes.ts       ← key_is 条件 + currentKeystrokeKey
src/src/systems/modifiers/ConditionEvaluator.ts   ← key_is 评估
src/src/core/types.ts                             ← letterLevels 替换 letterBonus
src/src/core/state.ts                             ← 初始化 + synergy.letterBaseScore
src/src/systems/battle.ts                         ← 击键 pipeline 调用 + 分数公式
src/src/ui/keyboard/KeyboardVisualizer.ts         ← 等级显示
```

依赖方向：`data ← core ← systems ← scenes`（LetterUpgradeSystem 在 systems 层）

### References

- [Source: docs/epics.md#Epic 14] Epic 14 完整规格（Stories 14.1-14.3）
- [Source: docs/brainstorming-skills-relics-refactor-2026-02-20.md#方向D] 字母升级设计详情
- [Source: docs/game-architecture.md#Project Structure] 代码组织规范
- [Source: docs/stories/13-1-build-catalyst-relics.md] 修饰器工厂 + 条件扩展模式参考
- [Source: src/src/systems/modifiers/ModifierTypes.ts] 管道类型定义（sourceType='letter' 已存在）
- [Source: src/src/systems/modifiers/ConditionEvaluator.ts] 条件评估器模式参考
- [Source: src/src/core/types.ts#L39] 现有 letterBonus 字段（需替换）

## Dev Agent Record

### Agent Model Used
claude-opus-4-6

### Debug Log References
- battle.ts: removed `state.player.letterBonus` reference (field replaced by letterLevels Map)

### Completion Notes List
- Task 1: Extended ModifierTypes (key_is condition + currentKeystrokeKey context), replaced PlayerState.letterBonus with letterLevels Map, added synergy.letterBaseScore
- Task 2: Created LetterUpgradeSystem with upgradeLetter/getLetterLevel/getLetterModifiers/resetLetters functions; emits letter:upgraded event
- Task 3: Integrated letter pipeline in battle.ts playerCorrect — creates ModifierRegistry per keystroke, resolves on_correct_keystroke, accumulates to synergy.letterBaseScore; updated completeWord and settlement formulas to include letterBaseScore
- Task 4: Added letter level display to KeyVisual (Lv1=淡蓝, Lv2=蓝, Lv3=金+加粗边框); KeyboardVisualizer listens for letter:upgraded events and provides syncLetterLevels
- Task 5: 26 new tests — 6 key_is condition tests in ConditionEvaluator.test.ts + 20 tests in LetterUpgradeSystem.test.ts (upgrade/query/reset/maxLevel/events/pipeline integration/sleep example)

### Code Review Fixes
- **H1 (Performance)**: Cached letter modifiers in LetterUpgradeSystem (invalidated on upgrade/reset); cached ModifierRegistry in battle.ts at startLevel() instead of per-keystroke allocation
- **M1 (Validation)**: Added input validation in upgradeLetter() — rejects non-single-letter keys (empty, numbers, multi-char)
- **M2 (Tests)**: Added 3 edge case tests for invalid upgradeLetter() inputs; updated beforeEach to use resetLetters() for proper cache cleanup
- Tests: 1808 total passing (72 files)

### File List
- `src/src/systems/letters/LetterUpgradeSystem.ts` (NEW)
- `src/src/systems/modifiers/ModifierTypes.ts` — key_is condition + currentKeystrokeKey in PipelineContext
- `src/src/systems/modifiers/ConditionEvaluator.ts` — key_is case
- `src/src/core/types.ts` — letterLevels replaces letterBonus; letterBaseScore in SynergyState
- `src/src/core/state.ts` — letterLevels: new Map(); letterBaseScore: 0
- `src/src/core/events/EventBus.ts` — letter:upgraded event type
- `src/src/systems/battle.ts` — letter pipeline integration in playerCorrect; letterBaseScore in score formulas
- `src/src/ui/keyboard/KeyVisual.ts` — setLetterLevel/getLetterLevel + level-based border colors
- `src/src/ui/keyboard/KeyboardVisualizer.ts` — onLetterUpgraded handler + syncLetterLevels
- `src/tests/unit/systems/modifiers/ConditionEvaluator.test.ts` — 6 key_is tests
- `src/tests/unit/systems/letters/LetterUpgradeSystem.test.ts` (NEW) — 23 tests
