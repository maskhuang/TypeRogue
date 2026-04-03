---
title: "Epic 49: 暴击型扩展 — 精密射击领域 3 个新词条"
epic_key: "epic-49"
status: "draft"
created: "2026-04-03"
design_source: "design-affix skill session 2026-04-03"
domain: "精密射击"
category: "crit"
stories:
  - "49-0-crit-streak-infrastructure"
  - "49-1-crit-burst"
  - "49-2-crit-zero-in"
  - "49-3-crit-sharpshooter"
  - "49-4-generation-integration"
  - "49-5-balance-playtest"
---

# Epic 49: 暴击型扩展 — 精密射击领域 3 个新词条

## 背景

Epic 45 将暴击类别补齐至 6 个词条（Crit/Charge/Decay/Recurse/Taboo/Fallacy）。现有词条几乎全部操作 `critChance`，`critMult`（暴击倍率）作为动态维度被忽视。本 Epic 从精密射击领域引入 3 个新词条，全部操作 `critMult`，填补这一空白。

### 设计动机

现有暴击词条的操作维度：

| 维度 | 现有词条 | 本 Epic 新增 |
|------|---------|------------|
| critChance 调节 | Crit, Charge, Decay, Fallacy, Taboo | — |
| critMult 调节 | Crit(仅基础值) | **Burst, Zero-In, Sharpshooter** |
| 暴击后效果 | Recurse(重触发), Taboo(miss惩罚) | — |

### 核心映射

```
暴击事件序列 → 射击命中序列 → 射击学函数 f() → critMult 动态调节
```

| 词条 | f() | 射击类比 | 体感 |
|------|-----|---------|------|
| Burst | critStreak × k → critMult | 连射：越连越猛 | 维持连击的紧张感 |
| Zero-In | missStreak × k → critMult(暴击时释放) | 校准：偏了就调 | miss 补偿的安心感 |
| Sharpshooter | (1 - critChance) × k → critMult | 神射：难度越高越猛 | 低频高爆的刺激感 |

### 设计原则

- **填补 critMult 动态操作空白**：三个词条全部写 critMult，与现有 critChance 词条形成完整的暴击体系
- **critChance 偏好光谱**：Burst(高critChance最佳) → Zero-In(中低也有价值) → Sharpshooter(低critChance最佳)
- **新共享基础设施**：`critStreak` / `missStreak` 作为暴击系统的新共享计数器

### 新词条总览

| 词条 | 中文名 | 机制 | 读共享 | 写共享 | f() 形状 |
|------|--------|------|--------|--------|---------|
| Burst | 连射 | 连续暴击次数 → critMult 递增，miss 清零 | critStreak | critMult | 线性增长+断裂 |
| Zero-In | 校准 | 连续 miss 次数累积 → 下次暴击时 critMult 大增 | missStreak | critMult | 阶梯累积+释放 |
| Sharpshooter | 神射 | 暴击时 critChance 越低 critMult 加成越高 | critChance | critMult | 反比例 |

### 新共享基础设施

| 字段 | 类型 | 位置 | 语义 | 重置时机 |
|------|------|------|------|---------|
| `critStreak` | number | SkillRuntimeState | 连续暴击计数，miss 归零 | 每关开始 |
| `missStreak` | number | SkillRuntimeState | 连续 miss 计数，暴击归零 | 每关开始 |

两个字段互为镜像。暴击判定后：暴击 → critStreak+1, missStreak=0；miss → missStreak+1, critStreak=0。

**共读关系：**
- `critStreak`: Burst 读，未来可扩展
- `missStreak`: Zero-In 读，Fallacy 也可读（当前 Fallacy 自己追踪 miss，可重构为共读 missStreak）

## Stories

---

### Story 49.0: critStreak / missStreak 基础设施

**复杂度: Small**
**依赖: 无**

在暴击判定流程中新增 critStreak / missStreak 共享计数器。

**范围：**
- `SkillRuntimeState` 新增字段：
  - `critStreak: number`（默认 0）
  - `missStreak: number`（默认 0）
- 在暴击判定后（Phase 中暴击 roll 之后）更新：
  ```
  if isCrit:
    runtime.critStreak = (runtime.critStreak ?? 0) + 1
    runtime.missStreak = 0
  else:
    runtime.missStreak = (runtime.missStreak ?? 0) + 1
    runtime.critStreak = 0
  ```
- 每关开始时重置为 0
- 存档兼容：新字段有 `?? 0` 默认值
- 新增单元测试

**验收标准：**
- AC1: 暴击后 critStreak 递增，missStreak 归零
- AC2: miss 后 missStreak 递增，critStreak 归零
- AC3: 每关开始两者均重置为 0
- AC4: 旧存档无此字段时不崩溃（默认 0）
- AC5: 不影响现有暴击词条行为
- AC6: 单元测试覆盖连续暴击/连续miss/交替/关卡重置

**估点：** 2

---

### Story 49.1: 暴击型 — 连射 (Burst)

**复杂度: Small**
**依赖: 49.0**

实现连射（Burst）词条：连续暴击次数越多 critMult 越高，miss 时连击断裂清零。

**范围：**
- 新增 `AffixType.Burst = 'burst'` 到枚举
- 更新 `AFFIX_CATEGORY_MAP`：归入 `crit`
- `AffixInstance` 新增参数：`burstK: number`（每连击层的 critMult 加成）
- 暴击判定后逻辑：
  ```
  if isCrit:
    critMult += burstK × runtime.critStreak
  ```
  （critStreak 已在 49.0 中维护，Burst 只读不写）
- 更新 `AFFIX_NAMES` / `AFFIX_DESCRIPTIONS`
- 更新 `AFFIX_WEIGHT_TIERS`
- 更新 `KeyTooltip.ts`：AFFIX_COLORS
- 更新 `demo-i18n.ts`：中英文 name + desc
- 新增单元测试

**参数范围：**

| 参数 | 范围 | 基准 |
|------|------|------|
| burstK | 0.20~0.40 | 三连 critMult +0.6~1.2 |

**数值验证（burstK=0.30）：**

| critStreak | critMult 加成 |
|-----------|--------------|
| 1 | +0.30 |
| 3 | +0.90 |
| 5 | +1.50 |

**涌现交互：**
- Fallacy 提高 critChance → 帮助维持连击 → Burst 加成更持久
- Decay 暴击后降 critChance → 连击越长暴击率越低但倍率越高（tension）
- Recurse 暴击重触发 → 重触发也可能暴击 → 加速 critStreak

**验收标准：**
- AC1: 连续暴击时 critMult 递增
- AC2: miss 后下次暴击 critStreak=1（重新开始）
- AC3: 与 Decay 共存时两者效果同时生效
- AC4: 技能生成可产出 Burst 词条
- AC5: 单元测试覆盖连击/断裂/重新连击

**估点：** 3

---

### Story 49.2: 暴击型 — 校准 (Zero-In)

**复杂度: Small**
**依赖: 49.0**

实现校准（Zero-In）词条：连续 miss 累积补偿，下次暴击时 critMult 大幅增加。

**范围：**
- 新增 `AffixType.ZeroIn = 'zero_in'` 到枚举
- 更新 `AFFIX_CATEGORY_MAP`：归入 `crit`
- `AffixInstance` 新增参数：`zeroInK: number`（每 miss 层的 critMult 补偿）
- 暴击判定后逻辑：
  ```
  if isCrit:
    critMult += zeroInK × runtime.missStreak
    // missStreak 已在 49.0 中暴击时自动清零
  ```
  （Zero-In 只读 missStreak，不写）
- 更新名称、描述、权重、tooltip、i18n
- 新增单元测试

**参数范围：**

| 参数 | 范围 | 基准 |
|------|------|------|
| zeroInK | 0.15~0.30 | miss 3 次后 critMult +0.45~0.90 |

**数值验证（zeroInK=0.25）：**

| missStreak | 下次暴击 critMult 加成 |
|-----------|----------------------|
| 1 | +0.25 |
| 3 | +0.75 |
| 5 | +1.25 |

**与 Fallacy 互补分析：**
- Fallacy: miss → critChance 累积（提高概率）
- Zero-In: miss → critMult 累积（提高伤害）
- 两者共存：miss 越多 → 概率+伤害双补偿 → 终于暴击时超级大奖

**涌现交互：**
- Taboo(miss 惩罚) + Zero-In(miss 补偿) → 有趣的 tension
- Sharpshooter 在低 critChance 时加 critMult → 与 Zero-In 的大量 miss 场景重合 → 双重 critMult 爆发

**验收标准：**
- AC1: 连续 miss 后首次暴击 critMult 显著增加
- AC2: 连续暴击中（missStreak=0）Zero-In 无加成
- AC3: 与 Fallacy 共存时概率和倍率分别累积
- AC4: 技能生成可产出 Zero-In 词条
- AC5: 单元测试覆盖 miss 累积/暴击释放/连续暴击无效

**估点：** 3

---

### Story 49.3: 暴击型 — 神射 (Sharpshooter)

**复杂度: Small**
**依赖: 无**

实现神射（Sharpshooter）词条：暴击时 critChance 越低 critMult 加成越高。纯计算，无需新基础设施。

**范围：**
- 新增 `AffixType.Sharpshooter = 'sharpshooter'` 到枚举
- 更新 `AFFIX_CATEGORY_MAP`：归入 `crit`
- `AffixInstance` 新增参数：`sharpK: number`
- 暴击判定后逻辑：
  ```
  if isCrit:
    critMult += sharpK × (1 - critChance)
    // critChance 已含所有其他词条的修改
  ```
- 更新名称、描述、权重、tooltip、i18n
- 新增单元测试

**参数范围：**

| 参数 | 范围 | 基准 |
|------|------|------|
| sharpK | 1.00~2.00 | critChance=30% 时 critMult +0.70~1.40 |

**期望收益验证（sharpK=1.50）：**

| critChance | 每次暴击加成 | 期望加成(×critChance) |
|-----------|-------------|---------------------|
| 10% | +1.35 | 0.135 |
| 30% | +1.05 | 0.315 |
| 50% | +0.75 | 0.375 ← 峰值 |
| 70% | +0.45 | 0.315 |
| 90% | +0.15 | 0.135 |

✅ 期望收益在 50% 时峰值，两端对称衰减，无爆炸风险。

**涌现交互：**
- 与所有加 critChance 的词条形成 tension（频率↑单次↓）
- Decay(暴击后降 critChance) → 正向协同：Decay 降率后 Sharpshooter 下次暴击加倍更多
- Burst + Sharpshooter: 低 critChance 时 Burst 连击难维持但 Sharpshooter 单次高 → 互斥构建方向

**验收标准：**
- AC1: critChance=10% 暴击时 critMult 加成远大于 critChance=80% 时
- AC2: critChance=100% 时加成为 0
- AC3: 未暴击时无效果
- AC4: 期望收益曲线在 critChance=50% 附近峰值
- AC5: 与 Decay 共存时协同效果正确
- AC6: 技能生成可产出 Sharpshooter 词条
- AC7: 单元测试覆盖低/中/高 critChance + 未暴击

**估点：** 3

---

### Story 49.4: 技能生成集成

**复杂度: Small**
**依赖: 49.1, 49.2, 49.3**

将 3 个新词条整合进技能生成系统。

**范围：**
- 更新 `skillGeneration.ts`：为 Burst/ZeroIn/Sharpshooter 添加 `rollAffixParams` switch case 和参数表
- 更新 `rollAffixWeights()`：新词条权重分档
- 更新 `shop.ts`：
  - `buildAffixParamSummary`：展示 burstK/zeroInK/sharpK
  - `computeSmartEstimate`：三个词条依赖暴击事件实时序列，不可预估，定性描述
- 更新 `affixes.test.ts`：枚举数量更新，crit 分类数量 9

**验收标准：**
- AC1: `generateSkill()` 可随机生成含新词条的技能
- AC2: 商店 tooltip 正确展示参数
- AC3: 存档兼容（critStreak/missStreak 默认 0）
- AC4: exhaustive switch 编译通过

**估点：** 3

---

### Story 49.5: 数值平衡与 Playtest

**复杂度: Medium**
**依赖: 49.4**

对 3 个新词条进行数值平衡和交互验证。

**范围：**
- K 值调优
- 交互矩阵验证：

| 交互对 | 预期行为 | 验证 |
|--------|---------|------|
| Burst + Fallacy | Fallacy 提高 critChance → 帮助维持连击 | |
| Burst + Decay | Decay 降 critChance → 连击越长越难维持（tension） | |
| Burst + Recurse | Recurse 重触发可能暴击 → 额外连击层 | |
| Zero-In + Fallacy | miss → 概率+伤害双补偿 → 暴击时大奖 | |
| Zero-In + Taboo | Taboo miss 惩罚 + Zero-In miss 补偿 → tension | |
| Sharpshooter + Decay | Decay 降率 → Sharpshooter 加倍更多（正协同） | |
| Sharpshooter + Burst | 互斥构建方向（高频低爆 vs 低频高爆） | |
| Sharpshooter + Crit(高critChance) | 高 critChance → Sharpshooter 加成低（anti-synergy） | |
| 三者共存 | Burst 要高率维持连击，Sharpshooter 要低率 → 不应同时选 | |

- 极端场景：
  - Burst: critStreak=10（极罕见连续 10 暴击）→ critMult +3.0 → 总 ~5.0，极端但需要极低概率事件
  - Zero-In: missStreak=10（critChance=10% 场景）→ critMult +2.5 → 总 ~4.0，合理
  - Sharpshooter: critChance=5% 时 critMult +1.43 → 但暴击极少，期望收益仅 0.07

**验收标准：**
- AC1: critChance 偏好光谱清晰——Burst(高) / Zero-In(中低) / Sharpshooter(低)
- AC2: 三个词条与现有 6 个 crit 词条无冲突
- AC3: critStreak/missStreak 基础设施不影响现有词条行为
- AC4: 交互矩阵所有组合符合预期
- AC5: 帧预算合规
- AC6: 至少 2 局完整 playtest 记录

**估点：** 5

---

## 依赖图

```
49.0 critStreak/missStreak 基础设施
  ├── 49.1 Burst
  ├── 49.2 Zero-In
  │
  49.3 Sharpshooter (无依赖，可与 49.0 并行)
  │
  └───┬── 49.4 技能生成集成 ── 49.5 平衡 Playtest
```

49.0 和 49.3 可并行。49.1/49.2 依赖 49.0。

## 总估点

| Story | 估点 |
|-------|------|
| 49.0 critStreak/missStreak 基础设施 | 2 |
| 49.1 连射 (Burst) | 3 |
| 49.2 校准 (Zero-In) | 3 |
| 49.3 神射 (Sharpshooter) | 3 |
| 49.4 技能生成集成 | 3 |
| 49.5 数值平衡 | 5 |
| **合计** | **19** |
