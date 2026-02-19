// ============================================
// 打字肉鸽 - CollectionItem 组件
// ============================================
// Story 6.4: 图鉴场景 - 图鉴项组件 (AC: #2, #3)

import { Container, Graphics, Text } from 'pixi.js'

/**
 * 图鉴项数据
 */
export interface CollectionItemData {
  id: string
  name: string
  description: string
  icon: string
  unlocked: boolean
  unlockCondition?: string
}

/**
 * 图鉴项配置
 */
export interface CollectionItemConfig {
  width?: number
  height?: number
  showDescription?: boolean
}

/**
 * CollectionItem - 图鉴项组件
 *
 * 用于显示单个技能或遗物的图鉴项
 * - 已解锁：显示图标、名称、描述
 * - 未解锁：显示灰色剪影、"???"、解锁条件
 */
export class CollectionItem extends Container {
  private data: CollectionItemData
  private config: CollectionItemConfig

  private background: Graphics | null = null
  private iconText: Text | null = null
  private nameText: Text | null = null
  private descText: Text | null = null

  constructor(data: CollectionItemData, config: CollectionItemConfig = {}) {
    super()
    this.data = data
    this.config = {
      width: config.width ?? 120,
      height: config.height ?? 140,
      showDescription: config.showDescription ?? true
    }
    this.render()
  }

  /**
   * 获取项目数据
   */
  getData(): CollectionItemData {
    return { ...this.data }
  }

  /**
   * 获取项目 ID
   */
  getId(): string {
    return this.data.id
  }

  /**
   * 检查是否已解锁
   */
  isUnlocked(): boolean {
    return this.data.unlocked
  }

  /**
   * 设置解锁状态
   */
  setUnlocked(unlocked: boolean): void {
    if (this.data.unlocked !== unlocked) {
      this.data.unlocked = unlocked
      this.render()
    }
  }

  /**
   * 渲染组件
   */
  private render(): void {
    // 清空现有内容
    this.removeChildren()

    const width = this.config.width!
    const height = this.config.height!
    const isUnlocked = this.data.unlocked

    // 背景
    this.background = new Graphics()
    this.background.roundRect(0, 0, width, height, 8)
    this.background.fill(isUnlocked ? 0x2a2a3e : 0x1a1a1a)
    this.background.stroke({ width: 2, color: isUnlocked ? 0x4ecdc4 : 0x333333 })
    this.addChild(this.background)

    // 图标
    this.iconText = new Text({
      text: isUnlocked ? this.data.icon : '❓',
      style: {
        fontFamily: 'Arial',
        fontSize: 32,
        fill: isUnlocked ? 0xffffff : 0x555555
      }
    })
    this.iconText.anchor.set(0.5)
    this.iconText.x = width / 2
    this.iconText.y = 40
    this.addChild(this.iconText)

    // 名称
    this.nameText = new Text({
      text: isUnlocked ? this.data.name : '???',
      style: {
        fontFamily: 'Arial',
        fontSize: 14,
        fill: isUnlocked ? 0xffffff : 0x666666,
        fontWeight: 'bold'
      }
    })
    this.nameText.anchor.set(0.5, 0)
    this.nameText.x = width / 2
    this.nameText.y = 70
    this.addChild(this.nameText)

    // 描述（如果启用）
    if (this.config.showDescription) {
      const descContent = isUnlocked
        ? this.data.description
        : (this.data.unlockCondition || '???')

      this.descText = new Text({
        text: descContent,
        style: {
          fontFamily: 'Arial',
          fontSize: 11,
          fill: isUnlocked ? 0xaaaaaa : 0x555555,
          wordWrap: true,
          wordWrapWidth: width - 16,
          align: 'center'
        }
      })
      this.descText.anchor.set(0.5, 0)
      this.descText.x = width / 2
      this.descText.y = 95
      this.addChild(this.descText)
    }
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    this.background = null
    this.iconText = null
    this.nameText = null
    this.descText = null
    super.destroy({ children: true })
  }
}
