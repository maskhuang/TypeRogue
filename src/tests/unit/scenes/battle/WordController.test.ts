// ============================================
// 打字肉鸽 - WordController 单元测试
// ============================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WordController } from '../../../../src/scenes/battle/WordController'
import { eventBus } from '../../../../src/core/events/EventBus'

// Mock eventBus
vi.mock('../../../../src/core/events/EventBus', () => ({
  eventBus: {
    emit: vi.fn(),
    on: vi.fn(() => vi.fn()),
    off: vi.fn()
  }
}))

// Mock wordLoader
vi.mock('../../../../src/systems/typing/WordLoader', () => ({
  wordLoader: {
    load: vi.fn().mockResolvedValue({
      words: ['cat', 'dog', 'sun', 'moon', 'tree']
    })
  }
}))

describe('WordController', () => {
  let controller: WordController

  beforeEach(() => {
    controller = new WordController()
    vi.mocked(eventBus.emit).mockClear()
  })

  afterEach(() => {
    controller.reset()
  })

  describe('initializeWithWords', () => {
    it('应该设置词语队列', () => {
      controller.initializeWithWords(['hello', 'world', 'test'])
      expect(controller.getCurrentWord()).toBe('hello')
    })

    it('应该发送 word:new 事件', () => {
      controller.initializeWithWords(['hello', 'world'])
      expect(eventBus.emit).toHaveBeenCalledWith('word:new', {
        word: 'hello',
        length: 5
      })
    })

    it('应该重置输入索引', () => {
      controller.initializeWithWords(['hello'])
      expect(controller.getCurrentIndex()).toBe(0)
    })
  })

  describe('handleKeyPress - 正确输入', () => {
    beforeEach(() => {
      controller.initializeWithWords(['cat', 'dog'])
      vi.mocked(eventBus.emit).mockClear()
    })

    it('正确按键应该返回 correct: true', () => {
      const result = controller.handleKeyPress('c')
      expect(result.correct).toBe(true)
      expect(result.char).toBe('c')
    })

    it('正确按键应该推进索引', () => {
      controller.handleKeyPress('c')
      expect(controller.getCurrentIndex()).toBe(1)
    })

    it('应该支持大小写不敏感匹配', () => {
      const result = controller.handleKeyPress('C')
      expect(result.correct).toBe(true)
    })

    it('连续正确输入应该推进索引（未完成词语时）', () => {
      // 只输入部分字符，不完成词语
      controller.handleKeyPress('c')
      controller.handleKeyPress('a')
      expect(controller.getCurrentIndex()).toBe(2)
    })
  })

  describe('handleKeyPress - 错误输入', () => {
    beforeEach(() => {
      controller.initializeWithWords(['cat', 'dog'])
      vi.mocked(eventBus.emit).mockClear()
    })

    it('错误按键应该返回 correct: false', () => {
      const result = controller.handleKeyPress('x')
      expect(result.correct).toBe(false)
    })

    it('错误按键不应该推进索引', () => {
      controller.handleKeyPress('x')
      expect(controller.getCurrentIndex()).toBe(0)
    })

    it('错误按键应该发送 word:error 事件', () => {
      controller.handleKeyPress('x')
      expect(eventBus.emit).toHaveBeenCalledWith('word:error', {
        key: 'x',
        expected: 'c'
      })
    })
  })

  describe('handleKeyPress - 词语完成', () => {
    beforeEach(() => {
      controller.initializeWithWords(['cat', 'dog'])
      vi.mocked(eventBus.emit).mockClear()
    })

    it('完成词语应该返回 completed: true', () => {
      controller.handleKeyPress('c')
      controller.handleKeyPress('a')
      const result = controller.handleKeyPress('t')
      expect(result.completed).toBe(true)
    })

    it('完成词语应该发送 word:complete 事件', () => {
      controller.handleKeyPress('c')
      controller.handleKeyPress('a')
      controller.handleKeyPress('t')
      expect(eventBus.emit).toHaveBeenCalledWith('word:complete', {
        word: 'cat',
        score: 0,
        perfect: true
      })
    })

    it('完成后应该自动加载下一个词语', () => {
      controller.handleKeyPress('c')
      controller.handleKeyPress('a')
      controller.handleKeyPress('t')
      expect(controller.getCurrentWord()).toBe('dog')
    })

    it('完成后索引应该重置', () => {
      controller.handleKeyPress('c')
      controller.handleKeyPress('a')
      controller.handleKeyPress('t')
      expect(controller.getCurrentIndex()).toBe(0)
    })

    it('有错误时 perfect 应该为 false', () => {
      controller.handleKeyPress('x') // 错误
      vi.mocked(eventBus.emit).mockClear()
      controller.handleKeyPress('c')
      controller.handleKeyPress('a')
      controller.handleKeyPress('t')
      expect(eventBus.emit).toHaveBeenCalledWith('word:complete', {
        word: 'cat',
        score: 0,
        perfect: false
      })
    })
  })

  describe('getCurrentWord', () => {
    it('应该返回当前词语', () => {
      controller.initializeWithWords(['hello'])
      expect(controller.getCurrentWord()).toBe('hello')
    })

    it('未初始化时应该返回空字符串', () => {
      expect(controller.getCurrentWord()).toBe('')
    })
  })

  describe('getCurrentIndex', () => {
    it('应该返回当前输入位置', () => {
      controller.initializeWithWords(['hello'])
      controller.handleKeyPress('h')
      controller.handleKeyPress('e')
      expect(controller.getCurrentIndex()).toBe(2)
    })
  })

  describe('getTypedChars', () => {
    it('应该返回已输入字符', () => {
      controller.initializeWithWords(['hello'])
      controller.handleKeyPress('h')
      controller.handleKeyPress('e')
      expect(controller.getTypedChars()).toBe('he')
    })

    it('未输入时应该返回空字符串', () => {
      controller.initializeWithWords(['hello'])
      expect(controller.getTypedChars()).toBe('')
    })
  })

  describe('getRemainingCount', () => {
    it('应该返回剩余词语数量', () => {
      controller.initializeWithWords(['cat', 'dog', 'sun'])
      // 当前词语是 'cat'，队列中还有 'dog' 和 'sun'
      expect(controller.getRemainingCount()).toBe(2)
    })
  })

  describe('reset', () => {
    it('应该清空词语队列', () => {
      controller.initializeWithWords(['cat', 'dog'])
      controller.reset()
      expect(controller.getCurrentWord()).toBe('')
      expect(controller.getRemainingCount()).toBe(0)
    })

    it('应该重置索引', () => {
      controller.initializeWithWords(['hello'])
      controller.handleKeyPress('h')
      controller.reset()
      expect(controller.getCurrentIndex()).toBe(0)
    })
  })

  describe('loadNextWord', () => {
    it('队列耗尽时应该使用默认词语', () => {
      controller.initializeWithWords(['cat'])
      vi.mocked(eventBus.emit).mockClear()
      // 完成唯一的词语
      controller.handleKeyPress('c')
      controller.handleKeyPress('a')
      controller.handleKeyPress('t')
      // 应该加载了新词语
      expect(controller.getCurrentWord()).not.toBe('')
    })
  })

  describe('空词语处理', () => {
    it('当前词语为空时 handleKeyPress 应该返回 false', () => {
      const result = controller.handleKeyPress('a')
      expect(result.correct).toBe(false)
      expect(result.completed).toBe(false)
    })
  })

  describe('initialize（异步）', () => {
    it('应该能正常初始化', async () => {
      await controller.initialize('zh-pinyin', 1)
      expect(controller.getCurrentWord()).not.toBe('')
    })

    it('词库加载失败时应该使用默认词语', async () => {
      // Mock 加载失败
      const { wordLoader } = await import('../../../../src/systems/typing/WordLoader')
      vi.mocked(wordLoader.load).mockRejectedValueOnce(new Error('Load failed'))

      const newController = new WordController()
      await newController.initialize('invalid', 1)
      expect(newController.getCurrentWord()).not.toBe('')
    })
  })

  describe('难度保持', () => {
    it('队列耗尽时应该使用原始难度重填', () => {
      // 使用困难词语初始化
      controller.initializeWithWords(['keyboard'], 3)
      vi.mocked(eventBus.emit).mockClear()

      // 完成唯一的词语，触发队列重填
      'keyboard'.split('').forEach(char => controller.handleKeyPress(char))

      // 新词应该来自困难词库（长度 >= 6）
      const newWord = controller.getCurrentWord()
      expect(newWord.length).toBeGreaterThanOrEqual(6)
    })
  })

  describe('destroyed 状态', () => {
    it('reset 后 isDestroyed 应该返回 true', () => {
      controller.initializeWithWords(['cat'])
      controller.reset()
      expect(controller.isDestroyed()).toBe(true)
    })

    it('初始化后 isDestroyed 应该返回 false', () => {
      controller.initializeWithWords(['cat'])
      expect(controller.isDestroyed()).toBe(false)
    })

    it('destroyed 后 handleKeyPress 应该返回 false', () => {
      controller.initializeWithWords(['cat'])
      controller.reset()

      const result = controller.handleKeyPress('c')
      expect(result.correct).toBe(false)
    })
  })
})
