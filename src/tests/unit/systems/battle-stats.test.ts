// ============================================
// 打字肉鸽 - 战后统计 单元测试
// ============================================

import { describe, it, expect } from 'vitest'
import { createBattleStats } from '../../../src/core/state'
import { calculateRating } from '../../../src/systems/battle'

describe('createBattleStats', () => {
  it('初始化所有字段为零值', () => {
    const bs = createBattleStats()
    expect(bs.wordsCompleted).toBe(0)
    expect(bs.totalChainTriggers).toBe(0)
    expect(bs.maxChainDepth).toBe(0)
    expect(bs.perfectWords).toBe(0)
    expect(bs.rating).toBe('')
    expect(bs.keyStats.size).toBe(0)
    expect(bs.skillStats.size).toBe(0)
  })

  it('keyStats 和 skillStats 是独立的 Map 实例', () => {
    const bs1 = createBattleStats()
    const bs2 = createBattleStats()
    bs1.keyStats.set('a', { triggerCount: 1, resources: { base: 0, score: 0, multiplier: 0, time: 0, gold: 0 } })
    expect(bs2.keyStats.size).toBe(0)
  })
})

describe('calculateRating', () => {
  it('未达标 → C', () => {
    expect(calculateRating(50, 100)).toBe('C')
    expect(calculateRating(0, 100)).toBe('C')
  })

  it('刚好过关 → B (overkillRatio = 0)', () => {
    expect(calculateRating(100, 100)).toBe('B')
  })

  it('overkillRatio < 0.2 → B', () => {
    expect(calculateRating(115, 100)).toBe('B')
  })

  it('overkillRatio >= 0.2 → A', () => {
    expect(calculateRating(120, 100)).toBe('A')
    expect(calculateRating(140, 100)).toBe('A')
  })

  it('overkillRatio >= 0.5 → S', () => {
    expect(calculateRating(150, 100)).toBe('S')
    expect(calculateRating(190, 100)).toBe('S')
  })

  it('overkillRatio >= 1.0 → SS', () => {
    expect(calculateRating(200, 100)).toBe('SS')
    expect(calculateRating(280, 100)).toBe('SS')
  })

  it('overkillRatio >= 2.0 → SSS', () => {
    expect(calculateRating(300, 100)).toBe('SSS')
    expect(calculateRating(500, 100)).toBe('SSS')
  })

  it('边界值精确测试', () => {
    // overkillRatio = 0.2 exactly → A
    expect(calculateRating(120, 100)).toBe('A')
    // overkillRatio = 0.5 exactly → S
    expect(calculateRating(150, 100)).toBe('S')
    // overkillRatio = 1.0 exactly → SS
    expect(calculateRating(200, 100)).toBe('SS')
    // overkillRatio = 2.0 exactly → SSS
    expect(calculateRating(300, 100)).toBe('SSS')
  })

  it('targetScore 为 0 时不崩溃', () => {
    // score >= targetScore, overkillRatio = Infinity
    expect(calculateRating(100, 0)).toBe('SSS')
  })
})
