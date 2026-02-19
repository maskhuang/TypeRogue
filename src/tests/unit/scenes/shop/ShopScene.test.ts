// ============================================
// 打字肉鸽 - ShopScene 单元测试
// ============================================
// Story 5.3 Task 6: 商店场景测试

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ShopScene, IRunState } from '../../../../src/scenes/shop/ShopScene'
import { eventBus } from '../../../../src/core/events/EventBus'
import type { ShopData } from '../../../../src/scenes/shop/ShopConfig'

/**
 * Mock RunState 实现
 */
function createMockRunState(initialGold = 100): IRunState & {
  gold: number
  skills: Map<string, number>
  relics: Set<string>
} {
  const skills = new Map<string, number>()
  const relics = new Set<string>()
  let gold = initialGold

  return {
    gold,
    skills,
    relics,
    getGold() {
      return gold
    },
    spendGold(amount: number) {
      if (gold >= amount) {
        gold -= amount
        this.gold = gold
        return true
      }
      return false
    },
    addSkill(id: string) {
      const level = skills.get(id) || 0
      skills.set(id, Math.min(3, level + 1))
    },
    addRelic(id: string) {
      relics.add(id)
    },
    getSkillLevel(id: string) {
      return skills.get(id) || 0
    },
    hasRelic(id: string) {
      return relics.has(id)
    }
  }
}

/**
 * 固定数量的商店配置（用于确定性测试）
 */
const FIXED_SHOP_CONFIG: ShopData = {
  skillSlots: 3,
  relicSlots: 1,
  priceMultiplierPerStage: 0.1,
  rarityWeights: {
    common: 1.0,  // 只生成普通物品以确保测试稳定
    rare: 0,
    legendary: 0
  }
}

describe('ShopScene', () => {
  let runState: ReturnType<typeof createMockRunState>
  let scene: ShopScene

  beforeEach(() => {
    runState = createMockRunState(100)
    scene = new ShopScene(runState, 1, FIXED_SHOP_CONFIG)
    // 清除 eventBus 监听器
    eventBus.clear()
  })

  // ==================== 初始化测试 ====================

  describe('initialization', () => {
    it('should have name "shop"', () => {
      expect(scene.name).toBe('shop')
    })

    it('should initialize with empty shop state', () => {
      const state = scene.getShopState()
      expect(state.items).toHaveLength(0)
      expect(state.skipped).toBe(false)
    })

    it('should have container after construction', () => {
      expect(scene.container).toBeDefined()
    })

    it('should use provided shop config', () => {
      const config = scene.getShopConfig()
      expect(config.skillSlots).toBe(3)
      expect(config.relicSlots).toBe(1)
    })
  })

  // ==================== onEnter 测试 ====================

  describe('onEnter', () => {
    it('should generate shop items', () => {
      scene.onEnter()
      const state = scene.getShopState()
      expect(state.items.length).toBeGreaterThanOrEqual(2) // 至少 1 技能 + 1 遗物
    })

    it('should generate skill items based on config', () => {
      scene.onEnter()
      const state = scene.getShopState()
      const skills = state.items.filter(item => item.type === 'skill')
      // 使用固定配置应生成 3 个技能（随机可能是 3-4）
      expect(skills.length).toBeGreaterThanOrEqual(3)
      expect(skills.length).toBeLessThanOrEqual(4)
    })

    it('should generate relic items based on config', () => {
      scene.onEnter()
      const state = scene.getShopState()
      const relics = state.items.filter(item => item.type === 'relic')
      // 使用固定配置应生成 1-2 个遗物
      expect(relics.length).toBeGreaterThanOrEqual(1)
      expect(relics.length).toBeLessThanOrEqual(2)
    })

    it('should create UI components', () => {
      scene.onEnter()
      // 检查容器有子元素（背景、标题、金币等）
      expect(scene.container.children.length).toBeGreaterThan(0)
    })

    it('should set initial selection to 0', () => {
      scene.onEnter()
      expect(scene.getSelectedIndex()).toBe(0)
    })
  })

  // ==================== onExit 测试 ====================

  describe('onExit', () => {
    it('should not throw on exit', () => {
      scene.onEnter()
      expect(() => scene.onExit()).not.toThrow()
    })
  })

  // ==================== 商品生成测试 ====================

  describe('item generation', () => {
    it('should generate unique skill items', () => {
      scene.onEnter()
      const state = scene.getShopState()
      const skillIds = state.items
        .filter(item => item.type === 'skill')
        .map(item => item.id)
      const uniqueIds = new Set(skillIds)
      expect(uniqueIds.size).toBe(skillIds.length)
    })

    it('should set all items as not purchased initially', () => {
      scene.onEnter()
      const state = scene.getShopState()
      expect(state.items.every(item => !item.purchased)).toBe(true)
    })

    it('should assign base prices to items', () => {
      scene.onEnter()
      const state = scene.getShopState()
      expect(state.items.every(item => item.basePrice > 0)).toBe(true)
    })

    it('should respect rarity weights in item selection', () => {
      // 使用只有 common 权重的配置
      const commonOnlyConfig: ShopData = {
        skillSlots: 3,
        relicSlots: 1,
        priceMultiplierPerStage: 0.1,
        rarityWeights: { common: 1.0, rare: 0, legendary: 0 }
      }
      const testScene = new ShopScene(runState, 1, commonOnlyConfig)
      testScene.onEnter()

      const state = testScene.getShopState()
      // 所有物品应该是 common 价格（技能 30，遗物 40）
      const skills = state.items.filter(i => i.type === 'skill')
      const relics = state.items.filter(i => i.type === 'relic')

      expect(skills.every(s => s.basePrice === 30)).toBe(true)
      expect(relics.every(r => r.basePrice === 40)).toBe(true)
    })
  })

  // ==================== 价格计算测试 ====================

  describe('price calculation', () => {
    it('should return base price for stage 1', () => {
      scene.onEnter()
      const state = scene.getShopState()
      const item = state.items[0]
      const actualPrice = scene.getActualPrice(item)
      expect(actualPrice).toBe(item.basePrice)
    })

    it('should apply 1.1x multiplier for stage 2', () => {
      const scene2 = new ShopScene(runState, 2, FIXED_SHOP_CONFIG)
      scene2.onEnter()
      const state = scene2.getShopState()
      const item = state.items[0]
      const actualPrice = scene2.getActualPrice(item)
      expect(actualPrice).toBe(Math.floor(item.basePrice * 1.1))
    })

    it('should apply 1.4x multiplier for stage 5', () => {
      const scene5 = new ShopScene(runState, 5, FIXED_SHOP_CONFIG)
      scene5.onEnter()
      const state = scene5.getShopState()
      const item = state.items[0]
      const actualPrice = scene5.getActualPrice(item)
      expect(actualPrice).toBe(Math.floor(item.basePrice * 1.4))
    })

    it('should apply 1.7x multiplier for stage 8', () => {
      const scene8 = new ShopScene(runState, 8, FIXED_SHOP_CONFIG)
      scene8.onEnter()
      const state = scene8.getShopState()
      const item = state.items[0]
      const actualPrice = scene8.getActualPrice(item)
      expect(actualPrice).toBe(Math.floor(item.basePrice * 1.7))
    })

    it('should use config priceMultiplierPerStage', () => {
      const customConfig: ShopData = {
        ...FIXED_SHOP_CONFIG,
        priceMultiplierPerStage: 0.2  // 20% 增长
      }
      const customScene = new ShopScene(runState, 2, customConfig)
      customScene.onEnter()
      const state = customScene.getShopState()
      const item = state.items[0]
      const actualPrice = customScene.getActualPrice(item)
      // stage 2 with 0.2 multiplier = 1 + (2-1) * 0.2 = 1.2x
      expect(actualPrice).toBe(Math.floor(item.basePrice * 1.2))
    })
  })

  // ==================== 购买测试 ====================

  describe('purchase', () => {
    it('should purchase successfully when gold is sufficient', () => {
      runState = createMockRunState(200)
      scene = new ShopScene(runState, 1, FIXED_SHOP_CONFIG)
      scene.onEnter()

      const result = scene.purchaseSelected()
      expect(result).toBe(true)
    })

    it('should deduct gold after purchase', () => {
      runState = createMockRunState(200)
      scene = new ShopScene(runState, 1, FIXED_SHOP_CONFIG)
      scene.onEnter()

      const state = scene.getShopState()
      const item = state.items[0]
      const price = scene.getActualPrice(item)
      const goldBefore = runState.getGold()

      scene.purchaseSelected()
      expect(runState.getGold()).toBe(goldBefore - price)
    })

    it('should add skill to inventory after purchase', () => {
      runState = createMockRunState(200)
      scene = new ShopScene(runState, 1, FIXED_SHOP_CONFIG)
      scene.onEnter()

      const state = scene.getShopState()
      const skillItem = state.items.find(i => i.type === 'skill')!

      // 选中技能商品
      const skillIndex = state.items.indexOf(skillItem)
      scene.setSelectedIndex(skillIndex)
      scene.purchaseSelected()

      expect(runState.getSkillLevel(skillItem.id)).toBe(1)
    })

    it('should add relic to inventory after purchase', () => {
      runState = createMockRunState(200)
      scene = new ShopScene(runState, 1, FIXED_SHOP_CONFIG)
      scene.onEnter()

      const state = scene.getShopState()
      const relicItem = state.items.find(i => i.type === 'relic')!

      // 选中遗物商品
      const relicIndex = state.items.indexOf(relicItem)
      scene.setSelectedIndex(relicIndex)
      scene.purchaseSelected()

      expect(runState.hasRelic(relicItem.id)).toBe(true)
    })

    it('should mark item as purchased', () => {
      runState = createMockRunState(200)
      scene = new ShopScene(runState, 1, FIXED_SHOP_CONFIG)
      scene.onEnter()

      scene.purchaseSelected()
      const state = scene.getShopState()
      expect(state.items[0].purchased).toBe(true)
    })

    it('should fail purchase when gold is insufficient', () => {
      runState = createMockRunState(1) // 只有 1 金币
      scene = new ShopScene(runState, 1, FIXED_SHOP_CONFIG)
      scene.onEnter()

      const result = scene.purchaseSelected()
      expect(result).toBe(false)
    })

    it('should not deduct gold when purchase fails', () => {
      runState = createMockRunState(1)
      scene = new ShopScene(runState, 1, FIXED_SHOP_CONFIG)
      scene.onEnter()

      scene.purchaseSelected()
      expect(runState.getGold()).toBe(1)
    })

    it('should not allow repurchasing already purchased item', () => {
      runState = createMockRunState(500)
      scene = new ShopScene(runState, 1, FIXED_SHOP_CONFIG)
      scene.onEnter()

      // 第一次购买
      scene.purchaseSelected()
      const goldAfterFirst = runState.getGold()

      // 尝试再次购买同一商品
      const result = scene.purchaseSelected()
      expect(result).toBe(false)
      expect(runState.getGold()).toBe(goldAfterFirst)
    })

    it('should upgrade skill when already owned', () => {
      // 预先拥有一个技能
      runState = createMockRunState(200)
      scene = new ShopScene(runState, 1, FIXED_SHOP_CONFIG)
      scene.onEnter()

      // 购买技能
      const state = scene.getShopState()
      const skillItem = state.items.find(i => i.type === 'skill')!
      const skillIndex = state.items.indexOf(skillItem)
      scene.setSelectedIndex(skillIndex)
      scene.purchaseSelected()
      expect(runState.getSkillLevel(skillItem.id)).toBe(1)

      // 创建新商店，手动设置相同技能
      runState.gold = 200
      const scene2 = new ShopScene(runState, 1, FIXED_SHOP_CONFIG)
      scene2.onEnter()
      const state2 = scene2.getShopState()
      // 强制设置第一个商品为之前购买的技能
      state2.items[0] = {
        id: skillItem.id,
        type: 'skill',
        basePrice: 30,
        purchased: false
      }
      scene2.setSelectedIndex(0)
      scene2.purchaseSelected()
      expect(runState.getSkillLevel(skillItem.id)).toBe(2)
    })

    it('should not allow skill purchase if already max level', () => {
      runState = createMockRunState(500)
      // 预设技能已满级
      runState.skills.set('score_boost', 3)
      scene = new ShopScene(runState, 1, FIXED_SHOP_CONFIG)
      scene.onEnter()

      // 强制设置第一个商品为满级技能
      const state = scene.getShopState()
      state.items[0] = {
        id: 'score_boost',
        type: 'skill',
        basePrice: 30,
        purchased: false
      }
      scene.setSelectedIndex(0)

      const result = scene.purchaseSelected()
      expect(result).toBe(false)
    })

    it('should not allow relic purchase if already owned', () => {
      runState = createMockRunState(500)
      runState.relics.add('lucky_coin')
      scene = new ShopScene(runState, 1, FIXED_SHOP_CONFIG)
      scene.onEnter()

      // 强制设置遗物商品为已拥有
      const state = scene.getShopState()
      const relicIndex = state.items.findIndex(i => i.type === 'relic')
      state.items[relicIndex] = {
        id: 'lucky_coin',
        type: 'relic',
        basePrice: 40,
        purchased: false
      }
      scene.setSelectedIndex(relicIndex)

      const result = scene.purchaseSelected()
      expect(result).toBe(false)
    })

    it('should emit shop:purchase event on successful purchase', () => {
      runState = createMockRunState(200)
      scene = new ShopScene(runState, 1, FIXED_SHOP_CONFIG)
      scene.onEnter()

      const handler = vi.fn()
      eventBus.on('shop:purchase', handler)

      scene.purchaseSelected()
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        itemId: expect.any(String),
        type: expect.any(String),
        price: expect.any(Number)
      }))
    })
  })

  // ==================== 跳过商店测试 ====================

  describe('skip shop', () => {
    it('should set skipped flag to true', () => {
      scene.onEnter()
      scene.skipShop()
      expect(scene.getShopState().skipped).toBe(true)
    })

    it('should emit shop:skip event', () => {
      scene.onEnter()
      const handler = vi.fn()
      eventBus.on('shop:skip', handler)

      scene.skipShop()
      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  // ==================== 选中状态测试 ====================

  describe('selection', () => {
    beforeEach(() => {
      scene.onEnter()
    })

    it('should start with index 0 selected', () => {
      expect(scene.getSelectedIndex()).toBe(0)
    })

    it('should update selection when setSelectedIndex is called', () => {
      scene.setSelectedIndex(2)
      expect(scene.getSelectedIndex()).toBe(2)
    })

    it('should not allow negative index', () => {
      scene.setSelectedIndex(-1)
      expect(scene.getSelectedIndex()).toBe(0)
    })

    it('should not allow index beyond items length', () => {
      const itemCount = scene.getShopState().items.length
      scene.setSelectedIndex(itemCount + 1)
      expect(scene.getSelectedIndex()).toBe(0)
    })
  })

  // ==================== 键盘输入测试 ====================

  describe('keyboard navigation', () => {
    beforeEach(() => {
      scene.onEnter()
    })

    it('should move selection right on ArrowRight', () => {
      scene.handleKeyInput('ArrowRight')
      expect(scene.getSelectedIndex()).toBe(1)
    })

    it('should move selection left on ArrowLeft', () => {
      scene.setSelectedIndex(1)
      scene.handleKeyInput('ArrowLeft')
      expect(scene.getSelectedIndex()).toBe(0)
    })

    it('should move selection down on ArrowDown', () => {
      scene.handleKeyInput('ArrowDown')
      // 使用 3 列布局，向下应该移动 3 个索引（或到末尾）
      const expectedIndex = Math.min(3, scene.getShopState().items.length - 1)
      expect(scene.getSelectedIndex()).toBe(expectedIndex)
    })

    it('should move selection up on ArrowUp', () => {
      scene.setSelectedIndex(3)
      scene.handleKeyInput('ArrowUp')
      expect(scene.getSelectedIndex()).toBe(0)
    })

    it('should not go below 0 on ArrowLeft at start', () => {
      scene.handleKeyInput('ArrowLeft')
      expect(scene.getSelectedIndex()).toBe(0)
    })

    it('should not exceed max index on ArrowRight at end', () => {
      const maxIndex = scene.getShopState().items.length - 1
      scene.setSelectedIndex(maxIndex)
      scene.handleKeyInput('ArrowRight')
      expect(scene.getSelectedIndex()).toBe(maxIndex)
    })

    it('should purchase on Enter key', () => {
      runState = createMockRunState(200)
      scene = new ShopScene(runState, 1, FIXED_SHOP_CONFIG)
      scene.onEnter()

      const goldBefore = runState.getGold()
      scene.handleKeyInput('Enter')

      // 金币应该减少了
      expect(runState.getGold()).toBeLessThan(goldBefore)
    })

    it('should skip shop on Space key', () => {
      const handler = vi.fn()
      eventBus.on('shop:skip', handler)

      scene.handleKeyInput(' ')
      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  // ==================== 配置测试 ====================

  describe('shop configuration', () => {
    it('should use default config when none provided', () => {
      const defaultScene = new ShopScene(runState, 1)
      const config = defaultScene.getShopConfig()
      expect(config.skillSlots).toBe(3)
      expect(config.relicSlots).toBe(1)
      expect(config.priceMultiplierPerStage).toBe(0.1)
    })

    it('should use custom config when provided', () => {
      const customConfig: ShopData = {
        skillSlots: 4,
        relicSlots: 2,
        priceMultiplierPerStage: 0.15,
        rarityWeights: { common: 0.5, rare: 0.4, legendary: 0.1 }
      }
      const customScene = new ShopScene(runState, 1, customConfig)
      const config = customScene.getShopConfig()
      expect(config.skillSlots).toBe(4)
      expect(config.relicSlots).toBe(2)
      expect(config.priceMultiplierPerStage).toBe(0.15)
    })
  })

  // ==================== update 测试 ====================

  describe('update', () => {
    it('should not throw on update call', () => {
      scene.onEnter()
      expect(() => scene.update(16)).not.toThrow()
    })
  })
})
