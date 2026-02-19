// ============================================
// 打字肉鸽 - RelicTab 组件
// ============================================
// Story 6.4: 图鉴场景 - 遗物图鉴标签页 (AC: #3, #7)

import { Container, Text } from 'pixi.js'
import { CollectionItem, CollectionItemData } from '../components/CollectionItem'
import { RELICS } from '../../../data/relics'
import type { MetaState } from '../../../core/state/MetaState'

/**
 * RelicTab - 遗物图鉴标签页
 *
 * 显示所有遗物的图鉴，包括已解锁和未解锁的遗物
 * 按稀有度分组显示：普通 → 稀有 → 传说
 */
export class RelicTab extends Container {
  private metaState: MetaState
  private items: CollectionItem[] = []
  private gridContainer: Container | null = null
  private headerText: Text | null = null

  constructor(metaState: MetaState) {
    super()
    this.metaState = metaState
    this.render()
  }

  /**
   * 获取遗物项数据列表
   */
  getRelicItems(): CollectionItemData[] {
    const unlockedRelics = new Set(this.metaState.getUnlockedRelics())

    return Object.entries(RELICS).map(([relicId, relic]) => ({
      id: relicId,
      name: relic.name,
      description: relic.description,
      icon: relic.icon,
      unlocked: unlockedRelics.has(relicId)
    }))
  }

  /**
   * 获取已解锁遗物数量
   */
  getUnlockedCount(): number {
    return this.metaState.getUnlockedRelics().length
  }

  /**
   * 获取总遗物数量
   */
  getTotalCount(): number {
    return Object.keys(RELICS).length
  }

  /**
   * 渲染组件
   */
  private render(): void {
    // 清空现有内容
    this.removeChildren()
    this.items = []

    const relics = this.getRelicItems()
    const unlockedCount = this.getUnlockedCount()
    const totalCount = this.getTotalCount()

    // 标题
    this.headerText = new Text({
      text: `遗物图鉴 (${unlockedCount}/${totalCount})`,
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

    // 网格容器
    this.gridContainer = new Container()
    this.gridContainer.y = 50
    this.addChild(this.gridContainer)

    // 网格布局
    const itemWidth = 130
    const itemHeight = 150
    const columns = 5
    const spacing = 10
    const totalWidth = columns * (itemWidth + spacing) - spacing
    const startX = -totalWidth / 2

    relics.forEach((relicData, index) => {
      const item = new CollectionItem(relicData, {
        width: itemWidth - spacing,
        height: itemHeight - spacing
      })

      const col = index % columns
      const row = Math.floor(index / columns)

      item.x = startX + col * itemWidth
      item.y = row * itemHeight

      this.gridContainer!.addChild(item)
      this.items.push(item)
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
    const totalCount = this.getTotalCount()
    const columns = 5
    const itemHeight = 150
    const rows = Math.ceil(totalCount / columns)
    return 50 + rows * itemHeight // 标题高度 + 网格高度
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    this.items.forEach(item => item.destroy())
    this.items = []
    this.gridContainer = null
    this.headerText = null
    super.destroy({ children: true })
  }
}
