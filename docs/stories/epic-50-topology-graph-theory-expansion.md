---
title: "Epic 50: 拓扑型扩展 — 图论领域 3 个新词条"
epic_key: "epic-50"
status: "draft"
created: "2026-04-03"
design_source: "design-affix skill session 2026-04-03"
domain: "图论"
category: "topology"
stories:
  - "50-1-topology-bridge"
  - "50-2-topology-clique"
  - "50-3-topology-component"
  - "50-4-generation-integration"
  - "50-5-balance-playtest"
---

# Epic 50: 拓扑型扩展 — 图论领域 3 个新词条

## 背景

Epic 45 将拓扑类别补齐至 6 个词条（Void/Mirror/Cascade/Flow/Confluence/Turbulence）。现有词条全部读邻居的**属性值**（占位、baseValue、resource、词条）。本 Epic 从图论领域引入 3 个新词条，读邻居的**连接结构本身**——完全正交的新维度。

### 设计动机

键盘上已绑定技能的键位天然构成一张图 G(V,E)：
- V = 已绑定技能的键位
- E = posRel 关系定义的边

现有拓扑词条关注的是「邻居有什么」（属性），图论关注「邻居怎么连」（结构）。这开辟了全新的**布局策略维度**——玩家不仅要考虑技能放在哪里、邻居是什么，还要考虑技能之间的连接拓扑。

### 核心映射

```
已绑定技能键位集合 → 图 G(V,E) → 图论度量 f(G) → bonusPercent
```

| 词条 | f(G) | 体感 |
|------|------|------|
| Bridge | 自身是否为桥节点 | 「关键枢纽」不可替代 |
| Clique | 自身+邻居的最大全连接子集 | 「抱团取暖」越紧越强 |
| Component | 所在连通分量大小 | 「连片占领」越广越强 |

### 设计原则

- **读结构不读属性**：与现有拓扑词条完全正交
- **布局策略光谱**：Bridge(稀疏链状) ↔ Clique(密集抱团) ↔ Component(连片铺满)
- **零私有 runtime 状态**：图结构由当前绑定决定，纯计算
- **性能安全**：键盘最多 30 键，所有图算法 < 0.1ms

### 新词条总览

| 词条 | 中文名 | 机制 | 读共享 | 写共享 | f() 形状 |
|------|--------|------|--------|--------|---------|
| Bridge | 桥 | 移除自身后邻居图断裂 → 大额 bonus | posRel + bindings | bonusPercent | 二值(是/否) |
| Clique | 团 | 自身+邻居中最大全连接子集 → bonus | posRel + bindings | bonusPercent | 离散阶梯(1~3) |
| Component | 连通 | 沿 Adjacent 的连通分量大小 → bonus | Adjacent + bindings | bonusPercent | 线性 |

### 与现有拓扑词条的维度对比

| 维度 | 现有词条 | 新词条 |
|------|---------|--------|
| 邻居占位 | Void（空位数） | — |
| 邻居词条 | Mirror（复制） | — |
| 触发序列 | Cascade（前一键关系） | — |
| 邻居 baseValue | Flow（差值）、Turbulence（离散度） | — |
| 邻居 resource | Confluence（种类数） | — |
| **连接结构** | — | **Bridge（桥）、Clique（团）、Component（连通）** |

### 布局策略对立矩阵

| | 稀疏 | 密集 | 连片 |
|---|------|------|------|
| **Bridge** | ⭐⭐⭐ | ⭐ | ⭐⭐ |
| **Clique** | ⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Component** | ⭐ | ⭐⭐ | ⭐⭐⭐ |
| **Void** | ⭐⭐⭐ | ⭐ | ⭐ |

## Stories

---

### Story 50.1: 拓扑型 — 桥 (Bridge)

**复杂度: Medium**
**依赖: 无**

实现桥（Bridge）词条：若自身键位是图论中的「桥」（移除后邻居集合的连通性断裂），给予大额 bonus。

**范围：**
- 新增 `AffixType.Bridge = 'bridge'` 到枚举
- 更新 `AFFIX_CATEGORY_MAP`：归入 `topology`
- `AffixInstance` 新增参数：`bridgeK: number`（是桥时的 bonusPercent 加成）
- Phase 2 逻辑：
  ```
  if !triggerKey: break
  neighbors = getNeighborKeys(triggerKey, affix.posRel).filter(isBound)
  if neighbors.length < 2: break  // 0或1邻居不可能是桥
  // 移除自身后，检查邻居之间是否仍然连通
  isBridge = !areConnectedWithout(neighbors, triggerKey, affix.posRel, ctx.bindings)
  if isBridge:
    bonusPercent += bridgeK
  ```
- 新增工具函数 `areConnectedWithout(nodes, excludeKey, posRel, bindings): boolean`
  - 从 nodes[0] 出发 BFS，沿 posRel 关系只走已绑定键位（排除 excludeKey）
  - 检查是否能到达所有 nodes
- 更新 `AFFIX_NAMES` / `AFFIX_DESCRIPTIONS`
- 更新 `AFFIX_WEIGHT_TIERS`
- 更新 `KeyTooltip.ts`：AFFIX_COLORS
- 更新 `demo-i18n.ts`：中英文 name + desc
- 新增单元测试

**参数范围：**

| 参数 | 范围 | 基准 |
|------|------|------|
| bridgeK | 0.25~0.45 | 二值奖励，比 Void(3空位=0.24) 更高因为更稀有 |

**桥概率分析：**

| 布局密度 | 桥概率(Adjacent) | 说明 |
|---------|-----------------|------|
| 稀疏(3~5技能) | ~50% | 链状布局中间节点 |
| 中等(6~8技能) | ~30% | 网状减少 |
| 密集(9~12技能) | ~10% | 几乎无桥 |

**涌现交互：**
- Void 空邻居多 → 连通路径少 → 更易成桥 → 正协同
- Clique 要密集 → 密集布局无桥 → 策略对立
- 玩家在商店选技能时需要考虑放置位置对桥的影响

**验收标准：**
- AC1: 链状布局中间节点正确判定为桥，给予 bridgeK bonus
- AC2: 密集网状布局中节点正确判定为非桥，无 bonus
- AC3: 0 或 1 个邻居时安全跳过
- AC4: null triggerKey 安全跳过
- AC5: areConnectedWithout BFS 在 30 键规模下 < 0.1ms
- AC6: 技能生成可产出 Bridge 词条
- AC7: 单元测试覆盖链状/网状/孤立/边缘情况

**估点：** 5

---

### Story 50.2: 拓扑型 — 团 (Clique)

**复杂度: Medium**
**依赖: 无**

实现团（Clique）词条：自身+posRel 邻居中最大全连接子集大小 → bonus。技能越「抱团」越强。

**范围：**
- 新增 `AffixType.Clique = 'clique'` 到枚举
- 更新 `AFFIX_CATEGORY_MAP`：归入 `topology`
- `AffixInstance` 新增参数：`cliqueK: number`（每团成员的 bonusPercent）
- Phase 2 逻辑：
  ```
  if !triggerKey: break
  neighbors = getNeighborKeys(triggerKey, affix.posRel).filter(isBound)
  candidates = [triggerKey, ...neighbors]
  maxClique = findMaxClique(candidates, affix.posRel, ctx.bindings)
  bonusPercent += cliqueK × Math.max(0, maxClique - 1)  // -1: 自身不算
  ```
- 新增工具函数 `findMaxClique(nodes, posRel, bindings): number`
  - 暴力枚举所有子集（规模 ≤ 7，2⁷=128 次检查）
  - 对每个子集检查是否全连接（每对节点互为 posRel）
  - 返回最大全连接子集大小
- 更新名称、描述、权重、tooltip、i18n
- 新增单元测试

**参数范围：**

| 参数 | 范围 | 基准 |
|------|------|------|
| cliqueK | 0.10~0.20 | clique=3(三角) 时 +20~40%，对标 Void |

**键盘团大小分析（Adjacent 关系）：**

| 团大小 | 示例键位 | 出现条件 |
|--------|---------|---------|
| 2 (对) | Q-W, W-E, A-S... | 任意相邻两技能 |
| 3 (三角) | Q-W-A, W-E-S, E-R-D... | 利用行错位的三角结构 |
| 4+ | 极罕见 | QWERTY 行错位导致几乎无 4-clique |

**涌现交互：**
- Void 要空邻居 → 与 Clique 完美对立 → 不同构建方向
- Flow/Confluence/Turbulence 读邻居值 → 与 Clique 读结构正交，可叠加
- Match(stack) 要邻居叠层配对 → Clique 保证有邻居 → 间接协同

**验收标准：**
- AC1: 三角布局(Q-W-A 各有技能)正确返回 clique=3
- AC2: 线性布局(Q-W-E)只有 clique=2（W-E 或 Q-W 对，三者不全连接）
- AC3: 孤立节点 clique=1，bonus=0
- AC4: findMaxClique 在 7 节点内 < 0.1ms
- AC5: 不同 posRel 下团结构正确（如 SameRow 下同行全连通 → 大团）
- AC6: 技能生成可产出 Clique 词条
- AC7: 单元测试覆盖 1/2/3 团 + 不同 posRel

**估点：** 5

---

### Story 50.3: 拓扑型 — 连通 (Component)

**复杂度: Medium**
**依赖: 无**

实现连通（Component）词条：沿 Adjacent 关系的连通分量大小 → bonus。连片区域越大越强。

**范围：**
- 新增 `AffixType.Component = 'component'` 到枚举
- 更新 `AFFIX_CATEGORY_MAP`：归入 `topology`
- `AffixInstance` 新增参数：`componentK: number`（每连通成员的 bonusPercent）
- **注意：Component 不带 posRel 参数，固定使用 Adjacent。** 理由：SameRow/SameHand 等关系下连通分量过大（半个键盘），区分度低。Adjacent 下连通分量 1~12 区分度最优。
- Phase 2 逻辑：
  ```
  if !triggerKey: break
  componentSize = bfsComponentSize(triggerKey, PositionRelation.Adjacent, ctx.bindings)
  bonusPercent += componentK × Math.max(0, componentSize - 1)  // -1: 自身不算
  ```
- 新增工具函数 `bfsComponentSize(startKey, posRel, bindings): number`
  - 从 startKey 出发 BFS，沿 posRel 关系只走已绑定键位
  - 返回可达节点数（含自身）
- 更新名称、描述、权重、tooltip、i18n
- 新增单元测试

**参数范围：**

| 参数 | 范围 | 基准 |
|------|------|------|
| componentK | 0.03~0.06 | size=8 时 +21~42%，对标 Void |

**数值验证（componentK=0.04）：**

| 连通分量大小 | bonus |
|-------------|-------|
| 1 (孤立) | 0% |
| 4 | +12% |
| 8 | +28% |
| 12 (全连通) | +44% |

**涌现交互：**
- Void 空邻居 → 可能切断连通 → 缩小 Component → tension
- Bridge 是连通关键节点 → 策略关联（Bridge 断 → Component 分裂）
- Clique 要紧密 → 紧密连片两者都受益 → 正协同
- 新技能购买和放置直接影响连通分量 → 布局规划深度

**验收标准：**
- AC1: 连片 8 技能正确返回 componentSize=8
- AC2: 两个孤立集群分别返回各自大小
- AC3: 单个孤立技能 componentSize=1，bonus=0
- AC4: BFS 在 30 键规模下 < 0.1ms
- AC5: 不受其他 posRel 影响（固定 Adjacent）
- AC6: 技能生成可产出 Component 词条（无 posRel 参数）
- AC7: 单元测试覆盖孤立/小集群/大连片/全连通

**估点：** 5

---

### Story 50.4: 技能生成集成

**复杂度: Small**
**依赖: 50.1, 50.2, 50.3**

将 3 个新词条整合进技能生成系统。

**范围：**
- 更新 `skillGeneration.ts`：
  - Bridge: rollAffixParams 生成 bridgeK + posRel（同其他拓扑词条）
  - Clique: rollAffixParams 生成 cliqueK + posRel
  - Component: rollAffixParams 生成 componentK（**无 posRel**，固定 Adjacent）
- 更新 `rollAffixWeights()`：新词条权重分档
- 更新 `shop.ts`：
  - `buildAffixParamSummary`：展示参数
  - `computeSmartEstimate`：三个词条可实时计算（读当前绑定），同 Void/Flow 策略
- 更新 `affixes.test.ts`：枚举数量更新，topology 分类数量 9

**预估策略：**
三个词条都依赖当前键盘绑定状态（已知），可实时预估：
```
// Bridge: 检查当前绑定下该键是否为桥
// Clique: 计算当前绑定下的最大团
// Component: BFS 计算连通分量大小
```

**验收标准：**
- AC1: `generateSkill()` 可随机生成含新词条的技能
- AC2: Component 生成时不带 posRel 参数
- AC3: 商店 smartEstimate 正确展示（基于当前绑定）
- AC4: 存档兼容
- AC5: exhaustive switch 编译通过

**估点：** 3

---

### Story 50.5: 数值平衡与 Playtest

**复杂度: Medium**
**依赖: 50.4**

对 3 个新词条进行数值平衡和交互验证。

**范围：**
- K 值调优
- 交互矩阵验证：

| 交互对 | 预期行为 | 验证 |
|--------|---------|------|
| Bridge + Void | 空位多 → 更易成桥 → 正协同 | |
| Bridge + Clique | 密集布局无桥 → 策略对立 | |
| Clique + Void | 密集 vs 稀疏 → 完美对立 | |
| Clique + Component | 紧密连片 → 两者都受益 → 正协同 | |
| Component + Void | 空位可能切断连通 → tension | |
| Component + Bridge | Bridge 是关键连接 → 策略关联 | |
| Bridge + Flow | 桥节点通常邻居少 → Flow 差值来源少 → 弱协同 | |
| Clique + Match(stack) | Clique 保证有紧密邻居 → Match 有更多配对候选 → 间接协同 | |

- 极端场景：
  - Bridge: 全部技能排成一条链 → 中间全是桥 → 高 bonus 但牺牲了团和连片
  - Clique: Adjacent 下最大 3-clique → bonus 上限 +40%，合理
  - Component: 全连通 12 技能 → bonus +44%，偏高但需要极端布局
- 布局策略验证：三者是否创造了有意义的布局选择（稀疏 vs 密集 vs 连片）

**验收标准：**
- AC1: 布局策略光谱清晰——Bridge(稀疏) / Clique(密集) / Component(连片)
- AC2: 三个词条与现有 6 个拓扑词条无冲突
- AC3: 图算法性能合规（所有词条同时存在时 < 0.5ms）
- AC4: 交互矩阵所有组合符合预期
- AC5: 至少 2 局完整 playtest 记录

**估点：** 5

---

## 依赖图

```
50.1 Bridge   ──┐
50.2 Clique   ──┼── 50.4 技能生成集成 ── 50.5 平衡 Playtest
50.3 Component──┘
```

50.1/50.2/50.3 互不依赖，可并行开发。

## 总估点

| Story | 估点 |
|-------|------|
| 50.1 桥 (Bridge) | 5 |
| 50.2 团 (Clique) | 5 |
| 50.3 连通 (Component) | 5 |
| 50.4 技能生成集成 | 3 |
| 50.5 数值平衡 | 5 |
| **合计** | **23** |
