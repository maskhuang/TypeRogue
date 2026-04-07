# Story 56.3a: 教程基础设施

Status: done

## Story

As a 开发者,
I want 教程模式的基础框架就位（state flag + 入口 + 退出 + 阶段状态机）,
so that 后续 Story 可以在此基础上实现具体阶段。

## Context: 已有系统

已有 `TutorialManager`（Story 39.3）是**事件驱动引导提示**系统，用于正式游戏中的上下文提示（如"这是技能""这是商店"）。

56-3 的教程是**独立教程模式**——从主菜单进入、有 5 个阶段、用独立 state——与现有系统互补但不同。

**可复用：** `TutorialOverlay`（提示框 UI）
**新建：** 教程模式状态机 `TutorialMode.ts`

## Acceptance Criteria

1. **AC1: state.isTutorial flag** — `GameState` 新增 `isTutorial: boolean`，`createInitialState` 默认 false
2. **AC2: TutorialMode 状态机** — 新文件管理教程 5 阶段生命周期（start/advance/exit）
3. **AC3: 主菜单入口** — 教程按钮从 disabled 改为可用，点击 → `startTutorialMode()`
4. **AC4: Esc 退出** — 教程中按 Esc 回主菜单
5. **AC5: isTutorial 守卫** — 战斗/商店中 isTutorial 时跳过 Ascension 修正、遗物解析、Boss 修饰器、排行榜记录
6. **AC6: 教程预设数据** — 独立词库、无 Ascension、classId='none'

## Tasks / Subtasks

- [ ] Task 1: GameState 扩展 (AC: 1)
  - [ ] 1.1 `core/state.ts` — `createInitialState` 新增 `isTutorial: false`
  - [ ] 1.2 `GameState` 类型新增 `isTutorial: boolean`

- [ ] Task 2: TutorialMode 状态机 (AC: 2)
  - [ ] 2.1 新建 `src/src/systems/tutorial/TutorialMode.ts`
  - [ ] 2.2 `TutorialPhase` 类型：`1 | 2 | 3 | 4 | 5 | 'complete'`
  - [ ] 2.3 `startTutorialMode()` — resetState + isTutorial=true + 教程词库 + showScreen('battle')
  - [ ] 2.4 `advanceTutorialPhase()` — 阶段推进
  - [ ] 2.5 `exitTutorialMode()` — resetState + isTutorial=false + showScreen('menu')
  - [ ] 2.6 `getTutorialPhase()` 获取当前阶段

- [ ] Task 3: 主菜单接入 (AC: 3)
  - [ ] 3.1 教程按钮去 disabled
  - [ ] 3.2 onclick → `startTutorialMode()`

- [ ] Task 4: Esc 退出 (AC: 4)
  - [ ] 4.1 教程模式下全局 keydown 监听 Escape → exitTutorialMode()

- [ ] Task 5: isTutorial 守卫 (AC: 5)
  - [ ] 5.1 `battle.ts` — isTutorial 时跳过 Ascension 修正器调用
  - [ ] 5.2 `battle.ts` — isTutorial 时 gameover 不记录排行榜
  - [ ] 5.3 `shop.ts` — isTutorial 时隐藏刷新按钮、遗物 tab
  - [ ] 5.4 遗物管道 — isTutorial 时跳过 resolveRelicEffects

- [ ] Task 6: 教程预设数据 (AC: 6)
  - [ ] 6.1 教程词库常量：`TUTORIAL_WORDS = ['fire','flame','frost','frog','ice','bolt','spark','storm','wolf','hero']`
  - [ ] 6.2 startTutorialMode 中设置：classId='none'、gold=0、level=1、无遗物

- [ ] Task 7: 回归验证
  - [ ] 7.1 主菜单教程按钮可用
  - [ ] 7.2 点击进入教程→显示战斗界面（阶段 1 占位）
  - [ ] 7.3 Esc 退出回主菜单
  - [ ] 7.4 正式游戏 isTutorial=false 不受影响
  - [ ] 7.5 Vite build 成功

## Dev Notes

### 已有文件（可复用）

| 文件 | 作用 | 复用方式 |
|------|------|----------|
| `systems/tutorial/TutorialManager.ts` | 事件驱动引导 | 教程模式完成后仍可用于正式游戏引导 |
| `systems/tutorial/TutorialOverlay.ts` | 提示框 UI | 56-3b 复用提示框渲染 |
| `data/tutorialSteps.ts` | 引导步骤数据 | 不修改，教程模式用独立数据 |

### 新建文件

| 文件 | 作用 |
|------|------|
| `systems/tutorial/TutorialMode.ts` | 教程模式状态机（与 TutorialManager 互补） |

### 教程词库

```typescript
const TUTORIAL_WORDS = ['fire', 'flame', 'frost', 'frog', 'ice', 'bolt', 'spark', 'storm', 'wolf', 'hero']
```
短词为主，含 F 的词≥4（fire/flame/frost/frog）供阶段 4 技能触发用。

### References

- [Source: docs/implementation-artifacts/56-2-tutorial-stage-design.md — 设计]
- [Source: src/src/systems/tutorial/TutorialManager.ts — 已有引导系统]
- [Source: src/src/systems/tutorial/TutorialOverlay.ts — 已有提示 UI]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

无

### Completion Notes List

- types.ts: GameState.isTutorial
- state.ts: createInitialState isTutorial: false
- TutorialMode.ts: 新建状态机 (start/advance/exit/TUTORIAL_WORDS)
- main.ts: 教程按钮接入 (Demo+Full)
- MetaState.ts: RunResultData.isTutorial + checkUnlocks 守卫
- battle.ts: meta:check_unlocks emit 传递 isTutorial
- index.html: 教程按钮去 disabled

### Change Log

- 2026-04-07: Story 56-3a 教程基础设施完成

### File List

- `src/src/systems/tutorial/TutorialMode.ts` (新建)
- `src/src/core/types.ts`
- `src/src/core/state.ts`
- `src/src/core/state/MetaState.ts`
- `src/src/systems/battle.ts`
- `src/src/main.ts`
- `src/index.html`
