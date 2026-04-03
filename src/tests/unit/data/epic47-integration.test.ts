// Epic 47 集成测试

import { describe, it, expect } from 'vitest'
import { AffixType, AFFIX_WEIGHT_TIERS, AFFIX_WEIGHTS, rollAffixWeights } from '../../../src/data/affixes'
import { rollAffixParams } from '../../../src/data/skillGeneration'

describe('Epic 47 weight integration', () => {
  it('should include Entropy/Cipher/Pattern in AFFIX_WEIGHT_TIERS as high', () => {
    expect(AFFIX_WEIGHT_TIERS[AffixType.Entropy]).toBe('high')
    expect(AFFIX_WEIGHT_TIERS[AffixType.Cipher]).toBe('high')
    expect(AFFIX_WEIGHT_TIERS[AffixType.Pattern]).toBe('high')
  })

  it('should include new affixes in default AFFIX_WEIGHTS > 0', () => {
    expect(AFFIX_WEIGHTS[AffixType.Entropy]).toBeGreaterThan(0)
    expect(AFFIX_WEIGHTS[AffixType.Cipher]).toBeGreaterThan(0)
    expect(AFFIX_WEIGHTS[AffixType.Pattern]).toBeGreaterThan(0)
  })

  it('should include new affixes after rollAffixWeights', () => {
    rollAffixWeights(() => 0.5)
    expect(AFFIX_WEIGHTS[AffixType.Entropy]).toBeGreaterThanOrEqual(6)
    expect(AFFIX_WEIGHTS[AffixType.Cipher]).toBeGreaterThanOrEqual(6)
    expect(AFFIX_WEIGHTS[AffixType.Pattern]).toBeGreaterThanOrEqual(6)
  })
})

describe('Epic 47 rollAffixParams integration', () => {
  it('Entropy params have entropyK in range', () => {
    const p = rollAffixParams(AffixType.Entropy, 'base')
    expect(p.entropyK).toBeGreaterThanOrEqual(0.06)
    expect(p.entropyK).toBeLessThanOrEqual(0.12)
  })

  it('Cipher params have cipherK in range', () => {
    const p = rollAffixParams(AffixType.Cipher, 'base')
    expect(p.cipherK).toBeGreaterThanOrEqual(0.01)
    expect(p.cipherK).toBeLessThanOrEqual(0.03)
  })

  it('Pattern params have patternK in range', () => {
    const p = rollAffixParams(AffixType.Pattern, 'base')
    expect(p.patternK).toBeGreaterThanOrEqual(0.03)
    expect(p.patternK).toBeLessThanOrEqual(0.06)
  })
})

describe('Epic 47 save compatibility', () => {
  it('should handle missing entropyK/cipherK/patternK with ?? 0', () => {
    const old = { type: AffixType.Entropy } as any
    expect(old.entropyK ?? 0).toBe(0)
    expect(old.cipherK ?? 0).toBe(0)
    expect(old.patternK ?? 0).toBe(0)
  })
})
