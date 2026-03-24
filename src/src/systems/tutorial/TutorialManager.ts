// ============================================
// 打字肉鸽 - TutorialManager 引导系统核心
// ============================================
// Story 39.3: 事件驱动触发、进度持久化、分层引导

import { eventBus } from '../../core/events/EventBus'
import type { TutorialStep } from '../../data/tutorialSteps'
import { TutorialOverlay } from './TutorialOverlay'
import { inputHandler } from '../typing/InputHandler'

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

    let bound = 0
    const skippedIds: string[] = []
    for (const step of this.steps) {
      if (this.isCompleted(step.id)) {
        skippedIds.push(step.id)
        continue
      }
      this.bindStep(step)
      bound++
    }
    console.log(`[Tutorial] start: ${bound} bound, ${skippedIds.length} skipped, ${this.steps.length} total`)
    if (skippedIds.length > 0) {
      console.log(`[Tutorial] already completed:`, skippedIds)
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
    // 持久化清除结果 + 重新绑定事件
    eventBus.emit('meta:request_save', {})
    if (this.running) {
      this.stop()
      this.start()
    }
  }

  /**
   * 全局开关
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled && this.running) {
      this.stop()
    } else if (enabled && !this.running) {
      this.start()
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
      if (this.currentOverlay?.isVisible()) {
        console.log(`[Tutorial] ${step.id}: blocked (overlay visible)`)
        return
      }

      // 检查前置步骤
      if (step.prerequisite && !this.isCompleted(step.prerequisite)) {
        console.log(`[Tutorial] ${step.id}: blocked (prerequisite ${step.prerequisite} not completed)`)
        return
      }

      // 检查额外条件
      if (step.trigger.condition && !step.trigger.condition()) {
        console.log(`[Tutorial] ${step.id}: blocked (condition false)`)
        return
      }

      // 已完成不重复
      if (this.isCompleted(step.id)) {
        console.log(`[Tutorial] ${step.id}: blocked (already completed)`)
        return
      }

      console.log(`[Tutorial] ${step.id}: will show (delay=${step.trigger.delay || 0}ms)`)

      const show = () => {
        // 再次检查（delay 期间可能已完成）
        if (this.isCompleted(step.id)) return
        if (this.currentOverlay?.isVisible()) {
          console.log(`[Tutorial] ${step.id}: post-delay blocked (overlay visible)`)
          return
        }

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
    const isPause = !!step.pauseGame

    // 暂停模式：停止游戏计时 + 禁用打字输入
    if (isPause) {
      eventBus.emit('battle:pause', {})
      inputHandler.disable()
    }

    const overlay = new TutorialOverlay({
      titleKey: step.content.titleKey,
      bodyKey: step.content.bodyKey,
      anchorElement: step.content.anchorElement,
      anchorPosition: step.content.anchorPosition,
      highlight: step.content.highlight,
      dismissAfter: step.dismissAfter ?? 6000,
      paramsProvider: step.content.paramsProvider,
      anyKeyDismiss: isPause,
      onDismiss: (neverShowAgain: boolean) => {
        this.currentOverlay = null
        this.markCompleted(step.id)
        void neverShowAgain

        // 恢复游戏（若下一个 pauseGame 步骤已在显示，跳过恢复）
        if (isPause && !this.currentOverlay?.isVisible()) {
          eventBus.emit('battle:resume', {})
          inputHandler.enable()
        }
      },
    })

    this.currentOverlay = overlay
    overlay.show()
    eventBus.emit('tutorial:step_shown', { stepId: step.id })
  }
}

// 导出单例
export const tutorialManager = new TutorialManagerImpl()
