---
title: '新词条设计方案'
date: '2026-04-02'
author: 'Yuchenghuang'
version: '3.0'
status: 'refined'
---

# 新词条设计方案

## 背景

词条分类从 6 类调整为新体系后，数值/拓扑/词感/元规则各类数量不足（3/3/3/2），需补齐至与暴击(5)/叠层(6)持平的 5~6 个。

### 分类现状 → 目标

| 类别 | 现有词条 | 现有数量 | 新增 | 目标数量 |
|------|---------|---------|------|---------|
| 暴击 crit | Crit, Charge, Decay, Recurse, Taboo | 5 | — | 5 |
| 叠层 stack | Pulse, Resonance, Splash, Amplify, Relay, WarDrum | 6 | — | 6 |
| 数值 numeric | Convert, Rainbow, Multiply | 3 | +3 | 6 |
| 拓扑 topology | Void, Mirror, Cascade | 3 | +3 | 6 |
| 词感 word_sense | Outcast, Gravity, Ligature | 3 | +3 | 6 |
| 元规则 meta_rule | Conduit, Twin | 2 | +4 | 6 |

---

## 设计方法论

### 原则：接入共享机制，不造孤岛

新词条必须读写现有共享机制（bonusPercent、stacks、暴击系统、posRel、getAffixSourceValue 等），禁止创建只有自己使用的私有 runtime 状态。涌现来自多个词条通过共享机制互相影响。

### 方法：单一领域 → 核心映射 → 概念迁移

每个类别选择一个灵感领域，建立一个核心映射变量，通过对该变量应用不同的数学函数/条件来派生多个词条。

| 类别 | 灵感领域 | 核心映射 | 范式 |
|------|---------|---------|------|
| 数值 | 热力学 | 资源当前值 → 温度 | `read(resource) → f(value) → bonusPercent [+ consume]` |
| 拓扑 | 流体力学 | base value → 水位/压力 | `scan(posRel, neighbor.baseValue/resourceType) → 统计运算 → bonusPercent` |
| 词感 | 语言学 | 单词 → 可量化语言特征 | `analyze(word) → f(linguistic_feature) → bonusPercent` |
| 元规则 | 卡牌游戏 | 词条生命周期节点 → 关键词修改点 | `在生命周期特定节点插入规则修改` |

### 新增共享基础设施

| 基础设施 | 说明 | 依赖词条 |
|---------|------|---------|
| `consume(resource, amount)` | Phase 2 后消耗资源 | 相变、Endo/Exo、聚变 |
| `BIGRAM_FREQ_TABLE` | 英语字母对频率静态表 | 双字组 |
| `startLevel` 自动触发钩子 | 关卡开始后调用 triggerSkill | 先天 |
| 产出前负值检查 | Phase 4 后判断是否为负 | 反制 |
| 词条运行时移除逻辑 | 触发后/关卡结束后移除词条 | 消耗、虚无 |

---

## 数值型新词条（+3）

**领域：热力学 | 映射：资源当前值 → 温度**

同一个 `getStageProducedValue(source)` 读取本关累积产出量，三个不同的 f() 函数：

### 相变 (Phase Shift) — 阶梯函数

读取一种资源的本关累积产出当「温度」，跨阈值时产出跳升，高相态持续消耗资源。

```
Phase 2:
  val = getStageProducedValue(source)
  norm = BASE_VALUES[skill.resource][lvl] / BASE_VALUES[source][lvl]

  if val < threshold1:       // 固态
    bonusPercent += k_solid × val × norm
  else if val < threshold2:  // 液态
    bonusPercent += k_liquid × val × norm      // k_liquid >> k_solid
  else:                      // 气态
    bonusPercent += k_gas × val × norm         // k_gas >> k_liquid
    consume(source, sustainCost)
```

- **体感：** 越打越强的突变感，跨阈值时明显跳升
- **涌现：** 其他技能产出该资源 = 帮升温；和 Convert 共存但曲线不同（阶梯 vs 线性）；高相态消耗和聚变形成资源竞争

### 吸热/放热 (Endo/Exo) — 方波振荡

读取一种资源的本关累积产出，高于阈值时高产出+消耗，低于阈值时低产出+不消耗，形成自然振荡。

```
Phase 2:
  val = getStageProducedValue(source)
  norm = BASE_VALUES[skill.resource][lvl] / BASE_VALUES[source][lvl]

  if val >= threshold:       // 放热(Exo)
    bonusPercent += k_exo × val × norm
    consume(source, consumeRate)
  else:                      // 吸热(Endo)
    bonusPercent += k_endo × val × norm         // k_endo 低甚至为负
```

- **体感：** 周期性的高低节奏感，资源高时爆发、低时蛰伏
- **涌现：** 振荡频率由其他技能的资源产出速率决定；产出越多→Endo 期越短→平均收益越高

### 聚变 (Fusion) — 与门

读取两种资源的本关累积产出，同时高于各自阈值时高倍产出+双消耗，否则惩罚。

```
Phase 2:
  valA = getStageProducedValue(sourceA)
  valB = getStageProducedValue(sourceB)
  normA/normB = 归一化系数

  if valA >= ignitionA && valB >= ignitionB:
    bonusPercent += k × (valA × normA + valB × normB)
    consume(sourceA, consumeA)
    consume(sourceB, consumeB)
  else:
    bonusPercent -= penalty
```

- **体感：** 全有或全无的条件爆发，点火成功时极度满足
- **涌现：** 需要同时维持两种资源，任何产出 sourceA/sourceB 的技能都在「喂燃料」；每次消耗削弱下次条件→自然节奏

### 数值型三件套互动

- 相变和聚变都消耗资源 → **资源竞争**，玩家必须选择构建方向
- Endo/Exo 的振荡影响资源水位 → 间接影响相变的相态和聚变的点火条件
- 三者和 Convert 共享读取源但 f() 不同 → 同一资源上可叠加多种数值词条

---

## 拓扑型新词条（+3）

**领域：流体力学 | 映射：base value → 水位/压力，posRel → 管道连接**

同一组邻居数据，三种不同的统计运算：

### 落差 (Flow) — pairwise 差值

读取邻居 base value 与自身的差值，邻居比自己强时获得加成（水从高处流向低处）。

```
Phase 2:
  for neighbor in scan(posRel):
    delta = neighbor.baseValue - self.baseValue
    if delta > 0:
      norm = BASE_VALUES[skill.resource][lvl] / BASE_VALUES[neighbor.resource][lvl]
      bonusPercent += k_flow × delta × norm
```

- **体感：** 弱技能靠近强技能时明显变强
- **涌现：** 鼓励弱技能贴强技能；和 Void（空位越多越好）互补——Void 要空间，落差要有强邻居

### 汇流 (Confluence) — categorical 去重计数

读取邻居资源类型种类数，越多样加成越高（多条支流汇入）。

```
Phase 2:
  uniqueResources = countUniqueResourceTypes(neighbors, posRel)
  bonusPercent += k_conf × (1 - 1 / (uniqueResources + 1))
```

- **体感：** 周围放不同资源技能时明显变强
- **涌现：** 和同频（Harmonic，已有?不，同频是候选未实装）完美对立——汇流要多样，同频要同类。和 Void 中性

### 湍流 (Turbulence) — spread 极差

读取邻居间 base value 的离散程度，差异越大加成越高（湍流 = 高能混沌）。

```
Phase 2:
  neighbors = scan(posRel)
  if neighbors.length >= 2:
    maxBase = max(n.baseValue for n in neighbors)
    minBase = min(n.baseValue for n in neighbors)
    spread = (maxBase - minBase) / maxBase
    bonusPercent += k_turb × spread × neighbors.length
```

- **体感：** 强弱混搭的邻居组合产出高
- **涌现：** 落差让弱贴强 → 拉大极差 → 喂湍流；汇流要资源多样 → 不同资源有不同 base value → 也喂湍流。三者天然协同

---

## 词感型新词条（+3）

**领域：语言学 | 映射：word → 可量化的语音/结构特征**

同一个 `currentWord` 输入，三种不同的分析维度：

### 辅音丛 (Cluster) — 语音结构

检测单词中最长连续辅音段长度，辅音丛越长（打字越难）奖励越高。

```
Phase 2:
  maxCluster = 0, currentCluster = 0
  for letter in currentWord:
    if isConsonant(letter): currentCluster++; maxCluster = max(...)
    else: currentCluster = 0
  bonusPercent += k_cluster × max(0, maxCluster - 1)
```

- **体感：** 打 "strength"(4连辅音) 比 "area" 收益明显更高
- **涌现：** 和 Gravity（调出词概率）协同——Gravity 可增加含辅音丛单词的出现率

### 覆盖度 (Coverage) — 形态多样性

读取单词使用的不同字母种类数，覆盖越广奖励越高。

```
Phase 2:
  uniqueLetters = new Set(currentWord).size
  bonusPercent += k_coverage × uniqueLetters
```

- **体感：** 打 "typewriting"(11种字母) 比 "banana"(3种) 收益高
- **涌现：** 和 Ligature（重复字母加成）完美对立——构建时必须在两者间取舍

### 双字组 (Bigram) — 字母对频率

分析连续字母对的罕见程度，罕见 bigram 越多奖励越高。

```
Phase 2:
  totalRarity = 0
  for i in range(1, currentWord.length):
    pair = currentWord[i-1] + currentWord[i]
    totalRarity += (1 - BIGRAM_FREQ_TABLE[pair])
  bonusPercent += k_bigram × totalRarity / (currentWord.length - 1)
```

- **体感：** 打 "fjord"(罕见 FJ/JO) 比 "the"(常见 TH/HE) 收益高
- **涌现：** 唯一分析「字母对」而非单字母的词感词条；需要内置 BIGRAM_FREQ_TABLE

---

## 元规则型新词条（+4）

**领域：卡牌游戏 | 映射：词条生命周期节点 → 关键词修改点**

四个词条分别在生命周期的四个不同节点插入修改：

```
词条生命周期：
  装备 → 关卡开始 → 每次触发 → N次后 → 关卡结束 → 下一关
           [先天]    [反制]    [消耗]   [虚无]
```

### 先天 (Innate) — 关卡开始节点

关卡开始时，本技能自动触发一次（走完整 Phase 1-6 管线）。

```
startLevel 后:
  if hasAffix(Innate):
    triggerSkill(skillId, null)
```

- 每关开局白送一次触发，不需要玩家按键
- **涌现：** 配合 Amplify→开局就有叠层；配合 WarDrum→开局给邻居加暴击率

### 反制 (Counter) — 被负面影响节点

本技能有 N 层反制充能（每关恢复）。当产出为负值时消耗 1 层充能取消该负面。

```
产出应用前:
  if outputValue < 0 && hasAffix(Counter) && counterCharges > 0:
    counterCharges--
    outputValue = 0
```

- 选择性防御，充能有限
- **涌现：** 保护 Taboo 负产出→纯收益；保护 Decay 衰减→维持高暴击率

### 消耗 (Exhaust) — 触发计数节点

每次触发 base ×2，但只有 N 次机会，用完永久移除此词条。

```
Phase 1:
  if hasAffix(Exhaust):
    effectiveBase *= 2
    exhaustCount++
    if exhaustCount >= maxTriggers:
      removeAffix(Exhaust)
```

- 限次增强，珍惜每次触发
- **涌现：** 高频键消耗快→几关用完；低频键→弹药持续整 run。Innate 每关自动消耗 1 发→取舍

### 虚无 (Ethereal) — 关卡结束节点

base ×3 极强效果，但首次触发的关卡结束后自动移除此词条。

```
Phase 1:
  if hasAffix(Ethereal):
    effectiveBase *= 3

endLevel:
  if hasAffix(Ethereal) && etherealTriggered:
    removeAffix(Ethereal)
```

- 一关极强，然后消失。×3 作用于 Phase 1 基础值，即使单独存在也有效
- **涌现：** 和 Exhaust 竞速——1 关内触发超过 N 次则 Exhaust 先移除；base ×3 被暴击放大 = 核弹

---

## 实施计划

### 建议批次

| 批次 | 词条 | 新基础设施 | 复杂度 |
|------|------|-----------|--------|
| 1 | 辅音丛、覆盖度 | 无 | ⭐ |
| 2 | 落差、汇流、湍流 | 无（复用邻居扫描） | ⭐⭐ |
| 3 | 双字组 | BIGRAM_FREQ_TABLE | ⭐⭐ |
| 4 | 相变、Endo/Exo、聚变 | consume() 机制 | ⭐⭐⭐ |
| 5 | 先天、反制 | startLevel 钩子 + 负值检查 | ⭐⭐ |
| 6 | 消耗、虚无 | 词条运行时移除逻辑 | ⭐⭐⭐ |

### 验证要点

- 13 个新词条之间无实质重叠 ✅
- 13 个新词条与现有 22 个无体验层面重复 ✅
- 全部零新 runtime 状态（除 Counter 的充能数和 Exhaust 的计数，可复用现有 stacks 字段）
- 最大基础设施投入：consume() 机制（3 个数值型共用）+ 词条移除逻辑（2 个元规则共用）

---

## 灵感领域索引（备查）

### 暴击型

| 领域 | 映射 |
|------|------|
| 赌博/博彩 | 概率操控与连续事件 |
| 量子力学 | 观测前不确定，观测时坍缩 |
| 气象学 | 概率随条件动态变化 |
| 精密射击 | 概率可被操控提升/降低 |
| 遗传学 | 多因素叠加影响最终概率 |

### 叠层型

| 领域 | 映射 |
|------|------|
| 电容/蓄电池 | 累积速率和释放模式 |
| 水利工程 | 阈值控制与溢出处理 |
| 地震学 | 能量积蓄与连锁释放 |
| 化学链式反应 | 阈值可被外部条件修改 |
| 压力容器 | 超阈值的不同处理方式 |

### 数值型

| 领域 | 映射 |
|------|------|
| 热力学 ✅已选用 | 转化效率、损耗、状态突变 |
| 核物理 ✓已调研 | 爆发/衰变/临界点行为 |
| 金融 ✓已调研 | 资源借贷/延迟/风险博弈 |
| 流体力学 | 资源流动方向和速率控制 |
| 化学反应 | 反应条件和产出曲线 |
| 经济学 | 资源价值随数量的动态关系 |

### 拓扑型

| 领域 | 映射 |
|------|------|
| 流体力学 ✅已选用 | 水位/压力驱动流动 |
| 电路学 ✓已调研 | 串并联/电阻/电容 |
| 细胞自动机 ✓已调研 | 邻居状态决定自身行为 |
| 物理场论 | 技能产生「场」影响邻居 |
| 生态学 | 技能之间的生态关系 |

### 词感型

| 领域 | 映射 |
|------|------|
| 语言学 ✅已选用 | 单词的语言特征驱动效果 |
| 密码学 ✓已调研 | 字母/单词的隐藏模式 |
| 音乐理论 | 按键序列的节奏和音程 |
| 信息论 | 单词的信息复杂度 |

### 元规则型

| 领域 | 映射 |
|------|------|
| 卡牌游戏 ✅已选用 | 词条生命周期的关键词修改 |
| 元编程 ✓已调研 | 词条修改其他词条的行为规则 |
| 博弈论 | 技能之间的策略互动规则 |
| 操作系统 | 触发顺序和优先级控制 |
