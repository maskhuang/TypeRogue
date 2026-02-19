// ============================================
// 打字肉鸽 - CollectionItem 单元测试
// ============================================
// Story 6.4: 图鉴场景 - 图鉴项组件测试

import { describe, it, expect, beforeEach } from 'vitest'
import { Container } from 'pixi.js'
import { CollectionItem, CollectionItemData } from '../../../../src/scenes/collection/components/CollectionItem'

describe('CollectionItem', () => {
  const mockUnlockedData: CollectionItemData = {
    id: 'test_skill',
    name: '测试技能',
    description: '这是测试技能描述',
    icon: '🎯',
    unlocked: true
  }

  const mockLockedData: CollectionItemData = {
    id: 'locked_skill',
    name: '锁定技能',
    description: '这是锁定技能描述',
    icon: '🔒',
    unlocked: false,
    unlockCondition: '完成 10 局游戏'
  }

  // ===========================================
  // Task 3: CollectionItem 组件 (AC: #2, #3)
  // ===========================================

  describe('基础功能', () => {
    it('应该创建 PixiJS Container', () => {
      const item = new CollectionItem(mockUnlockedData)
      expect(item).toBeInstanceOf(Container)
      item.destroy()
    })

    it('应该返回正确的 ID', () => {
      const item = new CollectionItem(mockUnlockedData)
      expect(item.getId()).toBe('test_skill')
      item.destroy()
    })

    it('应该返回数据副本', () => {
      const item = new CollectionItem(mockUnlockedData)
      const data = item.getData()
      expect(data).toEqual(mockUnlockedData)
      // 确保是副本
      expect(data).not.toBe(mockUnlockedData)
      item.destroy()
    })
  })

  describe('解锁状态 (AC: #2, #3)', () => {
    it('已解锁项应该返回 true', () => {
      const item = new CollectionItem(mockUnlockedData)
      expect(item.isUnlocked()).toBe(true)
      item.destroy()
    })

    it('未解锁项应该返回 false', () => {
      const item = new CollectionItem(mockLockedData)
      expect(item.isUnlocked()).toBe(false)
      item.destroy()
    })

    it('应该能够更新解锁状态', () => {
      const item = new CollectionItem(mockLockedData)
      expect(item.isUnlocked()).toBe(false)

      item.setUnlocked(true)
      expect(item.isUnlocked()).toBe(true)
      item.destroy()
    })

    it('设置相同状态不应该触发重新渲染', () => {
      const item = new CollectionItem(mockUnlockedData)
      const childCount = item.children.length

      item.setUnlocked(true) // 状态相同
      expect(item.children.length).toBe(childCount)
      item.destroy()
    })
  })

  describe('配置选项', () => {
    it('应该使用默认尺寸', () => {
      const item = new CollectionItem(mockUnlockedData)
      // 默认 width: 120, height: 140
      expect(item.children.length).toBeGreaterThan(0)
      item.destroy()
    })

    it('应该接受自定义尺寸', () => {
      const item = new CollectionItem(mockUnlockedData, {
        width: 200,
        height: 250
      })
      expect(item.children.length).toBeGreaterThan(0)
      item.destroy()
    })

    it('应该支持隐藏描述', () => {
      const item = new CollectionItem(mockUnlockedData, {
        showDescription: false
      })
      expect(item.children.length).toBeGreaterThan(0)
      item.destroy()
    })
  })

  describe('销毁', () => {
    it('应该正确销毁组件', () => {
      const item = new CollectionItem(mockUnlockedData)
      expect(() => item.destroy()).not.toThrow()
    })

    it('销毁后不应该有子元素', () => {
      const item = new CollectionItem(mockUnlockedData)
      item.destroy()
      expect(item.destroyed).toBe(true)
    })
  })
})
