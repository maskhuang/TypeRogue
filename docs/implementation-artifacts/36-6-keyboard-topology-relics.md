# Story 36.6: 键盘拓扑系统遗物

Status: done

## Story

As a player,
I want 5 keyboard-topology relics that reward spatial awareness of my skill layout through adjacency bonuses, symmetry synergies, row specialization, hand alternation, and burst triggers on unhit keys,
so that keyboard positioning becomes a meaningful strategic dimension in my build planning.

## Acceptance Criteria

1. **AC1 — 邻键之力 (adjacent_power)**: 技能触发时查询 `ADJACENT_KEYS[triggerKey]`，每个有装备技能的相邻键加算 +6% 产出。多个相邻键加算叠加（如 3 个相邻 = +18%）。

2. **AC2 — 对称契约 (symmetry_pact)**: 技能触发时检查 `SYMMETRIC_PAIRS[triggerKey]`，若对称位有装备技能则加算 +15%。无对称位的键（a, z, x, c）不触发。

3. **AC3 — 行会勋章 (row_medal)**: 获取时弹出 3 选 1 UI（QWERTYUIOP / ASDFGHJKL / ZXCVBNM），选定行永久生效。选定行所有键位技能产出加算 +25%。选择持久化到 `relicStates['row_medal']`（值 0/1/2 对应行号）。

4. **AC4 — 双手协奏 (dual_concerto)**: 追踪上一次击键的手（`HAND_MAP[key]`），每次手切换时 `state.time += 0.5`。每词开始重置追踪。边界键归属：T/G/B→left，Y/H/N→right（遵循 `HAND_MAP`）。

5. **AC5 — 全键风暴 (key_storm)**: 每关前 3 个单词完成时，找出未被该词字母命中的已装备技能键，随机选最多 3 个，对每个调用 `triggerSkill(skillId, key)`。词中出现的字母对应的键视为"已命中"。若未命中技能不足 3 个则触发所有。

6. **AC6 — 行会勋章持久化测试**: 选择行后 `relicStates['row_medal']` 值正确；跨关卡不重置。

7. **AC7 — 双手协奏手判定测试**: 验证 T/Y/G/H/B/N 等边界键的左右手归属与 `HAND_MAP` 一致。

## Tasks / Subtasks

- [x] Task 1: 添加 5 个遗物数据定义 (AC: #1-#5)
  - [x]1.1 在 `data/relics.ts` 的 `RELICS` 中添加 5 个 RelicData 条目，含 `subsystem: 'topology'`
  - [x]1.2 为行为型遗物设置 `behaviorType`：row_select、hand_alternation、key_storm
  - [x]1.3 key_storm 设 `basePrice: 0`（传说级遗物惯例）
  - [x]1.4 更新 `relics.test.ts` 中遗物总数（30→35）和各稀有度计数断言
  - [x]1.5 更新 `relics.slots.test.ts` 中 zeroPriceRelics（key_storm basePrice=0）
  - [x]1.6 确认图标唯一性（与现有 30 个遗物不冲突）

- [x] Task 2: 创建 TopologyRelicBehaviors.ts 行为模块 (AC: #1-#5)
  - [x]2.1 创建 `systems/relics/TopologyRelicBehaviors.ts`
  - [x]2.2 导出 `getAdjacentPowerBonus(triggerKey)`: 查询 ADJACENT_KEYS + bindings → `adjacentCount * 0.06`，未持有返回 0
  - [x]2.3 导出 `getSymmetryPactBonus(triggerKey)`: 查询 SYMMETRIC_PAIRS + bindings → 0.15 或 0，未持有返回 0
  - [x]2.4 导出 `getRowMedalBonus(triggerKey)`: 查询 ROW_MAP + relicStates → 0.25 或 0
  - [x]2.5 导出 `setRowMedalRow(rowIndex)`: 设置 relicStates['row_medal']
  - [x]2.6 导出 `checkDualConcerto(currentKey)`: 检查手切换 → 返回 time bonus (0.5 或 0)
  - [x]2.7 导出 `resetDualConcertoHand()`: 重置上次手追踪（每词开始调用）
  - [x]2.8 导出 `checkKeyStorm(currentWord)`: 返回要触发的 `{skillId, key}[]`（最多 3 个）
  - [x]2.9 导出 `incrementStormWordCount()` / `getStormWordCount()`: 追踪本关已完成单词数
  - [x]2.10 导出 `resetTopologyRelicState()` / `initTopologyRelicBehaviors()`

- [x] Task 3: 实现邻键之力 (AC: #1)
  - [x]3.1 在 `skills.ts` 的 `triggerAffixSkillWithFeedback()` 中：调用 `getAdjacentPowerBonus(triggerKey)` 加入 relicBonus
  - [x]3.2 与现有 prismBonus + firstStrikeBonus + lessIsMoreBonus 加算合并
  - [x]3.3 使用 `ADJACENT_KEYS[triggerKey]` + `state.player.bindings` 计数

- [x] Task 4: 实现对称契约 (AC: #2)
  - [x]4.1 在 `skills.ts` 的 `triggerAffixSkillWithFeedback()` 中：调用 `getSymmetryPactBonus(triggerKey)` 加入 relicBonus
  - [x]4.2 使用 `SYMMETRIC_PAIRS[triggerKey]` + `state.player.bindings.has(symmetricKey)` 判定

- [x] Task 5: 实现行会勋章 (AC: #3, #6)
  - [x]5.1 在 `skills.ts` 的 `triggerAffixSkillWithFeedback()` 中：调用 `getRowMedalBonus(triggerKey)` 加入 relicBonus
  - [x]5.2 注册 `row_select` 行为
  - [x]5.3 在 `shop.ts` 遗物购买后：if relicId === 'row_medal' → 渲染 3 选 1 行选择 modal
  - [x]5.4 在 `relicPicker.ts` 遗物获取后：同样触发行选择 modal
  - [x]5.5 Modal onclick 调用 `setRowMedalRow(rowIndex)` 设置 `relicStates['row_medal']`
  - [x]5.6 `getRowMedalBonus`: 对比 `ROW_MAP[triggerKey]` 与 `relicStates['row_medal']`

- [x] Task 6: 实现双手协奏 (AC: #4, #7)
  - [x]6.1 模块级变量 `_lastKeyHand: 'left' | 'right' | null = null`
  - [x]6.2 `checkDualConcerto(key)`: 获取 `HAND_MAP[key]`，与 `_lastKeyHand` 比较，不同 → 0.5，同/null → 0；更新 `_lastKeyHand`
  - [x]6.3 在 `battle.ts` 的正确击键处理中（processKey 成功路径）调用 `checkDualConcerto(key)` 并 `state.time += bonus`
  - [x]6.4 在词开始时调用 `resetDualConcertoHand()`
  - [x]6.5 注册 `hand_alternation` 行为

- [x] Task 7: 实现全键风暴 (AC: #5)
  - [x]7.1 模块级变量 `_stormWordCount = 0`
  - [x]7.2 `checkKeyStorm(currentWord)`: 若未持有或 `_stormWordCount > 3` → 返回空数组；否则取 `Set(word)` 得已命中字母，从 bindings 中过滤未命中技能键，随机选最多 3 个返回 `{skillId, key}[]`
  - [x]7.3 `incrementStormWordCount()`: `_stormWordCount++`
  - [x]7.4 在 `battle.ts` 的 `completeWord()` 中（词结算后）：`incrementStormWordCount()` + 对 `checkKeyStorm()` 返回的每个结果调用 `triggerSkill(skillId, key)`
  - [x]7.5 注册 `key_storm` 行为
  - [x]7.6 在 `resetTopologyRelicState()` 中重置 `_stormWordCount`

- [x] Task 8: 注册模块初始化 (AC: #1-#5)
  - [x]8.1 `initTopologyRelicBehaviors()` 注册 row_select + hand_alternation + key_storm
  - [x]8.2 `battle.ts` 的 `initInput()` 中调用 `initTopologyRelicBehaviors()`
  - [x]8.3 `battle.ts` 的 `startLevel()` 中调用 `resetTopologyRelicState()`
  - [x]8.4 `battle.ts` 的 `setWord()` 或词开始处调用 `resetDualConcertoHand()`

- [x] Task 9: 单元测试 (AC: #1-#7)
  - [x]9.1 创建 `relics.topology.test.ts`
  - [x]9.2 邻键之力：0/1/2/3 个相邻技能的加成（0/6%/12%/18%），未持有→0
  - [x]9.3 对称契约：对称位有技能→0.15，无→0，无对称位键（a,z,x,c）→0，未持有→0
  - [x]9.4 行会勋章：选行0→QWER行+25%，选行1→ASDF行+25%，选行2→ZXCV行+25%，未选→0，未持有→0
  - [x]9.5 双手协奏：同手→0，切换→0.5，null→0（首次），连续交替→多次0.5，边界键判定（T/Y/G/H/B/N）
  - [x]9.6 全键风暴：word="hello" 未命中技能数≥3→返回3个，<3→返回全部，第4词不触发，未持有→空
  - [x]9.7 交互：adjacent_power + symmetry_pact 同时触发 → 加算合并
  - [x]9.8 交互：row_medal + adjacent_power → 加算合并

## Dev Notes

### 当前系统状态（CRITICAL）

**已完成的基础设施（Story 36.1 — 36.5）：**
- `RelicBehaviorType` 已包含 `'row_select'`、`'hand_alternation'`、`'key_storm'`（relics.ts:116-118）
- `RelicSubsystem` 已包含 `'topology'`（relics.ts:89）
- `RELIC_MODIFIER_DEFS` 当前为空 `{}`（所有遗物走纯函数路线）
- `registerRelicBehavior()` / `dispatchRelicBehavior()` 行为分发框架就绪
- 30 个遗物已实现（10 职业 + 5 打字 + 5 连击 + 5 技能 + 5 附魔）
- `relicStates: Record<string, number>` 可追踪运行时状态（行会勋章需要）
- `getRelicState()` / `setRelicState()` 辅助函数就绪

**键盘拓扑核心模块（CRITICAL — 直接复用，不要重新实现）：**
```
data/keyboardTopology.ts — 6 种位置关系查询
  ├── HAND_MAP: Record<string, 'left' | 'right'>  ← dual_concerto 使用
  │   T/G/B → 'left'; Y/H/N → 'right'（中间键已有明确归属）
  ├── ROW_MAP: Record<string, number>              ← row_medal 使用 (0=QWER, 1=ASDF, 2=ZXCV)
  ├── SYMMETRIC_PAIRS: Record<string, string>      ← symmetry_pact 使用
  │   11 对：q↔p, w↔o, e↔i, r↔u, t↔y, s↔l, d↔k, f↔j, g↔h, v↔m, b↔n
  │   无对称位：a, z, x, c（对应位为非字母键）
  ├── isAdjacent(), isSameRow(), isSymmetric()
  ├── hasRelation(), getRelations()
  └── getKeysWithRelation()

core/constants.ts — 键盘布局常量
  ├── KEYBOARD_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']
  ├── KEYS = 26 个小写字母
  └── ADJACENT_KEYS: Record<string, string[]>      ← adjacent_power 使用
```

**技能触发流程（遗物加成注入点）：**
```
triggerAffixSkillWithFeedback() (skills.ts:151)
  ├── synergy.wordSkillCount++ (line 154)
  ├── relicBonus 加算合并 (line 175-181):
  │   prismBonus + firstStrikeBonus + lessIsMoreBonus
  │   ← adjacent_power + symmetry_pact + row_medal 在此加入
  ├── orchestrateAffixTrigger(skillId, triggerKey, ctx, {
  │     applyResource: (resource, amount) => {
  │       if (relicBonus > 0 && amount > 0) amount *= (1 + relicBonus);
  │     }
  │   })
  └── 浮字反馈循环（同步缩放 relicBonus）
```

**正确击键流程（双手协奏注入点）：**
```
battle.ts processKey 成功路径 (~line 340):
  ├── combo++ (bumpCombo)
  ├── bumpMultiplier()
  ├── HAND_MAP[k] → leftHandTriggered / rightHandTriggered  ← 已有左右手追踪
  ├── triggerSkill(skillId, k)                               ← 触发技能
  └── ← dual_concerto: checkDualConcerto(k) 在此处调用
```

**词完成流程（全键风暴注入点）：**
```
completeWord() (battle.ts:513)
  ├── baseChips 计算
  ├── resolveRelicEffectsWithBehaviors('on_word_complete', ...)
  ├── jazzBonus (checkJazzBonus)
  ├── rhythmAdapt
  ├── finalWordScore 计算 + settlement
  ├── glassCanon 翻倍
  └── ← key_storm: incrementStormWordCount() + checkKeyStorm() + triggerSkill()
```

**词开始流程（双手协奏重置点）：**
```
setWord() (battle.ts ~line 197):
  ├── resetWordResourceTypes()
  ├── leftHandTriggered = false
  ├── rightHandTriggered = false
  └── ← resetDualConcertoHand() 在此处调用
```

### 关键设计决策

**1. adjacent_power + symmetry_pact + row_medal 的加算合并：**
三者都是技能触发时的百分比加成，与现有 prismBonus / firstStrikeBonus / lessIsMoreBonus 完全同模式。统一加入 `relicBonus` 加算：
```typescript
// skills.ts triggerAffixSkillWithFeedback 中
let relicBonus = 0;
relicBonus += getMultiplierPrismBonus();      // 0.2 if multiplier >= 2.5
relicBonus += getFirstStrikeBonus();           // 0.2 if first skill
relicBonus += getLessIsMoreBonus();             // 0.2 if skills < 10
relicBonus += getAdjacentPowerBonus(triggerKey); // 0.06 × adjacentCount
relicBonus += getSymmetryPactBonus(triggerKey);  // 0.15 if symmetric equipped
relicBonus += getRowMedalBonus(triggerKey);       // 0.25 if selected row
// amount *= (1 + relicBonus)
```
极端场景：全部触发 = 0.2+0.2+0.2+0.18(3邻)+0.15+0.25 = 1.18 → 产出 ×2.18。合理。

**2. adjacent_power 的邻键计算：**
使用 `ADJACENT_KEYS[triggerKey]`（core/constants.ts）直接获取邻键数组，遍历检查 `state.player.bindings.has(adjKey)` 计数。注意 `bindings` 的键为小写字母。

**3. symmetry_pact 无对称位键的处理：**
`SYMMETRIC_PAIRS` 中 a/z/x/c 无条目 → `SYMMETRIC_PAIRS[key]` 为 `undefined` → 直接返回 0。不需要特殊处理。

**4. row_medal 的行选择 UI：**
- shop.ts 购买遗物后：检查 `relicId === 'row_medal'` → 渲染行选择 modal
- relicPicker.ts 获取遗物后：同样触发
- Modal 结构：3 个按钮，显示行名称和键位，onclick 调用 `setRowMedalRow(rowIndex)`
- 存储：`state.player.relicStates['row_medal'] = rowIndex`（0/1/2）
- 参考：`renderAffixEnchantmentModal` 的 modal 渲染模式

**5. row_medal 的值检查：**
`getRowMedalBonus(triggerKey)` 需要：
1. `state.player.relics.has('row_medal')` → 否则返回 0
2. `state.player.relicStates['row_medal']` → 获取选择的行号
3. `ROW_MAP[triggerKey]` → 获取触发键的行号
4. 两者相等 → 0.25，否则 0
5. 注意：relicStates 值为 `number | undefined`。未选择时（undefined）→ 返回 0

**6. dual_concerto 的手切换追踪：**
- 模块级变量 `_lastKeyHand: 'left' | 'right' | null`
- 每次正确击键时调用 `checkDualConcerto(key)`
- 返回 0.5（切换）或 0（同手/首次）
- 每词开始 `resetDualConcertoHand()` 设为 null
- **关键**：`HAND_MAP` 已有所有 26 键的明确归属，无需特殊处理边界键

**7. dual_concerto 在 battle.ts 中的位置：**
在 `processKey` 成功路径中（~line 340-350），已有左右手追踪代码：
```typescript
const hand = HAND_MAP[k];
if (hand === 'left') leftHandTriggered = true;
else if (hand === 'right') rightHandTriggered = true;
```
在此处之后添加 `checkDualConcerto(k)` 调用即可。

**8. key_storm 的触发时机：**
在 `completeWord()` 的结算之后（分数、玻璃大炮等处理完毕后）：
1. `incrementStormWordCount()`
2. 如果 `getStormWordCount() <= 3` 且持有遗物：
3. `const stormTargets = checkKeyStorm(state.player.word)`
4. 对每个 target 调用 `triggerSkill(target.skillId, target.key)`
5. 显示反馈浮字

**9. key_storm 的随机选择：**
```typescript
const wordLetters = new Set(currentWord.toLowerCase().split(''));
const unhitSkills: {skillId: string, key: string}[] = [];
for (const [key, skillId] of state.player.bindings) {
  if (!wordLetters.has(key)) unhitSkills.push({skillId, key});
}
// shuffle + take 3 (使用 battle.ts 的 random() 或传入 randomFn)
```
注意：需要传入或使用一致的 RNG。建议 `checkKeyStorm` 接受 `randomFn` 参数。

**10. key_storm 触发的技能效果：**
调用 `triggerSkill(skillId, key)` 会走完整的技能触发流程（包括遗物加成、附魔触发等）。这些技能产出的资源会直接添加到 state，不参与当前词的结算（词结算已完成）。

### 遗物数据规格

| ID | 名称 | 图标 | 稀有度 | basePrice | subsystem | behaviorType | category |
|---|---|---|---|---|---|---|---|
| `adjacent_power` | 邻键之力 | 🤝 | common | 50 | topology | — | — |
| `symmetry_pact` | 对称契约 | 🪞 | common | 50 | topology | — | — |
| `row_medal` | 行会勋章 | 🎖️ | rare | 80 | topology | row_select | — |
| `dual_concerto` | 双手协奏 | 🎹 | epic | 120 | topology | hand_alternation | — |
| `key_storm` | 全键风暴 | ⛈️ | legendary | 0 | topology | key_storm | — |

注：
- adjacent_power、symmetry_pact 不需 behaviorType（逻辑简单，纯函数直接调用）
- key_storm 的 basePrice=0 遵循传说级遗物惯例
- 图标唯一性检查：🤝🪞🎖️🎹⛈️ 均未被现有 30 个遗物使用
- 现有遗物图标集：📓🧫⚛️🔒🌱💪📙♾️✂️🧩🕯️🧤🤖🎵💥🛡️🔷⏱️💣🔗👘🏅🔱🌅⚓⚡💎📖🎷👑

### 依赖方向（CRITICAL）

```
data/keyboardTopology.ts (拓扑查询 — 直接复用)
  ↓ 被引用
systems/relics/TopologyRelicBehaviors.ts (NEW — 拓扑子系统行为)
  ├── import { ADJACENT_KEYS } from core/constants
  ├── import { HAND_MAP, ROW_MAP, SYMMETRIC_PAIRS } from data/keyboardTopology
  ├── import { state } from core/state
  └── import { registerRelicBehavior } from systems/relics/RelicPipeline
  ↓ 被调用
systems/skills.ts (relicBonus — adjacent_power, symmetry_pact, row_medal)
systems/battle.ts (processKey — dual_concerto; completeWord — key_storm)
systems/shop.ts (buy — row_medal UI)
systems/relicPicker.ts (acquire — row_medal UI)
```

- `TopologyRelicBehaviors.ts` 可引用 `data/` 和 `core/` 中的模块
- 不能直接引用 `battle.ts`、`skills.ts` 或 `shop.ts`
- 行为函数通过参数接收数据或查询 `state`

### 从 Story 36.2 — 36.5 继承的关键经验

1. **纯函数模式**: 行为函数导出为纯函数，由调用方在合适位置调用。行为注册仅用于框架完整性（no-op body）。
2. **加算合并**: 多个 "+X%" 遗物在 `applyResource` 中加算合并（不逐个乘算）。
3. **relicStates 类型**: 只能存 `number` 值。row_medal 用 0/1/2 表示行号。
4. **import type**: 纯类型导入必须用 `import type`。
5. **clearBehaviorHandlers()**: 测试 `beforeEach` 中调用。
6. **Icon 唯一性**: 5 个遗物需要 5 个不同 emoji，已在数据规格中验证。
7. **遗物总数断言**: `relics.test.ts` 中总数（30→35）、各稀有度计数需更新（common 10→12, rare 6→7, epic 6→7, legendary 8→9）。
8. **zeroPriceRelics**: key_storm basePrice=0 → `relics.slots.test.ts` 中添加。
9. **RELIC_MODIFIER_DEFS**: 保持为空 `{}`（不使用 pipeline）。
10. **反馈浮字同步**: `applyResource` 中缩放的 amount 需在反馈循环中同步缩放。
11. **模块级状态**: dual_concerto 和 key_storm 需要模块级变量（参考 TypingRelicBehaviors 的 `_seenWords`、`_waxSealUsed` 模式）。

### 性能约束

- adjacent_power: `ADJACENT_KEYS` 查询 + bindings 遍历（最多 8 邻键），<0.1ms
- symmetry_pact: 单次 `SYMMETRIC_PAIRS` 查询 + bindings.has，<0.05ms
- row_medal: `ROW_MAP` 查询 + relicStates 读取 + 比较，<0.05ms
- dual_concerto: `HAND_MAP` 查询 + 比较 + 赋值，<0.05ms
- key_storm: 遍历 bindings（最多 26 键）+ 随机选择 3 个，<0.5ms（仅每词完成时触发，前 3 词）

### Project Structure Notes

**需修改的文件：**
- `src/src/data/relics.ts` — 添加 5 个 RelicData
- `src/src/systems/skills.ts` — relicBonus 加入 adjacent_power + symmetry_pact + row_medal
- `src/src/systems/battle.ts` — processKey: dual_concerto; completeWord: key_storm; setWord: resetDualConcertoHand; initInput + startLevel: 模块注册
- `src/src/systems/shop.ts` — 购买 row_medal 后行选择 modal
- `src/src/systems/relicPicker.ts` — 获取 row_medal 后行选择 modal（检查是否需要）
- `src/tests/unit/systems/relics/relics.test.ts` — 遗物总数和稀有度断言更新
- `src/tests/unit/systems/relics/relics.slots.test.ts` — key_storm 加入 zeroPriceRelics

**需新建的文件：**
- `src/src/systems/relics/TopologyRelicBehaviors.ts` — 拓扑子系统行为模块
- `src/tests/unit/systems/relics/relics.topology.test.ts` — 拓扑遗物测试

### References

- [Source: docs/design/relic-system.md#键盘拓扑系统] — 5 个遗物完整设计规格

## Dev Agent Record

### Implementation Summary
All 9 tasks completed. 5 keyboard topology relics implemented with full behavior module, integration into skills.ts (additive bonus stacking), battle.ts (dual_concerto hand tracking + key_storm burst), shop.ts + relicPicker.ts (row_medal selection UI), and 38 unit tests.

### Files Modified
- `src/src/data/relics.ts` — Added 5 RelicData entries (adjacent_power, symmetry_pact, row_medal, dual_concerto, key_storm)
- `src/src/systems/skills.ts` — Added 3 topology bonuses to relicBonus calculation + imports
- `src/src/systems/battle.ts` — dual_concerto in processKey, key_storm in completeWord, resetDualConcertoHand in setWord, initTopologyRelicBehaviors in initInput, resetTopologyRelicState in startLevel
- `src/src/systems/shop.ts` — row_medal selection hook in buy + replace paths
- `src/src/systems/relicPicker.ts` — row_medal selection hook + showRowMedalSelection UI function
- `src/tests/unit/systems/relics/relics.test.ts` — Updated counts (30→35, common 10→12, rare 6→7, epic 6→7, legendary 8→9)
- `src/tests/unit/systems/relics/relics.slots.test.ts` — Added key_storm to zeroPriceRelics
- `docs/implementation-artifacts/sprint-status.yaml` — 36-6 status: backlog → done

### Files Created
- `src/src/systems/relics/TopologyRelicBehaviors.ts` — Behavior module with pure logic functions + constants
- `src/tests/unit/systems/relics/relics.topology.test.ts` — 40 unit tests covering all 5 relics + interactions + boundary keys

### Test Results
- 284 relic tests pass (11 files)
- 40 new topology tests pass
- Pre-existing failures in affixTrigger.test.ts, affixes.test.ts, KeyTooltip.test.ts (unrelated to this story)

### Senior Developer Review (AI) — 2026-03-13

**Issues Found:** 2 High, 4 Medium, 2 Low — All fixed.

Fixes applied:
1. [HIGH] AC7 边界键测试补充 — 添加 T/G/B→left, Y/H/N→right 测试用例
2. [HIGH] AC2 无对称位键测试补充 — 添加 a/z/x/c → 0 测试用例
3. [MEDIUM] showRowMedalSelection 从 TopologyRelicBehaviors 移至 relicPicker.ts — 保持行为模块纯逻辑
4. [MEDIUM] row_medal 弹窗添加"稍后选择"取消按钮
5. [MEDIUM] dual_concerto 反馈 "s" → "秒"
6. [MEDIUM] sprint-status.yaml 补充记录到 File List
7. [LOW] 修复测试中误导性注释
8. [LOW] 合并重复的 Dev Agent Record 节
