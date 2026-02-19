// ============================================
// 打字肉鸽 - RelicEffects 测试
// ============================================
// Story 5.4 Task 3: 遗物效果处理器测试

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  RelicEffects,
  createDefaultContext,
  type BattleContext
} from '../../../../src/systems/relics/RelicEffects'
import { createDefaultModifiers } from '../../../../src/systems/relics/RelicTypes'
import type { RelicData, RelicEffect, RelicModifiers } from '../../../../src/systems/relics/RelicTypes'

describe('RelicEffects', () => {
  describe('createDefaultContext', () => {
    it('should create context with zero values', () => {
      const context = createDefaultContext()
      expect(context.combo).toBe(0)
      expect(context.score).toBe(0)
      expect(context.timeRemaining).toBe(0)
      expect(context.hasError).toBe(false)
    })
  })

  describe('calculate', () => {
    const createTestRelic = (effects: RelicEffect[]): RelicData => ({
      id: 'test_relic',
      name: 'Test Relic',
      icon: '🔮',
      description: 'Test',
      rarity: 'common',
      basePrice: 10,
      effects
    })

    it('should return default modifiers for empty relic list', () => {
      const modifiers = RelicEffects.calculate([], 'passive')
      expect(modifiers).toEqual(createDefaultModifiers())
    })

    it('should apply passive effects', () => {
      const relic = createTestRelic([
        { type: 'passive', modifier: 'score_multiplier', value: 0.5 }
      ])
      const modifiers = RelicEffects.calculate([relic], 'passive')
      expect(modifiers.scoreMultiplier).toBe(1.5)
    })

    it('should apply battle_start effects', () => {
      const relic = createTestRelic([
        { type: 'battle_start', modifier: 'time_bonus', value: 5 }
      ])
      const modifiers = RelicEffects.calculate([relic], 'battle_start')
      expect(modifiers.timeBonus).toBe(5)
    })

    it('should apply battle_end effects', () => {
      const relic = createTestRelic([
        { type: 'battle_end', modifier: 'gold_multiplier', value: 1.5 }
      ])
      const modifiers = RelicEffects.calculate([relic], 'battle_end')
      expect(modifiers.goldMultiplier).toBe(1.5)
    })

    it('should apply on_word_complete effects', () => {
      const relic = createTestRelic([
        { type: 'on_word_complete', modifier: 'time_bonus', value: 0.5 }
      ])
      const modifiers = RelicEffects.calculate([relic], 'on_word_complete')
      expect(modifiers.timeBonus).toBe(0.5)
    })

    it('should apply on_error effects', () => {
      const relic = createTestRelic([
        { type: 'on_error', modifier: 'combo_protection', value: 0.3 }
      ])
      const modifiers = RelicEffects.calculate([relic], 'on_error')
      expect(modifiers.comboProtectionChance).toBe(0.3)
    })

    it('should not apply effects for mismatched trigger type', () => {
      const relic = createTestRelic([
        { type: 'battle_start', modifier: 'time_bonus', value: 5 }
      ])
      const modifiers = RelicEffects.calculate([relic], 'battle_end')
      expect(modifiers.timeBonus).toBe(0)
    })

    it('should include passive effects in any trigger type calculation', () => {
      const relic = createTestRelic([
        { type: 'passive', modifier: 'score_multiplier', value: 0.2 },
        { type: 'battle_start', modifier: 'time_bonus', value: 5 }
      ])
      const modifiers = RelicEffects.calculate([relic], 'battle_start')
      expect(modifiers.scoreMultiplier).toBe(1.2)
      expect(modifiers.timeBonus).toBe(5)
    })

    describe('effect stacking', () => {
      it('should stack score_multiplier additively', () => {
        const relic1 = createTestRelic([
          { type: 'passive', modifier: 'score_multiplier', value: 0.3 }
        ])
        const relic2 = createTestRelic([
          { type: 'passive', modifier: 'score_multiplier', value: 0.2 }
        ])
        const modifiers = RelicEffects.calculate([relic1, relic2], 'passive')
        expect(modifiers.scoreMultiplier).toBe(1.5) // 1 + 0.3 + 0.2
      })

      it('should stack gold_multiplier multiplicatively', () => {
        const relic1 = createTestRelic([
          { type: 'battle_end', modifier: 'gold_multiplier', value: 1.25 }
        ])
        const relic2 = createTestRelic([
          { type: 'battle_end', modifier: 'gold_multiplier', value: 1.5 }
        ])
        const modifiers = RelicEffects.calculate([relic1, relic2], 'battle_end')
        expect(modifiers.goldMultiplier).toBeCloseTo(1.875) // 1 * 1.25 * 1.5
      })

      it('should take max for combo_protection', () => {
        const relic1 = createTestRelic([
          { type: 'on_error', modifier: 'combo_protection', value: 0.3 }
        ])
        const relic2 = createTestRelic([
          { type: 'on_error', modifier: 'combo_protection', value: 0.5 }
        ])
        const modifiers = RelicEffects.calculate([relic1, relic2], 'on_error')
        expect(modifiers.comboProtectionChance).toBe(0.5) // max(0.3, 0.5)
      })

      it('should cap price_discount at 50%', () => {
        const relic1 = createTestRelic([
          { type: 'passive', modifier: 'price_discount', value: 0.3 }
        ])
        const relic2 = createTestRelic([
          { type: 'passive', modifier: 'price_discount', value: 0.4 }
        ])
        const modifiers = RelicEffects.calculate([relic1, relic2], 'passive')
        expect(modifiers.priceDiscount).toBe(0.5) // capped at 50%
      })

      it('should stack time_bonus additively', () => {
        const relic1 = createTestRelic([
          { type: 'battle_start', modifier: 'time_bonus', value: 5 }
        ])
        const relic2 = createTestRelic([
          { type: 'battle_start', modifier: 'time_bonus', value: 8 }
        ])
        const modifiers = RelicEffects.calculate([relic1, relic2], 'battle_start')
        expect(modifiers.timeBonus).toBe(13)
      })

      it('should stack word_score_bonus additively', () => {
        const relic1 = createTestRelic([
          { type: 'passive', modifier: 'word_score_bonus', value: 5 }
        ])
        const relic2 = createTestRelic([
          { type: 'passive', modifier: 'word_score_bonus', value: 3 }
        ])
        const modifiers = RelicEffects.calculate([relic1, relic2], 'passive')
        expect(modifiers.wordScoreBonus).toBe(8)
      })

      it('should stack gold_flat additively', () => {
        const relic1 = createTestRelic([
          { type: 'battle_start', modifier: 'gold_flat', value: 10 }
        ])
        const relic2 = createTestRelic([
          { type: 'battle_start', modifier: 'gold_flat', value: 5 }
        ])
        const modifiers = RelicEffects.calculate([relic1, relic2], 'battle_start')
        expect(modifiers.goldFlat).toBe(15)
      })
    })

    describe('conditional effects', () => {
      it('should apply effect when combo threshold is met', () => {
        const relic = createTestRelic([
          {
            type: 'passive',
            modifier: 'score_multiplier',
            value: 0.3,
            condition: { type: 'combo_threshold', threshold: 20 }
          }
        ])
        const context: BattleContext = { combo: 25, score: 0, timeRemaining: 0, hasError: false }
        const modifiers = RelicEffects.calculate([relic], 'passive', context)
        expect(modifiers.scoreMultiplier).toBe(1.3)
      })

      it('should not apply effect when combo threshold is not met', () => {
        const relic = createTestRelic([
          {
            type: 'passive',
            modifier: 'score_multiplier',
            value: 0.3,
            condition: { type: 'combo_threshold', threshold: 20 }
          }
        ])
        const context: BattleContext = { combo: 15, score: 0, timeRemaining: 0, hasError: false }
        const modifiers = RelicEffects.calculate([relic], 'passive', context)
        expect(modifiers.scoreMultiplier).toBe(1) // Default, not applied
      })

      it('should apply effect when score threshold is met', () => {
        const relic = createTestRelic([
          {
            type: 'battle_end',
            modifier: 'gold_multiplier',
            value: 1.5,
            condition: { type: 'score_threshold', threshold: 1000 }
          }
        ])
        const context: BattleContext = { combo: 0, score: 1500, timeRemaining: 0, hasError: false }
        const modifiers = RelicEffects.calculate([relic], 'battle_end', context)
        expect(modifiers.goldMultiplier).toBe(1.5)
      })

      it('should handle special -1 threshold for no error condition', () => {
        const relic = createTestRelic([
          {
            type: 'battle_end',
            modifier: 'score_multiplier',
            value: 1,
            condition: { type: 'combo_threshold', threshold: -1 }
          }
        ])

        // No error - should apply
        const contextNoError: BattleContext = { combo: 0, score: 0, timeRemaining: 0, hasError: false }
        const modifiersNoError = RelicEffects.calculate([relic], 'battle_end', contextNoError)
        expect(modifiersNoError.scoreMultiplier).toBe(2) // 1 + 1

        // Has error - should not apply
        const contextWithError: BattleContext = { combo: 0, score: 0, timeRemaining: 0, hasError: true }
        const modifiersWithError = RelicEffects.calculate([relic], 'battle_end', contextWithError)
        expect(modifiersWithError.scoreMultiplier).toBe(1) // Default
      })

      it('should apply effect when time_remaining threshold is met', () => {
        const relic = createTestRelic([
          {
            type: 'passive',
            modifier: 'score_multiplier',
            value: 0.2,
            condition: { type: 'time_remaining', threshold: 30 }
          }
        ])
        const context: BattleContext = { combo: 0, score: 0, timeRemaining: 45, hasError: false }
        const modifiers = RelicEffects.calculate([relic], 'passive', context)
        expect(modifiers.scoreMultiplier).toBe(1.2)
      })
    })
  })

  describe('checkCondition', () => {
    const effect: RelicEffect = {
      type: 'passive',
      modifier: 'score_multiplier',
      value: 0.5,
      condition: { type: 'combo_threshold', threshold: 10 }
    }

    it('should return true when condition is undefined', () => {
      const noConditionEffect: RelicEffect = {
        type: 'passive',
        modifier: 'score_multiplier',
        value: 0.5
      }
      const context: BattleContext = { combo: 0, score: 0, timeRemaining: 0, hasError: false }
      expect(RelicEffects.checkCondition(noConditionEffect, context)).toBe(true)
    })

    it('should check combo_threshold correctly', () => {
      const context1: BattleContext = { combo: 10, score: 0, timeRemaining: 0, hasError: false }
      const context2: BattleContext = { combo: 5, score: 0, timeRemaining: 0, hasError: false }

      expect(RelicEffects.checkCondition(effect, context1)).toBe(true)
      expect(RelicEffects.checkCondition(effect, context2)).toBe(false)
    })

    it('should check score_threshold correctly', () => {
      const scoreEffect: RelicEffect = {
        type: 'passive',
        modifier: 'gold_multiplier',
        value: 1.5,
        condition: { type: 'score_threshold', threshold: 500 }
      }
      const context1: BattleContext = { combo: 0, score: 600, timeRemaining: 0, hasError: false }
      const context2: BattleContext = { combo: 0, score: 400, timeRemaining: 0, hasError: false }

      expect(RelicEffects.checkCondition(scoreEffect, context1)).toBe(true)
      expect(RelicEffects.checkCondition(scoreEffect, context2)).toBe(false)
    })

    it('should check time_remaining correctly', () => {
      const timeEffect: RelicEffect = {
        type: 'passive',
        modifier: 'score_multiplier',
        value: 0.3,
        condition: { type: 'time_remaining', threshold: 20 }
      }
      const context1: BattleContext = { combo: 0, score: 0, timeRemaining: 30, hasError: false }
      const context2: BattleContext = { combo: 0, score: 0, timeRemaining: 10, hasError: false }

      expect(RelicEffects.checkCondition(timeEffect, context1)).toBe(true)
      expect(RelicEffects.checkCondition(timeEffect, context2)).toBe(false)
    })
  })

  describe('applyEffect', () => {
    it('should apply time_bonus', () => {
      const modifiers = createDefaultModifiers()
      const effect: RelicEffect = { type: 'passive', modifier: 'time_bonus', value: 5 }
      RelicEffects.applyEffect(modifiers, effect)
      expect(modifiers.timeBonus).toBe(5)
    })

    it('should apply score_multiplier additively', () => {
      const modifiers = createDefaultModifiers()
      const effect: RelicEffect = { type: 'passive', modifier: 'score_multiplier', value: 0.3 }
      RelicEffects.applyEffect(modifiers, effect)
      expect(modifiers.scoreMultiplier).toBe(1.3)
    })

    it('should apply gold_multiplier multiplicatively', () => {
      const modifiers = createDefaultModifiers()
      const effect: RelicEffect = { type: 'passive', modifier: 'gold_multiplier', value: 1.5 }
      RelicEffects.applyEffect(modifiers, effect)
      expect(modifiers.goldMultiplier).toBe(1.5)
    })

    it('should apply combo_protection by taking max', () => {
      const modifiers = createDefaultModifiers()
      modifiers.comboProtectionChance = 0.2

      const effect: RelicEffect = { type: 'on_error', modifier: 'combo_protection', value: 0.5 }
      RelicEffects.applyEffect(modifiers, effect)
      expect(modifiers.comboProtectionChance).toBe(0.5)
    })

    it('should cap price_discount at 50%', () => {
      const modifiers = createDefaultModifiers()
      modifiers.priceDiscount = 0.4

      const effect: RelicEffect = { type: 'passive', modifier: 'price_discount', value: 0.3 }
      RelicEffects.applyEffect(modifiers, effect)
      expect(modifiers.priceDiscount).toBe(0.5)
    })
  })

  describe('rollComboProtection', () => {
    beforeEach(() => {
      vi.spyOn(Math, 'random')
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should always return false for 0% chance', () => {
      expect(RelicEffects.rollComboProtection(0)).toBe(false)
      expect(RelicEffects.rollComboProtection(-0.1)).toBe(false)
    })

    it('should always return true for 100% chance', () => {
      expect(RelicEffects.rollComboProtection(1)).toBe(true)
      expect(RelicEffects.rollComboProtection(1.5)).toBe(true)
    })

    it('should return true when random < chance', () => {
      vi.mocked(Math.random).mockReturnValue(0.2)
      expect(RelicEffects.rollComboProtection(0.3)).toBe(true)
    })

    it('should return false when random >= chance', () => {
      vi.mocked(Math.random).mockReturnValue(0.4)
      expect(RelicEffects.rollComboProtection(0.3)).toBe(false)
    })
  })

  describe('mergeModifiers', () => {
    it('should merge two modifier sets correctly', () => {
      const base: RelicModifiers = {
        timeBonus: 5,
        scoreMultiplier: 1.2,
        goldMultiplier: 1.25,
        comboProtectionChance: 0.3,
        skillEffectBonus: 0.1,
        priceDiscount: 0.1,
        wordScoreBonus: 5,
        multiplierPerCombo: 0.01,
        goldFlat: 10
      }
      const additional: RelicModifiers = {
        timeBonus: 3,
        scoreMultiplier: 1.3,
        goldMultiplier: 1.5,
        comboProtectionChance: 0.5,
        skillEffectBonus: 0.15,
        priceDiscount: 0.2,
        wordScoreBonus: 3,
        multiplierPerCombo: 0.005,
        goldFlat: 5
      }

      const merged = RelicEffects.mergeModifiers(base, additional)

      expect(merged.timeBonus).toBe(8)
      expect(merged.scoreMultiplier).toBeCloseTo(1.5) // 1.2 + 1.3 - 1
      expect(merged.goldMultiplier).toBeCloseTo(1.875) // 1.25 * 1.5
      expect(merged.comboProtectionChance).toBe(0.5)
      expect(merged.skillEffectBonus).toBeCloseTo(0.25)
      expect(merged.priceDiscount).toBeCloseTo(0.3)
      expect(merged.wordScoreBonus).toBe(8)
      expect(merged.multiplierPerCombo).toBeCloseTo(0.015)
      expect(merged.goldFlat).toBe(15)
    })

    it('should cap price_discount at 50% when merging', () => {
      const base: RelicModifiers = createDefaultModifiers()
      base.priceDiscount = 0.4

      const additional: RelicModifiers = createDefaultModifiers()
      additional.priceDiscount = 0.3

      const merged = RelicEffects.mergeModifiers(base, additional)
      expect(merged.priceDiscount).toBe(0.5)
    })
  })
})
