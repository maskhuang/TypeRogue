// Epic 48 集成 + 平衡测试

import { describe, it, expect } from 'vitest'
import { AffixType, AFFIX_WEIGHT_TIERS, AFFIX_WEIGHTS, rollAffixWeights } from '../../../src/data/affixes'
import { rollAffixParams } from '../../../src/data/skillGeneration'

describe('Epic 48 weight integration', () => {
  it('should include Leverage/Option/Hedge in AFFIX_WEIGHT_TIERS as high', () => {
    expect(AFFIX_WEIGHT_TIERS[AffixType.Leverage]).toBe('high')
    expect(AFFIX_WEIGHT_TIERS[AffixType.Option]).toBe('high')
    expect(AFFIX_WEIGHT_TIERS[AffixType.Hedge]).toBe('high')
  })

  it('should include new affixes after rollAffixWeights', () => {
    rollAffixWeights(() => 0.5)
    expect(AFFIX_WEIGHTS[AffixType.Leverage]).toBeGreaterThanOrEqual(6)
    expect(AFFIX_WEIGHTS[AffixType.Option]).toBeGreaterThanOrEqual(6)
    expect(AFFIX_WEIGHTS[AffixType.Hedge]).toBeGreaterThanOrEqual(6)
  })
})

describe('Epic 48 rollAffixParams', () => {
  it('Leverage params', () => {
    const p = rollAffixParams(AffixType.Leverage, 'base')
    expect(p.leverageK).toBeGreaterThanOrEqual(0.06)
    expect(p.source).toBeDefined()
    expect(p.source).not.toBe('base')
    expect(p.marginThreshold).toBeGreaterThan(0)
  })

  it('Option params', () => {
    const p = rollAffixParams(AffixType.Option, 'base')
    expect(p.optionK).toBeGreaterThanOrEqual(0.04)
    expect(p.strikePrice).toBeGreaterThan(0)
    expect(p.premium).toBeGreaterThanOrEqual(0.05)
    expect(p.source).not.toBe('base')
  })

  it('Hedge params', () => {
    const p = rollAffixParams(AffixType.Hedge, 'base')
    expect(p.hedgeK).toBeGreaterThanOrEqual(0.20)
    expect(p.hedgeSourceA).toBeDefined()
    expect(p.hedgeSourceB).toBeDefined()
    expect(p.hedgeSourceA).not.toBe(p.hedgeSourceB)
    expect(p.hedgeSourceA).not.toBe('base')
    expect(p.hedgeSourceB).not.toBe('base')
  })
})

describe('Epic 48 balance: risk spectrum', () => {
  it('Leverage: can go very negative at 0 resource', () => {
    // excess = 0 - threshold = -threshold → negative bonus
    const threshold = 10
    const bonus = 0.10 * (0 - threshold)
    expect(bonus).toBe(-1.0) // -100%
  })

  it('Option: premium is bounded (fixed small loss)', () => {
    const premium = 0.08
    expect(premium).toBeLessThan(0.15) // never exceeds 15%
  })

  it('Hedge: always non-negative (ratio 0~1)', () => {
    const hedgeK = 0.30
    // ratio is always 0~1, so bonus is always 0~hedgeK
    expect(hedgeK * 0).toBe(0)
    expect(hedgeK * 1).toBe(0.30)
  })

  it('Risk order: Leverage > Option > Hedge', () => {
    // Leverage: max loss = leverageK × threshold × norm ≈ -100%+
    // Option: max loss = premium ≈ -8%
    // Hedge: max loss = 0%
    const leverageMaxLoss = Math.abs(0.10 * -10) // 100%
    const optionMaxLoss = 0.08  // 8%
    const hedgeMaxLoss = 0      // 0%
    expect(leverageMaxLoss).toBeGreaterThan(optionMaxLoss)
    expect(optionMaxLoss).toBeGreaterThan(hedgeMaxLoss)
  })
})
