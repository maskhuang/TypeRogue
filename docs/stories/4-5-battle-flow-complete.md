---
title: "Story 4.5: 战斗流程完整循环"
epic: "Epic 4: 战斗场景"
story_key: "4-5-battle-flow-complete"
status: "done"
created: "2026-02-17"
depends_on:
  - "4-1-scene-manager"
  - "4-2-battle-scene-framework"
  - "4-3-battle-hud"
  - "4-4-keyboard-visualizer"
  - "1-2-word-matcher"
  - "1-3-word-loader"
  - "1-4-basic-scoring"
  - "3-4-skill-trigger-integration"
---

# Story 4.5: 战斗流程完整循环

## 概述

实现完整的战斗流程，将已有的核心系统（打字、计分、技能、HUD、键盘可视化）串联成可玩的战斗循环。玩家输入词语触发技能、累积分数、管理时间，直到战斗结束触发胜利或失败结算。

## Story

作为一个 **玩家**，
我想要 **体验完整的战斗流程（开始 → 打字 → 计分 → 时间结束 → 结算）**，
以便 **感受游戏的核心玩法循环**。

## 验收标准

- [x] AC1: 战斗开始时加载词语列表并显示当前词语
- [x] AC2: 玩家输入正确字符时高亮显示，错误时有视觉反馈
- [x] AC3: 词语完成时触发对应键位技能、计算分数、加载下一个词语
- [x] AC4: 连击系统正确累积和重置
- [x] AC5: 时间耗尽时进入结算阶段，显示胜利/失败结果
- [x] AC6: 结算后可以重新开始或返回（预留接口）

## 技术说明

### 文件位置

- `src/scenes/battle/BattleScene.ts` - 扩展战斗场景（已存在）
- `src/scenes/battle/WordController.ts` - 词语控制器（新建）
- `src/scenes/battle/BattleFlowController.ts` - 战斗流程控制器（新建）
- `src/ui/hud/WordDisplay.ts` - 扩展词语显示（已存在）
- `src/systems/typing/InputHandler.ts` - 输入处理（已存在，需集成）

### 架构参考

```
game-architecture.md - Scene Management:

场景流程：Menu → Battle ⇄ Shop → Victory/GameOver

game-architecture.md - State Management:

- BattleState: 战斗数据（分数、倍率、连击、词语）
- 协调多层状态更新（StateCoordinator）

game-architecture.md - Event System:

事件流：
- 'word:complete': { word: string, time: number, accuracy: number }
- 'battle:end': { result: 'win' | 'lose', score: number }
- 'skill:triggered': { key: string, skillId: string, type: 'passive' | 'active' }
```

### 战斗流程设计

```
┌─────────────────────────────────────────────────────────────────┐
│                        战斗流程                                   │
├─────────────────────────────────────────────────────────────────┤
│  1. onEnter()                                                    │
│     ├── 加载词库 (WordLoader)                                    │
│     ├── 初始化 BattleState                                       │
│     ├── 创建 WordController                                      │
│     └── 绑定输入事件                                              │
│                                                                   │
│  2. 打字循环 (update)                                             │
│     ├── 显示当前词语 → WordDisplay                                │
│     ├── 监听 input:keypress                                       │
│     │   ├── 正确字符 → 高亮 + 推进 + 触发技能                      │
│     │   └── 错误字符 → 错误反馈 + 断连击                          │
│     ├── 词语完成 → word:complete                                  │
│     │   ├── 计分 (ScoreCalculator)                                │
│     │   ├── 更新连击                                              │
│     │   └── 加载下一词语                                          │
│     └── 时间更新 → TimerBar                                       │
│                                                                   │
│  3. 结束条件                                                      │
│     ├── 时间耗尽 → phase = 'defeat' (未达目标分)                  │
│     ├── 达到目标分 → phase = 'victory'                            │
│     └── 发送 battle:end 事件                                      │
│                                                                   │
│  4. 结算显示                                                      │
│     ├── 胜利: 显示得分统计                                        │
│     └── 失败: 显示进度                                            │
└─────────────────────────────────────────────────────────────────┘
```

### 依赖关系

**依赖:**
- `systems/typing/WordLoader.ts` - 词库加载
- `systems/typing/WordMatcher.ts` - 词语匹配
- `systems/scoring/ScoreCalculator.ts` - 分数计算
- `systems/skills/SkillCoordinator.ts` - 技能协调（如有）
- `core/state/BattleState.ts` - 战斗状态
- `core/events/EventBus.ts` - 事件总线
- `ui/hud/BattleHUD.ts` - 战斗 HUD
- `ui/keyboard/KeyboardVisualizer.ts` - 键盘可视化

**被依赖:**
- Story 5.1 (Run 状态管理) - 战斗结果传递给 Run
- Story 5.3 (商店场景) - 战斗胜利后转场

## 实现任务

### Task 1: WordController 词语控制器 (AC: #1, #3)

创建 `src/scenes/battle/WordController.ts`:

```typescript
import { wordLoader } from '../../systems/typing/WordLoader'
import { WordMatcher } from '../../systems/typing/WordMatcher'
import { eventBus } from '../../core/events/EventBus'

/**
 * 词语控制器
 *
 * 职责:
 * - 管理当前词语和词语队列
 * - 协调 WordMatcher 进行匹配
 * - 发送 word:complete 事件
 */
export class WordController {
  private wordQueue: string[] = []
  private currentWord: string = ''
  private currentIndex: number = 0
  private wordMatcher: WordMatcher

  constructor() {
    this.wordMatcher = new WordMatcher()
  }

  /**
   * 初始化词语队列
   * @param difficulty 难度等级 (1-3)
   */
  async initialize(difficulty: number = 1): Promise<void> {
    const words = await wordLoader.loadWords('zh-pinyin')
    // 根据难度过滤词语长度
    this.wordQueue = this.shuffleAndFilter(words, difficulty)
    this.loadNextWord()
  }

  /**
   * 加载下一个词语
   */
  loadNextWord(): void {
    if (this.wordQueue.length === 0) {
      // 词库耗尽，重新打乱
      this.shuffleQueue()
    }
    this.currentWord = this.wordQueue.shift() || 'test'
    this.currentIndex = 0
    this.wordMatcher.setTarget(this.currentWord)

    eventBus.emit('word:new', {
      word: this.currentWord,
      length: this.currentWord.length
    })
  }

  /**
   * 处理按键输入
   * @returns 匹配结果
   */
  handleKeyPress(key: string): { correct: boolean; completed: boolean; char: string } {
    const expectedChar = this.currentWord[this.currentIndex]
    const correct = key.toLowerCase() === expectedChar.toLowerCase()

    if (correct) {
      this.currentIndex++
      const completed = this.currentIndex >= this.currentWord.length

      if (completed) {
        eventBus.emit('word:complete', {
          word: this.currentWord,
          time: 0, // TODO: 计算用时
          accuracy: 1.0
        })
        this.loadNextWord()
      }

      return { correct: true, completed, char: expectedChar }
    }

    eventBus.emit('word:error', {
      expected: expectedChar,
      actual: key
    })

    return { correct: false, completed: false, char: key }
  }

  /**
   * 获取当前词语
   */
  getCurrentWord(): string {
    return this.currentWord
  }

  /**
   * 获取当前输入位置
   */
  getCurrentIndex(): number {
    return this.currentIndex
  }

  /**
   * 打乱并过滤词语
   */
  private shuffleAndFilter(words: string[], difficulty: number): string[] {
    // 根据难度过滤词语长度
    const minLen = difficulty === 1 ? 2 : difficulty === 2 ? 4 : 6
    const maxLen = difficulty === 1 ? 5 : difficulty === 2 ? 7 : 10

    const filtered = words.filter(w => w.length >= minLen && w.length <= maxLen)
    return this.shuffle(filtered)
  }

  private shuffle(array: string[]): string[] {
    const result = [...array]
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }

  private shuffleQueue(): void {
    this.wordQueue = this.shuffle(this.wordQueue)
  }
}
```

### Task 2: BattleFlowController 流程控制器 (AC: #2, #4, #5)

创建 `src/scenes/battle/BattleFlowController.ts`:

```typescript
import { BattleState } from '../../core/state/BattleState'
import { ScoreCalculator } from '../../systems/scoring/ScoreCalculator'
import { eventBus } from '../../core/events/EventBus'
import { WordController } from './WordController'

/**
 * 战斗流程控制器
 *
 * 职责:
 * - 协调词语、计分、技能系统
 * - 管理连击状态
 * - 处理战斗结束条件
 */
export class BattleFlowController {
  private battleState: BattleState
  private wordController: WordController
  private scoreCalculator: ScoreCalculator

  // 目标分数（达到即胜利）
  private targetScore: number = 1000

  // 事件取消订阅
  private unsubKeypress: (() => void) | null = null
  private unsubWordComplete: (() => void) | null = null

  constructor(battleState: BattleState) {
    this.battleState = battleState
    this.wordController = new WordController()
    this.scoreCalculator = new ScoreCalculator()
  }

  /**
   * 初始化战斗流程
   */
  async initialize(stageConfig: { difficulty: number; targetScore: number; timeLimit: number }): Promise<void> {
    this.targetScore = stageConfig.targetScore

    // 初始化词语控制器
    await this.wordController.initialize(stageConfig.difficulty)

    // 设置时间限制
    this.battleState.setTimeLimit(stageConfig.timeLimit)

    // 绑定事件
    this.bindEvents()
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    this.unsubKeypress = eventBus.on('input:keypress', this.onKeyPress.bind(this))
    this.unsubWordComplete = eventBus.on('word:complete', this.onWordComplete.bind(this))
  }

  /**
   * 解绑事件
   */
  unbindEvents(): void {
    this.unsubKeypress?.()
    this.unsubWordComplete?.()
    this.unsubKeypress = null
    this.unsubWordComplete = null
  }

  /**
   * 处理按键
   */
  private onKeyPress(data: { key: string; timestamp: number }): void {
    if (!this.battleState.isPlaying()) return

    const result = this.wordController.handleKeyPress(data.key)

    if (result.correct) {
      // 正确输入 - 触发技能
      eventBus.emit('skill:triggered', {
        key: data.key,
        skillId: '', // TODO: 从 RunState 获取绑定
        type: 'passive' as const
      })
    } else {
      // 错误输入 - 断连击
      this.battleState.resetCombo()
    }
  }

  /**
   * 处理词语完成
   */
  private onWordComplete(data: { word: string; time: number; accuracy: number }): void {
    // 增加连击
    this.battleState.incrementCombo()

    // 计算分数
    const baseScore = this.scoreCalculator.calculateWordScore(
      data.word.length,
      this.battleState.getState().combo
    )

    // 应用倍率
    const finalScore = baseScore * this.battleState.getState().multiplier

    // 更新分数
    this.battleState.addScore(finalScore)

    // 发送分数更新事件
    eventBus.emit('score:update', {
      score: this.battleState.getState().score,
      delta: finalScore
    })

    // 检查胜利条件
    if (this.battleState.getState().score >= this.targetScore) {
      this.battleState.setPhase('victory')
    }
  }

  /**
   * 每帧更新
   */
  update(dt: number): void {
    // 检查时间结束
    if (this.battleState.isEnded()) {
      this.checkEndCondition()
    }
  }

  /**
   * 检查结束条件
   */
  private checkEndCondition(): void {
    const state = this.battleState.getState()

    if (state.phase === 'victory') {
      // 已胜利
      return
    }

    if (state.remainingTime <= 0 && state.score < this.targetScore) {
      this.battleState.setPhase('defeat')
    }
  }

  /**
   * 获取词语控制器
   */
  getWordController(): WordController {
    return this.wordController
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.unbindEvents()
  }
}
```

### Task 3: 扩展 BattleState (AC: #4, #5)

更新 `src/core/state/BattleState.ts` 添加:

```typescript
// 添加到 BattleState 类

/**
 * 增加连击
 */
incrementCombo(): void {
  this.state.combo++
  // 每 10 连击增加 0.1 倍率
  if (this.state.combo % 10 === 0) {
    this.state.multiplier += 0.1
  }
}

/**
 * 重置连击
 */
resetCombo(): void {
  this.state.combo = 0
}

/**
 * 添加分数
 */
addScore(points: number): void {
  this.state.score += Math.round(points)
}

/**
 * 设置时间限制
 */
setTimeLimit(seconds: number): void {
  this.state.totalTime = seconds
  this.state.remainingTime = seconds
}

/**
 * 设置游戏阶段
 */
setPhase(phase: 'ready' | 'playing' | 'paused' | 'victory' | 'defeat'): void {
  this.state.phase = phase
}
```

### Task 4: 集成到 BattleScene (AC: #1-#6)

更新 `src/scenes/battle/BattleScene.ts`:

```typescript
import { BattleFlowController } from './BattleFlowController'
import { WordController } from './WordController'

// 在 BattleScene 类中添加
private flowController!: BattleFlowController

// 在 onEnter() 中添加
async onEnter(): Promise<void> {
  super.onEnter()

  // ... 现有的层级创建、HUD、键盘可视化 ...

  // 创建流程控制器
  this.flowController = new BattleFlowController(this.battleState)

  // 初始化战斗（异步）
  await this.flowController.initialize({
    difficulty: 1,
    targetScore: 1000,
    timeLimit: 60
  })

  // 更新 WordDisplay 显示初始词语
  const wordController = this.flowController.getWordController()
  this.hud.getWordDisplay().setWord(wordController.getCurrentWord())

  // 监听词语更新
  eventBus.on('word:new', (data) => {
    this.hud.getWordDisplay().setWord(data.word)
    this.hud.getWordDisplay().setProgress(0)
  })

  // 监听输入进度
  eventBus.on('input:keypress', (data) => {
    const wordController = this.flowController.getWordController()
    const progress = wordController.getCurrentIndex() / wordController.getCurrentWord().length
    this.hud.getWordDisplay().setProgress(progress)
  })

  // 开始战斗
  this.battleState.start()
}

// 在 update() 中添加
update(dt: number): void {
  // ... 现有更新逻辑 ...

  // 更新流程控制器
  if (this.flowController) {
    this.flowController.update(dt / 1000)
  }

  // 检查结束状态
  if (this.battleState.getState().phase === 'victory' ||
      this.battleState.getState().phase === 'defeat') {
    if (!this.battleEndEmitted) {
      this.onBattleEnd()
    }
  }
}

// 在 onExit() 中添加
onExit(): void {
  // ... 现有清理逻辑 ...

  if (this.flowController) {
    this.flowController.destroy()
  }
}
```

### Task 5: 扩展 WordDisplay (AC: #2)

更新 `src/ui/hud/WordDisplay.ts` 添加字符高亮和错误反馈:

```typescript
// 添加到 WordDisplay 类

/**
 * 设置输入进度（高亮已输入字符）
 * @param progress 0-1 的进度值
 */
setProgress(progress: number): void {
  const charIndex = Math.floor(progress * this.currentWord.length)
  this.updateCharacterHighlights(charIndex)
}

/**
 * 更新字符高亮
 */
private updateCharacterHighlights(completedChars: number): void {
  // 已完成字符显示绿色
  // 当前字符显示白色（待输入）
  // 后续字符显示灰色
  this.redrawWithHighlights(completedChars)
}

/**
 * 显示错误反馈
 */
showError(): void {
  // 短暂红色闪烁
  this.wordText.style.fill = 0xff5252
  setTimeout(() => {
    this.wordText.style.fill = 0xffffff
  }, 100)
}
```

### Task 6: 添加事件类型 (AC: #1, #3)

更新 `src/core/events/EventBus.ts`:

```typescript
// 添加到 GameEvents 接口

// 词语事件
'word:new': { word: string; length: number }
'word:complete': { word: string; time: number; accuracy: number }
'word:error': { expected: string; actual: string }

// 分数事件
'score:update': { score: number; delta: number }
```

### Task 7: 单元测试

**`tests/unit/scenes/battle/WordController.test.ts`:**
- initialize 加载词语队列
- handleKeyPress 正确字符返回 correct: true
- handleKeyPress 错误字符返回 correct: false
- 词语完成后自动加载下一个
- loadNextWord 发送 word:new 事件

**`tests/unit/scenes/battle/BattleFlowController.test.ts`:**
- initialize 设置目标分数和时间
- onKeyPress 正确输入触发技能事件
- onKeyPress 错误输入重置连击
- onWordComplete 增加连击和分数
- 达到目标分触发 victory
- 时间耗尽未达标触发 defeat

预计新增测试: ~25 个

## 测试计划

### 单元测试 (vitest)

- `WordController.test.ts`: 词语管理逻辑 (~10 tests)
- `BattleFlowController.test.ts`: 流程控制逻辑 (~15 tests)

### 集成测试

手动验证:
1. 战斗开始显示第一个词语
2. 输入正确字符时字符高亮
3. 输入错误字符时红色闪烁
4. 词语完成后分数增加、连击+1
5. 连续正确输入倍率增加
6. 时间耗尽显示失败
7. 达到目标分显示胜利

## Dev Notes

### 从前置 Story 学到的经验

**从 Story 4.4 (键盘可视化):**
- 使用事件驱动架构，通过 EventBus 解耦组件
- destroyed 状态检查防止销毁后事件处理错误
- 使用 unsubscribe 函数确保事件正确解绑

**从 Story 4.3 (战斗 HUD):**
- BattleHUD.syncWithState() 模式用于同步状态到 UI
- 缓存上次值避免每帧重复更新

**从 Story 1.2 (词语匹配器):**
- WordMatcher 已实现逐字符匹配逻辑

**从 Story 1.4 (基础计分):**
- ScoreCalculator 已实现基础分数计算

### 技术要点

1. **异步初始化**: BattleScene.onEnter() 需要 async 支持词库加载
2. **事件流向**: input:keypress → WordController → word:complete → BattleFlowController → score:update
3. **状态同步**: BattleState 作为唯一数据源，UI 通过事件或 syncWithState 同步
4. **词库复用**: WordController 词库耗尽时重新打乱

### 关卡配置结构（预留）

```typescript
interface StageConfig {
  difficulty: number      // 1-3
  targetScore: number     // 胜利目标
  timeLimit: number       // 秒
  wordSource: string      // 词库 ID
}

// 示例关卡配置
const STAGES: StageConfig[] = [
  { difficulty: 1, targetScore: 500, timeLimit: 60, wordSource: 'zh-pinyin' },
  { difficulty: 1, targetScore: 800, timeLimit: 60, wordSource: 'zh-pinyin' },
  { difficulty: 2, targetScore: 1000, timeLimit: 60, wordSource: 'zh-pinyin' },
  // ...
]
```

### 项目结构对齐

```
src/
├── scenes/
│   ├── battle/
│   │   ├── BattleScene.ts          # 已存在，扩展
│   │   ├── WordController.ts       # 新建
│   │   └── BattleFlowController.ts # 新建
├── ui/
│   ├── hud/
│   │   └── WordDisplay.ts          # 已存在，扩展
```

### 预留接口

```typescript
// 战斗结束后的回调（供 Story 5.x 实现）
interface BattleResult {
  result: 'win' | 'lose'
  score: number
  maxCombo: number
  accuracy: number
  wordsCompleted: number
}

// BattleScene 将在结束时发送此数据
// 供 RunState 和 SceneManager 处理转场
```

### References

- [game-architecture.md - State Management](../game-architecture.md#state-management)
- [game-architecture.md - Event System](../game-architecture.md#event-system)
- [epics.md - Story 4.5](../epics.md#story-45-战斗流程完整循环)
- [Story 4.4 - 键盘可视化](./4-4-keyboard-visualizer.md)
- [Story 4.3 - 战斗 HUD](./4-3-battle-hud.md)
- [Story 1.2 - 词语匹配器](./1-2-word-matcher.md)
- [Story 1.4 - 基础计分](./1-4-basic-scoring.md)

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

1. **Task 1 (WordController)**: Created `src/scenes/battle/WordController.ts` with word queue management, key press handling, Fisher-Yates shuffle, and difficulty-based word filtering. Emits `word:new`, `word:complete`, `word:error` events.

2. **Task 2 (BattleFlowController)**: Created `src/scenes/battle/BattleFlowController.ts` coordinating battle flow, scoring, and victory/defeat conditions. Uses `initializeSync()` for testing and async `initialize()` for production.

3. **Task 3 (BattleState expansion)**: Added `incrementCombo()`, `resetCombo()`, `addScore()`, `setPhase()`, `getRemainingTime()` methods to `src/core/state/BattleState.ts`.

4. **Task 4 (BattleScene integration)**: Updated `src/scenes/battle/BattleScene.ts` to integrate BattleFlowController with async initialization, event binding for `word:new`, `input:keypress`, `word:error`, and proper cleanup in `onExit()` and `destroy()`.

5. **Task 5 (WordDisplay expansion)**: Added `setProgress()` and `showError()` methods to `src/ui/hud/WordDisplay.ts` for character highlighting and error feedback (100ms red flash).

6. **Task 6 (Event types)**: Added `word:new` event type to `src/core/events/EventBus.ts`.

7. **Task 7 (Unit tests)**: Created 50 new tests across `WordController.test.ts` (27 tests) and `BattleFlowController.test.ts` (23 tests). Updated `BattleScene.test.ts` for async initialization handling.

8. **Test Results**: All 375 tests pass.

### File List

**New Files:**
- `src/scenes/battle/WordController.ts`
- `src/scenes/battle/BattleFlowController.ts`
- `tests/unit/scenes/battle/WordController.test.ts`
- `tests/unit/scenes/battle/BattleFlowController.test.ts`

**Modified Files:**
- `src/scenes/battle/BattleScene.ts`
- `src/core/state/BattleState.ts`
- `src/ui/hud/WordDisplay.ts`
- `src/core/events/EventBus.ts`
- `tests/unit/scenes/battle/BattleScene.test.ts`

## Change Log

| 日期 | 变更 |
|------|------|
| 2026-02-17 | 创建 Story 4.5 战斗流程完整循环文档 |
| 2026-02-17 | 完成所有任务实现，375 测试通过，状态更新为 review |
| 2026-02-17 | 代码审查修复：(1) WordController 难度保持 bug (2) 添加 BattleResult 接口 (3) WordController destroyed 保护 (4) 进度显示时序修复 (5) 移除死代码 (6) 新增 8 个测试。383 测试通过，状态更新为 done |
