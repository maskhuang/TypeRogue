---
title: "Story 7.4: 技能触发反馈"
epic: "Epic 7: 音效与视觉"
story_key: "7-4-skill-trigger-feedback"
status: "done"
created: "2026-02-17"
depends_on:
  - "7-1-audio-manager"
  - "7-2-keystroke-sounds"
  - "7-3-particle-effects"
  - "4-4-keyboard-visualizer"
---

# Story 7.4: 技能触发反馈

## 概述

实现技能触发时的完整视觉反馈系统，包括技能图标弹出、键盘键位高亮增强、效果文字描述显示。本 Story 整合 Story 7.1-7.3 实现的音频和粒子系统，为技能触发提供统一、协调的多感官反馈体验。

## Story

作为一个 **玩家**，
我想要 **在技能触发时看到清晰的视觉反馈（图标、高亮、文字描述）**，
以便 **理解技能效果并获得成就感，增强"数字爆炸"的爽感**。

## 验收标准

- [x] AC1: 技能触发时显示技能图标弹出动画（从键位飞出、放大后消失）
- [ ] AC2: 技能触发时键盘键位有增强高亮效果（颜色/发光） - Deferred
- [x] AC3: 技能触发时显示效果文字描述（如 "+50分"、"x1.5 倍率"）
- [x] AC4: 被动技能联动时显示相邻键位连线或波纹效果
- [x] AC5: 主动技能入队/出队时有队列视觉提示
- [x] AC6: 所有反馈与粒子效果和音效协调同步
- [x] AC7: 单元测试覆盖 SkillFeedbackManager 核心逻辑

## 技术说明

### 文件位置

- `src/src/ui/effects/SkillFeedbackManager.ts` - 技能反馈管理器（新建）
- `src/src/ui/effects/SkillIconPopup.ts` - 技能图标弹出组件（新建）
- `src/src/ui/effects/EffectTextDisplay.ts` - 效果文字显示组件（新建）
- `src/src/ui/effects/AdjacencyVisualizer.ts` - 相邻联动可视化（新建）
- `src/src/ui/effects/EffectQueueDisplay.ts` - 效果队列显示（新建）
- `src/src/ui/effects/index.ts` - 更新模块导出
- `tests/unit/ui/effects/SkillFeedbackManager.test.ts` - 单元测试（新建）

### 架构参考

```
game-architecture.md - Project Structure:

├── ui/                 # UI 组件
│   ├── hud/            # 战斗 HUD
│   ├── keyboard/       # 键盘可视化
│   └── effects/        # 粒子/动画
│       ├── ParticleManager.ts      ← Story 7.3 已实现
│       ├── ParticleController.ts   ← Story 7.3 已实现
│       ├── ScorePopup.ts           ← Story 7.3 已实现
│       └── SkillFeedbackManager.ts ← 本 Story 新建

game-architecture.md - Event System:

'skill:triggered': { key: string; skillId: string; type: 'passive' | 'active' }

gdd.md - Art and Audio Direction:

| 维度 | 方向 |
|------|------|
| 动效 | 夸张但不干扰，强化数字爽感 |
| 技能触发 | 紫色 #9b59b6 |
```

### 依赖关系

**依赖:**
- Story 7.1 (AudioManager) - 技能音效播放
- Story 7.2 (KeystrokeSoundController) - 击键音效
- Story 7.3 (ParticleManager, ScorePopup) - 粒子效果和分数飘字
- Story 4.4 (KeyboardVisualizer) - 键位位置获取、触发动画

**被依赖:**
- 无后续 Story 依赖

### 项目结构

```
src/
├── src/
│   ├── ui/
│   │   ├── effects/
│   │   │   ├── ParticleManager.ts       ← 已有（Story 7.3）
│   │   │   ├── ParticleController.ts    ← 已有（Story 7.3）
│   │   │   ├── ScorePopup.ts            ← 已有（Story 7.3）
│   │   │   ├── ParticlePresets.ts       ← 已有（Story 7.3）
│   │   │   ├── SkillFeedbackManager.ts  ← 新建：协调所有技能反馈
│   │   │   ├── SkillIconPopup.ts        ← 新建：图标弹出动画
│   │   │   ├── EffectTextDisplay.ts     ← 新建：效果文字显示
│   │   │   ├── AdjacencyVisualizer.ts   ← 新建：相邻联动可视化
│   │   │   ├── EffectQueueDisplay.ts    ← 新建：效果队列 UI
│   │   │   └── index.ts                 ← 更新导出
│   │   └── keyboard/
│   │       └── KeyboardVisualizer.ts    ← 依赖：键位位置
│   ├── systems/
│   │   ├── skills/
│   │   │   ├── active/
│   │   │   │   └── EffectQueue.ts       ← 依赖：队列状态
│   │   │   └── passive/
│   │   │       └── AdjacencyMap.ts      ← 依赖：相邻关系
│   │   └── audio/
│   │       └── AudioManager.ts          ← 依赖：音效播放
│   └── data/
│       └── skills.ts                    ← 依赖：技能数据
└── tests/
    └── unit/
        └── ui/
            └── effects/
                ├── SkillFeedbackManager.test.ts  ← 新建
                ├── SkillIconPopup.test.ts        ← 新建
                └── EffectTextDisplay.test.ts     ← 新建
```

### 接口设计

```typescript
/**
 * 技能反馈管理器 - 协调所有技能触发的视觉反馈
 */
export class SkillFeedbackManager {
  constructor(
    container: PIXI.Container,
    keyboardVisualizer: KeyboardVisualizer,
    particleManager: ParticleManager,
    audioManager: AudioManager
  )

  /** 启用反馈系统，开始监听事件 */
  enable(): void

  /** 禁用反馈系统 */
  disable(): void

  /** 检查是否启用 */
  isEnabled(): boolean

  /** 设置效果队列引用（用于显示队列状态） */
  setEffectQueue(queue: EffectQueue): void

  /** 每帧更新 */
  update(deltaTime: number): void

  /** 清理所有活动反馈 */
  clear(): void

  /** 销毁 */
  destroy(): void
}

/**
 * 技能图标弹出组件
 */
export class SkillIconPopup {
  constructor(container: PIXI.Container)

  /** 播放图标弹出动画 */
  play(skillId: string, x: number, y: number, texture?: PIXI.Texture): void

  /** 更新动画 */
  update(deltaTime: number): void

  /** 获取活动弹出数量 */
  getActiveCount(): number

  /** 清理 */
  clear(): void

  /** 销毁 */
  destroy(): void
}

/**
 * 效果文字显示组件
 */
export class EffectTextDisplay {
  constructor(container: PIXI.Container)

  /** 显示效果文字 */
  show(text: string, x: number, y: number, options?: EffectTextOptions): void

  /** 显示分数加成 */
  showScoreBonus(value: number, x: number, y: number): void

  /** 显示倍率加成 */
  showMultiplierBonus(value: number, x: number, y: number): void

  /** 显示技能名称 */
  showSkillName(skillName: string, x: number, y: number): void

  /** 更新动画 */
  update(deltaTime: number): void

  /** 清理 */
  clear(): void

  /** 销毁 */
  destroy(): void
}

interface EffectTextOptions {
  fontSize?: number
  color?: string
  duration?: number
  direction?: 'up' | 'down' | 'left' | 'right'
}

/**
 * 相邻联动可视化组件
 */
export class AdjacencyVisualizer {
  constructor(container: PIXI.Container)

  /** 显示相邻连线效果 */
  showConnection(fromKey: string, toKey: string, keyPositions: Map<string, {x: number, y: number}>): void

  /** 显示波纹扩散效果 */
  showRipple(centerKey: string, adjacentKeys: string[], keyPositions: Map<string, {x: number, y: number}>): void

  /** 更新动画 */
  update(deltaTime: number): void

  /** 清理 */
  clear(): void

  /** 销毁 */
  destroy(): void
}

/**
 * 效果队列显示组件
 */
export class EffectQueueDisplay {
  constructor(container: PIXI.Container)

  /** 更新队列显示 */
  updateQueue(effects: QueuedEffect[]): void

  /** 高亮队首效果 */
  highlightNext(): void

  /** 播放入队动画 */
  playEnqueueAnimation(effect: QueuedEffect): void

  /** 播放出队动画 */
  playDequeueAnimation(): void

  /** 设置位置 */
  setPosition(x: number, y: number): void

  /** 销毁 */
  destroy(): void
}
```

### 事件监听

```typescript
// 监听的事件
'skill:triggered': {
  key: string
  skillId: string
  type: 'passive' | 'active'
  // 以下为可选扩展字段（需与技能系统协调）
  value?: number           // 技能效果数值
  adjacentSkills?: string[] // 相邻被触发的技能
}

'effect:queued': { effect: QueuedEffect; queueSize: number }
'effect:dequeued': { effect: QueuedEffect }
```

### 颜色参考

```
gdd.md - 配色方案:

| 元素 | 颜色 | Hex |
|------|------|-----|
| 背景 | 深灰/近黑 | #1a1a2e |
| 正确击键 | 青绿 | #4ecdc4 |
| 错误击键 | 玫红 | #ff6b6b |
| 倍率/高分 | 金黄 | #ffe66d |
| 技能触发 | 紫色 | #9b59b6 |
```

### 动画参考

**技能图标弹出 (SkillIconPopup):**
- 起始：键位位置，缩放 0.5，透明度 1
- 动画：向上飘动 30-50px，缩放至 1.2，持续 0.4s
- 结束：缩放 0.8，透明度 0，消失

**效果文字 (EffectTextDisplay):**
- 起始：技能图标旁，缩放 0.8
- 动画：easeOutBack 弹入，向上飘动 20px，持续 0.6s
- 结束：淡出消失

**相邻连线 (AdjacencyVisualizer):**
- 从触发键位向相邻键位画线
- 线条颜色：紫色渐变青绿 (#9b59b6 → #4ecdc4)
- 持续 0.3s 后淡出

## 实现任务

### Task 1: SkillIconPopup 图标弹出 (AC: #1)

创建技能图标弹出动画组件。

**文件:** `src/src/ui/effects/SkillIconPopup.ts`

**实现要点:**
- 使用 PIXI.Sprite 显示技能图标
- 对象池复用减少 GC
- 动画：上浮 + 缩放 + 淡出
- 支持自定义纹理或使用默认图标

**关键代码:**
```typescript
import * as PIXI from 'pixi.js'

interface PopupInstance {
  sprite: PIXI.Sprite
  elapsed: number
  duration: number
  startX: number
  startY: number
  targetY: number
}

export class SkillIconPopup {
  private container: PIXI.Container
  private activePopups: PopupInstance[] = []
  private pool: PIXI.Sprite[] = []
  private defaultTexture: PIXI.Texture | null = null

  constructor(parentContainer: PIXI.Container) {
    this.container = new PIXI.Container()
    this.container.label = 'skill-icon-popups'
    parentContainer.addChild(this.container)
  }

  play(skillId: string, x: number, y: number, texture?: PIXI.Texture): void {
    const sprite = this.pool.pop() || new PIXI.Sprite()
    sprite.texture = texture || this.getDefaultTexture()
    sprite.anchor.set(0.5)
    sprite.position.set(x, y)
    sprite.scale.set(0.5)
    sprite.alpha = 1

    this.container.addChild(sprite)
    this.activePopups.push({
      sprite,
      elapsed: 0,
      duration: 0.4,
      startX: x,
      startY: y,
      targetY: y - 40
    })
  }

  update(deltaTime: number): void {
    const dt = deltaTime * 0.001

    for (let i = this.activePopups.length - 1; i >= 0; i--) {
      const popup = this.activePopups[i]
      popup.elapsed += dt

      const progress = Math.min(popup.elapsed / popup.duration, 1)
      const eased = this.easeOutCubic(progress)

      // 位置
      popup.sprite.y = popup.startY + (popup.targetY - popup.startY) * eased

      // 缩放：0.5 → 1.2 → 0.8
      const scaleCurve = progress < 0.5
        ? 0.5 + 0.7 * (progress * 2)  // 0.5 → 1.2
        : 1.2 - 0.4 * ((progress - 0.5) * 2)  // 1.2 → 0.8
      popup.sprite.scale.set(scaleCurve)

      // 透明度：后半段淡出
      if (progress > 0.6) {
        popup.sprite.alpha = 1 - (progress - 0.6) / 0.4
      }

      // 完成后回收
      if (progress >= 1) {
        this.container.removeChild(popup.sprite)
        this.pool.push(popup.sprite)
        this.activePopups.splice(i, 1)
      }
    }
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3)
  }

  private getDefaultTexture(): PIXI.Texture {
    if (!this.defaultTexture) {
      // 程序化生成默认图标（紫色圆形）
      const graphics = new PIXI.Graphics()
      graphics.circle(16, 16, 16)
      graphics.fill({ color: 0x9b59b6 })
      // Note: 需要 renderer 生成纹理，实际使用时替换
      this.defaultTexture = PIXI.Texture.WHITE
    }
    return this.defaultTexture
  }

  getActiveCount(): number {
    return this.activePopups.length
  }

  clear(): void {
    this.activePopups.forEach(popup => {
      this.container.removeChild(popup.sprite)
      this.pool.push(popup.sprite)
    })
    this.activePopups = []
  }

  destroy(): void {
    this.clear()
    this.pool.forEach(s => s.destroy())
    this.pool = []
    this.container.destroy()
  }
}
```

### Task 2: EffectTextDisplay 效果文字 (AC: #3)

创建效果文字显示组件。

**文件:** `src/src/ui/effects/EffectTextDisplay.ts`

**实现要点:**
- 使用 PIXI.Text 显示效果描述
- 支持分数加成、倍率加成、技能名称等格式
- 弹入动画 + 淡出
- 对象池复用

**关键代码:**
```typescript
import * as PIXI from 'pixi.js'

export interface EffectTextOptions {
  fontSize?: number
  color?: string
  duration?: number
  direction?: 'up' | 'down' | 'left' | 'right'
}

interface TextInstance {
  text: PIXI.Text
  elapsed: number
  duration: number
  startX: number
  startY: number
  targetX: number
  targetY: number
}

export class EffectTextDisplay {
  private container: PIXI.Container
  private activeTexts: TextInstance[] = []
  private pool: PIXI.Text[] = []

  constructor(parentContainer: PIXI.Container) {
    this.container = new PIXI.Container()
    this.container.label = 'effect-text-display'
    parentContainer.addChild(this.container)
  }

  show(text: string, x: number, y: number, options: EffectTextOptions = {}): void {
    const {
      fontSize = 18,
      color = '#9b59b6',
      duration = 0.6,
      direction = 'up'
    } = options

    const textObj = this.pool.pop() || new PIXI.Text({ text: '', style: {} })
    textObj.text = text
    textObj.style = {
      fontFamily: 'monospace',
      fontSize,
      fontWeight: 'bold',
      fill: color,
      stroke: { color: '#000', width: 2 }
    }
    textObj.anchor.set(0.5)
    textObj.position.set(x, y)
    textObj.alpha = 1
    textObj.scale.set(0.8)

    const offset = 25
    const targets = {
      up: { x, y: y - offset },
      down: { x, y: y + offset },
      left: { x: x - offset, y },
      right: { x: x + offset, y }
    }

    this.container.addChild(textObj)
    this.activeTexts.push({
      text: textObj,
      elapsed: 0,
      duration,
      startX: x,
      startY: y,
      targetX: targets[direction].x,
      targetY: targets[direction].y
    })
  }

  showScoreBonus(value: number, x: number, y: number): void {
    const sign = value >= 0 ? '+' : ''
    this.show(`${sign}${value}分`, x, y, {
      color: '#ffe66d',
      fontSize: 20
    })
  }

  showMultiplierBonus(value: number, x: number, y: number): void {
    this.show(`×${value.toFixed(1)}`, x, y, {
      color: '#4ecdc4',
      fontSize: 22
    })
  }

  showSkillName(skillName: string, x: number, y: number): void {
    this.show(skillName, x, y, {
      color: '#9b59b6',
      fontSize: 16,
      direction: 'up'
    })
  }

  update(deltaTime: number): void {
    const dt = deltaTime * 0.001

    for (let i = this.activeTexts.length - 1; i >= 0; i--) {
      const item = this.activeTexts[i]
      item.elapsed += dt

      const progress = Math.min(item.elapsed / item.duration, 1)

      // 弹入效果
      const scaleProgress = Math.min(progress * 3, 1)
      const scale = 0.8 + 0.2 * this.easeOutBack(scaleProgress)
      item.text.scale.set(scale)

      // 位置移动
      const moveEased = this.easeOutCubic(progress)
      item.text.x = item.startX + (item.targetX - item.startX) * moveEased
      item.text.y = item.startY + (item.targetY - item.startY) * moveEased

      // 淡出
      if (progress > 0.6) {
        item.text.alpha = 1 - (progress - 0.6) / 0.4
      }

      // 完成后回收
      if (progress >= 1) {
        this.container.removeChild(item.text)
        this.pool.push(item.text)
        this.activeTexts.splice(i, 1)
      }
    }
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3)
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  }

  getActiveCount(): number {
    return this.activeTexts.length
  }

  clear(): void {
    this.activeTexts.forEach(item => {
      this.container.removeChild(item.text)
      this.pool.push(item.text)
    })
    this.activeTexts = []
  }

  destroy(): void {
    this.clear()
    this.pool.forEach(t => t.destroy())
    this.pool = []
    this.container.destroy()
  }
}
```

### Task 3: AdjacencyVisualizer 相邻联动 (AC: #4)

创建相邻联动可视化组件。

**文件:** `src/src/ui/effects/AdjacencyVisualizer.ts`

**实现要点:**
- 使用 PIXI.Graphics 绘制连线
- 渐变颜色效果（紫色 → 青绿）
- 支持波纹扩散效果
- 线条粗细随时间变化

**关键代码:**
```typescript
import * as PIXI from 'pixi.js'

interface LineInstance {
  graphics: PIXI.Graphics
  elapsed: number
  duration: number
  fromX: number
  fromY: number
  toX: number
  toY: number
}

interface RippleInstance {
  graphics: PIXI.Graphics
  elapsed: number
  duration: number
  centerX: number
  centerY: number
  maxRadius: number
}

export class AdjacencyVisualizer {
  private container: PIXI.Container
  private activeLines: LineInstance[] = []
  private activeRipples: RippleInstance[] = []
  private graphicsPool: PIXI.Graphics[] = []

  constructor(parentContainer: PIXI.Container) {
    this.container = new PIXI.Container()
    this.container.label = 'adjacency-visualizer'
    parentContainer.addChild(this.container)
  }

  showConnection(
    fromKey: string,
    toKey: string,
    keyPositions: Map<string, { x: number; y: number }>
  ): void {
    const fromPos = keyPositions.get(fromKey.toUpperCase())
    const toPos = keyPositions.get(toKey.toUpperCase())

    if (!fromPos || !toPos) return

    const graphics = this.graphicsPool.pop() || new PIXI.Graphics()
    graphics.clear()

    this.container.addChild(graphics)
    this.activeLines.push({
      graphics,
      elapsed: 0,
      duration: 0.3,
      fromX: fromPos.x,
      fromY: fromPos.y,
      toX: toPos.x,
      toY: toPos.y
    })
  }

  showRipple(
    centerKey: string,
    _adjacentKeys: string[],
    keyPositions: Map<string, { x: number; y: number }>
  ): void {
    const centerPos = keyPositions.get(centerKey.toUpperCase())
    if (!centerPos) return

    const graphics = this.graphicsPool.pop() || new PIXI.Graphics()
    graphics.clear()

    this.container.addChild(graphics)
    this.activeRipples.push({
      graphics,
      elapsed: 0,
      duration: 0.4,
      centerX: centerPos.x,
      centerY: centerPos.y,
      maxRadius: 60
    })
  }

  update(deltaTime: number): void {
    const dt = deltaTime * 0.001

    // 更新连线
    for (let i = this.activeLines.length - 1; i >= 0; i--) {
      const line = this.activeLines[i]
      line.elapsed += dt

      const progress = Math.min(line.elapsed / line.duration, 1)

      // 重绘连线
      line.graphics.clear()

      // 计算线条长度进度（先伸展后收缩）
      let lineProgress: number
      let alpha: number

      if (progress < 0.5) {
        // 伸展阶段
        lineProgress = progress * 2
        alpha = 1
      } else {
        // 收缩阶段
        lineProgress = 1 - (progress - 0.5) * 2
        alpha = 1 - (progress - 0.5) * 2
      }

      const endX = line.fromX + (line.toX - line.fromX) * lineProgress
      const endY = line.fromY + (line.toY - line.fromY) * lineProgress

      line.graphics.moveTo(line.fromX, line.fromY)
      line.graphics.lineTo(endX, endY)
      line.graphics.stroke({ width: 3, color: 0x9b59b6, alpha })

      // 完成后回收
      if (progress >= 1) {
        this.container.removeChild(line.graphics)
        this.graphicsPool.push(line.graphics)
        this.activeLines.splice(i, 1)
      }
    }

    // 更新波纹
    for (let i = this.activeRipples.length - 1; i >= 0; i--) {
      const ripple = this.activeRipples[i]
      ripple.elapsed += dt

      const progress = Math.min(ripple.elapsed / ripple.duration, 1)
      const radius = ripple.maxRadius * progress
      const alpha = 1 - progress

      ripple.graphics.clear()
      ripple.graphics.circle(ripple.centerX, ripple.centerY, radius)
      ripple.graphics.stroke({ width: 2, color: 0x4ecdc4, alpha })

      // 完成后回收
      if (progress >= 1) {
        this.container.removeChild(ripple.graphics)
        this.graphicsPool.push(ripple.graphics)
        this.activeRipples.splice(i, 1)
      }
    }
  }

  getActiveCount(): number {
    return this.activeLines.length + this.activeRipples.length
  }

  clear(): void {
    this.activeLines.forEach(line => {
      this.container.removeChild(line.graphics)
      this.graphicsPool.push(line.graphics)
    })
    this.activeLines = []

    this.activeRipples.forEach(ripple => {
      this.container.removeChild(ripple.graphics)
      this.graphicsPool.push(ripple.graphics)
    })
    this.activeRipples = []
  }

  destroy(): void {
    this.clear()
    this.graphicsPool.forEach(g => g.destroy())
    this.graphicsPool = []
    this.container.destroy()
  }
}
```

### Task 4: EffectQueueDisplay 队列显示 (AC: #5)

创建效果队列显示组件。

**文件:** `src/src/ui/effects/EffectQueueDisplay.ts`

**实现要点:**
- 显示当前效果队列中的效果
- 队首效果高亮
- 入队/出队动画
- 固定位置显示（HUD 区域）

### Task 5: SkillFeedbackManager 主管理器 (AC: #1-#6)

创建技能反馈管理器，协调所有反馈组件。

**文件:** `src/src/ui/effects/SkillFeedbackManager.ts`

**实现要点:**
- 监听 skill:triggered 事件
- 协调图标弹出、效果文字、相邻可视化
- 与 ParticleManager、AudioManager 同步
- 从 KeyboardVisualizer 获取键位位置

**关键代码:**
```typescript
import { eventBus } from '../../core/events/EventBus'
import type { KeyboardVisualizer } from '../keyboard/KeyboardVisualizer'
import type { ParticleManager } from './ParticleManager'
import type { AudioManager } from '../../systems/audio/AudioManager'
import { SkillIconPopup } from './SkillIconPopup'
import { EffectTextDisplay } from './EffectTextDisplay'
import { AdjacencyVisualizer } from './AdjacencyVisualizer'
import { adjacencyMap } from '../../systems/skills/passive/AdjacencyMap'
import { SKILLS } from '../../data/skills'

export class SkillFeedbackManager {
  private container: PIXI.Container
  private keyboardVisualizer: KeyboardVisualizer
  private particleManager: ParticleManager
  private audioManager: AudioManager

  private skillIconPopup: SkillIconPopup
  private effectTextDisplay: EffectTextDisplay
  private adjacencyVisualizer: AdjacencyVisualizer

  private enabled = false
  private unsubscribers: (() => void)[] = []

  constructor(
    container: PIXI.Container,
    keyboardVisualizer: KeyboardVisualizer,
    particleManager: ParticleManager,
    audioManager: AudioManager
  ) {
    this.container = container
    this.keyboardVisualizer = keyboardVisualizer
    this.particleManager = particleManager
    this.audioManager = audioManager

    // 初始化子组件
    this.skillIconPopup = new SkillIconPopup(container)
    this.effectTextDisplay = new EffectTextDisplay(container)
    this.adjacencyVisualizer = new AdjacencyVisualizer(container)
  }

  enable(): void {
    if (this.enabled) return
    this.enabled = true

    this.unsubscribers.push(
      eventBus.on('skill:triggered', this.onSkillTriggered)
    )
  }

  disable(): void {
    if (!this.enabled) return
    this.enabled = false

    this.unsubscribers.forEach(unsub => unsub())
    this.unsubscribers = []
  }

  isEnabled(): boolean {
    return this.enabled
  }

  private onSkillTriggered = (data: {
    key: string
    skillId: string
    type: 'passive' | 'active'
    value?: number
  }): void => {
    const keyPosition = this.getKeyPosition(data.key)
    if (!keyPosition) return

    const skill = SKILLS[data.skillId]
    if (!skill) return

    // 1. 播放图标弹出
    this.skillIconPopup.play(data.skillId, keyPosition.x, keyPosition.y)

    // 2. 显示效果文字
    if (data.value !== undefined) {
      if (skill.type === 'score') {
        this.effectTextDisplay.showScoreBonus(data.value, keyPosition.x, keyPosition.y - 30)
      } else if (skill.type === 'multiply') {
        this.effectTextDisplay.showMultiplierBonus(data.value, keyPosition.x, keyPosition.y - 30)
      }
    }
    this.effectTextDisplay.showSkillName(skill.name, keyPosition.x, keyPosition.y - 50)

    // 3. 被动技能显示相邻联动
    if (data.type === 'passive') {
      const adjacentKeys = adjacencyMap.getAdjacent(data.key)
      const keyPositions = this.buildKeyPositionMap()

      // 显示波纹
      this.adjacencyVisualizer.showRipple(data.key, adjacentKeys, keyPositions)

      // 显示连线到有技能的相邻键
      adjacentKeys.forEach(adjKey => {
        // 只有相邻键也绑定了技能时才显示连线
        this.adjacencyVisualizer.showConnection(data.key, adjKey, keyPositions)
      })
    }
  }

  private getKeyPosition(key: string): { x: number; y: number } | null {
    const keyVisual = this.keyboardVisualizer.getKey(key)
    if (!keyVisual) return null

    // 获取键的全局位置
    const globalPos = keyVisual.getGlobalPosition()
    return { x: globalPos.x, y: globalPos.y }
  }

  private buildKeyPositionMap(): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>()
    const allKeys = 'QWERTYUIOPASDFGHJKLZXCVBNM'.split('')

    allKeys.forEach(key => {
      const pos = this.getKeyPosition(key)
      if (pos) {
        positions.set(key, pos)
      }
    })

    return positions
  }

  update(deltaTime: number): void {
    this.skillIconPopup.update(deltaTime)
    this.effectTextDisplay.update(deltaTime)
    this.adjacencyVisualizer.update(deltaTime)
  }

  clear(): void {
    this.skillIconPopup.clear()
    this.effectTextDisplay.clear()
    this.adjacencyVisualizer.clear()
  }

  destroy(): void {
    this.disable()
    this.skillIconPopup.destroy()
    this.effectTextDisplay.destroy()
    this.adjacencyVisualizer.destroy()
  }
}
```

### Task 6: 键盘高亮增强 (AC: #2)

增强 KeyVisual 的触发动画效果。

**文件:** 修改 `src/src/ui/keyboard/KeyVisual.ts`

**实现要点:**
- 增强 playTriggerAnimation() 效果
- 添加发光效果（glow filter 或 Graphics 叠加）
- 颜色变化：默认 → 紫色 → 回复

### Task 7: 模块导出更新 (AC: #1-#6)

更新 index.ts 导出新组件。

**文件:** `src/src/ui/effects/index.ts`

```typescript
// 已有导出
export { ParticleManager } from './ParticleManager'
export { ParticleController } from './ParticleController'
export { ScorePopup } from './ScorePopup'
export type { ScorePopupOptions } from './ScorePopup'
export { PARTICLE_PRESETS, getMilestoneParticleCount, getFlameIntensity } from './ParticlePresets'
export type { ParticlePresetType, ParticlePresetConfig } from './ParticlePresets'

// 新增导出
export { SkillFeedbackManager } from './SkillFeedbackManager'
export { SkillIconPopup } from './SkillIconPopup'
export { EffectTextDisplay } from './EffectTextDisplay'
export type { EffectTextOptions } from './EffectTextDisplay'
export { AdjacencyVisualizer } from './AdjacencyVisualizer'
export { EffectQueueDisplay } from './EffectQueueDisplay'
```

### Task 8: 单元测试 (AC: #7)

创建测试覆盖核心逻辑。

**文件:** `tests/unit/ui/effects/SkillFeedbackManager.test.ts`

**测试用例:**
- SkillFeedbackManager:
  - enable()/disable() 正确订阅/取消事件
  - skill:triggered 事件触发图标弹出
  - skill:triggered 事件触发效果文字
  - 被动技能触发相邻可视化
  - update() 正确更新所有子组件
  - clear()/destroy() 正确清理

- SkillIconPopup:
  - play() 创建 sprite
  - update() 正确更新动画
  - 对象池复用工作正常

- EffectTextDisplay:
  - showScoreBonus() 显示正确格式
  - showMultiplierBonus() 显示正确格式
  - 不同 direction 参数正确工作

**Mock 策略:**
```typescript
// Mock PIXI.js（参考 Story 7.3）
vi.mock('pixi.js', () => {
  class MockContainer {
    children: unknown[] = []
    label = ''
    destroyed = false
    addChild(child: unknown): unknown {
      this.children.push(child)
      return child
    }
    removeChild(child: unknown): unknown {
      const idx = this.children.indexOf(child)
      if (idx >= 0) this.children.splice(idx, 1)
      return child
    }
    destroy(): void {
      this.destroyed = true
      this.children = []
    }
  }
  // ... 其他 Mock 类
  return { Container: MockContainer, /* ... */ }
})

// Mock KeyboardVisualizer
const mockKeyboardVisualizer = {
  getKey: vi.fn().mockReturnValue({
    getGlobalPosition: () => ({ x: 100, y: 200 })
  })
}

// Mock 依赖
vi.mock('../../systems/skills/passive/AdjacencyMap', () => ({
  adjacencyMap: {
    getAdjacent: vi.fn().mockReturnValue(['W', 'A', 'S'])
  }
}))
```

## 测试计划

### 单元测试 (vitest)

预期测试数量: 约 25-35 tests

- SkillFeedbackManager 测试
  - 构造函数正确初始化子组件
  - enable() 订阅 skill:triggered 事件
  - disable() 取消订阅并清理
  - onSkillTriggered 触发图标弹出
  - onSkillTriggered 触发效果文字
  - 被动技能触发相邻可视化
  - update() 更新所有子组件
  - destroy() 正确销毁

- SkillIconPopup 测试
  - play() 创建 sprite 并添加到容器
  - update() 更新动画进度
  - 动画完成后回收到对象池
  - getActiveCount() 返回正确数量
  - clear() 清理所有弹出

- EffectTextDisplay 测试
  - show() 创建文本并添加到容器
  - showScoreBonus() 显示 "+N分" 格式
  - showMultiplierBonus() 显示 "×N.N" 格式
  - showSkillName() 显示技能名称
  - direction 参数控制移动方向
  - update() 更新动画
  - clear() 清理所有文本

- AdjacencyVisualizer 测试
  - showConnection() 创建连线
  - showRipple() 创建波纹
  - update() 更新动画
  - clear() 清理所有图形

### 手动测试

- [ ] 技能触发时图标正确弹出
- [ ] 效果文字清晰可见
- [ ] 被动技能显示相邻连线/波纹
- [ ] 高亮效果明显但不刺眼
- [ ] 反馈与粒子/音效同步
- [ ] 60fps 稳定（无性能问题）

## Dev Notes

### 从 Story 7.3 学到的经验

**@pixi/particle-emitter 兼容性:**
- Story 7.3 发现 @pixi/particle-emitter 与 PixiJS v8 存在兼容性问题
- 本 Story 应继续使用 PIXI.Graphics/Sprite 程序化实现效果
- 避免引入新的外部粒子库依赖

**对象池模式:**
- Story 7.3 成功使用对象池减少 GC
- 本 Story 所有动画组件都应采用相同模式

**测试 Mock 策略:**
- Mock 类定义必须放在 vi.mock() 工厂函数内部
- 避免 "Cannot access before initialization" 错误

**Controller 模式:**
- 使用 eventBus.on() 订阅，保存 unsubscribe 函数
- enable()/disable() 幂等设计
- destroy() 调用 disable() 并重置状态

### 技术要点

1. **键位位置获取:**
   - KeyboardVisualizer.getKey(key) 返回 KeyVisual
   - KeyVisual 继承 Container，有 getGlobalPosition()
   - 需要考虑 KeyboardVisualizer 的全局位置偏移

2. **动画协调:**
   - 所有动画使用 deltaTime（毫秒）
   - 统一使用 easeOutCubic/easeOutBack 缓动
   - 持续时间控制在 0.3-0.6 秒

3. **渲染层级:**
   - SkillFeedbackManager 的 container 应在 UI 顶层
   - 确保效果在键盘和 HUD 之上显示

4. **性能考虑:**
   - 限制同时活动的效果数量
   - 使用对象池避免频繁创建/销毁
   - Graphics 对象重用并 clear()

### 颜色参考

```
| 元素 | 颜色 | Hex |
|------|------|-----|
| 技能触发 | 紫色 | #9b59b6 |
| 相邻联动 | 青绿 | #4ecdc4 |
| 分数加成 | 金黄 | #ffe66d |
| 倍率加成 | 青绿 | #4ecdc4 |
```

### References

- [Story 7.3: 粒子效果系统](./7-3-particle-effects.md) - 粒子系统实现、对象池模式、测试策略
- [Story 7.2: 击键音效](./7-2-keystroke-sounds.md) - 事件监听模式
- [Story 4.4: 键盘可视化](./4-4-keyboard-visualizer.md) - KeyboardVisualizer API
- [game-architecture.md - Event System](../game-architecture.md#event-system) - 事件定义
- [gdd.md - Art Direction](../gdd.md#art-and-audio-direction) - 视觉风格和配色

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Fixed vi.mock hoisting issue: Mock EventBus directly inside factory function using `vi.fn(() => vi.fn())` pattern
- Code Review (2026-02-17): Fixed 8 issues (4 HIGH, 4 MEDIUM)
  - HIGH: Added EffectQueueDisplay integration to SkillFeedbackManager
  - HIGH: Implemented setEffectQueue() method per story spec
  - HIGH: Added effect:queued/dequeued event subscriptions
  - HIGH: Improved test quality with actual behavior assertions
  - MEDIUM: Added MAX_ACTIVE_POPUPS (10) limit to SkillIconPopup
  - MEDIUM: Added MAX_ACTIVE_TEXTS (15) limit to EffectTextDisplay
  - MEDIUM: Added MAX_ACTIVE_LINES (20) and MAX_ACTIVE_RIPPLES (10) limits to AdjacencyVisualizer
  - MEDIUM: Fixed vi.hoisted() usage for mockGetAdjacent in tests

### Completion Notes List

- [x] Task 1: SkillIconPopup 图标弹出 (AC: #1) - 16 tests passing
- [x] Task 2: EffectTextDisplay 效果文字 (AC: #3) - 19 tests passing
- [x] Task 3: AdjacencyVisualizer 相邻联动 (AC: #4) - 17 tests passing
- [x] Task 4: EffectQueueDisplay 队列显示 (AC: #5) - 15 tests passing
- [x] Task 5: SkillFeedbackManager 主管理器 (AC: #1-#6) - 21 tests passing
- [ ] Task 6: 键盘高亮增强 (AC: #2) - Deferred to future iteration
- [x] Task 7: 模块导出更新 (AC: #1-#6) - index.ts updated
- [x] Task 8: 单元测试 (AC: #7) - 88 new tests total (147 in ui/effects)

### File List

**New Files Created:**
- src/src/ui/effects/SkillIconPopup.ts
- src/src/ui/effects/EffectTextDisplay.ts
- src/src/ui/effects/AdjacencyVisualizer.ts
- src/src/ui/effects/EffectQueueDisplay.ts
- src/src/ui/effects/SkillFeedbackManager.ts
- tests/unit/ui/effects/SkillIconPopup.test.ts
- tests/unit/ui/effects/EffectTextDisplay.test.ts
- tests/unit/ui/effects/AdjacencyVisualizer.test.ts
- tests/unit/ui/effects/EffectQueueDisplay.test.ts
- tests/unit/ui/effects/SkillFeedbackManager.test.ts

**Modified Files:**
- src/src/ui/effects/index.ts - Added Story 7.4 exports
