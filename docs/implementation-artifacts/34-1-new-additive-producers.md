# Story 34.1: 新增加算产出者（5 种机制 × 7 资源）

Status: done

## Story

As a 玩家,
I want 商店里有更多种类有趣的加算产出者（而非仅数值不同的重复品）,
so that 我在构建 build 时有更多策略选择，且不依赖乘算来获得数值深度.

## Acceptance Criteria

1. **AC1 — 数据定义:** 在 `data/producers.ts` 中定义新产出者（5 机制 × 7 资源），使用现有加算产出者的 `values` 作为基础值
2. **AC2 — 蓄力(Charge):** 未触发时每秒积攒 +8% 产出（上限 200%），触发时释放全部蓄力并清零；战斗 tick 中更新蓄力值
3. **AC3 — 衰减(Decay):** 首次触发 ×2.0，每次触发后 -0.15，下限 0.5；每个新词重置为 2.0
4. **AC4 — 脉冲(Pulse):** 维护 triggerCount，每第 4 次触发 ×3.0；每关重置计数
5. **AC5 — 暴击(Crit):** 每次触发 50% 概率 ×2.0
6. **AC6 — 虚无(Void):** 每种资源有 6 个变体（6 种 PositionRelation），使用 `keyboardTopology.ts` 计算空位数，按 bonusPerSlot 值（Adjacent 25%、SameRow 10%、SameColumn 30%、SameHand 5%、SameFinger 35%、Symmetric 50%）
7. **AC7 — 运行时状态:** `SkillRuntimeState` 新增字段 `chargeAccumulated`、`currentDecayMult`、`triggerCount`
8. **AC8 — 触发计算:** `triggerProducer()` 中按产出者机制类型分支计算
9. **AC9 — 反馈:** 新产出者正确触发视觉反馈（`showTriggerPopup` / `showFeedback`）和音效（`emitResourceSound`）

## Tasks / Subtasks

- [x] **Task 1: 扩展类型定义** (AC: 1, 7)
  - [x] 1.1 在 `core/types.ts` 的 `ProducerDefinition` 中新增 `mechanic` 字段（`'standard' | 'charge' | 'decay' | 'pulse' | 'crit' | 'void'`）
  - [x] 1.2 新增机制参数接口：`ChargeParams`、`DecayParams`、`PulseParams`、`CritParams`、`VoidParams`
  - [x] 1.3 在 `ProducerDefinition` 中添加可选的 `mechanicParams` 字段
  - [x] 1.4 扩展 `GameState` 新增运行时状态 Map（`chargeAccumulated`、`decayMultipliers`、`pulseCounts`）

- [x] **Task 2: 定义新产出者数据** (AC: 1, 6)
  - [x] 2.1 定义 7 个蓄力产出者：`prod_charge_base` ~ `prod_charge_mutagen`，参数 `{ gainPerSec: 0.08, maxBonus: 2.0 }`
  - [x] 2.2 定义 7 个衰减产出者：`prod_decay_base` ~ `prod_decay_mutagen`，参数 `{ initialMult: 2.0, decayPerTrigger: 0.15, floor: 0.5 }`
  - [x] 2.3 定义 7 个脉冲产出者：`prod_pulse_base` ~ `prod_pulse_mutagen`，参数 `{ interval: 4, burstMult: 3.0 }`
  - [x] 2.4 定义 7 个暴击产出者：`prod_crit_base` ~ `prod_crit_mutagen`，参数 `{ chance: 0.5, critMult: 2.0 }`
  - [x] 2.5 定义 42 个虚无产出者：每资源 × 6 PositionRelation 变体，如 `prod_void_base_adjacent`，参数含 `{ posRel, bonusPerSlot }`
  - [x] 2.6 所有新产出者的 `operator` 统一为 `'add'`，`values` 复用对应资源的现有加算基础值
  - [x] 2.7 fragment/mutagen 类产出者通过 `isResourceActiveForClass` 自动过滤（无需手动标记）

- [x] **Task 3: 实现运行时状态管理** (AC: 7)
  - [x] 3.1 在 `createInitialState()` 中初始化新 Map（参考现有 `amplifierStacks`/`devourCounters` 模式）
  - [x] 3.2 在 `resetResources()` 中清零蓄力、脉冲计数（每关重置）
  - [x] 3.3 衰减状态在词边界重置（`resetDecayMultipliers()` 在 `resetWordResourceTypes()` 中调用）
  - [x] 3.4 技能拾取时自动初始化（Map.get 使用默认值，无需显式初始化）

- [x] **Task 4: 实现蓄力机制** (AC: 2)
  - [x] 4.1 在战斗 tick（`battle.ts` 的 setInterval 100ms）中调用 `updateChargeProducers(0.1)` 累加充能
  - [x] 4.2 在 `triggerProducer()` 中检测蓄力机制：取 `chargeAccumulated` 作为加算 bonusPercent，然后清零

- [x] **Task 5: 实现衰减机制** (AC: 3)
  - [x] 5.1 在 `triggerProducer()` Phase 3 中应用 `decayMultipliers` 乘算
  - [x] 5.2 触发后递减：`max(floor, current - decayPerTrigger)`
  - [x] 5.3 在词边界 `resetDecayMultipliers()` 将所有衰减产出者重置为 `initialMult`

- [x] **Task 6: 实现脉冲机制** (AC: 4)
  - [x] 6.1 在 `triggerProducer()` Phase 3 中递增 `pulseCounts`，`count % interval === 0` 时应用 `burstMult`

- [x] **Task 7: 实现暴击机制** (AC: 5)
  - [x] 7.1 在 `triggerProducer()` Phase 3 中使用 `random() < chance` 判定暴击（seeded random）

- [x] **Task 8: 实现虚无机制** (AC: 6)
  - [x] 8.1 在 `triggerProducer()` Phase 2 中调用 `getKeysWithRelation(triggerKey, posRel)` 计算空位数
  - [x] 8.2 空位数 × `bonusPerSlot` 作为加算 bonusPercent
  - [x] 8.3 当 `triggerKey` 缺失时（链/复制触发），虚无加成为 0（安全降级）

- [x] **Task 9: 视觉与音频反馈** (AC: 9)
  - [x] 9.1 `showTriggerPopup` 和 `showFeedback` 自动适配新产出者（无需改动）
  - [x] 9.2 `emitResourceSound` 通过 `prod.resource` 自动使用正确的资源类型
  - [x] 9.3 暴击命中时 `scale = max(scale, 2.0)` 并添加 💥 前缀增强反馈

- [x] **Task 10: 辅助函数更新** (AC: 1)
  - [x] 10.1 更新 `getProducerDesc()` 以展示机制关键词（如 `⚔️基数+5(蓄力)`，虚无含位置关系 `(虚无·相邻)`）
  - [x] 10.2 `isProducer()` 自动兼容新 ID（基于 `PRODUCERS` 字典查找，无需改动）
  - [x] 10.3 `getSkillSchool()` 改为检查 `skillId in PRODUCERS`，自动兼容所有新产出者

## Dev Notes

### 产出者计算流程（CRITICAL — 必须遵守）

现有 `triggerProducer()` 在 `systems/skills.ts` ~L406-514，计算顺序：

```
1. baseValue = getProducerValue(id, level)       // 等级基础值
2. enchMult  = getEnchantmentMultiplier()         // 附魔乘数（含 growth/mastery 等）
3. ampBonus  = getAmplifierBonus()                // 增幅者加成
4. relicMult = resolveRelicSkillTrigger()         // 遗物乘数
5. totalMult = enchMult × relicMult × fittestMult
6. → add: value = baseValue × totalMult
   → multiply: delta = resource × (value-1) × totalMult
7. 写入资源 → 后触发（splash/transmutation/connector/resonance）
```

**新机制插入点：**
- **蓄力 & 虚无** → Phase 2（加算层），加入 `bonusPercent`，在步骤 2 附近：`output *= (1 + bonusPercent)`
- **衰减 / 脉冲 / 暴击** → Phase 3（乘算层），在步骤 5-6 之间独立相乘

### 资源路由规则（CRITICAL）

| 资源 | 写入目标 | 备注 |
|------|---------|------|
| `base` | `synergy.skillBaseScore` | 非 `state.resources.base` |
| `multiplier` | `synergy.skillMultBonus` | 非 `state.resources.multiplier` |
| `score` | `state.resources.score` | 直接写入 |
| `time/gold/fragment/mutagen` | `state.resources[type]` | 直接写入 |

**不要** 修改资源路由逻辑，新产出者走现有路径即可。

### 运行时状态生命周期

| 状态 | 作用域 | 重置时机 | 参考模式 |
|------|-------|---------|---------|
| `chargeAccumulated` | 每关 | `resetResources()` | `amplifierStacks` |
| `currentDecayMult` | 每词 | `resetWordState()` | `_wordResourceTypes` |
| `triggerCount`（脉冲） | 每关 | `resetResources()` | `devourCounters` |
| 暴击 | 无状态 | N/A | — |
| 虚无 | 实时计算 | N/A | repulsion 附魔 |

### 虚无产出者与现有 Repulsion 附魔的区别

- **Repulsion 附魔**：附在任意技能上，getEnchantmentMultiplier() 自动计算空位加成
- **虚无产出者**：技能本身自带空位加成机制，无需附魔。计算方式类似但在 triggerProducer() 中内嵌

两者可叠加（附魔 repulsion + 虚无产出者），但这不在 34.1 范围内。

### 蓄力的 battle tick 更新

蓄力产出者需要在战斗每帧更新充能值。参考现有的战斗 tick 更新机制（`battle.ts` 的 `update()` 函数），遍历所有绑定了蓄力产出者的技能 ID，按 `deltaTime` 累加：

```typescript
// 概念示例
for (const [skillId, params] of chargeProducers) {
  const current = state.chargeAccumulated.get(skillId) || 0;
  state.chargeAccumulated.set(skillId, Math.min(current + params.gainPerSec * dt, params.maxBonus));
}
```

**注意：** 这需要在 `battle.ts` 或 `skills.ts` 中导出一个 `updateChargeProducers(dt)` 函数，由战斗循环调用。

### 数量与 ID 命名

| 机制 | 数量 | ID 模式 | 示例 |
|------|------|---------|------|
| charge | 7 | `prod_charge_{resource}` | `prod_charge_base`, `prod_charge_score` |
| decay | 7 | `prod_decay_{resource}` | `prod_decay_base`, `prod_decay_gold` |
| pulse | 7 | `prod_pulse_{resource}` | `prod_pulse_multiplier` |
| crit | 7 | `prod_crit_{resource}` | `prod_crit_score` |
| void | 42 | `prod_void_{resource}_{posRel}` | `prod_void_base_adjacent`, `prod_void_score_symmetric` |

**总计新增：** 70 个产出者定义（28 常规 + 42 虚无变体）

> ⚠️ **注意：** Epic 指标表写的 "35 新机制"（5×7）但 AC6 明确每资源 6 个虚无变体 = 42 虚无产出者。实际新增 70 个。商店池抽取平衡在 Story 34.5 处理。

### 基础数值（复用现有加算产出者）

| 资源 | Lv1 | Lv2 | Lv3 | 来源 |
|------|-----|-----|-----|------|
| base | 5 | 8 | 12 | prod_burst |
| score | 15 | 24 | 36 | prod_loot |
| multiplier | 0.2 | 0.32 | 0.48 | prod_boost |
| time | 0.2 | 0.32 | 0.48 | prod_freeze |
| gold | 3 | 5 | 8 | prod_mint |
| fragment | 1 | 1.6 | 2.4 | prod_harvest |
| mutagen | 1 | 1.6 | 2.4 | prod_mutagen_drip |

### 时间类产出者注意

最近提交 `aad6788` 暂时禁用了所有时间类技能/遗物/附魔。新增的时间类产出者（`prod_charge_time`、`prod_decay_time` 等）定义照写，但需考虑是否加入 disabled 列表。建议：照常实现，是否启用由全局开关控制。

### 关键代码位置

| 组件 | 文件 | 行号 |
|------|------|------|
| ProducerDefinition 类型 | `src/src/core/types.ts` | ~L18-26 |
| PRODUCERS 数据 | `src/src/data/producers.ts` | L9-148 |
| triggerProducer() | `src/src/systems/skills.ts` | ~L406-514 |
| getEnchantmentMultiplier() | `src/src/systems/skills.ts` | ~L161-206 |
| Repulsion 附魔数据 | `src/src/data/enchantments.ts` | ~L36-42 |
| PositionRelation 枚举 | `src/src/data/keyboardTopology.ts` | L9-16 |
| getKeysWithRelation() | `src/src/data/keyboardTopology.ts` | L175-180 |
| GameState 初始化 | `src/src/core/state.ts` | createInitialState() |
| 资源重置 | `src/src/core/state.ts` | resetResources() |
| showFeedback() | `src/src/systems/battle.ts` | ~L1344-1347 |
| showTriggerPopup() | `src/src/systems/skills.ts` | ~L1176-1188 |
| emitResourceSound() | `src/src/effects/sound.ts` | ~L540-551 |
| RESOURCE_LABELS/ICONS | `src/src/core/constants.ts` | L68-77 |
| 战斗 tick update | `src/src/systems/battle.ts` | update() 函数 |

### 不在本 Story 范围内

- ❌ 乘算化附魔（Story 34.2）
- ❌ 虚无/蓄力等机制的专属 UI 展示（Story 34.6）
- ❌ 商店池抽取权重调整（Story 34.5）
- ❌ 数值平衡调优（Story 34.7）
- ❌ 移除旧乘算产出者（Story 34.2 处理）

### Project Structure Notes

- `data/` 层为纯数据定义，不含游戏逻辑 → 新产出者定义在此
- `systems/` 层负责游戏逻辑 → triggerProducer 修改在此
- `core/` 层为类型和状态 → 类型扩展和状态初始化在此
- 依赖方向：`data → core → systems → scenes`，严禁反向引用

### References

- [Source: docs/stories/epic-34-skill-affix-refactor.md#Story 34.1]
- [Source: docs/design/affix-skill-system.md — 方案 A 完整设计文档，虚无 bonusPerSlot 表]
- [Source: docs/project-context.md#Skill System Rules — 触发计算顺序]
- [Source: docs/project-context.md#Performance Rules — 技能计算 <2ms]
- [Source: src/src/data/producers.ts — 现有 14 个产出者定义]
- [Source: src/src/systems/skills.ts ~L406-514 — triggerProducer() 实现]
- [Source: src/src/data/keyboardTopology.ts — PositionRelation 枚举与查询函数]
- [Source: src/src/data/enchantments.ts — Repulsion 附魔 bonusPerSlot 值]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Completion Notes List

- 70 new producers generated programmatically (28 charge/decay/pulse/crit + 42 void) using name/param tables and loop generation
- Void producers use composite icons `⬛🔗` etc. (shared per posRel, 6 icons for 42 entries)
- Charge/decay/pulse/crit producers use composite icons `mechanicIcon + resourceIcon` (28 unique composites)
- Fragment/mutagen producers are filtered by `ClassResourceFilter.isResourceActiveForClass()` — no manual class marker needed
- Time producers are defined but auto-filtered by `DISABLED_RESOURCES` set in `ClassResourceFilter.ts`
- `getSkillSchool()` in `data/skills.ts` changed from manual `SKILL_SCHOOL` lookup to `skillId in PRODUCERS` for auto-detection
- Crit uses seeded `random()` from `core/seededRandom` for deterministic daily challenge replay
- Icon registry test count updated from 265 to 334 (pre-existing 📜 duplicate between converter and bossModifier is NOT from this story)
- Time producer test values updated from pre-nerf (×10) to post-nerf (×0.1) values

### File List

| File | Change |
|------|--------|
| `src/src/core/types.ts` | Added `ProducerMechanic`, `ChargeParams`, `DecayParams`, `PulseParams`, `CritParams`, `VoidParams`, `MechanicParams` types; extended `ProducerDefinition` with `mechanic?` and `mechanicParams?`; added `chargeAccumulated`, `decayMultipliers`, `pulseCounts` Maps to `GameState` |
| `src/src/core/state.ts` | Init new Maps in `createInitialState()`; clear charge/pulse in `resetResources()` |
| `src/src/data/producers.ts` | Added 70 new producers (programmatic generation); added `MECHANIC_LABELS`, name tables, param tables; updated `getProducerDesc()` with mechanic/posRel labels |
| `src/src/data/skills.ts` | Changed `getSkillSchool()` to use `skillId in PRODUCERS` instead of manual `SKILL_SCHOOL` map |
| `src/src/systems/skills.ts` | Added `resetDecayMultipliers()`, `updateChargeProducers(dt)`; modified `triggerProducer()` with Phase 2 (charge+void additive) and Phase 3 (decay+pulse+crit multiplicative); added crit feedback with 💥 prefix and boosted scale |
| `src/src/systems/battle.ts` | Added `updateChargeProducers(0.1)` call in battle timer interval |
| `tests/unit/data/producers.test.ts` | Rewritten: 44 tests covering count (84), mechanic params, values, desc labels |
| `tests/unit/data/iconRegistry.test.ts` | Updated total count from 265 to 334 |
| `tests/unit/systems/mechanic-triggers.test.ts` | New: 20 tests covering charge/decay/pulse/crit/void trigger mechanics |
| `docs/project-context.md` | Updated Producer count from 14 to 84, pool draw description |

### Code Review Fixes (Post-Review)

| Issue | Severity | Fix |
|-------|----------|-----|
| No unit tests for mechanic trigger logic | HIGH | Added `mechanic-triggers.test.ts` with 20 tests |
| PulseParams/CritParams inline import syntax | MEDIUM | Unified to top-level import in `skills.ts` |
| `SKILL_SCHOOL` dead code after `getSkillSchool()` change | MEDIUM | Removed from `data/skills.ts` and 3 test mocks |
| `project-context.md` outdated "Producer \| 14" | MEDIUM | Updated to 84 with mechanic breakdown |
