# 词条设计流程

本文档总结词条设计方法论，供未来词条扩展复用。
_最后更新: 2026-04-04_

---

## 流程总览

```
1. 分类盘点 → 2. 领域选择 → 3. 核心映射 → 4. 概念迁移 → 5. 共享机制检查
→ 6. 参数校准 → 7. 实现 → 8. 描述对齐 → 9. 预估产出 → 10. 交互验证
→ 11. 质变设计
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

| 类别 | 范式 | 变量类型 | 已验证领域 | 覆盖率 |
|------|------|---------|-----------|:---:|
| 数值 | `f(value) → bonusPercent / 乘算` | 连续 | 热力学、金融工程 | 42% |
| 拓扑 | `scan(posRel, neighbors) → 效果` | 离散(邻居) | 流体力学、图论 | **45%** |
| 暴击 | `modify(critChance) → onCrit` | 概率 | 精密射击 | 29% |
| 叠层 | `accumulate → threshold → trigger` | 整数 | 组合数学 | 24% |
| 词感 | `analyze(word) → 效果` | 字符 | 语言学、密码学 | 16% |
| 元规则 | `在生命周期节点插入修改` | 事件 | 卡牌、元编程 | 16% |

**注意：** 类别现在支持双/三分类。新词条应考虑是否涉及多个类别（如有 posRel → 加 topology，影响 bonusPercent → 加 numeric）。

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
| bonusPercent | — | Phase 2 加算 | 所有 numeric 副分类词条 |
| stacks | 叠层计数 | 叠层+1 | 所有 stack 副分类词条 |
| totalCritChance | 暴击率池 | 暴击率累加 | 所有 crit 副分类词条 |
| posRel | 位置关系 | — | 所有 topology 副分类词条 |
| getAffixSourceValue | 资源池值 | — | Convert/PhaseShift/EndoExo 等 |
| getStageProducedValue | 本关累积产出 | — | PhaseShift/EndoExo/Fusion/Leverage/Option/Hedge |
| consumeRequests | — | 延迟消耗 | PhaseShift/EndoExo/Fusion |
| currentWord | 当前单词 | — | 所有 word_sense 词条 |
| VOWELS | 元音字母集 | — | Cluster（触发元音键） |
| isFirstOrLastLetter | 首尾判定 | — | Outcast |
| HAND_MAP | 左右手 | — | 手交替相关 |
| BASE_VALUES | 基底值 | — | 归一化用 |
| BIGRAM_FREQ_TABLE | bigram 频率 | — | Bigram |
| skill.affixes | 词条列表 | removeAffixAtRuntime | Exhaust/Ethereal |
| applyAffixLevelScaling | 词条参数 | +/-级缩放 | Ethereal |
| critStreak | 连续暴击数 | 暴击+1/miss归零 | Burst |
| missStreak | 连续miss数 | miss+1/暴击归零 | ZeroIn |
| effectiveCritChance | 当前暴击率 | — | Sharpshooter/Cipher质变 |
| guaranteedCrit | 必暴击标记 | Clique质变写入 | Phase 3 消耗 |
| convertedToStacking | 叠层化标记 | Pulse质变写入 | isStackingSkill 读取 |
| getPatternRarity | 模式稀有度 | — | Pattern |
| bfsComponentSize | 连通分量大小 | — | Component |
| findMaxClique | 最大团大小 | — | Clique |
| areConnectedWithout | 桥判定 | — | Bridge |

**双分类检查项（新增）：**
- [ ] 新词条有 posRel → 加 `topology`
- [ ] 新词条写 bonusPercent / 乘算 → 加 `numeric`
- [ ] 新词条写 totalCritChance → 加 `crit`
- [ ] 新词条写 stacks → 加 `stack`
- [ ] 新词条修改词条本身（复制/删除/替换/缩放词条参数）→ 加 `meta_rule`
- [ ] 新词条读取当前单词结构（字母组合/频率/模式等）→ 加 `word_sense`
- [ ] 新词条读取资源产出值（getAffixSourceValue/getStageProducedValue）→ 加 `production`

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

### 11.4 全部质变一览

**暴击型：**

| 词条 | 质变名 | 模式 | 效果 |
|------|--------|------|------|
| Crit | 过载 | 数值提升 | 暴击倍率翻倍（×2→×4） |
| Charge | 蓄势 | 触发新增 | 满蓄力释放自动完成当前单词 |
| Decay | 净化 | 极性反转 | 衰减逆转为递增（无上限） |
| Recurse | 迭代 | 条件放宽 | 暴击率不减半 |
| Taboo | 献祭 | 极性反转 | 未暴击惩罚转化为随机资源产出 |
| Fallacy | 豪赌 | 条件放宽 | 暴击时不归零改为减半 |
| Burst | 弹幕 | 触发新增 | 3连击时溅射邻居 |
| ZeroIn | 蓄能 | 机制转换 | 暴击时missStreak转化为stacks |
| Sharpshooter | 狙击 | 范围扩大 | 加成同时作为bonusPercent和critMult |
| Overflow | 洪流 | 范围扩大 | 暴击时范围内全部叠层技能+N层（而非1个） |

**叠层型：**

| 词条 | 质变名 | 模式 | 效果 |
|------|--------|------|------|
| Pulse | 叠层同化 | 机制转换 | 爆发时将范围内1个非叠层技能转化为叠层类（每关重置） |
| Resonance | 共振 | 方向扩展 | 自触发时也给触发源邻居+1叠层 |
| Splash | 涌潮 | 范围扩大 | 触发所有匹配技能（而非1个） |
| Amplify | 层叠 | 触发新增 | 层数增加时触发匹配技能 |
| Relay | 中继 | 范围扩大 | 触发所有匹配技能（而非1个） |
| WarDrum | 战号 | 触发新增 | 邻居暴击时+2叠层 |
| Parity | 相变 | 条件移除 | 奇数叠层时额外自触发一次 |
| Prime | 近似 | 条件放宽 | 非素数也有 primeK×1 固定小额累积 |
| Match | 入局 | 范围扩大 | 自身stacks也参与配对判定 |

**拓扑型：**

| 词条 | 质变名 | 模式 | 效果 |
|------|--------|------|------|
| Void | 吞噬 | 触发新增 | 每次触发寻找最弱邻居吞噬（解绑→增加空位） |
| Mirror | 映射 | 范围扩大 | 复制所有邻居词条（而非1个） |
| Cascade | 连锁 | 条件放宽 | 双向都算连锁（正向OR反向） |
| Flow | 瀑布 | 条件移除 | 邻居比自己低时也加bonus |
| Confluence | 洪流 | 触发新增 | 每种独特资源额外产出到该资源 |
| Turbulence | 风暴 | 范围扩大 | 满层时触发所有邻居（而非仅最弱） |
| Bridge | 枢纽 | 触发新增 | 是桥时触发断裂两侧各一个邻居 |
| Clique | 传染 | 触发新增 | 暴击时团内所有成员下次必暴击 |
| Component | 脉冲链 | 范围扩大 | 满层时触发链上所有技能（而非仅最远端） |

**词感型：**

| 词条 | 质变名 | 模式 | 效果 |
|------|--------|------|------|
| Outcast | 即时呼应 | 条件移除 | 每次首尾命中直接触发另一端（无需满层） |
| Gravity | 极化 | 条件移除 | 概率修改从×N变为确定（>1=必出, <1=不出） |
| Ligature | 重叠 | 时间窗口 | 使用关卡累计按键次数（而非当前单词） |
| Cluster | 塞音 | 范围扩大 | 统计所有辅音丛之和（而非只看最长） |
| Coverage | 全谱 | 条件放宽 | Q/X/Z/J稀有字母额外×2覆盖度 |
| Bigram | 密码 | 条件放宽 | 只取罕见度前50%字母对 |
| Entropy | 熵增 | 时间窗口 | 当前熵高于上一个单词时bonus翻倍 |
| Cipher | 破译 | 跨维度 | 暴击时最大字母跳跃距离加到暴击倍率 |
| Pattern | 编码 | 资源路由 | 模式签名决定产出资源类型 |

**数值型：**

| 词条 | 质变名 | 模式 | 效果 |
|------|--------|------|------|
| Convert | 精炼 | 方向扩展 | 双向转化（同时反向产出到源资源） |
| Multiply | 乘算化 | 机制转换 | 基础值替换为乘数基底 |
| PhaseShift | 超临界 | 条件移除 | 气态时三态K值叠加 |
| EndoExo | 永动 | 触发新增 | 连续3次放热→超导态（翻倍且不消耗） |
| Fusion | 恒星 | 条件放宽 | 成功聚变后阈值永久降10% |
| Leverage | 保险 | 惩罚移除 | 负excess保底为0 |
| Option | 加杠 | 数值提升 | 行权后optionK翻倍 |
| Hedge | 全衡 | 范围扩大 | 自动选最均衡的一对资源 |

**元规则型：**

| 词条 | 质变名 | 模式 | 效果 |
|------|--------|------|------|
| Conduit | 导引 | 数值提升 | 额外触发次数+1 |
| Twin | 镜像 | 数值提升 | — |
| Innate | 觉醒 | 数值提升 | 自动触发次数×3 |
| Counter | 反噬 | 极性反转 | 反制吸收的负值作为下次bonus |
| Exhaust | 燃尽 | 触发新增 | 最后一次触发×3 |
| Ethereal | 永恒 | 条件放宽 | 50%概率保留到下一关 |
| Decorator | 编译 | 条件放宽 | 每多一个同技能词条+decoratorK |
| Reflect | 内省 | 范围扩大 | reflectScore作为全词条增幅 |
| MonkeyPatch | 热更新 | 范围扩大 | patch所有词条（倍率缩为×0.8~1.5） |

---

## 附录：已验证领域→词条映射

| 领域 | 概念 | 词条 | 效果维度 |
|------|------|------|---------|
| 精密射击·溢层 | 暴击→叠层桥梁 | Overflow | **邻居+N叠层** |
| 热力学·相变 | 温度阈值突变 | PhaseShift | bonusPercent(阶梯) |
| 热力学·吸放热 | 吸收/释放振荡 | EndoExo | bonusPercent(方波) |
| 热力学·聚变 | 双条件点火 | Fusion | bonusPercent(与门) |
| 流体力学·落差 | 高处流向低处 | Flow | bonusPercent |
| 流体力学·汇流 | 多源汇聚 | Confluence | bonusPercent |
| 流体力学·湍流 | 雷诺数/混沌 | Turbulence | **叠层→触发最弱邻居** |
| 语言学·辅音丛 | 连续辅音段 | Cluster | **叠层→触发元音键** |
| 语言学·覆盖度 | 字母多样性 | Coverage | bonusPercent |
| 语言学·双字组 | bigram 频率 | Bigram | **暴击率** |
| 语言学·流放 | 首/尾字母 | Outcast | **叠层→触发词另一端** |
| 卡牌·先天 | Innate/Battlecry | Innate | 生命周期·开始 |
| 卡牌·反制 | Counter | Counter | 生命周期·负值 |
| 卡牌·消耗 | Exhaust | Exhaust | 生命周期·N 次 |
| 卡牌·虚无 | Ethereal | Ethereal | 生命周期·1 关 |
| 组合数学·奇偶 | n%2 交替效果 | Parity | **累积bonusPercent+暴击率** |
| 组合数学·素数 | isPrime(n) 窗口触发 | Prime | **累积bonusPercent** |
| 组合数学·配对 | 邻居叠层相等 | Match | **叠层+bonusPercent** |
| 密码学·熵 | Shannon 熵 | Entropy | bonusPercent |
| 密码学·距离 | 字母表距离 | Cipher | **暴击率** |
| 密码学·模式 | 模式签名稀有度 | Pattern | bonusPercent |
| 金融工程·杠杆 | excess × k（保证金线） | Leverage | 线性过零点 |
| 金融工程·期权 | hockey stick（行权价+权利金） | Option | 折线 |
| ��融工程·对冲 | 双资��� min/max 比值 | Hedge | 倒 V 型 |
| 精密射击·连射 | critStreak × k → critMult | Burst | 线性+断裂 |
| 精密射击·校准 | missStreak × k → critMult(释放) | Zero-In | 阶梯+释放 |
| 精密射击·神射 | (1-critChance) × k → critMult | Sharpshooter | 反比例 |
| 图论·桥 | 移除后邻居断裂 | Bridge | **暴击率** |
| 图论·团 | 最大全连接子集 | Clique | **暴击率** |
| 图论·连通 | BFS 连通分量 | Component | **叠层→触发链远端** |
| 元编程·装饰器 | bonusPercent × (1+k) Phase 2 末尾 | Decorator | 乘法放大 |
| 元编程·反射 | affixCount × level × k → bonus | Reflect | 离散阶梯 |
| 元编程·猴子补丁 | target.bonus × randomMult 每关随机 | MonkeyPatch | 随机修改 |
