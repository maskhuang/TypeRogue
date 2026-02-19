---
title: "Story 4.4: 键盘可视化"
epic: "Epic 4: 战斗场景"
story_key: "4-4-keyboard-visualizer"
status: "done"
created: "2026-02-16"
depends_on:
  - "4-3-battle-hud"
  - "2-1-keyboard-adjacency-map"
  - "2-3-skill-binding-system"
---

# Story 4.4: 键盘可视化

## 概述

实现战斗界面的键盘可视化组件，显示 QWERTY 26 键布局及其绑定的技能。该组件将展示技能图标、相邻高亮效果和触发动画反馈，是被动技能系统"位置联动"机制的核心可视化呈现。

## Story

作为一个 **玩家**，
我想要 **在战斗界面看到键盘布局和技能绑定**，
以便 **理解技能位置关系并制定输入策略**。

## 验收标准

- [x] AC1: KeyboardVisualizer 显示完整 QWERTY 26 键布局
- [x] AC2: 每个键位显示绑定的技能图标（如果有）
- [x] AC3: 输入时高亮当前按键及其相邻键
- [x] AC4: 技能触发时播放视觉反馈动画
- [x] AC5: 组件响应 RunState.bindings 变化更新显示
- [x] AC6: 组件支持销毁和资源清理

## 技术说明

### 文件位置

- `src/ui/keyboard/KeyboardVisualizer.ts` - 键盘可视化主组件
- `src/ui/keyboard/KeyVisual.ts` - 单个按键可视化组件
- `src/ui/keyboard/index.ts` - 模块导出

### 架构参考

```
game-architecture.md - Project Structure:

src/renderer/
├── ui/                 # UI 组件
│   ├── keyboard/
│   │   └── KeyboardVisualizer.ts

game-architecture.md - Novel Patterns:

键盘相邻联动模式 (Keyboard Adjacency Pattern)
- AdjacencyMap - 键盘布局映射
- KeyboardVisualizer - 联动可视化
```

### 键盘布局设计

```
┌─────────────────────────────────────────────────────────┐
│   [Q]  [W]  [E]  [R]  [T]  [Y]  [U]  [I]  [O]  [P]      │
│     [A]  [S]  [D]  [F]  [G]  [H]  [J]  [K]  [L]         │
│       [Z]  [X]  [C]  [V]  [B]  [N]  [M]                 │
└─────────────────────────────────────────────────────────┘

每个键显示:
┌─────┐
│ 图标│  ← 技能图标 (如果绑定)
│  Q  │  ← 键名
└─────┘

高亮状态:
- 默认: 深灰底色
- 按下: 白色边框 + 放大
- 相邻: 浅色边框
- 触发: 技能颜色闪烁
```

### 依赖关系

- 依赖: `systems/skills/passive/AdjacencyMap.ts` (获取相邻键)
- 依赖: `core/state/RunState.ts` (获取技能绑定)
- 依赖: `core/events/EventBus.ts` (监听按键和技能事件)
- 依赖: `data/skills.ts` (获取技能图标)
- 被依赖: Story 4.5 (战斗流程完整循环)

## 实现任务

### Task 1: KeyVisual 单键组件 (AC: #1, #2)

创建 `src/ui/keyboard/KeyVisual.ts`:

```typescript
import { Container, Graphics, Text, Sprite, TextStyle } from 'pixi.js'

/**
 * 单个按键可视化组件
 *
 * 功能:
 * - 显示键名 (Q, W, E...)
 * - 显示绑定的技能图标
 * - 支持多种高亮状态
 */
export class KeyVisual extends Container {
  private background: Graphics
  private keyLabel: Text
  private skillIcon: Sprite | null = null
  private keyName: string

  // 尺寸常量
  static readonly KEY_SIZE = 48
  static readonly KEY_GAP = 4
  static readonly BORDER_RADIUS = 6

  // 颜色常量
  private static readonly COLOR_DEFAULT = 0x2a2a2a
  private static readonly COLOR_PRESSED = 0x4a4a4a
  private static readonly COLOR_ADJACENT = 0x3a3a5a
  private static readonly COLOR_BORDER_DEFAULT = 0x444444
  private static readonly COLOR_BORDER_PRESSED = 0xffffff
  private static readonly COLOR_BORDER_ADJACENT = 0x6666aa

  constructor(keyName: string) {
    super()
    this.keyName = keyName
    this.label = `Key_${keyName}`

    this.createBackground()
    this.createKeyLabel()
  }

  /**
   * 设置绑定的技能图标
   */
  setSkillIcon(iconTexture: Texture | null): void

  /**
   * 设置按下状态
   */
  setPressed(pressed: boolean): void

  /**
   * 设置相邻高亮状态
   */
  setAdjacentHighlight(highlight: boolean): void

  /**
   * 播放触发动画
   */
  playTriggerAnimation(): void

  /**
   * 销毁组件
   */
  destroy(): void
}
```

**样式规范:**
- 按键尺寸: 48x48px
- 按键间距: 4px
- 圆角: 6px
- 字体: 12px bold 白色
- 默认背景: #2a2a2a
- 边框: 2px solid #444444

### Task 2: KeyboardVisualizer 主组件布局 (AC: #1)

创建 `src/ui/keyboard/KeyboardVisualizer.ts`:

```typescript
import { Container } from 'pixi.js'
import { KeyVisual } from './KeyVisual'
import { AdjacencyMap } from '../../systems/skills/passive/AdjacencyMap'

/**
 * 键盘可视化组件
 *
 * 功能:
 * - 显示 QWERTY 26 键布局
 * - 管理所有 KeyVisual 子组件
 * - 处理输入高亮和相邻联动
 */
export class KeyboardVisualizer extends Container {
  private keys: Map<string, KeyVisual> = new Map()
  private adjacencyMap: AdjacencyMap

  // 键盘布局定义
  private static readonly ROWS = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ]

  // 行偏移量 (模拟实际键盘错位)
  private static readonly ROW_OFFSETS = [0, 0.5, 1.0]

  constructor() {
    super()
    this.label = 'KeyboardVisualizer'
    this.adjacencyMap = new AdjacencyMap()

    this.createKeyboard()
  }

  /**
   * 创建键盘布局
   */
  private createKeyboard(): void {
    KeyboardVisualizer.ROWS.forEach((row, rowIndex) => {
      const offsetX = KeyboardVisualizer.ROW_OFFSETS[rowIndex] *
                      (KeyVisual.KEY_SIZE + KeyVisual.KEY_GAP)

      row.forEach((keyName, colIndex) => {
        const key = new KeyVisual(keyName)
        key.x = offsetX + colIndex * (KeyVisual.KEY_SIZE + KeyVisual.KEY_GAP)
        key.y = rowIndex * (KeyVisual.KEY_SIZE + KeyVisual.KEY_GAP)

        this.keys.set(keyName, key)
        this.addChild(key)
      })
    })
  }

  /**
   * 获取键盘可视化宽度
   */
  getKeyboardWidth(): number

  /**
   * 获取键盘可视化高度
   */
  getKeyboardHeight(): number
}
```

### Task 3: 技能绑定显示 (AC: #2, #5)

扩展 KeyboardVisualizer 技能绑定功能:

```typescript
import { RunState } from '../../core/state/RunState'
import { SKILLS } from '../../data/skills'

// 在 KeyboardVisualizer 类中添加
/**
 * 同步技能绑定显示
 * @param bindings 技能绑定映射 Map<string, SkillId>
 */
syncBindings(bindings: Map<string, string>): void {
  this.keys.forEach((keyVisual, keyName) => {
    const skillId = bindings.get(keyName)
    if (skillId) {
      const skill = SKILLS[skillId]
      // 加载技能图标并设置
      keyVisual.setSkillIcon(skill.iconTexture)
    } else {
      keyVisual.setSkillIcon(null)
    }
  })
}

/**
 * 清除所有技能图标
 */
clearBindings(): void {
  this.keys.forEach(keyVisual => {
    keyVisual.setSkillIcon(null)
  })
}
```

### Task 4: 按键高亮与相邻联动 (AC: #3)

实现按键输入时的视觉反馈:

```typescript
import { eventBus } from '../../core/events/EventBus'

// 在 KeyboardVisualizer 类中添加
private currentPressed: string | null = null

/**
 * 绑定事件监听
 */
bindEvents(): void {
  eventBus.on('input:keypress', this.onKeyPress.bind(this))
  eventBus.on('input:keyup', this.onKeyUp.bind(this))
}

/**
 * 解绑事件监听
 */
unbindEvents(): void {
  // 清理事件监听
}

/**
 * 处理按键按下
 */
private onKeyPress(data: { key: string }): void {
  const keyUpper = data.key.toUpperCase()

  // 清除之前的高亮
  this.clearHighlights()

  // 高亮当前键
  const currentKey = this.keys.get(keyUpper)
  if (currentKey) {
    currentKey.setPressed(true)
    this.currentPressed = keyUpper

    // 高亮相邻键
    const adjacentKeys = this.adjacencyMap.getAdjacent(keyUpper)
    adjacentKeys.forEach(adjKey => {
      const adjKeyVisual = this.keys.get(adjKey)
      if (adjKeyVisual) {
        adjKeyVisual.setAdjacentHighlight(true)
      }
    })
  }
}

/**
 * 处理按键抬起
 */
private onKeyUp(data: { key: string }): void {
  this.clearHighlights()
}

/**
 * 清除所有高亮状态
 */
private clearHighlights(): void {
  this.keys.forEach(keyVisual => {
    keyVisual.setPressed(false)
    keyVisual.setAdjacentHighlight(false)
  })
  this.currentPressed = null
}
```

### Task 5: 技能触发动画 (AC: #4)

实现技能触发时的视觉反馈:

```typescript
// 在 KeyboardVisualizer 类中添加

/**
 * 绑定技能触发事件
 */
private bindSkillEvents(): void {
  eventBus.on('skill:triggered', this.onSkillTriggered.bind(this))
}

/**
 * 处理技能触发
 */
private onSkillTriggered(data: { key: string, skillId: string }): void {
  const keyUpper = data.key.toUpperCase()
  const keyVisual = this.keys.get(keyUpper)

  if (keyVisual) {
    keyVisual.playTriggerAnimation()
  }
}

// 在 KeyVisual 类中添加
private animationScale: number = 1.0
private animationAlpha: number = 1.0
private isAnimating: boolean = false

/**
 * 播放触发动画
 * 效果: 放大 + 闪烁 + 恢复
 */
playTriggerAnimation(): void {
  this.isAnimating = true
  this.animationScale = 1.2
  this.animationAlpha = 1.5  // 过曝效果
}

/**
 * 每帧更新动画
 */
update(dt: number): void {
  if (!this.isAnimating) return

  // 缩放恢复
  if (this.animationScale > 1.0) {
    this.animationScale -= dt * 2
    if (this.animationScale < 1.0) {
      this.animationScale = 1.0
    }
    this.scale.set(this.animationScale)
  }

  // Alpha 恢复
  if (this.animationAlpha > 1.0) {
    this.animationAlpha -= dt * 3
    if (this.animationAlpha < 1.0) {
      this.animationAlpha = 1.0
      this.isAnimating = false
    }
    this.background.alpha = this.animationAlpha
  }
}
```

### Task 6: 集成到 BattleScene (AC: #6)

更新 `src/scenes/battle/BattleScene.ts`:

```typescript
import { KeyboardVisualizer } from '../../ui/keyboard'

// 在 BattleScene 类中添加
private keyboardVisualizer!: KeyboardVisualizer

// 在 onEnter() 的 createLayers() 后添加
this.keyboardVisualizer = new KeyboardVisualizer()
// 定位到屏幕下方中央
this.keyboardVisualizer.x = (this.app.screen.width - this.keyboardVisualizer.getKeyboardWidth()) / 2
this.keyboardVisualizer.y = this.app.screen.height - this.keyboardVisualizer.getKeyboardHeight() - 80
this.uiLayer.addChild(this.keyboardVisualizer)

// 绑定事件
this.keyboardVisualizer.bindEvents()

// 同步技能绑定 (从 RunState)
this.keyboardVisualizer.syncBindings(runState.getBindings())

// 在 update() 中添加
this.keyboardVisualizer.update(dtSeconds)

// 在 onExit() 中添加
this.keyboardVisualizer.unbindEvents()
this.keyboardVisualizer.destroy()
```

### Task 7: 导出和单元测试

创建 `src/ui/keyboard/index.ts`:

```typescript
export { KeyVisual } from './KeyVisual'
export { KeyboardVisualizer } from './KeyboardVisualizer'
```

**测试文件:**

**`tests/unit/ui/keyboard/KeyVisual.test.ts`:**
- 初始化状态正确 (label, 尺寸)
- setSkillIcon 正确设置/清除图标
- setPressed 切换背景和边框颜色
- setAdjacentHighlight 切换边框颜色
- playTriggerAnimation 触发动画状态
- update 正确恢复动画

**`tests/unit/ui/keyboard/KeyboardVisualizer.test.ts`:**
- 创建 26 个 KeyVisual 子组件
- 布局符合 QWERTY 行列结构
- syncBindings 正确更新所有键位图标
- clearBindings 清除所有图标
- onKeyPress 高亮当前键和相邻键
- onKeyUp 清除所有高亮
- onSkillTriggered 触发对应键动画
- destroy 正确清理资源和事件

## 测试计划

### 单元测试 (vitest)

- `KeyVisual.test.ts`: 单键组件逻辑 (~15 tests)
- `KeyboardVisualizer.test.ts`: 键盘整体逻辑 (~20 tests)

预计新增测试: ~35 个

### 集成测试

手动验证:
- 键盘布局正确显示在战斗场景
- 按键时当前键高亮
- 相邻键同时高亮
- 技能触发时有放大闪烁效果
- 技能图标正确显示在绑定键位

## Dev Notes

### 从 Story 4.3 学到的经验

- **PixiJS Text.width/height 在 Node 测试环境不可用**: 需要使用估算方法或避免直接访问
- **使用 Container.label**: 便于调试时定位组件
- **基于 delta time 的动画**: 确保帧率无关的动画一致性
- **使用等宽字体**: 如 `'Courier New, monospace'` 确保字符宽度一致
- **缓存避免每帧重复设置**: 如 BattleHUD 中的 `lastTotalTime` 模式

### 技术要点

1. **AdjacencyMap 集成**: 使用已实现的 `systems/skills/passive/AdjacencyMap.ts` 获取相邻键
2. **事件驱动更新**: 监听 `input:keypress`、`input:keyup`、`skill:triggered` 事件
3. **动画状态管理**: 每个 KeyVisual 维护自己的动画状态，避免全局动画管理
4. **性能考虑**: 26 个按键组件，避免每帧重新创建，使用状态切换

### 项目结构对齐

按照 `game-architecture.md` 的目录结构:
```
src/
├── ui/
│   ├── keyboard/
│   │   ├── KeyVisual.ts
│   │   ├── KeyboardVisualizer.ts
│   │   └── index.ts
```

### 颜色常量 (与 HUD 保持一致)

```typescript
// 共享 UI 颜色
const UI_COLORS = {
  GREEN: 0x4caf50,    // 正确/激活
  RED: 0xff5252,      // 错误/警告
  GOLD: 0xffd700,     // 高亮/重要
  WHITE: 0xffffff,    // 默认文字
  DARK_BG: 0x1a1a2e,  // 深色背景
  KEY_BG: 0x2a2a2a,   // 按键背景
  KEY_BORDER: 0x444444 // 按键边框
}
```

### References

- [game-architecture.md - Keyboard Adjacency Pattern](../game-architecture.md#novel-patterns)
- [game-architecture.md - UI 组件](../game-architecture.md#project-structure)
- [epics.md - Story 4.4](../epics.md#story-44-键盘可视化)
- [Story 4.3 - 战斗 HUD](./4-3-battle-hud.md)
- [Story 2.1 - 键盘相邻映射](./2-1-keyboard-adjacency-map.md)

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- 添加 `input:keyup` 事件到 EventBus.ts
- KeyVisual 使用估算字符宽度避免 Node 测试环境 Text.width 问题
- AdjacencyMap 返回小写键名，KeyboardVisualizer 统一转大写处理

### Completion Notes List

✅ 所有 7 个任务已完成
✅ 59 个单元测试全部通过:
  - KeyVisual.test.ts: 31 tests
  - KeyboardVisualizer.test.ts: 28 tests
✅ 所有 6 个验收标准已满足
✅ 总测试数从 266 增加到 325
✅ BattleScene 已集成 KeyboardVisualizer，每帧更新动画

### File List

**新增文件:**
- `src/src/ui/keyboard/KeyVisual.ts` - 单键可视化组件
- `src/src/ui/keyboard/KeyboardVisualizer.ts` - 键盘可视化主组件
- `src/src/ui/keyboard/index.ts` - 模块导出
- `src/tests/unit/ui/keyboard/KeyVisual.test.ts` - 31 tests
- `src/tests/unit/ui/keyboard/KeyboardVisualizer.test.ts` - 28 tests

**修改文件:**
- `src/src/scenes/battle/BattleScene.ts` - 集成 KeyboardVisualizer
- `src/src/core/events/EventBus.ts` - 添加 input:keyup 事件

## Change Log

| 日期 | 变更 |
|------|------|
| 2026-02-16 | 创建 Story 4.4 键盘可视化文档 |
| 2026-02-17 | 完成 Story 4.4 实现，包含 KeyVisual、KeyboardVisualizer、59 个单元测试、BattleScene 集成 |
