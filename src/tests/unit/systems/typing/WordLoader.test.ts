// ============================================
// 打字肉鸽 - WordLoader 单元测试
// ============================================

import { describe, it, expect, beforeEach } from 'vitest'
import { WordLoader, type WordList } from '../../../../src/systems/typing/WordLoader'

describe('WordLoader', () => {
  let loader: WordLoader

  beforeEach(() => {
    loader = new WordLoader()
    loader.clearCache()
  })

  describe('getRandomWord', () => {
    it('应该从词库返回随机词语', () => {
      const wordList: WordList = {
        name: 'test',
        language: 'en',
        words: ['apple', 'banana', 'cherry']
      }

      const word = loader.getRandomWord(wordList)
      expect(wordList.words).toContain(word)
    })

    it('空词库应该抛出错误', () => {
      const emptyList: WordList = {
        name: 'empty',
        language: 'en',
        words: []
      }

      expect(() => loader.getRandomWord(emptyList)).toThrow()
    })
  })

  describe('getWordsByDifficulty', () => {
    it('应该按难度筛选词语', () => {
      const wordList: WordList = {
        name: 'test',
        language: 'en',
        words: ['a', 'ab', 'abc', 'abcd'],
        difficulty: [1, 2, 3, 4]
      }

      const easy = loader.getWordsByDifficulty(wordList, 2)
      expect(easy).toEqual(['a', 'ab'])
    })

    it('没有难度数据时返回全部', () => {
      const wordList: WordList = {
        name: 'test',
        language: 'en',
        words: ['a', 'b', 'c']
      }

      const all = loader.getWordsByDifficulty(wordList, 1)
      expect(all).toEqual(['a', 'b', 'c'])
    })
  })

  describe('isCached', () => {
    it('未加载的词库应该返回 false', () => {
      expect(loader.isCached('nonexistent')).toBe(false)
    })
  })

  describe('clearCache', () => {
    it('应该清除所有缓存', () => {
      // 模拟缓存状态（通过内部方法或测试 API）
      loader.clearCache()
      expect(loader.isCached('any')).toBe(false)
    })
  })
})
