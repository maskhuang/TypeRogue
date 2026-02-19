// ============================================
// 打字肉鸽 - BattleFlowController 战斗流程控制器
// ============================================
// Story 4.5 Task 2: 协调战斗流程

import { BattleState } from '../../core/state/BattleState'
import { ScoreCalculator } from '../../systems/scoring/ScoreCalculator'
import { eventBus, GameEvents } from '../../core/events/EventBus'
import { WordController } from './WordController'

/**
 * 关卡配置
 */
export interface StageConfig {
  difficulty: number      // 1-3
  targetScore: number     // 胜利目标
  timeLimit: number       // 秒
  wordCategory?: string   // 词库类别
}

/**
 * 战斗结果（供 Story 5.x RunState 和场景转换使用）
 * AC6: 结算后可以重新开始或返回的预留接口
 * Story 5.5: 扩展以支持 GameOverScene 和 VictoryScene
 */
export interface BattleResult {
  result: 'win' | 'lose'
  score: number
  maxCombo: number
  accuracy: number        // 0-1, 基于错误次数计算
  wordsCompleted: number
  timeUsed: number        // 秒
  perfectWords: number    // 无错误完成的词语数 (Story 5.5)
}

/**
 * 战斗流程控制器
 *
 * 职责:
 * - 协调词语、计分、技能系统
 * - 管理连击状态
 * - 处理战斗结束条件
 */
export class BattleFlowController {
  private battleState: BattleState
  private wordController: WordController
  private scoreCalculator: ScoreCalculator

  // 目标分数（达到即胜利）
  private targetScore: number = 1000

  // 事件取消订阅
  private unsubKeypress: (() => void) | null = null
  private unsubWordComplete: (() => void) | null = null
  private unsubWordError: (() => void) | null = null

  // 销毁标记
  private destroyed = false

  constructor(battleState: BattleState) {
    this.battleState = battleState
    this.wordController = new WordController()
    this.scoreCalculator = new ScoreCalculator()
  }

  /**
   * 初始化战斗流程
   */
  async initialize(config: StageConfig): Promise<void> {
    this.targetScore = config.targetScore

    // 重置状态
    this.battleState.reset(config.timeLimit)
    this.scoreCalculator.reset()

    // 初始化词语控制器
    await this.wordController.initialize(config.wordCategory || 'zh-pinyin', config.difficulty)

    // 设置初始词语到 BattleState
    this.battleState.setCurrentWord(this.wordController.getCurrentWord())

    // 绑定事件
    this.bindEvents()
  }

  /**
   * 使用提供的词语初始化（用于测试）
   */
  initializeSync(config: StageConfig, words: string[]): void {
    this.targetScore = config.targetScore
    this.battleState.reset(config.timeLimit)
    this.scoreCalculator.reset()
    this.wordController.initializeWithWords(words)
    this.battleState.setCurrentWord(this.wordController.getCurrentWord())
    this.bindEvents()
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    this.unsubKeypress = eventBus.on('input:keypress', this.onKeyPress.bind(this))
    this.unsubWordComplete = eventBus.on('word:complete', this.onWordComplete.bind(this))
    this.unsubWordError = eventBus.on('word:error', this.onWordError.bind(this))
  }

  /**
   * 解绑事件
   */
  unbindEvents(): void {
    this.unsubKeypress?.()
    this.unsubWordComplete?.()
    this.unsubWordError?.()
    this.unsubKeypress = null
    this.unsubWordComplete = null
    this.unsubWordError = null
  }

  /**
   * 处理按键
   */
  private onKeyPress(data: GameEvents['input:keypress']): void {
    if (this.destroyed) return
    if (!this.battleState.isPlaying()) return

    const result = this.wordController.handleKeyPress(data.key)

    if (result.correct) {
      // 正确输入 - 更新 BattleState 的已输入字符
      this.battleState.addTypedChar(result.char)

      // 触发技能事件
      eventBus.emit('skill:triggered', {
        key: data.key,
        skillId: '', // TODO: 从 RunState 获取绑定
        type: 'passive'
      })
    }
    // 错误处理由 onWordError 处理
  }

  /**
   * 处理词语完成
   */
  private onWordComplete(data: GameEvents['word:complete']): void {
    if (this.destroyed) return

    // 计算分数
    const state = this.battleState.getState()
    const baseScore = this.scoreCalculator.calculateWordScore(
      data.word.length,
      state.multiplier
    )

    // 更新 BattleState（completeWord 会增加连击）
    this.battleState.completeWord(baseScore)

    // 设置新词语
    this.battleState.setCurrentWord(this.wordController.getCurrentWord())

    // 发送分数更新事件
    const newState = this.battleState.getState()
    eventBus.emit('score:update', {
      score: newState.score,
      multiplier: newState.multiplier,
      combo: newState.combo
    })

    // 检查胜利条件
    if (newState.score >= this.targetScore) {
      this.battleState.setVictory()
    }
  }

  /**
   * 处理输入错误
   */
  private onWordError(_data: GameEvents['word:error']): void {
    if (this.destroyed) return

    // 重置连击
    this.battleState.onError()
  }

  /**
   * 每帧更新
   */
  update(_dt: number): void {
    if (this.destroyed) return

    // BattleState.updateTime 会自动检查时间耗尽并设置 defeat
    // 这里只需要检查是否达到胜利条件
    const state = this.battleState.getState()
    if (state.score >= this.targetScore && state.phase === 'playing') {
      this.battleState.setVictory()
    }
  }

  /**
   * 获取词语控制器
   */
  getWordController(): WordController {
    return this.wordController
  }

  /**
   * 获取目标分数
   */
  getTargetScore(): number {
    return this.targetScore
  }

  /**
   * 获取战斗结果（AC6 预留接口）
   * 用于结算显示和传递给 RunState
   * Story 5.5: 添加 perfectWords 字段
   */
  getBattleResult(): BattleResult {
    const state = this.battleState.getState()
    const totalTime = state.totalTime
    const timeUsed = totalTime - state.timeRemaining

    // 计算准确率：基于错误次数和完成词语数
    // accuracy = 1 - (errorCount / (wordsCompleted * avgWordLength))
    // 简化为：完美完成的词语比例估算
    const accuracy = state.errorCount === 0 ? 1.0 :
      Math.max(0, 1 - (state.errorCount / Math.max(1, state.wordsCompleted * 5)))

    // 估算完美词语数（无错误完成）
    // 简化计算：如果没有错误则全部完美，否则按比例估算
    const perfectWords = state.errorCount === 0
      ? state.wordsCompleted
      : Math.max(0, state.wordsCompleted - state.errorCount)

    return {
      result: state.phase === 'victory' ? 'win' : 'lose',
      score: state.score,
      maxCombo: state.maxCombo,
      accuracy: Math.round(accuracy * 100) / 100,
      wordsCompleted: state.wordsCompleted,
      timeUsed: Math.round(timeUsed * 10) / 10,
      perfectWords
    }
  }

  /**
   * 检查是否已销毁
   */
  isDestroyed(): boolean {
    return this.destroyed
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.destroyed = true
    this.unbindEvents()
    this.wordController.reset()
  }
}
