// ============================================
// 打字肉鸽 - RelicTypes 测试
// ============================================
// Story 5.4 Task 1: 遗物类型定义测试

import { describe, it, expect } from 'vitest'
import {
  createDefaultModifiers,
  type RelicRarity,
  type RelicEffectType,
  type RelicModifierType,
  type RelicEffect,
  type RelicData,
  type RelicModifiers
} from '../../../../src/systems/relics/RelicTypes'

describe('RelicTypes', () => {
  describe('RelicRarity type', () => {
    it('should allow common rarity', () => {
      const rarity: RelicRarity = 'common'
      expect(rarity).toBe('common')
    })

    it('should allow rare rarity', () => {
      const rarity: RelicRarity = 'rare'
      expect(rarity).toBe('rare')
    })

    it('should allow legendary rarity', () => {
      const rarity: RelicRarity = 'legendary'
      expect(rarity).toBe('legendary')
    })
  })

  describe('RelicEffectType type', () => {
    it('should support battle_start trigger', () => {
      const trigger: RelicEffectType = 'battle_start'
      expect(trigger).toBe('battle_start')
    })

    it('should support battle_end trigger', () => {
      const trigger: RelicEffectType = 'battle_end'
      expect(trigger).toBe('battle_end')
    })

    it('should support on_word_complete trigger', () => {
      const trigger: RelicEffectType = 'on_word_complete'
      expect(trigger).toBe('on_word_complete')
    })

    it('should support on_error trigger', () => {
      const trigger: RelicEffectType = 'on_error'
      expect(trigger).toBe('on_error')
    })

    it('should support passive trigger', () => {
      const trigger: RelicEffectType = 'passive'
      expect(trigger).toBe('passive')
    })

    it('should support on_acquire trigger', () => {
      const trigger: RelicEffectType = 'on_acquire'
      expect(trigger).toBe('on_acquire')
    })
  })

  describe('RelicModifierType type', () => {
    it('should support time_bonus modifier', () => {
      const modifier: RelicModifierType = 'time_bonus'
      expect(modifier).toBe('time_bonus')
    })

    it('should support score_multiplier modifier', () => {
      const modifier: RelicModifierType = 'score_multiplier'
      expect(modifier).toBe('score_multiplier')
    })

    it('should support gold_multiplier modifier', () => {
      const modifier: RelicModifierType = 'gold_multiplier'
      expect(modifier).toBe('gold_multiplier')
    })

    it('should support combo_protection modifier', () => {
      const modifier: RelicModifierType = 'combo_protection'
      expect(modifier).toBe('combo_protection')
    })

    it('should support skill_effect_bonus modifier', () => {
      const modifier: RelicModifierType = 'skill_effect_bonus'
      expect(modifier).toBe('skill_effect_bonus')
    })

    it('should support price_discount modifier', () => {
      const modifier: RelicModifierType = 'price_discount'
      expect(modifier).toBe('price_discount')
    })
  })

  describe('RelicEffect interface', () => {
    it('should create effect without condition', () => {
      const effect: RelicEffect = {
        type: 'passive',
        modifier: 'score_multiplier',
        value: 0.5
      }
      expect(effect.type).toBe('passive')
      expect(effect.modifier).toBe('score_multiplier')
      expect(effect.value).toBe(0.5)
      expect(effect.condition).toBeUndefined()
    })

    it('should create effect with combo_threshold condition', () => {
      const effect: RelicEffect = {
        type: 'passive',
        modifier: 'score_multiplier',
        value: 0.3,
        condition: {
          type: 'combo_threshold',
          threshold: 20
        }
      }
      expect(effect.condition?.type).toBe('combo_threshold')
      expect(effect.condition?.threshold).toBe(20)
    })

    it('should create effect with score_threshold condition', () => {
      const effect: RelicEffect = {
        type: 'battle_end',
        modifier: 'gold_multiplier',
        value: 1.5,
        condition: {
          type: 'score_threshold',
          threshold: 1000
        }
      }
      expect(effect.condition?.type).toBe('score_threshold')
      expect(effect.condition?.threshold).toBe(1000)
    })
  })

  describe('RelicData interface', () => {
    it('should create complete relic data', () => {
      const relic: RelicData = {
        id: 'test_relic',
        name: '测试遗物',
        icon: '🔮',
        description: '这是一个测试遗物',
        rarity: 'rare',
        basePrice: 50,
        effects: [
          { type: 'passive', modifier: 'score_multiplier', value: 0.2 }
        ]
      }

      expect(relic.id).toBe('test_relic')
      expect(relic.name).toBe('测试遗物')
      expect(relic.icon).toBe('🔮')
      expect(relic.description).toBe('这是一个测试遗物')
      expect(relic.rarity).toBe('rare')
      expect(relic.basePrice).toBe(50)
      expect(relic.effects).toHaveLength(1)
    })

    it('should create relic data with flavor text', () => {
      const relic: RelicData = {
        id: 'flavored_relic',
        name: '风味遗物',
        icon: '✨',
        description: '效果描述',
        rarity: 'legendary',
        basePrice: 100,
        effects: [],
        flavor: '传说中的遗物，承载着古老的力量。'
      }

      expect(relic.flavor).toBe('传说中的遗物，承载着古老的力量。')
    })

    it('should create relic with multiple effects', () => {
      const relic: RelicData = {
        id: 'multi_effect_relic',
        name: '多效果遗物',
        icon: '🎯',
        description: '具有多个效果',
        rarity: 'legendary',
        basePrice: 120,
        effects: [
          { type: 'passive', modifier: 'score_multiplier', value: 0.25 },
          { type: 'battle_start', modifier: 'time_bonus', value: 5 }
        ]
      }

      expect(relic.effects).toHaveLength(2)
      expect(relic.effects[0].modifier).toBe('score_multiplier')
      expect(relic.effects[1].modifier).toBe('time_bonus')
    })
  })

  describe('createDefaultModifiers', () => {
    it('should create modifiers with neutral values', () => {
      const modifiers = createDefaultModifiers()

      expect(modifiers.timeBonus).toBe(0)
      expect(modifiers.scoreMultiplier).toBe(1)
      expect(modifiers.goldMultiplier).toBe(1)
      expect(modifiers.comboProtectionChance).toBe(0)
      expect(modifiers.skillEffectBonus).toBe(0)
      expect(modifiers.priceDiscount).toBe(0)
      expect(modifiers.wordScoreBonus).toBe(0)
      expect(modifiers.multiplierPerCombo).toBe(0)
      expect(modifiers.goldFlat).toBe(0)
    })

    it('should return a new object each time', () => {
      const modifiers1 = createDefaultModifiers()
      const modifiers2 = createDefaultModifiers()

      expect(modifiers1).not.toBe(modifiers2)
      expect(modifiers1).toEqual(modifiers2)
    })

    it('should be mutable', () => {
      const modifiers = createDefaultModifiers()
      modifiers.timeBonus = 5
      modifiers.scoreMultiplier = 1.5

      expect(modifiers.timeBonus).toBe(5)
      expect(modifiers.scoreMultiplier).toBe(1.5)
    })
  })

  describe('RelicModifiers interface', () => {
    it('should have all required fields', () => {
      const modifiers: RelicModifiers = {
        timeBonus: 10,
        scoreMultiplier: 2,
        goldMultiplier: 1.5,
        comboProtectionChance: 0.3,
        skillEffectBonus: 0.25,
        priceDiscount: 0.1,
        wordScoreBonus: 5,
        multiplierPerCombo: 0.01,
        goldFlat: 10
      }

      expect(modifiers.timeBonus).toBe(10)
      expect(modifiers.scoreMultiplier).toBe(2)
      expect(modifiers.goldMultiplier).toBe(1.5)
      expect(modifiers.comboProtectionChance).toBe(0.3)
      expect(modifiers.skillEffectBonus).toBe(0.25)
      expect(modifiers.priceDiscount).toBe(0.1)
      expect(modifiers.wordScoreBonus).toBe(5)
      expect(modifiers.multiplierPerCombo).toBe(0.01)
      expect(modifiers.goldFlat).toBe(10)
    })
  })
})
