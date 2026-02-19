// ============================================
// 打字肉鸽 - ShopScene 商店场景
// ============================================
// Story 5.3 Task 4: 商店场景实现

import { Graphics, Text, TextStyle, Container } from 'pixi.js'
import { BaseScene } from '../BaseScene'
import { ShopItemDisplay } from './ShopItemDisplay'
import type { ShopItem, ShopState, ShopData } from './ShopConfig'
import { eventBus } from '../../core/events/EventBus'

// ==================== 常量定义 ====================

/** 画布尺寸 */
const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600

/** 布局常量 */
const ITEM_SPACING_X = 220
const ITEM_SPACING_Y = 140
const ITEMS_CONTAINER_X = 100
const ITEMS_CONTAINER_Y = 100

/** 默认商店配置（当无法加载 shop.json 时使用） */
const DEFAULT_SHOP_CONFIG: ShopData = {
  skillSlots: 3,
  relicSlots: 1,
  priceMultiplierPerStage: 0.1,
  rarityWeights: {
    common: 0.6,
    rare: 0.3,
    legendary: 0.1
  }
}

/** 基础价格配置 */
const BASE_PRICES: Record<string, Record<string, number>> = {
  skill: { common: 30, rare: 50, legendary: 80 },
  relic: { common: 40, rare: 70, legendary: 120 }
}

// 临时技能数据（后续从 data/skills.ts 导入）
const TEMP_SKILLS: Record<string, { name: string; description: string; rarity: string }> = {
  'score_boost': { name: '分数提升', description: '每次击键额外获得 10 分', rarity: 'common' },
  'combo_shield': { name: '连击护盾', description: '每 10 连击获得一次错误保护', rarity: 'common' },
  'time_extend': { name: '时间延长', description: '每完成一个词延长 0.5 秒', rarity: 'rare' },
  'multiplier_aura': { name: '倍率光环', description: '相邻技能获得 1.2x 加成', rarity: 'rare' },
  'gold_magnet': { name: '金币磁铁', description: '战斗奖励金币 +20%', rarity: 'common' }
}

// 临时遗物数据
const TEMP_RELICS: Record<string, { name: string; description: string; rarity: string }> = {
  'lucky_coin': { name: '幸运硬币', description: '商店价格降低 10%', rarity: 'common' },
  'combo_crown': { name: '连击皇冠', description: '初始倍率 +0.2', rarity: 'rare' }
}

/**
 * RunState 接口（依赖注入）
 */
export interface IRunState {
  getGold(): number
  spendGold(amount: number): boolean
  addSkill(id: string): void
  addRelic(id: string): void
  getSkillLevel(id: string): number
  hasRelic(id: string): boolean
}

/**
 * 商店场景
 *
 * 职责:
 * - 生成商品列表（基于配置和稀有度权重）
 * - 处理购买逻辑
 * - 显示金币和商品
 * - 处理键盘输入
 */
export class ShopScene extends BaseScene {
  readonly name = 'shop'

  private shopState: ShopState
  private itemDisplays: ShopItemDisplay[] = []
  private selectedIndex = 0
  private goldText!: Text

  // 依赖注入
  private runState: IRunState
  private currentStage: number

  // 商店配置
  private shopConfig: ShopData

  constructor(
    runState: IRunState,
    currentStage: number,
    shopConfig?: ShopData
  ) {
    super()
    this.runState = runState
    this.currentStage = currentStage
    this.shopConfig = shopConfig || DEFAULT_SHOP_CONFIG
    this.shopState = { items: [], skipped: false }
  }

  onEnter(): void {
    super.onEnter()
    this.generateShopItems()
    this.createUI()
    this.updateSelection()
    this.addKeyboardListener()
  }

  onExit(): void {
    this.removeKeyboardListener()
    super.onExit()
  }

  /**
   * 生成商品列表
   * 使用稀有度权重进行加权随机选择
   */
  private generateShopItems(): void {
    const items: ShopItem[] = []

    // 计算技能数量：3-4 个（基于 skillSlots，如果是 3 则随机 3-4）
    const skillCount = this.shopConfig.skillSlots === 3
      ? (Math.random() < 0.5 ? 3 : 4)
      : this.shopConfig.skillSlots

    // 生成技能商品（使用稀有度权重）
    const selectedSkills = this.selectItemsByRarity(
      Object.keys(TEMP_SKILLS),
      TEMP_SKILLS,
      Math.min(skillCount, Object.keys(TEMP_SKILLS).length)
    )
    for (const id of selectedSkills) {
      const skill = TEMP_SKILLS[id]
      items.push({
        id,
        type: 'skill',
        basePrice: this.getBasePrice('skill', skill.rarity),
        purchased: false
      })
    }

    // 计算遗物数量：1-2 个（基于 relicSlots，如果是 1 则随机 1-2）
    const relicCount = this.shopConfig.relicSlots === 1
      ? (Math.random() < 0.5 ? 1 : 2)
      : this.shopConfig.relicSlots

    // 生成遗物商品（使用稀有度权重）
    const selectedRelics = this.selectItemsByRarity(
      Object.keys(TEMP_RELICS),
      TEMP_RELICS,
      Math.min(relicCount, Object.keys(TEMP_RELICS).length)
    )
    for (const id of selectedRelics) {
      const relic = TEMP_RELICS[id]
      items.push({
        id,
        type: 'relic',
        basePrice: this.getBasePrice('relic', relic.rarity),
        purchased: false
      })
    }

    this.shopState.items = items
  }

  /**
   * 基于稀有度权重选择物品
   * 权重为 0 的稀有度不会被选中
   */
  private selectItemsByRarity(
    ids: string[],
    data: Record<string, { rarity: string }>,
    count: number
  ): string[] {
    const weights = this.shopConfig.rarityWeights
    const selected: string[] = []

    // 过滤掉权重为 0 的物品
    const available = ids.filter(id => {
      const rarity = data[id].rarity as keyof typeof weights
      const weight = weights[rarity] ?? weights.common
      return weight > 0
    })

    while (selected.length < count && available.length > 0) {
      // 计算每个可用物品的权重
      const itemWeights = available.map(id => {
        const rarity = data[id].rarity as keyof typeof weights
        return weights[rarity] ?? weights.common
      })

      // 计算总权重
      const totalWeight = itemWeights.reduce((sum, w) => sum + w, 0)

      // 加权随机选择
      let random = Math.random() * totalWeight
      let selectedIndex = 0
      for (let i = 0; i < itemWeights.length; i++) {
        random -= itemWeights[i]
        if (random <= 0) {
          selectedIndex = i
          break
        }
      }

      // 添加选中项并从可用列表移除
      selected.push(available[selectedIndex])
      available.splice(selectedIndex, 1)
    }

    return selected
  }

  private getBasePrice(type: 'skill' | 'relic', rarity: string): number {
    return BASE_PRICES[type][rarity] || BASE_PRICES[type].common
  }

  /**
   * 计算实际价格（考虑关卡系数）
   */
  getActualPrice(item: ShopItem): number {
    const multiplier = 1 + (this.currentStage - 1) * this.shopConfig.priceMultiplierPerStage
    return Math.floor(item.basePrice * multiplier)
  }

  /**
   * 获取商店配置（用于测试）
   */
  getShopConfig(): ShopData {
    return this.shopConfig
  }

  /**
   * 创建 UI
   */
  private createUI(): void {
    // 背景
    const bg = new Graphics()
    bg.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    bg.fill(0x1a1a2e)
    this.container.addChild(bg)

    // 标题
    const titleStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 32,
      fill: '#ffffff',
      fontWeight: 'bold'
    })
    const title = new Text({ text: '商店', style: titleStyle })
    title.x = 350
    title.y = 30
    this.container.addChild(title)

    // 金币显示
    const goldStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 20,
      fill: '#ffe66d'
    })
    this.goldText = new Text({ text: `金币: ${this.runState.getGold()}`, style: goldStyle })
    this.goldText.x = 600
    this.goldText.y = 35
    this.container.addChild(this.goldText)

    // 商品显示
    const itemsContainer = new Container()
    itemsContainer.x = ITEMS_CONTAINER_X
    itemsContainer.y = ITEMS_CONTAINER_Y
    this.container.addChild(itemsContainer)

    for (let i = 0; i < this.shopState.items.length; i++) {
      const item = this.shopState.items[i]
      const display = new ShopItemDisplay()

      // 获取商品信息
      const info = item.type === 'skill' ? TEMP_SKILLS[item.id] : TEMP_RELICS[item.id]
      const actualPrice = this.getActualPrice(item)

      // 如果是已拥有技能，显示等级
      let name = info?.name || item.id
      if (item.type === 'skill') {
        const level = this.runState.getSkillLevel(item.id)
        if (level > 0) {
          name += ` (Lv${level} → Lv${Math.min(3, level + 1)})`
        }
      }

      display.setItem(item, name, info?.description || '', actualPrice)
      display.setAffordable(this.runState.getGold() >= actualPrice)

      // 布局：2行多列
      display.x = (i % 3) * ITEM_SPACING_X
      display.y = Math.floor(i / 3) * ITEM_SPACING_Y
      itemsContainer.addChild(display)
      this.itemDisplays.push(display)
    }

    // 操作说明（使用局部变量）
    const instructionStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 14,
      fill: '#888888'
    })
    const instructionText = new Text({
      text: '↑↓←→ 选择 | Enter 购买 | Space 跳过商店',
      style: instructionStyle
    })
    instructionText.x = 200
    instructionText.y = 550
    this.container.addChild(instructionText)
  }

  /**
   * 更新选中状态
   */
  private updateSelection(): void {
    for (let i = 0; i < this.itemDisplays.length; i++) {
      this.itemDisplays[i].setSelected(i === this.selectedIndex)
    }
  }

  /**
   * 购买当前选中商品
   */
  purchaseSelected(): boolean {
    const item = this.shopState.items[this.selectedIndex]
    if (!item || item.purchased) return false

    // 检查技能是否已满级
    if (item.type === 'skill') {
      const level = this.runState.getSkillLevel(item.id)
      if (level >= 3) return false
    }

    // 检查遗物是否已拥有
    if (item.type === 'relic') {
      if (this.runState.hasRelic(item.id)) return false
    }

    const price = this.getActualPrice(item)
    if (!this.runState.spendGold(price)) return false

    // 添加到库存
    if (item.type === 'skill') {
      this.runState.addSkill(item.id)
    } else {
      this.runState.addRelic(item.id)
    }

    // 标记已购买
    item.purchased = true
    const display = this.itemDisplays[this.selectedIndex]
    display.setItem(
      item,
      display.getNameText(),
      display.getDescText(),
      price
    )

    // 更新金币显示
    this.goldText.text = `金币: ${this.runState.getGold()}`

    // 更新所有商品的可购买状态
    for (let i = 0; i < this.itemDisplays.length; i++) {
      const otherItem = this.shopState.items[i]
      const otherPrice = this.getActualPrice(otherItem)
      this.itemDisplays[i].setAffordable(this.runState.getGold() >= otherPrice)
    }

    eventBus.emit('shop:purchase', { itemId: item.id, type: item.type, price })
    return true
  }

  /**
   * 跳过商店
   */
  skipShop(): void {
    this.shopState.skipped = true
    eventBus.emit('shop:skip', {})
    // 场景切换由外部控制器处理
  }

  /**
   * 获取商店状态（用于测试）
   */
  getShopState(): ShopState {
    return this.shopState
  }

  /**
   * 获取当前选中索引（用于测试）
   */
  getSelectedIndex(): number {
    return this.selectedIndex
  }

  /**
   * 设置选中索引（用于测试）
   */
  setSelectedIndex(index: number): void {
    if (index >= 0 && index < this.shopState.items.length) {
      this.selectedIndex = index
      this.updateSelection()
    }
  }

  // ==================== 键盘输入 ====================

  /**
   * 处理按键（用于测试或程序化调用）
   */
  handleKeyInput(key: string): void {
    this.keyHandler({ key } as KeyboardEvent)
  }

  private keyHandler = (e: KeyboardEvent): void => {
    // 计算每行列数（基于商品数量）
    const cols = Math.min(3, this.shopState.items.length)

    switch (e.key) {
      case 'ArrowUp':
        this.selectedIndex = Math.max(0, this.selectedIndex - cols)
        this.updateSelection()
        break
      case 'ArrowDown':
        this.selectedIndex = Math.min(this.shopState.items.length - 1, this.selectedIndex + cols)
        this.updateSelection()
        break
      case 'ArrowLeft':
        this.selectedIndex = Math.max(0, this.selectedIndex - 1)
        this.updateSelection()
        break
      case 'ArrowRight':
        this.selectedIndex = Math.min(this.shopState.items.length - 1, this.selectedIndex + 1)
        this.updateSelection()
        break
      case 'Enter':
        this.purchaseSelected()
        break
      case ' ':
        this.skipShop()
        break
    }
  }

  private addKeyboardListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.keyHandler)
    }
  }

  private removeKeyboardListener(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.keyHandler)
    }
  }

  update(_dt: number): void {
    // 商店场景无需每帧更新
  }
}
