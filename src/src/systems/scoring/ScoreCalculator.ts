// ============================================
// 打字肉鸽 - 计分系统
// ============================================
// Story 1.4: 实现基础计分逻辑

import { eventBus } from '../../core/events/EventBus'
import { BALANCE } from '../../core/constants'

/**
 * 计分配置
 */
export interface ScoreConfig {
  /** 基础倍率 */
  baseMultiplier: number
  /** 连击加成系数 */
  comboBonus: number
  /** 字母额外加成 */
  letterBonus: number
  /** 词语完成加成 */
  wordBonus: number
}

/**
 * 默认计分配置
 */
export const DEFAULT_SCORE_CONFIG: ScoreConfig = {
  baseMultiplier: BALANCE.BASE_MULTIPLIER,
  comboBonus: BALANCE.COMBO_BONUS,
  letterBonus: 0,
  wordBonus: 0
}

/**
 * 计分结果
 */
export interface ScoreResult {
  /** 本次得分 */
  score: number
  /** 使用的倍率 */
  multiplier: number
  /** 当前连击 */
  combo: number
}

/**
 * 计分状态
 */
export interface ScoreState {
  /** 总分 */
  totalScore: number
  /** 当前词语累计分 */
  wordScore: number
  /** 当前倍率 */
  multiplier: number
  /** 当前连击 */
  combo: number
  /** 最大连击 */
  maxCombo: number
}

/**
 * 计分器
 *
 * 职责:
 * - 计算字母分数
 * - 计算词语分数
 * - 管理倍率和连击
 * - 发出分数更新事件
 */
class ScoreCalculator {
  private config: ScoreConfig
  private state: ScoreState
  private enabled = false
  private unsubscribes: (() => void)[] = []

  constructor(config: Partial<ScoreConfig> = {}) {
    this.config = { ...DEFAULT_SCORE_CONFIG, ...config }
    this.state = this.createInitialState()
  }

  /**
   * 创建初始状态
   */
  private createInitialState(): ScoreState {
    return {
      totalScore: 0,
      wordScore: 0,
      multiplier: this.config.baseMultiplier,
      combo: 0,
      maxCombo: 0
    }
  }

  /**
   * 重置状态
   */
  reset(): void {
    this.state = this.createInitialState()
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ScoreConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 获取当前配置
   */
  getConfig(): ScoreConfig {
    return { ...this.config }
  }

  /**
   * 获取当前状态
   */
  getState(): ScoreState {
    return { ...this.state }
  }

  // ==================== 计算方法 ====================

  /**
   * 计算倍率
   */
  calculateMultiplier(combo: number, extraBonus = 0): number {
    const { baseMultiplier, comboBonus } = this.config
    return baseMultiplier + combo * comboBonus + extraBonus
  }

  /**
   * 计算单个字母的分数
   */
  calculateLetterScore(multiplier: number): number {
    const { letterBonus } = this.config
    return (1 + letterBonus) * multiplier
  }

  /**
   * 计算词语完成分数
   */
  calculateWordScore(wordLength: number, multiplier: number): number {
    const { letterBonus, wordBonus } = this.config
    let score = 0

    for (let i = 0; i < wordLength; i++) {
      score += (1 + letterBonus) * multiplier
    }

    return Math.floor(score + wordBonus)
  }

  // ==================== 状态更新方法 ====================

  /**
   * 处理正确输入
   */
  onCorrectInput(): ScoreResult {
    // 增加连击
    this.state.combo++
    this.state.maxCombo = Math.max(this.state.maxCombo, this.state.combo)

    // 计算新倍率
    this.state.multiplier = this.calculateMultiplier(this.state.combo)

    // 计算字母分
    const letterScore = this.calculateLetterScore(this.state.multiplier)
    this.state.wordScore += letterScore

    // 发送事件
    this.emitScoreUpdate()

    return {
      score: letterScore,
      multiplier: this.state.multiplier,
      combo: this.state.combo
    }
  }

  /**
   * 处理错误输入
   */
  onErrorInput(): void {
    // 重置连击
    this.state.combo = 0
    this.state.multiplier = this.config.baseMultiplier

    // 发送事件
    this.emitScoreUpdate()
  }

  /**
   * 处理词语完成
   */
  onWordComplete(): ScoreResult {
    const wordScore = Math.floor(this.state.wordScore)

    // 累加到总分
    this.state.totalScore += wordScore

    // 重置词语分数
    const result: ScoreResult = {
      score: wordScore,
      multiplier: this.state.multiplier,
      combo: this.state.combo
    }

    this.state.wordScore = 0

    // 发送事件
    this.emitScoreUpdate()

    return result
  }

  /**
   * 应用额外分数（技能、遗物等）
   */
  addScore(amount: number): void {
    this.state.wordScore += amount
    this.emitScoreUpdate()
  }

  /**
   * 应用额外倍率
   */
  addMultiplier(amount: number): void {
    this.state.multiplier += amount
    this.emitScoreUpdate()
  }

  /**
   * 设置连击（用于护盾等保护机制）
   */
  setCombo(combo: number): void {
    this.state.combo = combo
    this.state.multiplier = this.calculateMultiplier(combo)
    this.emitScoreUpdate()
  }

  // ==================== 事件处理 ====================

  /**
   * 发送分数更新事件
   */
  private emitScoreUpdate(): void {
    eventBus.emit('score:update', {
      score: this.state.totalScore,
      multiplier: this.state.multiplier,
      combo: this.state.combo
    })
  }

  /**
   * 启用自动事件处理
   */
  enable(): void {
    if (this.enabled) return
    this.enabled = true

    // 订阅事件
    this.unsubscribes.push(
      eventBus.on('word:correct', () => this.onCorrectInput()),
      eventBus.on('word:error', () => this.onErrorInput()),
      eventBus.on('word:complete', () => this.onWordComplete())
    )
  }

  /**
   * 禁用自动事件处理
   */
  disable(): void {
    if (!this.enabled) return
    this.enabled = false

    // 取消订阅
    this.unsubscribes.forEach(unsub => unsub())
    this.unsubscribes = []
  }

  /**
   * 检查是否启用
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.disable()
    this.reset()
  }
}

// 导出单例实例
export const scoreCalculator = new ScoreCalculator()

// 同时导出类以便测试
export { ScoreCalculator }
