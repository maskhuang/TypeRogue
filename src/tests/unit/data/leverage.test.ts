// ============================================
// 打字肉鸽 - Leverage（杠杆）词条 单元测试
// ============================================
// Story 48.1: 数值型 — 杠杆

import { describe, it, expect } from 'vitest'
import { AffixType, AFFIX_CATEGORY_MAP, AFFIX_NAMES, AFFIX_WEIGHT_TIERS } from '../../../src/data/affixes'

describe('Leverage affix data', () => {
  it('should be in the numeric category', () => {
    expect(AFFIX_CATEGORY_MAP[AffixType.Leverage]).toBe('numeric')
  })

  it('should have name and high weight', () => {
    expect(AFFIX_NAMES[AffixType.Leverage]).toBe('杠杆')
    expect(AFFIX_WEIGHT_TIERS[AffixType.Leverage]).toBe('high')
  })
})

describe('Leverage Phase 2 logic', () => {
  function simulateLeverage(resourceVal: number, marginThreshold: number, leverageK: number | undefined, norm: number = 1) {
    const excess = resourceVal - marginThreshold
    return (leverageK ?? 0) * excess * norm
  }

  // AC1: above threshold = positive
  it('should give positive bonus when resource > threshold', () => {
    expect(simulateLeverage(20, 10, 0.10)).toBeCloseTo(1.0) // +100%
  })

  it('should give positive bonus at high resource', () => {
    expect(simulateLeverage(30, 10, 0.10)).toBeCloseTo(2.0) // +200%
  })

  // AC1: below threshold = negative
  it('should give negative bonus when resource < threshold', () => {
    expect(simulateLeverage(5, 10, 0.10)).toBeCloseTo(-0.5) // -50%
  })

  it('should give negative bonus at zero resource', () => {
    expect(simulateLeverage(0, 10, 0.10)).toBeCloseTo(-1.0) // -100%
  })

  // AC2: at threshold = zero
  it('should give zero bonus at threshold', () => {
    expect(simulateLeverage(10, 10, 0.10)).toBe(0)
  })

  // Normalization
  it('should apply normalization factor', () => {
    expect(simulateLeverage(20, 10, 0.10, 0.5)).toBeCloseTo(0.5) // 10 * 0.10 * 0.5
  })

  // Undefined leverageK
  it('should give 0 with undefined leverageK', () => {
    expect(simulateLeverage(20, 10, undefined)).toBe(0)
  })

  // Extreme: very high resource
  it('should scale linearly at extreme values', () => {
    const bonus = simulateLeverage(100, 10, 0.10)
    expect(bonus).toBeCloseTo(9.0) // +900%
  })
})
