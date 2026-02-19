// ============================================
// 打字肉鸽 - KeyVisual 单键可视化组件
// ============================================
// Story 4.4 Task 1: 单键组件

import { Container, Graphics, Text, TextStyle, Texture, Sprite } from 'pixi.js'

/**
 * 单个按键可视化组件
 *
 * 功能:
 * - 显示键名 (Q, W, E...)
 * - 显示绑定的技能图标
 * - 支持多种高亮状态 (默认、按下、相邻)
 * - 支持触发动画
 */
export class KeyVisual extends Container {
  private background: Graphics
  private keyLabel: Text
  private skillIcon: Sprite | null = null
  private keyName: string

  // 动画状态
  private animationScale: number = 1.0
  private animationAlpha: number = 1.0
  private isAnimating: boolean = false

  // 动画速度常量
  private static readonly SCALE_RECOVERY_SPEED = 2.0
  private static readonly ALPHA_RECOVERY_SPEED = 3.0

  // 当前状态
  private isPressed: boolean = false
  private isAdjacentHighlighted: boolean = false

  // 尺寸常量
  static readonly KEY_SIZE = 48
  static readonly KEY_GAP = 4
  static readonly BORDER_RADIUS = 6
  static readonly BORDER_WIDTH = 2

  // 颜色常量
  private static readonly COLOR_DEFAULT = 0x2a2a2a
  private static readonly COLOR_PRESSED = 0x4a4a4a
  private static readonly COLOR_ADJACENT = 0x3a3a5a
  private static readonly COLOR_BORDER_DEFAULT = 0x444444
  private static readonly COLOR_BORDER_PRESSED = 0xffffff
  private static readonly COLOR_BORDER_ADJACENT = 0x6666aa

  private static readonly LABEL_STYLE = new TextStyle({
    fontFamily: 'Arial',
    fontSize: 12,
    fontWeight: 'bold',
    fill: 0xffffff
  })

  constructor(keyName: string) {
    super()
    this.keyName = keyName
    this.label = `Key_${keyName}`

    this.background = new Graphics()
    this.addChild(this.background)

    this.keyLabel = new Text({
      text: keyName,
      style: KeyVisual.LABEL_STYLE
    })
    this.addChild(this.keyLabel)

    this.drawBackground()
    this.positionLabel()
  }

  /**
   * 绘制背景
   */
  private drawBackground(): void {
    this.background.clear()

    // 确定背景颜色
    let bgColor = KeyVisual.COLOR_DEFAULT
    let borderColor = KeyVisual.COLOR_BORDER_DEFAULT

    if (this.isPressed) {
      bgColor = KeyVisual.COLOR_PRESSED
      borderColor = KeyVisual.COLOR_BORDER_PRESSED
    } else if (this.isAdjacentHighlighted) {
      bgColor = KeyVisual.COLOR_ADJACENT
      borderColor = KeyVisual.COLOR_BORDER_ADJACENT
    }

    // 绘制边框
    this.background.roundRect(
      0, 0,
      KeyVisual.KEY_SIZE, KeyVisual.KEY_SIZE,
      KeyVisual.BORDER_RADIUS
    )
    this.background.fill({ color: bgColor })
    this.background.stroke({
      color: borderColor,
      width: KeyVisual.BORDER_WIDTH
    })
  }

  /**
   * 定位键名标签到底部中央
   */
  private positionLabel(): void {
    // 使用估算宽度避免 Node 测试环境 Text.width 不可用问题
    // 单个大写字母约为字体大小的 0.6 倍宽度 (12px * 0.6 ≈ 7px)
    const charWidth = 7
    const labelWidth = this.keyName.length * charWidth
    this.keyLabel.x = (KeyVisual.KEY_SIZE - labelWidth) / 2
    this.keyLabel.y = KeyVisual.KEY_SIZE - 16
  }

  /**
   * 获取键名
   */
  getKeyName(): string {
    return this.keyName
  }

  /**
   * 设置绑定的技能图标
   * @param iconTexture 图标纹理，null 表示清除图标
   */
  setSkillIcon(iconTexture: Texture | null): void {
    // 清除现有图标
    if (this.skillIcon) {
      this.removeChild(this.skillIcon)
      this.skillIcon.destroy()
      this.skillIcon = null
    }

    // 设置新图标
    if (iconTexture) {
      this.skillIcon = new Sprite(iconTexture)
      // 图标大小为按键的 60%，居中显示
      const iconSize = KeyVisual.KEY_SIZE * 0.6
      this.skillIcon.width = iconSize
      this.skillIcon.height = iconSize
      this.skillIcon.x = (KeyVisual.KEY_SIZE - iconSize) / 2
      this.skillIcon.y = 4 // 顶部留一点边距
      this.addChild(this.skillIcon)
    }
  }

  /**
   * 检查是否有技能图标
   */
  hasSkillIcon(): boolean {
    return this.skillIcon !== null
  }

  /**
   * 设置按下状态
   */
  setPressed(pressed: boolean): void {
    if (this.isPressed !== pressed) {
      this.isPressed = pressed
      this.drawBackground()
    }
  }

  /**
   * 获取按下状态
   */
  getPressed(): boolean {
    return this.isPressed
  }

  /**
   * 设置相邻高亮状态
   */
  setAdjacentHighlight(highlight: boolean): void {
    if (this.isAdjacentHighlighted !== highlight) {
      this.isAdjacentHighlighted = highlight
      this.drawBackground()
    }
  }

  /**
   * 获取相邻高亮状态
   */
  getAdjacentHighlight(): boolean {
    return this.isAdjacentHighlighted
  }

  /**
   * 播放触发动画
   * 效果: 放大 + 闪烁 + 恢复
   */
  playTriggerAnimation(): void {
    this.isAnimating = true
    this.animationScale = 1.2
    this.animationAlpha = 1.5 // 过曝效果
  }

  /**
   * 检查是否正在播放动画
   */
  getIsAnimating(): boolean {
    return this.isAnimating
  }

  /**
   * 获取当前动画缩放值
   */
  getAnimationScale(): number {
    return this.animationScale
  }

  /**
   * 每帧更新动画
   * @param dt delta time（秒）
   */
  update(dt: number): void {
    if (!this.isAnimating) return

    // 缩放恢复
    if (this.animationScale > 1.0) {
      this.animationScale -= dt * KeyVisual.SCALE_RECOVERY_SPEED
      if (this.animationScale < 1.0) {
        this.animationScale = 1.0
      }
      this.scale.set(this.animationScale)
    }

    // Alpha 恢复
    if (this.animationAlpha > 1.0) {
      this.animationAlpha -= dt * KeyVisual.ALPHA_RECOVERY_SPEED
      if (this.animationAlpha < 1.0) {
        this.animationAlpha = 1.0
        this.isAnimating = false
        // 确保 scale 最终重置为 1.0
        this.scale.set(1.0)
      }
      this.background.alpha = this.animationAlpha
    }
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    if (this.skillIcon) {
      this.skillIcon.destroy()
      this.skillIcon = null
    }
    super.destroy({ children: true })
  }
}
