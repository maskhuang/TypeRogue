// ============================================
// 打字肉鸽 - ScorePopup 分数飘字组件
// ============================================
// Story 7.3: 粒子效果系统 (AC: #2)

import * as PIXI from 'pixi.js'

/**
 * 分数飘字选项
 */
export interface ScorePopupOptions {
  /** 字体大小（基础） */
  fontSize?: number
  /** 颜色 */
  color?: string
  /** 是否使用动态字号（分数越高越大） */
  dynamicSize?: boolean
  /** 飘字持续时间（秒） */
  duration?: number
}

/**
 * 飘字实例
 */
interface PopupInstance {
  text: PIXI.Text
  elapsed: number
  duration: number
  startY: number
  targetY: number
  startScale: number
}

/**
 * ScorePopup - 分数飘字组件
 *
 * 在指定位置显示分数飘字，支持动画效果（向上漂浮、缩放、淡出）。
 *
 * 特性:
 * - 分数越高，字体越大/颜色越亮 (AC: #2)
 * - 对象池复用减少 GC
 * - 平滑的缓动动画
 */
export class ScorePopup {
  private container: PIXI.Container
  private activePopups: PopupInstance[] = []
  private pool: PIXI.Text[] = []

  constructor(parentContainer: PIXI.Container) {
    this.container = new PIXI.Container()
    this.container.label = 'score-popups'
    parentContainer.addChild(this.container)
  }

  /**
   * 显示分数飘字
   */
  show(score: number, x: number, y: number, options: ScorePopupOptions = {}): void {
    const {
      fontSize = this.calculateFontSize(score),
      color = this.calculateColor(score),
      duration = 0.8
    } = options

    // 从池中获取或创建新文本
    const text = this.pool.pop() || this.createText()

    text.text = `+${score.toLocaleString()}`
    text.style.fontSize = fontSize
    text.style.fill = color

    text.anchor.set(0.5)
    text.position.set(x, y)
    text.alpha = 1
    text.scale.set(0.5)

    this.container.addChild(text)
    this.activePopups.push({
      text,
      elapsed: 0,
      duration: duration * 1000, // 转换为毫秒
      startY: y,
      targetY: y - 50,
      startScale: 0.5
    })
  }

  /**
   * 显示倍率飘字
   */
  showMultiplier(multiplier: number, x: number, y: number): void {
    const text = this.pool.pop() || this.createText()

    text.text = `×${multiplier.toFixed(1)}`
    text.style.fontSize = 24
    text.style.fill = '#ffe66d' // 金色

    text.anchor.set(0.5)
    text.position.set(x, y)
    text.alpha = 1
    text.scale.set(0.5)

    this.container.addChild(text)
    this.activePopups.push({
      text,
      elapsed: 0,
      duration: 600, // 0.6 秒
      startY: y,
      targetY: y - 30,
      startScale: 0.5
    })
  }

  /**
   * 更新飘字动画
   * @param deltaTime 帧时间（毫秒）
   */
  update(deltaTime: number): void {
    for (let i = this.activePopups.length - 1; i >= 0; i--) {
      const popup = this.activePopups[i]
      popup.elapsed += deltaTime

      const progress = Math.min(popup.elapsed / popup.duration, 1)
      const eased = this.easeOutCubic(progress)

      // 更新位置
      popup.text.y = popup.startY + (popup.targetY - popup.startY) * eased

      // 更新缩放（弹入效果）
      const scaleProgress = Math.min(progress * 3, 1)
      const scale = popup.startScale + (1 - popup.startScale) * this.easeOutBack(scaleProgress)
      popup.text.scale.set(scale)

      // 更新透明度（后半段淡出）
      if (progress > 0.5) {
        popup.text.alpha = 1 - (progress - 0.5) * 2
      }

      // 移除完成的弹窗
      if (progress >= 1) {
        this.container.removeChild(popup.text)
        // 放回对象池
        if (this.pool.length < 20) {
          this.pool.push(popup.text)
        } else {
          popup.text.destroy()
        }
        this.activePopups.splice(i, 1)
      }
    }
  }

  /**
   * 创建文本对象
   */
  private createText(): PIXI.Text {
    return new PIXI.Text({
      text: '',
      style: {
        fontFamily: 'monospace',
        fontSize: 24,
        fontWeight: 'bold',
        fill: '#ffffff',
        stroke: { color: '#000000', width: 3 },
        dropShadow: {
          color: '#000000',
          blur: 2,
          distance: 1,
          alpha: 0.5
        }
      }
    })
  }

  /**
   * 根据分数计算字体大小
   */
  private calculateFontSize(score: number): number {
    if (score >= 1000) return 36
    if (score >= 500) return 32
    if (score >= 100) return 28
    return 24
  }

  /**
   * 根据分数计算颜色
   */
  private calculateColor(score: number): string {
    if (score >= 1000) return '#ffe66d' // 金色
    if (score >= 500) return '#9b59b6'  // 紫色
    if (score >= 100) return '#4ecdc4'  // 青色
    return '#eaeaea' // 白色
  }

  /**
   * 缓出立方
   */
  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3)
  }

  /**
   * 缓出回弹
   */
  private easeOutBack(t: number): number {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  }

  /**
   * 获取活动飘字数量
   */
  getActiveCount(): number {
    return this.activePopups.length
  }

  /**
   * 清理所有飘字
   */
  clear(): void {
    for (const popup of this.activePopups) {
      this.container.removeChild(popup.text)
      if (this.pool.length < 20) {
        this.pool.push(popup.text)
      } else {
        popup.text.destroy()
      }
    }
    this.activePopups = []
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.clear()
    for (const text of this.pool) {
      text.destroy()
    }
    this.pool = []
    this.container.destroy()
  }
}
