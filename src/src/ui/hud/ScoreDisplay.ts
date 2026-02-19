// ============================================
// 打字肉鸽 - ScoreDisplay 分数显示组件
// ============================================
// Story 4.3 Task 1: 分数和倍率显示

import { Container, Text, TextStyle } from 'pixi.js'

/**
 * 分数显示组件
 *
 * 功能:
 * - 显示当前分数（带千位分隔符）
 * - 显示当前倍率
 * - 支持分数动画过渡（平滑数字变化）
 *
 * 位置: 左上角 (padding: 20px)
 */
export class ScoreDisplay extends Container {
  private scoreText: Text
  private multiplierText: Text
  private displayedScore: number = 0
  private targetScore: number = 0

  // 样式常量
  private static readonly SCORE_STYLE = new TextStyle({
    fontFamily: 'Arial',
    fontSize: 28,
    fontWeight: 'bold',
    fill: 0xffffff
  })

  private static readonly MULTIPLIER_STYLE = new TextStyle({
    fontFamily: 'Arial',
    fontSize: 20,
    fontStyle: 'italic',
    fill: 0xffd700 // 金色
  })

  constructor() {
    super()
    this.label = 'ScoreDisplay'

    // 创建分数文本
    this.scoreText = new Text({
      text: '0',
      style: ScoreDisplay.SCORE_STYLE
    })
    this.scoreText.x = 0
    this.scoreText.y = 0
    this.addChild(this.scoreText)

    // 创建倍率文本
    this.multiplierText = new Text({
      text: 'x1.0',
      style: ScoreDisplay.MULTIPLIER_STYLE
    })
    this.multiplierText.x = 0
    this.multiplierText.y = 35
    this.addChild(this.multiplierText)
  }

  /**
   * 更新分数（带动画过渡）
   * @param score 目标分数
   */
  setScore(score: number): void {
    this.targetScore = score
  }

  /**
   * 更新倍率
   * @param multiplier 倍率值
   */
  setMultiplier(multiplier: number): void {
    this.multiplierText.text = `x${multiplier.toFixed(1)}`
  }

  /**
   * 每帧更新（用于动画）
   * @param dt delta time（秒）
   */
  update(dt: number): void {
    // 平滑过渡分数显示
    if (this.displayedScore !== this.targetScore) {
      const diff = this.targetScore - this.displayedScore
      // 动画速度：每秒变化 diff 的 5 倍
      const step = Math.ceil(Math.abs(diff) * dt * 5)

      if (diff > 0) {
        this.displayedScore = Math.min(this.displayedScore + step, this.targetScore)
      } else {
        this.displayedScore = Math.max(this.displayedScore - step, this.targetScore)
      }

      this.scoreText.text = this.formatScore(this.displayedScore)
    }
  }

  /**
   * 格式化分数（添加千位分隔符）
   * @param score 分数值
   * @returns 格式化后的字符串
   */
  private formatScore(score: number): string {
    return score.toLocaleString('en-US')
  }

  /**
   * 获取当前显示的分数（供测试使用）
   */
  getDisplayedScore(): number {
    return this.displayedScore
  }

  /**
   * 获取目标分数（供测试使用）
   */
  getTargetScore(): number {
    return this.targetScore
  }

  /**
   * 获取分数文本对象（供测试使用）
   */
  getScoreText(): Text {
    return this.scoreText
  }

  /**
   * 获取倍率文本对象（供测试使用）
   */
  getMultiplierText(): Text {
    return this.multiplierText
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    super.destroy({ children: true })
  }
}
