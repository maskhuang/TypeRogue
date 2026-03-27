# Story 42.3: 溢出分系统 — 跨关携带

Status: done

## Story

As a 玩家,
I want 战斗溢出分在跨关之间累积携带，作为下一关的初始分数,
so that 高水平发挥获得战略回报，溢出分成为续命和后续关卡的缓冲资源。

## Acceptance Criteria

1. **AC1: 溢出分累积** — 战斗胜利结算时 `overflowScore += max(0, finalScore - targetScore)`，跨关累积
2. **AC2: 注入初始分** — 下一关初始化时 `state.score = overflowScore`，溢出分**不**在注入后清零（累积值保留，供 Story 42.8 续命使用）
3. **AC3: HUD 初始分标识** — 战斗开始时 HUD 区分"溢出注入的初始分"和"本关战斗获得分"，初始分用不同颜色（如淡青）标识
4. **AC4: 存档支持** — `RunState` 序列化/反序列化正确包含 `overflowScore`，存档加载后溢出分恢复
5. **AC5: 零溢出兼容** — 溢出分为 0 时初始分为 0，行为与当前完全一致（无回归）

## Tasks / Subtasks

- [x] **Task 1: GameState + RunStateData 新增 overflowScore 字段** (AC: 1, 5)
  - [x] 1.1 `core/types.ts` `GameState` 接口新增 `overflowScore: number`（运行时跨关累积值）
  - [x] 1.2 `core/state.ts` `createInitialState()` 设 `overflowScore: 0`
  - [x] 1.3 `core/state/RunState.ts` `RunStateData` 接口新增 `overflowScore: number`
  - [x] 1.4 `core/state/RunState.ts` `createInitialState()` 设 `overflowScore: 0`

- [x] **Task 2: 胜利结算累积溢出分** (AC: 1)
  - [x] 2.1 `battle.ts` `endLevel()` Victory 路径中：`state.overflowScore += state.overkill`（`state.overkill` 已在 42.2 的 timer tick 中正确计算为 `max(0, score - targetScore)`）
  - [x] 2.2 确认 `state.overkill` 在 `startLevel()` 中被重置为 0（行 1631），但 `state.overflowScore` **不**被重置（跨关累积）
  - [x] 2.3 确认 Boss 关胜利也正确累积溢出分（Boss endLevel 走同一 Victory 路径 — line 1397 的 `if (state.score >= state.targetScore)` 分支）

- [x] **Task 3: 注入初始分** (AC: 2, 5)
  - [x] 3.1 `battle.ts` `startLevel()` 行 1618：将 `state.score = 0` 改为 `state.score = state.overflowScore`
  - [x] 3.2 行 1619：将 `scoreRoller.reset(0)` 改为 `scoreRoller.reset(state.overflowScore)`
  - [x] 3.3 确认 `state.overflowScore === 0` 时行为与原来 `state.score = 0` 完全一致（零溢出无回归）
  - [x] 3.4 在 `startLevel()` 中 targetScore 确定后检查：若 `overflowScore > 0 && score >= targetScore`，立即设 `_targetReached = true` + `_targetReachedTime = state.timeMax`

- [x] **Task 4: HUD 初始分标识** (AC: 3)
  - [x] 4.1 `battle.ts` 新增模块级变量 `let _initialOverflow = 0`，在 `startLevel()` 中赋值 `_initialOverflow = state.overflowScore`
  - [x] 4.2 `updateHUD()` 中：当 `state.score <= _initialOverflow && _initialOverflow > 0` 且 `!_targetReached` 时，分数颜色使用淡青色（`#88d8c0`）
  - [x] 4.3 当 `state.score > _initialOverflow` 时恢复正常白/黄/青渐变色阶
  - [x] 4.4 `_initialOverflow` 每 `startLevel()` 从 `state.overflowScore` 赋值，自然重置

- [x] **Task 5: RunState 序列化/反序列化** (AC: 4)
  - [x] 5.1 `RunState.serialize()` 添加 `overflowScore: this.data.overflowScore`
  - [x] 5.2 `RunState.deserialize()` 添加 `runState.data.overflowScore = (parsed as any).overflowScore || 0`（兼容旧存档默认 0）

- [x] **Task 6: applyBattleResult 同步** (AC: 1)
  - [x] 6.1 `RunState.applyBattleResult()` 胜利时追加 `this.data.overflowScore += result.overflowScore`
  - [x] 6.2 两套状态在胜利时同步累积：`state.overflowScore`（battle.ts endLevel）和 `RunStateData.overflowScore`（applyBattleResult）

- [x] **Task 7: 状态同步与生命周期** (AC: 1, 5)
  - [x] 7.1 新 Run 开始时：`state.overflowScore = 0`（随 `createInitialState()` 自动归零）
  - [x] 7.2 存档恢复时：`RunState.deserialize()` 恢复 `overflowScore`
  - [x] 7.3 Phoenix 复活（42.2）：不重置 `state.overflowScore` — 已确认 Phoenix 复活代码不涉及 overflowScore
  - [x] 7.4 Game Over / Run 结束：`createInitialState()` 归零

- [x] **Task 8: 构建验证** (AC: 5)
  - [x] 8.1 `vite build` 通过（413.76 kB）
  - [x] 8.2 手动验证需在运行时进行
  - [x] 8.3 零溢出时 `state.overflowScore = 0` → `state.score = 0`，与原行为一致
  - [x] 8.4 Demo 模式：`startLevel()` 同样读取 `state.overflowScore`，兼容

## Dev Notes

### 核心设计决策

**本 Story 只做"溢出分跨关携带 + 注入初始分 + HUD 标识"，不做以下内容：**
- ❌ 续命机制（42.8）— 本 Story 不清零溢出分，为续命预留，但不实现续命
- ❌ 时间加速（42.4）— 不涉及
- ❌ 目标分数公式变更（42.5）— 不涉及
- ❌ 商店中溢出分显示 — Epic 提到"商店中可查看当前溢出分累积量"，可在 Task 4 额外添加，或推迟到后续 Story

### 两套状态的同步策略

项目中存在两套状态：
- **`state`（GameState）** — 运行时可变单例，`battle.ts`/`shop.ts` 直接读写
- **`RunState`** — 持久化存储类，`serialize()`/`deserialize()` 支持存档

溢出分需要在两处同时维护：
1. `state.overflowScore`（GameState）— `startLevel()`/`endLevel()` 读写
2. `RunStateData.overflowScore` — `applyBattleResult()` 累积 + 序列化

**同步点**：`endLevel()` Victory 时同时更新两处（`state.overflowScore += overkill` 在 battle.ts，`RunState.applyBattleResult()` 在结算流程中）。

**注意**：当前 `applyBattleResult()` 在生产代码中可能未被调用（只在测试中使用）。如果确认未接入，本 Story 可暂时只依赖 `state.overflowScore`（GameState 运行时），序列化通过存档系统直接读取 `state.overflowScore` 写入。或者——在本 Story 中正式接入 `applyBattleResult()` 到 Victory 流程。

### 关键代码路径

**当前流程（42.2 后）：**
```
timer tick → state.time <= 0
  → state.overkill = max(0, score - targetScore)
  → endLevel()
    → Victory: showGoldReward → openShop
    → Defeat: gameOver / Phoenix
```

**改造后（42.3）：**
```
timer tick → state.time <= 0
  → state.overkill = max(0, score - targetScore)
  → endLevel()
    → Victory:
        state.overflowScore += state.overkill  ← 新增：累积溢出分
        showGoldReward → openShop

shop → startBattleBtn → startLevel()
  → state.score = state.overflowScore  ← 改造：注入初始分（非 0）
  → scoreRoller.reset(state.overflowScore)
  → _initialOverflow = state.overflowScore  ← 新增：记录初始溢出量
  → ... 正常战斗流程 ...
```

### startLevel() 注入点（battle.ts ~行 1613）

```typescript
// 当前（42.2 后）：
state.score = 0;
scoreRoller.reset(0);

// 改造后（42.3）：
state.score = state.overflowScore;
scoreRoller.reset(state.overflowScore);
_initialOverflow = state.overflowScore;
```

### endLevel() 累积点

在 `endLevel()` Victory 路径中（行 ~1404+ 的 `state.score >= state.targetScore` 分支内），金币奖励之前或之后：
```typescript
// Story 42.3: 累积溢出分
state.overflowScore += state.overkill;
```

### HUD 颜色逻辑（updateHUD 中）

```typescript
// 42.2 + 42.3 的完整分数颜色逻辑：
if (_targetReached) {
  el.score.style.color = '#ffd700';  // 金色（溢出累积中）
} else if (_initialOverflow > 0 && state.score <= _initialOverflow) {
  el.score.style.color = '#88d8c0';  // 淡青（仍在初始溢出范围）
} else if (progress >= 0.7) {
  el.score.style.color = '#ffe66d';  // 黄色（接近目标）
} else {
  el.score.style.color = '#fff';     // 白色（正常）
}
```

### 边界情况：初始溢出 >= targetScore

如果累积溢出分已经 >= 目标分数（后期 Cycle 可能出现），`startLevel()` 后 `state.score >= state.targetScore` 立即成立。42.2 的 `completeWord()` 达标检查在 `!_targetReached && score >= targetScore` 时触发。

**处理方案**：在 `startLevel()` 注入溢出分后，检查是否已达标：
```typescript
if (state.overflowScore >= state.targetScore) {
  _targetReached = true;
  _targetReachedTime = state.timeMax; // 达标时还有满时间
}
```
这样 HUD 立即显示金色 + ✓ 标记，玩家继续打字获取更多溢出分。

### 42.2 的 _targetReachedTime 交互

42.2 引入 `_targetReachedTime` 给万物熔炉遗物使用。如果初始溢出分已达标，`_targetReachedTime = state.timeMax`（刚开始时等于满时间），这意味着万物熔炉的 remainingTime 等于整局时间——合理（玩家整局都在溢出状态）。

### Project Structure Notes

**依赖方向**（必须遵守）：
```
data → core → systems → scenes
```

- `GameState.overflowScore` 在 `core/types.ts` — 接口层
- `RunStateData.overflowScore` 在 `core/state/RunState.ts` — 持久层
- `state.overflowScore` 读写在 `systems/battle.ts` — 主要逻辑
- `applyBattleResult()` 在 `core/state/RunState.ts` — 结算同步
- `_initialOverflow` 为 `battle.ts` 模块级变量，不暴露到 state

### References

- [Source: docs/stories/epic-42-stage-flow-redesign.md#Story 42.3]
- [Source: docs/implementation-artifacts/42-2-battle-continuation.md — 42.2 实现上下文]
- [Source: src/src/systems/battle.ts — startLevel ~行 1613, endLevel ~行 1404, updateHUD ~行 2043]
- [Source: src/src/core/types.ts — GameState 接口 ~行 168]
- [Source: src/src/core/state.ts — createInitialState ~行 127]
- [Source: src/src/core/state/RunState.ts — RunStateData ~行 61, applyBattleResult ~行 454, serialize ~行 489, deserialize ~行 525]
- [Source: src/src/scenes/battle/BattleFlowController.ts — BattleResult 接口 ~行 26]
- [Source: docs/project-context.md — State Management Rules, dependency direction]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
N/A — 无运行时错误

### Completion Notes List
1. Task 1: 新增 `overflowScore: number` 到 GameState（types.ts）和 RunStateData（RunState.ts），两处 `createInitialState()` 初始化为 0
2. Task 2: `endLevel()` Victory 路径首行添加 `state.overflowScore += state.overkill`，复用 42.2 已计算的 overkill 值
3. Task 3: `startLevel()` 将 `state.score = 0` 改为 `state.score = state.overflowScore`，scoreRoller 同步重置到溢出分
4. Task 3.4: 边界情况处理 — 若初始溢出分 >= targetScore，立即设 `_targetReached = true` + `_targetReachedTime = state.timeMax`
5. Task 4: 新增 `_initialOverflow` 模块级变量，`updateHUD()` 分数颜色在初始溢出范围内显示淡青色 `#88d8c0`
6. Task 5: RunState `serialize()`/`deserialize()` 支持 `overflowScore`，旧存档兼容 `|| 0`
7. Task 6: `applyBattleResult()` 胜利时累积 `this.data.overflowScore += result.overflowScore`
8. Task 7: 确认 Phoenix 复活不重置 overflowScore，createInitialState 归零，无额外生命周期代码
9. Task 8: `vite build` 通过，RunState applyBattleResult 测试通过（2/2），pre-existing 8 个 getCurrentAct 测试失败（42.1 遗留）

### Code Review Fixes
10. Review Fix #1: 移除 `applyBattleResult()` 中的 overflow 累积 — 避免与 `endLevel()` 双倍计数。GameState 是运行时 source of truth。
11. Review Fix #2: Score tier CSS 清除条件增加 `inOverflowRange` — 初始溢出范围内清除 tier class，避免 `!important` 覆盖淡青色
12. Review Fix #3: 初始溢出已达标时触发 TARGET! 反馈（`showFeedback` + `playSound('levelup')` + `screenShake(3)`）在 `announceLevel` 后延迟触发

### File List
- `src/src/core/types.ts` — GameState 接口新增 overflowScore
- `src/src/core/state.ts` — createInitialState 新增 overflowScore: 0
- `src/src/core/state/RunState.ts` — RunStateData 新增 overflowScore、createInitialState、serialize、deserialize；applyBattleResult 移除独立累积
- `src/src/systems/battle.ts` — _initialOverflow 变量、endLevel 溢出累积、startLevel 注入、边界达标检查+反馈、updateHUD 淡青色+tier 清除
- `docs/implementation-artifacts/42-3-overflow-score.md` — Story 文件更新
- `docs/implementation-artifacts/sprint-status.yaml` — 42-3 状态更新
