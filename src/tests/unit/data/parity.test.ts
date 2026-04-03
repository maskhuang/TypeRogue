// ============================================
// 打字肉鸽 - Parity（奇偶）词条 单元测试
// ============================================
// Story 46.1: 叠层型 — 奇偶

import { describe, it, expect } from 'vitest'
import { AffixType, AFFIX_CATEGORY_MAP, AFFIX_NAMES, AFFIX_DESCRIPTIONS, AFFIX_WEIGHT_TIERS } from '../../../src/data/affixes'

describe('Parity affix data', () => {
  it('should be in the stack category', () => {
    expect(AFFIX_CATEGORY_MAP[AffixType.Parity]).toBe('stack')
  })

  it('should have a name', () => {
    expect(AFFIX_NAMES[AffixType.Parity]).toBe('奇偶')
  })

  it('should have a description', () => {
    expect(AFFIX_DESCRIPTIONS[AffixType.Parity]).toBeTruthy()
  })

  it('should have high weight tier', () => {
    expect(AFFIX_WEIGHT_TIERS[AffixType.Parity]).toBe('high')
  })
})

describe('Parity Phase 2 logic', () => {
  // Helper: simulate Parity Phase 2 calculation
  function simulateParity(stacks: number, oddK: number | undefined, evenK: number | undefined) {
    let bonusPercent = 0
    let critChance = 0

    if (stacks === 0) return { bonusPercent, critChance }
    if (stacks % 2 === 1) {
      bonusPercent += oddK ?? 0
    } else {
      critChance += evenK ?? 0
    }
    return { bonusPercent, critChance }
  }

  it('should add bonusPercent on odd stacks', () => {
    const result = simulateParity(1, 0.20, 0.12)
    expect(result.bonusPercent).toBeCloseTo(0.20)
    expect(result.critChance).toBe(0)
  })

  it('should add bonusPercent on odd stacks (3)', () => {
    const result = simulateParity(3, 0.20, 0.12)
    expect(result.bonusPercent).toBeCloseTo(0.20)
    expect(result.critChance).toBe(0)
  })

  it('should add bonusPercent on odd stacks (5)', () => {
    const result = simulateParity(5, 0.25, 0.10)
    expect(result.bonusPercent).toBeCloseTo(0.25)
    expect(result.critChance).toBe(0)
  })

  it('should add critChance on even stacks', () => {
    const result = simulateParity(2, 0.20, 0.12)
    expect(result.bonusPercent).toBe(0)
    expect(result.critChance).toBeCloseTo(0.12)
  })

  it('should add critChance on even stacks (4)', () => {
    const result = simulateParity(4, 0.20, 0.12)
    expect(result.bonusPercent).toBe(0)
    expect(result.critChance).toBeCloseTo(0.12)
  })

  it('should add critChance on even stacks (6)', () => {
    const result = simulateParity(6, 0.15, 0.08)
    expect(result.bonusPercent).toBe(0)
    expect(result.critChance).toBeCloseTo(0.08)
  })

  it('should have no effect when stacks is 0', () => {
    const result = simulateParity(0, 0.20, 0.12)
    expect(result.bonusPercent).toBe(0)
    expect(result.critChance).toBe(0)
  })

  it('should handle null/undefined oddK safely', () => {
    const result = simulateParity(1, undefined, 0.12)
    expect(result.bonusPercent).toBe(0)
  })

  it('should handle null/undefined evenK safely', () => {
    const result = simulateParity(2, 0.20, undefined)
    expect(result.critChance).toBe(0)
  })
})
