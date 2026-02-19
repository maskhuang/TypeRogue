// ============================================
// 打字肉鸽 - VictoryScene 胜利结算场景
// ============================================
// Story 5.5 Task 3: 胜利结算场景

import { Text, Graphics, TextStyle } from 'pixi.js'
import { BaseScene } from '../BaseScene'
import { eventBus } from '../../core/events/EventBus'

/**
 * 胜利数据
 */
export interface VictoryData {
  totalScore: number
  totalTime: number        // 毫秒
  stagesCleared: number
  maxCombo: number
  perfectWords: number
  skills: string[]
  relics: string[]
}

/**
 * 画布尺寸常量
 */
const CANVAS_WIDTH = 1280
const CANVAS_HEIGHT = 720

/**
 * 颜色常量 (来自 GDD 配色方案)
 */
const COLORS = {
  background: 0x1a1a2e,
  titleVictory: 0xffe66d, // 金黄色
  textPrimary: 0xeaeaea,  // 暖白
  textSecondary: 0x888888,
  highlight: 0x4ecdc4,    // 青绿
  buttonSelected: 0x4ecdc4,
  buttonUnselected: 0x3a3a4e,
  gold: 0xffe66d
}

/**
 * VictoryScene 胜利结算场景
 *
 * 职责:
 * - 显示胜利统计信息
 * - 触发 Meta 解锁检查
 * - 提供新游戏和返回菜单选项
 * - 响应键盘输入
 */
export class VictoryScene extends BaseScene {
  readonly name = 'victory'

  private data: VictoryData
  private selectedOption: number = 0 // 0: 新游戏, 1: 返回菜单
  private optionButtons: Graphics[] = []
  private optionTexts: Text[] = []
  private keyHandler: ((e: KeyboardEvent) => void) | null = null

  constructor(data: VictoryData) {
    super()
    this.data = data
  }

  onEnter(): void {
    super.onEnter()
    this.createBackground()
    this.createTitle()
    this.createStats()
    this.createOptions()
    this.updateSelection()
    this.setupInputHandlers()

    // 淡入效果
    this.fadeIn(400)

    // 播放胜利音效 (Epic 7 会实现)
    eventBus.emit('audio:play', { sound: 'victory' })

    // 触发 Meta 解锁检查 (为 Epic 6 预留)
    eventBus.emit('meta:check_unlocks', {
      runResult: 'victory',
      runStats: {
        totalScore: this.data.totalScore,
        totalTime: this.data.totalTime,
        stagesCleared: this.data.stagesCleared,
        maxCombo: this.data.maxCombo,
        perfectWords: this.data.perfectWords,
        skills: this.data.skills,
        relics: this.data.relics
      }
    })
  }

  private createBackground(): void {
    const bg = new Graphics()
    bg.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    bg.fill({ color: COLORS.background, alpha: 0.95 })
    this.container.addChild(bg)
  }

  private createTitle(): void {
    const titleStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 72,
      fill: COLORS.titleVictory,
      fontWeight: 'bold'
    })

    const title = new Text({
      text: '胜利！',
      style: titleStyle
    })
    title.anchor.set(0.5)
    title.position.set(CANVAS_WIDTH / 2, 100)
    this.container.addChild(title)
  }

  private createStats(): void {
    const timeStr = this.formatTime(this.data.totalTime)

    const statsLines = [
      `通关关卡: ${this.data.stagesCleared} / 8`,
      `总分: ${this.data.totalScore.toLocaleString()}`,
      `通关时间: ${timeStr}`,
      `最高连击: ${this.data.maxCombo}`,
      `完美词语: ${this.data.perfectWords}`,
      '',
      `获得技能: ${this.data.skills.length}`,
      `获得遗物: ${this.data.relics.length}`
    ]

    const statsStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 28,
      fill: COLORS.textPrimary,
      lineHeight: 42
    })

    const stats = new Text({
      text: statsLines.join('\n'),
      style: statsStyle
    })
    stats.anchor.set(0.5)
    stats.position.set(CANVAS_WIDTH / 2, 340)
    this.container.addChild(stats)
  }

  /**
   * 格式化时间为 MM:SS 格式
   */
  formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  private createOptions(): void {
    const options = [
      { label: '新游戏 (Enter)', key: 'newgame' },
      { label: '返回菜单 (Esc)', key: 'menu' }
    ]

    const buttonWidth = 240
    const buttonHeight = 50
    const buttonSpacing = 30
    const startY = 560

    for (let i = 0; i < options.length; i++) {
      const x = CANVAS_WIDTH / 2 - buttonWidth / 2
      const y = startY + i * (buttonHeight + buttonSpacing)

      // 按钮背景
      const button = new Graphics()
      button.roundRect(0, 0, buttonWidth, buttonHeight, 8)
      button.fill(COLORS.buttonUnselected)
      button.position.set(x, y)
      this.container.addChild(button)
      this.optionButtons.push(button)

      // 按钮文本
      const textStyle = new TextStyle({
        fontFamily: 'Arial',
        fontSize: 22,
        fill: COLORS.textPrimary,
        fontWeight: 'bold'
      })

      const text = new Text({
        text: options[i].label,
        style: textStyle
      })
      text.anchor.set(0.5)
      text.position.set(x + buttonWidth / 2, y + buttonHeight / 2)
      this.container.addChild(text)
      this.optionTexts.push(text)
    }

    // 操作说明
    const instructionStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 14,
      fill: COLORS.textSecondary
    })

    const instructions = new Text({
      text: '↑↓ 选择选项',
      style: instructionStyle
    })
    instructions.anchor.set(0.5)
    instructions.position.set(CANVAS_WIDTH / 2, 690)
    this.container.addChild(instructions)
  }

  private updateSelection(): void {
    for (let i = 0; i < this.optionButtons.length; i++) {
      const button = this.optionButtons[i]
      const isSelected = i === this.selectedOption

      // 重绘按钮
      button.clear()
      button.roundRect(0, 0, 240, 50, 8)
      button.fill(isSelected ? COLORS.buttonSelected : COLORS.buttonUnselected)

      if (isSelected) {
        button.stroke({ width: 2, color: COLORS.highlight })
      }
    }
  }

  private setupInputHandlers(): void {
    this.keyHandler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          this.selectedOption = Math.max(0, this.selectedOption - 1)
          this.updateSelection()
          break
        case 'ArrowDown':
          this.selectedOption = Math.min(1, this.selectedOption + 1)
          this.updateSelection()
          break
        case 'Enter':
          if (this.selectedOption === 0) {
            this.onNewRun()
          } else {
            this.onReturnToMenu()
          }
          break
        case 'Escape':
          this.onReturnToMenu()
          break
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.keyHandler)
    }
  }

  private removeInputHandlers(): void {
    if (this.keyHandler && typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.keyHandler)
      this.keyHandler = null
    }
  }

  private onNewRun(): void {
    eventBus.emit('run:start', {})
  }

  private onReturnToMenu(): void {
    eventBus.emit('scene:goto_menu', {})
  }

  /**
   * 处理按键输入（用于测试）
   */
  handleKeyInput(key: string): void {
    if (this.keyHandler) {
      this.keyHandler({ key } as KeyboardEvent)
    }
  }

  /**
   * 获取当前选中的选项索引（用于测试）
   */
  getSelectedOption(): number {
    return this.selectedOption
  }

  /**
   * 获取胜利数据（用于测试）
   */
  getData(): VictoryData {
    return { ...this.data }
  }

  onExit(): void {
    this.removeInputHandlers()
    this.optionButtons = []
    this.optionTexts = []
    super.onExit()
  }

  update(_dt: number): void {
    // VictoryScene 无需每帧更新
  }
}
