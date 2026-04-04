// ============================================
// Story 54.4: A1-A2 经济修正器 — 单元测试
// ============================================

import { describe, it, expect, beforeEach } from 'vitest'
import { state } from '../../../../src/core/state'
import { getAscensionPriceMultiplier } from '../../../../src/systems/shop'
import { A2_PRICE_MULT } from '../../../../src/core/constants'

describe('Ascension Economy Modifiers', () => {
  beforeEach(() => {
    state.ascensionLevel = 0
  })

  describe('getAscensionPriceMultiplier', () => {
    it('returns 1.0 at A0', () => {
      state.ascensionLevel = 0
      expect(getAscensionPriceMultiplier()).toBe(1.0)
    })

    it('returns 1.0 at A1 (price increase starts at A2)', () => {
      state.ascensionLevel = 1
      expect(getAscensionPriceMultiplier()).toBe(1.0)
    })

    it('returns A2_PRICE_MULT at A2', () => {
      state.ascensionLevel = 2
      expect(getAscensionPriceMultiplier()).toBe(A2_PRICE_MULT)
      expect(getAscensionPriceMultiplier()).toBe(1.15)
    })

    it('returns A2_PRICE_MULT at A5', () => {
      state.ascensionLevel = 5
      expect(getAscensionPriceMultiplier()).toBe(1.15)
    })

    it('returns A2_PRICE_MULT at A10', () => {
      state.ascensionLevel = 10
      expect(getAscensionPriceMultiplier()).toBe(1.15)
    })
  })

  describe('A2_PRICE_MULT constant', () => {
    it('should be 1.15', () => {
      expect(A2_PRICE_MULT).toBe(1.15)
    })
  })
})
