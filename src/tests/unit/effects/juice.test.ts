// ============================================
// 打字肉鸽 - Juice 工具函数单元测试
// ============================================
// Story 31.1: 数字颜色分级系统 (AC: 1, 5)

import { describe, it, expect } from 'vitest'
import { getScoreTier, SCORE_TIER_CLASSES, getShakeIntensity, SHAKE_TIERS, getScoreSoundTier } from '../../../src/effects/juice'

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

// Story 31.2: 屏幕震动分级系统 (AC: 1, 6)

describe('getShakeIntensity', () => {
  it('returns 0 for scores below 100 (no shake)', () => {
    expect(getShakeIntensity(0)).toBe(0)
    expect(getShakeIntensity(50)).toBe(0)
    expect(getShakeIntensity(99)).toBe(0)
  })

  it('returns 1 for scores 100-499 (微震)', () => {
    expect(getShakeIntensity(100)).toBe(1)
    expect(getShakeIntensity(499)).toBe(1)
  })

  it('returns 2 for scores 500-999 (轻震)', () => {
    expect(getShakeIntensity(500)).toBe(2)
    expect(getShakeIntensity(999)).toBe(2)
  })

  it('returns 3 for scores 1000-4999 (中震)', () => {
    expect(getShakeIntensity(1000)).toBe(3)
    expect(getShakeIntensity(4999)).toBe(3)
  })

  it('returns 4 for scores 5000-9999 (强震)', () => {
    expect(getShakeIntensity(5000)).toBe(4)
    expect(getShakeIntensity(9999)).toBe(4)
  })

  it('returns 5 for scores 10000+ (猛震)', () => {
    expect(getShakeIntensity(10000)).toBe(5)
    expect(getShakeIntensity(99999)).toBe(5)
  })

  // 边界值测试
  it('handles exact boundary transitions correctly', () => {
    expect(getShakeIntensity(99)).toBe(0)
    expect(getShakeIntensity(100)).toBe(1)

    expect(getShakeIntensity(499)).toBe(1)
    expect(getShakeIntensity(500)).toBe(2)

    expect(getShakeIntensity(999)).toBe(2)
    expect(getShakeIntensity(1000)).toBe(3)

    expect(getShakeIntensity(4999)).toBe(3)
    expect(getShakeIntensity(5000)).toBe(4)

    expect(getShakeIntensity(9999)).toBe(4)
    expect(getShakeIntensity(10000)).toBe(5)
  })

  it('handles negative scores', () => {
    expect(getShakeIntensity(-1)).toBe(0)
  })
})

describe('SHAKE_TIERS', () => {
  it('contains 5 tier entries', () => {
    expect(SHAKE_TIERS).toHaveLength(5)
  })

  it('has increasing x, y, and duration values', () => {
    for (let i = 1; i < SHAKE_TIERS.length; i++) {
      expect(SHAKE_TIERS[i].x).toBeGreaterThan(SHAKE_TIERS[i - 1].x)
      expect(SHAKE_TIERS[i].y).toBeGreaterThan(SHAKE_TIERS[i - 1].y)
      expect(SHAKE_TIERS[i].duration).toBeGreaterThan(SHAKE_TIERS[i - 1].duration)
    }
  })

  it('has correct values for each tier', () => {
    expect(SHAKE_TIERS[0]).toEqual({ x: 2, y: 1, duration: 100 })
    expect(SHAKE_TIERS[1]).toEqual({ x: 4, y: 2, duration: 150 })
    expect(SHAKE_TIERS[2]).toEqual({ x: 6, y: 3, duration: 200 })
    expect(SHAKE_TIERS[3]).toEqual({ x: 10, y: 5, duration: 300 })
    expect(SHAKE_TIERS[4]).toEqual({ x: 16, y: 8, duration: 400 })
  })
})

// Story 31.3: 数字音效分级系统 (AC: 1, 6)

describe('getScoreSoundTier', () => {
  it('returns 0 for scores below 100 (清脆)', () => {
    expect(getScoreSoundTier(0)).toBe(0)
    expect(getScoreSoundTier(50)).toBe(0)
    expect(getScoreSoundTier(99)).toBe(0)
  })

  it('returns 1 for scores 100-999 (明亮)', () => {
    expect(getScoreSoundTier(100)).toBe(1)
    expect(getScoreSoundTier(500)).toBe(1)
    expect(getScoreSoundTier(999)).toBe(1)
  })

  it('returns 2 for scores 1000-4999 (厚重)', () => {
    expect(getScoreSoundTier(1000)).toBe(2)
    expect(getScoreSoundTier(2500)).toBe(2)
    expect(getScoreSoundTier(4999)).toBe(2)
  })

  it('returns 3 for scores 5000+ (轰鸣)', () => {
    expect(getScoreSoundTier(5000)).toBe(3)
    expect(getScoreSoundTier(10000)).toBe(3)
    expect(getScoreSoundTier(99999)).toBe(3)
  })

  it('handles exact boundary transitions correctly', () => {
    expect(getScoreSoundTier(99)).toBe(0)
    expect(getScoreSoundTier(100)).toBe(1)

    expect(getScoreSoundTier(999)).toBe(1)
    expect(getScoreSoundTier(1000)).toBe(2)

    expect(getScoreSoundTier(4999)).toBe(2)
    expect(getScoreSoundTier(5000)).toBe(3)
  })

  it('handles negative and zero scores', () => {
    expect(getScoreSoundTier(-1)).toBe(0)
    expect(getScoreSoundTier(0)).toBe(0)
  })
})
