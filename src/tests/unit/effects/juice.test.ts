// ============================================
// 打字肉鸽 - Juice 工具函数单元测试
// ============================================
// Story 31.1: 数字颜色分级系统 (AC: 1, 5)

import { describe, it, expect } from 'vitest'
import { getScoreTier, SCORE_TIER_CLASSES } from '../../../src/effects/juice'

describe('getScoreTier', () => {
  it('returns empty string for scores below 100', () => {
    expect(getScoreTier(0)).toBe('')
    expect(getScoreTier(50)).toBe('')
    expect(getScoreTier(99)).toBe('')
  })

  it('returns score-silver for scores 100-999', () => {
    expect(getScoreTier(100)).toBe('score-silver')
    expect(getScoreTier(500)).toBe('score-silver')
    expect(getScoreTier(999)).toBe('score-silver')
  })

  it('returns score-gold for scores 1000-4999', () => {
    expect(getScoreTier(1000)).toBe('score-gold')
    expect(getScoreTier(2500)).toBe('score-gold')
    expect(getScoreTier(4999)).toBe('score-gold')
  })

  it('returns score-rainbow for scores 5000-9999', () => {
    expect(getScoreTier(5000)).toBe('score-rainbow')
    expect(getScoreTier(7500)).toBe('score-rainbow')
    expect(getScoreTier(9999)).toBe('score-rainbow')
  })

  it('returns score-legendary for scores 10000+', () => {
    expect(getScoreTier(10000)).toBe('score-legendary')
    expect(getScoreTier(50000)).toBe('score-legendary')
    expect(getScoreTier(999999)).toBe('score-legendary')
  })

  // 边界值测试
  it('handles exact boundary transitions correctly', () => {
    // 99 → 100 boundary
    expect(getScoreTier(99)).toBe('')
    expect(getScoreTier(100)).toBe('score-silver')

    // 999 → 1000 boundary
    expect(getScoreTier(999)).toBe('score-silver')
    expect(getScoreTier(1000)).toBe('score-gold')

    // 4999 → 5000 boundary
    expect(getScoreTier(4999)).toBe('score-gold')
    expect(getScoreTier(5000)).toBe('score-rainbow')

    // 9999 → 10000 boundary
    expect(getScoreTier(9999)).toBe('score-rainbow')
    expect(getScoreTier(10000)).toBe('score-legendary')
  })

  it('handles negative and zero scores', () => {
    expect(getScoreTier(-1)).toBe('')
    expect(getScoreTier(0)).toBe('')
  })
})

describe('SCORE_TIER_CLASSES', () => {
  it('contains all 4 tier class names', () => {
    expect(SCORE_TIER_CLASSES).toHaveLength(4)
    expect(SCORE_TIER_CLASSES).toContain('score-silver')
    expect(SCORE_TIER_CLASSES).toContain('score-gold')
    expect(SCORE_TIER_CLASSES).toContain('score-rainbow')
    expect(SCORE_TIER_CLASSES).toContain('score-legendary')
  })
})
