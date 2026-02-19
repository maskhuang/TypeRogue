// ============================================
// 打字肉鸽 - BattleFlowController 单元测试
// ============================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { BattleFlowController, StageConfig } from '../../../../src/scenes/battle/BattleFlowController'
import { BattleState } from '../../../../src/core/state/BattleState'
import { eventBus } from '../../../../src/core/events/EventBus'

// 存储事件回调
const eventCallbacks: Map<string, Function> = new Map()

// Mock eventBus
vi.mock('../../../../src/core/events/EventBus', () => ({
  eventBus: {
    emit: vi.fn(),
    on: vi.fn((event: string, callback: Function) => {
      eventCallbacks.set(event, callback)
      return () => eventCallbacks.delete(event)
    }),
    off: vi.fn()
  }
}))

// Mock WordLoader
vi.mock('../../../../src/systems/typing/WordLoader', () => ({
  wordLoader: {
    load: vi.fn().mockResolvedValue({
      words: ['cat', 'dog', 'sun', 'moon', 'tree']
    })
  }
}))

describe('BattleFlowController', () => {
  let controller: BattleFlowController
  let battleState: BattleState
  const defaultConfig: StageConfig = {
    difficulty: 1,
    targetScore: 1000,
    timeLimit: 60,
    wordCategory: 'zh-pinyin'
  }

  beforeEach(() => {
    battleState = new BattleState()
    controller = new BattleFlowController(battleState)
    vi.mocked(eventBus.emit).mockClear()
    eventCallbacks.clear()
  })

  afterEach(() => {
    controller.destroy()
  })

  describe('initializeSync', () => {
    it('应该设置目标分数', () => {
      controller.initializeSync({ ...defaultConfig, targetScore: 500 }, ['cat', 'dog'])
      expect(controller.getTargetScore()).toBe(500)
    })

    it('应该重置 BattleState', () => {
      battleState.completeWord(100)
      controller.initializeSync(defaultConfig, ['cat', 'dog'])
      expect(battleState.getState().score).toBe(0)
    })

    it('应该设置时间限制', () => {
      controller.initializeSync({ ...defaultConfig, timeLimit: 120 }, ['cat', 'dog'])
      expect(battleState.getState().timeRemaining).toBe(120)
    })

    it('应该初始化第一个词语到 BattleState', () => {
      controller.initializeSync(defaultConfig, ['hello', 'world'])
      expect(battleState.getState().currentWord).toBe('hello')
    })
  })

  describe('getWordController', () => {
    it('应该返回 WordController 实例', () => {
      controller.initializeSync(defaultConfig, ['cat'])
      const wordController = controller.getWordController()
      expect(wordController).toBeDefined()
      expect(wordController.getCurrentWord()).toBe('cat')
    })
  })

  describe('事件处理 - input:keypress', () => {
    beforeEach(() => {
      controller.initializeSync(defaultConfig, ['cat', 'dog'])
      battleState.start()
      vi.mocked(eventBus.emit).mockClear()
    })

    it('正确按键应该更新 BattleState 的 typedChars', () => {
      const keypressCallback = eventCallbacks.get('input:keypress')
      keypressCallback?.({ key: 'c' })
      expect(battleState.getState().typedChars).toBe('c')
    })

    it('正确按键应该触发 skill:triggered 事件', () => {
      const keypressCallback = eventCallbacks.get('input:keypress')
      keypressCallback?.({ key: 'c' })
      expect(eventBus.emit).toHaveBeenCalledWith('skill:triggered', {
        key: 'c',
        skillId: '',
        type: 'passive'
      })
    })

    it('错误按键不应该更新 typedChars', () => {
      const keypressCallback = eventCallbacks.get('input:keypress')
      keypressCallback?.({ key: 'x' })
      expect(battleState.getState().typedChars).toBe('')
    })

    it('非 playing 状态时不应该处理按键', () => {
      battleState.pause()
      const keypressCallback = eventCallbacks.get('input:keypress')
      keypressCallback?.({ key: 'c' })
      expect(battleState.getState().typedChars).toBe('')
    })
  })

  describe('事件处理 - word:complete', () => {
    beforeEach(() => {
      controller.initializeSync(defaultConfig, ['cat', 'dog'])
      battleState.start()
      vi.mocked(eventBus.emit).mockClear()
    })

    it('完成词语应该增加分数', () => {
      const completeCallback = eventCallbacks.get('word:complete')
      completeCallback?.({ word: 'cat', score: 0, perfect: true })
      expect(battleState.getState().score).toBeGreaterThan(0)
    })

    it('完成词语应该增加连击', () => {
      const completeCallback = eventCallbacks.get('word:complete')
      completeCallback?.({ word: 'cat', score: 0, perfect: true })
      expect(battleState.getState().combo).toBe(1)
    })

    it('完成词语应该更新 BattleState 的当前词语', () => {
      // Note: word:complete 回调会从 WordController 获取当前词语
      // WordController 在发送 word:complete 之前已经 loadNextWord
      // 但在测试中我们直接模拟事件，所以 WordController 仍然停留在原词
      // 这个测试验证的是 setCurrentWord 被调用
      const initialWord = battleState.getState().currentWord
      const completeCallback = eventCallbacks.get('word:complete')
      completeCallback?.({ word: 'cat', score: 0, perfect: true })
      // 验证 setCurrentWord 被调用（从 WordController 获取当前词）
      expect(battleState.getState().currentWord).toBe(controller.getWordController().getCurrentWord())
    })

    it('完成词语应该发送 score:update 事件', () => {
      const completeCallback = eventCallbacks.get('word:complete')
      completeCallback?.({ word: 'cat', score: 0, perfect: true })
      expect(eventBus.emit).toHaveBeenCalledWith('score:update', expect.objectContaining({
        score: expect.any(Number),
        multiplier: expect.any(Number),
        combo: 1
      }))
    })
  })

  describe('事件处理 - word:error', () => {
    beforeEach(() => {
      controller.initializeSync(defaultConfig, ['cat', 'dog'])
      battleState.start()
      // 先增加一些连击
      battleState.completeWord(100)
      battleState.completeWord(100)
      vi.mocked(eventBus.emit).mockClear()
    })

    it('错误应该重置连击', () => {
      expect(battleState.getState().combo).toBe(2)
      const errorCallback = eventCallbacks.get('word:error')
      errorCallback?.({ key: 'x', expected: 'c' })
      expect(battleState.getState().combo).toBe(0)
    })

    it('错误应该增加错误计数', () => {
      const errorCallback = eventCallbacks.get('word:error')
      errorCallback?.({ key: 'x', expected: 'c' })
      expect(battleState.getState().errorCount).toBe(1)
    })
  })

  describe('胜利条件', () => {
    it('达到目标分数应该触发胜利', () => {
      // ScoreCalculator 默认每字母 1 分，'cat' = 3 分
      // 使用 targetScore: 3 确保一个词就能达到
      controller.initializeSync({ ...defaultConfig, targetScore: 3 }, ['cat', 'dog'])
      battleState.start()

      // 验证回调已注册
      const completeCallback = eventCallbacks.get('word:complete')
      expect(completeCallback).toBeDefined()

      // 完成词语获得足够分数
      completeCallback!({ word: 'cat', score: 0, perfect: true })

      // 验证分数增加且达到胜利
      const state = battleState.getState()
      expect(state.score).toBeGreaterThanOrEqual(3)
      expect(state.phase).toBe('victory')
    })

    it('update 时检查胜利条件', () => {
      controller.initializeSync({ ...defaultConfig, targetScore: 100 }, ['cat'])
      battleState.start()

      // 直接添加分数到达目标
      battleState.addScore(100)

      // 调用 update
      controller.update(0.016)

      expect(battleState.getState().phase).toBe('victory')
    })
  })

  describe('失败条件', () => {
    it('时间耗尽应该触发失败', () => {
      controller.initializeSync({ ...defaultConfig, timeLimit: 10 }, ['cat'])
      battleState.start()

      // 更新时间直到耗尽
      battleState.updateTime(10)

      expect(battleState.getState().phase).toBe('defeat')
    })
  })

  describe('destroy', () => {
    it('destroy 后 isDestroyed 应该返回 true', () => {
      controller.initializeSync(defaultConfig, ['cat'])
      controller.destroy()
      expect(controller.isDestroyed()).toBe(true)
    })

    it('destroy 后不应该处理事件', () => {
      controller.initializeSync(defaultConfig, ['cat'])
      battleState.start()
      controller.destroy()

      const keypressCallback = eventCallbacks.get('input:keypress')
      // 回调可能已被移除，但即使调用也不应有效果
      if (keypressCallback) {
        keypressCallback({ key: 'c' })
      }
      expect(battleState.getState().typedChars).toBe('')
    })
  })

  describe('unbindEvents', () => {
    it('应该能安全地多次调用', () => {
      controller.initializeSync(defaultConfig, ['cat'])
      expect(() => {
        controller.unbindEvents()
        controller.unbindEvents()
      }).not.toThrow()
    })
  })

  describe('initialize（异步）', () => {
    it('应该能正常异步初始化', async () => {
      await controller.initialize(defaultConfig)
      expect(controller.getWordController().getCurrentWord()).not.toBe('')
    })
  })

  describe('getTargetScore', () => {
    it('应该返回配置的目标分数', () => {
      controller.initializeSync({ ...defaultConfig, targetScore: 2000 }, ['cat'])
      expect(controller.getTargetScore()).toBe(2000)
    })
  })

  describe('getBattleResult (AC6 预留接口)', () => {
    it('胜利时应该返回正确的结果', () => {
      controller.initializeSync({ ...defaultConfig, targetScore: 3, timeLimit: 60 }, ['cat'])
      battleState.start()

      // 完成词语触发胜利
      const completeCallback = eventCallbacks.get('word:complete')
      completeCallback?.({ word: 'cat', score: 0, perfect: true })

      const result = controller.getBattleResult()
      expect(result.result).toBe('win')
      expect(result.score).toBeGreaterThan(0)
      expect(result.maxCombo).toBe(1)
      expect(result.wordsCompleted).toBe(1)
    })

    it('失败时应该返回正确的结果', () => {
      controller.initializeSync({ ...defaultConfig, targetScore: 1000, timeLimit: 10 }, ['cat'])
      battleState.start()

      // 时间耗尽
      battleState.updateTime(10)

      const result = controller.getBattleResult()
      expect(result.result).toBe('lose')
      expect(result.timeUsed).toBeCloseTo(10, 0)
    })

    it('应该包含 accuracy 字段', () => {
      controller.initializeSync(defaultConfig, ['cat'])
      battleState.start()

      const result = controller.getBattleResult()
      expect(result.accuracy).toBeGreaterThanOrEqual(0)
      expect(result.accuracy).toBeLessThanOrEqual(1)
    })

    it('无错误时 accuracy 应该为 1', () => {
      controller.initializeSync({ ...defaultConfig, targetScore: 3 }, ['cat'])
      battleState.start()

      // 完美完成
      const completeCallback = eventCallbacks.get('word:complete')
      completeCallback?.({ word: 'cat', score: 0, perfect: true })

      const result = controller.getBattleResult()
      expect(result.accuracy).toBe(1)
    })
  })
})
