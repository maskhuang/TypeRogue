// ============================================
// 打字肉鸽 - TabBar 单元测试
// ============================================
// Story 6.4: 图鉴场景 - 标签栏组件测试 (AC: #5)

import { describe, it, expect, vi } from 'vitest'
import { Container } from 'pixi.js'
import { TabBar, TabBarProps } from '../../../../src/scenes/collection/components/TabBar'

describe('TabBar', () => {
  const createTabBar = (overrides: Partial<TabBarProps> = {}): TabBar => {
    const defaultProps: TabBarProps = {
      tabs: ['技能', '遗物', '统计'],
      activeIndex: 0,
      onTabChange: vi.fn(),
      ...overrides
    }
    return new TabBar(defaultProps)
  }

  // ===========================================
  // Task 2: TabBar 组件 (AC: #5, #6)
  // ===========================================

  describe('基础功能', () => {
    it('应该创建 PixiJS Container', () => {
      const tabBar = createTabBar()
      expect(tabBar).toBeInstanceOf(Container)
      tabBar.destroy()
    })

    it('应该渲染正确数量的标签', () => {
      const tabBar = createTabBar()
      // 每个标签是一个子 Container
      expect(tabBar.children.length).toBe(3)
      tabBar.destroy()
    })

    it('应该返回正确的活跃标签', () => {
      const tabBar = createTabBar({ activeIndex: 1 })
      expect(tabBar.getActiveTab()).toBe(1)
      tabBar.destroy()
    })
  })

  describe('标签切换 (AC: #5)', () => {
    it('应该能够设置活跃标签', () => {
      const onTabChange = vi.fn()
      const tabBar = createTabBar({ onTabChange })

      tabBar.setActiveTab(2)

      expect(tabBar.getActiveTab()).toBe(2)
      expect(onTabChange).toHaveBeenCalledWith(2)
      tabBar.destroy()
    })

    it('设置相同标签不应该触发回调', () => {
      const onTabChange = vi.fn()
      const tabBar = createTabBar({ activeIndex: 1, onTabChange })

      tabBar.setActiveTab(1)

      expect(onTabChange).not.toHaveBeenCalled()
      tabBar.destroy()
    })

    it('设置无效索引不应该改变状态', () => {
      const onTabChange = vi.fn()
      const tabBar = createTabBar({ onTabChange })

      tabBar.setActiveTab(-1)
      expect(tabBar.getActiveTab()).toBe(0)

      tabBar.setActiveTab(10)
      expect(tabBar.getActiveTab()).toBe(0)

      expect(onTabChange).not.toHaveBeenCalled()
      tabBar.destroy()
    })
  })

  describe('导航方法 (AC: #6)', () => {
    it('nextTab 应该切换到下一个标签', () => {
      const onTabChange = vi.fn()
      const tabBar = createTabBar({ onTabChange })

      tabBar.nextTab()

      expect(tabBar.getActiveTab()).toBe(1)
      expect(onTabChange).toHaveBeenCalledWith(1)
      tabBar.destroy()
    })

    it('在最后一个标签使用 nextTab 应该循环到第一个', () => {
      const onTabChange = vi.fn()
      const tabBar = createTabBar({ activeIndex: 2, onTabChange })

      tabBar.nextTab()

      expect(tabBar.getActiveTab()).toBe(0)
      tabBar.destroy()
    })

    it('prevTab 应该切换到上一个标签', () => {
      const onTabChange = vi.fn()
      const tabBar = createTabBar({ activeIndex: 1, onTabChange })

      tabBar.prevTab()

      expect(tabBar.getActiveTab()).toBe(0)
      expect(onTabChange).toHaveBeenCalledWith(0)
      tabBar.destroy()
    })

    it('在第一个标签使用 prevTab 应该循环到最后一个', () => {
      const onTabChange = vi.fn()
      const tabBar = createTabBar({ activeIndex: 0, onTabChange })

      tabBar.prevTab()

      expect(tabBar.getActiveTab()).toBe(2)
      tabBar.destroy()
    })
  })

  describe('尺寸配置', () => {
    it('应该使用默认尺寸', () => {
      const tabBar = createTabBar()
      expect(tabBar.children.length).toBe(3)
      tabBar.destroy()
    })

    it('应该接受自定义尺寸', () => {
      const tabBar = createTabBar({ width: 150, height: 50 })
      expect(tabBar.children.length).toBe(3)
      tabBar.destroy()
    })
  })

  describe('销毁', () => {
    it('应该正确销毁组件', () => {
      const tabBar = createTabBar()
      expect(() => tabBar.destroy()).not.toThrow()
    })
  })
})
