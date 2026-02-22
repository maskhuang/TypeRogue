# Story 13.2: 风险回报遗物

Status: done

## Story

As a 玩家,
I want 5 个风险回报遗物，每个提供强大能力但附带代价,
so that 遗物选择不再是无脑拿取，而是需要权衡利弊的策略决策。

## Acceptance Criteria

1. 玻璃大炮: global 层 score ×2 + before 层打错即本关失败
2. 时间窃贼: after 层每次技能触发 +0.3 秒 + 基础时间减半（on_battle_start 效果）
3. 贪婪之手: global 层金币 ×1.5 + 商店价格 +50%
4. 沉默誓约: global 层无技能时裸打 score ×5 + 无法装备技能
5. 末日倒计时: on_battle_start +30 秒 + 每过一关基础时间 -5 秒
6. 每个遗物注册增益 + 代价两个 Modifier
7. 所有遗物有单元测试
8. 商店中风险回报遗物有醒目的视觉区分（红色边框/标签）

## Tasks / Subtasks

- [x] Task 1: 扩展类型系统 (AC: #1-#5)
  - [x] 1.1 `ModifierTypes.ts` ModifierBehavior 添加 `| { type: 'instant_fail' }` + `| { type: 'time_steal'; timeBonus: number }`
  - [x] 1.2 `ModifierTypes.ts` BehaviorCallbacks 添加 `onInstantFail?(): void` + `onTimeSteal?(timeBonus: number): void`
  - [x] 1.3 `BehaviorExecutor.ts` 添加 `instant_fail` + `time_steal` 分支
  - [x] 1.4 `ModifierTypes.ts` ModifierCondition 添加 `| { type: 'no_skills_equipped' }`（沉默誓约用）
  - [x] 1.5 `ConditionEvaluator.ts` 实现 `no_skills_equipped` 条件：`ctx.totalSkillCount === 0`
  - [x] 1.6 `PipelineContext` 添加 `totalSkillCount?: number`（已在 13.1 完成）

- [x] Task 2: 玻璃大炮 (AC: #1, #6, #7)
  - [x] 2.1 `data/relics.ts` RELICS 添加 `glass_cannon` 数据
  - [x] 2.2 `data/relics.ts` RELIC_MODIFIER_DEFS 添加工厂（global score ×2 + on_error instant_fail）
  - [x] 2.3 `systems/battle.ts` playerWrong：通过 resolveRelicEffectsWithBehaviors + onInstantFail 回调
  - [x] 2.4 phoenix 保护优先于 instant_fail

- [x] Task 3: 时间窃贼 (AC: #2, #6, #7)
  - [x] 3.1 `data/relics.ts` RELICS 添加 `time_thief` 数据
  - [x] 3.2 RELIC_MODIFIER_DEFS 添加工厂（on_skill_trigger time_steal 行为）
  - [x] 3.3-3.5 已在 Task 1 完成（instant_fail + time_steal 类型 + BehaviorExecutor）
  - [x] 3.6 `systems/skills.ts` triggerSkill callbacks 添加 onTimeSteal
  - [x] 3.7 `systems/battle.ts` startLevel：queryRelicFlag('time_thief') 基础时间减半

- [x] Task 4: 贪婪之手 (AC: #3, #6, #7)
  - [x] 4.1 `data/relics.ts` RELICS 添加 `greedy_hand` 数据
  - [x] 4.2 RELIC_MODIFIER_DEFS 添加工厂（global gold ×1.5）
  - [x] 4.3-4.4 queryRelicFlag('greedy_hand') 返回 1.5 或 1
  - [x] 4.5 `systems/shop.ts` getAdjustedPrice() 统一价格调整（含 lucky_coin 折扣 + greedy_hand 加价）

- [x] Task 5: 沉默誓约 (AC: #4, #6, #7)
  - [x] 5.1 `data/relics.ts` RELICS 添加 `silence_vow` 数据
  - [x] 5.2 RELIC_MODIFIER_DEFS 添加工厂（on_word_complete base multiply +4 + no_skills_equipped 条件 → bonusMult=5）
  - [x] 5.5 queryRelicFlag('silence_vow') 返回 boolean
  - [x] 5.6 `systems/shop.ts` renderSkillShop + clickKeySlot + clickSkill：silence_vow 禁止购买/绑定技能

- [x] Task 6: 末日倒计时 (AC: #5, #6, #7)
  - [x] 6.1 `data/relics.ts` RELICS 添加 `doomsday` 数据
  - [x] 6.2 RELIC_MODIFIER_DEFS 添加工厂（on_battle_start +30s time）
  - [x] 6.3-6.4 queryRelicFlag('doomsday') 返回 (level-1)*5
  - [x] 6.5 `systems/battle.ts` startLevel：扣减递增时间代价

- [x] Task 7: 视觉区分 (AC: #8)
  - [x] 7.1 `RelicTypes.ts` RelicData 添加 `category?: 'risk-reward'`；5 个遗物数据添加标记
  - [x] 7.2 `style.css` 添加 risk-reward 红色样式（标签 + 卡片边框）
  - [x] 7.3 `systems/shop.ts` renderRelicShop：risk-reward 遗物使用特殊 typeLabel/typeClass + card class

- [x] Task 8: 测试 (AC: #7)
  - [x] 8.1 `relics.riskreward.test.ts`: 46 个测试覆盖 5 个遗物
  - [x] 8.2 玻璃大炮：工厂、score ×2 管道集成、instant_fail 行为回调
  - [x] 8.3 时间窃贼：工厂、time_steal 行为回调、queryRelicFlag
  - [x] 8.4 贪婪之手：工厂、gold ×1.5 管道集成、queryRelicFlag 价格系数、overkill 组合
  - [x] 8.5 沉默誓约：工厂、no_skills_equipped 条件、score ×5 管道集成
  - [x] 8.6 末日倒计时：工厂、queryRelicFlag 递增扣减、+30s 管道集成
  - [x] 8.7 组合交互测试：glass_cannon+golden_keyboard、greedy_hand+overkill_blade、doomsday+time_lord
  - [x] 8.8 回归测试：1779 tests passed (71 files)

## Dev Notes

### 风险回报设计原则

**核心理念**: 每个遗物都是一份"魔鬼契约"— 强大能力换取真实代价。玩家拿到风险回报遗物后，打法必须围绕规避代价或最大化增益调整。

5 个遗物覆盖不同的风险偏好：
- **玻璃大炮**: 高风险高回报，适合打字精准的玩家
- **时间窃贼**: 中等风险，鼓励多装技能（每次触发+时间弥补减半的代价）
- **贪婪之手**: 经济风险，后期金币优势换前期投入受限
- **沉默誓约**: 极端约束，完全放弃技能系统换取超高裸打分数
- **末日倒计时**: 递增风险，前期宽裕后期紧迫，鼓励速通

### 实现注意点

**玻璃大炮 instant_fail 行为**:
- 在 `playerWrong()` 中，shield 保护检查之后、combo 重置之前检查
- 如果 shield 消耗成功，不触发 instant_fail
- instant_fail 直接调用 `endBattle('lose')` 或类似函数

**时间窃贼代价**:
- 基础时间减半在 `startLevel()` 中执行，在遗物 on_battle_start 管道之后
- 减半的是 `state.time`（包含 time_lord 的 +8s），这是有意设计（time_lord + time_thief 有趣互动）

**沉默誓约特殊处理**:
- on_skill_trigger 不会触发（没技能），需改用 on_word_complete 或 on_correct_keystroke
- 推荐 on_word_complete: global 层 score ×5，因为分数在 completeWord 中计算
- 需验证：`wordBaseScore + synergy.skillBaseScore` 在无技能时 skillBaseScore=0，仅有 wordBaseScore
- 代价：商店中技能购买按钮禁用 + 技能绑定操作拒绝

**末日倒计时递增代价**:
- 第1关: +30s, -0s（纯增益）
- 第2关: +30s, -5s（净+25s）
- 第3关: +30s, -10s（净+20s）
- ...
- 第7关: +30s, -30s（净0s）
- 第8关: +30s, -35s（净-5s，极端紧张！）

### sentinel 变更说明

⚠️ sentinel 已从"每完成一词恢复1次盾"改为"每层护盾+2分"（score-based）。Story 13.1 中铁壁的 "sentinel 每词回盾+1" AC 需要在 13.1 实现时调整为 "sentinel 每层护盾基数+额外分" 或其他匹配当前实现的效果。

### 现有遗物系统架构

- 遗物数据: `src/src/data/relics.ts` — RELICS + RELIC_MODIFIER_DEFS
- 遗物管道: `src/src/systems/relics/RelicPipeline.ts` — resolveRelicEffects, queryRelicFlag, injectRelicModifiers
- 遗物类型: `src/src/systems/relics/RelicTypes.ts` — RelicData, RelicRarity
- Modifier 类型: `src/src/systems/modifiers/ModifierTypes.ts` — 15 种条件原语, 10 种行为类型
- 条件评估: `src/src/systems/modifiers/ConditionEvaluator.ts`
- 行为执行: `src/src/systems/modifiers/BehaviorExecutor.ts`
- 技能系统: `src/src/systems/skills.ts` — createScopedRegistry, triggerSkill, applyEffects
- 战斗系统: `src/src/systems/battle.ts` — startLevel, playerWrong, completeWord
- 商店系统: `src/src/systems/shop.ts` — renderRelicShop, buyItem

### 近期关键变更（影响实现）

- `applyEffects` 的 score 现在累加到 `synergy.skillBaseScore`（不乘倍率），由 completeWord 统一计算 `(wordBaseScore + skillBaseScore) × mult`
- `applyEffects` 的 multiply 累加到 `synergy.skillMultBonus`，跨词保留，断连击或关卡开始时重置
- sentinel 已改为 score-based: `(shieldCount × skillVal)` 底分

### 5 个风险回报遗物设计表

| ID | 名称 | 稀有度 | 增益 | 代价 | 实现层 |
|----|------|--------|------|------|--------|
| glass_cannon | 玻璃大炮 | rare | score ×2 | 打错即失败 | global + before behavior |
| time_thief | 时间窃贼 | rare | 技能触发 +0.3s | 基础时间减半 | behavior + queryRelicFlag |
| greedy_hand | 贪婪之手 | rare | 金币 ×1.5 | 价格 +50% | base gold + queryRelicFlag |
| silence_vow | 沉默誓约 | legendary | 无技能时 score ×5 | 无法装备技能 | base multiply +4 (bonusMult=5) + queryRelicFlag |
| doomsday | 末日倒计时 | legendary | 每关 +30s | 每过一关 -5s | base time + queryRelicFlag |

### Project Structure Notes

- 遗物数据: `src/src/data/relics.ts`
- 遗物管道: `src/src/systems/relics/RelicPipeline.ts`
- 遗物类型: `src/src/systems/relics/RelicTypes.ts`
- Modifier 类型: `src/src/systems/modifiers/ModifierTypes.ts`
- 条件评估器: `src/src/systems/modifiers/ConditionEvaluator.ts`
- 行为执行器: `src/src/systems/modifiers/BehaviorExecutor.ts`
- 技能系统: `src/src/systems/skills.ts`
- 战斗系统: `src/src/systems/battle.ts`
- 商店系统: `src/src/systems/shop.ts`
- 测试: `src/tests/unit/systems/relics/`

### References

- [Source: docs/epics.md#Story 13.2] 验收标准定义
- [Source: docs/brainstorming-skills-relics-refactor-2026-02-20.md#风险-回报交易] 风险回报设计详情
- [Source: docs/stories/13-1-build-catalyst-relics.md] Story 13.1 催化剂遗物（前置依赖）
- [Source: src/src/systems/battle.ts] 战斗流程（playerWrong, startLevel, completeWord）
- [Source: src/src/systems/skills.ts] 技能触发和 applyEffects

## Dev Agent Record

### Agent Model Used
claude-opus-4-6

### Debug Log References
- relics.test.ts count/range assertions updated for 18 relics (from 13)

### Completion Notes List
- Task 1: Extended ModifierTypes (instant_fail, time_steal behaviors; no_skills_equipped condition), BehaviorExecutor, ConditionEvaluator
- Task 2-6: All 5 risk-reward relics implemented — RELICS data, RELIC_MODIFIER_DEFS factories, queryRelicFlag cases, battle.ts integration (playerWrong instant_fail, startLevel time_thief/doomsday penalties), skills.ts onTimeSteal callback
- Task 4-5: shop.ts integration — getAdjustedPrice() applies lucky_coin discount + greedy_hand surcharge to all purchases; silence_vow blocks skill purchase/binding
- Task 7: Visual distinction — RelicData.category, risk-reward CSS styles, shop rendering
- Task 8: 46 new tests in relics.riskreward.test.ts + updated relics.test.ts counts; 1779 total tests passing

### Code Review Fixes Applied
- **C1 (Critical)**: silence_vow ×5 had NO EFFECT — global layer score multiplicative with no base = 0. Fixed: changed to base layer `multiply +4 additive` → `bonusMult = 1 + 4 = 5`
- **H1 (High)**: silence_vow `no_skills_equipped` condition always passed — `totalSkillCount` was not passed in `completeWord()` on_word_complete context. Fixed: added `totalSkillCount: state.player.skills.size`
- **H2 (High)**: silence_vow bypass via `clickSkill()` — only `clickKeySlot()` was guarded. Fixed: added silence_vow guard in `clickSkill()`
- **M1 (Medium)**: Risk-reward relics lost rarity label — only showed "risk-reward". Fixed: changed to `${relic.rarity}·risk`
- **M2 (Medium)**: `RelicEffectType` missing `on_skill_trigger`. Fixed: added to type union
- **L1 (Low)**: Test masked C1 bug by manually adding base score. Fixed: tests now verify `effects.multiply` directly

### File List
- `src/src/systems/modifiers/ModifierTypes.ts` — instant_fail, time_steal behaviors; no_skills_equipped condition
- `src/src/systems/modifiers/BehaviorExecutor.ts` — instant_fail, time_steal case handlers
- `src/src/systems/modifiers/ConditionEvaluator.ts` — no_skills_equipped case
- `src/src/data/relics.ts` — 5 risk-reward relics data + 5 RELIC_MODIFIER_DEFS factories + category tags
- `src/src/systems/relics/RelicTypes.ts` — RelicModifierType expanded; category field added to RelicData
- `src/src/systems/relics/RelicPipeline.ts` — 5 new queryRelicFlag cases
- `src/src/systems/battle.ts` — playerWrong instant_fail; startLevel time_thief/doomsday penalties
- `src/src/systems/skills.ts` — onTimeSteal callback in triggerSkill
- `src/src/systems/shop.ts` — getAdjustedPrice(); silence_vow skill lock; risk-reward visual tags
- `src/src/style.css` — risk-reward + legendary CSS styles
- `src/tests/unit/systems/relics/relics.riskreward.test.ts` — 46 new tests (NEW)
- `src/tests/unit/systems/relics/relics.test.ts` — Updated counts/ranges for 18 relics
