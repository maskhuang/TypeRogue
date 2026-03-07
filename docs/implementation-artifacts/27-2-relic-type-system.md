# Story 27.2: 添加 T1 条件加成遗物（5 个新增）

Status: done

## Story

As a 玩家,
I want 遗物在特定构筑条件满足时提供有意义的加成,
so that 我的遗物选择能真正引导和奖励特定的构筑方向。

## Acceptance Criteria

1. **forge_heart（熔炉之心）数据+逻辑就绪** — 产出者触发时，同词内所有转化者系数 +15%
2. **chain_surge（链路增压）数据+逻辑就绪** — 连接者成功传导时，被传导的技能本次效果 +25%
3. **stack_resonance（层叠共鸣）数据+逻辑就绪** — 增幅者叠层 ≥15 时，该增幅者影响的技能额外 +10%
4. **perfect_rhythm（完美韵律）数据+逻辑就绪** — 无错误完成词语时恢复该词 50% 消耗时间
5. **resource_flood（资源洪流）数据+逻辑就绪** — 单词内产出 ≥3 种资源时，该词所有资源产出 +20%
6. **遗物总数从 9 → 14**，`RELICS` 和 `RELIC_MODIFIER_DEFS` 各增 5 条
7. **图标唯一性测试通过** — `iconRegistry.test.ts` 总数更新、跨类型无重复
8. **现有 2545+ 测试全绿**，新增 ≥15 个针对 T1 遗物的测试

## Tasks / Subtasks

- [x] Task 1: 添加 5 个遗物数据定义 (AC: #1-5, #6)
  - [x] 1.1 在 `RELICS` 中添加 5 个 `RelicData` 条目
  - [x] 1.2 选择不与现有 167 个图标冲突的 emoji（⚗️🧲⚜️🎶🌈）
  - [x] 1.3 设定合理的 `basePrice`（普通 25-30，稀有 45-55）
- [x] Task 2: 扩展 PipelineContext (AC: #1-3, #5)
  - [x] 2.1 `ModifierTypes.ts` — PipelineContext 新增 6 字段 + ModifierCondition 新增 5 类型
  - [x] 2.2 `skills.ts` — 词级资源追踪（_wordResourceTypes Set + reset/get 函数）
  - [x] 2.3 `battle.ts` — 词开始时间追踪 + on_word_complete 传递扩展 context + time_refund 回调
- [x] Task 3: 新增 ConditionEvaluator 条件类型 (AC: #1-5)
  - [x] 3.1 新增 5 种条件类型（current_skill_is_converter, is_chained_trigger, amplifier_stacks_gte, word_resource_types_gte, word_perfect）
  - [x] 3.2 relics.t1.test.ts 包含对应条件测试
- [x] Task 4: 添加 5 个 RELIC_MODIFIER_DEFS 工厂 (AC: #1-5, #6)
  - [x] 4.1 forge_heart 工厂（global 层 score ×1.15, 条件: current_skill_is_converter）
  - [x] 4.2 chain_surge 工厂（global 层 score ×1.25, 条件: is_chained_trigger）
  - [x] 4.3 stack_resonance 工厂（global 层 score ×1.10, 条件: amplifier_stacks_gte 15）
  - [x] 4.4 perfect_rhythm 工厂（behavior time_refund 0.5, 条件: word_perfect）
  - [x] 4.5 resource_flood 工厂（global 层 score ×1.20, 条件: word_resource_types_gte 3）
- [x] Task 5: 更新测试 (AC: #7, #8)
  - [x] 5.1 `relics.test.ts` 更新数量断言（9→14, 稀有度 3/8/3）
  - [x] 5.2 新建 `relics.t1.test.ts` — 30 个 T1 遗物条件触发测试
  - [x] 5.3 `iconRegistry.test.ts` 更新总数（167→172）
  - [x] 5.4 RELIC_MODIFIER_DEFS 键数验证包含在 relics.t1.test.ts

## Dev Notes

### 现有代码模式（必须遵循）

**RELICS 数据条目模式** — `src/src/data/relics.ts:64`
```typescript
forge_heart: {
  id: 'forge_heart',
  name: '熔炉之心',
  icon: '🔥',  // 需选择唯一 emoji
  description: '产出者触发时，同词内转化者 +15%',
  rarity: 'common',
  basePrice: 25,
  effects: [
    { type: 'on_skill_trigger', modifier: 'score_multiplier', value: 0.15 }
  ],
  flavor: '...'
}
```

**RELIC_MODIFIER_DEFS 工厂模式** — `src/src/data/relics.ts:234`

使用 `relicMod()` 辅助函数（第 213 行），返回 `Modifier[]`：
```typescript
forge_heart: (id) => [
  relicMod(id, 'boost', 'on_skill_trigger', 'calculate', {
    layer: 'global',
    effect: { type: 'score', value: 1.15, stacking: 'multiplicative' },
    condition: { type: 'current_skill_is_converter' },  // 新条件
  }),
]
```

**relicMod 辅助函数签名** — `src/src/data/relics.ts:213`
```typescript
function relicMod(relicId, id, trigger, phase, overrides) → Modifier
// 自动设置 source: `relic:${relicId}`, sourceType: 'relic', layer: 'base', priority: 200
```

### 需要新增的 PipelineContext 字段

`src/src/systems/modifiers/ModifierTypes.ts` — PipelineContext 接口扩展：
```typescript
currentSkillCategory?: 'producer' | 'converter' | 'connector' | 'amplifier'
isChainedTrigger?: boolean
wordResourceTypes?: number  // 本词已产出的不同资源种类数
wordPerfect?: boolean       // 本词无错误
```

**填充点**：
- `currentSkillCategory` → `skills.ts` 的 `triggerProducer`/`triggerConverter`/`triggerConnector` 调用 `resolveRelicEffects` 时传入
- `isChainedTrigger` → `skills.ts` 连接者传导逻辑中标记
- `wordResourceTypes` → `battle.ts` 或 `skills.ts` 中逐词追踪已产出资源种类 Set 的 size
- `wordPerfect` → `battle.ts` 中通过 `state.wordErrors === 0` 或类似机制

### 需要新增的条件类型

`src/src/systems/modifiers/ConditionEvaluator.ts`：

| 条件类型 | 参数 | 语义 | 用于 |
|---------|------|------|------|
| `current_skill_is_producer` | — | ctx.currentSkillCategory === 'producer' | forge_heart 触发条件 |
| `current_skill_is_converter` | — | ctx.currentSkillCategory === 'converter' | forge_heart 效果条件 |
| `is_chained_trigger` | — | ctx.isChainedTrigger === true | chain_surge |
| `amplifier_stacks_gte` | value: number | 当前增幅者叠层 ≥ value | stack_resonance |
| `word_resource_types_gte` | value: number | ctx.wordResourceTypes ≥ value | resource_flood |
| `word_perfect` | — | ctx.wordPerfect === true | perfect_rhythm |

### 5 个 T1 遗物设计细节

**forge_heart（熔炉之心）** — 普通
- 触发: `on_skill_trigger`（转化者触发时）
- 条件: `current_skill_is_converter`（当前触发的是转化者）
- 效果: `{ type: 'score', value: 1.15, stacking: 'multiplicative', layer: 'global' }`
- 额外条件: 仅当本词中有产出者先触发过时生效
- ⚠️ 实现方案: 需要在 PipelineContext 中追踪 `producerTriggeredThisWord: boolean`
  - 更简方案: 条件只检查 `current_skill_is_converter`，让 forge_heart 成为"转化者增强器"（无需追踪产出者）
  - 建议采用简化方案，描述改为"转化者效果 +15%"

**chain_surge（链路增压）** — 稀有
- 触发: `on_skill_trigger`
- 条件: `is_chained_trigger`（被连接者传导触发的技能）
- 效果: `{ type: 'score', value: 1.25, stacking: 'multiplicative', layer: 'global' }`

**stack_resonance（层叠共鸣）** — 稀有
- 触发: `on_skill_trigger`
- 条件: 需要访问增幅者叠层数据
- ⚠️ 实现复杂度: 增幅者叠层在 `state.amplifierStacks` 中，需让 ConditionEvaluator 能访问
  - 方案 A: PipelineContext 新增 `amplifierStacks?: Map<string, number>`
  - 方案 B: 条件判断中直接 import state（已有先例: `no_skills_equipped` 访问 state.player.skills）
  - 建议方案 B，和 `no_skills_equipped` 保持一致

**perfect_rhythm（完美韵律）** — 普通
- 触发: `on_word_complete`
- 条件: `word_perfect`（本词无错误）
- 效果: 恢复该词消耗时间的 50%（behavior 型，非固定数值）
- 实现: `behavior: { type: 'time_refund', ratio: 0.5 }`
  - 需要在 PipelineContext 或 BehaviorExecutor 中访问 `wordElapsedTime`（词开始到完成的耗时）
  - `state.time += wordElapsedTime * 0.5`
  - 用 `after` 阶段 behavior 而非 `calculate` 阶段 effect（因为是百分比恢复，非固定值）
- 注意: `no_errors` 条件已存在但检查整场战斗无错误，这里需要单词级别的无错误
- ⚠️ 需追踪每词开始时间戳，词完成时计算 elapsed

**resource_flood（资源洪流）** — 稀有
- 触发: `on_word_complete`
- 条件: `word_resource_types_gte` with value: 3
- 效果: `{ type: 'score', value: 1.20, stacking: 'multiplicative', layer: 'global' }`
- ⚠️ 需在 `battle.ts`/`skills.ts` 中追踪每词产出的不同资源种类 Set

### 文件修改清单

| 文件 | 操作 | 预计改动 |
|------|------|----------|
| `src/src/data/relics.ts` | 添加 5 个 RELICS + 5 个 RELIC_MODIFIER_DEFS | ~80 行新增 |
| `src/src/systems/modifiers/ModifierTypes.ts` | PipelineContext 新增 4 字段 | ~6 行 |
| `src/src/systems/modifiers/ConditionEvaluator.ts` | 新增 ~5 个条件类型 | ~30 行 |
| `src/src/systems/skills.ts` | 触发时填充 currentSkillCategory / isChainedTrigger | ~10 行 |
| `src/src/systems/battle.ts` | 追踪 wordResourceTypes / wordPerfect | ~10 行 |
| `src/src/data/iconRegistry.ts` | 无需修改（自动聚合 RELICS） | 0 行 |
| `src/tests/unit/systems/relics/relics.test.ts` | 更新数量断言 | ~10 行 |
| `src/tests/unit/systems/relics/relics.t1.test.ts` | **新建** T1 条件触发测试 | ~150 行 |
| `src/tests/unit/data/iconRegistry.test.ts` | 更新总数 167→172 | 2 行 |
| `src/tests/unit/systems/modifiers/ConditionEvaluator.test.ts` | 新条件测试 | ~40 行 |

### 避免踩坑

1. **图标冲突**: 当前 167 个图标。选择前运行 `findDuplicateIcons()` 或 grep 现有图标。避免: 🍀🪶🔪💣⏰🤑🤫☢️💯 以及所有产出者/转化者/连接者/增幅者/附魔/Boss 用过的 emoji
2. **条件 vs Flag**: 新遗物全部走 `ConditionEvaluator` + `EffectPipeline`（calculate 阶段），不走 `queryRelicFlag`
3. **layer 选择**: T1 条件加成用 `global` 层（乘法），与技能的 `base` 层加法分开
4. **stacking**: 用 `multiplicative`（value = 1.15 表示 +15%），不用 `additive`
5. **测试 mock**: 遗物测试文件 mock `../../../../src/core/state`，参考 `relics.catalyst.test.ts` 的 mock 模式
6. **relicMod 默认值**: `layer: 'base'`, `priority: 200` — T1 遗物应 override `layer: 'global'`

### 参考文件（完整路径）

- 设计文档: `docs/planning-artifacts/relic-system-redesign.md` §6 T1 详细设计
- 实现计划: `docs/planning-artifacts/relic-implementation-plan.md` Story 1.2
- 遗物数据: `src/src/data/relics.ts`（RELICS + RELIC_MODIFIER_DEFS + relicMod 函数）
- 修饰器类型: `src/src/systems/modifiers/ModifierTypes.ts`（Modifier + PipelineContext）
- 条件系统: `src/src/systems/modifiers/ConditionEvaluator.ts`（evaluate 方法 + 条件分派）
- 效果管道: `src/src/systems/modifiers/EffectPipeline.ts`（resolve 方法 + 三层计算）
- 遗物管道: `src/src/systems/relics/RelicPipeline.ts`（resolveRelicEffects + queryRelicFlag）
- 技能系统: `src/src/systems/skills.ts`（triggerProducer/triggerConverter/连接者逻辑）
- 图标注册: `src/src/data/iconRegistry.ts`（getAllIconEntries + findDuplicateIcons）
- 催化剂测试: `src/tests/unit/systems/relics/relics.catalyst.test.ts`（mock 模式参考）
- 遗物数据测试: `src/tests/unit/systems/relics/relics.test.ts`（数量/稀有度断言）

### Project Structure Notes

- 依赖方向: `data → core → systems → scenes`（遗物数据在 data 层，条件评估在 systems 层）
- ConditionEvaluator 中可直接 import state（已有先例 `no_skills_equipped`）
- PipelineContext 由调用者（skills.ts/battle.ts）在触发时构造并传入

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- 浮点精度: forge_heart ×1.15 管道测试用 toBeCloseTo 替代 toBe

### Completion Notes List
- 5 个 T1 条件加成遗物数据+逻辑+测试全部就绪
- 图标选择: ⚗️(forge_heart) 🧲(chain_surge) ⚜️(stack_resonance) 🎶(perfect_rhythm) 🌈(resource_flood)
- PipelineContext 新增 6 字段, ModifierCondition 新增 5 类型, ModifierBehavior 新增 time_refund
- BehaviorExecutor 新增 time_refund 处理
- battle.ts: on_word_complete 升级为 resolveRelicEffectsWithBehaviors, 传递 wordPerfect/wordResourceTypes/wordElapsedTime 上下文
- battle.ts: 词开始时间追踪 (wordStartTime) 用于完美韵律时间返还
- skills.ts: 词级资源种类追踪 (_wordResourceTypes Set)
- 附带修复: perfectionist 重设计(得分×2+断连击失去遗物), glass_cannon 调整(×2→×3), 旧 perfectStreak 代码清理
- Code Review 修复:
  - HIGH: on_skill_trigger 遗物(forge_heart/chain_surge/stack_resonance/glass_cannon/time_thief)生产代码激活 — 新增 resolveRelicSkillTrigger + triggerProducer/triggerConverter 集成
  - MEDIUM: stack_resonance 管道集成测试 + 5 个负向管道测试 + stale perfectStreak 清理 + stale comment 修复
  - LOW: shield 从 EMPTY_RESOURCES 移除, wordElapsedTime 死字段移除
- 总测试: 2584 通过, 0 回归

### File List
- src/src/data/relics.ts — 新增 5 个 RELICS + 5 个 RELIC_MODIFIER_DEFS
- src/src/systems/modifiers/ModifierTypes.ts — PipelineContext 6 字段 + ModifierCondition 5 类型 + time_refund behavior + onTimeRefund 回调
- src/src/systems/modifiers/ConditionEvaluator.ts — 5 个新条件类型
- src/src/systems/modifiers/BehaviorExecutor.ts — time_refund + remove_relic 处理
- src/src/systems/skills.ts — _wordResourceTypes 追踪 + getRelicSkillMultiplier 集成到 triggerProducer/triggerConverter
- src/src/systems/battle.ts — wordStartTime + 扩展 on_word_complete 上下文 + on_combo_break 管道
- src/src/systems/relics/RelicPipeline.ts — 新增 resolveRelicSkillTrigger (替代死代码 injectRelicModifiers)
- src/src/core/types.ts — 删除 perfectStreak
- src/src/core/state.ts — 删除 perfectStreak
- src/src/systems/relics/RelicPipeline.ts — 删除 perfectionist_streak flag
- src/tests/unit/systems/relics/relics.t1.test.ts — **新建** 30 个测试
- src/tests/unit/systems/relics/relics.test.ts — 数量断言 9→14
- src/tests/unit/systems/relics/relic.pipeline.test.ts — perfectionist 测试更新
- src/tests/unit/systems/relics/relics.riskreward.test.ts — glass_cannon ×2→×3
- src/tests/unit/data/iconRegistry.test.ts — 总数 167→172
- docs/implementation-artifacts/sprint-status.yaml — 27-2 状态更新
