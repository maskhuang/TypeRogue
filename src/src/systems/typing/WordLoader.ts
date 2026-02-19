// ============================================
// 打字肉鸽 - 词库加载器
// ============================================
// Story 1.3: 实现词库懒加载和缓存

/**
 * 词库数据结构
 */
export interface WordList {
  /** 词库名称 */
  name: string
  /** 语言代码 */
  language: string
  /** 词语列表 */
  words: string[]
  /** 难度等级（与 words 对应） */
  difficulty?: number[]
  /** 词库层级 */
  tier?: number
  /** 高亮字母（用于技能词） */
  highlight?: string
}

/**
 * 词语条目（含元数据）
 */
export interface WordEntry {
  word: string
  difficulty: number
  category: string
}

/**
 * 词库加载器
 *
 * 职责:
 * - 从 JSON 文件懒加载词库
 * - 缓存已加载的词库
 * - 提供随机词语获取方法
 * - 支持按难度筛选
 */
class WordLoader {
  private cache = new Map<string, WordList>()
  private basePath = '/assets/data/words'

  /**
   * 加载词库
   * @param category 词库类别名称
   * @returns 词库数据
   */
  async load(category: string): Promise<WordList> {
    // 检查缓存
    if (this.cache.has(category)) {
      return this.cache.get(category)!
    }

    try {
      const response = await fetch(`${this.basePath}/${category}.json`)

      if (!response.ok) {
        throw new Error(`Failed to load word list: ${category} (${response.status})`)
      }

      const data: WordList = await response.json()

      // 验证数据结构
      if (!data.words || !Array.isArray(data.words)) {
        throw new Error(`Invalid word list format: ${category}`)
      }

      // 缓存
      this.cache.set(category, data)

      return data
    } catch (error) {
      console.error(`[WordLoader] Error loading ${category}:`, error)
      throw error
    }
  }

  /**
   * 预加载多个词库
   */
  async preload(categories: string[]): Promise<void> {
    await Promise.all(categories.map(cat => this.load(cat)))
  }

  /**
   * 检查词库是否已缓存
   */
  isCached(category: string): boolean {
    return this.cache.has(category)
  }

  /**
   * 获取已缓存的词库
   */
  getCached(category: string): WordList | null {
    return this.cache.get(category) ?? null
  }

  /**
   * 从指定词库获取随机词语
   * @throws Error 如果词库为空
   */
  getRandomWord(wordList: WordList): string {
    const { words } = wordList
    if (words.length === 0) {
      throw new Error(`WordLoader: Cannot get random word from empty list "${wordList.name}"`)
    }
    return words[Math.floor(Math.random() * words.length)]
  }

  /**
   * 从指定词库按难度获取词语
   */
  getWordsByDifficulty(wordList: WordList, maxDifficulty: number): string[] {
    const { words, difficulty } = wordList

    if (!difficulty) {
      return words
    }

    return words.filter((_, i) => (difficulty[i] ?? 1) <= maxDifficulty)
  }

  /**
   * 从多个词库获取随机词语
   */
  getRandomWordFromCategories(categories: string[]): string | null {
    const availableLists = categories
      .map(cat => this.cache.get(cat))
      .filter((list): list is WordList => list !== undefined)

    if (availableLists.length === 0) {
      return null
    }

    // 随机选择一个词库
    const selectedList = availableLists[Math.floor(Math.random() * availableLists.length)]
    return this.getRandomWord(selectedList)
  }

  /**
   * 获取所有缓存词库的词语
   */
  getAllCachedWords(): string[] {
    const allWords: string[] = []
    this.cache.forEach(list => {
      allWords.push(...list.words)
    })
    return allWords
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * 清除特定词库缓存
   */
  clearCategoryCache(category: string): void {
    this.cache.delete(category)
  }

  /**
   * 设置基础路径（用于测试）
   */
  setBasePath(path: string): void {
    this.basePath = path
  }
}

// 导出单例实例
export const wordLoader = new WordLoader()

// 同时导出类以便测试
export { WordLoader }
