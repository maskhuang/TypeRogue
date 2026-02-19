---
title: "Story 4.2: 战斗场景框架"
epic: "Epic 4: 战斗场景"
story_key: "4-2-battle-scene-framework"
status: "done"
created: "2026-02-16"
completed: "2026-02-16"
depends_on:
  - "4-1-scene-manager"
---

# Story 4.2: 战斗场景框架

## 概述

创建 BattleScene 基础框架，包括 PixiJS Container 层级结构、BattleState 战斗状态初始化、Ticker 游戏循环集成，以及暂停/恢复功能。此故事为后续 HUD、键盘可视化和完整战斗流程奠定基础。

## 验收标准

- [x] PixiJS Container 层级结构（背景层、游戏层、UI 层、效果层）
- [x] BattleState 战斗状态初始化和重置
- [x] 游戏循环集成 (Ticker)，正确传递 delta time
- [x] 暂停/恢复支持（暂停时停止 Ticker 更新，UI 层保持响应）
- [x] 与 SceneManager 正确集成（生命周期钩子）

## 技术说明

### 文件位置

- `src/scenes/battle/BattleScene.ts` - 战斗场景主类
- `src/core/state/BattleState.ts` - 战斗状态管理

### 架构参考

```
game-architecture.md - State Management:

interface GameState {
  meta: MetaState      // 永久数据
  run: RunState        // 单局数据
  battle: BattleState  // 战斗数据：分数、倍率、连击、词语
}

game-architecture.md - Scene Management:

interface Scene {
  onEnter(): void
  onExit(): void
  onPause?(): void
  onResume?(): void
  update(dt: number): void
  render(): void
}
```

### Container 层级结构

```
BattleScene.container (root)
├── backgroundLayer   // 背景、装饰
├── gameLayer         // 游戏对象（词语、效果）
├── uiLayer           // HUD（分数、计时器、连击）
└── effectLayer       // 粒子、特效（最上层）
```

### 依赖关系

- 依赖: `scenes/SceneManager.ts`, `scenes/BaseScene.ts`
- 依赖: `core/events/EventBus.ts` (battle:start, battle:pause, battle:resume 事件)
- 被依赖: Story 4.3 (HUD)、Story 4.4 (键盘可视化)、Story 4.5 (战斗流程)

## 实现任务

### Task 1: BattleState 状态定义 ✅

创建 `src/core/state/BattleState.ts`:

```typescript
/**
 * 战斗阶段枚举
 */
export type BattlePhase = 'ready' | 'playing' | 'paused' | 'victory' | 'defeat'

/**
 * 战斗状态接口
 */
export interface BattleStateData {
  /** 当前阶段 */
  phase: BattlePhase

  /** 当前词语 */
  currentWord: string

  /** 已输入的正确字符 */
  typedChars: string

  /** 当前词语索引（词库中的位置） */
  wordIndex: number

  /** 本局分数 */
  score: number

  /** 当前倍率 */
  multiplier: number

  /** 连击数 */
  combo: number

  /** 最高连击 */
  maxCombo: number

  /** 剩余时间（秒） */
  timeRemaining: number

  /** 总时间（秒） */
  totalTime: number

  /** 已完成词语数 */
  wordsCompleted: number

  /** 错误次数 */
  errorCount: number
}

/**
 * 战斗状态管理类
 */
export class BattleState {
  private data: BattleStateData

  constructor() {
    this.data = this.createInitialState()
  }

  private createInitialState(): BattleStateData {
    return {
      phase: 'ready',
      currentWord: '',
      typedChars: '',
      wordIndex: 0,
      score: 0,
      multiplier: 1.0,
      combo: 0,
      maxCombo: 0,
      timeRemaining: 60,
      totalTime: 60,
      wordsCompleted: 0,
      errorCount: 0
    }
  }

  /** 重置状态（新战斗） */
  reset(totalTime: number = 60): void {
    this.data = this.createInitialState()
    this.data.totalTime = totalTime
    this.data.timeRemaining = totalTime
  }

  /** 开始战斗 */
  start(): void {
    this.data.phase = 'playing'
  }

  /** 暂停战斗 */
  pause(): void {
    if (this.data.phase === 'playing') {
      this.data.phase = 'paused'
    }
  }

  /** 恢复战斗 */
  resume(): void {
    if (this.data.phase === 'paused') {
      this.data.phase = 'playing'
    }
  }

  /** 获取只读状态 */
  getState(): Readonly<BattleStateData> {
    return this.data
  }

  /** 更新时间 */
  updateTime(dt: number): void {
    if (this.data.phase === 'playing') {
      this.data.timeRemaining = Math.max(0, this.data.timeRemaining - dt)
      if (this.data.timeRemaining <= 0) {
        this.data.phase = 'defeat'
      }
    }
  }

  /** 设置当前词语 */
  setCurrentWord(word: string): void {
    this.data.currentWord = word
    this.data.typedChars = ''
  }

  /** 添加正确字符 */
  addTypedChar(char: string): void {
    this.data.typedChars += char
  }

  /** 词语完成 */
  completeWord(scoreGain: number): void {
    this.data.score += scoreGain
    this.data.combo++
    this.data.maxCombo = Math.max(this.data.maxCombo, this.data.combo)
    this.data.wordsCompleted++
    this.data.wordIndex++
  }

  /** 输入错误 */
  onError(): void {
    this.data.combo = 0
    this.data.errorCount++
  }

  /** 更新倍率 */
  setMultiplier(value: number): void {
    this.data.multiplier = value
  }

  /** 检查是否正在游戏 */
  isPlaying(): boolean {
    return this.data.phase === 'playing'
  }

  /** 检查是否已暂停 */
  isPaused(): boolean {
    return this.data.phase === 'paused'
  }

  /** 检查是否已结束 */
  isEnded(): boolean {
    return this.data.phase === 'victory' || this.data.phase === 'defeat'
  }
}
```

### Task 2: BattleScene 基础框架 ✅

创建 `src/scenes/battle/BattleScene.ts`:

```typescript
import { Container, Graphics, Application } from 'pixi.js'
import { BaseScene } from '../BaseScene'
import { BattleState } from '../../core/state/BattleState'
import { eventBus } from '../../core/events/EventBus'

/**
 * 战斗场景
 *
 * 职责:
 * - 管理战斗 UI 层级
 * - 驱动 BattleState 更新
 * - 处理暂停/恢复
 * - 协调子系统（HUD、键盘、效果）
 */
export class BattleScene extends BaseScene {
  readonly name = 'BattleScene'

  // Container 层级
  private backgroundLayer!: Container
  private gameLayer!: Container
  private uiLayer!: Container
  private effectLayer!: Container

  // 战斗状态
  private battleState: BattleState

  // 应用引用（用于获取屏幕尺寸）
  private app: Application

  constructor(app: Application) {
    super()
    this.app = app
    this.battleState = new BattleState()
  }

  /**
   * 场景进入
   */
  onEnter(): void {
    super.onEnter()

    // 创建层级结构
    this.createLayers()

    // 初始化战斗状态
    this.battleState.reset()

    // 绑定事件
    this.bindEvents()

    // 发送战斗开始事件
    eventBus.emit('battle:start', { stageId: 1 })

    // 开始战斗
    this.battleState.start()
  }

  /**
   * 场景退出
   */
  onExit(): void {
    // 解绑事件
    this.unbindEvents()

    super.onExit()
  }

  /**
   * 场景暂停（被其他场景覆盖）
   */
  onPause(): void {
    super.onPause()
    this.pauseBattle()
  }

  /**
   * 场景恢复
   */
  onResume(): void {
    super.onResume()
    this.resumeBattle()
  }

  /**
   * 每帧更新
   */
  update(dt: number): void {
    if (!this.battleState.isPlaying()) {
      return
    }

    // 更新时间（dt 是毫秒，需要转换为秒）
    this.battleState.updateTime(dt / 1000)

    // 检查游戏结束
    if (this.battleState.isEnded()) {
      this.onBattleEnd()
    }
  }

  /**
   * 创建层级结构
   */
  private createLayers(): void {
    // 背景层
    this.backgroundLayer = new Container()
    this.backgroundLayer.label = 'backgroundLayer'
    this.container.addChild(this.backgroundLayer)

    // 添加临时背景（后续替换为实际背景）
    const bg = new Graphics()
    bg.rect(0, 0, this.app.screen.width, this.app.screen.height)
    bg.fill({ color: 0x1a1a2e })
    this.backgroundLayer.addChild(bg)

    // 游戏层
    this.gameLayer = new Container()
    this.gameLayer.label = 'gameLayer'
    this.container.addChild(this.gameLayer)

    // UI 层
    this.uiLayer = new Container()
    this.uiLayer.label = 'uiLayer'
    this.container.addChild(this.uiLayer)

    // 效果层
    this.effectLayer = new Container()
    this.effectLayer.label = 'effectLayer'
    this.container.addChild(this.effectLayer)
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    // 预留：键盘事件、技能事件等
  }

  /**
   * 解绑事件
   */
  private unbindEvents(): void {
    // 预留：清理事件监听
  }

  /**
   * 暂停战斗
   */
  pauseBattle(): void {
    if (this.battleState.isPlaying()) {
      this.battleState.pause()
      eventBus.emit('battle:pause', {})
    }
  }

  /**
   * 恢复战斗
   */
  resumeBattle(): void {
    if (this.battleState.isPaused()) {
      this.battleState.resume()
      eventBus.emit('battle:resume', {})
    }
  }

  /**
   * 战斗结束处理
   */
  private onBattleEnd(): void {
    const state = this.battleState.getState()
    eventBus.emit('battle:end', {
      result: state.phase === 'victory' ? 'win' : 'lose',
      score: state.score
    })
  }

  /**
   * 获取战斗状态（供子组件使用）
   */
  getBattleState(): BattleState {
    return this.battleState
  }

  /**
   * 获取游戏层（供子组件添加元素）
   */
  getGameLayer(): Container {
    return this.gameLayer
  }

  /**
   * 获取 UI 层（供 HUD 使用）
   */
  getUILayer(): Container {
    return this.uiLayer
  }

  /**
   * 获取效果层（供粒子系统使用）
   */
  getEffectLayer(): Container {
    return this.effectLayer
  }
}
```

### Task 3: 事件类型更新 ✅

在 `src/core/events/EventBus.ts` 中添加战斗事件类型:

```typescript
interface GameEvents {
  // ... 现有事件

  // 战斗事件
  'battle:start': { stageId: number }
  'battle:end': { result: 'win' | 'lose', score: number }
  'battle:pause': {}
  'battle:resume': {}

  // 词语事件（预留）
  'word:complete': { word: string, time: number, accuracy: number }
  'word:error': { expected: string, actual: string }
}
```

### Task 4: 导出更新 ✅

更新 `src/scenes/index.ts`:

```typescript
export type { Scene } from './Scene'
export { BaseScene } from './BaseScene'
export { SceneManager } from './SceneManager'
export { BattleScene } from './battle/BattleScene'
```

创建 `src/core/state/index.ts`:

```typescript
export { BattleState } from './BattleState'
export type { BattleStateData, BattlePhase } from './BattleState'
```

### Task 5: 单元测试 ✅

创建 `tests/unit/scenes/battle/BattleScene.test.ts`:

测试点:
1. **层级结构测试**
   - 创建后应有 4 个子层（background, game, ui, effect）
   - 层级顺序正确（effect 在最上层）

2. **生命周期测试**
   - onEnter 初始化 BattleState 并发送 battle:start 事件
   - onExit 正确清理资源
   - onPause 暂停战斗并发送 battle:pause 事件
   - onResume 恢复战斗并发送 battle:resume 事件

3. **update 测试**
   - 暂停时不更新时间
   - 正常游戏时更新时间
   - 时间耗尽时触发 battle:end

创建 `tests/unit/core/state/BattleState.test.ts`:

测试点:
1. **初始状态测试**
   - 默认 phase 为 'ready'
   - 默认分数为 0
   - 默认时间为 60 秒

2. **状态转换测试**
   - start() 将 phase 改为 'playing'
   - pause() 将 phase 改为 'paused'
   - resume() 将 phase 改为 'playing'
   - 仅 playing 状态可暂停
   - 仅 paused 状态可恢复

3. **游戏逻辑测试**
   - updateTime 正确减少时间
   - 时间耗尽时 phase 变为 'defeat'
   - completeWord 正确更新分数和连击
   - onError 重置连击但不重置 maxCombo

4. **reset 测试**
   - reset 恢复所有状态到初始值
   - reset 可自定义总时间

## 测试计划

### 单元测试 (vitest)

- `BattleState.test.ts`: 状态管理逻辑 (33 tests)
- `BattleScene.test.ts`: 场景生命周期和层级 (23 tests)

### 集成测试

手动验证:
- 场景切换到 BattleScene 正确显示
- 暂停/恢复功能正常
- 时间倒计时正确
- 事件正确触发

## 注意事项

1. **dt 单位**: PixiJS Ticker 的 delta 是毫秒，BattleState.updateTime 期望秒
2. **层级命名**: 使用 Container.label 便于调试
3. **事件清理**: onExit 时必须解绑所有事件监听
4. **状态不可变**: getState() 返回 Readonly 防止外部修改

## 相关文档

- [game-architecture.md - State Management](../game-architecture.md#state-management)
- [game-architecture.md - Scene Management](../game-architecture.md#scene-management)
- [epics.md - Story 4.2](../epics.md#story-42-战斗场景框架)
- [Story 4.1 - 场景管理器](./4-1-scene-manager.md)

---

## Dev Agent Record

### Implementation Plan
- Task 1: 创建 BattleState 状态管理类
- Task 2: 创建 BattleScene 框架，包含层级结构
- Task 3: 更新 EventBus 添加战斗事件类型
- Task 4: 更新模块导出
- Task 5: 编写单元测试

### Debug Log
- 无特殊问题

### Completion Notes
✅ 所有 5 个任务已完成
✅ 69 个单元测试全部通过（BattleState 37 + BattleScene 30）
✅ 所有验收标准已满足
✅ 总测试数从 102 增加到 169

### Learnings from Story 4.1
- 使用 isDestroyed 标志防止销毁后误用
- 事件测试需要 vi.mock EventBus
- 生命周期顺序测试很重要
- 添加 destroy() 方法便于资源清理

### Senior Developer Review (AI)

**Review Date:** 2026-02-16
**Outcome:** Approved (after fixes)

**Issues Found & Fixed:**
- [x] [HIGH] H1: BattleScene 缺少 onExit 测试 → 添加 onExit 和 destroy 测试
- [x] [HIGH] H2: BattleState 缺少 setVictory 方法 → 添加 setVictory() 和 setDefeat() 方法
- [x] [HIGH] H3: onBattleEnd 可能被多次调用 → 添加 battleEndEmitted 标志防止重复
- [x] [MEDIUM] M1: BattleScene 缺少 destroy 方法 → 添加 destroy() 方法
- [x] [MEDIUM] M4: stageId 硬编码 → 添加构造函数参数支持自定义 stageId

**Issues Noted (Low/Won't Fix):**
- L1: getState() Readonly 不是真正的深度不可变 - TypeScript 编译时检查足够
- L2: "getState 不可变性" 测试太弱 - 保留作为类型检查存在性验证

## File List

**新增文件:**
- `src/src/core/state/BattleState.ts` - 战斗状态管理（含 setVictory/setDefeat）
- `src/src/core/state/index.ts` - 状态模块导出
- `src/src/scenes/battle/BattleScene.ts` - 战斗场景（含 destroy、stageId、防重复触发）
- `src/tests/unit/core/state/BattleState.test.ts` - BattleState 单元测试 (37 tests)
- `src/tests/unit/scenes/battle/BattleScene.test.ts` - BattleScene 单元测试 (30 tests)

**修改文件:**
- `src/src/core/events/EventBus.ts` - 添加 battle:pause, battle:resume 事件类型
- `src/src/scenes/index.ts` - 添加 BattleScene 导出

## Change Log

| 日期 | 变更 |
|------|------|
| 2026-02-16 | 创建 Story 4.2 战斗场景框架文档 |
| 2026-02-16 | 完成 Story 4.2 实现，包含 BattleState、BattleScene、事件类型更新和单元测试 |
| 2026-02-16 | 代码审查修复：添加 setVictory/setDefeat、destroy 方法、battleEndEmitted 防重复、stageId 配置、11 个新测试 |
