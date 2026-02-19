// ============================================
// 打字肉鸽 - 场景管理器
// ============================================
// Story 4.1 Task 3: SceneManager 实现

import { Application, Container } from 'pixi.js'
import type { Scene } from './Scene'
import { eventBus } from '../core/events/EventBus'

/**
 * 场景管理器
 *
 * 职责:
 * - 管理场景栈（push/pop/replace）
 * - 控制场景生命周期
 * - 驱动场景更新和渲染
 * - 发送场景切换事件
 */
export class SceneManager {
  private stack: Scene[] = []
  private sceneContainer: Container
  private _isDestroyed = false

  constructor(app: Application) {
    this.sceneContainer = new Container()
    app.stage.addChild(this.sceneContainer)
  }

  /**
   * 检查管理器是否已销毁
   */
  get isDestroyed(): boolean {
    return this._isDestroyed
  }

  /**
   * 获取当前活跃场景（栈顶）
   */
  current(): Scene | null {
    return this.stack[this.stack.length - 1] ?? null
  }

  /**
   * 叠加新场景（保留下层场景）
   * 用于暂停菜单、对话框等覆盖场景
   * @throws Error 如果场景已在栈中
   */
  push(scene: Scene): void {
    // 防止重复 push 相同场景
    if (this.stack.includes(scene)) {
      console.warn(`SceneManager: Scene "${scene.name}" is already in the stack`)
      return
    }

    const previous = this.current()

    // 先暂停当前场景
    if (previous) {
      previous.onPause?.()
    }

    // 添加新场景
    this.stack.push(scene)
    this.sceneContainer.addChild(scene.container)
    scene.onEnter()

    // 发送事件
    eventBus.emit('scene:change', {
      from: previous?.name ?? null,
      to: scene.name,
      action: 'push'
    })
  }

  /**
   * 弹出当前场景，恢复下层场景
   * @returns 被移除的场景，空栈返回 null
   */
  pop(): Scene | null {
    const removed = this.stack.pop()
    if (!removed) return null

    // 先退出当前场景
    this.sceneContainer.removeChild(removed.container)
    removed.onExit()

    // 恢复下层场景
    const next = this.current()
    if (next) {
      next.onResume?.()
    }

    // 发送事件
    eventBus.emit('scene:change', {
      from: removed.name,
      to: next?.name ?? null,
      action: 'pop'
    })

    return removed
  }

  /**
   * 替换当前场景（移除当前，添加新场景）
   * 用于场景切换（如菜单 → 战斗）
   */
  replace(scene: Scene): void {
    const removed = this.stack.pop()

    // 退出旧场景
    if (removed) {
      this.sceneContainer.removeChild(removed.container)
      removed.onExit()
    }

    // 添加新场景
    this.stack.push(scene)
    this.sceneContainer.addChild(scene.container)
    scene.onEnter()

    // 发送事件
    eventBus.emit('scene:change', {
      from: removed?.name ?? null,
      to: scene.name,
      action: 'replace'
    })
  }

  /**
   * 清空所有场景
   * 用于游戏重置或退出
   */
  clear(): void {
    while (this.stack.length > 0) {
      this.pop()
    }
  }

  /**
   * 每帧更新（仅更新栈顶场景）
   * 应由主 Ticker 调用
   */
  update(dt: number): void {
    const current = this.current()
    if (current) {
      current.update(dt)
      current.render?.()
    }
  }

  /**
   * 场景栈深度
   */
  get depth(): number {
    return this.stack.length
  }

  /**
   * 检查场景是否在栈中
   */
  has(sceneName: string): boolean {
    return this.stack.some(s => s.name === sceneName)
  }

  /**
   * 销毁场景管理器
   * 清空所有场景并移除容器
   */
  destroy(): void {
    if (this._isDestroyed) return

    this.clear()
    this.sceneContainer.destroy({ children: true })
    this._isDestroyed = true
  }
}
