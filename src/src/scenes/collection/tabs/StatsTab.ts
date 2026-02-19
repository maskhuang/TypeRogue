// ============================================
// 打字肉鸽 - StatsTab 组件
// ============================================
// Story 6.4: 图鉴场景 - 统计标签页 (AC: #4)

import { Container, Text, Graphics } from 'pixi.js'
import type { MetaState, MetaStats } from '../../../core/state/MetaState'

/**
 * 统计项配置
 */
interface StatItem {
  label: string
  getValue: (stats: MetaStats) => string
}

/**
 * 统计项列表
 */
const STAT_ITEMS: StatItem[] = [
  { label: '总局数', getValue: (s) => s.totalRuns.toString() },
  { label: '胜利局数', getValue: (s) => s.victories.toString() },
  { label: '胜率', getValue: (s) => s.totalRuns > 0 ? `${Math.round((s.victories / s.totalRuns) * 100)}%` : '0%' },
  { label: '最高分', getValue: (s) => s.highestScore.toLocaleString() },
  { label: '总游戏时间', getValue: (s) => formatTime(s.totalPlayTime) },
  { label: '总击键数', getValue: (s) => s.totalKeystrokes.toLocaleString() },
  { label: '总完成词语', getValue: (s) => s.totalWordsCompleted.toLocaleString() },
  { label: '历史最高连击', getValue: (s) => s.longestCombo.toString() },
  { label: '完美通关次数', getValue: (s) => s.perfectRunCount.toString() },
]

/**
 * 格式化时间（毫秒 → 可读格式）
 */
function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}小时${minutes % 60}分`
  } else if (minutes > 0) {
    return `${minutes}分${seconds % 60}秒`
  } else {
    return `${seconds}秒`
  }
}

/**
 * StatsTab - 统计标签页
 *
 * 显示玩家的游戏统计数据
 */
export class StatsTab extends Container {
  private metaState: MetaState
  private headerText: Text | null = null
  private statsContainer: Container | null = null

  constructor(metaState: MetaState) {
    super()
    this.metaState = metaState
    this.render()
  }

  /**
   * 获取统计数据
   */
  getStats(): MetaStats {
    return this.metaState.getStats()
  }

  /**
   * 渲染组件
   */
  private render(): void {
    // 清空现有内容
    this.removeChildren()

    const stats = this.getStats()

    // 标题
    this.headerText = new Text({
      text: '游戏统计',
      style: {
        fontFamily: 'Arial',
        fontSize: 24,
        fill: 0xffffff
      }
    })
    this.headerText.anchor.set(0.5, 0)
    this.headerText.x = 0
    this.headerText.y = 0
    this.addChild(this.headerText)

    // 统计容器
    this.statsContainer = new Container()
    this.statsContainer.y = 50
    this.addChild(this.statsContainer)

    // 渲染统计项
    const itemHeight = 50
    const cardWidth = 400
    const cardPadding = 16

    STAT_ITEMS.forEach((item, index) => {
      const y = index * itemHeight

      // 背景卡片
      const bg = new Graphics()
      bg.roundRect(-cardWidth / 2, 0, cardWidth, itemHeight - 8, 8)
      bg.fill(index % 2 === 0 ? 0x2a2a3e : 0x252538)
      bg.y = y
      this.statsContainer!.addChild(bg)

      // 标签
      const labelText = new Text({
        text: item.label,
        style: {
          fontFamily: 'Arial',
          fontSize: 16,
          fill: 0xaaaaaa
        }
      })
      labelText.anchor.set(0, 0.5)
      labelText.x = -cardWidth / 2 + cardPadding
      labelText.y = y + (itemHeight - 8) / 2
      this.statsContainer!.addChild(labelText)

      // 数值
      const valueText = new Text({
        text: item.getValue(stats),
        style: {
          fontFamily: 'Arial',
          fontSize: 18,
          fill: 0x4ecdc4,
          fontWeight: 'bold'
        }
      })
      valueText.anchor.set(1, 0.5)
      valueText.x = cardWidth / 2 - cardPadding
      valueText.y = y + (itemHeight - 8) / 2
      this.statsContainer!.addChild(valueText)
    })
  }

  /**
   * 刷新数据
   */
  refresh(): void {
    this.render()
  }

  /**
   * 获取内容高度（用于滚动）
   */
  getContentHeight(): number {
    const itemHeight = 50
    return 50 + STAT_ITEMS.length * itemHeight // 标题高度 + 统计项高度
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    this.headerText = null
    this.statsContainer = null
    super.destroy({ children: true })
  }
}
