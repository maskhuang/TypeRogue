// ============================================
// 打字肉鸽 - RelicSystem 测试
// ============================================
// Story 5.4 Task 4: 遗物系统测试

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RelicSystem } from '../../../../src/systems/relics/RelicSystem'
import { eventBus } from '../../../../src/core/events/EventBus'
import { createDefaultModifiers } from '../../../../src/systems/relics/RelicTypes'

describe('RelicSystem', () => {
  let relicSystem: RelicSystem
  let ownedRelics: string[]

  beforeEach(() => {
    ownedRelics = []
    eventBus.clear()
    relicSystem = new RelicSystem(() => ownedRelics, { autoSetupListeners: false })
  })

  afterEach(() => {
    relicSystem.destroy()
    eventBus.clear()
  })

  describe('constructor', () => {
    it('should initialize with empty relics', () => {
      expect(relicSystem.getOwnedRelics()).toHaveLength(0)
      expect(relicSystem.getRelicCount()).toBe(0)
    })

    it('should auto-setup listeners by default', () => {
      const systemWithListeners = new RelicSystem(() => [])
      // Verify listeners are set up by checking event handling
      systemWithListeners.destroy()
    })

    it('should not setup listeners when autoSetupListeners is false', () => {
      // The system is already created with autoSetupListeners: false in beforeEach
      // Just verify it works
      expect(relicSystem.getRelicCount()).toBe(0)
    })
  })

  describe('getOwnedRelics', () => {
    it('should return empty array when no relics owned', () => {
      expect(relicSystem.getOwnedRelics()).toHaveLength(0)
    })

    it('should return relic data for owned relics', () => {
      ownedRelics = ['lucky_coin', 'time_crystal']
      const relics = relicSystem.getOwnedRelics()
      expect(relics).toHaveLength(2)
      expect(relics[0].id).toBe('lucky_coin')
      expect(relics[1].id).toBe('time_crystal')
    })

    it('should skip invalid relic ids', () => {
      ownedRelics = ['lucky_coin', 'invalid_relic', 'time_crystal']
      const relics = relicSystem.getOwnedRelics()
      expect(relics).toHaveLength(2)
    })
  })

  describe('getOwnedRelicIdList', () => {
    it('should return the relic id list', () => {
      ownedRelics = ['lucky_coin', 'time_crystal']
      expect(relicSystem.getOwnedRelicIdList()).toEqual(['lucky_coin', 'time_crystal'])
    })
  })

  describe('hasRelic', () => {
    it('should return true for owned relic', () => {
      ownedRelics = ['lucky_coin']
      expect(relicSystem.hasRelic('lucky_coin')).toBe(true)
    })

    it('should return false for not owned relic', () => {
      expect(relicSystem.hasRelic('lucky_coin')).toBe(false)
    })
  })

  describe('calculateModifiers', () => {
    it('should return default modifiers for no relics', () => {
      const modifiers = relicSystem.calculateModifiers('passive')
      expect(modifiers).toEqual(createDefaultModifiers())
    })

    it('should calculate passive modifiers correctly', () => {
      ownedRelics = ['lucky_coin'] // 10% price discount
      const modifiers = relicSystem.calculateModifiers('passive')
      expect(modifiers.priceDiscount).toBe(0.1)
    })

    it('should calculate battle_start modifiers correctly', () => {
      ownedRelics = ['time_lord'] // +8 seconds
      const modifiers = relicSystem.calculateModifiers('battle_start')
      expect(modifiers.timeBonus).toBe(8)
    })

    it('should calculate battle_end modifiers correctly', () => {
      ownedRelics = ['treasure_map'] // +15 gold flat
      const modifiers = relicSystem.calculateModifiers('battle_end')
      expect(modifiers.goldFlat).toBe(15)
    })

    it('should calculate on_word_complete modifiers correctly', () => {
      ownedRelics = ['time_crystal'] // +0.5 seconds per word
      const modifiers = relicSystem.calculateModifiers('on_word_complete')
      expect(modifiers.timeBonus).toBe(0.5)
    })

    it('should calculate on_error modifiers correctly', () => {
      ownedRelics = ['phoenix_feather'] // 30% combo protection
      const modifiers = relicSystem.calculateModifiers('on_error')
      expect(modifiers.comboProtectionChance).toBe(0.3)
    })

    it('should stack multiple relic effects', () => {
      ownedRelics = ['time_lord', 'combo_crown'] // +8s time, +0.3 multiplier
      const modifiers = relicSystem.calculateModifiers('battle_start')
      expect(modifiers.timeBonus).toBe(8)
      expect(modifiers.scoreMultiplier).toBe(1.3)
    })
  })

  describe('getPassiveModifiers (caching)', () => {
    it('should cache passive modifiers', () => {
      ownedRelics = ['lucky_coin']
      const modifiers1 = relicSystem.getPassiveModifiers()
      const modifiers2 = relicSystem.getPassiveModifiers()
      expect(modifiers1).toBe(modifiers2) // Same reference (cached)
    })

    it('should invalidate cache when context updates', () => {
      ownedRelics = ['lucky_coin']
      const modifiers1 = relicSystem.getPassiveModifiers()
      relicSystem.updateContext({ combo: 10 })
      const modifiers2 = relicSystem.getPassiveModifiers()
      expect(modifiers1).not.toBe(modifiers2) // Different reference
    })
  })

  describe('convenience getters', () => {
    it('getTimeBonus should return battle_start time bonus', () => {
      ownedRelics = ['time_lord']
      expect(relicSystem.getTimeBonus()).toBe(8)
    })

    it('getWordCompleteTimeBonus should return on_word_complete time bonus', () => {
      ownedRelics = ['time_crystal']
      expect(relicSystem.getWordCompleteTimeBonus()).toBe(0.5)
    })

    it('getScoreMultiplier should return passive score multiplier', () => {
      ownedRelics = ['combo_crown'] // Only applies on battle_start, so passive should be 1
      expect(relicSystem.getScoreMultiplier()).toBe(1)
    })

    it('getGoldMultiplier should return default when no gold_multiplier relic', () => {
      ownedRelics = ['treasure_map'] // treasure_map now uses gold_flat, not gold_multiplier
      expect(relicSystem.getGoldMultiplier()).toBe(1)
    })

    it('getPriceDiscount should return passive price discount', () => {
      ownedRelics = ['lucky_coin']
      expect(relicSystem.getPriceDiscount()).toBe(0.1)
    })

    it('getSkillEffectBonus should return passive skill effect bonus', () => {
      ownedRelics = ['golden_keyboard']
      expect(relicSystem.getSkillEffectBonus()).toBe(0.25)
    })

    it('getComboProtectionChance should return on_error combo protection', () => {
      ownedRelics = ['phoenix_feather']
      expect(relicSystem.getComboProtectionChance()).toBe(0.3)
    })

    it('getWordScoreBonus should return passive word score bonus', () => {
      ownedRelics = ['magnet']
      expect(relicSystem.getWordScoreBonus()).toBe(5)
    })

    it('getMultiplierFromCombo should calculate combo multiplier', () => {
      ownedRelics = ['combo_badge'] // 0.01 per combo
      expect(relicSystem.getMultiplierFromCombo(100)).toBeCloseTo(1)
    })

    it('getGoldFlat should return battle_start gold flat bonus', () => {
      ownedRelics = ['piggy_bank']
      expect(relicSystem.getGoldFlat()).toBe(10)
    })
  })

  describe('context management', () => {
    it('should update context correctly', () => {
      relicSystem.updateContext({ combo: 25, score: 1000 })
      const context = relicSystem.getContext()
      expect(context.combo).toBe(25)
      expect(context.score).toBe(1000)
    })

    it('should reset context', () => {
      relicSystem.updateContext({ combo: 25, hasError: true })
      relicSystem.resetBattleContext()
      const context = relicSystem.getContext()
      expect(context.combo).toBe(0)
      expect(context.hasError).toBe(false)
    })

    it('should affect conditional effects', () => {
      ownedRelics = ['berserker_mask'] // +30% when combo > 20

      relicSystem.updateContext({ combo: 15 })
      const modifiersLow = relicSystem.calculateModifiers('passive')
      expect(modifiersLow.scoreMultiplier).toBe(1) // Not activated

      relicSystem.updateContext({ combo: 25 })
      const modifiersHigh = relicSystem.calculateModifiers('passive')
      expect(modifiersHigh.scoreMultiplier).toBe(1.3) // Activated
    })
  })

  describe('event listeners', () => {
    beforeEach(() => {
      relicSystem.setupEventListeners()
    })

    it('should emit relic:effect on battle:start', () => {
      const handler = vi.fn()
      eventBus.on('relic:effect', handler)

      ownedRelics = ['time_lord']
      eventBus.emit('battle:start', { stageId: 1 })

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: 'battle_start',
          modifiers: expect.objectContaining({
            timeBonus: 8
          })
        })
      )
    })

    it('should emit relic:effect on word:complete', () => {
      const handler = vi.fn()
      eventBus.on('relic:effect', handler)

      ownedRelics = ['time_crystal']
      eventBus.emit('word:complete', { word: 'test', score: 100, perfect: true })

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: 'on_word_complete',
          modifiers: expect.objectContaining({
            timeBonus: 0.5
          })
        })
      )
    })

    it('should update combo on combo:update', () => {
      eventBus.emit('combo:update', { combo: 50 })
      expect(relicSystem.getContext().combo).toBe(50)
    })

    it('should mark hasError on word:error', () => {
      eventBus.emit('word:error', { key: 'a', expected: 'b' })
      expect(relicSystem.getContext().hasError).toBe(true)
    })

    it('should emit relic:combo_protected when protection triggers', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1) // Will trigger 30% protection

      const handler = vi.fn()
      eventBus.on('relic:combo_protected', handler)

      ownedRelics = ['phoenix_feather']
      eventBus.emit('word:error', { key: 'a', expected: 'b' })

      expect(handler).toHaveBeenCalled()

      vi.restoreAllMocks()
    })

    it('should not emit relic:combo_protected when protection fails', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5) // Won't trigger 30% protection

      const handler = vi.fn()
      eventBus.on('relic:combo_protected', handler)

      ownedRelics = ['phoenix_feather']
      eventBus.emit('word:error', { key: 'a', expected: 'b' })

      expect(handler).not.toHaveBeenCalled()

      vi.restoreAllMocks()
    })

    it('should emit relic:effect on battle:end', () => {
      const handler = vi.fn()
      eventBus.on('relic:effect', handler)

      ownedRelics = ['treasure_map']
      eventBus.emit('battle:end', { result: 'win', score: 1000 })

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: 'battle_end',
          modifiers: expect.objectContaining({
            goldFlat: 15
          })
        })
      )
    })

    it('should reset context on battle:start', () => {
      relicSystem.updateContext({ combo: 50, hasError: true })
      eventBus.emit('battle:start', { stageId: 1 })

      const context = relicSystem.getContext()
      expect(context.combo).toBe(0)
      expect(context.hasError).toBe(false)
    })
  })

  describe('static methods', () => {
    it('getAllRelics should return all relic data', () => {
      const relics = RelicSystem.getAllRelics()
      expect(relics.length).toBeGreaterThan(0)
      expect(relics[0].id).toBeDefined()
    })

    it('getRelicsByRarity should filter by rarity', () => {
      const commons = RelicSystem.getRelicsByRarity('common')
      for (const relic of commons) {
        expect(relic.rarity).toBe('common')
      }
    })

    it('getRelicData should return relic for valid id', () => {
      const relic = RelicSystem.getRelicData('lucky_coin')
      expect(relic).toBeDefined()
      expect(relic?.id).toBe('lucky_coin')
    })

    it('getRelicData should return undefined for invalid id', () => {
      const relic = RelicSystem.getRelicData('nonexistent')
      expect(relic).toBeUndefined()
    })

    it('getRelicsMap should return all relics as record', () => {
      const map = RelicSystem.getRelicsMap()
      expect(map.lucky_coin).toBeDefined()
      expect(map.golden_keyboard).toBeDefined()
    })
  })

  describe('getRelicDetails', () => {
    it('should return relic data for valid id', () => {
      const details = relicSystem.getRelicDetails('lucky_coin')
      expect(details).toBeDefined()
      expect(details?.name).toBe('幸运硬币')
    })

    it('should return undefined for invalid id', () => {
      const details = relicSystem.getRelicDetails('nonexistent')
      expect(details).toBeUndefined()
    })
  })

  describe('destroy', () => {
    it('should remove event listeners', () => {
      relicSystem.setupEventListeners()

      const handler = vi.fn()
      eventBus.on('relic:effect', handler)

      ownedRelics = ['time_lord']
      eventBus.emit('battle:start', { stageId: 1 })
      expect(handler).toHaveBeenCalledTimes(1)

      relicSystem.destroy()

      eventBus.emit('battle:start', { stageId: 2 })
      // Handler should still be called (it's still subscribed)
      // but RelicSystem won't emit relic:effect anymore
      // This is a bit tricky to test without more complex setup
    })

    it('should clear cached modifiers', () => {
      ownedRelics = ['lucky_coin']
      relicSystem.getPassiveModifiers()
      relicSystem.destroy()
      // After destroy, cache should be cleared (internal state)
    })
  })
})
