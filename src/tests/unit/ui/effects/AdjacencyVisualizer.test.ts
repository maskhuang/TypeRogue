// ============================================
// 打字肉鸽 - AdjacencyVisualizer 单元测试
// ============================================
// Story 7.4: 技能触发反馈 (AC: #4)

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock PIXI.js before importing AdjacencyVisualizer
vi.mock('pixi.js', () => {
  class MockGraphics {
    position = { x: 0, y: 0, set: vi.fn() }
    destroyed = false

    moveTo(): this { return this }
    lineTo(): this { return this }
    stroke(): this { return this }
    circle(): this { return this }
    clear(): this { return this }
    destroy(): void { this.destroyed = true }
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
    Graphics: MockGraphics
  }
})

import { AdjacencyVisualizer } from '../../../../src/ui/effects/AdjacencyVisualizer'
import * as PIXI from 'pixi.js'

describe('AdjacencyVisualizer', () => {
  let visualizer: AdjacencyVisualizer
  let parentContainer: PIXI.Container
  let keyPositions: Map<string, { x: number; y: number }>

  beforeEach(() => {
    parentContainer = new PIXI.Container()
    visualizer = new AdjacencyVisualizer(parentContainer)

    // 设置模拟键位位置
    keyPositions = new Map([
      ['Q', { x: 100, y: 100 }],
      ['W', { x: 150, y: 100 }],
      ['E', { x: 200, y: 100 }],
      ['A', { x: 110, y: 150 }],
      ['S', { x: 160, y: 150 }],
      ['D', { x: 210, y: 150 }]
    ])
  })

  afterEach(() => {
    visualizer.destroy()
    vi.clearAllMocks()
  })

  // ===========================================
  // 构造函数测试
  // ===========================================

  describe('构造函数', () => {
    it('应该正确初始化', () => {
      expect(visualizer).toBeDefined()
    })

    it('应该创建容器并添加到父容器', () => {
      expect(parentContainer.children.length).toBe(1)
    })
  })

  // ===========================================
  // showConnection() 测试 (AC: #4)
  // ===========================================

  describe('showConnection() (AC: #4)', () => {
    it('应该创建连线效果', () => {
      visualizer.showConnection('Q', 'W', keyPositions)

      expect(visualizer.getActiveCount()).toBeGreaterThan(0)
    })

    it('多次调用应该创建多条连线', () => {
      visualizer.showConnection('Q', 'W', keyPositions)
      visualizer.showConnection('W', 'E', keyPositions)
      visualizer.showConnection('A', 'S', keyPositions)

      expect(visualizer.getActiveCount()).toBe(3)
    })

    it('无效键位不应该创建连线', () => {
      visualizer.showConnection('INVALID', 'W', keyPositions)

      expect(visualizer.getActiveCount()).toBe(0)
    })

    it('应该支持小写键位', () => {
      visualizer.showConnection('q', 'w', keyPositions)

      expect(visualizer.getActiveCount()).toBeGreaterThan(0)
    })
  })

  // ===========================================
  // showRipple() 测试 (AC: #4)
  // ===========================================

  describe('showRipple() (AC: #4)', () => {
    it('应该创建波纹效果', () => {
      visualizer.showRipple('W', ['Q', 'E', 'S'], keyPositions)

      expect(visualizer.getActiveCount()).toBeGreaterThan(0)
    })

    it('无效中心键位不应该创建波纹', () => {
      visualizer.showRipple('INVALID', ['Q', 'E'], keyPositions)

      expect(visualizer.getActiveCount()).toBe(0)
    })

    it('应该支持小写键位', () => {
      visualizer.showRipple('w', ['q', 'e', 's'], keyPositions)

      expect(visualizer.getActiveCount()).toBeGreaterThan(0)
    })
  })

  // ===========================================
  // update() 测试 (AC: #4)
  // ===========================================

  describe('update() (AC: #4)', () => {
    it('应该更新连线动画', () => {
      visualizer.showConnection('Q', 'W', keyPositions)

      expect(() => visualizer.update(16)).not.toThrow()
    })

    it('应该更新波纹动画', () => {
      visualizer.showRipple('W', ['Q', 'E', 'S'], keyPositions)

      expect(() => visualizer.update(16)).not.toThrow()
    })

    it('连线动画完成后应该被移除', () => {
      visualizer.showConnection('Q', 'W', keyPositions)

      // 模拟足够长的时间让动画完成（默认 0.3s）
      for (let i = 0; i < 30; i++) {
        visualizer.update(50)
      }

      expect(visualizer.getActiveCount()).toBe(0)
    })

    it('波纹动画完成后应该被移除', () => {
      visualizer.showRipple('W', ['Q', 'E', 'S'], keyPositions)

      // 模拟足够长的时间让动画完成（默认 0.4s）
      for (let i = 0; i < 30; i++) {
        visualizer.update(50)
      }

      expect(visualizer.getActiveCount()).toBe(0)
    })

    it('应该复用对象池中的 graphics', () => {
      // 创建并完成一个连线
      visualizer.showConnection('Q', 'W', keyPositions)

      // 让它完成
      for (let i = 0; i < 30; i++) {
        visualizer.update(50)
      }

      expect(visualizer.getActiveCount()).toBe(0)

      // 创建新的连线（应该复用）
      visualizer.showConnection('A', 'S', keyPositions)

      expect(visualizer.getActiveCount()).toBeGreaterThan(0)
    })
  })

  // ===========================================
  // clear() 测试
  // ===========================================

  describe('clear()', () => {
    it('应该清理所有效果', () => {
      visualizer.showConnection('Q', 'W', keyPositions)
      visualizer.showConnection('A', 'S', keyPositions)
      visualizer.showRipple('W', ['Q', 'E', 'S'], keyPositions)

      visualizer.clear()

      expect(visualizer.getActiveCount()).toBe(0)
    })
  })

  // ===========================================
  // destroy() 测试
  // ===========================================

  describe('destroy()', () => {
    it('应该清理并销毁', () => {
      visualizer.showConnection('Q', 'W', keyPositions)
      visualizer.showRipple('W', ['Q', 'E', 'S'], keyPositions)

      visualizer.destroy()

      expect(visualizer.getActiveCount()).toBe(0)
    })
  })

  // ===========================================
  // 性能测试
  // ===========================================

  describe('性能', () => {
    it('大量效果更新应该高效', () => {
      // 创建多个效果
      for (let i = 0; i < 10; i++) {
        visualizer.showConnection('Q', 'W', keyPositions)
        visualizer.showRipple('W', ['Q', 'E', 'S'], keyPositions)
      }

      const start = performance.now()

      // 更新多帧
      for (let i = 0; i < 60; i++) {
        visualizer.update(16.67)
      }

      const elapsed = performance.now() - start

      // 60 帧更新应该在合理时间内完成（< 100ms）
      expect(elapsed).toBeLessThan(100)
    })
  })
})
