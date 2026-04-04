// ============================================
// Story 54.7: A7-A8 资源稀缺 — 单元测试
// ============================================

import { describe, it, expect, afterEach } from 'vitest'
import { state, getMaxRelicSlots } from '../../../src/core/state'
import { A7_RELIC_SLOTS, A8_WORD_COMPRESS_RATIO } from '../../../src/core/constants'
import { MAX_RELIC_SLOTS } from '../../../src/data/relics'

describe('A7-A8 Resource Scarcity', () => {
  afterEach(() => { state.ascensionLevel = 0 })

  describe('getMaxRelicSlots', () => {
    it('returns MAX_RELIC_SLOTS (10) at A0', () => {
      state.ascensionLevel = 0
      expect(getMaxRelicSlots()).toBe(MAX_RELIC_SLOTS)
      expect(getMaxRelicSlots()).toBe(10)
    })

    it('returns MAX_RELIC_SLOTS at A6', () => {
      state.ascensionLevel = 6
      expect(getMaxRelicSlots()).toBe(10)
    })

    it('returns A7_RELIC_SLOTS (8) at A7', () => {
      state.ascensionLevel = 7
      expect(getMaxRelicSlots()).toBe(A7_RELIC_SLOTS)
      expect(getMaxRelicSlots()).toBe(8)
    })

    it('returns A7_RELIC_SLOTS at A10', () => {
      state.ascensionLevel = 10
      expect(getMaxRelicSlots()).toBe(8)
    })
  })

  describe('A8 constants', () => {
    it('A8_WORD_COMPRESS_RATIO should be 0.3', () => {
      expect(A8_WORD_COMPRESS_RATIO).toBe(0.3)
    })
  })
})
