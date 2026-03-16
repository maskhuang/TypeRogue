// ============================================
// 打字肉鸽 - 图鉴场景
// ============================================
// Story 6.4: 图鉴场景 - CollectionScene (AC: #1, #8, #10)

import { Container, Text, Graphics } from 'pixi.js'
import { BaseScene } from '../BaseScene'
import { eventBus } from '../../core/events/EventBus'
import { tutorialManager } from '../../systems/tutorial/TutorialManager'
import { t } from '../../demo/demo-i18n'

/**
 * 标签页类型
 */
type TabType = 'skills' | 'relics' | 'stats' | 'leaderboard'

/**
 * 标签页定义
 */
const TABS: { type: TabType; label: string }[] = [
  { type: 'skills', label: '技能' },
  { type: 'relics', label: '遗物' },
  { type: 'stats', label: '统计' },
  { type: 'leaderboard', label: '排行榜' },
]

/**
 * CollectionScene - 图鉴场景
 *
 * 显示玩家已解锁的技能、遗物和游戏统计数据。
 *
 * 职责:
 * - 展示技能图鉴（已解锁/未解锁）
 * - 展示遗物图鉴（已解锁/未解锁）
 * - 展示统计数据
 * - 支持 Tab 切换和键盘导航
 */
export class CollectionScene extends BaseScene {
  readonly name = 'CollectionScene'

  private currentTabIndex = 0
  private scrollOffset = 0
  private keyHandler: ((e: KeyboardEvent) => void) | null = null
  private returnToMenuCallback: (() => void) | null = null

  // UI 组件
  private titleText: Text | null = null
  private tabContainer: Container | null = null
  private contentContainer: Container | null = null

  constructor() {
    super()
  }

  /**
   * 场景进入
   */
  onEnter(): void {
    super.onEnter()
    this.setupUI()
    this.setupKeyboardInput()
    this.renderCurrentTab()

    // 发送场景切换事件 (AC: #10)
    eventBus.emit('scene:change', {
      from: null,
      to: 'collection',
      action: 'push'
    })
  }

  /**
   * 场景退出
   */
  onExit(): void {
    this.cleanup()
    super.onExit()
  }

  /**
   * 每帧更新
   */
  update(_dt: number): void {
    // 图鉴场景不需要每帧更新逻辑
  }

  /**
   * 渲染（由 PixiJS 自动处理）
   */
  render(): void {
    // PixiJS 自动渲染
  }

  // ===========================================
  // 公开 API（供测试和外部调用）
  // ===========================================

  /**
   * 获取标签页数量
   */
  getTabCount(): number {
    return TABS.length
  }

  /**
   * 获取当前标签页索引
   */
  getCurrentTabIndex(): number {
    return this.currentTabIndex
  }

  /**
   * 切换标签页
   * @param direction 正数向右，负数向左
   */
  switchTab(direction: number): void {
    const newIndex = this.currentTabIndex + direction
    const tabCount = TABS.length

    // 循环切换
    if (newIndex < 0) {
      this.currentTabIndex = tabCount - 1
    } else if (newIndex >= tabCount) {
      this.currentTabIndex = 0
    } else {
      this.currentTabIndex = newIndex
    }

    this.scrollOffset = 0 // 切换标签时重置滚动
    this.renderCurrentTab()
  }

  /**
   * 获取当前滚动偏移
   */
  getScrollOffset(): number {
    return this.scrollOffset
  }

  /**
   * 滚动内容
   * @param direction 正数向下，负数向上
   */
  scroll(direction: number): void {
    const scrollStep = 50
    const newOffset = this.scrollOffset + direction * scrollStep

    // 限制滚动范围（不能滚动到负值）
    this.scrollOffset = Math.max(0, newOffset)

    this.updateContentPosition()
  }

  /**
   * 设置返回菜单回调
   */
  onReturnToMenu(callback: () => void): void {
    this.returnToMenuCallback = callback
  }

  /**
   * 处理键盘按下事件
   */
  handleKeyDown(e: KeyboardEvent): void {
    if (this.isDestroyed) return

    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.switchTab(-1)
        break
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.switchTab(1)
        break
      case 'ArrowUp':
      case 'w':
      case 'W':
        this.scroll(-1)
        break
      case 'ArrowDown':
      case 's':
      case 'S':
        this.scroll(1)
        break
      case 'Escape':
        this.returnToMenu()
        break
    }
  }

  // ===========================================
  // 私有方法
  // ===========================================

  /**
   * 设置 UI
   */
  private setupUI(): void {
    // 标题
    this.titleText = new Text({
      text: '图鉴',
      style: {
        fontFamily: 'Arial',
        fontSize: 36,
        fill: 0xffffff,
        fontWeight: 'bold'
      }
    })
    this.titleText.x = 400
    this.titleText.y = 30
    this.titleText.anchor.set(0.5, 0)
    this.container.addChild(this.titleText)

    // 标签栏
    this.tabContainer = new Container()
    this.tabContainer.y = 80
    this.container.addChild(this.tabContainer)
    this.renderTabs()

    // 内容区域
    this.contentContainer = new Container()
    this.contentContainer.y = 140
    this.container.addChild(this.contentContainer)
  }

  /**
   * 渲染标签栏
   */
  private renderTabs(): void {
    if (!this.tabContainer) return

    // 清空现有标签
    this.tabContainer.removeChildren()

    const tabWidth = 100
    const tabSpacing = 20
    const startX = 400 - (TABS.length * (tabWidth + tabSpacing) - tabSpacing) / 2

    TABS.forEach((tab, index) => {
      const isActive = index === this.currentTabIndex

      // 创建标签容器
      const tabContainer = new Container()
      tabContainer.x = startX + index * (tabWidth + tabSpacing)

      // 绘制标签背景（PixiJS v8 新 API）
      const tabGraphic = new Graphics()
      tabGraphic.roundRect(0, 0, tabWidth, 40, 8)
      tabGraphic.fill(isActive ? 0x4ecdc4 : 0x333333)
      tabContainer.addChild(tabGraphic)

      const tabText = new Text({
        text: tab.label,
        style: {
          fontFamily: 'Arial',
          fontSize: 18,
          fill: isActive ? 0x000000 : 0xcccccc
        }
      })
      tabText.anchor.set(0.5)
      tabText.x = tabWidth / 2
      tabText.y = 20
      tabContainer.addChild(tabText)

      this.tabContainer!.addChild(tabContainer)
    })
  }

  /**
   * 渲染当前标签页内容
   */
  private renderCurrentTab(): void {
    this.renderTabs()
    if (!this.contentContainer) return

    this.contentContainer.removeChildren()

    const currentTab = TABS[this.currentTabIndex]

    if (currentTab.type === 'stats') {
      this.renderStatsTab()
      return
    }

    // 其他标签页显示占位文本
    const placeholderText = new Text({
      text: `${currentTab.label}内容区域`,
      style: {
        fontFamily: 'Arial',
        fontSize: 24,
        fill: 0x888888
      }
    })
    placeholderText.x = 400
    placeholderText.anchor.set(0.5, 0)
    this.contentContainer.addChild(placeholderText)
  }

  /**
   * 渲染统计标签页（含引导控制区域）
   */
  private renderStatsTab(): void {
    if (!this.contentContainer) return

    // 标题
    const sectionTitle = new Text({
      text: t('settings.tutorial_section'),
      style: { fontFamily: 'Arial', fontSize: 20, fill: 0xffffff, fontWeight: 'bold' }
    })
    sectionTitle.x = 400
    sectionTitle.anchor.set(0.5, 0)
    this.contentContainer.addChild(sectionTitle)

    // --- 引导开关 ---
    const toggleY = 50
    const toggleLabel = new Text({
      text: t('settings.tutorial_toggle'),
      style: { fontFamily: 'Arial', fontSize: 16, fill: 0xcccccc }
    })
    toggleLabel.x = 200
    toggleLabel.y = toggleY
    this.contentContainer.addChild(toggleLabel)

    const isEnabled = tutorialManager.isEnabled()
    const toggleBg = new Graphics()
    toggleBg.roundRect(0, 0, 50, 26, 13)
    toggleBg.fill(isEnabled ? 0x4ecdc4 : 0x555555)

    const toggleKnob = new Graphics()
    toggleKnob.circle(0, 0, 10)
    toggleKnob.fill(0xffffff)
    toggleKnob.x = isEnabled ? 37 : 13
    toggleKnob.y = 13

    const toggleContainer = new Container()
    toggleContainer.addChild(toggleBg, toggleKnob)
    toggleContainer.x = 500
    toggleContainer.y = toggleY
    toggleContainer.eventMode = 'static'
    toggleContainer.cursor = 'pointer'
    toggleContainer.on('pointertap', () => {
      tutorialManager.setEnabled(!tutorialManager.isEnabled())
      this.renderCurrentTab()
    })
    this.contentContainer.addChild(toggleContainer)

    // --- 重置按钮 ---
    const resetY = 100
    const resetBg = new Graphics()
    resetBg.roundRect(0, 0, 180, 36, 8)
    resetBg.fill(0x663333)

    const resetText = new Text({
      text: t('settings.tutorial_reset'),
      style: { fontFamily: 'Arial', fontSize: 14, fill: 0xffaaaa }
    })
    resetText.anchor.set(0.5)
    resetText.x = 90
    resetText.y = 18

    const resetContainer = new Container()
    resetContainer.addChild(resetBg, resetText)
    resetContainer.x = 310
    resetContainer.y = resetY
    resetContainer.eventMode = 'static'
    resetContainer.cursor = 'pointer'
    resetContainer.on('pointertap', () => {
      this.showResetConfirm()
    })
    this.contentContainer.addChild(resetContainer)

    // 占位：其他统计数据将来扩展
    const statsPlaceholder = new Text({
      text: `（${t('settings.stats_placeholder')}）`,
      style: { fontFamily: 'Arial', fontSize: 16, fill: 0x666666 }
    })
    statsPlaceholder.x = 400
    statsPlaceholder.y = 180
    statsPlaceholder.anchor.set(0.5, 0)
    this.contentContainer.addChild(statsPlaceholder)
  }

  /**
   * 显示重置确认弹窗
   */
  private showResetConfirm(): void {
    // 使用覆盖层遮罩 + 居中确认框
    const overlay = new Container()

    const bg = new Graphics()
    bg.rect(0, 0, 800, 600)
    bg.fill({ color: 0x000000, alpha: 0.6 })
    bg.eventMode = 'static' // 阻止点击穿透
    overlay.addChild(bg)

    const box = new Graphics()
    box.roundRect(0, 0, 320, 160, 12)
    box.fill(0x1a1a2e)
    box.stroke({ color: 0x444444, width: 1 })
    box.x = 240
    box.y = 200
    overlay.addChild(box)

    const msg = new Text({
      text: t('settings.tutorial_reset_confirm'),
      style: { fontFamily: 'Arial', fontSize: 16, fill: 0xdddddd, wordWrap: true, wordWrapWidth: 280 }
    })
    msg.x = 400
    msg.y = 230
    msg.anchor.set(0.5, 0)
    overlay.addChild(msg)

    // 确认按钮
    const confirmBg = new Graphics()
    confirmBg.roundRect(0, 0, 100, 32, 6)
    confirmBg.fill(0xcc4444)
    const confirmText = new Text({
      text: t('settings.confirm'),
      style: { fontFamily: 'Arial', fontSize: 14, fill: 0xffffff }
    })
    confirmText.anchor.set(0.5)
    confirmText.x = 50
    confirmText.y = 16
    const confirmBtn = new Container()
    confirmBtn.addChild(confirmBg, confirmText)
    confirmBtn.x = 280
    confirmBtn.y = 310
    confirmBtn.eventMode = 'static'
    confirmBtn.cursor = 'pointer'
    confirmBtn.on('pointertap', () => {
      tutorialManager.resetAll()
      this.container.removeChild(overlay)
      this.renderCurrentTab()
    })
    overlay.addChild(confirmBtn)

    // 取消按钮
    const cancelBg = new Graphics()
    cancelBg.roundRect(0, 0, 100, 32, 6)
    cancelBg.fill(0x444444)
    const cancelText = new Text({
      text: t('settings.cancel'),
      style: { fontFamily: 'Arial', fontSize: 14, fill: 0xcccccc }
    })
    cancelText.anchor.set(0.5)
    cancelText.x = 50
    cancelText.y = 16
    const cancelBtn = new Container()
    cancelBtn.addChild(cancelBg, cancelText)
    cancelBtn.x = 420
    cancelBtn.y = 310
    cancelBtn.eventMode = 'static'
    cancelBtn.cursor = 'pointer'
    cancelBtn.on('pointertap', () => {
      this.container.removeChild(overlay)
    })
    overlay.addChild(cancelBtn)

    this.container.addChild(overlay)
  }

  /**
   * 更新内容位置（滚动）
   */
  private updateContentPosition(): void {
    if (this.contentContainer) {
      this.contentContainer.y = 140 - this.scrollOffset
    }
  }

  /**
   * 设置键盘输入监听
   */
  private setupKeyboardInput(): void {
    this.keyHandler = (e: KeyboardEvent) => {
      this.handleKeyDown(e)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.keyHandler)
    }
  }

  /**
   * 返回菜单
   */
  private returnToMenu(): void {
    if (this.returnToMenuCallback) {
      this.returnToMenuCallback()
    }
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    // 移除键盘监听
    if (this.keyHandler && typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.keyHandler)
      this.keyHandler = null
    }

    this.returnToMenuCallback = null
  }
}
