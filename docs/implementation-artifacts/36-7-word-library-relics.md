# Story 36.7: 单词/词库系统遗物

Status: done

## Story

As a player,
I want 5 word/dictionary system relics that reward first-time word completions, incentivize short/long word strategies, enable free shop refreshes through word selling, and tease future punctuation mechanics,
so that my word deck composition becomes a meaningful strategic lever beyond just providing typing targets.

## Acceptance Criteria

1. **AC1 — 词汇收藏 (word_collection)**: 维护本 Run 已完成单词 Set（跨关保持，Run 重置）；首次完成的单词 `state.gold += 3`，重复完成不再奖励。

2. **AC2 — 短词冲刺 (short_sprint)**: 当前单词长度 ≤4 时，该词所有技能产出加算 +20%（通过 `relicBonus` 合并）。

3. **AC3 — 长词达人 (long_word_master)**: 当前单词长度 ≥6 且成功完成时，`state.time += 1`。

4. **AC4 — 词语经销商 (word_dealer)**: 出售词语后设置 `relicStates['word_dealer'] = 1`；下次商店刷新时检测此 flag，若为 1 则刷新不扣金币并清除 flag。

5. **AC5 — 标点解放 (punctuation_liberation)**: 完整实现。解锁 `;,./ ` 四个标点键位（可绑定技能），词语中随机混入标点。复用 Boss 乱码系统（遗物优先），扩展键盘拓扑（30 键）、商店 UI、战斗集成。

6. **AC6 — 词汇收藏跨关持久化**: 词汇收藏的 Set 在 Run 内跨关保持（battle 1 收集的词在 battle 2 不再触发金币），Run 开始时清空。有测试验证跨关行为。

## Tasks / Subtasks

- [x] Task 1: 添加 5 个遗物数据定义 (AC: #1-#5)
  - [x] 1.1 在 `data/relics.ts` 的 `RELICS` 中添加 5 个 RelicData 条目，含 `subsystem: 'word'`
  - [x] 1.2 为行为型遗物设置 `behaviorType`：word_dealer
  - [x] 1.3 punctuation_liberation 设 `basePrice: 0`，description 注明 `（即将推出）`
  - [x] 1.4 更新 `relics.test.ts` 中遗物总数（35→40）和各稀有度计数断言
  - [x] 1.5 更新 `relics.slots.test.ts` 中 zeroPriceRelics（punctuation_liberation basePrice=0）
  - [x] 1.6 确认图标唯一性（与现有 35 个遗物不冲突）

- [x] Task 2: 创建 WordRelicBehaviors.ts 行为模块 (AC: #1-#4)
  - [x] 2.1 创建 `systems/relics/WordRelicBehaviors.ts`
  - [x] 2.2 导出常量：`WORD_COLLECTION_GOLD = 3`、`SHORT_SPRINT_RATE = 0.20`、`LONG_WORD_TIME_BONUS = 1`
  - [x] 2.3 模块级 `_collectedWords: Set<string>`（Run 级别，跨关保持）
  - [x] 2.4 导出 `checkWordCollection(word: string): number` — 有遗物 + 首次 → WORD_COLLECTION_GOLD，否则 0；同时 add 到 Set
  - [x] 2.5 导出 `getShortSprintBonus(wordLength: number): number` — 有遗物 + ≤4 → SHORT_SPRINT_RATE，否则 0
  - [x] 2.6 导出 `checkLongWordMaster(wordLength: number): number` — 有遗物 + ≥6 → LONG_WORD_TIME_BONUS，否则 0
  - [x] 2.7 导出 `setWordDealerFlag(): void` — `state.player.relicStates['word_dealer'] = 1`
  - [x] 2.8 导出 `consumeWordDealerFreeRefresh(): boolean` — 有遗物 + flag=1 → 清 flag 并返回 true
  - [x] 2.9 导出 `getCollectedWords(): ReadonlySet<string>` — 测试用
  - [x] 2.10 导出 `resetWordRelicRunState(): void` — 清空 _collectedWords（Run 开始时调用）
  - [x] 2.11 导出 `initWordRelicBehaviors(): void` — 注册 word_dealer 行为（no-op body）

- [x] Task 3: 实现词汇收藏 (AC: #1, #6)
  - [x] 3.1 在 `battle.ts` 的 `completeWord()` 中调用 `checkWordCollection(state.player.word)`
  - [x] 3.2 返回值 > 0 时 `state.gold += returnValue`，显示 feedback "📚 +3💰"
  - [x] 3.3 确保 hook 在 `word:complete` 事件之后、`setWord()` 之前
  - [x] 3.4 在 Run 开始处（`main.ts` 或 `startRun`）调用 `resetWordRelicRunState()`

- [x] Task 4: 实现短词冲刺 (AC: #2)
  - [x] 4.1 在 `skills.ts` 的 `triggerAffixSkillWithFeedback()` 中 relicBonus 块添加 `getShortSprintBonus(state.player.word.length)`
  - [x] 4.2 遵循现有加算模式：`if (shortSprintBonus > 0) relicBonus += shortSprintBonus`

- [x] Task 5: 实现长词达人 (AC: #3)
  - [x] 5.1 在 `battle.ts` 的 `completeWord()` 中调用 `checkLongWordMaster(state.player.word.length)`
  - [x] 5.2 返回值 > 0 时 `state.time += returnValue`，显示 feedback "📏 +1秒"
  - [x] 5.3 hook 位置与词汇收藏相邻（completeWord 末尾，词完成后）

- [x] Task 6: 实现词语经销商 (AC: #4)
  - [x] 6.1 在 `shop.ts` 的 `sellWord()` 中：有 word_dealer 遗物 → `setWordDealerFlag()`，显示 feedback "🤑 下次刷新免费"
  - [x] 6.2 在 `shop.ts` 的 `removeWord()` 中：同上（两条卖词路径都需要）
  - [x] 6.3 在 `shop.ts` 的 `refreshShop()` 中：调用 `consumeWordDealerFreeRefresh()` → 若 true 则 cost=0
  - [x] 6.4 免费刷新时显示 feedback "🤑 免费刷新！"

- [x] Task 7: 注册模块初始化 (AC: #1-#4)
  - [x] 7.1 `initWordRelicBehaviors()` 注册 word_dealer 行为
  - [x] 7.2 `battle.ts` 的 `initInput()` 中调用 `initWordRelicBehaviors()`
  - [x] 7.3 Run 开始入口调用 `resetWordRelicRunState()`（确认 main.ts 中 startRun 流程位置）

- [x] Task 8: 单元测试 (AC: #1-#6)
  - [x] 8.1 创建 `relics.word.test.ts`
  - [x] 8.2 词汇收藏：无遗物→0、首次→3、重复→0、大小写不敏感
  - [x] 8.3 词汇收藏跨关持久化：收集后不 resetWordRelicState 仍保持；resetWordRelicRunState 后清空
  - [x] 8.4 短词冲刺：无遗物→0、≤4 字母→0.20、5+ 字母→0
  - [x] 8.5 长词达人：无遗物→0、≥6 字母→1、<6 字母→0
  - [x] 8.6 词语经销商：setFlag→consumeRefresh=true→consumeRefresh=false（二次消费无效）
  - [x] 8.7 词语经销商：无遗物时 consumeRefresh→false
  - [x] 8.8 交互：短词冲刺 + 邻键之力可叠加
  - [x] 8.9 initWordRelicBehaviors 注册 word_dealer 行为

## Dev Notes

### 当前系统状态（CRITICAL）

**已完成的基础设施（Story 36.1 — 36.6）：**
- `RelicBehaviorType` 已包含 `'word_dealer'`（relics.ts:120）
- `RelicSubsystem` 已包含 `'word'`（relics.ts:90）
- `RELIC_MODIFIER_DEFS` 当前为空 `{}`（所有遗物走纯函数路线）
- `registerRelicBehavior()` / `dispatchRelicBehavior()` 行为分发框架就绪
- 35 个遗物已实现（10 职业 + 5 打字 + 5 连击 + 5 技能 + 5 附魔 + 5 拓扑）

**单词完成核心流程（battle.ts `completeWord()` ~L524-687）：**
```
completeWord()
  ├── baseChips 计算
  ├── resolveRelicEffectsWithBehaviors('on_word_complete', {...})
  ├── bonusMult 叠加（遗物乘数、爵士乐、节奏适应）
  ├── finalWordScore 计算
  ├── state.score += finalWordScore
  ├── battleStats 更新
  ├── eventBus.emit('word:complete', { word, score, perfect })
  ├── ← 词汇收藏 hook 位置（word_collection: gold 奖励）
  ├── ← 长词达人 hook 位置（long_word_master: time 奖励）
  ├── 胜利检查 → showGoldReward → endLevel
  └── setTimeout → setWord()
```

**技能产出加算（skills.ts `triggerAffixSkillWithFeedback()` ~L176-203）：**
```
let relicBonus = 0;
relicBonus += getMultiplierPrismBonus();     // 倍率棱镜
relicBonus += getFirstStrikeBonus();         // 首发强化
relicBonus += getLessIsMoreBonus();           // 少而精
relicBonus += getAdjacentPowerBonus(key);    // 邻键之力
relicBonus += getSymmetryPactBonus(key);     // 对称契约
relicBonus += getRowMedalBonus(key);         // 行会勋章
← relicBonus += getShortSprintBonus(state.player.word.length);  // 短词冲刺
// amount = amount * (1 + relicBonus)
```

**卖词流程（shop.ts 两条路径）：**
```
sellWord(index)     — 显式出售（L1343-1353），state.gold += 3
removeWord(index)   — 拖拽出售（L1938-1952），state.gold += 3, MIN_WORD_COUNT=3 检查
  ← word_dealer hook: 卖词后 setWordDealerFlag()
```

**刷新流程（shop.ts `refreshShop()` ~L1293-1310）：**
```
refreshShop()
  ├── cost = (refreshCount + 1) * 5           // 5, 10, 15, ...
  ├── ← word_dealer hook: consumeWordDealerFreeRefresh() → cost=0
  ├── state.gold -= cost
  ├── state.shop.refreshCount++
  ├── 保留锁定 + 生成新商品
  └── renderUnifiedShop()
```

**已有的 seenWords 机制（TypingRelicBehaviors.ts）：**
- `seenWords: Set<string>` — 战斗级别（每关重置），用于小助手 Tab 补全
- `trackWord()` / `isRepeatWord()` — 在 `setWord()` 中调用
- ⚠️ 不可复用：词汇收藏需要 Run 级别 Set（跨关保持），与 seenWords 的战斗级别不同

### 关键设计决策

**1. 词汇收藏的 Set 生命周期：**
- **Run 级别**：跨关保持，Run 开始时清空
- 实现方式：模块级 `_collectedWords: Set<string>` 在 `WordRelicBehaviors.ts`
- 复位点：`resetWordRelicRunState()` 在 `main.ts` 的 startRun 流程中调用
- ⚠️ 不在 `startLevel()` 中重置（那是每关重置的 resetWordRelicState）
- 单词存储大写形式（与 `state.player.word` 一致），避免大小写问题

**2. 词汇收藏金币奖励位置：**
- 在 `completeWord()` 中 `eventBus.emit('word:complete')` 之后
- 直接 `state.gold += 3`（不经过 resources.gold，因为这是即时金币奖励，不参与战后结算）
- feedback 颜色用 `#ffe66d`（与遗物获取一致的金色）

**3. 短词冲刺与 relicBonus 模式：**
- 遵循现有的 `getXxxBonus()` 纯函数模式
- 直接在 skills.ts 的 relicBonus 块中添加调用
- 参数传 `state.player.word.length`（技能触发时 word 仍是当前词）

**4. 长词达人时间奖励位置：**
- 在 `completeWord()` 中，与词汇收藏相邻
- `state.time += 1`（直接加时间，不经过 resources.time）
- 与双手协奏（topology）的 `state.time += 0.5` 模式一致

**5. 词语经销商 flag 存储：**
- `state.player.relicStates['word_dealer']`：0 或 undefined = 无免费刷新，1 = 有
- sellWord/removeWord 中：有 word_dealer 遗物 → setWordDealerFlag()
- refreshShop 中：consumeWordDealerFreeRefresh() → true 则 cost=0 并清 flag
- flag 在整个 shop 期间有效（卖词后任何时间可以免费刷新一次）
- 下一关商店不保留（因为 relicStates 跨关保持，所以 flag 实际上会跨关 — 这是合理的）

**6. 标点解放 TODO-LATER 处理：**
- 仅添加 RelicData 数据定义
- description 写 "解锁键盘标点键位。（即将推出）"
- 不注册 behaviorType（或注册空 no-op）
- basePrice: 0（传说级）
- ⚠️ 不要从遗物池中排除 — 玩家可以获得它，但获得后无实际效果

**7. 行为文件组织：**
参照 `TypingRelicBehaviors.ts`、`ComboRelicBehaviors.ts`、`TopologyRelicBehaviors.ts` 模式。

### 遗物数据规格

| ID | 名称 | 图标 | 稀有度 | basePrice | subsystem | behaviorType | category |
|---|---|---|---|---|---|---|---|
| `word_collection` | 词汇收藏 | 📚 | common | 50 | word | — | — |
| `short_sprint` | 短词冲刺 | 🏃 | common | 50 | word | — | — |
| `long_word_master` | 长词达人 | 📏 | rare | 80 | word | — | — |
| `word_dealer` | 词语经销商 | 🤑 | epic | 120 | word | word_dealer | — |
| `punctuation_liberation` | 标点解放 | ❗ | legendary | 0 | word | — | — |

注：
- word_collection、short_sprint、long_word_master 不需 behaviorType（逻辑简单，纯函数直接调用）
- word_dealer 的 behaviorType 已在 relics.ts 的 `RelicBehaviorType` 中声明
- punctuation_liberation 为 TODO-LATER，无实际 behaviorType
- 图标唯一性：📚🏃📏🤑❗ 均未被现有 35 个遗物使用

### 依赖方向

```
data/relics.ts (遗物数据定义)
  ↓ 被引用
systems/relics/RelicPipeline.ts (管道 + 行为分发)
  ↑ 注册行为
systems/relics/WordRelicBehaviors.ts (NEW — 单词子系统行为)
  ↓ 被调用
systems/battle.ts (completeWord — word_collection, long_word_master)
systems/skills.ts (triggerAffixSkillWithFeedback — short_sprint)
systems/shop.ts (sellWord/removeWord — word_dealer flag; refreshShop — free refresh)
```

### 从 Story 36.2 — 36.6 继承的关键经验

1. **纯函数模式**: 行为函数导出为纯函数，由调用方在合适位置调用。行为注册仅用于框架完整性（no-op body）。
2. **加算合并**: 多个百分比修饰器加算叠加（short_sprint +20% 与其他遗物加算）。
3. **relicStates 类型**: 只能存 number 值（word_dealer flag 用 0/1）。
4. **import type**: 纯类型导入必须用 `import type`。
5. **clearBehaviorHandlers()**: 测试 beforeEach 中调用。
6. **Icon 唯一性**: 5 个遗物需要 5 个不同 emoji，已在数据规格中验证。
7. **遗物总数断言**: `relics.test.ts` 中总数（35→40）、各稀有度计数需更新。
8. **zeroPriceRelics**: punctuation_liberation basePrice=0 → `relics.slots.test.ts` 中添加。
9. **RELIC_MODIFIER_DEFS**: 保持为空 `{}`（不使用 pipeline）。
10. **feedback 文本用"秒"不用"s"**: Story 36.6 code review 修复的教训。

### 性能约束

- word_collection: Set.has() + Set.add() = O(1)，<0.1ms
- short_sprint: 简单长度比较，<0.1ms
- long_word_master: 简单长度比较，<0.1ms
- word_dealer: relicStates 读写，<0.1ms

### Project Structure Notes

**需修改的文件：**
- `src/src/data/relics.ts` — 添加 5 个 RelicData
- `src/src/systems/battle.ts` — completeWord: word_collection + long_word_master hooks; initInput: initWordRelicBehaviors
- `src/src/systems/skills.ts` — triggerAffixSkillWithFeedback: short_sprint relicBonus
- `src/src/systems/shop.ts` — sellWord/removeWord: word_dealer flag; refreshShop: free refresh 逻辑
- `src/src/main.ts`（或 startRun 入口）— resetWordRelicRunState 调用
- `src/tests/unit/systems/relics/relics.test.ts` — 遗物总数和稀有度断言更新
- `src/tests/unit/systems/relics/relics.slots.test.ts` — punctuation_liberation 加入 zeroPriceRelics

**需新建的文件：**
- `src/src/systems/relics/WordRelicBehaviors.ts` — 单词子系统行为模块
- `src/tests/unit/systems/relics/relics.word.test.ts` — 单词遗物测试

### References

- [Source: docs/design/relic-system.md#单词/词库系统] — 5 个遗物完整设计规格
- [Source: docs/stories/epic-36-relic-system-expansion.md#Story 36.7] — 验收标准 AC1-AC6
- [Source: docs/implementation-artifacts/36-6-keyboard-topology-relics.md] — 前序 Story 开发记录与经验
- [Source: src/src/systems/battle.ts#completeWord] — 单词完成流程
- [Source: src/src/systems/skills.ts#triggerAffixSkillWithFeedback] — relicBonus 加算模式
- [Source: src/src/systems/shop.ts#sellWord] — 卖词流程（L1343-1353）
- [Source: src/src/systems/shop.ts#removeWord] — 拖拽卖词流程（L1938-1952）
- [Source: src/src/systems/shop.ts#refreshShop] — 刷新机制（L1293-1310）
- [Source: src/src/systems/relics/TypingRelicBehaviors.ts] — seenWords 模式参考（战斗级别 vs Run 级别）
- [Source: src/src/data/relics.ts] — 当前遗物数据定义和类型

## Dev Agent Record

### Agent Model Used
claude-opus-4-6

### Debug Log References
无

### Completion Notes List
- Task 1: 5 个遗物数据添加到 RELICS（35→40），图标唯一性验证通过（📚🏃📏🤑❗），测试断言更新
- Task 2: WordRelicBehaviors.ts 创建，8 个导出函数 + 3 个常量（纯函数模式）
- Task 3: 词汇收藏 hook 在 completeWord() 中 eventBus.emit 之后、victory check 之前；Run 级别重置在 main.ts 两条路径
- Task 4: 短词冲刺通过 relicBonus 加算模式添加到 skills.ts（与 6 个现有遗物加算叠加）
- Task 5: 长词达人 hook 紧接词汇收藏之后，feedback 用"秒"
- Task 6: 词语经销商 hook 覆盖 sellWord + removeWord 两条卖词路径；refreshShop 中 consumeWordDealerFreeRefresh 先于金币扣除
- Task 7: initWordRelicBehaviors 注册于 battle.ts initInput；resetWordRelicRunState 注册于 main.ts 两条启动路径
- Task 8: 29 个测试用例覆盖所有 AC + 边界 + 交互场景，全部通过；306 个遗物测试 0 回归

### Code Review Fixes (Auto-applied)
- [M1] setWordDealerFlag() 增加遗物所有权检查，返回 boolean；shop.ts 调用点简化为 `if (setWordDealerFlag())`
- [M2] sellWord() 增加 MIN_WORD_COUNT 防护（与 removeWord 一致），防止卖空词库
- [L1] word_dealer 反馈改为 #88ddff 蓝色（区别于卖词金色反馈），移至卖词反馈之后
- [L3] refreshShop 免费刷新不递增 refreshCount（cost=0 时跳过），保持下次刷新价格不变
- [L2] 无 shop 集成测试 — 已记录，不在此修复

### File List
- src/src/data/relics.ts — 添加 5 个 RelicData（word_collection, short_sprint, long_word_master, word_dealer, punctuation_liberation）
- src/src/systems/relics/WordRelicBehaviors.ts — NEW: 单词子系统行为模块（8 个导出函数 + 3 个常量）；[Review] setWordDealerFlag 增加所有权检查
- src/src/systems/battle.ts — import WordRelicBehaviors; completeWord: word_collection + long_word_master hooks; initInput: initWordRelicBehaviors
- src/src/systems/skills.ts — import getShortSprintBonus; relicBonus 块添加 short_sprint 加算
- src/src/systems/shop.ts — import setWordDealerFlag + consumeWordDealerFreeRefresh; sellWord + removeWord: word_dealer flag; refreshShop: free refresh 逻辑；[Review] sellWord 增加 MIN_WORD_COUNT 防护；feedback 颜色区分；免费刷新不递增 refreshCount
- src/src/main.ts — import + 调用 resetWordRelicRunState（两条启动路径）
- src/tests/unit/systems/relics/relics.word.test.ts — NEW: 29 个单词遗物测试用例（+2 review 新增）
- src/tests/unit/systems/relics/relics.test.ts — 遗物总数 35→40，各稀有度计数更新
- src/tests/unit/systems/relics/relics.slots.test.ts — zeroPriceRelics 添加 punctuation_liberation
- docs/implementation-artifacts/sprint-status.yaml — 36-7 状态: ready-for-dev → in-progress → done
