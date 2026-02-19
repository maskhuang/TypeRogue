// ============================================
// 打字肉鸽 - SkillTab 组件
// ============================================
// Story 6.4: 图鉴场景 - 技能图鉴标签页 (AC: #2, #7)

import { Container, Text } from 'pixi.js'
import { CollectionItem, CollectionItemData } from '../components/CollectionItem'
import { SKILLS } from '../../../data/skills'
import type { MetaState } from '../../../core/state/MetaState'

/**
 * SkillTab - 技能图鉴标签页
 *
 * 显示所有技能的图鉴，包括已解锁和未解锁的技能
 */
export class SkillTab extends Container {
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
   * 获取技能项数据列表
   */
  getSkillItems(): CollectionItemData[] {
    const unlockedSkills = new Set(this.metaState.getUnlockedSkills())

    return Object.entries(SKILLS).map(([skillId, skill]) => ({
      id: skillId,
      name: skill.name,
      description: skill.desc,
      icon: skill.icon,
      unlocked: unlockedSkills.has(skillId)
    }))
  }

  /**
   * 获取已解锁技能数量
   */
  getUnlockedCount(): number {
    return this.metaState.getUnlockedSkills().length
  }

  /**
   * 获取总技能数量
   */
  getTotalCount(): number {
    return Object.keys(SKILLS).length
  }

  /**
   * 渲染组件
   */
  private render(): void {
    // 清空现有内容
    this.removeChildren()
    this.items = []

    const skills = this.getSkillItems()
    const unlockedCount = this.getUnlockedCount()
    const totalCount = this.getTotalCount()

    // 标题
    this.headerText = new Text({
      text: `技能图鉴 (${unlockedCount}/${totalCount})`,
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

    skills.forEach((skillData, index) => {
      const item = new CollectionItem(skillData, {
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
