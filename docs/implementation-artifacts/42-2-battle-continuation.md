# Story 42.2: 战斗继续机制 — 达标不停，打到时间耗尽

Status: done

## Story

As a 玩家,
I want 达到目标分数后战斗继续直到时间耗尽,
so that 心流高峰时不被中断，溢出分为后续关卡提供策略缓冲。

## Acceptance Criteria

1. **AC1: 达标后继续** — `score >= targetScore` 时不触发 Victory，战斗继续直到 `time <= 0`
2. **AC2: 达标反馈** — 首次达标瞬间触发视觉庆祝（绿色脉冲 + "TARGET!" 浮字）和音效，但不中断战斗
3. **AC3: 时间归零判定** — `time <= 0` 时：`score >= targetScore` → Victory；否则 → Defeat（或续命，Story 42.8）
4. **AC4: 达标后 HUD** — 目标分数显示 ✓ 已达成；分数继续累积，超出部分用溢出色（如青色→金色渐变）
5. **AC5: overflowScore 计算** — `BattleResult` 新增 `overflowScore: number`，= `max(0, finalScore - targetScore)`
6. **AC6: 60fps 无性能影响** — 继续战斗不引入额外性能开销

## Tasks / Subtasks

- [x] **Task 1: 移除达标即胜逻辑** (AC: 1)
  - [x] 1.1 `battle.ts` ~行 1084：将 `score >= targetScore` 的 `endLevel()` 分支改为设置 `_targetReached = true` 标志（仅在首次达标时触发）
  - [x] 1.2 `battle.ts` ~行 1089：不再在此处设置 `state.overkill` 和触发 `endLevel()`；删除 `clearInterval(timerInterval)` — 让计时器继续
  - [x] 1.3 `battle.ts` ~行 409：Black Hole Enter 键结算同理 — 达标时不 `endLevel()`，设 `_targetReached = true`，继续战斗
  - [x] 1.4 确认 `setWord()` 在达标后依然正常被调用（词语系统不受影响）

- [x] **Task 2: 达标反馈** (AC: 2)
  - [x] 2.1 首次 `_targetReached` 时调用 `showFeedback(t('battle.target_reached'), '#4ecdc4')` + `playSound('levelup')` 作为庆祝
  - [x] 2.2 可选：屏幕边缘绿色脉冲动画（复用 `screenShake` 或新增轻量 CSS 动画）
  - [x] 2.3 确保反馈只触发一次（`_targetReached` 从 false→true 的瞬间）

- [x] **Task 3: 时间归零判定** (AC: 3)
  - [x] 3.1 `battle.ts` `startTimer` 中 `state.time <= 0` 分支（~行 1337）：不再无条件调用 `endLevel()`，改为：
    - 先设 `state.overkill = Math.max(0, state.score - state.targetScore)`
    - 然后调用 `endLevel()`（内部已有 `score >= targetScore` 判断分流 Victory/Defeat）
  - [x] 3.2 验证 `endLevel()` 中的 Victory/Defeat 分支逻辑不受影响（行 1404 的 `state.score >= state.targetScore` 判断保持不变）

- [x] **Task 4: 达标后 HUD 样式** (AC: 4)
  - [x] 4.1 `updateHUD()` 中（~行 2059）：当 `_targetReached` 时，目标分数元素显示 `✓ ${targetScore}` + 绿色样式
  - [x] 4.2 分数颜色：达标前正常白/黄/青渐变（行 2065-2075）；达标后切换为金色（`#ffd700`）表示溢出累积
  - [x] 4.3 可选：分数区域添加轻微发光 CSS 效果（`text-shadow` 或 `glow` class）

- [x] **Task 5: overflowScore 字段** (AC: 5)
  - [x] 5.1 `BattleFlowController.ts` `BattleResult` 接口新增 `overflowScore: number`
  - [x] 5.2 `endLevel()` Victory 路径中：`state.overkill` 已在 Task 3 中正确计算，确保传递到 `BattleResult`
  - [x] 5.3 `RunState.applyBattleResult()` 接收 `overflowScore`（本 Story 先记录，实际跨关携带在 Story 42.3）

- [x] **Task 6: 模块状态与生命周期** (AC: 1, 6)
  - [x] 6.1 新增模块级变量 `let _targetReached = false`
  - [x] 6.2 在 `startLevel()` 中重置 `_targetReached = false`
  - [x] 6.3 在 `gameOver()` 中确保 `_targetReached` 不影响 Defeat 流程
  - [x] 6.4 不死鸟（Phoenix）复活后重置 `_targetReached = false`（复活 = 重新开始战斗）

- [x] **Task 7: 构建验证与 Demo 兼容** (AC: 6)
  - [x] 7.1 `vite build` 通过
  - [x] 7.2 Demo 模式：Boss 达标后继续战斗直到时间耗尽，时间耗尽后触发 Demo 结束画面（复查 `IS_DEMO && currentType === 'boss'` 分支）
  - [x] 7.3 手动验证一局：标准关达标 → 继续打字 → 时间耗尽 → 进入商店

## Dev Notes

### 核心设计决策

**本 Story 只做"达标不停 + 继续到时间耗尽"，不做以下内容：**
- ❌ 溢出分跨关携带（42.3）— 本 Story 只计算 `overflowScore`，不注入下一关
- ❌ 时间加速（42.4）— 时间流速保持现有逻辑
- ❌ 续命机制（42.8）— 时间耗尽未达标直接 Defeat（或不死鸟复活）
- ❌ 目标分数公式变更（42.5）— 保持现有 `calculateTargetScore`

### 关键代码路径

**当前流程（达标即停）：**
```
completeWord() → state.score += finalWordScore
  → score >= targetScore?
    → YES: clearInterval(timerInterval); state.overkill = ...; endLevel()  ← 立即结束
    → NO: setWord()  ← 继续下一词
```

**改造后（达标继续）：**
```
completeWord() → state.score += finalWordScore
  → score >= targetScore && !_targetReached?
    → YES: _targetReached = true; showFeedback("TARGET!"); playSound('levelup')
  → setWord()  ← 无论是否达标，继续下一词

startTimer tick → state.time <= 0?
  → state.overkill = max(0, score - targetScore)
  → endLevel()  ← 时间耗尽才结束
    → score >= targetScore → Victory
    → score < targetScore → Defeat / Phoenix
```

### 需要修改的两个达标检查点

1. **`completeWord()` ~行 1084**：正常打字达标路径
2. **`handleEnterKey()` ~行 409**：Black Hole 手动结算达标路径

两处都需要相同改造：移除 `endLevel()` 调用，改为设 `_targetReached` 标志。

### HUD 更新逻辑

`updateHUD()` (~行 2043) 中分数颜色分级逻辑：
```typescript
// 当前逻辑（行 2065-2075）：
if (progress >= 1) el.score.style.color = '#4ecdc4';      // 达标=青
else if (progress >= 0.7) el.score.style.color = '#ffe66d'; // 70%=黄
else el.score.style.color = '#fff';                         // 默认=白

// 改造后：
if (_targetReached) {
  el.score.style.color = '#ffd700';  // 溢出=金色
  el.targetScore.textContent = `✓ ${state.targetScore}`;
  el.targetScore.style.color = '#4ecdc4';
} else if (progress >= 0.7) {
  el.score.style.color = '#ffe66d';
} else {
  el.score.style.color = '#fff';
}
```

### 金币奖励动画

当前 `showGoldReward()` 在达标后显示（battle.ts ~行 1098）。改造后这个动画应在 `endLevel()` 的 Victory 路径中触发，而非在 `completeWord()` 中。`endLevel()` 已有 rating reveal 动画流程，金币奖励可合并。

**注意**：当前 Boss 关达标后跳过 `showGoldReward`（Boss 后无商店金币意义），非 Boss 关显示金币动画。改造后，这两种行为都应移到 `endLevel()` 的 Victory 路径中（因为达标时不再 endLevel，金币动画必须延迟到时间耗尽后）。

### 不死鸟复活交互

Phoenix 在 `endLevel()` 的 Defeat 路径中触发（~行 1490）。改造后不影响 — Phoenix 只在时间耗尽且 `score < targetScore` 时触发。但需注意：复活后应重置 `_targetReached = false`，因为复活 = 重新开始战斗。

### Project Structure Notes

**依赖方向**（必须遵守）：
```
data → core → systems → scenes
```

- `BattleResult` 在 `scenes/battle/BattleFlowController.ts` — 接口定义层
- `battle.ts` 在 `systems/` — 主要改动集中于此文件
- `state.overkill` 在 `core/types.ts` — 已有字段，无需新增
- `_targetReached` 为 `battle.ts` 模块级变量，不暴露到 state

**新增 i18n 键**：
- `battle.target_reached` — "TARGET!" 或类似达标庆祝文本

### 42.1 Code Review 修复的重要上下文

42.1 的 code review 修复了以下影响本 Story 的问题：
- `advanceCycle()` 设置 `state.level = 0`（非 1），确保 Cycle 首关不被跳过
- `getCycleForStage(state.level)` 已替换为 `state.cycle`（level 每 Cycle 重置）
- `showEliteAnnouncement` 死代码已移除

### References

- [Source: docs/stories/epic-42-stage-flow-redesign.md#Story 42.2]
- [Source: src/src/systems/battle.ts — completeWord ~行 1084, handleEnterKey ~行 409, startTimer ~行 1279, endLevel ~行 1380, updateHUD ~行 2043]
- [Source: src/src/scenes/battle/BattleFlowController.ts — BattleResult 接口]
- [Source: src/src/core/types.ts — GameState.overkill, BattleStats]
- [Source: src/src/core/state.ts — calculateTargetScore, createBattleStats, resetResources]
- [Source: docs/project-context.md — State Management Rules, Scene Management Rules]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
N/A — 无运行时错误

### Completion Notes List
1. Task 1+6: 新增 `_targetReached` 模块级变量，`startLevel()` 重置，Phoenix 复活重置
2. Task 1: `completeWord()` 达标检查改为设标志+反馈，不再 `endLevel()` + `clearInterval`
3. Task 1: `handleEnterKey()` 黑洞结算同理 — 达标设标志+致命礼物奖励，不达标也继续战斗
4. Task 2: 达标反馈集成到 Task 1 的标志设置中（`showFeedback` + `playSound('levelup')`）
5. Task 3: `startTimer` 时间归零时先计算 `state.overkill = Math.max(0, score - targetScore)`
6. Task 3: 金币奖励 `showGoldReward` 从 `completeWord()` 移至 `endLevel()` Victory 路径（非 Boss）
7. Task 4: `updateHUD()` 达标后目标分数 `✓ ${targetScore}` 绿色，分数颜色变金色 `#ffd700`
8. Task 5: `BattleResult` 接口新增 `overflowScore: number`，`getBattleResult()` 自动计算
9. Task 7: i18n `battle.target_reached` 中英文 `🎯 TARGET!`，`vite build` 通过
10. 设计决策：黑洞结算时不再 gameOver() — 战斗继续到时间耗尽（保持 42.2 "打到时间耗尽"的核心设计）

### Code Review Fixes
11. Review Fix #1: `_targetReachedTime` 记录达标时剩余时间，`checkUniversalFurnace()` 接收参数避免循环依赖
12. Review Fix #2: 达标后清除 score-tier CSS class（`!important` 会覆盖内联金色）
13. Review Fix #3: 致命礼物奖励独立于 `_targetReached` 判断 — 黑洞结算达标时始终给奖励
14. Review Fix #4: 黑洞结算后调用 `hideSettlement()` 避免面板残留
15. Review Fix #5: 达标时添加 `screenShake(3)` 作为视觉脉冲反馈

### File List
- `src/src/systems/battle.ts` — 核心改动：_targetReached/_targetReachedTime 标志、completeWord/handleEnterKey/startTimer/endLevel/updateHUD
- `src/src/systems/relics/ResourceRelicBehaviors.ts` — checkUniversalFurnace 接收 targetReachedTime 参数
- `src/src/scenes/battle/BattleFlowController.ts` — BattleResult 接口新增 overflowScore
- `src/src/demo/demo-i18n.ts` — 新增 battle.target_reached i18n 键
- `src/tests/unit/core/state/RunState.test.ts` — 测试 mock 数据补充 perfectWords/overflowScore 字段
- `docs/implementation-artifacts/sprint-status.yaml` — 42-2 状态更新
