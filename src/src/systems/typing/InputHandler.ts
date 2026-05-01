// ============================================
// 打字肉鸽 - 键盘输入处理器
// ============================================
// Story 1.1: 实现 <16ms 延迟的键盘输入处理
// Story 41-5: 新增 keyup 监听 + KeyHoldState 追踪（Charge 长按蓄力）

import { eventBus } from '../../core/events/EventBus'
import { isGarbleActive, getActiveGarbleChars } from '../../data/bossModifiers'

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
 * - 监听键盘 keydown/keyup 事件
 * - 过滤非字母键 (只处理 A-Z)
 * - 统一转换为大写
 * - 通过 EventBus 发出 input:keypress / input:keyup 事件
 * - 追踪按键 hold 状态（Charge 长按蓄力用）
 * - 测量并报告输入延迟
 */
class InputHandler {
  private enabled = false
  private config: InputHandlerConfig
  /** Story 41-5: 按键 hold 状态追踪（key → startTime） */
  private _heldKeys = new Map<string, number>()

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
    document.addEventListener('keyup', this.handleKeyUp)
    window.addEventListener('blur', this.handleBlur)
    eventBus.emit('input:enabled', { enabled: true })
  }

  /**
   * 禁用输入监听
   */
  disable(): void {
    if (!this.enabled) return
    this.enabled = false
    this._heldKeys.clear()
    document.removeEventListener('keydown', this.handleKeyDown)
    document.removeEventListener('keyup', this.handleKeyUp)
    window.removeEventListener('blur', this.handleBlur)
    eventBus.emit('input:enabled', { enabled: false })
  }

  /**
   * 检查是否已启用
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /** Story 41-5: 获取当前 held 的键位集合（供 Charge 蓄力系统使用） */
  getHeldKeys(): ReadonlyMap<string, number> {
    return this._heldKeys
  }

  /**
   * 键盘 keydown 事件处理器
   * 使用箭头函数绑定 this，避免 bind() 开销
   */
  private handleKeyDown = (e: KeyboardEvent): void => {
    // Story 41-5: 过滤浏览器 key repeat（自动重复事件）
    if (e.repeat) return

    // Stage 2/3 (2026-05): 当焦点在表单输入元素（如主菜单打卡输入、值班表岗位输入）时，
    // 跳过战斗输入处理 — 否则用户在主菜单 / 职业选输入时会触发"打字错误"反馈
    const target = e.target as HTMLElement | null
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return

    const start = performance.now()

    // 只处理单个字母键 (A-Z) + garble 标点
    if (e.key.length !== 1) return
    const isLetter = /[a-zA-Z]/.test(e.key)
    const isGarbleChar = isGarbleActive() && getActiveGarbleChars().includes(e.key)
    if (!isLetter && !isGarbleChar) return

    // 统一转换为大写（标点不受影响）
    const key = e.key.toUpperCase()

    // Story 41-5: 记录按键开始时间
    this._heldKeys.set(key, start)

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
   * Story 41-5: 键盘 keyup 事件处理器
   */
  private handleKeyUp = (e: KeyboardEvent): void => {
    // 同 handleKeyDown：表单输入聚焦时跳过
    const target = e.target as HTMLElement | null
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
    if (e.key.length !== 1) return
    const isLetter = /[a-zA-Z]/.test(e.key)
    const isGarbleChar = isGarbleActive() && getActiveGarbleChars().includes(e.key)
    if (!isLetter && !isGarbleChar) return

    const key = e.key.toUpperCase()
    const now = performance.now()

    // 移除 hold 状态
    this._heldKeys.delete(key)

    // emit keyup 事件
    eventBus.emit('input:keyup', {
      key,
      timestamp: now
    })
  }

  /**
   * Story 41-5: focus 丢失时清空所有 hold 状态
   */
  private handleBlur = (): void => {
    this._heldKeys.clear()
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
