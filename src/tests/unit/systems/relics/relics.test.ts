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
import type { RelicRarity } from '../../../../src/systems/relics/RelicTypes'

describe('Relics Data', () => {
  describe('RELICS constant', () => {
    it('should contain 19 relics', () => {
      expect(Object.keys(RELICS)).toHaveLength(19)
    })

    it('should have all required fields for each relic', () => {
      for (const [id, relic] of Object.entries(RELICS)) {
        expect(relic.id).toBe(id)
        expect(relic.name).toBeTruthy()
        expect(relic.icon).toBeTruthy()
        expect(relic.description).toBeTruthy()
        expect(['common', 'rare', 'legendary']).toContain(relic.rarity)
        expect(relic.basePrice).toBeGreaterThan(0)
        expect(Array.isArray(relic.effects)).toBe(true)
        expect(relic.effects.length).toBeGreaterThan(0)
      }
    })
  })

  describe('Rarity distribution', () => {
    it('should have 2 common relics', () => {
      const commons = getRelicsByRarity('common')
      expect(commons).toHaveLength(2)
    })

    it('should have 10 rare relics', () => {
      const rares = getRelicsByRarity('rare')
      expect(rares).toHaveLength(10)
    })

    it('should have 7 legendary relics', () => {
      const legendaries = getRelicsByRarity('legendary')
      expect(legendaries).toHaveLength(7)
    })
  })

  describe('Common relics', () => {
    it('lucky_coin should give price discount', () => {
      const relic = RELICS.lucky_coin
      expect(relic.rarity).toBe('common')
      expect(relic.effects[0].modifier).toBe('price_discount')
      expect(relic.effects[0].value).toBe(0.1)
    })

    it('time_crystal should give time bonus on word complete', () => {
      const relic = RELICS.time_crystal
      expect(relic.effects[0].type).toBe('on_word_complete')
      expect(relic.effects[0].modifier).toBe('time_bonus')
      expect(relic.effects[0].value).toBe(0.5)
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

    it('void_heart should be rare catalyst', () => {
      const relic = RELICS.void_heart
      expect(relic.rarity).toBe('rare')
      expect(relic.effects[0].type).toBe('on_skill_trigger')
    })

    it('chain_amplifier should be rare catalyst', () => {
      const relic = RELICS.chain_amplifier
      expect(relic.rarity).toBe('rare')
    })

    it('fortress should be rare catalyst', () => {
      const relic = RELICS.fortress
      expect(relic.rarity).toBe('rare')
    })

    it('gamblers_creed should be rare catalyst', () => {
      const relic = RELICS.gamblers_creed
      expect(relic.rarity).toBe('rare')
    })

    it('rhyme_master should give score bonus on double letter words', () => {
      const relic = RELICS.rhyme_master
      expect(relic.rarity).toBe('rare')
      expect(relic.basePrice).toBe(55)
      expect(relic.effects[0].type).toBe('on_skill_trigger')
      expect(relic.effects[0].modifier).toBe('score_bonus')
      expect(relic.effects[0].value).toBe(3)
    })
  })

  describe('Legendary relics', () => {
    it('golden_keyboard should give skill effect bonus', () => {
      const relic = RELICS.golden_keyboard
      expect(relic.rarity).toBe('legendary')
      expect(relic.effects[0].modifier).toBe('skill_effect_bonus')
    })

    it('time_lord should give large time bonus on battle start', () => {
      const relic = RELICS.time_lord
      expect(relic.effects[0].type).toBe('battle_start')
      expect(relic.effects[0].modifier).toBe('time_bonus')
      expect(relic.effects[0].value).toBe(8)
    })

    it('perfectionist should have special no-error condition', () => {
      const relic = RELICS.perfectionist
      expect(relic.effects[0].type).toBe('battle_end')
      expect(relic.effects[0].condition?.type).toBe('combo_threshold')
    })

    it('passive_mastery should be legendary catalyst', () => {
      const relic = RELICS.passive_mastery
      expect(relic.rarity).toBe('legendary')
    })

    it('keyboard_storm should be legendary catalyst', () => {
      const relic = RELICS.keyboard_storm
      expect(relic.rarity).toBe('legendary')
    })
  })

  describe('Price ranges', () => {
    it('common relics should cost 20-35 gold', () => {
      const commons = getRelicsByRarity('common')
      for (const relic of commons) {
        expect(relic.basePrice).toBeGreaterThanOrEqual(20)
        expect(relic.basePrice).toBeLessThanOrEqual(35)
      }
    })

    it('rare relics should cost 40-65 gold', () => {
      const rares = getRelicsByRarity('rare')
      for (const relic of rares) {
        expect(relic.basePrice).toBeGreaterThanOrEqual(40)
        expect(relic.basePrice).toBeLessThanOrEqual(65)
      }
    })

    it('legendary relics should cost 70-125 gold', () => {
      const legendaries = getRelicsByRarity('legendary')
      for (const relic of legendaries) {
        expect(relic.basePrice).toBeGreaterThanOrEqual(70)
        expect(relic.basePrice).toBeLessThanOrEqual(125)
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
      expect(ids).toHaveLength(19)
      expect(ids).toContain('lucky_coin')
      expect(ids).toContain('golden_keyboard')
      expect(ids).toContain('perfectionist')
      expect(ids).toContain('void_heart')
      expect(ids).toContain('chain_amplifier')
      expect(ids).toContain('glass_cannon')
      expect(ids).toContain('time_thief')
      expect(ids).toContain('greedy_hand')
      expect(ids).toContain('silence_vow')
      expect(ids).toContain('doomsday')
      expect(ids).toContain('rhyme_master')
    })
  })

  describe('getAllRelics', () => {
    it('should return array of all relics', () => {
      const relics = getAllRelics()
      expect(relics).toHaveLength(19)
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
      expect(RELICS.golden_keyboard.flavor).toBeDefined()
      expect(RELICS.perfectionist.flavor).toBeDefined()
      expect(RELICS.overkill_blade.flavor).toBeDefined()
      expect(RELICS.void_heart.flavor).toBeDefined()
    })

    it('should be optional (some relics have no flavor)', () => {
      expect(RELICS.time_crystal.flavor).toBeUndefined()
      expect(RELICS.time_lord.flavor).toBeUndefined()
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
  })
})
