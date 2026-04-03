---
title: "Epic 45: 词条扩展 — 13 个新词条 + 分类重构 + consume 基础设施"
epic_key: "epic-45"
status: "draft"
created: "2026-04-02"
design_source: "docs/brainstorming-session-2026-04-01.md"
stories:
  - "45-1-category-restructure"
  - "45-2-word-sense-cluster-coverage"
  - "45-3-word-sense-bigram"
  - "45-4-topology-flow-confluence-turbulence"
  - "45-5-consume-infrastructure"
  - "45-6-numeric-phase-shift"
  - "45-7-numeric-endo-exo"
  - "45-8-numeric-fusion"
  - "45-9-meta-innate"
  - "45-10-meta-counter"
  - "45-11-meta-exhaust-ethereal"
  - "45-12-skill-generation-integration"
  - "45-13-balance-playtest"
---

# Epic 45: 词条扩展 — 13 个新词条 + 分类重构 + consume 基础设施

## 背景

当前词条系统有 22 个词条分布在 6 个类别中，但分布严重不均：暴击(5)/叠层(6) 远多于数值(3)/拓扑(3)/词感(3)/元规则(2)。此外词条分类已从旧的 6 类（数值/节奏/拓扑/触发链/词感/元规则）重构为新的 6 类（数值/暴击/叠层/拓扑/词感/元规则）。

本 Epic 实现 13 个新词条，将所有类别补齐至 5~6 个，并建立 `consume()` 资源消耗等新共享基础设施。

### 设计原则

- **接入共享机制，不造孤岛**：所有新词条必须读写现有共享状态（bonusPercent、stacks、暴击系统、posRel、getAffixSourceValue），禁止创建只有自己使用的私有 runtime 状态
- **统一范式内的函数变体**：同类别词条共享范式，仅 f() 函数不同
- **零新 runtime 状态**（除 Counter 充能和 Exhaust 计数，可复用现有字段）

### 新词条总览

| 类别 | 新词条 | 灵感领域 | 核心映射 |
|------|--------|---------|---------|
| 数值 | 相变、吸热/放热、聚变 | 热力学 | 资源值→温度 |
| 拓扑 | 落差、汇流、湍流 | 流体力学 | base value→水位 |
| 词感 | 辅音丛、覆盖度、双字组 | 语言学 | 单词→语言特征 |
| 元规则 | 先天、反制、消耗、虚无 | 卡牌游戏 | 生命周期→关键词修改 |

## Stories

---

### Story 45.1: 词条分类重构

**复杂度: Small**
**依赖: 无**

将词条分类从旧体系更新为新体系（已在代码中部分完成），确保全部引用一致。

**范围：**
- 确认 `AffixCategory` 类型已更新为 `'numeric' | 'crit' | 'stack' | 'topology' | 'word_sense' | 'meta_rule'`
- 确认 `AFFIX_CATEGORY_MAP` 所有 22 个词条的归类正确
- 更新所有引用旧分类名（`rhythm`、`trigger_chain`）的代码
- 更新 `project-context.md` 中的分类描述

**验收标准：**
- AC1: `AffixCategory` 不再包含 `rhythm` 和 `trigger_chain`
- AC2: `AFFIX_CATEGORY_MAP` 与新分类一致
- AC3: 全项目无旧分类名残留引用
- AC4: 所有现有测试通过

**估点：** 2

---

### Story 45.2: 词感型 — 辅音丛 + 覆盖度

**复杂度: Small**
**依赖: 45.1**

实现两个最简单的新词条：辅音丛（Cluster）和覆盖度（Coverage），纯读取 `currentWord` 属性。

**范围：**

**辅音丛 (Cluster):**
- 新增 `AffixType.Cluster = 'cluster'`
- Phase 2 逻辑：检测 `currentWord` 中最长连续辅音段长度，`bonusPercent += k × max(0, maxCluster - 1)`
- 需要 `isConsonant(letter)` 工具函数（元音 = AEIOU，其余为辅音）
- `AffixInstance` 新增参数：`clusterK: number`（每单位辅音丛的 bonusPercent）

**覆盖度 (Coverage):**
- 新增 `AffixType.Coverage = 'coverage'`
- Phase 2 逻辑：`uniqueLetters = new Set(currentWord).size`，`bonusPercent += k × uniqueLetters`
- `AffixInstance` 新增参数：`coverageK: number`（每个不同字母的 bonusPercent）

**通用：**
- 更新 `AFFIX_CATEGORY_MAP`：两者归入 `word_sense`
- 更新 `AFFIX_NAMES` / `AFFIX_DESCRIPTIONS`
- 更新 `AFFIX_WEIGHT_TIERS`（初始权重分档）
- 更新 `skillGeneration.ts`：生成参数表
- 更新 `KeyTooltip.ts`：tooltip 渲染
- 新增单元测试

**验收标准：**
- AC1: 辅音丛在含 "strength"(4连辅音) 的单词中产出明显高于 "area"(无连续辅音)
- AC2: 覆盖度在含 "typewriting"(11种字母) 的单词中产出明显高于 "banana"(3种)
- AC3: 两词条和 Outcast/Gravity/Ligature 可共存于同一技能
- AC4: 辅音丛和覆盖度与 Ligature 的互动符合预期（Coverage 对立，Cluster 正交）
- AC5: 技能生成可产出新词条，权重合理
- AC6: 单元测试覆盖核心逻辑

**估点：** 3

---

### Story 45.3: 词感型 — 双字组

**复杂度: Medium**
**依赖: 45.1**

实现双字组（Bigram）词条，需要内置英语字母对频率表。

**范围：**
- 新增 `AffixType.Bigram = 'bigram'`
- 创建 `data/bigramFrequency.ts`：`BIGRAM_FREQ_TABLE: Record<string, number>`，归一化的英语 bigram 频率表（676 个 AA~ZZ 条目，频率归一化到 0~1）
- Phase 2 逻辑：遍历 `currentWord` 的相邻字母对，查表得 rarity = 1 - freq，求平均 rarity，`bonusPercent += k × avgRarity`
- `AffixInstance` 新增参数：`bigramK: number`

**验收标准：**
- AC1: "fjord"(FJ/JO 罕见) 的双字组加成明显高于 "the"(TH/HE 常见)
- AC2: `BIGRAM_FREQ_TABLE` 覆盖所有 676 个字母对
- AC3: 单字母单词（不存在 bigram）时双字组无加成（graceful fallback）
- AC4: 技能生成可产出双字组词条
- AC5: 单元测试覆盖频率表正确性和边界情况

**估点：** 5

---

### Story 45.4: 拓扑型 — 落差 + 汇流 + 湍流

**复杂度: Medium**
**依赖: 45.1**

实现三个流体力学拓扑词条，复用现有邻居扫描机制（类似 Void）。

**范围：**

**落差 (Flow):**
- 新增 `AffixType.Flow = 'flow'`
- Phase 2 逻辑：遍历 posRel 范围内邻居，计算 `delta = neighbor.baseValue - self.baseValue`，delta > 0 时 `bonusPercent += k × delta × norm`
- `AffixInstance` 新增参数：`flowK: number`

**汇流 (Confluence):**
- 新增 `AffixType.Confluence = 'confluence'`
- Phase 2 逻辑：统计 posRel 范围内邻居的不同 `resource` 类型数，`bonusPercent += k × (1 - 1/(uniqueCount+1))`
- `AffixInstance` 新增参数：`confluenceK: number`

**湍流 (Turbulence):**
- 新增 `AffixType.Turbulence = 'turbulence'`
- Phase 2 逻辑：计算 posRel 范围内邻居 baseValue 的极差 `spread = (max-min)/max`，`bonusPercent += k × spread × neighborCount`
- `AffixInstance` 新增参数：`turbulenceK: number`
- 至少需要 2 个邻居才生效

**通用：**
- 三者都需要读取邻居技能的 `baseValue` 和 `resource` 属性，扩展 `TriggerContext` 或复用已有邻居扫描（参考 Void 的 `countEmptySlots`）
- 需要获取邻居技能的 base value 的工具函数（当前 `ctx.bindings` 可定位邻居键位，需要从键位反查技能）
- `BASE_VALUES` 归一化用于跨资源 base value 比较
- 更新分类、名称、描述、权重、生成、tooltip
- 新增单元测试

**验收标准：**
- AC1: 落差 — 低 base value 技能旁有高 base value 邻居时产出增加；反之无加成
- AC2: 汇流 — 3 种不同资源邻居的加成明显高于 1 种
- AC3: 湍流 — 邻居 base value 差异大时加成高；全部相同时无加成
- AC4: 三个词条可共存于同一技能，效果叠加合理
- AC5: 无邻居时三个词条均 graceful 返回 0
- AC6: 单元测试覆盖各种邻居组合

**估点：** 8

---

### Story 45.5: consume() 基础设施

**复杂度: Medium**
**依赖: 无**

建立资源消耗（consume）共享机制，供数值型三个词条使用。

**范围：**
- 在 `TriggerContext` 或 `Phase2Result` 中新增 `consumeRequests: { resource: ResourceType, amount: number }[]`
- Phase 2 计算阶段：词条将消耗请求写入 `consumeRequests`（不立即执行）
- Phase 4 资源路由后：统一执行所有 `consumeRequests`，从对应资源中扣减
- 消耗不能将资源扣至负值（`min(amount, currentValue)` 保护）
- 如果消耗失败（资源不足），词条的 bonusPercent 效果仍然生效（消耗是代价，不是条件——条件在 Phase 2 的阈值判断中处理）
- 新增单元测试验证 consume 机制

**验收标准：**
- AC1: `consumeRequests` 在 Phase 4 后统一执行
- AC2: 多个词条的消耗请求可叠加
- AC3: 资源不被扣至负值
- AC4: consume 后的资源变化被后续触发正确读取
- AC5: 不影响现有词条行为（无 consume 请求时零开销）
- AC6: 单元测试覆盖正常消耗、不足消耗、多词条叠加消耗

**估点：** 5

---

### Story 45.6: 数值型 — 相变

**复杂度: Medium**
**依赖: 45.5**

实现相变（Phase Shift）词条：读资源值作为温度，阶梯式 bonusPercent + 高相态 consume。

**范围：**
- 新增 `AffixType.PhaseShift = 'phase_shift'`
- `AffixInstance` 新增参数：`source: ResourceType`（温度源资源）、`threshold1: number`、`threshold2: number`、`k_solid/k_liquid/k_gas: number`、`sustainCost: number`
- Phase 2 逻辑：
  - 读取 `getAffixSourceValue(source)` 作为温度
  - 按 `BASE_VALUES` 归一化
  - val < T1: `bonusPercent += k_solid × val × norm`
  - T1 ≤ val < T2: `bonusPercent += k_liquid × val × norm`
  - val ≥ T2: `bonusPercent += k_gas × val × norm` + `consumeRequests.push({ source, sustainCost })`
- 更新分类（numeric）、名称（相变）、描述、权重、生成参数表、tooltip
- 新增单元测试

**验收标准：**
- AC1: 源资源值跨阈值时 bonusPercent 有明显跳升
- AC2: 气态时每次触发消耗 sustainCost 量的源资源
- AC3: 和 Convert 读同资源时效果叠加正确（线性+阶梯）
- AC4: 源资源被消耗至 T2 以下时自动降回液态加成
- AC5: 技能生成可产出相变词条，参数合理
- AC6: 单元测试覆盖三相态和跨阈值切换

**估点：** 5

---

### Story 45.7: 数值型 — 吸热/放热

**复杂度: Medium**
**依赖: 45.5**

实现吸热/放热（Endo/Exo）词条：读资源值，高于阈值时高产出+消耗（Exo），低于阈值时低产出（Endo），形成自然振荡。

**范围：**
- 新增 `AffixType.EndoExo = 'endo_exo'`
- `AffixInstance` 新增参数：`source: ResourceType`、`threshold: number`、`k_exo: number`、`k_endo: number`、`consumeRate: number`
- Phase 2 逻辑：
  - 读取 `getAffixSourceValue(source)`
  - val ≥ threshold: `bonusPercent += k_exo × val × norm` + consume
  - val < threshold: `bonusPercent += k_endo × val × norm`（k_endo 可为负）
- 更新分类、名称、描述、权重、生成、tooltip
- 新增单元测试

**验收标准：**
- AC1: 资源高于阈值时产出明显高于低于阈值时
- AC2: Exo 模式消耗资源 → 资源下降 → 切换到 Endo → 资源恢复 → 切回 Exo（振荡）
- AC3: 振荡频率受其他技能资源产出速率影响
- AC4: k_endo 为负时 Endo 模式实际减少产出
- AC5: 和相变读同资源时两者消耗竞争正确
- AC6: 单元测试覆盖振荡周期和边界条件

**估点：** 5

---

### Story 45.8: 数值型 — 聚变

**复杂度: Medium**
**依赖: 45.5**

实现聚变（Fusion）词条：读两种资源，同时达阈值时高倍产出+双消耗，否则惩罚。

**范围：**
- 新增 `AffixType.Fusion = 'fusion'`
- `AffixInstance` 新增参数：`sourceA/sourceB: ResourceType`、`ignitionA/ignitionB: number`、`consumeA/consumeB: number`、`fusionK: number`、`penalty: number`
- Phase 2 逻辑：
  - 读取 `getAffixSourceValue(sourceA)` 和 `getAffixSourceValue(sourceB)`
  - 双达阈值：`bonusPercent += k × (valA×normA + valB×normB)` + 双 consume
  - 任一不达阈值：`bonusPercent -= penalty`
- 更新分类、名称、描述、权重、生成、tooltip
- 生成时 sourceA ≠ sourceB 且 ≠ skill.resource（避免自指）
- 新增单元测试

**验收标准：**
- AC1: 双资源达阈值时产出远高于正常
- AC2: 任一资源不达阈值时有明确负产出惩罚
- AC3: 成功后双资源均被消耗，下次触发可能因资源不足而失败
- AC4: sourceA 和 sourceB 不重复
- AC5: 和相变/Endo 的消耗正确叠加
- AC6: 单元测试覆盖成功/失败/部分达阈值

**估点：** 5

---

### Story 45.9: 元规则型 — 先天

**复杂度: Small**
**依赖: 45.1**

实现先天（Innate）词条：关卡开始时自动触发本技能一次。

**范围：**
- 新增 `AffixType.Innate = 'innate'`
- 在 `battle.ts` 的 `startLevel()` 末尾（初始化完成后），遍历所有装备技能，对含 Innate 词条的技能调用 `triggerSkill(skillId, null)`
  - `null` key 表示非按键触发，需要在 triggerSkill 中处理（跳过 Cascade 等依赖前一键的词条）
- Innate 本身不贡献 bonusPercent，其效果通过触发同技能的其他词条体现
- 更新分类（meta_rule）、名称、描述、权重、生成、tooltip
- 新增单元测试

**验收标准：**
- AC1: 含 Innate 的技能在关卡开始时自动触发一次
- AC2: 自动触发走完整 Phase 1-6 管线
- AC3: 自动触发时 Cascade 等依赖前一键的词条不异常（key=null 时跳过）
- AC4: 自动触发产生的叠层/暴击/增幅等效果正确生效
- AC5: 单元测试验证自动触发时机和效果

**估点：** 3

---

### Story 45.10: 元规则型 — 反制

**复杂度: Small**
**依赖: 45.1**

实现反制（Counter）词条：消耗充能取消负面产出。

**范围：**
- 新增 `AffixType.Counter = 'counter'`
- `AffixInstance` 新增参数：`maxCharges: number`（每关充能上限，如 3）
- `SkillRuntimeState` 新增：`counterCharges: number`（当前充能数，每关开始重置为 maxCharges）
- 在产出应用（`applyResource` 回调）前插入检查：
  - 若最终产出值 < 0 且 `counterCharges > 0`：`counterCharges--`，产出设为 0
- 更新分类、名称、描述、权重、生成、tooltip
- 新增单元测试

**验收标准：**
- AC1: Taboo 未暴击时的负产出被反制取消（产出归零而非负值）
- AC2: 充能消耗后不可再反制，直到下关恢复
- AC3: 每关开始充能正确恢复到 maxCharges
- AC4: Boss Modifier 造成的负面效果也可被反制
- AC5: 充能数在 tooltip/UI 中可见
- AC6: 单元测试覆盖充能消耗和恢复

**估点：** 3

---

### Story 45.11: 元规则型 — 消耗 + 虚无

**复杂度: Medium**
**依赖: 45.1**

实现消耗（Exhaust）和虚无（Ethereal）两个词条，需要词条运行时移除逻辑。

**范围：**

**词条移除基础设施：**
- 新增 `removeAffixAtRuntime(skillId: string, affixIndex: number)` 函数
- 从 `skill.affixes` 中移除指定词条
- 触发 `skill:affix_removed` 事件（供 UI 更新）
- 移除后技能的 rarity 不变（词条数可以少于 rarity 数）

**消耗 (Exhaust):**
- 新增 `AffixType.Exhaust = 'exhaust'`
- `AffixInstance` 新增参数：`maxTriggers: number`（如 8）、`exhaustMult: number`（如 2.0）
- `SkillRuntimeState` 新增：`exhaustCount: number`（累计触发次数）
- Phase 1 修改：`effectiveBase *= exhaustMult`
- 每次触发后 `exhaustCount++`，达 maxTriggers 时调用 `removeAffixAtRuntime()`
- exhaustCount 不随关卡重置（跨关累计）

**虚无 (Ethereal):**
- 新增 `AffixType.Ethereal = 'ethereal'`
- `AffixInstance` 新增参数：`etherealMult: number`（如 3.0）
- `SkillRuntimeState` 新增：`etherealTriggered: boolean`（本技能是否在当前关卡触发过）
- Phase 1 修改：`effectiveBase *= etherealMult`
- 首次触发时设 `etherealTriggered = true`
- 关卡结束时（`endLevel`）：若 `etherealTriggered`，调用 `removeAffixAtRuntime()`

**验收标准：**
- AC1: Exhaust 每次触发 base 倍增，达到次数后词条从技能中消失
- AC2: Ethereal base ×3，关卡结束后词条消失
- AC3: 词条消失后技能继续正常运作（只是少了该词条的效果）
- AC4: Exhaust 计数跨关累计，不随关卡重置
- AC5: Ethereal 的 `etherealTriggered` 每关重置
- AC6: 两者同时存在时，谁先达到移除条件谁先被移除
- AC7: 词条移除后 UI（tooltip/键盘可视化）正确更新
- AC8: 单元测试覆盖移除逻辑、跨关行为、双词条竞速

**估点：** 8

---

### Story 45.12: 技能生成集成

**复杂度: Medium**
**依赖: 45.2~45.11**

将 13 个新词条整合进技能生成系统（`skillGeneration.ts`），确保随机生成、权重、参数表、质变任务等全部就绪。

**范围：**
- 为每个新 AffixType 添加生成参数表（参考现有词条的参数范围设计）
- 更新 `rollAffixWeights()` 和 `AFFIX_WEIGHT_TIERS`：新词条的默认权重分档
- 更新 `generateAffix()` 中的 switch 分支：为每个新类型生成 AffixInstance
- 考虑新词条的质变任务（`QUEST_ENCHANTMENT_DEFS`）：为 13 个新词条各设计 1 个质变效果（可在后续 Epic 中实现，本 Story 先预留接口）
- 验证新词条在商店中正确展示（名称、描述、tooltip）
- 验证新词条在技能详情中正确渲染

**验收标准：**
- AC1: `generateSkill()` 可随机生成含新词条的技能
- AC2: 新词条的权重分档合理（不过于稀有也不过于常见）
- AC3: 新词条的参数值在各 rarity 下有合理的区间
- AC4: 商店展示、tooltip、键盘可视化均正确
- AC5: 存档兼容：旧存档不含新词条不会崩溃

**估点：** 8

---

### Story 45.13: 数值平衡与 Playtest

**复杂度: Large**
**依赖: 45.12**

对全部 13 个新词条进行数值平衡调优和 playtest。

**范围：**
- 每个新词条的参数表调优（k 值、阈值、消耗量等）
- 验证新词条之间的互动符合设计预期：
  - 数值三件套的资源竞争
  - 拓扑三件套的天然协同
  - 词感三件套的正交性
  - 元规则四件套的生命周期覆盖
- 验证新词条与现有 22 个词条的互动无异常
- 验证 consume 机制不会导致资源死循环或负值
- 验证 Exhaust/Ethereal 移除不会导致存档问题
- 性能验证：新词条不超出帧预算（Phase 2 新增计算 < 0.5ms）
- 根据 playtest 结果调整参数

**验收标准：**
- AC1: 新词条在不同构建中均有可行的使用场景
- AC2: 无单一词条过于强势（不存在「必选」词条）
- AC3: consume 机制的资源消耗速率合理（不导致资源枯竭死循环）
- AC4: Exhaust/Ethereal 的次数/时间参数让玩家有足够的决策空间
- AC5: 帧预算合规（全部新词条计算总和 < 0.5ms）
- AC6: 至少 3 局完整 playtest 记录

**估点：** 13

---

## 依赖图

```
45.1 分类重构（前置，所有 Story 依赖）
  │
  ├── 45.2 词感：辅音丛+覆盖度
  ├── 45.3 词感：双字组
  ├── 45.4 拓扑：落差+汇流+湍流
  ├── 45.9 元规则：先天
  ├── 45.10 元规则：反制
  ├── 45.11 元规则：消耗+虚无
  │
  └── 45.5 consume 基础设施
        ├── 45.6 数值：相变
        ├── 45.7 数值：吸热/放热
        └── 45.8 数值：聚变
              │
              └── 45.12 技能生成集成（依赖 45.2~45.11 全部完成）
                    │
                    └── 45.13 数值平衡与 Playtest
```

## 总估点

| Story | 估点 |
|-------|------|
| 45.1 分类重构 | 2 |
| 45.2 辅音丛+覆盖度 | 3 |
| 45.3 双字组 | 5 |
| 45.4 落差+汇流+湍流 | 8 |
| 45.5 consume 基础设施 | 5 |
| 45.6 相变 | 5 |
| 45.7 吸热/放热 | 5 |
| 45.8 聚变 | 5 |
| 45.9 先天 | 3 |
| 45.10 反制 | 3 |
| 45.11 消耗+虚无 | 8 |
| 45.12 技能生成集成 | 8 |
| 45.13 数值平衡 | 13 |
| **合计** | **73** |
