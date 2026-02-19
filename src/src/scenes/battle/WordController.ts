// ============================================
// 打字肉鸽 - WordController 词语控制器
// ============================================
// Story 4.5 Task 1: 管理词语队列和输入匹配

import { wordLoader } from '../../systems/typing/WordLoader'
import { eventBus } from '../../core/events/EventBus'

/**
 * 词语控制器
 *
 * 职责:
 * - 管理当前词语和词语队列
 * - 处理按键匹配
 * - 发送 word:new, word:complete, word:error 事件
 */
export class WordController {
  private wordQueue: string[] = []
  private currentWord: string = ''
  private currentIndex: number = 0
  private wordStartTime: number = 0
  private errorCount: number = 0
  private currentDifficulty: number = 1
  private destroyed: boolean = false

  /**
   * 初始化词语队列
   * @param category 词库类别
   * @param difficulty 难度等级 (1-3)
   */
  async initialize(category: string = 'zh-pinyin', difficulty: number = 1): Promise<void> {
    this.currentDifficulty = difficulty
    this.destroyed = false
    try {
      const wordList = await wordLoader.load(category)
      const filtered = this.filterByDifficulty(wordList.words, difficulty)
      this.wordQueue = this.shuffle(filtered)
      this.loadNextWord()
    } catch {
      // 如果词库加载失败，使用默认词语
      this.wordQueue = this.getDefaultWords(difficulty)
      this.loadNextWord()
    }
  }

  /**
   * 使用提供的词语列表初始化（用于测试）
   * @param words 词语列表
   * @param difficulty 难度等级 (用于队列耗尽时重填)
   */
  initializeWithWords(words: string[], difficulty: number = 1): void {
    this.currentDifficulty = difficulty
    this.destroyed = false
    this.wordQueue = [...words]
    this.loadNextWord()
  }

  /**
   * 加载下一个词语
   */
  loadNextWord(): void {
    if (this.wordQueue.length === 0) {
      // 词库耗尽，重新打乱已用词语
      this.resetQueue()
    }

    this.currentWord = this.wordQueue.shift() || 'test'
    this.currentIndex = 0
    this.wordStartTime = Date.now()
    this.errorCount = 0

    eventBus.emit('word:new', {
      word: this.currentWord,
      length: this.currentWord.length
    })
  }

  /**
   * 处理按键输入
   * @returns 匹配结果
   */
  handleKeyPress(key: string): { correct: boolean; completed: boolean; char: string } {
    if (this.destroyed || this.currentWord.length === 0) {
      return { correct: false, completed: false, char: key }
    }

    const expectedChar = this.currentWord[this.currentIndex]
    const correct = key.toLowerCase() === expectedChar.toLowerCase()

    if (correct) {
      this.currentIndex++
      const completed = this.currentIndex >= this.currentWord.length

      if (completed) {
        // Note: score 字段为 0 是设计预期，实际分数由 ScoreCalculator 根据词长和倍率计算
        eventBus.emit('word:complete', {
          word: this.currentWord,
          score: 0,
          perfect: this.errorCount === 0
        })

        this.loadNextWord()
      }

      return { correct: true, completed, char: expectedChar }
    }

    // 错误输入
    this.errorCount++
    eventBus.emit('word:error', {
      key: key,
      expected: expectedChar
    })

    return { correct: false, completed: false, char: key }
  }

  /**
   * 获取当前词语
   */
  getCurrentWord(): string {
    return this.currentWord
  }

  /**
   * 获取当前输入位置
   */
  getCurrentIndex(): number {
    return this.currentIndex
  }

  /**
   * 获取已输入字符
   */
  getTypedChars(): string {
    return this.currentWord.slice(0, this.currentIndex)
  }

  /**
   * 获取剩余词语数量
   */
  getRemainingCount(): number {
    return this.wordQueue.length
  }

  /**
   * 重置控制器
   */
  reset(): void {
    this.destroyed = true
    this.wordQueue = []
    this.currentWord = ''
    this.currentIndex = 0
    this.errorCount = 0
  }

  /**
   * 检查是否已销毁
   */
  isDestroyed(): boolean {
    return this.destroyed
  }

  /**
   * 根据难度过滤词语
   */
  private filterByDifficulty(words: string[], difficulty: number): string[] {
    const minLen = difficulty === 1 ? 2 : difficulty === 2 ? 4 : 6
    const maxLen = difficulty === 1 ? 5 : difficulty === 2 ? 7 : 10

    const filtered = words.filter(w => w.length >= minLen && w.length <= maxLen)
    return filtered.length > 0 ? filtered : words
  }

  /**
   * Fisher-Yates 洗牌
   */
  private shuffle(array: string[]): string[] {
    const result = [...array]
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }

  /**
   * 重置队列（词库耗尽时）
   * 使用当前难度重新填充词库
   */
  private resetQueue(): void {
    this.wordQueue = this.getDefaultWords(this.currentDifficulty)
  }

  /**
   * 获取默认词语（词库加载失败时使用）
   */
  private getDefaultWords(difficulty: number): string[] {
    const easy = ['cat', 'dog', 'sun', 'moon', 'tree', 'fish', 'bird', 'cake', 'book', 'rain']
    const medium = ['apple', 'water', 'green', 'happy', 'music', 'dance', 'cloud', 'dream']
    const hard = ['keyboard', 'computer', 'sunshine', 'adventure', 'chocolate', 'beautiful']

    if (difficulty === 1) return this.shuffle(easy)
    if (difficulty === 2) return this.shuffle(medium)
    return this.shuffle(hard)
  }
}
