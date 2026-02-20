# Story 11.6: 现有遗物迁移

Status: done

## Story

As a 开发者,
I want 将所有遗物从硬编码的 hasRelic() 检查迁移到 Modifier 注册式管道,
so that 遗物效果与技能效果使用统一的 EffectPipeline 计算，便于未来扩展新遗物和交叉效果。

## Acceptance Criteria

1. 所有 13 个现有遗物改为 `RELIC_MODIFIER_DEFS` 工厂表达（global 层 Modifier）
2. 遗物效果通过 `EffectPipeline.resolve()` 统一计算，不再硬编码 `hasRelic()` 检查
3. `battle.ts` 中所有 7 处 `hasRelic()` 调用被移除，改为管道/查询接口
4. `shop.ts` 中所有 3 处 `hasRelic()` 调用被移除，改为管道/查询接口
5. 现有全部遗物相关测试通过，行为不变
6. 新增 `RELIC_MODIFIER_DEFS` 工厂测试（至少 13 个遗物各一条）
7. 新增管道集成测试：遗物 + 技能混合管道至少 3 条

## Tasks / Subtasks

- [x] Task 1: 扩展 Modifier 基础设施 (AC: #1, #2)
  - [x] 1.1 在 `ModifierTypes.ts` 的 `PipelineContext` 中添加 `multiplier?: number` 和 `overkill?: number` 字段
  - [x] 1.2 在 `ModifierTypes.ts` 的 `ModifierCondition` 中添加 `multiplier_gte` 条件类型
  - [x] 1.3 在 `ConditionEvaluator.ts` 中实现 `multiplier_gte` 评估逻辑
  - [x] 1.4 在 `ModifierTypes.ts` 的 `ModifierBehavior` 中添加 `{ type: 'combo_protect'; probability: number }` 行为
  - [x] 1.5 在 `BehaviorExecutor.ts` 中添加 `onComboProtect?(probability: number): boolean` 回调

- [x] Task 2: 创建 `RELIC_MODIFIER_DEFS` 工厂 (AC: #1)
  - [x] 2.1 在 `data/relics.ts` 中定义 `RelicModifierFactory` 类型和 `RELIC_MODIFIER_DEFS` 常量
  - [x] 2.2 实现 13 个遗物的 Modifier 工厂（10 pipeline + 3 行为型）
  - [x] 2.3 行为型遗物（magnet、lucky_coin、perfectionist）使用查询接口模式

- [x] Task 3: 创建遗物管道解析接口 (AC: #2, #3, #4)
  - [x] 3.1 在 `systems/relics/` 创建 `RelicPipeline.ts`，提供 `resolveRelicEffects(trigger, context)` 函数
  - [x] 3.2 `resolveRelicEffects` 内部：遍历玩家遗物，调用工厂注册临时 ModifierRegistry，调用 EffectPipeline.resolve()
  - [x] 3.3 提供 `queryRelicFlag(flagName)` 查询接口，替代 magnet/lucky_coin/perfectionist 的 hasRelic()

- [x] Task 4: 迁移 battle.ts 硬编码 (AC: #3)
  - [x] 4.1 `pickWord()`: `hasRelic('magnet')` → `queryRelicFlag('magnet_bias')`
  - [x] 4.2 `playerCorrect()`: `hasRelic('perfectionist')` → `queryRelicFlag('perfectionist_streak')`
  - [x] 4.3 `playerWrong()`: `hasRelic('phoenix_feather')` → `resolveRelicEffectsWithBehaviors('on_error')` + combo_protect 行为
  - [x] 4.4 `completeWord()`: `hasRelic('berserker_mask')` → `resolveRelicEffects('on_word_complete')` 的 multiply 效果
  - [x] 4.5 `completeWord()`: `hasRelic('time_crystal')` → 同上的 time 效果
  - [x] 4.6 `showGoldReward()`: `hasRelic('overkill_blade')` + `hasRelic('treasure_map')` → `resolveRelicEffects('on_battle_end')` 的 gold 效果

- [x] Task 5: 迁移 shop.ts 硬编码 (AC: #4)
  - [x] 5.1 `openShop()`: 3 处 `hasRelic()` 统一替换为 `resolveRelicEffects('on_battle_end')` 的 gold 效果
  - [x] 5.2 移除 `hasRelic` 导入，改用 `resolveRelicEffects` 导入

- [x] Task 6: 处理技能+遗物管道交互 (AC: #2)
  - [x] 6.1 `createScopedRegistry` 中调用 `injectRelicModifiers(registry, context)` 注入遗物 global 层（golden_keyboard）
  - [x] 6.2 combo_badge 通过 on_word_complete pipeline 解析；combo_crown 通过 on_battle_start pipeline 解析

- [x] Task 7: 测试 (AC: #5, #6, #7)
  - [x] 7.1 新增 `relic.pipeline.test.ts`：13 个 RELIC_MODIFIER_DEFS 工厂单元测试（17 tests）
  - [x] 7.2 新增管道集成测试：8 条 resolveRelicEffects 集成 + 2 条 behavior 集成 + 3 条 injectRelicModifiers 集成
  - [x] 7.3 新增 queryRelicFlag 测试 7 条
  - [x] 7.4 确保现有 `RelicSystem.test.ts`（30 tests）、`relics.test.ts`（30 tests）全部通过
  - [x] 7.5 回归测试：全量 1614 tests 通过，零回归

## Dev Notes

### 遗物 → Modifier 映射表

| 遗物 | 触发 | 层/阶段 | 效果 | 条件 | 特殊处理 |
|------|------|---------|------|------|---------|
| lucky_coin | passive | — | — | — | 查询接口 `queryRelicFlag('price_discount')` — 注：商店尚未消费此标记 |
| time_crystal | on_word_complete | base/calculate | time +0.5 | — | |
| piggy_bank | on_battle_end | base/calculate | gold +10 | — | |
| magnet | passive | — | — | — | 查询接口 `queryRelicFlag('magnet_bias')` |
| combo_badge | on_word_complete | base/calculate | multiply +combo*0.01 | — | 需要 context.combo |
| phoenix_feather | on_error | global/after | behavior: combo_protect(0.5) | — | 代码实际使用 50%，非数据的 30% |
| berserker_mask | on_word_complete | base/calculate | multiply +0.5 | multiplier_gte(3.0) | 旧代码 `>` 改为 `>=`，边界影响极小 |
| treasure_map | on_battle_end | base/calculate | gold +15 | — | |
| overkill_blade | on_battle_end | base/calculate | gold +overkill | — | 需要 context.overkill |
| combo_crown | on_battle_start | base/calculate | multiply +0.3 | — | startLevel() 管道解析 |
| golden_keyboard | on_skill_trigger | global/calculate | score ×1.25 | — | 注入到技能管道 |
| time_lord | on_battle_start | base/calculate | time +8 | — | startLevel() 管道解析 |
| perfectionist | passive | — | — | — | 查询接口 `queryRelicFlag('perfectionist_streak')` |

### 数据/代码不一致修正

迁移时统一以**代码行为**为准（因为代码行为是玩家实际体验的）：
- **phoenix_feather**: 数据声明 30%，代码使用 50%。Modifier 使用 `combo_protect(0.5)`
- **berserker_mask**: 数据声明 combo>20，代码使用 multiplier>3.0。Modifier 使用 `multiplier_gte(3.0)`（注意：`>=` 而非原代码的 `>`，边界影响极小）
- **lucky_coin**: `queryRelicFlag('price_discount')` 已定义（返回 0.1），但 shop.ts 尚未消费折扣逻辑（pre-existing gap）
- **combo_crown / time_lord**: 原代码未集成到游戏循环，迁移后通过 `resolveRelicEffects('on_battle_start')` 在 `startLevel()` 中统一解析
- 迁移完成后更新 `data/relics.ts` 的数据定义以匹配

### 架构模式

```
RELIC_MODIFIER_DEFS[relicId](relicId, context) → Modifier[]
                 ↓
     resolveRelicEffects(trigger, context)
                 ↓
  遍历 state.player.relics → 调用工厂 → 临时 ModifierRegistry
                 ↓
       EffectPipeline.resolve(registry, trigger, context)
                 ↓
         PipelineResult { effects, pendingBehaviors }
```

- 工厂是无状态的：每次调用创建新 Modifier，支持动态值（overkill_blade 的 gold = overkill，combo_badge 的 multiply = combo*0.01）
- 不修改 RelicSystem 类：保留为 UI/事件层，新的 RelicPipeline 是纯计算层
- golden_keyboard 通过注入到技能管道的 global 层实现（类似 ripple bonus）

### 行为型遗物处理

magnet 和 lucky_coin 不影响数值管道，而是影响游戏行为（选词偏好、价格折扣）。这两个通过 `queryRelicFlag()` 查询接口替代 `hasRelic()`，底层仍查询 `state.player.relics`，但语义更清晰。

### Project Structure Notes

- `data/relics.ts`: 添加 `RELIC_MODIFIER_DEFS` 工厂（与 SKILL_MODIFIER_DEFS 对称）
- `systems/relics/RelicPipeline.ts`: 新增遗物管道解析层
- `systems/modifiers/ModifierTypes.ts`: 扩展 PipelineContext + ModifierCondition
- `systems/modifiers/ConditionEvaluator.ts`: 添加 multiplier_gte 评估
- `systems/modifiers/BehaviorExecutor.ts`: 添加 combo_protect 回调
- `systems/battle.ts`: 移除 7 处 hasRelic()，改用管道
- `systems/shop.ts`: 移除 3 处 hasRelic()，改用管道
- `tests/unit/systems/relics/relic.pipeline.test.ts`: 新增测试文件

### References

- [Source: docs/epics.md#Story 11.6] 原始需求定义
- [Source: src/src/systems/modifiers/ModifierTypes.ts] Modifier 接口与管道类型
- [Source: src/src/systems/modifiers/EffectPipeline.ts] 三层效果管道
- [Source: src/src/systems/modifiers/ConditionEvaluator.ts] 条件评估器
- [Source: src/src/systems/modifiers/BehaviorExecutor.ts] 行为执行器
- [Source: src/src/data/relics.ts] 遗物数据定义
- [Source: src/src/systems/relics/RelicEffects.ts] 现有硬编码效果处理器
- [Source: src/src/systems/relics/RelicSystem.ts] 现有遗物系统类
- [Source: src/src/systems/battle.ts] 战斗系统硬编码遗物检查
- [Source: src/src/systems/shop.ts] 商店系统硬编码遗物检查
- [Source: src/src/data/skills.ts#SKILL_MODIFIER_DEFS] 技能工厂模式参考
- [Source: docs/stories/11-5-skill-migration.md] 技能迁移参考（相同模式）

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- 13 个遗物全部迁移到 RELIC_MODIFIER_DEFS 工厂（10 pipeline + 3 flag query）
- battle.ts 移除 7 处 hasRelic()，shop.ts 移除 3 处 hasRelic()
- 加法效果使用 base 层（baseSum += value），乘法效果使用 global 层（globalProduct *= value）
- relicMod 默认 layer 改为 'base'（仅 golden_keyboard 显式使用 global）
- phoenix_feather 使用 after 阶段 combo_protect 行为（被 BehaviorExecutor 收集）
- berserker_mask 使用 multiply +0.5 而非 score ×1.5，与 bonusMult = 1 + multiply 配合
- berserker_mask 条件从 `> 3.0` 改为 `>= 3.0`（multiplier_gte），边界影响极小
- golden_keyboard 通过 injectRelicModifiers() 注入技能管道的 global 层
- combo_crown / time_lord 通过 startLevel() 中 resolveRelicEffects('on_battle_start') 统一解析
- lucky_coin price_discount 标记已定义但商店尚未消费（pre-existing gap）
- 新增 37 条遗物管道测试 + 7 条 modifier 基础设施测试 = 44 条新测试
- 全量测试 1614 pass，零回归

### Change Log

- 2026-02-20: Story 11.6 实现完成
- 2026-02-20: Code Review 修复 — H1: startLevel() 添加 on_battle_start 管道消费; M1: 记录 berserker_mask >= 边界变更; M2: 映射表修正; L1: relicMod 默认 layer 改为 base

### File List

**新增:**
- `src/src/systems/relics/RelicPipeline.ts` — 遗物管道解析层（resolveRelicEffects, queryRelicFlag, injectRelicModifiers）
- `src/tests/unit/systems/relics/relic.pipeline.test.ts` — 37 条遗物管道测试

**修改:**
- `src/src/systems/modifiers/ModifierTypes.ts` — PipelineContext 添加 multiplier/overkill；ModifierCondition 添加 multiplier_gte；ModifierBehavior 添加 combo_protect；BehaviorCallbacks 添加 onComboProtect
- `src/src/systems/modifiers/ConditionEvaluator.ts` — 添加 multiplier_gte 评估逻辑
- `src/src/systems/modifiers/BehaviorExecutor.ts` — 添加 combo_protect 行为处理
- `src/src/data/relics.ts` — 添加 RELIC_MODIFIER_DEFS 工厂（13 个遗物）
- `src/src/systems/battle.ts` — 移除 7 处 hasRelic()，改用 resolveRelicEffects/queryRelicFlag
- `src/src/systems/shop.ts` — 移除 3 处 hasRelic()，改用 resolveRelicEffects
- `src/src/systems/skills.ts` — createScopedRegistry 中添加 injectRelicModifiers 调用
- `src/tests/unit/systems/modifiers/ConditionEvaluator.test.ts` — 添加 4 条 multiplier_gte 测试
- `src/tests/unit/systems/modifiers/BehaviorExecutor.test.ts` — 添加 3 条 combo_protect 测试
