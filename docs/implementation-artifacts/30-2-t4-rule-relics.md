# Story 30.2: T4 规则改造遗物

Status: done

## Story

As a 玩家,
I want 5 个传说级规则改造遗物可供获取，每个关闭一个子系统换取核心增益,
so that 每个遗物定义一种独特的构筑方向，Run 的策略选择更加丰富。

## Acceptance Criteria

1. 5 个新遗物（chain_ban, no_enchant_vow, keyboard_flood, pure_heart, minimalist）在 RELICS 字典中有完整数据（id/name/icon/description/rarity/basePrice/effects/flavor）
2. 5 个工厂函数在 RELIC_MODIFIER_DEFS 中产出正确的 Modifier[]（增益部分走管道，限制部分走 RELIC_FLAGS + queryRelicFlag）
3. RELIC_FLAGS 正确映射：connector_lock → chain_ban, enchant_lock → no_enchant_vow + keyboard_flood, max_skill_level → keyboard_flood（value=1）+ minimalist（value=3）
4. pure_heart 限制生效：商店不生成非产出者技能，已有非产出者被移除
5. minimalist 限制生效：技能数上限 5，所有技能视为 Lv3（购买时自动升级 + 触发附魔流程）
6. keyboard_flood 的 +25% 增益需 ≥15 技能才生效（条件型工厂）
7. 所有现有测试通过 + 每个遗物至少 3 个新测试

## Tasks / Subtasks

- [x] Task 1: 简单 Flag 遗物 — chain_ban + no_enchant_vow (AC: #1, #2, #3)
  - [x] 1.1 RELICS 添加 chain_ban 数据（⛓️, legendary, 80 金）
  - [x] 1.2 RELICS 添加 no_enchant_vow 数据（🚫, legendary, 80 金）
  - [x] 1.3 RELIC_MODIFIER_DEFS 添加 chain_ban 工厂：on_skill_trigger global 层 score ×1.30
  - [x] 1.4 RELIC_MODIFIER_DEFS 添加 no_enchant_vow 工厂：on_skill_trigger global 层 score ×1.40
  - [x] 1.5 RELIC_FLAGS 填充：connector_lock → ['chain_ban'], enchant_lock → ['no_enchant_vow']
- [x] Task 2: keyboard_flood — 条件增益 + 双 Flag (AC: #1, #2, #3, #6)
  - [x] 2.1 RELICS 添加 keyboard_flood 数据（⌨️, legendary, 100 金, effects 含 max_skill_level=1）
  - [x] 2.2 RELIC_MODIFIER_DEFS 添加工厂：on_skill_trigger global 层 score ×1.25，condition: `total_skills_gte` value=15
  - [x] 2.3 RELIC_FLAGS 更新：enchant_lock → ['no_enchant_vow', 'keyboard_flood'], max_skill_level → ['keyboard_flood']
- [x] Task 3: pure_heart — 类别锁 + 强力增益 (AC: #1, #2, #4)
  - [x] 3.1 RELICS 添加 pure_heart 数据（❤️, legendary, 100 金）
  - [x] 3.2 RELIC_MODIFIER_DEFS 添加工厂：on_skill_trigger global 层 score ×3.0，condition: current_skill_is_producer
  - [x] 3.3 queryRelicFlag 添加 `producer_only` case：检查 RELIC_FLAGS['producer_only']
  - [x] 3.4 RELIC_FLAGS 添加 producer_only → ['pure_heart']
  - [x] 3.5 shop.ts：producer_only → converter/connector/amplifier 权重归 0
  - [x] 3.6 RelicPipeline.ts initRelicState：移除玩家已有的非产出者技能 + 浮字反馈
- [x] Task 4: minimalist — 技能数量限制 + 等级覆写 (AC: #1, #2, #5)
  - [x] 4.1 RELICS 添加 minimalist 数据（🔲, legendary, 100 金, effects 含 max_skill_level=3）
  - [x] 4.2 RELIC_MODIFIER_DEFS 添加工厂：on_word_complete 层 multiply +1.0（即 ×2 词结算）
  - [x] 4.3 queryRelicFlag 添加 `max_skill_count` case：返回数值上限（minimalist→5），无限制→Infinity
  - [x] 4.4 RELIC_FLAGS 添加 max_skill_count → ['minimalist']，max_skill_level 添加 'minimalist'
  - [x] 4.5 shop.ts：max_skill_count → 已有技能数 ≥ 上限时不生成新技能商品
  - [x] 4.6 获取遗物时：将所有已有技能升至 Lv3（initRelicState）；购买新技能时自动升级
- [x] Task 5: 测试扩展 (AC: #7)
  - [x] 5.1 relics.test.ts 更新断言：遗物数量 30→35，legendary 4→9
  - [x] 5.2 iconRegistry.test.ts 更新：总数 188→193
  - [x] 5.3 relics.t1-t5.test.ts 更新 RELIC_MODIFIER_DEFS 计数：30→35
  - [x] 5.4 relics.t4.test.ts 扩展：44 个测试（8 原有 + 36 新增）覆盖工厂、Flag 映射、条件、副作用

## Dev Notes

### 实现策略 — 按复杂度分批

**批次 A（纯 Flag）**：chain_ban、no_enchant_vow — 只需数据 + 工厂 + RELIC_FLAGS 填充。Story 30-1 框架已覆盖所有检查点，零系统代码修改。

**批次 B（条件 + 双 Flag）**：keyboard_flood — 增益走条件管道（`total_skills_gte` 已存在于 ConditionEvaluator:69），限制走 RELIC_FLAGS。双重 Flag（enchant_lock + max_skill_level）。

**批次 C（新 Flag + 系统集成）**：pure_heart、minimalist — 需要扩展 queryRelicFlag + 新检查点。

### 5 个遗物设计规格

#### chain_ban（链式禁令）⛓️
- **增益**：所有技能产出 +30%（global 层 score ×1.30, on_skill_trigger）
- **限制**：connector_lock（已有框架）
- **工厂模式**：无条件 global 乘法，和 glass_cannon 类似
```typescript
chain_ban: (id) => [
  relicMod(id, 'boost', 'on_skill_trigger', 'calculate', {
    layer: 'global',
    effect: { type: 'score', value: 1.30, stacking: 'multiplicative' },
  }),
],
```

#### no_enchant_vow（无附魔戒律）🚫
- **增益**：所有技能产出 +40%（global 层 score ×1.40, on_skill_trigger）
- **限制**：enchant_lock（已有框架）
- **注意**：获取时已有附魔不受影响（只阻止新获取），设计意图是"放弃未来附魔换取即时增益"

#### keyboard_flood（键盘洪水）🌊
- **增益**：装备 ≥15 个技能时全体 +25%（条件型 global ×1.25）
- **限制**：enchant_lock + max_skill_level=1
- **条件**：使用已有 `total_skills_gte`（ConditionEvaluator:69），context 中有 `totalSkills`
- **effects[]**：包含 `{ type: 'passive', modifier: 'max_skill_level', value: 1 }`，供 queryRelicFlag 读取
- **双 Flag**：同时出现在 enchant_lock 和 max_skill_level 数组中

#### pure_heart（纯粹之心）❤️
- **增益**：产出者效果 ×3（global ×3.0, condition: current_skill_is_producer）
- **限制**：producer_only（新 Flag）
- **新增 queryRelicFlag case**：
```typescript
case 'producer_only':
  return (RELIC_FLAGS['producer_only'] || []).some(id => state.player.relics.has(id))
```
- **商店集成**（shop.ts generateShopItems）：
```typescript
if (queryRelicFlag('producer_only') === true) {
  weights.converter = 0;
  weights.connector = 0;
  weights.amplifier = 0;
}
```
- **获取时处理**：遍历 `state.player.bindings` 和 `state.player.skills`，移除所有非产出者技能 + 浮字 '纯粹之心：非产出者已移除!'
- **注意**：移除技能时也需清理 `enchantedSkills`、`growthValues`、`amplifierStacks` 等关联状态

#### minimalist（极简主义）🔲
- **增益**：所有技能视为 Lv3 → 词结算 ×2（on_word_complete multiply +1.0，等效于沉默誓约的加算模式）
  - 但实际增益更复杂：Lv3 技能数值 > Lv1 数值，所以"视为 Lv3"的主要增益是通过实际升级技能实现的
- **限制**：max_skill_count=5 + max_skill_level=3（防止超过 Lv3，虽然 3 已是默认上限，放入 RELIC_FLAGS 确保一致性）
- **获取时处理**：
  1. 遍历 `state.player.skills`，将所有技能 level 设为 3
  2. 对新升至 Lv3 的技能触发 `checkAutoEnchantment`（让玩家选附魔）
  3. 浮字 '极简主义：所有技能升至 Lv3!'
- **新购买技能**：在 shop.ts 购买技能后，如果 minimalist 激活，立即将 level 设为 3 + 触发附魔
- **新增 queryRelicFlag case**：
```typescript
case 'max_skill_count': {
  const ids = (RELIC_FLAGS['max_skill_count'] || []).filter(id => state.player.relics.has(id))
  if (ids.length === 0) return Infinity
  return Math.min(...ids.map(id => {
    const eff = RELICS[id]?.effects.find(e => e.modifier === 'max_skill_count')
    return eff?.value ?? Infinity
  }))
}
```
- **商店集成**（shop.ts generateShopItems）：
```typescript
const maxSkillCount = queryRelicFlag('max_skill_count') as number;
if (maxSkillCount !== Infinity) {
  const currentCount = state.player.skills.size;
  if (currentCount >= maxSkillCount) {
    // 不生成新技能商品，只保留升级选项
  }
}
```
- **RelicModifierType 扩展**：添加 `| 'max_skill_count'`

### RELIC_FLAGS 最终状态

```typescript
export const RELIC_FLAGS: Record<string, string[]> = {
  connector_lock: ['chain_ban'],
  enchant_lock: ['no_enchant_vow', 'keyboard_flood'],
  max_skill_level: ['keyboard_flood', 'minimalist'],
  producer_only: ['pure_heart'],
  max_skill_count: ['minimalist'],
}
```

### 遗物获取时的副作用

pure_heart 和 minimalist 有获取时的一次性副作用。推荐在 `initRelicState`（RelicPipeline.ts:144）中处理，或在调用 `initRelicState` 的地方（遗物获取流程）添加新的初始化逻辑。

**关键**：副作用必须在获取遗物时立即执行，不能延迟到下次商店/战斗。

### 已有条件类型复用

| 条件 | ConditionEvaluator case | 用途 |
|------|------------------------|------|
| `current_skill_is_producer` | L121 | pure_heart 增益条件 |
| `total_skills_gte` | L69 | keyboard_flood ≥15 技能条件 |

无需新增条件类型。

### 商店集成关键细节

**generateShopItems** 中现有检查点扩展：

```typescript
// 现有（30-1）
if (queryRelicFlag('connector_lock') === true) weights.connector = 0;

// 新增（30-2）
if (queryRelicFlag('producer_only') === true) {
  weights.converter = 0;
  weights.connector = 0;
  weights.amplifier = 0;
}
```

**max_skill_count 新检查点**（在新技能生成逻辑区域）：
- 当 `state.player.skills.size >= maxSkillCount` 时，跳过新技能生成
- 升级选项不受 max_skill_count 影响（minimalist 鼓励少而精）

**minimalist 购买后处理**（在 shop.ts buyShopItem 结果处理区域）：
- 如果 `queryRelicFlag('max_skill_count')` 有限制值（即 minimalist 激活）
- 新购买的技能立即 `state.player.skills.get(id).level = 3`
- 调用 `checkAutoEnchantment(id)` 触发附魔流程

### 测试重点

1. **工厂验证**：每个遗物的 Modifier[] 结构（trigger、layer、effect、condition）
2. **Flag 映射**：RELIC_FLAGS 中每个 flag 包含正确的遗物 ID
3. **条件管道**：keyboard_flood 的 total_skills_gte 在 15 以下不触发
4. **queryRelicFlag 新 case**：producer_only 返回 boolean，max_skill_count 返回数值
5. **获取副作用**：pure_heart 移除非产出者，minimalist 升级技能到 Lv3
6. **计数断言**：RELICS 30→35, RELIC_MODIFIER_DEFS 30→35, legendary 4→9, icon 188→193

### 稀有度与定价

| 遗物 | 稀有度 | basePrice | 设计理由 |
|------|--------|-----------|----------|
| chain_ban | legendary | 80 | 和 silence_vow 同级 |
| no_enchant_vow | legendary | 80 | 和 silence_vow 同级 |
| keyboard_flood | legendary | 100 | 更复杂的构筑定义 |
| pure_heart | legendary | 100 | 最强限制（移除已有技能） |
| minimalist | legendary | 100 | 最复杂的机制 |

### 图标选择（需验证唯一性）

| 遗物 | 图标 | 理由 |
|------|------|------|
| chain_ban | ⛓️ | 链条 → 禁止链式 |
| no_enchant_vow | 🚫 | 禁止符号 → 无附魔 |
| keyboard_flood | ⌨️ | 键盘 → 键盘洪水（原 🌊 与 boss_drift 冲突） |
| pure_heart | ❤️ | 纯粹之心 |
| minimalist | 🔲 | 极简方块 |

### Project Structure Notes

- 所有遗物数据在 `data/relics.ts`（纯数据层，无系统依赖）
- queryRelicFlag 在 `systems/relics/RelicPipeline.ts`（系统层）
- 商店检查点在 `systems/shop.ts`（系统层）
- 技能触发检查点在 `systems/skills.ts`（系统层）
- 依赖方向：data → systems（正确）
- 测试按 Tier 分文件：`relics.t4.test.ts`

### References

- [Source: docs/planning-artifacts/relic-system-redesign.md §T4 规则改造型（6个）]
- [Source: docs/planning-artifacts/relic-implementation-plan.md §Epic 6 Story 6.2]
- [Source: docs/implementation-artifacts/30-1-restriction-framework.md — 前序 Story 完整笔记]
- [Source: src/src/data/relics.ts — RELICS, RELIC_MODIFIER_DEFS, RELIC_FLAGS]
- [Source: src/src/systems/relics/RelicPipeline.ts:67-104 — queryRelicFlag]
- [Source: src/src/systems/shop.ts:179-244 — 商店限制检查点]
- [Source: src/src/systems/skills.ts:797-846 — 连接者限制检查点]
- [Source: src/src/systems/modifiers/ConditionEvaluator.ts:69,121 — total_skills_gte, current_skill_is_producer]

### 前序 Story 模式

Story 30-1 建立的限制框架模式：
- `RELIC_FLAGS: Record<string, string[]>` 映射 flag → 遗物 ID 列表
- `queryRelicFlag(flag)` switch-case 查询，boolean/number 返回值
- 检查点：商店生成（weights=0 / levelCap）+ 连接者触发（early return）+ 附魔选择（early return + 浮字）
- 遗物增益走 `RELIC_MODIFIER_DEFS` 工厂 → Modifier 管道 → EffectPipeline.resolve()

Story 29-2 建立的多遗物 Story 模式：
- 批量添加 RELICS 数据 + RELIC_MODIFIER_DEFS 工厂
- 测试更新：遗物数量、稀有度分布、图标注册表、MODIFIER_DEFS 计数（多个测试文件）
- 使用 `relicMod()` 工具函数构造 Modifier

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — clean implementation.

### Completion Notes List

1. **5 个 T4 遗物数据** — chain_ban(⛓️,80g), no_enchant_vow(🚫,80g), keyboard_flood(⌨️,100g), pure_heart(❤️,100g), minimalist(🔲,100g)，全部 legendary。
2. **5 个工厂函数** — chain_ban/no_enchant_vow 无条件 global 乘法；keyboard_flood 条件型 total_skills_gte=15；pure_heart 条件型 current_skill_is_producer ×3；minimalist on_word_complete multiply +1.0。
3. **RELIC_FLAGS 5 条** — connector_lock→chain_ban, enchant_lock→no_enchant_vow+keyboard_flood, max_skill_level→keyboard_flood+minimalist, producer_only→pure_heart, max_skill_count→minimalist。
4. **queryRelicFlag +2 case** — producer_only(boolean), max_skill_count(number/Infinity)。
5. **商店集成 3 检查点** — producer_only 将 converter/connector/amplifier 权重归 0；max_skill_count 达上限时不生成新技能；购买新技能后 minimalist 自动升级至 max_skill_level。
6. **获取时副作用** — pure_heart: initRelicState 移除非产出者技能+清理绑定/附魔/成长/增幅状态；minimalist: initRelicState 升级所有技能至 Lv3。
7. **RelicModifierType +1** — 添加 `max_skill_count` 成员。
8. **图标冲突修复** — keyboard_flood 原设计 🌊 与 boss_drift 冲突，改为 ⌨️。
9. **测试 44 个** — relics.t4.test.ts 从 8 扩展至 44（queryRelicFlag 12 + RELIC_FLAGS 6 + 数据 4 + 工厂 15 + 副作用 3 + 生产验证 4）。
10. **计数更新** — RELICS 30→35, RELIC_MODIFIER_DEFS 30→35, legendary 4→9, iconRegistry 188→193。
11. **全量测试**: 2817 passed, 42 pre-existing audio failures.
12. **[Code Review Fix]** weightedPick fallback 路径补全权重检查：producer 和 converter fallback 均添加 `weights.xxx > 0` 守卫，防止 producer_only/connector_lock 被 fallback 绕过。
13. **[Code Review Fix]** pure_heart initRelicState bindings 清理改为先收集 key 再批量删除，避免迭代中修改 Map。
14. **[Code Review Fix]** minimalist initRelicState 添加注释说明 checkAutoEnchantment 由 checkPendingEnchantments 在商店打开时补偿触发（循环依赖限制）。
15. **[Code Review Fix]** Dev Notes 图标表格 keyboard_flood 🌊→⌨️ 同步更新。

### File List

| 文件 | 操作 |
|------|------|
| `src/src/data/relics.ts` | 修改：+5 RELICS 数据 + 5 工厂 + RELIC_FLAGS 填充 + RelicModifierType 扩展 |
| `src/src/systems/relics/RelicPipeline.ts` | 修改：queryRelicFlag +2 case + initRelicState 副作用 + import isProducer/showFeedback |
| `src/src/systems/shop.ts` | 修改：producer_only 权重归 0 + max_skill_count 检查 + minimalist 购买自动升级 |
| `src/tests/unit/systems/relics/relics.t4.test.ts` | 修改：8→44 测试 |
| `src/tests/unit/systems/relics/relics.test.ts` | 修改：计数 30→35, legendary 4→9 |
| `src/tests/unit/systems/relics/relics.t1.test.ts` | 修改：MODIFIER_DEFS 计数 30→35 |
| `src/tests/unit/systems/relics/relics.t2.test.ts` | 修改：MODIFIER_DEFS 计数 30→35 |
| `src/tests/unit/systems/relics/relics.t5.test.ts` | 修改：MODIFIER_DEFS 计数 30→35 |
| `src/tests/unit/data/iconRegistry.test.ts` | 修改：总数 188→193 |
