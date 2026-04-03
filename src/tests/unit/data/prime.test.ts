// ============================================
// 打字肉鸽 - Prime（素数）词条 单元测试
// ============================================
// Story 46.2: 叠层型 — 素数

import { describe, it, expect } from 'vitest'
import { AffixType, AFFIX_CATEGORY_MAP, AFFIX_NAMES, AFFIX_DESCRIPTIONS, AFFIX_WEIGHT_TIERS } from '../../../src/data/affixes'
import { isPrime } from '../../../src/data/affixTrigger'

describe('Prime affix data', () => {
  it('should be in the stack category', () => {
    expect(AFFIX_CATEGORY_MAP[AffixType.Prime]).toBe('stack')
  })

  it('should have a name', () => {
    expect(AFFIX_NAMES[AffixType.Prime]).toBe('素数')
  })

  it('should have a description', () => {
    expect(AFFIX_DESCRIPTIONS[AffixType.Prime]).toBeTruthy()
  })

  it('should have high weight tier', () => {
    expect(AFFIX_WEIGHT_TIERS[AffixType.Prime]).toBe('high')
  })
})

describe('isPrime', () => {
  it('should return false for 0 and 1', () => {
    expect(isPrime(0)).toBe(false)
    expect(isPrime(1)).toBe(false)
  })

  it('should return true for small primes', () => {
    for (const p of [2, 3, 5, 7, 11, 13, 17, 19, 23]) {
      expect(isPrime(p)).toBe(true)
    }
  })

  it('should return false for small composites', () => {
    for (const c of [4, 6, 8, 9, 10, 12, 14, 15, 16, 18]) {
      expect(isPrime(c)).toBe(false)
    }
  })

  it('should return false for negative numbers', () => {
    expect(isPrime(-1)).toBe(false)
    expect(isPrime(-7)).toBe(false)
  })

  it('should handle larger primes correctly', () => {
    expect(isPrime(97)).toBe(true)
    expect(isPrime(89)).toBe(true)
    expect(isPrime(83)).toBe(true)
  })

  it('should handle larger composites correctly', () => {
    expect(isPrime(100)).toBe(false)
    expect(isPrime(91)).toBe(false)  // 7 × 13
    expect(isPrime(99)).toBe(false)  // 9 × 11
  })
})

describe('Prime Phase 2 logic', () => {
  function simulatePrime(stacks: number, primeK: number | undefined) {
    let bonusPercent = 0
    if (stacks >= 2 && isPrime(stacks)) {
      bonusPercent += (primeK ?? 0) * stacks
    }
    return bonusPercent
  }

  it('should give bonus on prime stacks', () => {
    expect(simulatePrime(2, 0.06)).toBeCloseTo(0.12)
    expect(simulatePrime(5, 0.06)).toBeCloseTo(0.30)
    expect(simulatePrime(7, 0.06)).toBeCloseTo(0.42)
    expect(simulatePrime(13, 0.06)).toBeCloseTo(0.78)
  })

  it('should give no bonus on composite stacks', () => {
    expect(simulatePrime(4, 0.06)).toBe(0)
    expect(simulatePrime(6, 0.06)).toBe(0)
    expect(simulatePrime(10, 0.06)).toBe(0)
  })

  it('should give no bonus on stacks 0 and 1', () => {
    expect(simulatePrime(0, 0.06)).toBe(0)
    expect(simulatePrime(1, 0.06)).toBe(0)
  })

  it('should handle undefined primeK safely', () => {
    expect(simulatePrime(7, undefined)).toBe(0)
  })

  it('should scale bonus with stack count', () => {
    const k = 0.06
    // Higher prime = higher bonus
    expect(simulatePrime(17, k)).toBeGreaterThan(simulatePrime(7, k))
    expect(simulatePrime(23, k)).toBeGreaterThan(simulatePrime(17, k))
  })
})
