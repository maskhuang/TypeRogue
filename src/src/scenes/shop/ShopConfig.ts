// ============================================
// 打字肉鸽 - ShopConfig 商店配置类型
// ============================================
// Story 5.3 Task 1: 商店配置类型定义

/**
 * 商品类型
 */
export type ShopItemType = 'skill' | 'relic'

/**
 * 商品配置
 */
export interface ShopItem {
  /** 商品ID (技能ID 或 遗物ID) */
  id: string

  /** 商品类型 */
  type: ShopItemType

  /** 基础价格 */
  basePrice: number

  /** 是否已购买 */
  purchased: boolean
}

/**
 * 商店配置数据
 */
export interface ShopData {
  /** 技能商品数量 (3-4) */
  skillSlots: number

  /** 遗物商品数量 (1-2) */
  relicSlots: number

  /** 价格系数 (每关递增) */
  priceMultiplierPerStage: number

  /** 稀有度权重 */
  rarityWeights: {
    common: number
    rare: number
    legendary: number
  }
}

/**
 * 商店状态
 */
export interface ShopState {
  /** 当前商品列表 */
  items: ShopItem[]

  /** 是否已跳过 */
  skipped: boolean
}
