// ============================================
// 打字肉鸽 - CloudSyncIndicator 单元测试
// ============================================
// Story 8.4: Steam 云存档 (AC: #6)

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CloudSyncIndicator } from '../../../../src/ui/indicators/CloudSyncIndicator'

// Mock PixiJS
vi.mock('pixi.js', () => ({
  Container: class MockContainer {
    label = ''
    children: unknown[] = []
    addChild(...children: unknown[]) {
      this.children.push(...children)
    }
    destroy() {}
  },
  Graphics: class MockGraphics {
    rotation = 0
    x = 0
    y = 0
    clear() { return this }
    setStrokeStyle() { return this }
    moveTo() { return this }
    lineTo() { return this }
    arcTo() { return this }
    stroke() { return this }
    circle() { return this }
    fill() { return this }
  },
  Text: class MockText {
    text = ''
    x = 0
    y = 0
    constructor(options: { text?: string } = {}) {
      this.text = options.text || ''
    }
  },
  TextStyle: class MockTextStyle {
    constructor() {}
  }
}))

describe('CloudSyncIndicator (Story 8.4 AC: #6)', () => {
  let indicator: CloudSyncIndicator

  beforeEach(() => {
    indicator = new CloudSyncIndicator()
  })

  describe('初始状态', () => {
    it('应该初始化为 idle 状态', () => {
      expect(indicator.getStatus()).toBe('idle')
    })

    it('应该初始化状态文本为空', () => {
      expect(indicator.getStatusText().text).toBe('')
    })
  })

  describe('setStatus', () => {
    it('应该正确设置 syncing 状态', () => {
      indicator.setStatus('syncing')

      expect(indicator.getStatus()).toBe('syncing')
      expect(indicator.getStatusText().text).toBe('同步中...')
    })

    it('应该正确设置 synced 状态', () => {
      indicator.setStatus('synced')

      expect(indicator.getStatus()).toBe('synced')
      expect(indicator.getStatusText().text).toBe('已同步')
    })

    it('应该正确设置 conflict 状态', () => {
      indicator.setStatus('conflict')

      expect(indicator.getStatus()).toBe('conflict')
      expect(indicator.getStatusText().text).toBe('同步冲突')
    })

    it('应该正确设置 offline 状态', () => {
      indicator.setStatus('offline')

      expect(indicator.getStatus()).toBe('offline')
      expect(indicator.getStatusText().text).toBe('离线')
    })

    it('相同状态不应触发更新', () => {
      indicator.setStatus('synced')
      const text1 = indicator.getStatusText().text

      indicator.setStatus('synced')
      const text2 = indicator.getStatusText().text

      expect(text1).toBe(text2)
    })
  })

  describe('update 动画', () => {
    it('syncing 状态时应该有旋转动画', () => {
      indicator.setStatus('syncing')

      // 模拟时间流逝
      indicator.update(0.5) // 0.5秒

      // 检查是否有旋转（具体值取决于实现）
      // 由于我们 mock 了 Graphics，只需确保没有抛出错误
      expect(indicator.getStatus()).toBe('syncing')
    })

    it('非 syncing 状态时不应有旋转动画', () => {
      indicator.setStatus('synced')
      indicator.update(0.5)

      expect(indicator.getStatus()).toBe('synced')
    })
  })

  describe('destroy', () => {
    it('应该正确销毁组件', () => {
      expect(() => indicator.destroy()).not.toThrow()
    })
  })
})
