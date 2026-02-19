// ============================================
// 打字肉鸽 - ParticleController 粒子效果控制器
// ============================================
// Story 7.3: 粒子效果系统 (AC: #1, #3, #4)

import { eventBus } from '../../core/events/EventBus'
import type { ParticleManager } from './ParticleManager'
import type { ScorePopup } from './ScorePopup'

/**
 * 位置提供者类型
 */
type PositionProvider = (key?: string) => { x: number; y: number } | null

/**
 * 连击里程碑列表
 */
const COMBO_MILESTONES = [10, 25, 50, 100]

/**
 * 连击火焰阈值
 */
const COMBO_FLAME_THRESHOLD = 10

/**
 * 默认位置（屏幕中心偏上）
 */
const DEFAULT_POSITION = { x: 400, y: 300 }

/**
 * ParticleController - 粒子效果控制器
 *
 * 监听游戏事件并触发相应的粒子效果。
 *
 * 职责:
 * - 监听 skill:triggered 事件播放技能触发粒子 (AC: #1)
 * - 监听 word:complete 事件播放词语完成粒子和分数飘字 (AC: #2)
 * - 监听 combo:update 事件处理连击火焰和里程碑 (AC: #3, #4)
 */
export class ParticleController {
  private particleManager: ParticleManager
  private scorePopup: ScorePopup
  private enabled = false
  private unsubscribers: (() => void)[] = []
  private lastMilestone = 0
  private comboFlameActive = false

  // 位置提供者
  private keyPositionProvider: PositionProvider | null = null
  private wordPositionProvider: PositionProvider | null = null
  private comboPositionProvider: PositionProvider | null = null

  constructor(particleManager: ParticleManager, scorePopup: ScorePopup) {
    this.particleManager = particleManager
    this.scorePopup = scorePopup
  }

  /**
   * 启用控制器，开始监听事件
   */
  enable(): void {
    if (this.enabled) return
    this.enabled = true

    this.unsubscribers.push(
      eventBus.on('skill:triggered', this.onSkillTriggered),
      eventBus.on('word:complete', this.onWordComplete),
      eventBus.on('combo:update', this.onComboUpdate)
    )
  }

  /**
   * 禁用控制器，停止监听事件
   */
  disable(): void {
    if (!this.enabled) return
    this.enabled = false

    // 调用所有取消订阅函数
    this.unsubscribers.forEach(unsub => unsub())
    this.unsubscribers = []

    // 停止火焰效果
    if (this.comboFlameActive) {
      this.particleManager.stopComboFlame()
      this.comboFlameActive = false
    }
  }

  /**
   * 检查是否启用
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * 设置键位位置提供者
   */
  setKeyPositionProvider(provider: PositionProvider): void {
    this.keyPositionProvider = provider
  }

  /**
   * 设置词语位置提供者
   */
  setWordPositionProvider(provider: PositionProvider): void {
    this.wordPositionProvider = provider
  }

  /**
   * 设置连击位置提供者
   */
  setComboPositionProvider(provider: PositionProvider): void {
    this.comboPositionProvider = provider
  }

  // ===========================================
  // 事件处理器
  // ===========================================

  /**
   * 处理技能触发事件
   */
  private onSkillTriggered = (data: { key: string; skillId: string; type: 'passive' | 'active' }): void => {
    const position = this.keyPositionProvider
      ? this.keyPositionProvider(data.key)
      : DEFAULT_POSITION

    if (position) {
      this.particleManager.playSkillTrigger(data.skillId, position.x, position.y)
    }
  }

  /**
   * 处理词语完成事件
   */
  private onWordComplete = (data: { word: string; score: number; perfect?: boolean }): void => {
    const position = this.wordPositionProvider
      ? this.wordPositionProvider()
      : DEFAULT_POSITION

    if (position) {
      this.particleManager.play('word_complete', position.x, position.y)
      this.scorePopup.show(data.score, position.x, position.y - 30)
    }
  }

  /**
   * 处理连击更新事件
   */
  private onComboUpdate = (data: { combo: number }): void => {
    const { combo } = data

    // 获取连击显示位置
    const position = this.comboPositionProvider
      ? this.comboPositionProvider()
      : DEFAULT_POSITION

    // 检查是否达到新里程碑
    for (const milestone of COMBO_MILESTONES) {
      if (combo >= milestone && this.lastMilestone < milestone) {
        if (position) {
          this.particleManager.playComboMilestone(milestone, position.x, position.y)
        }
        this.lastMilestone = milestone
        break
      }
    }

    // 连击火焰效果
    if (combo >= COMBO_FLAME_THRESHOLD) {
      if (!this.comboFlameActive && position) {
        this.particleManager.playComboFlame(combo, position.x, position.y)
        this.comboFlameActive = true
      } else if (this.comboFlameActive && position) {
        // 更新火焰位置和强度
        this.particleManager.playComboFlame(combo, position.x, position.y)
      }
    } else if (this.comboFlameActive) {
      this.particleManager.stopComboFlame()
      this.comboFlameActive = false
    }

    // 连击断裂时重置
    if (combo === 0) {
      this.lastMilestone = 0
      if (this.comboFlameActive) {
        this.particleManager.stopComboFlame()
        this.comboFlameActive = false
      }
    }
  }

  /**
   * 销毁控制器
   */
  destroy(): void {
    this.disable()
    this.lastMilestone = 0
  }
}
