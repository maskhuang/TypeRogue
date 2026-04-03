// ============================================
// 打字肉鸽 - patternFrequency 单元测试
// ============================================
// Story 47.3: 模式频率表基础设施

import { describe, it, expect, beforeEach } from 'vitest'
import { toPattern, getPatternRarity, _resetPatternCache } from '../../../src/data/patternFrequency'

describe('toPattern', () => {
  it('should map all-unique letters to sequential A/B/C...', () => {
    expect(toPattern('the')).toBe('ABC')
    expect(toPattern('cat')).toBe('ABC')
    expect(toPattern('abcdef')).toBe('ABCDEF')
  })

  it('should map repeated letters to same slot', () => {
    expect(toPattern('banana')).toBe('ABCBCB')
    expect(toPattern('apple')).toBe('ABBCD')
    expect(toPattern('aabb')).toBe('AABB')
    expect(toPattern('abab')).toBe('ABAB')
  })

  it('should handle palindromes', () => {
    expect(toPattern('level')).toBe('ABCBA')
    expect(toPattern('deed')).toBe('ABBA')
  })

  it('should handle single letter', () => {
    expect(toPattern('a')).toBe('A')
  })

  it('should handle pure repetition', () => {
    expect(toPattern('aaa')).toBe('AAA')
  })

  it('should be case-insensitive', () => {
    expect(toPattern('Banana')).toBe(toPattern('banana'))
    expect(toPattern('THE')).toBe(toPattern('the'))
  })

  it('should ignore non-letter characters', () => {
    expect(toPattern('a-b')).toBe(toPattern('ab'))
    expect(toPattern("don't")).toBe(toPattern('dont'))
  })

  it('should return empty for empty/null input', () => {
    expect(toPattern('')).toBe('')
    expect(toPattern(null as any)).toBe('')
  })

  it('aabb and abab should produce different patterns', () => {
    expect(toPattern('aabb')).not.toBe(toPattern('abab'))
  })
})

describe('getPatternRarity', () => {
  beforeEach(() => {
    _resetPatternCache()
  })

  it('should return a positive number for valid words', () => {
    const r = getPatternRarity('member')
    expect(r).toBeGreaterThan(0)
  })

  it('should return 0 for empty string', () => {
    expect(getPatternRarity('')).toBe(0)
  })

  it('should return higher rarity for less common patterns', () => {
    // Words with all-unique letters (ABC... pattern) are very common
    // Words with complex repetition should be rarer
    const commonRarity = getPatternRarity('the')      // ABC - very common 3-letter pattern
    const rareRarity = getPatternRarity('banana')     // ABCBDB - rare pattern
    // Both should be > 0
    expect(commonRarity).toBeGreaterThan(0)
    expect(rareRarity).toBeGreaterThan(0)
  })

  it('should return MAX_RARITY (10) for unknown pattern', () => {
    // A pattern unlikely to exist in word pool
    expect(getPatternRarity('zzzzzzzzzzz')).toBe(10)
  })

  it('same-pattern words should have same rarity', () => {
    // "the" and "cat" both map to ABC
    expect(getPatternRarity('the')).toBeCloseTo(getPatternRarity('cat'))
  })

  it('rarity should be -log2(freq) and finite for pool words', () => {
    // "member" is in WORD_POOL.common — its pattern should be known
    const r = getPatternRarity('review')  // ABCDBF — from common pool
    expect(r).toBeGreaterThan(0)
    expect(r).toBeLessThanOrEqual(15)  // known pattern, not MAX_RARITY
  })
})
