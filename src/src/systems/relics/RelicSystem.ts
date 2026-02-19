// ============================================
// 打字肉鸽 - RelicSystem 遗物系统
// ============================================
// Story 5.4 Task 4: 遗物系统实现

import type { RelicData, RelicModifiers, RelicEffectType } from './RelicTypes'
import { RelicEffects, type BattleContext, createDefaultContext } from './RelicEffects'
import { createDefaultModifiers } from './RelicTypes'
import { getRelicData, getAllRelics, getRelicsByRarity, RELICS } from '../../data/relics'
import { eventBus } from '../../core/events/EventBus'

/**
 * 遗物系统配置
 */
export interface RelicSystemConfig {
  /** 是否自动设置事件监听 */
  autoSetupListeners?: boolean
}

/**
 * 遗物系统
 *
 * 职责:
 * - 管理遗物效果的计算和应用
 * - 响应游戏事件触发遗物效果
 * - 提供遗物效果查询接口
 */
export class RelicSystem {
  /** 遗物获取回调（连接 RunState） */
  private getOwnedRelicIds: () => readonly string[]

  /** 缓存的被动修改器 */
  private cachedModifiers: RelicModifiers | null = null

  /** 当前战斗上下文 */
  private battleContext: BattleContext

  /** 事件取消订阅函数列表 */
  private unsubscribers: Array<() => void> = []

  constructor(
    getOwnedRelicIds: () => readonly string[],
    config: RelicSystemConfig = {}
  ) {
    this.getOwnedRelicIds = getOwnedRelicIds
    this.battleContext = createDefaultContext()

    if (config.autoSetupListeners !== false) {
      this.setupEventListeners()
    }
  }

  /**
   * 设置事件监听
   */
  setupEventListeners(): void {
    // 先清理旧的监听器
    this.removeEventListeners()

    // 战斗开始
    this.unsubscribers.push(
      eventBus.on('battle:start', () => {
        this.resetBattleContext()
        const modifiers = this.calculateModifiers('battle_start')
        eventBus.emit('relic:effect', {
          trigger: 'battle_start',
          modifiers
        })
      })
    )

    // 词语完成
    this.unsubscribers.push(
      eventBus.on('word:complete', (data) => {
        this.battleContext.score = data.score || this.battleContext.score
        const modifiers = this.calculateModifiers('on_word_complete')
        eventBus.emit('relic:effect', {
          trigger: 'on_word_complete',
          modifiers
        })
      })
    )

    // 连击更新
    this.unsubscribers.push(
      eventBus.on('combo:update', (data) => {
        this.battleContext.combo = data.combo
        this.invalidateCache()
      })
    )

    // 打错
    this.unsubscribers.push(
      eventBus.on('word:error', () => {
        this.battleContext.hasError = true
        const modifiers = this.calculateModifiers('on_error')

        // 检查连击保护
        if (RelicEffects.rollComboProtection(modifiers.comboProtectionChance)) {
          eventBus.emit('relic:combo_protected', {})
        }

        eventBus.emit('relic:effect', {
          trigger: 'on_error',
          modifiers
        })
      })
    )

    // 战斗结束
    this.unsubscribers.push(
      eventBus.on('battle:end', (data) => {
        this.battleContext.score = data.score
        const modifiers = this.calculateModifiers('battle_end')
        eventBus.emit('relic:effect', {
          trigger: 'battle_end',
          modifiers
        })
      })
    )
  }

  /**
   * 移除所有事件监听
   */
  removeEventListeners(): void {
    for (const unsub of this.unsubscribers) {
      unsub()
    }
    this.unsubscribers = []
  }

  /**
   * 重置战斗上下文
   */
  resetBattleContext(): void {
    this.battleContext = createDefaultContext()
    this.invalidateCache()
  }

  /**
   * 使缓存失效
   */
  invalidateCache(): void {
    this.cachedModifiers = null
  }

  /**
   * 获取拥有的遗物数据
   */
  getOwnedRelics(): RelicData[] {
    const ids = this.getOwnedRelicIds()
    const relics: RelicData[] = []
    for (const id of ids) {
      const data = getRelicData(id)
      if (data) {
        relics.push(data)
      }
    }
    return relics
  }

  /**
   * 获取拥有的遗物ID列表
   */
  getOwnedRelicIdList(): readonly string[] {
    return this.getOwnedRelicIds()
  }

  /**
   * 计算指定触发类型的修改器
   */
  calculateModifiers(triggerType: RelicEffectType): RelicModifiers {
    const relics = this.getOwnedRelics()
    return RelicEffects.calculate(relics, triggerType, this.battleContext)
  }

  /**
   * 获取当前被动修改器（缓存）
   */
  getPassiveModifiers(): RelicModifiers {
    if (!this.cachedModifiers) {
      this.cachedModifiers = this.calculateModifiers('passive')
    }
    return this.cachedModifiers
  }

  /**
   * 获取战斗开始时间加成
   */
  getTimeBonus(): number {
    const battleStart = this.calculateModifiers('battle_start')
    return battleStart.timeBonus
  }

  /**
   * 获取词语完成时间加成
   */
  getWordCompleteTimeBonus(): number {
    const onWordComplete = this.calculateModifiers('on_word_complete')
    return onWordComplete.timeBonus
  }

  /**
   * 获取分数倍率加成
   */
  getScoreMultiplier(): number {
    const passive = this.getPassiveModifiers()
    return passive.scoreMultiplier
  }

  /**
   * 获取金币倍率（战斗结束时）
   */
  getGoldMultiplier(): number {
    const battleEnd = this.calculateModifiers('battle_end')
    return battleEnd.goldMultiplier
  }

  /**
   * 获取商店折扣
   */
  getPriceDiscount(): number {
    const passive = this.getPassiveModifiers()
    return passive.priceDiscount
  }

  /**
   * 获取技能效果加成
   */
  getSkillEffectBonus(): number {
    const passive = this.getPassiveModifiers()
    return passive.skillEffectBonus
  }

  /**
   * 获取连击保护概率
   */
  getComboProtectionChance(): number {
    const onError = this.calculateModifiers('on_error')
    return onError.comboProtectionChance
  }

  /**
   * 获取词语基础分加成
   */
  getWordScoreBonus(): number {
    const passive = this.getPassiveModifiers()
    return passive.wordScoreBonus
  }

  /**
   * 获取连击倍率加成
   * @param combo 当前连击数
   */
  getMultiplierFromCombo(combo: number): number {
    const passive = this.getPassiveModifiers()
    return combo * passive.multiplierPerCombo
  }

  /**
   * 获取战斗开始时的固定金币加成
   */
  getGoldFlat(): number {
    const battleStart = this.calculateModifiers('battle_start')
    return battleStart.goldFlat
  }

  /**
   * 更新战斗上下文
   */
  updateContext(partial: Partial<BattleContext>): void {
    Object.assign(this.battleContext, partial)
    this.invalidateCache()
  }

  /**
   * 获取当前战斗上下文（返回浅拷贝以防止外部修改）
   */
  getContext(): Readonly<BattleContext> {
    return { ...this.battleContext }
  }

  /**
   * 获取遗物详情（用于 UI）
   */
  getRelicDetails(relicId: string): RelicData | undefined {
    return getRelicData(relicId)
  }

  /**
   * 检查是否拥有指定遗物
   */
  hasRelic(relicId: string): boolean {
    return this.getOwnedRelicIds().includes(relicId)
  }

  /**
   * 获取遗物数量
   */
  getRelicCount(): number {
    return this.getOwnedRelicIds().length
  }

  /**
   * 销毁系统，清理资源
   */
  destroy(): void {
    this.removeEventListeners()
    this.cachedModifiers = null
  }

  // ==================== 静态方法 ====================

  /**
   * 获取所有可用遗物（用于商店生成）
   */
  static getAllRelics(): RelicData[] {
    return getAllRelics()
  }

  /**
   * 按稀有度获取遗物
   */
  static getRelicsByRarity(rarity: 'common' | 'rare' | 'legendary'): RelicData[] {
    return getRelicsByRarity(rarity)
  }

  /**
   * 获取遗物数据
   */
  static getRelicData(relicId: string): RelicData | undefined {
    return getRelicData(relicId)
  }

  /**
   * 获取所有遗物数据映射
   */
  static getRelicsMap(): Record<string, RelicData> {
    return RELICS
  }
}
