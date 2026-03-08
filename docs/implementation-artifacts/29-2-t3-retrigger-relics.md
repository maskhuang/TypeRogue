# Story 29.2: T3 重触发遗物实现

Status: done

## Story

As a 玩家,
I want 拥有可以让技能重触发的遗物,
so that 构建中有更多策略选择，通过条件性重触发放大特定技能流派的输出。

## Acceptance Criteria

1. `RELICS` 包含 `echo_bell`、`storm_drum`、`finale` 三个遗物定义
2. `RELIC_MODIFIER_DEFS` 包含对应工厂，产出 `{ type: 'retrigger' }` 行为
3. `echo_bell`：本词第一个技能触发时产出 retrigger 行为（使用 `skills_triggered_this_word` 条件 value=0）
4. `storm_drum`：产出者触发时产出 retrigger 行为（使用已有 `current_skill_is_producer` 条件）
5. `finale`：连击 ≥ 20 时产出 retrigger 行为（使用已有 `combo_gte` 条件）
6. `getRelicSkillMultiplier` 和 `triggerAmplifier` 上下文补传 `skillsTriggeredThisWord` + `combo`
7. 图标唯一性守卫通过（icon registry 测试全绿）
8. 所有现有测试通过 + 新增 T3 遗物测试全绿

## Tasks / Subtasks

- [x] Task 1: relics.ts — 遗物数据与工厂 (AC: #1, #2, #3, #4, #5)
  - [x] 1.1 `RELICS` dict 添加 3 个遗物定义：
    - `echo_bell`: name='回响之铃', icon='🎐', rarity='rare', basePrice=50, desc='每词第一个技能触发两次'
    - `storm_drum`: name='风暴战鼓', icon='🥁', rarity='rare', basePrice=55, desc='产出者技能触发两次'
    - `finale`: name='终幕', icon='🎬', rarity='legendary', basePrice=100, desc='连击≥20时技能触发两次'
  - [x] 1.2 `RELIC_MODIFIER_DEFS` 添加 3 个工厂：
    - `echo_bell`: `relicMod(id, 'retrigger', 'on_skill_trigger', 'after', { behavior: { type: 'retrigger' }, condition: { type: 'skills_triggered_this_word', value: 0 } })`
    - `storm_drum`: `relicMod(id, 'retrigger', 'on_skill_trigger', 'after', { behavior: { type: 'retrigger' }, condition: { type: 'current_skill_is_producer' } })`
    - `finale`: `relicMod(id, 'retrigger', 'on_skill_trigger', 'after', { behavior: { type: 'retrigger' }, condition: { type: 'combo_gte', value: 20 } })`
- [x] Task 2: skills.ts — 补传上下文字段 (AC: #6)
  - [x] 2.1 `getRelicSkillMultiplier` 上下文添加 `skillsTriggeredThisWord: synergy.wordSkillCount` 和 `combo: state.combo`
  - [x] 2.2 `triggerAmplifier` 末尾 `resolveRelicSkillTrigger` 上下文同步添加这两个字段（传 `synergy.wordSkillCount - 1` 保持一致语义）
- [x] Task 3: 测试 (AC: #7, #8)
  - [x] 3.1 `relics.test.ts` 更新遗物数量断言 27→30，稀有度分布断言更新（rare 20→22, legendary 3→4）
  - [x] 3.2 `relics.t3.test.ts` 扩展：3 个遗物工厂产出正确 modifier（行为类型 + 条件 + 触发事件）
  - [x] 3.3 `relics.t3.test.ts` 扩展：echo_bell 条件验证（skillsTriggeredThisWord=0 → 产出，skillsTriggeredThisWord=1 → 不产出）
  - [x] 3.4 `relics.t3.test.ts` 扩展：storm_drum 条件验证（producer → 产出，converter → 不产出）
  - [x] 3.5 `relics.t3.test.ts` 扩展：finale 条件验证（combo=20 → 产出，combo=5 → 不产出）
  - [x] 3.6 `iconRegistry.test.ts` 验证 3 个新图标无冲突（总数 185→188）

## Dev Notes

### 遗物设计

| ID | 名称 | 图标 | 稀有度 | 价格 | 条件 | 设计意图 |
|----|------|------|--------|------|------|----------|
| `echo_bell` | 回响之铃 | 🎐 | rare | 50 | 本词第一个技能 | 适配首字母开局流 |
| `storm_drum` | 风暴战鼓 | 🥁 | rare | 55 | 产出者技能 | 放大产出者密集键盘布局 |
| `finale` | 终幕 | 🎬 | legendary | 100 | combo ≥ 20 | 高连击奖励，build-around legendary |

### 核心机制

三个遗物共享同一管道：`RELIC_MODIFIER_DEFS` 工厂 → `resolveRelicSkillTrigger` → `EffectPipeline.resolve` → `pendingBehaviors` 包含 `{ type: 'retrigger' }` → `BehaviorExecutor.execute` → `onRetrigger()` → `shouldRetrigger = true` → `triggerSkill` 再次执行同一技能。

**不同点仅在条件**：
- `echo_bell` 用 `skills_triggered_this_word` 条件（value=0，精确匹配）
- `storm_drum` 用 `current_skill_is_producer` 条件（已有，无需新增代码）
- `finale` 用 `combo_gte` 条件（已有，无需新增代码）

### 上下文补传关键细节

`getRelicSkillMultiplier` 当前不传 `skillsTriggeredThisWord` 和 `combo`。这两个字段是 `echo_bell` 和 `finale` 条件评估所需。

**`skillsTriggeredThisWord` 时序关键**：在 `triggerProducer` 中，`getRelicSkillMultiplier('producer')` 在 L359 调用，`synergy.wordSkillCount++` 在 L367 调用。因此 `getRelicSkillMultiplier` 执行时 `wordSkillCount` 尚未为本次技能递增——**首个技能触发时 `wordSkillCount === 0`**。`skills_triggered_this_word` 条件 value=0 能精确匹配首个技能。

同理 `triggerConverter` 中：`getRelicSkillMultiplier('converter')` 在 L446，`synergy.wordSkillCount++` 在 L453。

`triggerAmplifier`：`synergy.wordSkillCount++` 在 L893，`resolveRelicSkillTrigger` 在 L927。**增幅者路径相反**：wordSkillCount 已递增。需在 `resolveRelicSkillTrigger` 调用时传 `synergy.wordSkillCount - 1`（或在递增前调用）。**建议方案：将 `resolveRelicSkillTrigger` 调用移到 `synergy.wordSkillCount++` 之前**，保持与 producer/converter 的一致语义。

### 工厂定义模式

遵循现有行为遗物模式（如 `perfect_rhythm`、`phoenix_feather`）：

```typescript
// echo_bell 工厂示例
echo_bell: (id) => [
  relicMod(id, 'retrigger', 'on_skill_trigger', 'after', {
    behavior: { type: 'retrigger' },
    condition: { type: 'skills_triggered_this_word', value: 0 },
  }),
],
```

### 图标选择理由

- 🎐 `echo_bell`: 风铃=回响=重触发，主题契合，避免与共鸣附魔的🔔前缀混淆
- 🥁 `storm_drum`: 鼓=节奏加速=产出加速，主题契合
- 🎬 `finale`: 场记板=终幕=高潮重触发，主题契合
- 已验证：三个图标均未被 skills/enchantments/relics/amplifiers 使用

### 关键文件清单

| 文件 | 操作 |
|------|------|
| `src/src/data/relics.ts` | 修改：RELICS +3 遗物 + RELIC_MODIFIER_DEFS +3 工厂 |
| `src/src/systems/skills.ts` | 修改：getRelicSkillMultiplier/triggerAmplifier 上下文补传 2 字段 |
| `src/tests/unit/systems/relics/relics.test.ts` | 修改：数量断言 27→30 |
| `src/tests/unit/systems/relics/relics.t3.test.ts` | 修改：+6 遗物条件测试 |
| `src/tests/unit/data/iconRegistry.test.ts` | 验证（应自动通过） |

### Project Structure Notes

- 遗物数据遵循 `RELICS` dict + `RELIC_MODIFIER_DEFS` 工厂双注册模式
- 工厂使用 `relicMod` 辅助函数（`relics.ts:460-477`）
- 条件系统使用 `ConditionEvaluator`（无需修改，所需条件类型已存在）
- 测试按 Tier 分文件：`relics.t3.test.ts`

### References

- [Source: docs/planning-artifacts/relic-implementation-plan.md §Epic 5 Story 5.2]
- [Source: src/src/data/relics.ts — RELICS L80-450, RELIC_MODIFIER_DEFS L454-735, relicMod L460-477]
- [Source: src/src/systems/modifiers/ConditionEvaluator.ts — skills_triggered_this_word L55-56, combo_gte L25-26, current_skill_is_producer L121-122]
- [Source: src/src/systems/skills.ts — getRelicSkillMultiplier L105-122, triggerAmplifier L926-934, triggerSkill L946-990]
- [Source: docs/implementation-artifacts/29-1-retrigger-pipeline.md — 管道机制 + Code Review Fixes]

### 前序 Story 模式

Story 29-1 建立的模式：
- `{ type: 'retrigger' }` 行为通过 `BehaviorCallbacks.onRetrigger` 回调设置 `_retriggerRequested` 标志
- `triggerSkill` 使用局部变量 `shouldRetrigger` 在技能 dispatch 后捕获标志（防嵌套覆写）
- 防循环由 `_isRetriggered` 模块标志负责（非条件系统负责）
- `triggerAmplifier` 有独立的 `resolveRelicSkillTrigger` 调用（因不走 `getRelicSkillMultiplier`）
- 连接者（connector）不参与 retrigger

Story 28.2/28.3 建立的遗物数据模式：
- `RELICS` 纯数据定义（UI 展示用）
- `RELIC_MODIFIER_DEFS` 工厂函数产出 `Modifier[]`（管道计算用）
- 行为遗物使用 `phase: 'after'`，数值遗物使用 `phase: 'calculate'`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Task 1: relics.ts — 3 遗物定义（echo_bell/storm_drum/finale）+ 3 RELIC_MODIFIER_DEFS 工厂，均使用 retrigger 行为 + 各自条件
- Task 2: skills.ts — `getRelicSkillMultiplier` 上下文添加 `skillsTriggeredThisWord` 和 `combo`；`triggerAmplifier` 的 `resolveRelicSkillTrigger` 同步添加（传 `wordSkillCount - 1` 补偿递增顺序差异）
- Task 3: 测试更新 — relics.test.ts 数量断言（27→30, rare 20→22, legendary 3→4, effects≥0）；relics.t1/t2/t5 MODIFIER_DEFS 总数 27→30；relics.t3 新增 9 个测试（3 工厂结构 + 6 条件验证）；iconRegistry 总数 185→188
- 全量回归：110 文件 / 2771 测试 / 0 新失败（42 pre-existing audio mock 失败）

### Code Review Fixes (AI)

- **[HIGH] `wordSkillCount - 1` 下溢保护** — `triggerAmplifier` 中 `synergy.wordSkillCount - 1` 可能在边界情况下为 -1。修复：`Math.max(0, synergy.wordSkillCount - 1)`。
- **[MEDIUM] T3 遗物缺少 `flavor` 字段** — 3 个新遗物没有风味文本，与现有 24/27 遗物的模式不一致。修复：添加 flavor 字段。
- **[MEDIUM] 缺少多 retrigger 遗物共存测试** — 新增 2 个测试验证 echo_bell + storm_drum 同时装备时的行为（producer/converter 分支）。

### File List

- `src/src/data/relics.ts` (修改)
- `src/src/systems/skills.ts` (修改)
- `src/tests/unit/systems/relics/relics.test.ts` (修改)
- `src/tests/unit/systems/relics/relics.t1.test.ts` (修改)
- `src/tests/unit/systems/relics/relics.t2.test.ts` (修改)
- `src/tests/unit/systems/relics/relics.t3.test.ts` (修改)
- `src/tests/unit/systems/relics/relics.t5.test.ts` (修改)
- `src/tests/unit/data/iconRegistry.test.ts` (修改)
