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

**各类别推荐领域矩阵：**

| 类别 | 范式 | 已验证领域 | 备选领域 |
|------|------|-----------|---------|
| 数值 | `read(resource) → f(value) → bonusPercent [+ consume]` | 热力学 | 核物理、金融、流体力学 |
| 拓扑 | `scan(posRel, neighbors) → 统计运算 → bonusPercent` | 流体力学 | 电路学、细胞自动机、生态学 |
| 词感 | `analyze(word) → f(feature) → bonusPercent` | 语言学 | 密码学、音乐理论 |
| 元规则 | `在生命周期节点插入修改` | 卡牌游戏 | 元编程、博弈论 |
| 暴击 | `modify(critChance) → onCrit/onMiss` | — | 赌博、量子力学、精密射击 |
| 叠层 | `accumulate → threshold → release` | — | 电容、水利工程、地震学 |

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
