# Story 36.10: 关卡进度系统遗物

Status: done

## Story

As a player,
I want 5 stage progress relics that provide early-game burst damage, rest stage bonuses, extended time limits, elite reward doubling, and a last-chance resurrection mechanic,
so that stage progression becomes more strategic with meaningful choices about time management, risk-taking, and resource optimization.

## Acceptance Criteria

1. **AC1 — 暖身操 (warm_up)**: 每关开始后 10 秒内所有技能产出加算 +40%。需追踪关卡已进行时间（从 `startTimer()` 开始计），10 秒后自动失效。

2. **AC2 — 幕间准备 (intermission)**: 进入休息关时自动获得 +10 金币和 1 次免费商店刷新（设置 `state.shop.freeRefreshes += 1` 或等效机制）。

3. **AC3 — 续航电池 (endurance_battery)**: 每关基础时间 +10s（在 `startLevel()` 中 `state.timeMax += 10`，在 tempBuff 应用之后）。

4. **AC4 — 精英猎手 (elite_hunter)**: 精英关通关时金币奖励翻倍（`showGoldReward()` 中 `totalGold *= 2`），遗物选择权重不变。

5. **AC5 — 不死鸟 (phoenix)**: 关卡失败判定时（`endLevel()` 中 `state.score < state.targetScore`）检查是否持有此遗物；若有则取消失败、时间重置为 10s、继续战斗；移除此遗物；若为精英/Boss 关则额外重新随机修饰器。

6. **AC6 — 不死鸟消耗后不再触发（防止重复复活）有测试**。

7. **AC7 — 不死鸟在精英关的修饰器刷新有测试**。

## Tasks / Subtasks

- [x] Task 1: 添加 5 个遗物数据定义 (AC: #1-#5)
  - [x] 1.1 在 `data/relics.ts` 的 `RELICS` 中添加 5 个 RelicData 条目，含 `subsystem: 'stage'`
  - [x] 1.2 为行为型遗物设置 `behaviorType: 'phoenix'`（仅 phoenix 需要）
  - [x] 1.3 确认图标唯一性（与现有 50 个遗物不冲突）
  - [x] 1.4 更新 `relics.test.ts` 中遗物总数（50→55）和各稀有度计数断言
  - [x] 1.5 更新 `relics.slots.test.ts` 中 zeroPriceRelics（phoenix basePrice=0）

- [x] Task 2: 创建 StageRelicBehaviors.ts 行为模块 (AC: #1-#5)
  - [x] 2.1 创建 `systems/relics/StageRelicBehaviors.ts`
  - [x] 2.2 导出常量：`WARMUP_DURATION = 10`、`WARMUP_BONUS = 0.40`、`INTERMISSION_GOLD = 10`、`INTERMISSION_FREE_REFRESH = 1`、`ENDURANCE_TIME_BONUS = 10`、`PHOENIX_REVIVE_TIME = 10`
  - [x] 2.3 模块级 `_stageStartTime: number`（`Date.now()` 戳，每关 startLevel 重置）
  - [x] 2.4 导出 `getWarmUpBonus(): number` — 有遗物 + 已进行时间 < WARMUP_DURATION → WARMUP_BONUS，否则 0
  - [x] 2.5 导出 `checkIntermission(): { gold: number; freeRefreshes: number } | null` — 有遗物 → 返回 gold+refresh，否则 null
  - [x] 2.6 导出 `getEnduranceTimeBonus(): number` — 有遗物 → ENDURANCE_TIME_BONUS，否则 0
  - [x] 2.7 导出 `checkEliteHunterGoldMultiplier(): number` — 有遗物 + 当前为精英关 → 2，否则 1
  - [x] 2.8 导出 `checkPhoenixRevive(): { reviveTime: number; refreshModifiers: boolean } | null` — 有遗物 → 返回复活参数 + 是否刷新修饰器（精英/Boss 关），否则 null
  - [x] 2.9 导出 `consumePhoenix(): void` — `state.player.relics.delete('phoenix')` + 从 relicStates 清理
  - [x] 2.10 导出 `resetStageRelicBattleState(): void` — 重置 `_stageStartTime`
  - [x] 2.11 导出 `initStageRelicBehaviors(): void` — 注册 'phoenix' 行为

- [x] Task 3: 实现暖身操 (AC: #1)
  - [x] 3.1 在 `StageRelicBehaviors.ts` 的 `getWarmUpBonus()` 中：`(Date.now() - _stageStartTime) / 1000 < WARMUP_DURATION` → 返回 WARMUP_BONUS
  - [x] 3.2 在 `skills.ts` 的 `triggerAffixSkillWithFeedback()` 中（~L196 relicBonus 合并区）：`const warmUpBonus = getWarmUpBonus(); if (warmUpBonus > 0) relicBonus += warmUpBonus;`
  - [x] 3.3 在 `battle.ts` 的 `startLevel()` 中（~L1137 reset 区）：调用 `resetStageRelicBattleState()`

- [x] Task 4: 实现幕间准备 (AC: #2)
  - [x] 4.1 在 `restStage.ts` 的 `openRestStage()` 中（~L20）：调用 `checkIntermission()`，若非 null → `state.gold += result.gold` + 存储 free refresh 标记
  - [x] 4.2 free refresh 机制：在 `shop.ts` 的 `refreshShop()` 中检查标记，若有免费次数则 cost=0 并消耗
  - [x] 4.3 显示反馈：`showFeedback('🔋 幕间免费刷新！', color)` 在 shop.ts 刷新时显示

- [x] Task 5: 实现续航电池 (AC: #3)
  - [x] 5.1 在 `battle.ts` 的 `startLevel()` 中（~L1119 tempBuff 应用之后）：`state.timeMax += getEnduranceTimeBonus()`

- [x] Task 6: 实现精英猎手 (AC: #4)
  - [x] 6.1 在 `battle.ts` 的 `showGoldReward()` 中（~L855）：`totalGold` 计算后乘以 `checkEliteHunterGoldMultiplier()`
  - [x] 6.2 精英猎手只影响金币，不影响遗物选择（`showRelicPicker` 不变）

- [x] Task 7: 实现不死鸟 (AC: #5)
  - [x] 7.1 在 `battle.ts` 的 `endLevel()` 中（~L1043-1045）：在 `gameOver()` 之前检查 `checkPhoenixRevive()`
  - [x] 7.2 复活逻辑：`consumePhoenix()` → 重新启动 timer（`state.time = reviveTime; startTimer()`）→ `state.phase = 'battle'` → 播放复活反馈
  - [x] 7.3 精英/Boss 关额外调用 `cleanupModifier()` → 重新应用随机修饰器
  - [x] 7.4 复活后 startTimer() 恢复计时器 + renderRelicDisplay() 更新 UI
  - [x] 7.5 更新 `renderRelicDisplay()` 反映遗物已移除

- [x] Task 8: 注册模块初始化 (AC: #1-#5)
  - [x] 8.1 `battle.ts` 的 `initInput()` 中调用 `initStageRelicBehaviors()`
  - [x] 8.2 `battle.ts` 的 `startLevel()` 中（reset 区域）调用 `resetStageRelicBattleState()`

- [x] Task 9: 单元测试 (AC: #1-#7)
  - [x] 9.1 创建 `relics.stage.test.ts`（31 个测试）
  - [x] 9.2 暖身操：无遗物→0、有遗物+<10s→0.40、有遗物+>10s→0、恰好10s→0、9.9s→0.40
  - [x] 9.3 幕间准备：无遗物→null、有遗物→{gold:10, freeRefreshes:1}、免费刷新授予/消耗/多次消耗
  - [x] 9.4 续航电池：无遗物→0、有遗物→10
  - [x] 9.5 精英猎手：无遗物→1、有遗物+精英关→2、有遗物+普通关→1
  - [x] 9.6 不死鸟：无遗物→null、有遗物+普通关→refreshModifiers:false、+精英关→true、+Boss关→true
  - [x] 9.7 不死鸟消耗：consumePhoenix 后再检查→null (AC: #6)
  - [x] 9.8 不死鸟精英关修饰器刷新：refreshModifiers=true 当 isEliteNode (AC: #7)
  - [x] 9.9 resetStageRelicBattleState 重置 stageStartTime + 免费刷新清零
  - [x] 9.10 initStageRelicBehaviors 注册行为（≥1）

## Dev Notes

### 当前系统状态（CRITICAL）

**已完成的基础设施（Story 36.1 — 36.9）：**
- `RelicSubsystem` 已包含 `'stage'`（relics.ts:93）
- `RelicBehaviorType` 已包含 `'phoenix'`（relics.ts:129）
- `RelicConditionType` 已包含 `'time_elapsed_lt'`（用于暖身操条件判断参考）
- `RelicConditionType` 已包含 `'stage_type'`（用于精英猎手条件判断参考）
- `RELIC_MODIFIER_DEFS` 当前为空 `{}`（所有遗物走纯函数路线）
- `registerRelicBehavior()` / `dispatchRelicBehavior()` 行为分发框架就绪
- 50 个遗物已实现（10 职业 + 5×8 通用）

**关卡时间初始化流程（battle.ts:1060-1275 startLevel()）：**
```
startLevel()
  ├── state.timeMax = getCycleTimeLimit(state.level, state.cycle)  // L1106
  ├── 应用 tempBuffs: if (buff.type === 'time') state.timeMax += buff.value  // L1115-1119
  ├── resetResources()  // L1122
  ├── 重置各子系统遗物状态（L1125-1137）  ← 续航电池 + 暖身操在此后
  ├── state.battleStats = createBattleStats()  // L1143
  └── startTimer() → state.time = state.timeMax + state.player.timeBonus  // L899-900
```

⚠️ **续航电池 `state.timeMax += 10` 必须在 tempBuff 应用之后、`startTimer()` 之前**，确保 `state.time` 包含加成。建议放在 ~L1138（重置遗物状态之后）。

⚠️ **暖身操的 `_stageStartTime` 必须在 `startTimer()` 之前设置**，否则首次击键时计时不准。建议在 `resetStageRelicBattleState()` 中 `_stageStartTime = Date.now()`。

**关卡失败流程（battle.ts:979-1047 endLevel()）：**
```
endLevel()
  ├── clearInterval(timerInterval)  // L980
  ├── cleanupModifier() / stopBossRotation()  // L986-987
  ├── if (state.score >= state.targetScore)  // L1003
  │   ├── 胜利 → showRatingReveal → progression
  │   └── 精英关 → showRelicPicker → openShop
  └── else  // L1043-1045
      ├── trackEvent('demo_stage_fail', ...)
      └── gameOver()  ← ⚠️ 不死鸟在此拦截
```

⚠️ **不死鸟复活的关键挑战**：`endLevel()` 已经调用了 `cleanupModifier()` 和 `stopBossRotation()`（L986-987），这在分数判定之前。复活时需要：
1. 重新设置 `state.time = PHOENIX_REVIVE_TIME`
2. 重新调用 `startTimer()` 恢复计时
3. 恢复 `state.phase = 'battle'`
4. 如果是精英/Boss 关：重新随机应用修饰器（modifier 已被 cleanup 了）
5. 普通关：修饰器不需要恢复（普通关无修饰器）

⚠️ **endLevel 中 cleanupModifier 的顺序问题**：endLevel L986 `cleanupModifier()` 在分数判定 L1003 之前。这意味着不死鸟复活时修饰器已被清理。对于精英/Boss 关需要重新随机修饰器，对于普通关不需要（本来就没有）。

**休息关流程（restStage.ts:20-76 openRestStage()）：**
```
openRestStage()
  ├── state.phase = 'rest'
  ├── currentEvent = drawRestEvent(...)
  ├── 渲染 UI + 选项按钮
  └── showScreen('rest')

completeRestStage() → getNextBattleNode → state.level = next → startLevel()
```

⚠️ **幕间准备金币必须在 `openRestStage()` 的最前面添加**，在 UI 渲染之前让 state.gold 包含加成金币。

⚠️ **免费刷新的实现方式选择**：
- 方案 A：模块级 `_intermissionFreeRefreshes` 计数器（每次 openRestStage 设置）
- 方案 B：复用 shop.ts 的现有 freeRefresh 机制（如 `word_dealer` 的 `consumeWordDealerFreeRefresh()`）
- **推荐方案 A**：与 word_dealer 分开管理，避免互相覆盖。在 `StageRelicBehaviors.ts` 导出 `hasIntermissionFreeRefresh()` / `consumeIntermissionFreeRefresh()`。

**金币奖励计算（battle.ts:835-896 showGoldReward()）：**
```
showGoldReward()
  ├── baseGold = 100
  ├── skillGold = floor(state.resources.gold)
  ├── relicGold = resolveRelicEffects('on_battle_end', ...)
  ├── 万物熔炉覆盖（baseGold=0, relicGold=furnace）
  ├── totalGold = baseGold + skillGold + relicGold  // L855
  │   ← ⚠️ 精英猎手在此后乘以 2
  ├── state.gold += totalGold
  └── UI 显示
```

⚠️ **精英猎手翻倍范围**：翻倍 `totalGold`（包含 baseGold + skillGold + relicGold），不单独翻倍某一项。万物熔炉的转化金币也会被翻倍（合理：万物熔炉是不同计算方式，但精英猎手是结果翻倍）。

**技能产出管线（skills.ts:179-239 triggerAffixSkillWithFeedback()）：**
```
relicBonus = 0
  + prismBonus（倍率棱镜）
  + firstStrikeBonus（首发强化）
  + lessIsMoreBonus（少而精）
  + adjacentBonus（邻键之力）
  + symmetryBonus（对称契约）
  + rowBonus（行会勋章）
  + shortSprintBonus（短词冲刺）
  ← ⚠️ 暖身操 warmUpBonus 在此加入

applyResource:
  totalBonus = relicBonus + tideBonus（资源潮汐）
  if (totalBonus > 0 && amount > 0) amount *= (1 + totalBonus)
```

⚠️ **暖身操加入位置**：在 ~L196（shortSprintBonus 之后），添加 `const warmUpBonus = getWarmUpBonus(); if (warmUpBonus > 0) relicBonus += warmUpBonus;`

**Boss 修饰器系统（bossModifierEngine.ts）：**
- `cleanupModifier()` — 清理所有活跃修饰器（L66）
- `applyModifier(modId, isElite, isPermanent)` — 应用修饰器（L56）
- `startBossRotation()` — 启动 Boss 阶段轮换（20s 间隔）
- 不死鸟复活精英/Boss 关时需重新随机修饰器

### 关键设计决策

**1. 暖身操计时方式：**
- 使用 `Date.now()` wall-clock 计时（不依赖 state.time 倒计时）
- `_stageStartTime` 在 `resetStageRelicBattleState()` 中设为 `Date.now()`
- `getWarmUpBonus()` 检查 `(Date.now() - _stageStartTime) / 1000 < WARMUP_DURATION`
- 优点：不受暂停/time bonus 影响，真实反映 10 秒窗口

**2. 幕间准备免费刷新：**
- 模块级 `_intermissionFreeRefreshes: number`，每次 `openRestStage` 检查遗物后设置
- `shop.ts` 的 `refreshShop()` 中：在 word_dealer 免费检查之后，增加幕间准备免费检查
- 消耗后递减为 0
- 跨商店不累积（每次进休息关只给 1 次）

**3. 续航电池实现位置：**
- 在 `startLevel()` 的 tempBuff 应用之后（~L1119 后）
- `state.timeMax += getEnduranceTimeBonus()`
- 简单直接，无需模块级状态

**4. 精英猎手金币翻倍：**
- 在 `showGoldReward()` 的 `totalGold` 计算之后（~L855 后）
- `const eliteMultiplier = checkEliteHunterGoldMultiplier(); totalGold = Math.floor(totalGold * eliteMultiplier);`（需改 totalGold 为 let）
- `checkEliteHunterGoldMultiplier()` 内部调用 `getStageType(state.level)` 判断

**5. 不死鸟复活流程：**
```
endLevel()
  ├── ... cleanup ...
  ├── if (state.score >= state.targetScore) → victory path
  └── else
      ├── const phoenix = checkPhoenixRevive()
      ├── if (phoenix)
      │   ├── consumePhoenix()  // 移除遗物
      │   ├── state.time = phoenix.reviveTime  // 重置时间
      │   ├── if (phoenix.refreshModifiers) → reapplyRandomModifiers()
      │   ├── startTimer()  // 重启计时器
      │   ├── state.phase = 'battle'
      │   ├── showFeedback('🔥 不死鸟复活！', '#ff6600')
      │   ├── playSound('levelup')
      │   ├── renderRelicDisplay()  // 更新遗物显示
      │   └── return  // 不调用 gameOver()
      └── gameOver()
```

**6. 行为文件组织：**
参照 `ResourceRelicBehaviors.ts` / `ShopRelicBehaviors.ts` 模式：
- 纯函数导出，调用方在合适位置调用
- 模块级状态用 `_` 前缀
- `initStageRelicBehaviors()` 注册行为
- `resetStageRelicBattleState()` 每关重置

### 遗物数据规格

| ID | 名称 | 图标 | 稀有度 | basePrice | subsystem | behaviorType |
|---|---|---|---|---|---|---|
| `warm_up` | 暖身操 | 🏋️ | common | 50 | stage | — |
| `intermission` | 幕间准备 | 🔋 | common | 50 | stage | — |
| `endurance_battery` | 续航电池 | 🔌 | rare | 80 | stage | — |
| `elite_hunter` | 精英猎手 | 🎯 | epic | 120 | stage | — |
| `phoenix` | 不死鸟 | 🐦‍🔥 | legendary | 0 | stage | phoenix |

注：
- warm_up、intermission、endurance_battery、elite_hunter 不需 behaviorType（逻辑简单，纯函数直接调用）
- phoenix 需要 behaviorType（涉及复活状态管理和遗物移除）
- phoenix basePrice=0（传说级，与 universal_furnace、timed_auction 同）
- 图标唯一性：🏋️🔋🔌🎯🐦‍🔥 均未被现有 50 个遗物使用

### 从 Story 36.2 — 36.9 继承的关键经验

1. **纯函数模式**: 行为函数导出为纯函数，由调用方在合适位置调用。行为注册仅用于框架完整性（no-op body）。
2. **加算合并**: 多个百分比修饰器加算叠加（暖身操 +40% 与其他遗物加算）。
3. **relicStates 类型**: 只能存 number 值。
4. **import type**: 纯类型导入必须用 `import type`。
5. **clearBehaviorHandlers()**: 测试 beforeEach 中调用。
6. **Icon 唯一性**: 5 个遗物需要 5 个不同 emoji。
7. **遗物总数断言**: `relics.test.ts` 中总数（50→55）、各稀有度计数需更新。
8. **zeroPriceRelics**: phoenix basePrice=0 → `relics.slots.test.ts` 中添加。
9. **RELIC_MODIFIER_DEFS**: 保持为空 `{}`（不使用 pipeline）。
10. **feedback 文本用"秒"不用"s"**: 中文 feedback 约定。
11. **state.player.relics.delete()**: 移除遗物后需更新 relicStates 和 UI。

### 性能约束

- warm_up: `Date.now()` 比较，<0.01ms（每次技能触发调用）
- intermission: 一次性检查，<0.1ms
- endurance_battery: 一次性加法，<0.01ms
- elite_hunter: 一次性乘法，<0.01ms
- phoenix: 一次性检查 + 复活逻辑，<1ms（含修饰器重新应用）

### Project Structure Notes

**需修改的文件：**
- `src/src/data/relics.ts` — 添加 5 个 RelicData（behaviorType 'phoenix' 已存在于类型定义）
- `src/src/systems/skills.ts` — triggerAffixSkillWithFeedback: 暖身操 relicBonus 合并
- `src/src/systems/battle.ts` — startLevel: 续航电池 + resetStageRelicBattleState; endLevel: 不死鸟复活; showGoldReward: 精英猎手; initInput: initStageRelicBehaviors
- `src/src/systems/restStage.ts` — openRestStage: 幕间准备金币 + 免费刷新标记
- `src/src/systems/shop.ts` — refreshShop: 幕间准备免费刷新检查
- `src/tests/unit/systems/relics/relics.test.ts` — 遗物总数 50→55 和各稀有度计数更新
- `src/tests/unit/systems/relics/relics.slots.test.ts` — zeroPriceRelics 添加 phoenix

**需新建的文件：**
- `src/src/systems/relics/StageRelicBehaviors.ts` — 关卡进度子系统行为模块
- `src/tests/unit/systems/relics/relics.stage.test.ts` — 关卡进度遗物测试

### References

- [Source: docs/design/relic-system.md#关卡进度系统] — 5 个遗物完整设计规格
- [Source: docs/stories/epic-36-relic-system-expansion.md#Story 36.10] — 验收标准和遗物清单
- [Source: docs/implementation-artifacts/36-9-shop-relics.md] — 前序 Story 开发记录与经验
- [Source: src/src/systems/battle.ts#startLevel ~L1060-1275] — 关卡初始化流程（时间、buff、重置）
- [Source: src/src/systems/battle.ts#endLevel ~L979-1047] — 关卡结束判定（分数检查、gameOver 调用点）
- [Source: src/src/systems/battle.ts#showGoldReward ~L835-896] — 金币奖励计算
- [Source: src/src/systems/battle.ts#startTimer ~L899-957] — 计时器启动（state.time = timeMax + timeBonus）
- [Source: src/src/systems/battle.ts#gameOver ~L1360-1412] — 游戏结束处理
- [Source: src/src/systems/restStage.ts#openRestStage ~L20-76] — 休息关打开流程
- [Source: src/src/systems/skills.ts#triggerAffixSkillWithFeedback ~L179-196] — 技能产出 relicBonus 合并区
- [Source: src/src/systems/bossModifierEngine.ts#cleanupModifier ~L66] — 修饰器清理
- [Source: src/src/systems/relics/ResourceRelicBehaviors.ts] — 行为模块参考模式

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- 5 个关卡进度系统遗物全部实现：暖身操、幕间准备、续航电池、精英猎手、不死鸟
- StageRelicBehaviors.ts 纯函数行为模块：6 常量 + 12 导出函数
- skills.ts 集成：暖身操 +40% 加算合并到 relicBonus 区
- battle.ts 集成：续航电池 timeMax+10s、精英猎手金币翻倍、不死鸟复活拦截 gameOver
- restStage.ts 集成：幕间准备金币 +10 + 免费刷新授予
- shop.ts 集成：幕间准备免费刷新检查（在 word_dealer 之后）
- 不死鸟复活：时间重置 10s、精英/Boss 关额外刷新修饰器、消耗遗物防止重复复活
- 31 个单元测试全部通过

### Code Review Fixes

- **C1 (CRITICAL)**: Phoenix 复活时间被 startTimer() 覆盖 — state.time=10 被 startTimer() 覆盖为 timeMax+timeBonus（60+秒）。修复：在 startTimer() 之后重新设置 state.time 和 state.resources.time
- **H1 (HIGH)**: elite_hunter 金币翻倍仅在 showGoldReward 显示函数中，实际金币在 openShop 中添加却未翻倍。修复：在 shop.ts openShop() 中同步应用 checkEliteHunterGoldMultiplier()
- **H2 (HIGH)**: Phoenix 复活后 BGM 未重启（endLevel 已调用 stopBGM）。修复：在复活逻辑中添加 startBGM('battle')
- **M1 (MEDIUM)**: Phoenix 处理中冗余 cleanupModifier() 调用（endLevel 顶部已清理）。修复：移除冗余调用
- **M2 (MEDIUM)**: Phoenix 复活后 scoreRoller 未重启。修复：添加 startScoreRoller()

### File List

- `src/src/data/relics.ts` — 新增 5 个 RelicData（warm_up, intermission, endurance_battery, elite_hunter, phoenix）
- `src/src/systems/relics/StageRelicBehaviors.ts` — **新建** 关卡进度遗物行为模块
- `src/src/systems/skills.ts` — triggerAffixSkillWithFeedback: 暖身操 relicBonus 合并
- `src/src/systems/battle.ts` — startLevel: 续航电池+resetStageRelicBattleState; endLevel: 不死鸟复活(+Review C1/H2/M1/M2); showGoldReward: 精英猎手; initInput: initStageRelicBehaviors
- `src/src/systems/restStage.ts` — openRestStage: 幕间准备金币+免费刷新
- `src/src/systems/shop.ts` — refreshShop: 幕间准备免费刷新检查; openShop: 精英猎手金币翻倍 (Review H1)
- `src/tests/unit/systems/relics/relics.stage.test.ts` — **新建** 31 个测试
- `src/tests/unit/systems/relics/relics.test.ts` — 遗物总数 50→55、稀有度计数更新
- `src/tests/unit/systems/relics/relics.slots.test.ts` — zeroPriceRelics 添加 phoenix
- `docs/implementation-artifacts/sprint-status.yaml` — 36-10 状态更新
