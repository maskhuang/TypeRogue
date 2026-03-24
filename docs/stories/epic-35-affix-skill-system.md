---
title: "Epic 35: 词条制技能系统（方案 A）"
epic_key: "epic-35"
status: "done"
created: "2026-03-11"
stories:
  - "35-1-core-data-affix-defs"
  - "35-2-skill-generation-engine"
  - "35-3-trigger-pipeline-phase1-3"
  - "35-4-trigger-pipeline-phase4-6"
  - "35-5-enchantment-splash-apprentice"
  - "35-6-enchantment-quest-18"
  - "35-7-enchantment-transmute-passive-operator"
  - "35-8-state-lifecycle-serialization"
  - "35-9-shop-integration"
  - "35-10-mutation-system"
  - "35-11-ui-keyboard-combat"
  - "35-12-relic-adaptation"
  - "35-13-balance-testing"
---

# Epic 35: 词条制技能系统（方案 A）

## 背景

Epic 34（方案 B）作为过渡方案，在旧架构上增加了 5 种新机制产出者并将乘算移入附魔。但根本问题未解决：

- 产出者/转化者/连接者/增幅者 4 套独立系统仍然共存，架构复杂（155 个技能定义）
- 词条是"生在技能上的"而非"随机组合的"，缺乏重玩性
- 附魔系统学徒/任务设计单薄，任务为一次性奖励无循环感

**方案 A** 是一次彻底重构：所有技能 = 加算产出者（基底）+ 0\~3 随机词条 + 0\~1 附魔。词条在商店生成时随机组合，C(20,3) = 1140 种传说组合 + 48 种附魔 → 海量构筑可能性。

## 设计文档

`docs/design/affix-skill-system.md` — 完整方案 A 设计，含 20 词条定义、48 附魔、6 阶段触发流程、蜕变师、遗物适配。

## 核心数字

| 指标 | Epic 34 (方案 B) | Epic 35 (方案 A) |
|------|-----------------|-----------------|
| 技能架构 | 4 类独立系统 | 统一为基底+词条 |
| 词条类型 | 5 (蓄力/衰减/脉冲/暴击/虚无) | 20 (6 类别) |
| 传说组合 | N/A | C(20,3) = 1140 |
| 附魔种类 | 36 | 48 (溅射6+学徒12+任务18+衍生7+被动4+乘算化1) |
| 任务附魔 | 8 (一次性奖励) | 18 (循环叠层永久增强) |
| 蜕变操作 | 未定义 | A(重铸)+C(升降级) |
| 技能定义数 | 155+ | 按需生成（运行时随机） |

## Stories

---

### Story 35.1: 核心数据结构与词条定义

**复杂度: High**
**依赖: 无**

定义词条制的全部类型系统和数据结构，为后续所有 Story 提供基础。

**范围：**
- `AffixType` 枚举（20 类，6 个类别）
- `AffixInstance` 接口（所有词条参数）
- `SkillInstance` 接口（基底+词条+附魔）
- `SkillRuntimeState` 接口（运行时状态）
- `EnchantmentType` 枚举（48 类）
- 稀有度定义（白0/蓝1/黄2/橙3）
- 词条权重表
- 常量表（虚无 bonusPerSlot、共鸣 efficiency、转化 k 值校准）

**验收标准：**
- AC1: `AffixType` 枚举包含 20 个值，分 6 类注释（数值型/节奏型/拓扑型/触发链型/单词感知型/元规则型）
- AC2: `AffixInstance` 接口包含所有词条参数字段（multiplier, source, k, gainPerSec, maxBonus, initialMult, decayPerTrigger, floor, interval, burstMult, chance, critMult, posRel, bonusPerSlot, efficiency, resource, valuePerStack, cascadeMult, bonusPercent, probMult, recurseChance, penaltyChance）
- AC3: `SkillInstance` 包含 id, name, icon, resource, baseValues, level, rarity, affixes: AffixInstance[], enchantmentIds: string[]
- AC4: `SkillRuntimeState` 包含词条状态（chargeAccumulated, currentDecayMult, mirrorCopiedAffix, triggerCount, amplifyStacks）和附魔状态（apprenticeAccumulated, questStacks, questCompletions）
- AC5: `EnchantmentType` 枚举包含 48 个值（溅射1 + 学徒12 + 任务18 + 衍生1 + 被动4 + 乘算化1 + 溅射posRel变体按运行时处理）
- AC6: 词条权重表 `AFFIX_WEIGHTS` 定义所有 20 个词条的权重（乘算4, 转化异源10/同源3, 彩虹6, 蓄力6, 衰减6, 脉冲6, 暴击8, 级联4, 虚无10, 共鸣4, 倒影3, 连接4, 复制3, 增幅3, 流放6, 引力5, 连字6, 双生2, 递归3, 禁忌4）
- AC7: 常量表：`VOID_BONUS_TABLE`、`RESONANCE_EFFICIENCY_TABLE`、`CONVERT_K_TABLE`、`BASE_VALUES`（7 种资源 × 3 等级）
- AC8: `AFFIX_NAMES` 和 `RESOURCE_NAMES` 映射表用于自动命名
- AC9: 旧系统的 Producer/Converter/Connector/Replicator/Amplifier 类型标记为 deprecated，相关 ID 加入 `DELETED_SKILL_IDS`

**估点：** 8

---

### Story 35.2: 技能生成引擎

**复杂度: High**
**依赖: 35.1**

实现运行时随机生成技能的完整流程：稀有度掷骰 → 词条加权抽取 → 参数掷骰 → 自动命名。

**验收标准：**
- AC1: `rollRarity()` 按概率分布返回 0\~3（白40%/蓝30%/黄20%/橙10%）
- AC2: `weightedSampleWithout(pool, count)` 从词条池加权不重复抽取 N 个词条类型
- AC3: `rollAffixParams(type, resource)` 为每种词条类型生成参数实例，含所有 20 种 case（转化词条区分同源/异源权重；虚无/共鸣/倒影/连接/复制/增幅/级联按 PositionRelation 掷骰；引力 probMult 0\~2 均匀分布）
- AC4: `generateSkill()` 完整流程：随机资源 → 掷稀有度 → 抽词条 → 掷参数 → 生成名字 → 生成唯一 ID
- AC5: `generateName(resource, affixes)` 按 "词条1·词条2·…·资源名" 格式生成中文名
- AC6: 转化词条同源（source === skill.resource）使用独立低权重（3 vs 异源 10），k 值按 `CONVERT_K_TABLE` 校准
- AC7: 生成的技能可通过 JSON.stringify/parse 往返序列化，不丢失信息

**估点：** 5

---

### Story 35.3: 触发流水线 — Phase 1\~3（基础值 → 加算 → 乘算）

**复杂度: High**
**依赖: 35.1**

实现触发计算的前三个阶段，是产出数值的核心计算引擎。

**Phase 1** — 基础值：`output = baseValues[level]`

**Phase 2** — 加算层：所有加算增益汇总为 `bonusPercent`，最后 `output × (1 + bonusPercent)`
- 转化词条：`k_eff × getSourceValue(source)`
- 虚无词条：`countEmptySlots(posRel) × bonusPerSlot`
- 蓄力词条：`min(chargeAccumulated, maxBonus)`，释放后清零
- 流放词条：首尾字母时 `+bonusPercent`
- 增幅词条：自身+邻居层数 × `valuePerStack`
- 禁忌词条：`+100%`
- 学徒附魔：`+apprenticeAccumulated`
- 被动附魔（满溢/字母亲和/不稳定）

**Phase 3** — 乘算层：
- 乘算词条：`×multiplier`
- 暴击词条：roll(chance) → `×critMult`
- 脉冲词条：第N次触发 → `×burstMult`
- 衰减词条：`×currentDecayMult`，每次衰减
- 级联词条：上键相邻 → `×cascadeMult`
- 连字词条：字母在单词中出现N次 → `×N`
- 禁忌词条：roll(penaltyChance) → `×-1`
- 乘算化附魔
- 遗物乘算

**任务增强内联**：所有 Phase 2-3 中的词条参数在计算时检查 `questCompletions`，动态增强（如暴击: `critMult + c×0.5`）。

**验收标准：**
- AC1: `resolvePhase1(skill)` 返回 `baseValues[skill.level - 1]`
- AC2: `resolvePhase2(skill, state, context)` 遍历所有加算词条和附魔，累加 bonusPercent，返回 `output × (1 + bonusPercent)`
- AC3: 转化词条的 `getSourceValue(source)` 按设计文档读取定义实现（base=词内累积, score=关卡累积, multiplier=当前倍率, time=剩余秒数, gold=当前持有, fragment/mutagen=本关产出）
- AC4: `resolvePhase3(skill, state, context, output)` 按顺序应用所有乘算词条，各词条独立相乘
- AC5: 暴击/脉冲/级联/连字/禁忌的条件判定正确（暴击=随机, 脉冲=计数取模, 级联=上键位置关系, 连字=字母计数, 禁忌=随机）
- AC6: 任务增强公式内联：每个词条参数在计算时加入 `questCompletions` 的增强项（18 个词条对应 18 种增强）
- AC7: 衰减词条每次触发更新 `currentDecayMult`，每词重置为 `initialMult`
- AC8: 蓄力词条释放后 `chargeAccumulated = 0`，战斗 tick 中持续累加
- AC9: Phase 2-3 的计算不产生副作用（除蓄力清零和衰减更新），所有状态变更通过明确的 state mutation

**估点：** 8

---

### Story 35.4: 触发流水线 — Phase 4\~6（资源写入 → 后触发 → 邻居通知）

**复杂度: High**
**依赖: 35.3**

实现触发计算的后三个阶段，处理资源写入、链式触发和邻居交互。

**Phase 4** — 资源写入：
- 彩虹词条：随机选资源（光谱附魔偏向最低资源）
- `applyToResource(targetResource, output)`
- 反馈/音效

**Phase 5** — 后触发：
- 复制词条：触发 1+裂变层 个随机邻居
- 增幅词条：自身叠层 +1
- 递归词条：roll(recurseChance) → 重触发自身（概率减半）
- 学徒附魔：检查事件 → `apprenticeAccumulated += growthPerProc`
- 任务附魔：检查事件 → `questStacks++` → 满层时 `questCompletions++`
- 吞噬特殊效果：满层时吃最弱邻居
- 衍生附魔：额外资源产出
- 溅射附魔：触发邻居
- 嗜变附魔：概率产变异素

**Phase 6** — 被动邻居通知：
- 共鸣词条：邻居触发 → 自身以 efficiency 触发
- 连接词条：邻居产出指定资源 → 自身触发
- 学徒·观摩：邻居触发 → 自身永久成长
- 任务·共振：邻居触发 → 自身叠层

**验收标准：**
- AC1: `resolvePhase4(skill, output, state)` 彩虹词条按 7 种资源等概率随机选择；光谱附魔使 `questCompletions × 15%` 权重偏向当前最低资源
- AC2: `resolvePhase5(skill, state, context)` 按顺序处理词条后触发和附魔后触发
- AC3: 复制词条触发 `1 + questCompletions`（裂变增强）个随机邻居，使用 posRel 范围过滤
- AC4: 递归词条重触发时传入 `recurseChance / 2`，防止无限递归；递归深度上限为 10
- AC5: 任务附魔循环：`questStacks >= target` 时 `questCompletions++` 并重置 stacks；吞噬额外调用 `eatWeakestNeighbor(posRel)`
- AC6: `resolvePhase6(triggerKey, skill, context)` 遍历邻居，按共鸣/连接/学徒·观摩/任务·共振分别处理
- AC7: 共鸣触发使用 `effectiveEff = efficiency + questCompletions × 0.08`，连接触发检查 `resource === linkResource`
- AC8: 溅射附魔对 posRel 范围内所有技能触发，效率 = `1 / count`
- AC9: 触发链防止无限循环（设最大触发深度 20）

**估点：** 8

---

### Story 35.5: 附魔系统 — 溅射 + 学徒(12)

**复杂度: Medium**
**依赖: 35.1**

实现溅射附魔（6 个 posRel 变体）和学徒附魔（12 个，含丰收/适应）。

**验收标准：**
- AC1: 溅射附魔定义：1 个 `Splash` 类型 × 6 个 `PositionRelation` = 6 个实例；触发后等分效率触发范围内技能
- AC2: 学徒附魔 12 个全部定义，每个绑定监听事件和 `growthPerProc` 值
- AC3: 学徒·观摩的 `growthPerProc` 按 PositionRelation 查表（Adjacent 1.5%, SameRow 1%, SameColumn 2%, SameHand 0.5%, SameFinger 2.5%, Symmetric 3%）
- AC4: 学徒·丰收（造词师限定）监听 `wordComplete`，+8%
- AC5: 学徒·适应（蜕变师限定）监听 `mutationApplied`，+15%
- AC6: `apprenticeAccumulated` 跨关保留、run 结束重置
- AC7: 附魔抽取时，职业限定附魔（丰收/适应）仅对应职业可抽到

**估点：** 5

---

### Story 35.6: 附魔系统 — 任务附魔(18)

**复杂度: High**
**依赖: 35.1, 35.3**

实现 18 个任务附魔的循环叠层机制。每个任务对应一个词条，永久增强该词条的核心参数。

**生成规则：** 任务附魔仅在技能拥有对应词条时可被抽到。

**18 个任务映射：**
```
吞噬→虚无  过载→暴击  回响→脉冲  升华→乘算  连锁→级联
净化→衰减  共振→共鸣+连接  蓄势→流放  精炼→转化  充能→蓄力
裂变→复制  层叠→增幅  极化→引力  光谱→彩虹  映射→倒影
重叠→连字  迭代→递归  献祭→禁忌
```

**验收标准：**
- AC1: 18 个任务附魔全部定义，每个包含：对应词条类型、监听事件、目标层数、每次完成效果描述
- AC2: 循环机制：`questStacks++` → 满层时 `questCompletions++` 并重置 → 可无限循环完成
- AC3: `questCompletions` 跨关保留、run 结束重置；效果在 Phase 2-3 内联计算（不额外存储增强值）
- AC4: 任务·吞噬特殊逻辑：满层时 `eatWeakestNeighbor(posRel)`，移除 posRel 范围内产出最低的邻居技能（创造空位供虚无词条利用）
- AC5: 任务·共振同时服务共鸣和连接两个词条，监听 `neighborTrigger`
- AC6: 任务·映射监听 `stageCleared`（极低频），每次完成使倒影复制的参数 ×1.1
- AC7: 任务·重叠使连字 N 上限 +1/层（基础上限 = 字母实际出现次数，增强后可超过）
- AC8: 任务·献祭监听 `affixProc(taboo_penalty)`（禁忌负产出触发时），每次完成 penaltyChance -1%（min 2%）
- AC9: 附魔生成时过滤：`drawEnchantment(skill)` 仅将技能拥有的词条对应的任务加入候选池
- AC10: 双生词条交互：拥有双生词条的技能获取附魔时两个选项全部获得（`enchantmentIds` 长度 0\~2）

**估点：** 8

---

### Story 35.7: 附魔系统 — 衍生 + 被动 + 乘算化

**复杂度: Medium**
**依赖: 35.1**

实现衍生附魔（7 资源）、被动附魔（4 职业限定）、乘算化运算符附魔。

**验收标准：**
- AC1: 衍生附魔 7 个（每种资源 1 个），触发后额外产出 `output × ratio` 的指定资源（base 30%, score 30%, multiplier 10%, time 20%, gold 20%, fragment 15%, mutagen 15%）
- AC2: 被动附魔 4 个：字母亲和（造词师，队列含本键 +25%）、满溢（造词师，每种碎片≥15 +20%）、不稳定（蜕变师，每关随机资源 +30%）、嗜变（蜕变师，5%概率产变异素）
- AC3: 乘算化附魔将技能加算运算符转为乘算，数值按资源独立校准
- AC4: 被动附魔仅对应职业可抽到（造词师：字母亲和/满溢，蜕变师：不稳定/嗜变）
- AC5: 衍生附魔同资源也允许（等效 `output × (1 + ratio)`）

**估点：** 3

---

### Story 35.8: 状态生命周期与存档序列化

**复杂度: Medium**
**依赖: 35.3, 35.4, 35.6**

实现所有运行时状态的生命周期管理和存档兼容。

**生命周期表：**

| 状态 | 作用域 | 重置时机 |
|------|--------|---------|
| chargeAccumulated | 实时 | 触发时清零 |
| currentDecayMult | 每词 | 每新词重置为 initialMult |
| mirrorCopiedAffix | 每关 | 关卡开始从邻居随机复制 |
| triggerCount | 每关 | 关卡结束重置 |
| amplifyStacks | 每关 | 关卡结束重置 |
| apprenticeAccumulated | 跨关 | run 结束重置 |
| questStacks | 跨关 | 完成任务时归零（循环） |
| questCompletions | 跨关 | run 结束重置 |

**验收标准：**
- AC1: 每词开始时重置 `currentDecayMult` 为 `initialMult`
- AC2: 每关开始时：重置 `triggerCount`、`amplifyStacks`；倒影词条从 posRel 邻居随机复制一个词条的类型+参数
- AC3: run 结束时重置 `apprenticeAccumulated`、`questCompletions`
- AC4: `SkillSaveData` 接口包含 id, resource, level, rarity, affixes, enchantmentIds, runtime
- AC5: 存档加载时，旧系统技能 ID 在 `DELETED_SKILL_IDS` 中的静默移除，不崩溃
- AC6: 存档版本迁移：旧存档无 affixes 字段时自动转换为白装（0 词条）

**估点：** 5

---

### Story 35.9: 商店集成

**复杂度: Medium**
**依赖: 35.2, 35.5, 35.6, 35.7**

将技能生成引擎接入商店系统，替换旧的固定技能池。

**验收标准：**
- AC1: 商店刷新时调用 `generateSkill()` 生成随机技能（替代旧的从固定池抽取）
- AC2: 技能定价公式：`basePrice × (1 + rarity × 0.5) × (1 + (level-1) × 0.3)`，稀有度越高越贵
- AC3: 商店技能卡片显示：资源图标、稀有度边框颜色（白/蓝/黄/橙）、词条名列表、等级
- AC4: 技能替换时旧技能的运行时状态（apprenticeAccumulated, questCompletions 等）全部丢失
- AC5: 商店每次刷新保证品类多样性：不全出同一稀有度，至少包含 1 个蓝装以上
- AC6: 职业资源（fragment/mutagen）的技能仅对应职业可见

**估点：** 5

---

### Story 35.10: 蜕变师 — 词条蜕变

**复杂度: Medium**
**依赖: 35.2, 35.6**

实现蜕变师的两种词条蜕变操作：A（词条重铸）和 C（稀有度升降）。

**蜕变 A — 词条重铸：**
- 玩家选择一个词条 → 从词条池重新掷骰类型+参数（排除已有类型）
- 若被替换的词条有对应任务附魔 → 移除附魔，questStacks/questCompletions 归零

**蜕变 C — 稀有度升降：**
- C↑：新增 1 个随机词条，rarity +1
- C↓：随机移除 1 个词条，rarity -1，返还 1 变异素

**验收标准：**
- AC1: 蜕变 A UI：玩家点击技能 → 弹出词条选择面板 → 选择要重铸的词条 → 确认消耗 → 执行重铸
- AC2: 蜕变 A 池过滤：排除技能已有的其他词条类型，从剩余池中加权抽取
- AC3: 蜕变 A 消耗：基础 3 变异素，同 run 内对同一技能每次 +1
- AC4: 蜕变 C↑ 消耗：白→蓝 5、蓝→黄 8、黄→橙 12 变异素；已橙装不可操作
- AC5: 蜕变 C↓ 消耗：0（返还 1 变异素）；已白装不可操作
- AC6: 词条变更后自动更新技能名（`generateName`）
- AC7: 任务附魔失效规则：被替换/移除的词条若有对应任务附魔 → 移除该附魔，`questStacks = 0, questCompletions = 0`
- AC8: 蜕变操作触发 `mutationApplied` 事件 → 学徒·适应可从中成长

**估点：** 5

---

### Story 35.11: UI — 键盘可视化与战斗反馈

**复杂度: High**
**依赖: 35.3, 35.4, 35.9**

重写键盘可视化和战斗反馈系统，适配词条制的信息展示需求。

**设计原则：**
- 渐进展示：键面（图标+稀有度边框+词条数点阵）→ 悬停（词条详情面板）→ 点击（完整属性面板）
- 战斗反馈音频优先（玩家注意力在打字区），视觉为辅
- 任务进度用边框填充环表示

**验收标准：**
- AC1: 键面显示：资源图标居中，稀有度边框颜色（白/蓝/黄/橙），词条数用小圆点表示（0\~3 个）
- AC2: 悬停面板显示：技能名、等级、资源类型、所有词条名+参数摘要、附魔名+当前进度
- AC3: 暴击触发时播放特殊音效 + 短暂键面闪光
- AC4: 脉冲爆发触发时播放爆发音效 + 键面放大动画
- AC5: 任务完成时播放成就音效 + 键面边框闪烁
- AC6: 禁忌负产出时播放警告音效 + 键面变红闪烁
- AC7: 任务进度在键面边框显示为填充环（questStacks / target）
- AC8: 学徒累积百分比在悬停面板中显示
- AC9: 商店中技能对比：选中时与当前已装备的同键位技能并排对比

**估点：** 8

---

### Story 35.12: 遗物系统适配

**复杂度: Medium**
**依赖: 35.1, 35.3**

将引用旧技能类别的遗物改写为引用词条/稀有度，并新增词条制专属遗物。

**改写清单：**
- T1: forge_heart(转化词条+k%), chain_surge(连接词条+25%), stack_resonance(增幅≥15+10%)
- T3: storm_drum(黄装以上双触发), overcharge(蓝装以上+50%/-0.1s)
- T4: pure_heart(只能白装,×3), chain_ban(触发链词条无效,+30%)

**新增遗物（4 个）：**
- `affix_spectrum` 词条光谱（稀有）：每种不同词条类型 +3%
- `legendary_aura` 传说气场（稀有）：每个橙装 +8%
- `quest_momentum` 任务动力（稀有）：每次 questCompletions +2%
- `mono_affix` 纯血词条（传说）：词条限同一类别，该类别 ×2

**验收标准：**
- AC1: 6 个受影响遗物的效果描述、触发条件、数值全部按新设计更新
- AC2: pure_heart 限制：商店仅刷白装（0 词条），蜕变 C↑ 被禁止
- AC3: chain_ban 限制：连接/复制/共鸣词条在 Phase 5-6 中被跳过
- AC4: storm_drum 条件从"产出者"改为"rarity >= 2"
- AC5: 4 个新遗物数据定义加入 `RELICS`，包含 id, name, icon, description, rarity, basePrice, effects
- AC6: affix_spectrum 效果：运行时统计玩家所有技能拥有的不同词条类型数，×3% 应用为全局加算
- AC7: mono_affix T4 限制：商店仅刷与已选类别相同的词条类别技能；首次获取时弹出类别选择 UI
- AC8: 遗物 × 词条交互矩阵经过人工审查无冲突

**估点：** 5

---

### Story 35.13: 数值平衡与集成测试

**复杂度: Medium**
**依赖: 35.1 ~ 35.12 全部**

全流程数值验证、组合测试、性能验证。

**验收标准：**
- AC1: 20 种词条单独测试：每种词条在标准关（30s）的平均产出在基础值 ×1.5\~×3.0 范围内
- AC2: 稀有度递进验证：白装 < 蓝装 < 黄装 < 橙装 平均产出严格递增
- AC3: 传说组合抽检：从 C(20,3)=1140 中抽检 50 个组合，无产出异常（负数/NaN/∞）
- AC4: 任务附魔循环验证：18 个任务在 10 关内平均完成 2\~5 次，`questCompletions` 增长合理
- AC5: 蜕变成本验证：平均一局获得的变异素可支持 3\~5 次蜕变 A 或 1\~2 次蜕变 C↑
- AC6: 递归词条无限循环防护：递归深度上限 10，实测不会触发
- AC7: 触发链深度防护：复制→共鸣→连接链式触发深度上限 20，实测不会触发
- AC8: 性能：20 个橙装全键盘满配时，单次触发计算 < 2ms
- AC9: 遗物 × 词条交互：pure_heart + 蜕变C↑ 被正确禁止；chain_ban 下连接/复制/共鸣确认无效
- AC10: 存档兼容：旧存档加载 → 旧技能静默移除 → 不崩溃，可正常开始新 run

**估点：** 5

---

## 依赖关系

```
35.1 核心数据结构
 ├── 35.2 技能生成引擎
 │    └── 35.9 商店集成 ──────────────┐
 │         └── 35.10 蜕变师            │
 ├── 35.3 触发 Phase 1-3              │
 │    ├── 35.4 触发 Phase 4-6         │
 │    │    └── 35.8 状态生命周期       │
 │    ├── 35.11 UI 键盘与战斗         │
 │    └── 35.12 遗物适配              │
 ├── 35.5 附魔·溅射+学徒              │
 ├── 35.6 附魔·任务(18)               │
 └── 35.7 附魔·衍生+被动+乘算化       │
                                      │
      全部完成 ────────────────────────┴── 35.13 平衡测试
```

## 实施顺序

```
Phase 1 — 基础层 (8pt)
  35.1 核心数据结构

Phase 2 — 引擎层 (21pt，可并行)
  35.2 技能生成引擎 (5pt)
  35.3 触发 Phase 1-3 (8pt)
  35.5 附魔·溅射+学徒 (5pt)
  35.7 附魔·衍生+被动+乘算化 (3pt)

Phase 3 — 深层机制 (16pt，可并行)
  35.4 触发 Phase 4-6 (8pt)          ← 依赖 35.3
  35.6 附魔·任务(18) (8pt)           ← 依赖 35.1, 35.3

Phase 4 — 集成层 (15pt，可并行)
  35.8 状态生命周期 (5pt)             ← 依赖 35.3, 35.4, 35.6
  35.9 商店集成 (5pt)                 ← 依赖 35.2, 35.5, 35.6, 35.7
  35.12 遗物适配 (5pt)                ← 依赖 35.1, 35.3

Phase 5 — 交互层 (13pt，可并行)
  35.10 蜕变师 (5pt)                  ← 依赖 35.2, 35.6
  35.11 UI (8pt)                      ← 依赖 35.3, 35.4, 35.9

Phase 6 — 收尾 (5pt)
  35.13 平衡测试                      ← 依赖全部

总计: 78 点
```

## 风险与缓解

| 风险 | 影响 | 概率 | 缓解 |
|------|------|------|------|
| 20 词条组合爆炸导致边缘 case | 某些 3 词条组合产出异常（负/溢出） | 中 | 35.13 抽检 50 个组合 + 全局 clamp |
| 触发链无限循环 | 递归+复制+共鸣形成循环 | 低 | 触发深度硬上限 20 + 递归概率减半 |
| 旧存档不兼容 | 玩家存档加载崩溃 | 中 | DELETED_SKILL_IDS + 版本迁移 + 降级为白装 |
| 任务附魔 18 个实现量大 | 开发周期超预期 | 中 | 统一循环模板，差异仅在参数和事件绑定 |
| 蜕变师与任务附魔交互复杂 | 重铸后任务状态不一致 | 中 | 明确规则：对应词条被替换→附魔移除+状态归零 |
| UI 信息密度过高 | 玩家认知过载 | 中 | 渐进展示（键面→悬停→面板）+ 音频优先 |
| 遗物适配遗漏 | 旧遗物引用不存在的技能类别 | 低 | 35.12 逐个审查 + 交互矩阵 |
| 性能瓶颈 | 全键盘触发时计算延迟 | 低 | 35.13 性能基准 < 2ms/触发 |

## 与 Epic 34 的关系

Epic 34（方案 B）作为过渡实现了部分机制（5 种新产出者 + 乘算移入附魔）。Epic 35（方案 A）是完整重构，实施后 **Epic 34 的代码将被完全替换**。

建议：
- 若 Epic 34 未全部完成，可暂停剩余 Story，直接启动 Epic 35
- 若 Epic 34 已完成，35.1 可复用部分类型定义和常量表，但架构层面需要重写

## 参考

- 设计文档：`docs/design/affix-skill-system.md`
- Epic 34（方案 B）：`docs/stories/epic-34-skill-affix-refactor.md`
- 遗物重构设计：`docs/planning-artifacts/relic-system-redesign.md`
- 现有技能系统：`src/src/systems/skills.ts`
- 现有附魔系统：`src/src/data/enchantments.ts`
- 现有遗物系统：`src/src/data/relics.ts`
- 现有商店系统：`src/src/systems/shop.ts`
