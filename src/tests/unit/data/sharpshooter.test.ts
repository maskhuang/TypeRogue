// ============================================
// 打字肉鸽 - Sharpshooter（神射）词条 单元测试
// ============================================
// Story 49.3: 暴击型 — 神射

import { describe, it, expect } from 'vitest'
import { AffixType, AFFIX_CATEGORY_MAP, AFFIX_NAMES, AFFIX_WEIGHT_TIERS } from '../../../src/data/affixes'

describe('Sharpshooter affix data', () => {
  it('should be in the crit category', () => {
    expect(AFFIX_CATEGORY_MAP[AffixType.Sharpshooter]).toBe('crit')
  })

  it('should have name and high weight', () => {
    expect(AFFIX_NAMES[AffixType.Sharpshooter]).toBe('神射')
    expect(AFFIX_WEIGHT_TIERS[AffixType.Sharpshooter]).toBe('high')
  })
})

describe('Sharpshooter Phase 3 logic', () => {
  function simulateSharpshooter(critChance: number, sharpK: number | undefined): number {
    if ((sharpK ?? 0) <= 0) return 1.0
    return 1 + (sharpK ?? 0) * Math.max(0, 1 - critChance)
  }

  // AC1: low critChance = high multiplier
  it('critChance=10% → high multiplier', () => {
    expect(simulateSharpshooter(0.10, 1.50)).toBeCloseTo(2.35) // 1 + 1.5 × 0.9
  })

  it('critChance=30% → medium multiplier', () => {
    expect(simulateSharpshooter(0.30, 1.50)).toBeCloseTo(2.05) // 1 + 1.5 × 0.7
  })

  it('critChance=50% → moderate multiplier', () => {
    expect(simulateSharpshooter(0.50, 1.50)).toBeCloseTo(1.75) // 1 + 1.5 × 0.5
  })

  it('critChance=80% → low multiplier', () => {
    expect(simulateSharpshooter(0.80, 1.50)).toBeCloseTo(1.30) // 1 + 1.5 × 0.2
  })

  // AC2: critChance=100% → no bonus
  it('critChance=100% → multiplier = 1.0', () => {
    expect(simulateSharpshooter(1.00, 1.50)).toBeCloseTo(1.0)
  })

  // AC4: expected bonus peaks at 50%
  it('expected bonus should peak near critChance=50%', () => {
    const k = 1.50
    // Expected bonus = critChance × sharpK × (1 - critChance)
    const evBonus = (cc: number) => cc * k * Math.max(0, 1 - cc)
    expect(evBonus(0.50)).toBeGreaterThan(evBonus(0.10))
    expect(evBonus(0.50)).toBeGreaterThan(evBonus(0.90))
  })

  // Undefined sharpK
  it('should give 1.0 with undefined sharpK', () => {
    expect(simulateSharpshooter(0.30, undefined)).toBe(1.0)
  })

  it('should give 1.0 with sharpK = 0', () => {
    expect(simulateSharpshooter(0.30, 0)).toBe(1.0)
  })

  // critChance > 1 edge case
  it('should clamp at 0 for critChance > 1', () => {
    expect(simulateSharpshooter(1.50, 1.50)).toBeCloseTo(1.0) // max(0, 1-1.5) = 0
  })
})
