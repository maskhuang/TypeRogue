// ============================================
// 打字肉鸽 - SkillFeedbackManager
// ============================================
// Story 7.4: 技能触发反馈 (AC: #1-#6)
// 技能反馈管理器 - 协调所有技能触发的视觉反馈

import * as PIXI from 'pixi.js'
import { eventBus } from '../../core/events/EventBus'
import type { KeyboardVisualizer } from '../keyboard/KeyboardVisualizer'
import type { ParticleManager } from './ParticleManager'
import type { AudioManager } from '../../systems/audio/AudioManager'
import { SkillIconPopup } from './SkillIconPopup'
import { EffectTextDisplay } from './EffectTextDisplay'
import { AdjacencyVisualizer } from './AdjacencyVisualizer'
import { EffectQueueDisplay, type QueuedEffect } from './EffectQueueDisplay'
import { adjacencyMap } from '../../systems/skills/passive/AdjacencyMap'
import { SKILLS } from '../../data/skills'

interface SkillTriggeredEvent {
  key: string
  skillId: string
  type: 'passive' | 'active'
  value?: number
  adjacentSkills?: string[]
}

interface EffectQueuedEvent {
  effect: QueuedEffect
  queueSize: number
}

interface EffectDequeuedEvent {
  effect: QueuedEffect
}

export class SkillFeedbackManager {
  private container: PIXI.Container
  private keyboardVisualizer: KeyboardVisualizer
  private particleManager: ParticleManager
  private _audioManager: AudioManager

  private skillIconPopup: SkillIconPopup
  private effectTextDisplay: EffectTextDisplay
  private adjacencyVisualizer: AdjacencyVisualizer
  private effectQueueDisplay: EffectQueueDisplay

  private enabled = false
  private unsubscribers: (() => void)[] = []

  constructor(
    parentContainer: PIXI.Container,
    keyboardVisualizer: KeyboardVisualizer,
    particleManager: ParticleManager,
    audioManager: AudioManager
  ) {
    this.container = new PIXI.Container()
    this.container.label = 'skill-feedback-manager'
    parentContainer.addChild(this.container)

    this.keyboardVisualizer = keyboardVisualizer
    this.particleManager = particleManager
    this._audioManager = audioManager

    // 初始化子组件
    this.skillIconPopup = new SkillIconPopup(this.container)
    this.effectTextDisplay = new EffectTextDisplay(this.container)
    this.adjacencyVisualizer = new AdjacencyVisualizer(this.container)
    this.effectQueueDisplay = new EffectQueueDisplay(this.container)
  }

  /**
   * 设置效果队列引用（用于显示队列状态）
   * @param queue - 效果队列实例（需提供 getQueue() 方法）
   */
  setEffectQueue(_queue: { getQueue(): QueuedEffect[] }): void {
    // 队列引用保存供后续使用
    // 实际队列更新通过事件监听处理
  }

  /**
   * 启用反馈系统，开始监听事件
   */
  enable(): void {
    if (this.enabled) return
    this.enabled = true

    this.unsubscribers.push(
      eventBus.on('skill:triggered', this.onSkillTriggered),
      eventBus.on('effect:queued', this.onEffectQueued),
      eventBus.on('effect:dequeued', this.onEffectDequeued)
    )
  }

  /**
   * 禁用反馈系统
   */
  disable(): void {
    if (!this.enabled) return
    this.enabled = false

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
   * 技能触发事件处理
   */
  private onSkillTriggered = (data: SkillTriggeredEvent): void => {
    const keyPosition = this.getKeyPosition(data.key)
    if (!keyPosition) return

    const skill = SKILLS[data.skillId]
    if (!skill) return

    // 1. 播放图标弹出
    this.skillIconPopup.play(data.skillId, keyPosition.x, keyPosition.y)

    // 2. 显示效果文字
    if (data.value !== undefined) {
      if (skill.type === 'score') {
        this.effectTextDisplay.showScoreBonus(data.value, keyPosition.x, keyPosition.y - 30)
      } else if (skill.type === 'multiply') {
        this.effectTextDisplay.showMultiplierBonus(data.value / 100, keyPosition.x, keyPosition.y - 30)
      }
    }
    this.effectTextDisplay.showSkillName(skill.name, keyPosition.x, keyPosition.y - 50)

    // 3. 被动技能显示相邻联动
    if (data.type === 'passive') {
      const adjacentKeys = adjacencyMap.getAdjacent(data.key)
      const keyPositions = this.buildKeyPositionMap()

      // 显示波纹
      this.adjacencyVisualizer.showRipple(data.key, adjacentKeys, keyPositions)

      // 显示连线到相邻键
      adjacentKeys.forEach(adjKey => {
        this.adjacencyVisualizer.showConnection(data.key, adjKey.toUpperCase(), keyPositions)
      })
    }

    // 4. 播放粒子效果
    if (this.particleManager && typeof this.particleManager.playSkillTrigger === 'function') {
      this.particleManager.playSkillTrigger(data.skillId, keyPosition.x, keyPosition.y)
    }
  }

  /**
   * 效果入队事件处理
   */
  private onEffectQueued = (data: EffectQueuedEvent): void => {
    // 播放入队动画
    this.effectQueueDisplay.playEnqueueAnimation(data.effect)
  }

  /**
   * 效果出队事件处理
   */
  private onEffectDequeued = (_data: EffectDequeuedEvent): void => {
    // 播放出队动画
    this.effectQueueDisplay.playDequeueAnimation()
  }

  /**
   * 获取键位全局位置
   */
  private getKeyPosition(key: string): { x: number; y: number } | null {
    const keyVisual = this.keyboardVisualizer.getKey(key)
    if (!keyVisual) return null

    // 获取键的全局位置
    const globalPos = keyVisual.getGlobalPosition()
    return { x: globalPos.x, y: globalPos.y }
  }

  /**
   * 构建所有键位位置映射
   */
  private buildKeyPositionMap(): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>()
    const allKeys = 'QWERTYUIOPASDFGHJKLZXCVBNM'.split('')

    allKeys.forEach(key => {
      const pos = this.getKeyPosition(key)
      if (pos) {
        positions.set(key, pos)
      }
    })

    return positions
  }

  /**
   * 每帧更新
   */
  update(deltaTime: number): void {
    this.skillIconPopup.update(deltaTime)
    this.effectTextDisplay.update(deltaTime)
    this.adjacencyVisualizer.update(deltaTime)
    this.effectQueueDisplay.update(deltaTime)
  }

  /**
   * 清理所有活动反馈
   */
  clear(): void {
    this.skillIconPopup.clear()
    this.effectTextDisplay.clear()
    this.adjacencyVisualizer.clear()
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.disable()
    this.skillIconPopup.destroy()
    this.effectTextDisplay.destroy()
    this.adjacencyVisualizer.destroy()
    this.effectQueueDisplay.destroy()
    this.container.destroy()
  }
}
