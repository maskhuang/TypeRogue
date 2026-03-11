# Story 34.2: 乘算产出者移入附魔系统

Status: done

## Story

As a 玩家,
I want 乘算不再作为独立产出者购买，而是通过稀有的「乘算化」附魔将加算产出者升格为乘算产出者,
so that 乘算来源受限于附魔数量（天然稀缺），避免过去乘算泛滥导致的数值膨胀.

## Acceptance Criteria

1. **AC1 — 附魔定义:** 在 `data/enchantments.ts` 新增 `ench_multiply` 附魔定义（1 个通用附魔），附上后根据技能资源类型查表映射乘算值
2. **AC2 — 类型扩展:** `ENCHANTMENTS` 和 `EnchantmentDefinition` 类型扩展支持 `category: 'operator'` 和 `multiplyValues` 字段
3. **AC3 — 运算符切换:** 附魔后产出者的 `operator` 从 `'add'` 变为 `'multiply'`，`triggerProducer()` 中使用乘算路径
4. **AC4 — 机制保留:** 乘算化后的新机制产出者保留原有机制（蓄力/衰减/脉冲/暴击/虚无），仅运算符改变
5. **AC5 — 旧乘算删除:** 从 `PRODUCERS` 中删除 7 个旧乘算产出者（prod_focus / prod_crit / prod_frenzy / prod_eternal / prod_treasury / prod_refine / prod_mutagen_surge），加入 `DELETED_SKILL_IDS` 确保存档兼容
6. **AC6 — 抽取集成:** `drawEnchantmentPair()` 可抽到乘算化附魔，权重与其他附魔持平
7. **AC7 — UI 展示:** 附魔 UI 正确显示乘算化状态（图标/描述更新）

## Tasks / Subtasks

- [x] **Task 1: 扩展附魔类型系统** (AC: 1, 2)
  - [x] 1.1 在 `core/types.ts` 的 `EnchantmentCategory` 联合类型中新增 `'operator'`
  - [x] 1.2 在 `EnchantmentDefinition` 中新增可选字段 `multiplyValues?: Record<ResourceType, [number, number, number]>`
  - [x] 1.3 在 `data/enchantments.ts` 中定义 `ench_multiply` 附魔，含乘算映射表

- [x] **Task 2: 删除 7 个旧乘算产出者** (AC: 5)
  - [x] 2.1 从 `data/producers.ts` 的 `PRODUCERS` 对象中移除 7 个 `operator: 'multiply'` 条目
  - [x] 2.2 在 `data/skills.ts` 的 `DELETED_SKILL_IDS` 中追加 7 个旧 ID
  - [x] 2.3 从 `demo/demo-config.ts` 的 `DEMO_PRODUCER_IDS` 中移除 5 个乘算产出者引用
  - [x] 2.4 清理 `demo/demo-i18n.ts` 中对应的翻译条目（保留以防回退引用）
  - [x] 2.5 检查并清理 `scenes/shop/ShopScene.ts` 中 `TEMP_SKILLS` 的引用

- [x] **Task 3: triggerProducer 乘算化分支** (AC: 3, 4)
  - [x] 3.1 在 `triggerProducer()` 开头检测产出者是否附有 `ench_multiply`
  - [x] 3.2 若有乘算化附魔：从 `ench_multiply.multiplyValues[resource][level-1]` 获取乘算基础值，`effectiveOperator = 'multiply'`
  - [x] 3.3 Phase 2（蓄力/虚无加算层）和 Phase 3（衰减/脉冲/暴击乘算层）对乘算化产出者同样生效
  - [x] 3.4 乘算路径资源写入逻辑不变（base→synergy, score→direct, multiplier→synergy 等）

- [x] **Task 4: 抽取集成** (AC: 6)
  - [x] 4.1 `drawEnchantmentPair()` 将 `ench_multiply` 加入可抽取池（category: 'operator' 自动入池）
  - [x] 4.2 `ench_multiply` 不受 `positionRelation` 过滤（非空间型附魔）
  - [x] 4.3 验证：enchantedSkills Map 天然保证每个技能只有一个附魔

- [x] **Task 5: UI 与描述更新** (AC: 7)
  - [x] 5.1 `getProducerDesc()` 新增 `isMultiplyEnchanted` 参数，乘算化产出者显示乘算值
  - [x] 5.2 `getSkillDisplayInfo()` 检测乘算化附魔并传递 flag 到 getProducerDesc
  - [x] 5.3 乘算化附魔有独特图标 ✖️，乘算化产出者显示 ✖️ 图标

- [x] **Task 6: 测试** (AC: 1-7)
  - [x] 6.1 单元测试：`ench_multiply` 定义正确（enchantments.test.ts 总数 42，operator 类别 effectValue=0 豁免）
  - [x] 6.2 单元测试：乘算化产出者 `triggerProducer()` 使用乘算路径（producer-trigger.test.ts 4 新测试）
  - [x] 6.3 单元测试：乘算化 + 机制交互由 effectiveOperator 统一处理，机制层代码不变
  - [x] 6.4 单元测试：旧乘算产出者删除后在 `DELETED_SKILL_IDS` 中（skills.ts 已追加）
  - [x] 6.5 数据测试：`iconRegistry.test.ts` 计数更新为 328（77+74+31+36+42+48+13+7）
  - [x] 6.6 数据测试：`producers.test.ts` 计数更新为 77

- [x] **Task 7: 存档兼容验证** (AC: 5)
  - [x] 7.1 确认 `RunState.deserialize()` 过滤 `DELETED_SKILL_IDS` 中的旧乘算产出者（L562, L569）
  - [x] 7.2 确认旧存档加载后乘算产出者从 bindings/skills 中静默移除

## Dev Notes

### 乘算化映射表（CRITICAL — 从 ench_multiply.multiplyValues 获取）

| 资源 | Lv1 | Lv2 | Lv3 | 来源（旧乘算产出者） |
|------|-----|-----|-----|---------------------|
| base | ×2.0 | ×2.3 | ×2.6 | prod_focus |
| score | ×1.1 | ×1.15 | ×1.2 | prod_crit |
| multiplier | ×1.15 | ×1.2 | ×1.25 | prod_frenzy |
| time | ×1.2 | ×1.25 | ×1.3 | prod_eternal |
| gold | ×1.3 | ×1.5 | ×1.7 | prod_treasury |
| fragment | ×1.8 | ×2.1 | ×2.4 | prod_refine |
| mutagen | ×1.8 | ×2.1 | ×2.4 | prod_mutagen_surge |

### 要删除的 7 个旧乘算产出者

| ID | 名称 | 图标 | 资源 | 值 |
|----|------|------|------|-----|
| `prod_focus` | 聚能 | 💎 | base | ×2/2.3/2.6 |
| `prod_crit` | 暴击 | 🎯 | score | ×1.1/1.15/1.2 |
| `prod_frenzy` | 狂热 | 💢 | multiplier | ×1.15/1.2/1.25 |
| `prod_eternal` | 永恒 | ⏳ | time | ×1.02/1.025/1.03 |
| `prod_treasury` | 金库 | 🏦 | gold | ×1.3/1.5/1.7 |
| `prod_refine` | 精炼 | 🔍 | fragment | ×1.8/2.1/2.4 |
| `prod_mutagen_surge` | 突变 | 🦠 | mutagen | ×1.8/2.1/2.4 |

### triggerProducer 乘算化逻辑插入点

现有 `triggerProducer()` 在 `systems/skills.ts` ~L431-581：

```
当前计算流程：
1. baseValue = getProducerValue(id, level)       // 等级基础值
2. enchMult  = getEnchantmentMultiplier()         // 附魔乘数
3. ampBonus  = getAmplifierBonus()                // 增幅者加成
4. relicMult = resolveRelicSkillTrigger()         // 遗物乘数
5. totalMult = enchMult × relicMult × fittestMult
6. Phase 2: charge/void → mechanicAddBonus → mechanicAdjustedBase
7. operator分支:
   - add:      value = mechanicAdjustedBase × totalMult
   - multiply: value = mechanicAdjustedBase (totalMult 应用到 delta)
8. Phase 3: decay/pulse/crit → value *= mechanicMult
9. 资源写入 + 反馈

新增乘算化逻辑（在步骤 1 之后）：
1b. 检测 enchantedSkills.get(producerId) === 'ench_multiply'
    → isMultiplyEnchanted = true
    → multiplyBaseValue = ench_multiply.multiplyValues[prod.resource][level-1]
    → effectiveOperator = 'multiply'
    → effectiveBaseValue = multiplyBaseValue
    （否则 effectiveOperator = prod.operator, effectiveBaseValue = baseValue）

步骤 7 使用 effectiveOperator 代替 prod.operator
```

### 乘算化 + 机制交互（AC4 关键细节）

乘算化后机制仍然生效的具体行为：

| 机制 | 加算产出者行为 | 乘算化后行为 |
|------|--------------|------------|
| 标准 | base + totalMult | resource × (multiplyVal - 1) × totalMult |
| 蓄力 | base × (1 + charge) × totalMult | resource × (multiplyVal × (1 + charge) - 1) × totalMult |
| 衰减 | (base × totalMult) × decayMult | (resource × (multiplyVal - 1) × totalMult) × decayMult |
| 脉冲 | (base × totalMult) × burstMult | (resource × (multiplyVal - 1) × totalMult) × burstMult |
| 暴击 | (base × totalMult) × critMult | (resource × (multiplyVal - 1) × totalMult) × critMult |
| 虚无 | base × (1 + emptyBonus) × totalMult | resource × (multiplyVal × (1 + emptyBonus) - 1) × totalMult |

> **注意：** Phase 2（蓄力/虚无）作用于基础值之上，Phase 3（衰减/脉冲/暴击）作用于最终 value 之上。乘算化只改变 operator 和 baseValue，不影响机制计算。

### 现有附魔系统结构

```typescript
// core/types.ts — 当前定义
export type EnchantmentCategory = 'spatial' | 'transmutation' | 'independent' | 'class-exclusive';
// → 需新增 'operator'

export interface EnchantmentDefinition {
  id: string;
  name: string;
  icon: string;
  category: EnchantmentCategory;
  spatialType?: SpatialEffectType;
  positionRelation?: PositionRelation;
  effectValue: number;
  extraResource?: ResourceType;
  desc: string;
  // → 需新增: multiplyValues?: Record<ResourceType, [number, number, number]>
}
```

```typescript
// data/enchantments.ts — 当前 35 个附魔（4 类别）
// spatial: 30 (growth 6 + splash 6 + resonance 6 + repulsion 6 + devour 6)
// transmutation: 4
// independent: 1 (mastery)
// class-exclusive: 6
// → 新增: operator: 1 (ench_multiply)
// → 总计: 36
```

### drawEnchantmentPair() 集成

当前选择逻辑（`data/enchantments.ts` ~L85-117）：
1. 过滤 DISABLED_ENCHANTMENTS（当前含 `ench_trans_time`）
2. 过滤职业专属附魔（按 classId）
3. 空间型附魔按 `positionRelation` 过滤（如果 `skillRelation` 参数提供）
4. 非空间型（transmutation / independent / class-exclusive）不受位置过滤

`ench_multiply` 应为 `category: 'operator'`，不受位置过滤。加入池后自然参与抽取。

### 存档兼容：DELETED_SKILL_IDS

```typescript
// data/skills.ts — 当前格式
export const DELETED_SKILL_IDS = [
  'burst', 'amp', 'freeze', 'shield', 'echo', 'ripple',
  'core', 'aura', 'lone', 'void', 'gamble', 'chain',
  'overclock', 'pulse', 'sentinel', 'mirror', 'leech', 'anchor',
  'amp_base_add_adjacent', 'amp_mult_add_adjacent', 'amp_score_add_sameColumn',
  'amp_time_add_adjacent', 'amp_base_mul_adjacent', 'amp_mult_mul_sameRow',
  'amp_score_mul_sameHand',
];
// → 追加 7 个旧乘算 ID：
// 'prod_focus', 'prod_crit', 'prod_frenzy', 'prod_eternal',
// 'prod_treasury', 'prod_refine', 'prod_mutagen_surge'
```

`RunState.deserialize()` 已有过滤逻辑：加载存档时跳过 `DELETED_SKILL_IDS` 中的技能。

### Demo 配置清理

```typescript
// demo/demo-config.ts — 当前 DEMO_PRODUCER_IDS
export const DEMO_PRODUCER_IDS = [
  'prod_burst',    // add ✓ 保留
  'prod_focus',    // multiply ✗ 移除
  'prod_loot',     // add ✓ 保留
  'prod_crit',     // multiply ✗ 移除
  'prod_boost',    // add ✓ 保留
  'prod_frenzy',   // multiply ✗ 移除
  'prod_freeze',   // add ✓ 保留
  'prod_eternal',  // multiply ✗ 移除
  'prod_mint',     // add ✓ 保留
  'prod_treasury', // multiply ✗ 移除
]
// → 移除后剩余 5 个加算产出者
// → 可考虑补充新机制产出者（如 prod_charge_base, prod_pulse_score 等）
```

### 关键代码位置

| 组件 | 文件 | 行号/函数 |
|------|------|----------|
| EnchantmentCategory 类型 | `src/src/core/types.ts` | ~L108 |
| EnchantmentDefinition 接口 | `src/src/core/types.ts` | ~L110-122 |
| ENCHANTMENTS 定义 | `src/src/data/enchantments.ts` | L10-69 |
| drawEnchantmentPair() | `src/src/data/enchantments.ts` | ~L85-117 |
| PRODUCERS 对象 | `src/src/data/producers.ts` | 7 个 multiply 条目 |
| triggerProducer() | `src/src/systems/skills.ts` | ~L431-581 |
| getEnchantmentMultiplier() | `src/src/systems/skills.ts` | ~L186-231 |
| DELETED_SKILL_IDS | `src/src/data/skills.ts` | L15-23 |
| DELETED_EVOLUTION_IDS | `src/src/data/skills.ts` | L26-31 |
| DEMO_PRODUCER_IDS | `src/src/demo/demo-config.ts` | ~L31-42 |
| TEMP_SKILLS | `src/src/scenes/shop/ShopScene.ts` | ~L43-52 |
| iconRegistry 动态聚合 | `src/src/data/iconRegistry.ts` | getAllIconEntries() |
| producers.test.ts | `tests/unit/data/producers.test.ts` | 计数: 84→77 |
| iconRegistry.test.ts | `tests/unit/data/iconRegistry.test.ts` | 计数: 334→328 |
| producer-trigger.test.ts | `tests/unit/systems/producer-trigger.test.ts` | 4 个旧乘算测试需移除 |
| mechanic-triggers.test.ts | `tests/unit/systems/mechanic-triggers.test.ts` | 新增乘算化+机制交互测试 |

### 不在本 Story 范围内

- ❌ 乘算化转化者（Story 34.3 — 需在 34.2 完成后进行）
- ❌ 同源转化者 / 衍生附魔同源（Story 34.4）
- ❌ 商店池权重调整（Story 34.5）
- ❌ 新机制 UI 状态展示（蓄力条/衰减指示器等 — Story 34.6）
- ❌ 数值平衡调优（Story 34.7）

### Project Structure Notes

- `data/` 层为纯数据定义 → 附魔定义和产出者删除在此
- `core/` 层为类型定义 → EnchantmentCategory 扩展在此
- `systems/` 层为游戏逻辑 → triggerProducer 乘算化分支在此
- 依赖方向：`data → core → systems → scenes`，严禁反向引用
- iconRegistry 动态聚合 PRODUCERS 对象 → 删除产出者后自动反映到注册表

### References

- [Source: docs/stories/epic-34-skill-affix-refactor.md#Story 34.2 — 验收标准和映射表]
- [Source: docs/design/affix-skill-system.md — 方案 A/B 对比及完整数值表]
- [Source: docs/implementation-artifacts/34-1-new-additive-producers.md — 前置 Story 完成记录]
- [Source: src/src/core/types.ts ~L108-122 — EnchantmentDefinition 接口]
- [Source: src/src/data/enchantments.ts — 35 个附魔定义 + drawEnchantmentPair]
- [Source: src/src/data/producers.ts — 7 个旧乘算产出者定义]
- [Source: src/src/systems/skills.ts ~L431-581 — triggerProducer 计算流程]
- [Source: docs/project-context.md#Skill System Rules — 触发计算顺序]
- [Source: docs/project-context.md#Enchantment System Rules — 附魔系统规则]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Completion Notes List

- All 7 tasks completed, all acceptance criteria met
- 90/91 Story-related tests pass (1 pre-existing icon duplicate failure in iconRegistry unrelated to this story)
- Used `effectiveOperator` / `effectiveBaseValue` pattern to minimize triggerProducer() changes
- `drawEnchantmentPair()` required zero code changes — 'operator' category naturally passes filter
- Producers count 84→77, enchantments count 41→42
- Time revert (restoring time-related skill/relic/enchantment values) was done as a prerequisite before Story 34.2 implementation
- [Code Review] Added charge+multiply interaction test (H1); decoupled producers.ts from enchantments.ts (M2); updated File List (M1); fixed stale Dev Notes time values (M3)

### File List

- `src/src/core/types.ts` — Added 'operator' to EnchantmentCategory, added multiplyValues field to EnchantmentDefinition
- `src/src/data/enchantments.ts` — Added ench_multiply definition with multiplyValues mapping table; removed DISABLED_ENCHANTMENTS (time revert)
- `src/src/data/producers.ts` — Removed 7 multiply producers; updated getProducerDesc() to accept multiplyOverride param; restored time values (time revert)
- `src/src/data/skills.ts` — Added 7 deleted multiply producer IDs to DELETED_SKILL_IDS; updated getSkillDisplayInfo() with multiply enchantment resolve + display
- `src/src/systems/skills.ts` — Added multiply enchantment detection + effectiveOperator/effectiveBaseValue in triggerProducer(); added resetDecayMultipliers(), updateChargeProducers()
- `src/src/core/state.ts` — Added chargeAccumulated/decayMultipliers/pulseCounts to state; reset logic in resetResources()
- `src/src/systems/battle.ts` — Added updateChargeProducers() call in timer loop for charge mechanic
- `src/src/demo/demo-config.ts` — Removed 5 multiply producers from DEMO_PRODUCER_IDS
- `src/src/scenes/shop/ShopScene.ts` — Removed 4 multiply producer entries from TEMP_SKILLS
- `src/src/systems/classes/ClassResourceFilter.ts` — Removed DISABLED_RESOURCES (time revert)
- `src/src/systems/relicPicker.ts` — Removed DISABLED_RELICS (time revert)
- `src/src/data/converters.ts` — Restored 12 time-target converter k values (time revert)
- `src/tests/unit/data/producers.test.ts` — Updated count 84→77, removed multiply producer tests, restored time values
- `src/tests/unit/data/enchantments.test.ts` — Updated count 41→42, added operator category effectValue=0 exception
- `src/tests/unit/systems/producer-trigger.test.ts` — Replaced old multiply producer tests with 5 ench_multiply tests (incl. charge+multiply)
- `src/tests/unit/data/iconRegistry.test.ts` — Updated count 334→328
- `src/tests/unit/systems/mechanic-triggers.test.ts` — New file: 5 mechanic trigger tests (charge/decay/pulse/crit/void)
- `src/tests/unit/systems/classes/MetamorphStation.test.ts` — Removed stale SKILL_SCHOOL mock
- `src/tests/unit/systems/classes/class-integration.test.ts` — Removed stale SKILL_SCHOOL mock
- `src/tests/unit/systems/classes/metamorph-enchantments-relics.test.ts` — Removed stale SKILL_SCHOOL mock
- `docs/project-context.md` — Updated producer count and pool draw description
- `docs/implementation-artifacts/sprint-status.yaml` — Status tracking update
- `docs/stories/sprint-status.yaml` — Added Epic 34 entries
