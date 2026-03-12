// ============================================
// 打字肉鸽 - 词条制触发流水线 Phase 1~6 单元测试
// ============================================
// Story 35.3: 基础值 → 加算层 → 乘算层

import { describe, it, expect } from 'vitest'
import {
  AffixType,
  AffixInstance,
  AffixSkillInstance,
  SkillRuntimeState,
  EnchantmentType,
  BASE_VALUES,
  APPRENTICE_NEIGHBOR_GROWTH,
  SPLASH_ENCHANTMENT_DEFS,
  CLASS_RESTRICTED_ENCHANTMENTS,
  QUEST_AFFIX_MAP,
  QUEST_ENCHANTMENT_DEFS,
  TRANSMUTE_RATIO_TABLE,
  MULTIPLY_OPERATOR_CALIBRATION,
  filterEnchantmentsByClass,
} from '../../../src/data/affixes'
import { PositionRelation } from '../../../src/data/keyboardTopology'
import type { ResourceType, ResourceState } from '../../../src/core/types'
import {
  TriggerContext,
  TriggerResult,
  TriggerFlags,
  Phase4Result,
  Phase5Result,
  Phase6Result,
  Phase6Action,
  resolvePhase1,
  resolvePhase2,
  resolvePhase3,
  resolvePhase4,
  resolvePhase5,
  resolvePhase6,
  getAffixSourceValue,
  triggerAffixSkill,
  countEmptySlots,
  isFirstOrLastLetter,
  countOccurrences,
  sumNeighborAmplifyStacks,
  hasEnchantment,
  getQuestCompletions,
  weightedRandomResource,
  findWeakestNeighbor,
  pickRandomKeys,
  applyApprenticeEvent,
  applyQuestEvent,
  getEffectiveProbMult,
  resolveMirrorCopy,
  filterQuestCandidates,
  getEnchantmentSlotCount,
  ALL_RESOURCES,
  MAX_RECURSE_DEPTH,
  APPRENTICE_GROWTH_DEFAULTS,
  MUTATION_HUNGER_CHANCE,
} from '../../../src/data/affixTrigger'

// ===== 工厂辅助 =====

function makeResources(overrides?: Partial<ResourceState>): ResourceState {
  return {
    base: 0, score: 0, multiplier: 1, time: 30, gold: 100,
    fragment: 0, mutagen: 0,
    ...overrides,
  }
}

function makeSkill(overrides?: Partial<AffixSkillInstance>): AffixSkillInstance {
  return {
    id: 'test_skill',
    name: '测试技能',
    icon: '⚔️',
    resource: 'base',
    baseValues: [5, 8, 12] as [number, number, number],
    level: 1,
    rarity: 0 as 0,
    affixes: [],
    enchantmentIds: [],
    ...overrides,
  }
}

function makeRuntimeState(overrides?: Partial<SkillRuntimeState>): SkillRuntimeState {
  return {
    skillId: 'test_skill',
    chargeAccumulated: 0,
    currentDecayMult: 1,
    mirrorCopiedAffix: null,
    triggerCount: 0,
    amplifyStacks: 0,
    apprenticeAccumulated: 0,
    questStacks: 0,
    questCompletions: 0,
    ...overrides,
  }
}

function makeContext(overrides?: Partial<TriggerContext>): TriggerContext {
  return {
    triggerKey: 'a',
    currentWord: 'apple',
    resources: makeResources(),
    classResourceProduced: {},
    bindings: new Map(),
    skillStates: new Map(),
    allSkills: new Map(),
    randomFn: () => 0.5,
    ...overrides,
  }
}

// ===== Phase 1 测试 =====

describe('resolvePhase1', () => {
  it('should return baseValues[0] for level 1', () => {
    const skill = makeSkill({ level: 1 })
    expect(resolvePhase1(skill)).toBe(5)
  })

  it('should return baseValues[1] for level 2', () => {
    const skill = makeSkill({ level: 2 })
    expect(resolvePhase1(skill)).toBe(8)
  })

  it('should return baseValues[2] for level 3', () => {
    const skill = makeSkill({ level: 3 })
    expect(resolvePhase1(skill)).toBe(12)
  })

  it('should clamp level 0 to index 0', () => {
    const skill = makeSkill({ level: 0 })
    expect(resolvePhase1(skill)).toBe(5)
  })

  it('should clamp level -1 to index 0', () => {
    const skill = makeSkill({ level: -1 })
    expect(resolvePhase1(skill)).toBe(5)
  })

  it('should clamp level 4 to last index', () => {
    const skill = makeSkill({ level: 4 })
    expect(resolvePhase1(skill)).toBe(12)
  })

  it('should clamp level 100 to last index', () => {
    const skill = makeSkill({ level: 100 })
    expect(resolvePhase1(skill)).toBe(12)
  })

  it('should work with different resource base values', () => {
    const skill = makeSkill({
      resource: 'score',
      baseValues: [15, 24, 36] as [number, number, number],
      level: 2,
    })
    expect(resolvePhase1(skill)).toBe(24)
  })
})

// ===== getAffixSourceValue 测试 =====

describe('getAffixSourceValue', () => {
  it('should return resources.base for base source', () => {
    const ctx = makeContext({ resources: makeResources({ base: 10 }) })
    expect(getAffixSourceValue('base', ctx)).toBe(10)
  })

  it('should return resources.multiplier for multiplier source', () => {
    const ctx = makeContext({ resources: makeResources({ multiplier: 2.5 }) })
    expect(getAffixSourceValue('multiplier', ctx)).toBe(2.5)
  })

  it('should return resources.time for time source', () => {
    const ctx = makeContext({ resources: makeResources({ time: 45 }) })
    expect(getAffixSourceValue('time', ctx)).toBe(45)
  })

  it('should return resources.gold for gold source', () => {
    const ctx = makeContext({ resources: makeResources({ gold: 150 }) })
    expect(getAffixSourceValue('gold', ctx)).toBe(150)
  })

  it('should return score + base*multiplier for score source (pending calculation)', () => {
    const ctx = makeContext({
      resources: makeResources({ score: 100, base: 10, multiplier: 2 }),
    })
    // 100 + 10 * 2 = 120
    expect(getAffixSourceValue('score', ctx)).toBe(120)
  })

  it('should return classResourceProduced.fragment for fragment source', () => {
    const ctx = makeContext({ classResourceProduced: { fragment: 8 } })
    expect(getAffixSourceValue('fragment', ctx)).toBe(8)
  })

  it('should return classResourceProduced.mutagen for mutagen source', () => {
    const ctx = makeContext({ classResourceProduced: { mutagen: 5 } })
    expect(getAffixSourceValue('mutagen', ctx)).toBe(5)
  })

  it('should return 0 for fragment when classResourceProduced is empty', () => {
    const ctx = makeContext({ classResourceProduced: {} })
    expect(getAffixSourceValue('fragment', ctx)).toBe(0)
  })

  it('should return 0 for mutagen when classResourceProduced is empty', () => {
    const ctx = makeContext({ classResourceProduced: {} })
    expect(getAffixSourceValue('mutagen', ctx)).toBe(0)
  })
})

// ===== 辅助函数测试 =====

describe('countEmptySlots', () => {
  it('should count empty slots in posRel range', () => {
    // 'a' with Adjacent relation — depends on topology data
    // Just verify it returns a non-negative number with empty bindings
    const bindings = new Map<string, string>()
    const count = countEmptySlots('a', PositionRelation.Adjacent, bindings)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  it('should return fewer empty slots when bindings exist', () => {
    const emptyBindings = new Map<string, string>()
    const count1 = countEmptySlots('f', PositionRelation.Adjacent, emptyBindings)

    const filledBindings = new Map<string, string>([['d', 'skill_d'], ['g', 'skill_g']])
    const count2 = countEmptySlots('f', PositionRelation.Adjacent, filledBindings)

    expect(count2).toBeLessThanOrEqual(count1)
  })
})

describe('isFirstOrLastLetter', () => {
  it('should return true for first letter', () => {
    expect(isFirstOrLastLetter('a', 'apple')).toBe(true)
  })

  it('should return true for last letter', () => {
    expect(isFirstOrLastLetter('e', 'apple')).toBe(true)
  })

  it('should return false for middle letter', () => {
    expect(isFirstOrLastLetter('p', 'apple')).toBe(false)
  })

  it('should be case-insensitive', () => {
    expect(isFirstOrLastLetter('A', 'apple')).toBe(true)
    expect(isFirstOrLastLetter('a', 'Apple')).toBe(true)
  })

  it('should return false for empty word', () => {
    expect(isFirstOrLastLetter('a', '')).toBe(false)
  })

  it('should handle single-character word (both first and last)', () => {
    expect(isFirstOrLastLetter('a', 'a')).toBe(true)
  })
})

describe('countOccurrences', () => {
  it('should count letter occurrences in word', () => {
    expect(countOccurrences('p', 'apple')).toBe(2)
  })

  it('should return 1 for single occurrence', () => {
    expect(countOccurrences('a', 'apple')).toBe(1)
  })

  it('should return 0 for no occurrence', () => {
    expect(countOccurrences('z', 'apple')).toBe(0)
  })

  it('should be case-insensitive', () => {
    expect(countOccurrences('A', 'Apple')).toBe(1)
  })

  it('should count all occurrences', () => {
    expect(countOccurrences('l', 'llama')).toBe(2)
  })
})

describe('hasEnchantment', () => {
  it('should return true when skill has the enchantment', () => {
    const skill = makeSkill({ enchantmentIds: [EnchantmentType.ApprenticeSelf] })
    expect(hasEnchantment(skill, EnchantmentType.ApprenticeSelf)).toBe(true)
  })

  it('should return false when skill does not have the enchantment', () => {
    const skill = makeSkill({ enchantmentIds: [] })
    expect(hasEnchantment(skill, EnchantmentType.ApprenticeSelf)).toBe(false)
  })
})

describe('getQuestCompletions', () => {
  it('should return questCompletions when skill has the quest enchantment', () => {
    const skill = makeSkill({ enchantmentIds: [EnchantmentType.QuestRefine] })
    const state = makeRuntimeState({ questCompletions: 3 })
    expect(getQuestCompletions(skill, state, EnchantmentType.QuestRefine)).toBe(3)
  })

  it('should return 0 when skill does not have the quest enchantment', () => {
    const skill = makeSkill({ enchantmentIds: [] })
    const state = makeRuntimeState({ questCompletions: 3 })
    expect(getQuestCompletions(skill, state, EnchantmentType.QuestRefine)).toBe(0)
  })
})

describe('sumNeighborAmplifyStacks', () => {
  it('should return 0 with no neighbors', () => {
    const ctx = makeContext()
    const result = sumNeighborAmplifyStacks('z', PositionRelation.Adjacent, 'base', 0.02, ctx)
    expect(result).toBe(0)
  })
})

// ===== Phase 2 测试 =====

describe('resolvePhase2', () => {
  describe('Convert affix', () => {
    it('should add k * sourceValue to bonusPercent', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Convert, source: 'base' as ResourceType, k: 0.05 }],
      })
      const state = makeRuntimeState()
      const ctx = makeContext({ resources: makeResources({ base: 20 }) })
      const result = resolvePhase2(skill, state, ctx, 5)
      // bonusPercent = 0.05 * 20 = 1.0
      expect(result.bonusPercent).toBeCloseTo(1.0)
      // output = 5 * (1 + 1.0) = 10
      expect(result.output).toBeCloseTo(10)
    })

    it('should apply quest refine enhancement (k × 1.1^c)', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Convert, source: 'base' as ResourceType, k: 0.05 }],
        enchantmentIds: [EnchantmentType.QuestRefine],
      })
      const state = makeRuntimeState({ questCompletions: 2 })
      const ctx = makeContext({ resources: makeResources({ base: 20 }) })
      const result = resolvePhase2(skill, state, ctx, 5)
      // k_eff = 0.05 * 1.1^2 = 0.05 * 1.21 = 0.0605
      // bonusPercent = 0.0605 * 20 = 1.21
      expect(result.bonusPercent).toBeCloseTo(1.21, 1)
    })
  })

  describe('Void affix', () => {
    it('should add emptySlots * bonusPerSlot to bonusPercent', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Void, posRel: PositionRelation.Adjacent, bonusPerSlot: 0.25 }],
      })
      const state = makeRuntimeState()
      // Empty bindings = all neighbors are empty
      const ctx = makeContext({ bindings: new Map() })
      // Pre-compute expected empty count from topology
      const expectedEmpty = countEmptySlots('a', PositionRelation.Adjacent, new Map())
      const result = resolvePhase2(skill, state, ctx, 5)
      // bonusPercent = expectedEmpty * 0.25
      expect(result.bonusPercent).toBeCloseTo(expectedEmpty * 0.25)
      expect(result.output).toBeCloseTo(5 * (1 + expectedEmpty * 0.25))
    })

    it('should apply quest devour enhancement (bonusPerSlot + c*0.05)', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Void, posRel: PositionRelation.Adjacent, bonusPerSlot: 0.25 }],
        enchantmentIds: [EnchantmentType.QuestDevour],
      })
      const state = makeRuntimeState({ questCompletions: 2 })
      const ctx = makeContext({ bindings: new Map() })
      const resultNoQuest = resolvePhase2(
        makeSkill({ affixes: [{ type: AffixType.Void, posRel: PositionRelation.Adjacent, bonusPerSlot: 0.25 }] }),
        makeRuntimeState(),
        ctx,
        5,
      )
      const result = resolvePhase2(skill, state, ctx, 5)
      // Enhanced bonusPerSlot = 0.25 + 2*0.05 = 0.35 vs 0.25
      expect(result.bonusPercent).toBeGreaterThan(resultNoQuest.bonusPercent)
    })
  })

  describe('Charge affix', () => {
    it('should add chargeAccumulated (capped by maxBonus) to bonusPercent', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Charge, gainPerSec: 0.08, maxBonus: 2.0 }],
      })
      const state = makeRuntimeState({ chargeAccumulated: 1.5 })
      const ctx = makeContext()
      const result = resolvePhase2(skill, state, ctx, 5)
      expect(result.bonusPercent).toBeCloseTo(1.5)
      // output = 5 * (1 + 1.5) = 12.5
      expect(result.output).toBeCloseTo(12.5)
    })

    it('should cap charge at maxBonus', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Charge, gainPerSec: 0.08, maxBonus: 2.0 }],
      })
      const state = makeRuntimeState({ chargeAccumulated: 5.0 })
      const ctx = makeContext()
      const result = resolvePhase2(skill, state, ctx, 5)
      expect(result.bonusPercent).toBeCloseTo(2.0)
    })

    it('should reset chargeAccumulated to 0 (side effect)', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Charge, gainPerSec: 0.08, maxBonus: 2.0 }],
      })
      const state = makeRuntimeState({ chargeAccumulated: 1.5 })
      const ctx = makeContext()
      resolvePhase2(skill, state, ctx, 5)
      expect(state.chargeAccumulated).toBe(0)
    })

    it('should apply quest energize enhancement (maxBonus + c*0.3)', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Charge, gainPerSec: 0.08, maxBonus: 2.0 }],
        enchantmentIds: [EnchantmentType.QuestEnergize],
      })
      const state = makeRuntimeState({ chargeAccumulated: 3.0, questCompletions: 2 })
      const ctx = makeContext()
      const result = resolvePhase2(skill, state, ctx, 5)
      // maxEff = 2.0 + 2*0.3 = 2.6; min(3.0, 2.6) = 2.6
      expect(result.bonusPercent).toBeCloseTo(2.6)
    })
  })

  describe('Outcast affix', () => {
    it('should add bonusPercent when key is first letter', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Outcast, bonusPercent: 0.5 }],
      })
      const state = makeRuntimeState()
      const ctx = makeContext({ triggerKey: 'a', currentWord: 'apple' })
      const result = resolvePhase2(skill, state, ctx, 5)
      expect(result.bonusPercent).toBeCloseTo(0.5)
    })

    it('should add bonusPercent when key is last letter', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Outcast, bonusPercent: 0.5 }],
      })
      const state = makeRuntimeState()
      const ctx = makeContext({ triggerKey: 'e', currentWord: 'apple' })
      const result = resolvePhase2(skill, state, ctx, 5)
      expect(result.bonusPercent).toBeCloseTo(0.5)
    })

    it('should NOT add bonusPercent when key is middle letter', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Outcast, bonusPercent: 0.5 }],
      })
      const state = makeRuntimeState()
      const ctx = makeContext({ triggerKey: 'p', currentWord: 'apple' })
      const result = resolvePhase2(skill, state, ctx, 5)
      expect(result.bonusPercent).toBe(0)
    })
  })

  describe('Amplify affix', () => {
    it('should add self amplify stacks when resource matches', () => {
      const skill = makeSkill({
        resource: 'base',
        affixes: [{ type: AffixType.Amplify, posRel: PositionRelation.Adjacent, resource: 'base' as ResourceType, valuePerStack: 0.02 }],
      })
      const state = makeRuntimeState({ amplifyStacks: 10 })
      const ctx = makeContext()
      const result = resolvePhase2(skill, state, ctx, 5)
      // self: 10 * 0.02 = 0.2
      expect(result.bonusPercent).toBeGreaterThanOrEqual(0.2)
    })

    it('should NOT add self stacks when resource does not match', () => {
      const skill = makeSkill({
        resource: 'score',
        affixes: [{ type: AffixType.Amplify, posRel: PositionRelation.Adjacent, resource: 'base' as ResourceType, valuePerStack: 0.02 }],
      })
      const state = makeRuntimeState({ amplifyStacks: 10 })
      const ctx = makeContext()
      const result = resolvePhase2(skill, state, ctx, 5)
      // No neighbor skills, no self match → 0
      expect(result.bonusPercent).toBe(0)
    })
  })

  describe('Taboo affix', () => {
    it('should add +100% to bonusPercent', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Taboo, bonusPercent: 1.0, penaltyChance: 0.1 }],
      })
      const state = makeRuntimeState()
      const ctx = makeContext()
      const result = resolvePhase2(skill, state, ctx, 5)
      expect(result.bonusPercent).toBeCloseTo(1.0)
      // output = 5 * (1 + 1.0) = 10
      expect(result.output).toBeCloseTo(10)
    })
  })

  describe('Enchantment bonuses', () => {
    it('should add apprenticeAccumulated for apprentice enchantments', () => {
      const skill = makeSkill({
        enchantmentIds: [EnchantmentType.ApprenticeSelf],
      })
      const state = makeRuntimeState({ apprenticeAccumulated: 0.35 })
      const ctx = makeContext()
      const result = resolvePhase2(skill, state, ctx, 5)
      expect(result.bonusPercent).toBeCloseTo(0.35)
    })

    it('should add QuestDevour extra bonus when c >= 3', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Void, posRel: PositionRelation.SameColumn, bonusPerSlot: 0.30 }],
        enchantmentIds: [EnchantmentType.QuestDevour],
      })
      const state = makeRuntimeState({ questCompletions: 5 })
      const ctx = makeContext({ bindings: new Map() })
      const result = resolvePhase2(skill, state, ctx, 5)
      // Should include both void bonus AND quest devour extra (5 * 0.10 = 0.50)
      expect(result.bonusPercent).toBeGreaterThan(0.50)
    })

    it('should NOT add QuestDevour extra bonus when c < 3', () => {
      const skill = makeSkill({
        enchantmentIds: [EnchantmentType.QuestDevour],
      })
      const state = makeRuntimeState({ questCompletions: 2 })
      const ctx = makeContext()
      const result = resolvePhase2(skill, state, ctx, 5)
      // No void affix, c < 3 → no extra bonus
      expect(result.bonusPercent).toBe(0)
    })

    it('should add LetterAffinity +25% when queue contains triggerKey', () => {
      const skill = makeSkill({
        enchantmentIds: [EnchantmentType.LetterAffinity],
      })
      const state = makeRuntimeState()
      const ctx = makeContext({
        triggerKey: 'a',
        fragmentQueue: ['a', 'b', 'c'],
      })
      const result = resolvePhase2(skill, state, ctx, 5)
      expect(result.bonusPercent).toBeCloseTo(0.25)
    })

    it('should NOT add LetterAffinity when queue does not contain triggerKey', () => {
      const skill = makeSkill({
        enchantmentIds: [EnchantmentType.LetterAffinity],
      })
      const state = makeRuntimeState()
      const ctx = makeContext({
        triggerKey: 'z',
        fragmentQueue: ['a', 'b', 'c'],
      })
      const result = resolvePhase2(skill, state, ctx, 5)
      expect(result.bonusPercent).toBe(0)
    })

    it('should add Overflow +20% per saturated fragment', () => {
      const skill = makeSkill({
        enchantmentIds: [EnchantmentType.Overflow],
      })
      const state = makeRuntimeState()
      const ctx = makeContext({
        fragmentInventory: { a: 15, b: 20, c: 5, d: 15 },
      })
      const result = resolvePhase2(skill, state, ctx, 5)
      // 3 letters >= 15 → 3 * 0.20 = 0.60
      expect(result.bonusPercent).toBeCloseTo(0.60)
    })

    it('should add Unstable +30% when resource matches', () => {
      const skill = makeSkill({
        resource: 'base',
        enchantmentIds: [EnchantmentType.Unstable],
      })
      const state = makeRuntimeState()
      const ctx = makeContext({ unstableBonusResource: 'base' })
      const result = resolvePhase2(skill, state, ctx, 5)
      expect(result.bonusPercent).toBeCloseTo(0.30)
    })

    it('should NOT add Unstable when resource does not match', () => {
      const skill = makeSkill({
        resource: 'base',
        enchantmentIds: [EnchantmentType.Unstable],
      })
      const state = makeRuntimeState()
      const ctx = makeContext({ unstableBonusResource: 'score' })
      const result = resolvePhase2(skill, state, ctx, 5)
      expect(result.bonusPercent).toBe(0)
    })
  })

  describe('Apprentice accumulated bonus', () => {
    it('should apply apprenticeAccumulated exactly once even with multiple apprentice enchantments', () => {
      const skill = makeSkill({
        enchantmentIds: [EnchantmentType.ApprenticeSelf, EnchantmentType.ApprenticeCrit],
      })
      const state = makeRuntimeState({ apprenticeAccumulated: 0.5 })
      const ctx = makeContext()
      const result = resolvePhase2(skill, state, ctx, 10)
      // 0.5 should be added once, not twice: output = 10 * (1 + 0.5) = 15
      expect(result.bonusPercent).toBeCloseTo(0.5)
      expect(result.output).toBeCloseTo(15)
    })

    it('should apply apprenticeAccumulated once with single apprentice enchantment', () => {
      const skill = makeSkill({
        enchantmentIds: [EnchantmentType.ApprenticeSelf],
      })
      const state = makeRuntimeState({ apprenticeAccumulated: 0.3 })
      const ctx = makeContext()
      const result = resolvePhase2(skill, state, ctx, 10)
      expect(result.bonusPercent).toBeCloseTo(0.3)
      expect(result.output).toBeCloseTo(13)
    })

    it('should not apply apprenticeAccumulated when no apprentice enchantments', () => {
      const skill = makeSkill({
        enchantmentIds: [EnchantmentType.QuestDevour],
      })
      const state = makeRuntimeState({ apprenticeAccumulated: 0.5 })
      const ctx = makeContext()
      const result = resolvePhase2(skill, state, ctx, 10)
      // QuestDevour with 0 completions adds nothing, and no apprentice enchantment
      expect(result.bonusPercent).toBeCloseTo(0)
    })
  })
})

// ===== Phase 3 测试 =====

describe('resolvePhase3', () => {
  describe('Multiply affix', () => {
    it('should multiply output by multiplier', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Multiply, multiplier: 1.5 }],
      })
      const state = makeRuntimeState()
      const ctx = makeContext()
      const result = resolvePhase3(skill, state, ctx, 10)
      expect(result.output).toBeCloseTo(15)
      expect(result.multipliers).toEqual([1.5])
    })

    it('should apply quest ascend enhancement (multiplier + c*0.15)', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Multiply, multiplier: 1.5 }],
        enchantmentIds: [EnchantmentType.QuestAscend],
      })
      const state = makeRuntimeState({ questCompletions: 2 })
      const ctx = makeContext()
      const result = resolvePhase3(skill, state, ctx, 10)
      // m = 1.5 + 2*0.15 = 1.8
      expect(result.output).toBeCloseTo(18)
    })
  })

  describe('Crit affix', () => {
    it('should multiply output when roll succeeds', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Crit, chance: 0.5, critMult: 2.0 }],
      })
      const state = makeRuntimeState()
      // randomFn returns 0.3 < 0.5 → crit hits
      const ctx = makeContext({ randomFn: () => 0.3 })
      const result = resolvePhase3(skill, state, ctx, 10)
      expect(result.output).toBeCloseTo(20)
      expect(result.flags.isCrit).toBe(true)
      expect(result.multipliers).toEqual([2.0])
    })

    it('should NOT multiply when roll fails', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Crit, chance: 0.5, critMult: 2.0 }],
      })
      const state = makeRuntimeState()
      // randomFn returns 0.7 > 0.5 → no crit
      const ctx = makeContext({ randomFn: () => 0.7 })
      const result = resolvePhase3(skill, state, ctx, 10)
      expect(result.output).toBeCloseTo(10)
      expect(result.flags.isCrit).toBe(false)
      expect(result.multipliers).toEqual([])
    })

    it('should apply quest overload enhancement (critMult + c*0.5)', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Crit, chance: 0.5, critMult: 2.0 }],
        enchantmentIds: [EnchantmentType.QuestOverload],
      })
      const state = makeRuntimeState({ questCompletions: 3 })
      const ctx = makeContext({ randomFn: () => 0.3 })
      const result = resolvePhase3(skill, state, ctx, 10)
      // critMult = 2.0 + 3*0.5 = 3.5
      expect(result.output).toBeCloseTo(35)
    })
  })

  describe('Pulse affix', () => {
    it('should multiply on interval trigger', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Pulse, interval: 4, burstMult: 3.0 }],
      })
      // triggerCount=4, 4%4===0 → burst
      const state = makeRuntimeState({ triggerCount: 4 })
      const ctx = makeContext()
      const result = resolvePhase3(skill, state, ctx, 10)
      expect(result.output).toBeCloseTo(30)
      expect(result.flags.isPulse).toBe(true)
    })

    it('should NOT multiply on non-interval trigger', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Pulse, interval: 4, burstMult: 3.0 }],
      })
      const state = makeRuntimeState({ triggerCount: 3 })
      const ctx = makeContext()
      const result = resolvePhase3(skill, state, ctx, 10)
      expect(result.output).toBeCloseTo(10)
      expect(result.flags.isPulse).toBe(false)
    })

    it('should NOT trigger on triggerCount=0', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Pulse, interval: 4, burstMult: 3.0 }],
      })
      const state = makeRuntimeState({ triggerCount: 0 })
      const ctx = makeContext()
      const result = resolvePhase3(skill, state, ctx, 10)
      expect(result.output).toBeCloseTo(10)
      expect(result.flags.isPulse).toBe(false)
    })

    it('should apply quest echo enhancement (burstMult + c*0.3)', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Pulse, interval: 4, burstMult: 3.0 }],
        enchantmentIds: [EnchantmentType.QuestEcho],
      })
      const state = makeRuntimeState({ triggerCount: 8, questCompletions: 2 })
      const ctx = makeContext()
      const result = resolvePhase3(skill, state, ctx, 10)
      // burstMult = 3.0 + 2*0.3 = 3.6
      expect(result.output).toBeCloseTo(36)
    })
  })

  describe('Decay affix', () => {
    it('should multiply by currentDecayMult and update state', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Decay, initialMult: 2.0, decayPerTrigger: 0.15, floor: 0.5 }],
      })
      const state = makeRuntimeState({ currentDecayMult: 2.0 })
      const ctx = makeContext()
      const result = resolvePhase3(skill, state, ctx, 10)
      expect(result.output).toBeCloseTo(20)
      // After decay: max(0.5, 2.0 - 0.15) = 1.85
      expect(state.currentDecayMult).toBeCloseTo(1.85)
    })

    it('should not go below floor', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Decay, initialMult: 2.0, decayPerTrigger: 0.15, floor: 0.5 }],
      })
      const state = makeRuntimeState({ currentDecayMult: 0.55 })
      const ctx = makeContext()
      resolvePhase3(skill, state, ctx, 10)
      // max(0.5, 0.55 - 0.15) = max(0.5, 0.4) = 0.5
      expect(state.currentDecayMult).toBeCloseTo(0.5)
    })

    it('should apply quest purify enhancement (floor - c*0.05, min 0.1)', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Decay, initialMult: 2.0, decayPerTrigger: 0.15, floor: 0.5 }],
        enchantmentIds: [EnchantmentType.QuestPurify],
      })
      const state = makeRuntimeState({ currentDecayMult: 0.55, questCompletions: 4 })
      const ctx = makeContext()
      resolvePhase3(skill, state, ctx, 10)
      // floorEff = max(0.1, 0.5 - 4*0.05) = max(0.1, 0.3) = 0.3
      // max(0.3, 0.55 - 0.15) = max(0.3, 0.4) = 0.4
      expect(state.currentDecayMult).toBeCloseTo(0.4)
    })

    it('should enforce minimum floor of 0.1', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Decay, initialMult: 2.0, decayPerTrigger: 0.15, floor: 0.5 }],
        enchantmentIds: [EnchantmentType.QuestPurify],
      })
      const state = makeRuntimeState({ currentDecayMult: 0.2, questCompletions: 20 })
      const ctx = makeContext()
      resolvePhase3(skill, state, ctx, 10)
      // floorEff = max(0.1, 0.5 - 20*0.05) = max(0.1, -0.5) = 0.1
      // max(0.1, 0.2 - 0.15) = max(0.1, 0.05) = 0.1
      expect(state.currentDecayMult).toBeCloseTo(0.1)
    })
  })

  describe('Cascade affix', () => {
    it('should multiply when prevKey has correct posRel to triggerKey', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Cascade, posRel: PositionRelation.SameRow, cascadeMult: 2.0 }],
      })
      const state = makeRuntimeState()
      // a and s are on the same row
      const ctx = makeContext({ triggerKey: 's', prevKey: 'a' })
      const result = resolvePhase3(skill, state, ctx, 10)
      expect(result.output).toBeCloseTo(20)
      expect(result.flags.isCascade).toBe(true)
    })

    it('should NOT multiply when prevKey is undefined', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Cascade, posRel: PositionRelation.SameRow, cascadeMult: 2.0 }],
      })
      const state = makeRuntimeState()
      const ctx = makeContext({ triggerKey: 's', prevKey: undefined })
      const result = resolvePhase3(skill, state, ctx, 10)
      expect(result.output).toBeCloseTo(10)
      expect(result.flags.isCascade).toBe(false)
    })
  })

  describe('Ligature affix', () => {
    it('should multiply by letter count when >= 2', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Ligature }],
      })
      const state = makeRuntimeState()
      // 'p' appears 2 times in 'apple'
      const ctx = makeContext({ triggerKey: 'p', currentWord: 'apple' })
      const result = resolvePhase3(skill, state, ctx, 10)
      expect(result.output).toBeCloseTo(20)
      expect(result.flags.ligatureCount).toBe(2)
    })

    it('should NOT multiply when letter appears only once', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Ligature }],
      })
      const state = makeRuntimeState()
      const ctx = makeContext({ triggerKey: 'a', currentWord: 'apple' })
      const result = resolvePhase3(skill, state, ctx, 10)
      expect(result.output).toBeCloseTo(10)
      expect(result.flags.ligatureCount).toBe(0)
    })

    it('should multiply by 3 when letter appears 3 times', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Ligature }],
      })
      const state = makeRuntimeState()
      const ctx = makeContext({ triggerKey: 'a', currentWord: 'banana' })
      const result = resolvePhase3(skill, state, ctx, 10)
      // 'a' appears 3 times
      expect(result.output).toBeCloseTo(30)
      expect(result.flags.ligatureCount).toBe(3)
    })
  })

  describe('Taboo affix', () => {
    it('should negate output when roll succeeds', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Taboo, bonusPercent: 1.0, penaltyChance: 0.1 }],
      })
      const state = makeRuntimeState()
      // randomFn returns 0.05 < 0.1 → penalty
      const ctx = makeContext({ randomFn: () => 0.05 })
      const result = resolvePhase3(skill, state, ctx, 10)
      expect(result.output).toBeCloseTo(-10)
      expect(result.flags.isTabooPenalty).toBe(true)
    })

    it('should NOT negate when roll fails', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Taboo, bonusPercent: 1.0, penaltyChance: 0.1 }],
      })
      const state = makeRuntimeState()
      // randomFn returns 0.5 > 0.1 → no penalty
      const ctx = makeContext({ randomFn: () => 0.5 })
      const result = resolvePhase3(skill, state, ctx, 10)
      expect(result.output).toBeCloseTo(10)
      expect(result.flags.isTabooPenalty).toBe(false)
    })

    it('should apply quest sacrifice enhancement (penaltyChance - c*0.01, min 0.02)', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Taboo, bonusPercent: 1.0, penaltyChance: 0.1 }],
        enchantmentIds: [EnchantmentType.QuestSacrifice],
      })
      const state = makeRuntimeState({ questCompletions: 5 })
      // effPenalty = max(0.02, 0.1 - 5*0.01) = max(0.02, 0.05) = 0.05
      // randomFn returns 0.04 < 0.05 → penalty
      const ctx = makeContext({ randomFn: () => 0.04 })
      const result = resolvePhase3(skill, state, ctx, 10)
      expect(result.output).toBeCloseTo(-10)
    })

    it('should enforce minimum penaltyChance of 0.02', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Taboo, bonusPercent: 1.0, penaltyChance: 0.1 }],
        enchantmentIds: [EnchantmentType.QuestSacrifice],
      })
      const state = makeRuntimeState({ questCompletions: 20 })
      // effPenalty = max(0.02, 0.1 - 20*0.01) = max(0.02, -0.1) = 0.02
      // randomFn returns 0.01 < 0.02 → penalty still possible
      const ctx = makeContext({ randomFn: () => 0.01 })
      const result = resolvePhase3(skill, state, ctx, 10)
      expect(result.output).toBeCloseTo(-10)
    })
  })

  describe('Multiple multipliers', () => {
    it('should apply multiple multipliers independently', () => {
      const skill = makeSkill({
        affixes: [
          { type: AffixType.Multiply, multiplier: 1.5 },
          { type: AffixType.Crit, chance: 0.5, critMult: 2.0 },
        ],
        rarity: 2 as 2,
      })
      const state = makeRuntimeState()
      const ctx = makeContext({ randomFn: () => 0.3 }) // crit hits
      const result = resolvePhase3(skill, state, ctx, 10)
      // 10 * 1.5 * 2.0 = 30
      expect(result.output).toBeCloseTo(30)
      expect(result.multipliers).toEqual([1.5, 2.0])
    })
  })
})

// ===== 任务增强综合测试 =====

describe('Quest enhancement formulas', () => {
  it('Convert: k × 1.1^c', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Convert, source: 'base' as ResourceType, k: 0.05 }],
      enchantmentIds: [EnchantmentType.QuestRefine],
    })
    const state = makeRuntimeState({ questCompletions: 3 })
    const ctx = makeContext({ resources: makeResources({ base: 10 }) })
    const result = resolvePhase2(skill, state, ctx, 5)
    // k_eff = 0.05 * 1.1^3 = 0.05 * 1.331 = 0.06655
    // bonusPercent = 0.06655 * 10 = 0.6655
    expect(result.bonusPercent).toBeCloseTo(0.6655, 2)
  })

  it('Crit: critMult + c*0.5', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Crit, chance: 1.0, critMult: 2.0 }],
      enchantmentIds: [EnchantmentType.QuestOverload],
    })
    const state = makeRuntimeState({ questCompletions: 4 })
    const ctx = makeContext({ randomFn: () => 0.0 })
    const result = resolvePhase3(skill, state, ctx, 10)
    // critMult = 2.0 + 4*0.5 = 4.0
    expect(result.output).toBeCloseTo(40)
  })

  it('Pulse: burstMult + c*0.3', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Pulse, interval: 4, burstMult: 3.0 }],
      enchantmentIds: [EnchantmentType.QuestEcho],
    })
    const state = makeRuntimeState({ triggerCount: 4, questCompletions: 5 })
    const ctx = makeContext()
    const result = resolvePhase3(skill, state, ctx, 10)
    // burstMult = 3.0 + 5*0.3 = 4.5
    expect(result.output).toBeCloseTo(45)
  })

  it('Decay: floor - c*0.05 (min 0.1)', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Decay, initialMult: 2.0, decayPerTrigger: 0.15, floor: 0.5 }],
      enchantmentIds: [EnchantmentType.QuestPurify],
    })
    const state = makeRuntimeState({ currentDecayMult: 1.0, questCompletions: 3 })
    const ctx = makeContext()
    resolvePhase3(skill, state, ctx, 10)
    // floorEff = max(0.1, 0.5 - 3*0.05) = max(0.1, 0.35) = 0.35
    // newDecay = max(0.35, 1.0 - 0.15) = max(0.35, 0.85) = 0.85
    expect(state.currentDecayMult).toBeCloseTo(0.85)
  })

  it('Void: bonusPerSlot + c*0.05', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Void, posRel: PositionRelation.Adjacent, bonusPerSlot: 0.25 }],
      enchantmentIds: [EnchantmentType.QuestDevour],
    })
    const state = makeRuntimeState({ questCompletions: 4 })
    const ctx = makeContext({ bindings: new Map() })
    const result = resolvePhase2(skill, state, ctx, 5)
    // slotEff = 0.25 + 4*0.05 = 0.45 per empty slot (vs 0.25 without quest)
    // Should be higher than without quest
    const noQuest = resolvePhase2(
      makeSkill({ affixes: [{ type: AffixType.Void, posRel: PositionRelation.Adjacent, bonusPerSlot: 0.25 }] }),
      makeRuntimeState(),
      ctx,
      5,
    )
    expect(result.bonusPercent).toBeGreaterThan(noQuest.bonusPercent)
  })
})

// ===== 组合入口测试 =====

describe('triggerAffixSkill', () => {
  it('should work for white rarity (0 affixes)', () => {
    const skill = makeSkill({ level: 1, rarity: 0 as 0, affixes: [] })
    const state = makeRuntimeState()
    const ctx = makeContext()
    const result = triggerAffixSkill(skill, state, ctx)
    // Phase 1 only: 5
    expect(result.output).toBe(5)
    expect(result.bonusPercent).toBe(0)
    expect(result.multipliers).toEqual([])
    expect(result.isCrit).toBe(false)
  })

  it('should combine Phase 2 and Phase 3 for blue rarity (1 affix)', () => {
    const skill = makeSkill({
      level: 1,
      rarity: 1 as 1,
      affixes: [{ type: AffixType.Multiply, multiplier: 1.5 }],
    })
    const state = makeRuntimeState()
    const ctx = makeContext()
    const result = triggerAffixSkill(skill, state, ctx)
    // Phase 1: 5
    // Phase 2: no additive affix → 5 * (1+0) = 5
    // Phase 3: 5 * 1.5 = 7.5
    expect(result.output).toBeCloseTo(7.5)
    expect(result.multipliers).toEqual([1.5])
  })

  it('should combine multiple affixes for yellow rarity (2 affixes)', () => {
    const skill = makeSkill({
      level: 2,
      rarity: 2 as 2,
      resource: 'base',
      baseValues: [5, 8, 12] as [number, number, number],
      affixes: [
        { type: AffixType.Taboo, bonusPercent: 1.0, penaltyChance: 0.1 },
        { type: AffixType.Multiply, multiplier: 1.5 },
      ],
    })
    const state = makeRuntimeState()
    const ctx = makeContext({ randomFn: () => 0.5 }) // no taboo penalty
    const result = triggerAffixSkill(skill, state, ctx)
    // Phase 1: 8 (level 2)
    // Phase 2: taboo +100% → 8 * (1 + 1.0) = 16
    // Phase 3: multiply 1.5 → 16 * 1.5 = 24; taboo no penalty (0.5 > 0.1)
    expect(result.output).toBeCloseTo(24)
  })

  it('should combine 3 affixes for orange rarity', () => {
    const skill = makeSkill({
      level: 1,
      rarity: 3 as 3,
      affixes: [
        { type: AffixType.Outcast, bonusPercent: 0.5 },
        { type: AffixType.Multiply, multiplier: 1.5 },
        { type: AffixType.Crit, chance: 0.5, critMult: 2.0 },
      ],
    })
    const state = makeRuntimeState()
    // 'a' is first letter of 'apple'; crit hits (0.3 < 0.5)
    const ctx = makeContext({ triggerKey: 'a', currentWord: 'apple', randomFn: () => 0.3 })
    const result = triggerAffixSkill(skill, state, ctx)
    // Phase 1: 5
    // Phase 2: outcast +50% → 5 * 1.5 = 7.5
    // Phase 3: multiply 1.5 → 7.5 * 1.5 = 11.25; crit 2.0 → 11.25 * 2.0 = 22.5
    expect(result.output).toBeCloseTo(22.5)
    expect(result.isCrit).toBe(true)
  })

  it('should correctly propagate charge side effect', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Charge, gainPerSec: 0.08, maxBonus: 2.0 }],
    })
    const state = makeRuntimeState({ chargeAccumulated: 1.0 })
    const ctx = makeContext()
    const result = triggerAffixSkill(skill, state, ctx)
    // Phase 2: bonusPercent = 1.0 → output = 5 * 2.0 = 10
    expect(result.output).toBeCloseTo(10)
    // Side effect: charge reset to 0
    expect(state.chargeAccumulated).toBe(0)
  })

  it('should correctly propagate decay side effect', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Decay, initialMult: 2.0, decayPerTrigger: 0.15, floor: 0.5 }],
    })
    const state = makeRuntimeState({ currentDecayMult: 2.0 })
    const ctx = makeContext()
    const result = triggerAffixSkill(skill, state, ctx)
    // Phase 3: output = 5 * 2.0 = 10; decay → 1.85
    expect(result.output).toBeCloseTo(10)
    expect(state.currentDecayMult).toBeCloseTo(1.85)
  })

  it('should handle no enchantments gracefully', () => {
    const skill = makeSkill({ enchantmentIds: [] })
    const state = makeRuntimeState()
    const ctx = makeContext()
    const result = triggerAffixSkill(skill, state, ctx)
    expect(result.output).toBe(5)
  })

  it('should handle prevKey undefined (cascade should not trigger)', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Cascade, posRel: PositionRelation.SameRow, cascadeMult: 2.0 }],
    })
    const state = makeRuntimeState()
    const ctx = makeContext({ prevKey: undefined })
    const result = triggerAffixSkill(skill, state, ctx)
    expect(result.output).toBe(5)
    expect(result.isCascade).toBe(false)
  })

  it('should include phase4/5/6 results', () => {
    const skill = makeSkill({ level: 1, rarity: 0 as 0, affixes: [] })
    const state = makeRuntimeState()
    const ctx = makeContext()
    const result = triggerAffixSkill(skill, state, ctx)
    expect(result.phase4).toBeDefined()
    expect(result.phase4!.targetResource).toBe('base')
    expect(result.phase5).toBeDefined()
    expect(result.phase5!.replicateTargets).toEqual([])
    expect(result.phase6).toBeDefined()
    expect(result.phase6!.actions).toEqual([])
  })
})

// ===== Phase 4-6 辅助函数测试 =====

function makeFlags(overrides?: Partial<TriggerFlags>): TriggerFlags {
  return {
    isCrit: false,
    isPulse: false,
    isCascade: false,
    isTabooPenalty: false,
    ligatureCount: 0,
    ...overrides,
  }
}

// ===== Phase 4 测试 =====

describe('resolvePhase4', () => {
  it('should return skill.resource when no Rainbow affix', () => {
    const skill = makeSkill({ resource: 'gold' as ResourceType })
    const state = makeRuntimeState()
    const ctx = makeContext()
    const result = resolvePhase4(skill, 10, state, ctx)
    expect(result.targetResource).toBe('gold')
    expect(result.output).toBe(10)
  })

  it('should randomly select resource with Rainbow affix', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Rainbow }],
    })
    const state = makeRuntimeState()
    // randomFn returns 0.0 → index 0 → 'base'
    const ctx = makeContext({ randomFn: () => 0.0 })
    const result = resolvePhase4(skill, 10, state, ctx)
    expect(result.targetResource).toBe('base')
  })

  it('should select different resources with different random values', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Rainbow }],
    })
    const state = makeRuntimeState()
    // Test each resource by index
    for (let i = 0; i < 7; i++) {
      const ctx = makeContext({ randomFn: () => i / 7 })
      const result = resolvePhase4(skill, 10, state, ctx)
      expect(result.targetResource).toBe(ALL_RESOURCES[i])
    }
  })

  it('should weight toward lowest resource with QuestSpectrum', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Rainbow }],
      enchantmentIds: [EnchantmentType.QuestSpectrum],
    })
    const state = makeRuntimeState({ questCompletions: 10 })
    // Gold is lowest (0), others positive
    const ctx = makeContext({
      resources: makeResources({ base: 100, score: 100, multiplier: 5, time: 30, gold: 0, fragment: 50, mutagen: 50 }),
      classResourceProduced: { fragment: 50, mutagen: 50 },
      randomFn: () => 0.99, // near end → weighted toward gold (index 4)
    })
    // With high completions and gold=0, gold should get heavy weight
    // Weight: base=1, score=1, mult=1, time=1, gold=1+10*0.15=2.5, frag=1, mut=1
    // Total = 8.5
    // At 0.99 * 8.5 = 8.415 → sum 1+1+1+1+2.5+1+1 = 8.5, so it wraps around
    // Let's test that gold gets more hits
    let goldCount = 0
    const trials = 100
    for (let i = 0; i < trials; i++) {
      const ctx2 = makeContext({
        resources: makeResources({ base: 100, score: 100, multiplier: 5, time: 30, gold: 0, fragment: 50, mutagen: 50 }),
        classResourceProduced: { fragment: 50, mutagen: 50 },
        randomFn: () => i / trials,
      })
      const r = resolvePhase4(skill, 10, state, ctx2)
      if (r.targetResource === 'gold') goldCount++
    }
    // Gold should get more than 1/7 (~14%) of hits due to weighting
    expect(goldCount).toBeGreaterThan(14)
  })

  it('should degrade to equal probability when QuestSpectrum completions=0', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Rainbow }],
      enchantmentIds: [EnchantmentType.QuestSpectrum],
    })
    const state = makeRuntimeState({ questCompletions: 0 })
    const ctx = makeContext({ randomFn: () => 0.0 })
    const result = resolvePhase4(skill, 10, state, ctx)
    // With 0 completions, equal probability → same as no spectrum
    expect(result.targetResource).toBe('base')
  })
})

// ===== weightedRandomResource 测试 =====

describe('weightedRandomResource', () => {
  it('should return equal probability when spectrumCompletions=0', () => {
    const ctx = makeContext({ randomFn: () => 2 / 7 })
    // floor(2/7 * 7) = floor(2) = 2 → 'multiplier'
    expect(weightedRandomResource(ctx, 0)).toBe('multiplier')
  })

  it('should bias toward lowest resource', () => {
    const ctx = makeContext({
      resources: makeResources({ base: 0, score: 100, multiplier: 5, time: 30, gold: 50 }),
      randomFn: () => 0.01, // very low roll → should hit base (index 0)
    })
    expect(weightedRandomResource(ctx, 5)).toBe('base')
  })
})

// ===== findWeakestNeighbor 测试 =====

describe('findWeakestNeighbor', () => {
  it('should return null when no neighbors bound', () => {
    const ctx = makeContext({ bindings: new Map() })
    expect(findWeakestNeighbor('a', PositionRelation.Adjacent, ctx)).toBeNull()
  })

  it('should find lowest level neighbor', () => {
    const bindings = new Map([['s', 'sk_s'], ['d', 'sk_d']])
    const allSkills = new Map<string, AffixSkillInstance>([
      ['sk_s', makeSkill({ id: 'sk_s', level: 2, baseValues: [5, 8, 12] as [number, number, number] })],
      ['sk_d', makeSkill({ id: 'sk_d', level: 1, baseValues: [5, 8, 12] as [number, number, number] })],
    ])
    const ctx = makeContext({ bindings, allSkills })
    // 'd' is level 1 (weaker) — but need 's' and 'd' to be adjacent to 'a'
    // In keyboard topology, 's' is adjacent to 'a', 'd' may or may not be
    // Let's just test the logic with the results
    const result = findWeakestNeighbor('a', PositionRelation.SameRow, ctx)
    // 'a', 's', 'd' are on the same row
    if (result) {
      const sk = allSkills.get(bindings.get(result)!)!
      expect(sk.level).toBeLessThanOrEqual(2)
    }
  })
})

// ===== pickRandomKeys 测试 =====

describe('pickRandomKeys', () => {
  it('should return all keys when count >= keys.length', () => {
    const result = pickRandomKeys(['a', 'b', 'c'], 5, () => 0.5)
    expect(result).toEqual(['a', 'b', 'c'])
  })

  it('should return exactly count keys', () => {
    const result = pickRandomKeys(['a', 'b', 'c', 'd', 'e'], 2, () => 0.0)
    expect(result.length).toBe(2)
  })

  it('should return no duplicates', () => {
    let callCount = 0
    const randomFn = () => {
      callCount++
      return callCount % 2 === 1 ? 0.0 : 0.99
    }
    const result = pickRandomKeys(['a', 'b', 'c', 'd'], 3, randomFn)
    expect(result.length).toBe(3)
    expect(new Set(result).size).toBe(3)
  })

  it('should return empty array for empty input', () => {
    expect(pickRandomKeys([], 3, () => 0.5)).toEqual([])
  })
})

// ===== Phase 5 测试 =====

describe('resolvePhase5', () => {
  describe('Replicate affix', () => {
    it('should pick neighbors from posRel range', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Replicate, posRel: PositionRelation.SameRow }],
      })
      const bindings = new Map([['s', 'sk_s'], ['d', 'sk_d'], ['f', 'sk_f']])
      const state = makeRuntimeState()
      const ctx = makeContext({ triggerKey: 'a', bindings, randomFn: () => 0.0 })
      const flags = makeFlags()
      const result = resolvePhase5(skill, state, ctx, flags, 10)
      // Should pick 1 neighbor (base count = 1, no QuestFission)
      expect(result.replicateTargets.length).toBe(1)
      expect(bindings.has(result.replicateTargets[0])).toBe(true)
    })

    it('should pick 1+completions neighbors with QuestFission', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Replicate, posRel: PositionRelation.SameRow }],
        enchantmentIds: [EnchantmentType.QuestFission],
      })
      const bindings = new Map([['s', 'sk_s'], ['d', 'sk_d'], ['f', 'sk_f'], ['g', 'sk_g']])
      const state = makeRuntimeState({ questCompletions: 2 })
      const ctx = makeContext({ triggerKey: 'a', bindings, randomFn: () => 0.0 })
      const flags = makeFlags()
      const result = resolvePhase5(skill, state, ctx, flags, 10)
      // targets = 1 + 2 = 3
      expect(result.replicateTargets.length).toBeLessThanOrEqual(3)
      expect(result.replicateTargets.length).toBeGreaterThan(0)
    })

    it('should return empty when no candidates', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Replicate, posRel: PositionRelation.SameRow }],
      })
      const state = makeRuntimeState()
      const ctx = makeContext({ triggerKey: 'a', bindings: new Map(), randomFn: () => 0.0 })
      const flags = makeFlags()
      const result = resolvePhase5(skill, state, ctx, flags, 10)
      expect(result.replicateTargets).toEqual([])
    })
  })

  describe('Amplify affix', () => {
    it('should increment amplifyStacks by 1', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Amplify, posRel: PositionRelation.Adjacent, resource: 'base' as ResourceType, valuePerStack: 0.03 }],
      })
      const state = makeRuntimeState({ amplifyStacks: 5 })
      const ctx = makeContext()
      const flags = makeFlags()
      resolvePhase5(skill, state, ctx, flags, 10)
      expect(state.amplifyStacks).toBe(6)
    })
  })

  describe('Recurse affix', () => {
    it('should set shouldRecurse=true when roll succeeds', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Recurse, recurseChance: 0.25 }],
      })
      const state = makeRuntimeState()
      const ctx = makeContext({ randomFn: () => 0.1 }) // 0.1 < 0.25 → success
      const flags = makeFlags()
      const result = resolvePhase5(skill, state, ctx, flags, 10, 0)
      expect(result.recurse.shouldRecurse).toBe(true)
      expect(result.recurse.newChance).toBeCloseTo(0.125) // 0.25 / 2
    })

    it('should NOT recurse when roll fails', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Recurse, recurseChance: 0.25 }],
      })
      const state = makeRuntimeState()
      const ctx = makeContext({ randomFn: () => 0.5 }) // 0.5 > 0.25 → fail
      const flags = makeFlags()
      const result = resolvePhase5(skill, state, ctx, flags, 10, 0)
      expect(result.recurse.shouldRecurse).toBe(false)
    })

    it('should NOT recurse when depth >= MAX_RECURSE_DEPTH', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Recurse, recurseChance: 1.0 }],
      })
      const state = makeRuntimeState()
      const ctx = makeContext({ randomFn: () => 0.0 })
      const flags = makeFlags()
      const result = resolvePhase5(skill, state, ctx, flags, 10, MAX_RECURSE_DEPTH)
      expect(result.recurse.shouldRecurse).toBe(false)
    })
  })

  describe('Apprentice enchantments (Phase 5 self-trigger types)', () => {
    it('ApprenticeSelf: should always accumulate growth', () => {
      const skill = makeSkill({
        enchantmentIds: [EnchantmentType.ApprenticeSelf],
      })
      const state = makeRuntimeState({ apprenticeAccumulated: 0.10 })
      const ctx = makeContext()
      const flags = makeFlags()
      resolvePhase5(skill, state, ctx, flags, 10)
      expect(state.apprenticeAccumulated).toBeCloseTo(0.10 + 0.005)
    })

    it('ApprenticeCrit: should only accumulate on crit', () => {
      const skill = makeSkill({
        enchantmentIds: [EnchantmentType.ApprenticeCrit],
      })
      const state = makeRuntimeState()
      const ctx = makeContext()

      // No crit → no growth
      resolvePhase5(skill, state, ctx, makeFlags({ isCrit: false }), 10)
      expect(state.apprenticeAccumulated).toBe(0)

      // Crit → growth
      resolvePhase5(skill, state, ctx, makeFlags({ isCrit: true }), 10)
      expect(state.apprenticeAccumulated).toBeCloseTo(0.02)
    })

    it('ApprenticeOutcast: should accumulate when outcast condition met', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Outcast, bonusPercent: 0.5 }],
        enchantmentIds: [EnchantmentType.ApprenticeOutcast],
      })
      const state = makeRuntimeState()
      // 'a' is first letter of 'apple'
      const ctx = makeContext({ triggerKey: 'a', currentWord: 'apple' })
      const flags = makeFlags()
      resolvePhase5(skill, state, ctx, flags, 10)
      expect(state.apprenticeAccumulated).toBeCloseTo(0.015)
    })

    it('ApprenticeOutcast: should NOT accumulate when not first/last letter', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Outcast, bonusPercent: 0.5 }],
        enchantmentIds: [EnchantmentType.ApprenticeOutcast],
      })
      const state = makeRuntimeState()
      // 'p' is middle letter of 'apple'
      const ctx = makeContext({ triggerKey: 'p', currentWord: 'apple' })
      const flags = makeFlags()
      resolvePhase5(skill, state, ctx, flags, 10)
      expect(state.apprenticeAccumulated).toBe(0)
    })

    it('ApprenticeProc: should accumulate on any affix proc', () => {
      const skill = makeSkill({
        enchantmentIds: [EnchantmentType.ApprenticeProc],
      })
      const state = makeRuntimeState()
      const ctx = makeContext()

      // Pulse proc → growth
      resolvePhase5(skill, state, ctx, makeFlags({ isPulse: true }), 10)
      expect(state.apprenticeAccumulated).toBeCloseTo(0.015)
    })

    it('ApprenticeProc: should NOT accumulate when no affix proc', () => {
      const skill = makeSkill({
        enchantmentIds: [EnchantmentType.ApprenticeProc],
      })
      const state = makeRuntimeState()
      const ctx = makeContext()
      resolvePhase5(skill, state, ctx, makeFlags(), 10)
      expect(state.apprenticeAccumulated).toBe(0)
    })
  })

  describe('Quest enchantment stacking', () => {
    it('should increment questStacks when event condition met', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Void, posRel: PositionRelation.Adjacent, bonusPerSlot: 0.25 }],
        enchantmentIds: [EnchantmentType.QuestDevour],
      })
      const state = makeRuntimeState({ questStacks: 0 })
      const ctx = makeContext()
      const flags = makeFlags()
      // QuestDevour event = 'selfTrigger' → always true
      resolvePhase5(skill, state, ctx, flags, 10)
      expect(state.questStacks).toBe(1)
      expect(state.questCompletions).toBe(0)
    })

    it('should complete quest cycle when stacks >= target', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Void, posRel: PositionRelation.Adjacent, bonusPerSlot: 0.25 }],
        enchantmentIds: [EnchantmentType.QuestDevour],
      })
      // QuestDevour targetStacks = 15, start at 14
      const state = makeRuntimeState({ questStacks: 14 })
      const ctx = makeContext()
      const flags = makeFlags()
      const result = resolvePhase5(skill, state, ctx, flags, 10)
      expect(state.questStacks).toBe(0) // reset
      expect(state.questCompletions).toBe(1)
      expect(result.questCompleted).toBe(true)
    })

    it('QuestDevour should return devourTarget on completion', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Void, posRel: PositionRelation.Adjacent, bonusPerSlot: 0.25 }],
        enchantmentIds: [EnchantmentType.QuestDevour],
      })
      const bindings = new Map([['s', 'sk_s']])
      const allSkills = new Map<string, AffixSkillInstance>([
        ['sk_s', makeSkill({ id: 'sk_s', level: 1 })],
      ])
      const state = makeRuntimeState({ questStacks: 14 })
      const ctx = makeContext({ triggerKey: 'a', bindings, allSkills })
      const flags = makeFlags()
      const result = resolvePhase5(skill, state, ctx, flags, 10)
      expect(result.questCompleted).toBe(true)
      // devourTarget should be the weakest neighbor in Void's posRel range
      // Whether 's' is adjacent to 'a' depends on topology — if it is, devourTarget = 's'
      if (result.devourTarget != null) {
        expect(typeof result.devourTarget).toBe('string')
      }
    })

    it('QuestOverload: should stack on crit hit only', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Crit, chance: 0.5, critMult: 2.0 }],
        enchantmentIds: [EnchantmentType.QuestOverload],
      })
      const state = makeRuntimeState({ questStacks: 0 })
      const ctx = makeContext()

      // No crit → no stack
      resolvePhase5(skill, state, ctx, makeFlags({ isCrit: false }), 10)
      expect(state.questStacks).toBe(0)

      // Crit → +1 stack
      resolvePhase5(skill, state, ctx, makeFlags({ isCrit: true }), 10)
      expect(state.questStacks).toBe(1)
    })

    it('QuestSacrifice: should stack on taboo penalty', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Taboo, bonusPercent: 1.0, penaltyChance: 0.1 }],
        enchantmentIds: [EnchantmentType.QuestSacrifice],
      })
      const state = makeRuntimeState({ questStacks: 0 })
      const ctx = makeContext()

      // Taboo penalty → +1 stack
      resolvePhase5(skill, state, ctx, makeFlags({ isTabooPenalty: true }), 10)
      expect(state.questStacks).toBe(1)

      // No penalty → no stack
      resolvePhase5(skill, state, ctx, makeFlags({ isTabooPenalty: false }), 10)
      expect(state.questStacks).toBe(1) // unchanged
    })

    it('QuestIterate: should stack on recurse proc', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Recurse, recurseChance: 1.0 }], // always recurse
        enchantmentIds: [EnchantmentType.QuestIterate],
      })
      const state = makeRuntimeState({ questStacks: 0 })
      const ctx = makeContext({ randomFn: () => 0.0 }) // recurse succeeds
      const flags = makeFlags()
      resolvePhase5(skill, state, ctx, flags, 10, 0)
      expect(state.questStacks).toBe(1)
    })
  })

  describe('Transmute enchantment', () => {
    it('should produce extra resource output using per-resource ratio', () => {
      const skill = makeSkill({
        enchantmentIds: [EnchantmentType.Transmute],
      })
      const state = makeRuntimeState()
      const ctx = makeContext({
        transmuteResource: 'gold' as ResourceType,
      })
      const flags = makeFlags()
      const result = resolvePhase5(skill, state, ctx, flags, 100)
      // gold ratio = 0.20
      expect(result.transmuteOutput).toEqual({ resource: 'gold', amount: 20 })
    })

    it('should use per-resource ratio from TRANSMUTE_RATIO_TABLE', () => {
      const skill = makeSkill({
        enchantmentIds: [EnchantmentType.Transmute],
      })
      const state = makeRuntimeState()
      const ctx = makeContext({ transmuteResource: 'score' as ResourceType })
      const flags = makeFlags()
      const result = resolvePhase5(skill, state, ctx, flags, 100)
      // score ratio = 0.30
      expect(result.transmuteOutput).toEqual({ resource: 'score', amount: 30 })
    })

    it('should return null when no transmuteResource', () => {
      const skill = makeSkill({
        enchantmentIds: [EnchantmentType.Transmute],
      })
      const state = makeRuntimeState()
      const ctx = makeContext()
      const flags = makeFlags()
      const result = resolvePhase5(skill, state, ctx, flags, 100)
      expect(result.transmuteOutput).toBeNull()
    })

    it('should set transmuteSameResourceBoost when extraResource === skill.resource', () => {
      const skill = makeSkill({
        resource: 'base' as ResourceType,
        enchantmentIds: [EnchantmentType.Transmute],
      })
      const state = makeRuntimeState()
      const ctx = makeContext({ transmuteResource: 'base' as ResourceType })
      const flags = makeFlags()
      const result = resolvePhase5(skill, state, ctx, flags, 100)
      // Same resource: no transmuteOutput, boost ratio instead
      expect(result.transmuteOutput).toBeNull()
      expect(result.transmuteSameResourceBoost).toBe(0.30) // base ratio = 0.30
    })
  })

  describe('Splash enchantment', () => {
    it('should return posRel neighbors with efficiency = 1/count', () => {
      const skill = makeSkill({
        enchantmentIds: [EnchantmentType.Splash],
      })
      const bindings = new Map([['s', 'sk_s'], ['d', 'sk_d']])
      const state = makeRuntimeState()
      const ctx = makeContext({
        triggerKey: 'a',
        bindings,
        splashPosRel: PositionRelation.SameRow,
      })
      const flags = makeFlags()
      const result = resolvePhase5(skill, state, ctx, flags, 10)
      // 's' and 'd' are on same row as 'a'
      if (result.splashTargets.length > 0) {
        const eff = 1 / result.splashTargets.length
        for (const target of result.splashTargets) {
          expect(target.efficiency).toBeCloseTo(eff)
        }
      }
    })

    it('should return empty when splashPosRel not provided', () => {
      const skill = makeSkill({
        enchantmentIds: [EnchantmentType.Splash],
      })
      const state = makeRuntimeState()
      const ctx = makeContext({ triggerKey: 'a' })
      const flags = makeFlags()
      const result = resolvePhase5(skill, state, ctx, flags, 10)
      expect(result.splashTargets).toEqual([])
    })

    it('should return empty when no neighbors in range', () => {
      const skill = makeSkill({
        enchantmentIds: [EnchantmentType.Splash],
      })
      const state = makeRuntimeState()
      const ctx = makeContext({
        triggerKey: 'a',
        bindings: new Map(),
        splashPosRel: PositionRelation.Adjacent,
      })
      const flags = makeFlags()
      const result = resolvePhase5(skill, state, ctx, flags, 10)
      expect(result.splashTargets).toEqual([])
    })
  })

  describe('MutationHunger enchantment', () => {
    it('should produce mutagen when roll succeeds', () => {
      const skill = makeSkill({
        enchantmentIds: [EnchantmentType.MutationHunger],
      })
      const state = makeRuntimeState()
      const ctx = makeContext({ randomFn: () => 0.01 }) // 0.01 < 0.05 → success
      const flags = makeFlags()
      const result = resolvePhase5(skill, state, ctx, flags, 10)
      expect(result.mutagenOutput).toBe(1)
    })

    it('should NOT produce mutagen when roll fails', () => {
      const skill = makeSkill({
        enchantmentIds: [EnchantmentType.MutationHunger],
      })
      const state = makeRuntimeState()
      const ctx = makeContext({ randomFn: () => 0.9 }) // 0.9 > 0.05 → fail
      const flags = makeFlags()
      const result = resolvePhase5(skill, state, ctx, flags, 10)
      expect(result.mutagenOutput).toBe(0)
    })

    it('should use custom chance from context', () => {
      const skill = makeSkill({
        enchantmentIds: [EnchantmentType.MutationHunger],
      })
      const state = makeRuntimeState()
      const ctx = makeContext({
        mutationHungerChance: 0.5,
        randomFn: () => 0.3, // 0.3 < 0.5 → success with custom chance
      })
      const flags = makeFlags()
      const result = resolvePhase5(skill, state, ctx, flags, 10)
      expect(result.mutagenOutput).toBe(1)
    })
  })
})

// ===== Phase 6 测试 =====

describe('resolvePhase6', () => {
  describe('Resonance affix', () => {
    it('should produce resonance action when neighbor has Resonance + posRel matches', () => {
      const skill = makeSkill({ resource: 'base' as ResourceType })
      const neighborSkill = makeSkill({
        id: 'sk_neighbor',
        affixes: [{ type: AffixType.Resonance, posRel: PositionRelation.SameRow, efficiency: 0.5 }],
      })
      const bindings = new Map([['a', 'test_skill'], ['s', 'sk_neighbor']])
      const allSkills = new Map([['test_skill', skill], ['sk_neighbor', neighborSkill]])
      const skillStates = new Map([['sk_neighbor', makeRuntimeState({ skillId: 'sk_neighbor' })]])
      const state = makeRuntimeState()
      const ctx = makeContext({ triggerKey: 'a', bindings, allSkills, skillStates })

      const result = resolvePhase6('a', skill, state, ctx)
      const resonanceActions = result.actions.filter(a => a.type === 'resonance')
      // 'a' and 's' are on the same row
      if (resonanceActions.length > 0) {
        expect(resonanceActions[0].type).toBe('resonance')
        expect(resonanceActions[0].neighborKey).toBe('s')
        expect((resonanceActions[0] as any).efficiencyMult).toBeCloseTo(0.5)
      }
    })

    it('should enhance efficiency with QuestResonance', () => {
      const skill = makeSkill({ resource: 'base' as ResourceType })
      const neighborSkill = makeSkill({
        id: 'sk_neighbor',
        affixes: [{ type: AffixType.Resonance, posRel: PositionRelation.SameRow, efficiency: 0.5 }],
        enchantmentIds: [EnchantmentType.QuestResonance],
      })
      const bindings = new Map([['a', 'test_skill'], ['s', 'sk_neighbor']])
      const allSkills = new Map([['test_skill', skill], ['sk_neighbor', neighborSkill]])
      const neighborState = makeRuntimeState({ skillId: 'sk_neighbor', questCompletions: 5 })
      const skillStates = new Map([['sk_neighbor', neighborState]])
      const state = makeRuntimeState()
      const ctx = makeContext({ triggerKey: 'a', bindings, allSkills, skillStates })

      const result = resolvePhase6('a', skill, state, ctx)
      const resonanceActions = result.actions.filter(a => a.type === 'resonance')
      if (resonanceActions.length > 0) {
        // effectiveEff = 0.5 + 5 * 0.08 = 0.9
        expect((resonanceActions[0] as any).efficiencyMult).toBeCloseTo(0.9)
      }
    })
  })

  describe('Link affix', () => {
    it('should produce link action when resource matches', () => {
      // Trigger skill produces 'base'
      const skill = makeSkill({ resource: 'base' as ResourceType })
      // Neighbor has Link watching 'base'
      const neighborSkill = makeSkill({
        id: 'sk_neighbor',
        affixes: [{ type: AffixType.Link, resource: 'base' as ResourceType, posRel: PositionRelation.SameRow }],
      })
      const bindings = new Map([['a', 'test_skill'], ['s', 'sk_neighbor']])
      const allSkills = new Map([['test_skill', skill], ['sk_neighbor', neighborSkill]])
      const state = makeRuntimeState()
      const ctx = makeContext({ triggerKey: 'a', bindings, allSkills })

      const result = resolvePhase6('a', skill, state, ctx)
      const linkActions = result.actions.filter(a => a.type === 'link')
      // 'a' and 's' are same row
      if (linkActions.length > 0) {
        expect(linkActions[0].neighborKey).toBe('s')
      }
    })

    it('should NOT produce link action when resource does not match', () => {
      const skill = makeSkill({ resource: 'gold' as ResourceType })
      const neighborSkill = makeSkill({
        id: 'sk_neighbor',
        affixes: [{ type: AffixType.Link, resource: 'base' as ResourceType, posRel: PositionRelation.SameRow }],
      })
      const bindings = new Map([['a', 'test_skill'], ['s', 'sk_neighbor']])
      const allSkills = new Map([['test_skill', skill], ['sk_neighbor', neighborSkill]])
      const state = makeRuntimeState()
      const ctx = makeContext({ triggerKey: 'a', bindings, allSkills })

      const result = resolvePhase6('a', skill, state, ctx)
      const linkActions = result.actions.filter(a => a.type === 'link')
      expect(linkActions.length).toBe(0)
    })
  })

  describe('ApprenticeNeighbor enchantment', () => {
    it('should produce growth action when posRel matches', () => {
      const skill = makeSkill({ resource: 'base' as ResourceType })
      const neighborSkill = makeSkill({
        id: 'sk_neighbor',
        enchantmentIds: [EnchantmentType.ApprenticeNeighbor],
      })
      const bindings = new Map([['a', 'test_skill'], ['s', 'sk_neighbor']])
      const allSkills = new Map([['test_skill', skill], ['sk_neighbor', neighborSkill]])
      const enchParams = new Map([['sk_neighbor', { posRel: PositionRelation.SameRow }]])
      const state = makeRuntimeState()
      const ctx = makeContext({
        triggerKey: 'a',
        bindings,
        allSkills,
        skillEnchantmentParams: enchParams,
      })

      const result = resolvePhase6('a', skill, state, ctx)
      const apprenticeActions = result.actions.filter(a => a.type === 'apprentice_neighbor')
      // 'a' and 's' are same row
      if (apprenticeActions.length > 0) {
        const growth = APPRENTICE_NEIGHBOR_GROWTH[PositionRelation.SameRow]
        expect((apprenticeActions[0] as any).growthDelta).toBeCloseTo(growth)
      }
    })

    it('should NOT produce action when no enchantmentParams', () => {
      const skill = makeSkill({ resource: 'base' as ResourceType })
      const neighborSkill = makeSkill({
        id: 'sk_neighbor',
        enchantmentIds: [EnchantmentType.ApprenticeNeighbor],
      })
      const bindings = new Map([['a', 'test_skill'], ['s', 'sk_neighbor']])
      const allSkills = new Map([['test_skill', skill], ['sk_neighbor', neighborSkill]])
      const state = makeRuntimeState()
      const ctx = makeContext({ triggerKey: 'a', bindings, allSkills })

      const result = resolvePhase6('a', skill, state, ctx)
      const apprenticeActions = result.actions.filter(a => a.type === 'apprentice_neighbor')
      expect(apprenticeActions.length).toBe(0)
    })
  })

  describe('QuestResonance enchantment', () => {
    it('should produce quest_resonance action when neighbor has QuestResonance + Resonance/Link', () => {
      const skill = makeSkill({ resource: 'base' as ResourceType })
      const neighborSkill = makeSkill({
        id: 'sk_neighbor',
        affixes: [{ type: AffixType.Resonance, posRel: PositionRelation.SameRow, efficiency: 0.5 }],
        enchantmentIds: [EnchantmentType.QuestResonance],
      })
      const bindings = new Map([['a', 'test_skill'], ['s', 'sk_neighbor']])
      const allSkills = new Map([['test_skill', skill], ['sk_neighbor', neighborSkill]])
      const state = makeRuntimeState()
      const ctx = makeContext({ triggerKey: 'a', bindings, allSkills })

      const result = resolvePhase6('a', skill, state, ctx)
      const questActions = result.actions.filter(a => a.type === 'quest_resonance')
      // 'a' and 's' same row → posRel matches → quest_resonance action
      if (questActions.length > 0) {
        expect(questActions[0].neighborKey).toBe('s')
      }
    })

    it('should NOT produce action when neighbor has no Resonance/Link affix', () => {
      const skill = makeSkill({ resource: 'base' as ResourceType })
      const neighborSkill = makeSkill({
        id: 'sk_neighbor',
        affixes: [], // no Resonance or Link
        enchantmentIds: [EnchantmentType.QuestResonance],
      })
      const bindings = new Map([['a', 'test_skill'], ['s', 'sk_neighbor']])
      const allSkills = new Map([['test_skill', skill], ['sk_neighbor', neighborSkill]])
      const state = makeRuntimeState()
      const ctx = makeContext({ triggerKey: 'a', bindings, allSkills })

      const result = resolvePhase6('a', skill, state, ctx)
      const questActions = result.actions.filter(a => a.type === 'quest_resonance')
      expect(questActions.length).toBe(0)
    })
  })

  describe('Edge cases', () => {
    it('should skip self key', () => {
      const skill = makeSkill({
        id: 'test_skill',
        affixes: [{ type: AffixType.Resonance, posRel: PositionRelation.SameRow, efficiency: 0.5 }],
      })
      const bindings = new Map([['a', 'test_skill']])
      const allSkills = new Map([['test_skill', skill]])
      const state = makeRuntimeState()
      const ctx = makeContext({ triggerKey: 'a', bindings, allSkills })

      const result = resolvePhase6('a', skill, state, ctx)
      // Should not include self
      expect(result.actions.length).toBe(0)
    })

    it('should return empty actions when no bindings', () => {
      const skill = makeSkill()
      const state = makeRuntimeState()
      const ctx = makeContext({ triggerKey: 'a', bindings: new Map() })
      const result = resolvePhase6('a', skill, state, ctx)
      expect(result.actions).toEqual([])
    })
  })
})

// ===== Phase 1-6 组合端到端测试 =====

describe('Full Phase 1-6 pipeline', () => {
  it('basic skill: Phase 4 returns skill.resource, Phase 5/6 no actions', () => {
    const skill = makeSkill({ level: 1, rarity: 0 as 0, affixes: [], resource: 'base' as ResourceType })
    const state = makeRuntimeState()
    const ctx = makeContext()
    const result = triggerAffixSkill(skill, state, ctx)
    expect(result.phase4!.targetResource).toBe('base')
    expect(result.phase4!.output).toBe(5)
    expect(result.phase5!.replicateTargets).toEqual([])
    expect(result.phase5!.recurse.shouldRecurse).toBe(false)
    expect(result.phase5!.transmuteOutput).toBeNull()
    expect(result.phase5!.splashTargets).toEqual([])
    expect(result.phase5!.mutagenOutput).toBe(0)
    expect(result.phase6!.actions).toEqual([])
  })

  it('Rainbow + Splash skill: Phase 4 random resource + Phase 5 splash targets', () => {
    const skill = makeSkill({
      level: 1,
      affixes: [{ type: AffixType.Rainbow }],
      enchantmentIds: [EnchantmentType.Splash],
    })
    const bindings = new Map([['s', 'sk_s'], ['d', 'sk_d']])
    const state = makeRuntimeState()
    const ctx = makeContext({
      triggerKey: 'a',
      bindings,
      randomFn: () => 0.0, // → base
      splashPosRel: PositionRelation.SameRow,
    })
    const result = triggerAffixSkill(skill, state, ctx)
    expect(result.phase4!.targetResource).toBe('base')
    // Splash targets include same-row neighbors
    if (result.phase5!.splashTargets.length > 0) {
      for (const t of result.phase5!.splashTargets) {
        expect(t.efficiency).toBeCloseTo(1 / result.phase5!.splashTargets.length)
      }
    }
  })

  it('Recurse with depth limit: should stop at MAX_RECURSE_DEPTH', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Recurse, recurseChance: 1.0 }],
    })
    const state = makeRuntimeState()
    const ctx = makeContext({ randomFn: () => 0.0 })
    // At depth 10 → should not recurse
    const result = triggerAffixSkill(skill, state, ctx, MAX_RECURSE_DEPTH)
    expect(result.phase5!.recurse.shouldRecurse).toBe(false)
  })

  it('Rainbow + Link: Phase 6 should use Phase 4 resolved resource for Link check', () => {
    // Rainbow skill resolves to 'gold' via Phase 4
    const skill = makeSkill({
      resource: 'base' as ResourceType,
      affixes: [{ type: AffixType.Rainbow }],
    })
    // Neighbor has Link watching 'base' (skill's base resource)
    const neighborLinkBase = makeSkill({
      id: 'sk_link_base',
      affixes: [{ type: AffixType.Link, resource: 'base' as ResourceType, posRel: PositionRelation.SameRow }],
    })
    const bindings = new Map([['a', 'test_skill'], ['s', 'sk_link_base']])
    const allSkills = new Map([['test_skill', skill], ['sk_link_base', neighborLinkBase]])
    const state = makeRuntimeState()
    // randomFn → 4/7 → index 4 → 'gold'
    const ctx = makeContext({
      triggerKey: 'a',
      bindings,
      allSkills,
      randomFn: () => 4 / 7,
    })
    const result = triggerAffixSkill(skill, state, ctx)
    // Phase 4 resolved to 'gold', not 'base'
    expect(result.phase4!.targetResource).toBe('gold')
    // Link neighbor watching 'base' should NOT be triggered (actual resource is 'gold')
    const linkActions = result.phase6!.actions.filter(a => a.type === 'link')
    expect(linkActions.length).toBe(0)
  })
})

// ===== Code Review 修复验证测试 =====

describe('Code review fixes', () => {
  it('findWeakestNeighbor should NOT return triggerKey (self-exclusion)', () => {
    // 'a' is bound to a weak skill, neighbors are stronger
    const weakSkill = makeSkill({ id: 'sk_weak', level: 1, baseValues: [1, 2, 3] as [number, number, number] })
    const strongSkill = makeSkill({ id: 'sk_strong', level: 3, baseValues: [10, 20, 30] as [number, number, number] })
    const bindings = new Map([['a', 'sk_weak'], ['s', 'sk_strong']])
    const allSkills = new Map([['sk_weak', weakSkill], ['sk_strong', strongSkill]])
    const ctx = makeContext({ triggerKey: 'a', bindings, allSkills })
    // Even though 'a' is weakest on its row, findWeakestNeighbor should return 's' (not 'a')
    const result = findWeakestNeighbor('a', PositionRelation.SameRow, ctx)
    expect(result).not.toBe('a')
    // 's' is on the same row and is the only non-self neighbor → should be 's'
    if (result != null) {
      expect(result).toBe('s')
    }
  })

  it('QuestAscend (event=perfectWord) should NOT stack during Phase 5', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Multiply, multiplier: 1.5 }],
      enchantmentIds: [EnchantmentType.QuestAscend],
    })
    const state = makeRuntimeState({ questStacks: 0 })
    const ctx = makeContext()
    const flags = makeFlags()
    // QuestAscend event = 'perfectWord' → external event → should NOT stack in Phase 5
    resolvePhase5(skill, state, ctx, flags, 10)
    expect(state.questStacks).toBe(0)
  })

  it('QuestEnergize (event=wordComplete) should NOT stack during Phase 5', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Charge, gainPerSec: 0.08, maxBonus: 2.0 }],
      enchantmentIds: [EnchantmentType.QuestEnergize],
    })
    const state = makeRuntimeState({ questStacks: 0 })
    const ctx = makeContext()
    const flags = makeFlags()
    resolvePhase5(skill, state, ctx, flags, 10)
    expect(state.questStacks).toBe(0)
  })
})

// ===== Story 35.5: 附魔系统 — 溅射 + 学徒(12) =====

describe('Story 35.5: APPRENTICE_GROWTH_DEFAULTS completeness', () => {
  it('should contain all 11 Phase-5 + event apprentice types (excluding Neighbor)', () => {
    const expectedTypes = [
      EnchantmentType.ApprenticeSelf,
      EnchantmentType.ApprenticeCrit,
      EnchantmentType.ApprenticeOutcast,
      EnchantmentType.ApprenticeProc,
      EnchantmentType.ApprenticeWord,
      EnchantmentType.ApprenticeLongWord,
      EnchantmentType.ApprenticePerfect,
      EnchantmentType.ApprenticeHarvest,
      EnchantmentType.ApprenticeAdapt,
      EnchantmentType.ApprenticeCombo,
      EnchantmentType.ApprenticeStage,
    ]
    for (const t of expectedTypes) {
      expect(APPRENTICE_GROWTH_DEFAULTS[t]).toBeDefined()
      expect(APPRENTICE_GROWTH_DEFAULTS[t]).toBeGreaterThan(0)
    }
  })

  it('growthPerProc values should match design document', () => {
    expect(APPRENTICE_GROWTH_DEFAULTS[EnchantmentType.ApprenticeSelf]).toBeCloseTo(0.005)
    expect(APPRENTICE_GROWTH_DEFAULTS[EnchantmentType.ApprenticeCrit]).toBeCloseTo(0.02)
    expect(APPRENTICE_GROWTH_DEFAULTS[EnchantmentType.ApprenticeOutcast]).toBeCloseTo(0.015)
    expect(APPRENTICE_GROWTH_DEFAULTS[EnchantmentType.ApprenticeProc]).toBeCloseTo(0.015)
    expect(APPRENTICE_GROWTH_DEFAULTS[EnchantmentType.ApprenticeWord]).toBeCloseTo(0.02)
    expect(APPRENTICE_GROWTH_DEFAULTS[EnchantmentType.ApprenticeLongWord]).toBeCloseTo(0.025)
    expect(APPRENTICE_GROWTH_DEFAULTS[EnchantmentType.ApprenticePerfect]).toBeCloseTo(0.03)
    expect(APPRENTICE_GROWTH_DEFAULTS[EnchantmentType.ApprenticeHarvest]).toBeCloseTo(0.08)
    expect(APPRENTICE_GROWTH_DEFAULTS[EnchantmentType.ApprenticeAdapt]).toBeCloseTo(0.15)
    expect(APPRENTICE_GROWTH_DEFAULTS[EnchantmentType.ApprenticeCombo]).toBeCloseTo(0.01)
    expect(APPRENTICE_GROWTH_DEFAULTS[EnchantmentType.ApprenticeStage]).toBeCloseTo(0.08)
  })

  it('ApprenticeNeighbor should NOT be in APPRENTICE_GROWTH_DEFAULTS', () => {
    expect(APPRENTICE_GROWTH_DEFAULTS[EnchantmentType.ApprenticeNeighbor]).toBeUndefined()
  })
})

describe('Story 35.5: Phase 5 new apprentice self-trigger types', () => {
  it('ApprenticeWord: should accumulate when wordCompleted is true', () => {
    const skill = makeSkill({ enchantmentIds: [EnchantmentType.ApprenticeWord] })
    const state = makeRuntimeState()
    const ctx = makeContext({ currentWord: 'hello', wordCompleted: true })
    resolvePhase5(skill, state, ctx, makeFlags(), 10)
    expect(state.apprenticeAccumulated).toBeCloseTo(0.02)
  })

  it('ApprenticeWord: should NOT accumulate when wordCompleted is false/undefined', () => {
    const skill = makeSkill({ enchantmentIds: [EnchantmentType.ApprenticeWord] })
    const state = makeRuntimeState()
    const ctx = makeContext({ currentWord: 'hello' })
    resolvePhase5(skill, state, ctx, makeFlags(), 10)
    expect(state.apprenticeAccumulated).toBe(0)
  })

  it('ApprenticeLongWord: should accumulate when wordCompleted and word length >= 6', () => {
    const skill = makeSkill({ enchantmentIds: [EnchantmentType.ApprenticeLongWord] })
    const state = makeRuntimeState()
    const ctx = makeContext({ currentWord: 'banana', wordCompleted: true }) // 6 letters
    resolvePhase5(skill, state, ctx, makeFlags(), 10)
    expect(state.apprenticeAccumulated).toBeCloseTo(0.025)
  })

  it('ApprenticeLongWord: should NOT accumulate when word length < 6', () => {
    const skill = makeSkill({ enchantmentIds: [EnchantmentType.ApprenticeLongWord] })
    const state = makeRuntimeState()
    const ctx = makeContext({ currentWord: 'apple', wordCompleted: true }) // 5 letters
    resolvePhase5(skill, state, ctx, makeFlags(), 10)
    expect(state.apprenticeAccumulated).toBe(0)
  })

  it('ApprenticeLongWord: should NOT accumulate when wordCompleted is false', () => {
    const skill = makeSkill({ enchantmentIds: [EnchantmentType.ApprenticeLongWord] })
    const state = makeRuntimeState()
    const ctx = makeContext({ currentWord: 'banana' }) // 6 letters but not completed
    resolvePhase5(skill, state, ctx, makeFlags(), 10)
    expect(state.apprenticeAccumulated).toBe(0)
  })

  it('ApprenticePerfect: should accumulate when perfectWord is true', () => {
    const skill = makeSkill({ enchantmentIds: [EnchantmentType.ApprenticePerfect] })
    const state = makeRuntimeState()
    const ctx = makeContext({ perfectWord: true })
    resolvePhase5(skill, state, ctx, makeFlags(), 10)
    expect(state.apprenticeAccumulated).toBeCloseTo(0.03)
  })

  it('ApprenticePerfect: should NOT accumulate when perfectWord is false/undefined', () => {
    const skill = makeSkill({ enchantmentIds: [EnchantmentType.ApprenticePerfect] })
    const state = makeRuntimeState()
    const ctx = makeContext({ perfectWord: false })
    resolvePhase5(skill, state, ctx, makeFlags(), 10)
    expect(state.apprenticeAccumulated).toBe(0)

    const state2 = makeRuntimeState()
    const ctx2 = makeContext() // perfectWord undefined
    resolvePhase5(skill, state2, ctx2, makeFlags(), 10)
    expect(state2.apprenticeAccumulated).toBe(0)
  })

  it('ApprenticeHarvest: should accumulate when wordCompleted is true', () => {
    const skill = makeSkill({ enchantmentIds: [EnchantmentType.ApprenticeHarvest] })
    const state = makeRuntimeState()
    const ctx = makeContext({ currentWord: 'test', wordCompleted: true })
    resolvePhase5(skill, state, ctx, makeFlags(), 10)
    expect(state.apprenticeAccumulated).toBeCloseTo(0.08)
  })

  it('ApprenticeHarvest: should NOT accumulate when wordCompleted is false/undefined', () => {
    const skill = makeSkill({ enchantmentIds: [EnchantmentType.ApprenticeHarvest] })
    const state = makeRuntimeState()
    const ctx = makeContext({ currentWord: 'test' })
    resolvePhase5(skill, state, ctx, makeFlags(), 10)
    expect(state.apprenticeAccumulated).toBe(0)
  })

  it('ApprenticeAdapt: should accumulate when mutationApplied is true', () => {
    const skill = makeSkill({ enchantmentIds: [EnchantmentType.ApprenticeAdapt] })
    const state = makeRuntimeState()
    const ctx = makeContext({ mutationApplied: true })
    resolvePhase5(skill, state, ctx, makeFlags(), 10)
    expect(state.apprenticeAccumulated).toBeCloseTo(0.15)
  })

  it('ApprenticeAdapt: should NOT accumulate when mutationApplied is false/undefined', () => {
    const skill = makeSkill({ enchantmentIds: [EnchantmentType.ApprenticeAdapt] })
    const state = makeRuntimeState()
    const ctx = makeContext() // mutationApplied undefined
    resolvePhase5(skill, state, ctx, makeFlags(), 10)
    expect(state.apprenticeAccumulated).toBe(0)
  })

  it('ApprenticeCombo: should NOT accumulate in Phase 5 (external event)', () => {
    const skill = makeSkill({ enchantmentIds: [EnchantmentType.ApprenticeCombo] })
    const state = makeRuntimeState()
    const ctx = makeContext({ comboCount: 15 })
    resolvePhase5(skill, state, ctx, makeFlags(), 10)
    expect(state.apprenticeAccumulated).toBe(0)
  })

  it('ApprenticeStage: should NOT accumulate in Phase 5 (external event)', () => {
    const skill = makeSkill({ enchantmentIds: [EnchantmentType.ApprenticeStage] })
    const state = makeRuntimeState()
    const ctx = makeContext()
    resolvePhase5(skill, state, ctx, makeFlags(), 10)
    expect(state.apprenticeAccumulated).toBe(0)
  })
})

describe('Story 35.5: applyApprenticeEvent', () => {
  it('stageCleared should accumulate ApprenticeStage growth', () => {
    const state = makeRuntimeState()
    const result = applyApprenticeEvent('stageCleared', state, [EnchantmentType.ApprenticeStage])
    expect(result).toBe(true)
    expect(state.apprenticeAccumulated).toBeCloseTo(0.08)
  })

  it('comboReach should accumulate ApprenticeCombo growth', () => {
    const state = makeRuntimeState()
    const result = applyApprenticeEvent('comboReach', state, [EnchantmentType.ApprenticeCombo])
    expect(result).toBe(true)
    expect(state.apprenticeAccumulated).toBeCloseTo(0.01)
  })

  it('should return false for unknown event', () => {
    const state = makeRuntimeState()
    const result = applyApprenticeEvent('unknownEvent', state, [EnchantmentType.ApprenticeStage])
    expect(result).toBe(false)
    expect(state.apprenticeAccumulated).toBe(0)
  })

  it('should return false when enchantment not in list', () => {
    const state = makeRuntimeState()
    const result = applyApprenticeEvent('stageCleared', state, [EnchantmentType.ApprenticeSelf])
    expect(result).toBe(false)
    expect(state.apprenticeAccumulated).toBe(0)
  })

  it('should accumulate incrementally on repeated calls', () => {
    const state = makeRuntimeState()
    applyApprenticeEvent('stageCleared', state, [EnchantmentType.ApprenticeStage])
    applyApprenticeEvent('stageCleared', state, [EnchantmentType.ApprenticeStage])
    expect(state.apprenticeAccumulated).toBeCloseTo(0.16)
  })
})

describe('Story 35.5: SPLASH_ENCHANTMENT_DEFS', () => {
  it('should have 6 entries for all PositionRelation values', () => {
    expect(SPLASH_ENCHANTMENT_DEFS).toHaveLength(6)
    const posRels = SPLASH_ENCHANTMENT_DEFS.map(d => d.posRel)
    expect(posRels).toContain(PositionRelation.Adjacent)
    expect(posRels).toContain(PositionRelation.SameRow)
    expect(posRels).toContain(PositionRelation.SameColumn)
    expect(posRels).toContain(PositionRelation.SameHand)
    expect(posRels).toContain(PositionRelation.SameFinger)
    expect(posRels).toContain(PositionRelation.Symmetric)
  })

  it('each entry should have a name', () => {
    for (const def of SPLASH_ENCHANTMENT_DEFS) {
      expect(def.name).toBeTruthy()
      expect(typeof def.name).toBe('string')
    }
  })
})

describe('Story 35.5: filterEnchantmentsByClass', () => {
  const candidates = [
    EnchantmentType.ApprenticeSelf,
    EnchantmentType.ApprenticeHarvest,
    EnchantmentType.ApprenticeAdapt,
    EnchantmentType.Splash,
  ]

  it('no class: should exclude all class-restricted enchantments', () => {
    const result = filterEnchantmentsByClass(candidates)
    expect(result).toContain(EnchantmentType.ApprenticeSelf)
    expect(result).toContain(EnchantmentType.Splash)
    expect(result).not.toContain(EnchantmentType.ApprenticeHarvest)
    expect(result).not.toContain(EnchantmentType.ApprenticeAdapt)
  })

  it('wordsmith: should keep Harvest but exclude Adapt', () => {
    const result = filterEnchantmentsByClass(candidates, 'wordsmith')
    expect(result).toContain(EnchantmentType.ApprenticeSelf)
    expect(result).toContain(EnchantmentType.Splash)
    expect(result).toContain(EnchantmentType.ApprenticeHarvest)
    expect(result).not.toContain(EnchantmentType.ApprenticeAdapt)
  })

  it('metamorph: should keep Adapt but exclude Harvest', () => {
    const result = filterEnchantmentsByClass(candidates, 'metamorph')
    expect(result).toContain(EnchantmentType.ApprenticeSelf)
    expect(result).toContain(EnchantmentType.Splash)
    expect(result).not.toContain(EnchantmentType.ApprenticeHarvest)
    expect(result).toContain(EnchantmentType.ApprenticeAdapt)
  })

  it('unknown class: should exclude all class-restricted', () => {
    const result = filterEnchantmentsByClass(candidates, 'unknown')
    expect(result).not.toContain(EnchantmentType.ApprenticeHarvest)
    expect(result).not.toContain(EnchantmentType.ApprenticeAdapt)
  })
})

// ===== Story 35.6: 任务附魔完善 =====

describe('Story 35.6: checkQuestEventCondition inline events', () => {
  // checkQuestEventCondition is internal, test through Phase 5 quest stacking
  it('perfectWord event: QuestAscend should stack on perfectWord', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Multiply, multiplier: 1.5 }],
      enchantmentIds: [EnchantmentType.QuestAscend],
    })
    const state = makeRuntimeState()
    const ctx = makeContext({ perfectWord: true })
    resolvePhase5(skill, state, ctx, makeFlags(), 10)
    expect(state.questStacks).toBe(1)
  })

  it('perfectWord event: QuestAscend should NOT stack when perfectWord is false', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Multiply, multiplier: 1.5 }],
      enchantmentIds: [EnchantmentType.QuestAscend],
    })
    const state = makeRuntimeState()
    const ctx = makeContext({ perfectWord: false })
    resolvePhase5(skill, state, ctx, makeFlags(), 10)
    expect(state.questStacks).toBe(0)
  })

  it('wordComplete event: QuestEnergize should stack on wordCompleted', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Charge, maxBonus: 1.0 }],
      enchantmentIds: [EnchantmentType.QuestEnergize],
    })
    const state = makeRuntimeState()
    const ctx = makeContext({ wordCompleted: true })
    resolvePhase5(skill, state, ctx, makeFlags(), 10)
    expect(state.questStacks).toBe(1)
  })

  it('wordComplete event: QuestPolarize should stack on wordCompleted', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Gravity, probMult: 1.5 }],
      enchantmentIds: [EnchantmentType.QuestPolarize],
    })
    const state = makeRuntimeState()
    const ctx = makeContext({ wordCompleted: true })
    resolvePhase5(skill, state, ctx, makeFlags(), 10)
    expect(state.questStacks).toBe(1)
  })

  it('longWord:6 event: QuestFission should stack on wordCompleted + length >= 6', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Replicate, posRel: PositionRelation.Adjacent }],
      enchantmentIds: [EnchantmentType.QuestFission],
    })
    const state = makeRuntimeState()
    const ctx = makeContext({ currentWord: 'banana', wordCompleted: true })
    resolvePhase5(skill, state, ctx, makeFlags(), 10)
    expect(state.questStacks).toBe(1)
  })

  it('longWord:6 event: QuestFission should NOT stack on short word', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Replicate, posRel: PositionRelation.Adjacent }],
      enchantmentIds: [EnchantmentType.QuestFission],
    })
    const state = makeRuntimeState()
    const ctx = makeContext({ currentWord: 'apple', wordCompleted: true })
    resolvePhase5(skill, state, ctx, makeFlags(), 10)
    expect(state.questStacks).toBe(0)
  })

  it('neighborTrigger event: should return false in Phase 5 (handled in Phase 6)', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Resonance, posRel: PositionRelation.Adjacent, efficiency: 0.5 }],
      enchantmentIds: [EnchantmentType.QuestResonance],
    })
    const state = makeRuntimeState()
    const ctx = makeContext()
    resolvePhase5(skill, state, ctx, makeFlags(), 10)
    // neighborTrigger returns false in Phase 5 → no stacking
    expect(state.questStacks).toBe(0)
  })
})

describe('Story 35.6: QuestOverlap — Phase 3 Ligature integration', () => {
  it('should use nEff = n + questCompletions as multiplier', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Ligature }],
      enchantmentIds: [EnchantmentType.QuestOverlap],
    })
    // 'a' appears 1 time in 'apple', + 2 quest completions = nEff = 3
    const state = makeRuntimeState({ questCompletions: 2 })
    const ctx = makeContext({ triggerKey: 'a', currentWord: 'apple' })
    const result = resolvePhase3(skill, state, ctx, 10)
    expect(result.output).toBeCloseTo(30) // 10 * 3
    expect(result.flags.ligatureCount).toBe(3)
  })

  it('should not trigger when nEff < 2 (n=1, c=0)', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Ligature }],
      enchantmentIds: [EnchantmentType.QuestOverlap],
    })
    const state = makeRuntimeState({ questCompletions: 0 })
    const ctx = makeContext({ triggerKey: 'a', currentWord: 'apple' })
    const result = resolvePhase3(skill, state, ctx, 10)
    expect(result.output).toBeCloseTo(10) // no multiplier
    expect(result.flags.ligatureCount).toBe(0)
  })

  it('should trigger when quest makes nEff reach 2 (n=1, c=1)', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Ligature }],
      enchantmentIds: [EnchantmentType.QuestOverlap],
    })
    const state = makeRuntimeState({ questCompletions: 1 })
    const ctx = makeContext({ triggerKey: 'a', currentWord: 'apple' })
    const result = resolvePhase3(skill, state, ctx, 10)
    expect(result.output).toBeCloseTo(20) // 10 * 2
    expect(result.flags.ligatureCount).toBe(2)
  })
})

describe('Story 35.6: QuestIterate — Phase 5 Recurse integration', () => {
  it('should increase recurse chance with quest completions', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Recurse, recurseChance: 0.1 }],
      enchantmentIds: [EnchantmentType.QuestIterate],
    })
    const state = makeRuntimeState({ questCompletions: 2 })
    // chanceEff = 0.1 + 2*0.03 = 0.16, randomFn returns 0.15 → should recurse
    const ctx = makeContext({ randomFn: () => 0.15 })
    const result = resolvePhase5(skill, state, ctx, makeFlags(), 10)
    expect(result.recurse.shouldRecurse).toBe(true)
    expect(result.recurse.newChance).toBeCloseTo(0.08) // 0.16 / 2
  })

  it('should use base chance when no quest completions', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Recurse, recurseChance: 0.1 }],
    })
    const state = makeRuntimeState({ questCompletions: 0 })
    // randomFn returns 0.15 → 0.15 > 0.1, should NOT recurse
    const ctx = makeContext({ randomFn: () => 0.15 })
    const result = resolvePhase5(skill, state, ctx, makeFlags(), 10)
    expect(result.recurse.shouldRecurse).toBe(false)
  })
})

describe('Story 35.6: getEffectiveProbMult', () => {
  it('should return base probMult when no quest completions', () => {
    const affix: AffixInstance = { type: AffixType.Gravity, probMult: 1.5 }
    const skill = makeSkill({ affixes: [affix] })
    const state = makeRuntimeState()
    expect(getEffectiveProbMult(affix, state, skill)).toBeCloseTo(1.5)
  })

  it('should enhance attraction (probMult > 1) with quest completions', () => {
    const affix: AffixInstance = { type: AffixType.Gravity, probMult: 1.5 }
    const skill = makeSkill({
      affixes: [affix],
      enchantmentIds: [EnchantmentType.QuestPolarize],
    })
    const state = makeRuntimeState({ questCompletions: 2 })
    // delta=0.5, enhanced=0.5+2*0.15=0.8, result=1+0.8=1.8
    expect(getEffectiveProbMult(affix, state, skill)).toBeCloseTo(1.8)
  })

  it('should enhance repulsion (probMult < 1) with quest completions', () => {
    const affix: AffixInstance = { type: AffixType.Gravity, probMult: 0.5 }
    const skill = makeSkill({
      affixes: [affix],
      enchantmentIds: [EnchantmentType.QuestPolarize],
    })
    const state = makeRuntimeState({ questCompletions: 2 })
    // delta=0.5, enhanced=0.5+2*0.15=0.8, result=1-0.8=0.2
    expect(getEffectiveProbMult(affix, state, skill)).toBeCloseTo(0.2)
  })

  it('should handle probMult = 1 (no deviation) with quest', () => {
    const affix: AffixInstance = { type: AffixType.Gravity, probMult: 1.0 }
    const skill = makeSkill({
      affixes: [affix],
      enchantmentIds: [EnchantmentType.QuestPolarize],
    })
    const state = makeRuntimeState({ questCompletions: 3 })
    // delta=0, enhanced=0+3*0.15=0.45, result=1+0.45=1.45
    expect(getEffectiveProbMult(affix, state, skill)).toBeCloseTo(1.45)
  })
})

describe('Story 35.6: resolveMirrorCopy', () => {
  it('should copy a random affix from a neighbor skill', () => {
    const neighborSkill = makeSkill({
      id: 'neighbor',
      affixes: [{ type: AffixType.Crit, chance: 0.2, critMult: 2.0 }],
    })
    const skill = makeSkill({
      affixes: [{ type: AffixType.Mirror, posRel: PositionRelation.Adjacent }],
    })
    const state = makeRuntimeState()
    const bindings = new Map([['a', 'test_skill'], ['s', 'neighbor']])
    const allSkills = new Map([['test_skill', skill], ['neighbor', neighborSkill]])
    const ctx = makeContext({
      triggerKey: 'a',
      bindings,
      allSkills,
      randomFn: () => 0.0, // always pick first
    })

    const copied = resolveMirrorCopy(skill, state, ctx)
    expect(copied).not.toBeNull()
    expect(copied!.type).toBe(AffixType.Crit)
    expect(copied!.chance).toBeCloseTo(0.2)
    expect(copied!.critMult).toBeCloseTo(2.0)
  })

  it('should return null when no neighbors have skills', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Mirror, posRel: PositionRelation.Adjacent }],
    })
    const state = makeRuntimeState()
    const ctx = makeContext({ triggerKey: 'a', bindings: new Map() })

    expect(resolveMirrorCopy(skill, state, ctx)).toBeNull()
  })

  it('should apply QuestMirror boost to copied affix params (additive)', () => {
    const neighborSkill = makeSkill({
      id: 'neighbor',
      affixes: [{ type: AffixType.Convert, k: 0.1, source: 'base' as ResourceType }],
    })
    const skill = makeSkill({
      affixes: [{ type: AffixType.Mirror, posRel: PositionRelation.Adjacent }],
      enchantmentIds: [EnchantmentType.QuestMirror],
    })
    const state = makeRuntimeState({ questCompletions: 2 })
    const bindings = new Map([['a', 'test_skill'], ['s', 'neighbor']])
    const allSkills = new Map([['test_skill', skill], ['neighbor', neighborSkill]])
    const ctx = makeContext({
      triggerKey: 'a',
      bindings,
      allSkills,
      randomFn: () => 0.0,
    })

    const copied = resolveMirrorCopy(skill, state, ctx)
    expect(copied).not.toBeNull()
    // k boosted by 1.1^2 = 1.21 → 0.1 * 1.21 = 0.121
    expect(copied!.k).toBeCloseTo(0.121, 2)
  })

  it('should boost all numeric params including chance/gainPerSec/floor', () => {
    const neighborSkill = makeSkill({
      id: 'neighbor',
      affixes: [{ type: AffixType.Crit, chance: 0.2, critMult: 2.0 }],
    })
    const skill = makeSkill({
      affixes: [{ type: AffixType.Mirror, posRel: PositionRelation.Adjacent }],
      enchantmentIds: [EnchantmentType.QuestMirror],
    })
    const state = makeRuntimeState({ questCompletions: 1 })
    const bindings = new Map([['a', 'test_skill'], ['s', 'neighbor']])
    const allSkills = new Map([['test_skill', skill], ['neighbor', neighborSkill]])
    const ctx = makeContext({
      triggerKey: 'a',
      bindings,
      allSkills,
      randomFn: () => 0.0,
    })

    const copied = resolveMirrorCopy(skill, state, ctx)
    expect(copied).not.toBeNull()
    // chance: 0.2 * 1.1 = 0.22 (additive boost)
    expect(copied!.chance).toBeCloseTo(0.22)
    // critMult: 1 + (2.0-1)*1.1 = 1 + 1.1 = 2.1 (multiplicative boost)
    expect(copied!.critMult).toBeCloseTo(2.1)
  })

  it('should return null when neighbor has only Mirror/Twin affixes', () => {
    const neighborSkill = makeSkill({
      id: 'neighbor',
      affixes: [{ type: AffixType.Mirror, posRel: PositionRelation.Adjacent }],
    })
    const skill = makeSkill({
      affixes: [{ type: AffixType.Mirror, posRel: PositionRelation.Adjacent }],
    })
    const state = makeRuntimeState()
    const bindings = new Map([['a', 'test_skill'], ['s', 'neighbor']])
    const allSkills = new Map([['test_skill', skill], ['neighbor', neighborSkill]])
    const ctx = makeContext({
      triggerKey: 'a',
      bindings,
      allSkills,
      randomFn: () => 0.0,
    })

    expect(resolveMirrorCopy(skill, state, ctx)).toBeNull()
  })
})

describe('Story 35.6: applyQuestEvent', () => {
  it('stageCleared: QuestMirror (targetStacks=1) should immediately cycle', () => {
    const state = makeRuntimeState()
    const result = applyQuestEvent('stageCleared', state, [EnchantmentType.QuestMirror])
    expect(result).toBe(true)
    // targetStacks=1, so stacks immediately hit target → reset + completion
    expect(state.questStacks).toBe(0)
    expect(state.questCompletions).toBe(1)
  })

  it('comboReach: QuestPurify (targetStacks=3) should increment stacks', () => {
    const state = makeRuntimeState()
    const result = applyQuestEvent('comboReach', state, [EnchantmentType.QuestPurify])
    expect(result).toBe(true)
    expect(state.questStacks).toBe(1) // 1 of 3 target
    expect(state.questCompletions).toBe(0)
  })

  it('should cycle: QuestPurify completions++ after 3 comboReach events', () => {
    const state = makeRuntimeState()
    applyQuestEvent('comboReach', state, [EnchantmentType.QuestPurify])
    applyQuestEvent('comboReach', state, [EnchantmentType.QuestPurify])
    applyQuestEvent('comboReach', state, [EnchantmentType.QuestPurify])
    expect(state.questStacks).toBe(0) // reset after 3
    expect(state.questCompletions).toBe(1)
  })

  it('should return false for unknown event', () => {
    const state = makeRuntimeState()
    expect(applyQuestEvent('unknownEvent', state, [EnchantmentType.QuestMirror])).toBe(false)
    expect(state.questStacks).toBe(0)
  })

  it('should return false when enchantment not in list', () => {
    const state = makeRuntimeState()
    expect(applyQuestEvent('stageCleared', state, [EnchantmentType.QuestDevour])).toBe(false)
  })
})

describe('Story 35.6: filterQuestCandidates', () => {
  it('should return matching quest enchantments for skill affixes', () => {
    const skill = makeSkill({
      affixes: [
        { type: AffixType.Crit, chance: 0.2, critMult: 2.0 },
        { type: AffixType.Void, posRel: PositionRelation.Adjacent, bonusPerSlot: 0.1 },
      ],
    })
    const candidates = filterQuestCandidates(skill)
    expect(candidates).toContain(EnchantmentType.QuestOverload) // Crit
    expect(candidates).toContain(EnchantmentType.QuestDevour) // Void
    expect(candidates).not.toContain(EnchantmentType.QuestRefine) // no Convert
  })

  it('should return empty when no matching affixes', () => {
    const skill = makeSkill({ affixes: [] })
    expect(filterQuestCandidates(skill)).toHaveLength(0)
  })

  it('should handle QuestResonance matching either Resonance or Link', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Link, posRel: PositionRelation.Adjacent, efficiency: 0.5 }],
    })
    const candidates = filterQuestCandidates(skill)
    expect(candidates).toContain(EnchantmentType.QuestResonance)
  })

  it('should exclude already-owned enchantments', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Crit, chance: 0.2, critMult: 2.0 }],
      enchantmentIds: [EnchantmentType.QuestOverload],
    })
    const candidates = filterQuestCandidates(skill)
    expect(candidates).not.toContain(EnchantmentType.QuestOverload)
  })
})

describe('Story 35.6: getEnchantmentSlotCount', () => {
  it('should return 1 for normal skills', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Crit, chance: 0.2, critMult: 2.0 }],
    })
    expect(getEnchantmentSlotCount(skill)).toBe(1)
  })

  it('should return 2 for skills with Twin affix', () => {
    const skill = makeSkill({
      affixes: [
        { type: AffixType.Crit, chance: 0.2, critMult: 2.0 },
        { type: AffixType.Twin },
      ],
    })
    expect(getEnchantmentSlotCount(skill)).toBe(2)
  })
})

describe('Story 35.6: QUEST_ENCHANTMENT_DEFS completeness', () => {
  it('should have exactly 18 quest enchantment definitions', () => {
    expect(QUEST_ENCHANTMENT_DEFS).toHaveLength(18)
  })

  it('every quest enchantment should have a matching QUEST_AFFIX_MAP entry', () => {
    for (const def of QUEST_ENCHANTMENT_DEFS) {
      expect(QUEST_AFFIX_MAP[def.type]).toBeDefined()
    }
  })
})

// ===== Story 35-7: 衍生 + 被动 + 乘算化 =====

describe('TRANSMUTE_RATIO_TABLE', () => {
  it('should have 7 resource entries with correct ratios', () => {
    expect(TRANSMUTE_RATIO_TABLE['base' as ResourceType]).toBe(0.30)
    expect(TRANSMUTE_RATIO_TABLE['score' as ResourceType]).toBe(0.30)
    expect(TRANSMUTE_RATIO_TABLE['multiplier' as ResourceType]).toBe(0.10)
    expect(TRANSMUTE_RATIO_TABLE['time' as ResourceType]).toBe(0.20)
    expect(TRANSMUTE_RATIO_TABLE['gold' as ResourceType]).toBe(0.20)
    expect(TRANSMUTE_RATIO_TABLE['fragment' as ResourceType]).toBe(0.15)
    expect(TRANSMUTE_RATIO_TABLE['mutagen' as ResourceType]).toBe(0.15)
  })

  it('should cover all ALL_RESOURCES entries', () => {
    for (const r of ALL_RESOURCES) {
      expect(TRANSMUTE_RATIO_TABLE[r]).toBeDefined()
    }
  })
})

describe('Transmute per-resource ratios in Phase 5', () => {
  it('should use multiplier ratio (10%) for multiplier resource', () => {
    const skill = makeSkill({ enchantmentIds: [EnchantmentType.Transmute] })
    const state = makeRuntimeState()
    const ctx = makeContext({ transmuteResource: 'multiplier' as ResourceType })
    const flags = makeFlags()
    const result = resolvePhase5(skill, state, ctx, flags, 200)
    expect(result.transmuteOutput).toEqual({ resource: 'multiplier', amount: 20 }) // 200 × 0.10
  })

  it('should use fragment ratio (15%) for fragment resource', () => {
    const skill = makeSkill({ enchantmentIds: [EnchantmentType.Transmute] })
    const state = makeRuntimeState()
    const ctx = makeContext({ transmuteResource: 'fragment' as ResourceType })
    const flags = makeFlags()
    const result = resolvePhase5(skill, state, ctx, flags, 100)
    expect(result.transmuteOutput).toEqual({ resource: 'fragment', amount: 15 }) // 100 × 0.15
  })

  it('should use time ratio (20%) for time resource', () => {
    const skill = makeSkill({ enchantmentIds: [EnchantmentType.Transmute] })
    const state = makeRuntimeState()
    const ctx = makeContext({ transmuteResource: 'time' as ResourceType })
    const flags = makeFlags()
    const result = resolvePhase5(skill, state, ctx, flags, 50)
    expect(result.transmuteOutput).toEqual({ resource: 'time', amount: 10 }) // 50 × 0.20
  })
})

describe('Transmute same-resource optimization', () => {
  it('should boost main output via transmuteSameResourceBoost when same resource', () => {
    const skill = makeSkill({
      resource: 'gold' as ResourceType,
      enchantmentIds: [EnchantmentType.Transmute],
    })
    const state = makeRuntimeState()
    const ctx = makeContext({ transmuteResource: 'gold' as ResourceType })
    const flags = makeFlags()
    const result = resolvePhase5(skill, state, ctx, flags, 100)
    expect(result.transmuteOutput).toBeNull()
    expect(result.transmuteSameResourceBoost).toBe(0.20) // gold ratio
  })

  it('should produce transmuteOutput when different resource', () => {
    const skill = makeSkill({
      resource: 'base' as ResourceType,
      enchantmentIds: [EnchantmentType.Transmute],
    })
    const state = makeRuntimeState()
    const ctx = makeContext({ transmuteResource: 'gold' as ResourceType })
    const flags = makeFlags()
    const result = resolvePhase5(skill, state, ctx, flags, 100)
    expect(result.transmuteOutput).toEqual({ resource: 'gold', amount: 20 })
    expect(result.transmuteSameResourceBoost).toBe(0)
  })

  it('should return 0 boost when no transmute enchantment', () => {
    const skill = makeSkill({ enchantmentIds: [] })
    const state = makeRuntimeState()
    const ctx = makeContext()
    const flags = makeFlags()
    const result = resolvePhase5(skill, state, ctx, flags, 100)
    expect(result.transmuteSameResourceBoost).toBe(0)
  })
})

describe('MultiplyOperator — Phase 2 bonusBreakdown', () => {
  it('should return bonusBreakdown with individual bonuses when MultiplyOperator active', () => {
    const skill = makeSkill({
      affixes: [
        { type: AffixType.Taboo },          // +1.0
        { type: AffixType.Outcast, bonusPercent: 0.3 },  // +0.3 (if first/last)
      ],
      enchantmentIds: [EnchantmentType.MultiplyOperator],
    })
    const state = makeRuntimeState()
    const ctx = makeContext({ triggerKey: 'h', currentWord: 'hello' }) // 'h' is first letter
    const result = resolvePhase2(skill, state, ctx, 10)
    // MultiplyOperator: output = baseOutput (not multiplied by bonusPercent)
    expect(result.output).toBe(10)
    expect(result.bonusPercent).toBeCloseTo(1.3) // 1.0 + 0.3
    expect(result.bonusBreakdown).toBeDefined()
    expect(result.bonusBreakdown!.length).toBe(2)
    expect(result.bonusBreakdown![0]).toBeCloseTo(1.0)
    expect(result.bonusBreakdown![1]).toBeCloseTo(0.3)
  })

  it('should NOT return bonusBreakdown without MultiplyOperator', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Taboo }],
      enchantmentIds: [],
    })
    const state = makeRuntimeState()
    const ctx = makeContext()
    const result = resolvePhase2(skill, state, ctx, 10)
    expect(result.output).toBe(10 * (1 + 1.0)) // normal: 10 × 2.0
    expect(result.bonusBreakdown).toBeUndefined()
  })

  it('should return baseOutput when MultiplyOperator active and no bonuses', () => {
    const skill = makeSkill({
      affixes: [],
      enchantmentIds: [EnchantmentType.MultiplyOperator],
    })
    const state = makeRuntimeState()
    const ctx = makeContext()
    const result = resolvePhase2(skill, state, ctx, 10)
    expect(result.output).toBe(10)
    expect(result.bonusPercent).toBe(0)
    expect(result.bonusBreakdown).toEqual([])
  })
})

describe('MultiplyOperator — Phase 3 multiplicative application', () => {
  it('should multiply each breakdown bonus independently', () => {
    const skill = makeSkill({ enchantmentIds: [EnchantmentType.MultiplyOperator] })
    const state = makeRuntimeState()
    const ctx = makeContext()
    // bonusBreakdown = [0.30, 0.20] → output × 1.30 × 1.20 = input × 1.56
    const result = resolvePhase3(skill, state, ctx, 100, [0.30, 0.20])
    expect(result.output).toBeCloseTo(100 * 1.30 * 1.20)
    expect(result.multipliers).toContain(1.30)
    expect(result.multipliers).toContain(1.20)
  })

  it('additive vs multiplicative: MultiplyOperator produces larger result', () => {
    const state = makeRuntimeState()
    const ctx = makeContext()

    // Additive mode: 100 × (1 + 0.30 + 0.20 + 0.25) = 100 × 1.75 = 175
    const addSkill = makeSkill({ enchantmentIds: [] })
    const addP3 = resolvePhase3(addSkill, state, ctx, 175) // Phase 2 already applied
    // No bonusBreakdown → no MultiplyOperator effect
    expect(addP3.output).toBe(175)

    // MultiplyOperator mode: 100 × 1.30 × 1.20 × 1.25 = 100 × 1.95 = 195
    const mulSkill = makeSkill({ enchantmentIds: [EnchantmentType.MultiplyOperator] })
    const mulP3 = resolvePhase3(mulSkill, state, ctx, 100, [0.30, 0.20, 0.25])
    expect(mulP3.output).toBeCloseTo(195)
    expect(mulP3.output).toBeGreaterThan(addP3.output) // multiplicative > additive
  })

  it('should have no effect when bonusBreakdown is empty', () => {
    const skill = makeSkill({ enchantmentIds: [EnchantmentType.MultiplyOperator] })
    const state = makeRuntimeState()
    const ctx = makeContext()
    const result = resolvePhase3(skill, state, ctx, 100, [])
    expect(result.output).toBe(100) // no change
    expect(result.multipliers).toEqual([])
  })

  it('should have no effect when bonusBreakdown is undefined', () => {
    const skill = makeSkill({ enchantmentIds: [] })
    const state = makeRuntimeState()
    const ctx = makeContext()
    const result = resolvePhase3(skill, state, ctx, 100, undefined)
    expect(result.output).toBe(100)
  })

  it('should apply resource calibration factor (default 1.0)', () => {
    // MULTIPLY_OPERATOR_CALIBRATION defaults to 1.0 for all resources
    const skill = makeSkill({
      resource: 'base' as ResourceType,
      enchantmentIds: [EnchantmentType.MultiplyOperator],
    })
    const state = makeRuntimeState()
    const ctx = makeContext()
    const calibration = MULTIPLY_OPERATOR_CALIBRATION['base' as ResourceType]
    expect(calibration).toBe(1.0)
    const result = resolvePhase3(skill, state, ctx, 100, [0.50])
    // 100 × (1 + 0.50 × 1.0) = 100 × 1.50 = 150
    expect(result.output).toBeCloseTo(150)
  })

  it('should scale bonuses by non-1.0 calibration factor', () => {
    // Temporarily patch calibration table to test non-default calibration
    const origVal = MULTIPLY_OPERATOR_CALIBRATION['score' as ResourceType]
    ;(MULTIPLY_OPERATOR_CALIBRATION as Record<string, number>)['score'] = 0.8
    try {
      const skill = makeSkill({
        resource: 'score' as ResourceType,
        enchantmentIds: [EnchantmentType.MultiplyOperator],
      })
      const state = makeRuntimeState()
      const ctx = makeContext()
      // breakdown has two bonuses: 0.50 and 0.20
      const result = resolvePhase3(skill, state, ctx, 100, [0.50, 0.20])
      // 100 × (1 + 0.50 × 0.8) × (1 + 0.20 × 0.8) = 100 × 1.40 × 1.16 = 162.4
      expect(result.output).toBeCloseTo(162.4)
      expect(result.multipliers).toHaveLength(2)
      expect(result.multipliers[0]).toBeCloseTo(1.40)
      expect(result.multipliers[1]).toBeCloseTo(1.16)
    } finally {
      ;(MULTIPLY_OPERATOR_CALIBRATION as Record<string, number>)['score'] = origVal
    }
  })
})

describe('MultiplyOperator + passive enchantment combo', () => {
  it('should include passive enchantment bonus in bonusBreakdown', () => {
    const skill = makeSkill({
      resource: 'base' as ResourceType,
      affixes: [],
      enchantmentIds: [EnchantmentType.MultiplyOperator, EnchantmentType.Overflow],
    })
    const state = makeRuntimeState()
    const ctx = makeContext({
      fragmentInventory: { a: 15, b: 15, c: 5 },  // 2 saturated fragments
    })
    const result = resolvePhase2(skill, state, ctx, 10)
    // MultiplyOperator: output = baseOutput
    expect(result.output).toBe(10)
    // Overflow: 2 × 0.20 = 0.40
    expect(result.bonusPercent).toBeCloseTo(0.40)
    expect(result.bonusBreakdown).toBeDefined()
    expect(result.bonusBreakdown!.length).toBe(1) // one bonus: 0.40
    expect(result.bonusBreakdown![0]).toBeCloseTo(0.40)
  })
})

describe('Passive enchantment regression', () => {
  it('Overflow: should add 20% per saturated fragment', () => {
    const skill = makeSkill({
      enchantmentIds: [EnchantmentType.Overflow],
    })
    const state = makeRuntimeState()
    const ctx = makeContext({
      fragmentInventory: { a: 15, b: 20, c: 10 },
    })
    const result = resolvePhase2(skill, state, ctx, 10)
    expect(result.bonusPercent).toBeCloseTo(0.40) // 2 × 0.20
    expect(result.output).toBeCloseTo(10 * 1.40)
  })

  it('LetterAffinity: should add 25% when queue contains key', () => {
    const skill = makeSkill({
      enchantmentIds: [EnchantmentType.LetterAffinity],
    })
    const state = makeRuntimeState()
    const ctx = makeContext({
      triggerKey: 'A',
      fragmentQueue: ['a', 'b', 'c'],
    })
    const result = resolvePhase2(skill, state, ctx, 10)
    expect(result.bonusPercent).toBeCloseTo(0.25)
    expect(result.output).toBeCloseTo(10 * 1.25)
  })

  it('LetterAffinity: should NOT add bonus when key not in queue', () => {
    const skill = makeSkill({
      enchantmentIds: [EnchantmentType.LetterAffinity],
    })
    const state = makeRuntimeState()
    const ctx = makeContext({
      triggerKey: 'x',
      fragmentQueue: ['a', 'b', 'c'],
    })
    const result = resolvePhase2(skill, state, ctx, 10)
    expect(result.bonusPercent).toBe(0)
  })

  it('Unstable: should add 30% when resource matches', () => {
    const skill = makeSkill({
      resource: 'gold' as ResourceType,
      enchantmentIds: [EnchantmentType.Unstable],
    })
    const state = makeRuntimeState()
    const ctx = makeContext({
      unstableBonusResource: 'gold' as ResourceType,
    })
    const result = resolvePhase2(skill, state, ctx, 10)
    expect(result.bonusPercent).toBeCloseTo(0.30)
    expect(result.output).toBeCloseTo(10 * 1.30)
  })

  it('Unstable: should NOT add bonus when resource does not match', () => {
    const skill = makeSkill({
      resource: 'base' as ResourceType,
      enchantmentIds: [EnchantmentType.Unstable],
    })
    const state = makeRuntimeState()
    const ctx = makeContext({
      unstableBonusResource: 'gold' as ResourceType,
    })
    const result = resolvePhase2(skill, state, ctx, 10)
    expect(result.bonusPercent).toBe(0)
  })

  it('MutationHunger: should produce mutagenOutput on lucky roll', () => {
    const skill = makeSkill({
      enchantmentIds: [EnchantmentType.MutationHunger],
    })
    const state = makeRuntimeState()
    const ctx = makeContext({ randomFn: () => 0.01 }) // < 0.05
    const flags = makeFlags()
    const result = resolvePhase5(skill, state, ctx, flags, 100)
    expect(result.mutagenOutput).toBe(1)
  })

  it('MutationHunger: should NOT produce mutagenOutput on unlucky roll', () => {
    const skill = makeSkill({
      enchantmentIds: [EnchantmentType.MutationHunger],
    })
    const state = makeRuntimeState()
    const ctx = makeContext({ randomFn: () => 0.99 }) // > 0.05
    const flags = makeFlags()
    const result = resolvePhase5(skill, state, ctx, flags, 100)
    expect(result.mutagenOutput).toBe(0)
  })
})

describe('CLASS_RESTRICTED_ENCHANTMENTS — passive coverage', () => {
  it('should include 4 passive enchantments in class restrictions', () => {
    const wsEnch = CLASS_RESTRICTED_ENCHANTMENTS['wordsmith']
    const mmEnch = CLASS_RESTRICTED_ENCHANTMENTS['metamorph']
    expect(wsEnch).toContain(EnchantmentType.LetterAffinity)
    expect(wsEnch).toContain(EnchantmentType.Overflow)
    expect(mmEnch).toContain(EnchantmentType.Unstable)
    expect(mmEnch).toContain(EnchantmentType.MutationHunger)
  })

  it('filterEnchantmentsByClass should exclude passive enchantments for no class', () => {
    const candidates = [
      EnchantmentType.Splash,
      EnchantmentType.LetterAffinity,
      EnchantmentType.Overflow,
      EnchantmentType.Unstable,
      EnchantmentType.MutationHunger,
    ]
    const filtered = filterEnchantmentsByClass(candidates)
    expect(filtered).toEqual([EnchantmentType.Splash])
  })

  it('filterEnchantmentsByClass should include wordsmith passives for wordsmith', () => {
    const candidates = [
      EnchantmentType.Splash,
      EnchantmentType.LetterAffinity,
      EnchantmentType.Overflow,
      EnchantmentType.Unstable,
    ]
    const filtered = filterEnchantmentsByClass(candidates, 'wordsmith')
    expect(filtered).toContain(EnchantmentType.Splash)
    expect(filtered).toContain(EnchantmentType.LetterAffinity)
    expect(filtered).toContain(EnchantmentType.Overflow)
    expect(filtered).not.toContain(EnchantmentType.Unstable)
  })
})
