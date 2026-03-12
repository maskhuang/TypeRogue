// ============================================
// 打字肉鸽 - 遗物数据测试
// ============================================
// Story 5.4 Task 2 + Story 13.1: 遗物数据定义测试

import { describe, it, expect } from 'vitest'
import {
  RELICS,
  getRelicsByRarity,
  getRelicData,
  getAllRelicIds,
  getAllRelics
} from '../../../../src/data/relics'
import type { RelicRarity } from '../../../../src/data/relics'

describe('Relics Data', () => {
  describe('RELICS constant', () => {
    it('should contain 53 relics', () => {
      expect(Object.keys(RELICS)).toHaveLength(53)
    })

    it('每个图标唯一', () => {
      const icons = Object.values(RELICS).map(r => r.icon)
      expect(new Set(icons).size).toBe(icons.length)
    })

    it('should have all required fields for each relic', () => {
      for (const [id, relic] of Object.entries(RELICS)) {
        expect(relic.id).toBe(id)
        expect(relic.name).toBeTruthy()
        expect(relic.icon).toBeTruthy()
        expect(relic.description).toBeTruthy()
        expect(['common', 'rare', 'legendary']).toContain(relic.rarity)
        expect(relic.basePrice).toBeGreaterThanOrEqual(0)
        expect(Array.isArray(relic.effects)).toBe(true)
        // 行为型遗物（T3 retrigger 等）使用 RELIC_MODIFIER_DEFS 而非 effects
        expect(relic.effects.length).toBeGreaterThanOrEqual(0)
      }
    })
  })

  describe('Rarity distribution', () => {
    it('should have 6 common relics', () => {
      const commons = getRelicsByRarity('common')
      expect(commons).toHaveLength(6)
    })

    it('should have 31 rare relics', () => {
      const rares = getRelicsByRarity('rare')
      expect(rares).toHaveLength(31)
    })

    it('should have 16 legendary relics', () => {
      const legendaries = getRelicsByRarity('legendary')
      expect(legendaries).toHaveLength(16)
    })
  })

  describe('Common relics', () => {
    it('lucky_coin should give price discount', () => {
      const relic = RELICS.lucky_coin
      expect(relic.rarity).toBe('common')
      expect(relic.effects[0].modifier).toBe('price_discount')
      expect(relic.effects[0].value).toBe(0.1)
    })

  })

  describe('Rare relics', () => {
    it('phoenix_feather should give combo protection on error', () => {
      const relic = RELICS.phoenix_feather
      expect(relic.rarity).toBe('rare')
      expect(relic.effects[0].type).toBe('on_error')
      expect(relic.effects[0].modifier).toBe('combo_protection')
    })

    it('overkill_blade should convert overkill to gold', () => {
      const relic = RELICS.overkill_blade
      expect(relic.rarity).toBe('rare')
      expect(relic.effects[0].type).toBe('battle_end')
    })

  })

  describe('Legendary relics', () => {
    it('perfectionist should have passive score multiplier', () => {
      const relic = RELICS.perfectionist
      expect(relic.effects[0].type).toBe('passive')
      expect(relic.effects[0].modifier).toBe('score_multiplier')
      expect(relic.effects[0].value).toBe(2.0)
    })
  })

  describe('Price ranges', () => {
    it('common relics should cost 20-35 gold (starter relics excluded)', () => {
      const commons = getRelicsByRarity('common')
      const shopCommons = commons.filter(r => r.basePrice > 0)
      for (const relic of shopCommons) {
        expect(relic.basePrice).toBeGreaterThanOrEqual(20)
        expect(relic.basePrice).toBeLessThanOrEqual(35)
      }
    })

    it('rare relics should cost 40-80 gold', () => {
      const rares = getRelicsByRarity('rare')
      for (const relic of rares) {
        expect(relic.basePrice, `${relic.id} basePrice`).toBeGreaterThanOrEqual(40)
        expect(relic.basePrice, `${relic.id} basePrice`).toBeLessThanOrEqual(80)
      }
    })

    it('legendary relics should cost 0 (reward-only) or 70-125 gold', () => {
      const legendaries = getRelicsByRarity('legendary')
      for (const relic of legendaries) {
        const valid = relic.basePrice === 0 || (relic.basePrice >= 70 && relic.basePrice <= 125)
        expect(valid, `${relic.id} basePrice=${relic.basePrice}`).toBe(true)
      }
    })
  })

  describe('getRelicsByRarity', () => {
    it('should return array of relics for given rarity', () => {
      const rarities: RelicRarity[] = ['common', 'rare', 'legendary']
      for (const rarity of rarities) {
        const relics = getRelicsByRarity(rarity)
        expect(Array.isArray(relics)).toBe(true)
        for (const relic of relics) {
          expect(relic.rarity).toBe(rarity)
        }
      }
    })

    it('should return empty array for unknown rarity', () => {
      const relics = getRelicsByRarity('mythic' as RelicRarity)
      expect(relics).toHaveLength(0)
    })
  })

  describe('getRelicData', () => {
    it('should return relic data for valid id', () => {
      const relic = getRelicData('lucky_coin')
      expect(relic).toBeDefined()
      expect(relic?.id).toBe('lucky_coin')
      expect(relic?.name).toBe('幸运硬币')
    })

    it('should return undefined for unknown id', () => {
      const relic = getRelicData('nonexistent_relic')
      expect(relic).toBeUndefined()
    })

    it('should work for all existing relics', () => {
      for (const id of getAllRelicIds()) {
        const relic = getRelicData(id)
        expect(relic).toBeDefined()
        expect(relic?.id).toBe(id)
      }
    })
  })

  describe('getAllRelicIds', () => {
    it('should return array of all relic ids', () => {
      const ids = getAllRelicIds()
      expect(ids).toHaveLength(53)
      expect(ids).toContain('lucky_coin')
      expect(ids).toContain('perfectionist')
      expect(ids).toContain('glass_cannon')
      expect(ids).toContain('spark_core')
      expect(ids).toContain('forge_heart')
      expect(ids).toContain('chain_surge')
      expect(ids).toContain('stack_resonance')
      expect(ids).toContain('perfect_rhythm')
      expect(ids).toContain('resource_flood')
      expect(ids).toContain('home_advantage')
      expect(ids).toContain('ambidextrous')
      expect(ids).toContain('twin_bond')
      expect(ids).toContain('lone_wolf')
    })
  })

  describe('getAllRelics', () => {
    it('should return array of all relics', () => {
      const relics = getAllRelics()
      expect(relics).toHaveLength(53)
    })

    it('should return RelicData objects', () => {
      const relics = getAllRelics()
      for (const relic of relics) {
        expect(relic.id).toBeDefined()
        expect(relic.name).toBeDefined()
        expect(relic.effects).toBeDefined()
      }
    })
  })

  describe('Flavor text', () => {
    it('should have flavor text for select relics', () => {
      expect(RELICS.lucky_coin.flavor).toBeDefined()
      expect(RELICS.phoenix_feather.flavor).toBeDefined()
      expect(RELICS.perfectionist.flavor).toBeDefined()
      expect(RELICS.overkill_blade.flavor).toBeDefined()
    })
  })

  describe('Removed relics should not exist', () => {
    it('should not contain magnet, combo_badge, berserker_mask, combo_crown, treasure_map, piggy_bank', () => {
      expect(RELICS['magnet']).toBeUndefined()
      expect(RELICS['combo_badge']).toBeUndefined()
      expect(RELICS['berserker_mask']).toBeUndefined()
      expect(RELICS['combo_crown']).toBeUndefined()
      expect(RELICS['treasure_map']).toBeUndefined()
      expect(RELICS['piggy_bank']).toBeUndefined()
    })

    it('should not contain chain_amplifier, fortress, passive_mastery, gamblers_creed (Story 19.9)', () => {
      expect(RELICS['chain_amplifier']).toBeUndefined()
      expect(RELICS['fortress']).toBeUndefined()
      expect(RELICS['passive_mastery']).toBeUndefined()
      expect(RELICS['gamblers_creed']).toBeUndefined()
    })

    it('should not contain relics removed in relic system redesign', () => {
      expect(RELICS['golden_keyboard']).toBeUndefined()
      expect(RELICS['void_heart']).toBeUndefined()
      expect(RELICS['rhyme_master']).toBeUndefined()
      expect(RELICS['keyboard_storm']).toBeUndefined()
      expect(RELICS['time_lord']).toBeUndefined()
      expect(RELICS['time_crystal']).toBeUndefined()
    })
  })
})
