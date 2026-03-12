# Story 35.2: 技能生成引擎

Status: done

## Story

作为开发者，
我想实现运行时随机生成技能的完整流程（稀有度掷骰 → 词条加权抽取 → 参数掷骰 → 自动命名），
以便商店和后续系统能调用 `generateSkill()` 获取随机组合的词条制技能。

## Acceptance Criteria

1. `rollRarity()` 按概率分布返回 0~3（白40%/蓝30%/黄20%/橙10%） ✅
2. `weightedSampleWithout(pool, count)` 从词条池加权不重复抽取 N 个词条类型 ✅
3. `rollAffixParams(type, resource)` 为每种词条类型生成参数实例，含所有 20 种 case（转化词条区分同源/异源权重；虚无/共鸣/倒影/连接/复制/增幅/级联按 PositionRelation 掷骰；引力 probMult 0~2 均匀分布） ✅
4. `generateSkill()` 完整流程：随机资源 → 掷稀有度 → 抽词条 → 掷参数 → 生成名字 → 生成唯一 ID ✅
5. `generateName(resource, affixes)` 按 "词条1·词条2·…·资源名" 格式生成中文名 ✅
6. 转化词条同源（source === skill.resource）使用独立低权重（3 vs 异源 10），k 值按 `CONVERT_K_TABLE` 校准 ✅
7. 生成的技能可通过 JSON.stringify/parse 往返序列化，不丢失信息 ✅

## Tasks / Subtasks

- [x] Task 1: 创建技能生成模块 (AC: 1, 2)
  - [x] 1.1 在 `src/src/data/` 下新建 `skillGeneration.ts`
  - [x] 1.2 实现 `rollRarity(): SkillRarity` — 使用 `RARITY_PROBABILITIES` 和全局 `random()`
  - [x] 1.3 实现 `weightedSampleWithout(pool, count): AffixType[]` — 从带权重池中不重复抽取
  - [x] 1.4 实现辅助函数 `roundTo(n: number, decimals: number): number`

- [x] Task 2: 实现词条参数掷骰 (AC: 3, 6)
  - [x] 2.1 实现 `rollAffixParams(type: AffixType, resource: ResourceType): AffixInstance`
  - [x] 2.2 Multiply: `multiplier = roundTo(1.3 + random() * 0.7, 2)`
  - [x] 2.3 Convert: `source = pickRandom(ALL_RESOURCES)`, k 按 `CONVERT_K_TABLE[source]` 区间掷骰
  - [x] 2.4 Charge/Decay/Pulse/Crit: 固定参数（见 Dev Notes 精确值）
  - [x] 2.5 Void: `posRel = pickRandom(ALL_POS_RELATIONS)`, `bonusPerSlot = VOID_BONUS_TABLE[posRel]`
  - [x] 2.6 Resonance: `posRel + efficiency = RESONANCE_EFFICIENCY_TABLE[posRel]`
  - [x] 2.7 Mirror/Link/Replicate/Amplify/Cascade: 各自 posRel 掷骰 + 类型特定参数
  - [x] 2.8 Outcast: `bonusPercent = roundTo(0.4 + random() * 0.4, 2)`
  - [x] 2.9 Gravity: `probMult = roundTo(random() * 2.0, 2)`
  - [x] 2.10 Ligature/Twin/Rainbow: 无参数，直接返回 `{ type }`
  - [x] 2.11 Recurse: `recurseChance = roundTo(0.15 + random() * 0.15, 2)`
  - [x] 2.12 Taboo: `bonusPercent: 1.0, penaltyChance: 0.10`

- [x] Task 3: 实现自动命名与完整生成 (AC: 4, 5, 7)
  - [x] 3.1 实现 `generateName(resource: ResourceType, affixes: AffixInstance[]): string`
  - [x] 3.2 命名格式：白装 "基数"，蓝装 "暴击·基数"，黄装 "暴击·蓄力·基数"，橙装 "暴击·蓄力·共鸣·基数"
  - [x] 3.3 实现 `generateSkill(options?): AffixSkillInstance` 完整流程
  - [x] 3.4 唯一 ID 生成：`skill_${Date.now()}_${random().toString(36).slice(2, 6)}`
  - [x] 3.5 返回 `AffixSkillInstance`，`level: 1`，`enchantmentIds: []`，`purchasePrice` 可选
  - [x] 3.6 验证 JSON 序列化往返不丢失信息

- [x] Task 4: 转化词条同源/异源权重处理 (AC: 6)
  - [x] 4.1 在 `weightedSampleWithout` 中：对 `AffixType.Convert`，生成时先判断抽到的是同源还是异源
  - [x] 4.2 同源判定：当 `rollAffixParams` 中 `source === resource` 时视为同源，使用 `convert_self` 权重(3)
  - [x] 4.3 异源使用 `convert_cross` 权重(10)
  - [x] 4.4 注意：权重影响**是否被抽到**（在池中），而非参数掷骰。Convert 在池中作为单一类型，其权重为 `convert_cross + convert_self = 13`，抽到后再按 `source` 概率区分

- [x] Task 5: 单元测试
  - [x] 5.1 `rollRarity` 分布测试：10000 次掷骰，各稀有度占比在期望值 ±5% 内
  - [x] 5.2 `weightedSampleWithout` 测试：不重复、数量正确、高权重类型出现频率更高
  - [x] 5.3 `rollAffixParams` 20 种类型全覆盖：每种返回正确字段、值在合法范围内
  - [x] 5.4 `generateSkill` 端到端：生成 100 个技能，白装0词条/蓝装1词条/黄装2词条/橙装3词条
  - [x] 5.5 `generateName` 格式测试：各稀有度命名格式正确
  - [x] 5.6 JSON 序列化往返测试
  - [x] 5.7 转化同源/异源权重差异测试

## Dev Notes

### 架构决策

**新文件：**
- **新建** `src/src/data/skillGeneration.ts` — 所有生成函数
- **新建** `src/tests/unit/data/skillGeneration.test.ts` — 单元测试
- **不修改**任何现有文件 — 纯新增

**设计原则：**
- 所有随机调用使用 `random()` from `../core/seededRandom`（支持每日种子）
- 不引入外部依赖
- 纯函数设计（除 `random()` 副作用），方便测试

### 现有依赖（必须复用）

**`src/src/data/affixes.ts`（Story 35.1 产物）：**
```typescript
import {
  AffixType, AffixInstance, AffixSkillInstance, SkillRarity,
  AFFIX_WEIGHTS, AffixWeightKey,
  BASE_VALUES, RARITY_PROBABILITIES,
  VOID_BONUS_TABLE, RESONANCE_EFFICIENCY_TABLE, CONVERT_K_TABLE,
  AFFIX_NAMES, RESOURCE_NAMES,
} from './affixes'
```

**`src/src/core/seededRandom.ts`：**
```typescript
import { random } from '../core/seededRandom'
// random(): number — 全局随机函数，[0, 1)，支持种子模式
```

**`src/src/core/types.ts`：**
```typescript
import type { ResourceType } from '../core/types'
// 7 种资源: 'base' | 'score' | 'multiplier' | 'time' | 'gold' | 'fragment' | 'mutagen'
```

**`src/src/core/constants.ts`：**
```typescript
import { RESOURCE_ICONS } from '../core/constants'
// 资源图标: base='⚔️', score='🪙', multiplier='🔥', time='⏳', gold='💰', fragment='🔤', mutagen='🧬'
```

**`src/src/data/keyboardTopology.ts`：**
```typescript
import { PositionRelation } from './keyboardTopology'
// 6 种位置关系: Adjacent, SameRow, SameColumn, SameHand, SameFinger, Symmetric
```

### 设计文档精确算法

**§八 稀有度掷骰：**
```typescript
function rollRarity(): SkillRarity {
  const r = random()
  if (r < 0.40) return 0  // 白 40%
  if (r < 0.70) return 1  // 蓝 30%
  if (r < 0.90) return 2  // 黄 20%
  return 3                 // 橙 10%
}
// 也可改为查 RARITY_PROBABILITIES 累积分布
```

**§八 加权不重复抽取：**
```typescript
function weightedSampleWithout(pool: Map<AffixType|string, number>, count: number): AffixType[] {
  const result: AffixType[] = []
  const remaining = new Map(pool) // 复制池
  for (let i = 0; i < count; i++) {
    const totalWeight = [...remaining.values()].reduce((a, b) => a + b, 0)
    let roll = random() * totalWeight
    for (const [type, weight] of remaining) {
      roll -= weight
      if (roll <= 0) {
        result.push(type as AffixType) // convert_cross/self 需映射回 AffixType.Convert
        remaining.delete(type)
        // 转化抽到后：同时移除 convert_cross 和 convert_self
        if (type === 'convert_cross' || type === 'convert_self') {
          remaining.delete('convert_cross')
          remaining.delete('convert_self')
        }
        break
      }
    }
  }
  return result
}
```

**转化词条的特殊处理：**
- `AFFIX_WEIGHTS` 中 Convert 拆为 `convert_cross: 10` 和 `convert_self: 3`
- 在权重池中作为两个独立项参与抽取
- 抽到 `convert_cross` → `rollAffixParams(Convert, resource)` 时强制 `source ≠ resource`
- 抽到 `convert_self` → `rollAffixParams(Convert, resource)` 时强制 `source === resource`
- 抽到任一后，两项同时从池中移除（不重复）

**§八 词条参数掷骰精确值：**

| 词条 | 参数 | 值域 |
|------|------|------|
| Multiply | multiplier | 1.3 ~ 2.0 (uniform) |
| Convert | source + k | source=random(7资源), k=CONVERT_K_TABLE[source][0~1] uniform |
| Rainbow | (无) | — |
| Charge | gainPerSec, maxBonus | 固定 0.08, 2.0 |
| Decay | initialMult, decayPerTrigger, floor | 固定 2.0, 0.15, 0.5 |
| Pulse | interval, burstMult | 固定 4, 3.0 |
| Crit | chance, critMult | 固定 0.5, 2.0 |
| Cascade | posRel, cascadeMult | random(6), 1.8 ~ 2.5 uniform |
| Void | posRel, bonusPerSlot | random(6), VOID_BONUS_TABLE[posRel] |
| Resonance | posRel, efficiency | random(6), RESONANCE_EFFICIENCY_TABLE[posRel] |
| Mirror | posRel | random(6) |
| Link | posRel, resource | random(6), random(7资源) |
| Replicate | posRel | random(6) |
| Amplify | posRel, resource, valuePerStack | random(6), 使用技能资源, 0.02 |
| Outcast | bonusPercent | 0.4 ~ 0.8 uniform |
| Gravity | probMult | 0 ~ 2.0 uniform |
| Ligature | (无) | — |
| Twin | (无) | — |
| Recurse | recurseChance | 0.15 ~ 0.30 uniform |
| Taboo | bonusPercent, penaltyChance | 固定 1.0, 0.10 |

> **注意 Amplify.resource**：设计文档 §八 明确写 `resource`（使用技能本身的资源类型），不是随机资源。

**§九 自动命名：**
```typescript
function generateName(resource: ResourceType, affixes: AffixInstance[]): string {
  const prefix = affixes.map(a => AFFIX_NAMES[a.type]).join('·')
  const base = RESOURCE_NAMES[resource]
  return prefix ? `${prefix}·${base}` : base
}
```

**§八 完整生成流程：**
```typescript
function generateSkill(): AffixSkillInstance {
  const resource = pickRandom(ALL_RESOURCES)
  const rarity = rollRarity()
  const types = weightedSampleWithout(buildAffixPool(), rarity)
  const affixes = types.map(t => rollAffixParams(t, resource))
  const name = generateName(resource, affixes)
  const id = `skill_${Date.now()}_${random().toString(36).slice(2, 6)}`
  return {
    id, name, icon: RESOURCE_ICONS[resource],
    resource, baseValues: BASE_VALUES[resource],
    level: 1, rarity: rarity as SkillRarity,
    affixes, enchantmentIds: [],
  }
}
```

### 现有代码模式参考

**加权抽取模式** — `src/src/data/converters.ts` 的 `drawConverterPool` 使用 `seededShuffle` + 手动权重。本 Story 的 `weightedSampleWithout` 更通用（按权重逐个抽取），不同于现有的 shuffle 方式。

**常量复用** — `ALL_RESOURCES` 和 `ALL_POS_RELATIONS` 需定义为常量数组（或从已有常量导出）：
```typescript
const ALL_RESOURCES: ResourceType[] = ['base', 'score', 'multiplier', 'time', 'gold', 'fragment', 'mutagen']
const ALL_POS_RELATIONS = Object.values(PositionRelation)
```

**`pickRandom` 辅助函数：**
```typescript
function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(random() * arr.length)]
}
```

### 测试策略

- 分布测试使用大样本量（10000 次）+ 误差容忍（±5%）
- 参数范围测试：对每种词条类型生成 100 个实例，验证所有字段在合法范围
- 使用 `setSeededMode(seed)` / `setNormalMode()` 确保测试可重复
- JSON 序列化测试：`JSON.parse(JSON.stringify(skill))` 后 `deepEqual`

### 35.1 Code Review 经验

- `AFFIX_WEIGHTS` 已改为类型安全的 `Record<AffixWeightKey, number>`，key 为 `Exclude<AffixType, AffixType.Convert> | 'convert_cross' | 'convert_self'`
- `currentDecayMult` 默认为 1（中性乘数），不是 0
- 避免双重真相源：如果需要新常量，集中定义

### Project Structure Notes

- 新文件放在 `src/src/data/skillGeneration.ts` — 与 `affixes.ts`, `producers.ts` 同级
- 测试文件放在 `src/tests/unit/data/skillGeneration.test.ts`
- import 路径：`../core/seededRandom`, `../core/types`, `../core/constants`, `./affixes`, `./keyboardTopology`
- 本 Story 只新增文件，**不修改任何现有文件**

### References

- [Source: docs/design/affix-skill-system.md#八、生成规则] — 完整生成算法
- [Source: docs/design/affix-skill-system.md#九、自动命名] — 命名规则
- [Source: docs/design/affix-skill-system.md#四、词条池] — 20 词条参数定义
- [Source: src/src/data/affixes.ts] — Story 35.1 产物：类型系统与常量表
- [Source: src/src/core/seededRandom.ts] — 全局随机函数 `random()` + `setSeededMode()`
- [Source: src/src/core/types.ts:13] — ResourceType 定义
- [Source: src/src/core/constants.ts] — RESOURCE_ICONS 定义
- [Source: src/src/data/keyboardTopology.ts] — PositionRelation 枚举
- [Source: src/src/data/converters.ts] — 现有 `drawConverterPool` 加权抽取模式参考
- [Source: docs/stories/epic-35-affix-skill-system.md] — Epic 35 完整依赖关系

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No debug issues encountered.

### Completion Notes List

- All 7 ACs verified through 60 unit tests (all passing)
- `weightedSampleWithout` uses `WeightedSampleResult` interface with `convertVariant` field to distinguish cross/self before rollAffixParams
- Convert handling: pool entries `convert_cross`(10) and `convert_self`(3) both removed when either is drawn; variant passed to `rollAffixParams` to enforce source constraint
- `rollAffixParams` covers all 20 `AffixType` cases with design-doc-exact parameter ranges + exhaustive `never` default
- `Amplify.resource` correctly uses skill's own resource (not random), per design doc §八
- Seeded random tests use `setSeededMode(seed)` for reproducibility
- No existing files modified — pure additions only

### Code Review Fixes

- **H1**: Added `default: { const _exhaustive: never = type; throw ... }` to `rollAffixParams` switch — 编译期+运行时穷举保护
- **H2**: Added `ALL_RESOURCES` completeness test — 验证与 `RESOURCE_NAMES`/`BASE_VALUES`/`RESOURCE_ICONS` 键一致
- **M1**: Removed unused `AffixWeightKey` import from `skillGeneration.ts`
- **M2**: Fixed ID generation edge case — `random() || 0.0001` 防止 `toString(36).slice(2,6)` 返回空串
- **M3**: Added `weightedSampleWithout(100)` boundary test — 验证 count > 池大小时优雅降级
- **L1**: Added comment to `roundTo(-1.555, 2)` test explaining JS floating-point behavior

### File List

- `src/src/data/skillGeneration.ts` — NEW: skill generation engine (253 lines)
  - Exports: `roundTo`, `pickRandom`, `rollRarity`, `weightedSampleWithout`, `rollAffixParams`, `generateName`, `generateSkill`
  - Types: `WeightedSampleResult`, `GenerateSkillOptions`
- `src/tests/unit/data/skillGeneration.test.ts` — NEW: 60 unit tests
  - Covers: roundTo, pickRandom, ALL_RESOURCES completeness, rollRarity distribution, weightedSampleWithout (no-dup, weight, boundary), rollAffixParams (all 20 types), generateName (all formats), generateSkill (e2e), JSON roundtrip, convert cross/self differentiation
