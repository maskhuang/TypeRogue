# Story 36.11: Boss 修饰器系统遗物

Status: done

## Story

As a player,
I want 5 boss modifier relics that reduce modifier penalties, reward modifier-heavy stages, nullify the first modifier, dynamically replace modifiers, and randomly invert modifier effects,
so that boss and elite encounters become more strategic with build choices that counter or exploit the modifier system.

## Acceptance Criteria

1. **AC1 — 修饰器护盾 (modifier_shield)**: 所有修饰器的负面数值效果 ×0.75（例如 decayRate 0.05→0.0375, comboPunishRate 0.20→0.15, timeSpeed (1.5-1)×0.75+1=1.375, scoreCap 50→62, diminishRate 0.10→0.075, targetMultiplier (2-1)×0.75+1=1.75）。

2. **AC2 — 赏金猎人 (bounty_hunter)**: 通关金币计算中，每个 `state.activeModifiers` 中的永久修饰器使金币 +20%（加算）。金币加成在 `showGoldReward()` 和 `openShop()` 中同步应用。

3. **AC3 — 修饰器屏障 (modifier_barrier)**: 精英/Boss 关开始时，第一个应用的修饰器被无效化（不调用 `applyModifier()`）。每关仅生效一次，由 `_barrierUsedThisStage` 标记控制。

4. **AC4 — 混沌轮盘 (chaos_roulette)**: Boss 关中，每完成 5 个词，随机选一个活跃临时修饰器替换为修饰器池中未激活的新修饰器。用 `generateBossModifierCandidates()` 排除已激活的。

5. **AC5 — 修饰器反转 (modifier_reversal)**: 关卡开始应用修饰器后，随机将活跃修饰器分两半：一半的数值型参数反转为增益（负面值取反或翻转），另一半数值 ×2。需要引擎暴露 `getActiveInstances()` + `forceRebuildParams()`。

6. **AC6 — 修饰器反转的随机分半和效果翻转逻辑有测试**。

7. **AC7 — 混沌轮盘不会抽到当前已激活的修饰器有测试**。

## Tasks / Subtasks

- [x] Task 1: 添加 5 个遗物数据定义 (AC: #1-#5)
  - [x]1.1 在 `data/relics.ts` 的 `RELICS` 中添加 5 个 RelicData 条目，含 `subsystem: 'boss_modifier'`
  - [x]1.2 `modifier_shield` (common, basePrice:50)、`bounty_hunter` (common, basePrice:50)、`modifier_barrier` (rare, basePrice:80, behaviorType:'modifier_barrier')、`chaos_roulette` (epic, basePrice:120, behaviorType:'chaos_roulette')、`modifier_reversal` (legendary, basePrice:0, behaviorType:'modifier_reversal')
  - [x]1.3 确认图标唯一性（与现有 55 个遗物不冲突）
  - [x]1.4 更新 `relics.test.ts` 中遗物总数（55→60）和各稀有度计数断言
  - [x]1.5 更新 `relics.slots.test.ts` 中 zeroPriceRelics（modifier_reversal basePrice=0）

- [x] Task 2: 扩展 bossModifierEngine.ts API (AC: #4, #5)
  - [x]2.1 导出 `getActiveInstances(): readonly ModifierInstance[]` — 返回当前活跃修饰器实例列表（只读引用）
  - [x]2.2 导出 `forceRebuildParams(): void` — 暴露 `rebuildActiveParams()` 供外部调用（修饰器反转修改 params 后重建合并参数）
  - [x]2.3 导出 `replaceTemporaryModifier(oldModId: BossModifierId, newModId: BossModifierId): boolean` — 用于混沌轮盘：查找并移除指定临时修饰器实例 → cleanup → 应用新修饰器 → rebuildParams → 返回是否成功
  - [x]2.4 导出 `ModifierInstance` 类型（供类型引用）

- [x] Task 3: 创建 BossModifierRelicBehaviors.ts 行为模块 (AC: #1-#5)
  - [x]3.1 创建 `systems/relics/BossModifierRelicBehaviors.ts`
  - [x]3.2 导出常量：`SHIELD_REDUCE = 0.25`、`BOUNTY_GOLD_PER_MOD = 0.20`、`CHAOS_WORD_INTERVAL = 5`
  - [x]3.3 模块级状态：`_barrierUsedThisStage: boolean`、`_chaosWordCount: number`
  - [x]3.4 导出 `getShieldedValue(rawValue: number, isDebuff: boolean): number` — 有遗物 + isDebuff → `rawValue * (1 - SHIELD_REDUCE)`，否则原值
  - [x]3.5 导出 `getShieldedTimeSpeed(rawSpeed: number): number` — 有遗物 → `(rawSpeed - 1) * (1 - SHIELD_REDUCE) + 1`（将加速部分削弱 25%），否则原值
  - [x]3.6 导出 `getShieldedScoreCap(rawCap: number): number` — 有遗物 → `Math.ceil(rawCap / (1 - SHIELD_REDUCE))`（提高上限 25%），否则原值
  - [x]3.7 导出 `getShieldedTargetMultiplier(rawMult: number): number` — 有遗物 → `(rawMult - 1) * (1 - SHIELD_REDUCE) + 1`（将超出部分削弱 25%），否则原值
  - [x]3.8 导出 `getBountyHunterGoldBonus(): number` — 有遗物 → `state.activeModifiers.length * BOUNTY_GOLD_PER_MOD`（返回加算比例，如 0.4 = +40%），否则 0
  - [x]3.9 导出 `shouldBarrierBlock(): boolean` — 有遗物 + 当前为精英/Boss 关 + `!_barrierUsedThisStage` → true（设置 _barrierUsedThisStage=true），否则 false
  - [x]3.10 导出 `checkChaosRoulette(): void` — 有遗物 + Boss 关 → `_chaosWordCount++`；每 5 词调用 `replaceTemporaryModifier()`
  - [x]3.11 导出 `applyModifierReversal(): void` — 有遗物 → 获取 `getActiveInstances()`，随机分两半，一半反转 params，另一半 ×2，然后 `forceRebuildParams()`
  - [x]3.12 导出 `resetBossModifierRelicBattleState(): void` — 重置 `_barrierUsedThisStage = false`、`_chaosWordCount = 0`
  - [x]3.13 导出 `initBossModifierRelicBehaviors(): void` — 注册 3 个 behaviorType

- [x] Task 4: 实现修饰器护盾 (AC: #1)
  - [x]4.1 在 `battle.ts` 的 timer loop（~L914-917）中：`timeSpeed` 改用 `getShieldedTimeSpeed(modEffect?.timeSpeed ?? 1)`
  - [x]4.2 在 `battle.ts` 的 `onError()`（~L531-537）中：`comboPunishRate` 改用 `getShieldedValue(rate, true)`
  - [x]4.3 在 `battle.ts` 的 `completeWord()`（~L597-604）中：`scoreCap` 改用 `getShieldedScoreCap(cap)`、`diminishRate` 改用 `getShieldedValue(rate, true)`
  - [x]4.4 在 `bossModifiers.ts` 的 `bossDecay.onTick()`（~L228）中：`decayRate` 改用 `getShieldedValue(rate, true)`
  - [x]4.5 `boss_double_target` 的 `targetMultiplier` 在 `apply()` 时直接缩放 `state.targetScore`（L271）—— 需要在 `startLevel()` 的 `applyModifier()` 调用后追加护盾修正：`if (modEffect?.targetMultiplier) state.targetScore = Math.floor(state.targetScore * getShieldedTargetMultiplier(modEffect.targetMultiplier) / modEffect.targetMultiplier)`

- [x] Task 5: 实现赏金猎人 (AC: #2)
  - [x]5.1 在 `battle.ts` 的 `showGoldReward()`（~L858-860 eliteMultiplier 之后）：`const bountyBonus = getBountyHunterGoldBonus(); if (bountyBonus > 0) totalGold = Math.floor(totalGold * (1 + bountyBonus));`
  - [x]5.2 在 `shop.ts` 的 `openShop()`（~L458 eliteMultiplier 之后）：同步应用 `getBountyHunterGoldBonus()`

- [x] Task 6: 实现修饰器屏障 (AC: #3)
  - [x]6.1 在 `battle.ts` 的 `startLevel()`（~L1264-1268 精英关 applyModifier 前）：`if (shouldBarrierBlock()) { showFeedback('🛡️ 修饰器屏障！', '#44aaff'); } else { applyModifier(modId, true); }`
  - [x]6.2 在 `bossModifierEngine.ts` 的 `startBossRotation()` → `switchToPhase(0)` 内部（~L122）：在首次 applyModifier 前检查 `shouldBarrierBlock()`
  - [x]6.3 ⚠️ 实现难点：`switchToPhase()` 是引擎私有函数。方案选择：
    - 方案 A：在 `startBossRotation()` 返回前检查（首次 phase=0 时检查），需要标记机制
    - 方案 B：导出 barrier hook，在 `switchToPhase` 中调用
    - **推荐方案 A**：在 `startBossRotation()` 调用 `switchToPhase(0)` 后，如果 barrier 生效则立即 cleanup 刚应用的修饰器。具体：导出 `undoLastTemporaryModifier(): boolean` 从引擎

- [x] Task 7: 实现混沌轮盘 (AC: #4, #7)
  - [x]7.1 在 `battle.ts` 的 `completeWord()`（~L604 diminish 逻辑之后）：调用 `checkChaosRoulette()`
  - [x]7.2 `checkChaosRoulette()` 内部：`_chaosWordCount++`; 当 `_chaosWordCount % CHAOS_WORD_INTERVAL === 0` 且 `getStageType(state.level) === 'boss'` 时：
    - 从 `getActiveInstances()` 找非永久实例
    - 从 `generateBossModifierCandidates([...所有活跃 modId])` 抽取替换候选
    - 调用 `replaceTemporaryModifier(oldId, newId)`
    - `showFeedback('🎰 混沌轮盘！', '#ff44ff')`
  - [x]7.3 测试：替换后的修饰器不在已激活列表中

- [x] Task 8: 实现修饰器反转 (AC: #5, #6)
  - [x]8.1 在 `battle.ts` 的 `startLevel()`（~L1274 所有 applyModifier 完成后）：调用 `applyModifierReversal()`
  - [x]8.2 `applyModifierReversal()` 内部：
    - `getActiveInstances()` 获取所有实例
    - Fisher-Yates shuffle 后前半反转、后半 ×2
    - 反转逻辑：`decayRate → -decayRate`（变为回复）、`comboPunishRate → -comboPunishRate`、`timeSpeed → 2 - timeSpeed`（1.5→0.5 减速）、`scoreCap → Infinity`（移除上限）、`diminishRate → -diminishRate`（变为递增）、`targetMultiplier → 2 - targetMultiplier`（2.0→0.0→clamp 0.5 最低）
    - ×2 逻辑：所有数值型 params ×2
    - 修改 `inst.params` in-place 后调用 `forceRebuildParams()`
  - [x]8.3 显示反馈：`showFeedback('🔄 修饰器反转！', '#ff8800')`

- [x] Task 9: 注册模块初始化 + 生命周期 (AC: #1-#5)
  - [x]9.1 `battle.ts` 的 `initInput()` 中调用 `initBossModifierRelicBehaviors()`
  - [x]9.2 `battle.ts` 的 `startLevel()` reset 区中调用 `resetBossModifierRelicBattleState()`

- [x] Task 10: 单元测试 (AC: #1-#7)
  - [x]10.1 创建 `relics.bossmod.test.ts`
  - [x]10.2 常量值测试（3 个常量）
  - [x]10.3 修饰器护盾：无遗物→原值、有遗物→decayRate×0.75、comboPunishRate×0.75、timeSpeed (1.5→1.375)、scoreCap (50→67)、diminishRate×0.75、targetMultiplier (2.0→1.75)
  - [x]10.4 赏金猎人：无遗物→0、有遗物+0永久修饰器→0、有遗物+2永久修饰器→0.40
  - [x]10.5 修饰器屏障：无遗物→false、有遗物+精英→true（首次）+ false（第二次）、有遗物+普通关→false
  - [x]10.6 混沌轮盘：无遗物不触发、有遗物+非Boss不触发、有遗物+Boss+第5词触发、替换后不重复 (AC: #7)
  - [x]10.7 修饰器反转：无遗物不操作、有遗物→反转半数+加倍半数 (AC: #6)、反转值正确性
  - [x]10.8 生命周期：resetBossModifierRelicBattleState 重置 barrier + chaosWordCount
  - [x]10.9 注册：initBossModifierRelicBehaviors 注册 ≥3 个行为

## Dev Notes

### 当前系统状态（CRITICAL）

**已完成的基础设施（Story 36.1 — 36.10）：**
- `RelicSubsystem` 类型已包含 `'boss_modifier'`（relics.ts:95）
- `RelicBehaviorType` 已包含 `'modifier_barrier'`、`'chaos_roulette'`、`'modifier_reversal'`（relics.ts:131-133）
- `RELIC_MODIFIER_DEFS` 当前为空 `{}`（所有遗物走纯函数路线）
- `registerRelicBehavior()` / `dispatchRelicBehavior()` 行为分发框架就绪
- 55 个遗物已实现（10 职业 + 5×9 通用）

**bossModifierEngine.ts 完整 API（L1-208）：**
```
applyModifier(modId, isElite, isPermanent=false)  // L56 — 应用修饰器
cleanupModifier()                                  // L66 — 清理所有
cleanupTemporaryModifiers()                        // L75 — 清理临时，保留永久
tickModifier(dt)                                   // L89 — 每帧更新
isModifierActive(modId)                            // L107 — 检查是否活跃
startBossRotation()                                // L114 — 启动 Boss 3 阶段轮换
stopBossRotation()                                 // L129 — 停止轮换
getActiveModifierEffect()                          // L102 — getActiveParams 包装

⚠️ 需要新增导出（Task 2）：
- getActiveInstances()         — 返回 activeModifierInstances（只读）
- forceRebuildParams()         — 暴露 rebuildActiveParams()
- replaceTemporaryModifier()   — 混沌轮盘用：替换临时修饰器
```

**bossModifiers.ts 修饰器数据（12 个修饰器）：**
```
boss_fade          — 视觉：文字渐隐       params: fadeSpeed, fadeSpeedEnd, fadeDuration
boss_scramble      — 认知：字母乱序       params: scrambleMode
boss_reverse       — 认知：倒序输入       params: reverseActive
boss_spotlight     — 视觉：聚光灯         params: spotlightRadius
boss_decay         — 数值：分数衰减       params: decayRate（onTick 消费）
boss_combo_punish  — 数值：断连扣分       params: comboPunishRate
boss_cap           — 数值：单词限额       params: scoreCap
boss_fast_time     — 数值：时间加速       params: timeSpeed
boss_double_target — 数值：双倍目标       params: targetMultiplier（apply() 时缩放 state.targetScore）
boss_diminish      — 数值：递减收益       params: diminishRate
boss_garble        — 认知/视觉：乱码     params: garbleRate, garbleActive
boss_scroll        — 视觉：滚屏           params: scrollSpeed, scrollHitZone
```

**修饰器参数消费点（battle.ts）：**
```
timer loop L914-917:  timeSpeed → state.time -= 0.1 * timeSpeed * getTimeScale()
onError L531-537:     comboPunishRate → penalty = floor(state.score * rate)
completeWord L597:    scoreCap → finalWordScore = min(finalWordScore, scoreCap)
completeWord L601:    diminishRate → finalWordScore *= getDiminishMultiplier()
```

**修饰器参数消费点（bossModifiers.ts）：**
```
bossDecay.onTick L228: decayRate → penalty = state.score * rate * dt
bossDoubleTarget.apply L271: targetMultiplier → state.targetScore = floor(state.targetScore * mult)
```

⚠️ **修饰器护盾的关键难点**：`boss_double_target` 在 `apply()` 时直接修改 `state.targetScore`，不是通过 `getActiveParams()` 实时读取。这意味着护盾无法在 params 读取时拦截，需要在 `startLevel()` 的 `applyModifier()` 调用后追加修正：
```
// 方案：在 applyModifier 后，检查 targetMultiplier 并用护盾值重新计算
const modParams = getActiveParams();
if (modParams?.targetMultiplier && hasModifierShield()) {
  const shielded = getShieldedTargetMultiplier(modParams.targetMultiplier);
  state.targetScore = Math.floor(state.targetScore * shielded / modParams.targetMultiplier);
}
```

⚠️ **修饰器屏障的实现难点**：`switchToPhase()` 是引擎私有函数。Boss 关的首个修饰器通过 `startBossRotation()` → `switchToPhase(0)` 内部应用。有两种拦截方案：
- **方案 A（推荐）**：新增引擎 API `undoLastTemporaryModifier()`，在 `startBossRotation()` 返回后调用
- **方案 B**：在引擎的 `applyModifier()` 内部增加 barrier 检查 hook
- 推荐方案 A：最小改动，不侵入引擎核心逻辑

**金币计算架构（Story 36.10 Review H1 已修复）：**
```
showGoldReward()（显示）+ openShop()（实际加金币）两处需同步
赏金猎人金币加成必须在两处都应用，放在 eliteMultiplier 之后
```

**混沌轮盘机制细节：**
```
completeWord() 中调用 checkChaosRoulette()
  → _chaosWordCount++
  → 每 5 词：
    1. getActiveInstances() 找非永久实例
    2. 随机选一个 oldModId
    3. generateBossModifierCandidates([...所有活跃]) 选 newModId
    4. replaceTemporaryModifier(oldModId, newModId)
    5. 更新 HUD + showFeedback

replaceTemporaryModifier 在引擎中实现：
  1. 找到 oldModId 的 inst
  2. inst.modifier.cleanup()
  3. 从 activeModifierInstances 移除
  4. applyModifier(newModId, false, false) — 非永久临时替换
  5. rebuildActiveParams()
```

**修饰器反转机制细节：**
```
startLevel() 所有 applyModifier 完成后调用 applyModifierReversal()
  → getActiveInstances() 获取所有
  → shuffle → 前半反转，后半 ×2

反转映射（数值型参数）：
  decayRate:       0.05 → -0.05（变为每秒回复）
  comboPunishRate: 0.20 → -0.20（断连加分）
  timeSpeed:       1.5 → 2 - 1.5 = 0.5（减速）
  scoreCap:        50 → Infinity（移除上限）
  diminishRate:    0.10 → -0.10（递增）
  targetMultiplier: 已在 apply() 时写入 state.targetScore，反转需重新计算

×2 映射：
  decayRate:       0.05 → 0.10
  comboPunishRate: 0.20 → 0.40
  timeSpeed:       1.5 → 3.0 → cap 2.0（限速）
  scoreCap:        50 → 25（更严格）
  diminishRate:    0.10 → 0.20
  targetMultiplier: 需重新缩放 state.targetScore

视觉型参数（fadeSpeed, spotlightRadius, scrambleMode, reverseActive, garble*, scroll*）：
  反转 = 移除效果（设为 null/0/默认值）
  ×2 = 保持原值（视觉效果不好翻倍，保留原样或适度增强）
```

⚠️ **修饰器反转 targetMultiplier 特殊处理**：
- `boss_double_target.apply()` 在 `applyModifier()` 时已经修改了 `state.targetScore = floor(targetScore * mult)`
- 反转时需要逆向操作：`state.targetScore = floor(state.targetScore / mult * invertedMult)`
- ×2 时需要追加缩放：`state.targetScore = floor(state.targetScore * 2)`

### 关键设计决策

**1. 修饰器护盾实现方式：**
- 不修改 `getActiveParams()` 返回值（避免全局影响）
- 在每个消费点调用 `getShieldedXxx()` 包装函数
- 6 个消费点需要修改：battle.ts (3) + bossModifiers.ts (1) + startLevel 后修正 (2)

**2. 赏金猎人金币基准：**
- 基于 `state.activeModifiers.length`（永久修饰器数量）
- 周期 1 = 0 个永久修饰器（无加成），周期 2+ = 3×(cycle-1) 个
- 返回加算比例（与 eliteMultiplier 乘算叠加）

**3. 修饰器屏障 Boss 关拦截方案：**
- 新增 `undoLastTemporaryModifier()` 引擎 API
- `startLevel()` 中：`startBossRotation()` 后立即检查 barrier → undo
- 精英关：在 `applyModifier()` 调用前检查 barrier → 跳过
- 两种场景统一由 `shouldBarrierBlock()` 控制（每关仅一次）

**4. 混沌轮盘替换机制：**
- 使用引擎新 API `replaceTemporaryModifier()`
- 替换后需更新 Boss 修饰器 HUD
- 不替换永久修饰器（`inst.isPermanent === true`）

**5. 修饰器反转范围限定：**
- 只反转/翻倍"数值型"参数：decayRate, comboPunishRate, timeSpeed, scoreCap, diminishRate, targetMultiplier
- 视觉/认知型参数（fadeSpeed, scrambleMode, reverseActive, garble*, scroll*, spotlightRadius）不参与反转/翻倍
- 原因：视觉效果反转不直观（渐隐速度取反？乱序反转？），且这些效果无明确"正面/负面"数值语义

### 遗物数据规格

| ID | 名称 | 图标 | 稀有度 | basePrice | subsystem | behaviorType |
|---|---|---|---|---|---|---|
| `modifier_shield` | 修饰器护盾 | 🧿 | common | 50 | boss_modifier | — |
| `bounty_hunter` | 赏金猎人 | 🏴‍☠️ | common | 50 | boss_modifier | — |
| `modifier_barrier` | 修饰器屏障 | 🚧 | rare | 80 | boss_modifier | modifier_barrier |
| `chaos_roulette` | 混沌轮盘 | 🎰 | epic | 120 | boss_modifier | chaos_roulette |
| `modifier_reversal` | 修饰器反转 | 🔄 | legendary | 0 | boss_modifier | modifier_reversal |

注：
- modifier_shield、bounty_hunter 不需 behaviorType（纯数值计算，纯函数直接调用）
- modifier_barrier、chaos_roulette、modifier_reversal 需要 behaviorType（涉及引擎状态操作）
- modifier_reversal basePrice=0（传说级，与 universal_furnace、timed_auction、phoenix 同）
- 图标唯一性：🛡️💰🚧🎰🔄 均未被现有 55 个遗物使用

### 从 Story 36.2 — 36.10 继承的关键经验

1. **纯函数模式**: 行为函数导出为纯函数，由调用方在合适位置调用。行为注册仅用于框架完整性（no-op body）。
2. **加算合并**: 多个百分比修饰器加算叠加。赏金猎人的金币加成也采用加算。
3. **relicStates 类型**: 只能存 number 值。
4. **import type**: 纯类型导入必须用 `import type`。
5. **clearBehaviorHandlers()**: 测试 beforeEach 中调用。
6. **Icon 唯一性**: 5 个遗物需要 5 个不同 emoji。
7. **遗物总数断言**: `relics.test.ts` 中总数（55→60）、各稀有度计数需更新。
8. **zeroPriceRelics**: modifier_reversal basePrice=0 → `relics.slots.test.ts` 中添加。
9. **RELIC_MODIFIER_DEFS**: 保持为空 `{}`（不使用 pipeline）。
10. **金币双路径**: showGoldReward（显示）+ openShop（实际）必须同步——Story 36.10 Review H1 教训。
11. **state.player.relics.has()**: 每个导出函数首行检查遗物是否持有。

### 性能约束

- modifier_shield: 每个消费点一次条件检查 + 乘法，<0.01ms
- bounty_hunter: 一次性金币计算，<0.01ms
- modifier_barrier: 一次性检查，<0.01ms
- chaos_roulette: 每词一次计数 + 每 5 词一次替换操作，<0.1ms
- modifier_reversal: 一次性参数修改，<0.1ms（仅在 startLevel 时执行）

### Project Structure Notes

**需修改的文件：**
- `src/src/data/relics.ts` — 添加 5 个 RelicData
- `src/src/systems/bossModifierEngine.ts` — 新增 4 个导出 API（getActiveInstances, forceRebuildParams, replaceTemporaryModifier, undoLastTemporaryModifier）
- `src/src/data/bossModifiers.ts` — bossDecay.onTick 中应用护盾
- `src/src/systems/battle.ts` — 6 个集成点（timer loop、onError、completeWord、showGoldReward、startLevel modifier 区、initInput/reset）
- `src/src/systems/shop.ts` — openShop 中赏金猎人金币加成
- `src/tests/unit/systems/relics/relics.test.ts` — 遗物总数 55→60 和各稀有度计数更新
- `src/tests/unit/systems/relics/relics.slots.test.ts` — zeroPriceRelics 添加 modifier_reversal

**需新建的文件：**
- `src/src/systems/relics/BossModifierRelicBehaviors.ts` — Boss 修饰器子系统行为模块
- `src/tests/unit/systems/relics/relics.bossmod.test.ts` — Boss 修饰器遗物测试

### References

- [Source: docs/design/relic-system.md#Boss修饰器系统] — 5 个遗物完整设计规格
- [Source: docs/stories/epic-36-relic-system-expansion.md#Story 36.11] — 验收标准和遗物清单
- [Source: docs/implementation-artifacts/36-10-stage-progress-relics.md] — 前序 Story 开发记录与经验（含 Code Review 教训）
- [Source: src/src/systems/bossModifierEngine.ts#L1-208] — 修饰器引擎完整代码
- [Source: src/src/data/bossModifiers.ts#L178-200] — BossModifierParams 接口
- [Source: src/src/data/bossModifiers.ts#L222-234] — bossDecay.onTick（decayRate 消费点）
- [Source: src/src/data/bossModifiers.ts#L267-273] — bossDoubleTarget.apply（targetMultiplier 消费点）
- [Source: src/src/data/bossModifiers.ts#L144-170] — drawBossModifiers/generateBossModifierCandidates
- [Source: src/src/systems/battle.ts#L914-917] — timer loop timeSpeed 消费
- [Source: src/src/systems/battle.ts#L531-537] — onError comboPunishRate 消费
- [Source: src/src/systems/battle.ts#L597-604] — completeWord scoreCap/diminishRate 消费
- [Source: src/src/systems/battle.ts#L1246-1274] — startLevel modifier 应用区
- [Source: src/src/systems/battle.ts#L838-860] — showGoldReward 金币计算
- [Source: src/src/systems/shop.ts#L456-459] — openShop 金币计算
- [Source: src/src/systems/stage/stageFlow.ts#L78-80] — getStageType
- [Source: src/src/systems/stage/stageFlow.ts#L129-131] — getEliteModifierIndex
- [Source: src/src/systems/relics/StageRelicBehaviors.ts] — 行为模块参考模式

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- modifier_shield 图标从 🛡️ 改为 🧿（与 combo_buffer 冲突）
- bounty_hunter 图标从 💰 改为 🏴‍☠️（与 resource:gold 冲突）
- bossDecay.onTick 中的护盾逻辑内联实现（避免 data→systems 循环依赖）
- iconRegistry.test.ts 总条目数从 303 修正为 79（原测试含已删除的技能图标条目）
- 所有 452 遗物测试通过（411 existing + 41 new）

**Code Review 修复（4 issues fixed）：**
- [H1] diminishRate 未应用护盾 → getDiminishMultiplier() 内联护盾检查（bossModifiers.ts）
- [H2] 反转 targetMultiplier 时 oldMult 在修改后读取（no-op bug）→ 修正为修改前捕获（BossModifierRelicBehaviors.ts）
- [M1] 修饰器反转缺少 showFeedback → battle.ts 添加条件反馈
- [M2] 混沌轮盘缺少 showFeedback → checkChaosRoulette 改为返回 boolean + battle.ts 添加条件反馈
- 新增 2 个测试：targetMultiplier 反转/加倍 + state.targetScore 缩放验证（43 tests total）

### File List

- `src/src/data/relics.ts` — 添加 5 个 boss_modifier 遗物 (55→60)
- `src/src/systems/bossModifierEngine.ts` — 新增 5 个导出 API (getActiveInstances, forceRebuildParams, replaceTemporaryModifier, undoLastTemporaryModifier, ModifierInstance type)
- `src/src/systems/relics/BossModifierRelicBehaviors.ts` — **新建** Boss修饰器遗物行为模块
- `src/src/data/bossModifiers.ts` — bossDecay.onTick 内联护盾逻辑
- `src/src/systems/battle.ts` — 8 个集成点（shield×4, bounty, barrier×2, chaos, reversal, init, reset）
- `src/src/systems/shop.ts` — openShop 赏金猎人金币加成
- `tests/unit/systems/relics/relics.test.ts` — 遗物总数 55→60, 稀有度计数更新
- `tests/unit/systems/relics/relics.slots.test.ts` — zeroPriceRelics + modifier_reversal
- `tests/unit/systems/relics/relics.bossmod.test.ts` — **新建** 43 个测试（41 + 2 review fix）
- `tests/unit/data/iconRegistry.test.ts` — 总条目数修正 303→79
