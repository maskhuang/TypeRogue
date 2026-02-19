// ============================================
// 打字肉鸽 - ComboCounter 连击计数器组件
// ============================================
// Story 4.3 Task 3: 连击计数器

import { Container, Text, TextStyle } from 'pixi.js'

/**
 * 连击计数器组件
 *
 * 功能:
 * - 显示当前连击数
 * - 连击增加时弹出动画
 * - combo = 0 时隐藏
 * - 颜色随连击数变化
 *
 * 位置: 右下角 (padding: 20px)
 */
export class ComboCounter extends Container {
  private comboText: Text
  private currentCombo: number = 0
  private animationScale: number = 1.0

  // 颜色阈值
  private static readonly COLOR_LOW = 0xffffff // 白色 (1-5)
  private static readonly COLOR_MEDIUM = 0xffff00 // 黄色 (6-10)
  private static readonly COLOR_HIGH = 0xff6600 // 橙红色 (11+)

  private static readonly STYLE = new TextStyle({
    fontFamily: 'Arial',
    fontSize: 32,
    fontWeight: 'bold',
    fill: 0xffffff
  })

  constructor() {
    super()
    this.label = 'ComboCounter'

    // 创建连击文本
    this.comboText = new Text({
      text: '0 COMBO',
      style: ComboCounter.STYLE
    })
    this.addChild(this.comboText)

    // 初始隐藏
    this.visible = false
  }

  /**
   * 设置连击数
   * @param combo 连击数
   */
  setCombo(combo: number): void {
    const oldCombo = this.currentCombo
    this.currentCombo = combo

    if (combo === 0) {
      this.visible = false
      return
    }

    this.visible = true
    this.comboText.text = `${combo} COMBO`

    // 更新颜色
    this.updateColor()

    // 连击增加时触发弹出动画
    if (combo > oldCombo) {
      this.triggerPopAnimation()
    }
  }

  /**
   * 根据连击数更新颜色
   */
  private updateColor(): void {
    const color = this.getComboColor()
    this.comboText.style.fill = color
  }

  /**
   * 获取当前连击对应的颜色
   */
  getComboColor(): number {
    if (this.currentCombo >= 11) {
      return ComboCounter.COLOR_HIGH
    } else if (this.currentCombo >= 6) {
      return ComboCounter.COLOR_MEDIUM
    }
    return ComboCounter.COLOR_LOW
  }

  /**
   * 触发弹出动画
   */
  private triggerPopAnimation(): void {
    this.animationScale = 1.3 // 放大 30%
  }

  /**
   * 每帧更新（用于动画）
   * @param dt delta time（秒）
   */
  update(dt: number): void {
    // 缩放恢复动画
    if (this.animationScale > 1.0) {
      this.animationScale -= dt * 2 // 恢复速度
      if (this.animationScale < 1.0) {
        this.animationScale = 1.0
      }

      // 设置 pivot 使缩放从中心进行（基于文本尺寸估算）
      // 使用字符数 * 字符宽度估算，避免访问 .width（需要 canvas）
      const charCount = this.comboText.text.length
      const estimatedWidth = charCount * 19 // 32px font * 0.6
      const estimatedHeight = 32
      this.pivot.set(estimatedWidth / 2, estimatedHeight / 2)

      // 应用缩放
      this.scale.set(this.animationScale)
    }
  }

  /**
   * 获取当前连击数（供测试使用）
   */
  getCurrentCombo(): number {
    return this.currentCombo
  }

  /**
   * 获取动画缩放值（供测试使用）
   */
  getAnimationScale(): number {
    return this.animationScale
  }

  /**
   * 获取连击文本对象（供测试使用）
   */
  getComboText(): Text {
    return this.comboText
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    super.destroy({ children: true })
  }
}
