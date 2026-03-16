// ============================================
// 打字肉鸽 - TutorialManager 引导系统核心
// ============================================
// Story 39.3: 事件驱动触发、进度持久化、分层引导

import { eventBus } from '../../core/events/EventBus'
import type { TutorialStep } from '../../data/tutorialSteps'
import { TutorialOverlay } from './TutorialOverlay'

/** MetaState 引导进度接口（避免直接 import MetaState 实例） */
export interface TutorialPersistence {
  isTutorialCompleted(stepId: string): boolean
  markTutorialCompleted(stepId: string): void
  resetTutorials(): void
}

/**
 * 引导系统管理器（单例）
 * 管理步骤注册、事件监听、浮窗显示和进度持久化
 */
class TutorialManagerImpl {
  private steps: TutorialStep[] = []
  private unsubscribers: Array<() => void> = []
  private enabled = true
  private running = false
  private persistence: TutorialPersistence | null = null
  private currentOverlay: TutorialOverlay | null = null

  /**
   * 设置持久化后端（MetaState）
   */
  setPersistence(persistence: TutorialPersistence): void {
    this.persistence = persistence
  }

  /**
   * 注册引导步骤
   */
  register(steps: TutorialStep[]): void {
    this.steps.push(...steps)
  }

  /**
   * 开始监听事件（绑定所有未完成步骤的 EventBus 监听器）
   */
  start(): void {
    if (!this.enabled || this.running) return
    this.running = true

    for (const step of this.steps) {
      if (this.isCompleted(step.id)) continue
      this.bindStep(step)
    }
  }

  /**
   * 停止所有事件监听
   */
  stop(): void {
    for (const unsub of this.unsubscribers) {
      unsub()
    }
    this.unsubscribers = []
    this.running = false

    if (this.currentOverlay) {
      this.currentOverlay.dismiss(false)
      this.currentOverlay = null
    }
  }

  /**
   * 检查步骤是否已完成
   */
  isCompleted(stepId: string): boolean {
    return this.persistence?.isTutorialCompleted(stepId) ?? false
  }

  /**
   * 标记步骤完成并持久化
   */
  markCompleted(stepId: string): void {
    this.persistence?.markTutorialCompleted(stepId)
    eventBus.emit('tutorial:step_completed', { stepId })
  }

  /**
   * 重置所有引导进度
   */
  resetAll(): void {
    this.persistence?.resetTutorials()
  }

  /**
   * 全局开关
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled && this.running) {
      this.stop()
    }
  }

  /**
   * 获取当前启用状态
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /** 测试用：重置全部内部状态 */
  _testReset(): void {
    this.stop()
    this.steps = []
    this.persistence = null
    this.enabled = true
  }

  private bindStep(step: TutorialStep): void {
    const handler = () => {
      // 防重入：当前有浮窗时不触发新步骤
      if (this.currentOverlay?.isVisible()) return

      // 检查前置步骤
      if (step.prerequisite && !this.isCompleted(step.prerequisite)) return

      // 检查额外条件
      if (step.trigger.condition && !step.trigger.condition()) return

      // 已完成不重复
      if (this.isCompleted(step.id)) return

      const show = () => {
        // 再次检查（delay 期间可能已完成）
        if (this.isCompleted(step.id)) return
        if (this.currentOverlay?.isVisible()) return

        this.showStep(step)
      }

      if (step.trigger.delay && step.trigger.delay > 0) {
        setTimeout(show, step.trigger.delay)
      } else {
        show()
      }
    }

    // 使用 eventBus.on，存储 unsubscriber
    // 注意：event 可能是 GameEvents 中的类型，也可能是动态字符串
    const unsub = (eventBus as unknown as { on(event: string, handler: () => void): () => void }).on(step.trigger.event, handler)
    this.unsubscribers.push(unsub)
  }

  private showStep(step: TutorialStep): void {
    const overlay = new TutorialOverlay({
      titleKey: step.content.titleKey,
      bodyKey: step.content.bodyKey,
      anchorElement: step.content.anchorElement,
      anchorPosition: step.content.anchorPosition,
      highlight: step.content.highlight,
      dismissAfter: step.dismissAfter ?? 6000,
      onDismiss: (neverShowAgain: boolean) => {
        this.currentOverlay = null
        // "知道了" 总是标记完成；"不再提示" 也标记完成（两者效果相同）
        this.markCompleted(step.id)
        // neverShowAgain 可用于未来分析，当前行为与普通完成相同
        void neverShowAgain
      },
    })

    this.currentOverlay = overlay
    overlay.show()
    eventBus.emit('tutorial:step_shown', { stepId: step.id })
  }
}

// 导出单例
export const tutorialManager = new TutorialManagerImpl()
