// ============================================
// 打字肉鸽 - 遗物数据测试
// ============================================
// Story 5.4 Task 2: 遗物数据定义测试

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
    it('should contain 13 relics', () => {
      expect(Object.keys(RELICS)).toHaveLength(13)
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

    it('should have valid effect types for each relic', () => {
      const validEffectTypes = [
        'battle_start', 'battle_end', 'on_word_complete',
        'on_keystroke', 'on_combo_break', 'on_error',
        'passive', 'on_acquire'
      ]
      const validModifiers = [
        'time_bonus', 'score_multiplier', 'gold_multiplier',
        'combo_protection', 'skill_effect_bonus', 'price_discount',
        'word_score_bonus', 'multiplier_per_combo', 'gold_flat'
      ]

      for (const relic of Object.values(RELICS)) {
        for (const effect of relic.effects) {
          expect(validEffectTypes).toContain(effect.type)
          expect(validModifiers).toContain(effect.modifier)
          expect(typeof effect.value).toBe('number')
        }
      }
    })
  })

  describe('Rarity distribution', () => {
    it('should have 5 common relics', () => {
      const commons = getRelicsByRarity('common')
      expect(commons).toHaveLength(5)
    })

    it('should have 5 rare relics', () => {
      const rares = getRelicsByRarity('rare')
      expect(rares).toHaveLength(5)
    })

    it('should have 3 legendary relics', () => {
      const legendaries = getRelicsByRarity('legendary')
      expect(legendaries).toHaveLength(3)
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

    it('piggy_bank should give gold on battle start', () => {
      const relic = RELICS.piggy_bank
      expect(relic.effects[0].type).toBe('battle_start')
      expect(relic.effects[0].modifier).toBe('gold_flat')
      expect(relic.effects[0].value).toBe(10)
    })

    it('magnet should give word score bonus', () => {
      const relic = RELICS.magnet
      expect(relic.effects[0].modifier).toBe('word_score_bonus')
      expect(relic.effects[0].value).toBe(5)
    })

    it('combo_badge should give multiplier per combo', () => {
      const relic = RELICS.combo_badge
      expect(relic.effects[0].modifier).toBe('multiplier_per_combo')
      expect(relic.effects[0].value).toBe(0.01)
    })
  })

  describe('Rare relics', () => {
    it('phoenix_feather should give combo protection on error', () => {
      const relic = RELICS.phoenix_feather
      expect(relic.rarity).toBe('rare')
      expect(relic.effects[0].type).toBe('on_error')
      expect(relic.effects[0].modifier).toBe('combo_protection')
      expect(relic.effects[0].value).toBe(0.3)
    })

    it('berserker_mask should have combo threshold condition', () => {
      const relic = RELICS.berserker_mask
      expect(relic.effects[0].condition).toBeDefined()
      expect(relic.effects[0].condition?.type).toBe('combo_threshold')
      expect(relic.effects[0].condition?.threshold).toBe(20)
    })

    it('treasure_map should give gold flat on battle end', () => {
      const relic = RELICS.treasure_map
      expect(relic.effects[0].type).toBe('battle_end')
      expect(relic.effects[0].modifier).toBe('gold_flat')
      expect(relic.effects[0].value).toBe(15)
    })

    it('overkill_blade should convert overkill to gold', () => {
      const relic = RELICS.overkill_blade
      expect(relic.rarity).toBe('rare')
      expect(relic.effects[0].type).toBe('battle_end')
      expect(relic.effects[0].modifier).toBe('gold_flat')
      expect(relic.effects[0].value).toBe(0)
    })

    it('combo_crown should give score multiplier on battle start', () => {
      const relic = RELICS.combo_crown
      expect(relic.effects[0].type).toBe('battle_start')
      expect(relic.effects[0].modifier).toBe('score_multiplier')
      expect(relic.effects[0].value).toBe(0.3)
    })
  })

  describe('Legendary relics', () => {
    it('golden_keyboard should give skill effect bonus', () => {
      const relic = RELICS.golden_keyboard
      expect(relic.rarity).toBe('legendary')
      expect(relic.effects[0].modifier).toBe('skill_effect_bonus')
      expect(relic.effects[0].value).toBe(0.25)
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
      expect(relic.effects[0].condition?.threshold).toBe(-1) // 特殊值表示无错误
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

    it('rare relics should cost 45-65 gold', () => {
      const rares = getRelicsByRarity('rare')
      for (const relic of rares) {
        expect(relic.basePrice).toBeGreaterThanOrEqual(45)
        expect(relic.basePrice).toBeLessThanOrEqual(65)
      }
    })

    it('legendary relics should cost 90-125 gold', () => {
      const legendaries = getRelicsByRarity('legendary')
      for (const relic of legendaries) {
        expect(relic.basePrice).toBeGreaterThanOrEqual(90)
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
      // Type assertion needed for testing invalid input
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
      expect(ids).toHaveLength(13)
      expect(ids).toContain('lucky_coin')
      expect(ids).toContain('golden_keyboard')
      expect(ids).toContain('perfectionist')
    })
  })

  describe('getAllRelics', () => {
    it('should return array of all relics', () => {
      const relics = getAllRelics()
      expect(relics).toHaveLength(13)
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
    })

    it('should be optional (some relics have no flavor)', () => {
      expect(RELICS.time_crystal.flavor).toBeUndefined()
      expect(RELICS.magnet.flavor).toBeUndefined()
    })
  })
})
