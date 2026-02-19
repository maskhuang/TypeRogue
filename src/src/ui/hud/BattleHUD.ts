// ============================================
// 打字肉鸽 - BattleHUD 统一管理器
// ============================================
// Story 4.3 Task 5: HUD 管理器

import { Container } from 'pixi.js'
import { ScoreDisplay } from './ScoreDisplay'
import { TimerBar } from './TimerBar'
import { ComboCounter } from './ComboCounter'
import { WordDisplay } from './WordDisplay'
import { BattleState } from '../../core/state/BattleState'

/**
 * 战斗 HUD 管理器
 *
 * 职责:
 * - 创建和管理所有 HUD 子组件
 * - 统一更新所有组件
 * - 响应 BattleState 变化
 *
 * 子组件:
 * - ScoreDisplay: 分数和倍率 (左上角)
 * - TimerBar: 倒计时进度条 (底部)
 * - ComboCounter: 连击计数器 (右下角)
 * - WordDisplay: 当前词语 (中央)
 */
export class BattleHUD extends Container {
  private scoreDisplay: ScoreDisplay
  private timerBar: TimerBar
  private comboCounter: ComboCounter
  private wordDisplay: WordDisplay

  private screenWidth: number
  private screenHeight: number

  // 缓存上一次的 totalTime，避免每帧重复设置
  private lastTotalTime: number = -1

  constructor(screenWidth: number, screenHeight: number) {
    super()
    this.label = 'BattleHUD'
    this.screenWidth = screenWidth
    this.screenHeight = screenHeight

    this.createComponents()
    this.layoutComponents()
  }

  /**
   * 创建所有子组件
   */
  private createComponents(): void {
    this.scoreDisplay = new ScoreDisplay()
    this.addChild(this.scoreDisplay)

    this.timerBar = new TimerBar(this.screenWidth - 40)
    this.addChild(this.timerBar)

    this.comboCounter = new ComboCounter()
    this.addChild(this.comboCounter)

    this.wordDisplay = new WordDisplay()
    this.addChild(this.wordDisplay)
  }

  /**
   * 布局组件位置
   */
  private layoutComponents(): void {
    // ScoreDisplay: 左上角
    this.scoreDisplay.position.set(20, 20)

    // TimerBar: 底部居中
    this.timerBar.position.set(20, this.screenHeight - 40)

    // ComboCounter: 右下角
    this.comboCounter.position.set(this.screenWidth - 150, this.screenHeight - 100)

    // WordDisplay: 中央
    this.wordDisplay.position.set(this.screenWidth / 2, this.screenHeight / 2)
  }

  /**
   * 根据 BattleState 同步更新所有组件
   * @param state 战斗状态
   */
  syncWithState(state: BattleState): void {
    const data = state.getState()

    this.scoreDisplay.setScore(data.score)
    this.scoreDisplay.setMultiplier(data.multiplier)

    // 只在 totalTime 变化时更新，避免每帧重置 currentTime
    if (this.lastTotalTime !== data.totalTime) {
      this.timerBar.setTotalTime(data.totalTime)
      this.lastTotalTime = data.totalTime
    }
    this.timerBar.setCurrentTime(data.timeRemaining)

    this.comboCounter.setCombo(data.combo)

    this.wordDisplay.setWord(data.currentWord)
    this.wordDisplay.setTypedChars(data.typedChars)
  }

  /**
   * 每帧更新
   * @param dt delta time（秒）
   */
  update(dt: number): void {
    this.scoreDisplay.update(dt)
    this.timerBar.update(dt)
    this.comboCounter.update(dt)
  }

  /**
   * 获取 ScoreDisplay（供测试和外部访问）
   */
  getScoreDisplay(): ScoreDisplay {
    return this.scoreDisplay
  }

  /**
   * 获取 TimerBar（供测试和外部访问）
   */
  getTimerBar(): TimerBar {
    return this.timerBar
  }

  /**
   * 获取 ComboCounter（供测试和外部访问）
   */
  getComboCounter(): ComboCounter {
    return this.comboCounter
  }

  /**
   * 获取 WordDisplay（供测试和外部访问）
   */
  getWordDisplay(): WordDisplay {
    return this.wordDisplay
  }

  /**
   * 销毁 HUD
   */
  destroy(): void {
    this.scoreDisplay.destroy()
    this.timerBar.destroy()
    this.comboCounter.destroy()
    this.wordDisplay.destroy()
    super.destroy()
  }
}
