// ============================================
// Story 54.2: 练习关香蕉映射 — 单元测试
// ============================================

import { describe, it, expect } from 'vitest'
import { computePracticeGold, PRACTICE_GOLD } from '../../../src/core/constants'

describe('computePracticeGold', () => {
  // === A0 (ascensionLevel = 0) ===

  describe('A0 (no ascension)', () => {
    it('returns BASE (100) for score 0', () => {
      expect(computePracticeGold(0, 0)).toBe(100)
    })

    it('tier 1: 0.1g/point for score 0-200', () => {
      expect(computePracticeGold(100, 0)).toBe(110)  // 100 + 100*0.1
      expect(computePracticeGold(200, 0)).toBe(120)  // 100 + 200*0.1
    })

    it('tier 2: 0.06g/point for score 200-500', () => {
      expect(computePracticeGold(300, 0)).toBe(126)  // 100 + 20 + 100*0.06 = 126
      expect(computePracticeGold(500, 0)).toBe(138)  // 100 + 20 + 300*0.06 = 138
    })

    it('tier 3: 0.02g/point for score 500+', () => {
      expect(computePracticeGold(800, 0)).toBe(144)  // 100 + 20 + 18 + 300*0.02 = 144
    })

    it('caps at HARD_CAP (160)', () => {
      expect(computePracticeGold(5000, 0)).toBe(160)
    })
  })

  // === A1+ (ascensionLevel >= 1) ===

  describe('A1+ (ascension multiplier)', () => {
    it('applies 0.75 multiplier at A1', () => {
      expect(computePracticeGold(0, 1)).toBe(75)    // floor(100 * 0.75)
    })

    it('score 300 at A1', () => {
      expect(computePracticeGold(300, 1)).toBe(94)   // floor(126 * 0.75) = 94
    })

    it('score 500 at A1', () => {
      expect(computePracticeGold(500, 1)).toBe(103)  // floor(138 * 0.75) = 103
    })

    it('high ascension levels still use same multiplier', () => {
      expect(computePracticeGold(0, 5)).toBe(75)
      expect(computePracticeGold(0, 10)).toBe(75)
    })

    it('HARD_CAP still applies after multiplier', () => {
      expect(computePracticeGold(5000, 1)).toBeLessThanOrEqual(PRACTICE_GOLD.HARD_CAP)
    })
  })

  // === Edge cases ===

  // Note: effectiveScore floor logic (max(score, ascensionLevel * 50)) lives in battle.ts
  // and depends on module state (_isCalibrationLevel). Tested via integration, not unit test.

  describe('edge cases', () => {
    it('negative score treated as 0 bonus', () => {
      // Shouldn't happen but defensive
      expect(computePracticeGold(-100, 0)).toBe(100) // bonus from negative = negative, but BASE dominates
    })

    it('PRACTICE_GOLD constants are correct', () => {
      expect(PRACTICE_GOLD.BASE).toBe(100)
      expect(PRACTICE_GOLD.HARD_CAP).toBe(160)
      expect(PRACTICE_GOLD.A1_MULT).toBe(0.75)
      expect(PRACTICE_GOLD.FLOOR_PER_LEVEL).toBe(50)
    })
  })
})
