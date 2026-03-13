# 词条制技能系统设计文档（方案 A）

_打字肉鸽 — 技能系统重构 — 方案 A：词条制_
_日期: 2026-03-11_

---

## 一、设计目标

### 问题
- 乘算泛滥导致数值膨胀太容易
- 加算产出者数值不同但机制相同，显得重复
- 6 个独立系统（Producer/Converter/Connector/Replicator/Amplifier/Enchantment）+ 155 个定义，架构复杂

### 解决方案
- **统一为词条制**：所有技能 = 加算产出者（基底）+ 0~3 个词条
- **加算为主、乘算稀有**：大部分增益进入加算层合并，乘算词条权重极低
- **运行时随机生成**：每局商店刷出的技能都不同，海量组合提升重玩性
- **附魔精简保留**：学徒(12)/任务(18)/衍生/乘算化 保留为技能附魔层

### 重构范围

| 系统 | 处理方式 |
|------|---------|
| Producer（加算） | → 基底 |
| Producer（乘算） | → 乘算词条 |
| Converter（加算） | → 转化词条 |
| Converter（乘算） | **删除**（遏制乘算泛滥） |
| Connector | → 感应词条 |
| Replicator | → 溅射词条（合并 Replicate 入 Splash） |
| Amplifier | → 增幅词条 |
| 附魔-共鸣 | → 共鸣词条 |
| 附魔-虚无(Repulsion) | → 虚无词条 |
| 附魔-衍生(Transmutation) | 保留为附魔 |
| 附魔-精通/成长/吞噬 | → 学徒附魔(12) + 任务附魔(18) |
| 附魔-溅射 | → 溅射词条（合并入 Splash AffixType） |
| 附魔-被动(职业限定4个) | **删除**（字母亲和/满溢/不稳定/嗜变） |
| 附魔-乘算化 | 保留为附魔 |

---

## 二、基底定义

每个技能有固定的资源类型和按等级递增的加算基础值。

| 资源 | 图标 | Lv1 | Lv2 | Lv3 |
|------|------|-----|-----|-----|
| base | ⚔️ | 5 | 8 | 12 |
| score | 🪙 | 15 | 24 | 36 |
| multiplier | 🔥 | 0.2 | 0.32 | 0.48 |
| time | ❄️ | 0.2 | 0.32 | 0.48 |
| gold | 💰 | 3 | 5 | 8 |
| fragment | 📝 | 1 | 1.6 | 2.4 |
| mutagen | 💉 | 1 | 1.6 | 2.4 |

---

## 三、稀有度

| 稀有度 | 词条数 | 颜色 | 商店出现概率 |
|--------|-------|------|------------|
| 普通 | 0 | 白 | 40% |
| 稀有 | 1 | 蓝 | 30% |
| 史诗 | 2 | 紫 | 20% |
| 传说 | 3 | 橙 | 10% |

---

## 四、词条池（20 类）

所有词条均为通用词条，职业差异化通过附魔系统实现。

#### 数值型

| # | 词条 | 来源 | 效果 | 参数 | 权重 |
|---|------|------|------|------|------|
| 1 | **乘算** | Producer(乘) | 最终产出 ×N | `multiplier: 1.3~2.0` | 4 |
| 2 | **转化** | Converter(加) | 读取资源当前值，额外加算 +k×源值（k 按源校准）。源可以是本技能资源（等效指数增长，权重独立调低） | `source: ResourceType, k: 按源校准` | 10（异源）/ 3（同源） |
| 3 | **彩虹** | 新设计 | 每次触发时产出资源类型随机（7 种等概率） | 无（Phase 4 随机选资源） | 6 |

#### 节奏型

| # | 词条 | 来源 | 效果 | 参数 | 权重 |
|---|------|------|------|------|------|
| 4 | **蓄力** | 新设计 | 未触发期间每秒 +X% 产出，触发时释放并清零 | `gainPerSec: 0.08, maxBonus: 2.0` | 6 |
| 5 | **衰减** | 新设计 | 基础产出 ×N，每次触发 -X%，每词重置 | `initialMult: 2.0, decayPerTrigger: 0.15, floor: 0.5` | 6 |
| 6 | **脉冲** | 新设计 | 每第 N 次触发产出 ×M，其余正常 | `interval: 4, burstMult: 3.0` | 6 |
| 7 | **暴击** | 新设计 | 每次触发 X% 概率产出 ×N | `chance: 0.5, critMult: 2.0` | 8 |
| 8 | **级联** | Noita触发链 | 若**上一个按键**在[posRel]范围内，产出 ×N | `posRel, cascadeMult: 1.8~2.5` | 6 |

#### 键盘拓扑型

| # | 词条 | 来源 | 效果 | 参数 | 权重 |
|---|------|------|------|------|------|
| 9 | **虚无** | Repulsion附魔 | [posRel]范围内每空位产出 +X% | `posRel, bonusPerSlot: 5%~50%` | 10 |
| 10 | **共鸣** | Resonance附魔 | [posRel]范围内技能产出指定资源时，自身自动触发 | `posRel, resource: ResourceType` | 4 |
| 11 | **倒影** | 新设计 | 变成[posRel]范围内技能的一个随机词条（复制类型+参数），每关刷新 | `posRel` | 3 |

#### 触发链型

| # | 词条 | 来源 | 效果 | 参数 | 权重 |
|---|------|------|------|------|------|
| 12 | **感应** | Connector | [posRel]范围内有指定词条的技能触发时，自身触发 | `posRel, watchAffix: AffixType` | 6 |
| 13 | **溅射** | Replicator+Splash | 触发后随机触发[posRel]范围内 1 个匹配的技能 | `posRel, resource?, watchAffix?` | 5 |
| 14 | **增幅** | Amplifier | 每次触发 +1 层；**自身（同资源时）及**[posRel]范围内同资源技能获得 +X%/层 | `posRel, resource, valuePerStack` | 5 |

#### 单词感知型

| # | 词条 | 来源 | 效果 | 参数 | 权重 |
|---|------|------|------|------|------|
| 15 | **流放** | 炉石·流放 | 技能字母为单词**首字母或尾字母**时，产出 +X% | `bonusPercent: 40%~80%` | 8 |
| 16 | **引力** | 新设计 | 包含此字母的单词出现概率 ×N（N<1 斥力，N>1 引力） | `probMult: 0~2` | 3 |
| 17 | **连字** | 新设计 | 技能字母在当前单词中出现 N 次 → 产出 ×N | 无（运行时计算字母出现次数） | 6 |

#### 元规则型

| # | 词条 | 来源 | 效果 | 参数 | 权重 |
|---|------|------|------|------|------|
| 18 | **双生** | 新设计 | 技能获得附魔时同时获得两个选项（而非二选一） | 无运行时参数（生成阶段生效） | 2 |
| 19 | **递归** | 新设计 | 触发完成后 X% 概率重新触发自身（连锁时概率减半） | `recurseChance: 15%~30%` | 3 |
| 20 | **禁忌** | 新设计 | 产出 +100%，但每次触发 X% 概率产出变为负数 | `bonusPercent: 100%, penaltyChance: 10%` | 4 |

### 虚无词条 bonusPerSlot 按 PositionRelation

| PositionRelation | bonusPerSlot |
|-----------------|-------------|
| Adjacent | 25% |
| SameRow | 10% |
| SameColumn | 30% |
| SameHand | 5% |
| SameFinger | 35% |
| Symmetric | 50% |

### 转化词条 k 值校准表

转化词条效果：`bonusPercent += k × sourceValue`。k 按源资源校准，确保加成在 +30%~100% 区间。

**各源资源读取定义：**

| 源资源 | 读取值 | 说明 |
|-------|-------|------|
| base | `resources.base`（词内累积） | 每词重置，每次正确按键 +1 + 技能加成 |
| score | `resources.score`（关卡累积） | 关卡内不重置，技能即时加分累积，有滚雪球效应 |
| multiplier | `state.multiplier`（当前倍率） | = baseMultiplier + combo×0.1 + skillMultBonus |
| time | `state.time`（剩余秒数） | 随时间递减，技能可回复 |
| gold | `state.gold`（当前持有金币） | 每关重置为 100，消费后减少 |
| fragment | `classResourceProduced.fragment`（本关产出） | 本关累积产出量，非库存 |
| mutagen | `classResourceProduced.mutagen`（本关产出） | 本关累积产出量，非库存 |

**k 值范围：**

| 源资源 | 典型范围 | k_min | k_max | 前期加成 | 后期加成 |
|-------|---------|-------|-------|---------|---------|
| base | 1-30 | 0.02 | 0.05 | +2%~5% | +60%~150% |
| score | 0-1000+（累积） | 0.0005 | 0.001 | +5%~15% | +50%~100% |
| multiplier | 1-10 | 0.10 | 0.25 | +10%~25% | +100%~250% |
| time | 10-60 | 0.01 | 0.025 | +10%~25% | +60%~150% |
| gold | 50-150 | 0.003 | 0.008 | +15%~40% | +45%~120% |
| fragment | 0-20（本关产出） | 0.02 | 0.05 | +0% | +40%~100% |
| mutagen | 0-20（本关产出） | 0.02 | 0.05 | +0% | +40%~100% |

**设计说明：**
- score 源有自然滚雪球（关卡累积不重置），k 值极小以补偿
- fragment/mutagen 读本关累积产出（`classResourceProduced`），非碎片库存
- multiplier 典型值小（1-10），k 值较大以补偿
- 后期加成允许偏高（100%+），因为在加算层与其他 bonus 合并后只乘一次

---

## 4.5、附魔系统（保留）

词条制重构后，以下附魔保留为技能附加层。每个技能可携带 **0~1 个附魔**（独立于词条系统）。

### 可监听事件表

以下事件可用于学徒/任务附魔的条件判定：

| 事件ID | 事件 | 来源 | 频率 |
|--------|------|------|------|
| `selfTrigger` | 自身触发（按键） | Phase 1 | 高 |
| `neighborTrigger` | [posRel]邻居触发 | Phase 6 | 高 |
| `wordComplete` | 完成单词 | 单词系统 | 中 |
| `affixProc` | 词条效果触发（通用） | Phase 2-3 | 中 |
| `affixProc:pulse` | 脉冲词条触发 | Phase 3 | 中 |
| `affixProc:cascade` | 级联词条触发 | Phase 3 | 中低 |
| `affixProc:recurse` | 递归词条触发 | Phase 5 | 中低 |
| `affixProc:taboo_penalty` | 禁忌负产出触发 | Phase 3 | 低 |
| `critHit` | 暴击命中 | Phase 3 | 中低 |
| `outcastProc` | 流放触发（首/尾字母） | Phase 2 | 中 |
| `longWord:6` | 完成长单词（≥6字母） | 单词系统 | 低 |
| `perfectWord` | 零错误完成单词 | 单词系统 | 中 |
| `comboReach:15` | 连击达到 15 | combo 计数器 | 中 |
| `stageCleared` | 关卡通关 | 关卡系统 | 极低 |
| `mutationApplied` | 技能被蜕变 | 蜕变师系统 | 极低 |

### 学徒附魔（12 个）

每当条件满足时，自身产出**永久 +X%**（无上限，跨关保留，run 结束重置）。

| 附魔 | 监听事件 | 每次 +% | 说明 |
|------|---------|---------|------|
| **学徒·自修** | selfTrigger | +1% | ← 精通；按得越多越强 |
| **学徒·观摩** | neighborTrigger(posRel) | +X%(按posRel表) | ← 成长；邻居帮你成长 |
| **学徒·造词** | wordComplete | +2% | 奖励完整打词 |
| **学徒·悟道** | affixProc | +3% | 词条效果触发时成长 |
| **学徒·暴击** | critHit | +5% | 暴击越多越强 |
| **学徒·流放** | outcastProc | +4% | 首尾字母触发时成长 |
| **学徒·长词** | longWord:6 | +5% | 鼓励挑战长单词 |
| **学徒·精准** | perfectWord | +8% | 零错误奖励 |
| **学徒·连击** | comboReach:15 | +10% | 连击里程碑奖励 |
| **学徒·通关** | stageCleared | +15% | 每通关一次大幅成长 |
| **学徒·丰收** | wordComplete | +3% | 造词师限定；← 丰收 |
| **学徒·适应** | mutationApplied | +15% | 蜕变师限定；← 适应 |

#### 学徒·观摩 growthPerProc 按 PositionRelation

| PositionRelation | growthPerProc |
|-----------------|--------------|
| Adjacent | 1.5% |
| SameRow | 1% |
| SameColumn | 2% |
| SameHand | 0.5% |
| SameFinger | 2.5% |
| Symmetric | 3% |

### 任务附魔（18 个）

每当条件满足时叠 1 层，**层数满后 questCompletions++**（层数归零，可循环完成）。每个任务**对应一个词条**，永久增强该词条的核心参数。

**生成规则：任务附魔仅在技能拥有对应词条时可被抽到。**

| 附魔 | 对应词条 | 监听事件 | 目标层数 | 每次完成效果 | 说明 |
|------|---------|---------|---------|------------|------|
| **任务·吞噬** | 虚无 | selfTrigger | 15 | 吃[posRel]最弱邻居(+空位); bonusPerSlot +5% | 吞噬创造虚空 |
| **任务·过载** | 暴击 | critHit | 8 | critMult +0.5 | 暴击越多→暴击越猛 |
| **任务·回响** | 脉冲 | affixProc:pulse | 6 | burstMult +0.3 | 脉冲共鸣→爆发增强 |
| **任务·升华** | 乘算 | perfectWord | 3 | multiplier +0.15 | 完美操作→放大器进化 |
| **任务·连锁** | 级联 | affixProc:cascade | 6 | cascadeMult +0.2 | 级联反馈→倍率提升 |
| **任务·净化** | 衰减 | comboReach:15 | 3 | floor -0.05 (min 0.1) | 心流净化→衰减减缓 |
| **任务·共振** | 共鸣+感应 | neighborTrigger | 20 | 触发产出 +10%/层 | 互助→联动增强 |
| **任务·蓄势** | 流放 | outcastProc | 10 | bonusPercent +15% | 边缘蓄力→流放精通 |
| **任务·精炼** | 转化 | selfTrigger | 15 | k ×1.1 | 持续转化→系数精炼 |
| **任务·充能** | 蓄力 | wordComplete | 5 | maxBonus +0.3 | 打词充能→上限突破 |
| **任务·裂变** | 溅射 | longWord:6 | 5 | 额外触发 +1 邻居 | 长词积累→裂变扩散 |
| **任务·层叠** | 增幅 | selfTrigger | 25 | valuePerStack +0.005 | 持续增幅→层层叠加 |
| **任务·极化** | 引力 | wordComplete | 8 | \|probMult−1\| +0.15 极化 | 打词→引力/斥力极化 |
| **任务·光谱** | 彩虹 | selfTrigger | 20 | 随机权重偏向当前最低资源 +15%/层 | 智能补缺→资源均衡 |
| **任务·映射** | 倒影 | stageCleared | 1 | 复制的词条参数 ×1.1（+10%/层，永久累积） | 每关磨练→倒影增强 |
| **任务·重叠** | 连字 | selfTrigger | 15 | 连字 ×N 的 N 上限 +1（基础上限=字母实际出现次数） | 重复触发→连字超频 |
| **任务·迭代** | 递归 | affixProc:recurse | 5 | recurseChance +3%/层 | 递归越多→递归越频 |
| **任务·献祭** | 禁忌 | affixProc:taboo_penalty | 3 | penaltyChance -1%/层 (min 2%) | 承受惩罚→净化风险 |

### 衍生附魔（7 个）

触发后额外产出一种资源（产出的 X%）。每种附魔对应一种额外资源。

| 附魔 | 额外资源 | ratio | 说明 |
|------|---------|-------|------|
| **衍生·基数** | base | 30% | |
| **衍生·分数** | score | 30% | |
| **衍生·倍率** | multiplier | 10% | 倍率强力，比例低 |
| **衍生·时间** | time | 20% | |
| **衍生·金币** | gold | 20% | |
| **衍生·碎片** | fragment | 15% | 职业资源，比例适中 |
| **衍生·变异素** | mutagen | 15% | 职业资源，比例适中 |

### 运算符附魔（1 个）

| 附魔 | 效果 | 说明 |
|------|------|------|
| **乘算化** | 将技能的加算运算符转为乘算 | 数值按资源独立校准 |

### 附魔获取方式

| 来源 | 说明 |
|------|------|
| 精英关奖励 | 击败精英后从 2 选 1 |
| Boss 掉落 | Boss 关卡必出 1 个 |
| 商店 | 稀有商品，高价 |

### 双生词条与附魔交互

当技能拥有**双生**词条时，附魔分配阶段不再从 2 选 1，而是**两个选项全部获得**。
- `SkillInstance.enchantmentId` 扩展为 `enchantmentIds: string[]`（长度 0~2）
- 双附魔的效果独立计算，各自进入加算/乘算/后触发对应阶段
- 双生占用一个词条槽位但不提供直接数值 → 传奇(3词条)带双生 = 2个数值词条 + 2个附魔

---

## 五、触发计算流程

### Phase 1: 基础值

```
output = baseValues[level]
```

### Phase 2: 加算层（全部相加，只乘一次）

所有加算增益汇总为 `bonusPercent`，最后 `output × (1 + bonusPercent)`。

```
bonusPercent = 0

// ── 词条加算（任务 questCompletions 增强对应参数）──
c = questCompletions  // 简写

// 转化词条（精炼: k ×1.1^c）
if 转化: k_eff = k × (精炼 ? 1.1^c : 1); bonusPercent += k_eff × getSourceValue(source)

// 虚无词条（吞噬: bonusPerSlot +5%×c）
if 虚无: slot_eff = bonusPerSlot + (吞噬 ? c × 0.05 : 0); bonusPercent += countEmptySlots(posRel) × slot_eff

// 蓄力词条（充能: maxBonus +0.3×c，释放后清零）
if 蓄力: max_eff = maxBonus + (充能 ? c × 0.3 : 0); bonusPercent += min(chargeAccumulated, max_eff); chargeAccumulated = 0

// 流放词条（蓄势: bonusPercent +15%×c）
if 流放: if isFirstOrLastLetter(key, currentWord) → bonusPercent += outcastBonus + (蓄势 ? c × 0.15 : 0)

// 增幅（层叠: valuePerStack +0.005×c）
vps_eff = valuePerStack + (层叠 ? c × 0.005 : 0)
bonusPercent += sumNeighborAmplifyStacks(vps_eff)
if 增幅 && self.resource === amplify.resource: bonusPercent += self.amplifyStacks × vps_eff

// 禁忌词条（固定 +100%，负产出在 Phase 3 处理）
if 禁忌: bonusPercent += 1.0

// ── 附魔加算 ──

// 学徒: 永久成长（含丰收/适应，跨关保留，run 结束重置）
if 学徒附魔: bonusPercent += apprenticeAccumulated

// 任务·吞噬: ≥3次完成后额外通用加成（虚无 bonusPerSlot 已在上方内联增强）
if 任务·吞噬 && c >= 3: bonusPercent += c × 10%

output = output × (1 + bonusPercent)
```

### Phase 3: 乘算层（独立相乘，来源稀少）

```
// ── 词条乘算（任务 questCompletions 增强对应参数） ──
c = questCompletions  // 简写
if 乘算:  output ×= multiplier + (升华 ? c × 0.15 : 0)
if 暴击:  if roll(chance) → output ×= critMult + (过载 ? c × 0.5 : 0)
if 脉冲:  if triggerCount % interval === 0 → output ×= burstMult + (回响 ? c × 0.3 : 0)
if 衰减:  output ×= currentDecayMult; floor_eff = floor - (净化 ? c × 0.05 : 0); floor_eff = max(0.1, floor_eff)
          currentDecayMult = max(floor_eff, currentDecayMult - decayPerTrigger)
if 级联:  if hasRelation(prevKey, thisKey, posRel) → output ×= cascadeMult + (连锁 ? c × 0.2 : 0)
// 连字: 字母在单词中出现 N 次 → ×N
if 连字:  n = countOccurrences(key, currentWord); if n >= 2 → output ×= n
// 禁忌: 10% 概率产出变负
if 禁忌:  if roll(penaltyChance) → output ×= -1

// ── 附魔乘算 ──
if 乘算化附魔: (改变运算符，独立处理)

// ── 外部系统 ──
output ×= relicMultiplier
```

### Phase 4: 写入资源

```
// 彩虹: 随机选资源（光谱: 权重偏向最低资源 +15%×completions）
targetResource = 彩虹 ? weightedRandomResource(光谱 ? completions × 0.15 : 0) : resource
applyToResource(targetResource, output)
recordStats(skillId, output)
showFeedback(output)
emitResourceSound(resource)

```

### Phase 5: 后触发效果

```
// ── 词条后触发（任务增强溅射词条） ──
if 溅射:
  targets = 1 + (裂变 ? questCompletions : 0)
  pick `targets` random matching skills in posRel range → triggerSkill(each)
if 增幅: self.stacks += 1
// 递归: X% 概率重新触发自身（连锁时概率减半）
if 递归: if roll(recurseChance) → triggerSkill(self, { recurseChance: recurseChance / 2 })

// ── 附魔后触发 ──

// 学徒: 检查对应事件，满足则永久 +growthPerProc
if 学徒附魔:
  match enchantmentType:
    ApprenticeSelf/Harvest  → always (selfTrigger / wordComplete)
    ApprenticeCrit          → if thisTriggeredCrit
    ApprenticeOutcast       → if thisTriggeredOutcast
    ApprenticeProc          → if anyAffixProc
    ApprenticeAdapt         → if mutationApplied
    // Word/LongWord/Perfect/Combo/Stage/Neighbor → 在对应事件回调中处理
  apprenticeAccumulated += growthPerProc

// 任务: 检查事件，满足则 +1 层，满层 → questCompletions++ 并重置
if 任务附魔:
  if conditionMet(quest.event):
    questStacks++
    if questStacks >= target:
      questStacks = 0
      questCompletions++
      // 吞噬特殊: 额外吃掉 [posRel] 最弱邻居（创造空位供虚无词条利用）
      if QuestDevour: eatWeakestNeighbor(posRel)
      // 其余任务的增强效果通过 questCompletions 在 Phase 2-3 自动生效

if 衍生附魔: applyToResource(extraResource, output × ratio)
```

### Phase 6: 被动通知邻居

```
for each neighborSkill bound at neighborKey:
  // [词条] 共鸣: 邻居产出指定资源 → 自身触发（任务·共振 completions 增益产出 +10%/层）
  if neighbor has 共鸣词条 && resource === neighbor.resonanceResource && hasRelation(triggerKey, neighborKey, posRel):
    bonusFromQuest = 共振 ? neighbor.questCompletions × 0.10 : 0
    triggerSkill(neighbor, neighborKey, { bonusFromQuest })

  // [词条] 感应: 邻居拥有指定词条类型的技能触发 → 自身触发
  if neighbor has 感应词条 && triggerSkill.hasAffix(neighbor.watchAffix) && hasRelation(triggerKey, neighborKey, posRel):
    triggerSkill(neighbor, neighborKey)

  // [附魔] 学徒·观摩: 邻居触发 → 自身永久成长（不触发技能）
  if neighbor has 学徒·观摩附魔 && hasRelation(triggerKey, neighborKey, posRel):
    neighbor.apprenticeAccumulated += growthPerProc

  // [附魔] 任务·共振: 邻居触发 → 叠层（满层 → completions++）
  if neighbor has 任务·共振附魔 && hasRelation(triggerKey, neighborKey, posRel):
    neighbor.questStacks++; if questStacks >= 20 → questCompletions++; questStacks = 0

eventBus.emit('skill:triggered', { key, skillId, resource, output })
```

---

## 六、触发方向总结

```
"别人触发 → 影响自己"（Phase 6 被动检查）
  [词条] 共鸣: 邻居产出(指定资源) → 自身触发
  [词条] 感应: 邻居拥有(指定词条)的技能触发 → 自身触发
  [附魔] 学徒·观摩: 邻居触发 → 自身永久成长(不触发)
  [附魔] 任务(邻居条件): 邻居触发 → 自身叠层

"单词级操作"（触发前决策）
  [词条] 引力: 含此字母的单词出现概率 ×probMult（极化: |probMult−1| +0.15/层）

"自己触发 → 影响别人"（Phase 5 后触发）
  [词条] 溅射: 自身触发 → 1+裂变层 个匹配邻居触发
  [词条] 增幅: 自身触发 → 自身(同资源)及邻居获得层数加成
  [附魔] 任务·吞噬: 15次触发 → 吃最弱邻居(虚无+空位+bonusPerSlot)

"任务循环叠层 → 永久增强对应词条"（questCompletions 生效于 Phase 2-3）
  吞噬→虚无  过载→暴击  回响→脉冲  升华→乘算  连锁→级联
  净化→衰减  共振→共鸣+感应  蓄势→流放  精炼→转化  充能→蓄力
  裂变→溅射  层叠→增幅  极化→引力  光谱→彩虹  映射→倒影
  重叠→连字  迭代→递归  献祭→禁忌
```

---

## 七、数据结构

```typescript
// ===== 词条类型枚举（20 类） =====
// Replicate 已合并入 Splash
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
  Splash = 'splash',
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

// ===== 附魔类型枚举（保留，32 类） =====
// 衍生为 1 个枚举值，资源变体在运行时处理
enum EnchantmentType {
  // 学徒型（12）
  ApprenticeSelf = 'apprentice_self',          // 自修
  ApprenticeNeighbor = 'apprentice_neighbor',  // 观摩
  ApprenticeWord = 'apprentice_word',          // 造词
  ApprenticeProc = 'apprentice_proc',          // 悟道
  ApprenticeCrit = 'apprentice_crit',          // 暴击
  ApprenticeOutcast = 'apprentice_outcast',    // 流放
  ApprenticeLongWord = 'apprentice_longword',  // 长词
  ApprenticePerfect = 'apprentice_perfect',    // 精准
  ApprenticeCombo = 'apprentice_combo',        // 连击
  ApprenticeStage = 'apprentice_stage',        // 通关
  ApprenticeHarvest = 'apprentice_harvest',    // 丰收（造词师）
  ApprenticeAdapt = 'apprentice_adapt',        // 适应（蜕变师）
  // 任务型（18，需技能拥有对应词条）
  QuestDevour = 'quest_devour',                // 吞噬 → 虚无
  QuestOverload = 'quest_overload',            // 过载 → 暴击
  QuestEcho = 'quest_echo',                    // 回响 → 脉冲
  QuestAscend = 'quest_ascend',                // 升华 → 乘算
  QuestChain = 'quest_chain',                  // 连锁 → 级联
  QuestPurify = 'quest_purify',                // 净化 → 衰减
  QuestResonance = 'quest_resonance',          // 共振 → 共鸣+感应
  QuestCharge = 'quest_charge',                // 蓄势 → 流放
  QuestRefine = 'quest_refine',                // 精炼 → 转化
  QuestEnergize = 'quest_energize',            // 充能 → 蓄力
  QuestFission = 'quest_fission',              // 裂变 → 溅射
  QuestStack = 'quest_stack',                  // 层叠 → 增幅
  QuestPolarize = 'quest_polarize',            // 极化 → 引力
  QuestSpectrum = 'quest_spectrum',            // 光谱 → 彩虹
  QuestMirror = 'quest_mirror',                // 映射 → 倒影
  QuestOverlap = 'quest_overlap',              // 重叠 → 连字
  QuestIterate = 'quest_iterate',              // 迭代 → 递归
  QuestSacrifice = 'quest_sacrifice',          // 献祭 → 禁忌
  // 衍生型（1，运行时按 extraResource 7 变体）
  Transmute = 'transmute',
  // 运算符（1）
  MultiplyOperator = 'multiply_operator',
}

// ===== 词条实例（运行时生成，已掷骰） =====
interface AffixInstance {
  type: AffixType
  // 各类型的参数，按需填充
  multiplier?: number              // Multiply: 1.3~2.0
  source?: ResourceType            // Convert: 源资源
  k?: number                       // Convert: 系数（按源资源校准，见 k 值表）
  gainPerSec?: number              // Charge: 每秒蓄力%
  maxBonus?: number                // Charge: 蓄力上限%
  initialMult?: number             // Decay: 初始乘数
  decayPerTrigger?: number         // Decay: 每次触发衰减量
  floor?: number                   // Decay: 衰减下限
  interval?: number                // Pulse: 间隔次数
  burstMult?: number               // Pulse: 爆发乘数
  chance?: number                  // Crit: 概率
  critMult?: number                // Crit: 暴击乘数
  posRel?: PositionRelation        // Void/Resonance/Mirror/Link/Splash/Amplify/Cascade: 位置关系
  bonusPerSlot?: number            // Void: 每空位加成%
  resource?: ResourceType          // Resonance: 监听资源 / Amplify: 关联资源 / Splash: 目标资源
  watchAffix?: AffixType           // Link: 监听词条类型 / Splash: 目标词条类型
  valuePerStack?: number           // Amplify: 每层加成%
  cascadeMult?: number             // Cascade: 级联乘数
  bonusPercent?: number            // Outcast: 首尾字母加成% / Taboo: +100% 固定
  probMult?: number                // Gravity: 单词出现概率倍率（0~2）
  // Ligature: 无参数（运行时计算字母出现次数 → ×N）
  // Twin: 无运行时参数（生成阶段影响附魔分配）
  recurseChance?: number           // Recurse: 重触发概率 15%~30%
  penaltyChance?: number           // Taboo: 负产出概率 10%
}

// ===== 技能实例（一个完整的产出者） =====
interface AffixSkillInstance {
  id: string                       // 运行时生成的唯一 ID
  name: string                     // 自动拼接的名字
  icon: string                     // 基底资源图标
  resource: ResourceType           // 产出资源类型
  baseValues: [number, number, number]  // Lv1/2/3 加算基础值
  level: number                    // 1-3
  rarity: 0 | 1 | 2 | 3           // 词条数量
  affixes: AffixInstance[]         // 0~3 个词条
  enchantmentIds: string[]         // 附魔列表（通常 0~1 个；双生词条时最多 2 个）
  transmuteResource?: ResourceType // 衍生附魔目标资源
  purchasePrice?: number           // 购买价格（用于转卖计算）
}

// ===== 技能运行时状态（战斗中） =====
interface SkillRuntimeState {
  skillId: string
  // ── 词条状态 ──
  chargeAccumulated: number        // 蓄力: 当前蓄力百分比
  currentDecayMult: number         // 衰减: 当前衰减乘数（每词重置，默认 1.0 中性）
  mirrorCopiedAffix: AffixInstance | null  // 倒影: 每关刷新时复制的词条
  triggerCount: number             // 脉冲: 触发计数
  amplifyStacks: number            // 增幅: 当前增幅层数（每关重置）
  // ── 附魔状态 ──
  apprenticeAccumulated: number    // 学徒(含丰收/适应): 永久成长累积%
  questStacks: number              // 任务: 当前叠层进度
  questCompletions: number         // 任务: 已完成次数（= 词条增强层数）
}
```

---

## 八、生成规则

### 稀有度掷骰

```typescript
function rollRarity(): 0 | 1 | 2 | 3 {
  const r = Math.random()
  if (r < 0.40) return 0  // 白 40%
  if (r < 0.70) return 1  // 蓝 30%
  if (r < 0.90) return 2  // 紫 20%
  return 3                 // 橙 10%
}
```

### 词条权重表

| 词条 | 权重 | 说明 |
|------|------|------|
| 乘算 | 4 | 稀有，控制乘算来源 |
| 转化（异源） | 10 | 常见，资源联动 |
| 转化（同源） | 3 | 稀有，等效指数增长 |
| 彩虹 | 6 | 中等，资源随机化 |
| 蓄力 | 6 | 中等 |
| 衰减 | 6 | 中等 |
| 脉冲 | 6 | 中等 |
| 暴击 | 8 | 常见，好理解 |
| 级联 | 6 | 中等，打字顺序乘算 |
| 虚无 | 10 | 常见，鼓励布局思考 |
| 共鸣 | 4 | 较少，被动白嫖 |
| 倒影 | 3 | 稀有，每关随机变身 |
| 感应 | 6 | 中等，词条条件触发 |
| 溅射 | 5 | 中等，链式触发 |
| 增幅 | 5 | 中等，辅助型 |
| 流放 | 8 | 常见，首尾字母加成 |
| 引力 | 3 | 稀有，影响单词出现概率 |
| 连字 | 6 | 中等，重复字母奖励 |
| 双生 | 2 | 极稀有，元规则修改 |
| 递归 | 3 | 稀有，概率自我重触发 |
| 禁忌 | 4 | 较少，高收益高风险 |

### 生成流程

```typescript
function generateSkill(): AffixSkillInstance {
  // 1. 随机基底资源
  const resource = pickRandom(AVAILABLE_RESOURCES)

  // 2. 掷稀有度
  const rarity = rollRarity()

  // 3. 词条池（20 类通用词条，无职业过滤）
  const pool = AFFIX_POOL

  // 4. 加权不重复抽取 N 个词条类型
  const types = weightedSampleWithout(pool, rarity)

  // 5. 每个词条掷骰子参数
  const affixes = types.map(t => rollAffixParams(t, resource))

  // 6. 生成名字
  const name = generateName(resource, affixes)

  // 7. 生成唯一 ID
  const id = `skill_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

  return {
    id, name, icon: RESOURCE_ICONS[resource],
    resource, baseValues: BASE_VALUES[resource],
    level: 1, rarity, affixes
  }
}
```

### 词条参数掷骰

```typescript
function rollAffixParams(type: AffixType, resource: ResourceType): AffixInstance {
  switch (type) {
    case AffixType.Multiply:
      return { type, multiplier: roundTo(1.3 + Math.random() * 0.7, 2) }

    case AffixType.Convert: {
      // 源可以是任意资源（包括本技能资源）
      // 同源 = 指数增长（读自己的资源值加算回自己），生成时权重独立调低
      const source = pickRandom(ALL_RESOURCES)
      const [kMin, kMax] = CONVERT_K_TABLE[source]  // 按源资源校准
      const k = roundTo(kMin + Math.random() * (kMax - kMin), 4)
      return { type, source, k }
    }

    case AffixType.Rainbow:
      return { type }  // 无参数，Phase 4 随机选资源
    // CONVERT_K_TABLE: { base:[0.02,0.05], score:[0.0005,0.001], multiplier:[0.10,0.25],
    //   time:[0.01,0.025], gold:[0.003,0.008], fragment:[0.02,0.05], mutagen:[0.02,0.05] }

    case AffixType.Charge:
      return { type, gainPerSec: 0.08, maxBonus: 2.0 }

    case AffixType.Decay:
      return { type, initialMult: 2.0, decayPerTrigger: 0.15, floor: 0.5 }

    case AffixType.Pulse:
      return { type, interval: 4, burstMult: 3.0 }

    case AffixType.Crit:
      return { type, chance: 0.5, critMult: 2.0 }

    case AffixType.Void: {
      const posRel = pickRandom(ALL_POS_RELATIONS)
      return { type, posRel, bonusPerSlot: VOID_BONUS_TABLE[posRel] }
    }
    // VOID_BONUS_TABLE: { adjacent:0.25, sameRow:0.10, sameColumn:0.30,
    //   sameHand:0.05, sameFinger:0.35, symmetric:0.50 }

    case AffixType.Resonance: {
      const posRel = pickRandom(ALL_POS_RELATIONS)
      const resource = pickRandom(ALL_RESOURCES)  // 监听的资源类型
      return { type, posRel, resource }
    }

    case AffixType.Mirror:
      return { type, posRel: pickRandom(ALL_POS_RELATIONS) }
      // 运行时: 每关开始从 posRel 邻居中随机复制一个词条的类型+参数

    case AffixType.Link:
      return { type, posRel: pickRandom(ALL_POS_RELATIONS), watchAffix: pickRandom(ALL_AFFIX_TYPES) }

    case AffixType.Splash:
      return { type, posRel: pickRandom(ALL_POS_RELATIONS) }

    case AffixType.Amplify:
      return { type, posRel: pickRandom(ALL_POS_RELATIONS), resource, valuePerStack: 0.02 }

    case AffixType.Cascade: {
      const posRel = pickRandom(ALL_POS_RELATIONS)
      return { type, posRel, cascadeMult: roundTo(1.8 + Math.random() * 0.7, 2) }
    }

    case AffixType.Outcast:
      return { type, bonusPercent: roundTo(0.4 + Math.random() * 0.4, 2) }

    case AffixType.Gravity:
      return { type, probMult: roundTo(Math.random() * 2.0, 2) }  // 0~2：<1 斥力，>1 引力

    case AffixType.Ligature:
      return { type }  // 无参数，运行时统计字母在单词中出现次数 → ×N

    case AffixType.Twin:
      return { type }  // 无运行时参数，在附魔分配阶段生效

    case AffixType.Recurse:
      return { type, recurseChance: roundTo(0.15 + Math.random() * 0.15, 2) }  // 15%~30%

    case AffixType.Taboo:
      return { type, bonusPercent: 1.0, penaltyChance: 0.10 }  // +100%，10%负产出
  }
}
```

---

## 九、自动命名

```
白(0词条): "基数" / "分数" / "倍率" ...
蓝(1词条): "暴击·基数"
紫(2词条): "暴击·蓄力·基数"
橙(3词条): "暴击·蓄力·共鸣·基数"
```

```typescript
const AFFIX_NAMES: Record<AffixType, string> = {
  multiply: '强化', convert: '转化', rainbow: '彩虹', charge: '蓄力',
  decay: '衰减', pulse: '脉冲', crit: '暴击',
  void: '虚无', resonance: '共鸣', mirror: '倒影', link: '感应',
  splash: '溅射', amplify: '增幅', cascade: '级联',
  outcast: '流放', gravity: '引力', ligature: '连字',
  twin: '双生', recurse: '递归', taboo: '禁忌',
}

const RESOURCE_NAMES: Record<ResourceType, string> = {
  base: '基数', score: '分数', multiplier: '倍率',
  time: '时间', gold: '金币', fragment: '碎片', mutagen: '变异素',
}

function generateName(resource: ResourceType, affixes: AffixInstance[]): string {
  const prefix = affixes.map(a => AFFIX_NAMES[a.type]).join('·')
  const base = RESOURCE_NAMES[resource]
  return prefix ? `${prefix}·${base}` : base
}
```

---

## 十、存档序列化

```typescript
interface AffixSkillSaveData {
  id: string
  resource: ResourceType
  level: number
  rarity: number
  affixes: AffixInstance[]          // 词条定义（不变）
  enchantmentIds: string[]          // 附魔 ID 列表（双生词条时最多 2 个）
  transmuteResource?: ResourceType  // 衍生附魔目标资源
  runtime: SkillRuntimeState       // 运行时状态
}
```

---

## 十一、状态生命周期

| 状态 | 来源 | 作用域 | 重置时机 |
|------|------|-------|---------|
| chargeAccumulated | 蓄力词条 | 实时 | 触发时清零 |
| currentDecayMult | 衰减词条 | 每词 | 每个新词重置为 initialMult |
| mirrorCopiedAffix | 倒影词条 | 每关 | 关卡开始时从[posRel]邻居随机复制 |
| triggerCount | 脉冲词条 | 每关 | 关卡结束重置 |
| amplifyStacks | 增幅词条 | 每关 | 关卡结束重置 |

| apprenticeAccumulated | 学徒附魔(含丰收/适应) | 跨关 | run 结束重置 |
| questStacks | 任务附魔 | 跨关 | 完成任务时重置为 0（循环） |
| questCompletions | 任务附魔 | 跨关 | run 结束重置（= 词条增强层数） |

---

## 十二、组合数量统计

- 通用词条: 20 类
- 橙装组合: C(20,3) = 1140
- 每种组合的子参数变体（转化的源资源、共鸣的监听资源、感应的监听词条等）再乘以数倍
- 附魔层额外 ×39 种可能（学徒12 + 任务18(需对应词条) + 衍生7 + 乘算化1 + 无附魔）
- 运行时随机生成 → 每局每个商店位都是独特技能

---

## 十三、加算 vs 乘算分界线

| 加算层（叠加后 ×1 次） | 乘算层（各自独立 ×） |
|----------------------|-------------------|
| [词条] 转化 | [词条] 乘算 |
| [词条] 虚无 | [词条] 暴击 |
| [词条] 蓄力 | [词条] 脉冲 |
| [词条] 增幅(邻居+自身层数) | [词条] 衰减 |
| [词条] 流放(首尾加成) | [词条] 级联(上键相邻 ×N) |
| [词条] 禁忌(+100%加算) | [词条] 连字(字母出现N次 ×N) |
| [附魔] 学徒(含丰收/适应) | [词条] 禁忌(10%概率 ×-1) |
| [附魔] 任务(吞噬/蓄势=加算) | [词条] 递归(X%重触发) |
| | [附魔] 乘算化 |
| | [任务] 升华/过载/回响/连锁/净化(乘算参数增强) |
| | 遗物(外部系统) |

一个橙装最多 3 词条。全乘算组合（乘算+暴击+脉冲）概率极低（权重 4×8×6 vs 总权重³），有效遏制数值膨胀。

---

## 十四、蜕变师 — 词条蜕变

蜕变师消耗**变异素（mutagen）**对已拥有的技能进行蜕变操作。提供两种蜕变类型：

### 蜕变 A：词条重铸

**效果：** 玩家选择技能的一个词条，重新掷骰类型和参数（从词条池加权抽取，排除当前已有类型）。

```
蜕变A(skill, playerChosenIdx):
  if skill.affixes.length === 0 → 不可操作
  targetIdx = playerChosenIdx  // 玩家主动选择要重铸的词条
  oldAffix = skill.affixes[targetIdx]
  // 从词条池中排除该技能已有的其他词条类型
  pool = AFFIX_POOL.filter(t => !skill.affixes.some((a, i) => i !== targetIdx && a.type === t))
  newType = weightedSample(pool, 1)
  newAffix = rollAffixParams(newType, skill.resource)
  skill.affixes[targetIdx] = newAffix
  // ★ 若技能有任务附魔且对应的是被替换的旧词条 → 任务附魔失效（移除）
  if skill.enchantmentIds includes questFor(oldAffix.type):
    remove that enchantment; questStacks = 0; questCompletions = 0
  emit('mutationApplied', skill)  // 触发学徒·适应
```

**消耗：** 3 变异素（基础），每次对同一技能操作 +1（同 run 内累计）。

**设计意图：** 重铸保留稀有度（词条数量不变），但可以替换不理想的词条。任务附魔可能因对应词条被替换而失效，形成决策张力。

### 蜕变 C：稀有度升降

**效果：** 提升或降低技能稀有度 1 级（即增减 1 个词条）。

```
蜕变C↑(skill):  // 升级
  if skill.rarity >= 3 → 不可操作（已传说）
  newType = weightedSample(AFFIX_POOL.filter(t => !skill.affixes.includes(t)), 1)
  newAffix = rollAffixParams(newType, skill.resource)
  skill.affixes.push(newAffix)
  skill.rarity += 1
  skill.name = generateName(skill.resource, skill.affixes)
  emit('mutationApplied', skill)

蜕变C↓(skill):  // 降级
  if skill.rarity <= 0 → 不可操作（已普通）
  removeIdx = random(0, skill.affixes.length - 1)
  removedAffix = skill.affixes.splice(removeIdx, 1)
  skill.rarity -= 1
  skill.name = generateName(skill.resource, skill.affixes)
  // 同蜕变A: 若移除的词条有对应任务附魔 → 移除附魔
  if skill.enchantmentIds includes questFor(removedAffix.type):
    remove that enchantment; questStacks = 0; questCompletions = 0
  // 返还部分变异素
  refund(1)
  emit('mutationApplied', skill)
```

**消耗：**

| 操作 | 消耗 | 说明 |
|------|------|------|
| C↑ 白→蓝 | 5 变异素 | 从无到有 |
| C↑ 蓝→黄 | 8 变异素 | |
| C↑ 黄→橙 | 12 变异素 | 传说极贵 |
| C↓ 降级 | 0（返还 1） | 主动舍弃，微量返还 |

**交互规则：**
- 蜕变后技能名自动更新（§九 命名规则）
- 蜕变 A 和 C 可叠加使用：先升级获得新词条，再重铸替换不满意的
- 蜕变操作触发 `mutationApplied` 事件 → 学徒·适应附魔可从中成长
- 降级是不可逆的：被移除的词条及其任务附魔进度（questCompletions）永久丢失

---

## 十五、遗物系统适配

词条制重构后，旧的 4 类技能类别（产出者/转化者/连接者/增幅者）不再存在——所有技能 = 加算产出者 + 词条。遗物中引用旧类别的需要改为引用**词条类型、词条类别、稀有度**。

### 受影响遗物改写

#### T1 条件加成

| ID | 旧效果 | 新效果 | 改写理由 |
|----|--------|--------|---------|
| `forge_heart` 熔炉之心 | 产出者触发时转化者 +15% | **拥有转化词条的技能触发时，k 值额外 +15%** | 产出者/转化者→转化词条 |
| `chain_surge` 链路增压 | 连接者传导时被传导技能 +25% | **感应词条触发（被动传导）时，被触发的技能本次产出 +25%** | 连接者→感应词条 |
| `stack_resonance` 层叠共鸣 | 增幅者叠层≥15 时 +10% | **增幅词条叠层 ≥15 时，受增幅影响的技能额外 +10%** | 增幅者→增幅词条 |
| `resource_flood` 资源洪流 | 单词内≥3种资源时 +20% | **不变**（彩虹词条单次只产1种随机资源，不会单独满足条件） | 无需改 |

#### T3 重触发

| ID | 旧效果 | 新效果 | 改写理由 |
|----|--------|--------|---------|
| `storm_drum` 风暴鼓 | 产出者双触发 | **稀有度 ≥2（史诗及以上）的技能双触发** | 全技能都是产出者→用稀有度区分 |
| `overcharge` 过载核心 | 产出者 +50%，触发 -0.1s | **稀有度 ≥1（稀有及以上）触发时 +50%，但每次触发 -0.1s** | 同上 |

#### T4 规则改造

| ID | 旧效果 | 新效果 | 改写理由 |
|----|--------|--------|---------|
| `pure_heart` 纯粹之心 | 只能装备产出者，×3 | **技能只能为白装（0 词条），但产出 ×3** | 禁用技能类别→禁用词条；白装=纯产出者 |
| `chain_ban` 链式禁令 | 连接者无法触发 +30% | **触发链词条（感应/溅射/共鸣）无效，全技能 +30%** | 连接者→触发链类别 |
| `keyboard_flood` 键盘洪水 | ≥15 技能 Lv1 +25% | **不变**（Lv1 限制意味着无法获取附魔，与旧效果等价） | 无需改 |
| `no_enchant_vow` 无附魔戒律 | 无附魔 +40% | **不变** | 无需改 |

#### T2 累积成长

| ID | 旧效果 | 新效果 | 改写理由 |
|----|--------|--------|---------|
| `star_chart` 星图罗盘 | 获得附魔时 +8% | **不变**（附魔获取机制保留，仅分类调整） | 无需改 |

### 新增词条制专属遗物

词条制引入了稀有度、词条多样性、任务循环等新维度，新增以下遗物利用这些维度：

#### T1 条件加成 — 新增

| ID | 名称 | 稀有度 | 效果 | 设计意图 |
|----|------|--------|------|----------|
| `affix_spectrum` | 词条光谱 | 稀有 | 每拥有 1 种**不同词条类型**的技能，全技能产出 +3% | 鼓励词条多样化而非堆叠同类；20 种词条上限 = +60% |
| `legendary_aura` | 传说气场 | 稀有 | 每拥有 1 个橙装（3 词条），全技能产出 +8% | 鼓励蜕变升级；配合蜕变C↑ |

#### T2 累积成长 — 新增

| ID | 名称 | 稀有度 | 效果 | 设计意图 |
|----|------|--------|------|----------|
| `quest_momentum` | 任务动力 | 稀有 | 每完成 1 次任务（questCompletions），全技能永久 +2% | 奖励任务附魔的循环完成；长线投资 |

#### T4 规则改造 — 新增

| ID | 名称 | 稀有度 | 效果 | 设计意图 |
|----|------|--------|------|----------|
| `mono_affix` | 纯血词条 | 传说 | 所有技能的词条必须为同一类别（数值/节奏/拓扑/触发链/单词/元规则），但该类别词条效果 ×2 | 极端构筑定义：锁死词条类别换取翻倍 |

### 不受影响的遗物

以下遗物不引用技能类别，词条制重构后无需修改：

- **T1**: `perfect_rhythm`, `perfectionist`, `phoenix_feather`
- **T2**: `campfire_ember`, `entropy`, `schrodinger_dice`
- **T3**: `echo_bell`, `finale`
- **T5**: 全部（`home_advantage`, `ambidextrous`, `constellation`, `lone_wolf`）
- **T6**: 全部（`lucky_coin`, `overkill_blade`, `cornucopia`, `interest_gem`）
- **T7**: `glass_cannon`, `time_thief`, `greedy_hand`, `doomsday`, `ramen`
- **职业专属**: 需单独审查（部分引用旧技能类别）

### 遗物 × 词条交互矩阵

| 遗物 | 数值型 | 节奏型 | 拓扑型 | 触发链型 | 单词型 | 元规则 |
|------|--------|--------|--------|---------|--------|--------|
| 熔炉之心 | 转化 +k | - | - | - | - | - |
| 链路增压 | - | - | - | 感应 +25% | - | - |
| 层叠共鸣 | - | - | - | 增幅≥15 +10% | - | - |
| 风暴鼓 | - | - | - | - | - | - |
| 纯粹之心 | 🚫全禁 | 🚫全禁 | 🚫全禁 | 🚫全禁 | 🚫全禁 | 🚫全禁 |
| 链式禁令 | - | - | 共鸣🚫 | 感应/溅射🚫 | - | - |
| 纯血词条 | ×2(若选) | ×2(若选) | ×2(若选) | ×2(若选) | ×2(若选) | ×2(若选) |
| 词条光谱 | 计数 | 计数 | 计数 | 计数 | 计数 | 计数 |
| 传说气场 | - | - | - | - | - | - |
| 任务动力 | - | - | - | - | - | - |

---

_Last updated: 2026-03-12_
