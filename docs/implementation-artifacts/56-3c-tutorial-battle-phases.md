# Story 56.3c: 教程阶段 1-4（战斗教程）

Status: done

## Story

As a 新手玩家,
I want 教程的前 4 个阶段引导我学会打字得分、连击倍率、时间目标和技能触发,
so that 我进入正式游戏前已理解核心战斗循环。

## Acceptance Criteria

1. **AC1: 阶段 1 打字基础** — 无时限，打 3 词得分，提示引导
2. **AC2: 阶段 2 连击倍率** — 显示 combo/multiplier，打 5 词体验连击
3. **AC3: 阶段 3 时间目标** — 30s 计时 + 目标 300，达标/未达标均推进
4. **AC4: 阶段 4 技能触发** — 赠送预设技能绑定 F 键，打含 F 词触发 3 次
5. **AC5: HUD 渐进显示** — 每阶段逐步显示更多 HUD 元素
6. **AC6: 阶段间过渡** — 每阶段完成后显示提示→按键继续→进入下一阶段
7. **AC7: 阶段 3/4 使用战斗系统** — 复用 startLevel/completeWord 等战斗代码

## Tasks / Subtasks

- [ ] Task 1: 教程主控流程 (AC: 6, 7)
  - [ ] 1.1 `TutorialMode.ts` 新增 `runTutorialPhases()` async 函数 — 按顺序执行 P1→P4
  - [ ] 1.2 `startTutorialMode()` 调用 `runTutorialPhases()` 而非直接 showScreen('battle')
  - [ ] 1.3 每阶段结束后调用 `advanceTutorialPhase()` 推进状态

- [ ] Task 2: 阶段 1 — 打字基础 (AC: 1, 5)
  - [ ] 2.1 `showPrompt('tutorial.phase1.intro', { arrow: { target: 'word-display', position: 'top' } })`
  - [ ] 2.2 showScreen('battle')，隐藏 combo/multiplier/timer/target HUD
  - [ ] 2.3 设置无时限（time=9999）、无目标（targetScore=99999）
  - [ ] 2.4 监听 eventBus `word:completed` 计数，打 3 词后推进
  - [ ] 2.5 `showPrompt('tutorial.phase1.done')`

- [ ] Task 3: 阶段 2 — 连击倍率 (AC: 2, 5)
  - [ ] 3.1 `showPrompt('tutorial.phase2.intro')`
  - [ ] 3.2 显示 combo + multiplier HUD
  - [ ] 3.3 监听打 5 词，其中检测 combo 断裂 → `showPrompt('tutorial.phase2.break')`
  - [ ] 3.4 `showPrompt('tutorial.phase2.mult')`

- [ ] Task 4: 阶段 3 — 时间目标 (AC: 3, 5)
  - [ ] 4.1 `showPrompt('tutorial.phase3.intro', { arrow: { target: 'timer-display', position: 'bottom' } })`
  - [ ] 4.2 显示完整 HUD，启动计时器 30s + targetScore=300
  - [ ] 4.3 达标检测 → `showPrompt('tutorial.phase3.reached')`
  - [ ] 4.4 时间到/达标后推进（不触发 gameover）
  - [ ] 4.5 未达标 → `showPrompt('tutorial.phase3.fail')` → 仍推进

- [ ] Task 5: 阶段 4 — 技能触发 (AC: 4, 5)
  - [ ] 5.1 `showPrompt('tutorial.phase4.intro')`
  - [ ] 5.2 生成预设技能（base 产出、rarity 0、level 1）绑定 F 键
  - [ ] 5.3 确保词库优先选含 F 的词
  - [ ] 5.4 `showPrompt('tutorial.phase4.hint', { arrow: 指向 F 键 })`
  - [ ] 5.5 监听 eventBus `skill:triggered` 计数 3 次
  - [ ] 5.6 `showPrompt('tutorial.phase4.done')`

- [ ] Task 6: HUD 显隐控制 (AC: 5)
  - [ ] 6.1 `setTutorialHUD(phase)` 函数 — 根据阶段显隐 HUD 元素
  - [ ] 6.2 P1: 仅 word-display + score
  - [ ] 6.3 P2: + combo + multiplier
  - [ ] 6.4 P3/P4: 全部 HUD

- [ ] Task 7: i18n 文案 (AC: 6)
  - [ ] 7.1 添加 P1-P4 全部文案到 ZH/EN 字典（复用 56-2 设计文档文案表）

- [ ] Task 8: 回归验证
  - [ ] 8.1 教程 P1→P4 完整流程可走通
  - [ ] 8.2 Esc 任何阶段可退出
  - [ ] 8.3 正式游戏不受影响
  - [ ] 8.4 Vite build 成功

## Dev Notes

### 技术方案

教程阶段复用现有战斗系统但通过 `state.isTutorial` 控制差异：
- P1/P2: 设置超大 time/targetScore 模拟"无时限无目标"
- P3/P4: 正常 time/targetScore 但 gameover 时不触发死亡流程
- 技能触发: 复用 `generateSkill` + `bindShapeToKeys`

### 阶段推进 eventBus 事件

| 事件 | 用途 |
|------|------|
| `word:completed` | P1/P2 计数打词数 |
| `combo:break` | P2 检测连击断裂 |
| `score:target_reached` | P3 检测达标 |
| `skill:triggered` | P4 检测技能触发次数 |
| `battle:time_up` | P3 时间到 |

需确认这些事件是否已在 eventBus 中 emit。

### 关键依赖

- `TutorialMode.ts`（56-3a）— 状态机
- `TutorialPrompt.ts`（56-3b）— showPrompt/dismissPrompt
- `showScreen('battle')`、`startLevel()`、战斗输入系统

### References

- [Source: docs/implementation-artifacts/56-2-tutorial-stage-design.md — 阶段 1-4 设计]
- [Source: src/src/systems/tutorial/TutorialMode.ts — 状态机]
- [Source: src/src/ui/tutorial/TutorialPrompt.ts — 提示 UI]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
