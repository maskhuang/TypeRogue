// ============================================
// Story 54.6: A5-A6 规则变更 — 单元测试
// ============================================

import { describe, it, expect } from 'vitest'
import { getOffenseDefenseModifierIds } from '../../../src/data/bossModifiers'
import { A5_REFRESH_COST_MULT } from '../../../src/core/constants'

describe('A5-A6 Rule Changes', () => {
  describe('getOffenseDefenseModifierIds', () => {
    it('returns only offense and defense modifiers', () => {
      const ids = getOffenseDefenseModifierIds()
      expect(ids.length).toBeGreaterThan(0)
      // 5 offense + 6 defense (includes boss_output_drain)
      expect(ids.length).toBe(11)
    })

    it('excludes disruption modifiers', () => {
      const ids = getOffenseDefenseModifierIds()
      const disruptionIds = ['boss_fade', 'boss_scramble', 'boss_reverse', 'boss_garble', 'boss_decoy']
      for (const d of disruptionIds) {
        expect(ids).not.toContain(d)
      }
    })

    it('includes offense modifiers', () => {
      const ids = getOffenseDefenseModifierIds()
      expect(ids).toContain('boss_fast_time')
      expect(ids).toContain('boss_keystroke_tax')
    })

    it('includes defense modifiers', () => {
      const ids = getOffenseDefenseModifierIds()
      expect(ids).toContain('boss_decay')
      expect(ids).toContain('boss_cap')
    })
  })

  describe('A5_REFRESH_COST_MULT constant', () => {
    it('should be 2', () => {
      expect(A5_REFRESH_COST_MULT).toBe(2)
    })
  })
})
