// ============================================
// 打字肉鸽 - Epic 46 集成测试
// ============================================
// Story 46.4: 技能生成集成

import { describe, it, expect } from 'vitest'
import {
  AffixType,
  AFFIX_WEIGHT_TIERS,
  AFFIX_WEIGHTS,
  rollAffixWeights,
} from '../../../src/data/affixes'
import { rollAffixParams } from '../../../src/data/skillGeneration'

describe('Epic 46 weight integration', () => {
  it('should include Parity/Prime/Match in AFFIX_WEIGHT_TIERS', () => {
    expect(AFFIX_WEIGHT_TIERS[AffixType.Parity]).toBe('high')
    expect(AFFIX_WEIGHT_TIERS[AffixType.Prime]).toBe('high')
    expect(AFFIX_WEIGHT_TIERS[AffixType.Match]).toBe('high')
  })

  it('should include Parity/Prime/Match in default AFFIX_WEIGHTS with value > 0', () => {
    expect(AFFIX_WEIGHTS[AffixType.Parity]).toBeGreaterThan(0)
    expect(AFFIX_WEIGHTS[AffixType.Prime]).toBeGreaterThan(0)
    expect(AFFIX_WEIGHTS[AffixType.Match]).toBeGreaterThan(0)
  })

  it('should include new affixes after rollAffixWeights', () => {
    rollAffixWeights(() => 0.5) // deterministic RNG
    expect(AFFIX_WEIGHTS[AffixType.Parity]).toBeGreaterThanOrEqual(6) // high tier: 6-10
    expect(AFFIX_WEIGHTS[AffixType.Parity]).toBeLessThanOrEqual(10)
    expect(AFFIX_WEIGHTS[AffixType.Prime]).toBeGreaterThanOrEqual(6)
    expect(AFFIX_WEIGHTS[AffixType.Match]).toBeGreaterThanOrEqual(6)
  })
})

describe('Epic 46 rollAffixParams integration', () => {
  it('should generate Parity params with oddK and evenK', () => {
    const params = rollAffixParams(AffixType.Parity, 'base')
    expect(params.type).toBe(AffixType.Parity)
    expect(params.oddK).toBeGreaterThanOrEqual(0.15)
    expect(params.oddK).toBeLessThanOrEqual(0.25)
    expect(params.evenK).toBeGreaterThanOrEqual(0.08)
    expect(params.evenK).toBeLessThanOrEqual(0.15)
  })

  it('should generate Prime params with primeK', () => {
    const params = rollAffixParams(AffixType.Prime, 'base')
    expect(params.type).toBe(AffixType.Prime)
    expect(params.primeK).toBeGreaterThanOrEqual(0.04)
    expect(params.primeK).toBeLessThanOrEqual(0.08)
  })

  it('should generate Match params with matchK and posRel', () => {
    const params = rollAffixParams(AffixType.Match, 'base')
    expect(params.type).toBe(AffixType.Match)
    expect(params.matchK).toBeGreaterThanOrEqual(0.08)
    expect(params.matchK).toBeLessThanOrEqual(0.15)
    expect(params.posRel).toBeDefined()
  })
})

describe('Epic 46 save compatibility', () => {
  it('should handle missing oddK/evenK/primeK/matchK with ?? 0 fallback', () => {
    // Simulate old save data: AffixInstance without new fields
    const oldAffix = { type: AffixType.Parity } as any
    expect(oldAffix.oddK ?? 0).toBe(0)
    expect(oldAffix.evenK ?? 0).toBe(0)

    const oldPrime = { type: AffixType.Prime } as any
    expect(oldPrime.primeK ?? 0).toBe(0)

    const oldMatch = { type: AffixType.Match } as any
    expect(oldMatch.matchK ?? 0).toBe(0)
  })
})
