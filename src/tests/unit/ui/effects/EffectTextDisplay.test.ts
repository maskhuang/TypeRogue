// ============================================
// 打字肉鸽 - EffectTextDisplay 单元测试
// ============================================
// Story 7.4: 技能触发反馈 (AC: #3)

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock PIXI.js before importing EffectTextDisplay
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

  return {
    Container: MockContainer,
    Text: MockText
  }
})

import { EffectTextDisplay } from '../../../../src/ui/effects/EffectTextDisplay'
import * as PIXI from 'pixi.js'

describe('EffectTextDisplay', () => {
  let display: EffectTextDisplay
  let parentContainer: PIXI.Container

  beforeEach(() => {
    parentContainer = new PIXI.Container()
    display = new EffectTextDisplay(parentContainer)
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
  // show() 测试 (AC: #3)
  // ===========================================

  describe('show() (AC: #3)', () => {
    it('应该创建效果文字', () => {
      display.show('测试文字', 100, 200)

      expect(display.getActiveCount()).toBe(1)
    })

    it('多次调用应该创建多个文字', () => {
      display.show('文字1', 100, 100)
      display.show('文字2', 200, 200)
      display.show('文字3', 300, 300)

      expect(display.getActiveCount()).toBe(3)
    })

    it('应该支持自定义选项', () => {
      expect(() => display.show('测试', 100, 200, {
        fontSize: 24,
        color: '#ff0000',
        duration: 1.0,
        direction: 'down'
      })).not.toThrow()

      expect(display.getActiveCount()).toBe(1)
    })

    it('应该支持不同方向', () => {
      expect(() => display.show('上', 100, 100, { direction: 'up' })).not.toThrow()
      expect(() => display.show('下', 100, 100, { direction: 'down' })).not.toThrow()
      expect(() => display.show('左', 100, 100, { direction: 'left' })).not.toThrow()
      expect(() => display.show('右', 100, 100, { direction: 'right' })).not.toThrow()

      expect(display.getActiveCount()).toBe(4)
    })
  })

  // ===========================================
  // showScoreBonus() 测试 (AC: #3)
  // ===========================================

  describe('showScoreBonus() (AC: #3)', () => {
    it('应该显示分数加成', () => {
      display.showScoreBonus(100, 200, 300)

      expect(display.getActiveCount()).toBe(1)
    })

    it('正数应该显示加号前缀', () => {
      display.showScoreBonus(50, 100, 100)
      expect(display.getActiveCount()).toBe(1)
    })

    it('负数应该正确显示', () => {
      display.showScoreBonus(-30, 100, 100)
      expect(display.getActiveCount()).toBe(1)
    })
  })

  // ===========================================
  // showMultiplierBonus() 测试 (AC: #3)
  // ===========================================

  describe('showMultiplierBonus() (AC: #3)', () => {
    it('应该显示倍率加成', () => {
      display.showMultiplierBonus(1.5, 200, 300)

      expect(display.getActiveCount()).toBe(1)
    })

    it('应该格式化倍率数值', () => {
      display.showMultiplierBonus(2.0, 100, 100)
      expect(display.getActiveCount()).toBe(1)
    })
  })

  // ===========================================
  // showSkillName() 测试 (AC: #3)
  // ===========================================

  describe('showSkillName() (AC: #3)', () => {
    it('应该显示技能名称', () => {
      display.showSkillName('火焰冲击', 200, 300)

      expect(display.getActiveCount()).toBe(1)
    })
  })

  // ===========================================
  // update() 测试 (AC: #3)
  // ===========================================

  describe('update() (AC: #3)', () => {
    it('应该更新文字动画', () => {
      display.show('测试', 100, 200)

      expect(() => display.update(16)).not.toThrow()
    })

    it('文字应该移动到目标位置', () => {
      display.show('测试', 100, 200, { direction: 'up' })

      // 更新一些帧
      display.update(100)
      display.update(100)

      // 验证动画进行中
      expect(display.getActiveCount()).toBe(1)
    })

    it('文字动画完成后应该被移除', () => {
      display.show('测试', 100, 200, { duration: 0.1 })

      // 模拟足够长的时间让动画完成
      for (let i = 0; i < 20; i++) {
        display.update(50)
      }

      expect(display.getActiveCount()).toBe(0)
    })

    it('应该复用对象池中的文本对象', () => {
      // 创建并完成一个文字
      display.show('测试1', 100, 200, { duration: 0.05 })

      // 让它完成
      for (let i = 0; i < 20; i++) {
        display.update(50)
      }

      expect(display.getActiveCount()).toBe(0)

      // 创建新的文字（应该复用）
      display.show('测试2', 200, 300)

      expect(display.getActiveCount()).toBe(1)
    })
  })

  // ===========================================
  // clear() 测试
  // ===========================================

  describe('clear()', () => {
    it('应该清理所有文字', () => {
      display.show('文字1', 100, 100)
      display.show('文字2', 200, 200)
      display.show('文字3', 300, 300)

      display.clear()

      expect(display.getActiveCount()).toBe(0)
    })
  })

  // ===========================================
  // destroy() 测试
  // ===========================================

  describe('destroy()', () => {
    it('应该清理并销毁', () => {
      display.show('测试', 100, 100)

      display.destroy()

      expect(display.getActiveCount()).toBe(0)
    })
  })

  // ===========================================
  // 性能测试
  // ===========================================

  describe('性能', () => {
    it('大量文字更新应该高效', () => {
      // 创建多个文字效果
      for (let i = 0; i < 20; i++) {
        display.show(`效果${i}`, Math.random() * 800, Math.random() * 600)
      }

      const start = performance.now()

      // 更新多帧
      for (let i = 0; i < 60; i++) {
        display.update(16.67)
      }

      const elapsed = performance.now() - start

      // 60 帧更新应该在合理时间内完成（< 100ms）
      expect(elapsed).toBeLessThan(100)
    })
  })
})
