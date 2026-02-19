// ============================================
// 打字肉鸽 - BaseScene 抽象基类
// ============================================
// Story 4.1 Task 2: 抽象基类 BaseScene
// Story 5.5 Task 4: 添加淡入淡出过渡效果

import { Container } from 'pixi.js'
import type { Scene } from './Scene'

/**
 * 场景抽象基类
 *
 * 提供 Scene 接口的默认实现，便于子类继承。
 * 子类只需实现 name 和 update 方法。
 */
export abstract class BaseScene implements Scene {
  /** 子类必须提供场景名称 */
  abstract readonly name: string

  /** PixiJS 容器 */
  readonly container: Container

  /** 场景是否已销毁（调用 onExit 后为 true） */
  private _isDestroyed = false

  /** 淡入淡出动画 ID（用于取消） */
  private fadeAnimationId: number | null = null

  constructor() {
    this.container = new Container()
  }

  /** 检查场景是否已销毁 */
  get isDestroyed(): boolean {
    return this._isDestroyed
  }

  /**
   * 场景进入时调用
   * 默认实现：显示容器
   */
  onEnter(): void {
    this.container.visible = true
  }

  /**
   * 场景退出时调用
   * 默认实现：隐藏并销毁容器及其子对象
   * 注意：调用后场景不可重用，isDestroyed 将为 true
   */
  onExit(): void {
    this.cancelFadeAnimation()
    this.container.visible = false
    this.container.destroy({ children: true })
    this._isDestroyed = true
  }

  /**
   * 场景被覆盖时调用
   * 默认实现：隐藏但不销毁（允许恢复）
   */
  onPause(): void {
    this.container.visible = false
  }

  /**
   * 场景恢复到栈顶时调用
   * 默认实现：显示容器
   */
  onResume(): void {
    this.container.visible = true
  }

  /**
   * 每帧更新
   * 子类必须实现
   */
  abstract update(dt: number): void

  /**
   * 渲染回调
   * 默认空实现，子类可覆盖
   */
  render(): void {
    // 默认空实现
  }

  /**
   * 淡入效果
   * @param duration 持续时间（毫秒），默认 300ms
   * @returns Promise 完成时 resolve
   */
  protected fadeIn(duration: number = 300): Promise<void> {
    return new Promise((resolve) => {
      this.cancelFadeAnimation()
      this.container.alpha = 0
      this.container.visible = true

      // 如果 requestAnimationFrame 不可用（测试环境），直接完成
      if (typeof requestAnimationFrame === 'undefined') {
        this.container.alpha = 1
        resolve()
        return
      }

      const startTime = Date.now()
      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)

        this.container.alpha = progress

        if (progress < 1) {
          this.fadeAnimationId = requestAnimationFrame(animate)
        } else {
          this.fadeAnimationId = null
          resolve()
        }
      }

      this.fadeAnimationId = requestAnimationFrame(animate)
    })
  }

  /**
   * 淡出效果
   * @param duration 持续时间（毫秒），默认 300ms
   * @returns Promise 完成时 resolve
   */
  protected fadeOut(duration: number = 300): Promise<void> {
    return new Promise((resolve) => {
      this.cancelFadeAnimation()
      this.container.alpha = 1

      // 如果 requestAnimationFrame 不可用（测试环境），直接完成
      if (typeof requestAnimationFrame === 'undefined') {
        this.container.alpha = 0
        this.container.visible = false
        resolve()
        return
      }

      const startTime = Date.now()
      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)

        this.container.alpha = 1 - progress

        if (progress < 1) {
          this.fadeAnimationId = requestAnimationFrame(animate)
        } else {
          this.fadeAnimationId = null
          this.container.visible = false
          resolve()
        }
      }

      this.fadeAnimationId = requestAnimationFrame(animate)
    })
  }

  /**
   * 取消正在进行的淡入淡出动画
   */
  protected cancelFadeAnimation(): void {
    if (this.fadeAnimationId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.fadeAnimationId)
      this.fadeAnimationId = null
    }
  }
}
