// ============================================
// 打字肉鸽 - EffectQueueDisplay 单元测试
// ============================================
// Story 7.4: 技能触发反馈 (AC: #5)

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock PIXI.js before importing EffectQueueDisplay
vi.mock('pixi.js', () => {
  class MockPoint {
    x = 0
    y = 0
    set(x: number, y?: number): void {
      this.x = x
      this.y = y ?? x
    }
  }

  class MockText {
    text = ''
    style: Record<string, unknown> = {}
    position = new MockPoint()
    anchor = new MockPoint()
    scale = new MockPoint()
    alpha = 1
    x = 0
    y = 0
    destroyed = false

    constructor(options?: { text?: string; style?: Record<string, unknown> }) {
      if (options?.text) this.text = options.text
      if (options?.style) this.style = options.style
    }

    destroy(): void {
      this.destroyed = true
    }
  }

  class MockGraphics {
    position = new MockPoint()
    scale = new MockPoint()
    alpha = 1
    destroyed = false

    rect(): this { return this }
    fill(): this { return this }
    stroke(): this { return this }
    clear(): this { return this }
    destroy(): void { this.destroyed = true }
  }

  class MockContainer {
    children: unknown[] = []
    label = ''
    position = new MockPoint()
    scale = new MockPoint()
    alpha = 1
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

  return {
    Container: MockContainer,
    Graphics: MockGraphics,
    Text: MockText
  }
})

import { EffectQueueDisplay } from '../../../../src/ui/effects/EffectQueueDisplay'
import type { QueuedEffect } from '../../../../src/ui/effects/EffectQueueDisplay'
import * as PIXI from 'pixi.js'

describe('EffectQueueDisplay', () => {
  let display: EffectQueueDisplay
  let parentContainer: PIXI.Container

  const mockEffects: QueuedEffect[] = [
    { id: '1', skillId: 'fire_blast', name: '火焰冲击', type: 'damage' },
    { id: '2', skillId: 'ice_shield', name: '冰霜护盾', type: 'buff' },
    { id: '3', skillId: 'thunder_bolt', name: '雷电一击', type: 'damage' }
  ]

  beforeEach(() => {
    parentContainer = new PIXI.Container()
    display = new EffectQueueDisplay(parentContainer)
  })

  afterEach(() => {
    display.destroy()
    vi.clearAllMocks()
  })

  // ===========================================
  // 构造函数测试
  // ===========================================

  describe('构造函数', () => {
    it('应该正确初始化', () => {
      expect(display).toBeDefined()
    })

    it('应该创建容器并添加到父容器', () => {
      expect(parentContainer.children.length).toBe(1)
    })
  })

  // ===========================================
  // updateQueue() 测试 (AC: #5)
  // ===========================================

  describe('updateQueue() (AC: #5)', () => {
    it('应该更新队列显示', () => {
      expect(() => display.updateQueue(mockEffects)).not.toThrow()
    })

    it('空队列应该正常处理', () => {
      expect(() => display.updateQueue([])).not.toThrow()
    })

    it('应该限制显示数量', () => {
      const manyEffects = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        skillId: `skill_${i}`,
        name: `技能${i}`,
        type: 'damage' as const
      }))

      expect(() => display.updateQueue(manyEffects)).not.toThrow()
    })
  })

  // ===========================================
  // highlightNext() 测试 (AC: #5)
  // ===========================================

  describe('highlightNext() (AC: #5)', () => {
    it('应该高亮队首效果', () => {
      display.updateQueue(mockEffects)

      expect(() => display.highlightNext()).not.toThrow()
    })

    it('空队列时不应该抛出异常', () => {
      display.updateQueue([])

      expect(() => display.highlightNext()).not.toThrow()
    })
  })

  // ===========================================
  // playEnqueueAnimation() 测试 (AC: #5)
  // ===========================================

  describe('playEnqueueAnimation() (AC: #5)', () => {
    it('应该播放入队动画', () => {
      expect(() => display.playEnqueueAnimation(mockEffects[0])).not.toThrow()
    })

    it('应该增加活动动画计数', () => {
      display.playEnqueueAnimation(mockEffects[0])

      expect(display.getActiveAnimationCount()).toBeGreaterThan(0)
    })
  })

  // ===========================================
  // playDequeueAnimation() 测试 (AC: #5)
  // ===========================================

  describe('playDequeueAnimation() (AC: #5)', () => {
    it('有队列内容时应该播放出队动画', () => {
      display.updateQueue(mockEffects)

      expect(() => display.playDequeueAnimation()).not.toThrow()
    })

    it('空队列时不应该抛出异常', () => {
      display.updateQueue([])

      expect(() => display.playDequeueAnimation()).not.toThrow()
    })
  })

  // ===========================================
  // setPosition() 测试
  // ===========================================

  describe('setPosition()', () => {
    it('应该设置位置', () => {
      expect(() => display.setPosition(100, 200)).not.toThrow()
    })
  })

  // ===========================================
  // update() 测试
  // ===========================================

  describe('update()', () => {
    it('应该更新动画', () => {
      display.playEnqueueAnimation(mockEffects[0])

      expect(() => display.update(16)).not.toThrow()
    })

    it('动画完成后应该被清理', () => {
      display.playEnqueueAnimation(mockEffects[0])

      // 模拟足够长的时间让动画完成
      for (let i = 0; i < 30; i++) {
        display.update(50)
      }

      expect(display.getActiveAnimationCount()).toBe(0)
    })
  })

  // ===========================================
  // destroy() 测试
  // ===========================================

  describe('destroy()', () => {
    it('应该清理并销毁', () => {
      display.updateQueue(mockEffects)
      display.playEnqueueAnimation(mockEffects[0])

      display.destroy()

      expect(display.getActiveAnimationCount()).toBe(0)
    })
  })
})
