// ============================================
// 打字肉鸽 - Match（配对）词条 单元测试
// ============================================
// Story 46.3: 叠层型 — 配对

import { describe, it, expect } from 'vitest'
import { AffixType, AFFIX_CATEGORY_MAP, AFFIX_NAMES, AFFIX_DESCRIPTIONS, AFFIX_WEIGHT_TIERS } from '../../../src/data/affixes'

describe('Match affix data', () => {
  it('should be in the stack category', () => {
    expect(AFFIX_CATEGORY_MAP[AffixType.Match]).toBe('stack')
  })

  it('should have a name', () => {
    expect(AFFIX_NAMES[AffixType.Match]).toBe('配对')
  })

  it('should have a description', () => {
    expect(AFFIX_DESCRIPTIONS[AffixType.Match]).toBeTruthy()
  })

  it('should have high weight tier', () => {
    expect(AFFIX_WEIGHT_TIERS[AffixType.Match]).toBe('high')
  })
})

describe('Match pair counting logic', () => {
  // Helper: simulate the pair counting from Phase 2
  function countPairs(stackValues: number[]): number {
    const filtered = stackValues.filter(s => s > 0)
    if (filtered.length < 2) return 0
    const freq = new Map<number, number>()
    for (const s of filtered) {
      freq.set(s, (freq.get(s) ?? 0) + 1)
    }
    let pairs = 0
    for (const count of freq.values()) {
      if (count >= 2) pairs += count * (count - 1) / 2
    }
    return pairs
  }

  function simulateMatch(stackValues: number[], matchK: number | undefined): number {
    return (matchK ?? 0) * countPairs(stackValues)
  }

  // AC1: no neighbors or all zero
  it('should return 0 pairs for empty array', () => {
    expect(countPairs([])).toBe(0)
  })

  it('should return 0 pairs for single element', () => {
    expect(countPairs([3])).toBe(0)
  })

  it('should return 0 pairs when all stacks are 0', () => {
    expect(countPairs([0, 0, 0])).toBe(0)
  })

  // AC2: 1 pair
  it('should return 1 pair for two equal values', () => {
    expect(countPairs([3, 3])).toBe(1)
  })

  it('should return 1 pair for [3,3,5,7]', () => {
    expect(countPairs([3, 3, 5, 7])).toBe(1)
  })

  // Two pairs
  it('should return 2 pairs for [3,3,5,5]', () => {
    expect(countPairs([3, 3, 5, 5])).toBe(2)
  })

  // AC3: three-of-a-kind = C(3,2) = 3
  it('should return 3 pairs for [3,3,3,5] (three-of-a-kind)', () => {
    expect(countPairs([3, 3, 3, 5])).toBe(3)
  })

  // AC3: four-of-a-kind = C(4,2) = 6
  it('should return 6 pairs for [3,3,3,3] (four-of-a-kind)', () => {
    expect(countPairs([3, 3, 3, 3])).toBe(6)
  })

  // AC4: filter out stacks = 0
  it('should filter out zero stacks', () => {
    expect(countPairs([3, 3, 0, 0])).toBe(1) // only the two 3s count
  })

  it('should filter out zero stacks mixed', () => {
    expect(countPairs([0, 5, 5, 0])).toBe(1)
  })

  // No matching values
  it('should return 0 pairs for all different values', () => {
    expect(countPairs([1, 2, 3, 4])).toBe(0)
  })

  // bonusPercent calculation
  it('should calculate bonusPercent = matchK × pairs', () => {
    expect(simulateMatch([3, 3, 5, 7], 0.12)).toBeCloseTo(0.12)
    expect(simulateMatch([3, 3, 5, 5], 0.12)).toBeCloseTo(0.24)
    expect(simulateMatch([3, 3, 3, 3], 0.12)).toBeCloseTo(0.72)
  })

  it('should return 0 bonusPercent with undefined matchK', () => {
    expect(simulateMatch([3, 3], undefined)).toBe(0)
  })

  // Complex case: mixed multiples
  it('should handle mixed multiples [2,2,2,5,5]', () => {
    // C(3,2) + C(2,2) = 3 + 1 = 4
    expect(countPairs([2, 2, 2, 5, 5])).toBe(4)
  })
})
