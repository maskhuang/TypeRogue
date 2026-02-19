// ============================================
// 打字肉鸽 - ScoreCalculator 单元测试
// ============================================

import { describe, it, expect, beforeEach } from 'vitest'
import { ScoreCalculator } from '../../../../src/systems/scoring/ScoreCalculator'

describe('ScoreCalculator', () => {
  let calculator: ScoreCalculator

  beforeEach(() => {
    calculator = new ScoreCalculator({
      baseMultiplier: 1.0,
      comboBonus: 0.1,
      letterBonus: 0,
      wordBonus: 0
    })
  })

  describe('calculateMultiplier', () => {
    it('0 连击时应该返回基础倍率', () => {
      expect(calculator.calculateMultiplier(0)).toBe(1.0)
    })

    it('连击应该增加倍率', () => {
      expect(calculator.calculateMultiplier(5)).toBe(1.5)  // 1.0 + 5 * 0.1
      expect(calculator.calculateMultiplier(10)).toBe(2.0)  // 1.0 + 10 * 0.1
    })

    it('额外加成应该叠加', () => {
      expect(calculator.calculateMultiplier(0, 0.5)).toBe(1.5)
    })
  })

  describe('onCorrectInput', () => {
    it('应该增加连击', () => {
      const result = calculator.onCorrectInput()
      expect(result.combo).toBe(1)

      const result2 = calculator.onCorrectInput()
      expect(result2.combo).toBe(2)
    })

    it('应该更新倍率', () => {
      calculator.onCorrectInput()
      const result = calculator.onCorrectInput()
      expect(result.multiplier).toBe(1.2)  // 1.0 + 2 * 0.1
    })

    it('应该更新最大连击', () => {
      calculator.onCorrectInput()
      calculator.onCorrectInput()
      calculator.onCorrectInput()
      expect(calculator.getState().maxCombo).toBe(3)
    })
  })

  describe('onErrorInput', () => {
    it('应该重置连击', () => {
      calculator.onCorrectInput()
      calculator.onCorrectInput()
      calculator.onErrorInput()
      expect(calculator.getState().combo).toBe(0)
    })

    it('应该重置倍率到基础值', () => {
      calculator.onCorrectInput()
      calculator.onCorrectInput()
      calculator.onErrorInput()
      expect(calculator.getState().multiplier).toBe(1.0)
    })

    it('不应该影响最大连击记录', () => {
      calculator.onCorrectInput()
      calculator.onCorrectInput()
      calculator.onCorrectInput()
      calculator.onErrorInput()
      expect(calculator.getState().maxCombo).toBe(3)
    })
  })

  describe('onWordComplete', () => {
    it('应该将词语分累加到总分', () => {
      calculator.onCorrectInput()  // 1.1 分
      calculator.onCorrectInput()  // 1.2 分
      calculator.onWordComplete()

      expect(calculator.getState().totalScore).toBeGreaterThan(0)
      expect(calculator.getState().wordScore).toBe(0)  // 词语分被重置
    })

    it('应该保持连击（词语完成不重置连击）', () => {
      calculator.onCorrectInput()
      calculator.onCorrectInput()
      calculator.onWordComplete()
      expect(calculator.getState().combo).toBe(2)
    })
  })

  describe('reset', () => {
    it('应该重置所有状态', () => {
      calculator.onCorrectInput()
      calculator.onCorrectInput()
      calculator.onWordComplete()
      calculator.reset()

      const state = calculator.getState()
      expect(state.totalScore).toBe(0)
      expect(state.combo).toBe(0)
      expect(state.maxCombo).toBe(0)
      expect(state.multiplier).toBe(1.0)
    })
  })

  describe('addScore/addMultiplier', () => {
    it('addScore 应该增加词语分', () => {
      calculator.addScore(10)
      expect(calculator.getState().wordScore).toBe(10)
    })

    it('addMultiplier 应该增加当前倍率', () => {
      calculator.addMultiplier(0.5)
      expect(calculator.getState().multiplier).toBe(1.5)
    })
  })

  describe('setCombo', () => {
    it('应该设置连击并更新倍率', () => {
      calculator.setCombo(5)
      const state = calculator.getState()
      expect(state.combo).toBe(5)
      expect(state.multiplier).toBe(1.5)  // 1.0 + 5 * 0.1
    })
  })
})
