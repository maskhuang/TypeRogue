---
title: "Epic 52: 质变扩展 — 34 个新质变效果"
epic_key: "epic-52"
status: "draft"
created: "2026-04-03"
design_source: "docs/affix-design-process.md §11.4-11.5"
stories:
  - "52-1-quest-data-infrastructure"
  - "52-2-quest-simple-phase2"
  - "52-3-quest-crit-system"
  - "52-4-quest-trigger-chain"
  - "52-5-quest-cross-system"
  - "52-6-quest-meta-lifecycle"
  - "52-7-generation-i18n"
  - "52-8-balance-playtest"
---

# Epic 52: 质变扩展 — 34 个新质变效果

## 背景

当前 54 个词条中 20 个有质变效果（已实现），34 个没有。本 Epic 为这 34 个词条实现质变效果，完成质变系统全覆盖。

### 设计来源

所有质变设计已在 `docs/affix-design-process.md` §11.4-11.5 中完成，每个质变都有：
- 质变名（中文）
- 设计模式（从 8 种模式库中选择）
- 具体效果描述
- 体感变化（之前→之后）

### 实现模式

每个质变需要：
1. `EnchantmentType` 枚举新值（如 `QuestParity`）
2. `QUEST_ENCHANTMENT_DEFS` 新条目
3. `QUEST_AFFIX_MAP` 新条目
4. `affixTrigger.ts` 中 `isTransformedForAffix()` 分支实现
5. `demo-i18n.ts` 中英文描述

### 按实现复杂度分组

| 组 | 类型 | 词条数 | 说明 |
|---|------|--------|------|
| A | Phase 2 简单修改 | 14 | 条件变更/值调整，只改 Phase 2 switch 分支 |
| B | 暴击系统 | 5 | 改 Phase 3 暴击判定/critMult 逻辑 |
| C | 触发链新增 | 7 | 需要 Phase 5/6 新增触发，或修改调度器 |
| D | 跨系统桥接 | 4 | 涉及多个系统（crit↔stack, word_sense→crit, resource routing） |
| E | 元规则/生命周期 | 4 | 修改词条生命周期（Innate/Counter/Exhaust/Ethereal） |

## Stories

---

### Story 52.1: 质变数据基础设施

**复杂度: Medium**
**依赖: 无**

为 34 个新质变注册 EnchantmentType 枚举、QUEST_ENCHANTMENT_DEFS、QUEST_AFFIX_MAP。

**范围：**
- `data/affixes.ts` — EnchantmentType 枚举新增 34 个值
- `data/affixes.ts` — QUEST_ENCHANTMENT_DEFS 新增 34 条
- `data/affixes.ts` — QUEST_AFFIX_MAP 新增 34 条
- `demo-i18n.ts` — 质变名称和描述中英文
- 测试：枚举数量、映射完整性

**验收标准：**
- AC1: 每个新词条都有对应的 QuestEnchantmentDef
- AC2: QUEST_AFFIX_MAP 覆盖全部 54 个 AffixType
- AC3: 编译通过

**估点：** 5

---

### Story 52.2: Phase 2 简单质变（14 个）

**复杂度: Medium**
**依赖: 52.1**

实现只需修改 Phase 2 switch 分支的质变效果。

**词条列表：**

| 词条 | 质变名 | 效果 |
|------|--------|------|
| Parity | 相变 | 切换奇偶时额外自触发 → 改为 Phase 2 中奇偶同时加成（isCrit 不需要） |
| Prime | 近似 | 非素数也有 primeK×1 固定小额加成 |
| Match | 入局 | 自身 stacks 也参与配对 |
| Entropy | 熵增 | 当前熵 > 上一个单词熵时 bonus 翻倍 |
| Cipher | 跃迁 | 距离 >13 的对额外翻倍 |
| Pattern | 破格 | 未知模式 bonus 翻倍 |
| Leverage | 保险 | 负 excess 保底 0 |
| Option | 加杠 | 行权后 optionK 翻倍 |
| Hedge | 全衡 | 自动选最均衡的两个资源 |
| PhaseShift | 超临界 | 气态时三态 K 值叠加 |
| Cluster | 塞音 | 所有辅音丛长度之和 |
| Coverage | 全谱 | Q/X/Z/J 额外×2 |
| Bigram | 密码 | 只取罕见前 50% |
| Flow | 瀑布 | 双向取绝对差值 |

**验收标准：**
- AC1: 每个质变在 isTransformedForAffix 检查下行为正确
- AC2: 未质变时行为不变
- AC3: 单元测试覆盖质变前/后

**估点：** 8

---

### Story 52.3: 暴击系统质变（5 个）

**复杂度: Medium**
**依赖: 52.1**

实现需要修改 Phase 3 暴击判定逻辑的质变。

| 词条 | 质变名 | 效果 |
|------|--------|------|
| Burst | 弹幕 | 3 连击时每次暴击额外触发一个邻居 |
| Sharpshooter | 狙击 | (1-critChance)×sharpK 同时作为 bonusPercent 和 critMult |
| Fallacy | 豪赌 | 暴击时减半而非归零 |
| Decay（已有净化，新增反转逻辑验证） | — | 验证现有质变与新词条交互 |
| Taboo（已有献祭，验证） | — | 验证现有质变与新词条交互 |

**实际新实现 3 个：** Burst/Sharpshooter/Fallacy

**验收标准：**
- AC1: Burst 3 连击时触发邻居
- AC2: Sharpshooter 质变后双写 bonusPercent + critMult
- AC3: Fallacy 暴击时 stacks 减半而非归零

**估点：** 5

---

### Story 52.4: 触发链质变（7 个）

**复杂度: Large**
**依赖: 52.1**

实现需要新增 Phase 5/6 触发或修改调度器的质变。

| 词条 | 质变名 | 效果 |
|------|--------|------|
| Parity | 相变 | 奇偶切换时额外自触发 |
| Resonance | 共振 | 自触发时也给触发源+1 叠层 |
| WarDrum | 战号 | 邻居暴击时+2 叠层 |
| Bridge | 枢纽 | 是桥时触发两侧各一个邻居 |
| Clique | 方阵 | 团内成员触发时获得等额 bonus |
| Confluence | 洪流 | 每种独特资源额外产出到该资源 |
| Turbulence | 风暴 | 额外读 stacks 极差 |

**注意：** Parity 的质变（切换时自触发）需要在 Phase 2 之外检测奇偶切换，是触发链类型而非简单 Phase 2 修改。从 52.2 移到这里。

**验收标准：**
- AC1: 各触发链质变正确入队调度器
- AC2: 不产生无限循环（链检测正常）
- AC3: 单元测试覆盖触发链行为

**估点：** 13

---

### Story 52.5: 跨系统桥接质变（4 个）

**复杂度: Medium**
**依赖: 52.1**

实现涉及跨系统桥接的质变。

| 词条 | 质变名 | 效果 | 桥接 |
|------|--------|------|------|
| Zero-In | 蓄能 | missStreak→stacks | crit→stack |
| Cipher | 破译 | 最大距离→暴击率 | word_sense→crit |
| Pattern | 编码 | 模式决定产出资源 | word_sense→resource routing |
| Hedge | 调控 | 额外产出到较少的资源 | numeric→resource routing |

**注意：** Cipher 和 Pattern 的质变比 52.2 复杂（跨系统），从 52.2 移到这里。Hedge 的质变也涉及资源路由。

**验收标准：**
- AC1: Zero-In 暴击时 missStreak 转为 stacks
- AC2: Cipher 质变后最大距离对加入 critChance
- AC3: Pattern 质变后资源类型由模式签名决定
- AC4: Hedge 质变后额外产出到较少资源

**估点：** 8

---

### Story 52.6: 元规则/生命周期质变（4+3 个）

**复杂度: Medium**
**依赖: 52.1**

实现修改词条生命周期的质变。

| 词条 | 质变名 | 效果 |
|------|--------|------|
| Innate | 觉醒 | 每打完一个单词时也自动触发 |
| Counter | 反噬 | 负值转化为下次 bonus |
| Exhaust | 燃尽 | 最后一次×3 |
| Ethereal | 永恒 | 50% 概率续命 |
| EndoExo | 永动 | 连续 3 次放热后超导 |
| Fusion | 恒星 | 成功后阈值永久降 10% |
| Component | 网络 | 分量内触发累积+1% |

**验收标准：**
- AC1: Innate 每词触发
- AC2: Counter 负值转正
- AC3: Exhaust 最后一次爆发
- AC4: Ethereal 概率续命
- AC5: EndoExo/Fusion/Component 运行时状态正确累积

**估点：** 8

---

### Story 52.7: 技能生成 + i18n + 商店集成

**复杂度: Small**
**依赖: 52.2~52.6**

确保所有新质变在商店/tooltip/附魔选择中正确展示。

**范围：**
- 质变描述在附魔选择 UI 中正确显示
- 质变在商店 tooltip 中显示已完成/未完成状态
- 附魔权重合理

**验收标准：**
- AC1: 所有 34 个新质变在附魔选择 UI 中可见
- AC2: 质变描述中英文正确
- AC3: exhaustive switch 编译通过

**估点：** 3

---

### Story 52.8: 数值平衡与 Playtest

**复杂度: Large**
**依赖: 52.7**

对 34 个新质变进行平衡验证。

**范围：**
- 质变后极端场景不爆炸
- 质变间无破坏性组合
- 质变解锁难度（getQuestEquipTarget）合理
- 至少 3 局包含新质变的 playtest

**估点：** 13

---

## 依赖图

```
52.1 数据基础设施
  ├── 52.2 Phase 2 简单质变 (14)
  ├── 52.3 暴击系统质变 (3)
  ├── 52.4 触发链质变 (7)  ← 最复杂
  ├── 52.5 跨系统桥接 (4)
  ├── 52.6 生命周期质变 (7)
  │
  └───┬── 52.7 集成 + i18n
       └── 52.8 平衡 Playtest
```

52.2~52.6 互不依赖，可并行。

## 总估点

| Story | 估点 |
|-------|------|
| 52.1 数据基础设施 | 5 |
| 52.2 Phase 2 简单质变 | 8 |
| 52.3 暴击系统质变 | 5 |
| 52.4 触发链质变 | 13 |
| 52.5 跨系统桥接 | 8 |
| 52.6 生命周期质变 | 8 |
| 52.7 集成 + i18n | 3 |
| 52.8 平衡 Playtest | 13 |
| **合计** | **63** |

## 质变完整映射表

| # | 词条 | 质变名 | EnchantmentType | Story |
|---|------|--------|----------------|-------|
| 1 | Resonance | 共振 | QuestResonance | 52.4 |
| 2 | WarDrum | 战号 | QuestWarDrum | 52.4 |
| 3 | Fallacy | 豪赌 | QuestFallacy | 52.3 |
| 4 | PhaseShift | 超临界 | QuestPhaseShift | 52.2 |
| 5 | EndoExo | 永动 | QuestEndoExo | 52.6 |
| 6 | Fusion | 恒星 | QuestFusion | 52.6 |
| 7 | Innate | 觉醒 | QuestInnate | 52.6 |
| 8 | Counter | 反噬 | QuestCounter | 52.6 |
| 9 | Exhaust | 燃尽 | QuestExhaust | 52.6 |
| 10 | Ethereal | 永恒 | QuestEthereal | 52.6 |
| 11 | Cluster | 塞音 | QuestCluster | 52.2 |
| 12 | Coverage | 全谱 | QuestCoverage | 52.2 |
| 13 | Bigram | 密码 | QuestBigram | 52.2 |
| 14 | Flow | 瀑布 | QuestFlow | 52.2 |
| 15 | Confluence | 洪流 | QuestConfluence | 52.4 |
| 16 | Turbulence | 风暴 | QuestTurbulence | 52.4 |
| 17 | Parity | 相变 | QuestParity | 52.4 |
| 18 | Prime | 近似 | QuestPrime | 52.2 |
| 19 | Match | 入局 | QuestMatch | 52.2 |
| 20 | Entropy | 熵增 | QuestEntropy | 52.2 |
| 21 | Cipher | 破译 | QuestCipher | 52.5 |
| 22 | Pattern | 编码 | QuestPattern | 52.5 |
| 23 | Leverage | 保险 | QuestLeverage | 52.2 |
| 24 | Option | 加杠 | QuestOption | 52.2 |
| 25 | Hedge | 调控 | QuestHedge | 52.5 |
| 26 | Burst | 弹幕 | QuestBurst | 52.3 |
| 27 | Zero-In | 蓄能 | QuestZeroIn | 52.5 |
| 28 | Sharpshooter | 狙击 | QuestSharpshooter | 52.3 |
| 29 | Bridge | 枢纽 | QuestBridge | 52.4 |
| 30 | Clique | 方阵 | QuestClique | 52.4 |
| 31 | Component | 网络 | QuestComponent | 52.6 |
| 32 | Decorator | 编译 | QuestDecorator | 52.2 |
| 33 | Reflect | 内省 | QuestReflect | 52.2 |
| 34 | MonkeyPatch | 热更新 | QuestMonkeyPatch | 52.2 |
