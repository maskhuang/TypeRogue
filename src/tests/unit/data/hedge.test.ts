// ============================================
// 打字肉鸽 - Hedge（对冲）词条 单元测试
// ============================================
// Story 48.3: 数值型 — 对冲

import { describe, it, expect } from 'vitest'
import { AffixType, AFFIX_CATEGORY_MAP, AFFIX_NAMES, AFFIX_WEIGHT_TIERS } from '../../../src/data/affixes'

describe('Hedge affix data', () => {
  it('should be in the numeric category', () => {
    expect(AFFIX_CATEGORY_MAP[AffixType.Hedge]).toBe('numeric')
  })

  it('should have name and high weight', () => {
    expect(AFFIX_NAMES[AffixType.Hedge]).toBe('对冲')
    expect(AFFIX_WEIGHT_TIERS[AffixType.Hedge]).toBe('high')
  })
})

describe('Hedge Phase 2 logic', () => {
  function simulateHedge(valA: number, valB: number, hedgeK: number | undefined) {
    const maxVal = Math.max(valA, valB)
    if (maxVal <= 0) return 0
    const ratio = Math.min(valA, valB) / maxVal
    return (hedgeK ?? 0) * ratio
  }

  // AC1: perfect balance = hedgeK
  it('should give full bonus when perfectly balanced', () => {
    expect(simulateHedge(10, 10, 0.30)).toBeCloseTo(0.30)
  })

  // Partial balance
  it('should give partial bonus at 80% ratio', () => {
    expect(simulateHedge(10, 8, 0.30)).toBeCloseTo(0.24)
  })

  it('should give half bonus at 50% ratio', () => {
    expect(simulateHedge(10, 5, 0.30)).toBeCloseTo(0.15)
  })

  it('should give low bonus at 20% ratio', () => {
    expect(simulateHedge(10, 2, 0.30)).toBeCloseTo(0.06)
  })

  // AC2: one side zero
  it('should give 0 when one side is zero', () => {
    expect(simulateHedge(10, 0, 0.30)).toBe(0)
  })

  it('should give 0 when other side is zero', () => {
    expect(simulateHedge(0, 10, 0.30)).toBe(0)
  })

  // AC3: both zero
  it('should give 0 when both are zero (no divide by zero)', () => {
    expect(simulateHedge(0, 0, 0.30)).toBe(0)
  })

  // Undefined hedgeK
  it('should give 0 with undefined hedgeK', () => {
    expect(simulateHedge(10, 10, undefined)).toBe(0)
  })

  // Order doesn't matter
  it('should give same result regardless of A/B order', () => {
    expect(simulateHedge(10, 5, 0.30)).toBeCloseTo(simulateHedge(5, 10, 0.30))
  })
})
