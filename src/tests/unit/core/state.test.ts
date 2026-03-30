// ============================================
// 打字肉鸽 - state 单元测试
// ============================================
// Story 42.5: calculateTargetScore 指数增长

import { describe, it, expect } from 'vitest'
import { calculateTargetScore } from '../../../src/core/state'

describe('calculateTargetScore', () => {
  it('默认 stageType 为 standard', () => {
    const score = calculateTargetScore(2)
    const scoreExplicit = calculateTargetScore(2, 'standard')
    expect(score).toBe(scoreExplicit)
  })

  it('Stage 1 返回 0（校准关，无目标）', () => {
    expect(calculateTargetScore(1, 'standard')).toBe(0)
    expect(calculateTargetScore(1, 'boss')).toBe(0)
  })

  it('Stage 2 返回 TARGET_BASE (300)（未校准时回退默认值）', () => {
    expect(calculateTargetScore(2, 'standard')).toBe(300)
  })

  it('Stage 3 返回 Math.round(300 × 1.45) = 435', () => {
    expect(calculateTargetScore(3, 'standard')).toBe(435)
  })

  it('指数增长公式: Math.round(300 × 1.45^(n-2))，Stage 1 = 0', () => {
    const expected = [0, 300, 435, 631, 915, 1326, 1923, 2788, 4043, 5862]
    for (let i = 0; i < expected.length; i++) {
      expect(calculateTargetScore(i + 1, 'standard')).toBe(expected[i])
    }
  })

  it('Boss 关 = 标准关 × 1.5（Stage 2+）', () => {
    const standard = calculateTargetScore(2, 'standard')
    const boss = calculateTargetScore(2, 'boss')
    expect(boss).toBe(Math.round(standard * 1.5))
  })

  it('Boss Stage 4: Math.round(631 × 1.5) = 947', () => {
    expect(calculateTargetScore(4, 'boss')).toBe(947)
  })

  it('Boss Stage 7: Math.round(1923 × 1.5) = 2885', () => {
    expect(calculateTargetScore(7, 'boss')).toBe(2885)
  })

  it('分数从 Stage 2 起递增', () => {
    for (let level = 3; level <= 10; level++) {
      expect(calculateTargetScore(level, 'standard')).toBeGreaterThan(
        calculateTargetScore(level - 1, 'standard')
      )
    }
  })

  it('Boss 关分数高于标准关（Stage 2+）', () => {
    for (let level = 2; level <= 10; level++) {
      expect(calculateTargetScore(level, 'boss')).toBeGreaterThan(
        calculateTargetScore(level, 'standard')
      )
    }
  })

  it('不再需要 cycle 参数 — 签名只有 stageNum 和 stageType', () => {
    expect(calculateTargetScore(1)).toBe(0)
    expect(calculateTargetScore(2, 'boss')).toBe(450)
  })

  it('tempBuff 管道顺序：目标分数 → buff 乘法叠加', () => {
    const target = calculateTargetScore(4, 'boss') // 947
    const buffValue = 2.0
    const afterBuff = Math.floor(target * buffValue) // 1894
    expect(afterBuff).toBe(1894)
    const stdTarget = calculateTargetScore(4, 'standard') // 631
    const stdAfterBuff = Math.floor(stdTarget * buffValue) // 1262
    expect(afterBuff).toBeGreaterThan(stdAfterBuff)
  })
})
