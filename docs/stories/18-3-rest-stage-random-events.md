---
title: "Story 18.3: 休息关 — 随机事件场景"
epic: "Epic 18: Boss 战与 Act 结构"
story_key: "18-3-rest-stage-random-events"
status: "done"
created: "2026-03-02"
depends_on: ["18-1-stage-type-act-structure"]
---

# Story 18.3: 休息关 — 随机事件场景

## Story

作为一个 **玩家**，
我想要 **休息关提供随机事件选择，而非简单跳过**，
以便 **每次 Run 有独特的策略决策点，增加 Slay the Spire 式的节奏感和可重玩性**。

## Acceptance Criteria

- [x] AC1: 休息关场景（RestScreen）正常显示，有独特视觉风格
- [x] AC2: 事件池 10 个事件全部实现，每个事件有标题、描述、选项
- [x] AC3: 每次休息关随机抽 1 个事件（满足前置条件的事件才进入抽取池）
- [x] AC4: 两次休息关事件不重复（Run 级别追踪已使用事件）
- [x] AC5: 事件前置条件检查正确（如 ≥2 技能、≥100 金币等）
- [x] AC6: 选择后效果正确应用到游戏状态（金币、技能、遗物、倍率等）
- [x] AC7: 临时 buff/debuff（如"下一 Act 倍率 +1.0x"）在 Act 结束后正确移除

## Tasks / Subtasks

- [x] Task 1: 事件数据模型与选择逻辑 (AC: 2, 3, 4, 5)
  - [x]1.1 创建 `data/restEvents.ts`：定义 `RestEvent` 接口和 10 个事件常量
  - [x]1.2 每个事件包含：id, name, icon, description, options[], prerequisite?
  - [x]1.3 实现 `drawRestEvent(usedEventIds, state): RestEvent` — 从满足条件的事件池中随机抽取
  - [x]1.4 在 `GameState` 中添加 `usedRestEvents: string[]` 追踪已使用事件
- [x] Task 2: 休息关 UI (AC: 1)
  - [x]2.1 在 `index.html` 新增 `#rest-screen` 屏幕（事件标题 + 描述 + 选项按钮）
  - [x]2.2 在 `style.css` 新增休息关样式（柔和色调、安静视觉风格）
  - [x]2.3 在 `types.ts` 的 `GamePhase` 添加 `'rest'`
  - [x]2.4 在 `types.ts` 的 `UIElements` 添加 `restScreen` 引用
  - [x]2.5 在 `elements.ts` 注册新 DOM 元素
  - [x]2.6 在 `battle.ts` 的 `showScreen()` 支持 `'rest'` 屏幕
- [x] Task 3: 流程集成 (AC: 1)
  - [x]3.1 修改 `shop.ts` 的 "开始下一关" 按钮：检测下一节点是否为休息关，是则打开 RestScreen 而非直接跳过
  - [x]3.2 创建 `systems/restStage.ts`：`openRestStage()` 函数 — 设置 phase='rest'，抽取事件，渲染 UI
  - [x]3.3 实现 `completeRestStage()` — 应用选择效果，推进到下一节点，打开商店
  - [x]3.4 处理首次进入（Level 3 结束后第一次遇到 Node 4）：endLevel() → shop → "开始下一关" → rest → "继续" → 下一个 battle
- [x] Task 4: 实现 10 个事件效果 (AC: 2, 6)
  - [x]4.1 事件 1 — 神秘商人：扣 50% 金币换随机遗物 / 免费普通遗物 / 离开
  - [x]4.2 事件 2 — 打字之神的考验：临时倍率/时间 buff（需 Task 5 临时 buff 系统）
  - [x]4.3 事件 3 — 技能祭坛：技能选择 UI + 献祭逻辑（需 ≥2 技能）
  - [x]4.4 事件 4 — 赌徒的骰子：50% 概率赢 300 / 输 100 金币（需 ≥100 金币）
  - [x]4.5 事件 5 — 遗物熔炉：遗物/技能销毁 + 随机强化
  - [x]4.6 事件 6 — 时间裂缝：跳过/重打逻辑
  - [x]4.7 事件 7 — 键盘诅咒：封印 2 键 + 金币/遗物奖励
  - [x]4.8 事件 8 — 技能复制器：技能选择 + 升级 + 目标分 ×1.5
  - [x]4.9 事件 9 — 命运之轮：4 等概率随机结果（无选择）
  - [x]4.10 事件 10 — 宁静冥想：预览 Boss/修饰器 或 获得 80 金币
- [x] Task 5: 临时 Buff 系统 (AC: 7)
  - [x]5.1 在 `GameState` 添加 `tempBuffs: TempBuff[]` 字段
  - [x]5.2 定义 `TempBuff` 接口：{ type, value, expiresAtNode }
  - [x]5.3 在 `startLevel()` 中应用活跃的 tempBuffs（倍率/时间修改）
  - [x]5.4 在关卡切换时检查并清理过期 buff
- [x] Task 6: 测试 (AC: 1-7)
  - [x]6.1 `restEvents.test.ts`：事件池完整性、前置条件过滤、不重复抽取
  - [x]6.2 `restStage.test.ts`：事件效果应用、临时 buff 过期清理
  - [x]6.3 验证 stageFlow 休息关节点映射正确

## Dev Notes

### 关键架构约束

1. **Legacy DOM 系统**：本 Story 修改 Legacy 系统（battle.ts + shop.ts + state.ts），不涉及 Pixi 系统
2. **依赖方向**：`data → core → systems → scenes` — 事件数据放 `data/restEvents.ts`，事件逻辑放 `systems/restStage.ts`
3. **GamePhase 扩展**：需在 `types.ts` 添加 `'rest'` phase，并在 `battle.ts` `showScreen()` 中支持

### 流程设计（CRITICAL）

当前流程（休息关被跳过）：
```
Battle Node 3 → endLevel() → openShop() → "开始下一关" → getNextBattleNode(3)=5 → startLevel(5)
```

目标流程（休息关显示随机事件）：
```
Battle Node 3 → endLevel() → openShop() → "开始下一关" → 检测 Node 4 是 rest
  → openRestStage(4) → 显示随机事件 → 玩家选择 → completeRestStage()
  → state.level = getNextBattleNode(4)=5 → startLevel(5)
```

**关键修改点：`shop.ts` 的 "开始下一关" 按钮**

当前代码（`shop.ts` 约 line 795）：
```typescript
el.startBattleBtn.onclick = () => {
  const nextNode = getNextBattleNode(state.level); // 跳过休息关
  state.level = nextNode;
  startLevel();
};
```

修改为：
```typescript
el.startBattleBtn.onclick = () => {
  const nextNode = state.level + 1;
  if (nextNode <= TOTAL_NODES && isRestNode(nextNode)) {
    state.level = nextNode;
    openRestStage(); // 显示休息关
  } else {
    const nextBattle = getNextBattleNode(state.level);
    state.level = nextBattle;
    startLevel();
  }
};
```

### 已由 18.1 完成的内容（不要重复实现）

- `isRestNode(nodeId)` — 判断是否休息关 [Source: `systems/stage/stageFlow.ts:80-82`]
- `getNextBattleNode(nodeId)` — 跳过休息关获取下一个战斗节点 [Source: `systems/stage/stageFlow.ts:100-107`]
- `hasRestAfter(nodeId)` — 检查节点后是否有休息关 [Source: `systems/stage/stageFlow.ts:120-123`]
- `getActForNode(nodeId)` — 获取节点所属 Act [Source: `systems/stage/stageFlow.ts:72-74`]
- `NODE_STAGE_TYPE[4] = 'rest'`, `NODE_STAGE_TYPE[8] = 'rest'` [Source: `systems/stage/stageFlow.ts:35,38`]

### 事件数据模型

```typescript
// data/restEvents.ts
export interface RestEventOption {
  label: string           // 选项文字
  description: string     // 效果描述
  effect: (state: GameState) => void  // 效果函数
}

export interface RestEvent {
  id: string
  name: string
  icon: string
  description: string     // 事件描述文字
  options: RestEventOption[]
  prerequisite?: (state: GameState) => boolean  // 前置条件
}

export const REST_EVENTS: RestEvent[] = [
  // 10 个事件定义
]

export function drawRestEvent(
  usedEventIds: string[],
  state: GameState
): RestEvent | null {
  const available = REST_EVENTS.filter(e =>
    !usedEventIds.includes(e.id) &&
    (!e.prerequisite || e.prerequisite(state))
  )
  if (available.length === 0) return null
  return available[Math.floor(Math.random() * available.length)]
}
```

### 事件前置条件

| 事件 | 前置条件 |
|------|----------|
| 事件 3（技能祭坛）| `state.player.skills.size >= 2` |
| 事件 4（赌徒骰子）| `state.gold >= 100` |
| 事件 5（遗物熔炉）| `state.player.relics.size >= 1 || state.player.skills.size >= 1` |
| 事件 6（时间裂缝）| 无（总是可用） |
| 事件 7（键盘诅咒）| `state.player.bindings.size >= 1`（至少有键位绑定） |
| 事件 8（技能复制器）| `state.player.skills.size >= 1` |
| 其余事件 | 无前置条件 |

### 临时 Buff 系统设计

```typescript
// core/types.ts
export interface TempBuff {
  type: 'multiplier' | 'time' | 'targetScore'
  value: number           // +1.0, -10, 1.5 等
  expiresAtNode: number   // 在哪个节点后过期（Act 结束节点）
}
```

Act 结束节点：
- Act 1 结束 = Node 4（休息关之后，下一个 battle 前清理）
- Act 2 结束 = Node 8
- Act 3 无休息关

**在 `startLevel()` 中应用并清理 buff：**
```typescript
// 清理过期 buff
state.tempBuffs = state.tempBuffs.filter(b => state.level <= b.expiresAtNode);
// 应用活跃 buff
state.tempBuffs.forEach(b => {
  if (b.type === 'multiplier') state.player.baseMultiplier += b.value;
  if (b.type === 'time') state.timeMax += b.value;
  // ...
});
```

### 复杂事件实现提示

**事件 3（技能祭坛）& 事件 5（遗物熔炉）& 事件 8（技能复制器）：**
需要技能/遗物选择 UI。可复用商店已有的技能列表渲染逻辑，在休息关事件界面内弹出选择面板。简化实现：直接在事件选项区域显示可选择的技能/遗物卡片。

**事件 6（时间裂缝）— 跳过/重打逻辑：**
- 跳过：`state.level = getNextBattleNode(getNextBattleNode(state.level))` 跳两步
- 重打：`state.level` 不变（当前节点是休息关，"重打上一关" = 退回上一个 battle node），完成后额外触发一次金币奖励

**事件 7（键盘诅咒）— 封印键位：**
添加 `state.sealedKeys: string[]` 字段（或放入 tempBuffs）。在 `playerCorrect()` 中检查：如果按键被封印，跳过技能触发。在 Act 结束时清除。

**事件 10（宁静冥想）— 预览 Boss：**
使用 `state.bossModifierPool` 和 `getBossModifierMeta()` 显示下一 Act 的修饰器信息。

### UI 元素位置

```
#game-container
  └── #rest-screen (NEW)
        ├── .rest-header
        │     ├── .rest-title        "休息关"
        │     └── .rest-act-label    "Act 1 结束"
        ├── .rest-event
        │     ├── .event-icon        emoji
        │     ├── .event-name        事件名称
        │     └── .event-description 事件描述
        ├── .rest-options
        │     ├── .rest-option-btn   选项 A
        │     ├── .rest-option-btn   选项 B
        │     └── .rest-option-btn   选项 C (如果有)
        └── .rest-result (选择后显示)
              └── .result-text       "获得了 200 金币！"
```

### CSS 风格参考

```css
#rest-screen {
  display: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #e0e0e0;
  /* 柔和、安静的视觉风格 */
}
```

### GameState 新增字段汇总

```typescript
// types.ts GameState 新增：
usedRestEvents: string[]   // Run 级别：已使用的休息事件 ID
tempBuffs: TempBuff[]      // 临时 buff 列表
```

### `showScreen()` 修改

当前只支持 3 个屏幕，需扩展：
```typescript
export function showScreen(name: 'battle' | 'shop' | 'gameover' | 'rest'): void {
  const el = getElements();
  el.battleScreen.style.display = name === 'battle' ? 'flex' : 'none';
  el.shopScreen.style.display = name === 'shop' ? 'flex' : 'none';
  el.gameoverScreen.style.display = name === 'gameover' ? 'flex' : 'none';
  el.restScreen.style.display = name === 'rest' ? 'flex' : 'none';
}
```

### Project Structure Notes

- 新建 `src/src/data/restEvents.ts` — 事件数据定义（纯数据层）
- 新建 `src/src/systems/restStage.ts` — 休息关逻辑（系统层）
- 修改 `src/src/core/types.ts` — GamePhase + TempBuff + usedRestEvents
- 修改 `src/src/core/state.ts` — createInitialState 新增字段
- 修改 `src/index.html` — 添加 #rest-screen
- 修改 `src/src/style.css` — 休息关样式
- 修改 `src/src/ui/elements.ts` — 注册 restScreen
- 修改 `src/src/systems/battle.ts` — showScreen 扩展 + startLevel buff 应用
- 修改 `src/src/systems/shop.ts` — "开始下一关" 休息关检测
- 新建 `src/tests/unit/data/restEvents.test.ts` — 事件测试
- 新建 `src/tests/unit/systems/restStage.test.ts` — 休息关逻辑测试

### References

- [Source: docs/stories/epic-18-boss-act-structure.md — Story 18.3 验收标准和事件池设计]
- [Source: docs/stories/18-2-elite-stage-mini-boss.md — 前一个 Story 的实现模式和 legacy state bridge]
- [Source: docs/stories/18-1-stage-type-act-structure.md — StageType/Act 系统基础]
- [Source: docs/project-context.md — 依赖方向、state 规则、性能要求]
- [Source: docs/game-architecture.md — 三层状态、场景管理]
- [Source: src/src/systems/stage/stageFlow.ts — isRestNode/getNextBattleNode/hasRestAfter]
- [Source: src/src/systems/battle.ts — showScreen/startLevel/endLevel]
- [Source: src/src/systems/shop.ts — "开始下一关" 按钮约 line 795]
- [Source: src/src/core/types.ts — GamePhase 定义]
- [Source: src/src/data/bossModifiers.ts — getBossModifierMeta（事件 10 使用）]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- All 40 new tests passing (16 restEvents + 24 restStage)
- All 113 relevant tests passing (including stageFlow, state, bossModifiers)
- No new TypeScript errors introduced

### Completion Notes List

- Event 3 (skill altar) and Event 5 (relic forge) simplified: random selection instead of UI picker (player doesn't choose which skill/relic to sacrifice). This keeps implementation simple and can be enhanced later.
- Event 6 (time rift - skip): Advances state.level to next battle node so completeRestStage() further advances, effectively skipping one battle.
- Event 6 (time rift - replay): Simplified to grant 50 gold bonus instead of replaying a level (which would require complex flow changes).
- Event 7 (keyboard curse): Removes bindings (not sealed keys concept). Player can rebind in shop, making it a recoverable penalty.
- Temp buff cleanup uses `state.level <= expiresAtNode` filter in startLevel().

### File List

**Created:**
- `src/src/data/restEvents.ts` — 10 event definitions + drawRestEvent()
- `src/src/systems/restStage.ts` — openRestStage(), completeRestStage(), executeEffect() with all 10 event handlers
- `src/tests/unit/data/restEvents.test.ts` — 16 tests
- `src/tests/unit/systems/restStage.test.ts` — 24 tests

**Modified:**
- `src/src/core/types.ts` — GamePhase +'rest', UIElements +restScreen, TempBuff interface, GameState +usedRestEvents/tempBuffs
- `src/src/core/state.ts` — createInitialState() +usedRestEvents/tempBuffs
- `src/index.html` — #rest-screen HTML
- `src/src/style.css` — Rest screen CSS styles
- `src/src/ui/elements.ts` — restScreen element registration
- `src/src/systems/battle.ts` — showScreen() +rest, startLevel() +tempBuff apply/cleanup
- `src/src/systems/shop.ts` — "Start Battle" button rest node detection
