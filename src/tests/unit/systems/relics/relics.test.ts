// ============================================
// 打字肉鸽 - 遗物数据测试
// ============================================
// 职业专属遗物 + 通用遗物

import { describe, it, expect } from 'vitest'
import {
  RELICS,
  getRelicsByRarity,
  getRelicData,
  getAllRelicIds,
  getAllRelics,
  relicExists,
  DELETED_RELIC_IDS,
} from '../../../../src/data/relics'
import type { RelicRarity } from '../../../../src/data/relics'

describe('Relics Data', () => {
  describe('RELICS constant', () => {
    it('should contain 71 relics (10 class-exclusive + 5 typing + 6 combo + 6 skill + 6 enchantment + 6 topology + 6 word + 7 resource + 5 shop + 5 stage + 5 boss_modifier + 5 scoring)', () => {
      expect(Object.keys(RELICS)).toHaveLength(71)
    })
    // NOTE: 📖 icon is shared by glass_cannon_v2 and training_manual (pre-existing)

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
        expect(['common', 'rare', 'epic', 'legendary']).toContain(relic.rarity)
        expect(relic.basePrice).toBeGreaterThanOrEqual(0)
        expect(Array.isArray(relic.effects)).toBe(true)
      }
    })
  })

  describe('Rarity distribution', () => {
    it('should have 24 common relics (2 starter + 2 typing + 2 combo + 2 skill + 2 enchantment + 2 topology + 2 word + 2 resource(产出分红+续命涓流) + 2 shop + 3 stage + 2 boss_modifier + 2 scoring)', () => {
      const commons = getRelicsByRarity('common')
      expect(commons).toHaveLength(24)
    })

    it('should have 18 rare relics', () => {
      const rares = getRelicsByRarity('rare')
      expect(rares).toHaveLength(18)
    })

    it('should have 14 epic relics', () => {
      const epics = getRelicsByRarity('epic')
      expect(epics).toHaveLength(14)
    })

    it('should have 15 legendary relics', () => {
      const legendaries = getRelicsByRarity('legendary')
      expect(legendaries).toHaveLength(15)
    })
  })

  describe('Class-exclusive relics', () => {
    const WORDSMITH_RELICS = ['apprentice_notes', 'masters_lexicon', 'perpetual_queue', 'word_scissors', 'resonance_mold']
    const METAMORPH_RELICS = ['primal_mutant', 'ultimate_mutant_strain', 'gene_stabilizer', 'chaos_seed', 'fittest_survivors']

    it('should have 5 wordsmith relics', () => {
      for (const id of WORDSMITH_RELICS) {
        expect(RELICS[id], `${id} should exist`).toBeDefined()
      }
    })

    it('should have 5 metamorph relics', () => {
      for (const id of METAMORPH_RELICS) {
        expect(RELICS[id], `${id} should exist`).toBeDefined()
      }
    })

  })

  describe('Universal relics', () => {
    const WORDSMITH_RELICS = ['apprentice_notes', 'masters_lexicon', 'perpetual_queue', 'word_scissors', 'resonance_mold']
    const METAMORPH_RELICS = ['primal_mutant', 'ultimate_mutant_strain', 'gene_stabilizer', 'chaos_seed', 'fittest_survivors']

    it('non-class relics should have subsystem field', () => {
      const allClassRelics = new Set([...WORDSMITH_RELICS, ...METAMORPH_RELICS])
      for (const [id, relic] of Object.entries(RELICS)) {
        if (!allClassRelics.has(id)) {
          expect(relic.subsystem, `${id} should have subsystem`).toBeTruthy()
        }
      }
    })
  })

  describe('getRelicsByRarity', () => {
    it('should return array of relics for given rarity', () => {
      const rarities: RelicRarity[] = ['common', 'rare', 'epic', 'legendary']
      for (const rarity of rarities) {
        const relics = getRelicsByRarity(rarity)
        expect(Array.isArray(relics)).toBe(true)
        for (const r of relics) {
          expect(r.rarity).toBe(rarity)
        }
      }
    })
  })

  describe('getRelicData', () => {
    it('should return relic data for valid id', () => {
      const relic = getRelicData('apprentice_notes')
      expect(relic).toBeDefined()
      expect(relic?.name).toBe('学徒笔记')
    })

    it('should return undefined for unknown id', () => {
      expect(getRelicData('nonexistent')).toBeUndefined()
    })
  })

  describe('getAllRelicIds', () => {
    it('should return array of all relic ids', () => {
      const ids = getAllRelicIds()
      expect(ids).toHaveLength(71)
      expect(ids).toContain('apprentice_notes')
      expect(ids).toContain('primal_mutant')
      expect(ids).toContain('decelerate_reward')
    })
  })

  describe('getAllRelics', () => {
    it('should return array of all relics', () => {
      const relics = getAllRelics()
      expect(relics).toHaveLength(71)
    })
  })

  describe('relicExists', () => {
    it('should return true for existing relics', () => {
      expect(relicExists('apprentice_notes')).toBe(true)
      expect(relicExists('primal_mutant')).toBe(true)
    })

    it('should return false for deleted relics', () => {
      expect(relicExists('lucky_coin')).toBe(false)
      expect(relicExists('phoenix_feather')).toBe(false)
    })
  })

  describe('DELETED_RELIC_IDS', () => {
    it('should contain all previously removed relics', () => {
      const deleted = new Set(DELETED_RELIC_IDS)
      expect(deleted.has('lucky_coin')).toBe(true)
      expect(deleted.has('phoenix_feather')).toBe(true)
      expect(deleted.has('perfectionist')).toBe(true)
      expect(deleted.has('glass_cannon')).toBe(true)
    })

    it('should not contain any current relics', () => {
      const deleted = new Set(DELETED_RELIC_IDS)
      for (const id of Object.keys(RELICS)) {
        expect(deleted.has(id), `${id} should not be in DELETED_RELIC_IDS`).toBe(false)
      }
    })
  })
})
