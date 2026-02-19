// ============================================
// 打字肉鸽 - KeyboardVisualizer 键盘可视化组件
// ============================================
// Story 4.4 Task 2-5: 键盘布局、绑定、高亮、动画

import { Container, Texture } from 'pixi.js'
import { KeyVisual } from './KeyVisual'
import { adjacencyMap } from '../../systems/skills/passive/AdjacencyMap'
import { eventBus, GameEvents } from '../../core/events/EventBus'

/**
 * 键盘可视化组件
 *
 * 功能:
 * - 显示 QWERTY 26 键布局
 * - 管理所有 KeyVisual 子组件
 * - 处理输入高亮和相邻联动
 * - 响应技能触发事件
 */
export class KeyboardVisualizer extends Container {
  private keys: Map<string, KeyVisual> = new Map()
  private currentPressed: string | null = null

  // 事件取消订阅函数
  private unsubKeypress: (() => void) | null = null
  private unsubKeyup: (() => void) | null = null
  private unsubSkillTriggered: (() => void) | null = null

  // 键盘布局定义
  private static readonly ROWS = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ]

  // 行偏移量 (模拟实际键盘错位)
  private static readonly ROW_OFFSETS = [0, 0.5, 1.0]

  constructor() {
    super()
    this.label = 'KeyboardVisualizer'

    this.createKeyboard()
  }

  /**
   * 创建键盘布局
   */
  private createKeyboard(): void {
    KeyboardVisualizer.ROWS.forEach((row, rowIndex) => {
      const offsetX = KeyboardVisualizer.ROW_OFFSETS[rowIndex] *
                      (KeyVisual.KEY_SIZE + KeyVisual.KEY_GAP)

      row.forEach((keyName, colIndex) => {
        const key = new KeyVisual(keyName)
        key.x = offsetX + colIndex * (KeyVisual.KEY_SIZE + KeyVisual.KEY_GAP)
        key.y = rowIndex * (KeyVisual.KEY_SIZE + KeyVisual.KEY_GAP)

        this.keys.set(keyName, key)
        this.addChild(key)
      })
    })
  }

  /**
   * 获取键盘可视化宽度
   * 第一行 10 个键 + 间隙
   */
  getKeyboardWidth(): number {
    const rowLength = KeyboardVisualizer.ROWS[0].length
    return rowLength * KeyVisual.KEY_SIZE + (rowLength - 1) * KeyVisual.KEY_GAP
  }

  /**
   * 获取键盘可视化高度
   * 3 行 + 间隙
   */
  getKeyboardHeight(): number {
    const rowCount = KeyboardVisualizer.ROWS.length
    return rowCount * KeyVisual.KEY_SIZE + (rowCount - 1) * KeyVisual.KEY_GAP
  }

  /**
   * 获取按键数量
   */
  getKeyCount(): number {
    return this.keys.size
  }

  /**
   * 获取指定键的 KeyVisual
   */
  getKey(keyName: string): KeyVisual | undefined {
    return this.keys.get(keyName.toUpperCase())
  }

  /**
   * 同步技能绑定显示
   * @param bindings 技能绑定映射 Map<keyName, skillId>
   * @param skillTextures 技能图标映射 Map<skillId, Texture>
   */
  syncBindings(
    bindings: Map<string, string>,
    skillTextures?: Map<string, Texture>
  ): void {
    this.keys.forEach((keyVisual, keyName) => {
      const skillId = bindings.get(keyName.toLowerCase()) || bindings.get(keyName)
      if (skillId && skillTextures) {
        const texture = skillTextures.get(skillId)
        keyVisual.setSkillIcon(texture || null)
      } else {
        keyVisual.setSkillIcon(null)
      }
    })
  }

  /**
   * 清除所有技能图标
   */
  clearBindings(): void {
    this.keys.forEach(keyVisual => {
      keyVisual.setSkillIcon(null)
    })
  }

  /**
   * 绑定事件监听
   */
  bindEvents(): void {
    this.unsubKeypress = eventBus.on('input:keypress', this.onKeyPress.bind(this))
    this.unsubKeyup = eventBus.on('input:keyup', this.onKeyUp.bind(this))
    this.unsubSkillTriggered = eventBus.on('skill:triggered', this.onSkillTriggered.bind(this))
  }

  /**
   * 解绑事件监听
   */
  unbindEvents(): void {
    if (this.unsubKeypress) {
      this.unsubKeypress()
      this.unsubKeypress = null
    }
    if (this.unsubKeyup) {
      this.unsubKeyup()
      this.unsubKeyup = null
    }
    if (this.unsubSkillTriggered) {
      this.unsubSkillTriggered()
      this.unsubSkillTriggered = null
    }
  }

  /**
   * 处理按键按下
   */
  private onKeyPress(data: GameEvents['input:keypress']): void {
    if (this.destroyed) return

    const keyUpper = data.key.toUpperCase()

    // 清除之前的高亮
    this.clearHighlights()

    // 高亮当前键
    const currentKey = this.keys.get(keyUpper)
    if (currentKey) {
      currentKey.setPressed(true)
      this.currentPressed = keyUpper

      // 高亮相邻键
      const adjacentKeys = adjacencyMap.getAdjacent(keyUpper)
      adjacentKeys.forEach(adjKey => {
        const adjKeyVisual = this.keys.get(adjKey.toUpperCase())
        if (adjKeyVisual) {
          adjKeyVisual.setAdjacentHighlight(true)
        }
      })
    }
  }

  /**
   * 处理按键抬起
   */
  private onKeyUp(_data: GameEvents['input:keyup']): void {
    if (this.destroyed) return
    this.clearHighlights()
  }

  /**
   * 处理技能触发
   */
  private onSkillTriggered(data: GameEvents['skill:triggered']): void {
    if (this.destroyed) return

    const keyUpper = data.key.toUpperCase()
    const keyVisual = this.keys.get(keyUpper)

    if (keyVisual) {
      keyVisual.playTriggerAnimation()
    }
  }

  /**
   * 清除所有高亮状态
   */
  clearHighlights(): void {
    this.keys.forEach(keyVisual => {
      keyVisual.setPressed(false)
      keyVisual.setAdjacentHighlight(false)
    })
    this.currentPressed = null
  }

  /**
   * 获取当前按下的键
   */
  getCurrentPressed(): string | null {
    return this.currentPressed
  }

  /**
   * 手动设置按键高亮（用于测试）
   */
  highlightKey(keyName: string): void {
    const keyUpper = keyName.toUpperCase()
    this.clearHighlights()

    const key = this.keys.get(keyUpper)
    if (key) {
      key.setPressed(true)
      this.currentPressed = keyUpper

      const adjacentKeys = adjacencyMap.getAdjacent(keyUpper)
      adjacentKeys.forEach(adjKey => {
        const adjKeyVisual = this.keys.get(adjKey.toUpperCase())
        if (adjKeyVisual) {
          adjKeyVisual.setAdjacentHighlight(true)
        }
      })
    }
  }

  /**
   * 每帧更新（更新所有键的动画）
   * @param dt delta time（秒）
   */
  update(dt: number): void {
    this.keys.forEach(keyVisual => {
      keyVisual.update(dt)
    })
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    this.unbindEvents()
    // 清除引用（super.destroy 会处理子组件销毁）
    this.keys.clear()
    super.destroy({ children: true })
  }
}
