# 词条制技能系统设计文档

_打字肉鸽 — 词条制技能系统_
_最后更新: 2026-04-04_

---

## 一、系统概述

每个技能 = 基底资源 + 0~3 个词条（由稀有度决定）。词条从 55 个类型中随机抽取，通过 6 阶段触发管线计算产出。

### 基底值（Lv1~Lv4）

| 资源 | Lv1 | Lv2 | Lv3 | Lv4 |
|------|-----|-----|-----|-----|
| base ⚔️ | 4 | 7 | 10 | 14 |
| score 🪙 | 11 | 18 | 27 | 38 |
| multiplier 🔥 | 0.35 | 0.56 | 0.84 | 1.17 |
| time ⏳ | 0.20 | 0.32 | 0.48 | 0.67 |
| gold 💰 | 3 | 5 | 8 | 11 |
| energy ⚡ | 1 | 1.6 | 2.4 | 3.4 |
| mutagen 🧬 | 1 | 1.6 | 2.4 | 3.4 |

### 稀有度

| 稀有度 | 词条数 | 形状 | 概率 |
|--------|:---:|------|:---:|
| 普通(白) | 0 | monomino | 40% |
| 稀有(蓝) | 1 | mono~domino | 30% |
| 史诗(紫) | 2 | +triomino | 20% |
| 传说(橙) | 3 | +tetromino | 10% |

---

## 二、六类词条体系

### 分类规则

每个词条可属于 1~3 个类别（双/三分类）。类别决定：
- 技能被哪些系统识别（如 `stack` 类被 Pulse 爆发触发）
- 商店 Act 权重过滤
- 遗物/附魔的类别条件判定

### 2.1 数值型 numeric（9 个纯数值 + 14 个副数值 = 23 覆盖）

直接影响 bonusPercent（加算层）或乘算层。

| 词条 | 分类 | 效果 | 升级参数 |
|------|------|------|---------|
| **Convert** | numeric | 读取源资源产出，按 k 加成 | k ×1.1 |
| **Rainbow** | numeric | 随机选择产出资源类型 | — |
| **Multiply** | numeric | 产出 ×N | multiplyValue +0.2 |
| **PhaseShift** | numeric | 追踪源资源累积，跨阈值跳升 | kGas +0.008 |
| **EndoExo** | numeric | 追踪源资源，超阈值爆发+消耗 | kExo +0.005 |
| **Fusion** | numeric | 追踪双资源，双达标爆发 | fusionK +0.005 |
| **Leverage** | numeric | 超阈值加成，低于扣减 | leverageK +0.02 |
| **Option** | numeric | 超阈值按超出量加成 | premium +0.02 |
| **Hedge** | numeric | 双资源接近度加成 | hedgeK +0.05 |

### 2.2 暴击型 crit（10 个纯暴击 + 6 个副暴击 = 16 覆盖）

共有机制：提供基础暴击率。暴击时产出 ×critMult（默认 2.0）。

| 词条 | 分类 | 暴击率来源 | 独有效果 | 升级参数 |
|------|------|-----------|---------|---------|
| **Crit** | crit | 15-40% | 质变：暴击倍率翻倍 | chance +5% |
| **Charge** | crit | 蓄力累积(上限50%) | 按住蓄满释放 | maxBonus +10% |
| **Decay** | crit | 初始40%→衰减 | 换词重置 | floor +2% |
| **Recurse** | crit | 8-20% | 暴击重触发(率减半) | recurseChance +3% |
| **Taboo** | crit | 60% | 未暴击负产出 | bonusPercent +8% |
| **Fallacy** | crit | 未暴击累积 | 暴击后重置 | fallacyK +2% |
| **Burst** | crit | 8% | 连暴次数×K倍率 | burstK +5% |
| **ZeroIn** | crit | 8% | 未暴击次数×K倍率 | zeroInK +5% |
| **Sharpshooter** | crit | 5% | (1-暴击率)×K倍率 | sharpK +30% |
| **Overflow** | crit, topology | 10% | 暴击时邻居叠层技能+N层 | overflowStacks +1 |

### 2.3 叠层型 stack（9 个纯叠层 + 4 个副叠层 = 13 覆盖）

共有机制：每次触发 +1 叠层。满层时触发叠层效果。

| 词条 | 分类 | 满层效果 | 升级参数 |
|------|------|---------|---------|
| **Pulse** | stack, topology | 触发范围内所有叠层技能+自身 | interval -1 |
| **Resonance** | stack, topology | 邻居触发也+1层，满层自触发 | resonanceCount -1 |
| **Splash** | stack, topology | 触发范围内1个匹配技能 | splashCount -1 |
| **Amplify** | stack, topology | 邻居产出+基础值×层数 | — (baseValues) |
| **Relay** | stack, topology | 邻居触发也+1层，满层触发1个匹配 | relayCount -1 |
| **WarDrum** | stack, topology, crit | 邻居暴击率+层数×K | critPerStack +0.005 |
| **Parity** | stack, crit, numeric | 奇层累积产出，偶层累积暴击率 | oddK +4% |
| **Prime** | stack, numeric | 素数层累积大额加成 | primeK +1% |
| **Match** | stack, topology, numeric | 邻居间叠层相同时+1层，满层自触发 | matchInterval -1 |

### 2.4 拓扑型 topology（5 个纯拓扑 + 20 个副拓扑 = 25 覆盖）

涉及键盘位置关系（posRel）。覆盖率最高的类别。

| 词条 | 分类 | 效果 | 升级参数 |
|------|------|------|---------|
| **Void** | topology, numeric | 空位越多+bonusPercent | bonusPerSlot +5% |
| **Mirror** | topology | 每关复制邻居1个词条 | — |
| **Cascade** | topology, numeric | 上一键关系命中→乘算 | cascadeMult +0.2 |
| **Flow** | topology, numeric | 邻居产出差→bonusPercent | flowK +2% |
| **Confluence** | topology, numeric | 邻居资源多样→bonusPercent | confluenceK +5% |
| **Turbulence** | topology, stack | 邻居差异→叠层，满层触发最弱邻居 | turbulenceInterval -1 |
| **Bridge** | topology, crit | 是桥→暴击率 | bridgeK +8% |
| **Clique** | topology, crit | 互连组大→暴击率 | cliqueK +3% |
| **Component** | topology, stack | 连通链→叠层，满层触发链远端 | componentInterval -1 |

### 2.5 词感型 word_sense（9 个，全部造词师专属）

分析单词结构，影响三个维度。

| 词条 | 分类 | 效果 | 升级参数 |
|------|------|------|---------|
| **Outcast** | word_sense, stack | 首尾字母叠层，满层触发词另一端键技能 | outcastInterval -1 |
| **Gravity** | word_sense | 调整含本键字母的出词概率 | probMult +0.15 |
| **Ligature** | word_sense, numeric | 重复字母→乘算 ×N×bonus | ligatureBonus +0.25 |
| **Cluster** | word_sense, stack | 辅音丛→叠层，满层触发元音键技能 | clusterInterval -2 |
| **Coverage** | word_sense, numeric | 字母种类→bonusPercent | coverageK +1% |
| **Bigram** | word_sense, crit | 罕见字母对→暴击率 | bigramK +10% |
| **Entropy** | word_sense, numeric | 字母均匀→bonusPercent | entropyK +2% |
| **Cipher** | word_sense, crit | 字母跳跃→暴击率 | cipherK +0.5% |
| **Pattern** | word_sense, numeric | 罕见模式→bonusPercent | patternK +1% |

### 2.6 元规则型 meta_rule（9 个）

改变其他系统规则。

| 词条 | 分类 | 效果 | 升级参数 |
|------|------|------|---------|
| **Conduit** | meta_rule, topology | 邻居匹配技能+1触发 | — |
| **Twin** | meta_rule | 双附魔（获得附魔时同时获得两个） | — |
| **Innate** | meta_rule | 每关开始自动触发N次 | innateCount +1 |
| **Counter** | meta_rule, topology, numeric | 消耗充能取消负面效果 | maxCharges +1 |
| **Exhaust** | meta_rule | 每次触发×倍率，限N次后消失 | exhaustMult +0.3 |
| **Ethereal** | meta_rule | 其他词条+1级，关卡结束消失 | — |
| **Decorator** | meta_rule, numeric | 放大同技能其他词条的加成 | decoratorK +5% |
| **Reflect** | meta_rule, numeric | 词条数×等级→bonusPercent | reflectK +1% |
| **MonkeyPatch** | meta_rule | 每关随机修改1个词条效果 | patchHigh +0.3 |

---

## 三、职业限制

| 职业 | 专属词条 | 主题 |
|------|---------|------|
| **造词师** (10) | Outcast, Gravity, Ligature, Cluster, Coverage, Bigram, Entropy, Cipher, Pattern, Cascade | 词感分析 + 精密控制 |
| **蜕变师** (7) | Rainbow, Twin, Mirror, Decorator, Reflect, MonkeyPatch, Ethereal | 随机变异 + 词条操控 |
| **无职业** (38) | 以上 17 个均不可用 | 通用词条池 |

---

## 四、跨系统桥梁

### 暴击→叠层
- **Overflow**：暴击时邻居叠层技能+N层（质变：全部邻居）
- **WarDrum**：叠层数→邻居暴击率

### 叠层→触发
- **Pulse**：满层触发范围内所有叠层技能（质变：转化非叠层为叠层）
- **Component**：满层触发链远端（质变：触发链上所有）
- **Turbulence**：满层触发最弱邻居（质变：触发所有邻居）
- **Cluster**：满层触发元音键技能
- **Outcast**：满层触发词另一端字母键技能

### 暴击↔拓扑
- **Bridge**：键盘拓扑→暴击率
- **Clique**：键盘拓扑→暴击率（质变：暴击在团内传染）

### 词感→暴击
- **Bigram**：罕见字母对→暴击率
- **Cipher**：字母跳跃→暴击率（质变：跳跃额外加暴击倍率）

---

## 五、触发管线

```
Phase 1: 基础值 = baseValues[level-1]
Phase 2: 加算层 — bonusPercent 累积，output × (1 + bonusPercent)
         叠层词条在此阶段累加 stacks 和检查满层
Phase 3: 乘算层 — 暴击判定、乘算词条、连字乘数
         暴击子系统：totalCritChance 汇总 → 概率判定 → critMult
Phase 4: 资源路由 — 确定产出到哪种资源
Phase 5: 后触发 — Pulse 爆发、Cluster/Outcast/Component/Turbulence 满层触发、
         Overflow 暴击溢层、Bridge 质变触发、暴击重触发(Recurse)
Phase 6: 邻居通知 — Resonance/Relay/WarDrum/Conduit/Amplify 邻居交互
```

### 通用叠层 +1

所有技能每次触发在 Phase 2→Phase 3 之间 `stacks += 1`。叠层类词条额外在 Phase 2 内累加条件性叠层。

---

## 六、分类覆盖率统计

| 类别 | 主分类 | 副分类 | 总覆盖 | 占比 |
|------|:---:|:---:|:---:|:---:|
| topology | 9 | +16 | **25** | 45% |
| numeric | 9 | +14 | **23** | 42% |
| crit | 10 | +6 | **16** | 29% |
| stack | 9 | +4 | **13** | 24% |
| word_sense | 9 | +0 | **9** | 16% |
| meta_rule | 9 | +0 | **9** | 16% |

30/55 (55%) 词条跨 2+ 类别。topology 和 numeric 是最大的连接器类别。

---

_本文档由代码状态自动生成，源码见 `src/src/data/affixes.ts` 和 `src/src/data/affixTrigger.ts`。_
