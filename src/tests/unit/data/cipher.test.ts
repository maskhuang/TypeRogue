// ============================================
// 打字肉鸽 - Cipher（密文）词条 单元测试
// ============================================
// Story 47.2: 词感型 — 密文

import { describe, it, expect } from 'vitest'
import { AffixType, AFFIX_CATEGORY_MAP, AFFIX_NAMES, AFFIX_WEIGHT_TIERS } from '../../../src/data/affixes'

describe('Cipher affix data', () => {
  it('should be in the word_sense category', () => {
    expect(AFFIX_CATEGORY_MAP[AffixType.Cipher]).toBe('word_sense')
  })

  it('should have name and high weight', () => {
    expect(AFFIX_NAMES[AffixType.Cipher]).toBe('密文')
    expect(AFFIX_WEIGHT_TIERS[AffixType.Cipher]).toBe('high')
  })
})

describe('Cipher Phase 2 logic', () => {
  // Simulate the cipher distance calculation
  function cipherAvgDist(word: string): number {
    const w = word.toLowerCase()
    if (w.length < 2) return 0
    let totalDist = 0
    for (let i = 0; i < w.length - 1; i++) {
      totalDist += Math.abs(w.charCodeAt(i + 1) - w.charCodeAt(i))
    }
    return totalDist / (w.length - 1)
  }

  function simulateCipher(word: string, cipherK: number | undefined): number {
    const avg = cipherAvgDist(word)
    return (cipherK ?? 0) * avg
  }

  it('should return 0 for single letter', () => {
    expect(cipherAvgDist('a')).toBe(0)
  })

  it('should return 0 for empty string', () => {
    expect(cipherAvgDist('')).toBe(0)
  })

  it('should return 1 for sequential abc', () => {
    // a→b=1, b→c=1 → avg=1
    expect(cipherAvgDist('abc')).toBeCloseTo(1.0)
  })

  it('should return 25 for az (max single pair)', () => {
    expect(cipherAvgDist('az')).toBeCloseTo(25.0)
  })

  it('should compute cat correctly', () => {
    // c→a=2, a→t=19 → avg=10.5
    expect(cipherAvgDist('cat')).toBeCloseTo(10.5)
  })

  it('should compute quiz correctly', () => {
    // q→u=4, u→i=12, i→z=17 → avg=11
    expect(cipherAvgDist('quiz')).toBeCloseTo(11.0)
  })

  it('should be case-insensitive', () => {
    expect(cipherAvgDist('Cat')).toBeCloseTo(cipherAvgDist('cat'))
  })

  it('quiz bonus > abc bonus', () => {
    const k = 0.02
    expect(simulateCipher('quiz', k)).toBeGreaterThan(simulateCipher('abc', k))
  })

  it('should give ~22% for quiz with k=0.02', () => {
    expect(simulateCipher('quiz', 0.02)).toBeCloseTo(0.22)
  })

  it('should give 0 with undefined cipherK', () => {
    expect(simulateCipher('quiz', undefined)).toBe(0)
  })

  it('should handle two-letter word', () => {
    // ab → |98-97|=1 → avg=1
    expect(cipherAvgDist('ab')).toBeCloseTo(1.0)
  })
})
