# Story 13.1: 构筑催化剂遗物

Status: done

## Story

As a 玩家,
I want 6 个构筑催化剂遗物通过 Modifier 管道注册，每个强化特定流派并改变构筑策略,
so that 遗物不再只是数字放大器，而是真正推动 all-in 构筑决策的规则改变器。

## Acceptance Criteria

1. 虚空之心: global 层，每个空键位 +3 底分（on_skill_trigger，极简/lone/void 流）
2. 连锁放大器: global 层，echo/ripple 互动效果额外触发一次（连锁流）
3. 铁壁: global 层，shield 容量 +2，sentinel 每词回盾 +1（续航流）
4. 被动大师: global 层，被动技能 enhance 层效果翻倍（被动流）
5. 键盘风暴: global 层，技能数 >=12 时所有技能底分 +2（填满键盘流）
6. 赌徒信条: global 层，gamble 100% 成功（爆发/赌博流）
7. 所有遗物通过 RELIC_MODIFIER_DEFS 注册，有单元测试
8. 替换现有弱设计遗物（magnet, combo_badge, berserker_mask, combo_crown, treasure_map, piggy_bank）

## Tasks / Subtasks

- [x] Task 1: 扩展类型系统 (AC: #1-#6)
  - [x] 1.1 `ModifierTypes.ts` PipelineContext 添加 `totalSkillCount?: number`（键盘风暴用）
  - [x] 1.2 `ModifierTypes.ts` ModifierCondition 添加 `| { type: 'total_skills_gte'; value: number }`
  - [x] 1.3 `ModifierTypes.ts` ModifierCondition 添加 `| { type: 'always_true' }`（赌徒信条覆盖 gamble 的 random 条件）
  - [x] 1.4 `modifiers/ConditionEvaluator.ts` 实现 `total_skills_gte` 和 `always_true` 条件评估

- [x] Task 2: 虚空之心 (AC: #1, #7)
  - [x] 2.1 `data/relics.ts` RELICS 添加 `void_heart` 数据（rarity: 'rare', basePrice: 55）
  - [x] 2.2 `data/relics.ts` RELIC_MODIFIER_DEFS 添加工厂：base 层 on_skill_trigger additive score = adjacentEmptyCount * 3
  - [x] 2.3 按 pipeline 语义实现：base 层 additive

- [x] Task 3: 连锁放大器 (AC: #2, #7)
  - [x] 3.1 `data/relics.ts` RELICS 添加 `chain_amplifier` 数据（rarity: 'rare', basePrice: 55）
  - [x] 3.2 `ModifierTypes.ts` ModifierBehavior 添加 `| { type: 'amplify_chain' }`
  - [x] 3.3 `ModifierTypes.ts` BehaviorCallbacks 添加 `onAmplifyChain?(): void`
  - [x] 3.4 `BehaviorExecutor.ts` 添加 `amplify_chain` 分支
  - [x] 3.5 chain_amplifier 实现为行为型（queryRelicFlag），在 triggerSkill 中 echo/ripple 路径直接检查
  - [x] 3.6 `RelicPipeline.ts` `queryRelicFlag` 添加 `'chain_amplifier'` 标记查询
  - [x] 3.7 `systems/skills.ts` echo 额外触发 + ripple 传递效果额外应用

- [x] Task 4: 铁壁 (AC: #3, #7)
  - [x] 4.1 `data/relics.ts` RELICS 添加 `fortress` 数据（rarity: 'rare', basePrice: 50）
  - [x] 4.2 `RelicPipeline.ts` `queryRelicFlag` 添加 `'fortress_shield_bonus'`（返回 2）和 `'fortress_sentinel_bonus'`（返回 1）
  - [x] 4.3 `systems/skills.ts` applyEffects 中：shield 效果 + fortress_shield_bonus
  - [x] 4.4 `systems/skills.ts` triggerSkill 中：sentinel 每层护盾额外 + fortress_sentinel_bonus 分

- [x] Task 5: 被动大师 (AC: #4, #7)
  - [x] 5.1 `data/relics.ts` RELICS 添加 `passive_mastery` 数据（rarity: 'legendary', basePrice: 90）
  - [x] 5.4 `RelicPipeline.ts` `queryRelicFlag` 添加 `'passive_mastery'` 标记
  - [x] 5.5 `systems/skills.ts` `createScopedRegistry` 中：如果 passive_mastery 存在，被动技能的 enhance 层 multiplicative value 翻倍（1 + (value-1)*2）

- [x] Task 6: 键盘风暴 (AC: #5, #7)
  - [x] 6.1 `data/relics.ts` RELICS 添加 `keyboard_storm` 数据（rarity: 'legendary', basePrice: 100）
  - [x] 6.2 `data/relics.ts` RELIC_MODIFIER_DEFS 添加工厂：base 层 on_skill_trigger，condition `total_skills_gte: 12`，score +2
  - [x] 6.3 `systems/skills.ts` `buildTriggerContext` 添加 `totalSkillCount: state.player.skills.size`

- [x] Task 7: 赌徒信条 (AC: #6, #7)
  - [x] 7.1 `data/relics.ts` RELICS 添加 `gamblers_creed` 数据（rarity: 'rare', basePrice: 60）
  - [x] 7.2 `RelicPipeline.ts` `queryRelicFlag` 添加 `'gamblers_creed'` 标记
  - [x] 7.3 `modifiers/ConditionEvaluator.ts`：`random` 条件评估时，state.player.relics.has('gamblers_creed') → 直接返回 true（避免循环依赖）

- [x] Task 8: 替换旧遗物 (AC: #8)
  - [x] 8.1 从 RELICS 移除 6 个弱遗物：`magnet`, `combo_badge`, `berserker_mask`, `combo_crown`, `treasure_map`, `piggy_bank`
  - [x] 8.2 从 RELIC_MODIFIER_DEFS 移除对应工厂
  - [x] 8.3 全局搜索确认无源码引用这些旧 ID（更新了 battle.ts, ShopScene.ts）
  - [x] 8.4 移除 `queryRelicFlag` 中的 `magnet_bias` 分支
  - [x] 8.5 更新所有遗物测试

- [x] Task 9: 测试 (AC: #7)
  - [x] 9.1 `tests/unit/systems/relics/relics.catalyst.test.ts`: 6 个催化剂工厂测试
  - [x] 9.2 虚空之心：空键位数量影响底分
  - [x] 9.3 连锁放大器：queryRelicFlag 返回 true
  - [x] 9.4 铁壁：queryRelicFlag 返回 shield_bonus=2, sentinel_bonus=1
  - [x] 9.5 被动大师：queryRelicFlag 验证
  - [x] 9.6 键盘风暴：total_skills_gte 条件 + 底分加成 管道集成
  - [x] 9.7 赌徒信条：gamble random 条件被覆盖
  - [x] 9.8 回归测试：全量 1725 测试通过
  - [x] 9.9 验证旧遗物已移除且无残留引用

## Dev Notes

### 催化剂设计原则

**核心理念**: 遗物让玩家说"我的打法要变了！"而不是"数字变大了"。

每个催化剂强化特定流派，推动 all-in 决策。拥有催化剂的玩家应倾向于专精一个流派而非均衡分配。

### 6 个催化剂遗物设计表

| ID | 名称 | 稀有度 | 适配流派 | 效果 | 实现层 |
|----|------|--------|---------|------|--------|
| void_heart | 虚空之心 | rare | 极简/lone/void | 每个空键位 +3 底分 | base additive |
| chain_amplifier | 连锁放大器 | rare | 连锁 | echo/ripple 额外触发一次 | queryRelicFlag |
| fortress | 铁壁 | rare | 续航 | shield +2, sentinel +1 | queryRelicFlag |
| passive_mastery | 被动大师 | legendary | 被动 | 被动 enhance 效果 ×2 | createScopedRegistry |
| keyboard_storm | 键盘风暴 | legendary | 填满键盘 | 技能数 >=12 时底分 +2 | base + condition |
| gamblers_creed | 赌徒信条 | rare | 爆发/赌博 | gamble 100% 成功 | ConditionEvaluator |

### AC 中的 "global 层" 说明

Epic AC 统一标注 "global 层"，但 pipeline 语义中：
- **加底分**（虚空之心、键盘风暴）应使用 **base 层 additive**，因为 `baseSum × enhanceProduct × globalProduct`，底分加到 baseSum
- **乘法效果**（被动大师）如果在技能 enhance 层操作，则直接修改 enhance modifier 的 value
- **行为型**（连锁放大器、铁壁、赌徒信条）通过 `queryRelicFlag` 查询，不走数值管道

### 替换旧遗物策略

移除 6 个弱遗物（纯数值加成，无构筑决策感）：
- `magnet` (词语底分+5) → 被 keyboard_storm 替代
- `combo_badge` (每10连击+0.1倍率) → 数值太小，移除
- `berserker_mask` (倍率>=3时+30%) → 条件太苛刻，移除
- `combo_crown` (初始倍率+0.3) → 无决策感，移除
- `treasure_map` (战斗结束+15金币) → 无决策感，移除
- `piggy_bank` (每关+10金币) → 无决策感，移除

保留 7 个现有遗物：lucky_coin, time_crystal, phoenix_feather, overkill_blade, golden_keyboard, time_lord, perfectionist

### 关键实现挑战

**连锁放大器**: echo/ripple 的重复触发逻辑在 `triggerSkill()` 中硬编码。需在 `shouldEchoRepeat` / `ripplePending` 逻辑处检查 `queryRelicFlag('chain_amplifier')`，如果为 true 则额外触发一次。注意防止无限递归（amplified 触发不应再次被放大）。

**被动大师**: 被动技能通过 `createScopedRegistry()` 注入 enhance 层。需在注入循环中检查 passive_mastery flag，将 enhance modifier 的 value 翻倍（如 aura 的 1.5 → 2.0, anchor 的 1.15 → 1.30）。

**赌徒信条**: gamble 的 `random` 条件在 `ConditionEvaluator.evaluate()` 中评估。最简洁方案：在 `random` case 中检查 `queryRelicFlag('gamblers_creed')`，如果 true 直接返回 true。

### 现有遗物系统架构

- 遗物数据: `src/src/data/relics.ts` — RELICS + RELIC_MODIFIER_DEFS
- 遗物管道: `src/src/systems/relics/RelicPipeline.ts` — resolveRelicEffects, queryRelicFlag, injectRelicModifiers
- 遗物类型: `src/src/systems/relics/RelicTypes.ts` — RelicData, RelicRarity
- Modifier 类型: `src/src/systems/modifiers/ModifierTypes.ts` — 15 种条件原语, 10 种行为类型
- 条件评估: `src/src/systems/modifiers/ConditionEvaluator.ts`
- 行为执行: `src/src/systems/modifiers/BehaviorExecutor.ts`
- 技能系统: `src/src/systems/skills.ts` — createScopedRegistry, triggerSkill

### relicMod 工具函数

```typescript
function relicMod(relicId, id, trigger, phase, overrides) → Modifier
// 默认: sourceType='relic', layer='base', priority=200
```

### PipelineContext 现有字段

combo, hasError, adjacentSkillCount, adjacentEmptyCount, adjacentSkillTypes, currentWord, skillsTriggeredThisWord, wordNumber, multiplier, overkill, currentSkillId, lastTriggeredSkillId

需新增: `totalSkillCount`

### Project Structure Notes

- 遗物数据: `src/src/data/relics.ts`
- 遗物管道: `src/src/systems/relics/RelicPipeline.ts`
- 遗物类型: `src/src/systems/relics/RelicTypes.ts`
- Modifier 类型: `src/src/systems/modifiers/ModifierTypes.ts`
- 条件评估器: `src/src/systems/modifiers/ConditionEvaluator.ts`
- 行为执行器: `src/src/systems/modifiers/BehaviorExecutor.ts`
- 技能系统: `src/src/systems/skills.ts`
- 测试: `src/tests/unit/systems/relics/`

### References

- [Source: docs/epics.md#Story 13.1] 验收标准定义
- [Source: docs/brainstorming-skills-relics-refactor-2026-02-20.md#构筑催化剂] 催化剂设计详情
- [Source: docs/stories/12-4-skill-ui-shop-update.md] Story 12.4 流派标签参考
- [Source: docs/stories/12-3-passive-skills.md] Story 12.3 被动技能 enhance 注入机制

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
N/A

### Completion Notes List
- 6 催化剂遗物全部实现: void_heart, chain_amplifier, fortress, passive_mastery, keyboard_storm, gamblers_creed
- 6 弱遗物已移除: magnet, combo_badge, berserker_mask, combo_crown, treasure_map, piggy_bank
- 遗物总数保持 13 个（2 common + 6 rare + 5 legendary）
- 类型系统扩展: totalSkillCount, total_skills_gte, always_true, amplify_chain
- 被动大师翻倍公式: 1 + (value-1)*2（如 1.5→2.0, 1.15→1.30），guard: value > 1.0
- 铁壁 shield bonus 在 triggerSkill 中 applyEffects 前应用（确保只应用一次）
- 铁壁 sentinel 加分在 triggerSkill 中直接检查（context.shieldCount × sentinelBonus）
- 赌徒信条通过 PipelineContext.hasGamblersCreed 传递（纯函数，无状态依赖）
- chain_amplifier ripple 效果使用缩放 ×2 而非双次 applyEffects
- ConditionEvaluator switch 添加 default: return false
- 全量测试通过，新增 relics.catalyst.test.ts 含行为集成测试

### File List
- src/src/systems/modifiers/ModifierTypes.ts (totalSkillCount, total_skills_gte, always_true, amplify_chain)
- src/src/systems/modifiers/ConditionEvaluator.ts (新条件 + gamblers_creed)
- src/src/systems/modifiers/BehaviorExecutor.ts (amplify_chain handler)
- src/src/data/relics.ts (6 new relics, 6 removed, factory updates)
- src/src/systems/relics/RelicPipeline.ts (queryRelicFlag 6 new flags, removed magnet_bias)
- src/src/systems/skills.ts (fortress, passive_mastery, chain_amplifier, totalSkillCount)
- src/src/systems/battle.ts (removed magnet_bias, updated comment)
- src/src/scenes/shop/ShopScene.ts (temp data update)
- src/tests/unit/systems/relics/relics.catalyst.test.ts (NEW)
- src/tests/unit/systems/relics/relics.test.ts (updated for new relic set)
- src/tests/unit/systems/relics/relic.pipeline.test.ts (updated, removed old relic tests)
- src/tests/unit/systems/relics/RelicSystem.test.ts (updated, removed old relic refs)
- src/tests/unit/scenes/victory/VictoryScene.test.ts (combo_crown → void_heart)
- src/tests/unit/core/events/GameOverEvents.test.ts (combo_crown → void_heart)
- docs/stories/13-1-build-catalyst-relics.md (story completed)
- docs/stories/sprint-status.yaml (13-1 marked done)
