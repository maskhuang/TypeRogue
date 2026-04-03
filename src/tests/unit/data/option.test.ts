// ============================================
// 打字肉鸽 - Option（期权）词条 单元测试
// ============================================
// Story 48.2: 数值型 — 期权

import { describe, it, expect } from 'vitest'
import { AffixType, AFFIX_CATEGORY_MAP, AFFIX_NAMES, AFFIX_WEIGHT_TIERS } from '../../../src/data/affixes'

describe('Option affix data', () => {
  it('should be in the numeric category', () => {
    expect(AFFIX_CATEGORY_MAP[AffixType.Option]).toBe('numeric')
  })

  it('should have name and high weight', () => {
    expect(AFFIX_NAMES[AffixType.Option]).toBe('期权')
    expect(AFFIX_WEIGHT_TIERS[AffixType.Option]).toBe('high')
  })
})

describe('Option Phase 2 logic', () => {
  function simulateOption(stageProduced: number, strikePrice: number, optionK: number | undefined, premium: number | undefined, norm: number = 1) {
    if (stageProduced >= strikePrice) {
      return (optionK ?? 0) * (stageProduced - strikePrice) * norm
    } else {
      return -(premium ?? 0)
    }
  }

  // AC1: above strike = linear gains
  it('should give linear bonus above strike price', () => {
    expect(simulateOption(30, 20, 0.06, 0.08)).toBeCloseTo(0.60) // +60%
  })

  it('should give higher bonus further above strike', () => {
    expect(simulateOption(50, 20, 0.06, 0.08)).toBeCloseTo(1.80) // +180%
  })

  // AC2: below strike = premium loss
  it('should deduct premium below strike price', () => {
    expect(simulateOption(5, 20, 0.06, 0.08)).toBeCloseTo(-0.08) // -8%
  })

  it('should deduct premium at zero production', () => {
    expect(simulateOption(0, 20, 0.06, 0.08)).toBeCloseTo(-0.08) // -8%
  })

  // AC3: at strike = zero
  it('should give zero bonus at strike price', () => {
    expect(simulateOption(20, 20, 0.06, 0.08)).toBe(0)
  })

  // Normalization
  it('should apply normalization factor', () => {
    expect(simulateOption(30, 20, 0.06, 0.08, 0.5)).toBeCloseTo(0.30)
  })

  // Premium is fixed (not affected by norm)
  it('premium should not be affected by normalization', () => {
    expect(simulateOption(5, 20, 0.06, 0.08, 2.0)).toBeCloseTo(-0.08)
  })

  // Undefined params
  it('should give 0 gains with undefined optionK above strike', () => {
    // 30 >= 20, so (undefined ?? 0) * 10 = 0
    expect(simulateOption(30, 20, undefined, 0.08)).toBe(0)
  })

  it('should give 0 premium with undefined premium below strike', () => {
    // -(undefined ?? 0) = 0
    expect(simulateOption(5, 20, 0.06, undefined)).toBeCloseTo(0)
  })
})
