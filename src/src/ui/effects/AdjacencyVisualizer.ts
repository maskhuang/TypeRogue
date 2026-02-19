// ============================================
// 打字肉鸽 - AdjacencyVisualizer
// ============================================
// Story 7.4: 技能触发反馈 (AC: #4)
// 相邻联动可视化组件

import * as PIXI from 'pixi.js'

interface LineInstance {
  graphics: PIXI.Graphics
  elapsed: number
  duration: number
  fromX: number
  fromY: number
  toX: number
  toY: number
}

interface RippleInstance {
  graphics: PIXI.Graphics
  elapsed: number
  duration: number
  centerX: number
  centerY: number
  maxRadius: number
}

// 性能限制
const MAX_ACTIVE_LINES = 20
const MAX_ACTIVE_RIPPLES = 10

export class AdjacencyVisualizer {
  private container: PIXI.Container
  private activeLines: LineInstance[] = []
  private activeRipples: RippleInstance[] = []
  private graphicsPool: PIXI.Graphics[] = []

  constructor(parentContainer: PIXI.Container) {
    this.container = new PIXI.Container()
    this.container.label = 'adjacency-visualizer'
    parentContainer.addChild(this.container)
  }

  /**
   * 显示相邻连线效果
   * @param fromKey - 起始键位
   * @param toKey - 目标键位
   * @param keyPositions - 键位位置映射
   */
  showConnection(
    fromKey: string,
    toKey: string,
    keyPositions: Map<string, { x: number; y: number }>
  ): void {
    // 性能限制
    if (this.activeLines.length >= MAX_ACTIVE_LINES) {
      return
    }

    const fromPos = keyPositions.get(fromKey.toUpperCase())
    const toPos = keyPositions.get(toKey.toUpperCase())

    if (!fromPos || !toPos) return

    const graphics = this.graphicsPool.pop() || new PIXI.Graphics()
    graphics.clear()

    this.container.addChild(graphics)
    this.activeLines.push({
      graphics,
      elapsed: 0,
      duration: 0.3,
      fromX: fromPos.x,
      fromY: fromPos.y,
      toX: toPos.x,
      toY: toPos.y
    })
  }

  /**
   * 显示波纹扩散效果
   * @param centerKey - 中心键位
   * @param _adjacentKeys - 相邻键位列表（用于确定波纹范围）
   * @param keyPositions - 键位位置映射
   */
  showRipple(
    centerKey: string,
    _adjacentKeys: string[],
    keyPositions: Map<string, { x: number; y: number }>
  ): void {
    // 性能限制
    if (this.activeRipples.length >= MAX_ACTIVE_RIPPLES) {
      return
    }

    const centerPos = keyPositions.get(centerKey.toUpperCase())
    if (!centerPos) return

    const graphics = this.graphicsPool.pop() || new PIXI.Graphics()
    graphics.clear()

    this.container.addChild(graphics)
    this.activeRipples.push({
      graphics,
      elapsed: 0,
      duration: 0.4,
      centerX: centerPos.x,
      centerY: centerPos.y,
      maxRadius: 60
    })
  }

  /**
   * 每帧更新动画
   * @param deltaTime - 帧间隔时间（毫秒）
   */
  update(deltaTime: number): void {
    const dt = deltaTime * 0.001

    // 更新连线
    for (let i = this.activeLines.length - 1; i >= 0; i--) {
      const line = this.activeLines[i]
      line.elapsed += dt

      const progress = Math.min(line.elapsed / line.duration, 1)

      // 重绘连线
      line.graphics.clear()

      // 计算线条长度进度（先伸展后收缩）
      let lineProgress: number
      let alpha: number

      if (progress < 0.5) {
        // 伸展阶段
        lineProgress = progress * 2
        alpha = 1
      } else {
        // 收缩阶段
        lineProgress = 1 - (progress - 0.5) * 2
        alpha = 1 - (progress - 0.5) * 2
      }

      const endX = line.fromX + (line.toX - line.fromX) * lineProgress
      const endY = line.fromY + (line.toY - line.fromY) * lineProgress

      line.graphics.moveTo(line.fromX, line.fromY)
      line.graphics.lineTo(endX, endY)
      line.graphics.stroke({ width: 3, color: 0x9b59b6, alpha })

      // 完成后回收
      if (progress >= 1) {
        this.container.removeChild(line.graphics)
        this.graphicsPool.push(line.graphics)
        this.activeLines.splice(i, 1)
      }
    }

    // 更新波纹
    for (let i = this.activeRipples.length - 1; i >= 0; i--) {
      const ripple = this.activeRipples[i]
      ripple.elapsed += dt

      const progress = Math.min(ripple.elapsed / ripple.duration, 1)
      const radius = ripple.maxRadius * progress
      const alpha = 1 - progress

      ripple.graphics.clear()
      ripple.graphics.circle(ripple.centerX, ripple.centerY, radius)
      ripple.graphics.stroke({ width: 2, color: 0x4ecdc4, alpha })

      // 完成后回收
      if (progress >= 1) {
        this.container.removeChild(ripple.graphics)
        this.graphicsPool.push(ripple.graphics)
        this.activeRipples.splice(i, 1)
      }
    }
  }

  /**
   * 获取活动效果数量
   */
  getActiveCount(): number {
    return this.activeLines.length + this.activeRipples.length
  }

  /**
   * 清理所有效果
   */
  clear(): void {
    this.activeLines.forEach(line => {
      this.container.removeChild(line.graphics)
      this.graphicsPool.push(line.graphics)
    })
    this.activeLines = []

    this.activeRipples.forEach(ripple => {
      this.container.removeChild(ripple.graphics)
      this.graphicsPool.push(ripple.graphics)
    })
    this.activeRipples = []
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    this.clear()
    this.graphicsPool.forEach(g => g.destroy())
    this.graphicsPool = []
    this.container.destroy()
  }
}
