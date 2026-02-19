// ============================================
// 打字肉鸽 - BattleState 战斗状态管理
// ============================================
// Story 4.2 Task 1: BattleState 状态定义

/**
 * 战斗阶段枚举
 */
export type BattlePhase = 'ready' | 'playing' | 'paused' | 'victory' | 'defeat'

/**
 * 战斗状态接口
 * 包含战斗过程中的所有实时数据
 */
export interface BattleStateData {
  /** 当前阶段 */
  phase: BattlePhase

  /** 当前词语 */
  currentWord: string

  /** 已输入的正确字符 */
  typedChars: string

  /** 当前词语索引（词库中的位置） */
  wordIndex: number

  /** 本局分数 */
  score: number

  /** 当前倍率 */
  multiplier: number

  /** 连击数 */
  combo: number

  /** 最高连击 */
  maxCombo: number

  /** 剩余时间（秒） */
  timeRemaining: number

  /** 总时间（秒） */
  totalTime: number

  /** 已完成词语数 */
  wordsCompleted: number

  /** 错误次数 */
  errorCount: number
}

/**
 * 战斗状态管理类
 *
 * 职责:
 * - 管理战斗过程中的所有状态数据
 * - 提供状态转换方法（start, pause, resume）
 * - 提供状态查询方法（isPlaying, isPaused, isEnded）
 * - 处理词语完成和错误逻辑
 */
export class BattleState {
  private data: BattleStateData

  constructor() {
    this.data = this.createInitialState()
  }

  /**
   * 创建初始状态
   */
  private createInitialState(): BattleStateData {
    return {
      phase: 'ready',
      currentWord: '',
      typedChars: '',
      wordIndex: 0,
      score: 0,
      multiplier: 1.0,
      combo: 0,
      maxCombo: 0,
      timeRemaining: 60,
      totalTime: 60,
      wordsCompleted: 0,
      errorCount: 0
    }
  }

  /**
   * 重置状态（新战斗）
   * @param totalTime 自定义总时间（默认 60 秒）
   */
  reset(totalTime: number = 60): void {
    this.data = this.createInitialState()
    this.data.totalTime = totalTime
    this.data.timeRemaining = totalTime
  }

  /**
   * 开始战斗
   */
  start(): void {
    this.data.phase = 'playing'
  }

  /**
   * 暂停战斗
   * 仅在 playing 状态时有效
   */
  pause(): void {
    if (this.data.phase === 'playing') {
      this.data.phase = 'paused'
    }
  }

  /**
   * 恢复战斗
   * 仅在 paused 状态时有效
   */
  resume(): void {
    if (this.data.phase === 'paused') {
      this.data.phase = 'playing'
    }
  }

  /**
   * 获取只读状态
   * 返回 Readonly 防止外部直接修改
   */
  getState(): Readonly<BattleStateData> {
    return this.data
  }

  /**
   * 更新时间
   * 仅在 playing 状态时减少时间
   * @param dt 经过的时间（秒）
   */
  updateTime(dt: number): void {
    if (this.data.phase === 'playing') {
      this.data.timeRemaining = Math.max(0, this.data.timeRemaining - dt)
      if (this.data.timeRemaining <= 0) {
        this.data.phase = 'defeat'
      }
    }
  }

  /**
   * 设置当前词语
   * 同时清空已输入字符
   */
  setCurrentWord(word: string): void {
    this.data.currentWord = word
    this.data.typedChars = ''
  }

  /**
   * 添加正确字符
   */
  addTypedChar(char: string): void {
    this.data.typedChars += char
  }

  /**
   * 词语完成
   * 更新分数、连击、最高连击、完成数和索引
   * @param scoreGain 获得的分数
   */
  completeWord(scoreGain: number): void {
    this.data.score += scoreGain
    this.data.combo++
    this.data.maxCombo = Math.max(this.data.maxCombo, this.data.combo)
    this.data.wordsCompleted++
    this.data.wordIndex++
  }

  /**
   * 输入错误
   * 重置连击，增加错误计数
   */
  onError(): void {
    this.data.combo = 0
    this.data.errorCount++
  }

  /**
   * 设置倍率
   */
  setMultiplier(value: number): void {
    this.data.multiplier = value
  }

  /**
   * 检查是否正在游戏
   */
  isPlaying(): boolean {
    return this.data.phase === 'playing'
  }

  /**
   * 检查是否已暂停
   */
  isPaused(): boolean {
    return this.data.phase === 'paused'
  }

  /**
   * 检查是否已结束（胜利或失败）
   */
  isEnded(): boolean {
    return this.data.phase === 'victory' || this.data.phase === 'defeat'
  }

  /**
   * 设置胜利状态
   * 用于完成所有词语或达成胜利条件时调用
   */
  setVictory(): void {
    if (this.data.phase === 'playing') {
      this.data.phase = 'victory'
    }
  }

  /**
   * 设置失败状态
   * 用于手动触发失败（如血量归零）
   */
  setDefeat(): void {
    if (this.data.phase === 'playing') {
      this.data.phase = 'defeat'
    }
  }

  // ==================== Story 4.5 新增方法 ====================

  /**
   * 增加连击（不计算分数）
   */
  incrementCombo(): void {
    this.data.combo++
    this.data.maxCombo = Math.max(this.data.maxCombo, this.data.combo)
  }

  /**
   * 重置连击（不增加错误计数）
   */
  resetCombo(): void {
    this.data.combo = 0
  }

  /**
   * 添加分数
   */
  addScore(points: number): void {
    this.data.score += Math.round(points)
  }

  /**
   * 设置游戏阶段
   */
  setPhase(phase: BattlePhase): void {
    this.data.phase = phase
  }

  /**
   * 获取剩余时间（别名，兼容不同命名）
   */
  getRemainingTime(): number {
    return this.data.timeRemaining
  }
}
