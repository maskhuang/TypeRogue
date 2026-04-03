---
title: "Epic 46: 叠层型扩展 — 组合数学领域 3 个新词条"
epic_key: "epic-46"
status: "draft"
created: "2026-04-03"
design_source: "design-affix skill session 2026-04-03"
domain: "组合数学"
category: "stack"
stories:
  - "46-1-stack-parity"
  - "46-2-stack-prime"
  - "46-3-stack-match"
  - "46-4-generation-integration"
  - "46-5-balance-playtest"
---

# Epic 46: 叠层型扩展 — 组合数学领域 3 个新词条

## 背景

Epic 45 将 6 个类别各补齐至 6 个词条，达成完美均衡（36 总）。本 Epic 对叠层类别进行深度扩展，引入组合数学领域作为灵感来源。

### 设计动机

现有 6 个叠层词条的 f(stacks) 全部是「累积→阈值→释放」或「累积→线性加成」，玩家只需关心叠层数**够不够大**。组合数学领域的独特之处在于：**叠层数的数值性质（奇偶、素性、相等关系）决定效果**，让玩家关心叠层数**是什么**。

### 核心映射

```
stacks (离散整数 n) → 组合数学函数 f(n) → bonusPercent / critChance
```

同一变量（stacks），不同 f() 函数：

| 词条 | f() | 体感 |
|------|-----|------|
| Parity | n % 2 → 交替效果 | 交替节奏 |
| Prime | isPrime(n) → 窗口触发 | 不规则稀有窗口 |
| Match | countEqualPairs(neighborStacks) → 配对数 | 分配策略 |

### 设计原则

- **接入共享机制，不造孤岛**：三个词条全部读 `stacks`（共享）+ 写 `bonusPercent` / `critChance`（共享），零私有 runtime 状态
- **数值性质 > 数值大小**：与现有 stack 词条的「越高越强」形成体感区分
- **不加 cap**：允许高叠层场景下的自然爆发

### 新词条总览

| 词条 | 中文名 | 机制 | 读共享 | 写共享 | f() 形状 |
|------|--------|------|--------|--------|---------|
| Parity | 奇偶 | 奇数叠层加产出，偶数叠层加暴击 | stacks | bonusPercent + critChance | 交替方波 |
| Prime | 素数 | 叠层为素数时大额加成 | stacks | bonusPercent | 不规则脉冲 |
| Match | 配对 | 邻居叠层相等的配对数→加成 | stacks(邻居) + posRel | bonusPercent | 离散阶梯 |

## Stories

---

### Story 46.1: 叠层型 — 奇偶 (Parity)

**复杂度: Small**
**依赖: 无**

实现奇偶（Parity）词条：叠层为奇数时加产出，偶数时加暴击率，形成交替双模式节奏。

**范围：**
- 新增 `AffixType.Parity = 'parity'` 到枚举
- 更新 `AFFIX_CATEGORY_MAP`：归入 `stack`
- `AffixInstance` 新增参数：`oddK: number`（奇数时 bonusPercent 加成）、`evenK: number`（偶数时 critChance 加成）
- Phase 2 逻辑：
  ```
  stacks = skill.runtime?.stacks ?? 0
  if stacks === 0: break
  if stacks % 2 === 1:
    bonusPercent += oddK
  else:
    critChanceBonus += evenK
  ```
- 更新 `AFFIX_NAMES` / `AFFIX_DESCRIPTIONS`
- 更新 `AFFIX_WEIGHT_TIERS`
- 更新 `KeyTooltip.ts`：AFFIX_COLORS
- 更新 `demo-i18n.ts`：中英文 name + desc
- 新增单元测试

**参数范围：**

| 参数 | 范围 | 基准 |
|------|------|------|
| oddK | 0.15~0.25 | 对标 Void（3 空位 × 0.08 = 0.24） |
| evenK | 0.08~0.15 | 对标 Crit 基础暴击率 |

**涌现交互：**
- Pulse 改变叠层节奏 → 影响奇偶切换频率
- Amplify/WarDrum 给邻居加叠层 → 翻转邻居 Parity 状态
- 与 Crit 系词条的 critChance 叠加

**验收标准：**
- AC1: 叠层为奇数时 bonusPercent 增加 oddK，critChance 不变
- AC2: 叠层为偶数时 critChance 增加 evenK，bonusPercent 不受 Parity 影响
- AC3: 叠层为 0 时无效果
- AC4: 与 Pulse 共存时，Pulse 清零叠层不导致异常
- AC5: 与 Crit/Taboo 的暴击率叠加正确
- AC6: 技能生成可产出 Parity 词条，参数在范围内
- AC7: 单元测试覆盖奇/偶/零三种状态

**估点：** 3

---

### Story 46.2: 叠层型 — 素数 (Prime)

**复杂度: Small**
**依赖: 无**

实现素数（Prime）词条：叠层恰好为素数时给予大额产出加成，非素数时无效果。

**范围：**
- 新增 `AffixType.Prime = 'prime'` 到枚举
- 更新 `AFFIX_CATEGORY_MAP`：归入 `stack`
- `AffixInstance` 新增参数：`primeK: number`（素数时的 bonusPercent 系数）
- Phase 2 逻辑：
  ```
  stacks = skill.runtime?.stacks ?? 0
  if stacks < 2: break
  if isPrime(stacks):
    bonusPercent += primeK × stacks
  ```
- 新增工具函数 `isPrime(n: number): boolean`（纯函数，放 `affixTrigger.ts` 顶部）
- 更新名称、描述、权重、tooltip、i18n
- 新增单元测试

**参数范围：**

| 参数 | 范围 | 基准 |
|------|------|------|
| primeK | 0.04~0.08 | 低 K × 高 stacks 补偿稀疏窗口 |

**数值验证：**

| stacks | 素数？ | bonus (primeK=0.06) |
|--------|-------|---------------------|
| 2 | ✅ | +12% |
| 5 | ✅ | +30% |
| 7 | ✅ | +42% |
| 10 | ❌ | 0% |
| 13 | ✅ | +78% |
| 17 | ✅ | +102% |

**涌现交互：**
- Pulse 阈值若恰好是素数 → 两者同时触发
- 高叠层时素数稀疏 → 自然形成稀有大奖感
- Amplify 给邻居加叠层 → 可能推到/推离素数

**验收标准：**
- AC1: 叠层为 2,3,5,7,11,13... 时 bonusPercent = primeK × stacks
- AC2: 叠层为 4,6,8,9,10... 时 bonusPercent 无 Prime 贡献
- AC3: 叠层为 0 或 1 时无效果
- AC4: isPrime 函数对 stacks ≤ 100 范围内正确
- AC5: 技能生成可产出 Prime 词条
- AC6: 单元测试覆盖素数/非素数/边界值

**估点：** 3

---

### Story 46.3: 叠层型 — 配对 (Match)

**复杂度: Medium**
**依赖: 无**

实现配对（Match）词条：扫描邻居叠层值，统计相等配对数，配对越多产出越高。

**范围：**
- 新增 `AffixType.Match = 'match'` 到枚举
- 更新 `AFFIX_CATEGORY_MAP`：归入 `stack`
- `AffixInstance` 新增参数：`matchK: number`（每配对的 bonusPercent）
- Phase 2 逻辑：
  ```
  if matchK == null || !triggerKey: break
  neighbors = getNeighborSkills(triggerKey, skill, ctx)
  stackValues = neighbors.map(n => n.runtime?.stacks ?? 0).filter(s => s > 0)
  // 统计配对: 对每个值计 C(count, 2)
  freq = countFrequency(stackValues)
  pairs = sum(C(count, 2) for count in freq.values())
  bonusPercent += matchK × pairs
  ```
- 复用现有邻居扫描机制（同 Void/Flow/Confluence 的 `getNeighborSkills`）
- 更新名称、描述、权重、tooltip、i18n
- 新增单元测试

**参数范围：**

| 参数 | 范围 | 基准 |
|------|------|------|
| matchK | 0.08~0.15 | 1 对 ≈ Void 单空位收益 |

**数值验证：**

| 邻居叠层 | 配对数 | bonus (matchK=0.12) |
|---------|--------|---------------------|
| [1,3,5,7] | 0 | 0% |
| [3,3,5,7] | 1 | +12% |
| [3,3,5,5] | 2 | +24% |
| [3,3,3,5] | 3 (三同) | +36% |
| [3,3,3,3] | 6 (四同) | +72% |

**涌现交互：**
- Amplify 给邻居加叠层 → 主动制造配对
- Pulse 不同邻居的阈值不同 → 叠层同步需要策略安排
- Resonance 邻居叠层触发 → 可能改变配对关系

**验收标准：**
- AC1: 无邻居或邻居叠层全为 0 时 bonus = 0
- AC2: 1 对匹配时 bonus = matchK
- AC3: 三同值（3 对）和四同值（6 对）计算正确
- AC4: 只统计叠层 > 0 的邻居（叠层 0 不参与配对）
- AC5: null triggerKey 时安全跳过
- AC6: 与 Void（空邻居加成）形成策略对立：Match 要满邻居，Void 要空邻居
- AC7: 技能生成可产出 Match 词条
- AC8: 单元测试覆盖 0 对/1 对/多对/全同/null key

**估点：** 5

---

### Story 46.4: 技能生成集成

**复杂度: Small**
**依赖: 46.1, 46.2, 46.3**

将 3 个新词条整合进技能生成系统，确保随机生成、权重、商店展示全部就绪。

**范围：**
- 更新 `skillGeneration.ts`：为 Parity/Prime/Match 添加 `rollAffixParams` switch case 和参数表
- 更新 `rollAffixWeights()`：新词条权重分档
- 更新 `shop.ts`：
  - `buildAffixParamSummary`：新词条的参数摘要展示
  - `computeSmartEstimate`：三个词条均为不可预估型，使用定性描述
- 更新 `affixes.test.ts`：枚举数量 39，stack 分类数量 9
- 验证商店展示正确

**验收标准：**
- AC1: `generateSkill()` 可随机生成含 Parity/Prime/Match 的技能
- AC2: 新词条权重合理，不过于稀有或常见
- AC3: 商店 tooltip 正确展示参数和描述
- AC4: 存档兼容：旧存档不含新词条不崩溃
- AC5: exhaustive switch 编译通过（无 TS 错误）

**估点：** 3

---

### Story 46.5: 数值平衡与 Playtest

**复杂度: Medium**
**依赖: 46.4**

对 3 个新词条进行数值平衡和交互验证。

**范围：**
- K 值调优：实际游戏中验证 Parity/Prime/Match 的 bonus 量级
- 交互矩阵验证：

| 交互对 | 预期行为 | 验证 |
|--------|---------|------|
| Parity + Pulse | Pulse 清零后重新交替 | |
| Parity + Crit | evenK 与 Crit 的暴击率叠加 | |
| Parity + WarDrum | WarDrum 加 crit + Parity 偶数加 crit = 双暴击源 | |
| Prime + Pulse | Pulse 阈值为素数时两者同时触发 | |
| Prime + Amplify | Amplify 加邻居叠层 → 可能推到素数 | |
| Match + Amplify | Amplify 统一加叠层 → 制造配对 | |
| Match + Void | 策略对立：一个要满邻居，一个要空邻居 | |
| Match + Resonance | Resonance 改变邻居叠层 → 影响配对 | |

- 极端场景测试：
  - Prime: stacks=97 → bonus=582%（高但需要极长累积，可接受）
  - Match: 6 邻居全同 → C(6,2)=15 → bonus=180%（极端条件，可接受）
- 性能验证：isPrime() 和 countEqualPairs() 在 stacks ≤ 200 范围内 < 0.1ms

**验收标准：**
- AC1: 三个新词条在不同构建中均有使用场景
- AC2: 无单一词条过于强势
- AC3: 交互矩阵中所有组合行为符合预期
- AC4: 极端场景下不崩溃、不产生负值
- AC5: 帧预算合规
- AC6: 至少 2 局完整 playtest 记录

**估点：** 5

---

## 依赖图

```
46.1 Parity ──┐
46.2 Prime  ──┼── 46.4 技能生成集成 ── 46.5 平衡 Playtest
46.3 Match  ──┘
```

46.1/46.2/46.3 互不依赖，可并行开发。

## 总估点

| Story | 估点 |
|-------|------|
| 46.1 奇偶 (Parity) | 3 |
| 46.2 素数 (Prime) | 3 |
| 46.3 配对 (Match) | 5 |
| 46.4 技能生成集成 | 3 |
| 46.5 数值平衡 | 5 |
| **合计** | **19** |
