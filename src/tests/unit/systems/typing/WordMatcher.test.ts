// ============================================
// 打字肉鸽 - WordMatcher 单元测试
// ============================================

import { describe, it, expect, beforeEach } from 'vitest'
import { WordMatcher } from '../../../../src/systems/typing/WordMatcher'

describe('WordMatcher', () => {
  let matcher: WordMatcher

  beforeEach(() => {
    matcher = new WordMatcher()
  })

  describe('setWord', () => {
    it('应该设置词语并转换为大写', () => {
      matcher.setWord('hello')
      expect(matcher.getWord()).toBe('HELLO')
    })

    it('应该重置索引为0', () => {
      matcher.setWord('test')
      expect(matcher.getCurrentIndex()).toBe(0)
    })
  })

  describe('matchChar', () => {
    beforeEach(() => {
      matcher.setWord('ABC')
    })

    it('正确字符应该返回 correct 并增加索引', () => {
      expect(matcher.matchChar('a')).toBe('correct')
      expect(matcher.getCurrentIndex()).toBe(1)
    })

    it('错误字符应该返回 error 并增加错误计数', () => {
      expect(matcher.matchChar('x')).toBe('error')
      expect(matcher.getErrorCount()).toBe(1)
      expect(matcher.isPerfect()).toBe(false)
    })

    it('最后一个正确字符应该返回 complete', () => {
      matcher.matchChar('a')
      matcher.matchChar('b')
      expect(matcher.matchChar('c')).toBe('complete')
    })

    it('没有设置词语时应该返回 error', () => {
      const emptyMatcher = new WordMatcher()
      expect(emptyMatcher.matchChar('a')).toBe('error')
    })
  })

  describe('getExpectedChar', () => {
    it('应该返回当前期望的字符', () => {
      matcher.setWord('test')
      expect(matcher.getExpectedChar()).toBe('T')
      matcher.matchChar('t')
      expect(matcher.getExpectedChar()).toBe('E')
    })

    it('没有词语时应该返回 null', () => {
      expect(matcher.getExpectedChar()).toBeNull()
    })
  })

  describe('getCompleteStats', () => {
    it('应该返回正确的统计数据', () => {
      matcher.setWord('ab')
      matcher.matchChar('a')
      matcher.matchChar('b')

      const stats = matcher.getCompleteStats()
      expect(stats).not.toBeNull()
      expect(stats!.word).toBe('AB')
      expect(stats!.errors).toBe(0)
      expect(stats!.perfect).toBe(true)
      expect(stats!.accuracy).toBe(100)
    })

    it('有错误时应该计算正确的准确率', () => {
      matcher.setWord('ab')
      matcher.matchChar('x') // error
      matcher.matchChar('a')
      matcher.matchChar('b')

      const stats = matcher.getCompleteStats()
      expect(stats!.errors).toBe(1)
      expect(stats!.perfect).toBe(false)
      // accuracy = 2 / (2 + 1) * 100 = 66.67
      expect(stats!.accuracy).toBeCloseTo(66.67, 1)
    })
  })

  describe('reset', () => {
    it('应该清除状态', () => {
      matcher.setWord('test')
      matcher.matchChar('t')
      matcher.reset()
      expect(matcher.getWord()).toBeNull()
      expect(matcher.getCurrentIndex()).toBe(0)
    })
  })
})
