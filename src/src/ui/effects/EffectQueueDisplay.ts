// ============================================
// 打字肉鸽 - EffectQueueDisplay
// ============================================
// Story 7.4: 技能触发反馈 (AC: #5)
// 效果队列显示组件

import * as PIXI from 'pixi.js'

export interface QueuedEffect {
  id: string
  skillId: string
  name: string
  type: 'damage' | 'buff' | 'debuff' | 'special'
}

interface QueueItemDisplay {
  container: PIXI.Container
  background: PIXI.Graphics
  text: PIXI.Text
  effect: QueuedEffect
}

interface EnqueueAnimation {
  item: QueueItemDisplay
  elapsed: number
  duration: number
  startX: number
  startY: number
  targetX: number
  targetY: number
}

const MAX_DISPLAY_COUNT = 5
const ITEM_WIDTH = 80
const ITEM_HEIGHT = 24
const ITEM_SPACING = 4
const ANIMATION_DURATION = 0.25

export class EffectQueueDisplay {
  private container: PIXI.Container
  private queueItems: QueueItemDisplay[] = []
  private activeAnimations: EnqueueAnimation[] = []
  private pool: QueueItemDisplay[] = []

  constructor(parentContainer: PIXI.Container) {
    this.container = new PIXI.Container()
    this.container.label = 'effect-queue-display'
    parentContainer.addChild(this.container)
  }

  /**
   * 更新队列显示
   * @param effects - 队列中的效果列表
   */
  updateQueue(effects: QueuedEffect[]): void {
    // 清理现有项目
    this.clearQueueItems()

    // 最多显示 MAX_DISPLAY_COUNT 个
    const displayEffects = effects.slice(0, MAX_DISPLAY_COUNT)

    displayEffects.forEach((effect, index) => {
      const item = this.createQueueItem(effect)
      item.container.position.set(0, index * (ITEM_HEIGHT + ITEM_SPACING))
      this.queueItems.push(item)
      this.container.addChild(item.container)
    })
  }

  /**
   * 高亮队首效果
   */
  highlightNext(): void {
    if (this.queueItems.length === 0) return

    const firstItem = this.queueItems[0]
    // 增加亮度/缩放以突出队首
    firstItem.container.scale.set(1.1)
    firstItem.background.alpha = 1.0
  }

  /**
   * 播放入队动画
   * @param effect - 入队的效果
   */
  playEnqueueAnimation(effect: QueuedEffect): void {
    const item = this.createQueueItem(effect)
    const targetY = this.queueItems.length * (ITEM_HEIGHT + ITEM_SPACING)

    // 从右侧滑入
    item.container.position.set(ITEM_WIDTH + 20, targetY)
    item.container.alpha = 0

    this.container.addChild(item.container)

    this.activeAnimations.push({
      item,
      elapsed: 0,
      duration: ANIMATION_DURATION,
      startX: ITEM_WIDTH + 20,
      startY: targetY,
      targetX: 0,
      targetY: targetY
    })
  }

  /**
   * 播放出队动画
   */
  playDequeueAnimation(): void {
    if (this.queueItems.length === 0) return

    const firstItem = this.queueItems[0]

    // 创建出队动画（向左滑出）
    this.activeAnimations.push({
      item: firstItem,
      elapsed: 0,
      duration: ANIMATION_DURATION,
      startX: 0,
      startY: 0,
      targetX: -ITEM_WIDTH - 20,
      targetY: 0
    })

    // 从队列中移除
    this.queueItems.shift()
  }

  /**
   * 设置位置
   * @param x - X坐标
   * @param y - Y坐标
   */
  setPosition(x: number, y: number): void {
    this.container.position.set(x, y)
  }

  /**
   * 每帧更新动画
   * @param deltaTime - 帧间隔时间（毫秒）
   */
  update(deltaTime: number): void {
    const dt = deltaTime * 0.001

    for (let i = this.activeAnimations.length - 1; i >= 0; i--) {
      const anim = this.activeAnimations[i]
      anim.elapsed += dt

      const progress = Math.min(anim.elapsed / anim.duration, 1)
      const eased = this.easeOutCubic(progress)

      // 更新位置
      anim.item.container.x = anim.startX + (anim.targetX - anim.startX) * eased
      anim.item.container.y = anim.startY + (anim.targetY - anim.startY) * eased

      // 入队动画：淡入
      if (anim.targetX === 0) {
        anim.item.container.alpha = eased
      }
      // 出队动画：淡出
      else if (anim.targetX < 0) {
        anim.item.container.alpha = 1 - eased
      }

      // 完成后清理
      if (progress >= 1) {
        // 出队动画完成后回收
        if (anim.targetX < 0) {
          this.container.removeChild(anim.item.container)
          this.recycleQueueItem(anim.item)
        }
        this.activeAnimations.splice(i, 1)
      }
    }
  }

  /**
   * 获取活动动画数量
   */
  getActiveAnimationCount(): number {
    return this.activeAnimations.length
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    this.clearQueueItems()
    this.activeAnimations.forEach(anim => {
      this.container.removeChild(anim.item.container)
      this.recycleQueueItem(anim.item)
    })
    this.activeAnimations = []
    this.pool.forEach(item => {
      item.container.destroy()
    })
    this.pool = []
    this.container.destroy()
  }

  /**
   * 创建队列项目显示
   */
  private createQueueItem(effect: QueuedEffect): QueueItemDisplay {
    // 尝试从池中获取
    const pooled = this.pool.pop()
    if (pooled) {
      pooled.text.text = effect.name
      pooled.effect = effect
      pooled.container.alpha = 1
      pooled.container.scale.set(1)
      return pooled
    }

    // 创建新项目
    const container = new PIXI.Container()
    container.label = `queue-item-${effect.id}`

    const background = new PIXI.Graphics()
    background.rect(0, 0, ITEM_WIDTH, ITEM_HEIGHT)
    background.fill({ color: 0x1a1a2e, alpha: 0.8 })
    background.stroke({ width: 1, color: 0x9b59b6, alpha: 0.6 })

    const text = new PIXI.Text({
      text: effect.name,
      style: {
        fontFamily: 'monospace',
        fontSize: 12,
        fill: '#ffffff'
      }
    })
    text.anchor.set(0.5)
    text.position.set(ITEM_WIDTH / 2, ITEM_HEIGHT / 2)

    container.addChild(background)
    container.addChild(text)

    return { container, background, text, effect }
  }

  /**
   * 回收队列项目到对象池
   */
  private recycleQueueItem(item: QueueItemDisplay): void {
    this.pool.push(item)
  }

  /**
   * 清理所有队列项目
   */
  private clearQueueItems(): void {
    this.queueItems.forEach(item => {
      this.container.removeChild(item.container)
      this.recycleQueueItem(item)
    })
    this.queueItems = []
  }

  /**
   * easeOutCubic 缓动函数
   */
  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3)
  }
}
