---
title: "Epic 48: 数值型扩展 — 金融工程领域 3 个新词条"
epic_key: "epic-48"
status: "draft"
created: "2026-04-03"
design_source: "design-affix skill session 2026-04-03"
domain: "金融工程"
category: "numeric"
stories:
  - "48-1-numeric-leverage"
  - "48-2-numeric-option"
  - "48-3-numeric-hedge"
  - "48-4-generation-integration"
  - "48-5-balance-playtest"
---

# Epic 48: 数值型扩展 — 金融工程领域 3 个新词条

## 背景

Epic 45 将数值类别补齐至 6 个词条（Convert/Rainbow/Multiply/PhaseShift/EndoExo/Fusion）。前三个是基础数值操作，后三个来自热力学领域关注「状态和相变」。本 Epic 从金融工程领域引入「收益和风险」视角，增加 3 个新词条。

### 设计动机

现有数值型词条的 f(resource) 要么永远为正（Convert/Multiply），要么有条件阈值但无持续代价（PhaseShift/EndoExo）。金融工程天然围绕「风险-收益权衡」展开，引入负值 bonusPercent 作为代价，创造有意义的策略选择。

### 核心映射

```
资源值 → 金融资产价格/收益 → 金融运算 f(value) → bonusPercent (可为负)
```

同一变量（资源值），不同 f() 函数：

| 词条 | f() | 体感 |
|------|-----|------|
| Leverage | excess × k（超/低于保证金线） | 高风险高回报 |
| Option | hockey stick（行权价+权利金） | 以小博大 |
| Hedge | min/max 比值（双资源接近度） | 追求平衡 |

### 设计原则

- **引入风险光谱**：Leverage(高风险) > Option(中风险) > Hedge(低风险)，玩家可按风险偏好选择
- **负值 bonusPercent 是代价，不是 bug**：与 Counter(meta_rule) 形成天然组合
- **接入共享机制，不造孤岛**：全部读 `getAffixSourceValue` 或 `getStageProducedValue`，写 `bonusPercent`

### 新词条总览

| 词条 | 中文名 | 机制 | 读共享 | 写共享 | f() 形状 |
|------|--------|------|--------|--------|---------|
| Leverage | 杠杆 | 资源超/低于保证金线 → 放大正/负 bonus | getAffixSourceValue | bonusPercent(可负) | 线性(过零点) |
| Option | 期权 | 超行权价线性收益，未达则固定小亏损 | getStageProducedValue | bonusPercent(可负) | 折线(hockey stick) |
| Hedge | 对冲 | 双资源产出越接近 bonus 越高 | getStageProducedValue ×2 | bonusPercent(仅正) | 倒 V 型 |

### 与现有数值词条的风格对比

| 词条 | 风险 | 负值？ | 读什么 | 条件 |
|------|------|--------|--------|------|
| Convert | 无 | 否 | 资源池值 | 无 |
| Multiply | 无 | 否 | — | 无 |
| Rainbow | 无 | 否 | — | 无 |
| PhaseShift | 低(consume) | 否 | 累积产出 | 阈值跳变 |
| EndoExo | 低(consume) | 可选 | 累积产出 | 高低振荡 |
| Fusion | 中(惩罚) | 是 | 双资源累积 | 双达阈值 |
| **Leverage** | **高** | **是** | 资源池值 | 保证金线 |
| **Option** | **中** | **是** | 累积产出 | 行权价 |
| **Hedge** | **无** | **否** | 双资源累积 | 接近度 |

## Stories

---

### Story 48.1: 数值型 — 杠杆 (Leverage)

**复杂度: Medium**
**依赖: 无**

实现杠杆（Leverage）词条：资源值超过保证金阈值时放大收益，低于阈值时产生亏损（负 bonusPercent）。

**范围：**
- 新增 `AffixType.Leverage = 'leverage'` 到枚举
- 更新 `AFFIX_CATEGORY_MAP`：归入 `numeric`
- `AffixInstance` 新增参数：
  - `source: ResourceType` — 读取的资源
  - `leverageK: number` — 杠杆系数
  - `marginThreshold: number` — 保证金阈值（归一化为 N × BASE_VALUES[source][0]）
- Phase 2 逻辑：
  ```
  val = getAffixSourceValue(source)
  norm = BASE_VALUES[skill.resource][lvl] / BASE_VALUES[source][lvl]
  excess = val - marginThreshold
  bonusPercent += leverageK × excess × norm
  // excess > 0: 正收益（资源充裕）
  // excess < 0: 负收益（爆仓）
  ```
- 更新 `AFFIX_NAMES` / `AFFIX_DESCRIPTIONS`
- 更新 `AFFIX_WEIGHT_TIERS`
- 更新 `KeyTooltip.ts`：AFFIX_COLORS
- 更新 `demo-i18n.ts`：中英文 name + desc
- 新增单元测试

**参数范围：**

| 参数 | 范围 | 基准 |
|------|------|------|
| leverageK | 0.06~0.12 | excess=10 时 +60~120%，对标 Convert 高区间 |
| marginThreshold | 2~4 × BASE_VALUES[source][0] | 约 2~4 次标准触发产出 |

**数值验证（source=base, BASE=5, K=0.10, threshold=10, norm=1）：**

| 资源值 | excess | bonus |
|--------|--------|-------|
| 30 | +20 | +200% |
| 20 | +10 | +100% |
| 10 | 0 | 0% |
| 5 | -5 | -50% |
| 0 | -10 | -100% |

**涌现交互：**
- Counter 取消负产出 → 杠杆+反制 = 有保险的高杠杆
- Taboo 也有负值 → 双负面叠加形成极端风险构建
- Convert 永远正 → 杠杆+转化 = 正收益底仓+杠杆上弹

**验收标准：**
- AC1: 资源高于阈值时 bonus 为正，低于阈值时 bonus 为负
- AC2: 阈值处 bonus 恰好为 0
- AC3: 负 bonusPercent 正确传播到最终产出（可产生负产出）
- AC4: 与 Counter 组合时负产出被正确取消
- AC5: 技能生成可产出 Leverage 词条，source ≠ skill.resource
- AC6: 单元测试覆盖正值/负值/零点/极端资源值

**估点：** 5

---

### Story 48.2: 数值型 — 期权 (Option)

**复杂度: Medium**
**依赖: 无**

实现期权（Option）词条：资源累积产出超过行权价时线性收益，未达时每次触发扣除固定权利金。

**范围：**
- 新增 `AffixType.Option = 'option'` 到枚举
- 更新 `AFFIX_CATEGORY_MAP`：归入 `numeric`
- `AffixInstance` 新增参数：
  - `source: ResourceType` — 读取的资源
  - `optionK: number` — 行权后收益斜率
  - `strikePrice: number` — 行权价（归一化为 N × BASE_VALUES[source][0]）
  - `premium: number` — 权利金（未行权时的固定 bonusPercent 扣减）
- Phase 2 逻辑：
  ```
  val = getStageProducedValue(source, ctx)
  norm = BASE_VALUES[skill.resource][lvl] / BASE_VALUES[source][lvl]
  if val >= strikePrice:
    bonusPercent += optionK × (val - strikePrice) × norm   // in the money
  else:
    bonusPercent -= premium                                  // 权利金
  ```
- 更新名称、描述、权重、tooltip、i18n
- 新增单元测试

**参数范围：**

| 参数 | 范围 | 基准 |
|------|------|------|
| optionK | 0.04~0.08 | 行权后斜率对标 Convert |
| strikePrice | 3~6 × BASE_VALUES[source][0] | 约 3~6 个词后行权 |
| premium | 0.05~0.10 | 每次触发 -5~10% 的小亏损 |

**数值验证（source=base, BASE=5, K=0.06, strike=20, premium=0.08, norm=1）：**

| 累积产出 | 状态 | bonus |
|---------|------|-------|
| 5 | 未行权 | -8% |
| 10 | 未行权 | -8% |
| 20 | 临界 | 0% |
| 30 | 行权 | +60% |
| 50 | 行权 | +180% |

**涌现交互：**
- PhaseShift 跨阈值无代价 vs Option 有持续权利金代价 → 不同风险偏好
- EndoExo 振荡可能导致累积产出反复穿越行权价
- Innate(meta_rule) 关卡开始触发 → 必定付权利金（累积产出=0）

**验收标准：**
- AC1: 累积产出超行权价时 bonus 线性增长
- AC2: 未达行权价时每次触发扣除固定 premium
- AC3: 行权价处 bonus 恰好为 0（premium 和收益临界平衡）
- AC4: 与 PhaseShift 读同资源时效果叠加正确
- AC5: 技能生成参数合理，strike 和 premium 成正比（高 strike = 高 premium = 高 optionK）
- AC6: 单元测试覆盖未行权/临界/行权/早期触发

**估点：** 5

---

### Story 48.3: 数值型 — 对冲 (Hedge)

**复杂度: Medium**
**依赖: 无**

实现对冲（Hedge）词条：读两种资源的累积产出，归一化后越接近 bonus 越高。保守策略，无负值风险。

**范围：**
- 新增 `AffixType.Hedge = 'hedge'` 到枚举
- 更新 `AFFIX_CATEGORY_MAP`：归入 `numeric`
- `AffixInstance` 新增参数：
  - `sourceA: ResourceType` — 第一种资源
  - `sourceB: ResourceType` — 第二种资源
  - `hedgeK: number` — 接近度系数
- Phase 2 逻辑：
  ```
  valA = getStageProducedValue(sourceA, ctx) / (BASE_VALUES[sourceA][lvl] ?? 1)
  valB = getStageProducedValue(sourceB, ctx) / (BASE_VALUES[sourceB][lvl] ?? 1)
  maxVal = Math.max(valA, valB)
  if maxVal === 0: break
  ratio = Math.min(valA, valB) / maxVal    // 0~1, 1=完全均衡
  bonusPercent += hedgeK × ratio
  ```
- 生成约束：sourceA ≠ sourceB 且两者 ≠ skill.resource（同 Fusion）
- 更新名称、描述、权重、tooltip、i18n
- 新增单元测试

**参数范围：**

| 参数 | 范围 | 基准 |
|------|------|------|
| hedgeK | 0.20~0.40 | ratio=1 时 +20~40%，对标 Void |

**数值验证（hedgeK=0.30）：**

| valA(归一化) | valB(归一化) | ratio | bonus |
|-------------|-------------|-------|-------|
| 10 | 10 | 1.00 | +30% |
| 10 | 8 | 0.80 | +24% |
| 10 | 5 | 0.50 | +15% |
| 10 | 2 | 0.20 | +6% |
| 10 | 0 | 0.00 | 0% |

**涌现交互：**
- Fusion 要双高(与门) vs Hedge 要双接近(比值) → 策略冲突有趣
- Rainbow 随机化资源目标 → 帮助/干扰均衡策略
- Convert 读特定资源提升该资源 → 可能打破/帮助两资源均衡

**验收标准：**
- AC1: 双资源完全均衡时 bonus = hedgeK
- AC2: 一方为 0 时 bonus = 0
- AC3: 双方都为 0 时安全跳过（不除零）
- AC4: 归一化正确（不同资源的 BASE_VALUES 量级差异被消除）
- AC5: sourceA ≠ sourceB 且 ≠ skill.resource
- AC6: 与 Fusion 同时存在时，两者读不同/相同资源对效果正确
- AC7: 技能生成可产出 Hedge 词条
- AC8: 单元测试覆盖均衡/失衡/单方为零/双方为零

**估点：** 5

---

### Story 48.4: 技能生成集成

**复杂度: Small**
**依赖: 48.1, 48.2, 48.3**

将 3 个新词条整合进技能生成系统。

**范围：**
- 更新 `skillGeneration.ts`：为 Leverage/Option/Hedge 添加 `rollAffixParams` switch case 和参数表
  - Leverage: source 随机选（≠ skill.resource），leverageK 和 marginThreshold 按 rarity 缩放
  - Option: source 随机选，optionK/strikePrice/premium 联动（高 strike = 高 premium = 高 K）
  - Hedge: sourceA/sourceB 随机选（互不相同，≠ skill.resource），hedgeK 按 rarity 缩放
- 更新 `rollAffixWeights()`：新词条权重分档
- 更新 `shop.ts`：
  - `buildAffixParamSummary`：展示 source、阈值、K 值
  - `computeSmartEstimate`：Leverage/Option 依赖实时资源值不可预估；Hedge 不可预估
- 更新 `affixes.test.ts`：枚举数量 42（或与其他 Epic 合并后的总数），numeric 分类数量 9

**验收标准：**
- AC1: `generateSkill()` 可随机生成含新词条的技能
- AC2: Leverage/Option 的 source ≠ skill.resource
- AC3: Hedge 的 sourceA ≠ sourceB ≠ skill.resource
- AC4: 商店 tooltip 正确展示风险提示（负值可能性）
- AC5: 存档兼容
- AC6: exhaustive switch 编译通过

**估点：** 3

---

### Story 48.5: 数值平衡与 Playtest

**复杂度: Medium**
**依赖: 48.4**

对 3 个新词条进行数值平衡和交互验证。

**范围：**
- K 值调优：实际游戏中验证风险-收益光谱
- 交互矩阵验证：

| 交互对 | 预期行为 | 验证 |
|--------|---------|------|
| Leverage + Counter | Counter 取消爆仓负产出，形成「有保险的杠杆」 | |
| Leverage + Taboo | 双负面叠加，极端风险构建 | |
| Leverage + Convert | Convert 正收益底仓 + Leverage 弹性上下 | |
| Option + PhaseShift | 两者都有阈值但代价不同，策略选择 | |
| Option + EndoExo | EndoExo 振荡影响累积产出穿越行权价 | |
| Option + Innate | 关卡开始触发必付权利金 | |
| Hedge + Fusion | Fusion 要双高 vs Hedge 要双接近，策略冲突 | |
| Hedge + Rainbow | Rainbow 随机资源 → 干扰/帮助均衡 | |
| Leverage + Option + Hedge | 三者共存时风险梯度是否清晰 | |

- 极端场景：
  - Leverage: 资源=0 时 excess=-threshold → bonus 约 -100~200%（需验证最终产出不无限负）
  - Option: 全程未行权 → 累计权利金亏损是否可接受
  - Hedge: late game 双资源自然趋近 → bonus 是否过于稳定

**验收标准：**
- AC1: 风险梯度清晰——Leverage 是高风险高回报，Option 是中风险，Hedge 是低风险
- AC2: 负产出不会导致游戏不可玩（有 Counter 等补救手段）
- AC3: 三个词条在不同风格构建中各有定位
- AC4: 交互矩阵所有组合行为符合预期
- AC5: 帧预算合规
- AC6: 至少 2 局完整 playtest 记录

**估点：** 5

---

## 依赖图

```
48.1 Leverage ──┐
48.2 Option   ──┼── 48.4 技能生成集成 ── 48.5 平衡 Playtest
48.3 Hedge    ──┘
```

48.1/48.2/48.3 互不依赖，可并行开发。

## 总估点

| Story | 估点 |
|-------|------|
| 48.1 杠杆 (Leverage) | 5 |
| 48.2 期权 (Option) | 5 |
| 48.3 对冲 (Hedge) | 5 |
| 48.4 技能生成集成 | 3 |
| 48.5 数值平衡 | 5 |
| **合计** | **23** |
