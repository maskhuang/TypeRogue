// ============================================
// 打字肉鸽 - 遗物槽位系统测试
// ============================================
// Story 27.3: 10 槽位限制 + 替换 + 卖出

import { describe, it, expect, beforeEach } from 'vitest'
import {
  MAX_RELIC_SLOTS,
  RELICS,
  getRelicData,
  getAllRelicIds,
} from '../../../../src/data/relics'

import {
  state,
  resetState,
  hasRelic,
  isRelicSlotsFull,
  addRelicWithCapacity,
  removeRelic,
  replaceRelic,
} from '../../../../src/core/state'

// === 辅助 ===
function fillRelics(count: number): string[] {
  const ids = getAllRelicIds().slice(0, count)
  ids.forEach(id => state.player.relics.add(id))
  return ids
}

describe('遗物槽位系统 (Story 27.3)', () => {

  beforeEach(() => {
    resetState()
  })

  // === 常量 ===
  describe('MAX_RELIC_SLOTS 常量', () => {
    it('等于 10', () => {
      expect(MAX_RELIC_SLOTS).toBe(10)
    })
  })

  // === isRelicSlotsFull ===
  describe('isRelicSlotsFull', () => {
    it('空槽位 → false', () => {
      expect(isRelicSlotsFull()).toBe(false)
    })

    it('未满 → false', () => {
      fillRelics(5)
      expect(isRelicSlotsFull()).toBe(false)
    })

    it('恰好满 10 个 → true', () => {
      fillRelics(10)
      expect(isRelicSlotsFull()).toBe(true)
    })
  })

  // === addRelicWithCapacity ===
  describe('addRelicWithCapacity', () => {
    it('空槽位添加成功 → true', () => {
      expect(addRelicWithCapacity('lucky_coin')).toBe(true)
      expect(hasRelic('lucky_coin')).toBe(true)
    })

    it('重复添加 → false', () => {
      addRelicWithCapacity('lucky_coin')
      expect(addRelicWithCapacity('lucky_coin')).toBe(false)
    })

    it('满 10 个后添加失败 → false', () => {
      fillRelics(10)
      // 尝试添加一个不在前 10 里的
      const allIds = getAllRelicIds()
      const extraId = allIds.find(id => !state.player.relics.has(id))
      if (extraId) {
        expect(addRelicWithCapacity(extraId)).toBe(false)
        expect(state.player.relics.size).toBe(10)
      }
    })

    it('9 个时仍可添加第 10 个', () => {
      fillRelics(9)
      const allIds = getAllRelicIds()
      const tenthId = allIds.find(id => !state.player.relics.has(id))!
      expect(addRelicWithCapacity(tenthId)).toBe(true)
      expect(state.player.relics.size).toBe(10)
    })
  })

  // === removeRelic ===
  describe('removeRelic', () => {
    it('移除已拥有的遗物', () => {
      addRelicWithCapacity('lucky_coin')
      removeRelic('lucky_coin')
      expect(hasRelic('lucky_coin')).toBe(false)
      expect(state.player.relics.size).toBe(0)
    })

    it('移除不存在的遗物不报错', () => {
      expect(() => removeRelic('nonexistent')).not.toThrow()
    })
  })

  // === replaceRelic ===
  describe('replaceRelic', () => {
    it('替换遗物 — 旧的消失新的出现', () => {
      addRelicWithCapacity('lucky_coin')
      replaceRelic('lucky_coin', 'phoenix_feather')
      expect(hasRelic('lucky_coin')).toBe(false)
      expect(hasRelic('phoenix_feather')).toBe(true)
    })

    it('替换返还金币 = floor(basePrice * 0.5)', () => {
      addRelicWithCapacity('lucky_coin')
      const oldGold = state.gold
      const sellGold = replaceRelic('lucky_coin', 'phoenix_feather')
      const expectedGold = Math.floor(RELICS['lucky_coin'].basePrice * 0.5)
      expect(sellGold).toBe(expectedGold)
      expect(state.gold).toBe(oldGold + expectedGold)
    })

    it('满槽替换后仍为 10 个', () => {
      const filled = fillRelics(10)
      const allIds = getAllRelicIds()
      const newId = allIds.find(id => !state.player.relics.has(id))
      if (newId) {
        replaceRelic(filled[0], newId)
        expect(state.player.relics.size).toBe(10)
        expect(hasRelic(filled[0])).toBe(false)
        expect(hasRelic(newId)).toBe(true)
      }
    })

    it('替换不存在的旧遗物 → 返回 0 金币，仍添加新遗物', () => {
      const gold = replaceRelic('nonexistent', 'lucky_coin')
      expect(gold).toBe(0)
      expect(hasRelic('lucky_coin')).toBe(true)
    })
  })

  // === 遗物数据基线 ===
  describe('遗物数据完整性', () => {
    it('所有遗物有 basePrice >= 0（starter 遗物为 0）', () => {
      // starter遗物 + 奖励专属遗物 basePrice=0
      const zeroPriceRelics = new Set([
        'apprentice_notes', 'primal_mutant',
        'masters_lexicon', 'resonance_mold', 'fragment_prism',
        'ultimate_mutant_strain', 'abyss_eye', 'fittest_survivors',
      ])
      for (const relic of Object.values(RELICS)) {
        if (zeroPriceRelics.has(relic.id)) {
          expect(relic.basePrice, `${relic.id} basePrice`).toBe(0)
        } else {
          expect(relic.basePrice, `${relic.id} basePrice`).toBeGreaterThan(0)
        }
      }
    })

    it('卖出金币不超过购买价格', () => {
      for (const relic of Object.values(RELICS)) {
        const sellGold = Math.floor(relic.basePrice * 0.5)
        expect(sellGold, `${relic.id} sell price`).toBeLessThanOrEqual(relic.basePrice)
      }
    })
  })
})
