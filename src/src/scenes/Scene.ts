// ============================================
// 打字肉鸽 - Scene 接口定义
// ============================================
// Story 4.1 Task 1: Scene 接口定义

import { Container } from 'pixi.js'

/**
 * 场景接口
 *
 * 定义场景的生命周期钩子和基本属性。
 * 所有游戏场景（菜单、战斗、商店等）都应实现此接口。
 */
export interface Scene {
  /** 场景名称（用于日志和调试） */
  readonly name: string

  /** PixiJS 容器（场景的根显示对象） */
  readonly container: Container

  /** 场景进入栈顶时调用 */
  onEnter(): void

  /** 场景从栈中移除时调用 */
  onExit(): void

  /** 场景被新场景覆盖时调用（可选） */
  onPause?(): void

  /** 场景恢复到栈顶时调用（可选） */
  onResume?(): void

  /** 每帧更新（仅栈顶场景调用） */
  update(dt: number): void

  /** 渲染（由 PixiJS 自动处理，此方法用于自定义渲染逻辑） */
  render?(): void
}
