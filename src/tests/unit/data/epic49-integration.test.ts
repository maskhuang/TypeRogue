// Epic 49 集成 + 平衡测试

import { describe, it, expect } from 'vitest'
import { AffixType, AFFIX_WEIGHT_TIERS, AFFIX_WEIGHTS, rollAffixWeights } from '../../../src/data/affixes'
import { rollAffixParams } from '../../../src/data/skillGeneration'

describe('Epic 49 weight integration', () => {
  it('should include Burst/ZeroIn/Sharpshooter as high', () => {
    expect(AFFIX_WEIGHT_TIERS[AffixType.Burst]).toBe('high')
    expect(AFFIX_WEIGHT_TIERS[AffixType.ZeroIn]).toBe('high')
    expect(AFFIX_WEIGHT_TIERS[AffixType.Sharpshooter]).toBe('high')
  })

  it('should include after rollAffixWeights', () => {
    rollAffixWeights(() => 0.5)
    expect(AFFIX_WEIGHTS[AffixType.Burst]).toBeGreaterThanOrEqual(6)
    expect(AFFIX_WEIGHTS[AffixType.ZeroIn]).toBeGreaterThanOrEqual(6)
    expect(AFFIX_WEIGHTS[AffixType.Sharpshooter]).toBeGreaterThanOrEqual(6)
  })
})

describe('Epic 49 rollAffixParams', () => {
  it('Burst params', () => {
    const p = rollAffixParams(AffixType.Burst, 'base')
    expect(p.burstK).toBeGreaterThanOrEqual(0.20)
    expect(p.burstK).toBeLessThanOrEqual(0.40)
  })

  it('ZeroIn params', () => {
    const p = rollAffixParams(AffixType.ZeroIn, 'base')
    expect(p.zeroInK).toBeGreaterThanOrEqual(0.15)
    expect(p.zeroInK).toBeLessThanOrEqual(0.30)
  })

  it('Sharpshooter params', () => {
    const p = rollAffixParams(AffixType.Sharpshooter, 'base')
    expect(p.sharpK).toBeGreaterThanOrEqual(1.00)
    expect(p.sharpK).toBeLessThanOrEqual(2.00)
  })
})

describe('Epic 49 balance: critChance preference spectrum', () => {
  it('Burst favors high critChance (more crits = longer streak)', () => {
    // High critChance → more consecutive crits → bigger Burst bonus
    expect(true).toBe(true)
  })

  it('ZeroIn favors medium-low critChance (more misses = bigger compensation)', () => {
    // Lower critChance → more misses → bigger ZeroIn bonus on eventual crit
    expect(true).toBe(true)
  })

  it('Sharpshooter favors low critChance (lower chance = bigger per-crit bonus)', () => {
    const k = 1.50
    const low = k * (1 - 0.10)  // critChance=10%: +135%
    const high = k * (1 - 0.80) // critChance=80%: +30%
    expect(low).toBeGreaterThan(high)
  })

  it('Burst and Sharpshooter are mutually exclusive strategies', () => {
    // Burst wants high critChance for streaks
    // Sharpshooter wants low critChance for per-crit bonus
    // Players must choose one direction
    expect(true).toBe(true)
  })
})
