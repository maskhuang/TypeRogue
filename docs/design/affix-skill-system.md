# 词条制技能系统设计文档（方案 A）

_打字肉鸽 — 技能系统重构 — 方案 A：词条制_
_日期: 2026-03-10_

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

### 重构范围

| 系统 | 处理方式 |
|------|---------|
| Producer（加算） | → 基底 |
| Producer（乘算） | → 乘算词条 |
| Converter（加算） | → 转化词条 |
| Converter（乘算） | **删除**（遏制乘算泛滥） |
| Connector | → 连接词条 |
| Replicator | → 复制词条 |
| Amplifier | → 增幅词条 |
| 附魔系统（35个） | → 对应词条，附魔系统本身删除 |

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
| 魔法 | 1 | 蓝 | 30% |
| 稀有 | 2 | 黄 | 20% |
| 传说 | 3 | 橙 | 10% |

---

## 四、词条池（22 类）

### 通用词条（16 类）

#### 数值型

| # | 词条 | 来源 | 效果 | 参数 | 权重 |
|---|------|------|------|------|------|
| 1 | **乘算** | Producer(乘) | 最终产出 ×N | `multiplier: 1.3~2.0` | 4 |
| 2 | **转化** | Converter(加) | 读取资源当前值，额外加算 +k×源值（k 按源校准）。源可以是本技能资源（等效指数增长，权重独立调低） | `source: ResourceType, k: 按源校准` | 10（异源）/ 3（同源） |

#### 节奏型

| # | 词条 | 来源 | 效果 | 参数 | 权重 |
|---|------|------|------|------|------|
| 3 | **蓄力** | 新设计 | 未触发期间每秒 +X% 产出，触发时释放并清零 | `gainPerSec: 0.08, maxBonus: 2.0` | 6 |
| 4 | **衰减** | 新设计 | 基础产出 ×N，每次触发 -X%，每词重置 | `initialMult: 2.0, decayPerTrigger: 0.15, floor: 0.5` | 6 |
| 5 | **脉冲** | 新设计 | 每第 N 次触发产出 ×M，其余正常 | `interval: 4, burstMult: 3.0` | 6 |
| 6 | **暴击** | 新设计 | 每次触发 X% 概率产出 ×N | `chance: 0.5, critMult: 2.0` | 8 |

#### 键盘拓扑型

| # | 词条 | 来源 | 效果 | 参数 | 权重 |
|---|------|------|------|------|------|
| 7 | **虚无** | Repulsion附魔 | [posRel]范围内每空位产出 +X% | `posRel, bonusPerSlot: 5%~50%` | 10 |
| 8 | **成长** | Growth附魔 | [posRel]范围内技能触发时，自身产出永久 +X% | `posRel, growthRate: 1%~6%` | 5 |
| 9 | **溅射** | Splash附魔 | 触发后等分效率触发[posRel]范围内所有技能 | `posRel` | 3 |
| 10 | **共鸣** | Resonance附魔 | [posRel]范围内技能触发时，自身以 X% 效率触发 | `posRel, efficiency: 15%~60%` | 4 |
| 11 | **吞噬** | Devour附魔 | 每 N 次触发吞噬[posRel]范围内最弱技能，+20%/吞噬数 | `posRel, interval: 5` | 2 |

#### 触发链型

| # | 词条 | 来源 | 效果 | 参数 | 权重 |
|---|------|------|------|------|------|
| 12 | **连接** | Connector | [posRel]范围内技能产出[resource]时，自身触发 | `posRel, resource` | 4 |
| 13 | **复制** | Replicator | 触发后额外触发[posRel]范围内 1 个随机技能 | `posRel` | 3 |
| 14 | **增幅** | Amplifier | 每次触发 +1 层；[posRel]范围内同资源技能获得 +X%/层 | `posRel, resource, valuePerStack` | 3 |

#### 资源交互型

| # | 词条 | 来源 | 效果 | 参数 | 权重 |
|---|------|------|------|------|------|
| 15 | **衍生** | Transmutation附魔 | 触发后额外产出一种资源（产出的 X%）。可选本技能资源（等效百分比增幅） | `extraResource, ratio: 10%~30%` | 6 |
| 16 | **精通** | Mastery附魔 | 每 N 次触发，自身产出永久 +X% | `interval: 10, growth: 8%` | 5 |

### 职业词条（6 类）

| # | 词条 | 职业 | 效果 | 参数 | 权重 |
|---|------|------|------|------|------|
| 17 | **丰收** | 造词师 | 每造一个词，自身产出永久 +X% | `growth: 8%` | 3 |
| 18 | **字母亲和** | 造词师 | 采集队列含本键字母时产出 +X% | `bonus: 25%` | 3 |
| 19 | **满溢** | 造词师 | 每有 1 种碎片 ≥15 产出 +X% | `bonus: 20%` | 3 |
| 20 | **适应** | 蜕变师 | 每被蜕变一次，产出永久 +X% | `growth: 15%` | 3 |
| 21 | **不稳定** | 蜕变师 | 每关随机一种资源 +X% | `bonus: 30%` | 3 |
| 22 | **嗜变** | 蜕变师 | 触发时 X% 概率产 1 变异素 | `chance: 5%` | 3 |

### 虚无词条 bonusPerSlot 按 PositionRelation

| PositionRelation | bonusPerSlot |
|-----------------|-------------|
| Adjacent | 25% |
| SameRow | 10% |
| SameColumn | 30% |
| SameHand | 5% |
| SameFinger | 35% |
| Symmetric | 50% |

### 共鸣词条 efficiency 按 PositionRelation

| PositionRelation | efficiency |
|-----------------|-----------|
| Adjacent | 50% |
| SameRow | 30% |
| SameColumn | 40% |
| SameHand | 15% |
| SameFinger | 50% |
| Symmetric | 60% |

### 成长词条 growthRate 按 PositionRelation

| PositionRelation | growthRate |
|-----------------|-----------|
| Adjacent | 3% |
| SameRow | 2% |
| SameColumn | 4% |
| SameHand | 1% |
| SameFinger | 5% |
| Symmetric | 6% |

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

## 4.5、键位附魔系统

附魔系统从技能层移除后，保留给**键位**。玩家可以对键盘上的特定键位施加全局效果。

### 获取方式

| 来源 | 说明 |
|------|------|
| 精英关奖励 | 击败精英后从 2 选 1 |
| Boss 掉落 | Boss 关卡必出 1 个 |
| 商店 | 稀有商品，高价 |

具体附魔类型和效果待后续设计。

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

// 转化词条（源值定义见「转化词条 k 值校准表」）
// base=词内累积, score=关卡累积, multiplier=当前倍率,
// time=剩余秒数, gold=持有金币, fragment/mutagen=本关产出
if 转化: bonusPercent += k × getSourceValue(source)

// 永久成长类（跨关保留，run 结束重置）
if 成长: bonusPercent += growthAccumulated
if 精通: bonusPercent += masteryAccumulated
if 丰收: bonusPercent += harvestAccumulated
if 适应: bonusPercent += adaptAccumulated

// 条件加成类
if 虚无: bonusPercent += countEmptySlots(posRel) × bonusPerSlot
if 满溢: bonusPercent += countSaturatedFragments() × bonus
if 字母亲和: if queueContainsLetter(key) → bonusPercent += bonus
if 不稳定: if resource === randomStageBonusResource → bonusPercent += bonus

// 临时加成类
if 蓄力: bonusPercent += chargeAccumulated; chargeAccumulated = 0
if 增幅(来自邻居): bonusPercent += sumNeighborAmplifyStacks()

output = output × (1 + bonusPercent)
```

### Phase 3: 乘算层（独立相乘，来源稀少）

```
if 乘算: output ×= multiplier
if 暴击: if roll(chance) → output ×= critMult
if 脉冲: if triggerCount % interval === 0 → output ×= burstMult
if 衰减: output ×= currentDecayMult; currentDecayMult = max(floor, currentDecayMult - decayPerTrigger)
output ×= relicMultiplier  // 遗物系统
```

### Phase 4: 写入资源

```
applyToResource(resource, output)
recordStats(skillId, output)
showFeedback(output)
emitResourceSound(resource)
```

### Phase 5: 后触发效果

```
if 衍生: applyToResource(extraResource, output × ratio)
if 嗜变: if roll(chance) → applyToResource('mutagen', 1)
if 溅射: for each skill in posRel range → triggerSkill(skill, efficiency=1/count)
if 复制: pick 1 random skill in posRel range → triggerSkill(skill)
if 增幅: self.stacks += 1
if 吞噬: devourCount++; if devourCount >= interval → absorbWeakest(posRel)
if 精通: masteryTriggerCount++; if masteryTriggerCount >= interval → masteryAccumulated += growth
```

### Phase 6: 被动通知邻居

```
for each neighborSkill bound at neighborKey:
  // 成长: 邻居触发 → 自身永久成长（不触发技能）
  if neighbor has 成长 && hasRelation(triggerKey, neighborKey, posRel):
    neighbor.growthAccumulated += growthRate

  // 共鸣: 邻居触发 → 自身触发（减效）
  if neighbor has 共鸣 && hasRelation(triggerKey, neighborKey, posRel):
    triggerSkill(neighbor, neighborKey, { efficiencyMult: efficiency })

  // 连接: 邻居产出指定资源 → 自身触发
  if neighbor has 连接 && resource === linkResource && hasRelation(triggerKey, neighborKey, posRel):
    triggerSkill(neighbor, neighborKey)

eventBus.emit('skill:triggered', { key, skillId, resource, output })
```

---

## 六、触发方向总结

```
"别人触发 → 影响自己"（Phase 6 被动检查）
  共鸣: 邻居触发(任意) → 自身触发(减效)
  连接: 邻居产出(指定资源) → 自身触发
  成长: 邻居触发 → 自身永久成长(不触发)

"自己触发 → 影响别人"（Phase 5 后触发）
  溅射: 自身触发 → 全部邻居触发(均分效率)
  复制: 自身触发 → 1个随机邻居触发
  增幅: 自身触发 → 邻居获得层数加成
  吞噬: 自身触发 → 可能吃掉最弱邻居
```

---

## 七、数据结构

```typescript
// ===== 词条类型枚举 =====
enum AffixType {
  // 数值型
  Multiply = 'multiply',
  Convert = 'convert',
  // 节奏型
  Charge = 'charge',
  Decay = 'decay',
  Pulse = 'pulse',
  Crit = 'crit',
  // 键盘拓扑型
  Void = 'void',
  Growth = 'growth',
  Splash = 'splash',
  Resonance = 'resonance',
  Devour = 'devour',
  // 触发链型
  Link = 'link',
  Replicate = 'replicate',
  Amplify = 'amplify',
  // 资源交互型
  Transmute = 'transmute',
  Mastery = 'mastery',
  // 造词师
  Harvest = 'harvest',
  LetterAffinity = 'letter_affinity',
  Overflow = 'overflow',
  // 蜕变师
  Adapt = 'adapt',
  Unstable = 'unstable',
  MutationHunger = 'mutation_hunger',
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
  interval?: number                // Pulse/Mastery/Devour: 间隔次数
  burstMult?: number               // Pulse: 爆发乘数
  chance?: number                  // Crit/MutationHunger: 概率
  critMult?: number                // Crit: 暴击乘数
  posRel?: PositionRelation        // 所有键盘拓扑型 + 触发链型
  bonusPerSlot?: number            // Void: 每空位加成%
  growthRate?: number              // Growth/Mastery/Harvest/Adapt: 成长率%
  efficiency?: number              // Resonance: 触发效率%
  resource?: ResourceType          // Link/Amplify: 关联资源
  valuePerStack?: number           // Amplify: 每层加成%
  extraResource?: ResourceType     // Transmute: 额外资源类型
  ratio?: number                   // Transmute: 转化比率%
  bonus?: number                   // LetterAffinity/Overflow/Unstable: 条件加成%
}

// ===== 技能实例（一个完整的产出者） =====
interface SkillInstance {
  id: string                       // 运行时生成的唯一 ID
  name: string                     // 自动拼接的名字
  icon: string                     // 基底资源图标
  resource: ResourceType           // 产出资源类型
  baseValues: [number, number, number]  // Lv1/2/3 加算基础值
  level: number                    // 1-3
  rarity: 0 | 1 | 2 | 3           // 词条数量
  affixes: AffixInstance[]         // 0~3 个词条
}

// ===== 技能运行时状态（战斗中） =====
interface SkillRuntimeState {
  skillId: string
  // 蓄力
  chargeAccumulated: number        // 当前蓄力百分比
  // 衰减
  currentDecayMult: number         // 当前衰减乘数（每词重置）
  // 脉冲
  triggerCount: number             // 触发计数
  // 增幅
  amplifyStacks: number            // 当前增幅层数（每关重置）
  // 成长/精通/丰收/适应（跨关保留，run 结束重置）
  growthAccumulated: number        // 永久成长累积%
  masteryTriggerCount: number      // 精通触发计数
  // 吞噬
  devourCount: number              // 吞噬计数（每关重置）
  devourAbsorbed: number           // 已吞噬数量（跨关保留）
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
  if (r < 0.90) return 2  // 黄 20%
  return 3                 // 橙 10%
}
```

### 词条权重表

| 词条 | 权重 | 说明 |
|------|------|------|
| 乘算 | 4 | 稀有，控制乘算来源 |
| 转化（异源） | 10 | 常见，资源联动 |
| 转化（同源） | 3 | 稀有，等效指数增长 |
| 蓄力 | 6 | 中等 |
| 衰减 | 6 | 中等 |
| 脉冲 | 6 | 中等 |
| 暴击 | 8 | 常见，好理解 |
| 虚无 | 10 | 常见，鼓励布局思考 |
| 成长 | 5 | 中等，需邻居配合 |
| 溅射 | 3 | 稀有，范围强力 |
| 共鸣 | 4 | 较少，被动白嫖 |
| 吞噬 | 2 | 稀有，改变局面 |
| 连接 | 4 | 较少，资源条件触发 |
| 复制 | 3 | 稀有，链式强力 |
| 增幅 | 3 | 稀有，辅助型 |
| 衍生 | 6 | 中等，副产品 |
| 精通 | 5 | 中等，长期成长 |
| 丰收 | 3 | 造词师限定 |
| 字母亲和 | 3 | 造词师限定 |
| 满溢 | 3 | 造词师限定 |
| 适应 | 3 | 蜕变师限定 |
| 不稳定 | 3 | 蜕变师限定 |
| 嗜变 | 3 | 蜕变师限定 |

### 生成流程

```typescript
function generateSkill(classId?: string): SkillInstance {
  // 1. 随机基底资源
  const resource = pickRandom(AVAILABLE_RESOURCES)

  // 2. 掷稀有度
  const rarity = rollRarity()

  // 3. 构建词条池（过滤职业限定）
  const pool = buildAffixPool(classId)

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

function buildAffixPool(classId?: string): { type: AffixType, weight: number }[] {
  const pool = [...GENERAL_AFFIXES]  // 16 个通用词条
  if (classId === 'wordsmith') {
    pool.push(...WORDSMITH_AFFIXES)  // +3 造词师词条
  } else if (classId === 'metamorph') {
    pool.push(...METAMORPH_AFFIXES)  // +3 蜕变师词条
  }
  return pool
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

    case AffixType.Growth: {
      const posRel = pickRandom(ALL_POS_RELATIONS)
      return { type, posRel, growthRate: GROWTH_RATE_TABLE[posRel] }
    }

    case AffixType.Splash:
      return { type, posRel: pickRandom(ALL_POS_RELATIONS) }

    case AffixType.Resonance: {
      const posRel = pickRandom(ALL_POS_RELATIONS)
      return { type, posRel, efficiency: RESONANCE_EFFICIENCY_TABLE[posRel] }
    }

    case AffixType.Devour:
      return { type, posRel: pickRandom(ALL_POS_RELATIONS), interval: 5 }

    case AffixType.Link: {
      return { type, posRel: pickRandom(ALL_POS_RELATIONS), resource: pickRandom(ALL_RESOURCES) }
    }

    case AffixType.Replicate:
      return { type, posRel: pickRandom(ALL_POS_RELATIONS) }

    case AffixType.Amplify: {
      return { type, posRel: pickRandom(ALL_POS_RELATIONS), resource, valuePerStack: 0.02 }
    }

    case AffixType.Transmute: {
      // 可选任意资源（包括本技能资源 = 等效百分比增幅）
      const extra = pickRandom(ALL_RESOURCES)
      const ratio = extra === 'multiplier' ? 0.10 : extra === 'time' ? 0.20 : 0.30
      return { type, extraResource: extra, ratio }
    }

    case AffixType.Mastery:
      return { type, interval: 10, growthRate: 0.08 }

    case AffixType.Harvest:
      return { type, growthRate: 0.08 }

    case AffixType.LetterAffinity:
      return { type, bonus: 0.25 }

    case AffixType.Overflow:
      return { type, bonus: 0.20 }

    case AffixType.Adapt:
      return { type, growthRate: 0.15 }

    case AffixType.Unstable:
      return { type, bonus: 0.30 }

    case AffixType.MutationHunger:
      return { type, chance: 0.05 }
  }
}
```

---

## 九、自动命名

```
白(0词条): "基数" / "分数" / "倍率" ...
蓝(1词条): "暴击·基数"
黄(2词条): "暴击·蓄力·基数"
橙(3词条): "暴击·蓄力·虚无·基数"
```

```typescript
const AFFIX_NAMES: Record<AffixType, string> = {
  multiply: '强化', convert: '转化', charge: '蓄力',
  decay: '衰减', pulse: '脉冲', crit: '暴击',
  void: '虚无', growth: '成长', splash: '溅射',
  resonance: '共鸣', devour: '吞噬', link: '连接',
  replicate: '复制', amplify: '增幅', transmute: '衍生',
  mastery: '精通', harvest: '丰收', letter_affinity: '字母亲和',
  overflow: '满溢', adapt: '适应', unstable: '不稳定',
  mutation_hunger: '嗜变',
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
interface SkillSaveData {
  id: string
  resource: ResourceType
  level: number
  rarity: number
  affixes: AffixInstance[]          // 词条定义（不变）
  runtime: SkillRuntimeState       // 运行时状态
}
```

---

## 十一、状态生命周期

| 状态 | 作用域 | 重置时机 |
|------|-------|---------|
| chargeAccumulated | 实时 | 触发时清零 |
| currentDecayMult | 每词 | 每个新词重置为 initialMult |
| triggerCount (脉冲) | 每关 | 关卡结束重置 |
| amplifyStacks | 每关 | 关卡结束重置 |
| growthAccumulated | 跨关 | run 结束重置 |
| masteryTriggerCount | 跨关 | run 结束重置 |
| devourCount | 每关 | 关卡结束重置 |
| devourAbsorbed | 跨关 | run 结束重置 |

---

## 十二、组合数量统计

- 通用词条: 16 类
- 职业词条: 各 +3 类 = 19 类可用
- 橙装组合: C(16,3) = 560（通用），C(19,3) = 969（含职业）
- 每种组合的子参数变体（转化的源资源、虚无的位置关系等）再乘以数倍
- 运行时随机生成 → 每局每个商店位都是独特技能

---

## 十三、加算 vs 乘算分界线

| 加算层（叠加后 ×1 次） | 乘算层（各自独立 ×） |
|----------------------|-------------------|
| 转化 | 乘算 |
| 成长、精通、丰收、适应 | 暴击 |
| 虚无、满溢、字母亲和、不稳定 | 脉冲 |
| 蓄力 | 衰减 |
| 增幅(邻居层数) | 遗物(外部系统) |

一个橙装最多 3 词条。全乘算组合（乘算+暴击+脉冲）概率极低（权重 4×8×6 vs 总权重³），有效遏制数值膨胀。

---

_Last updated: 2026-03-10_
