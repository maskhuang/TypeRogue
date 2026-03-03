// ============================================
// 打字肉鸽 - state 单元测试
// ============================================
// Story 18.1: calculateTargetScore with stageType

import { describe, it, expect } from 'vitest'
import { calculateTargetScore } from '../../../src/core/state'

describe('calculateTargetScore', () => {
  it('默认 stageType 为 standard', () => {
    const score = calculateTargetScore(1)
    const scoreExplicit = calculateTargetScore(1, 'standard')
    expect(score).toBe(scoreExplicit)
  })

  it('标准关返回基础分数', () => {
    // level 1: 80 + 1*40 + 1*1*5 = 125
    expect(calculateTargetScore(1, 'standard')).toBe(125)
    // level 3: 80 + 3*40 + 3*3*5 = 80 + 120 + 45 = 245
    expect(calculateTargetScore(3, 'standard')).toBe(245)
  })

  it('精英关 = 标准关 ×1.3', () => {
    const standard = calculateTargetScore(1, 'standard')
    const elite = calculateTargetScore(1, 'elite')
    expect(elite).toBe(Math.floor(standard * 1.3))
  })

  it('Boss 关 = 标准关 ×1.5', () => {
    const standard = calculateTargetScore(1, 'standard')
    const boss = calculateTargetScore(1, 'boss')
    expect(boss).toBe(Math.floor(standard * 1.5))
  })

  it('精英关分数高于标准关', () => {
    for (let level = 1; level <= 8; level++) {
      expect(calculateTargetScore(level, 'elite')).toBeGreaterThan(
        calculateTargetScore(level, 'standard')
      )
    }
  })

  it('Boss 关分数高于精英关', () => {
    for (let level = 1; level <= 8; level++) {
      expect(calculateTargetScore(level, 'boss')).toBeGreaterThan(
        calculateTargetScore(level, 'elite')
      )
    }
  })

  it('分数随关卡递增', () => {
    for (let level = 2; level <= 8; level++) {
      expect(calculateTargetScore(level, 'standard')).toBeGreaterThan(
        calculateTargetScore(level - 1, 'standard')
      )
    }
  })

  it('rest stageType 返回标准分数（无特殊倍率）', () => {
    const standard = calculateTargetScore(1, 'standard')
    const rest = calculateTargetScore(1, 'rest')
    expect(rest).toBe(standard)
  })
})
