---
title: "Story 19.8: 商店 Act 权重与新手引导"
epic: "Epic 19: 技能体系重构"
story_key: "19-8-shop-redesign-onboarding"
status: "done"
created: "2026-03-03"
updated: "2026-03-04"
depends_on: ["19-2-producer-skills", "19-4-converter-framework", "19-5-connector-framework"]
---

# Story 19.8: 商店 Act 权重与新手引导

Status: done

## Story

作为一个 **玩家**，
我想要 **商店按 Act 递进供给不同类型技能（Act1 产出者为主 → Act3 连接者为主），首次获得某类型技能时显示一句话 tooltip 引导**，
以便 **自然学会三种技能角色的玩法递进，无需强制教程弹窗**。

## 背景与上下文

当前 `generateShopItems()` 将所有技能（产出者/转化者/连接者）等权混入池中，无 Act 阶段区分。设计目标是通过商店供给节奏实现"供给即教程"：Act 1 主推产出者让玩家建立资源基础，Act 2 引入转化者搭桥，Act 3 连接者成型。首次获取某类型技能时用一句话 tooltip 解释该类型的核心概念。

**关键数据（来自 brainstorming 文档）：**

| Act | 产出者 | 转化者 | 连接者 |
|---|---|---|---|
| Act 1 | 80% | 20% | 0% |
| Act 2 | 30% | 50% | 20% |
| Act 3 | 10% | 40% | 50% |

**10 节点 Act 映射（stageFlow.ts）：**
- Act 1: node 1-4（node 4 = 休息关）
- Act 2: node 5-8（node 8 = 休息关）
- Act 3: node 9-10（node 10 = boss）

商店在每关战斗胜利后打开（`openShop()`），此时 `state.level` 为刚完成的节点。

## Acceptance Criteria

1. - [x] AC1: `generateShopItems()` 按当前 Act 加权抽取技能类型（Act1: 80/20/0, Act2: 30/50/20, Act3: 10/40/50）
2. - [x] AC2: Act 1 商店绝不出现连接者（0% 权重严格执行）
3. - [x] AC3: 保底机制保留：≥1 技能 + ≥1 词语（现有逻辑不变）
4. - [x] AC4: 首次获得产出者/转化者/连接者时各显示一句话 tooltip（如"产出者：按键直接产出资源"）
5. - [x] AC5: tooltip 只在首次获取该类型时弹出，不重复（使用 state 跟踪）
6. - [x] AC6: 升级已有技能不受 Act 权重限制（升级池独立于新技能池）
7. - [x] AC7: 锁定商品在刷新时保留（现有逻辑不变）
8. - [x] AC8: 所有现有商店功能不受影响：拖拽绑定、卖出、进化/附魔模态框、3D 卡片效果

## Tasks / Subtasks

- [x] Task 1: Act 权重技能抽取 (AC: 1, 2, 3, 6)
  - [x] 1.1 定义 `ACT_SKILL_WEIGHTS` 常量：`{ 1: {producer:80, converter:20, connector:0}, 2: {...}, 3: {...} }`
  - [x] 1.2 在 `generateShopItems()` 中根据 `getActForNode(state.level)` 获取当前 Act
  - [x] 1.3 重构新技能池构建：按权重分类抽取，而非全混合 shuffle
  - [x] 1.4 升级池保持独立（不受 Act 权重影响）
  - [x] 1.5 保留保底逻辑：≥1 技能 + ≥1 词语

- [x] Task 2: 首次获取 tooltip 引导 (AC: 4, 5)
  - [x] 2.1 GameState 新增 `seenSkillTypes: Set<string>` 跟踪已见技能类型
  - [x] 2.2 `createInitialState()` 初始化 `seenSkillTypes: new Set()`
  - [x] 2.3 定义 `SKILL_TYPE_TOOLTIPS` 常量：产出者/转化者/连接者各一句话
  - [x] 2.4 在 `executePurchase()` 新技能购买成功后检查类型，首次则调用 `showFeedback()` 显示 tooltip
  - [x] 2.5 tooltip 显示后将类型加入 `seenSkillTypes`

- [x] Task 3: 测试 (AC: 1-8)
  - [x] 3.1 Act 权重测试：验证 ACT_SKILL_WEIGHTS 定义正确（3 个 Act，每 Act 三类权重之和 = 100）
  - [x] 3.2 源码验证：`generateShopItems` 引用 `getActForNode`
  - [x] 3.3 源码验证：Act 1 权重 connector 为 0
  - [x] 3.4 seenSkillTypes 状态初始化测试
  - [x] 3.5 SKILL_TYPE_TOOLTIPS 常量完整性测试（3 种类型）
  - [x] 3.6 回归：现有商店功能引用保留（sellSkill、refreshShop、dragManager 等）

## Dev Notes

### 现有代码分析

**`generateShopItems()` (shop.ts:86-166) — 核心修改点：**

当前逻辑（第 93-131 行）：
```typescript
const allSkillIds = [...Object.keys(SKILLS), ...Object.keys(PRODUCERS), ...poolConverterIds, ...poolConnectorIds];
const unowned = allSkillIds.filter(id => !owned.includes(id));
const shuffledNew = shuffleArray(unowned);  // 全混合随机 — 无Act权重
```
- 将所有技能 ID 合并为 `allSkillIds` 后直接 `shuffleArray` 随机排列
- **无任何 Act 权重逻辑** — 这是本 story 的核心缺口
- 升级池在第 116-131 行独立构建（`owned.filter(...)` + `isUpgrade: true`）— 保持不变

**技能类型判断函数（已导入 shop.ts）：**
```typescript
// shop.ts 第 11-12 行
import { PRODUCERS, isProducer } from '../data/producers';
import { CONVERTERS, isConverter } from '../data/converters';
import { CONNECTORS, isConnector } from '../data/connectors';
```
可直接用于将 unowned 技能按类型分桶。

**Act 获取函数（已导入 shop.ts）：**
```typescript
// shop.ts 第 20 行
import { getNextBattleNode, getStageType, isRestNode, TOTAL_NODES } from './stage/stageFlow';
```
需额外导入 `getActForNode`（同模块已导入，只需加到解构中）。

**`executePurchase()` (shop.ts:296-347) — tooltip 插入点：**
- 新技能购买成功在第 330 行 `state.player.skills.set(skillId, ...)`
- 第 331 行 `showFeedback(...)` — 在此之后检查技能类型并显示 tooltip

**`showFeedback()` (battle.ts) — tooltip 显示方式：**
- 已在 shop.ts 第 18 行导入
- 19.7 已重写为浮字系统（对象池 + 队列），直接调用 `showFeedback(tooltipText, color)` 即可

### 加权抽取算法设计

```typescript
// 推荐在 shop.ts 顶部定义
const ACT_SKILL_WEIGHTS: Record<number, { producer: number; converter: number; connector: number }> = {
  1: { producer: 80, converter: 20, connector: 0 },
  2: { producer: 30, converter: 50, connector: 20 },
  3: { producer: 10, converter: 40, connector: 50 },
};

// generateShopItems 内新逻辑：
const act = getActForNode(state.level);
const weights = ACT_SKILL_WEIGHTS[act] || ACT_SKILL_WEIGHTS[3];

// 1. 将 unowned 按类型分桶
const producers = unowned.filter(id => isProducer(id));
const converters = unowned.filter(id => isConverter(id));
const connectors = unowned.filter(id => isConnector(id));
const legacy = unowned.filter(id => !isProducer(id) && !isConverter(id) && !isConnector(id));
// legacy（旧 SKILLS 中残余）归入 producer 桶
const producerPool = shuffleArray([...producers, ...legacy]);
const converterPool = shuffleArray([...converters]);
const connectorPool = shuffleArray([...connectors]);

// 2. 按权重逐个抽取
function weightedPick(): string | null {
  const total = weights.producer + weights.converter + weights.connector;
  const roll = Math.random() * total;
  if (roll < weights.producer && producerPool.length > 0) return producerPool.shift()!;
  if (roll < weights.producer + weights.converter && converterPool.length > 0) return converterPool.shift()!;
  if (connectorPool.length > 0) return connectorPool.shift()!;
  // fallback: 从非空池中取
  if (producerPool.length > 0) return producerPool.shift()!;
  if (converterPool.length > 0) return converterPool.shift()!;
  return null;
}
```

**关键注意**：当某类型池耗尽时需要 fallback 到其他池，避免空抽。

### 旧技能（SKILLS）的归类

`SKILLS` 对象（`src/data/skills.ts`）包含旧版技能。当前 `allSkillIds` 第 99 行包含 `Object.keys(SKILLS)`。这些旧技能不属于新三类型体系，应归入 producer 权重桶（它们功能上类似产出者）。如果 `SKILLS` 为空集，此处无影响。

### seenSkillTypes 设计

```typescript
// types.ts — GameState 新增字段
seenSkillTypes: Set<string>;  // 值为 'producer' | 'converter' | 'connector'

// state.ts — createInitialState() 中
seenSkillTypes: new Set(),

// shop.ts — 常量定义
const SKILL_TYPE_TOOLTIPS: Record<string, { text: string; color: string }> = {
  producer:  { text: '💡 产出者：按键直接产出资源', color: '#4ecdc4' },
  converter: { text: '💡 转化者：读取资源值，产出另一种', color: '#f39c12' },
  connector: { text: '💡 连接者：自动触发周围技能', color: '#9b59b6' },
};

// executePurchase() 中新技能购买后：
function getSkillCategory(skillId: string): string | null {
  if (isProducer(skillId)) return 'producer';
  if (isConverter(skillId)) return 'converter';
  if (isConnector(skillId)) return 'connector';
  return null;
}

// 购买成功 + isNew 之后：
const category = getSkillCategory(skillId);
if (category && !state.seenSkillTypes.has(category)) {
  state.seenSkillTypes.add(category);
  const tip = SKILL_TYPE_TOOLTIPS[category];
  if (tip) showFeedback(tip.text, tip.color);
}
```

### 文件修改清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/src/systems/shop.ts` | 修改 | generateShopItems 加权抽取；executePurchase tooltip 逻辑；导入 getActForNode |
| `src/src/core/types.ts` | 修改 | GameState 新增 seenSkillTypes: Set\<string\> |
| `src/src/core/state.ts` | 修改 | createInitialState 初始化 seenSkillTypes: new Set() |
| `src/tests/unit/systems/shop-act-weight.test.ts` | 新建 | Act 权重 + tooltip 测试 |

### Anti-patterns — 不要做的事

1. **不要修改现有商店 UI 渲染** — `renderUnifiedShop()`、`renderUnifiedShopCard()` 等保持不变，本 story 只改数据层（生成逻辑）
2. **不要修改拖拽系统** — `dragManager`、`registerShopDropZones()`、`handleDropOnKey()` 完全不动
3. **不要用弹窗/模态框做 tooltip** — 用 `showFeedback()` 浮字即可，符合"无强制弹窗"设计原则
4. **不要修改升级池逻辑** — 升级已有技能不受 Act 权重影响，升级池保持独立构建
5. **不要修改锁定/刷新逻辑** — `refreshShop()` 和 `item.locked` 保持不变
6. **不要用硬编码 if/else 判断 Act** — 用数据驱动的 ACT_SKILL_WEIGHTS 表
7. **不要修改卖出系统** — `sellSkill()`、`sellWord()` 不动
8. **不要修改进化/附魔模态框** — `checkAutoEvolution()`、`renderEvolutionModal()`、`renderEnchantmentModal()` 不动
9. **不要为 tooltip 创建新的 UI 组件** — 复用 `showFeedback()` 浮字系统（19.7 已建立）
10. **不要修改卡片渲染样式** — 技能卡片已有 `school.label`/`school.cssClass` 显示类型，无需额外标识

### Previous Story Intelligence（19.7 战斗 UI 改造）

- **showFeedback 已重写为浮字系统**：对象池 20 元素 + 队列 150ms drain，通过 `showFeedback(text, color)` 调用
- **clearFloatQueue** 在 endLevel/gameOver/victory 中清理 — tooltip 显示无需关心清理
- **代码审查修复**：`onanimationend` 替代 `setTimeout` 回收浮字元素
- **模式**：所有反馈文本通过 `showFeedback(text, color)` — tooltip 应遵循同样模式
- **dead code cleanup**: 移除了 `#input-feedback`、`feedback` UIElements — 不要再引用

### Project Structure Notes

- 商店系统在 `src/src/systems/shop.ts`（878 行）
- 类型定义在 `src/src/core/types.ts`
- 状态初始化在 `src/src/core/state.ts`
- 关卡流程在 `src/src/systems/stage/stageFlow.ts`
- 测试目录 `src/tests/unit/systems/`
- 命名惯例：测试文件 kebab-case（如 `shop-act-weight.test.ts`）

### References

- [Source: docs/brainstorming-session-2026-03-03.md#商店重设计] — Act 权重表（80/20/0, 30/50/20, 10/40/50）
- [Source: docs/brainstorming-session-2026-03-03.md#新手引导] — 供给节奏即教程，首次获取 tooltip
- [Source: docs/brainstorming-session-2026-03-03.md#每局技能池构成] — 产出者 10 固定，转化者随机 20，连接者随机 18
- [Source: docs/brainstorming-session-2026-03-03.md#最终方案摘要] — "供给节奏即教程：Act 1 产出者 → Act 2 转化者+连接者 → Act 3 全开放"
- [Source: docs/gdd.md#商店生成规则] — 至少 1 技能 + 至少 1 遗物（当前实现为至少 1 词语）
- [Source: docs/stories/epic-19-skill-system-redesign.md#19.8] — "商店 Act 权重 + 技能升级购买 + 首次 tooltip"
- [Source: src/src/systems/stage/stageFlow.ts#NODE_ACT] — Act 1=node1-4, Act 2=node5-8, Act 3=node9-10
- [Source: src/src/systems/shop.ts:86-166#generateShopItems] — 当前无 Act 权重的技能池构建
- [Source: src/src/systems/shop.ts:296-347#executePurchase] — 购买成功后的 tooltip 插入点
- [Source: src/src/systems/shop.ts:11-12] — isProducer/isConverter/isConnector 已导入
- [Source: docs/stories/19-7-battle-ui-overhaul.md#Dev Agent Record] — showFeedback 浮字系统详情

## Dev Agent Record

### Agent Model Used
claude-opus-4-6

### Debug Log References
N/A — no debug issues encountered

### Completion Notes List
- Added `ACT_SKILL_WEIGHTS` constant with Act 1/2/3 weights (80/20/0, 30/50/20, 10/40/50)
- Refactored `generateShopItems()` to use weighted bucket system: splits unowned skills into producer/converter/connector buckets, uses `weightedPick()` with fallback for exhausted pools
- Legacy SKILLS (non-producer/converter/connector) grouped into producer bucket
- Upgrade pool remains independent — not affected by Act weights
- Added `getActForNode` import to shop.ts
- Added `seenSkillTypes: Set<string>` to GameState type and initial state
- Added `SKILL_TYPE_TOOLTIPS` constant with 3 skill type descriptions
- Added `getSkillCategory()` helper function
- Tooltip logic in `executePurchase()`: checks `seenSkillTypes` on new skill purchase, shows tooltip via `showFeedback()`, adds type to set
- 25 new tests covering AC1-AC8 — all pass
- Pre-existing 21 test failures (lone/void/school related) unaffected

**Code Review Fixes (1H/2M/1L):**
- H1: Added `weights.connector > 0` guard on all connectorBucket accesses in `weightedPick` — prevents Act 1 connector leak
- M1: Added 2 new tests for connector guard and SKILL_POOL_MULTIPLIER constant
- M2: Replaced `count * 3` magic number with `SKILL_POOL_MULTIPLIER` constant + comment

### Change Log
- shop.ts: +ACT_SKILL_WEIGHTS, +SKILL_TYPE_TOOLTIPS, +getSkillCategory, refactored generateShopItems weighted buckets, +tooltip in executePurchase, +getActForNode import, +SKILL_POOL_MULTIPLIER, +connector weight guard
- types.ts: +seenSkillTypes field in GameState
- state.ts: +seenSkillTypes initialization

### File List
| File | Action | Description |
|------|--------|-------------|
| `src/src/systems/shop.ts` | Modified | Added Act weight system, tooltip constants, weighted bucket generation, tooltip logic in executePurchase, connector guard |
| `src/src/core/types.ts` | Modified | Added seenSkillTypes to GameState |
| `src/src/core/state.ts` | Modified | Added seenSkillTypes initialization |
| `src/tests/unit/systems/shop-act-weight.test.ts` | Created | 25 tests covering AC1-AC8 |
