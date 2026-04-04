// ============================================
// Story 54.8: A9-A10 终极试炼 — 单元测试
// ============================================

import { describe, it, expect, afterEach } from 'vitest'
import { state, calculateTargetScore } from '../../../src/core/state'
import { BALANCE, A10_TARGET_GROWTH, A10_ERROR_TIME_PENALTY } from '../../../src/core/constants'

describe('A9-A10 Ultimate Trial', () => {
  afterEach(() => {
    state.ascensionLevel = 0
    state.calibratedTargetBase = 0
  })

  describe('A10 calculateTargetScore growth rate', () => {
    it('A0 uses default TARGET_GROWTH (1.45)', () => {
      state.ascensionLevel = 0
      state.calibratedTargetBase = 300
      const target = calculateTargetScore(5)
      expect(target).toBe(Math.round(300 * Math.pow(BALANCE.TARGET_GROWTH, 3)))
    })

    it('A10 uses A10_TARGET_GROWTH (1.55)', () => {
      state.ascensionLevel = 10
      state.calibratedTargetBase = 300
      const target = calculateTargetScore(5)
      expect(target).toBe(Math.round(300 * Math.pow(A10_TARGET_GROWTH, 3)))
    })

    it('A10 produces higher targets than A0 at same stage', () => {
      state.calibratedTargetBase = 300
      state.ascensionLevel = 0
      const a0 = calculateTargetScore(10)
      state.ascensionLevel = 10
      const a10 = calculateTargetScore(10)
      expect(a10).toBeGreaterThan(a0)
    })

    it('A9 still uses default growth', () => {
      state.ascensionLevel = 9
      state.calibratedTargetBase = 300
      const target = calculateTargetScore(5)
      expect(target).toBe(Math.round(300 * Math.pow(BALANCE.TARGET_GROWTH, 3)))
    })
  })

  describe('A10 constants', () => {
    it('A10_TARGET_GROWTH should be 1.55', () => {
      expect(A10_TARGET_GROWTH).toBe(1.55)
    })

    it('A10_ERROR_TIME_PENALTY should be 2', () => {
      expect(A10_ERROR_TIME_PENALTY).toBe(2)
    })
  })
})
