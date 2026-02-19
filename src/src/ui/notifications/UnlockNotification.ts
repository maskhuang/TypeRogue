// ============================================
// 打字肉鸽 - 解锁通知管理
// ============================================
// Story 6.3: 解锁系统 - 通知组件 (AC: #7)

import { eventBus } from '../../core/events/EventBus'

/**
 * 解锁通知数据
 */
export interface UnlockNotificationData {
  type: 'skill' | 'relic'
  name: string
  description: string
}

/**
 * UnlockNotificationManager - 解锁通知管理 (AC: #7)
 *
 * 监听 unlock:new 事件并显示通知
 *
 * 注意：具体 UI 实现依赖 PixiJS/场景系统
 * 此处提供基础框架，具体显示逻辑待 UI 系统完善后实现
 */
export class UnlockNotificationManager {
  private queue: UnlockNotificationData[] = []
  private eventUnsubscriber: (() => void) | null = null

  constructor() {
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.eventUnsubscriber = eventBus.on('unlock:new', (data) => {
      this.showNotification({
        type: data.type,
        name: data.name,
        description: data.description,
      })
    })
  }

  /**
   * 显示解锁通知
   */
  showNotification(data: UnlockNotificationData): void {
    this.queue.push(data)

    // 发送 UI 事件（由场景系统处理实际显示）
    eventBus.emit('ui:show_notification', {
      category: 'unlock',
      title: `解锁: ${data.name}`,
      message: data.description,
      icon: data.type === 'skill' ? 'skill_icon' : 'relic_icon',
      duration: 3000,
    })

    // 开发环境 console 输出
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      console.log(`[Unlock] ${data.type}: ${data.name} - ${data.description}`)
    }
  }

  /**
   * 获取通知队列（用于测试）
   */
  getQueue(): UnlockNotificationData[] {
    return [...this.queue]
  }

  /**
   * 清空队列
   */
  clearQueue(): void {
    this.queue = []
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.eventUnsubscriber) {
      this.eventUnsubscriber()
      this.eventUnsubscriber = null
    }
    this.queue = []
  }
}
