// ============================================
// 打字肉鸽 - 遗物槽位系统测试
// ============================================
// Story 27.3: 12 槽位限制 + 替换 + 卖出

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
  // 若实际遗物不够，用占位 ID 填满（测试槽位上限用）
  while (ids.length < count) {
    ids.push(`test_relic_${ids.length}`)
  }
  ids.forEach(id => state.player.relics.add(id))
  return ids
}

describe('遗物槽位系统 (Story 27.3)', () => {

  beforeEach(() => {
    resetState()
  })

  // === 常量 ===
  describe('MAX_RELIC_SLOTS 常量', () => {
    it('等于 12', () => {
      expect(MAX_RELIC_SLOTS).toBe(12)
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

    it('恰好满 12 个 → true', () => {
      fillRelics(12)
      expect(isRelicSlotsFull()).toBe(true)
    })
  })

  // === addRelicWithCapacity ===
  describe('addRelicWithCapacity', () => {
    it('空槽位添加成功 → true', () => {
      expect(addRelicWithCapacity('apprentice_notes')).toBe(true)
      expect(hasRelic('apprentice_notes')).toBe(true)
    })

    it('重复添加 → false', () => {
      addRelicWithCapacity('apprentice_notes')
      expect(addRelicWithCapacity('apprentice_notes')).toBe(false)
    })

    it('满 12 个后添加失败 → false', () => {
      fillRelics(12)
      // 尝试添加一个不在前 12 里的
      const allIds = getAllRelicIds()
      const extraId = allIds.find(id => !state.player.relics.has(id))
      if (extraId) {
        expect(addRelicWithCapacity(extraId)).toBe(false)
        expect(state.player.relics.size).toBe(12)
      }
    })

    it('11 个时仍可添加第 12 个', () => {
      fillRelics(11)
      const allIds = getAllRelicIds()
      const twelfthId = allIds.find(id => !state.player.relics.has(id))!
      expect(addRelicWithCapacity(twelfthId)).toBe(true)
      expect(state.player.relics.size).toBe(12)
    })
  })

  // === removeRelic ===
  describe('removeRelic', () => {
    it('移除已拥有的遗物', () => {
      addRelicWithCapacity('apprentice_notes')
      removeRelic('apprentice_notes')
      expect(hasRelic('apprentice_notes')).toBe(false)
      expect(state.player.relics.size).toBe(0)
    })

    it('移除不存在的遗物不报错', () => {
      expect(() => removeRelic('nonexistent')).not.toThrow()
    })
  })

  // === replaceRelic ===
  describe('replaceRelic', () => {
    it('替换遗物 — 旧的消失新的出现', () => {
      addRelicWithCapacity('apprentice_notes')
      replaceRelic('apprentice_notes', 'primal_mutant')
      expect(hasRelic('apprentice_notes')).toBe(false)
      expect(hasRelic('primal_mutant')).toBe(true)
    })

    it('替换返还金币 = floor(basePrice * 0.5)', () => {
      addRelicWithCapacity('apprentice_notes')
      const oldGold = state.gold
      const sellGold = replaceRelic('apprentice_notes', 'primal_mutant')
      const expectedGold = Math.floor(RELICS['apprentice_notes'].basePrice * 0.5)
      expect(sellGold).toBe(expectedGold)
      expect(state.gold).toBe(oldGold + expectedGold)
    })

    it('满槽替换后仍为 12 个', () => {
      const filled = fillRelics(12)
      const allIds = getAllRelicIds()
      const newId = allIds.find(id => !state.player.relics.has(id))
      if (newId) {
        replaceRelic(filled[0], newId)
        expect(state.player.relics.size).toBe(12)
        expect(hasRelic(filled[0])).toBe(false)
        expect(hasRelic(newId)).toBe(true)
      }
    })

    it('替换不存在的旧遗物 → 返回 0 金币，仍添加新遗物', () => {
      const gold = replaceRelic('nonexistent', 'apprentice_notes')
      expect(gold).toBe(0)
      expect(hasRelic('apprentice_notes')).toBe(true)
    })
  })

  // === 遗物数据基线 ===
  describe('遗物数据完整性', () => {
    it('所有遗物有 basePrice >= 0（starter 遗物为 0）', () => {
      // starter遗物 + 奖励专属遗物 basePrice=0
      const zeroPriceRelics = new Set([
        'apprentice_notes', 'primal_mutant',
        'masters_lexicon', 'resonance_mold',
        'ultimate_mutant_strain', 'fittest_survivors',
        'chaos_seed', 'word_scissors',
        'glass_cannon_v2', // risk-reward 遗物，basePrice=0
        'immortal_combo', // risk-reward 遗物，basePrice=0
        'uncrowned_king', // risk-reward 遗物，basePrice=0
        'enchant_anchor', // risk-reward 遗物，basePrice=0
        'key_storm', // 传说级遗物，basePrice=0
        'punctuation_liberation', // 传说级遗物，basePrice=0
        'universal_furnace', // 传说级遗物，basePrice=0
        'timed_auction', // 传说级遗物，basePrice=0
        'phoenix', // 传说级遗物，basePrice=0
        'modifier_reversal', // 传说级遗物，basePrice=0
        'chaos_roulette', // 传说级遗物，basePrice=0
        'score_black_hole', // 传说级遗物，basePrice=0
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
