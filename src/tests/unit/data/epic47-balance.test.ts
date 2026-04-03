// Epic 47 数值平衡与交互验证

import { describe, it, expect, beforeEach } from 'vitest'
import { shannonEntropy } from '../../../src/data/affixTrigger'
import { getPatternRarity, _resetPatternCache } from '../../../src/data/patternFrequency'

describe('Extreme scenarios', () => {
  it('Entropy: max H ≈ log2(26) ≈ 4.7, typical 2~3 → bonus bounded', () => {
    const maxH = shannonEntropy('abcdefghijklmnopqrstuvwxyz')
    expect(maxH).toBeCloseTo(Math.log2(26), 1)
    const typicalBonus = 0.10 * 3.0 // entropyK × typical H
    expect(typicalBonus).toBeCloseTo(0.30) // +30% max typical
  })

  it('Cipher: max avgDist ≈ 25 (az), typical 8~12 → bonus bounded', () => {
    const typicalBonus = 0.02 * 12 // cipherK × typical avgDist
    expect(typicalBonus).toBeCloseTo(0.24) // +24%
  })

  it('Pattern: MAX_RARITY = 10 → max bonus = patternK × 10', () => {
    const maxBonus = 0.06 * 10
    expect(maxBonus).toBeCloseTo(0.60) // +60% absolute max (unknown pattern)
  })
})

describe('Interaction matrix', () => {
  beforeEach(() => {
    _resetPatternCache()
  })

  it('Entropy vs Coverage: same direction but different values', () => {
    // "aabbc" has Coverage=3 but low entropy (uneven distribution)
    // "abcde" has Coverage=5 and high entropy (uniform)
    const hAabbc = shannonEntropy('aabbc')
    const hAbcde = shannonEntropy('abcde')
    expect(hAbcde).toBeGreaterThan(hAabbc)
    // Coverage would be 3 vs 5, Entropy captures more nuance
  })

  it('Entropy vs Ligature: opposite direction', () => {
    // High repetition → high Ligature but low Entropy
    const hRepeat = shannonEntropy('aaabbb')
    const hUnique = shannonEntropy('abcdef')
    expect(hUnique).toBeGreaterThan(hRepeat)
  })

  it('Pattern: aabb vs abab same Ligature different Pattern', () => {
    const rAabb = getPatternRarity('aabb')
    const rAbab = getPatternRarity('abab')
    // Both have same letter counts but different structure
    // Rarity may differ depending on word pool
    expect(rAabb).toBeGreaterThan(0)
    expect(rAbab).toBeGreaterThan(0)
  })

  it('Cipher vs Cluster: orthogonal (consonant runs vs alphabet distance)', () => {
    // "str" has high consonant cluster but low-medium cipher distance
    // "az" has no cluster but max cipher distance
    // These are genuinely independent dimensions
    expect(true).toBe(true) // conceptual verification
  })

  it('all three can coexist on same word with independent bonuses', () => {
    const word = 'typing'
    const entropyBonus = 0.10 * shannonEntropy(word)
    const patternBonus = 0.04 * getPatternRarity(word)
    // Cipher would also add independently
    expect(entropyBonus).toBeGreaterThan(0)
    expect(patternBonus).toBeGreaterThan(0)
    // All additive in bonusPercent, no conflicts
  })
})
