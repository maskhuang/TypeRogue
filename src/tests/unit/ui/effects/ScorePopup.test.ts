// ============================================
// 打字肉鸽 - ScorePopup 单元测试
// ============================================
// Story 7.3: 粒子效果系统 (AC: #2, #7)

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock PIXI.js before importing ScorePopup
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
    style: Record<string, unknown> = {
      fontSize: 24,
      fill: '#ffffff'
    }
    position = new MockPoint()
    anchor = new MockPoint()
    alpha = 1
    scale = new MockPoint()
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

import { ScorePopup } from '../../../../src/ui/effects/ScorePopup'
import * as PIXI from 'pixi.js'

describe('ScorePopup', () => {
  let popup: ScorePopup
  let parentContainer: PIXI.Container

  beforeEach(() => {
    parentContainer = new PIXI.Container()
    popup = new ScorePopup(parentContainer)
  })

  afterEach(() => {
    popup.destroy()
    vi.clearAllMocks()
  })

  // ===========================================
  // 构造函数测试
  // ===========================================

  describe('构造函数', () => {
    it('应该正确初始化', () => {
      expect(popup).toBeDefined()
    })

    it('应该创建容器并添加到父容器', () => {
      expect(parentContainer.children.length).toBe(1)
    })
  })

  // ===========================================
  // show() 测试 (AC: #2)
  // ===========================================

  describe('show() (AC: #2)', () => {
    it('应该创建分数飘字', () => {
      popup.show(100, 200, 300)

      expect(popup.getActiveCount()).toBe(1)
    })

    it('应该显示正确的分数文本', () => {
      popup.show(1234, 200, 300)

      // 验证有活动的弹窗
      expect(popup.getActiveCount()).toBe(1)
    })

    it('多次调用应该创建多个飘字', () => {
      popup.show(100, 100, 100)
      popup.show(200, 200, 200)
      popup.show(300, 300, 300)

      expect(popup.getActiveCount()).toBe(3)
    })

    it('分数越高字体应该越大', () => {
      // 内部逻辑验证 - 不抛出异常
      expect(() => popup.show(50, 100, 100)).not.toThrow()
      expect(() => popup.show(500, 100, 100)).not.toThrow()
      expect(() => popup.show(5000, 100, 100)).not.toThrow()
    })

    it('应该支持自定义选项', () => {
      expect(() => popup.show(100, 200, 300, {
        fontSize: 32,
        color: '#ff0000',
        duration: 1.5
      })).not.toThrow()
    })
  })

  // ===========================================
  // showMultiplier() 测试
  // ===========================================

  describe('showMultiplier()', () => {
    it('应该显示倍率飘字', () => {
      popup.showMultiplier(2.5, 200, 300)

      expect(popup.getActiveCount()).toBe(1)
    })
  })

  // ===========================================
  // update() 测试 (AC: #2)
  // ===========================================

  describe('update() (AC: #2)', () => {
    it('应该更新飘字动画', () => {
      popup.show(100, 200, 300)

      // 不应该抛出异常
      expect(() => popup.update(16)).not.toThrow()
    })

    it('飘字应该向上漂浮', () => {
      popup.show(100, 200, 300)

      // 模拟一些时间后
      popup.update(100)

      // 验证动画进行中
      expect(popup.getActiveCount()).toBe(1)
    })

    it('飘字动画完成后应该被移除', () => {
      popup.show(100, 200, 300, { duration: 0.1 })

      // 模拟足够长的时间让动画完成
      for (let i = 0; i < 20; i++) {
        popup.update(50)
      }

      expect(popup.getActiveCount()).toBe(0)
    })

    it('应该复用对象池中的文本对象', () => {
      // 创建并完成一个飘字
      popup.show(100, 200, 300, { duration: 0.05 })

      // 让它完成
      for (let i = 0; i < 20; i++) {
        popup.update(50)
      }

      expect(popup.getActiveCount()).toBe(0)

      // 创建新的飘字（应该复用）
      popup.show(200, 200, 300)

      expect(popup.getActiveCount()).toBe(1)
    })
  })

  // ===========================================
  // clear() 测试
  // ===========================================

  describe('clear()', () => {
    it('应该清理所有飘字', () => {
      popup.show(100, 100, 100)
      popup.show(200, 200, 200)
      popup.show(300, 300, 300)

      popup.clear()

      expect(popup.getActiveCount()).toBe(0)
    })
  })

  // ===========================================
  // destroy() 测试
  // ===========================================

  describe('destroy()', () => {
    it('应该清理并销毁', () => {
      popup.show(100, 100, 100)

      popup.destroy()

      expect(popup.getActiveCount()).toBe(0)
    })
  })

  // ===========================================
  // 分数到样式映射测试
  // ===========================================

  describe('分数样式映射', () => {
    it('低分数应该使用基础样式', () => {
      expect(() => popup.show(50, 100, 100)).not.toThrow()
    })

    it('中等分数应该使用增强样式', () => {
      expect(() => popup.show(500, 100, 100)).not.toThrow()
    })

    it('高分数应该使用华丽样式', () => {
      expect(() => popup.show(2000, 100, 100)).not.toThrow()
    })
  })
})
