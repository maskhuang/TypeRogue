// ============================================
// 打字肉鸽 - EffectTextDisplay
// ============================================
// Story 7.4: 技能触发反馈 (AC: #3)
// 效果文字显示组件

import * as PIXI from 'pixi.js'

export interface EffectTextOptions {
  fontSize?: number
  color?: string
  duration?: number
  direction?: 'up' | 'down' | 'left' | 'right'
}

interface TextInstance {
  text: PIXI.Text
  elapsed: number
  duration: number
  startX: number
  startY: number
  targetX: number
  targetY: number
}

// 性能限制：最大同时活动的文字数量
const MAX_ACTIVE_TEXTS = 15

export class EffectTextDisplay {
  private container: PIXI.Container
  private activeTexts: TextInstance[] = []
  private pool: PIXI.Text[] = []

  constructor(parentContainer: PIXI.Container) {
    this.container = new PIXI.Container()
    this.container.label = 'effect-text-display'
    parentContainer.addChild(this.container)
  }

  /**
   * 显示效果文字
   * @param text - 文字内容
   * @param x - X坐标
   * @param y - Y坐标
   * @param options - 可选配置
   */
  show(text: string, x: number, y: number, options: EffectTextOptions = {}): void {
    // 性能限制：超过最大数量时跳过
    if (this.activeTexts.length >= MAX_ACTIVE_TEXTS) {
      return
    }

    const {
      fontSize = 18,
      color = '#9b59b6',
      duration = 0.6,
      direction = 'up'
    } = options

    const textObj = this.pool.pop() || new PIXI.Text({ text: '', style: {} })
    textObj.text = text
    textObj.style = {
      fontFamily: 'monospace',
      fontSize,
      fontWeight: 'bold',
      fill: color,
      stroke: { color: '#000', width: 2 }
    }
    textObj.anchor.set(0.5)
    textObj.position.set(x, y)
    textObj.alpha = 1
    textObj.scale.set(0.8)

    const offset = 25
    const targets: Record<string, { x: number; y: number }> = {
      up: { x, y: y - offset },
      down: { x, y: y + offset },
      left: { x: x - offset, y },
      right: { x: x + offset, y }
    }

    this.container.addChild(textObj)
    this.activeTexts.push({
      text: textObj,
      elapsed: 0,
      duration,
      startX: x,
      startY: y,
      targetX: targets[direction].x,
      targetY: targets[direction].y
    })
  }

  /**
   * 显示分数加成
   * @param value - 分数值
   * @param x - X坐标
   * @param y - Y坐标
   */
  showScoreBonus(value: number, x: number, y: number): void {
    const sign = value >= 0 ? '+' : ''
    this.show(`${sign}${value}分`, x, y, {
      color: '#ffe66d',
      fontSize: 20
    })
  }

  /**
   * 显示倍率加成
   * @param value - 倍率值
   * @param x - X坐标
   * @param y - Y坐标
   */
  showMultiplierBonus(value: number, x: number, y: number): void {
    this.show(`×${value.toFixed(1)}`, x, y, {
      color: '#4ecdc4',
      fontSize: 22
    })
  }

  /**
   * 显示技能名称
   * @param skillName - 技能名称
   * @param x - X坐标
   * @param y - Y坐标
   */
  showSkillName(skillName: string, x: number, y: number): void {
    this.show(skillName, x, y, {
      color: '#9b59b6',
      fontSize: 16,
      direction: 'up'
    })
  }

  /**
   * 每帧更新动画
   * @param deltaTime - 帧间隔时间（毫秒）
   */
  update(deltaTime: number): void {
    const dt = deltaTime * 0.001

    for (let i = this.activeTexts.length - 1; i >= 0; i--) {
      const item = this.activeTexts[i]
      item.elapsed += dt

      const progress = Math.min(item.elapsed / item.duration, 1)

      // 弹入效果 (easeOutBack)
      const scaleProgress = Math.min(progress * 3, 1)
      const scale = 0.8 + 0.2 * this.easeOutBack(scaleProgress)
      item.text.scale.set(scale)

      // 位置移动 (easeOutCubic)
      const moveEased = this.easeOutCubic(progress)
      item.text.x = item.startX + (item.targetX - item.startX) * moveEased
      item.text.y = item.startY + (item.targetY - item.startY) * moveEased

      // 淡出（progress > 0.6）
      if (progress > 0.6) {
        item.text.alpha = 1 - (progress - 0.6) / 0.4
      }

      // 完成后回收到对象池
      if (progress >= 1) {
        this.container.removeChild(item.text)
        this.pool.push(item.text)
        this.activeTexts.splice(i, 1)
      }
    }
  }

  /**
   * easeOutCubic 缓动函数
   */
  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3)
  }

  /**
   * easeOutBack 缓动函数
   */
  private easeOutBack(t: number): number {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  }

  /**
   * 获取活动文字数量
   */
  getActiveCount(): number {
    return this.activeTexts.length
  }

  /**
   * 清理所有文字
   */
  clear(): void {
    this.activeTexts.forEach(item => {
      this.container.removeChild(item.text)
      this.pool.push(item.text)
    })
    this.activeTexts = []
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    this.clear()
    this.pool.forEach(t => t.destroy())
    this.pool = []
    this.container.destroy()
  }
}
