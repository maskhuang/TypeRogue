// ============================================
// 打字肉鸽 - 词语匹配器
// ============================================
// Story 1.2: 实现逐字符匹配和词语完成检测

import { eventBus } from '../../core/events/EventBus'

/**
 * 词语匹配状态
 */
interface WordMatchState {
  /** 当前词语（大写） */
  word: string
  /** 当前字符索引 */
  index: number
  /** 错误计数 */
  errors: number
  /** 开始时间 */
  startTime: number
  /** 是否完美（无错误） */
  perfect: boolean
}

/**
 * 匹配结果类型
 */
export type MatchResult = 'correct' | 'error' | 'complete'

/**
 * 词语完成统计
 */
export interface WordCompleteStats {
  word: string
  time: number
  errors: number
  perfect: boolean
  accuracy: number
}

/**
 * 词语匹配器
 *
 * 职责:
 * - 跟踪当前词语和输入进度
 * - 逐字符验证输入
 * - 发出匹配结果事件
 * - 计算完成统计
 */
class WordMatcher {
  private state: WordMatchState | null = null
  private enabled = false
  private unsubscribe: (() => void) | null = null

  /**
   * 设置新词语
   */
  setWord(word: string): void {
    this.state = {
      word: word.toUpperCase(),
      index: 0,
      errors: 0,
      startTime: performance.now(),
      perfect: true
    }
  }

  /**
   * 获取当前词语
   */
  getWord(): string | null {
    return this.state?.word ?? null
  }

  /**
   * 获取当前索引
   */
  getCurrentIndex(): number {
    return this.state?.index ?? 0
  }

  /**
   * 获取当前期望字符
   */
  getExpectedChar(): string | null {
    if (!this.state) return null
    return this.state.word[this.state.index] ?? null
  }

  /**
   * 是否完美（无错误）
   */
  isPerfect(): boolean {
    return this.state?.perfect ?? true
  }

  /**
   * 获取错误计数
   */
  getErrorCount(): number {
    return this.state?.errors ?? 0
  }

  /**
   * 重置状态
   */
  reset(): void {
    this.state = null
  }

  /**
   * 匹配单个字符
   * @param char 输入的字符（会自动转大写）
   * @returns 匹配结果
   */
  matchChar(char: string): MatchResult {
    if (!this.state) {
      return 'error'
    }

    const expected = this.state.word[this.state.index]
    const input = char.toUpperCase()

    if (input === expected) {
      this.state.index++

      // 检查是否完成
      if (this.state.index >= this.state.word.length) {
        return 'complete'
      }

      return 'correct'
    } else {
      this.state.errors++
      this.state.perfect = false
      return 'error'
    }
  }

  /**
   * 获取完成统计
   */
  getCompleteStats(): WordCompleteStats | null {
    if (!this.state) return null

    const time = performance.now() - this.state.startTime
    const totalChars = this.state.word.length
    const accuracy = totalChars / (totalChars + this.state.errors) * 100

    return {
      word: this.state.word,
      time,
      errors: this.state.errors,
      perfect: this.state.perfect,
      accuracy
    }
  }

  /**
   * 启用自动匹配（订阅 input:keypress）
   */
  enable(): void {
    if (this.enabled) return
    this.enabled = true

    this.unsubscribe = eventBus.on('input:keypress', this.handleKeyPress)
  }

  /**
   * 禁用自动匹配
   */
  disable(): void {
    if (!this.enabled) return
    this.enabled = false

    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
  }

  /**
   * 检查是否启用
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * 处理按键事件
   */
  private handleKeyPress = (data: { key: string; timestamp: number }): void => {
    if (!this.state) return

    const result = this.matchChar(data.key)

    switch (result) {
      case 'correct':
        eventBus.emit('word:correct', {
          key: data.key,
          index: this.state.index - 1
        })
        break

      case 'error':
        eventBus.emit('word:error', {
          key: data.key,
          expected: this.getExpectedChar() || ''
        })
        break

      case 'complete':
        const stats = this.getCompleteStats()
        if (stats) {
          eventBus.emit('word:complete', {
            word: stats.word,
            score: 0, // 分数由 ScoreCalculator 计算
            perfect: stats.perfect
          })
        }
        break
    }
  }

  /**
   * 销毁匹配器
   */
  destroy(): void {
    this.disable()
    this.reset()
  }
}

// 导出单例实例
export const wordMatcher = new WordMatcher()

// 同时导出类以便测试
export { WordMatcher }
