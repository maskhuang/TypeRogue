// ============================================
// 打字肉鸽 - KeystrokeSoundController 击键音效控制器
// ============================================
// Story 7.2: 击键音效 (AC: #1, #2, #3, #5, #6)

import { eventBus } from '../../core/events/EventBus'
import type { IAudioManager } from './AudioManager'

/**
 * 击键音效控制器配置
 */
export interface KeystrokeSoundConfig {
  /** 是否启用音高变化 */
  enablePitchVariation?: boolean
  /** 每多少连击提升一次音高 */
  pitchIncreasePerCombo?: number
  /** 最大音高增益 */
  maxPitchIncrease?: number
  /** 连击里程碑列表 */
  comboMilestones?: number[]
}

const DEFAULT_CONFIG: Required<KeystrokeSoundConfig> = {
  enablePitchVariation: false,
  pitchIncreasePerCombo: 10,
  maxPitchIncrease: 0.5,
  comboMilestones: [10, 25, 50, 100]
}

/**
 * KeystrokeSoundController - 击键音效控制器
 *
 * 监听打字事件并触发相应的音效。
 *
 * 职责:
 * - 监听 word:correct 事件播放正确击键音效 (AC: #1)
 * - 监听 word:error 事件播放错误击键音效 (AC: #2)
 * - 监听 word:complete 事件播放词语完成音效 (AC: #5)
 * - 监听 combo:update 事件播放连击里程碑音效 (AC: #6)
 * - 可选支持连击时音高变化 (AC: #4)
 */
export class KeystrokeSoundController {
  private audioManager: IAudioManager
  private config: Required<KeystrokeSoundConfig>
  private enabled = false
  private unsubscribers: (() => void)[] = []
  private lastMilestone = 0
  private currentPitch = 1.0

  constructor(audioManager: IAudioManager, config?: KeystrokeSoundConfig) {
    this.audioManager = audioManager
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * 启用控制器，开始监听事件
   */
  enable(): void {
    if (this.enabled) return
    this.enabled = true

    this.unsubscribers.push(
      eventBus.on('word:correct', this.onWordCorrect),
      eventBus.on('word:error', this.onWordError),
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
  }

  /**
   * 检查是否启用
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * 获取当前音高 (1.0 为基准)
   */
  getCurrentPitch(): number {
    return this.currentPitch
  }

  /**
   * 重置音高
   */
  resetPitch(): void {
    this.currentPitch = 1.0
  }

  /**
   * 销毁控制器
   */
  destroy(): void {
    this.disable()
    this.lastMilestone = 0
    this.resetPitch()
  }

  // ===========================================
  // 事件处理器
  // ===========================================

  /**
   * 处理正确击键事件
   */
  private onWordCorrect = (): void => {
    this.audioManager.playSfx('key_correct')
  }

  /**
   * 处理错误击键事件
   */
  private onWordError = (): void => {
    this.audioManager.playSfx('key_error')
  }

  /**
   * 处理词语完成事件
   */
  private onWordComplete = (): void => {
    this.audioManager.playSfx('word_complete')
  }

  /**
   * 处理连击更新事件
   */
  private onComboUpdate = (data: { combo: number }): void => {
    const { combo } = data

    // 检查是否达到新里程碑
    for (const milestone of this.config.comboMilestones) {
      if (combo >= milestone && this.lastMilestone < milestone) {
        this.audioManager.playSfx('combo_milestone')
        this.lastMilestone = milestone
        break
      }
    }

    // 连击断裂时重置
    if (combo === 0) {
      this.lastMilestone = 0
      this.resetPitch()
    }

    // 可选: 更新音高
    if (this.config.enablePitchVariation) {
      this.updatePitch(combo)
    }
  }

  /**
   * 根据连击更新音高
   */
  private updatePitch(combo: number): void {
    const pitchIncrease = Math.min(
      (combo / this.config.pitchIncreasePerCombo) * 0.1,
      this.config.maxPitchIncrease
    )
    this.currentPitch = 1.0 + pitchIncrease
  }
}
