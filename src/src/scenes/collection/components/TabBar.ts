// ============================================
// 打字肉鸽 - TabBar 组件
// ============================================
// Story 6.4: 图鉴场景 - 标签栏组件 (AC: #5)

import { Container, Graphics, Text } from 'pixi.js'

/**
 * 标签栏属性
 */
export interface TabBarProps {
  tabs: string[]
  activeIndex: number
  onTabChange: (index: number) => void
  width?: number
  height?: number
}

/**
 * TabBar - 标签栏组件
 *
 * 用于在图鉴场景中切换不同的标签页（技能/遗物/统计）
 */
export class TabBar extends Container {
  private props: TabBarProps
  private tabContainers: Container[] = []

  constructor(props: TabBarProps) {
    super()
    this.props = props
    this.render()
  }

  /**
   * 获取当前活跃标签索引
   */
  getActiveTab(): number {
    return this.props.activeIndex
  }

  /**
   * 设置活跃标签
   */
  setActiveTab(index: number): void {
    if (index < 0 || index >= this.props.tabs.length) return
    if (index === this.props.activeIndex) return

    this.props.activeIndex = index
    this.props.onTabChange(index)
    this.render()
  }

  /**
   * 切换到下一个标签
   */
  nextTab(): void {
    const nextIndex = (this.props.activeIndex + 1) % this.props.tabs.length
    this.setActiveTab(nextIndex)
  }

  /**
   * 切换到上一个标签
   */
  prevTab(): void {
    const prevIndex = (this.props.activeIndex - 1 + this.props.tabs.length) % this.props.tabs.length
    this.setActiveTab(prevIndex)
  }

  /**
   * 渲染标签栏
   */
  private render(): void {
    // 清空现有内容
    this.removeChildren()
    this.tabContainers = []

    const tabWidth = this.props.width ?? 100
    const tabHeight = this.props.height ?? 40
    const tabSpacing = 20
    const totalWidth = this.props.tabs.length * (tabWidth + tabSpacing) - tabSpacing
    const startX = -totalWidth / 2

    this.props.tabs.forEach((tabLabel, index) => {
      const isActive = index === this.props.activeIndex

      // 创建标签容器
      const tabContainer = new Container()
      tabContainer.x = startX + index * (tabWidth + tabSpacing)
      tabContainer.eventMode = 'static'
      tabContainer.cursor = 'pointer'

      // 绘制背景
      const bg = new Graphics()
      bg.roundRect(0, 0, tabWidth, tabHeight, 8)
      bg.fill(isActive ? 0x4ecdc4 : 0x333333)
      tabContainer.addChild(bg)

      // 绘制文本
      const text = new Text({
        text: tabLabel,
        style: {
          fontFamily: 'Arial',
          fontSize: 18,
          fill: isActive ? 0x000000 : 0xcccccc
        }
      })
      text.anchor.set(0.5)
      text.x = tabWidth / 2
      text.y = tabHeight / 2
      tabContainer.addChild(text)

      // 点击事件
      tabContainer.on('pointerdown', () => {
        this.setActiveTab(index)
      })

      this.addChild(tabContainer)
      this.tabContainers.push(tabContainer)
    })
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    this.tabContainers = []
    super.destroy({ children: true })
  }
}
