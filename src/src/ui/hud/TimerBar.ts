// ============================================
// 打字肉鸽 - TimerBar 倒计时进度条组件
// ============================================
// Story 4.3 Task 2: 倒计时进度条

import { Container, Graphics, Text, TextStyle } from 'pixi.js'

/**
 * 倒计时进度条组件
 *
 * 功能:
 * - 显示剩余时间进度条
 * - 时间低于 10 秒时变红闪烁
 * - 显示剩余秒数
 *
 * 位置: 底部居中 (padding: 20px)
 */
export class TimerBar extends Container {
  private barBackground: Graphics
  private barFill: Graphics
  private timeText: Text

  private barWidth: number
  private barHeight: number = 20
  private totalTime: number = 60
  private currentTime: number = 60

  // 闪烁动画相关
  private blinkTimer: number = 0
  private readonly WARNING_THRESHOLD = 10 // 警告阈值（秒）

  // 颜色常量
  private static readonly COLOR_BACKGROUND = 0x333333
  private static readonly COLOR_NORMAL = 0x4caf50 // 绿色
  private static readonly COLOR_WARNING = 0xff5252 // 红色

  private static readonly TEXT_STYLE = new TextStyle({
    fontFamily: 'Arial',
    fontSize: 16,
    fontWeight: 'bold',
    fill: 0xffffff
  })

  constructor(width: number) {
    super()
    this.label = 'TimerBar'
    this.barWidth = width

    // 创建背景
    this.barBackground = new Graphics()
    this.drawBackground()
    this.addChild(this.barBackground)

    // 创建填充
    this.barFill = new Graphics()
    this.drawFill(1.0)
    this.addChild(this.barFill)

    // 创建时间文本
    this.timeText = new Text({
      text: `${this.currentTime}s`,
      style: TimerBar.TEXT_STYLE
    })
    this.timeText.x = this.barWidth + 10
    this.timeText.y = 0 // 顶部对齐，避免访问 height（需要 canvas）
    this.addChild(this.timeText)
  }

  /**
   * 绘制背景
   */
  private drawBackground(): void {
    this.barBackground.clear()
    this.barBackground.roundRect(0, 0, this.barWidth, this.barHeight, 10)
    this.barBackground.fill({ color: TimerBar.COLOR_BACKGROUND })
  }

  /**
   * 绘制填充
   * @param progress 进度 (0-1)
   */
  private drawFill(progress: number): void {
    this.barFill.clear()
    const fillWidth = Math.max(0, this.barWidth * progress)
    if (fillWidth > 0) {
      const color = this.isWarning() ? TimerBar.COLOR_WARNING : TimerBar.COLOR_NORMAL
      this.barFill.roundRect(0, 0, fillWidth, this.barHeight, 10)
      this.barFill.fill({ color })
    }
  }

  /**
   * 设置总时间
   * @param time 总时间（秒）
   */
  setTotalTime(time: number): void {
    this.totalTime = time
    this.currentTime = time
    this.updateBar()
  }

  /**
   * 更新当前时间
   * @param time 当前剩余时间（秒）
   */
  setCurrentTime(time: number): void {
    this.currentTime = Math.max(0, time)
    this.updateBar()
  }

  /**
   * 更新进度条显示
   */
  private updateBar(): void {
    const progress = this.getProgress()
    this.drawFill(progress)
    this.timeText.text = `${Math.ceil(this.currentTime)}s`
  }

  /**
   * 获取当前进度 (0-1)
   */
  getProgress(): number {
    if (this.totalTime <= 0) return 0
    return this.currentTime / this.totalTime
  }

  /**
   * 检查是否处于警告状态
   */
  isWarning(): boolean {
    return this.currentTime < this.WARNING_THRESHOLD
  }

  /**
   * 每帧更新（用于闪烁动画）
   * @param dt delta time（秒）
   */
  update(dt: number): void {
    if (this.isWarning()) {
      // 闪烁效果
      this.blinkTimer += dt * 4 // 闪烁频率
      const alpha = 0.5 + Math.sin(this.blinkTimer) * 0.5
      this.barFill.alpha = alpha
    } else {
      this.barFill.alpha = 1
      this.blinkTimer = 0
    }
  }

  /**
   * 获取总时间（供测试使用）
   */
  getTotalTime(): number {
    return this.totalTime
  }

  /**
   * 获取当前时间（供测试使用）
   */
  getCurrentTime(): number {
    return this.currentTime
  }

  /**
   * 获取时间文本对象（供测试使用）
   */
  getTimeText(): Text {
    return this.timeText
  }

  /**
   * 获取填充图形（供测试使用）
   */
  getBarFill(): Graphics {
    return this.barFill
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    super.destroy({ children: true })
  }
}
