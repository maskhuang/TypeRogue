---
title: "Story 19.6: 附魔系统（33 个）"
epic: "Epic 19: 技能体系重构"
story_key: "19-6-enchantment-system"
status: "done"
created: "2026-03-03"
updated: "2026-03-04"
depends_on: ["19-3-keyboard-topology", "19-4-converter-framework", "19-5-connector-framework"]
---

# Story 19.6: 附魔系统（33 个）

## Story

作为一个 **玩家**，
我想要 **技能升到 Lv3 时进化获得附魔，根据键盘位置关系产生额外效果**，
以便 **通过附魔选择进一步深化键盘布局策略，创造独特的邻居效应 build**。

## 背景与上下文

附魔是产出者/转化者的 Lv3 进化机制。与旧技能体系中每技能独有的进化分支（如 burst → burst_inferno）不同，附魔是一个 **通用池**：任何产出者/转化者升到 Lv3 时，从 33 个附魔中随机抽 2 选 1 附上。

核心设计意图：附魔让邻居效应产生**新行为**（溅射、免费触发、空位加成），而非简单 +10%。玩家选择附魔后，技能布局的价值进一步提升。

**与现有进化系统的关系：**
- 旧技能（burst/amp/freeze 等）保留自己的 `EVOLUTIONS` 进化分支
- 新技能（产出者/转化者）使用附魔系统进化
- 连接者固定 Lv1，不可进化

## Acceptance Criteria

- [x] AC1: `EnchantmentDefinition` 接口定义完成：category(spatial/transmutation/independent), spatialType?, positionRelation?, effectParams
- [x] AC2: 24 个空间型附魔实现（4 效果类型 × 6 位置关系）：增幅/溅射/共鸣/排斥，每个位置关系有不同百分比
- [x] AC3: 5 个变性型附魔实现：触发时额外产出另一种资源（增量 × 系数）
- [x] AC4: 4 个独立型附魔实现：先手(×2)/终幕(×3)/一刀(首×2.5 递减×0.7)/渴血(资源越低越强)
- [x] AC5: 空间型附魔正确使用 KeyboardTopology 查询位置关系（hasRelation/getKeysWithRelation）
- [x] AC6: 变性型附魔产出的额外资源**可以**触发连接者的 checkResourceTriggers（设计意图：有达成难度的无限是奖励）
- [x] AC7: 附魔效果在战斗中正确触发并有视觉反馈（附加浮字标注附魔名 + 效果）
- [x] AC8: 技能达 Lv3 时触发进化 UI：从附魔池随机抽 2 个，点击选择 1 个附上（复用现有 evolution-modal）
- [x] AC9: 仅产出者 + 转化者可附魔（连接者不可，旧技能走原进化系统）
- [x] AC10: 单元测试覆盖每种附魔类型的效果计算 + 进化流程

## Tasks / Subtasks

- [x] Task 1: EnchantmentDefinition 接口与 33 个附魔数据 (AC: 1, 2, 3, 4)
  - [x] 1.1 `types.ts` 新增 `EnchantmentCategory`, `SpatialEffectType`, `EnchantmentDefinition` 接口
  - [x] 1.2 `types.ts` GameState/PlayerState 新增 `enchantedSkills: Map<string, string>` (skillId → enchantmentId)
  - [x] 1.3 新建 `src/src/data/enchantments.ts`，定义 24 个空间型附魔数据（含每位置关系不同百分比）
  - [x] 1.4 同文件定义 5 个变性型附魔数据（系数：base 0.3/score 0.3/mult 0.1/time 0.2/shield 0.15）
  - [x] 1.5 同文件定义 4 个独立型附魔数据
  - [x] 1.6 工具函数：`isEnchantment()`, `getEnchantmentDesc()`, `drawEnchantmentPair()` (随机抽 2 个不重复)

- [x] Task 2: 附魔效果引擎 — 增幅型 + 排斥型 (AC: 2, 5)
  - [x] 2.1 `skills.ts` 新增 `getEnchantmentMultiplier(skillId, triggerKey)` — 计算增幅/排斥倍率
  - [x] 2.2 修改 `triggerProducer(producerId, triggerKey?)` — 增加 triggerKey 参数，应用附魔倍率
  - [x] 2.3 修改 `triggerConverter(converterId, triggerKey?)` — 同上
  - [x] 2.4 增幅型：`1 + skillCount * percent`（skillCount = 位置关系内绑定技能数）
  - [x] 2.5 排斥型：`1 + emptyCount * percent`（emptyCount = 位置关系内空位数）

- [x] Task 3: 附魔效果引擎 — 溅射型 (AC: 2, 5, 7)
  - [x] 3.1 `skills.ts` 新增 `applySplashEnchantment(skillId, triggerKey, baseValue, resourceType)` — 触发后对位置关系内技能触发（效果 × 百分比）
  - [x] 3.2 在 triggerProducer/triggerConverter 末尾调用溅射检查
  - [x] 3.3 溅射触发的技能不再递归溅射（防止无限）

- [x] Task 4: 附魔效果引擎 — 共鸣型 (AC: 2, 5, 7)
  - [x] 4.1 `skills.ts` 新增 `checkResonanceTriggers(sourceKey, chainHistory)` — 当任何技能触发时，检查位置关系内有共鸣附魔的技能
  - [x] 4.2 共鸣触发效果 = 原始效果 × 百分比
  - [x] 4.3 共鸣不递归触发共鸣（防止无限）
  - [x] 4.4 在 triggerSkill 末尾调用 checkResonanceTriggers

- [x] Task 5: 附魔效果引擎 — 变性型 (AC: 3, 6)
  - [x] 5.1 在 triggerProducer/triggerConverter 效果应用后，检查变性附魔
  - [x] 5.2 计算额外资源 = 目标资源增量 × 系数，写入对应资源
  - [x] 5.3 额外产出调用 `checkResourceTriggers` 触发连接者链

- [x] Task 6: 附魔效果引擎 — 独立型 (AC: 4)
  - [x] 6.1 先手🏁：`synergy.wordSkillCount === 0` 时效果 ×2
  - [x] 6.2 终幕🎆：当前字母是本词最后一个绑定键位时效果 ×3
  - [x] 6.3 一刀🔪：`synergy.decayCounters` 跟踪本词触发次数，效果 = base × (2.5 × 0.7^count)
  - [x] 6.4 渴血🏜️：效果 × (1 + 2 × (1 - resourceRatio))，0% 时 ×3

- [x] Task 7: 进化流程集成 (AC: 8, 9)
  - [x] 7.1 `shop.ts` 修改 Lv3 升级逻辑：产出者/转化者走附魔选择，旧技能走原进化分支
  - [x] 7.2 复用 evolution-modal UI：渲染 2 个附魔卡片（名字、emoji、效果预览）
  - [x] 7.3 选择后写入 `state.player.enchantedSkills.set(skillId, enchantmentId)`
  - [x] 7.4 连接者 Lv3 路径不应存在（isConnector 已过滤升级）

- [x] Task 8: 显示集成 (AC: 7)
  - [x] 8.1 `data/skills.ts` getSkillDisplayInfo：附魔技能描述追加附魔效果
  - [x] 8.2 `battle.ts` renderBattleSkills：附魔技能显示附魔 emoji 叠加
  - [x] 8.3 `shop.ts` renderBuildManager：附魔技能在键盘网格显示标记

- [x] Task 9: 测试 (AC: 10)
  - [x] 9.1 数据完整性：33 个附魔、id 唯一、字段齐全、分类正确
  - [x] 9.2 增幅型：不同位置关系的邻居计数和倍率计算
  - [x] 9.3 溅射型：触发目标正确、效果百分比正确、不递归
  - [x] 9.4 共鸣型：位置关系内技能触发时自身触发、百分比正确、不递归
  - [x] 9.5 排斥型：空位计数和倍率计算
  - [x] 9.6 变性型：额外资源产出值 + 连接者链触发
  - [x] 9.7 独立型：先手/终幕/一刀/渴血各条件和倍率
  - [x] 9.8 进化流程：drawEnchantmentPair 不重复、选择后绑定正确

## Dev Notes

### 核心设计：附魔不是新技能类型

附魔是产出者/转化者的**进化修饰器**，不是第四种技能类型。附魔不直接放在键盘上，而是附着在已有的 Lv3 产出者/转化者上，改变其触发行为。

### 33 个附魔完整数据表

**空间型 — 增幅（6 个）"我因邻居变强"：**

| 位置关系 | ID | emoji | 名字 | 效果 |
|---|---|---|---|---|
| Adjacent | ench_amplify_adjacent | 🧲 | 吸附 | 相邻每有一个技能，自身 +20% |
| SameRow | ench_amplify_sameRow | 🧲📡 | 列阵 | 同行每有一个技能，自身 +15% |
| SameColumn | ench_amplify_sameColumn | 🧲📌 | 立柱 | 同列每有一个技能，自身 +25% |
| SameHand | ench_amplify_sameHand | 🧲🤝 | 握拳 | 同手每有一个技能，自身 +8% |
| SameFinger | ench_amplify_sameFinger | 🧲👆 | 聚指 | 同指每有一个技能，自身 +30% |
| Symmetric | ench_amplify_symmetric | 🧲🪞 | 引力 | 对称位有技能时，自身 +40% |

**空间型 — 溅射（6 个）"我让邻居变强"：**

| 位置关系 | ID | emoji | 名字 | 效果 |
|---|---|---|---|---|
| Adjacent | ench_splash_adjacent | 💫 | 波及 | 触发时相邻技能获得本次效果 30% |
| SameRow | ench_splash_sameRow | 💫📡 | 横扫 | 触发时同行技能获得本次效果 20% |
| SameColumn | ench_splash_sameColumn | 💫📌 | 穿刺 | 触发时同列技能获得本次效果 35% |
| SameHand | ench_splash_sameHand | 💫🤝 | 普照 | 触发时同手技能获得本次效果 10% |
| SameFinger | ench_splash_sameFinger | 💫👆 | 灌注 | 触发时同指技能获得本次效果 40% |
| Symmetric | ench_splash_symmetric | 💫🪞 | 投影 | 触发时对称位技能获得本次效果 50% |

**空间型 — 共鸣（6 个）"邻居带我白嫖"：**

| 位置关系 | ID | emoji | 名字 | 效果 |
|---|---|---|---|---|
| Adjacent | ench_resonance_adjacent | 🔔 | 感应 | 相邻技能触发时，自身触发一次（50%效果）|
| SameRow | ench_resonance_sameRow | 🔔📡 | 合唱 | 同行技能触发时，自身触发一次（30%效果）|
| SameColumn | ench_resonance_sameColumn | 🔔📌 | 回声 | 同列技能触发时，自身触发一次（40%效果）|
| SameHand | ench_resonance_sameHand | 🔔🤝 | 同频 | 同手技能触发时，自身触发一次（15%效果）|
| SameFinger | ench_resonance_sameFinger | 🔔👆 | 连带 | 同指技能触发时，自身触发一次（50%效果）|
| Symmetric | ench_resonance_symmetric | 🔔🪞 | 心电 | 对称位技能触发时，自身触发一次（60%效果）|

**空间型 — 排斥（6 个）"空位让我更强"：**

| 位置关系 | ID | emoji | 名字 | 效果 |
|---|---|---|---|---|
| Adjacent | ench_repulsion_adjacent | 🕳️ | 虚无 | 相邻每个空位，自身 +25% |
| SameRow | ench_repulsion_sameRow | 🕳️📡 | 荒原 | 同行每个空位，自身 +10% |
| SameColumn | ench_repulsion_sameColumn | 🕳️📌 | 深渊 | 同列每个空位，自身 +30% |
| SameHand | ench_repulsion_sameHand | 🕳️🤝 | 寂灭 | 同手每个空位，自身 +5% |
| SameFinger | ench_repulsion_sameFinger | 🕳️👆 | 断指 | 同指每个空位，自身 +35% |
| Symmetric | ench_repulsion_symmetric | 🕳️🪞 | 空镜 | 对称位为空时，自身 +50% |

**变性型（5 个）"额外产出另一种资源"：**

| 额外资源 | ID | emoji | 名字 | 系数 |
|---|---|---|---|---|
| base | ench_trans_base | ⚔️✨ | 附力 | 增量 ×0.3 → 基数 |
| score | ench_trans_score | 🪙✨ | 附金 | 增量 ×0.3 → 分数 |
| multiplier | ench_trans_multiplier | 🔥✨ | 附焰 | 增量 ×0.1 → 倍率 |
| time | ench_trans_time | ⏳✨ | 附时 | 增量 ×0.2 → 时间 |
| shield | ench_trans_shield | 🛡️✨ | 附甲 | 增量 ×0.15 → 护盾 |

**独立型（4 个）"不依赖位置关系"：**

| ID | emoji | 名字 | 效果 |
|---|---|---|---|
| ench_pioneer | 🏁 | 先手 | 本词第一个触发时效果 ×2 |
| ench_finale | 🎆 | 终幕 | 本词最后一个绑定键触发时效果 ×3 |
| ench_decay | 🔪 | 一刀 | 首次触发 ×2.5，后续每次 ×0.7 递减 |
| ench_thirst | 🏜️ | 渴血 | 对应资源越低效果越强（0% 时 ×3）|

### 附魔效果引擎设计

**增幅型 + 排斥型（修改触发值）：**
```typescript
// 在 triggerProducer/triggerConverter 内部，计算 base value 后
function getEnchantmentMultiplier(skillId: string, triggerKey: string): number {
  const enchId = state.player.enchantedSkills?.get(skillId);
  if (!enchId) return 1;
  const ench = ENCHANTMENTS[enchId];
  if (!ench) return 1;

  if (ench.spatialType === 'amplify') {
    const related = getKeysWithRelation(triggerKey, ench.positionRelation!);
    const skillCount = related.filter(k => state.player.bindings.has(k)).length;
    return 1 + skillCount * ench.effectValue;  // e.g. 1 + 3 * 0.20 = 1.60
  }
  if (ench.spatialType === 'repulsion') {
    const related = getKeysWithRelation(triggerKey, ench.positionRelation!);
    const emptyCount = related.filter(k => !state.player.bindings.has(k)).length;
    return 1 + emptyCount * ench.effectValue;
  }
  // 独立型倍率
  if (ench.category === 'independent') return getIndependentMultiplier(ench, skillId);
  return 1;
}
```

**溅射型（触发后扩散）：**
```typescript
// triggerProducer/triggerConverter 末尾调用
function applySplashEnchantment(skillId: string, triggerKey: string): void {
  const enchId = state.player.enchantedSkills?.get(skillId);
  const ench = ENCHANTMENTS[enchId];
  if (!ench || ench.spatialType !== 'splash') return;

  const related = getKeysWithRelation(triggerKey, ench.positionRelation!);
  for (const key of related) {
    const sid = state.player.bindings.get(key);
    if (!sid || isConnector(sid)) continue;
    // 以减效触发目标技能（标记 isSplash 防止递归溅射）
    triggerWithReduction(sid, key, ench.effectValue); // 0.30 = 30%
  }
}
```

**共鸣型（被动监听）：**
```typescript
// triggerSkill 末尾调用（类似 checkResourceTriggers 但监听技能触发，非资源产出）
function checkResonanceTriggers(sourceKey: string): void {
  for (const [enchKey, sid] of state.player.bindings) {
    if (enchKey === sourceKey) continue;
    const enchId = state.player.enchantedSkills?.get(sid);
    const ench = ENCHANTMENTS[enchId];
    if (!ench || ench.spatialType !== 'resonance') continue;
    if (!hasRelation(sourceKey, enchKey, ench.positionRelation!)) continue;
    // 以减效触发附魔技能（标记 isResonance 防止递归）
    triggerWithReduction(sid, enchKey, ench.effectValue);
  }
}
```

**变性型（额外资源产出）：**
```typescript
// triggerProducer/triggerConverter 末尾
function applyTransmutationEnchantment(skillId: string, triggerKey: string, delta: number): void {
  const enchId = state.player.enchantedSkills?.get(skillId);
  const ench = ENCHANTMENTS[enchId];
  if (!ench || ench.category !== 'transmutation') return;

  const extraValue = delta * ench.effectValue; // delta × 0.3
  state.resources[ench.extraResource!] += extraValue;
  // 额外产出可触发连接者
  checkResourceTriggers(ench.extraResource!, triggerKey, [triggerKey]);
}
```

### triggerProducer/triggerConverter 修改要点

**需要增加 `triggerKey` 参数**（当前没有）：

```typescript
// 修改前：
export function triggerProducer(producerId: string): void {
// 修改后：
export function triggerProducer(producerId: string, triggerKey?: string): void {

// triggerSkill 调用处已有 triggerKey：
if (isProducer(skillId)) {
  triggerProducer(skillId, triggerKey);  // 传递 triggerKey
  checkResourceTriggers(PRODUCERS[skillId].resource, triggerKey, chain);
  return;
}

// 伪无限调用处用参与者 key：
for (const key of keys) {
  const sid = state.player.bindings.get(key);
  if (isProducer(sid)) triggerProducer(sid, key);  // 伪无限也传 key
}
```

### 防递归设计

溅射和共鸣都可能导致无限递归：
1. **溅射不递归溅射** — 溅射触发的技能即使有溅射附魔也不再溅射（传递 `isSplash: true` 标记）
2. **共鸣不递归共鸣** — 共鸣触发的技能即使有共鸣附魔也不再触发共鸣（传递 `isResonance: true` 标记）
3. **变性型产出可触发连接者** — 这是设计意图（AC6），但连接者的三层保护已能防止真无限

### 进化 UI 复用

现有 `evolution-modal` 已有完整的 UI 框架（Story 15.2）：
- `renderEvolutionModal(skillId, isFree)` — 渲染进化选择
- `evolveSkill(skillId, branchId, cost)` — 执行进化

修改点：
1. 检测：当 `checkAutoEvolution(skillId)` 发现 Lv3 + 产出者/转化者 → 走附魔路径
2. 渲染：用 `drawEnchantmentPair()` 获取 2 个附魔 → 渲染到 modal
3. 选择：写入 `state.player.enchantedSkills.set(skillId, enchId)` 而非 `evolvedSkills`

### 文件修改清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/src/core/types.ts` | 修改 | +EnchantmentCategory, SpatialEffectType, EnchantmentDefinition; PlayerState +enchantedSkills |
| `src/src/core/state.ts` | 修改 | createInitialState: player.enchantedSkills: new Map() |
| `src/src/data/enchantments.ts` | **新建** | 33 个附魔数据 + isEnchantment/getEnchantmentDesc/drawEnchantmentPair |
| `src/src/systems/skills.ts` | 修改 | triggerProducer/triggerConverter +triggerKey; +getEnchantmentMultiplier, applySplashEnchantment, checkResonanceTriggers, applyTransmutationEnchantment |
| `src/src/data/skills.ts` | 修改 | getSkillDisplayInfo 支持附魔描述追加 |
| `src/src/systems/shop.ts` | 修改 | checkAutoEvolution 产出者/转化者走附魔路径, renderEnchantmentModal |
| `src/src/systems/battle.ts` | 修改 | 附魔视觉标记 |
| `src/tests/unit/data/enchantments.test.ts` | **新建** | 数据完整性 + 工具函数 |
| `src/tests/unit/systems/enchantment-effects.test.ts` | **新建** | 附魔效果引擎测试 |

### Anti-patterns — 不要做的事

1. **不要创建单独的 EnchantmentEngine 类** — 用平级函数（getEnchantmentMultiplier, applySplashEnchantment 等），与 triggerProducer/triggerConverter 保持一致
2. **不要修改旧技能的进化系统** — EVOLUTIONS/EVOLUTION_MODIFIER_DEFS 保持不变，附魔仅影响产出者/转化者
3. **不要让溅射/共鸣递归** — 传递标记防止无限递归
4. **不要给附魔创建新的 CSS class** — 复用 `.school-enchantment`（同 school 模式）
5. **不要用 Proxy 监听资源变化** — 显式调用附魔效果函数
6. **不要改变 triggerSkill 的 public API** — 附魔逻辑在 triggerProducer/triggerConverter 内部处理
7. **不要将附魔数据放入 SKILLS/PRODUCERS/CONVERTERS** — 独立的 ENCHANTMENTS 记录

### Previous Story Intelligence（19.5 连接者）

- **数据文件模式**: `CONNECTORS` 用 `Record<string, ConnectorDefinition>` + `as const` → ENCHANTMENTS 同样
- **工具函数模式**: `isConnector/getConnectorDesc/drawConnectorPool` → `isEnchantment/getEnchantmentDesc/drawEnchantmentPair`
- **位置关系查询**: `hasRelation(a, b, relation)` + `getKeysWithRelation(key, relation)` 来自 keyboardTopology
- **positionRelation 用 PositionRelation 枚举**，不用 string（19.5 code review 修复）
- **商店集成**: 19.5 code review 修复了所有 SKILLS || PRODUCERS || CONVERTERS || CONNECTORS 查询点 — 附魔不进商店池（不可直接购买），但 getSkillDisplayInfo 需要显示附魔信息
- **Code review 常见发现**: 闭包捕获旧变量、UI lookup 缺少新类型、反馈文字 undefined — 注意在所有 lookup 点处理附魔

### Git Intelligence

最近 5 次提交均为 Epic 19 stories：
```
734432c Story 19.5 — connectors.ts + skills.ts + shop.ts + tests (附 code review 修复)
111cf72 Story 19.4 — converters.ts + skills.ts + shop.ts + tests
42814c5 Story 19.3 — keyboardTopology.ts
65279c3 Story 19.2 — producers.ts
6d30b0d Story 19.1 — types.ts/state.ts 资源系统
```

文件变更模式一致：types.ts → data/*.ts (新) → skills.ts → shop.ts → battle.ts → data/skills.ts → tests

### 设计文档参考

- [Source: docs/brainstorming-session-2026-03-03.md#附魔系统] — 33 个附魔完整数据表（名字、emoji、效果、百分比）
- [Source: docs/brainstorming-session-2026-03-03.md#设计原则6] — 邻居效应 = 新行为 > 纯数值
- [Source: docs/gdd.md#附魔系统] — 33 附魔总数、Lv3 进化机制
- [Source: docs/gdd.md#技能升级] — 产出者 Lv3 ×2.4 / 转化者 Lv3 k×2.0 + 可附魔
- [Source: docs/stories/epic-19-skill-system-redesign.md] — Epic 19 总体架构
- [Source: src/src/data/keyboardTopology.ts] — 6 种位置关系查询 API
- [Source: src/src/data/connectors.ts] — 位置关系数据文件模板
- [Source: src/src/systems/shop.ts#checkAutoEvolution] — 现有进化检查逻辑（需修改）

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Completion Notes List

- Task 1: 定义 EnchantmentDefinition 接口 + 33 个附魔数据 + 工具函数（isEnchantment/getEnchantmentDesc/drawEnchantmentPair）
- Task 2: getEnchantmentMultiplier 实现增幅/排斥倍率计算；triggerProducer/triggerConverter 增加 triggerKey 参数
- Task 3: applySplashEnchantment 溅射实现 + _splashActive 防递归标志 + triggerProducerWithReduction/triggerConverterWithReduction
- Task 4: checkResonanceTriggers 共鸣实现 + _resonanceActive 防递归标志；在 triggerSkill 3 个分支末尾调用
- Task 5: applyTransmutationEnchantment 变性实现；额外产出调用 checkResourceTriggers 触发连接者链
- Task 6: getIndependentMultiplier 独立型 4 种倍率（pioneer/finale/decay/thirst）；synergy.decayCounters 每词重置
- Task 7: checkAutoEvolution 路由产出者/转化者到 renderEnchantmentModal；applyEnchantment 写入 enchantedSkills；卖出时清理
- Task 8: getSkillDisplayInfo 新增 enchantedSkills 参数；附魔技能名称/icon/描述追加附魔信息
- Task 9: 38 个新测试覆盖数据完整性、增幅、排斥、溅射、共鸣、变性、独立型、进化流程

### Change Log

- 2026-03-04: Story 19.6 完成。新增 33 个附魔系统，包括 4 种空间型效果引擎（增幅/溅射/共鸣/排斥）、5 种变性型（额外资源产出）、4 种独立型（先手/终幕/一刀/渴血）。集成 Lv3 进化流程和显示系统。38 个新测试全部通过。
- 2026-03-04: Code review 修复 5 项问题：
  1. [BUG-HIGH] triggerProducerWithReduction 乘法型双重 reduction → 修复为 `1 + (baseValue-1)*reduction`
  2. [BUG-MED] 溅射反馈乘法型显示格式 +X → ×X
  3. [MISSING-TEST] 新增 ench_finale 运行时测试（2 个 case）
  4. [SIDE-EFFECT] getIndependentMultiplier(ench_decay) 副作用提取到 advanceDecayCounter，getter 变纯函数
  5. [DUPLICATION] 减效触发函数与主触发函数行为差异大，保留独立函数 + 添加注释说明

### File List

- src/src/core/types.ts (modified) — +EnchantmentCategory, SpatialEffectType, EnchantmentDefinition; PlayerState +enchantedSkills; SynergyState +decayCounters
- src/src/core/state.ts (modified) — createInitialState: +enchantedSkills Map; createSynergyState: +decayCounters Map
- src/src/data/enchantments.ts (new) — 33 个附魔数据 + isEnchantment/getEnchantmentDesc/drawEnchantmentPair
- src/src/systems/skills.ts (modified) — +getEnchantmentMultiplier, +getIndependentMultiplier, +advanceDecayCounter, +applySplashEnchantment, +checkResonanceTriggers, +applyTransmutationEnchantment, +applyPostTriggerEnchantments; triggerProducer/triggerConverter +triggerKey 参数 + 附魔倍率; triggerProducerWithReduction 乘法修复
- src/src/data/skills.ts (modified) — getSkillDisplayInfo +enchantedSkills 参数 + 附魔后缀; +import ENCHANTMENTS
- src/src/systems/shop.ts (modified) — checkAutoEvolution 产出者/转化者走附魔; +renderEnchantmentModal, +applyEnchantment; sellSkill +清理 enchantedSkills
- src/src/systems/battle.ts (modified) — renderBattleSkills 传递 enchantedSkills; nextWord +decayCounters.clear()
- src/tests/unit/data/enchantments.test.ts (new) — 20 个数据完整性测试
- src/tests/unit/systems/enchantment-effects.test.ts (new) — 20 个效果引擎测试（+2 finale tests）
- docs/stories/sprint-status.yaml (modified) — 19-6: in-progress → review
