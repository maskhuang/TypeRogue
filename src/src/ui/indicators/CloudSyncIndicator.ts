// ============================================
// 打字肉鸽 - CloudSyncIndicator 云同步状态指示器
// ============================================
// Story 8.4: Steam 云存档 (AC: #6)

import { Container, Graphics, Text, TextStyle } from 'pixi.js'

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'conflict' | 'offline'

/**
 * 云同步状态指示器组件
 *
 * 功能:
 * - 显示云图标和当前同步状态
 * - 状态颜色编码: 绿色=已同步, 黄色=同步中, 红色=冲突, 灰色=离线
 * - 同步中时显示旋转动画
 *
 * 位置: 建议右上角或设置界面
 */
export class CloudSyncIndicator extends Container {
  private cloudIcon: Graphics
  private statusDot: Graphics
  private statusText: Text
  private currentStatus: SyncStatus = 'idle'
  private rotationSpeed: number = 0

  // 状态颜色映射
  private static readonly STATUS_COLORS: Record<SyncStatus, number> = {
    idle: 0xffffff,     // 白色
    syncing: 0xffff00,  // 黄色
    synced: 0x00ff00,   // 绿色
    conflict: 0xff0000, // 红色
    offline: 0x888888   // 灰色
  }

  private static readonly STATUS_LABELS: Record<SyncStatus, string> = {
    idle: '',
    syncing: '同步中...',
    synced: '已同步',
    conflict: '同步冲突',
    offline: '离线'
  }

  private static readonly TEXT_STYLE = new TextStyle({
    fontFamily: 'Arial',
    fontSize: 12,
    fill: 0xffffff
  })

  constructor() {
    super()
    this.label = 'CloudSyncIndicator'

    // 创建云图标
    this.cloudIcon = new Graphics()
    this.drawCloudIcon()
    this.addChild(this.cloudIcon)

    // 创建状态小圆点
    this.statusDot = new Graphics()
    this.statusDot.x = 24
    this.statusDot.y = -4
    this.updateStatusDot()
    this.addChild(this.statusDot)

    // 创建状态文本
    this.statusText = new Text({
      text: '',
      style: CloudSyncIndicator.TEXT_STYLE
    })
    this.statusText.x = 30
    this.statusText.y = 4
    this.addChild(this.statusText)
  }

  /**
   * 绘制简单的云图标
   */
  private drawCloudIcon(): void {
    this.cloudIcon.clear()

    // 使用当前状态的颜色
    const color = CloudSyncIndicator.STATUS_COLORS[this.currentStatus]

    // 简化的云形状
    this.cloudIcon
      .setStrokeStyle({ width: 2, color })
      .moveTo(6, 16)
      .lineTo(18, 16)
      .arcTo(22, 16, 22, 12, 4)
      .arcTo(22, 6, 16, 6, 4)
      .arcTo(14, 4, 10, 6, 4)
      .arcTo(4, 6, 4, 12, 4)
      .arcTo(4, 16, 6, 16, 4)
      .stroke()
  }

  /**
   * 更新状态小圆点
   */
  private updateStatusDot(): void {
    this.statusDot.clear()
    const color = CloudSyncIndicator.STATUS_COLORS[this.currentStatus]
    this.statusDot.circle(0, 0, 4).fill(color)
  }

  /**
   * 设置同步状态
   * @param status 新状态
   */
  setStatus(status: SyncStatus): void {
    if (this.currentStatus === status) return

    this.currentStatus = status

    // 更新图标颜色
    this.drawCloudIcon()

    // 更新状态点
    this.updateStatusDot()

    // 更新状态文本
    this.statusText.text = CloudSyncIndicator.STATUS_LABELS[status]

    // 设置旋转动画
    if (status === 'syncing') {
      this.rotationSpeed = 2 // 每秒旋转 2 弧度
    } else {
      this.rotationSpeed = 0
      this.cloudIcon.rotation = 0
    }
  }

  /**
   * 每帧更新（用于同步动画）
   * @param dt delta time（秒）
   */
  update(dt: number): void {
    if (this.rotationSpeed !== 0) {
      this.cloudIcon.rotation += this.rotationSpeed * dt
    }
  }

  /**
   * 获取当前状态（供测试使用）
   */
  getStatus(): SyncStatus {
    return this.currentStatus
  }

  /**
   * 获取状态文本（供测试使用）
   */
  getStatusText(): Text {
    return this.statusText
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    super.destroy({ children: true })
  }
}
