// ============================================
// 打字肉鸽 - CollectionScene 单元测试
// ============================================
// Story 6.4: 图鉴场景

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Container } from 'pixi.js'
import { CollectionScene } from '../../../../src/scenes/collection/CollectionScene'
import { eventBus } from '../../../../src/core/events/EventBus'

// 创建模拟键盘事件
function createKeyEvent(key: string): { key: string } {
  return { key }
}

describe('CollectionScene', () => {
  let scene: CollectionScene

  beforeEach(() => {
    scene = new CollectionScene()
  })

  afterEach(() => {
    if (!scene.isDestroyed) {
      scene.onExit()
    }
  })

  // ===========================================
  // Task 1: CollectionScene 基础框架 (AC: #1, #8, #10)
  // ===========================================

  describe('基础框架 (Task 1)', () => {
    it('应该有正确的场景名称', () => {
      expect(scene.name).toBe('CollectionScene')
    })

    it('应该创建 PixiJS Container', () => {
      expect(scene.container).toBeInstanceOf(Container)
    })

    it('onEnter 应该显示容器', () => {
      scene.container.visible = false
      scene.onEnter()
      expect(scene.container.visible).toBe(true)
    })

    it('onEnter 应该发送 scene:change 事件', () => {
      const handler = vi.fn()
      const unsubscribe = eventBus.on('scene:change', handler)

      scene.onEnter()

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'collection'
        })
      )

      unsubscribe()
    })

    it('onExit 应该清理资源', () => {
      scene.onEnter()
      scene.onExit()

      expect(scene.container.visible).toBe(false)
      expect(scene.isDestroyed).toBe(true)
    })

    it('update 不应该抛出错误', () => {
      scene.onEnter()
      expect(() => scene.update(16)).not.toThrow()
    })

    it('render 不应该抛出错误', () => {
      scene.onEnter()
      expect(() => scene.render()).not.toThrow()
    })

    it('应该继承 BaseScene', () => {
      // BaseScene 提供了 fadeIn/fadeOut 等方法
      expect(scene.container).toBeDefined()
      expect(typeof scene.onEnter).toBe('function')
      expect(typeof scene.onExit).toBe('function')
      expect(typeof scene.onPause).toBe('function')
      expect(typeof scene.onResume).toBe('function')
    })
  })

  // ===========================================
  // Task 2: TabBar 组件 (AC: #5, #6)
  // ===========================================

  describe('TabBar 切换 (Task 2)', () => {
    it('应该有三个标签页', () => {
      scene.onEnter()
      expect(scene.getTabCount()).toBe(3)
    })

    it('初始应该显示技能标签页', () => {
      scene.onEnter()
      expect(scene.getCurrentTabIndex()).toBe(0)
    })

    it('切换到下一个标签页', () => {
      scene.onEnter()
      scene.switchTab(1)
      expect(scene.getCurrentTabIndex()).toBe(1)
    })

    it('切换到上一个标签页', () => {
      scene.onEnter()
      scene.switchTab(1)
      scene.switchTab(-1)
      expect(scene.getCurrentTabIndex()).toBe(0)
    })

    it('在最后一个标签页向右切换应该循环到第一个', () => {
      scene.onEnter()
      scene.switchTab(1) // 1
      scene.switchTab(1) // 2
      scene.switchTab(1) // 回到 0
      expect(scene.getCurrentTabIndex()).toBe(0)
    })

    it('在第一个标签页向左切换应该循环到最后一个', () => {
      scene.onEnter()
      scene.switchTab(-1) // 回到 2
      expect(scene.getCurrentTabIndex()).toBe(2)
    })
  })

  // ===========================================
  // Task 7: 键盘导航 (AC: #6)
  // ===========================================

  describe('键盘导航 (Task 7)', () => {
    it('ArrowRight 应该切换到下一个标签页', () => {
      scene.onEnter()
      scene.handleKeyDown(createKeyEvent('ArrowRight') as KeyboardEvent)
      expect(scene.getCurrentTabIndex()).toBe(1)
    })

    it('ArrowLeft 应该切换到上一个标签页', () => {
      scene.onEnter()
      scene.switchTab(1)
      scene.handleKeyDown(createKeyEvent('ArrowLeft') as KeyboardEvent)
      expect(scene.getCurrentTabIndex()).toBe(0)
    })

    it('D 键应该切换到下一个标签页', () => {
      scene.onEnter()
      scene.handleKeyDown(createKeyEvent('d') as KeyboardEvent)
      expect(scene.getCurrentTabIndex()).toBe(1)
    })

    it('A 键应该切换到上一个标签页', () => {
      scene.onEnter()
      scene.switchTab(1)
      scene.handleKeyDown(createKeyEvent('a') as KeyboardEvent)
      expect(scene.getCurrentTabIndex()).toBe(0)
    })

    it('ArrowDown 应该滚动内容', () => {
      scene.onEnter()
      const initialScroll = scene.getScrollOffset()
      scene.handleKeyDown(createKeyEvent('ArrowDown') as KeyboardEvent)
      expect(scene.getScrollOffset()).toBeGreaterThan(initialScroll)
    })

    it('ArrowUp 应该向上滚动内容', () => {
      scene.onEnter()
      scene.scroll(1) // 先向下滚动
      const currentScroll = scene.getScrollOffset()
      scene.handleKeyDown(createKeyEvent('ArrowUp') as KeyboardEvent)
      expect(scene.getScrollOffset()).toBeLessThan(currentScroll)
    })

    it('Escape 应该触发返回', () => {
      scene.onEnter()
      const handler = vi.fn()
      scene.onReturnToMenu(handler)
      scene.handleKeyDown(createKeyEvent('Escape') as KeyboardEvent)
      expect(handler).toHaveBeenCalled()
    })

    it('onExit 后不应响应键盘事件', () => {
      scene.onEnter()
      scene.onExit()
      // 不应抛出错误
      expect(() => {
        scene.handleKeyDown(createKeyEvent('ArrowRight') as KeyboardEvent)
      }).not.toThrow()
    })
  })
})
