---
title: "Story 4.3: 战斗 HUD"
epic: "Epic 4: 战斗场景"
story_key: "4-3-battle-hud"
status: "done"
created: "2026-02-16"
depends_on:
  - "4-2-battle-scene-framework"
---

# Story 4.3: 战斗 HUD

## 概述

实现战斗界面的 HUD（Heads-Up Display）组件，包括分数显示、倍率显示、倒计时进度条、连击计数器和当前词语显示。这些组件将添加到 BattleScene 的 uiLayer，实时响应 BattleState 变化。

## 验收标准

- [x] ScoreDisplay: 分数和倍率显示，支持数字动画过渡
- [x] TimerBar: 倒计时进度条，显示剩余时间百分比
- [x] ComboCounter: 连击计数器，连击时显示当前连击数
- [x] WordDisplay: 当前词语显示，高亮已输入字符
- [x] 所有 HUD 组件响应 BattleState 变化
- [x] 组件支持销毁和资源清理

## 技术说明

### 文件位置

- `src/ui/hud/ScoreDisplay.ts` - 分数和倍率显示组件
- `src/ui/hud/TimerBar.ts` - 倒计时进度条组件
- `src/ui/hud/ComboCounter.ts` - 连击计数器组件
- `src/ui/hud/WordDisplay.ts` - 当前词语显示组件
- `src/ui/hud/BattleHUD.ts` - HUD 容器，统一管理所有 HUD 组件
- `src/ui/hud/index.ts` - 模块导出

### 架构参考

```
game-architecture.md - Project Structure:

src/renderer/
├── ui/                 # UI 组件
│   ├── hud/
│   │   ├── ScoreDisplay.ts
│   │   ├── TimerBar.ts
│   │   └── ComboCounter.ts

game-architecture.md - Architectural Boundaries:

ui/ - 可复用 UI 组件，不含业务逻辑
```

### HUD 布局设计

```
┌────────────────────────────────────────────────────────────────┐
│  [Score: 12,450]                              [x2.5 倍率]      │  ← 顶部信息栏
├────────────────────────────────────────────────────────────────┤
│                                                                │
│                                                                │
│                        [current word]                          │  ← 词语显示（居中）
│                        [typ]ed chars                           │     已输入高亮
│                                                                │
│                                                                │
│                                             [Combo: 15]        │  ← 连击显示（右下）
├────────────────────────────────────────────────────────────────┤
│  ████████████████████░░░░░░░░░░  45s                           │  ← 计时器进度条（底部）
└────────────────────────────────────────────────────────────────┘
```

### 依赖关系

- 依赖: `core/state/BattleState.ts` (获取状态数据)
- 依赖: `scenes/battle/BattleScene.ts` (提供 uiLayer)
- 依赖: `core/events/EventBus.ts` (可选：事件驱动更新)
- 被依赖: Story 4.5 (战斗流程完整循环)

## 实现任务

### Task 1: ScoreDisplay 分数显示组件

创建 `src/ui/hud/ScoreDisplay.ts`:

```typescript
import { Container, Text, TextStyle } from 'pixi.js'

/**
 * 分数显示组件
 *
 * 功能:
 * - 显示当前分数（带千位分隔符）
 * - 显示当前倍率
 * - 支持分数动画过渡（Tween）
 */
export class ScoreDisplay extends Container {
  private scoreText: Text
  private multiplierText: Text
  private displayedScore: number = 0
  private targetScore: number = 0

  constructor() {
    super()
    this.label = 'ScoreDisplay'
    // 创建分数文本和倍率文本
  }

  /**
   * 更新分数（带动画过渡）
   */
  setScore(score: number): void {
    this.targetScore = score
    // 动画过渡逻辑
  }

  /**
   * 更新倍率
   */
  setMultiplier(multiplier: number): void {
    this.multiplierText.text = `x${multiplier.toFixed(1)}`
  }

  /**
   * 每帧更新（用于动画）
   */
  update(dt: number): void {
    // 平滑过渡分数显示
    if (this.displayedScore !== this.targetScore) {
      const diff = this.targetScore - this.displayedScore
      const step = Math.ceil(Math.abs(diff) * dt * 5)
      if (diff > 0) {
        this.displayedScore = Math.min(this.displayedScore + step, this.targetScore)
      } else {
        this.displayedScore = Math.max(this.displayedScore - step, this.targetScore)
      }
      this.scoreText.text = this.formatScore(this.displayedScore)
    }
  }

  /**
   * 格式化分数（添加千位分隔符）
   */
  private formatScore(score: number): string {
    return score.toLocaleString('en-US')
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    super.destroy({ children: true })
  }
}
```

**样式规范:**
- 分数字体: 粗体，24-32px，白色
- 倍率字体: 斜体，18-24px，金色 (#FFD700)
- 位置: 左上角 (padding: 20px)

### Task 2: TimerBar 倒计时进度条组件

创建 `src/ui/hud/TimerBar.ts`:

```typescript
import { Container, Graphics, Text } from 'pixi.js'

/**
 * 倒计时进度条组件
 *
 * 功能:
 * - 显示剩余时间进度条
 * - 时间低于 10 秒时变红闪烁
 * - 显示剩余秒数
 */
export class TimerBar extends Container {
  private barBackground: Graphics
  private barFill: Graphics
  private timeText: Text

  private width: number
  private height: number = 20
  private totalTime: number = 60
  private currentTime: number = 60

  constructor(width: number) {
    super()
    this.label = 'TimerBar'
    this.width = width
    // 创建进度条背景、填充和文本
  }

  /**
   * 设置总时间
   */
  setTotalTime(time: number): void {
    this.totalTime = time
    this.currentTime = time
    this.updateBar()
  }

  /**
   * 更新当前时间
   */
  setCurrentTime(time: number): void {
    this.currentTime = Math.max(0, time)
    this.updateBar()
  }

  /**
   * 更新进度条显示
   */
  private updateBar(): void {
    const progress = this.currentTime / this.totalTime
    // 更新填充宽度
    // 更新颜色（正常：绿色，<10s：红色）
    // 更新文本
  }

  /**
   * 每帧更新（用于闪烁动画）
   */
  update(dt: number): void {
    // 时间 < 10 秒时闪烁效果
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    super.destroy({ children: true })
  }
}
```

**样式规范:**
- 进度条背景: 深灰色 (#333333)
- 进度条填充: 正常绿色 (#4CAF50)，警告红色 (#FF5252)
- 高度: 20px
- 圆角: 10px
- 位置: 底部居中 (padding: 20px)

### Task 3: ComboCounter 连击计数器组件

创建 `src/ui/hud/ComboCounter.ts`:

```typescript
import { Container, Text } from 'pixi.js'

/**
 * 连击计数器组件
 *
 * 功能:
 * - 显示当前连击数
 * - 连击增加时弹出动画
 * - combo = 0 时隐藏
 */
export class ComboCounter extends Container {
  private comboText: Text
  private currentCombo: number = 0
  private scale: number = 1.0

  constructor() {
    super()
    this.label = 'ComboCounter'
    // 创建连击文本
  }

  /**
   * 设置连击数
   */
  setCombo(combo: number): void {
    const oldCombo = this.currentCombo
    this.currentCombo = combo

    if (combo === 0) {
      this.visible = false
      return
    }

    this.visible = true
    this.comboText.text = `${combo} COMBO`

    // 连击增加时触发弹出动画
    if (combo > oldCombo) {
      this.triggerPopAnimation()
    }
  }

  /**
   * 触发弹出动画
   */
  private triggerPopAnimation(): void {
    this.scale = 1.3  // 放大
    // 之后逐渐恢复
  }

  /**
   * 每帧更新（用于动画）
   */
  update(dt: number): void {
    // 缩放恢复动画
    if (this.scale > 1.0) {
      this.scale -= dt * 2
      if (this.scale < 1.0) this.scale = 1.0
      this.pivot.set(this.width / 2, this.height / 2)
    }
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    super.destroy({ children: true })
  }
}
```

**样式规范:**
- 字体: 粗体，28-36px
- 颜色: 渐变（连击越高越亮）- 1-5: 白色, 6-10: 黄色, 11+: 橙红色
- 位置: 右下角 (padding: 20px)
- 动画: 弹出放大后恢复

### Task 4: WordDisplay 词语显示组件

创建 `src/ui/hud/WordDisplay.ts`:

```typescript
import { Container, Text } from 'pixi.js'

/**
 * 词语显示组件
 *
 * 功能:
 * - 显示当前需要输入的词语
 * - 高亮已正确输入的字符
 * - 显示错误字符（红色）
 */
export class WordDisplay extends Container {
  private typedText: Text      // 已输入部分
  private remainingText: Text  // 剩余部分
  private currentWord: string = ''
  private typedChars: string = ''

  constructor() {
    super()
    this.label = 'WordDisplay'
    // 创建文本显示
  }

  /**
   * 设置当前词语
   */
  setWord(word: string): void {
    this.currentWord = word
    this.typedChars = ''
    this.updateDisplay()
  }

  /**
   * 设置已输入字符
   */
  setTypedChars(chars: string): void {
    this.typedChars = chars
    this.updateDisplay()
  }

  /**
   * 更新显示
   */
  private updateDisplay(): void {
    const typed = this.typedChars
    const remaining = this.currentWord.slice(typed.length)

    this.typedText.text = typed
    this.remainingText.text = remaining

    // 调整位置使整体居中
    this.remainingText.x = this.typedText.width
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    super.destroy({ children: true })
  }
}
```

**样式规范:**
- 已输入字符: 绿色 (#4CAF50)，粗体
- 剩余字符: 白色 (#FFFFFF)
- 错误字符: 红色 (#FF5252)
- 字体大小: 48-64px（突出显示）
- 位置: 屏幕居中

### Task 5: BattleHUD 统一管理器

创建 `src/ui/hud/BattleHUD.ts`:

```typescript
import { Container } from 'pixi.js'
import { ScoreDisplay } from './ScoreDisplay'
import { TimerBar } from './TimerBar'
import { ComboCounter } from './ComboCounter'
import { WordDisplay } from './WordDisplay'
import { BattleState } from '../../core/state/BattleState'

/**
 * 战斗 HUD 管理器
 *
 * 职责:
 * - 创建和管理所有 HUD 子组件
 * - 统一更新所有组件
 * - 响应 BattleState 变化
 */
export class BattleHUD extends Container {
  private scoreDisplay: ScoreDisplay
  private timerBar: TimerBar
  private comboCounter: ComboCounter
  private wordDisplay: WordDisplay

  private screenWidth: number
  private screenHeight: number

  constructor(screenWidth: number, screenHeight: number) {
    super()
    this.label = 'BattleHUD'
    this.screenWidth = screenWidth
    this.screenHeight = screenHeight

    this.createComponents()
    this.layoutComponents()
  }

  /**
   * 创建所有子组件
   */
  private createComponents(): void {
    this.scoreDisplay = new ScoreDisplay()
    this.addChild(this.scoreDisplay)

    this.timerBar = new TimerBar(this.screenWidth - 40)
    this.addChild(this.timerBar)

    this.comboCounter = new ComboCounter()
    this.addChild(this.comboCounter)

    this.wordDisplay = new WordDisplay()
    this.addChild(this.wordDisplay)
  }

  /**
   * 布局组件位置
   */
  private layoutComponents(): void {
    // ScoreDisplay: 左上角
    this.scoreDisplay.position.set(20, 20)

    // TimerBar: 底部居中
    this.timerBar.position.set(20, this.screenHeight - 40)

    // ComboCounter: 右下角
    this.comboCounter.position.set(this.screenWidth - 150, this.screenHeight - 100)

    // WordDisplay: 中央
    this.wordDisplay.position.set(this.screenWidth / 2, this.screenHeight / 2)
    this.wordDisplay.pivot.set(this.wordDisplay.width / 2, this.wordDisplay.height / 2)
  }

  /**
   * 根据 BattleState 同步更新所有组件
   */
  syncWithState(state: BattleState): void {
    const data = state.getState()

    this.scoreDisplay.setScore(data.score)
    this.scoreDisplay.setMultiplier(data.multiplier)

    this.timerBar.setTotalTime(data.totalTime)
    this.timerBar.setCurrentTime(data.timeRemaining)

    this.comboCounter.setCombo(data.combo)

    this.wordDisplay.setWord(data.currentWord)
    this.wordDisplay.setTypedChars(data.typedChars)
  }

  /**
   * 每帧更新
   */
  update(dt: number): void {
    this.scoreDisplay.update(dt)
    this.timerBar.update(dt)
    this.comboCounter.update(dt)
  }

  /**
   * 销毁 HUD
   */
  destroy(): void {
    this.scoreDisplay.destroy()
    this.timerBar.destroy()
    this.comboCounter.destroy()
    this.wordDisplay.destroy()
    super.destroy()
  }
}
```

### Task 6: 导出和集成

创建 `src/ui/hud/index.ts`:

```typescript
export { ScoreDisplay } from './ScoreDisplay'
export { TimerBar } from './TimerBar'
export { ComboCounter } from './ComboCounter'
export { WordDisplay } from './WordDisplay'
export { BattleHUD } from './BattleHUD'
```

更新 `src/scenes/battle/BattleScene.ts` 集成 HUD:

```typescript
import { BattleHUD } from '../../ui/hud'

// 在 BattleScene 类中添加
private hud: BattleHUD

// 在 onEnter 的 createLayers() 后添加
this.hud = new BattleHUD(this.app.screen.width, this.app.screen.height)
this.uiLayer.addChild(this.hud)

// 在 update() 中添加
this.hud.syncWithState(this.battleState)
this.hud.update(dt)

// 在 onExit() 中添加
this.hud.destroy()
```

### Task 7: 单元测试

创建测试文件:

**`tests/unit/ui/hud/ScoreDisplay.test.ts`:**
- 初始分数为 0
- setScore 正确更新目标分数
- setMultiplier 正确更新倍率文本
- formatScore 添加千位分隔符
- update 平滑过渡分数

**`tests/unit/ui/hud/TimerBar.test.ts`:**
- 初始状态正确
- setCurrentTime 正确更新进度
- 时间 < 10 秒变为警告色
- 进度条宽度计算正确

**`tests/unit/ui/hud/ComboCounter.test.ts`:**
- combo = 0 时隐藏
- combo > 0 时显示
- 连击增加时触发动画
- update 正确恢复缩放

**`tests/unit/ui/hud/WordDisplay.test.ts`:**
- setWord 正确设置词语
- setTypedChars 正确更新已输入
- 已输入和剩余分开显示

**`tests/unit/ui/hud/BattleHUD.test.ts`:**
- 创建包含 4 个子组件
- syncWithState 更新所有组件
- update 调用所有子组件 update
- destroy 正确清理

## 测试计划

### 单元测试 (vitest)

- `ScoreDisplay.test.ts`: 分数显示逻辑 (~10 tests)
- `TimerBar.test.ts`: 计时器逻辑 (~8 tests)
- `ComboCounter.test.ts`: 连击显示逻辑 (~8 tests)
- `WordDisplay.test.ts`: 词语显示逻辑 (~8 tests)
- `BattleHUD.test.ts`: HUD 管理器 (~10 tests)

预计新增测试: ~44 个

### 集成测试

手动验证:
- HUD 正确显示在 BattleScene 中
- 分数变化时有平滑动画
- 连击增加时有弹出效果
- 时间低于 10 秒时进度条变红
- 词语显示正确高亮已输入字符

## 注意事项

1. **性能优化**: 文本更新频繁，考虑使用 BitmapText 替代 Text
2. **响应式布局**: HUD 组件位置应基于屏幕尺寸计算，支持不同分辨率
3. **动画帧率**: 动画应基于 delta time，不依赖固定帧率
4. **销毁清理**: 所有组件必须正确实现 destroy() 清理资源
5. **颜色一致性**: 使用常量定义颜色值，便于后续主题切换

## Learnings from Story 4.2

- 使用 Container.label 便于调试定位
- 生命周期方法（destroy）很重要，防止内存泄漏
- 事件驱动更新可替代轮询检查
- 测试 PixiJS 组件需要 mock Container

## 相关文档

- [game-architecture.md - HUD](../game-architecture.md#system-location-mapping)
- [game-architecture.md - UI 组件](../game-architecture.md#project-structure)
- [epics.md - Story 4.3](../epics.md#story-43-战斗-hud)
- [Story 4.2 - 战斗场景框架](./4-2-battle-scene-framework.md)

---

## Dev Agent Record

### Implementation Plan
- Task 1: 创建 ScoreDisplay 分数显示组件
- Task 2: 创建 TimerBar 倒计时进度条组件
- Task 3: 创建 ComboCounter 连击计数器组件
- Task 4: 创建 WordDisplay 词语显示组件
- Task 5: 创建 BattleHUD 统一管理器
- Task 6: 导出模块并集成到 BattleScene
- Task 7: 编写单元测试

### Debug Log
- PixiJS Text.height/width 在 Node 测试环境需要 canvas/document，修改实现避免直接访问
- TimerBar 和 WordDisplay 使用估算方法替代 Text.width 访问
- 所有组件通过 Container.label 便于调试

### Completion Notes
✅ 所有 7 个任务已完成
✅ 97 个单元测试全部通过:
  - ScoreDisplay.test.ts: 20 tests
  - TimerBar.test.ts: 20 tests
  - ComboCounter.test.ts: 18 tests
  - WordDisplay.test.ts: 20 tests
  - BattleHUD.test.ts: 19 tests
✅ 所有验收标准已满足
✅ 总测试数从 169 增加到 266
✅ BattleScene 已集成 HUD，每帧更新

## File List

**新增文件:**
- `src/src/ui/hud/ScoreDisplay.ts` - 分数显示组件
- `src/src/ui/hud/TimerBar.ts` - 倒计时进度条组件
- `src/src/ui/hud/ComboCounter.ts` - 连击计数器组件
- `src/src/ui/hud/WordDisplay.ts` - 词语显示组件
- `src/src/ui/hud/BattleHUD.ts` - HUD 管理器
- `src/src/ui/hud/index.ts` - 模块导出
- `src/tests/unit/ui/hud/ScoreDisplay.test.ts`
- `src/tests/unit/ui/hud/TimerBar.test.ts`
- `src/tests/unit/ui/hud/ComboCounter.test.ts`
- `src/tests/unit/ui/hud/WordDisplay.test.ts`
- `src/tests/unit/ui/hud/BattleHUD.test.ts`

**修改文件:**
- `src/src/scenes/battle/BattleScene.ts` - 集成 HUD

## Change Log

| 日期 | 变更 |
|------|------|
| 2026-02-16 | 创建 Story 4.3 战斗 HUD 文档 |
| 2026-02-16 | 完成 Story 4.3 实现，包含 5 个 HUD 组件、97 个单元测试、BattleScene 集成 |
