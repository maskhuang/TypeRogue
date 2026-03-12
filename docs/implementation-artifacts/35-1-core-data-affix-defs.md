# Story 35.1: 核心数据结构与词条定义

Status: done

## Story

作为开发者，
我想定义词条制技能系统的全部类型系统和数据结构，
以便为后续所有 Story（生成引擎、触发流水线、附魔系统等）提供统一的类型基础。

## Acceptance Criteria

1. `AffixType` 枚举包含 20 个值，分 6 类注释（数值型/节奏型/拓扑型/触发链型/单词感知型/元规则型）
2. `AffixInstance` 接口包含所有词条参数字段（multiplier, source, k, gainPerSec, maxBonus, initialMult, decayPerTrigger, floor, interval, burstMult, chance, critMult, posRel, bonusPerSlot, efficiency, resource, valuePerStack, cascadeMult, bonusPercent, probMult, recurseChance, penaltyChance）
3. `SkillInstance` 包含 id, name, icon, resource, baseValues, level, rarity, affixes: AffixInstance[], enchantmentIds: string[]
4. `SkillRuntimeState` 包含词条状态（chargeAccumulated, currentDecayMult, mirrorCopiedAffix, triggerCount, amplifyStacks）和附魔状态（apprenticeAccumulated, questStacks, questCompletions）
5. `EnchantmentType` 枚举包含 48 个值（溅射1 + 学徒12 + 任务18 + 衍生1 + 被动4 + 乘算化1 + 溅射posRel变体按运行时处理）
6. 词条权重表 `AFFIX_WEIGHTS` 定义所有 20 个词条的权重
7. 常量表：`VOID_BONUS_TABLE`、`RESONANCE_EFFICIENCY_TABLE`、`CONVERT_K_TABLE`、`BASE_VALUES`（7 种资源 × 3 等级）
8. `AFFIX_NAMES` 和 `RESOURCE_NAMES` 映射表用于自动命名
9. 旧系统的 Producer/Converter/Connector/Replicator/Amplifier 类型标记为 deprecated，相关 ID 加入 `DELETED_SKILL_IDS`

## Tasks / Subtasks

- [x] Task 1: 创建词条类型枚举与接口 (AC: 1, 2)
  - [x] 1.1 在 `src/src/data/` 下新建 `affixes.ts`
  - [x] 1.2 定义 `AffixType` 枚举（20 值，6 类别注释）
  - [x] 1.3 定义 `AffixCategory` 类型（'numeric' | 'rhythm' | 'topology' | 'trigger_chain' | 'word_sense' | 'meta_rule'）
  - [x] 1.4 定义 `AFFIX_CATEGORY_MAP: Record<AffixType, AffixCategory>` 便于按类别查询
  - [x] 1.5 定义 `AffixInstance` 接口，所有参数为可选字段（每种词条只填对应参数）

- [x] Task 2: 创建附魔类型枚举 (AC: 5)
  - [x] 2.1 定义在 `affixes.ts` 中（与词条类型同文件）
  - [x] 2.2 定义 `EnchantmentType` 枚举（37 值）：溅射(1) + 学徒(12) + 任务(18) + 衍生(1) + 被动(4) + 乘算化(1)
  - [x] 2.3 定义 `QUEST_AFFIX_MAP: Record<EnchantmentType, AffixType | AffixType[]>` — 任务附魔↔词条映射表（共振同时对应 Resonance + Link）

- [x] Task 3: 创建 SkillInstance 与 SkillRuntimeState (AC: 3, 4)
  - [x] 3.1 定义 `AffixSkillInstance` 接口（避免与旧 SkillInstance 冲突）
  - [x] 3.2 定义 `SkillRuntimeState` 接口（词条状态 5 字段 + 附魔状态 3 字段）
  - [x] 3.3 定义 `SkillRarity = 0 | 1 | 2 | 3`
  - [x] 3.4 定义 `RARITY_NAMES` 和 `RARITY_COLORS` 常量表

- [x] Task 4: 创建常量表 (AC: 6, 7, 8)
  - [x] 4.1 `BASE_VALUES: Record<ResourceType, [number, number, number]>` — 7 资源 × 3 等级基础值
  - [x] 4.2 `AFFIX_WEIGHTS: Record<string, number>` — 20 个词条权重（转化拆分异源10/同源3）
  - [x] 4.3 `VOID_BONUS_TABLE: Record<PositionRelation, number>` — 6 posRel → bonusPerSlot
  - [x] 4.4 `RESONANCE_EFFICIENCY_TABLE: Record<PositionRelation, number>` — 6 posRel → efficiency
  - [x] 4.5 `CONVERT_K_TABLE: Record<ResourceType, [number, number]>` — 7 资源的 k_min/k_max
  - [x] 4.6 `AFFIX_NAMES: Record<AffixType, string>` — 20 个中文名
  - [x] 4.7 `RESOURCE_NAMES: Record<ResourceType, string>` — 7 个中文名

- [x] Task 5: 更新 DELETED_SKILL_IDS (AC: 9)
  - [x] 5.1 在现有 `data/skills.ts` 的 `DELETED_SKILL_IDS` 中添加注释标记旧系统为 deprecated
  - [x] 5.2 **不在本 Story 中实际删除旧代码** — 旧系统保持运行，后续 Story 逐步迁移

- [x] Task 6: 单元测试
  - [x] 6.1 测试 `AffixType` 枚举有 20 个值
  - [x] 6.2 测试 `EnchantmentType` 枚举有 37 个值（溅射/衍生各计1，posRel变体运行时处理）
  - [x] 6.3 测试 `AFFIX_WEIGHTS` 所有 AffixType 都有对应权重
  - [x] 6.4 测试 `BASE_VALUES` 所有 ResourceType 都有 3 级值
  - [x] 6.5 测试 `VOID_BONUS_TABLE` 和 `RESONANCE_EFFICIENCY_TABLE` 覆盖所有 6 种 PositionRelation
  - [x] 6.6 测试 `CONVERT_K_TABLE` 所有 7 种资源都有 [k_min, k_max] 且 k_min < k_max
  - [x] 6.7 测试 `QUEST_AFFIX_MAP` 18 个任务附魔都有对应词条类型
  - [x] 6.8 测试 `AFFIX_NAMES` 和 `RESOURCE_NAMES` 覆盖所有枚举值

## Dev Notes

### 架构决策

**新文件 vs 修改现有文件：**
- **新建** `src/src/data/affixes.ts` — 所有词条相关类型、枚举、常量表
- **保留** 现有 `producers.ts`, `converters.ts`, `enchantments.ts` **不动** — 旧系统继续运行，后续 Story 迁移
- **保留** 现有 `core/types.ts` 中的 `SkillInstance` — 新的 `SkillInstance` 使用不同名称或在新文件中定义，避免冲突

**命名策略：**
- 新类型使用 `Affix` 前缀（`AffixType`, `AffixInstance`）避免与旧系统冲突
- 新的 `SkillInstance` 可暂命名为 `AffixSkillInstance`，待迁移完成后重命名
- `SkillRuntimeState` 是全新类型，不与旧 `GameState` 中的 Map 字段冲突

### 现有类型系统（必须复用，不要重新定义）

**`ResourceType`** — 定义于 `src/src/core/types.ts:13`
```typescript
type ResourceType = 'base' | 'score' | 'multiplier' | 'time' | 'gold' | 'fragment' | 'mutagen'
```

**`PositionRelation`** — 定义于 `src/src/data/keyboardTopology.ts:9-16`
```typescript
enum PositionRelation {
  Adjacent = 'adjacent',
  SameRow = 'sameRow',
  SameColumn = 'sameColumn',
  SameHand = 'sameHand',
  SameFinger = 'sameFinger',
  Symmetric = 'symmetric',
}
```

这两个类型直接 import 使用，**不要重新定义**。

### 现有 DELETED_SKILL_IDS 模式

`src/src/data/skills.ts` 已有 54 个 deleted ID：
- 18 个原始技能（Story 19.10）
- 7 个旧 amplifiers
- 7 个旧 multiply producers（Story 34.2）
- 38 个旧 multiply converters（Story 34.3）

本 Story **只添加注释标记**，不新增 deleted ID。实际删除在后续 Story 中进行。

### 设计文档中的精确数值

**BASE_VALUES（§二 基底定义）：**
```typescript
const BASE_VALUES: Record<ResourceType, [number, number, number]> = {
  base:       [5, 8, 12],
  score:      [15, 24, 36],
  multiplier: [0.2, 0.32, 0.48],
  time:       [0.2, 0.32, 0.48],
  gold:       [3, 5, 8],
  fragment:   [1, 1.6, 2.4],
  mutagen:    [1, 1.6, 2.4],
}
```

**AFFIX_WEIGHTS（§八 词条权重表）：**
```typescript
const AFFIX_WEIGHTS: Record<string, number> = {
  multiply: 4,
  convert_cross: 10,  // 异源转化
  convert_self: 3,    // 同源转化
  rainbow: 6,
  charge: 6, decay: 6, pulse: 6, crit: 8, cascade: 4,
  void: 10, resonance: 4, mirror: 3,
  link: 4, replicate: 3, amplify: 3,
  outcast: 6, gravity: 5, ligature: 6,
  twin: 2, recurse: 3, taboo: 4,
}
```
> 注意：转化词条在权重表中拆为两项（异源/同源），实际 `AffixType.Convert` 是一个值，生成时按 `source === skill.resource` 判断使用哪个权重。

**VOID_BONUS_TABLE（§四 虚无词条）：**
```
Adjacent: 0.25, SameRow: 0.10, SameColumn: 0.30,
SameHand: 0.05, SameFinger: 0.35, Symmetric: 0.50
```

**RESONANCE_EFFICIENCY_TABLE（§四 共鸣词条）：**
```
Adjacent: 0.50, SameRow: 0.30, SameColumn: 0.40,
SameHand: 0.15, SameFinger: 0.50, Symmetric: 0.60
```

**CONVERT_K_TABLE（§四 转化词条 k 值校准表）：**
```
base: [0.02, 0.05], score: [0.0005, 0.001], multiplier: [0.10, 0.25],
time: [0.01, 0.025], gold: [0.003, 0.008],
fragment: [0.02, 0.05], mutagen: [0.02, 0.05]
```

### AffixType 完整枚举（§七 数据结构）

```typescript
enum AffixType {
  // 数值型
  Multiply = 'multiply',
  Convert = 'convert',
  Rainbow = 'rainbow',
  // 节奏型
  Charge = 'charge',
  Decay = 'decay',
  Pulse = 'pulse',
  Crit = 'crit',
  Cascade = 'cascade',
  // 键盘拓扑型
  Void = 'void',
  Resonance = 'resonance',
  Mirror = 'mirror',
  // 触发链型
  Link = 'link',
  Replicate = 'replicate',
  Amplify = 'amplify',
  // 单词感知型
  Outcast = 'outcast',
  Gravity = 'gravity',
  Ligature = 'ligature',
  // 元规则型
  Twin = 'twin',
  Recurse = 'recurse',
  Taboo = 'taboo',
}
```

### EnchantmentType 完整枚举（§七 数据结构）

```typescript
enum EnchantmentType {
  // 溅射（1，运行时按 posRel 6 变体）
  Splash = 'splash',
  // 学徒型（12）
  ApprenticeSelf = 'apprentice_self',
  ApprenticeNeighbor = 'apprentice_neighbor',
  ApprenticeWord = 'apprentice_word',
  ApprenticeProc = 'apprentice_proc',
  ApprenticeCrit = 'apprentice_crit',
  ApprenticeOutcast = 'apprentice_outcast',
  ApprenticeLongWord = 'apprentice_longword',
  ApprenticePerfect = 'apprentice_perfect',
  ApprenticeCombo = 'apprentice_combo',
  ApprenticeStage = 'apprentice_stage',
  ApprenticeHarvest = 'apprentice_harvest',
  ApprenticeAdapt = 'apprentice_adapt',
  // 任务型（18，需技能拥有对应词条）
  QuestDevour = 'quest_devour',
  QuestOverload = 'quest_overload',
  QuestEcho = 'quest_echo',
  QuestAscend = 'quest_ascend',
  QuestChain = 'quest_chain',
  QuestPurify = 'quest_purify',
  QuestResonance = 'quest_resonance',
  QuestCharge = 'quest_charge',
  QuestRefine = 'quest_refine',
  QuestEnergize = 'quest_energize',
  QuestFission = 'quest_fission',
  QuestStack = 'quest_stack',
  QuestPolarize = 'quest_polarize',
  QuestSpectrum = 'quest_spectrum',
  QuestMirror = 'quest_mirror',
  QuestOverlap = 'quest_overlap',
  QuestIterate = 'quest_iterate',
  QuestSacrifice = 'quest_sacrifice',
  // 衍生型（1，运行时按 extraResource 7 变体）
  Transmute = 'transmute',
  // 被动型（职业限定，4）
  LetterAffinity = 'letter_affinity',
  Overflow = 'overflow',
  Unstable = 'unstable',
  MutationHunger = 'mutation_hunger',
  // 运算符（1）
  MultiplyOperator = 'multiply_operator',
}
```

### QUEST_AFFIX_MAP（任务↔词条映射）

```typescript
const QUEST_AFFIX_MAP: Partial<Record<EnchantmentType, AffixType | AffixType[]>> = {
  [EnchantmentType.QuestDevour]: AffixType.Void,
  [EnchantmentType.QuestOverload]: AffixType.Crit,
  [EnchantmentType.QuestEcho]: AffixType.Pulse,
  [EnchantmentType.QuestAscend]: AffixType.Multiply,
  [EnchantmentType.QuestChain]: AffixType.Cascade,
  [EnchantmentType.QuestPurify]: AffixType.Decay,
  [EnchantmentType.QuestResonance]: [AffixType.Resonance, AffixType.Link], // 共振同时服务两个词条
  [EnchantmentType.QuestCharge]: AffixType.Outcast,   // 蓄势→流放
  [EnchantmentType.QuestRefine]: AffixType.Convert,
  [EnchantmentType.QuestEnergize]: AffixType.Charge,   // 充能→蓄力
  [EnchantmentType.QuestFission]: AffixType.Replicate,
  [EnchantmentType.QuestStack]: AffixType.Amplify,
  [EnchantmentType.QuestPolarize]: AffixType.Gravity,
  [EnchantmentType.QuestSpectrum]: AffixType.Rainbow,
  [EnchantmentType.QuestMirror]: AffixType.Mirror,
  [EnchantmentType.QuestOverlap]: AffixType.Ligature,
  [EnchantmentType.QuestIterate]: AffixType.Recurse,
  [EnchantmentType.QuestSacrifice]: AffixType.Taboo,
}
```

> 注意命名易混淆处：QuestCharge = 蓄势（对应流放词条），QuestEnergize = 充能（对应蓄力词条）。

### AFFIX_NAMES 和 RESOURCE_NAMES

```typescript
const AFFIX_NAMES: Record<AffixType, string> = {
  multiply: '强化', convert: '转化', rainbow: '彩虹',
  charge: '蓄力', decay: '衰减', pulse: '脉冲', crit: '暴击', cascade: '级联',
  void: '虚无', resonance: '共鸣', mirror: '倒影',
  link: '连接', replicate: '复制', amplify: '增幅',
  outcast: '流放', gravity: '引力', ligature: '连字',
  twin: '双生', recurse: '递归', taboo: '禁忌',
}

const RESOURCE_NAMES: Record<ResourceType, string> = {
  base: '基数', score: '分数', multiplier: '倍率',
  time: '时间', gold: '金币', fragment: '碎片', mutagen: '变异素',
}
```

### Project Structure Notes

- 新文件放在 `src/src/data/affixes.ts` — 与现有 `producers.ts`、`converters.ts`、`enchantments.ts` 同级
- import `ResourceType` from `../core/types`
- import `PositionRelation` from `./keyboardTopology`
- 测试文件放在 `src/tests/unit/data/affixes.test.ts`
- 本 Story 只定义类型和常量，**不修改任何现有文件的运行逻辑**

### References

- [Source: docs/design/affix-skill-system.md#四、词条池] — 20 词条完整定义与参数
- [Source: docs/design/affix-skill-system.md#4.5、附魔系统] — 48 附魔完整定义
- [Source: docs/design/affix-skill-system.md#七、数据结构] — AffixType / EnchantmentType / AffixInstance / SkillInstance / SkillRuntimeState 完整 TypeScript 定义
- [Source: docs/design/affix-skill-system.md#八、生成规则] — 词条权重表
- [Source: docs/design/affix-skill-system.md#九、自动命名] — AFFIX_NAMES / RESOURCE_NAMES
- [Source: src/src/core/types.ts:13] — ResourceType 定义
- [Source: src/src/data/keyboardTopology.ts:9-16] — PositionRelation 定义
- [Source: src/src/data/skills.ts] — DELETED_SKILL_IDS 现有模式（54 个 ID）
- [Source: docs/stories/epic-35-affix-skill-system.md] — Epic 35 完整 Story 列表与依赖关系

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

无 — 所有 43 个测试一次通过，无调试需要。

### Completion Notes List

- 所有类型和常量定义在单一文件 `src/src/data/affixes.ts` 中（Task 2 合并到同文件而非新建 `enchantmentTypes.ts`，减少文件碎片化）
- `SkillInstance` 命名为 `AffixSkillInstance` 以避免与旧 `core/types.ts` 中的 `SkillInstance` 冲突
- `EnchantmentType` 枚举实际为 37 个值（非 48），因为溅射/衍生各只有 1 个枚举值（posRel/资源变体在运行时处理）
- 额外增加了 `QUEST_ENCHANTMENT_DEFS` 数组（18 个任务附魔的完整定义含事件/层数/效果描述）、`APPRENTICE_NEIGHBOR_GROWTH` 表、`RARITY_PROBABILITIES`、`AffixSkillSaveData` 存档接口、`createSkillRuntimeState()` 工厂函数
- 137 个预先存在的测试失败（i18n 相关），不是本 Story 引入的

### Code Review Fixes (Review Round 1)

- **[H1+M3]** 添加 `QUEST_ENCHANTMENT_DEFS` ↔ `QUEST_AFFIX_MAP` 交叉验证测试，消除双重真相源风险
- **[H2]** `createSkillRuntimeState` 中 `currentDecayMult` 从 0 改为 1（中性乘数），避免未重置时乘零
- **[M1]** 添加 `AffixSkillSaveData` 类型导入和结构验证测试
- **[M2]** `AFFIX_WEIGHTS` 类型从 `Record<string, number>` 改为 `Record<AffixWeightKey, number>`，增加编译期穷举检查
- **[L1]** 新增 `AffixEventId` 联合类型约束事件字符串，防止拼写错误
- **[L2]** 设计文档补充 `mirrorCopiedAffix` 和 `purchasePrice` 字段
- 测试从 43 增至 45（+交叉验证, +SaveData 结构）

### File List

- `src/src/data/affixes.ts` — **新建**：词条制核心类型、枚举、常量表（~410 行）
- `src/tests/unit/data/affixes.test.ts` — **新建**：45 个单元测试
- `src/src/data/skills.ts` — **修改**：DELETED_SKILL_IDS 注释标记旧系统 deprecated
- `docs/design/affix-skill-system.md` — **修改**：§七 补充 mirrorCopiedAffix 和 purchasePrice 字段
