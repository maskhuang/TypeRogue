// ============================================
// 打字肉鸽 - 周目难度缩放 单元测试
// ============================================
// Story 25.2: triple difficulty scaling (time × decay)
// Story 42.5: calculateTargetScore cycle 缩放已移除（指数增长替代）

import { describe, it, expect, afterEach } from 'vitest'
import { getCycleTimeLimit } from '../../../src/systems/stage/stageFlow'
import { BALANCE, A4_CYCLE_TIME_DECAY } from '../../../src/core/constants'
import { state } from '../../../src/core/state'

describe('周目难度缩放 (cycle scaling)', () => {
  // === AC2: 时间限制指数衰减 ===

  describe('getCycleTimeLimit 时间衰减', () => {
    it('cycle=1 无变化', () => {
      // standard node (nodeId=1): 30s
      expect(getCycleTimeLimit(1, 1)).toBe(30)
      // boss node (nodeId=3, every 3rd stage): 60s
      expect(getCycleTimeLimit(3, 1)).toBe(60)
    })

    it('cycle=2 standard: round(30 × 0.9) = 27', () => {
      expect(getCycleTimeLimit(1, 2)).toBe(27)
    })

    it('cycle=2 boss: round(60 × 0.9) = 54', () => {
      expect(getCycleTimeLimit(3, 2)).toBe(54)
    })

    it('cycle=3 standard: round(30 × 0.81) = 24', () => {
      expect(getCycleTimeLimit(1, 3)).toBe(24)
    })

    it('cycle=5 standard: round(30 × 0.9^4) = 20', () => {
      expect(getCycleTimeLimit(1, 5)).toBe(Math.round(30 * Math.pow(0.9, 4)))
    })

    it('cycle=5 boss: round(60 × 0.9^4) = 39', () => {
      expect(getCycleTimeLimit(3, 5)).toBe(Math.round(60 * Math.pow(0.9, 4)))
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

  // === BALANCE 常量配置 ===

  describe('BALANCE 常量配置', () => {
    it('CYCLE_TIME_DECAY 默认 0.9', () => {
      expect(BALANCE.CYCLE_TIME_DECAY).toBe(0.9)
    })

    it('TARGET_BASE_EXP 默认 300', () => {
      expect(BALANCE.TARGET_BASE_EXP).toBe(300)
    })

    it('TARGET_GROWTH 默认 1.45', () => {
      expect(BALANCE.TARGET_GROWTH).toBe(1.45)
    })

    it('BOSS_TARGET_MULT 默认 1.5', () => {
      expect(BALANCE.BOSS_TARGET_MULT).toBe(1.5)
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

  // === A4: 加剧时间衰减 (Story 54.5) ===

  describe('A4 时间衰减加剧', () => {
    afterEach(() => { state.ascensionLevel = 0 })

    it('A0 使用默认衰减 0.9', () => {
      state.ascensionLevel = 0
      expect(getCycleTimeLimit(1, 2)).toBe(Math.round(30 * 0.9))
    })

    it('A3 仍使用默认衰减 0.9', () => {
      state.ascensionLevel = 3
      expect(getCycleTimeLimit(1, 2)).toBe(Math.round(30 * 0.9))
    })

    it('A4 使用加剧衰减 0.85', () => {
      state.ascensionLevel = 4
      expect(getCycleTimeLimit(1, 2)).toBe(Math.round(30 * A4_CYCLE_TIME_DECAY))
      // 30 × 0.85 = 25.5 → 26
      expect(getCycleTimeLimit(1, 2)).toBe(26)
    })

    it('A4 cycle 3: 30 × 0.85² ≈ 21.7 → 22', () => {
      state.ascensionLevel = 4
      expect(getCycleTimeLimit(1, 3)).toBe(Math.round(30 * Math.pow(0.85, 2)))
    })

    it('A10 也使用 0.85', () => {
      state.ascensionLevel = 10
      expect(getCycleTimeLimit(1, 2)).toBe(26)
    })
  })
})
