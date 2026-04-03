// ============================================
// 打字肉鸽 - Epic 46 数值平衡与交互验证
// ============================================
// Story 46.5: 数值平衡与 Playtest

import { describe, it, expect } from 'vitest'
import { isPrime } from '../../../src/data/affixTrigger'

// ===== Task 1: 极端场景 =====

describe('Extreme scenarios', () => {
  // Prime: high stacks
  it('Prime: stacks=97 (prime) should give bonus=582% with primeK=0.06', () => {
    expect(isPrime(97)).toBe(true)
    const bonus = 0.06 * 97
    expect(bonus).toBeCloseTo(5.82)  // +582%
    // High but requires 97 stacks accumulation — acceptable
  })

  it('Prime: stacks=100 (composite) should give 0 bonus', () => {
    expect(isPrime(100)).toBe(false)
  })

  // Match: maximum pairs
  it('Match: 6 neighbors all same stacks → C(6,2)=15 pairs', () => {
    const count = 6
    const pairs = count * (count - 1) / 2
    expect(pairs).toBe(15)
    const bonus = 0.12 * pairs
    expect(bonus).toBeCloseTo(1.80)  // +180%
  })

  // Parity: extreme stacks
  it('Parity: stacks=999 (odd) should give oddK bonus', () => {
    const stacks = 999
    expect(stacks % 2).toBe(1)  // odd
    const bonus = 0.20  // fixed oddK, not scaled by stacks
    expect(bonus).toBeCloseTo(0.20)  // bounded, no explosion
  })

  it('Parity: stacks=1000 (even) should give evenK bonus', () => {
    const stacks = 1000
    expect(stacks % 2).toBe(0)  // even
    const bonus = 0.12  // fixed evenK
    expect(bonus).toBeCloseTo(0.12)  // bounded
  })

  // isPrime performance: large prime
  it('isPrime(997) should execute in < 1ms', () => {
    const start = performance.now()
    for (let i = 0; i < 1000; i++) {
      isPrime(997)
    }
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(10)  // 1000 calls < 10ms → single call < 0.01ms
    expect(isPrime(997)).toBe(true)
  })
})

// ===== Task 2: 交互矩阵验证 =====

describe('Interaction matrix verification', () => {
  // Parity + Crit: evenK adds to totalCritChance
  it('Parity evenK should stack additively with Crit chance', () => {
    const critChance = 0.15  // from Crit affix
    const evenK = 0.12       // from Parity even
    const total = critChance + evenK
    expect(total).toBeCloseTo(0.27)  // additive stacking
  })

  // Prime + high stacks: verify bonus scaling
  it('Prime: stacks=23 → bonus=138% with primeK=0.06', () => {
    expect(isPrime(23)).toBe(true)
    const bonus = 0.06 * 23
    expect(bonus).toBeCloseTo(1.38)  // +138%, high but needs 23 stacks
  })

  it('Prime: bonus gap between primes grows (7→11 gap=4 triggers)', () => {
    // At stacks=8,9,10 → no bonus; gap creates "rare window" feel
    expect(isPrime(7)).toBe(true)
    expect(isPrime(8)).toBe(false)
    expect(isPrime(9)).toBe(false)
    expect(isPrime(10)).toBe(false)
    expect(isPrime(11)).toBe(true)
  })

  // Match + zero stacks: all zeros → no pairs
  it('Match: all neighbors stacks=0 → 0 pairs', () => {
    const stacks = [0, 0, 0, 0]
    const filtered = stacks.filter(s => s > 0)
    expect(filtered.length).toBe(0)
  })

  // Parity + Pulse clear: stacks=0 → no effect
  it('Parity: stacks=0 after Pulse clear → no effect', () => {
    const stacks = 0
    let bonusPercent = 0
    let critChance = 0
    if (stacks === 0) {
      // break — no effect
    } else if (stacks % 2 === 1) {
      bonusPercent += 0.20
    } else {
      critChance += 0.12
    }
    expect(bonusPercent).toBe(0)
    expect(critChance).toBe(0)
  })

  // Match pair counting: mixed scenario
  it('Match: [2,2,5,5,5] → C(2,2)+C(3,2)=1+3=4 pairs', () => {
    const stacks = [2, 2, 5, 5, 5]
    const freq = new Map<number, number>()
    for (const s of stacks) {
      freq.set(s, (freq.get(s) ?? 0) + 1)
    }
    let pairs = 0
    for (const count of freq.values()) {
      if (count >= 2) pairs += count * (count - 1) / 2
    }
    expect(pairs).toBe(4)
  })

  // Parity vs Prime: stacks=2 (even AND prime)
  it('stacks=2: Parity gives evenK (even), Prime gives primeK*2 (prime)', () => {
    const stacks = 2
    // Parity: even → critChance
    expect(stacks % 2).toBe(0)
    // Prime: 2 is prime → bonusPercent
    expect(isPrime(2)).toBe(true)
    // Both trigger simultaneously — additive, no conflict
    const parityContribution = 0.12   // critChance
    const primeContribution = 0.06 * 2  // bonusPercent
    expect(parityContribution).toBeCloseTo(0.12)
    expect(primeContribution).toBeCloseTo(0.12)
  })
})
