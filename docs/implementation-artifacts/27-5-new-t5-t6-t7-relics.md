# Story 27.5: T6 经济 + T7 风险回报新遗物（4 新遗物 + relicStates 基础设施）

Status: done

## Story

As a 玩家,
I want 获得经济型遗物（聚宝盆、时间银行）和新的风险回报型遗物（拉面、过载核心）,
so that 金币经济策略和风险管理成为 Run 构筑的重要决策维度。

## Acceptance Criteria

1. **cornucopia** — 每关开始时获得 +15 金币，稀有度 Common，basePrice 25
2. **time_bank** — 通关剩余时间转化为等量金币（1秒=1金币），稀有度 Rare，basePrice 55
3. **ramen** — 分数 ×1.5，每次打错 -0.1×（降至 ×1.0 时自动消失），稀有度 Rare，basePrice 45
4. **overcharge** — 产出者效果 +50%，但每次产出者触发 -0.1s 时间，稀有度 Rare，basePrice 50
5. **relicStates 基础设施** — `RunStateData` 新增 `relicStates: Record<string, number>`，支持遗物可变状态的序列化/反序列化
6. **图标唯一** — 4 个新遗物图标不与现有 177 图标冲突
7. **测试覆盖** — ≥20 个新测试覆盖 4 个遗物的触发、边界、衰减逻辑

## Tasks / Subtasks

- [x] Task 1: relicStates 基础设施 (AC: #5)
  - [x] 1.1 `src/src/core/state/RunState.ts` — `RunStateData` 新增 `relicStates: Record<string, number>`，初始值 `{}`
  - [x] 1.2 `RunState.createInitialState()` 初始化 `relicStates: {}`
  - [x] 1.3 `RunState.serialize()` / `deserialize()` 处理 `relicStates`（JSON 对象，无需 Map 转换）
  - [x] 1.4 `src/src/systems/modifiers/ModifierTypes.ts` — `PipelineContext` 新增 `relicStates?: Record<string, number>` 和 `remainingTime?: number`
  - [x] 1.5 `src/src/systems/relics/RelicPipeline.ts` — 工厂调用时传入 `relicStates: state.player.relicStates`（需在 `resolveRelicEffects` 和 `resolveRelicSkillTrigger` 中注入）
  - [x] 1.6 新增 `initRelicState`, `getRelicState`, `setRelicState` 辅助函数
- [x] Task 2: 遗物数据定义 (AC: #1-4, #6)
  - [x] 2.1 `src/src/data/relics.ts` — RELICS 添加 `cornucopia` 数据（普通, 🧧, 25g）
  - [x] 2.2 RELICS 添加 `time_bank` 数据（稀有, 💳, 55g）
  - [x] 2.3 RELICS 添加 `ramen` 数据（稀有, 🍜, 45g, category: 'risk-reward'）
  - [x] 2.4 RELICS 添加 `overcharge` 数据（稀有, 🔋, 50g, category: 'risk-reward'）
  - [x] 2.5 RELIC_MODIFIER_DEFS 添加 4 个工厂函数
- [x] Task 3: 触发集成 (AC: #1-4)
  - [x] 3.1 `src/src/systems/battle.ts` — `startBattle` 中 `on_battle_start` 结果新增 gold 处理
  - [x] 3.2 `src/src/systems/battle.ts` — `showGoldReward` 中传入 `remainingTime: state.time`
  - [x] 3.3 `src/src/systems/battle.ts` — `playerError` 中 ramen 衰减逻辑
  - [x] 3.4 `src/src/core/state.ts` — `addRelicWithCapacity`/`replaceRelic`/`removeRelic` 中调用 `initRelicState` 和清理 relicStates
  - [x] 3.5 overcharge 无需额外集成 — 已有管道
- [x] Task 4: 测试 (AC: #7)
  - [x] 4.1 新建 `tests/unit/systems/relics/relics.t6t7.test.ts` — 31 个测试
  - [x] 4.2 更新 `tests/unit/systems/relics/relics.test.ts` — 遗物数量 19→23，稀有度 3c+13r→4c+16r
  - [x] 4.3 更新 `tests/unit/data/iconRegistry.test.ts` — 图标总数 177→181
  - [x] 4.4 更新 `tests/unit/systems/relics/relics.t1.test.ts` + `relics.t5.test.ts` — RELIC_MODIFIER_DEFS 19→23
  - [x] 4.5 `tests/unit/core/state/RunState.test.ts` — relicStates 序列化/反序列化往返测试（2 个新测试）

## Dev Notes

### 现有代码分析（必须了解）

**当前遗物数量**：19 个（3 common + 13 rare + 3 legendary）
**当前图标总数**：177 个（含所有技能/附魔/增幅者/遗物图标）
**当前测试数**：2684 passing (105 files)

**遗物管道调用点（已有）**：
- `on_battle_start`: `battle.ts:startBattle()` → `resolveRelicEffects('on_battle_start')` — 当前只处理 `effects.multiply` 和 `effects.time`，**不处理 gold**
- `on_battle_end`: `battle.ts:showGoldReward()` → `resolveRelicEffects('on_battle_end', { overkill })` — 处理 `effects.gold`
- `on_skill_trigger`: `skills.ts:getRelicSkillMultiplier()` → `resolveRelicSkillTrigger(ctx, callbacks)` — 返回 score 倍率 + 执行行为
- `on_error`: `battle.ts:playerError()` → `resolveRelicEffectsWithBehaviors('on_error', ...)` — 执行行为回调
- `on_word_complete`: `battle.ts:completeWord()` → `resolveRelicEffectsWithBehaviors('on_word_complete', ...)` — 数值+行为

**已有行为类型可复用**：
- `time_steal`: `BehaviorExecutor` 调用 `onTimeSteal(timeBonus)` → `state.time += bonus`。**传入负值即可扣减时间**，overcharge 用 `-0.1`
- `remove_relic`: `BehaviorExecutor` 调用 `onRemoveRelic(relicId)` → 移除遗物。ramen 衰减至 ≤1.0 时使用

**PipelineContext 现有字段（本 Story 用到）**：
- `currentSkillCategory?: 'producer' | 'converter' | 'connector' | 'amplifier'` — overcharge 条件用
- `overkill?: number` — overkill_blade 工厂用（同模式参考）
- 缺少：`relicStates`, `remainingTime`

**RunStateData 现有结构**（不含 relicStates）：
- `relics: string[]` — 遗物 ID 列表
- `growthValues: Map<string, number>` — 已有 Map 序列化先例
- `masteryCounters: Map<string, number>` — 已有 Map 序列化先例

### 4 个遗物详细设计

**cornucopia（聚宝盆）** — Common, basePrice: 25
- 触发: `on_battle_start`, Phase: `calculate`
- 效果: `{ type: 'gold', value: 15, stacking: 'additive' }`
- 集成: `battle.ts:startBattle()` 需新增 `state.gold += startRelicResult.effects.gold`
- 消歧义: "每关开始" = battle 开始时直接加金币，不是结算时
- 工厂:
```typescript
cornucopia: (id) => [
  relicMod(id, 'gold', 'on_battle_start', 'calculate', {
    effect: { type: 'gold', value: 15, stacking: 'additive' },
  }),
],
```

**time_bank（时间银行）** — Rare, basePrice: 55
- 描述: 通关剩余时间转化为等量金币（1秒=1金币）
- 触发: `on_battle_end`, Phase: `calculate`
- 效果: 动态金币 = `Math.floor(remainingTime)`
- 设计意图: 奖励快速通关策略，打得越快剩余时间越多→金币越多；与 time_thief 形成正反馈（技能触发加时→更多剩余时间→更多金币）
- 工厂（动态值，参考 `overkill_blade` 的 `ctx?.overkill` 模式）:
```typescript
time_bank: (id, ctx) => [
  relicMod(id, 'gold', 'on_battle_end', 'calculate', {
    effect: { type: 'gold', value: Math.floor(ctx?.remainingTime ?? 0), stacking: 'additive' },
  }),
],
```
- 集成: `battle.ts:showGoldReward()` 的 context 需传入 `remainingTime: state.time`

**ramen（拉面）** — Rare, basePrice: 45, category: 'risk-reward'
- 描述: 分数 ×1.5，每次打错 -0.1×（降至 ×1.0 时消失）
- 触发: `on_word_complete`（分数加成）+ `on_error`（衰减）
- 初始状态: `relicStates['ramen'] = 1.5`
- 分数效果: `multiply` 类型，value = `relicState - 1.0`（如 1.5→0.5, 1.4→0.4, ...）
- 衰减逻辑: `on_error` 时读取 relicStates['ramen']，-= 0.1，≤1.0 时移除遗物
- **不使用 Modifier 管道做衰减** — 在 `battle.ts:playerError()` 的 on_error 回调中直接操作 relicStates
- 消歧义: "×1.5" = bonusMult += 0.5（初始），每错一次少 0.1；最终变成 bonusMult += 0.0 时自动消失
- 工厂:
```typescript
ramen: (id, ctx) => {
  const mult = ctx?.relicStates?.['ramen'] ?? 1.5
  if (mult <= 1.0) return []
  return [
    relicMod(id, 'boost', 'on_word_complete', 'calculate', {
      effect: { type: 'multiply', value: mult - 1.0, stacking: 'additive' },
    }),
  ]
},
```
- 衰减实现（在 battle.ts playerError 的 on_error 回调之后）:
```typescript
// ramen 衰减
if (state.player.relics.has('ramen')) {
  const curr = state.player.relicStates['ramen'] ?? 1.5
  const next = Math.round((curr - 0.1) * 10) / 10  // 避免浮点误差
  if (next <= 1.0) {
    state.player.relics.delete('ramen')
    delete state.player.relicStates['ramen']
  } else {
    state.player.relicStates['ramen'] = next
  }
}
```

**overcharge（过载核心）** — Rare, basePrice: 50, category: 'risk-reward'
- 描述: 产出者效果 +50%，但每次产出者触发 -0.1s 时间
- 触发: `on_skill_trigger`
- 条件: `current_skill_is_converter` → 错！应该是 `current_skill_is_producer`
- **注意**：ConditionEvaluator 没有 `current_skill_is_producer` 条件。需要新增！或者用 `is_producer_and_count_gte` with value=1。
- 实际上，`is_producer_and_count_gte` 检查 `ctx.currentSkillCategory === 'producer' && equippedProducerCount >= value`。设 value=1 即可（只要有 1 个产出者装备就行，而当前技能本身就是产出者，所以至少有 1 个）。
- 但这语义不精确。更好的方案：新增条件 `current_skill_is_producer` = `ctx.currentSkillCategory === 'producer'`。
- 效果（两个 modifier）:
  1. Score boost: `{ type: 'score', value: 1.50, stacking: 'multiplicative' }` on global layer, condition: producer
  2. Time penalty: behavior `{ type: 'time_steal', timeBonus: -0.1 }`, condition: producer
- 工厂:
```typescript
overcharge: (id) => [
  relicMod(id, 'boost', 'on_skill_trigger', 'calculate', {
    layer: 'global',
    effect: { type: 'score', value: 1.50, stacking: 'multiplicative' },
    condition: { type: 'current_skill_is_producer' },
  }),
  relicMod(id, 'time_cost', 'on_skill_trigger', 'after', {
    behavior: { type: 'time_steal', timeBonus: -0.1 },
    condition: { type: 'current_skill_is_producer' },
  }),
],
```

### 新增条件类型

需要在 `ModifierTypes.ts` 的 `ModifierCondition` 中新增：
```typescript
| { type: 'current_skill_is_producer' }
```

在 `ConditionEvaluator.ts` 中新增分支：
```typescript
case 'current_skill_is_producer':
  return ctx.currentSkillCategory === 'producer'
```

**注意**：已有 `current_skill_is_converter`，新增 `current_skill_is_producer` 保持对称。

### relicStates 基础设施设计

**选型：Record 而非 Map**
- `growthValues`/`masteryCounters` 用 Map 是因为它们的 key 是 skillId（可能含特殊字符）
- relicStates 的 key 是 relicId（纯 ASCII snake_case），用 `Record<string, number>` 更简单
- JSON 序列化无需特殊处理（对象直接 stringify/parse）
- 运行时访问：`state.player.relicStates['ramen']`

**初始化时机**：
- `relicStates` 在 `RunState.createInitialState()` 初始化为 `{}`
- ramen 获取时设置 `relicStates['ramen'] = 1.5`

**获取触发点**：
- 开局三选一：`relicPicker.ts` 的 `selectRelic()`
- 商店购买：`shop.ts` 的购买逻辑
- 精英/Boss 掉落：`relicPicker.ts`
- 休息事件：`restStage.ts` 的 `grantRandomRelic()`
- 需在获取点初始化 relicStates。最简方案：在 `addRelicWithCapacity()` 中根据 relicId 调用初始化函数。或者在工厂首次调用时 lazy init。

**推荐方案**：在 `RelicPipeline.ts` 新增 `initRelicState(relicId: string)` 函数，在遗物获取后调用。仅 ramen 需要初始化（`relicStates['ramen'] = 1.5`），其他遗物不需要。

### 27.2/27.3/27.4 经验教训

- **relicMod 默认 layer='base'**：overcharge score 用 `global` 层乘法，必须 override `layer: 'global'`
- **EffectPipeline 公式**：`baseSum × enhanceProduct × globalProduct` — 无 base 层 modifier 时 score 结果为 0
- **测试数量断言**：修改遗物数量后 `relics.test.ts`、`iconRegistry.test.ts`、`relics.t1.test.ts` 的 count 需同步更新
- **mock 模式**：遗物测试 mock `../../../../src/core/state`，参考 `relics.t1.test.ts`
- **动态工厂**：`overkill_blade` 和 `time_bank` 同模式——工厂接收 ctx，计算动态 value
- **行为型 vs 数值型**：cornucopia/time_bank 是数值型（effect）；overcharge 同时有数值+行为（两个 modifier）；ramen 的衰减逻辑不走管道（直接在 battle.ts 中操作）
- **`_currentTriggerKey` 已修复**：在 `triggerProducer`/`triggerConverter` 中赋值（27-4 review fix），overcharge 在 pseudo-infinite 模式下也能正确获取 `currentSkillCategory`
- **浮点精度**：ramen 衰减用 `Math.round((curr - 0.1) * 10) / 10` 避免 0.30000000000000004 问题

### 图标选择

已用遗物图标（避免）：🍀🪶🔪💣⏰🤑🤫☢️💯🧨⚗️🧲⚜️🎶🌈🏠🤲👯🐺
建议候选：
- cornucopia: 🧧（红包/聚宝盆）— 避免与 conv_gold_time_mul 的 🏺 冲突
- time_bank: 💳（银行卡/时间银行）— 避免与 prod_eternal 的 ⏳ 冲突
- ramen: 🍜（面条/拉面）
- overcharge: 🔋（电池/过载）— 避免与 conv_mult_base_mul 的 ⚡ 冲突
- ⚠️ 实际选择前必须运行 `findDuplicateIcons()` 验证唯一性

### 不在此 Story 范围

- T2 累积成长遗物（campfire_ember 等）→ 后续 Epic，但本 Story 建立的 relicStates 为其铺路
- T3 重触发遗物（echo_bell 等）→ 后续 Epic
- T4 规则改造遗物（pure_heart 等）→ 后续 Epic
- 遗物获取通道稀有度权重调整 → 后续 Epic
- ramen 的 UI 衰减动画 → 后续 polish

### 文件修改清单

| 文件 | 操作 | 预计改动 |
|------|------|----------|
| `src/src/core/state/RunState.ts` | RunStateData +relicStates, 序列化/反序列化 | ~20 行 |
| `src/src/systems/modifiers/ModifierTypes.ts` | PipelineContext +relicStates +remainingTime, ModifierCondition +current_skill_is_producer | ~5 行 |
| `src/src/systems/modifiers/ConditionEvaluator.ts` | +1 条件分支 (current_skill_is_producer) | ~3 行 |
| `src/src/data/relics.ts` | +4 RELICS + 4 RELIC_MODIFIER_DEFS | ~80 行 |
| `src/src/systems/relics/RelicPipeline.ts` | 工厂调用注入 relicStates/remainingTime + initRelicState 辅助 | ~20 行 |
| `src/src/systems/battle.ts` | startBattle +gold处理, showGoldReward +remainingTime, playerError +ramen衰减 | ~20 行 |
| `tests/unit/systems/relics/relics.t6t7.test.ts` | **新建** T6/T7 遗物测试 | ~200 行 |
| `tests/unit/systems/relics/relics.test.ts` | 数量断言 19→23 | ~5 行 |
| `tests/unit/systems/relics/relics.t1.test.ts` | RELIC_MODIFIER_DEFS count 19→23 | ~2 行 |
| `tests/unit/data/iconRegistry.test.ts` | 图标总数 177→181 | ~2 行 |
| `tests/unit/core/state/RunState.test.ts` | relicStates 序列化测试 | ~15 行 |

### 参考文件

- 设计文档: `docs/planning-artifacts/relic-system-redesign.md` §6 T6/T7 详细设计
- 实现计划: `docs/planning-artifacts/relic-implementation-plan.md` Story 1.4/1.5/4.1
- 遗物数据: `src/src/data/relics.ts`（RELICS + RELIC_MODIFIER_DEFS，19 个现有遗物）
- 遗物管道: `src/src/systems/relics/RelicPipeline.ts`（resolveRelicEffects + queryRelicFlag）
- 修饰器类型: `src/src/systems/modifiers/ModifierTypes.ts`（PipelineContext + ModifierCondition）
- 条件评估: `src/src/systems/modifiers/ConditionEvaluator.ts`（34 种条件）
- 行为执行: `src/src/systems/modifiers/BehaviorExecutor.ts`（time_steal + remove_relic 行为）
- 技能系统: `src/src/systems/skills.ts`（resolveRelicSkillTrigger 调用 + onTimeSteal 回调）
- 战斗系统: `src/src/systems/battle.ts`（on_battle_start/end/error 管道调用点）
- RunState: `src/src/core/state/RunState.ts`（序列化/反序列化 + growthValues Map 先例）
- T1 遗物测试: `src/tests/unit/systems/relics/relics.t1.test.ts`（mock 模式参考）
- T5 遗物测试: `src/tests/unit/systems/relics/relics.t5.test.ts`（最新测试模式参考）
- 上一个 Story: `docs/implementation-artifacts/27-4-new-t1-passive-relics.md`（经验教训）

### Project Structure Notes

- 依赖方向: `data → core → systems → scenes`
- relicStates 属于 RunState（core 层），遗物工厂读取 via PipelineContext（data → core 无逆依赖）
- `Record<string, number>` 比 `Map<string, number>` 更适合 relicStates：序列化简单，遗物 ID 是纯 ASCII
- ramen 衰减在 battle.ts（systems 层）直接操作 state（core 层），符合已有模式（doomsday 也是）
- overcharge 复用已有 `time_steal` 行为和 `current_skill_is_converter` 条件的对称命名

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None

### Completion Notes List

- 图标 🏺⏳⚡ 与现有技能/资源图标冲突，改用 🧧💳🔋
- `PlayerState` 接口新增 `relicStates: Record<string, number>`
- `state.ts` 的 `addRelicWithCapacity`/`removeRelic`/`replaceRelic` 统一调用 `initRelicState` 和清理
- relicStates 在 `resolveRelicEffects` 和 `resolveRelicSkillTrigger` 中自动注入 context
- 2717 tests passing (106 files), +33 new tests

### File List

- `src/src/core/types.ts` — PlayerState +relicStates
- `src/src/core/state.ts` — createInitialState +relicStates, addRelicWithCapacity/removeRelic/replaceRelic +initRelicState
- `src/src/core/state/RunState.ts` — RunStateData +relicStates, serialize/deserialize
- `src/src/systems/modifiers/ModifierTypes.ts` — PipelineContext +relicStates +remainingTime, ModifierCondition +current_skill_is_producer
- `src/src/systems/modifiers/ConditionEvaluator.ts` — +current_skill_is_producer 分支
- `src/src/data/relics.ts` — +4 RELICS, +4 RELIC_MODIFIER_DEFS 工厂
- `src/src/systems/relics/RelicPipeline.ts` — relicStates 注入 + initRelicState/getRelicState/setRelicState
- `src/src/systems/battle.ts` — gold on_battle_start, remainingTime on_battle_end, ramen 衰减
- `tests/unit/systems/relics/relics.t6t7.test.ts` — **新建** 31 tests
- `tests/unit/systems/relics/relics.test.ts` — 数量 19→23
- `tests/unit/systems/relics/relics.t1.test.ts` — DEFS count 19→23
- `tests/unit/systems/relics/relics.t5.test.ts` — DEFS count 19→23
- `tests/unit/data/iconRegistry.test.ts` — 图标 177→181
- `tests/unit/core/state/RunState.test.ts` — +2 relicStates 序列化测试
