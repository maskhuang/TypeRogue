// ============================================
// 打字肉鸽 - ZeroIn（校准）词条 单元测试
// ============================================
// Story 49.2: 暴击型 — 校准

import { describe, it, expect } from 'vitest'
import { AffixType, AFFIX_CATEGORY_MAP, AFFIX_NAMES, AFFIX_WEIGHT_TIERS } from '../../../src/data/affixes'

describe('ZeroIn affix data', () => {
  it('should be in the crit category', () => {
    expect(AFFIX_CATEGORY_MAP[AffixType.ZeroIn]).toBe('crit')
  })

  it('should have name and high weight', () => {
    expect(AFFIX_NAMES[AffixType.ZeroIn]).toBe('校准')
    expect(AFFIX_WEIGHT_TIERS[AffixType.ZeroIn]).toBe('high')
  })
})

describe('ZeroIn Phase 3 logic', () => {
  function simulateZeroIn(missStreak: number, zeroInK: number | undefined): number {
    if (missStreak <= 0 || (zeroInK ?? 0) <= 0) return 1.0
    return 1 + (zeroInK ?? 0) * missStreak
  }

  // AC1: miss accumulation increases crit multiplier
  it('should give 1.25 after 1 miss (missStreak=1, k=0.25)', () => {
    expect(simulateZeroIn(1, 0.25)).toBeCloseTo(1.25)
  })

  it('should give 1.75 after 3 misses', () => {
    expect(simulateZeroIn(3, 0.25)).toBeCloseTo(1.75)
  })

  it('should give 2.25 after 5 misses', () => {
    expect(simulateZeroIn(5, 0.25)).toBeCloseTo(2.25)
  })

  // AC2: no effect during consecutive crits (missStreak=0)
  it('should give 1.0 when missStreak is 0', () => {
    expect(simulateZeroIn(0, 0.25)).toBe(1.0)
  })

  // Undefined zeroInK
  it('should give 1.0 with undefined zeroInK', () => {
    expect(simulateZeroIn(3, undefined)).toBe(1.0)
  })

  it('should give 1.0 with zeroInK = 0', () => {
    expect(simulateZeroIn(3, 0)).toBe(1.0)
  })

  // AC3: Fallacy + ZeroIn complementary
  it('Fallacy adds critChance, ZeroIn adds critMult — independent', () => {
    // After 5 misses: Fallacy adds 5 × fallacyK to critChance
    // ZeroIn adds (1 + 5 × zeroInK) multiplier to output on crit
    const fallacyBonus = 5 * 0.05 // +25% critChance
    const zeroInMult = simulateZeroIn(5, 0.25) // ×2.25 critMult
    expect(fallacyBonus).toBeCloseTo(0.25)
    expect(zeroInMult).toBeCloseTo(2.25)
    // Both independent — no conflict
  })

  // Scaling
  it('higher zeroInK = stronger compensation', () => {
    expect(simulateZeroIn(3, 0.30)).toBeGreaterThan(simulateZeroIn(3, 0.15))
  })
})
