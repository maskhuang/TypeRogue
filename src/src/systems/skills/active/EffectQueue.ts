// ============================================
// 打字肉鸽 - 效果队列
// ============================================
// Story 3.1: 实现技能效果队列管理

import { eventBus } from '../../../core/events/EventBus'

/**
 * 队列效果类型
 */
export type EffectType = 'amplify' | 'ripple' | 'chain' | 'transform' | 'delay' | 'echo'

/**
 * 队列效果
 */
export interface QueuedEffect {
  /** 效果类型 */
  type: EffectType
  /** 效果数值 */
  value: number
  /** 来源技能 ID */
  sourceSkillId: string
  /** 来源键位 */
  sourceKey: string
  /** 过期时间（可选） */
  expiresAt?: number
  /** 目标键位（可选，用于定向效果） */
  targetKey?: string
  /** 延迟次数（用于防止 delay 效果无限循环） */
  delayCount?: number
}

/**
 * 效果应用结果
 */
export interface EffectApplyResult {
  /** 应用后的值 */
  value: number
  /** 应用的效果（单个，向后兼容） */
  appliedEffect: QueuedEffect | null
  /** 应用的所有效果 */
  appliedEffects: QueuedEffect[]
  /** 效果描述 */
  description: string
}

/**
 * 效果队列
 *
 * 职责:
 * - 管理技能效果队列
 * - 按顺序应用效果
 * - 发出队列状态变更事件
 */
class EffectQueue {
  private queue: QueuedEffect[] = []
  private maxSize = 10

  /**
   * 获取队列长度
   */
  get length(): number {
    return this.queue.length
  }

  /**
   * 检查队列是否为空
   */
  get isEmpty(): boolean {
    return this.queue.length === 0
  }

  /**
   * 检查队列是否已满
   */
  get isFull(): boolean {
    return this.queue.length >= this.maxSize
  }

  /**
   * 入队效果
   */
  enqueue(effect: QueuedEffect): void {
    // 队列满时移除最旧的
    if (this.queue.length >= this.maxSize) {
      const removed = this.queue.shift()
      if (removed) {
        eventBus.emit('effect:dequeued', { effect: removed })
      }
    }

    this.queue.push(effect)

    eventBus.emit('effect:queued', {
      effect,
      queueSize: this.queue.length
    })
  }

  /**
   * 出队效果
   */
  dequeue(): QueuedEffect | null {
    const effect = this.queue.shift() ?? null

    if (effect) {
      eventBus.emit('effect:dequeued', { effect })
    }

    return effect
  }

  /**
   * 查看队首效果（不移除）
   */
  peek(): QueuedEffect | null {
    return this.queue[0] ?? null
  }

  /**
   * 查看所有效果
   */
  peekAll(): QueuedEffect[] {
    return [...this.queue]
  }

  /**
   * 应用下一个效果到基础值
   */
  applyNext(baseValue: number): EffectApplyResult {
    const effect = this.dequeue()

    if (!effect) {
      return {
        value: baseValue,
        appliedEffect: null,
        appliedEffects: [],
        description: ''
      }
    }

    let value = baseValue
    let description = ''

    switch (effect.type) {
      case 'amplify':
        value = Math.floor(baseValue * effect.value)
        description = `增幅 x${effect.value}`
        break

      case 'ripple':
        value = Math.floor(baseValue * effect.value)
        description = `涟漪 x${effect.value}`
        break

      case 'chain':
        value = baseValue + effect.value
        description = `连锁 +${effect.value}`
        break

      case 'transform':
        value = effect.value
        description = `转化 =${effect.value}`
        break

      case 'delay':
        // 延迟效果：重新入队（限制最大延迟次数防止无限循环）
        const MAX_DELAY_COUNT = 3
        const currentDelayCount = effect.delayCount ?? 0
        if (currentDelayCount < MAX_DELAY_COUNT) {
          this.enqueue({
            ...effect,
            delayCount: currentDelayCount + 1
          })
          description = `延迟 (${currentDelayCount + 1}/${MAX_DELAY_COUNT})`
        } else {
          description = '延迟已达上限，效果消失'
        }
        value = baseValue
        break

      default:
        value = baseValue
    }

    return {
      value,
      appliedEffect: effect,
      appliedEffects: [effect],
      description
    }
  }

  /**
   * 应用所有匹配的效果
   */
  applyAllMatching(
    baseValue: number,
    predicate: (effect: QueuedEffect) => boolean
  ): EffectApplyResult {
    let value = baseValue
    const appliedEffects: QueuedEffect[] = []
    const descriptions: string[] = []

    // 过滤匹配的效果
    const remaining: QueuedEffect[] = []
    for (const effect of this.queue) {
      if (predicate(effect)) {
        const result = this.applyEffectToValue(value, effect)
        value = result.value
        appliedEffects.push(effect)
        if (result.description) {
          descriptions.push(result.description)
        }
      } else {
        remaining.push(effect)
      }
    }

    this.queue = remaining

    // 发送事件
    for (const effect of appliedEffects) {
      eventBus.emit('effect:dequeued', { effect })
    }

    return {
      value,
      appliedEffect: appliedEffects[0] ?? null,
      appliedEffects,
      description: descriptions.join(', ')
    }
  }

  /**
   * 应用单个效果到值
   */
  private applyEffectToValue(
    value: number,
    effect: QueuedEffect
  ): { value: number; description: string } {
    switch (effect.type) {
      case 'amplify':
      case 'ripple':
        return {
          value: Math.floor(value * effect.value),
          description: `x${effect.value}`
        }
      case 'chain':
        return {
          value: value + effect.value,
          description: `+${effect.value}`
        }
      case 'transform':
        return {
          value: effect.value,
          description: `=${effect.value}`
        }
      default:
        return { value, description: '' }
    }
  }

  /**
   * 清除过期效果
   */
  clearExpired(): number {
    const now = performance.now()
    const before = this.queue.length

    this.queue = this.queue.filter(effect => {
      if (effect.expiresAt && effect.expiresAt < now) {
        eventBus.emit('effect:dequeued', { effect })
        return false
      }
      return true
    })

    return before - this.queue.length
  }

  /**
   * 清除特定来源的效果
   */
  clearBySource(sourceSkillId: string): number {
    const before = this.queue.length

    this.queue = this.queue.filter(effect => {
      if (effect.sourceSkillId === sourceSkillId) {
        eventBus.emit('effect:dequeued', { effect })
        return false
      }
      return true
    })

    return before - this.queue.length
  }

  /**
   * 清空队列
   */
  clear(): void {
    for (const effect of this.queue) {
      eventBus.emit('effect:dequeued', { effect })
    }
    this.queue = []
  }

  /**
   * 设置最大队列长度
   */
  setMaxSize(size: number): void {
    this.maxSize = size
    // 裁剪超出的效果
    while (this.queue.length > this.maxSize) {
      const removed = this.queue.shift()
      if (removed) {
        eventBus.emit('effect:dequeued', { effect: removed })
      }
    }
  }
}

// 导出单例实例
export const effectQueue = new EffectQueue()

// 同时导出类以便测试
export { EffectQueue }
