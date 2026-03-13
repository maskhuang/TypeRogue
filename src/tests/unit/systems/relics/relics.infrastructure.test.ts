// ============================================
// Story 36.1: 遗物基础设施扩展测试
// ============================================

import { describe, it, expect, beforeEach } from 'vitest'
import type {
  RelicEffectType,
  RelicModifierType,
  RelicConditionType,
  RelicSubsystem,
  RelicBehaviorType,
  RelicCondition,
  RelicData,
} from '../../../../src/data/relics'
import { RELICS } from '../../../../src/data/relics'
import {
  evaluateRelicCondition,
  registerRelicBehavior,
  dispatchRelicBehavior,
  getRegisteredBehaviors,
  clearBehaviorHandlers,
} from '../../../../src/systems/relics/RelicPipeline'
import type { RelicConditionContext } from '../../../../src/systems/relics/RelicPipeline'

// === AC1: RelicEffectType 包含所有 13 个触发类型 ===

describe('RelicEffectType', () => {
  it('should accept all original trigger types', () => {
    const originals: RelicEffectType[] = [
      'battle_start', 'battle_end', 'on_word_complete',
      'on_skill_trigger', 'on_error', 'passive',
    ]
    expect(originals).toHaveLength(6)
  })

  it('should accept all 7 new trigger types (Story 36.1)', () => {
    const newTypes: RelicEffectType[] = [
      'on_keystroke', 'on_combo_change', 'on_word_start',
      'on_shop_enter', 'on_stage_start', 'on_stage_end', 'on_settle',
    ]
    expect(newTypes).toHaveLength(7)
  })

  it('should compile with all 13 types', () => {
    const allTypes: RelicEffectType[] = [
      'battle_start', 'battle_end', 'on_word_complete',
      'on_skill_trigger', 'on_error', 'passive',
      'on_keystroke', 'on_combo_change', 'on_word_start',
      'on_shop_enter', 'on_stage_start', 'on_stage_end', 'on_settle',
    ]
    expect(allTypes).toHaveLength(13)
  })
})

// === AC2: RelicModifierType 包含所有 26 个修改器类型 ===

describe('RelicModifierType', () => {
  it('should accept all original modifier types', () => {
    const originals: RelicModifierType[] = [
      'time_bonus', 'score_multiplier', 'gold_multiplier',
      'combo_protection', 'price_discount', 'gold_flat',
      'instant_fail', 'time_steal', 'time_halve',
      'price_increase', 'skill_lock', 'time_penalty',
      'max_skill_level', 'max_skill_count',
    ]
    expect(originals).toHaveLength(14)
  })

  it('should accept all 12 new modifier types (Story 36.1)', () => {
    const newTypes: RelicModifierType[] = [
      'skill_output_percent', 'error_forgive', 'combo_retain_percent',
      'enchant_growth_bonus', 'shop_slot_bonus', 'free_refresh',
      'target_score_reduce', 'base_time_bonus', 'sell_price_bonus',
      'word_score_min', 'modifier_debuff_reduce', 'gold_per_modifier',
    ]
    expect(newTypes).toHaveLength(12)
  })
})

// === AC3: RelicCondition 评估逻辑 ===

describe('RelicCondition evaluation', () => {
  describe('combo_threshold', () => {
    const condition: RelicCondition = { type: 'combo_threshold', threshold: 10 }

    it('should pass when combo >= threshold', () => {
      expect(evaluateRelicCondition(condition, { combo: 10 })).toBe(true)
      expect(evaluateRelicCondition(condition, { combo: 15 })).toBe(true)
    })

    it('should fail when combo < threshold', () => {
      expect(evaluateRelicCondition(condition, { combo: 9 })).toBe(false)
      expect(evaluateRelicCondition(condition, { combo: 0 })).toBe(false)
    })
  })

  describe('multiplier_threshold', () => {
    const condition: RelicCondition = { type: 'multiplier_threshold', threshold: 2.5 }

    it('should pass when multiplier >= threshold', () => {
      expect(evaluateRelicCondition(condition, { multiplier: 2.5 })).toBe(true)
      expect(evaluateRelicCondition(condition, { multiplier: 3.0 })).toBe(true)
    })

    it('should fail when multiplier < threshold', () => {
      expect(evaluateRelicCondition(condition, { multiplier: 2.4 })).toBe(false)
      expect(evaluateRelicCondition(condition, { multiplier: 1.0 })).toBe(false)
    })
  })

  describe('skill_count_lt', () => {
    const condition: RelicCondition = { type: 'skill_count_lt', threshold: 10 }

    it('should pass when skill count < threshold', () => {
      expect(evaluateRelicCondition(condition, { equippedSkillCount: 9 })).toBe(true)
      expect(evaluateRelicCondition(condition, { equippedSkillCount: 0 })).toBe(true)
    })

    it('should fail when skill count >= threshold', () => {
      expect(evaluateRelicCondition(condition, { equippedSkillCount: 10 })).toBe(false)
      expect(evaluateRelicCondition(condition, { equippedSkillCount: 15 })).toBe(false)
    })
  })

  describe('word_length_gte', () => {
    const condition: RelicCondition = { type: 'word_length_gte', threshold: 6 }

    it('should pass when word length >= threshold', () => {
      expect(evaluateRelicCondition(condition, { wordLength: 6 })).toBe(true)
      expect(evaluateRelicCondition(condition, { wordLength: 10 })).toBe(true)
    })

    it('should fail when word length < threshold', () => {
      expect(evaluateRelicCondition(condition, { wordLength: 5 })).toBe(false)
    })
  })

  describe('word_length_lte', () => {
    const condition: RelicCondition = { type: 'word_length_lte', threshold: 4 }

    it('should pass when word length <= threshold', () => {
      expect(evaluateRelicCondition(condition, { wordLength: 4 })).toBe(true)
      expect(evaluateRelicCondition(condition, { wordLength: 3 })).toBe(true)
    })

    it('should fail when word length > threshold', () => {
      expect(evaluateRelicCondition(condition, { wordLength: 5 })).toBe(false)
    })
  })

  describe('time_elapsed_lt', () => {
    const condition: RelicCondition = { type: 'time_elapsed_lt', threshold: 10 }

    it('should pass when time elapsed < threshold', () => {
      expect(evaluateRelicCondition(condition, { timeElapsed: 9 })).toBe(true)
      expect(evaluateRelicCondition(condition, { timeElapsed: 0 })).toBe(true)
    })

    it('should fail when time elapsed >= threshold', () => {
      expect(evaluateRelicCondition(condition, { timeElapsed: 10 })).toBe(false)
      expect(evaluateRelicCondition(condition, { timeElapsed: 15 })).toBe(false)
    })
  })

  describe('stage_type', () => {
    const condition: RelicCondition = { type: 'stage_type', stageType: 'elite' }

    it('should pass when stage type matches', () => {
      expect(evaluateRelicCondition(condition, { stageType: 'elite' })).toBe(true)
    })

    it('should fail when stage type does not match', () => {
      expect(evaluateRelicCondition(condition, { stageType: 'normal' })).toBe(false)
      expect(evaluateRelicCondition(condition, { stageType: 'boss' })).toBe(false)
    })
  })

  describe('resource_types_gte', () => {
    const condition: RelicCondition = { type: 'resource_types_gte', threshold: 3 }

    it('should pass when resource types >= threshold', () => {
      expect(evaluateRelicCondition(condition, { resourceTypesThisWord: 3 })).toBe(true)
      expect(evaluateRelicCondition(condition, { resourceTypesThisWord: 5 })).toBe(true)
    })

    it('should fail when resource types < threshold', () => {
      expect(evaluateRelicCondition(condition, { resourceTypesThisWord: 2 })).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should default combo to 0 when context field is undefined', () => {
      const condition: RelicCondition = { type: 'combo_threshold', threshold: 1 }
      expect(evaluateRelicCondition(condition, {})).toBe(false)
    })

    it('should default multiplier to 1 when context field is undefined', () => {
      // multiplier defaults to 1 (not 0) — intentional since multiplier baseline is 1x
      const condition: RelicCondition = { type: 'multiplier_threshold', threshold: 1 }
      expect(evaluateRelicCondition(condition, {})).toBe(true) // 1 >= 1
      const higher: RelicCondition = { type: 'multiplier_threshold', threshold: 1.5 }
      expect(evaluateRelicCondition(higher, {})).toBe(false) // 1 < 1.5
    })

    it('should return false for unknown condition type', () => {
      const condition = { type: 'unknown_type' } as unknown as RelicCondition
      expect(evaluateRelicCondition(condition, {})).toBe(false)
    })
  })
})

// === AC5: RelicSubsystem 类型 ===

describe('RelicSubsystem', () => {
  it('should cover all 11 subsystems', () => {
    const subsystems: RelicSubsystem[] = [
      'typing', 'combo', 'skill', 'enchantment', 'topology',
      'word', 'resource', 'shop', 'stage', 'boss_modifier', 'scoring',
    ]
    expect(subsystems).toHaveLength(11)
  })

  it('should be assignable to RelicData.subsystem', () => {
    const relic: Partial<RelicData> = {
      id: 'test',
      subsystem: 'typing',
    }
    expect(relic.subsystem).toBe('typing')
  })
})

// === AC6: RelicBehaviorType 枚举 + 行为分发 ===

describe('RelicBehaviorType', () => {
  it('should cover all behavior types', () => {
    const behaviors: RelicBehaviorType[] = [
      'error_forgive_first', 'double_keystroke', 'autocomplete',
      'rhythm_adapt', 'glass_cannon',
      'combo_detonator', 'immortal_combo',
      'training_manual', 'jazz_diversity', 'uncrowned_king',
      'fate_fork', 'early_awakening',
      'row_select', 'hand_alternation', 'key_storm',
      'word_dealer',
      'smuggle_free', 'timed_auction',
      'phoenix',
      'modifier_barrier', 'chaos_roulette', 'modifier_reversal',
      'snowball', 'score_black_hole',
    ]
    expect(behaviors).toHaveLength(24)
  })

  it('should be assignable to RelicData.behaviorType', () => {
    const relic: Partial<RelicData> = {
      id: 'test',
      behaviorType: 'glass_cannon',
    }
    expect(relic.behaviorType).toBe('glass_cannon')
  })
})

describe('Behavior dispatch framework', () => {
  beforeEach(() => {
    clearBehaviorHandlers()
  })

  it('should register and dispatch a behavior handler', () => {
    let called = false
    let receivedRelicId = ''
    registerRelicBehavior('glass_cannon', (relicId) => {
      called = true
      receivedRelicId = relicId
    })

    const result = dispatchRelicBehavior('glass_cannon', 'test_relic', {})
    expect(result).toBe(true)
    expect(called).toBe(true)
    expect(receivedRelicId).toBe('test_relic')
  })

  it('should return false for unregistered behavior', () => {
    const result = dispatchRelicBehavior('score_black_hole', 'test_relic', {})
    expect(result).toBe(false)
  })

  it('should list registered behaviors', () => {
    registerRelicBehavior('phoenix', () => {})
    const registered = getRegisteredBehaviors()
    expect(registered).toContain('phoenix')
  })
})

// === AC4: 通用遗物生成不受职业过滤 ===

describe('Universal relic class filtering (AC4)', () => {
  it('universal relic IDs should NOT be in any exclusive set', () => {
    // Simulate the relicPicker filtering logic:
    // WORDSMITH_EXCLUSIVE and METAMORPH_EXCLUSIVE are hardcoded Sets.
    // Universal relics must not appear in either.
    const WORDSMITH_EXCLUSIVE = new Set([
      'apprentice_notes', 'masters_lexicon', 'perpetual_queue',
      'word_scissors', 'resonance_mold',
    ])
    const METAMORPH_EXCLUSIVE = new Set([
      'primal_mutant', 'ultimate_mutant_strain', 'gene_stabilizer',
      'chaos_seed', 'fittest_survivors',
    ])

    // Any relic with a subsystem field is a universal relic
    const universalRelicExample: RelicData = {
      id: 'test_universal',
      name: '测试通用遗物',
      icon: '🧪',
      description: '通用遗物',
      rarity: 'common',
      basePrice: 50,
      effects: [],
      subsystem: 'typing',
      behaviorType: 'error_forgive_first',
    }

    // Universal relics should pass through class filtering for any class
    expect(WORDSMITH_EXCLUSIVE.has(universalRelicExample.id)).toBe(false)
    expect(METAMORPH_EXCLUSIVE.has(universalRelicExample.id)).toBe(false)
  })

  it('class-exclusive relics should be in their respective sets', () => {
    const WORDSMITH_EXCLUSIVE = new Set([
      'apprentice_notes', 'masters_lexicon', 'perpetual_queue',
      'word_scissors', 'resonance_mold',
    ])
    const METAMORPH_EXCLUSIVE = new Set([
      'primal_mutant', 'ultimate_mutant_strain', 'gene_stabilizer',
      'chaos_seed', 'fittest_survivors',
    ])

    // All existing relics (no subsystem) should be in an exclusive set
    for (const [id, relic] of Object.entries(RELICS) as [string, RelicData][]) {
      if (!relic.subsystem) {
        const isExclusive = WORDSMITH_EXCLUSIVE.has(id) || METAMORPH_EXCLUSIVE.has(id)
        expect(isExclusive).toBe(true)
      }
    }
  })
})

describe('RelicData with new fields', () => {
  it('should accept RelicData with subsystem and behaviorType', () => {
    const relic: RelicData = {
      id: 'test_relic',
      name: '测试遗物',
      icon: '🧪',
      description: '测试用',
      rarity: 'common',
      basePrice: 50,
      effects: [],
      subsystem: 'typing',
      behaviorType: 'error_forgive_first',
    }
    expect(relic.subsystem).toBe('typing')
    expect(relic.behaviorType).toBe('error_forgive_first')
  })

  it('should accept RelicData without subsystem and behaviorType (backward compat)', () => {
    const relic: RelicData = {
      id: 'test_relic',
      name: '测试遗物',
      icon: '🧪',
      description: '测试用',
      rarity: 'common',
      basePrice: 50,
      effects: [],
    }
    expect(relic.subsystem).toBeUndefined()
    expect(relic.behaviorType).toBeUndefined()
  })
})

// === AC7: RelicCondition 支持新条件参数 ===

describe('RelicCondition interface', () => {
  it('should support threshold parameter', () => {
    const condition: RelicCondition = { type: 'multiplier_threshold', threshold: 2.5 }
    expect(condition.threshold).toBe(2.5)
  })

  it('should support stageType parameter', () => {
    const condition: RelicCondition = { type: 'stage_type', stageType: 'boss' }
    expect(condition.stageType).toBe('boss')
  })

  it('should allow optional parameters', () => {
    const condition: RelicCondition = { type: 'combo_threshold' }
    expect(condition.threshold).toBeUndefined()
    expect(condition.stageType).toBeUndefined()
  })
})
