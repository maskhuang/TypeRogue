# Story 36.5: 附魔系统遗物

Status: done

## Story

As a player,
I want 5 enchantment-system relics that boost apprentice/quest growth, expand enchantment choices, enable earlier enchanting, and provide extra enchantment slots,
so that I have meaningful ways to invest in my enchantment build strategy.

## Acceptance Criteria

1. **AC1 — 学徒之袍 (apprentice_robe)**: 持有时所有学徒型附魔的成长累积值 ×1.3（即 `growth * 1.3` 写入 `apprenticeAccumulated`）。

2. **AC2 — 试炼徽章 (trial_badge)**: 持有时所有试炼型附魔的堆叠进度 ×1.3（每次触发 `questStacks += 1.3` 而非 `+= 1`）。

3. **AC3 — 命运三岔 (fate_fork)**: 附魔选择界面从 2 选 1 变为 3 选 1（增加 1 个候选分支）。蜕变师自动随机附魔不受影响。

4. **AC4 — 早期觉醒 (early_awakening)**: 附魔触发条件从 Lv3+ 放宽到 Lv2+（`checkAutoEnchantment` 中 `data.level < 3` 改为 `data.level < 2`）。

5. **AC5 — 附魔锚点 (enchant_anchor)**: 所有技能附魔槽位 +1（`getEnchantmentSlotCount` 基础值 +1）。但每个已激活的附魔使商店所有商品价格 +10%（加算叠加）。

6. **AC6 — 附魔锚点价格测试**: 测试 0/1/5/10 个附魔时的价格变化（0%/10%/50%/100%），验证与其他价格修饰器的叠加。

## Tasks / Subtasks

- [x] Task 1: 添加 5 个遗物数据定义 (AC: #1-#5)
  - [x] 1.1 在 `data/relics.ts` 的 `RELICS` 中添加 5 个 RelicData 条目，含 `subsystem: 'enchantment'`
  - [x] 1.2 为行为型遗物设置 `behaviorType`：fate_fork、early_awakening
  - [x] 1.3 enchant_anchor 设 `category: 'risk-reward'`, `basePrice: 0`
  - [x] 1.4 更新 `relics.test.ts` 中遗物总数（25→30）和各稀有度计数断言
  - [x] 1.5 更新 `relics.slots.test.ts` 中 zeroPriceRelics（enchant_anchor basePrice=0）
  - [x] 1.6 确认图标唯一性（与现有 25 个遗物不冲突）

- [x] Task 2: 创建 EnchantmentRelicBehaviors.ts 行为模块 (AC: #1-#5)
  - [x] 2.1 创建 `systems/relics/EnchantmentRelicBehaviors.ts`
  - [x] 2.2 导出 `getApprenticeGrowthMultiplier()`: 有 apprentice_robe → 1.3，否则 1
  - [x] 2.3 导出 `getQuestStackIncrement()`: 有 trial_badge → 1.3，否则 1
  - [x] 2.4 导出 `getEnchantmentChoiceCount()`: 有 fate_fork → 3，否则 2
  - [x] 2.5 导出 `getMinEnchantmentLevel()`: 有 early_awakening → 2，否则 3
  - [x] 2.6 导出 `hasEnchantAnchor()`: 简单 has 查询
  - [x] 2.7 导出 `getEnchantAnchorSlotBonus()`: 有 → 1，否则 0
  - [x] 2.8 导出 `getEnchantAnchorPriceMultiplier()`: 有 → 统计所有技能的 enchantmentIds 总数 × 0.1 + 1，否则 1
  - [x] 2.9 导出 `resetEnchantmentRelicState()` / `initEnchantmentRelicBehaviors()`

- [x] Task 3: 实现学徒之袍 (AC: #1)
  - [x] 3.1 在 `affixTrigger.ts` 的 `resolvePhase5` 中找到学徒成长累积处
  - [x] 3.2 将 `growth` 值乘以 `apprenticeGrowthMultiplier` 再写入 `apprenticeAccumulated`（通过 TriggerContext 注入）
  - [x] 3.3 依赖方向通过 TriggerContext 参数注入解决（skills.ts 预计算乘数传入 ctx）

- [x] Task 4: 实现试炼徽章 (AC: #2)
  - [x] 4.1 在 `affixTrigger.ts` 的 `resolvePhase5` 中找到试炼堆叠处 (`questStacks++`)
  - [x] 4.2 将 `++` 改为 `+= (ctx.questStackIncrement ?? 1)`（通过 TriggerContext 注入）
  - [x] 4.3 questStacks 类型为 number，已支持小数

- [x] Task 5: 实现命运三岔 (AC: #3)
  - [x] 5.1 在 `shop.ts` 的 `renderAffixEnchantmentModal()` 中修改最大分支数
  - [x] 5.2 硬编码 2 → 改为 `getEnchantmentChoiceCount()`，候选选择改为 pool-based 去重采样
  - [x] 5.3 蜕变师 `applyAffixRandomEnchantment` 路径不受影响（无选择界面）
  - [x] 5.4 注册 `fate_fork` 行为（no-op body）

- [x] Task 6: 实现早期觉醒 (AC: #4)
  - [x] 6.1 在 `shop.ts` 的 `checkAutoEnchantment()` 中修改等级检查
  - [x] 6.2 `data.level < 3` → `data.level < getMinEnchantmentLevel()`
  - [x] 6.3 注册 `early_awakening` 行为（no-op body）

- [x] Task 7: 实现附魔锚点 (AC: #5, #6)
  - [x] 7.1 在 `affixTrigger.ts` 的 `getEnchantmentSlotCount()` 中增加 `bonusSlots` 参数
  - [x] 7.2 `return (hasTwin ? 2 : 1) + bonusSlots`（shop.ts 传入 `getEnchantAnchorSlotBonus()`）
  - [x] 7.3 `getAdjustedPrice` 应用 `getEnchantAnchorPriceMultiplier()` 价格乘数
  - [x] 7.4 `enchant_anchor` 设 `category: 'risk-reward'`, `basePrice: 0`

- [x] Task 8: 注册模块初始化 (AC: #1-#5)
  - [x] 8.1 `initEnchantmentRelicBehaviors()` 注册 fate_fork + early_awakening
  - [x] 8.2 `initInput()` 中调用 `initEnchantmentRelicBehaviors()`
  - [x] 8.3 `startLevel()` 中调用 `resetEnchantmentRelicState()`

- [x] Task 9: 单元测试 (AC: #1-#6)
  - [x] 9.1 创建 `relics.enchantment.test.ts`
  - [x] 9.2 学徒之袍：持有→1.3，未持有→1
  - [x] 9.3 试炼徽章：持有→1.3，未持有→1
  - [x] 9.4 命运三岔：持有→3，未持有→2
  - [x] 9.5 早期觉醒：持有→2，未持有→3
  - [x] 9.6 附魔锚点：slotBonus、priceMultiplier（0/1/5/10 附魔场景）
  - [x] 9.7 交互：early_awakening + uncrowned_king（UK 阻止附魔优先于 EA）
  - [x] 9.8 交互：enchant_anchor + uncrowned_king（UK 无附魔技能 slot+1 无效）

## Dev Notes

### 当前系统状态（CRITICAL）

**已完成的基础设施（Story 36.1 — 36.4）：**
- `RelicBehaviorType` 已包含 `'fate_fork'`、`'early_awakening'`（types.ts 或 relics.ts:113-114）
- `RelicSubsystem` 已包含 `'enchantment'`（relics.ts:88）
- `RELIC_MODIFIER_DEFS` 当前为空 `{}`（所有遗物走纯函数路线）
- `registerRelicBehavior()` / `dispatchRelicBehavior()` 行为分发框架就绪
- 25 个遗物已实现（10 职业 + 5 打字 + 5 连击 + 5 技能）

**附魔触发核心流程（关键代码位置）：**
```
checkAutoEnchantment() (shop.ts:1237)
  ├── data.level < 3 → return                          ← early_awakening 修改点
  ├── queryRelicFlag('enchant_lock') → return           ← T4 附魔锁定
  ├── shouldBlockEnchantment(enchantmentIds) → return   ← uncrowned_king 拦截
  ├── getEnchantmentSlotCount(affixSkill) → slotCount   ← enchant_anchor 修改点
  ├── affixSkill.enchantmentIds.length >= slotCount → return
  ├── filterEnchantmentCandidates(affixSkill)
  ├── filterEnchantmentsByClass(...)
  └── isFeatureEnabled('enchant-choice')
      ├── false → applyAffixRandomEnchantment()        ← 蜕变师路径，fate_fork 不影响
      └── true → renderAffixEnchantmentModal()          ← fate_fork 修改点
```

**附魔选择 UI（shop.ts:1447-1526）：**
```
renderAffixEnchantmentModal(skillId, affixSkill, candidates)
  ├── expandTransmuteVariants() → 展开衍生附魔的资源变体
  ├── maxBranches = 2                                   ← fate_fork: 改为 getEnchantmentChoiceCount()
  ├── if candidates.length > maxBranches → 随机选 maxBranches 个
  └── renderModal → 用户选择 → applyEnchantment
```

**附魔槽位计算（affixTrigger.ts:1224-1226）：**
```typescript
export function getEnchantmentSlotCount(skill: AffixSkillInstance): number {
  return skill.affixes.some(a => a.type === AffixType.Twin) ? 2 : 1
  // enchant_anchor: 需要加上 anchorBonus
}
```

**学徒成长累积（affixTrigger.ts resolvePhase5 ~line 788）：**
```
runtimeState.apprenticeAccumulated += growth
// apprentice_robe: growth *= getApprenticeGrowthMultiplier()
```

**试炼堆叠（affixTrigger.ts resolvePhase5 ~line 802-806）：**
```
runtimeState.questStacks++
// trial_badge: questStacks += getQuestStackIncrement()
```

### 关键设计决策

**1. 依赖方向问题（CRITICAL）：**
`affixTrigger.ts` 位于 `data/` 层，不能直接 import `systems/relics/` 中的模块。
两种解决方案：
- **方案 A（推荐）**：在 `orchestrateAffixTrigger` 的回调/参数中传入乘数值（类似 `applyResource` 回调模式）
- **方案 B**：在 `skills.ts` 的 `triggerAffixSkillWithFeedback()` 中预计算乘数，通过 ctx 传入 affixTrigger

对于 `getEnchantmentSlotCount`（也在 `data/` 层），同样不能直接 import。
解决方案：
- 在 `shop.ts` 调用 `getEnchantmentSlotCount` 之前，传入额外的 slotBonus 参数
- 或者修改 `getEnchantmentSlotCount(skill, bonusSlots?)` 签名

**2. apprentice_robe + trial_badge 的加速模式：**
- 学徒：`growth * 1.3` → 成长百分比加速（如 +0.5% → +0.65%）
- 试炼：`questStacks += 1.3` → 堆叠速度加速（小数 stacks 可累积，到阈值时完成）
- questStacks 类型为 `number`，已支持小数

**3. fate_fork 仅影响选择界面：**
- 只修改 `renderAffixEnchantmentModal` 中 `maxBranches` 数值
- 蜕变师的 `applyAffixRandomEnchantment` 路径不受影响（无选择 UI）
- 如果候选数不足 3 个，则显示所有可用候选（不强制 3 个）

**4. early_awakening 等级检查：**
- `checkAutoEnchantment` 中 `data.level < 3` → `data.level < getMinEnchantmentLevel()`
- 注意：uncrowned_king 的 `shouldBlockEnchantment` 在等级检查之后执行，优先级正确
- early_awakening + uncrowned_king：Lv2 无附魔技能 → 先通过等级检查 → 被 UK 阻止 → 不附魔

**5. enchant_anchor 价格计算：**
- 统计所有技能的 `enchantmentIds.length` 总和 N
- 商店所有商品价格 × (1 + 0.1 × N)
- 价格增加在商品展示时计算（`renderUnifiedShop` 或价格显示逻辑）
- 与其他价格修饰器（折扣卡 -15% 等）加算叠加

**6. enchant_anchor 槽位加成：**
- `getEnchantmentSlotCount` 返回值 + 1
- 基础 1 + Twin 额外 1 + Anchor 额外 1 → 最多 3 个附魔槽
- 已有 2 个附魔的技能获得 Anchor 后可继续获得第 3 个

**7. 行为文件组织：**
参照 `TypingRelicBehaviors.ts`、`ComboRelicBehaviors.ts`、`SkillRelicBehaviors.ts` 模式。

### 遗物数据规格

| ID | 名称 | 图标 | 稀有度 | basePrice | subsystem | behaviorType | category |
|---|---|---|---|---|---|---|---|
| `apprentice_robe` | 学徒之袍 | 👘 | common | 50 | enchantment | — | — |
| `trial_badge` | 试炼徽章 | 🏅 | common | 50 | enchantment | — | — |
| `fate_fork` | 命运三岔 | 🔱 | rare | 80 | enchantment | fate_fork | — |
| `early_awakening` | 早期觉醒 | 🌅 | epic | 120 | enchantment | early_awakening | — |
| `enchant_anchor` | 附魔锚点 | ⚓ | legendary | 0 | enchantment | — | risk-reward |

注：
- apprentice_robe、trial_badge、enchant_anchor 不需 behaviorType（逻辑简单，纯函数直接调用）
- enchant_anchor 设 category: 'risk-reward'（负面效果：价格递增）
- 图标唯一性：👘🏅🔱🌅⚓ 均未被现有遗物使用

### 依赖方向（CRITICAL）

```
data/relics.ts (遗物数据定义)
  ↓ 被引用
systems/relics/RelicPipeline.ts (管道 + 行为分发)
  ↑ 注册行为
systems/relics/EnchantmentRelicBehaviors.ts (NEW — 附魔子系统行为)
  ↓ 被调用
systems/shop.ts (checkAutoEnchantment — early_awakening; renderAffixEnchantmentModal — fate_fork; 价格计算 — enchant_anchor)

⚠️ data/affixTrigger.ts 不能直接 import systems/ 模块！
  → apprentice_robe/trial_badge: 通过参数/回调从 skills.ts 传入乘数
  → enchant_anchor 槽位: 通过参数从 shop.ts 传入 bonus
```

### 从 Story 36.2 — 36.4 继承的关键经验

1. **纯函数模式**: 行为函数导出为纯函数，由调用方在合适位置调用。行为注册仅用于框架完整性（no-op body）。
2. **加算合并**: 多个百分比修饰器加算叠加（如折扣卡 -15% + 锚点 +10% = -5%）。
3. **relicStates 类型**: 只能存 number 值。
4. **import type**: 纯类型导入必须用 `import type`。
5. **clearBehaviorHandlers()**: 测试 beforeEach 中调用。
6. **Icon 唯一性**: 5 个遗物需要 5 个不同 emoji，已在数据规格中验证。
7. **遗物总数断言**: `relics.test.ts` 中总数（25→30）、各稀有度计数需更新。
8. **zeroPriceRelics**: enchant_anchor basePrice=0 → `relics.slots.test.ts` 中添加。
9. **RELIC_MODIFIER_DEFS**: 保持为空 `{}`（不使用 pipeline）。
10. **依赖方向**: `data/` 层不能 import `systems/` 层 — 必须通过参数或回调传递。

### 性能约束

- apprentice_robe / trial_badge: 纯乘数，<0.1ms
- fate_fork / early_awakening: 简单条件检查，<0.1ms
- enchant_anchor 价格乘数: 遍历 `state.affixSkills` 统计附魔数，O(n) n ≤ 26 → <0.5ms（仅商店渲染时计算）

### Project Structure Notes

**需修改的文件：**
- `src/src/data/relics.ts` — 添加 5 个 RelicData
- `src/src/data/affixTrigger.ts` — resolvePhase5: apprentice 成长乘数 + quest 堆叠乘数; getEnchantmentSlotCount: 锚点加成（需注意依赖方向）
- `src/src/systems/shop.ts` — checkAutoEnchantment: early_awakening 等级; renderAffixEnchantmentModal: fate_fork 候选数; 价格计算: enchant_anchor
- `src/src/systems/battle.ts` — initInput: initEnchantmentRelicBehaviors; startLevel: resetEnchantmentRelicState
- `src/tests/unit/systems/relics/relics.test.ts` — 遗物总数和稀有度断言更新
- `src/tests/unit/systems/relics/relics.slots.test.ts` — enchant_anchor 加入 zeroPriceRelics

**需新建的文件：**
- `src/src/systems/relics/EnchantmentRelicBehaviors.ts` — 附魔子系统行为模块
- `src/tests/unit/systems/relics/relics.enchantment.test.ts` — 附魔遗物测试

### References

- [Source: docs/design/relic-system.md#附魔系统] — 5 个遗物完整设计规格
- [Source: docs/stories/epic-36-relic-system-expansion.md#Story 36.5] — 验收标准
- [Source: docs/implementation-artifacts/36-4-skill-system-relics.md] — 前序 Story 开发记录与经验
- [Source: src/src/systems/shop.ts#L1237-L1273] — checkAutoEnchantment 附魔触发流程
- [Source: src/src/systems/shop.ts#L1447-L1526] — renderAffixEnchantmentModal 选择 UI
- [Source: src/src/data/affixTrigger.ts#L1224-L1226] — getEnchantmentSlotCount 槽位计算
- [Source: src/src/data/affixTrigger.ts#L780-L832] — resolvePhase5 附魔成长/堆叠
- [Source: src/src/data/affixTrigger.ts#L516] — APPRENTICE_GROWTH_DEFAULTS 成长率表
- [Source: src/src/data/affixes.ts#L72] — EnchantmentType 枚举
- [Source: src/src/data/relics.ts] — 当前遗物数据定义和类型
- [Source: src/src/systems/relics/SkillRelicBehaviors.ts] — 参考行为模块模式

## Dev Agent Record

### Agent Model Used
claude-opus-4-6

### Debug Log References
无

### Completion Notes List
- Task 1: 5 个遗物数据添加到 RELICS（25→30），图标唯一性验证通过，测试断言更新
- Task 2: EnchantmentRelicBehaviors.ts 创建，9 个导出函数（纯函数模式）
- Task 3: 学徒之袍通过 TriggerContext.apprenticeGrowthMultiplier 注入 resolvePhase5，避免 data→systems 依赖
- Task 4: 试炼徽章通过 TriggerContext.questStackIncrement 注入 resolvePhase5
- Task 5: 命运三岔修改 renderAffixEnchantmentModal 候选数，改为 pool-based 去重采样
- Task 6: 早期觉醒修改 checkAutoEnchantment 等级检查
- Task 7: 附魔锚点：getEnchantmentSlotCount 增加 bonusSlots 参数；getAdjustedPrice 应用价格乘数
- Task 8: battle.ts 注册 initEnchantmentRelicBehaviors + resetEnchantmentRelicState
- Task 9: 21 个测试用例覆盖所有 AC + 交互场景，全部通过
- 依赖方向：通过 TriggerContext 参数注入解决 data→systems 依赖问题（apprenticeGrowthMultiplier, questStackIncrement, enchantAnchorSlotBonus）

### File List
- src/src/data/relics.ts — 添加 5 个 RelicData（apprentice_robe, trial_badge, fate_fork, early_awakening, enchant_anchor）
- src/src/data/affixTrigger.ts — TriggerContext 新增 2 个遗物注入字段；resolvePhase5 学徒成长乘数 + 试炼堆叠增量；getEnchantmentSlotCount 增加 bonusSlots 参数
- src/src/systems/relics/EnchantmentRelicBehaviors.ts — NEW: 附魔子系统行为模块（8 个导出函数 + ENCHANTMENT_BOOST_RATE 常量）
- src/src/systems/shop.ts — checkAutoEnchantment 等级检查改为 getMinEnchantmentLevel()；renderAffixEnchantmentModal 候选数改为 getEnchantmentChoiceCount()；getAdjustedPrice 应用锚点价格乘数；getEnchantmentSlotCount 传入锚点加成
- src/src/systems/skills.ts — import EnchantmentRelicBehaviors；ctx 注入 apprenticeGrowthMultiplier + questStackIncrement
- src/src/systems/battle.ts — import + 调用 initEnchantmentRelicBehaviors + resetEnchantmentRelicState；移除死导入 getEnchantmentSlotCount
- src/tests/unit/systems/relics/relics.enchantment.test.ts — NEW: 23 个测试用例（含 getEnchantmentSlotCount 集成测试）
- src/tests/unit/systems/relics/relics.test.ts — 遗物总数 25→30，各稀有度计数更新
- src/tests/unit/systems/relics/relics.slots.test.ts — zeroPriceRelics 添加 enchant_anchor
