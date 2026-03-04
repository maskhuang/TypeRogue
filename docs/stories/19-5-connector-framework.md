---
title: "Story 19.5: 连接者框架与连锁规则（36 个）"
epic: "Epic 19: 技能体系重构"
story_key: "19-5-connector-framework"
status: "done"
created: "2026-03-03"
updated: "2026-03-04"
depends_on: ["19-3-keyboard-topology", "19-4-converter-framework"]
---

# Story 19.5: 连接者框架与连锁规则（36 个）

## Story

作为一个 **玩家**，
我想要 **连接者技能自动触发位置关系内的其他技能，形成连锁反应**，
以便 **通过键盘布局构建复杂的触发链，实现"键盘即棋盘"的核心 build 体验**。

## 背景与上下文

连接者是三大技能类型（产出者/转化者/连接者）中最复杂的一类。与产出者（直接写资源）和转化者（读资源→写资源）不同，连接者不直接产出资源——它们通过**位置关系**自动触发其他技能，形成连锁反应。

核心设计意图：玩家在键盘上的技能布局不再是随意的，连接者让**位置变成策略维度**。

## Acceptance Criteria

- [x] AC1: `ConnectorDefinition` 接口定义完成：triggerType(copy/resourceTrigger), positionRelation, resource?
- [x] AC2: 6 个复制型连接者实现（每种位置关系 1 个）：当自身被触发时，随机触发关系内一个其他技能
- [x] AC3: 30 个资源触发型连接者实现（5 资源 × 6 位置关系）：当关系内技能产出特定资源时，随机触发关系内另一个技能（跳过产出该资源的技能）
- [x] AC4: 连接者固定 Lv1，不可升级，不可进化
- [x] AC5: 每局 run 从 36 个连接者中随机抽 18 个进入技能池
- [x] AC6: **三层连锁保护规则**实现：
  - Layer 1：资源触发跳过能产出同资源的目标技能 → 规则层阻断 2 卡循环
  - Layer 2：3+ 卡跨资源循环允许通过（奖励复杂 build）
  - Layer 3：检测到 3+ 循环时进入伪无限模式（所有循环技能 4 次/秒持续整关，玩家可同时打字）
- [x] AC7: 连接者触发时有视觉反馈（复用 showFeedback 浮字）
- [x] AC8: 单元测试覆盖所有连锁场景（单链、分叉、2 卡阻断、3+ 循环、伪无限）

## Tasks / Subtasks

- [x] Task 1: ConnectorDefinition 接口与 36 个连接者数据 (AC: 1, 2, 3, 4)
  - [x] 1.1 `types.ts` 新增 `ConnectorTriggerType = 'copy' | 'resourceTrigger'` 和 `ConnectorDefinition` 接口
  - [x] 1.2 `types.ts` 新增 `connectorPool: string[]` 和 `pseudoInfiniteState: PseudoInfiniteState | null` 到 GameState
  - [x] 1.3 新建 `src/src/data/connectors.ts`，定义 6 个复制型连接者数据
  - [x] 1.4 同文件定义 30 个资源触发型连接者数据（5 资源 × 6 位置关系）
  - [x] 1.5 工具函数：`isConnector()`, `drawConnectorPool(count=18)`, `getConnectorDesc()`

- [x] Task 2: 连锁触发引擎 (AC: 2, 3, 6, 7)
  - [x] 2.1 `skills.ts` 新增 `triggerConnectorCopy(connectorId, triggerKey, chainHistory)` — 复制型触发逻辑
  - [x] 2.2 `skills.ts` 新增 `checkResourceTriggers(resource, sourceKey, chainHistory)` — 资源触发检查
  - [x] 2.3 `skills.ts` 修改 `triggerSkill()` 入口：连接者分流 + 产出者/转化者后追加 checkResourceTriggers
  - [x] 2.4 Layer 1 实现：checkResourceTriggers 跳过能产出同资源的目标技能
  - [x] 2.5 showFeedback 浮字反馈（复用已有机制）

- [x] Task 3: 三层连锁保护 (AC: 6)
  - [x] 3.1 `chainHistory: string[]` 栈跟踪当前链路径
  - [x] 3.2 链式触发时检测循环：若目标已在 chainHistory 中，判断链长
  - [x] 3.3 链长 = 2 → Layer 1 已阻断（不应到达此处，作为 fallback 拦截）
  - [x] 3.4 链长 ≥ 3 → 进入伪无限模式
  - [x] 3.5 伪无限模式：setInterval(250ms) 触发所有循环内技能，存入 state，关卡结束时 clearInterval

- [x] Task 4: 技能池与集成 (AC: 5)
  - [x] 4.1 `state.ts` 初始化 `connectorPool: []`, `pseudoInfiniteState: null`
  - [x] 4.2 `main.ts` 调用 `drawConnectorPool()` 初始化本局池
  - [x] 4.3 `shop.ts` 将 connectorPool 加入商店技能池（参照 converterPool 模式）
  - [x] 4.4 `battle.ts` renderBattleSkills 加入 CONNECTORS 识别
  - [x] 4.5 `data/skills.ts` getSkillSchool + getSkillDisplayInfo 支持连接者
  - [x] 4.6 连接者购买后 level 固定 1，商店不生成升级项

- [x] Task 5: 伪无限模式生命周期 (AC: 6)
  - [x] 5.1 关卡结束（胜利/超时）时清理 pseudoInfiniteState、clearInterval
  - [x] 5.2 伪无限触发调用底层 triggerProducer/triggerConverter，不再进入链检测
  - [x] 5.3 每 tick 所有循环参与者各触发一次，视觉上连续弹出浮字

- [x] Task 6: 测试 (AC: 8)
  - [x] 6.1 数据完整性：36 个连接者、id 唯一、字段齐全
  - [x] 6.2 isConnector / drawConnectorPool / getConnectorDesc
  - [x] 6.3 复制型单链：A(copy)→B→资源产出，验证 B 被触发
  - [x] 6.4 资源触发单链：A 产出 base→connector 触发 B
  - [x] 6.5 分叉触发：一个资源变化触发多个 connector
  - [x] 6.6 2 卡循环阻断：A 产 base→connector→不触发也产 base 的技能
  - [x] 6.7 3+ 卡循环→伪无限模式激活
  - [x] 6.8 伪无限速率验证（4 次/秒 = 250ms 间隔）
  - [x] 6.9 伪无限期间 triggerSkill 正常工作（不阻塞手动输入）
  - [x] 6.10 无效 connector ID 无操作

## Dev Notes

### 核心触发机制

**复制型连接者**（6 个）：
1. 玩家按键命中连接者 → `triggerSkill` 识别为连接者 → 调 `triggerConnectorCopy`
2. 查询 `getKeysWithRelation(triggerKey, relation)` 获取位置关系内所有键
3. 过滤出有绑定技能的键 → 随机选一个 → 调 `triggerSkill(targetSkillId, targetKey, ...)`
4. 目标技能正常执行（产出者/转化者/另一个连接者）

**资源触发型连接者**（30 个）：
1. 任何技能产出资源后 → 调 `checkResourceTriggers(resource, sourceKey, chainHistory)`
2. 遍历所有已绑定的资源触发型连接者
3. 对每个匹配 resource 的连接者，检查 `hasRelation(sourceKey, connectorKey, relation)` 是否成立
4. 若成立 → 查询关系内所有有技能的键
5. **Layer 1 过滤**：跳过能产出该 resource 的技能（含产出者和转化者）
6. 随机选一个目标 → `triggerSkill(targetSkillId, targetKey, ...)`

### 三层连锁规则实现

```
triggerSkill(id, key)
  ├─ producer → triggerProducer → checkResourceTriggers(resource, key, chain)
  ├─ converter → triggerConverter → checkResourceTriggers(target, key, chain)
  └─ connector(copy) → triggerConnectorCopy → triggerSkill(target, targetKey, chain)

checkResourceTriggers(resource, sourceKey, chainHistory):
  for each bound connector matching resource+position:
    targets = getKeysWithRelation(connectorKey, relation)
              .filter(hasSkill)
              .filter(!producesResource(resource))  // Layer 1
    pick random target
    if target in chainHistory:
      if chainHistory.length >= 2:  // Layer 3: 3+ 卡循环
        enterPseudoInfinite(chainHistory + target)
        return
      else:  // Layer 1 fallback（不应触达）
        skip
    else:
      triggerSkill(target, targetKey, [...chainHistory, target])
```

### chainHistory 设计

- `chainHistory` 是一个 `string[]`，记录当前链上所有已触发的 **键位**（不是 skillId，因为同一键位可能换绑）
- 每次链式触发前，将目标键加入 history
- 初始触发（玩家手动按键）时 `chainHistory = [triggerKey]`
- 传递给后续所有链式调用

### 伪无限模式

```typescript
interface PseudoInfiniteState {
  intervalId: number;          // setInterval 返回的 ID
  participantKeys: string[];   // 循环内所有参与者的键位
}
```

- 激活时：记录循环参与者 → 启动 `setInterval(250)` → 每 tick 对每个参与者执行技能效果
- 伪无限 tick 中**直接**调 triggerProducer/triggerConverter（绕过链检测），避免递归
- 若参与者是连接者（copy 型），直接执行其复制效果（不递归链检测）
- 关卡结束时在 `startLevel()` 或 battle 结算中 `clearInterval` 并重置 state

### 文件修改清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/src/core/types.ts` | 修改 | 新增 ConnectorDefinition, ConnectorTriggerType, PseudoInfiniteState, GameState 字段 |
| `src/src/core/state.ts` | 修改 | 初始化 connectorPool, pseudoInfiniteState |
| `src/src/data/connectors.ts` | **新建** | 36 个连接者数据 + isConnector/drawConnectorPool/getConnectorDesc |
| `src/src/systems/skills.ts` | 修改 | triggerConnectorCopy, checkResourceTriggers, triggerSkill 入口修改 |
| `src/src/data/skills.ts` | 修改 | getSkillSchool/getSkillDisplayInfo 支持连接者 |
| `src/src/systems/shop.ts` | 修改 | connectorPool 加入商店技能池 |
| `src/src/systems/battle.ts` | 修改 | renderBattleSkills + 关卡结束清理伪无限 |
| `src/src/main.ts` | 修改 | drawConnectorPool 初始化 |
| `src/tests/unit/data/connectors.test.ts` | **新建** | 数据完整性 + 工具函数测试 |
| `src/tests/unit/systems/connector-chain.test.ts` | **新建** | 链式触发 + 三层保护 + 伪无限测试 |

### 实现模式参考（复用 19.4 转化者模式）

**数据文件结构**（参照 `converters.ts`）：
```typescript
// connectors.ts
import type { ConnectorDefinition } from '../core/types';
import { PositionRelation } from './keyboardTopology';
import { RESOURCE_LABELS, RESOURCE_ICONS } from '../core/constants';

export const CONNECTORS: Record<string, ConnectorDefinition> = {
  // 复制型 6 个
  conn_copy_adjacent: { id: 'conn_copy_adjacent', name: '映射', icon: '🔗', triggerType: 'copy', positionRelation: PositionRelation.Adjacent, desc: '触发时复制相邻技能' },
  // ...
  // 资源触发型 30 个 (命名: conn_{resource}_{relation})
  conn_base_adjacent: { id: 'conn_base_adjacent', name: '震荡', icon: '⚔️🔗', triggerType: 'resourceTrigger', positionRelation: PositionRelation.Adjacent, resource: 'base', desc: '基数↑→触发相邻技能' },
  // ...
} as const;

export function isConnector(id: string): boolean { return id in CONNECTORS; }
export function drawConnectorPool(count = 18): string[] { /* Fisher-Yates, 同 drawConverterPool */ }
export function getConnectorDesc(id: string): string { /* 返回描述 */ }
```

**triggerSkill 入口修改**（参照 producer/converter 分流模式）：
```typescript
export function triggerSkill(skillId, triggerKey, isEcho = false, chainHistory?: string[]) {
  if (isProducer(skillId)) {
    triggerProducer(skillId);
    checkResourceTriggers(PRODUCERS[skillId].resource, triggerKey, chainHistory || [triggerKey]);
    return;
  }
  if (isConverter(skillId)) {
    triggerConverter(skillId);
    checkResourceTriggers(CONVERTERS[skillId].target, triggerKey, chainHistory || [triggerKey]);
    return;
  }
  if (isConnector(skillId)) {
    const conn = CONNECTORS[skillId];
    if (conn.triggerType === 'copy') {
      triggerConnectorCopy(skillId, triggerKey, chainHistory || [triggerKey]);
    }
    // resourceTrigger 型不在此处触发，由 checkResourceTriggers 驱动
    return;
  }
  // ... 原有管道技能逻辑
}
```

**商店集成**（参照 converterPool 模式）：
```typescript
// shop.ts generateShopItems
const poolConnectorIds = state.connectorPool.filter(id => id in CONNECTORS);
const allSkillIds = [...Object.keys(SKILLS), ...Object.keys(PRODUCERS), ...poolConverterIds, ...poolConnectorIds];
```

**升级锁定**：连接者不出现在升级候选中。在 `generateShopItems` 的升级逻辑中过滤掉 `isConnector(id)`。

### 连接者数据表

**复制型（6 个）：**

| ID | emoji | 名字 | positionRelation |
|---|---|---|---|
| conn_copy_adjacent | 🔗 | 映射 | Adjacent |
| conn_copy_sameRow | 📡 | 广播 | SameRow |
| conn_copy_sameColumn | 📌 | 钉合 | SameColumn |
| conn_copy_sameHand | 🤝 | 握手 | SameHand |
| conn_copy_sameFinger | 👆 | 指令 | SameFinger |
| conn_copy_symmetric | 🪞 | 链接 | Symmetric |

**资源触发型（30 个）：** 命名规则 `conn_{resource}_{relation}`

| resource | Adjacent | SameRow | SameColumn | SameHand | SameFinger | Symmetric |
|---|---|---|---|---|---|---|
| base | ⚔️🔗 震荡 | ⚔️📡 横波 | ⚔️📌 纵波 | ⚔️🤝 战吼 | ⚔️👆 贯穿 | ⚔️🪞 共振 |
| score | 🪙🔗 散财 | 🪙📡 分红 | 🪙📌 投币 | 🪙🤝 施舍 | 🪙👆 翻倍 | 🪙🪞 对账 |
| multiplier | 🔥🔗 燎原 | 🔥📡 火线 | 🔥📌 焚柱 | 🔥🤝 炙手 | 🔥👆 引线 | 🔥🪞 对焰 |
| time | ⏳🔗 涟漪 | ⏳📡 回溯 | ⏳📌 滴答 | ⏳🤝 共时 | ⏳👆 拨针 | ⏳🪞 轮回 |
| shield | 🛡️🔗 联防 | 🛡️📡 阵线 | 🛡️📌 壁垒 | 🛡️🤝 方阵 | 🛡️👆 坚守 | 🛡️🪞 镜盾 |

### 判断技能是否产出某资源的辅助函数

`checkResourceTriggers` 的 Layer 1 需要判断目标技能是否能产出指定资源：

```typescript
function canProduceResource(skillId: string, resource: ResourceType): boolean {
  if (isProducer(skillId)) return PRODUCERS[skillId].resource === resource;
  if (isConverter(skillId)) return CONVERTERS[skillId].target === resource;
  // 原始技能（burst 等）按 type 判断
  const sk = SKILLS[skillId];
  if (sk) {
    if (resource === 'score' && sk.type === 'score') return true;
    if (resource === 'multiplier' && sk.type === 'multiply') return true;
    if (resource === 'time' && sk.type === 'time') return true;
    if (resource === 'shield' && sk.type === 'shield') return true;
  }
  return false;
}
```

### Anti-patterns — 不要做的事

1. **不要创建单独的 ChainEngine 类** — 用平级函数（triggerConnectorCopy, checkResourceTriggers），与 triggerProducer/triggerConverter 保持一致
2. **不要用 Proxy 监听资源变化** — 在 triggerProducer/triggerConverter 后显式调 checkResourceTriggers
3. **不要让伪无限 tick 进入链检测** — 直接调底层 triggerProducer/triggerConverter，避免递归
4. **不要修改 triggerSkill 的 public API 签名** — chainHistory 作为可选参数，不破坏现有调用
5. **不要给连接者生成升级项** — 在 shop.ts 的升级候选列表中过滤 isConnector
6. **不要新建 CSS class** — 复用 `.school-connector`（同转化者的 school 模式）

### Previous Story Intelligence（19.4 转化者）

- **数据文件模式**: `CONVERTERS` 用 `Record<string, ConverterDefinition>` + `as const`，CONNECTORS 应同样
- **工具函数模式**: `isConverter/getConverterK/getConverterDesc/drawConverterPool` → 对应 `isConnector/getConnectorDesc/drawConnectorPool`（连接者无等级，不需要 getK）
- **triggerSkill 分流**: `if (isProducer) → triggerProducer; if (isConverter) → triggerConverter;` → 新增 `if (isConnector) → triggerConnectorCopy`
- **商店集成**: `poolConverterIds = state.converterPool.filter(id => id in CONVERTERS)` → 新增 poolConnectorIds
- **getSkillSchool**: `if (skillId in CONVERTERS) return { label: '转化', cssClass: 'school-converter' }` → `if (skillId in CONNECTORS) return { label: '连接', cssClass: 'school-connector' }`
- **getSkillDisplayInfo**: 查 CONNECTORS 对象回退 → 查 CONNECTORS 对象
- **Code review 发现的共享常量**: RESOURCE_LABELS/RESOURCE_ICONS 已提取到 `constants.ts`，连接者直接 import
- **Code review 修复**: 浮点显示用 `toPrecision(4)`，参数用 `ResourceState` 类型，数据用 `as const`

### Git Intelligence

最近 4 次提交均为 Epic 19 stories：
```
111cf72 Story 19.4 — converters.ts + skills.ts + shop.ts + tests
42814c5 Story 19.3 — keyboardTopology.ts
65279c3 Story 19.2 — producers.ts
6d30b0d Story 19.1 — types.ts/state.ts 资源系统
```

文件变更模式一致：types.ts → data/*.ts (新) → skills.ts → shop.ts → battle.ts → data/skills.ts → main.ts → tests

### 设计文档参考

- [Source: docs/brainstorming-session-2026-03-03.md#连接者] — 36 个连接者完整数据表（名字、emoji、效果）
- [Source: docs/brainstorming-session-2026-03-03.md#连锁规则] — 三层防护规则原始设计
- [Source: docs/stories/epic-19-skill-system-redesign.md] — Epic 19 总体架构
- [Source: docs/gdd.md] — 86 技能总数、48/run 池构成
- [Source: src/src/data/keyboardTopology.ts] — 6 种位置关系查询 API: hasRelation, getKeysWithRelation
- [Source: src/src/data/converters.ts] — 转化者数据/工具函数模板

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Completion Notes List

- 36 个连接者数据完整实现（6 copy + 30 resourceTrigger），命名/emoji/desc 与 brainstorming 文档对齐
- 连锁触发引擎：triggerConnectorCopy（复制型）+ checkResourceTriggers（资源触发型）
- 三层连锁保护：Layer 1 canProduceResource 过滤、Layer 2 chainHistory 安全网、Layer 3 伪无限模式（250ms/tick）
- 伪无限生命周期：endLevel/gameOver 自动清理，tick 直接调底层函数避免递归
- 商店集成：connectorPool 进技能池，升级候选过滤 isConnector
- `window.setInterval` → `setInterval` 修复 Node.js 测试环境兼容
- 34 个新测试全部通过，0 回归

**Code Review 修复 (2026-03-04):**
- [H1] shop.ts `renderUnifiedShopCard` 增加 CONVERTERS/CONNECTORS 查询 → 商店正确渲染连接者/转化者卡片
- [H2] shop.ts `renderBuildManager` 3 处增加 CONVERTERS/CONNECTORS 查询 → 键盘网格/tooltip/技能列表正确显示
- [H3] skills.ts `enterPseudoInfinite` 改为从 state 读取参与者列表 → 修复合并参与者不触发的 bug
- [M1] types.ts `positionRelation` 类型从 `string` 改为 `PositionRelation` → 移除 3 处 `as any` 强转
- [M2] shop.ts `executePurchase` 反馈文字增加 CONVERTERS/CONNECTORS 查询 → 修复 "获得 undefined!" 问题
- [M3] connector-chain.test.ts 增加分叉触发测试 → 35 个测试全部通过
- [L1] skills.ts `checkResourceTriggers` 增加 highlightBoundSkill + playSound → 视觉反馈与复制型一致

### Change Log

- types.ts: +ConnectorTriggerType, ConnectorDefinition, PseudoInfiniteState; GameState +connectorPool, pseudoInfiniteState; positionRelation 类型改为 PositionRelation
- state.ts: createInitialState +connectorPool: [], pseudoInfiniteState: null
- data/connectors.ts: **新文件** — 36 连接者定义 + isConnector/drawConnectorPool/getConnectorDesc
- systems/skills.ts: +canProduceResource, triggerConnectorCopy, checkResourceTriggers, enterPseudoInfinite, clearPseudoInfinite; triggerSkill 增加连接者分流和 chainHistory; enterPseudoInfinite 改用 state 引用修复闭包 bug; checkResourceTriggers 增加 highlightBoundSkill/playSound
- systems/shop.ts: +poolConnectorIds 进技能池, isConnector 升级过滤; renderUnifiedShopCard/renderBuildManager/executePurchase 增加 CONVERTERS/CONNECTORS 查询
- systems/battle.ts: +CONNECTORS 渲染支持, clearPseudoInfinite 在 endLevel/gameOver
- data/skills.ts: +getSkillSchool/getSkillDisplayInfo 连接者支持
- main.ts: +drawConnectorPool 初始化

### File List

- src/src/core/types.ts (modified)
- src/src/core/state.ts (modified)
- src/src/data/connectors.ts (new)
- src/src/systems/skills.ts (modified)
- src/src/systems/shop.ts (modified)
- src/src/systems/battle.ts (modified)
- src/src/data/skills.ts (modified)
- src/src/main.ts (modified)
- src/tests/unit/data/connectors.test.ts (new)
- src/tests/unit/systems/connector-chain.test.ts (new)
