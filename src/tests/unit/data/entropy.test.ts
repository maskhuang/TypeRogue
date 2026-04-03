// ============================================
// 打字肉鸽 - Entropy（熵）词条 单元测试
// ============================================
// Story 47.1: 词感型 — 熵

import { describe, it, expect } from 'vitest'
import { AffixType, AFFIX_CATEGORY_MAP, AFFIX_NAMES, AFFIX_WEIGHT_TIERS } from '../../../src/data/affixes'
import { shannonEntropy } from '../../../src/data/affixTrigger'

describe('Entropy affix data', () => {
  it('should be in the word_sense category', () => {
    expect(AFFIX_CATEGORY_MAP[AffixType.Entropy]).toBe('word_sense')
  })

  it('should have name and high weight', () => {
    expect(AFFIX_NAMES[AffixType.Entropy]).toBe('熵')
    expect(AFFIX_WEIGHT_TIERS[AffixType.Entropy]).toBe('high')
  })
})

describe('shannonEntropy', () => {
  it('should return 0 for empty string', () => {
    expect(shannonEntropy('')).toBe(0)
  })

  it('should return 0 for single character', () => {
    expect(shannonEntropy('a')).toBe(0)
  })

  it('should return 0 for pure repetition', () => {
    expect(shannonEntropy('aaa')).toBe(0)
  })

  it('should return 1.0 for two equally frequent letters', () => {
    expect(shannonEntropy('ab')).toBeCloseTo(1.0)
    expect(shannonEntropy('aabb')).toBeCloseTo(1.0)
  })

  it('should return higher entropy for more uniform distribution', () => {
    const hBanana = shannonEntropy('banana')   // 3 letters, uneven
    const hTyping = shannonEntropy('typing')   // 6 letters, all unique
    expect(hTyping).toBeGreaterThan(hBanana)
  })

  it('should compute banana entropy correctly (~1.46)', () => {
    // banana: a=3/6, b=1/6, n=2/6
    // H = -(3/6*log2(3/6) + 1/6*log2(1/6) + 2/6*log2(2/6))
    expect(shannonEntropy('banana')).toBeCloseTo(1.459, 2)
  })

  it('should compute typing entropy correctly (~2.58)', () => {
    // typing: all 6 letters unique, H = log2(6)
    expect(shannonEntropy('typing')).toBeCloseTo(Math.log2(6), 2)
  })

  it('should be case-insensitive', () => {
    expect(shannonEntropy('Banana')).toBeCloseTo(shannonEntropy('banana'))
  })

  it('should ignore non-letter characters', () => {
    expect(shannonEntropy('a-b')).toBeCloseTo(shannonEntropy('ab'))
  })

  it('should handle null/undefined gracefully', () => {
    expect(shannonEntropy(null as any)).toBe(0)
    expect(shannonEntropy(undefined as any)).toBe(0)
  })
})

describe('Entropy Phase 2 logic', () => {
  function simulateEntropy(word: string, entropyK: number | undefined) {
    if (!word || word.length === 0) return 0
    return (entropyK ?? 0) * shannonEntropy(word)
  }

  it('should give higher bonus for typing than banana', () => {
    const k = 0.10
    expect(simulateEntropy('typing', k)).toBeGreaterThan(simulateEntropy('banana', k))
  })

  it('should give 0 bonus for single-letter word', () => {
    expect(simulateEntropy('a', 0.10)).toBe(0)
  })

  it('should give 0 bonus with undefined entropyK', () => {
    expect(simulateEntropy('typing', undefined)).toBe(0)
  })

  it('should give ~26% bonus for typing with k=0.10', () => {
    expect(simulateEntropy('typing', 0.10)).toBeCloseTo(0.258, 2)
  })
})
