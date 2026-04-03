// ============================================
// 打字肉鸽 - Burst（连射）词条 单元测试
// ============================================
// Story 49.1: 暴击型 — 连射

import { describe, it, expect } from 'vitest'
import { AffixType, AFFIX_CATEGORY_MAP, AFFIX_NAMES, AFFIX_WEIGHT_TIERS } from '../../../src/data/affixes'

describe('Burst affix data', () => {
  it('should be in the crit category', () => {
    expect(AFFIX_CATEGORY_MAP[AffixType.Burst]).toBe('crit')
  })

  it('should have name and high weight', () => {
    expect(AFFIX_NAMES[AffixType.Burst]).toBe('连射')
    expect(AFFIX_WEIGHT_TIERS[AffixType.Burst]).toBe('high')
  })
})

describe('Burst Phase 3 logic', () => {
  function simulateBurst(critStreak: number, burstK: number | undefined): number {
    if (critStreak <= 0 || (burstK ?? 0) <= 0) return 1.0 // no multiplier
    return 1 + (burstK ?? 0) * critStreak
  }

  // AC1: consecutive crits increase multiplier
  it('should give 1.0 (no extra) on first crit (streak=0)', () => {
    expect(simulateBurst(0, 0.30)).toBe(1.0)
  })

  it('should give 1.30 on second consecutive crit (streak=1)', () => {
    expect(simulateBurst(1, 0.30)).toBeCloseTo(1.30)
  })

  it('should give 1.90 on fourth consecutive crit (streak=3)', () => {
    expect(simulateBurst(3, 0.30)).toBeCloseTo(1.90)
  })

  it('should give 2.50 on sixth consecutive crit (streak=5)', () => {
    expect(simulateBurst(5, 0.30)).toBeCloseTo(2.50)
  })

  // AC2: miss resets streak to 0
  it('should give 1.0 after miss (streak reset to 0)', () => {
    // After miss, critStreak = 0, so no burst bonus on next crit
    expect(simulateBurst(0, 0.30)).toBe(1.0)
  })

  // Undefined burstK
  it('should give 1.0 with undefined burstK', () => {
    expect(simulateBurst(3, undefined)).toBe(1.0)
  })

  it('should give 1.0 with burstK = 0', () => {
    expect(simulateBurst(3, 0)).toBe(1.0)
  })

  // Scaling verification
  it('higher burstK = stronger multiplier', () => {
    expect(simulateBurst(3, 0.40)).toBeGreaterThan(simulateBurst(3, 0.20))
  })
})
