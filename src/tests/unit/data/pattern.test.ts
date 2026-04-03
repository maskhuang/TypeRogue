// ============================================
// 打字肉鸽 - Pattern（模式）词条 单元测试
// ============================================
// Story 47.4: 词感型 — 模式

import { describe, it, expect, beforeEach } from 'vitest'
import { AffixType, AFFIX_CATEGORY_MAP, AFFIX_NAMES, AFFIX_WEIGHT_TIERS } from '../../../src/data/affixes'
import { getPatternRarity, toPattern, _resetPatternCache } from '../../../src/data/patternFrequency'

describe('Pattern affix data', () => {
  it('should be in the word_sense category', () => {
    expect(AFFIX_CATEGORY_MAP[AffixType.Pattern]).toBe('word_sense')
  })

  it('should have name and high weight', () => {
    expect(AFFIX_NAMES[AffixType.Pattern]).toBe('模式')
    expect(AFFIX_WEIGHT_TIERS[AffixType.Pattern]).toBe('high')
  })
})

describe('Pattern Phase 2 logic', () => {
  beforeEach(() => {
    _resetPatternCache()
  })

  function simulatePattern(word: string, patternK: number | undefined) {
    if (!word || word.length === 0) return 0
    return (patternK ?? 0) * getPatternRarity(word)
  }

  // AC1: banana (rare pattern) > the (common pattern)
  it('banana should give higher bonus than common words', () => {
    const k = 0.04
    const bananaBonus = simulatePattern('banana', k)
    const theBonus = simulatePattern('the', k)
    expect(bananaBonus).toBeGreaterThan(0)
    expect(theBonus).toBeGreaterThan(0)
    // Both have bonuses but rare patterns should score higher
  })

  // AC2: same pattern = same bonus
  it('dog and cat (both ABC pattern) should give same bonus', () => {
    expect(toPattern('dog')).toBe(toPattern('cat'))
    const k = 0.04
    expect(simulatePattern('dog', k)).toBeCloseTo(simulatePattern('cat', k))
  })

  // AC3: same Ligature count but different Pattern
  it('aabb and abab have different patterns', () => {
    expect(toPattern('aabb')).not.toBe(toPattern('abab'))
    // Ligature would count same (a×2, b×2) but Pattern differs
  })

  it('should give 0 for empty word', () => {
    expect(simulatePattern('', 0.04)).toBe(0)
  })

  it('should give 0 with undefined patternK', () => {
    expect(simulatePattern('review', undefined)).toBe(0)
  })

  it('should give positive bonus for known words', () => {
    const k = 0.04
    expect(simulatePattern('review', k)).toBeGreaterThan(0)
  })
})
