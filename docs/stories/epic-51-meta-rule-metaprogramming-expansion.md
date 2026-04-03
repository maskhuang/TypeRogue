---
title: "Epic 51: 元规则型扩展 — 元编程领域 3 个新词条"
epic_key: "epic-51"
status: "draft"
created: "2026-04-03"
design_source: "design-affix skill session 2026-04-03"
domain: "元编程"
category: "meta_rule"
stories:
  - "51-1-meta-decorator"
  - "51-2-meta-reflect"
  - "51-3-meta-monkey-patch"
  - "51-4-generation-integration"
  - "51-5-balance-playtest"
---

# Epic 51: 元规则型扩展 — 元编程领域 3 个新词条

## 背景

Epic 45 将元规则类别补齐至 6 个词条（Conduit/Twin/Innate/Counter/Exhaust/Ethereal），全部来自卡牌游戏领域，关注词条/技能的「生命周期和规则修改」。本 Epic 从元编程领域引入 3 个新词条，关注「行为修改」——修改其他词条如何运算。

### 设计动机

现有元规则词条操作的是生命周期节点（何时触发、何时消失、如何保护）。元编程领域操作的是行为本身（如何放大、如何读取、如何修改）。这填补了「词条之间交互方式」的空白：

| 维度 | 现有词条 | 本 Epic 新增 |
|------|---------|------------|
| 触发时机 | Innate（开始触发）、Conduit（额外触发） | — |
| 生命周期 | Exhaust（限次）、Ethereal（限时） | — |
| 防御/保护 | Counter（取消负值） | — |
| 扩展 | Twin（双附魔） | — |
| **效果放大** | — | **Decorator（乘法放大同伴）** |
| **自身感知** | — | **Reflect（读技能元数据）** |
| **动态修改** | — | **Monkey Patch（随机修改同伴参数）** |

### 核心映射

```
词条/技能的行为 → 代码/函数 → 元编程操作 f(behavior) → 修改运算过程
```

| 词条 | f() | 元编程类比 | 体感 |
|------|-----|-----------|------|
| Decorator | bonusPercent *= (1 + k) | 装饰器模式：包装增强 | 确定性放大同伴 |
| Reflect | affixCount × level × k → bonus | 反射 API：读取自身元数据 | 越完整越强 |
| Monkey Patch | target.bonus × randomMult | 猴子补丁：运行时修改 | 随机强化/弱化同伴 |

### 设计原则

- **Decorator/Reflect 零私有状态**：纯计算，完全合规
- **Monkey Patch 有限私有状态**：`patchTargetIndex` + `patchMultiplier`，每关重置，语义清晰
- **词条间交互**：Decorator 和 Monkey Patch 是首批「修改其他词条效果」的词条，开辟全新设计空间

### 新词条总览

| 词条 | 中文名 | 机制 | 读共享 | 写共享 | 私有状态 | f() 形状 |
|------|--------|------|--------|--------|---------|---------|
| Decorator | 装饰器 | Phase 2 末尾放大 bonusPercent 总和 | bonusPercent | bonusPercent | 无 | 乘法放大 |
| Reflect | 反射 | 读 affixCount × level → bonus | skill 元数据 | bonusPercent | 无 | 离散阶梯 |
| Monkey Patch | 猴子补丁 | 每关随机修改一个同伴词条的效果 | skill.affixes | target.bonus | patchTargetIndex, patchMultiplier | 随机修改 |

## Stories

---

### Story 51.1: 元规则型 — 装饰器 (Decorator)

**复杂度: Medium**
**依赖: 无**

实现装饰器（Decorator）词条：Phase 2 末尾读取其他词条已累加的 bonusPercent 总和，按比例追加放大。

**范围：**
- 新增 `AffixType.Decorator = 'decorator'` 到枚举
- 更新 `AFFIX_CATEGORY_MAP`：归入 `meta_rule`
- `AffixInstance` 新增参数：`decoratorK: number`（放大比例）
- Phase 2 执行顺序修改：
  - 遍历 affixes 时跳过 Decorator 类型
  - 所有其他词条处理完毕后，再处理 Decorator：
  ```
  // Phase 2 末尾
  for (const dec of decoratorAffixes) {
    bonusPercent += bonusPercent × (dec.decoratorK ?? 0)
  }
  // 等价于 bonusPercent *= (1 + decoratorK)
  ```
- 更新 `AFFIX_NAMES` / `AFFIX_DESCRIPTIONS`
- 更新 `AFFIX_WEIGHT_TIERS`
- 更新 `KeyTooltip.ts`：AFFIX_COLORS
- 更新 `demo-i18n.ts`：中英文 name + desc
- 新增单元测试

**参数范围：**

| 参数 | 范围 | 基准 |
|------|------|------|
| decoratorK | 0.20~0.40 | 同伴 bonus +50% 时追加 +10~20% |

**数值验证（decoratorK=0.30）：**

| 同伴 bonusPercent | Decorator 追加 | 最终 |
|------------------|---------------|------|
| +20% | +6% | +26% |
| +100% | +30% | +130% |
| +200% | +60% | +260% |
| -50%(Taboo miss) | -15% | -65% ⚠️ 放大负值 |

**涌现交互：**
- 同技能词条越多/越强 → Decorator 价值越高
- Taboo miss 负 bonus → 被放大 → 风险（与 Counter 组合可对冲）
- MultiplyOperator 附魔(Phase 3) → 与 Decorator(Phase 2 尾) 双重乘法
- 单独存在（无其他词条）→ 放大 0 = 0 → 完全无效

**验收标准：**
- AC1: 同技能有其他词条时，Decorator 正确放大 bonusPercent
- AC2: 同技能无其他词条时（或其他词条 bonus=0），Decorator 无效果
- AC3: 负 bonusPercent 也被放大（不是 abs 放大）
- AC4: Decorator 在 Phase 2 其他词条之后执行（顺序正确）
- AC5: 多个 Decorator 共存时依次乘法（不是加法）
- AC6: 技能生成可产出 Decorator 词条
- AC7: 单元测试覆盖正值放大/负值放大/零值/多 Decorator

**估点：** 5

---

### Story 51.2: 元规则型 — 反射 (Reflect)

**复杂度: Small**
**依赖: 无**

实现反射（Reflect）词条：读取自身技能的词条数量和等级，计算综合分 → bonus。越完整越强。

**范围：**
- 新增 `AffixType.Reflect = 'reflect'` 到枚举
- 更新 `AFFIX_CATEGORY_MAP`：归入 `meta_rule`
- `AffixInstance` 新增参数：`reflectK: number`（每分的 bonusPercent）
- Phase 2 逻辑：
  ```
  reflectScore = skill.affixes.length × skill.level
  bonusPercent += reflectK × reflectScore
  ```
- 更新名称、描述、权重、tooltip、i18n
- 新增单元测试

**参数范围：**

| 参数 | 范围 | 基准 |
|------|------|------|
| reflectK | 0.04~0.08 | score=6(3词条Lv2) 时 +24~48% |

**数值验证（reflectK=0.06）：**

| 词条数 | 等级 | score | bonus |
|--------|------|-------|-------|
| 1 | 1 | 1 | +6% |
| 2 | 2 | 4 | +24% |
| 3 | 2 | 6 | +36% |
| 4 | 3 | 12 | +72% |

**涌现交互：**
- Exhaust/Ethereal 移除词条 → affixCount 降低 → Reflect 变弱 → 有意义的 tension
- 技能升级(level 2→3) → Reflect 直接变强 → 升级更有价值
- Twin(双附魔) → 不影响 affixCount → 正交
- Decorator → Reflect 的 bonus 被 Decorator 放大 → 联动

**验收标准：**
- AC1: 3 词条 Lv2 技能 bonus 明显高于 1 词条 Lv1
- AC2: Exhaust 移除词条后 reflectScore 立即下降
- AC3: 技能升级后 reflectScore 立即上升
- AC4: reflectScore 计算包含 Reflect 自身（自身也是一个词条）
- AC5: 技能生成可产出 Reflect 词条
- AC6: 单元测试覆盖各种词条数/等级组合 + Exhaust 移除后

**估点：** 3

---

### Story 51.3: 元规则型 — 猴子补丁 (Monkey Patch)

**复杂度: Medium**
**依赖: 无**

实现猴子补丁（Monkey Patch）词条：每关开始随机选同技能一个词条作为 target，该词条在 Phase 2 中的 bonusPercent 贡献乘以随机系数。

**范围：**
- 新增 `AffixType.MonkeyPatch = 'monkey_patch'` 到枚举
- 更新 `AFFIX_CATEGORY_MAP`：归入 `meta_rule`
- `AffixInstance` 新增参数：
  - `patchLow: number`（随机系数下界，如 0.5）
  - `patchHigh: number`（随机系数上界，如 2.0）
- `SkillRuntimeState` 新增字段：
  - `patchTargetIndex: number | null`（被补丁的词条索引，每关重置）
  - `patchMultiplier: number`（随机系数，每关重置，默认 1.0）
- 关卡开始时（`startLevel` 中）：
  ```
  for each skill with MonkeyPatch affix:
    candidates = skill.affixes 中非 MonkeyPatch 的索引列表
    if candidates.length === 0: patchTargetIndex = null; continue
    patchTargetIndex = randomChoice(candidates)
    patchMultiplier = randomRange(patchLow, patchHigh)
  ```
- Phase 2 修改：
  ```
  // 处理每个词条时检查是否被 patch
  let contribution = normalCalculation(affix)
  if (affixIndex === runtime.patchTargetIndex) {
    contribution *= runtime.patchMultiplier
  }
  bonusPercent += contribution
  ```
- 关卡结束时 patchTargetIndex 和 patchMultiplier 重置
- 商店 tooltip 显示 patch 范围（×0.5~2.0）
- 更新名称、描述、权重、tooltip、i18n
- 新增单元测试

**参数范围：**

| 参数 | 值 | 说明 |
|------|---|------|
| patchLow | 0.5 | 最差削弱到 50% |
| patchHigh | 2.0 | 最好增强到 200% |
| 期望值 | 1.25 | 略正 → 玩家期望收益为正 |

**数值验证（target 原本贡献 +40%）：**

| patchMultiplier | target 修正后 | 与原始差 |
|----------------|-------------|---------|
| 0.5 | +20% | -20% |
| 1.0 | +40% | ±0% |
| 1.5 | +60% | +20% |
| 2.0 | +80% | +40% |

**边界情况：**
- 同技能只有 MonkeyPatch → 无 target → 不生效
- target 被 Exhaust/Ethereal 移除 → patchTargetIndex 指向已移除词条 → null check，不生效
- target 是 Decorator → 放大 Decorator 的放大系数 → 二阶效果，有趣
- target 是 Reflect → 修改 Reflect 收益 → 合理
- 多个 MonkeyPatch → 各自独立选 target，可能选到同一个 → 乘法叠加

**涌现交互：**
- Exhaust(限次高倍率) 被 patch ×2.0 → 极端爆发但次数有限
- Taboo 被 patch ×0.5 → miss 惩罚减半 → 降低风险
- Counter + MonkeyPatch → Counter 保底 + MonkeyPatch 赌运气 → 赌徒构建
- 每关随机 → 每关体验不同 → 增加 run 的变化性

**验收标准：**
- AC1: 每关开始正确随机选 target 和 multiplier
- AC2: Phase 2 中 target 词条的贡献被正确乘以 multiplier
- AC3: 非 target 词条不受影响
- AC4: 无同伴词条时不生效
- AC5: target 被移除(Exhaust/Ethereal)后安全跳过
- AC6: patchMultiplier 在 [patchLow, patchHigh] 范围内均匀分布
- AC7: 关卡结束时 runtime 字段正确重置
- AC8: 技能生成可产出 Monkey Patch 词条
- AC9: 单元测试覆盖正常 patch/无同伴/target 移除/多 MonkeyPatch

**估点：** 5

---

### Story 51.4: 技能生成集成

**复杂度: Small**
**依赖: 51.1, 51.2, 51.3**

将 3 个新词条整合进技能生成系统。

**范围：**
- 更新 `skillGeneration.ts`：
  - Decorator: rollAffixParams 生成 decoratorK
  - Reflect: rollAffixParams 生成 reflectK
  - MonkeyPatch: rollAffixParams 生成 patchLow/patchHigh（按 rarity 扩大范围）
- 更新 `rollAffixWeights()`：新词条权重分档
  - Decorator/Reflect: 正常权重
  - MonkeyPatch: 稍低权重（有私有状态+随机性，不宜过多）
- 更新 `shop.ts`：
  - `buildAffixParamSummary`：展示参数
  - `computeSmartEstimate`：Decorator 不可预估（依赖同伴 bonus），Reflect 可精确预估（读元数据），MonkeyPatch 显示期望值范围
- 更新 `affixes.test.ts`：枚举数量更新，meta_rule 分类数量 9

**验收标准：**
- AC1: `generateSkill()` 可随机生成含新词条的技能
- AC2: MonkeyPatch 权重稍低于其他新词条
- AC3: Reflect 的 smartEstimate 精确计算
- AC4: 存档兼容（patchTargetIndex/patchMultiplier 默认值）
- AC5: exhaustive switch 编译通过

**估点：** 3

---

### Story 51.5: 数值平衡与 Playtest

**复杂度: Medium**
**依赖: 51.4**

对 3 个新词条进行数值平衡和交互验证。

**范围：**
- K 值调优
- 交互矩阵验证：

| 交互对 | 预期行为 | 验证 |
|--------|---------|------|
| Decorator + Convert/PhaseShift | 高 bonus 被放大 → 强联动 | |
| Decorator + Taboo miss | 负 bonus 被放大 → 风险 | |
| Decorator + Counter | Counter 先取消负值 → Decorator 放大 0 → 安全 | |
| Decorator + MultiplyOperator | Phase 2 尾×Phase 3 = 双重乘法 | |
| Reflect + Exhaust | 词条被移除 → score 降低 → tension | |
| Reflect + 技能升级 | level 提升 → score 提升 → 正协同 | |
| MonkeyPatch + Exhaust | Exhaust 高倍率被 ×2.0 → 极端爆发 | |
| MonkeyPatch + Decorator | patch Decorator → 修改放大系数 → 二阶 | |
| MonkeyPatch + Taboo | patch Taboo → miss 惩罚可能减半或加倍 | |
| Decorator + Reflect + MonkeyPatch | 三件套：Reflect 提供基础 bonus → Decorator 放大 → MonkeyPatch 随机调制 | |

- 极端场景：
  - Decorator: 同技能有 Leverage 爆仓(-100%) → Decorator 放大到 -130~140% → 极端但玩家可预见风险
  - Reflect: 4 词条 Lv3 → score=12 → +72% → 高但需要满配，合理
  - MonkeyPatch: ×2.0 命中 Exhaust(×2.5) → 单次产出 ×5.0 → 极端但 Exhaust 有次数限制
- Phase 2 执行顺序验证：Decorator 确实在最后执行

**验收标准：**
- AC1: 三个词条在不同构建中各有定位
- AC2: Decorator + 负值 组合不会导致游戏不可玩
- AC3: MonkeyPatch 的随机性不会主导游戏体验（权重受控）
- AC4: Phase 2 执行顺序正确（普通词条 → MonkeyPatch 修改 → Decorator 放大）
- AC5: 交互矩阵所有组合符合预期
- AC6: 至少 2 局完整 playtest 记录

**估点：** 5

---

## 依赖图

```
51.1 Decorator    ──┐
51.2 Reflect      ──┼── 51.4 技能生成集成 ── 51.5 平衡 Playtest
51.3 Monkey Patch ──┘
```

51.1/51.2/51.3 互不依赖，可并行开发。

## 总估点

| Story | 估点 |
|-------|------|
| 51.1 装饰器 (Decorator) | 5 |
| 51.2 反射 (Reflect) | 3 |
| 51.3 猴子补丁 (Monkey Patch) | 5 |
| 51.4 技能生成集成 | 3 |
| 51.5 数值平衡 | 5 |
| **合计** | **21** |
