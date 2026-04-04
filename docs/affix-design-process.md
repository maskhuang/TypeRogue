# 词条设计流程

本文档总结 Epic 45（13 新词条）的设计方法论，供未来词条扩展复用。

---

## 流程总览

```
1. 分类盘点 → 2. 领域选择 → 3. 核心映射 → 4. 概念迁移 → 5. 共享机制检查
→ 6. 参数校准 → 7. 实现 → 8. 描述对齐 → 9. 预估产出 → 10. 交互验证
```

---

## 步骤 1：分类盘点

**目标：** 识别数量不均的类别，确定扩展方向。

- 统计每个 `AffixCategory` 的词条数量
- 按描述中的关键字重新审视分类归属（如「暴击率」→ crit，「叠层」→ stack）
- 确定需要补充的类别和目标数量

**输出：** 分类现状表 + 缺口

---

## 步骤 2：领域选择

**目标：** 为每个待补充类别选择一个灵感领域。

**原则：**
- 一个类别选一个领域（不分散）
- 领域应能提供 **3+ 个可区分的概念**
- 领域概念应有清晰的游戏映射
- **领域的核心变量类型应匹配类别的运行时变量类型**（如叠层是离散整数 → 优先选天然操作离散量的领域）

**各类别推荐领域矩阵：**

| 类别 | 范式 | 变量类型 | 已验证领域 | 备选领域 |
|------|------|---------|-----------|---------|
| 数值 | `read(resource) → f(value) → bonusPercent [+ consume]` | 连续 | 热力学 | 核物理、金融、流体力学 |
| 拓扑 | `scan(posRel, neighbors) → 统计运算 → bonusPercent` | 离散(邻居数) | 流体力学 | 电路学、细胞自动机、生态学 |
| 词感 | `analyze(word) → f(feature) → bonusPercent` | 离散(字符数) | 语言学 | 密码学、音乐理论 |
| 元规则 | `在生命周期节点插入修改` | 事件 | 卡牌游戏 | 元编程、博弈论 |
| 暴击 | `modify(critChance) → onCrit/onMiss` | 连续(概率) | 赌博(Fallacy) | 量子力学、精密射击 |
| 叠层 | `accumulate → threshold → release` | **离散(整数计数器)** | — | 组合数学、数论、细胞自动机、遗传学、库存管理 |

**方法：**
1. 列出候选领域（每类别 5~10 个）
2. 对每个领域做 web research 了解具体概念
3. 评估映射清晰度和游戏性
4. 选定一个

---

## 步骤 3：核心映射

**目标：** 建立领域变量到游戏变量的单一映射。

**原则：**
- 映射应该是 **一个变量**，不是一套系统
- 同类别所有新词条共享同一个映射变量
- 不同词条 = 对同一变量的不同 f() 函数

**已验证映射：**

| 类别 | 领域 | 映射 |
|------|------|------|
| 数值 | 热力学 | 资源本关累积产出 → 温度 |
| 拓扑 | 流体力学 | 邻居 BASE_VALUES → 水位/压力 |
| 词感 | 语言学 | 当前单词 → 可量化语言特征 |
| 元规则 | 卡牌游戏 | 词条生命周期节点 → 关键词修改点 |

---

## 步骤 4：概念迁移

**目标：** 从领域中导出 2~4 个具体词条设计。

**方法：**
1. 列出领域的核心概念（web research）
2. 对每个概念建立游戏机制映射
3. 评估游戏性（独特性 × 可行性 × 体验）
4. 确保同批词条的 f() 函数有体感区分

**f() 形状区分标准：**

| 形状 | 体感 | 示例 |
|------|------|------|
| 线性 | 平滑增长 | Convert |
| 阶梯 | 突变感 | PhaseShift |
| 方波 | 节奏感 | EndoExo |
| 与门 | 条件感 | Fusion |
| 差值 | 对比感 | Flow |
| 计数 | 积累感 | Confluence |
| 离散度 | 混沌感 | Turbulence |

---

## 步骤 5：共享机制检查

**目标：** 确保新词条接入现有共享机制，不造孤岛。

**铁律：**
- ❌ 禁止创建只有自己使用的私有 runtime 状态
- ✅ 必须读或写至少一个共享机制

**可用共享机制清单：**

| 机制 | 读 | 写 | 使用者 |
|------|---|---|--------|
| bonusPercent | — | Phase 2 加算 | 所有产出型词条 |
| stacks | 叠层计数 | 叠层+1 | 所有叠层型 |
| 暴击系统 | critChance | 修改暴击率 | 所有暴击型 |
| posRel | 位置关系 | — | 所有拓扑型 |
| getAffixSourceValue | 资源池值 | — | Convert 等 |
| getStageProducedValue | 本关累积产出 | — | PhaseShift/EndoExo/Fusion |
| consumeRequests | — | 延迟消耗 | 消耗型词条 |
| currentWord | 当前单词 | — | 所有词感型 |
| HAND_MAP | 左右手 | — | 手交替相关 |
| BASE_VALUES | 基底值 | — | 归一化用 |
| BIGRAM_FREQ_TABLE | bigram 频率 | — | Bigram |
| skill.affixes | 词条列表 | removeAffixAtRuntime | Exhaust/Ethereal |
| applyAffixLevelScaling | 词条参数 | +/-级缩放 | Ethereal |
| critStreak | 连续暴击数 | 暴击+1/miss归零 | Burst |
| missStreak | 连续miss数 | miss+1/暴击归零 | ZeroIn |
| effectiveCritChance | 当前暴击率 | — | Sharpshooter |
| getPatternRarity | 模式稀有度 | — | Pattern |

**检查项：**
- [ ] 新词条读哪个共享机制？
- [ ] 新词条写哪个共享机制？
- [ ] 和现有词条有哪些涌现交互？
- [ ] 是否需要新的共享基础设施？（如 consume）

---

## 步骤 6：参数校准

**目标：** 确保 K 值量级和现有词条一致。

### 6.1 bonusPercent 量级

`bonusPercent` 是 **小数制**（0.25 = +25%）。

**基准参考：**

| 词条 | 典型 bonusPercent | 条件 |
|------|------------------|------|
| Void | +25% | 3 空位 × 0.08/位 |
| Convert | +100~200% | 读资源值 ×k ×norm |
| Outcast | +15% | 首尾字母命中 |

新词条应落入此范围。如果 K 值乘以典型输入超过 +300%，需要降低。

### 6.2 跨资源归一化

**阈值归一化：** `threshold = N × BASE_VALUES[source][0]`

| 参数类型 | 归一化方式 | 含义 |
|---------|-----------|------|
| 阈值 | N × srcBase | 约 N 次标准触发到阈值 |
| 消耗量 | M × srcBase | 每次消耗约 M 次触发的产出 |
| K 值 | 不归一化 | K 本身就是系数 |

**资源量级参考（Lv1）：**

| 资源 | BASE_VALUES[0] | 典型池量 |
|------|---------------|---------|
| base | 5 | 0~500 |
| score | 15 | 0~2000 |
| multiplier | 0.2 | 1.0~3.0 |
| time | 0.2 | 0~30（秒） |
| gold | 3 | 0~200 |

### 6.3 Phase 1 乘数 vs Phase 2/3

- Exhaust/Ethereal 的 Phase 1 `effectiveBase *=` 和 Multiply 的效果数学上等价
- 但 Phase 1 乘数会被后续所有加成放大
- 限次/限时词条的乘数应高于永久词条（溢价补偿）

---

## 步骤 7：实现

**文件变更清单（每个新词条）：**

| 文件 | 改动 |
|------|------|
| `data/affixes.ts` | AffixType 枚举 + AFFIX_CATEGORY_MAP + AFFIX_NAMES + AFFIX_DESCRIPTIONS + AFFIX_WEIGHT_TIERS + AffixInstance 参数 |
| `data/affixTrigger.ts` | Phase 2 switch case（或其他阶段） |
| `data/skillGeneration.ts` | rollAffixParams switch case + 参数范围 |
| `systems/shop.ts` | buildAffixParamSummary + computeSmartEstimate |
| `ui/keyboard/KeyTooltip.ts` | AFFIX_COLORS |
| `demo/demo-i18n.ts` | affix.xxx + affix_desc.xxx（中英文） |
| `tests/unit/data/affixes.test.ts` | 枚举数量 + 分类分布 |
| 新建测试文件 | 词条核心逻辑测试 |

**Phase 2 实现模式：**
```typescript
case AffixType.NewAffix: {
  // 1. null check
  if (affix.someParam == null) break
  // 2. 读取输入
  const val = getStageProducedValue(affix.source, ctx)  // 或 ctx.currentWord 等
  // 3. 归一化
  const norm = (BASE_VALUES[skill.resource]?.[lvl] ?? 1) / (BASE_VALUES[affix.source]?.[lvl] ?? 1)
  // 4. 计算 bonusPercent
  bonusPercent += (affix.newK ?? 0) * val * norm
  // 5. 可选：consume
  consumeRequests.push({ resource: affix.source, amount: affix.consumeAmt ?? 0 })
  break
}
```

---

## 步骤 8：描述对齐

**检查三处描述一致：**

| 位置 | 用途 |
|------|------|
| `affixes.ts` AFFIX_DESCRIPTIONS | 代码内参考 |
| `demo-i18n.ts` 中文 affix_desc | tooltip 显示 |
| `demo-i18n.ts` 英文 affix_desc | 英文 tooltip |

**描述规范：**
- 不使用「范围内」→ 使用「指定关系的」（运行时替换为具体关系名）
- 不使用比喻性括号注释（如「水往低处流」）
- 叠层型统一使用「叠层」术语
- 消耗/限时词条注明消失条件

---

## 步骤 9：预估产出

**按词条类型选择预估策略：**

| 数据依赖 | 预估策略 | 示例 |
|---------|---------|------|
| 键盘布局（已绑定） | 读当前邻居实时计算 | Flow/Confluence/Turbulence/Void |
| 当前单词（按绑定字母） | 过滤词库计算平均 | Cluster/Coverage/Bigram |
| 资源实时值 | 不预估 | PhaseShift/EndoExo/Fusion |
| 固定乘数 | 直接显示 | Exhaust/Multiply |
| 规则修改 | 定性描述 | Ethereal/Innate/Counter |

**词库过滤预估（词感型）：**
```typescript
// 按技能绑定的字母过滤词库，计算平均特征值
const filtered = deck.filter(w => w.includes(boundKey))
const avg = computeAvgFeature(filtered)
```

**estimatedTypes 动态化：**
```typescript
// 从 smartEstimate.breakdown 提取已预估的词条类型，避免在 affixInfo 中重复
const estimatedTypes = new Set(estimate.breakdown.map(b => b.typeKey).filter(k => k !== 'base'))
```

---

## 步骤 10：交互验证

**检查清单：**

- [ ] null triggerKey 安全性（Innate 自动触发场景）
- [ ] 词条消耗后的商店升级排除
- [ ] 消耗/限时词条升级时的状态重置
- [ ] 跨类别涌现交互是否合理（如 Ethereal+Exhaust = 白赚+1 级）
- [ ] K 值在极端资源值下不爆炸（late game score=500+）
- [ ] 存档兼容（SkillRuntimeState 新字段有默认值）
- [ ] TypeScript exhaustive switch 编译通过

---

## 步骤 11：质变设计

**目标：** 为词条设计质变（Quest Transform）效果——通过装备足够多同类型技能解锁的永久强化。

### 11.1 质变设计模式库

从 20 个已有质变中提炼出 8 种可复用的设计模式：

| 模式 | 描述 | 本质 | 使用次数 | 代表 |
|------|------|------|---------|------|
| **范围扩大** | 影响 1 个目标 → 影响全部 | 移除数量限制 | 5 | Pulse→回响, Relay→中继, Mirror→映射 |
| **条件移除** | 概率判定 → 确定性触发 | 移除不确定性 | 3 | Crit→过载, Gravity→极化 |
| **条件放宽** | 限制性条件变宽松 | 降低触发门槛 | 2 | Cascade→连锁(双向), Recurse→迭代(不衰减) |
| **极性反转** | 效果方向翻转 | 弱点变优势 | 2 | Decay→净化, Taboo→献祭 |
| **触发新增** | 被动词条获得主动触发能力 | 增加触发链 | 2 | Amplify→层叠, Outcast→蓄势 |
| **时间窗口扩大** | 单词内 → 全关 / 瞬时 → 持续 | 移除时间限制 | 1 | Ligature→重叠 |
| **方向扩展** | 单向操作 → 双向操作 | 增加维度 | 1 | Convert→精炼 |
| **机制转换** | 改变运算方式（加→乘） | 质的改变 | 1 | Multiply→乘算化 |
| **数值提升** | 简单数字翻倍 | 量的改变 | 2 | Twin→镜像, Conduit→导引 |

### 11.2 质变设计流程

```
1. 识别词条的「限制因子」
   问：什么限制了这个词条发挥最大价值？
   常见限制因子：
   - 范围（只影响 1 个 / 只读邻居 / 只读自身）
   - 条件（概率触发 / 需要特定状态 / 单向判定）
   - 时间（只在当前单词 / 只在当前关）
   - 极性（有负面效果 / 有惩罚）
   - 数值（固定值 / 线性增长）

2. 从模式库中选择匹配的质变模式
   优先级：范围扩大 > 条件移除/放宽 > 极性反转 > 触发新增 > 数值提升
   原则：质变应该是「质的改变」而非「量的改变」
   - ✅ 好的质变：改变词条的行为方式或触发逻辑
   - ❌ 差的质变：只是把 K 值翻倍

3. 设计具体效果
   - 效果应该一句话能说清
   - 应该改变玩家的使用策略（不只是数字更大）
   - 与原始效果有清晰的「之前→之后」对比

4. 验证平衡性
   - 质变通过 getQuestEquipTarget 控制解锁难度（需装备 N 个同类型技能）
   - 高权重词条(6-10) → 需要 2-3 格
   - 低权重词条(1-4) → 需要 1 格
   - 质变后效果不应让其他词条变得完全无用

5. 验证实现复杂度
   - 质变逻辑通过 isTransformedForAffix() 检查
   - 在现有 Phase 代码中用 if 分支实现
   - 不应需要新的共享基础设施
```

### 11.3 质变效果验证检查清单

- [ ] 质变前后有体感区分（不只是数字变化）
- [ ] 质变描述一句话能说清
- [ ] 质变不与其他词条的质变效果重复
- [ ] 质变不破坏现有词条交互（不让某个组合变成必选）
- [ ] 质变逻辑可在现有 Phase 代码中实现（无需新基础设施）
- [ ] 质变后的极端场景不爆炸（late game 验证）

### 11.4 已设计质变（Epic 46-49）

| 词条 | 质变名 | 模式 | 效果 | 体感变化 |
|------|--------|------|------|---------|
| Parity | 合一 | 条件移除 | 奇偶同时生效（+产出 AND +暴击率） | 交替节奏 → 双重加成 |
| Prime | 近似 | 条件放宽 | 非素数也有 primeK×1 固定小额加成 | 有无 → 大小 |
| Match | 入局 | 范围扩大 | 自身叠层也参与配对计算 | 旁观邻居 → 加入配对 |
| Entropy | 铭记 | 时间窗口扩大 | 使用本关遇到的最高熵值（只涨不跌） | 逐词计算 → 锁定最佳 |
| Cipher | 跃迁 | 条件放宽 | 字母距离超过 13 的对额外翻倍 | 线性均值 → 大跳跃有奖 |
| Pattern | 破格 | 条件放宽 | 未知模式（不在词库）bonus 翻倍 | 常见vs罕见 → 越离谱越强 |
| Leverage | 保险 | 惩罚移除 | 负 excess 保底为 0（不再亏损） | 高风险高回报 → 只有回报 |
| Option | 加杠 | 数值提升 | 行权后 optionK 翻倍（权利金不变） | 以小博大 → 以小博超大 |
| Hedge | 全衡 | 范围扩大 | 自动从所有可读资源中选最均衡的一对 | 绑定两种 → 自动最优 |
| Burst | 余焰 | 条件放宽 | miss 时连击减半（向下取整）而非归零 | 一断全没 → 保留余焰 |
| Zero-In | 瞄具 | 触发新增 | miss 时也获得半额 bonusPercent（产出） | 纯等待 → miss 也有补偿 |
| Sharpshooter | 直觉 | 条件放宽 | (1-critChance) 最低值改为 0.3 | 高暴击率废弃 → 任何暴击率都有用 |

### 11.5 已设计质变（旧词条 + Epic 45）

**旧词条：**

| 词条 | 质变名 | 模式 | 效果 | 体感变化 |
|------|--------|------|------|---------|
| Resonance | 共振 | 方向扩展 | 自触发时也给触发源邻居+1叠层 | 单向接收 → 双向回馈 |
| WarDrum | 战号 | 触发新增 | 邻居暴击时WarDrum获得额外+2叠层 | 单向支援 → 正反馈循环 |
| Fallacy | 豪赌 | 条件放宽 | 暴击时不归零改为减半（向下取整） | 大起大落 → 持续中高暴击 |

**Epic 45 数值型：**

| 词条 | 质变名 | 模式 | 效果 | 体感变化 |
|------|--------|------|------|---------|
| PhaseShift | 超临界 | 条件移除 | 气态时额外叠加液态和固态K值（三态叠加） | 阶梯替代 → 三层全开 |
| EndoExo | 永动 | 触发新增 | 连续3次放热后进入超导态：下次翻倍且不消耗 | 被动振荡 → 节奏爆发 |
| Fusion | 恒星 | 条件放宽 | 成功聚变后阈值永久降10%（可叠加，最低50%） | 独立判定 → 越聚越容易 |

**Epic 45 元规则型：**

| 词条 | 质变名 | 模式 | 效果 | 体感变化 |
|------|--------|------|------|---------|
| Innate | 觉醒 | 范围扩大 | 每打完一个单词时也自动触发一次 | 单次开场 → 每词自动触发 |
| Counter | 反噬 | 极性反转 | 反制时将负值绝对值作为bonus加到下次触发 | 防御归零 → 攻击转化 |
| Exhaust | 燃尽 | 触发新增 | 最后一次触发时bonus额外×3 | 线性消耗 → 终结技 |
| Ethereal | 永恒 | 条件放宽 | 消失时50%概率保留到下一关（每关重判） | 确定消失 → 概率续命 |

**Epic 45 词感型：**

| 词条 | 质变名 | 模式 | 效果 | 体感变化 |
|------|--------|------|------|---------|
| Cluster | 塞音 | 范围扩大 | 统计所有辅音丛长度之和（非只看最长） | 最大值 → 总和 |
| Coverage | 全谱 | 条件放宽 | Q/X/Z/J等稀有字母额外×2覆盖度计数 | 平等计数 → 稀有加权 |
| Bigram | 密码 | 条件放宽 | 只取罕见度前50%的字母对计算平均 | 全局平均 → 去掉短板 |

**Epic 45 拓扑型：**

| 词条 | 质变名 | 模式 | 效果 | 体感变化 |
|------|--------|------|------|---------|
| Flow | 瀑布 | 条件移除 | 双向计算——邻居比自己低时也加bonus | 单向高→低 → 双向差值 |
| Confluence | 洪流 | 触发新增 | 每种独特资源额外产出到该资源+1% | 测量多样性 → 分流产出 |
| Turbulence | 风暴 | 范围扩大 | 额外读取邻居stacks差异（base极差+stacks极差） | 静态 → 动态+静态双源 |

---

## 附录：已验证领域→词条映射

| 领域 | 概念 | 词条 | f() 形状 |
|------|------|------|---------|
| 热力学·相变 | 温度阈值突变 | PhaseShift | 阶梯 |
| 热力学·吸放热 | 吸收/释放振荡 | EndoExo | 方波 |
| 热力学·聚变 | 双条件点火 | Fusion | 与门 |
| 流体力学·落差 | 高处流向低处 | Flow | 差值 |
| 流体力学·汇流 | 多源汇聚 | Confluence | 计数 |
| 流体力学·湍流 | 雷诺数/混沌 | Turbulence | 离散度 |
| 语言学·辅音丛 | 连续辅音段 | Cluster | 最大值 |
| 语言学·覆盖度 | 字母多样性 | Coverage | 去重计数 |
| 语言学·双字组 | bigram 频率 | Bigram | 平均罕见度 |
| 卡牌·先天 | Innate/Battlecry | Innate | 生命周期·开始 |
| 卡牌·反制 | Counter | Counter | 生命周期·负值 |
| 卡牌·消耗 | Exhaust | Exhaust | 生命周期·N 次 |
| 卡牌·虚无 | Ethereal | Ethereal | 生命周期·1 关 |
| 组合数学·奇偶 | n%2 交替效果 | Parity | 交替方波 |
| 组合数学·素数 | isPrime(n) 窗口触发 | Prime | 不规则脉冲 |
| 组合数学·配对 | 邻居叠层相等配对数 | Match | 离散阶梯 |
| 密码学·熵 | Shannon 熵 H(word) | Entropy | 连续平滑 |
| 密码学·距离 | 相邻字母表距离均值 | Cipher | 连续平滑 |
| 密码学·模式 | 模式签名稀有度 -log₂(freq) | Pattern | 对数曲线 |
| 金融工程·杠杆 | excess × k（保证金线） | Leverage | 线性过零点 |
| 金融工程·期权 | hockey stick（行权价+权利金） | Option | 折线 |
| ��融工程·对冲 | 双资��� min/max 比值 | Hedge | 倒 V 型 |
| 精密射击·连射 | critStreak × k → critMult | Burst | 线性+断裂 |
| 精密射击·校准 | missStreak × k → critMult(释放) | Zero-In | 阶梯+释放 |
| 精密射击·神射 | (1-critChance) × k → critMult | Sharpshooter | 反比例 |
| 图论·桥 | 移除后邻居断裂 → bonus | Bridge | 二值 |
| 图论·团 | 最大全连接子集大小 → bonus | Clique | 离散阶梯 |
| 图论·连通 | BFS 连通分量大小 → bonus | Component | 线性 |
| 元编程·装饰器 | bonusPercent × (1+k) Phase 2 末尾 | Decorator | 乘法放大 |
| 元编程·反射 | affixCount × level × k → bonus | Reflect | 离散阶梯 |
| 元编程·猴子补丁 | target.bonus × randomMult 每关随机 | MonkeyPatch | 随机修改 |
