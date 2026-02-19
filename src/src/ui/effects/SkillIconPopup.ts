// ============================================
// 打字肉鸽 - SkillIconPopup
// ============================================
// Story 7.4: 技能触发反馈 (AC: #1)
// 技能图标弹出动画组件

import * as PIXI from 'pixi.js'

interface PopupInstance {
  sprite: PIXI.Sprite
  elapsed: number
  duration: number
  startY: number
  targetY: number
}

// 性能限制：最大同时活动的弹出数量
const MAX_ACTIVE_POPUPS = 10

export class SkillIconPopup {
  private container: PIXI.Container
  private activePopups: PopupInstance[] = []
  private pool: PIXI.Sprite[] = []
  private defaultTexture: PIXI.Texture | null = null

  constructor(parentContainer: PIXI.Container) {
    this.container = new PIXI.Container()
    this.container.label = 'skill-icon-popups'
    parentContainer.addChild(this.container)
  }

  /**
   * 播放图标弹出动画
   * @param skillId - 技能ID（用于后续加载特定图标）
   * @param x - 起始X坐标
   * @param y - 起始Y坐标
   * @param texture - 可选的自定义纹理
   */
  play(_skillId: string, x: number, y: number, texture?: PIXI.Texture): void {
    // 性能限制：超过最大数量时跳过
    if (this.activePopups.length >= MAX_ACTIVE_POPUPS) {
      return
    }

    const sprite = this.pool.pop() || new PIXI.Sprite()
    sprite.texture = texture || this.getDefaultTexture()
    sprite.anchor.set(0.5)
    sprite.position.set(x, y)
    sprite.scale.set(0.5)
    sprite.alpha = 1
    // 设置紫色色调
    sprite.tint = 0x9b59b6

    this.container.addChild(sprite)
    this.activePopups.push({
      sprite,
      elapsed: 0,
      duration: 0.4,
      startY: y,
      targetY: y - 40
    })
  }

  /**
   * 每帧更新动画
   * @param deltaTime - 帧间隔时间（毫秒）
   */
  update(deltaTime: number): void {
    const dt = deltaTime * 0.001

    for (let i = this.activePopups.length - 1; i >= 0; i--) {
      const popup = this.activePopups[i]
      popup.elapsed += dt

      const progress = Math.min(popup.elapsed / popup.duration, 1)
      const eased = this.easeOutCubic(progress)

      // 位置：向上飘动
      popup.sprite.y = popup.startY + (popup.targetY - popup.startY) * eased

      // 缩放：0.5 → 1.2 → 0.8
      let scaleCurve: number
      if (progress < 0.5) {
        // 伸展阶段：0.5 → 1.2
        scaleCurve = 0.5 + 0.7 * (progress * 2)
      } else {
        // 收缩阶段：1.2 → 0.8
        scaleCurve = 1.2 - 0.4 * ((progress - 0.5) * 2)
      }
      popup.sprite.scale.set(scaleCurve)

      // 透明度：后半段淡出（progress > 0.6）
      if (progress > 0.6) {
        popup.sprite.alpha = 1 - (progress - 0.6) / 0.4
      }

      // 完成后回收到对象池
      if (progress >= 1) {
        this.container.removeChild(popup.sprite)
        this.pool.push(popup.sprite)
        this.activePopups.splice(i, 1)
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
   * 获取默认纹理（紫色圆形图标）
   */
  private getDefaultTexture(): PIXI.Texture {
    if (!this.defaultTexture) {
      // 使用 WHITE 纹理作为占位符
      // 实际使用时可以通过 renderer 生成程序化纹理
      this.defaultTexture = PIXI.Texture.WHITE
    }
    return this.defaultTexture
  }

  /**
   * 获取活动弹出数量
   */
  getActiveCount(): number {
    return this.activePopups.length
  }

  /**
   * 清理所有弹出
   */
  clear(): void {
    this.activePopups.forEach(popup => {
      this.container.removeChild(popup.sprite)
      this.pool.push(popup.sprite)
    })
    this.activePopups = []
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    this.clear()
    this.pool.forEach(s => s.destroy())
    this.pool = []
    this.container.destroy()
  }
}
