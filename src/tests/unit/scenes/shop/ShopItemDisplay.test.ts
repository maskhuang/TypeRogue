// ============================================
// 打字肉鸽 - ShopItemDisplay 单元测试
// ============================================
// Story 5.3 Task 6: 商品显示组件测试

import { describe, it, expect, beforeEach } from 'vitest'
import { ShopItemDisplay } from '../../../../src/scenes/shop/ShopItemDisplay'
import type { ShopItem } from '../../../../src/scenes/shop/ShopConfig'

describe('ShopItemDisplay', () => {
  let display: ShopItemDisplay

  beforeEach(() => {
    display = new ShopItemDisplay()
  })

  // ==================== 初始化测试 ====================

  describe('initialization', () => {
    it('should create display with correct dimensions', () => {
      expect(display.displayWidth).toBe(200)
      expect(display.displayHeight).toBe(120)
    })

    it('should have null item initially', () => {
      expect(display.item).toBeNull()
    })

    it('should not be purchased initially', () => {
      expect(display.isPurchased).toBe(false)
    })

    it('should have children (background, texts)', () => {
      // background + nameText + priceText + descText = 4
      expect(display.children.length).toBe(4)
    })
  })

  // ==================== setItem 测试 ====================

  describe('setItem', () => {
    it('should set item data', () => {
      const item: ShopItem = {
        id: 'test_skill',
        type: 'skill',
        basePrice: 30,
        purchased: false
      }

      display.setItem(item, '测试技能', '测试描述', 30)
      expect(display.item).toBe(item)
    })

    it('should update name text', () => {
      const item: ShopItem = {
        id: 'test_skill',
        type: 'skill',
        basePrice: 30,
        purchased: false
      }

      display.setItem(item, '测试技能', '测试描述', 30)
      expect(display.getNameText()).toBe('测试技能')
    })

    it('should update description text', () => {
      const item: ShopItem = {
        id: 'test_skill',
        type: 'skill',
        basePrice: 30,
        purchased: false
      }

      display.setItem(item, '测试技能', '测试描述', 30)
      expect(display.getDescText()).toBe('测试描述')
    })

    it('should clear texts when item is null', () => {
      const item: ShopItem = {
        id: 'test_skill',
        type: 'skill',
        basePrice: 30,
        purchased: false
      }

      display.setItem(item, '测试技能', '测试描述', 30)
      display.setItem(null, '', '', 0)
      expect(display.getNameText()).toBe('')
      expect(display.getDescText()).toBe('')
    })
  })

  // ==================== isPurchased 测试 ====================

  describe('isPurchased', () => {
    it('should return false when item is not purchased', () => {
      const item: ShopItem = {
        id: 'test_skill',
        type: 'skill',
        basePrice: 30,
        purchased: false
      }

      display.setItem(item, '测试技能', '测试描述', 30)
      expect(display.isPurchased).toBe(false)
    })

    it('should return true when item is purchased', () => {
      const item: ShopItem = {
        id: 'test_skill',
        type: 'skill',
        basePrice: 30,
        purchased: true
      }

      display.setItem(item, '测试技能', '测试描述', 30)
      expect(display.isPurchased).toBe(true)
    })

    it('should return false when item is null', () => {
      expect(display.isPurchased).toBe(false)
    })
  })

  // ==================== 选中状态测试 ====================

  describe('setSelected', () => {
    it('should not throw when setting selected', () => {
      expect(() => display.setSelected(true)).not.toThrow()
    })

    it('should not throw when setting unselected', () => {
      display.setSelected(true)
      expect(() => display.setSelected(false)).not.toThrow()
    })
  })

  // ==================== 购买状态测试 ====================

  describe('setAffordable', () => {
    it('should not throw when setting affordable', () => {
      expect(() => display.setAffordable(true)).not.toThrow()
    })

    it('should not throw when setting unaffordable', () => {
      expect(() => display.setAffordable(false)).not.toThrow()
    })
  })

  // ==================== 视觉状态测试 ====================

  describe('visual states', () => {
    beforeEach(() => {
      const item: ShopItem = {
        id: 'test_skill',
        type: 'skill',
        basePrice: 30,
        purchased: false
      }
      display.setItem(item, '测试技能', '测试描述', 30)
    })

    it('should have full alpha when not purchased', () => {
      expect(display.alpha).toBe(1)
    })

    it('should have reduced alpha when purchased', () => {
      const item: ShopItem = {
        id: 'test_skill',
        type: 'skill',
        basePrice: 30,
        purchased: true
      }
      display.setItem(item, '测试技能', '测试描述', 30)
      expect(display.alpha).toBe(0.5)
    })
  })

  // ==================== Container 继承测试 ====================

  describe('Container inheritance', () => {
    it('should be a Container instance', () => {
      expect(display).toHaveProperty('addChild')
      expect(display).toHaveProperty('removeChild')
      expect(display).toHaveProperty('x')
      expect(display).toHaveProperty('y')
    })

    it('should allow setting position', () => {
      display.x = 100
      display.y = 200
      expect(display.x).toBe(100)
      expect(display.y).toBe(200)
    })
  })
})
