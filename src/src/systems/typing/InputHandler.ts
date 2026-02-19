// ============================================
// 打字肉鸽 - 键盘输入处理器
// ============================================
// Story 1.1: 实现 <16ms 延迟的键盘输入处理

import { eventBus } from '../../core/events/EventBus'

/**
 * 输入处理器配置
 */
interface InputHandlerConfig {
  /** 是否在开发模式下记录延迟 */
  logLatency?: boolean
  /** 延迟警告阈值 (ms) */
  latencyThreshold?: number
}

const DEFAULT_CONFIG: InputHandlerConfig = {
  logLatency: import.meta.env?.DEV ?? false,
  latencyThreshold: 16
}

/**
 * 键盘输入处理器
 *
 * 职责:
 * - 监听键盘 keydown 事件
 * - 过滤非字母键 (只处理 A-Z)
 * - 统一转换为大写
 * - 通过 EventBus 发出 input:keypress 事件
 * - 测量并报告输入延迟
 */
class InputHandler {
  private enabled = false
  private config: InputHandlerConfig

  constructor(config: InputHandlerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * 启用输入监听
   */
  enable(): void {
    if (this.enabled) return
    this.enabled = true
    document.addEventListener('keydown', this.handleKeyDown)
    eventBus.emit('input:enabled', { enabled: true })
  }

  /**
   * 禁用输入监听
   */
  disable(): void {
    if (!this.enabled) return
    this.enabled = false
    document.removeEventListener('keydown', this.handleKeyDown)
    eventBus.emit('input:enabled', { enabled: false })
  }

  /**
   * 检查是否已启用
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * 键盘事件处理器
   * 使用箭头函数绑定 this，避免 bind() 开销
   */
  private handleKeyDown = (e: KeyboardEvent): void => {
    const start = performance.now()

    // 只处理单个字母键 (A-Z)
    // e.key 对于字母键返回字母本身
    if (e.key.length !== 1 || !/[a-zA-Z]/.test(e.key)) {
      return
    }

    // 统一转换为大写
    const key = e.key.toUpperCase()

    // 发送事件
    eventBus.emit('input:keypress', {
      key,
      timestamp: start
    })

    // 开发模式延迟检查
    if (this.config.logLatency) {
      const latency = performance.now() - start
      if (latency > this.config.latencyThreshold!) {
        console.warn(`[InputHandler] High latency: ${latency.toFixed(2)}ms (threshold: ${this.config.latencyThreshold}ms)`)
      }
    }
  }

  /**
   * 销毁处理器，清理所有监听器
   */
  destroy(): void {
    this.disable()
  }
}

// 导出单例实例
export const inputHandler = new InputHandler()

// 同时导出类以便测试或创建多个实例
export { InputHandler }
