# Story 36.8: 资源系统遗物

Status: done

## Story

As a player,
I want 5 resource system relics that reward word completion with bonus score, optimize resource diversity, provide periodic time bonuses, alternate resource amplification based on word parity, and convert excess performance into gold,
so that resource production and management become more strategic with meaningful choices around how I generate and convert resources.

## Acceptance Criteria

1. **AC1 — 分数磁铁 (score_magnet)**: 每完成一个单词时 `state.score += 1`（在技能结算之后追加）。

2. **AC2 — 资源感应 (resource_sense)**: 追踪一词内产出的各资源类型数量，产出 ≥3 种时找出最少的那种 +50%。利用现有 `_wordResourceTypes` 基础设施，新增按类型记录产出量。

3. **AC3 — 时间露珠 (time_dew)**: 追踪本关已完成单词数，每完成 3 个单词 `state.time += 1`。

4. **AC4 — 资源潮汐 (resource_tide)**: 追踪本关单词序号（奇/偶），奇数词 base 资源产出加算 +40%，偶数词 multiplier 资源产出加算 +40%。

5. **AC5 — 万物熔炉 (universal_furnace)**: 战斗结束时 `bonusGold = max(0, score - target) + remainingTime`；同时不获得默认通关金币（baseGold = 0）。

6. **AC6 — 万物熔炉边界测试**: 万物熔炉在刚好达标（0 overkill）和大幅超标时的金币计算有测试。

## Tasks / Subtasks

- [x] Task 1: 添加 5 个遗物数据定义 (AC: #1-#5)
  - [x] 1.1 在 `data/relics.ts` 的 `RELICS` 中添加 5 个 RelicData 条目，含 `subsystem: 'resource'`
  - [x] 1.2 为行为型遗物设置 `behaviorType`（resource_tide）+ 新增 RelicBehaviorType
  - [x] 1.3 确认图标唯一性（🧲🔮💧🌊🔥 与现有 40 个遗物不冲突）
  - [x] 1.4 更新 `relics.test.ts` 中遗物总数（40→45）和各稀有度计数断言
  - [x] 1.5 更新 `relics.slots.test.ts` 中 zeroPriceRelics（universal_furnace basePrice=0）

- [x] Task 2: 创建 ResourceRelicBehaviors.ts 行为模块 (AC: #1-#5)
  - [x] 2.1 创建 `systems/relics/ResourceRelicBehaviors.ts`
  - [x] 2.2 导出常量：`SCORE_MAGNET_BONUS = 1`、`RESOURCE_SENSE_THRESHOLD = 3`、`RESOURCE_SENSE_BOOST = 0.50`、`TIME_DEW_INTERVAL = 3`、`TIME_DEW_BONUS = 1`、`RESOURCE_TIDE_RATE = 0.40`
  - [x] 2.3 导出 `checkScoreMagnet(): number` — 有遗物 → SCORE_MAGNET_BONUS，否则 0
  - [x] 2.4 模块级 `_wordResourceAmounts: Record<string, number>` 追踪本词各资源类型产出量
  - [x] 2.5 导出 `recordResourceProduction(resource: string, amount: number): void` — 累加到 _wordResourceAmounts
  - [x] 2.6 导出 `checkResourceSense(): { resource: string, boost: number } | null` — 有遗物 + ≥3 种 → 找最少那种返回 +50%，否则 null
  - [x] 2.7 导出 `resetWordResourceAmounts(): void` — 每词开始时清空（在 resetWordResourceTypes 中调用）
  - [x] 2.8 模块级 `_timeDewCounter: number` 追踪本关已完成词数
  - [x] 2.9 导出 `incrementTimeDewCounter()` + `checkTimeDew(): number` — 分离递增与检查
  - [x] 2.10 模块级 `_wordParity: number` 追踪本关词序号
  - [x] 2.11 导出 `getResourceTideBonus(resource: string): number` — 有遗物时：奇数词 + base → 0.40，偶数词 + multiplier → 0.40，否则 0
  - [x] 2.12 导出 `incrementWordParity(): void` — 每词完成时 +1
  - [x] 2.13 导出 `checkUniversalFurnace(): { bonusGold: number, overrideBase: boolean } | null`
  - [x] 2.14 不导出 resetResourceRelicRunState — 所有状态均为关级，由 resetResourceRelicBattleState 覆盖
  - [x] 2.15 导出 `resetResourceRelicBattleState(): void` — 每关开始时重置 counter 和 parity
  - [x] 2.16 导出 `initResourceRelicBehaviors(): void` — 注册 resource_tide 行为（no-op body）

- [x] Task 3: 实现分数磁铁 (AC: #1)
  - [x] 3.1 在 `battle.ts` 的 `completeWord()` 中调用 `checkScoreMagnet()`
  - [x] 3.2 返回值 > 0 时 `state.score += returnValue`，显示 feedback "🧲 +1"
  - [x] 3.3 hook 位置：在全键风暴之后、词汇收藏 hook 之前

- [x] Task 4: 实现资源感应 (AC: #2)
  - [x] 4.1 在 `skills.ts` 的 `applyResource` 回调中，正产出时调用 `recordResourceProduction(resource, amount)`
  - [x] 4.2 在 `battle.ts` 的 `completeWord()` 中调用 `checkResourceSense()`
  - [x] 4.3 返回非 null 时，按返回的 resource 类型 +50% 追加产出，显示 feedback "🔮 +{resource}"
  - [x] 4.4 在 `skills.ts` 的 `resetWordResourceTypes()` 中同步调用 `resetWordResourceAmounts()`

- [x] Task 5: 实现时间露珠 (AC: #3)
  - [x] 5.1 在 `battle.ts` 的 `completeWord()` 中调用 `incrementTimeDewCounter()` + `checkTimeDew()`
  - [x] 5.2 返回值 > 0 时 `state.time += returnValue`，显示 feedback "💧 +1秒"
  - [x] 5.3 hook 位置：在 completeWord 中资源感应之后、词汇收藏之前

- [x] Task 6: 实现资源潮汐 (AC: #4)
  - [x] 6.1 在 `skills.ts` 的 `applyResource` 回调中，用 `getResourceTideBonus(resource)` 加入 totalBonus 加算
  - [x] 6.2 在 `battle.ts` 的 `completeWord()` 中调用 `incrementWordParity()`
  - [x] 6.3 关键设计：resource_tide 的加算与 relicBonus 合并为 totalBonus 后一起乘算

- [x] Task 7: 实现万物熔炉 (AC: #5)
  - [x] 7.1 在 `battle.ts` 的 `showGoldReward()` 中调用 `checkUniversalFurnace()`
  - [x] 7.2 返回非 null 时：`baseGold = 0`，`relicGold = furnaceResult.bonusGold`
  - [x] 7.3 在 `shop.ts` 的 `openShop()` 中同步万物熔炉逻辑
  - [x] 7.4 金币奖励面板已有遗物金币行显示，无需额外 feedback

- [x] Task 8: 注册模块初始化 (AC: #1-#5)
  - [x] 8.1 `initResourceRelicBehaviors()` 注册 resource_tide 行为
  - [x] 8.2 `battle.ts` 的 `initInput()` 中调用 `initResourceRelicBehaviors()`
  - [x] 8.3 `battle.ts` 的 `startLevel()` 中调用 `resetResourceRelicBattleState()`（关级重置）
  - [x] 8.4 不需要 Run 级重置 — 所有状态均为关级

- [x] Task 9: 单元测试 (AC: #1-#6)
  - [x] 9.1 创建 `relics.resource.test.ts`（31 个测试用例）
  - [x] 9.2 分数磁铁：无遗物→0、有遗物→1
  - [x] 9.3 资源感应：无遗物→null、<3种→null、≥3种→最少那种+50%、多种相同最少取任一、恰好3种
  - [x] 9.4 时间露珠：无遗物→0、1-2词→0、第3词→1、第6词→1、第4词→0
  - [x] 9.5 资源潮汐：无遗物→0、奇数词+base→0.40、奇数词+multiplier→0、偶数词+multiplier→0.40、偶数词+base→0
  - [x] 9.6 万物熔炉：无遗物→null、overkill=0+time=5→bonusGold=5、overkill=50+time=10→bonusGold=60、overrideBase=true
  - [x] 9.7 万物熔炉边界：overkill=0+time=0→bonusGold=0
  - [x] 9.8 resetResourceRelicBattleState 重置 counter 和 parity
  - [x] 9.9 initResourceRelicBehaviors 注册行为
  - [x] 9.10 交互：资源潮汐 + 短词冲刺可叠加（各自返回独立加成）

## Dev Notes

### 当前系统状态（CRITICAL）

**已完成的基础设施（Story 36.1 — 36.7）：**
- `RelicBehaviorType` 已包含 `'resource_tide'` 未列出 — 需要确认是否需要新增
- `RelicSubsystem` 已包含 `'resource'`（relics.ts:91）
- `RELIC_MODIFIER_DEFS` 当前为空 `{}`（所有遗物走纯函数路线）
- `registerRelicBehavior()` / `dispatchRelicBehavior()` 行为分发框架就绪
- 40 个遗物已实现（10 职业 + 5 打字 + 5 连击 + 5 技能 + 5 附魔 + 5 拓扑 + 5 单词）

**单词完成核心流程（battle.ts `completeWord()` ~L527-705）：**
```
completeWord()
  ├── baseChips 计算
  ├── resolveRelicEffectsWithBehaviors('on_word_complete', {...})
  ├── bonusMult 叠加（遗物乘数、爵士乐、节奏适应）
  ├── finalWordScore 计算
  ├── state.score += finalWordScore
  ├── 玻璃大炮翻倍
  ├── battleStats 更新（wordsCompleted++）
  ├── eventBus.emit('word:complete', { word, score, perfect })
  ├── 全键风暴
  ├── ← 分数磁铁 hook 位置 (score_magnet: state.score += 1)
  ├── ← 资源感应 hook 位置 (resource_sense: 最少资源 +50%)
  ├── ← 时间露珠 hook 位置 (time_dew: 每 3 词 +1s)
  ├── ← incrementWordParity (resource_tide: 词序号递增)
  ├── 词汇收藏 hook（word_collection）
  ├── 长词达人 hook（long_word_master）
  ├── 胜利检查 → showGoldReward → endLevel
  └── setTimeout → setWord()
```

**技能产出加算（skills.ts `triggerAffixSkillWithFeedback()` ~L176-207）：**
```
let relicBonus = 0;
relicBonus += getMultiplierPrismBonus();     // 倍率棱镜
relicBonus += getFirstStrikeBonus();         // 首发强化
relicBonus += getLessIsMoreBonus();           // 少而精
relicBonus += getAdjacentPowerBonus(key);    // 邻键之力
relicBonus += getSymmetryPactBonus(key);     // 对称契约
relicBonus += getRowMedalBonus(key);         // 行会勋章
relicBonus += getShortSprintBonus(len);      // 短词冲刺
// amount = amount * (1 + relicBonus)
```

⚠️ **资源潮汐不走统一 relicBonus 块** — 它需要按资源类型条件应用（base 仅奇数词，multiplier 仅偶数词），必须在 `applyResource` 回调中按资源类型分别处理。

**金币结算（battle.ts `showGoldReward()` ~L791-844）：**
```
showGoldReward(onComplete)
  ├── baseGold = 100（基础通关金币）
  ├── skillGold = floor(state.resources.gold)（技能产出金币）
  ├── goldRelicResult = resolveRelicEffects('on_battle_end', { overkill, remainingTime })
  ├── relicGold = floor(goldRelicResult.effects.gold)（遗物加成金币）
  ├── totalGold = baseGold + skillGold + relicGold
  └── 万物熔炉 hook：overrideBase → baseGold=0, relicGold=furnace.bonusGold
```

⚠️ **shop.ts 也有金币结算** — `renderGoldBreakdown()` (~L438) 中有类似的 `resolveRelicEffects('on_battle_end')`。万物熔炉需要在两处同步处理。

**已有资源追踪基础设施（skills.ts ~L28-77）：**
- `_wordResourceTypes: Set<string>` — 追踪本词产出的资源种类（用于 T1 遗物条件）
- `recordSkillTrigger()` — 每次技能触发时记录，同时 `_wordResourceTypes.add(resource)`
- `getWordResourceTypeCount()` — 返回种类数
- `resetWordResourceTypes()` — 每词开始时清空
- ⚠️ **只追踪种类不追踪数量** — resource_sense 需要新增按类型记录产出量

### 关键设计决策

**1. 分数磁铁实现方式：**
- 纯函数 `checkScoreMagnet()` — 有遗物返回 1，否则 0
- 在 completeWord 中 `state.score += returnValue`
- 位置在技能结算之后（finalWordScore 已加入），额外追加 1 分
- 不参与 bonusMult 或 relicBonus 乘算 — 固定 +1

**2. 资源感应追踪策略：**
- 新增 `_wordResourceAmounts: Record<string, number>` — 按类型累加产出量
- 在 skills.ts 的 applyResource 回调中（正产出时）调用 `recordResourceProduction(resource, amount)`
- `checkResourceSense()` 在 completeWord 中调用：
  - 检查 _wordResourceAmounts 的键数 ≥3
  - 找出值最小的那种资源，返回 `{ resource, bonus: minAmount * 0.5 }`
  - 调用方将 bonus 追加到对应 state.resources
- 与 `_wordResourceTypes` 共享清空时机（resetWordResourceTypes 中同步）

**3. 时间露珠计数策略：**
- **关级状态**：每关重置 counter（不跨关累积）
- `_timeDewCounter` 在 completeWord 中每词递增
- 当 counter % 3 === 0 时返回 TIME_DEW_BONUS
- resetResourceRelicBattleState 在 startLevel 中调用

**4. 资源潮汐实现方式：**
- **不走统一 relicBonus 块** — 因为需要按资源类型条件判断
- 在 applyResource 回调中直接调用 `getResourceTideBonus(resource)`
- 奇数词（parity % 2 === 1）：resource === 'base' 时返回 0.40
- 偶数词（parity % 2 === 0）：resource === 'multiplier' 时返回 0.40
- 加算方式：`amount = amount * (1 + tideBonus + relicBonus)`（与现有 relicBonus 加算合并）
- _wordParity 在 completeWord 中 incrementWordParity 递增
- **关级状态**：每关重置 parity

**5. 万物熔炉实现方式：**
- 在 showGoldReward 中优先检测万物熔炉
- 返回 `{ bonusGold, overrideBase: true }` 表示覆盖默认金币计算
- `bonusGold = max(0, state.score - state.targetScore) + Math.floor(state.time)`
- `baseGold = 0`（不获得默认 100 通关金币）
- skillGold 仍然保留（技能产出的金币不受影响）
- remainingTime 用 `Math.floor(state.time)` 取整（时间是浮点数）

**6. 行为文件组织：**
参照 `WordRelicBehaviors.ts`、`TopologyRelicBehaviors.ts` 模式：
- 纯函数导出，调用方在合适位置调用
- 模块级状态用 `_` 前缀
- `initXxxRelicBehaviors()` 注册行为
- `resetXxxRunState()` / `resetXxxBattleState()` 生命周期

### 遗物数据规格

| ID | 名称 | 图标 | 稀有度 | basePrice | subsystem | behaviorType | category |
|---|---|---|---|---|---|---|---|
| `score_magnet` | 分数磁铁 | 🧲 | common | 50 | resource | — | — |
| `resource_sense` | 资源感应 | 🔮 | common | 50 | resource | — | — |
| `time_dew` | 时间露珠 | 💧 | rare | 80 | resource | — | — |
| `resource_tide` | 资源潮汐 | 🌊 | epic | 120 | resource | resource_tide | — |
| `universal_furnace` | 万物熔炉 | 🔥 | legendary | 0 | resource | — | — |

注：
- score_magnet、resource_sense、time_dew 不需 behaviorType（逻辑简单，纯函数直接调用）
- resource_tide 需要 behaviorType 以注册行为（因为它在 applyResource 中按资源类型条件应用，属于自定义逻辑）
- universal_furnace basePrice=0（传说级，与 punctuation_liberation 同）
- 图标唯一性：🧲🔮💧🌊🔥 均未被现有 40 个遗物使用（需确认）

### 依赖方向

```
data/relics.ts (遗物数据定义)
  ↓ 被引用
systems/relics/RelicPipeline.ts (管道 + 行为分发)
  ↑ 注册行为
systems/relics/ResourceRelicBehaviors.ts (NEW — 资源子系统行为)
  ↓ 被调用
systems/battle.ts (completeWord — score_magnet, resource_sense, time_dew; showGoldReward — universal_furnace)
systems/skills.ts (applyResource — resource_sense 追踪, resource_tide 加算)
```

### 从 Story 36.2 — 36.7 继承的关键经验

1. **纯函数模式**: 行为函数导出为纯函数，由调用方在合适位置调用。行为注册仅用于框架完整性（no-op body）。
2. **加算合并**: 多个百分比修饰器加算叠加。resource_tide 例外 — 按资源类型在 applyResource 中条件应用。
3. **relicStates 类型**: 只能存 number 值。
4. **import type**: 纯类型导入必须用 `import type`。
5. **clearBehaviorHandlers()**: 测试 beforeEach 中调用。
6. **Icon 唯一性**: 5 个遗物需要 5 个不同 emoji，已在数据规格中验证。
7. **遗物总数断言**: `relics.test.ts` 中总数（40→45）、各稀有度计数需更新。
8. **zeroPriceRelics**: universal_furnace basePrice=0 → `relics.slots.test.ts` 中添加。
9. **RELIC_MODIFIER_DEFS**: 保持为空 `{}`（不使用 pipeline）。
10. **feedback 文本用"秒"不用"s"**: Story 36.6 code review 修复的教训。
11. **shop.ts 双重金币计算**: showGoldReward (battle.ts) 和 renderGoldBreakdown (shop.ts) 需同步修改万物熔炉逻辑。
12. **关级 vs Run 级状态**: time_dew counter 和 resource_tide parity 是关级（每关重置），word_collection 的 Set 是 Run 级（跨关保持）。

### 性能约束

- score_magnet: 简单布尔检查 + 常量返回，<0.1ms
- resource_sense: Record 遍历（最多 7 种资源），<0.1ms
- time_dew: 简单计数器 + 模运算，<0.1ms
- resource_tide: 简单奇偶判断 + 资源类型匹配，<0.1ms
- universal_furnace: 简单算术，<0.1ms

### Project Structure Notes

**需修改的文件：**
- `src/src/data/relics.ts` — 添加 5 个 RelicData + 可能新增 RelicBehaviorType
- `src/src/systems/battle.ts` — completeWord: score_magnet + resource_sense + time_dew + incrementWordParity hooks; showGoldReward: universal_furnace; startLevel: resetResourceRelicBattleState; initInput: initResourceRelicBehaviors
- `src/src/systems/skills.ts` — applyResource: recordResourceProduction + resource_tide 加算; resetWordResourceTypes: 同步 resetWordResourceAmounts
- `src/src/systems/shop.ts` — renderGoldBreakdown: universal_furnace 同步
- `src/src/main.ts` — startRun 入口调用 resetResourceRelicRunState（如需）
- `src/tests/unit/systems/relics/relics.test.ts` — 遗物总数 40→45 和各稀有度计数更新
- `src/tests/unit/systems/relics/relics.slots.test.ts` — zeroPriceRelics 添加 universal_furnace

**需新建的文件：**
- `src/src/systems/relics/ResourceRelicBehaviors.ts` — 资源子系统行为模块
- `src/tests/unit/systems/relics/relics.resource.test.ts` — 资源遗物测试

### References

- [Source: docs/design/relic-system.md#资源系统] — 5 个遗物完整设计规格
- [Source: docs/stories/epic-36-relic-system-expansion.md#Story 36.8] — 验收标准 AC1-AC6
- [Source: docs/implementation-artifacts/36-7-word-library-relics.md] — 前序 Story 开发记录与经验
- [Source: src/src/systems/battle.ts#completeWord] — 单词完成流程（~L527-705）
- [Source: src/src/systems/battle.ts#showGoldReward] — 金币结算流程（~L791-844）
- [Source: src/src/systems/skills.ts#triggerAffixSkillWithFeedback] — relicBonus 加算模式（~L176-207）
- [Source: src/src/systems/skills.ts#recordSkillTrigger] — 资源种类追踪（~L28-55）
- [Source: src/src/systems/skills.ts#resetWordResourceTypes] — 词级追踪重置（~L73-77）
- [Source: src/src/systems/skills.ts#applyResource] — 资源应用回调（~L201-228）
- [Source: src/src/systems/shop.ts#renderGoldBreakdown] — 商店金币显示（~L438）
- [Source: src/src/data/relics.ts] — 当前遗物数据定义和类型
- [Source: src/src/systems/relics/WordRelicBehaviors.ts] — 行为模块参考模式

## Dev Agent Record

### Agent Model Used

claude-opus-4-6

### Debug Log References
无

### Completion Notes List
- Task 1: 5 个遗物数据添加到 RELICS（40→45），图标唯一性验证通过（🧲🔮💧🌊🔥），测试断言更新（16 common, 9 rare, 9 epic, 11 legendary）
- Task 2: ResourceRelicBehaviors.ts 创建，11 个导出函数 + 6 个常量（纯函数模式）。无 Run 级状态 — 所有状态均为关级（timeDew counter + wordParity）
- Task 3: 分数磁铁 hook 在 completeWord() 中全键风暴之后、词汇收藏之前
- Task 4: 资源感应追踪在 applyResource 中（正产出时 recordResourceProduction），检查在 completeWord 中。resetWordResourceAmounts 同步到 resetWordResourceTypes
- Task 5: 时间露珠 hook 在 completeWord 中，incrementTimeDewCounter + checkTimeDew 分离设计
- Task 6: 资源潮汐不走统一 relicBonus 块，而是在 applyResource 中与 relicBonus 合并为 totalBonus 后一起乘算。incrementWordParity 在 completeWord 中调用
- Task 7: 万物熔炉在 battle.ts showGoldReward 和 shop.ts openShop 两处同步实现。baseGold=0 覆盖默认 100，relicGold=furnaceResult.bonusGold
- Task 8: initResourceRelicBehaviors 注册于 battle.ts initInput；resetResourceRelicBattleState 注册于 battle.ts startLevel
- Task 9: 31 个测试用例覆盖所有 AC + 边界 + 交互场景，全部通过；437 个遗物相关测试 0 回归

### File List
- src/src/data/relics.ts — 添加 5 个 RelicData（score_magnet, resource_sense, time_dew, resource_tide, universal_furnace）+ RelicBehaviorType 新增 resource_tide
- src/src/systems/relics/ResourceRelicBehaviors.ts — NEW: 资源子系统行为模块（11 个导出函数 + 6 个常量）
- src/src/systems/battle.ts — import ResourceRelicBehaviors; completeWord: score_magnet + resource_sense + time_dew + incrementWordParity hooks; showGoldReward: universal_furnace; startLevel: resetResourceRelicBattleState; initInput: initResourceRelicBehaviors
- src/src/systems/skills.ts — import recordResourceProduction + getResourceTideBonus + resetWordResourceAmounts; applyResource: 资源感应追踪 + 资源潮汐加算; resetWordResourceTypes: 同步 resetWordResourceAmounts
- src/src/systems/shop.ts — import checkUniversalFurnace; openShop: 万物熔炉同步
- src/tests/unit/systems/relics/relics.resource.test.ts — NEW: 31 个资源遗物测试用例
- src/tests/unit/systems/relics/relics.test.ts — 遗物总数 40→45，各稀有度计数更新
- src/tests/unit/systems/relics/relics.slots.test.ts — zeroPriceRelics 添加 universal_furnace
- docs/implementation-artifacts/sprint-status.yaml — 36-8 状态: ready-for-dev → in-progress → review
