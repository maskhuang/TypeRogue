# Story 36.4: 技能系统（词条制）遗物

Status: done

## Story

As a player,
I want 5 skill-system relics that enhance my skill builds through first-hit bonuses, minimalist playstyles, bulk upgrades, affix diversity rewards, and unlimited growth paths,
so that I have meaningful strategic choices around skill composition, leveling, and enchantment decisions.

## Acceptance Criteria

1. **AC1 — 首发强化 (first_strike)**: 每个单词第一个触发的技能产出加算 +20%，后续技能不受影响；下一个单词重置。

2. **AC2 — 少而精 (less_is_more)**: 检查已装备技能数量 `state.player.skills.size`，<10 则全局技能产出加算 +20%。

3. **AC3 — 集训手册 (training_manual)**: 获取瞬间遍历所有已装备技能，Lv.1 的升级到 Lv.2（更新 `state.player.skills` level 和 `state.affixSkills` 的 level + baseValues 索引）；后续获取的 Lv.1 技能不受影响。

4. **AC4 — 爵士乐 (jazz)**: 追踪一词内触发的不同 `AffixType` 种类数 N；N ≥3 时该词得分 +10%×N（通过 `state.resources.score += baseScore * 0.1 * N` 在词结算时应用）。

5. **AC5 — 无冕之王 (uncrowned_king)**: 无附魔技能突破 Lv.3 上限，Lv.4+ 按 +60% 递增；有此遗物时附魔选择界面对无附魔技能禁用（`checkAutoEnchantment` 中跳过无附魔技能）。

6. **AC6 — 集训手册一次性测试**: 获取 training_manual 后新获得的 Lv.1 技能不自动升级。

7. **AC7 — 无冕之王互斥测试**: 持有 uncrowned_king 时，已有附魔的技能仍受 Lv.3 上限；无附魔技能不弹出附魔选择。

## Tasks / Subtasks

- [x] Task 1: 添加 5 个遗物数据定义 (AC: #1-#5)
  - [x] 1.1 在 `data/relics.ts` 的 `RELICS` 中添加 5 个 RelicData 条目，含 `subsystem: 'skill'`
  - [x] 1.2 为行为型遗物设置 `behaviorType`：training_manual、jazz_diversity、uncrowned_king
  - [x] 1.3 更新 `relics.test.ts` 中遗物总数（20→25）和各稀有度计数断言
  - [x] 1.4 更新 `relics.slots.test.ts` 中 zeroPriceRelics（uncrowned_king basePrice=0）

- [x] Task 2: 创建 SkillRelicBehaviors.ts 行为模块 (AC: #1-#5)
  - [x] 2.1 创建 `systems/relics/SkillRelicBehaviors.ts`
  - [x] 2.2 导出 `getFirstStrikeBonus()`: 查询 relics.has + synergy.wordSkillCount === 1 → 返回 0.2 或 0
  - [x] 2.3 导出 `getLessIsMoreBonus()`: 查询 relics.has + `state.player.skills.size < 10` → 返回 0.2 或 0
  - [x] 2.4 导出 `applyTrainingManual()`: 遍历所有已装备技能，Lv.1 → Lv.2，返回升级数量
  - [x] 2.5 导出 `trackWordAffixTypes()` / `getWordAffixTypeCount()` / `resetWordAffixTypes()`: 追踪本词触发的不同词条类型
  - [x] 2.6 导出 `checkJazzBonus()`: N ≥ 3 时返回 `0.1 * N`，否则 0
  - [x] 2.7 导出 `hasUncrownedKing()`: 简单 has 查询
  - [x] 2.8 导出 `getUncrownedKingLevelCap()`: 返回 Infinity
  - [x] 2.9 导出 `getUncrownedKingBaseValue(level, baseValues)`: Lv4+ 按 Lv3 值 × 1.6^(level-3) 计算
  - [x] 2.10 导出 `shouldBlockEnchantment(enchantmentIds)`: 有遗物 + 无附魔 → true
  - [x] 2.11 导出 `resetSkillRelicState()` / `initSkillRelicBehaviors()`

- [x] Task 3: 实现首发强化 (AC: #1)
  - [x] 3.1 在 `skills.ts` 中：`triggerAffixSkillWithFeedback()` 内加算 `getFirstStrikeBonus()` 到 relicBonus
  - [x] 3.2 利用 `synergy.wordSkillCount === 1` 判断本词第一个技能
  - [x] 3.3 反馈浮字通过统一 relicBonus 同步缩放

- [x] Task 4: 实现少而精 (AC: #2)
  - [x] 4.1 在 `skills.ts` 加算 `getLessIsMoreBonus()` 到 relicBonus
  - [x] 4.2 与 first_strike、prism 加算合并（prismBonus + firstStrikeBonus + lessIsMoreBonus）
  - [x] 4.3 反馈浮字通过统一 relicBonus 同步缩放

- [x] Task 5: 实现集训手册 (AC: #3, #6)
  - [x] 5.1 注册 `training_manual` 行为（no-op body）
  - [x] 5.2 在 `shop.ts` 遗物购买后（含替换路径）调用 `applyTrainingManual()`
  - [x] 5.3 `applyTrainingManual()` 遍历 skills + affixSkills，Lv.1 → Lv.2
  - [x] 5.4 仅更新 level 字段，不修改 baseValues 数组

- [x] Task 6: 实现爵士乐 (AC: #4)
  - [x] 6.1 注册 `jazz_diversity` 行为（no-op body）
  - [x] 6.2 在 `triggerAffixSkillWithFeedback()` 后调用 `trackWordAffixTypes(skill.affixes)`
  - [x] 6.3 在 `battle.ts` 的 `completeWord()` 中 `bonusMult += checkJazzBonus()`
  - [x] 6.4 在 `resetWordResourceTypes()` 中调用 `resetWordAffixTypes()`

- [x] Task 7: 实现无冕之王 (AC: #5, #7)
  - [x] 7.1 注册 `uncrowned_king` 行为（no-op body）
  - [x] 7.2 在 `shop.ts` 的 `checkAutoEnchantment()` 中：`shouldBlockEnchantment()` → 跳过附魔
  - [x] 7.3 在 `shop.ts` 升级逻辑 3 处 + 购买处：hasUK + 无附魔 → levelCap = Infinity
  - [x] 7.4 在 `skills.ts`：Lv4+ 产出乘以 `ukScale = 1.6^(level-3)`
  - [x] 7.5 data/relics.ts 中设 category='risk-reward', basePrice=0
  - [x] 7.6 battle.ts `applyChaosSeedEnchantments()` 中：hasUncrownedKing → 跳过

- [x] Task 8: 注册模块初始化 (AC: #1-#5)
  - [x] 8.1 `initSkillRelicBehaviors()` 注册 training_manual + jazz_diversity + uncrowned_king
  - [x] 8.2 `initInput()` 中调用 `initSkillRelicBehaviors()`
  - [x] 8.3 `startLevel()` 中调用 `resetSkillRelicState()`

- [x] Task 9: 单元测试 (AC: #1-#7)
  - [x] 9.1 创建 `relics.skill.test.ts`（44 个测试）
  - [x] 9.2 首发强化：5 个测试（wordSkillCount=1→0.2, =2→0, =0→0, =10→0, 未持有→0）
  - [x] 9.3 少而精：6 个测试（size=9→0.2, =10→0, =0→0.2, =1→0.2, =15→0, 未持有→0）
  - [x] 9.4 集训手册：6 个测试（全Lv1→Lv2, Lv2不变, Lv3不变, 混合, 空集, AC6新技能不升级）
  - [x] 9.5 爵士乐：8 个测试（3种→0.3, 4种→0.4, 2种→0, 1种→0, 重复不计, 跨词重置, 多词条一次追踪, 未持有）
  - [x] 9.6 无冕之王：5 个测试（hasUK, shouldBlock无附魔→true, 有附魔→false, 未持有→false×2）
  - [x] 9.7 无冕之王 baseValue：5 个测试（Lv1-3→baseValues, Lv4=×1.6, Lv5=×1.6², Lv6=×1.6³, Lv10=×1.6⁷）
  - [x] 9.8 交互：first_strike + less_is_more 加算 → +0.4
  - [x] 9.9 交互：uncrowned_king + 有附魔 → shouldBlock false

## Dev Notes

### 当前系统状态（CRITICAL）

**已完成的基础设施（Story 36.1 + 36.2 + 36.3）：**
- `RelicBehaviorType` 已包含 `'training_manual'`、`'jazz_diversity'`、`'uncrowned_king'`（types.ts:108-111）
- `RelicSubsystem` 已包含 `'skill'`（types.ts:87）
- `RELIC_MODIFIER_DEFS` 当前为空 `{}`（所有遗物走纯函数路线）
- `registerRelicBehavior()` / `dispatchRelicBehavior()` 行为分发框架就绪
- `relicStates: Record<string, number>` 可追踪运行时状态
- `getRelicState()` / `setRelicState()` 辅助函数就绪

**技能触发核心流程（关键代码位置）：**
```
triggerAffixSkillWithFeedback() (skills.ts:148)
  ├── synergy.wordSkillCount++ (line 151)              ← first_strike 判断点
  ├── _wordHasProducerTriggered = true (line 152)
  ├── prismBonus = getMultiplierPrismBonus() (line 169) ← 加算合并点
  ├── orchestrateAffixTrigger(skillId, ..., {
  │     applyResource: (resource, amount) => {
  │       // 倍率棱镜: amount *= (1 + prismBonus)     ← 加算遗物统一应用点
  │       // first_strike + less_is_more 在此合并
  │     }
  │   }) (line 171)
  └── 浮字反馈循环 (line 201-226)
```

**词结算流程（jazz 加分点）：**
```
completeWord() (battle.ts)
  ├── resetWordResourceTypes()                         ← 同步重置 jazz 追踪
  ├── 词结算: wordScore = skillBaseScore * multiplier  ← jazz 在此加分
  └── state.score += wordScore
```

**附魔触发流程（uncrowned_king 拦截点）：**
```
checkAutoEnchantment() (shop.ts:1216)
  ├── data.level < 3 → return                          ← uncrowned_king 需调整
  ├── queryRelicFlag('enchant_lock') → return           ← 已有 T4 附魔锁定
  ├── affixSkill.enchantmentIds.length >= slotCount → return
  ├── filterEnchantmentCandidates()
  └── renderAffixEnchantmentModal()                    ← uncrowned_king: 无附魔跳过
```

**技能升级逻辑（uncrowned_king 等级上限修改点）：**
```
shop.ts:
  levelCap = queryRelicFlag('max_skill_level') → 通常 3 (line 514-515)
  技能升级项: data.level < levelCap (line 557)

  → uncrowned_king 需要：无附魔技能 levelCap = Infinity
```

### 关键设计决策

**1. first_strike 与 less_is_more 的加算合并：**
采用与 multiplier_prism 相同的加算模式。在 `applyResource` 回调中：
```typescript
let relicBonus = 0;
if (prismBonus > 0 && amount > 0) relicBonus += prismBonus;        // 0.2
if (firstStrikeBonus > 0 && amount > 0) relicBonus += firstStrikeBonus; // 0.2
if (lessIsMoreBonus > 0 && amount > 0) relicBonus += lessIsMoreBonus;   // 0.2
if (relicBonus > 0) amount *= (1 + relicBonus);
```
这样 first_strike + less_is_more + prism 同时触发 = +60%。

**2. first_strike 的"第一个技能"判断：**
使用 `synergy.wordSkillCount`。在 `triggerAffixSkillWithFeedback` 入口处 `synergy.wordSkillCount++` 后，wordSkillCount == 1 表示第一个技能。注意：此计数在 `completeWord()` 或词重置时清零。

**3. less_is_more 的技能数量源：**
使用 `state.player.skills.size`（已装备技能数量）。这是 Map 的 size 属性，包含所有已绑定技能。阈值 <10 表示严格小于 10 个。

**4. training_manual 一次性效果：**
在 `shop.ts` 的遗物购买流程中（买下遗物后）立即执行升级逻辑。不需要行为注册的 dispatch — 行为注册仅用于框架完整性（no-op body）。升级逻辑：
```typescript
for (const [skillId, data] of state.player.skills) {
  if (data.level === 1) {
    data.level = 2;
    const affixSkill = state.affixSkills.get(skillId);
    if (affixSkill) affixSkill.level = 2;
  }
}
```
注意不修改 `baseValues` 数组 — 它已包含所有 3 级数据，level 索引即可。

**5. jazz 的词条类型追踪：**
在 `SkillRelicBehaviors.ts` 中维护 `_wordAffixTypes: Set<AffixType>`。每次 `triggerAffixSkillWithFeedback()` 后，将该技能的所有 `skill.affixes[].type` 加入 Set。词结算时 `checkJazzBonus()` 查询 Set.size。

**关键问题**：jazz 追踪的是"触发的技能的词条类型"而非"实际生效的词条类型"。即一个有 Multiply + Crit 词条的技能触发一次，Multiply 和 Crit 都计入（即使 Crit 未暴击）。这样更简单且对玩家更友好。

**6. uncrowned_king 的等级上限：**
- 在 `shop.ts` 生成升级商品时：对无附魔技能检查 `hasUncrownedKing()` → levelCap 改为 Infinity
- 在购买升级时：同样检查
- baseValue 计算：Lv4+ 用 `baseValues[2] * 1.6^(level - 3)`
- 在 `triggerAffixSkillWithFeedback` 中（或 orchestrator 的 resolvePhase1 中）：检查 level > 3 时用 `getUncrownedKingBaseValue()`

**7. uncrowned_king 的附魔互斥：**
- 在 `checkAutoEnchantment()` 中：有 uncrowned_king 且 `skill.enchantmentIds.length === 0` → 跳过附魔弹窗
- 已有附魔的技能不受影响（仍受 Lv.3 上限）
- 混沌种子（chaos_seed）的自动附魔也需检查

**8. 行为文件组织：**
参照 `TypingRelicBehaviors.ts` 和 `ComboRelicBehaviors.ts` 模式，新建 `SkillRelicBehaviors.ts`。

### 遗物数据规格

| ID | 名称 | 图标 | 稀有度 | basePrice | subsystem | behaviorType | effects | category |
|---|---|---|---|---|---|---|---|---|
| `first_strike` | 首发强化 | ⚡ | common | 50 | skill | — | [] | — |
| `less_is_more` | 少而精 | 💎 | common | 50 | skill | — | [] | — |
| `training_manual` | 集训手册 | 📖 | rare | 80 | skill | training_manual | [] | — |
| `jazz` | 爵士乐 | 🎷 | epic | 120 | skill | jazz_diversity | [] | — |
| `uncrowned_king` | 无冕之王 | 👑 | legendary | 0 | skill | uncrowned_king | [] | risk-reward |

注：
- first_strike 和 less_is_more 不需 behaviorType（逻辑简单，直接由 skills.ts 调用纯函数）
- uncrowned_king 设 category: 'risk-reward'（负面效果：永远不能获得附魔）
- 图标唯一性检查：⚡💎📖🎷👑 均未被现有遗物使用（现有：📓🧫⚛️🔒🌱💪📙♾️✂️🧩🕯️🧤🤖🎵💥🛡️🔷⏱️💣🔗）

### 依赖方向（CRITICAL）

```
data/relics.ts (遗物数据定义)
  ↓ 被引用
systems/relics/RelicPipeline.ts (管道 + 行为分发)
  ↑ 注册行为
systems/relics/SkillRelicBehaviors.ts (NEW — 技能子系统行为)
  ↓ 被调用
systems/skills.ts (applyResource 回调 — first_strike, less_is_more, uncrowned_king baseValue)
systems/battle.ts (completeWord — jazz 加分)
systems/shop.ts (购买遗物 — training_manual, checkAutoEnchantment — uncrowned_king)
```

- `SkillRelicBehaviors.ts` 只能引用 `data/` 和 `systems/relics/` 中的模块
- 不能直接引用 `battle.ts`、`skills.ts` 或 `shop.ts`
- 行为函数通过参数接收数据或查询 `state`

### 从 Story 36.2 + 36.3 继承的关键经验

1. **纯函数模式**: 行为函数导出为纯函数，由调用方在合适位置调用。行为注册仅用于框架完整性（no-op body）。
2. **加算合并**: 多个 "+X%" 遗物在 applyResource 中加算合并（如 prism+first_strike+less_is_more = +60%），而非逐个乘算。
3. **relicStates 类型**: 只能存 number 值（jazz 不需要用 relicStates，用模块级 Set 即可）。
4. **import type**: 纯类型导入必须用 `import type`。
5. **clearBehaviorHandlers()**: 测试 beforeEach 中调用。
6. **Icon 唯一性**: 5 个遗物需要 5 个不同 emoji，已在数据规格中验证。
7. **遗物总数断言**: `relics.test.ts` 中总数（20→25）、各稀有度计数需更新。
8. **zeroPriceRelics**: uncrowned_king basePrice=0 → `relics.slots.test.ts` 中添加。
9. **RELIC_MODIFIER_DEFS**: 保持为空 `{}`（不使用 pipeline），pipeline test 断言不变。
10. **反馈浮字同步**: applyResource 中缩放的 amount 需在反馈循环中同步缩放。

### 性能约束

- first_strike / less_is_more 检查 <0.1ms（简单 Set.has + 比较）
- training_manual 一次性执行，O(n) 遍历技能，n ≤ 26 → <1ms
- jazz 追踪：每次触发 add 到 Set，O(k) 其中 k = affix 数量 ≤ 3 → <0.1ms
- uncrowned_king baseValue 计算：Math.pow → <0.1ms

### Project Structure Notes

**需修改的文件：**
- `src/src/data/relics.ts` — 添加 5 个 RelicData
- `src/src/systems/skills.ts` — applyResource: first_strike + less_is_more 加算；uncrowned_king baseValue；jazz 词条追踪
- `src/src/systems/battle.ts` — completeWord: jazz 加分；startLevel: resetSkillRelicState；initInput: initSkillRelicBehaviors
- `src/src/systems/shop.ts` — buyShopItem: training_manual 一次性升级；checkAutoEnchantment: uncrowned_king 拦截；升级 levelCap: uncrowned_king
- `src/tests/unit/systems/relics/relics.test.ts` — 遗物总数和稀有度断言更新
- `src/tests/unit/systems/relics/relics.slots.test.ts` — uncrowned_king 加入 zeroPriceRelics

**需新建的文件：**
- `src/src/systems/relics/SkillRelicBehaviors.ts` — 技能子系统行为模块
- `src/tests/unit/systems/relics/relics.skill.test.ts` — 技能遗物测试

### References

- [Source: docs/design/relic-system.md#技能系统（词条制）] — 5 个遗物完整设计规格
- [Source: docs/stories/epic-36-relic-system-expansion.md#Story 36.4] — 验收标准
- [Source: docs/implementation-artifacts/36-3-combo-multiplier-relics.md] — 前序 Story 开发记录与经验
- [Source: src/src/systems/skills.ts#L148-L244] — 技能触发与资源产出
- [Source: src/src/systems/shop.ts#L514-L596] — 技能升级和 levelCap
- [Source: src/src/systems/shop.ts#L1216-L1246] — 附魔触发 checkAutoEnchantment
- [Source: src/src/data/affixes.ts#L13-L67] — AffixType 枚举和分类
- [Source: src/src/data/affixes.ts#L172-L231] — AffixInstance 和 AffixSkillInstance
- [Source: src/src/data/relics.ts] — 当前遗物数据定义和类型
- [Source: src/src/systems/relics/RelicPipeline.ts] — pipeline + 行为分发框架
- [Source: src/src/systems/relics/TypingRelicBehaviors.ts] — 参考行为模块模式
- [Source: src/src/systems/relics/ComboRelicBehaviors.ts] — 参考行为模块模式

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
N/A — no critical debug issues encountered.

### Completion Notes List
1. All 5 relic data entries added to `relics.ts` (first_strike, less_is_more, training_manual, jazz, uncrowned_king)
2. `SkillRelicBehaviors.ts` created with 13 exported functions following pure-function pattern from 36.2/36.3
3. Unified `relicBonus` additive stacking in `skills.ts` (prism + firstStrike + lessIsMore)
4. `ukScale` multiplier for uncrowned_king Lv4+ applied in `applyResource` callback — mathematically equivalent to scaling baseValue
5. Jazz diversity tracking via module-level `Set<AffixType>` in SkillRelicBehaviors, bonus applied in `completeWord()`
6. training_manual one-shot upgrade triggered at purchase time in `shop.ts` (both normal and replace paths)
7. uncrowned_king: 3 levelCap override points in shop.ts + enchantment block in `checkAutoEnchantment` + chaos_seed guard in `battle.ts`
8. Feedback floats synchronized with ukScale + relicBonus scaling
9. 44 unit tests covering all 7 ACs; all 221 relic tests passing
10. Pre-existing failures in sound-bgm, sound-chord, KeyTooltip, affixTrigger, iconRegistry, restEvents, wordPacks — unrelated to this story

### File List
**Created:**
- `src/src/systems/relics/SkillRelicBehaviors.ts` — 13 exported functions for 5 skill relics
- `src/tests/unit/systems/relics/relics.skill.test.ts` — 44 unit tests

**Modified:**
- `src/src/data/relics.ts` — 5 new RelicData entries
- `src/src/systems/skills.ts` — unified relicBonus, ukScale, jazz tracking, imports
- `src/src/systems/battle.ts` — jazz bonus in completeWord, chaos_seed guard, init/reset calls
- `src/src/systems/shop.ts` — training_manual effect, uncrowned_king enchantment block + levelCap overrides
- `src/src/systems/relics/RelicPipeline.ts` — TODO comment on unused resolveRelicSkillTrigger
- `src/tests/unit/systems/relics/relics.test.ts` — total 20→25, rarity count updates
- `src/tests/unit/systems/relics/relics.slots.test.ts` — uncrowned_king in zeroPriceRelics
