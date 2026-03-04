---
title: "Story 19.10: 旧技能系统清理"
epic: "Epic 19: 技能体系重构"
story_key: "19-10-legacy-skill-cleanup"
status: "done"
created: "2026-03-04"
depends_on: ["19-2-producer-skills", "19-4-converter-framework", "19-5-connector-framework"]
---

# Story 19.10: 旧技能系统清理

Status: done

## Story

作为一个 **开发者**，
我想要 **彻底移除旧 18 技能系统（SKILLS/SKILL_MODIFIER_DEFS/EVOLUTIONS）及其所有引用**，
以便 **代码库只保留产出者/转化者/连接者三类新技能，消除 21 个 pre-existing 测试失败，0 残留引用**。

## 背景与上下文

Epic 19 重构了技能体系为产出者（10）/ 转化者（40）/ 连接者（36）三类。旧 18 技能（burst/amp/freeze/shield/echo/ripple/core/aura/lone/void/gamble/chain/overclock/pulse/sentinel/mirror/leech/anchor）及其 12 个进化分支仍存在于代码中，导致：

1. **21 个 pre-existing 测试失败**：lone/void 工厂返回空数组但测试期望实际 modifier；SKILL_SCHOOL 映射不一致
2. **大量死代码**：旧技能的 modifier 工厂、进化系统、联动行为（echo/ripple/pulse）、被动计算（lone/void）
3. **shop.ts 池污染**：`Object.keys(SKILLS)` 仍混入旧技能到商店池
4. **战斗系统冗余**：lonePassiveBonus 倍率、voidMods 字母底分、isLayoutOnlyPassive 判断
5. **SynergyState 臃肿**：echoPending/ripplePending/ripplePassthrough/pulseCount 等旧字段

### 删除清单

**18 个旧技能 ID**：burst, amp, freeze, shield, echo, ripple, core, aura, lone, void, gamble, chain, overclock, pulse, sentinel, mirror, leech, anchor

**12 个进化分支**：burst_inferno, burst_precision, amp_crescendo, amp_overdrive, echo_resonance, echo_phantom, freeze_permafrost, freeze_chrono, lone_hermit, lone_shadow, core_nexus, core_fusion

### 新系统已完整替代

| 旧功能 | 新替代 |
|---|---|
| SKILLS 定义 | PRODUCERS + CONVERTERS + CONNECTORS |
| SKILL_MODIFIER_DEFS | 各自内置 trigger 逻辑 |
| 进化系统 (EVOLUTIONS) | 附魔系统 (ENCHANTMENTS) Lv3 选附魔 |
| echo/ripple 连锁 | 连接者框架 + 共鸣附魔 |
| lone/void 被动 | 空间型附魔（相邻/同行效果） |
| generateFeedback switch | 产出者/转化者/连接者各自 feedback |

## Acceptance Criteria

1. - [x] AC1: SKILLS 对象（18 个定义）、SKILL_MODIFIER_DEFS（18 个工厂）、EVOLUTIONS（12 个分支）、EVOLUTION_MODIFIER_DEFS（12 个工厂）全部删除
2. - [x] AC2: PASSIVE_SKILL_TYPES、CHAIN_SKILL_TYPES、SYNERGY_TYPES 数组删除；isLayoutOnlyPassive()、isChainSkill()、getEvolutionBranches() 函数删除
3. - [x] AC3: types.ts 中 SkillType、ActiveSkillType、PassiveSkillType 类型移除旧值（如仍需保留类型则仅含新系统值）
4. - [x] AC4: skills.ts 中 generateFeedback 旧技能 case 全部删除、generateEvolvedFeedback 全部删除、calculateLonePassiveBonus()、getVoidLetterModifiers() 删除
5. - [x] AC5: triggerSkill() 中旧技能行为处理删除——echo 二次触发、ripple 传递、pulse 计数、freeze_permafrost 冷却、amp_overdrive 冷却、进化回调
6. - [x] AC6: battle.ts 清理——lonePassiveBonus 变量及引用、voidMods 注入、isLayoutOnlyPassive 引用全部移除
7. - [x] AC7: shop.ts 清理——Object.keys(SKILLS) 从池移除、isSynergySkill 移除、getEvolutionBranches 调用移除
8. - [x] AC8: SynergyState 清理——删除 echoPending/ripplePending/ripplePassthrough/pulseCount/wordCooldowns/restoreComboCounters/freezeTriggeredThisWord 及其在 battle.ts 的重置逻辑
9. - [x] AC9: SKILL_SCHOOL 中 18 个旧技能映射删除（保留新系统需要的映射）
10. - [x] AC10: 场景清理——ShopScene.ts TEMP_SKILLS 删除、SkillTab.ts 改用新系统数据源
11. - [x] AC11: 存档兼容——RunState.deserialize 加载旧存档时过滤已删除的旧技能 ID
12. - [x] AC12: 所有 pre-existing 测试失败修复（21→0），旧技能测试文件删除或重写，全量通过

## Tasks / Subtasks

- [x] Task 1: 删除旧技能数据定义 (AC: 1, 2, 9)
  - [x] 1.1 删除 `data/skills.ts` 中 SKILLS 对象（18 个定义）
  - [x] 1.2 删除 SKILL_MODIFIER_DEFS 对象（18 个工厂）
  - [x] 1.3 删除 EVOLUTIONS 对象 + EVOLUTION_MODIFIER_DEFS 对象（12+12）
  - [x] 1.4 删除 PASSIVE_SKILL_TYPES、CHAIN_SKILL_TYPES、SYNERGY_TYPES 数组
  - [x] 1.5 删除 SKILL_SCHOOL 中 18 个旧技能映射
  - [x] 1.6 删除辅助函数：isLayoutOnlyPassive()、isChainSkill()、getEvolutionBranches()
  - [x] 1.7 修改 getSkillModifierFactory()：移除 EVOLUTION_MODIFIER_DEFS/SKILL_MODIFIER_DEFS 查询（如新系统不再使用则直接删除）
  - [x] 1.8 修改 getSkillDisplayInfo()：移除 SKILLS[skillId] 分支

- [x] Task 2: 清理类型定义 (AC: 3)
  - [x] 2.1 `core/types.ts`：SkillType 联合类型移除 18 个旧值
  - [x] 2.2 删除 ActiveSkillType、PassiveSkillType 类型（如新系统不用）
  - [x] 2.3 清理 SynergyState 接口：删除 echoPending/ripplePending/ripplePassthrough/pulseCount/wordCooldowns/restoreComboCounters/freezeTriggeredThisWord（保留 shieldCount/skillBaseScore/skillMultBonus/letterBaseScore 等仍被使用的字段）
  - [x] 2.4 清理 EvolutionBranch 接口（如附魔系统不使用则删除）

- [x] Task 3: 清理 skills.ts 主逻辑 (AC: 4, 5)
  - [x] 3.1 删除 generateFeedback() 中 18 个旧技能 case 分支
  - [x] 3.2 删除 generateEvolvedFeedback() 整个函数
  - [x] 3.3 删除 calculateLonePassiveBonus() 函数
  - [x] 3.4 删除 getVoidLetterModifiers() 函数
  - [x] 3.5 triggerSkill()：删除 L881 `const base = SKILLS[skillId]` 及后续旧技能完整处理（echo/ripple/pulse/freeze_permafrost/amp_overdrive/进化回调）
  - [x] 3.6 cleanScopedRegistry()：如完全依赖旧 SKILL_MODIFIER_DEFS 则删除
  - [x] 3.7 resolveSkillEventModifiers()：移除旧 getSkillModifierFactory 调用
  - [x] 3.8 清理 imports：移除 SKILLS、isPassiveSkill 等不再使用的导入

- [x] Task 4: 清理 battle.ts (AC: 6, 8)
  - [x] 4.1 删除 `let lonePassiveBonus = 0` 变量声明
  - [x] 4.2 playerCorrect()：倍率计算移除 lonePassiveBonus（L173, L285）
  - [x] 4.3 playerCorrect()：移除 isLayoutOnlyPassive 判断（L198），改为新系统判断（产出者/转化者/连接者已在 triggerSkill 中分流）
  - [x] 4.4 startLevel()：删除 calculateLonePassiveBonus() 调用（L664）
  - [x] 4.5 startLevel()：删除 getVoidLetterModifiers() 调用（L670）
  - [x] 4.6 resetWordState()：删除 synergy.echoPending/ripplePending/ripplePassthrough/pulseCount/wordCooldowns/freezeTriggeredThisWord 重置（L88-99）
  - [x] 4.7 startLevel()：删除 synergy 旧字段重置（L653-658）
  - [x] 4.8 清理 imports

- [x] Task 5: 清理 shop.ts (AC: 7)
  - [x] 5.1 generateShopItems()：`Object.keys(SKILLS)` 从 allSkillIds 移除（L120）
  - [x] 5.2 删除 isSynergySkill() 函数或重写
  - [x] 5.3 renderUnifiedShop()：删除 getEvolutionBranches 调用（L251）
  - [x] 5.4 删除 hermit cap 检查（L354）
  - [x] 5.5 清理 imports

- [x] Task 6: 清理场景文件 (AC: 10)
  - [x] 6.1 ShopScene.ts：删除 TEMP_SKILLS 常量及引用
  - [x] 6.2 SkillTab.ts：改用 PRODUCERS + CONVERTERS + CONNECTORS 作为数据源

- [x] Task 7: SynergyState 精简 (AC: 8)
  - [x] 7.1 `core/state.ts` createSynergyState()：删除旧字段
  - [x] 7.2 确认保留字段：shieldCount（遗物 sentinel 用）、skillBaseScore/skillMultBonus/letterBaseScore（结算面板用）、decayCounters（附魔用）、lastTriggeredSkillId（连锁用）、perfectStreak（遗物用）、wordSkillCount（条件判断用）

- [x] Task 8: 存档兼容 (AC: 11)
  - [x] 8.1 RunState.deserialize：添加旧技能 ID 过滤（类似 DELETED_RELICS 模式）
  - [x] 8.2 过滤旧进化记录（evolvedSkills map 中的旧 ID）

- [x] Task 9: 测试清理 (AC: 12)
  - [x] 9.1 删除 `tests/unit/data/skills.modifiers.test.ts`（纯旧技能测试）
  - [x] 9.2 删除 `tests/unit/data/skills.school.test.ts`（旧 SKILL_SCHOOL 映射）
  - [x] 9.3 删除 `tests/unit/data/skills.evolution.test.ts`（旧进化系统）
  - [x] 9.4 删除 `tests/unit/systems/evolution.test.ts`（旧进化路由）
  - [x] 9.5 重写 `tests/unit/systems/skills.pipeline.test.ts`：移除旧技能管道测试，保留或新增产出者/转化者/连接者管道测试
  - [x] 9.6 检查并更新其他引用旧技能 ID 的测试文件
  - [x] 9.7 验证全量测试 0 失败

## Dev Notes

### 受影响文件清单（预估 ~20 个文件）

| 文件 | 操作 | 说明 |
|---|---|---|
| `src/data/skills.ts` | 大量删除 | SKILLS/SKILL_MODIFIER_DEFS/EVOLUTIONS/EVOLUTION_MODIFIER_DEFS/SKILL_SCHOOL/辅助函数 |
| `src/core/types.ts` | 修改 | SkillType/ActiveSkillType/PassiveSkillType/SynergyState/EvolutionBranch |
| `src/core/state.ts` | 修改 | createSynergyState() 删除旧字段 |
| `src/core/state/RunState.ts` | 修改 | 存档过滤旧技能 |
| `src/systems/skills.ts` | 大量删除 | generateFeedback/generateEvolvedFeedback/triggerSkill旧处理/lone/void函数 |
| `src/systems/battle.ts` | 修改 | lonePassiveBonus/voidMods/isLayoutOnlyPassive/synergy重置 |
| `src/systems/shop.ts` | 修改 | SKILLS池/进化/isSynergySkill |
| `src/scenes/shop/ShopScene.ts` | 修改 | TEMP_SKILLS |
| `src/scenes/collection/tabs/SkillTab.ts` | 修改 | SKILLS数据源 |
| `tests/unit/data/skills.modifiers.test.ts` | 删除 | 旧技能工厂测试 |
| `tests/unit/data/skills.school.test.ts` | 删除 | 旧 SKILL_SCHOOL 测试 |
| `tests/unit/data/skills.evolution.test.ts` | 删除 | 旧进化测试 |
| `tests/unit/systems/evolution.test.ts` | 删除 | 旧进化路由测试 |
| `tests/unit/systems/skills.pipeline.test.ts` | 重写 | 移除旧技能管道测试 |

### 关键注意点

1. **triggerSkill() 函数结构**：前三个 if (isProducer/isConverter/isConnector) 分支是新系统入口，后续 `const base = SKILLS[skillId]` 开始的所有代码都是旧系统。新系统三个分支保留，旧系统段完整删除。

2. **SynergyState 字段保留判断**：shieldCount 被遗物 sentinel_shield 条件使用、skillBaseScore/skillMultBonus 被结算面板使用、letterBaseScore 被字频系统使用、decayCounters 被附魔衰减使用——这些保留。echoPending/ripplePending/pulseCount/wordCooldowns/freezeTriggeredThisWord/restoreComboCounters 纯属旧技能——删除。

3. **battle.ts 倍率计算**：删除 lonePassiveBonus 后，`state.multiplier = state.player.baseMultiplier` 即可（新系统倍率由转化者在 triggerConverter 中直接修改）。

4. **isLayoutOnlyPassive 替代**：新系统中所有技能都在 triggerSkill 的 isProducer/isConverter/isConnector 分支处理，不再需要"布局被动"概念。battle.ts L198 的 shouldTrigger 判断可简化为 `const shouldTrigger = !!skillId`（因为新系统所有技能都应触发）。

5. **SkillTab.ts 改造**：改为显示 PRODUCERS + CONVERTERS + CONNECTORS 全技能图鉴。

### 预估删除量

- **源代码**：~800 行删除，~50 行新增/修改
- **测试代码**：~600 行删除（4 个文件），~50 行新增

### Previous Story Intelligence

Story 19.9 删除了 4 个遗物，模式为：数据删除 + 引用清理 + 存档过滤 + 测试更新。本 story 采用相同模式但规模更大。
