// ============================================
// 打字肉鸽 - ShopItemDisplay 商品显示组件
// ============================================
// Story 5.3 Task 3: 商品显示组件

import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { ShopItem } from './ShopConfig'

/**
 * 商品显示组件
 *
 * 职责:
 * - 显示商品信息（名称、价格、描述）
 * - 显示购买状态（可购买/金币不足/已购买）
 * - 处理选中状态
 */
export class ShopItemDisplay extends Container {
  private background: Graphics
  private nameText: Text
  private priceText: Text
  private descText: Text

  private _item: ShopItem | null = null
  private _selected = false
  private _affordable = true

  readonly displayWidth = 200
  readonly displayHeight = 120

  constructor() {
    super()
    this.background = new Graphics()
    this.addChild(this.background)

    // 名称文本
    const nameStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 16,
      fill: '#ffffff',
      fontWeight: 'bold'
    })
    this.nameText = new Text({ text: '', style: nameStyle })
    this.nameText.x = 10
    this.nameText.y = 10
    this.addChild(this.nameText)

    // 价格文本
    const priceStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 14,
      fill: '#ffe66d'
    })
    this.priceText = new Text({ text: '', style: priceStyle })
    this.priceText.x = 10
    this.priceText.y = 35
    this.addChild(this.priceText)

    // 描述文本
    const descStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 12,
      fill: '#aaaaaa',
      wordWrap: true,
      wordWrapWidth: 180
    })
    this.descText = new Text({ text: '', style: descStyle })
    this.descText.x = 10
    this.descText.y = 55
    this.addChild(this.descText)

    this.draw()
  }

  /**
   * 设置商品数据
   */
  setItem(item: ShopItem | null, name: string, description: string, actualPrice: number): void {
    this._item = item
    if (item) {
      this.nameText.text = name
      this.priceText.text = `${actualPrice} 金币`
      this.descText.text = description
    } else {
      this.nameText.text = ''
      this.priceText.text = ''
      this.descText.text = ''
    }
    this.draw()
  }

  /**
   * 设置选中状态
   */
  setSelected(selected: boolean): void {
    this._selected = selected
    this.draw()
  }

  /**
   * 设置是否买得起
   */
  setAffordable(affordable: boolean): void {
    this._affordable = affordable
    this.draw()
  }

  /**
   * 获取商品
   */
  get item(): ShopItem | null {
    return this._item
  }

  /**
   * 是否已购买
   */
  get isPurchased(): boolean {
    return this._item?.purchased ?? false
  }

  /**
   * 获取名称文本（用于测试）
   */
  getNameText(): string {
    return this.nameText.text
  }

  /**
   * 获取描述文本（用于测试）
   */
  getDescText(): string {
    return this.descText.text
  }

  private draw(): void {
    this.background.clear()

    // 背景色
    let bgColor = 0x2a2a3e
    let borderColor = 0x4a4a5e

    if (this._item?.purchased) {
      bgColor = 0x1a1a2e
      borderColor = 0x3a3a4e
    } else if (this._selected) {
      borderColor = 0x4ecdc4
    }

    if (!this._affordable && !this._item?.purchased) {
      this.priceText.style.fill = '#ff6b6b'
    } else {
      this.priceText.style.fill = '#ffe66d'
    }

    this.background.rect(0, 0, this.displayWidth, this.displayHeight)
    this.background.fill(bgColor)
    this.background.stroke({ width: 2, color: borderColor })

    // 已购买标记
    if (this._item?.purchased) {
      this.alpha = 0.5
    } else {
      this.alpha = 1
    }
  }
}
