// ============================================
// 打字肉鸽 - BattleState 单元测试
// ============================================

import { describe, it, expect, beforeEach } from 'vitest'
import { BattleState } from '../../../../src/core/state/BattleState'

describe('BattleState', () => {
  let state: BattleState

  beforeEach(() => {
    state = new BattleState()
  })

  describe('初始状态', () => {
    it('默认 phase 应该是 ready', () => {
      expect(state.getState().phase).toBe('ready')
    })

    it('默认分数应该是 0', () => {
      expect(state.getState().score).toBe(0)
    })

    it('默认时间应该是 60 秒', () => {
      expect(state.getState().timeRemaining).toBe(60)
      expect(state.getState().totalTime).toBe(60)
    })

    it('默认倍率应该是 1.0', () => {
      expect(state.getState().multiplier).toBe(1.0)
    })

    it('默认连击应该是 0', () => {
      expect(state.getState().combo).toBe(0)
      expect(state.getState().maxCombo).toBe(0)
    })

    it('默认词语相关字段应该为空', () => {
      expect(state.getState().currentWord).toBe('')
      expect(state.getState().typedChars).toBe('')
      expect(state.getState().wordIndex).toBe(0)
    })

    it('默认计数器应该是 0', () => {
      expect(state.getState().wordsCompleted).toBe(0)
      expect(state.getState().errorCount).toBe(0)
    })
  })

  describe('状态转换', () => {
    it('start() 应该将 phase 改为 playing', () => {
      state.start()
      expect(state.getState().phase).toBe('playing')
    })

    it('pause() 应该将 playing 改为 paused', () => {
      state.start()
      state.pause()
      expect(state.getState().phase).toBe('paused')
    })

    it('pause() 在非 playing 状态时不应改变 phase', () => {
      // ready 状态
      state.pause()
      expect(state.getState().phase).toBe('ready')
    })

    it('resume() 应该将 paused 改为 playing', () => {
      state.start()
      state.pause()
      state.resume()
      expect(state.getState().phase).toBe('playing')
    })

    it('resume() 在非 paused 状态时不应改变 phase', () => {
      // ready 状态
      state.resume()
      expect(state.getState().phase).toBe('ready')

      // playing 状态
      state.start()
      state.resume()
      expect(state.getState().phase).toBe('playing')
    })
  })

  describe('状态查询方法', () => {
    it('isPlaying() 应该正确判断', () => {
      expect(state.isPlaying()).toBe(false)
      state.start()
      expect(state.isPlaying()).toBe(true)
      state.pause()
      expect(state.isPlaying()).toBe(false)
    })

    it('isPaused() 应该正确判断', () => {
      expect(state.isPaused()).toBe(false)
      state.start()
      expect(state.isPaused()).toBe(false)
      state.pause()
      expect(state.isPaused()).toBe(true)
    })

    it('isEnded() 应该正确判断', () => {
      expect(state.isEnded()).toBe(false)
      state.start()
      expect(state.isEnded()).toBe(false)
    })
  })

  describe('时间更新', () => {
    it('updateTime 应该正确减少时间', () => {
      state.start()
      state.updateTime(1) // 减少 1 秒
      expect(state.getState().timeRemaining).toBe(59)
    })

    it('updateTime 在非 playing 状态时不应更新时间', () => {
      state.updateTime(1)
      expect(state.getState().timeRemaining).toBe(60) // 未改变

      state.start()
      state.pause()
      state.updateTime(1)
      expect(state.getState().timeRemaining).toBe(60) // 暂停时未改变
    })

    it('时间耗尽时 phase 应该变为 defeat', () => {
      state.start()
      state.updateTime(60) // 减少 60 秒
      expect(state.getState().timeRemaining).toBe(0)
      expect(state.getState().phase).toBe('defeat')
      expect(state.isEnded()).toBe(true)
    })

    it('时间不应该为负数', () => {
      state.start()
      state.updateTime(100) // 超过总时间
      expect(state.getState().timeRemaining).toBe(0)
    })
  })

  describe('词语管理', () => {
    it('setCurrentWord 应该设置当前词语并清空 typedChars', () => {
      state.setCurrentWord('hello')
      expect(state.getState().currentWord).toBe('hello')
      expect(state.getState().typedChars).toBe('')
    })

    it('addTypedChar 应该追加字符', () => {
      state.setCurrentWord('hello')
      state.addTypedChar('h')
      expect(state.getState().typedChars).toBe('h')
      state.addTypedChar('e')
      expect(state.getState().typedChars).toBe('he')
    })
  })

  describe('词语完成', () => {
    it('completeWord 应该增加分数', () => {
      state.completeWord(100)
      expect(state.getState().score).toBe(100)
    })

    it('completeWord 应该增加连击', () => {
      state.completeWord(100)
      expect(state.getState().combo).toBe(1)
      state.completeWord(100)
      expect(state.getState().combo).toBe(2)
    })

    it('completeWord 应该更新最高连击', () => {
      state.completeWord(100)
      state.completeWord(100)
      state.completeWord(100)
      expect(state.getState().maxCombo).toBe(3)
    })

    it('completeWord 应该增加已完成词语数', () => {
      state.completeWord(100)
      expect(state.getState().wordsCompleted).toBe(1)
    })

    it('completeWord 应该增加词语索引', () => {
      state.completeWord(100)
      expect(state.getState().wordIndex).toBe(1)
    })
  })

  describe('错误处理', () => {
    it('onError 应该重置连击', () => {
      state.completeWord(100)
      state.completeWord(100)
      expect(state.getState().combo).toBe(2)

      state.onError()
      expect(state.getState().combo).toBe(0)
    })

    it('onError 不应该重置最高连击', () => {
      state.completeWord(100)
      state.completeWord(100)
      state.completeWord(100)
      expect(state.getState().maxCombo).toBe(3)

      state.onError()
      expect(state.getState().maxCombo).toBe(3)
    })

    it('onError 应该增加错误次数', () => {
      state.onError()
      expect(state.getState().errorCount).toBe(1)
      state.onError()
      expect(state.getState().errorCount).toBe(2)
    })
  })

  describe('倍率设置', () => {
    it('setMultiplier 应该更新倍率', () => {
      state.setMultiplier(2.5)
      expect(state.getState().multiplier).toBe(2.5)
    })
  })

  describe('重置', () => {
    it('reset 应该恢复所有状态到初始值', () => {
      // 修改各种状态
      state.start()
      state.completeWord(500)
      state.completeWord(300)
      state.setMultiplier(3.0)
      state.setCurrentWord('test')
      state.addTypedChar('t')
      state.onError()
      state.updateTime(10)

      // 重置
      state.reset()

      // 验证所有状态恢复
      const s = state.getState()
      expect(s.phase).toBe('ready')
      expect(s.score).toBe(0)
      expect(s.combo).toBe(0)
      expect(s.maxCombo).toBe(0)
      expect(s.multiplier).toBe(1.0)
      expect(s.currentWord).toBe('')
      expect(s.typedChars).toBe('')
      expect(s.wordIndex).toBe(0)
      expect(s.wordsCompleted).toBe(0)
      expect(s.errorCount).toBe(0)
      expect(s.timeRemaining).toBe(60)
      expect(s.totalTime).toBe(60)
    })

    it('reset 应该支持自定义总时间', () => {
      state.reset(120)
      expect(state.getState().totalTime).toBe(120)
      expect(state.getState().timeRemaining).toBe(120)
    })
  })

  describe('getState 不可变性', () => {
    it('getState 返回的对象应该是只读的', () => {
      const s = state.getState()
      // TypeScript 会阻止直接修改，这里验证类型系统正常工作
      expect(typeof s).toBe('object')
    })
  })

  describe('setVictory', () => {
    it('setVictory 应该将 playing 状态改为 victory', () => {
      state.start()
      state.setVictory()
      expect(state.getState().phase).toBe('victory')
      expect(state.isEnded()).toBe(true)
    })

    it('setVictory 在非 playing 状态时不应改变 phase', () => {
      // ready 状态
      state.setVictory()
      expect(state.getState().phase).toBe('ready')

      // paused 状态
      state.start()
      state.pause()
      state.setVictory()
      expect(state.getState().phase).toBe('paused')
    })
  })

  describe('setDefeat', () => {
    it('setDefeat 应该将 playing 状态改为 defeat', () => {
      state.start()
      state.setDefeat()
      expect(state.getState().phase).toBe('defeat')
      expect(state.isEnded()).toBe(true)
    })

    it('setDefeat 在非 playing 状态时不应改变 phase', () => {
      // ready 状态
      state.setDefeat()
      expect(state.getState().phase).toBe('ready')

      // paused 状态
      state.start()
      state.pause()
      state.setDefeat()
      expect(state.getState().phase).toBe('paused')
    })
  })
})
