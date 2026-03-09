// ============================================
// 打字肉鸽 - Juice 工具函数单元测试
// ============================================
// Story 31.1: 数字颜色分级系统 (AC: 1, 5)

import { describe, it, expect } from 'vitest'
import { getScoreTier, SCORE_TIER_CLASSES, getShakeIntensity, SHAKE_TIERS, getScoreSoundTier, ScoreRoller, getScoreBumpScale, checkMilestone, MILESTONE_TIERS, RATING_TIERS, getRatingTier, GRADE_ORDER, calculateRating } from '../../../src/effects/juice'

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

// Story 31.4: 数字动画系统 (AC: 1, 5)

describe('ScoreRoller', () => {
  it('getDuration returns 0.3s minimum for small diffs', () => {
    expect(ScoreRoller.getDuration(0)).toBe(0.3)
    expect(ScoreRoller.getDuration(1)).toBeCloseTo(0.3, 1)
  })

  it('getDuration scales with log10 of diff', () => {
    const d10 = ScoreRoller.getDuration(10)
    const d100 = ScoreRoller.getDuration(100)
    const d1000 = ScoreRoller.getDuration(1000)
    expect(d10).toBeGreaterThan(0.3)
    expect(d100).toBeGreaterThan(d10)
    expect(d1000).toBeGreaterThan(d100)
  })

  it('getDuration caps at 0.8s', () => {
    expect(ScoreRoller.getDuration(1000000)).toBeLessThanOrEqual(0.8)
  })

  it('starts at 0 and stays at 0 with no target', () => {
    const roller = new ScoreRoller()
    expect(roller.getValue()).toBe(0)
    expect(roller.update(0.1)).toBe(0)
  })

  it('reaches target after full duration', () => {
    const roller = new ScoreRoller()
    roller.setTarget(100)
    // Simulate enough time to complete
    roller.update(1.0)
    expect(roller.getValue()).toBe(100)
  })

  it('interpolates during animation', () => {
    const roller = new ScoreRoller()
    roller.setTarget(1000)
    // Small dt should produce partial value
    const partial = roller.update(0.05)
    expect(partial).toBeGreaterThan(0)
    expect(partial).toBeLessThan(1000)
  })

  it('handles rapid target changes', () => {
    const roller = new ScoreRoller()
    roller.setTarget(100)
    roller.update(0.05) // partially animate
    roller.setTarget(500) // change target before completing
    // Should jump to previous target (100) and start rolling to 500
    expect(roller.getValue()).toBe(100)
    roller.update(2.0) // complete
    expect(roller.getValue()).toBe(500)
  })

  it('ignores duplicate setTarget calls', () => {
    const roller = new ScoreRoller()
    roller.setTarget(100)
    roller.update(0.05)
    const val = roller.getValue()
    roller.setTarget(100) // same target, should be no-op
    expect(roller.getValue()).toBe(val)
  })

  it('reset clears state and prevents rollback', () => {
    const roller = new ScoreRoller()
    roller.setTarget(5000)
    roller.update(2.0) // complete to 5000
    expect(roller.getValue()).toBe(5000)
    roller.reset(0) // new level: reset to 0
    expect(roller.getValue()).toBe(0)
    roller.setTarget(0) // same as reset value, should be no-op
    expect(roller.getValue()).toBe(0)
    roller.update(1.0) // should stay at 0
    expect(roller.getValue()).toBe(0)
  })
})

// Story 31.5: 分数里程碑庆祝 (AC: 1, 7)

describe('checkMilestone', () => {
  it('returns null when no milestone is crossed', () => {
    expect(checkMilestone(10, 50)).toBeNull()
    expect(checkMilestone(100, 200)).toBeNull()
    expect(checkMilestone(1000, 2000)).toBeNull()
  })

  it('detects exact threshold crossing (99 → 100)', () => {
    const tier = checkMilestone(99, 100)
    expect(tier).not.toBeNull()
    expect(tier!.threshold).toBe(100)
    expect(tier!.label).toBe('100!')
  })

  it('returns the highest crossed tier when multiple are crossed', () => {
    // Jump from 0 to 5000 crosses 100, 500, 1000, 5000
    const tier = checkMilestone(0, 5000)
    expect(tier).not.toBeNull()
    expect(tier!.threshold).toBe(5000)
  })

  it('does not re-trigger for scores already above threshold', () => {
    expect(checkMilestone(150, 200)).toBeNull()
    expect(checkMilestone(5000, 8000)).toBeNull()
    expect(checkMilestone(10000, 20000)).toBeNull()
  })

  it('detects each individual milestone tier', () => {
    for (const tier of MILESTONE_TIERS) {
      const result = checkMilestone(tier.threshold - 1, tier.threshold)
      expect(result).not.toBeNull()
      expect(result!.threshold).toBe(tier.threshold)
    }
  })
})

describe('MILESTONE_TIERS', () => {
  it('contains 5 milestone entries', () => {
    expect(MILESTONE_TIERS).toHaveLength(5)
  })

  it('has increasing thresholds', () => {
    for (let i = 1; i < MILESTONE_TIERS.length; i++) {
      expect(MILESTONE_TIERS[i].threshold).toBeGreaterThan(MILESTONE_TIERS[i - 1].threshold)
    }
  })

  it('has increasing fontSize values', () => {
    for (let i = 1; i < MILESTONE_TIERS.length; i++) {
      expect(MILESTONE_TIERS[i].fontSize).toBeGreaterThan(MILESTONE_TIERS[i - 1].fontSize)
    }
  })
})

describe('getScoreBumpScale', () => {
  it('returns 1.5 (default) for scores below 1000', () => {
    expect(getScoreBumpScale(0)).toBe(1.5)
    expect(getScoreBumpScale(500)).toBe(1.5)
    expect(getScoreBumpScale(999)).toBe(1.5)
  })

  it('returns 1.6 for scores 1000-4999', () => {
    expect(getScoreBumpScale(1000)).toBe(1.6)
    expect(getScoreBumpScale(4999)).toBe(1.6)
  })

  it('returns 1.8 for scores 5000-9999', () => {
    expect(getScoreBumpScale(5000)).toBe(1.8)
    expect(getScoreBumpScale(9999)).toBe(1.8)
  })

  it('returns 2.0 for scores 10000+', () => {
    expect(getScoreBumpScale(10000)).toBe(2.0)
    expect(getScoreBumpScale(99999)).toBe(2.0)
  })

  it('handles exact boundary transitions', () => {
    expect(getScoreBumpScale(999)).toBe(1.5)
    expect(getScoreBumpScale(1000)).toBe(1.6)
    expect(getScoreBumpScale(4999)).toBe(1.6)
    expect(getScoreBumpScale(5000)).toBe(1.8)
    expect(getScoreBumpScale(9999)).toBe(1.8)
    expect(getScoreBumpScale(10000)).toBe(2.0)
  })

  it('scale values are monotonically increasing', () => {
    const scores = [0, 999, 1000, 4999, 5000, 9999, 10000]
    const scales = scores.map(getScoreBumpScale)
    for (let i = 1; i < scales.length; i++) {
      expect(scales[i]).toBeGreaterThanOrEqual(scales[i - 1])
    }
  })
})

// Story 31.6: 关卡评级系统 (AC: 1, 7)

describe('calculateRating', () => {
  it('returns C when score < targetScore (失败)', () => {
    expect(calculateRating(99, 100)).toBe('C')
    expect(calculateRating(0, 100)).toBe('C')
    expect(calculateRating(500, 1000)).toBe('C')
  })

  it('returns B for 100-110% (overkillRatio < 0.1)', () => {
    expect(calculateRating(100, 100)).toBe('B') // exactly 100%
    expect(calculateRating(109, 100)).toBe('B') // 109%
  })

  it('returns A for 130-160% (overkillRatio 0.3-0.6)', () => {
    expect(calculateRating(130, 100)).toBe('A') // overkill=0.3
    expect(calculateRating(159, 100)).toBe('A') // overkill=0.59
  })

  it('returns S for 160-200% (overkillRatio 0.6-1.0)', () => {
    expect(calculateRating(160, 100)).toBe('S') // overkill=0.6
    expect(calculateRating(199, 100)).toBe('S') // overkill=0.99
  })

  it('returns SS for 200-300% (overkillRatio 1.0-2.0)', () => {
    expect(calculateRating(200, 100)).toBe('SS') // overkill=1.0
    expect(calculateRating(299, 100)).toBe('SS') // overkill=1.99
  })

  it('returns SSS for 300%+ (overkillRatio >= 2.0)', () => {
    expect(calculateRating(300, 100)).toBe('SSS') // overkill=2.0
    expect(calculateRating(1000, 100)).toBe('SSS') // overkill=9.0
  })

  it('returns C when targetScore <= 0', () => {
    expect(calculateRating(100, 0)).toBe('C')
    expect(calculateRating(100, -1)).toBe('C')
  })

  it('handles exact boundary transitions', () => {
    // B → A at overkillRatio 0.3 (score 130 for target 100)
    expect(calculateRating(129, 100)).toBe('B')
    expect(calculateRating(130, 100)).toBe('A')

    // A → S at overkillRatio 0.6 (score 160 for target 100)
    expect(calculateRating(159, 100)).toBe('A')
    expect(calculateRating(160, 100)).toBe('S')

    // S → SS at overkillRatio 1.0 (score 200 for target 100)
    expect(calculateRating(199, 100)).toBe('S')
    expect(calculateRating(200, 100)).toBe('SS')

    // SS → SSS at overkillRatio 2.0 (score 300 for target 100)
    expect(calculateRating(299, 100)).toBe('SS')
    expect(calculateRating(300, 100)).toBe('SSS')
  })
})

describe('RATING_TIERS', () => {
  it('contains 6 rating entries (C through SSS)', () => {
    expect(RATING_TIERS).toHaveLength(6)
  })

  it('covers all grades in order', () => {
    const grades = RATING_TIERS.map(t => t.grade)
    expect(grades).toEqual(['C', 'B', 'A', 'S', 'SS', 'SSS'])
  })

  it('SS and SSS have particles, others do not', () => {
    for (const tier of RATING_TIERS) {
      if (tier.grade === 'SS' || tier.grade === 'SSS') {
        expect(tier.particleCount).toBeGreaterThan(0)
      } else {
        expect(tier.particleCount).toBe(0)
      }
    }
  })

  it('only SSS has shakeIntensity > 0', () => {
    for (const tier of RATING_TIERS) {
      if (tier.grade === 'SSS') {
        expect(tier.shakeIntensity).toBeGreaterThan(0)
      } else {
        expect(tier.shakeIntensity).toBe(0)
      }
    }
  })
})

describe('getRatingTier', () => {
  it('returns correct tier for each grade', () => {
    for (const tier of RATING_TIERS) {
      expect(getRatingTier(tier.grade)).toBe(tier)
    }
  })

  it('returns C tier for unknown grades', () => {
    expect(getRatingTier('X')).toBe(RATING_TIERS[0])
    expect(getRatingTier('')).toBe(RATING_TIERS[0])
  })
})

describe('GRADE_ORDER', () => {
  it('contains 6 grades in ascending order', () => {
    expect(GRADE_ORDER).toEqual(['C', 'B', 'A', 'S', 'SS', 'SSS'])
  })
})
