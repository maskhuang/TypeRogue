// ============================================
// 打字肉鸽 - 周目难度缩放 单元测试
// ============================================
// Story 25.2: triple difficulty scaling (score × cycle, time × decay)

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { calculateTargetScore } from '../../../src/core/state'
import { getCycleTimeLimit } from '../../../src/systems/stage/stageFlow'
import { BALANCE } from '../../../src/core/constants'

describe('周目难度缩放 (cycle scaling)', () => {
  // === AC1: 目标分数指数缩放 ===

  describe('calculateTargetScore cycle 缩放', () => {
    it('cycle=1 无变化（与旧行为一致）', () => {
      // level 1 standard: 80 + 40 + 5 = 125
      expect(calculateTargetScore(1, 'standard', 1)).toBe(125)
      expect(calculateTargetScore(1, 'standard')).toBe(125) // 默认值
    })

    it('cycle=2 翻倍', () => {
      const base = calculateTargetScore(1, 'standard', 1) // 125
      const c2 = calculateTargetScore(1, 'standard', 2)
      expect(c2).toBe(base * 2) // 250
    })

    it('cycle=3 ×4', () => {
      const base = calculateTargetScore(1, 'standard', 1)
      const c3 = calculateTargetScore(1, 'standard', 3)
      expect(c3).toBe(base * 4) // 500
    })

    it('cycle=4 ×8', () => {
      const base = calculateTargetScore(1, 'standard', 1)
      const c4 = calculateTargetScore(1, 'standard', 4)
      expect(c4).toBe(base * 8) // 1000
    })

    it('cycle=5 ×16', () => {
      const base = calculateTargetScore(1, 'standard', 1)
      const c5 = calculateTargetScore(1, 'standard', 5)
      expect(c5).toBe(base * 16) // 2000
    })

    it('cycle 缩放公式: baseTarget × 2^(cycle-1)', () => {
      for (let cycle = 1; cycle <= 5; cycle++) {
        const base = calculateTargetScore(3, 'standard', 1) // level 3 base
        const scaled = calculateTargetScore(3, 'standard', cycle)
        expect(scaled).toBe(Math.floor(base * Math.pow(2, cycle - 1)))
      }
    })
  })

  // === AC5: stageType 倍率与 cycle 缩放正确叠加 ===

  describe('stageType × cycle 叠加', () => {
    it('elite ×1.3 在 cycle 缩放之后叠加', () => {
      // level 1 base = 125, cycle 2 → 250, elite → floor(250 * 1.3) = 325
      const standardC2 = calculateTargetScore(1, 'standard', 2) // 250
      const eliteC2 = calculateTargetScore(1, 'elite', 2)
      expect(eliteC2).toBe(Math.floor(standardC2 * 1.3))
    })

    it('boss ×1.5 在 cycle 缩放之后叠加', () => {
      const standardC2 = calculateTargetScore(1, 'standard', 2) // 250
      const bossC2 = calculateTargetScore(1, 'boss', 2)
      expect(bossC2).toBe(Math.floor(standardC2 * 1.5))
    })

    it('cycle 3 + elite 倍率正确', () => {
      const standardC3 = calculateTargetScore(1, 'standard', 3) // 500
      const eliteC3 = calculateTargetScore(1, 'elite', 3)
      expect(eliteC3).toBe(Math.floor(standardC3 * 1.3)) // 650
    })

    it('cycle 3 + boss 倍率正确', () => {
      const standardC3 = calculateTargetScore(1, 'standard', 3) // 500
      const bossC3 = calculateTargetScore(1, 'boss', 3)
      expect(bossC3).toBe(Math.floor(standardC3 * 1.5)) // 750
    })
  })

  // === AC2: 时间限制指数衰减 ===

  describe('getCycleTimeLimit 时间衰减', () => {
    it('cycle=1 无变化', () => {
      // standard node (nodeId=1): 30s
      expect(getCycleTimeLimit(1, 1)).toBe(30)
      // elite node (nodeId=3): 45s
      expect(getCycleTimeLimit(3, 1)).toBe(45)
      // boss node (nodeId=10): 60s
      expect(getCycleTimeLimit(10, 1)).toBe(60)
    })

    it('cycle=2 standard: 30 × 0.9 = 27', () => {
      expect(getCycleTimeLimit(1, 2)).toBeCloseTo(27, 5)
    })

    it('cycle=2 elite: round(45 × 0.9) = 41', () => {
      expect(getCycleTimeLimit(3, 2)).toBe(41)
    })

    it('cycle=2 boss: 60 × 0.9 = 54', () => {
      expect(getCycleTimeLimit(10, 2)).toBeCloseTo(54, 5)
    })

    it('cycle=3 standard: round(30 × 0.81) = 24', () => {
      expect(getCycleTimeLimit(1, 3)).toBe(24)
    })

    it('cycle=5 standard: round(30 × 0.9^4) = 20', () => {
      expect(getCycleTimeLimit(1, 5)).toBe(Math.round(30 * Math.pow(0.9, 4)))
    })

    it('cycle=5 elite: round(45 × 0.9^4) = 30', () => {
      expect(getCycleTimeLimit(3, 5)).toBe(Math.round(45 * Math.pow(0.9, 4)))
    })

    it('cycle=5 boss: round(60 × 0.9^4) = 39', () => {
      expect(getCycleTimeLimit(10, 5)).toBe(Math.round(60 * Math.pow(0.9, 4)))
    })

    it('衰减公式: round(baseTime × CYCLE_TIME_DECAY^(cycle-1))', () => {
      for (let cycle = 1; cycle <= 5; cycle++) {
        const expected = Math.round(30 * Math.pow(BALANCE.CYCLE_TIME_DECAY, cycle - 1))
        expect(getCycleTimeLimit(1, cycle)).toBe(expected)
      }
    })

    it('返回整数（无浮点数）', () => {
      for (let cycle = 1; cycle <= 10; cycle++) {
        expect(Number.isInteger(getCycleTimeLimit(1, cycle))).toBe(true)
        expect(Number.isInteger(getCycleTimeLimit(3, cycle))).toBe(true)
        expect(Number.isInteger(getCycleTimeLimit(10, cycle))).toBe(true)
      }
    })

    it('无下限 — 高 cycle 下可衰减到极小值', () => {
      // cycle 20: round(30 × 0.9^19) ≈ 4
      const time = getCycleTimeLimit(1, 20)
      expect(time).toBeGreaterThan(0)
      expect(time).toBeLessThan(5)
    })
  })

  // === AC3: 衰减系数可配置 ===

  describe('BALANCE 常量配置', () => {
    it('CYCLE_SCORE_BASE 默认 2', () => {
      expect(BALANCE.CYCLE_SCORE_BASE).toBe(2)
    })

    it('CYCLE_TIME_DECAY 默认 0.9', () => {
      expect(BALANCE.CYCLE_TIME_DECAY).toBe(0.9)
    })

    it('修改 CYCLE_SCORE_BASE 后 calculateTargetScore 结果变化', () => {
      const original = BALANCE.CYCLE_SCORE_BASE
      try {
        ;(BALANCE as any).CYCLE_SCORE_BASE = 3
        // level 1 base = 125, cycle 2 → 125 × 3 = 375
        expect(calculateTargetScore(1, 'standard', 2)).toBe(375)
      } finally {
        ;(BALANCE as any).CYCLE_SCORE_BASE = original
      }
    })

    it('修改 CYCLE_TIME_DECAY 后 getCycleTimeLimit 结果变化', () => {
      const original = BALANCE.CYCLE_TIME_DECAY
      try {
        ;(BALANCE as any).CYCLE_TIME_DECAY = 0.8
        // standard cycle 2: round(30 × 0.8) = 24
        expect(getCycleTimeLimit(1, 2)).toBe(24)
      } finally {
        ;(BALANCE as any).CYCLE_TIME_DECAY = original
      }
    })
  })

  // === AC5: tempBuff 在 cycle 缩放后叠加 ===

  describe('tempBuff 与 cycle 缩放交互', () => {
    it('targetScore tempBuff 在 cycle 缩放后叠加', () => {
      // 模拟 startLevel 中的计算顺序：
      // 1. calculateTargetScore 已含 cycle 缩放
      // 2. tempBuff 在之后叠加
      const cycle2Target = calculateTargetScore(1, 'standard', 2) // 250
      const buffValue = 2.0 // boss_double_target 效果
      const afterBuff = Math.floor(cycle2Target * buffValue) // 500
      expect(afterBuff).toBe(500)
      // 对比 cycle 1 的 buff 结果
      const cycle1Target = calculateTargetScore(1, 'standard', 1) // 125
      const cycle1AfterBuff = Math.floor(cycle1Target * buffValue) // 250
      expect(afterBuff).toBe(cycle1AfterBuff * 2) // cycle 2 buff 后是 cycle 1 buff 后的 2 倍
    })

    it('time tempBuff 在 cycle 衰减后叠加', () => {
      // 模拟 startLevel 中的计算顺序：
      // 1. getCycleTimeLimit 已含 cycle 衰减
      // 2. tempBuff time 在之后叠加
      const cycle2Time = getCycleTimeLimit(1, 2) // 27
      const timeBonus = 5 // tempBuff type='time'
      const afterBuff = cycle2Time + timeBonus // 32
      expect(afterBuff).toBe(32)
      // 对比 cycle 1
      const cycle1Time = getCycleTimeLimit(1, 1) // 30
      expect(cycle1Time + timeBonus).toBe(35)
      expect(afterBuff).toBeLessThan(cycle1Time + timeBonus)
    })
  })

  // === 默认参数向后兼容 ===

  describe('向后兼容', () => {
    it('calculateTargetScore 不传 cycle 等同 cycle=1', () => {
      expect(calculateTargetScore(1, 'standard')).toBe(calculateTargetScore(1, 'standard', 1))
      expect(calculateTargetScore(3, 'elite')).toBe(calculateTargetScore(3, 'elite', 1))
      expect(calculateTargetScore(5, 'boss')).toBe(calculateTargetScore(5, 'boss', 1))
    })
  })
})
