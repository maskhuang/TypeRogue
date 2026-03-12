# Story 35.3: 触发流水线 — Phase 1~3（基础值 → 加算 → 乘算）

Status: done

## Story

作为开发者，
我想实现触发计算的前三个阶段（Phase 1 基础值、Phase 2 加算层、Phase 3 乘算层），
以便词条制技能在战斗中按键触发时能正确计算产出数值，为后续的资源写入（Phase 4）和后触发效果（Phase 5-6）提供基础。

## Acceptance Criteria

1. `resolvePhase1(skill)` 返回 `baseValues[skill.level - 1]` ✅需处理 level 越界
2. `resolvePhase2(skill, state, context)` 遍历所有加算词条和附魔，累加 bonusPercent，返回 `output × (1 + bonusPercent)`
3. 转化词条的 `getSourceValue(source)` 按设计文档读取定义实现（base=词内累积, score=关卡累积, multiplier=当前倍率, time=剩余秒数, gold=当前持有, fragment/mutagen=本关产出）
4. `resolvePhase3(skill, state, context, output)` 按顺序应用所有乘算词条，各词条独立相乘
5. 暴击/脉冲/级联/连字/禁忌的条件判定正确（暴击=随机, 脉冲=计数取模, 级联=上键位置关系, 连字=字母计数, 禁忌=随机）
6. 任务增强公式内联：每个词条参数在计算时加入 `questCompletions` 的增强项（18 个词条对应 18 种增强）
7. 衰减词条每次触发更新 `currentDecayMult`，每词重置为 `initialMult`
8. 蓄力词条释放后 `chargeAccumulated = 0`，战斗 tick 中持续累加
9. Phase 2-3 的计算不产生副作用（除蓄力清零和衰减更新），所有状态变更通过明确的 state mutation

## Tasks / Subtasks

- [x] Task 1: 定义触发上下文接口 (AC: 2, 3, 5)
  - [x] 1.1 在 `src/src/data/` 下新建 `affixTrigger.ts`
  - [x] 1.2 定义 `TriggerContext` 接口，包含战斗中计算所需的全部上下文：
    - `triggerKey: string` — 当前触发的键位
    - `prevKey?: string` — 上一个按下的键位（级联词条需要）
    - `currentWord: string` — 当前正在打的单词
    - `resources: ResourceState` — 当前资源状态快照
    - `classResourceProduced: Record<string, number>` — 本关职业资源累积产出（fragment/mutagen）
    - `bindings: Map<string, string>` — 键位→技能ID绑定（虚无/增幅需查邻居）
    - `skillStates: Map<string, SkillRuntimeState>` — 所有技能运行时状态
    - `allSkills: Map<string, AffixSkillInstance>` — 所有已装备的技能实例
    - `randomFn: () => number` — 随机函数注入（暴击/禁忌掷骰）
    - `fragmentQueue?: string[]` — 造词师采集队列（字母亲和附魔）
    - `fragmentInventory?: Record<string, number>` — 碎片库存（满溢附魔）
    - `unstableBonusResource?: ResourceType` — 不稳定附魔本关随机资源
  - [x] 1.3 定义 `TriggerResult` 接口：
    - `output: number` — Phase 3 最终数值
    - `bonusPercent: number` — Phase 2 总加算百分比（UI 展示用）
    - `multipliers: number[]` — Phase 3 各乘算因子（UI 展示用）
    - `isCrit: boolean` — 是否暴击
    - `isPulse: boolean` — 是否脉冲爆发
    - `isCascade: boolean` — 是否级联
    - `isTabooPenalty: boolean` — 是否禁忌负产出
    - `ligatureCount: number` — 连字倍数（0=无连字）
    - `stateMutations: StateMutation[]` — 需要应用的状态变更列表
  - [x] 1.4 定义 `StateMutation` 类型：`{ skillId: string, field: string, value: number }`

- [x] Task 2: 实现 Phase 1 — 基础值 (AC: 1)
  - [x] 2.1 实现 `resolvePhase1(skill: AffixSkillInstance): number`
  - [x] 2.2 返回 `skill.baseValues[skill.level - 1]`
  - [x] 2.3 level 越界保护：`Math.max(0, Math.min(skill.level - 1, skill.baseValues.length - 1))`

- [x] Task 3: 实现 getSourceValue (AC: 3)
  - [x] 3.1 实现 `getAffixSourceValue(source: ResourceType, ctx: TriggerContext): number`
  - [x] 3.2 逻辑映射（对齐设计文档 §五 和现有 `converters.ts:getSourceValue`）：
    - `base` → `ctx.resources.base`（词内累积）
    - `score` → `ctx.resources.score + ctx.resources.base * ctx.resources.multiplier`（关卡累积 + pending 分数）
    - `multiplier` → `ctx.resources.multiplier`（当前倍率）
    - `time` → `ctx.resources.time`（剩余秒数）
    - `gold` → `ctx.resources.gold`（当前持有金币）
    - `fragment` → `ctx.classResourceProduced.fragment ?? 0`（本关产出）
    - `mutagen` → `ctx.classResourceProduced.mutagen ?? 0`（本关产出）

- [x] Task 4: 实现 Phase 2 — 加算层 (AC: 2, 6, 8)
  - [x] 4.1 实现 `resolvePhase2(skill: AffixSkillInstance, runtimeState: SkillRuntimeState, ctx: TriggerContext, baseOutput: number): { output: number, bonusPercent: number, mutations: StateMutation[] }`
  - [x] 4.2 遍历 `skill.affixes`，按类型累加 `bonusPercent`：
    - **Convert**: `k_eff = k × (hasQuestRefine ? 1.1^c : 1)`; `bonusPercent += k_eff × getAffixSourceValue(source, ctx)`
    - **Void**: `slot_eff = bonusPerSlot + (hasQuestDevour ? c × 0.05 : 0)`; 统计 posRel 范围内空位数; `bonusPercent += emptyCount × slot_eff`
    - **Charge**: `max_eff = maxBonus + (hasQuestEnergize ? c × 0.3 : 0)`; `bonusPercent += min(chargeAccumulated, max_eff)`; 记录蓄力清零 mutation
    - **Outcast**: 判断 triggerKey 是否为 currentWord 首/尾字母; `bonusPercent += outcastBonus + (hasQuestCharge ? c × 0.15 : 0)`
    - **Amplify**: `vps_eff = valuePerStack + (hasQuestStack ? c × 0.005 : 0)`; 累加邻居增幅层数 + 自身层数（同资源时）
    - **Taboo**: `bonusPercent += 1.0`（固定 +100%，负产出在 Phase 3）
  - [x] 4.3 遍历 `skill.enchantmentIds`，处理加算附魔：
    - **Apprentice 系列**: `bonusPercent += apprenticeAccumulated`
    - **QuestDevour(c>=3)**: `bonusPercent += c × 0.10`
    - **Overflow**: `bonusPercent += countSaturatedFragments × 0.20`
    - **LetterAffinity**: 队列含 triggerKey 时 `bonusPercent += 0.25`
    - **Unstable**: resource 匹配时 `bonusPercent += 0.30`
  - [x] 4.4 返回 `baseOutput × (1 + bonusPercent)`

- [x] Task 5: 实现 Phase 3 — 乘算层 (AC: 4, 5, 6, 7)
  - [x] 5.1 实现 `resolvePhase3(skill: AffixSkillInstance, runtimeState: SkillRuntimeState, ctx: TriggerContext, input: number): { output: number, multipliers: number[], flags: TriggerFlags, mutations: StateMutation[] }`
  - [x] 5.2 遍历 `skill.affixes`，按类型独立相乘：
    - **Multiply**: `output *= multiplier + (hasQuestAscend ? c × 0.15 : 0)`
    - **Crit**: `if roll(chance) → output *= critMult + (hasQuestOverload ? c × 0.5 : 0)`
    - **Pulse**: `if triggerCount % interval === 0 → output *= burstMult + (hasQuestEcho ? c × 0.3 : 0)`
    - **Decay**: `output *= currentDecayMult`; `floor_eff = max(0.1, floor - (hasQuestPurify ? c × 0.05 : 0))`; 记录 mutation: `currentDecayMult = max(floor_eff, currentDecayMult - decayPerTrigger)`
    - **Cascade**: `if hasRelation(prevKey, triggerKey, posRel) → output *= cascadeMult + (hasQuestChain ? c × 0.2 : 0)`
    - **Ligature**: `n = countOccurrences(key, currentWord); if n >= 2 → output *= n`（QuestOverlap 在 Story 35.6 实现）
    - **Taboo**: `if roll(penaltyChance - (hasQuestSacrifice ? c × 0.01 : 0)) → output *= -1`
  - [x] 5.3 预留 MultiplyOperator 附魔接口（具体逻辑 Story 35.7 实现）
  - [x] 5.4 返回 output + 所有乘算因子列表 + 标志位

- [x] Task 6: 辅助函数 (AC: 5, 8)
  - [x] 6.1 `countEmptySlots(key: string, posRel: PositionRelation, bindings: Map<string, string>): number` — 统计 posRel 范围内空位
  - [x] 6.2 `isFirstOrLastLetter(key: string, word: string): boolean` — 流放判定
  - [x] 6.3 `countOccurrences(key: string, word: string): number` — 连字字母计数
  - [x] 6.4 `sumNeighborAmplifyStacks(key: string, posRel: PositionRelation, resource: ResourceType, vpsEff: number, ctx: TriggerContext): number` — 邻居增幅层数加成
  - [x] 6.5 `hasEnchantment(skill: AffixSkillInstance, enchType: EnchantmentType): boolean` — 检查技能是否有指定附魔（命名调整，更通用）
  - [x] 6.6 `getQuestCompletions(skill: AffixSkillInstance, runtimeState: SkillRuntimeState, questType: EnchantmentType): number` — 获取任务完成次数

- [x] Task 7: 组合入口函数 (AC: 9)
  - [x] 7.1 实现 `triggerAffixSkill(skill: AffixSkillInstance, runtimeState: SkillRuntimeState, ctx: TriggerContext): TriggerResult`
  - [x] 7.2 串联 Phase 1 → Phase 2 → Phase 3
  - [x] 7.3 收集所有 StateMutation 但不直接修改 state — 返回给调用方 apply
  - [x] 7.4 **例外**：蓄力清零和衰减更新作为必要副作用直接写入 runtimeState

- [x] Task 8: 单元测试 (AC: 1-9)
  - [x] 8.1 Phase 1 测试：各等级基础值、越界保护（8 tests）
  - [x] 8.2 getAffixSourceValue 测试：7 种资源各自读取逻辑、score 含 pending 计算、fragment/mutagen 读 classResourceProduced（9 tests）
  - [x] 8.3 Phase 2 词条测试：
    - Convert：异源/同源，k 值校准 + quest refine 增强
    - Void：空位计数 × bonusPerSlot + quest devour 增强
    - Charge：蓄力释放 + 清零 side effect + quest energize 增强
    - Outcast：首字母/尾字母/中间字母
    - Amplify：自身层数 + 邻居层数
    - Taboo：固定 +100%
  - [x] 8.4 Phase 2 附魔测试：Apprentice 累积、QuestDevour(c>=3)加成、LetterAffinity、Overflow、Unstable
  - [x] 8.5 Phase 3 词条测试：
    - Multiply：基础乘算
    - Crit：概率触发（injected randomFn 验证）
    - Pulse：计数取模爆发 + triggerCount=0 不触发
    - Decay：乘算 + 衰减 side effect + floor
    - Cascade：prevKey 位置关系判定
    - Ligature：字母计数 × N（2次、3次）
    - Taboo：概率负产出
  - [x] 8.6 任务增强测试：Convert/Crit/Pulse/Decay/Void 5 种关键增强公式验证
  - [x] 8.7 组合测试：白装(0词条)、蓝装(1词条 Multiply)、黄装(2词条 Taboo+Multiply)、橙装(3词条 Outcast+Multiply+Crit)
  - [x] 8.8 副作用测试：蓄力清零、衰减更新正确反映在 runtimeState 中
  - [x] 8.9 边界测试：空词条（白装）、无附魔、prevKey 为 undefined（级联不触发）

## Dev Notes

### 架构决策

**新文件：**
- **新建** `src/src/data/affixTrigger.ts` — Phase 1-3 触发计算核心逻辑
- **新建** `src/tests/unit/data/affixTrigger.test.ts` — 单元测试
- **不修改**任何现有文件 — 新系统与旧系统并行，后续 Story 集成时替换调用链

**设计原则：**
- **纯函数 + 显式副作用**：Phase 2-3 计算返回 `TriggerResult`，蓄力清零/衰减更新是唯一必要副作用（直接写入传入的 runtimeState）
- **随机函数注入**：暴击/禁忌掷骰使用 `ctx.randomFn`（而非全局 `random()`），方便测试时注入确定性随机
- **上下文隔离**：`TriggerContext` 是只读快照，不直接引用 `state` 全局对象 — 降低耦合，支持未来并行计算
- **任务增强内联**：每个词条参数在计算时检查 `questCompletions`，不额外存储增强后的值 — 保持 `AffixInstance` 不可变

### 现有依赖（必须复用）

**`src/src/data/affixes.ts`（Story 35.1 产物）：**
```typescript
import {
  AffixType, AffixInstance, AffixSkillInstance, SkillRuntimeState, SkillRarity,
  EnchantmentType, QUEST_AFFIX_MAP,
} from './affixes'
```

**`src/src/data/keyboardTopology.ts`：**
```typescript
import { hasRelation, getKeysWithRelation, PositionRelation } from './keyboardTopology'
// hasRelation(keyA, keyB, posRel): boolean
// getKeysWithRelation(key, posRel): string[]
```

**`src/src/core/types.ts`：**
```typescript
import type { ResourceType, ResourceState } from '../core/types'
```

**`src/src/data/converters.ts`（参考实现，不直接导入）：**
```typescript
// getSourceValue(source, resources, classResourceProduced) 的逻辑作为参考
// score 特殊：resources.score + resources.base * resources.multiplier
// fragment/mutagen：从 classResourceProduced 读取
```

### 设计文档精确算法

**Phase 2 加算层（设计文档 §五）：**
```
bonusPercent = 0

// 转化（精炼: k ×1.1^c）
if Convert: k_eff = k × (精炼 ? 1.1^c : 1); bonusPercent += k_eff × getSourceValue(source)

// 虚无（吞噬: bonusPerSlot +5%×c）
if Void: slot_eff = bonusPerSlot + (吞噬 ? c × 0.05 : 0); bonusPercent += countEmptySlots(posRel) × slot_eff

// 蓄力（充能: maxBonus +0.3×c）
if Charge: max_eff = maxBonus + (充能 ? c × 0.3 : 0); bonusPercent += min(chargeAccumulated, max_eff); chargeAccumulated = 0

// 流放（蓄势: bonusPercent +15%×c）
if Outcast: if isFirstOrLastLetter → bonusPercent += bonusPercent + (蓄势 ? c × 0.15 : 0)

// 增幅（层叠: valuePerStack +0.005×c）
if Amplify: vps_eff = valuePerStack + (层叠 ? c × 0.005 : 0); bonusPercent += sumNeighborAmplifyStacks(vps_eff)

// 禁忌
if Taboo: bonusPercent += 1.0

// 学徒附魔
if 学徒: bonusPercent += apprenticeAccumulated

// 被动附魔
if 满溢: bonusPercent += count × 0.20
if 字母亲和: bonusPercent += 0.25
if 不稳定: bonusPercent += 0.30

output = output × (1 + bonusPercent)
```

**Phase 3 乘算层（设计文档 §五）：**
```
if Multiply:  output *= multiplier + (升华 ? c × 0.15 : 0)
if Crit:      if roll(chance) → output *= critMult + (过载 ? c × 0.5 : 0)
if Pulse:     if triggerCount % interval === 0 → output *= burstMult + (回响 ? c × 0.3 : 0)
if Decay:     output *= currentDecayMult; floor_eff = max(0.1, floor - (净化 ? c × 0.05 : 0))
              currentDecayMult = max(floor_eff, currentDecayMult - decayPerTrigger)
if Cascade:   if hasRelation(prevKey, thisKey, posRel) → output *= cascadeMult + (连锁 ? c × 0.2 : 0)
if Ligature:  n = countOccurrences(key, currentWord); if n >= 2 → output *= n
if Taboo:     if roll(penaltyChance) → output *= -1
```

**任务增强公式对照表（18 种）：**

| 任务附魔 | 对应词条 | 增强公式 | Phase |
|---------|---------|---------|-------|
| QuestRefine | Convert | `k × 1.1^c` | 2 |
| QuestDevour | Void | `bonusPerSlot + c×0.05` | 2 |
| QuestEnergize | Charge | `maxBonus + c×0.3` | 2 |
| QuestCharge | Outcast | `bonusPercent + c×0.15` | 2 |
| QuestStack | Amplify | `valuePerStack + c×0.005` | 2 |
| QuestAscend | Multiply | `multiplier + c×0.15` | 3 |
| QuestOverload | Crit | `critMult + c×0.5` | 3 |
| QuestEcho | Pulse | `burstMult + c×0.3` | 3 |
| QuestPurify | Decay | `floor - c×0.05 (min 0.1)` | 3 |
| QuestChain | Cascade | `cascadeMult + c×0.2` | 3 |
| QuestOverlap | Ligature | 连字 N 上限 +c（Story 35.6 实现） | 3 |
| QuestSacrifice | Taboo | `penaltyChance - c×0.01 (min 0.02)` | 3 |
| QuestPolarize | Gravity | Phase 外（词语选择时生效） | - |
| QuestSpectrum | Rainbow | Phase 4（资源选择时生效） | - |
| QuestMirror | Mirror | Phase 外（每关刷新时生效） | - |
| QuestFission | Replicate | Phase 5（后触发时生效） | - |
| QuestResonance | Resonance+Link | Phase 6（邻居通知时生效） | - |
| QuestIterate | Recurse | Phase 5（后触发时生效） | - |

### 现有系统参考

**现有触发流程（`skills.ts:triggerProducer`，约 L431-570）：**
- 3 阶段计算：base → mechanic add(蓄力/虚无) → mechanic mult(衰减/脉冲/暴击)
- 增幅者作为独立系统提供百分比加成
- 附魔通过 `getEnchantmentMultiplier()` 提供乘算
- 遗物通过 `getRelicSkillMultiplier()` 提供乘算
- **新系统对比**：词条直接内嵌在技能实例中，不再查外部 PRODUCERS/CONVERTERS 表

**现有 `getSourceValue`（`converters.ts:L125-133`）：**
```typescript
if (source === 'fragment' || source === 'mutagen') return classResourceProduced?.[source] ?? 0;
if (source === 'score') return resources.score + resources.base * resources.multiplier;
return resources[source];
```

**键盘拓扑查询（`keyboardTopology.ts`）：**
- `hasRelation(keyA, keyB, posRel)` — 两键是否满足位置关系
- `getKeysWithRelation(key, posRel)` — 获取满足关系的所有键

### Project Structure Notes

- 新文件 `src/src/data/affixTrigger.ts` 放在 data 层（与 `affixes.ts`, `skillGeneration.ts` 同级），因为是纯计算逻辑，不依赖 UI 或系统层
- 测试文件 `src/tests/unit/data/affixTrigger.test.ts` 对齐现有测试目录结构
- 不修改 `src/src/systems/skills.ts` — 集成到战斗系统的调用在后续 Story 中完成

### References

- [Source: docs/design/affix-skill-system.md#五、触发计算流程] — Phase 1-3 伪代码
- [Source: docs/design/affix-skill-system.md#4.5、附魔系统] — 学徒/任务/被动附魔定义
- [Source: docs/stories/epic-35-affix-skill-system.md#Story 35.3] — 9 个验收标准
- [Source: src/src/data/affixes.ts] — AffixType, AffixInstance, SkillRuntimeState, EnchantmentType, QUEST_AFFIX_MAP
- [Source: src/src/data/converters.ts#L119-133] — getSourceValue 参考实现
- [Source: src/src/systems/skills.ts#L431-570] — 现有 triggerProducer 3 阶段计算参考
- [Source: src/src/data/keyboardTopology.ts] — hasRelation, getKeysWithRelation

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- 实现了完整的 Phase 1~3 触发流水线，包含 4 个接口（TriggerContext, TriggerResult, TriggerFlags, StateMutation）、3 个阶段函数（resolvePhase1/2/3）、1 个组合入口（triggerAffixSkill）和 6 个辅助函数
- Phase 2 加算层覆盖 6 种词条（Convert/Void/Charge/Outcast/Amplify/Taboo）和 5 种附魔（Apprentice系列/QuestDevour/Overflow/LetterAffinity/Unstable）
- Phase 3 乘算层覆盖 7 种词条（Multiply/Crit/Pulse/Decay/Cascade/Ligature/Taboo）
- 12 种任务增强公式按设计文档在 Phase 2-3 内联实现（其余 6 种在 Phase 4-6 实现，本 Story 范围外）
- 随机函数通过 ctx.randomFn 注入，支持确定性测试
- 蓄力清零和衰减更新作为唯一副作用直接写入 runtimeState
- MultiplyOperator 附魔预留接口（具体逻辑 Story 35.7 实现）
- 93 个单元测试全部通过，覆盖所有 AC
- 无回归：198 个 affix 相关测试全部通过（45 affixes + 60 skillGeneration + 93 affixTrigger）

### File List

- `src/src/data/affixTrigger.ts` — **新建** Phase 1-3 触发计算核心逻辑（~330 行）
- `src/tests/unit/data/affixTrigger.test.ts` — **新建** 93 个单元测试（~620 行）
