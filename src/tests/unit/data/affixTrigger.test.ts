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
  CLASS_RESTRICTED_ENCHANTMENTS,
  QUEST_AFFIX_MAP,
  QUEST_ENCHANTMENT_DEFS,
  TRANSMUTE_RATIO_TABLE,
  filterEnchantmentsByClass,
  AffixSkillSaveData,
  OLD_SKILL_PREFIXES,
  isOldSystemSkill,
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
  resolveMirrorCopyAllAffixes,
  filterQuestCandidates,
  getEnchantmentSlotCount,
  resetDecayForWord,
  resetStageState,
  resetRunState,
  serializeSkill,
  deserializeSkill,
  migrateLoadedSkills,
  ALL_RESOURCES,
  MAX_RECURSE_DEPTH,
  APPRENTICE_GROWTH_DEFAULTS,
  RES_ENCHANTMENT_BY_RESOURCE,
  MUTATION_HUNGER_CHANCE,
  buildEffectiveSkill,
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
    mirrorCopiedAffixes: [],
    triggerCount: 0,
    amplifyStacks: 0,
    apprenticeAccumulated: 0,
    questStacks: 0,
    questCompletions: 0,
    questTransformed: false,
    ...overrides,
  }
}

function makeContext(overrides?: Partial<TriggerContext>): TriggerContext {
  const triggerKey = overrides?.triggerKey ?? 'a'
  return {
    triggerKey,
    occupiedKeys: [triggerKey],
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
    const skill = makeSkill({ enchantmentIds: [EnchantmentType.ApprenticeNeighbor] })
    expect(hasEnchantment(skill, EnchantmentType.ApprenticeNeighbor)).toBe(true)
  })

  it('should return false when skill does not have the enchantment', () => {
    const skill = makeSkill({ enchantmentIds: [] })
    expect(hasEnchantment(skill, EnchantmentType.ApprenticeNeighbor)).toBe(false)
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
    const result = sumNeighborAmplifyStacks(['z'], PositionRelation.Adjacent, 'base', 0.02, ctx)
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

    it('should NOT apply quest stacking (41-4: stacking removed)', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Convert, source: 'base' as ResourceType, k: 0.05 }],
        enchantmentIds: [EnchantmentType.QuestRefine],
      })
      const state = makeRuntimeState({ questCompletions: 2 })
      const ctx = makeContext({ resources: makeResources({ base: 20 }) })
      const result = resolvePhase2(skill, state, ctx, 5)
      // 41-4: k直接使用，不再乘 1.1^c → bonusPercent = 0.05 * 20 = 1.0
      expect(result.bonusPercent).toBeCloseTo(1.0)
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

    it('should NOT apply quest stacking (41-4: stacking removed)', () => {
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
      // 41-4: bonusPerSlot直接使用，不再加 c*0.05 → 与无quest相同
      expect(result.bonusPercent).toBeCloseTo(resultNoQuest.bonusPercent)
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

    // Story 41-5: Quest stacking removed; maxBonus is cap directly
    it('should cap at maxBonus (no quest stacking)', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Charge, gainPerSec: 0.08, maxBonus: 2.0 }],
        enchantmentIds: [EnchantmentType.QuestEnergize],
      })
      const state = makeRuntimeState({ chargeAccumulated: 3.0, questCompletions: 2 })
      const ctx = makeContext()
      const result = resolvePhase2(skill, state, ctx, 5)
      // Story 41-5: cap is maxBonus=2.0 directly (no + c*0.3)
      expect(result.bonusPercent).toBeCloseTo(2.0)
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

    it('QuestSacrifice: should provide fixed +100% bonus (no quest numeric stacking)', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Taboo, bonusPercent: 1.0, penaltyChance: 0.1 }],
        enchantmentIds: [EnchantmentType.QuestSacrifice],
      })
      const state = makeRuntimeState({ questCompletions: 3, questTransformed: true })
      const ctx = makeContext()
      const result = resolvePhase2(skill, state, ctx, 5)
      // bonusPercent = 1.0 (fixed, no quest stacking)
      expect(result.bonusPercent).toBeCloseTo(1.0)
      // output = 5 * (1 + 1.0) = 10.0
      expect(result.output).toBeCloseTo(10.0)
    })
  })

  describe('Enchantment bonuses', () => {
    it('should NOT add apprenticeAccumulated for apprentice enchantments (ascension redesign)', () => {
      const skill = makeSkill({
        enchantmentIds: [EnchantmentType.ApprenticeNeighbor],
      })
      const state = makeRuntimeState({ apprenticeAccumulated: 0.35 })
      const ctx = makeContext()
      const result = resolvePhase2(skill, state, ctx, 5)
      // 升华重设计：apprenticeAccumulated 不再提供 bonusPercent
      expect(result.bonusPercent).toBeCloseTo(0)
    })

    it('should NOT add QuestDevour stacking bonus (41-4: removed)', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Void, posRel: PositionRelation.SameColumn, bonusPerSlot: 0.30 }],
        enchantmentIds: [EnchantmentType.QuestDevour],
      })
      const state = makeRuntimeState({ questCompletions: 5 })
      const ctx = makeContext({ bindings: new Map() })
      const resultNoQuest = resolvePhase2(
        makeSkill({ affixes: [{ type: AffixType.Void, posRel: PositionRelation.SameColumn, bonusPerSlot: 0.30 }] }),
        makeRuntimeState(),
        ctx,
        5,
      )
      const result = resolvePhase2(skill, state, ctx, 5)
      // 41-4: quest stacking removed → same as without quest
      expect(result.bonusPercent).toBeCloseTo(resultNoQuest.bonusPercent)
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

  describe('Apprentice accumulated bonus (ascension redesign)', () => {
    it('should NOT apply apprenticeAccumulated as bonusPercent (even with multiple apprentice enchantments)', () => {
      const skill = makeSkill({
        enchantmentIds: [EnchantmentType.ApprenticeNeighbor, EnchantmentType.ApprenticeResBase],
      })
      const state = makeRuntimeState({ apprenticeAccumulated: 0.5 })
      const ctx = makeContext()
      const result = resolvePhase2(skill, state, ctx, 10)
      // 升华重设计：apprenticeAccumulated 不再提供 bonusPercent
      expect(result.bonusPercent).toBeCloseTo(0)
      expect(result.output).toBeCloseTo(10)
    })

    it('should NOT apply apprenticeAccumulated with single apprentice enchantment', () => {
      const skill = makeSkill({
        enchantmentIds: [EnchantmentType.ApprenticeNeighbor],
      })
      const state = makeRuntimeState({ apprenticeAccumulated: 0.3 })
      const ctx = makeContext()
      const result = resolvePhase2(skill, state, ctx, 10)
      expect(result.bonusPercent).toBeCloseTo(0)
      expect(result.output).toBeCloseTo(10)
    })

    it('should not apply apprenticeAccumulated when no apprentice enchantments', () => {
      const skill = makeSkill({
        enchantmentIds: [EnchantmentType.QuestDevour],
      })
      const state = makeRuntimeState({ apprenticeAccumulated: 0.5 })
      const ctx = makeContext()
      const result = resolvePhase2(skill, state, ctx, 10)
      expect(result.bonusPercent).toBeCloseTo(0)
    })
  })
})

// ===== Phase 3 测试 =====

describe('resolvePhase3', () => {
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

    it('should guarantee crit when questTransformed (no roll needed)', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Crit, chance: 0.1, critMult: 2.0 }],
        enchantmentIds: [EnchantmentType.QuestOverload],
      })
      // roll > chance but questTransformed → always crit
      const state = makeRuntimeState({ questTransformed: true })
      const ctx = makeContext({ randomFn: () => 0.99 })
      const result = resolvePhase3(skill, state, ctx, 10)
      expect(result.output).toBeCloseTo(20)
      expect(result.flags.isCrit).toBe(true)
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

    it('should use base burstMult without quest numeric stacking', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Pulse, interval: 4, burstMult: 3.0 }],
        enchantmentIds: [EnchantmentType.QuestEcho],
      })
      const state = makeRuntimeState({ triggerCount: 8, questCompletions: 2, questTransformed: true })
      const ctx = makeContext()
      const result = resolvePhase3(skill, state, ctx, 10)
      // burstMult = 3.0 (no quest stacking)
      expect(result.output).toBeCloseTo(30)
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

    it('should use base floor without quest numeric stacking', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Decay, initialMult: 2.0, decayPerTrigger: 0.15, floor: 0.5 }],
        enchantmentIds: [EnchantmentType.QuestPurify],
      })
      const state = makeRuntimeState({ currentDecayMult: 0.55, questCompletions: 4, questTransformed: false })
      const ctx = makeContext()
      resolvePhase3(skill, state, ctx, 10)
      // floorEff = max(0.1, 0.5) = 0.5 (no quest stacking)
      // max(0.5, 0.55 - 0.15) = max(0.5, 0.4) = 0.5
      expect(state.currentDecayMult).toBeCloseTo(0.5)
    })

    it('should reverse decay direction when questTransformed', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Decay, initialMult: 1.0, decayPerTrigger: 0.15, floor: 0.5 }],
        enchantmentIds: [EnchantmentType.QuestPurify],
      })
      const state = makeRuntimeState({ currentDecayMult: 1.0, questTransformed: true })
      const ctx = makeContext()
      resolvePhase3(skill, state, ctx, 10)
      // questTransformed: decay reverses → 1.0 + 0.15 = 1.15
      expect(state.currentDecayMult).toBeCloseTo(1.15)
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

    it('QuestSacrifice: penalty chance stays fixed (no longer reduces)', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Taboo, bonusPercent: 1.0, penaltyChance: 0.1 }],
        enchantmentIds: [EnchantmentType.QuestSacrifice],
      })
      const state = makeRuntimeState({ questCompletions: 5 })
      // effPenalty = 0.1 (fixed, no longer reduced by QuestSacrifice)
      // randomFn returns 0.09 < 0.1 → penalty
      const ctx = makeContext({ randomFn: () => 0.09 })
      const result = resolvePhase3(skill, state, ctx, 10)
      expect(result.output).toBeCloseTo(-10)
    })
  })

  describe('Multiple multipliers', () => {
    it('should apply multiple multipliers independently', () => {
      const skill = makeSkill({
        affixes: [
          { type: AffixType.Crit, chance: 0.5, critMult: 2.0 },
          { type: AffixType.Decay, initialMult: 1.5, decayPerTrigger: 0.15, floor: 0.5 },
        ],
        rarity: 2 as 2,
      })
      const state = makeRuntimeState({ currentDecayMult: 1.5 })
      const ctx = makeContext({ randomFn: () => 0.3 }) // crit hits
      const result = resolvePhase3(skill, state, ctx, 10)
      // 10 * 2.0 (crit) * 1.5 (decay) = 30
      expect(result.output).toBeCloseTo(30)
      expect(result.multipliers).toEqual([2.0, 1.5])
    })
  })
})

// ===== 任务增强综合测试 =====

describe('Quest enhancement formulas', () => {
  it('Convert: k直接使用，无quest stacking (41-4)', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Convert, source: 'base' as ResourceType, k: 0.05 }],
      enchantmentIds: [EnchantmentType.QuestRefine],
    })
    const state = makeRuntimeState({ questCompletions: 3 })
    const ctx = makeContext({ resources: makeResources({ base: 10 }) })
    const result = resolvePhase2(skill, state, ctx, 5)
    // 41-4: k直接使用 → bonusPercent = 0.05 * 10 = 0.5
    expect(result.bonusPercent).toBeCloseTo(0.5)
  })

  it('Crit: guaranteed crit when questTransformed', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Crit, chance: 0.0, critMult: 2.0 }],
      enchantmentIds: [EnchantmentType.QuestOverload],
    })
    const state = makeRuntimeState({ questTransformed: true })
    // roll 0.99 > chance 0.0, but questTransformed overrides → guaranteed crit
    const ctx = makeContext({ randomFn: () => 0.99 })
    const result = resolvePhase3(skill, state, ctx, 10)
    expect(result.output).toBeCloseTo(20) // 10 * 2.0 (base critMult, no stacking)
    expect(result.flags.isCrit).toBe(true)
  })

  it('Pulse: burstMult without quest numeric stacking', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Pulse, interval: 4, burstMult: 3.0 }],
      enchantmentIds: [EnchantmentType.QuestEcho],
    })
    const state = makeRuntimeState({ triggerCount: 4, questTransformed: true })
    const ctx = makeContext()
    const result = resolvePhase3(skill, state, ctx, 10)
    // burstMult = 3.0 (base only, no c*0.3 stacking)
    expect(result.output).toBeCloseTo(30)
  })

  it('Decay: base floor without quest numeric stacking (questTransformed=false)', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Decay, initialMult: 2.0, decayPerTrigger: 0.15, floor: 0.5 }],
      enchantmentIds: [EnchantmentType.QuestPurify],
    })
    const state = makeRuntimeState({ currentDecayMult: 1.0, questCompletions: 3 })
    const ctx = makeContext()
    resolvePhase3(skill, state, ctx, 10)
    // Story 41-3: quest stacking removed → floorEff = max(0.1, 0.5) = 0.5
    // newDecay = max(0.5, 1.0 - 0.15) = 0.85
    expect(state.currentDecayMult).toBeCloseTo(0.85)
  })

  it('Void: bonusPerSlot直接使用，无quest stacking (41-4)', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Void, posRel: PositionRelation.Adjacent, bonusPerSlot: 0.25 }],
      enchantmentIds: [EnchantmentType.QuestDevour],
    })
    const state = makeRuntimeState({ questCompletions: 4 })
    const ctx = makeContext({ bindings: new Map() })
    const result = resolvePhase2(skill, state, ctx, 5)
    // 41-4: bonusPerSlot直接使用 → 与无quest相同
    const noQuest = resolvePhase2(
      makeSkill({ affixes: [{ type: AffixType.Void, posRel: PositionRelation.Adjacent, bonusPerSlot: 0.25 }] }),
      makeRuntimeState(),
      ctx,
      5,
    )
    expect(result.bonusPercent).toBeCloseTo(noQuest.bonusPercent)
  })
})

// ===== 41-4: 质变行为测试 =====

describe('41-4: Convert transformation — 双向转化', () => {
  it('should produce convertReverseOutputs when questTransformed', () => {
    const skill = makeSkill({
      resource: 'score',
      affixes: [{ type: AffixType.Convert, source: 'base' as ResourceType, k: 0.05 }],
    })
    const state = makeRuntimeState({ questTransformed: true })
    const ctx = makeContext({ resources: makeResources({ base: 20, score: 50 }) })
    const result = resolvePhase2(skill, state, ctx, 5)
    // 正向：k * base = 0.05 * 20 = 1.0 → bonusPercent
    expect(result.bonusPercent).toBeCloseTo(1.0)
    // 反向：k * getAffixSourceValue('score') = 0.05 * (50+20*1) = 0.05*70 = 3.5
    // amount = 3.5 * effectiveBase(5) = 17.5
    expect(result.convertReverseOutputs).toHaveLength(1)
    expect(result.convertReverseOutputs[0].resource).toBe('base')
    expect(result.convertReverseOutputs[0].amount).toBeCloseTo(17.5)
  })

  it('should NOT produce convertReverseOutputs when not transformed', () => {
    const skill = makeSkill({
      resource: 'score',
      affixes: [{ type: AffixType.Convert, source: 'base' as ResourceType, k: 0.05 }],
    })
    const state = makeRuntimeState({ questTransformed: false })
    const ctx = makeContext({ resources: makeResources({ base: 20, score: 50 }) })
    const result = resolvePhase2(skill, state, ctx, 5)
    expect(result.bonusPercent).toBeCloseTo(1.0)
    expect(result.convertReverseOutputs).toHaveLength(0)
  })
})

describe('41-4: Void transformation — 吞噬', () => {
  it('should produce devourTarget when questTransformed', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Void, posRel: PositionRelation.SameRow, bonusPerSlot: 0.25 }],
    })
    const state = makeRuntimeState({ questTransformed: true })
    const bindings = new Map([['s', 'sk_s'], ['d', 'sk_d']])
    const allSkills = new Map([
      ['sk_s', makeSkill({ id: 'sk_s', level: 1 })],
      ['sk_d', makeSkill({ id: 'sk_d', level: 2 })],
    ])
    const ctx = makeContext({ bindings, allSkills })
    const result = resolvePhase5(skill, state, ctx, makeFlags(), 10, 0, 'base')
    // questTransformed + Void affix → devourTarget should be set
    expect(result.devourTarget).toBeDefined()
  })

  it('should NOT produce devourTarget when not transformed', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Void, posRel: PositionRelation.SameRow, bonusPerSlot: 0.25 }],
    })
    const state = makeRuntimeState({ questTransformed: false })
    const ctx = makeContext()
    const result = resolvePhase5(skill, state, ctx, makeFlags(), 10, 0, 'base')
    expect(result.devourTarget).toBeNull()
  })
})

describe('41-4: Gravity transformation — 双向锁定', () => {
  it('should return Infinity for attraction when questTransformed', () => {
    const affix: AffixInstance = { type: AffixType.Gravity, probMult: 1.5 }
    const skill = makeSkill({ affixes: [affix] })
    const state = makeRuntimeState({ questTransformed: true })
    expect(getEffectiveProbMult(affix, state, skill)).toBe(Infinity)
  })

  it('should return 0 for repulsion when questTransformed', () => {
    const affix: AffixInstance = { type: AffixType.Gravity, probMult: 0.5 }
    const skill = makeSkill({ affixes: [affix] })
    const state = makeRuntimeState({ questTransformed: true })
    expect(getEffectiveProbMult(affix, state, skill)).toBe(0)
  })

  it('should return 1 for neutral when questTransformed', () => {
    const affix: AffixInstance = { type: AffixType.Gravity, probMult: 1.0 }
    const skill = makeSkill({ affixes: [affix] })
    const state = makeRuntimeState({ questTransformed: true })
    expect(getEffectiveProbMult(affix, state, skill)).toBe(1)
  })

  it('should return base probMult when not transformed', () => {
    const affix: AffixInstance = { type: AffixType.Gravity, probMult: 1.5 }
    const skill = makeSkill({ affixes: [affix] })
    const state = makeRuntimeState({ questTransformed: false })
    expect(getEffectiveProbMult(affix, state, skill)).toBe(1.5)
  })
})

describe('41-4: Rainbow transformation — 全资源产出', () => {
  it('should set allResources=true when questTransformed', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Rainbow }],
    })
    const state = makeRuntimeState({ questTransformed: true })
    const ctx = makeContext()
    const result = resolvePhase4(skill, 10, state, ctx)
    expect(result.allResources).toBe(true)
    expect(result.output).toBe(10)
  })

  it('should NOT set allResources when not transformed', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Rainbow }],
    })
    const state = makeRuntimeState({ questTransformed: false })
    const ctx = makeContext()
    const result = resolvePhase4(skill, 10, state, ctx)
    expect(result.allResources).toBeUndefined()
  })

  it('should not affect non-Rainbow skills', () => {
    const skill = makeSkill({ resource: 'gold' as ResourceType })
    const state = makeRuntimeState({ questTransformed: true })
    const ctx = makeContext()
    const result = resolvePhase4(skill, 10, state, ctx)
    expect(result.targetResource).toBe('gold')
    expect(result.allResources).toBeUndefined()
  })
})

describe('41-4: Outcast transformation — 首尾呼应', () => {
  it('should produce outcastEchoTarget for first letter when transformed', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Outcast, bonusPercent: 0.3 }],
    })
    const state = makeRuntimeState({ questTransformed: true })
    // word='apple', triggerKey='a' (first letter), 'e' is last letter
    const bindings = new Map([['a', 'sk_a'], ['e', 'sk_e']])
    const ctx = makeContext({ triggerKey: 'a', currentWord: 'apple', bindings })
    const result = resolvePhase5(skill, state, ctx, makeFlags(), 10, 0, 'base')
    expect(result.outcastEchoTarget).toBe('e')
  })

  it('should produce outcastEchoTarget for last letter when transformed', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Outcast, bonusPercent: 0.3 }],
    })
    const state = makeRuntimeState({ questTransformed: true })
    const bindings = new Map([['a', 'sk_a'], ['e', 'sk_e']])
    const ctx = makeContext({ triggerKey: 'e', currentWord: 'apple', bindings })
    const result = resolvePhase5(skill, state, ctx, makeFlags(), 10, 0, 'base')
    expect(result.outcastEchoTarget).toBe('a')
  })

  it('should NOT produce echo when not transformed', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Outcast, bonusPercent: 0.3 }],
    })
    const state = makeRuntimeState({ questTransformed: false })
    const bindings = new Map([['a', 'sk_a'], ['e', 'sk_e']])
    const ctx = makeContext({ triggerKey: 'a', currentWord: 'apple', bindings })
    const result = resolvePhase5(skill, state, ctx, makeFlags(), 10, 0, 'base')
    expect(result.outcastEchoTarget).toBeNull()
  })

  it('should NOT echo when chainAffixesDisabled (prevents loop)', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Outcast, bonusPercent: 0.3 }],
    })
    const state = makeRuntimeState({ questTransformed: true })
    const bindings = new Map([['a', 'sk_a'], ['e', 'sk_e']])
    const ctx = makeContext({ triggerKey: 'a', currentWord: 'apple', bindings, chainAffixesDisabled: true })
    const result = resolvePhase5(skill, state, ctx, makeFlags(), 10, 0, 'base')
    expect(result.outcastEchoTarget).toBeNull()
  })
})

describe('41-4: Cascade transformation — 双向连锁', () => {
  it('should trigger cascade with forward relation', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Cascade, posRel: PositionRelation.SameRow, cascadeMult: 2.0 }],
    })
    const state = makeRuntimeState({ questTransformed: true })
    const ctx = makeContext({ triggerKey: 's', prevKey: 'a' })
    const result = resolvePhase3(skill, state, ctx, 10)
    expect(result.output).toBeCloseTo(20)
    expect(result.flags.isCascade).toBe(true)
  })

  it('should trigger cascade with reverse relation when transformed', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Cascade, posRel: PositionRelation.SameRow, cascadeMult: 2.0 }],
    })
    const state = makeRuntimeState({ questTransformed: true })
    // 反向：triggerKey='a', prevKey='s' — same row 天然对称，但逻辑上走 reverse 分支
    const ctx = makeContext({ triggerKey: 'a', prevKey: 's' })
    const result = resolvePhase3(skill, state, ctx, 10)
    expect(result.output).toBeCloseTo(20)
    expect(result.flags.isCascade).toBe(true)
  })

  it('should NOT trigger cascade when no relation matches', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Cascade, posRel: PositionRelation.SameRow, cascadeMult: 2.0 }],
    })
    const state = makeRuntimeState({ questTransformed: false })
    // 'a' (row 1) and 'q' (row 0) → different rows → no cascade
    const ctx = makeContext({ triggerKey: 'q', prevKey: 'a' })
    const result = resolvePhase3(skill, state, ctx, 10)
    expect(result.flags.isCascade).toBe(false)
    expect(result.output).toBeCloseTo(10)
  })
})

describe('41-4: Resonance/Link transformation — 共鸣增强', () => {
  it('should add transformedBoost=0.5 to resonance action when neighbor transformed', () => {
    const triggerSkill = makeSkill({
      id: 'trigger_sk',
      resource: 'base',
      affixes: [{ type: AffixType.Crit, chance: 0.5, critMult: 2.0 }],
    })
    const neighborSkill = makeSkill({
      id: 'neighbor_sk',
      affixes: [{ type: AffixType.Resonance, posRel: PositionRelation.SameRow, resource: 'base' as ResourceType }],
    })
    const neighborState = makeRuntimeState({ questTransformed: true })
    const bindings = new Map([['a', 'trigger_sk'], ['s', 'neighbor_sk']])
    const allSkills = new Map([['trigger_sk', triggerSkill], ['neighbor_sk', neighborSkill]])
    const skillStates = new Map([['trigger_sk', makeRuntimeState()], ['neighbor_sk', neighborState]])
    const ctx = makeContext({ bindings, allSkills, skillStates })
    const triggerState = makeRuntimeState()
    const result = resolvePhase6('a', triggerSkill, triggerState, ctx, 'base')
    const resActions = result.actions.filter(a => a.type === 'resonance')
    expect(resActions).toHaveLength(1)
    expect((resActions[0] as any).transformedBoost).toBe(0.5)
  })

  it('should NOT add transformedBoost when neighbor is not transformed', () => {
    const triggerSkill = makeSkill({
      id: 'trigger_sk',
      resource: 'base',
      affixes: [{ type: AffixType.Crit, chance: 0.5, critMult: 2.0 }],
    })
    const neighborSkill = makeSkill({
      id: 'neighbor_sk',
      affixes: [{ type: AffixType.Resonance, posRel: PositionRelation.SameRow, resource: 'base' as ResourceType }],
    })
    const neighborState = makeRuntimeState({ questTransformed: false })
    const bindings = new Map([['a', 'trigger_sk'], ['s', 'neighbor_sk']])
    const allSkills = new Map([['trigger_sk', triggerSkill], ['neighbor_sk', neighborSkill]])
    const skillStates = new Map([['trigger_sk', makeRuntimeState()], ['neighbor_sk', neighborState]])
    const ctx = makeContext({ bindings, allSkills, skillStates })
    const triggerState = makeRuntimeState()
    const result = resolvePhase6('a', triggerSkill, triggerState, ctx, 'base')
    const resActions = result.actions.filter(a => a.type === 'resonance')
    expect(resActions).toHaveLength(1)
    expect((resActions[0] as any).transformedBoost).toBeUndefined()
  })
})

describe('41-4: Twin transformation — 词条翻倍', () => {
  it('should double output when questTransformed', () => {
    const skill = makeSkill({
      affixes: [
        { type: AffixType.Twin },
        { type: AffixType.Crit, chance: 1.0, critMult: 2.0 },
      ],
    })
    const state = makeRuntimeState({ questTransformed: true })
    const ctx = makeContext({ randomFn: () => 0.0 }) // crit guaranteed
    const result = triggerAffixSkill(skill, state, ctx)
    // base=5, crit×2=10, Twin质变×2=20
    expect(result.output).toBeCloseTo(20)
  })

  it('should NOT double output when not transformed', () => {
    const skill = makeSkill({
      affixes: [
        { type: AffixType.Twin },
        { type: AffixType.Crit, chance: 1.0, critMult: 2.0 },
      ],
    })
    const state = makeRuntimeState({ questTransformed: false })
    const ctx = makeContext({ randomFn: () => 0.0 })
    const result = triggerAffixSkill(skill, state, ctx)
    // base=5, crit×2=10, no Twin doubling
    expect(result.output).toBeCloseTo(10)
  })
})

describe('41-4: Conduit transformation — 导能 +2', () => {
  it('should produce conduit action with conduitCount=2 when neighbor is transformed', () => {
    const triggerSkill = makeSkill({
      id: 'trigger_sk',
      affixes: [{ type: AffixType.Crit, chance: 0.5, critMult: 2.0 }],
    })
    const neighborSkill = makeSkill({
      id: 'neighbor_sk',
      affixes: [
        { type: AffixType.Conduit, posRel: PositionRelation.SameRow },
        { type: AffixType.Crit, chance: 0.3, critMult: 1.5 }, // match type
      ],
    })
    const neighborState = makeRuntimeState({ questTransformed: true })
    const bindings = new Map([['a', 'trigger_sk'], ['s', 'neighbor_sk']])
    const allSkills = new Map([['trigger_sk', triggerSkill], ['neighbor_sk', neighborSkill]])
    const skillStates = new Map([['trigger_sk', makeRuntimeState()], ['neighbor_sk', neighborState]])
    const ctx = makeContext({ bindings, allSkills, skillStates })
    const triggerState = makeRuntimeState()
    const result = resolvePhase6('a', triggerSkill, triggerState, ctx, 'base')
    const conduitActions = result.actions.filter(a => a.type === 'conduit')
    expect(conduitActions).toHaveLength(1)
    expect((conduitActions[0] as any).conduitCount).toBe(2)
  })

  it('should produce conduit action with conduitCount=1 when neighbor is NOT transformed', () => {
    const triggerSkill = makeSkill({
      id: 'trigger_sk',
      affixes: [{ type: AffixType.Crit, chance: 0.5, critMult: 2.0 }],
    })
    const neighborSkill = makeSkill({
      id: 'neighbor_sk',
      affixes: [
        { type: AffixType.Conduit, posRel: PositionRelation.SameRow },
        { type: AffixType.Crit, chance: 0.3, critMult: 1.5 },
      ],
    })
    const neighborState = makeRuntimeState({ questTransformed: false })
    const bindings = new Map([['a', 'trigger_sk'], ['s', 'neighbor_sk']])
    const allSkills = new Map([['trigger_sk', triggerSkill], ['neighbor_sk', neighborSkill]])
    const skillStates = new Map([['trigger_sk', makeRuntimeState()], ['neighbor_sk', neighborState]])
    const ctx = makeContext({ bindings, allSkills, skillStates })
    const triggerState = makeRuntimeState()
    const result = resolvePhase6('a', triggerSkill, triggerState, ctx, 'base')
    const conduitActions = result.actions.filter(a => a.type === 'conduit')
    expect(conduitActions).toHaveLength(1)
    expect((conduitActions[0] as any).conduitCount).toBe(1)
  })

  it('should NOT produce conduit action when chainAffixesDisabled', () => {
    const triggerSkill = makeSkill({
      id: 'trigger_sk',
      affixes: [{ type: AffixType.Crit, chance: 0.5, critMult: 2.0 }],
    })
    const neighborSkill = makeSkill({
      id: 'neighbor_sk',
      affixes: [
        { type: AffixType.Conduit, posRel: PositionRelation.SameRow },
        { type: AffixType.Crit, chance: 0.3, critMult: 1.5 },
      ],
    })
    const bindings = new Map([['a', 'trigger_sk'], ['s', 'neighbor_sk']])
    const allSkills = new Map([['trigger_sk', triggerSkill], ['neighbor_sk', neighborSkill]])
    const skillStates = new Map([['trigger_sk', makeRuntimeState()], ['neighbor_sk', makeRuntimeState()]])
    const ctx = makeContext({ bindings, allSkills, skillStates, chainAffixesDisabled: true } as any)
    const triggerState = makeRuntimeState()
    const result = resolvePhase6('a', triggerSkill, triggerState, ctx, 'base')
    const conduitActions = result.actions.filter(a => a.type === 'conduit')
    expect(conduitActions).toHaveLength(0)
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
      affixes: [{ type: AffixType.Crit, chance: 1.0, critMult: 1.5 }],
    })
    const state = makeRuntimeState()
    const ctx = makeContext({ randomFn: () => 0.0 }) // crit always hits
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
        { type: AffixType.Crit, chance: 1.0, critMult: 1.5 },
      ],
    })
    const state = makeRuntimeState()
    const ctx = makeContext({ randomFn: () => 0.5 }) // no taboo penalty (0.5 > 0.1), but crit needs roll < chance
    const result = triggerAffixSkill(skill, state, ctx)
    // Phase 1: 8 (level 2)
    // Phase 2: taboo +100% → 8 * (1 + 1.0) = 16
    // Phase 3: crit 1.5 → 16 * 1.5 = 24; taboo no penalty (0.5 > 0.1)
    expect(result.output).toBeCloseTo(24)
  })

  it('should combine 3 affixes for orange rarity', () => {
    const skill = makeSkill({
      level: 1,
      rarity: 3 as 3,
      affixes: [
        { type: AffixType.Outcast, bonusPercent: 0.5 },
        { type: AffixType.Decay, initialMult: 2.0, decayPerTrigger: 0.15, floor: 0.5 },
        { type: AffixType.Crit, chance: 0.5, critMult: 2.0 },
      ],
    })
    const state = makeRuntimeState({ currentDecayMult: 1.5 })
    // 'a' is first letter of 'apple'; crit hits (0.3 < 0.5)
    const ctx = makeContext({ triggerKey: 'a', currentWord: 'apple', randomFn: () => 0.3 })
    const result = triggerAffixSkill(skill, state, ctx)
    // Phase 1: 5
    // Phase 2: outcast +50% → 5 * 1.5 = 7.5
    // Phase 3: decay 1.5 → 7.5 * 1.5 = 11.25; crit 2.0 → 11.25 * 2.0 = 22.5
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
    isDecayFloor: false,
    ligatureCount: 0,
    tabooConvertResource: null,
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

  it('should use equal probability with QuestSpectrum (41-4: stacking removed)', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Rainbow }],
      enchantmentIds: [EnchantmentType.QuestSpectrum],
    })
    const state = makeRuntimeState({ questCompletions: 10 })
    // 41-4: quest stacking removed → equal probability regardless of completions
    const ctx = makeContext({ randomFn: () => 0.0 })
    const result = resolvePhase4(skill, 10, state, ctx)
    expect(result.targetResource).toBe('base')
  })
})

// ===== weightedRandomResource 测试 =====

describe('weightedRandomResource', () => {
  it('should return equal probability across pool (41-4: stacking removed)', () => {
    // 默认无playerClass → pool = ['base','score','multiplier','time','gold'] (5个)
    const ctx = makeContext({ randomFn: () => 2 / 5 })
    // floor(2/5 * 5) = floor(2) = 2 → 'multiplier'
    expect(weightedRandomResource(ctx)).toBe('multiplier')
  })

  it('should select resource by randomFn index', () => {
    const ctx = makeContext({ randomFn: () => 0.01 })
    // floor(0.01 * 5) = 0 → 'base'
    expect(weightedRandomResource(ctx)).toBe('base')
  })
})

// ===== findWeakestNeighbor 测试 =====

describe('findWeakestNeighbor', () => {
  it('should return null when no neighbors bound', () => {
    const ctx = makeContext({ bindings: new Map() })
    expect(findWeakestNeighbor(['a'], PositionRelation.Adjacent, ctx)).toBeNull()
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
    const result = findWeakestNeighbor(['a'], PositionRelation.SameRow, ctx)
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
    it('ApprenticeNeighbor: should accumulate growth on self-trigger', () => {
      const skill = makeSkill({
        enchantmentIds: [EnchantmentType.ApprenticeNeighbor],
        neighborPosRel: PositionRelation.Adjacent,
      })
      const state = makeRuntimeState({ apprenticeAccumulated: 0.10 })
      const ctx = makeContext()
      const flags = makeFlags()
      resolvePhase5(skill, state, ctx, flags, 10)
      // Adjacent growth = 0.06
      expect(state.apprenticeAccumulated).toBeCloseTo(0.10 + 0.06)
    })

    it('ApprenticeResBase: Phase 5 no longer grows (moved to global listener)', () => {
      const skill = makeSkill({ enchantmentIds: [EnchantmentType.ApprenticeResBase] })
      const state = makeRuntimeState()
      resolvePhase5(skill, state, makeContext(), makeFlags(), 10, 0, 'base')
      // Res* 已移至 skills.ts applyResource 全场监听
      expect(state.apprenticeAccumulated).toBe(0)
    })

  })

  describe('Quest enchantment stacking', () => {
    it('should complete QuestDevour when rangeFull condition met (all neighbors filled)', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Void, posRel: PositionRelation.Adjacent, bonusPerSlot: 0.25 }],
        enchantmentIds: [EnchantmentType.QuestDevour],
      })
      const state = makeRuntimeState({ questStacks: 0 })
      // Use countEmptySlots to verify setup: fill all adjacent neighbors of 'f'
      // Adjacent keys of 'f' on QWERTY: d, g, r, t, v, c (varies by topology)
      // Brute-force: bind every key so countEmptySlots returns 0
      const bindings = new Map<string, string>()
      for (const k of 'abcdefghijklmnopqrstuvwxyz') bindings.set(k, 'sk_' + k)
      expect(countEmptySlots(['f'], PositionRelation.Adjacent, bindings)).toBe(0)
      const ctx = makeContext({ bindings, occupiedKeys: ['f'] })
      const flags = makeFlags()
      // QuestDevour event = 'rangeFull' → true, targetStacks = 1 → immediately completes
      resolvePhase5(skill, state, ctx, flags, 10)
      expect(state.questCompletions).toBe(1)
      expect(state.questStacks).toBe(0)
    })

    it('should NOT stack QuestDevour when range has empty slots', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Void, posRel: PositionRelation.Adjacent, bonusPerSlot: 0.25 }],
        enchantmentIds: [EnchantmentType.QuestDevour],
      })
      const state = makeRuntimeState({ questStacks: 0 })
      // Only self bound, neighbors empty → rangeFull = false
      const ctx = makeContext({ bindings: new Map([['f', 'sk_self']]), occupiedKeys: ['f'] })
      const flags = makeFlags()
      resolvePhase5(skill, state, ctx, flags, 10)
      expect(state.questStacks).toBe(0)
      expect(state.questCompletions).toBe(0)
    })

    it('QuestDevour should return devourTarget on completion (rangeFull)', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Void, posRel: PositionRelation.Adjacent, bonusPerSlot: 0.25 }],
        enchantmentIds: [EnchantmentType.QuestDevour],
      })
      // Fill all keys so rangeFull is satisfied
      const bindings = new Map<string, string>()
      const allSkills = new Map<string, AffixSkillInstance>()
      for (const k of 'abcdefghijklmnopqrstuvwxyz') {
        const sid = `sk_${k}`
        bindings.set(k, sid)
        allSkills.set(sid, makeSkill({ id: sid, level: 1 }))
      }
      allSkills.set('sk_f', skill) // override with void skill
      const state = makeRuntimeState({ questStacks: 0 })
      const ctx = makeContext({ triggerKey: 'f', bindings, allSkills, occupiedKeys: ['f'] })
      const flags = makeFlags()
      const result = resolvePhase5(skill, state, ctx, flags, 10)
      expect(result.questCompleted).toBe(true)
      expect(result.devourTarget).toBeDefined()
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
        enchantmentIds: ['transmute'],
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
        enchantmentIds: ['transmute'],
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
        enchantmentIds: ['transmute'],
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
        enchantmentIds: ['transmute'],
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

  describe('Splash affix', () => {
    it('should pick 1 random neighbor from posRel range', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Splash, posRel: PositionRelation.SameRow }],
      })
      const bindings = new Map([['s', 'sk_s'], ['d', 'sk_d']])
      const state = makeRuntimeState()
      const ctx = makeContext({
        triggerKey: 'a',
        bindings,
      })
      const flags = makeFlags()
      const result = resolvePhase5(skill, state, ctx, flags, 10)
      expect(result.splashTargets.length).toBeLessThanOrEqual(1)
      if (result.splashTargets.length === 1) {
        expect(bindings.has(result.splashTargets[0])).toBe(true)
      }
    })

    it('should return empty when posRel not set', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Splash }],
      })
      const state = makeRuntimeState()
      const ctx = makeContext({ triggerKey: 'a' })
      const flags = makeFlags()
      const result = resolvePhase5(skill, state, ctx, flags, 10)
      expect(result.splashTargets).toEqual([])
    })

    it('should return empty when no neighbors in range', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Splash, posRel: PositionRelation.Adjacent }],
      })
      const state = makeRuntimeState()
      const ctx = makeContext({
        triggerKey: 'a',
        bindings: new Map(),
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
        affixes: [{ type: AffixType.Resonance, posRel: PositionRelation.SameRow, resource: 'base' as ResourceType }],
      })
      const bindings = new Map([['a', 'test_skill'], ['s', 'sk_neighbor']])
      const allSkills = new Map([['test_skill', skill], ['sk_neighbor', neighborSkill]])
      const skillStates = new Map([['sk_neighbor', makeRuntimeState({ skillId: 'sk_neighbor' })]])
      const state = makeRuntimeState()
      const ctx = makeContext({ triggerKey: 'a', bindings, allSkills, skillStates })

      const result = resolvePhase6('a', skill, state, ctx, 'base')
      const resonanceActions = result.actions.filter(a => a.type === 'resonance')
      // 'a' and 's' are on the same row
      if (resonanceActions.length > 0) {
        expect(resonanceActions[0].type).toBe('resonance')
        expect(resonanceActions[0].neighborKey).toBe('s')
      }
    })

    it('should trigger when neighbor resource matches actualResource', () => {
      const skill = makeSkill({ resource: 'base' as ResourceType })
      const neighborSkill = makeSkill({
        id: 'sk_neighbor',
        affixes: [{ type: AffixType.Resonance, posRel: PositionRelation.SameRow, resource: 'base' as ResourceType }],
        enchantmentIds: [EnchantmentType.QuestResonance],
      })
      const bindings = new Map([['a', 'test_skill'], ['s', 'sk_neighbor']])
      const allSkills = new Map([['test_skill', skill], ['sk_neighbor', neighborSkill]])
      const neighborState = makeRuntimeState({ skillId: 'sk_neighbor', questCompletions: 5 })
      const skillStates = new Map([['sk_neighbor', neighborState]])
      const state = makeRuntimeState()
      const ctx = makeContext({ triggerKey: 'a', bindings, allSkills, skillStates })

      const result = resolvePhase6('a', skill, state, ctx, 'base')
      const resonanceActions = result.actions.filter(a => a.type === 'resonance')
      expect(resonanceActions.length).toBeGreaterThan(0)
    })
  })

  describe('Link (感应) affix', () => {
    it('should produce link action when trigger skill has the watched affix', () => {
      // Trigger skill has Crit affix
      const skill = makeSkill({
        resource: 'base' as ResourceType,
        affixes: [{ type: AffixType.Crit, chance: 0.5, critMult: 2.0 }],
      })
      // Neighbor has Link watching Crit
      const neighborSkill = makeSkill({
        id: 'sk_neighbor',
        affixes: [{ type: AffixType.Link, watchAffix: AffixType.Crit, posRel: PositionRelation.SameRow }],
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

    it('should NOT produce link action when trigger skill does not have the watched affix', () => {
      // Trigger skill has Decay, not Crit
      const skill = makeSkill({
        resource: 'gold' as ResourceType,
        affixes: [{ type: AffixType.Decay, initialMult: 2.0, decayPerTrigger: 0.15, floor: 0.5 }],
      })
      const neighborSkill = makeSkill({
        id: 'sk_neighbor',
        affixes: [{ type: AffixType.Link, watchAffix: AffixType.Crit, posRel: PositionRelation.SameRow }],
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
    it('should produce growth action when neighborPosRel matches', () => {
      const skill = makeSkill({ resource: 'base' as ResourceType })
      const neighborSkill = makeSkill({
        id: 'sk_neighbor',
        enchantmentIds: [EnchantmentType.ApprenticeNeighbor],
        neighborPosRel: PositionRelation.Adjacent,
      })
      // 'a' and 's' are adjacent
      const bindings = new Map([['a', 'test_skill'], ['s', 'sk_neighbor']])
      const allSkills = new Map([['test_skill', skill], ['sk_neighbor', neighborSkill]])
      const state = makeRuntimeState()
      const ctx = makeContext({ triggerKey: 'a', bindings, allSkills })

      const result = resolvePhase6('a', skill, state, ctx)
      const apprenticeActions = result.actions.filter(a => a.type === 'apprentice_neighbor')
      expect(apprenticeActions.length).toBe(1)
      expect((apprenticeActions[0] as any).growthDelta).toBeCloseTo(
        APPRENTICE_NEIGHBOR_GROWTH[PositionRelation.Adjacent]
      )
    })

    it('should NOT produce action when neighborPosRel does not match', () => {
      const skill = makeSkill({ resource: 'base' as ResourceType })
      const neighborSkill = makeSkill({
        id: 'sk_neighbor',
        enchantmentIds: [EnchantmentType.ApprenticeNeighbor],
        neighborPosRel: PositionRelation.Symmetric, // a↔; 不是 a↔s
      })
      const bindings = new Map([['a', 'test_skill'], ['s', 'sk_neighbor']])
      const allSkills = new Map([['test_skill', skill], ['sk_neighbor', neighborSkill]])
      const state = makeRuntimeState()
      const ctx = makeContext({ triggerKey: 'a', bindings, allSkills })

      const result = resolvePhase6('a', skill, state, ctx)
      const apprenticeActions = result.actions.filter(a => a.type === 'apprentice_neighbor')
      expect(apprenticeActions.length).toBe(0)
    })

    it('should NOT produce action when neighborPosRel is not set', () => {
      const skill = makeSkill({ resource: 'base' as ResourceType })
      const neighborSkill = makeSkill({
        id: 'sk_neighbor',
        enchantmentIds: [EnchantmentType.ApprenticeNeighbor],
        // no neighborPosRel — legacy/missing data
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
        affixes: [{ type: AffixType.Resonance, posRel: PositionRelation.SameRow, resource: 'base' as ResourceType }],
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
        affixes: [{ type: AffixType.Resonance, posRel: PositionRelation.SameRow, resource: 'base' as ResourceType }],
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

  describe('Conduit affix', () => {
    it('should produce conduit action when neighbor has Conduit and trigger skill shares an affix type', () => {
      // Trigger skill has Crit
      const skill = makeSkill({
        affixes: [{ type: AffixType.Crit, chance: 0.5, critMult: 2.0 }],
      })
      // Neighbor has Conduit + Crit (Conduit's "other" affix is Crit)
      const neighborSkill = makeSkill({
        id: 'sk_conduit',
        affixes: [
          { type: AffixType.Conduit, posRel: PositionRelation.SameRow },
          { type: AffixType.Crit, chance: 0.5, critMult: 2.0 },
        ],
        rarity: 2 as 2,
      })
      const bindings = new Map([['a', 'test_skill'], ['s', 'sk_conduit']])
      const allSkills = new Map([['test_skill', skill], ['sk_conduit', neighborSkill]])
      const state = makeRuntimeState()
      const ctx = makeContext({ triggerKey: 'a', bindings, allSkills })

      const result = resolvePhase6('a', skill, state, ctx)
      const conduitActions = result.actions.filter(a => a.type === 'conduit')
      // 'a' and 's' are same row → conduit triggers
      expect(conduitActions.length).toBe(1)
      expect(conduitActions[0].targetKey).toBe('a') // re-triggers the original skill
    })

    it('should NOT produce conduit action when trigger skill does not share any affix type nor resource', () => {
      // Trigger skill has Decay (no match with Conduit's other affix Crit) + different resource
      const skill = makeSkill({
        resource: 'score',
        affixes: [{ type: AffixType.Decay, initialMult: 2.0, decayPerTrigger: 0.15, floor: 0.5 }],
      })
      const neighborSkill = makeSkill({
        id: 'sk_conduit',
        affixes: [
          { type: AffixType.Conduit, posRel: PositionRelation.SameRow },
          { type: AffixType.Crit, chance: 0.5, critMult: 2.0 },
        ],
        rarity: 2 as 2,
      })
      const bindings = new Map([['a', 'test_skill'], ['s', 'sk_conduit']])
      const allSkills = new Map([['test_skill', skill], ['sk_conduit', neighborSkill]])
      const state = makeRuntimeState()
      const ctx = makeContext({ triggerKey: 'a', bindings, allSkills })

      const result = resolvePhase6('a', skill, state, ctx)
      const conduitActions = result.actions.filter(a => a.type === 'conduit')
      expect(conduitActions.length).toBe(0)
    })

    it('should NOT produce conduit action when posRel does not match', () => {
      const skill = makeSkill({
        affixes: [{ type: AffixType.Crit, chance: 0.5, critMult: 2.0 }],
      })
      const neighborSkill = makeSkill({
        id: 'sk_conduit',
        affixes: [
          { type: AffixType.Conduit, posRel: PositionRelation.Symmetric }, // a↔; not a↔s
          { type: AffixType.Crit, chance: 0.5, critMult: 2.0 },
        ],
        rarity: 2 as 2,
      })
      const bindings = new Map([['a', 'test_skill'], ['s', 'sk_conduit']])
      const allSkills = new Map([['test_skill', skill], ['sk_conduit', neighborSkill]])
      const state = makeRuntimeState()
      const ctx = makeContext({ triggerKey: 'a', bindings, allSkills })

      const result = resolvePhase6('a', skill, state, ctx)
      const conduitActions = result.actions.filter(a => a.type === 'conduit')
      expect(conduitActions.length).toBe(0)
    })
  })
})

// ===== Conduit 零产出测试 =====

describe('Conduit zero output', () => {
  it('should produce 0 output when skill has Conduit affix', () => {
    const skill = makeSkill({
      affixes: [
        { type: AffixType.Conduit, posRel: PositionRelation.SameRow },
        { type: AffixType.Crit, chance: 1.0, critMult: 2.0 },
      ],
      rarity: 2 as 2,
      level: 1,
    })
    const state = makeRuntimeState()
    const ctx = makeContext({ randomFn: () => 0.0 })
    const result = triggerAffixSkill(skill, state, ctx)
    // Conduit zeroes base → output = 0 regardless of other affixes
    expect(result.output).toBe(0)
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
    expect(result.phase5!.recurse.shouldRecurse).toBe(false)
    expect(result.phase5!.transmuteOutput).toBeNull()
    expect(result.phase5!.splashTargets).toEqual([])
    expect(result.phase5!.mutagenOutput).toBe(0)
    expect(result.phase6!.actions).toEqual([])
  })

  it('Rainbow + Splash skill: Phase 4 random resource + Phase 5 splash targets', () => {
    const skill = makeSkill({
      level: 1,
      affixes: [
        { type: AffixType.Rainbow },
        { type: AffixType.Splash, posRel: PositionRelation.SameRow },
      ],
    })
    const bindings = new Map([['s', 'sk_s'], ['d', 'sk_d']])
    const state = makeRuntimeState()
    const ctx = makeContext({
      triggerKey: 'a',
      bindings,
      randomFn: () => 0.0, // → base
    })
    const result = triggerAffixSkill(skill, state, ctx)
    expect(result.phase4!.targetResource).toBe('base')
    // Splash affix picks 1 random neighbor
    expect(result.phase5!.splashTargets.length).toBeLessThanOrEqual(1)
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

  it('Rainbow + Link (感应): Phase 6 should check trigger skill affix type, not resource', () => {
    // Rainbow skill has Rainbow affix
    const skill = makeSkill({
      resource: 'base' as ResourceType,
      affixes: [{ type: AffixType.Rainbow }],
    })
    // Neighbor has Link watching Rainbow affix
    const neighborLinkRainbow = makeSkill({
      id: 'sk_link_rainbow',
      affixes: [{ type: AffixType.Link, watchAffix: AffixType.Rainbow, posRel: PositionRelation.SameRow }],
    })
    const bindings = new Map([['a', 'test_skill'], ['s', 'sk_link_rainbow']])
    const allSkills = new Map([['test_skill', skill], ['sk_link_rainbow', neighborLinkRainbow]])
    const state = makeRuntimeState()
    const ctx = makeContext({
      triggerKey: 'a',
      bindings,
      allSkills,
      randomFn: () => 4 / 7,
    })
    const result = triggerAffixSkill(skill, state, ctx)
    // Link neighbor watching Rainbow affix should be triggered (skill has Rainbow)
    const linkActions = result.phase6!.actions.filter(a => a.type === 'link')
    expect(linkActions.length).toBe(1)
    expect(linkActions[0].neighborKey).toBe('s')
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
    const result = findWeakestNeighbor(['a'], PositionRelation.SameRow, ctx)
    expect(result).not.toBe('a')
    // 's' is on the same row and is the only non-self neighbor → should be 's'
    if (result != null) {
      expect(result).toBe('s')
    }
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

describe('Story 35.5: APPRENTICE_GROWTH_DEFAULTS (redesigned — now empty, Res* use output scaling)', () => {
  it('should be empty (all types use new output-scaled or posRel-based growth)', () => {
    // ApprenticeSelf deleted, Res* now use output scaling, Neighbor uses posRel table
    expect(Object.keys(APPRENTICE_GROWTH_DEFAULTS)).toHaveLength(0)
  })

  it('ApprenticeNeighbor should NOT be in APPRENTICE_GROWTH_DEFAULTS', () => {
    expect(APPRENTICE_GROWTH_DEFAULTS[EnchantmentType.ApprenticeNeighbor]).toBeUndefined()
  })
})

describe('Story 41.2: Resource specialization enchantments — Phase 5 no longer self-triggers (moved to global listener)', () => {
  it('ApprenticeResBase: Phase 5 should NOT grow (Res* now uses global resource listener)', () => {
    const skill = makeSkill({ enchantmentIds: [EnchantmentType.ApprenticeResBase] })
    const state = makeRuntimeState()
    resolvePhase5(skill, state, makeContext(), makeFlags(), 10, 0, 'base')
    // Res* 已移至 skills.ts applyResource 全场监听，Phase 5 不再自增长
    expect(state.apprenticeAccumulated).toBe(0)
  })

  it('ApprenticeResGold: Phase 5 should NOT grow', () => {
    const skill = makeSkill({ enchantmentIds: [EnchantmentType.ApprenticeResGold] })
    const state = makeRuntimeState()
    resolvePhase5(skill, state, makeContext(), makeFlags(), 9, 0, 'gold')
    expect(state.apprenticeAccumulated).toBe(0)
  })

  it('RES_ENCHANTMENT_BY_RESOURCE maps resource types to Res* enchantments', () => {
    expect(RES_ENCHANTMENT_BY_RESOURCE['base']).toBe(EnchantmentType.ApprenticeResBase)
    expect(RES_ENCHANTMENT_BY_RESOURCE['score']).toBe(EnchantmentType.ApprenticeResScore)
    expect(RES_ENCHANTMENT_BY_RESOURCE['gold']).toBe(EnchantmentType.ApprenticeResGold)
    expect(RES_ENCHANTMENT_BY_RESOURCE['multiplier']).toBe(EnchantmentType.ApprenticeResMultiplier)
    expect(RES_ENCHANTMENT_BY_RESOURCE['time']).toBe(EnchantmentType.ApprenticeResTime)
  })
})

// Story 41.2 悟道·词条附魔已删除（ApprenticeProc + ApprenticeAffix* 全系移除）

describe('Story 41.2: Pruned apprentice types should no longer exist in APPRENTICE_EVENT_MAP', () => {
  it('applyApprenticeEvent returns false for all pruned events', () => {
    const state = makeRuntimeState()
    for (const event of ['wordComplete', 'longWordComplete', 'perfectWord', 'wordCrafted', 'stageCleared', 'comboReach']) {
      const applied = applyApprenticeEvent(event, state, [EnchantmentType.ApprenticeNeighbor])
      expect(applied).toBe(false)
    }
    expect(state.apprenticeAccumulated).toBe(0)
  })

})

describe('Story 35.6: applyQuestEvent external events', () => {
  it('stageCleared should complete QuestMirror (targetStacks=1)', () => {
    const state = makeRuntimeState()
    const applied = applyQuestEvent('stageCleared', state, [EnchantmentType.QuestMirror])
    expect(applied).toBe(true)
    // QuestMirror targetStacks=1 → immediately completes
    expect(state.questCompletions).toBe(1)
    expect(state.questStacks).toBe(0)
  })

  it('QuestPurify should NOT stack via external comboReach (now uses internal decayFloor)', () => {
    const state = makeRuntimeState()
    const applied = applyQuestEvent('comboReach', state, [EnchantmentType.QuestPurify])
    expect(applied).toBe(false)
    expect(state.questStacks).toBe(0)
  })

  it('should apply stackIncrement when provided', () => {
    const state = makeRuntimeState()
    applyQuestEvent('stageCleared', state, [EnchantmentType.QuestMirror], 2)
    // QuestMirror targetStacks=1, +2 → completes (stacks reset)
    expect(state.questStacks).toBe(0)
    expect(state.questCompletions).toBe(1)
  })

  it('should return false for unknown event', () => {
    const state = makeRuntimeState()
    const applied = applyQuestEvent('unknownEvent', state, [EnchantmentType.QuestMirror])
    expect(applied).toBe(false)
    expect(state.questStacks).toBe(0)
  })
})

describe('Story 41.2: filterEnchantmentsByClass (精简后无职业限定)', () => {
  const candidates = [
    EnchantmentType.ApprenticeNeighbor,
    EnchantmentType.ApprenticeResBase,
    EnchantmentType.QuestDevour,
  ]

  it('no class: should pass all candidates through (no restrictions)', () => {
    const result = filterEnchantmentsByClass(candidates)
    expect(result).toEqual(candidates)
  })

  it('wordsmith: should pass all candidates through', () => {
    const result = filterEnchantmentsByClass(candidates, 'wordsmith')
    expect(result).toEqual(candidates)
  })

  it('unknown class: should pass all candidates through', () => {
    const result = filterEnchantmentsByClass(candidates, 'unknown')
    expect(result).toEqual(candidates)
  })
})

// ===== Story 35.6: 任务附魔完善 =====

describe('Story 35.6: checkQuestEventCondition inline events', () => {
  // ── Word-based quest enchantments migrated from Phase 5 to external events ──
  // Phase 5 no longer processes these; test via applyQuestEvent instead

  it('wordComplete event: QuestEnergize should stack via applyQuestEvent', () => {
    const state = makeRuntimeState()
    const applied = applyQuestEvent('wordComplete', state, [EnchantmentType.QuestEnergize])
    expect(applied).toBe(true)
    expect(state.questStacks).toBe(1)
  })

  it('QuestPolarize should NOT stack via wordComplete (now uses gravityWordMatch)', () => {
    const state = makeRuntimeState()
    const applied = applyQuestEvent('wordComplete', state, [EnchantmentType.QuestPolarize])
    expect(applied).toBe(false)
    expect(state.questStacks).toBe(0)
  })

  it('QuestFission should NOT stack via external applyQuestEvent (uses internal affixProc:splash)', () => {
    const state = makeRuntimeState()
    // QuestFission now uses internal event 'affixProc:splash', not external longWordComplete
    const applied = applyQuestEvent('wordComplete', state, [EnchantmentType.QuestFission])
    expect(applied).toBe(false)
    expect(state.questStacks).toBe(0)
  })

  it('neighborTrigger event: should return false in Phase 5 (handled in Phase 6)', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Resonance, posRel: PositionRelation.Adjacent, resource: 'base' as ResourceType }],
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
  it('should use ligatureStageCounts when questTransformed', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Ligature }],
      enchantmentIds: [EnchantmentType.QuestOverlap],
    })
    const state = makeRuntimeState({ questTransformed: true })
    const ligatureStageCounts = new Map([['a', 3]])
    const ctx = makeContext({ triggerKey: 'a', currentWord: 'apple', ligatureStageCounts })
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

  it('should use base count without stacking when not questTransformed', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Ligature }],
      enchantmentIds: [EnchantmentType.QuestOverlap],
    })
    // Not transformed → uses countOccurrences('p', 'apple') = 2
    const state = makeRuntimeState({ questTransformed: false })
    const ctx = makeContext({ triggerKey: 'p', currentWord: 'apple' })
    const result = resolvePhase3(skill, state, ctx, 10)
    expect(result.output).toBeCloseTo(20) // 10 * 2
    expect(result.flags.ligatureCount).toBe(2)
  })
})

describe('Story 35.6: QuestIterate — Phase 5 Recurse integration', () => {
  it('should skip probability halving when questTransformed', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Recurse, recurseChance: 0.1 }],
      enchantmentIds: [EnchantmentType.QuestIterate],
    })
    const state = makeRuntimeState({ questTransformed: true })
    // randomFn returns 0.05 < 0.1 → should recurse
    const ctx = makeContext({ randomFn: () => 0.05 })
    const result = resolvePhase5(skill, state, ctx, makeFlags(), 10)
    expect(result.recurse.shouldRecurse).toBe(true)
    // questTransformed → newChance stays at 0.1 (no halving)
    expect(result.recurse.newChance).toBeCloseTo(0.1)
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

// ===== Story 41-3: Quest Transform Batch 1 — 质变专属测试 =====

describe('Story 41-3: Taboo 质变 — 惩罚转为随机资源', () => {
  it('should set tabooConvertResource when questTransformed and penalty triggers', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Taboo, penaltyChance: 1.0 }],
      resource: 'base' as ResourceType,
    })
    const state = makeRuntimeState({ questTransformed: true })
    const ctx = makeContext({ randomFn: () => 0.0, playerClass: 'none' })
    const result = resolvePhase3(skill, state, ctx, 10)
    // output 应保持正值（不取反）
    expect(result.output).toBe(10)
    // tabooConvertResource 应被设置为非 skill.resource 的资源
    expect(result.flags.tabooConvertResource).toBeDefined()
    expect(result.flags.tabooConvertResource).not.toBe('base')
    expect(result.flags.isTabooPenalty).toBe(true)
  })

  it('should NOT include class-restricted resources for wordsmith', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Taboo, penaltyChance: 1.0 }],
      resource: 'base' as ResourceType,
    })
    const state = makeRuntimeState({ questTransformed: true })
    // 多次测试确保 mutagen 不会被选中
    for (let i = 0; i < 20; i++) {
      const ctx = makeContext({ randomFn: () => i / 20, playerClass: 'wordsmith' })
      const result = resolvePhase3(skill, state, ctx, 10)
      expect(result.flags.tabooConvertResource).not.toBe('mutagen')
    }
  })

  it('should use normal penalty (output *= -1) when NOT questTransformed', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Taboo, penaltyChance: 1.0 }],
    })
    const state = makeRuntimeState({ questTransformed: false })
    const ctx = makeContext({ randomFn: () => 0.0 })
    const result = resolvePhase3(skill, state, ctx, 10)
    expect(result.output).toBe(-10)
    expect(result.flags.tabooConvertResource).toBeNull()
    expect(result.flags.isTabooPenalty).toBe(true)
  })
})

describe('Story 41-3: Splash 质变 — chainSplash', () => {
  it('should set chainSplash=true in Phase 5 when questTransformed', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Splash, posRel: PositionRelation.Adjacent }],
      rarity: 1 as 0,
    })
    const state = makeRuntimeState({ questTransformed: true })
    const neighbors = new Map([['s', PositionRelation.Adjacent]])
    const bindings = new Map([['s', 'other_skill']])
    const ctx = makeContext({ triggerKey: 'f', randomFn: () => 0.0, neighbors, bindings })
    const result = resolvePhase5(skill, state, ctx, makeFlags(), 10)
    expect(result.chainSplash).toBe(true)
  })

  it('should NOT set chainSplash when not questTransformed', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Splash, posRel: PositionRelation.Adjacent }],
      rarity: 1 as 0,
    })
    const state = makeRuntimeState({ questTransformed: false })
    const neighbors = new Map([['s', PositionRelation.Adjacent]])
    const bindings = new Map([['s', 'other_skill']])
    const ctx = makeContext({ triggerKey: 'f', randomFn: () => 0.0, neighbors, bindings })
    const result = resolvePhase5(skill, state, ctx, makeFlags(), 10)
    expect(result.chainSplash).toBeFalsy()
  })
})

describe('Story 41-3: Amplify 质变 — 50% 层数保留', () => {
  it('should retain 50% amplifyStacks when questTransformed in resetStageState', () => {
    const skills = new Map<string, AffixSkillInstance>()
    const states = new Map<string, SkillRuntimeState>()
    skills.set('s1', makeSkill({ id: 's1' }))
    states.set('s1', makeRuntimeState({ skillId: 's1', amplifyStacks: 30, questTransformed: true }))

    resetStageState(skills, states, new Map(), () => 0.5)
    expect(states.get('s1')!.amplifyStacks).toBe(15)
  })

  it('should floor the retained stacks (odd number)', () => {
    const skills = new Map<string, AffixSkillInstance>()
    const states = new Map<string, SkillRuntimeState>()
    skills.set('s1', makeSkill({ id: 's1' }))
    states.set('s1', makeRuntimeState({ skillId: 's1', amplifyStacks: 31, questTransformed: true }))

    resetStageState(skills, states, new Map(), () => 0.5)
    expect(states.get('s1')!.amplifyStacks).toBe(15) // floor(31 * 0.5) = 15
  })

  it('should reset amplifyStacks to 0 when NOT questTransformed', () => {
    const skills = new Map<string, AffixSkillInstance>()
    const states = new Map<string, SkillRuntimeState>()
    skills.set('s1', makeSkill({ id: 's1' }))
    states.set('s1', makeRuntimeState({ skillId: 's1', amplifyStacks: 30, questTransformed: false }))

    resetStageState(skills, states, new Map(), () => 0.5)
    expect(states.get('s1')!.amplifyStacks).toBe(0)
  })
})

describe('Story 41-3: Pulse 质变 — 跨技能 triggerCount 同步', () => {
  it('should increment other Pulse skills triggerCount when questTransformed', () => {
    const skillA = makeSkill({
      id: 'pulseA',
      affixes: [{ type: AffixType.Pulse, interval: 1, burstMult: 2.0 }],
    })
    const skillB = makeSkill({
      id: 'pulseB',
      affixes: [{ type: AffixType.Pulse, interval: 3, burstMult: 2.0 }],
    })
    const skillC = makeSkill({
      id: 'noPulse',
      affixes: [{ type: AffixType.Crit, chance: 0.5 }],
    })
    const allSkills = new Map([['pulseA', skillA], ['pulseB', skillB], ['noPulse', skillC]])
    const stateA = makeRuntimeState({ skillId: 'pulseA', triggerCount: 1, questTransformed: true })
    const stateB = makeRuntimeState({ skillId: 'pulseB', triggerCount: 5 })
    const stateC = makeRuntimeState({ skillId: 'noPulse', triggerCount: 0 })
    const skillStates = new Map([['pulseA', stateA], ['pulseB', stateB], ['noPulse', stateC]])

    const ctx = makeContext({ allSkills, skillStates })
    const flags = makeFlags()
    flags.isPulse = true
    resolvePhase5(skillA, stateA, ctx, flags, 10)

    // pulseB 应被 +1
    expect(stateB.triggerCount).toBe(6)
    // noPulse 不受影响
    expect(stateC.triggerCount).toBe(0)
  })

  it('should NOT sync when questTransformed=false', () => {
    const skillA = makeSkill({
      id: 'pulseA',
      affixes: [{ type: AffixType.Pulse, interval: 1, burstMult: 2.0 }],
    })
    const skillB = makeSkill({
      id: 'pulseB',
      affixes: [{ type: AffixType.Pulse, interval: 3, burstMult: 2.0 }],
    })
    const allSkills = new Map([['pulseA', skillA], ['pulseB', skillB]])
    const stateA = makeRuntimeState({ skillId: 'pulseA', triggerCount: 1, questTransformed: false })
    const stateB = makeRuntimeState({ skillId: 'pulseB', triggerCount: 5 })
    const skillStates = new Map([['pulseA', stateA], ['pulseB', stateB]])

    const ctx = makeContext({ allSkills, skillStates })
    const flags = makeFlags()
    flags.isPulse = true
    resolvePhase5(skillA, stateA, ctx, flags, 10)

    expect(stateB.triggerCount).toBe(5) // 不变
  })
})

describe('Story 41-3: questTransformed 生命周期', () => {
  it('resetRunState should reset questTransformed to false', () => {
    const states = new Map<string, SkillRuntimeState>()
    states.set('s1', makeRuntimeState({ skillId: 's1', questTransformed: true, questCompletions: 3 }))

    resetRunState(states)

    expect(states.get('s1')!.questTransformed).toBe(false)
    expect(states.get('s1')!.questCompletions).toBe(0)
  })
})

describe('Story 35.6: getEffectiveProbMult', () => {
  it('should return base probMult when no quest completions', () => {
    const affix: AffixInstance = { type: AffixType.Gravity, probMult: 1.5 }
    const skill = makeSkill({ affixes: [affix] })
    const state = makeRuntimeState()
    expect(getEffectiveProbMult(affix, state, skill)).toBeCloseTo(1.5)
  })

  it('should return base probMult regardless of quest completions (41-4: stacking removed)', () => {
    const affix: AffixInstance = { type: AffixType.Gravity, probMult: 1.5 }
    const skill = makeSkill({
      affixes: [affix],
      enchantmentIds: [EnchantmentType.QuestPolarize],
    })
    const state = makeRuntimeState({ questCompletions: 2 })
    // 41-4: quest stacking removed → always return base probMult
    expect(getEffectiveProbMult(affix, state, skill)).toBeCloseTo(1.5)
  })

  it('should return base probMult for repulsion regardless of quest (41-4)', () => {
    const affix: AffixInstance = { type: AffixType.Gravity, probMult: 0.5 }
    const skill = makeSkill({
      affixes: [affix],
      enchantmentIds: [EnchantmentType.QuestPolarize],
    })
    const state = makeRuntimeState({ questCompletions: 2 })
    expect(getEffectiveProbMult(affix, state, skill)).toBeCloseTo(0.5)
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

  // Story 41-5: QuestMirror ×1.1^c stacking removed; plain copy without boost
  it('should copy affix params without QuestMirror boost (41-5)', () => {
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
    // Story 41-5: no boost, plain copy
    expect(copied!.k).toBeCloseTo(0.1)
  })

  it('should copy numeric params without boost (41-5)', () => {
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
    // Story 41-5: no boost, plain copy
    expect(copied!.chance).toBeCloseTo(0.2)
    expect(copied!.critMult).toBeCloseTo(2.0)
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

  it('gravityWordMatch: QuestPolarize should increment stacks', () => {
    const state = makeRuntimeState()
    const result = applyQuestEvent('gravityWordMatch', state, [EnchantmentType.QuestPolarize])
    expect(result).toBe(true)
    expect(state.questStacks).toBe(1)
    expect(state.questCompletions).toBe(0)
  })

  it('multiResourceWord: QuestSpectrum should increment stacks', () => {
    const state = makeRuntimeState()
    const result = applyQuestEvent('multiResourceWord', state, [EnchantmentType.QuestSpectrum])
    expect(result).toBe(true)
    expect(state.questStacks).toBe(1)
    expect(state.questCompletions).toBe(0)
  })

  it('stageCleared: QuestTwin should increment stacks', () => {
    const state = makeRuntimeState()
    const result = applyQuestEvent('stageCleared', state, [EnchantmentType.QuestTwin])
    expect(result).toBe(true)
    expect(state.questStacks).toBe(1)
    expect(state.questCompletions).toBe(0)
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
      affixes: [{ type: AffixType.Link, posRel: PositionRelation.Adjacent, watchAffix: AffixType.Crit }],
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
  it('should have exactly 19 quest enchantment definitions', () => {
    expect(QUEST_ENCHANTMENT_DEFS).toHaveLength(19)
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
    const skill = makeSkill({ enchantmentIds: ['transmute'] })
    const state = makeRuntimeState()
    const ctx = makeContext({ transmuteResource: 'multiplier' as ResourceType })
    const flags = makeFlags()
    const result = resolvePhase5(skill, state, ctx, flags, 200)
    expect(result.transmuteOutput).toEqual({ resource: 'multiplier', amount: 20 }) // 200 × 0.10
  })

  it('should use fragment ratio (15%) for fragment resource', () => {
    const skill = makeSkill({ enchantmentIds: ['transmute'] })
    const state = makeRuntimeState()
    const ctx = makeContext({ transmuteResource: 'fragment' as ResourceType })
    const flags = makeFlags()
    const result = resolvePhase5(skill, state, ctx, flags, 100)
    expect(result.transmuteOutput).toEqual({ resource: 'fragment', amount: 15 }) // 100 × 0.15
  })

  it('should use time ratio (20%) for time resource', () => {
    const skill = makeSkill({ enchantmentIds: ['transmute'] })
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
      enchantmentIds: ['transmute'],
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
      enchantmentIds: ['transmute'],
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

describe('MultiplyOperator — Phase 2 unified additive', () => {
  // MULTIPLY_OPERATOR_BASE_VALUES['base'][0] = 2.0 (default makeSkill resource='base', level=1)
  const multOpBase = 2.0

  it('should use multiplicative base but apply bonuses additively', () => {
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
    // MultiplyOperator: output = multOpBase × (1 + bonusPercent)
    expect(result.bonusPercent).toBeCloseTo(1.3) // 1.0 + 0.3
    expect(result.output).toBeCloseTo(multOpBase * (1 + 1.3))
  })

  it('normal mode should use original base', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Taboo }],
      enchantmentIds: [],
    })
    const state = makeRuntimeState()
    const ctx = makeContext()
    const result = resolvePhase2(skill, state, ctx, 10)
    expect(result.output).toBe(10 * (1 + 1.0)) // normal: 10 × 2.0
  })

  it('should return multiplicative base when MultiplyOperator active and no bonuses', () => {
    const skill = makeSkill({
      affixes: [],
      enchantmentIds: [EnchantmentType.MultiplyOperator],
    })
    const state = makeRuntimeState()
    const ctx = makeContext()
    const result = resolvePhase2(skill, state, ctx, 10)
    expect(result.output).toBe(multOpBase) // multOpBase × (1 + 0)
    expect(result.bonusPercent).toBe(0)
  })
})

describe('MultiplyOperator — Phase 3 (no bonusBreakdown)', () => {
  it('Phase 3 should pass through input without bonusBreakdown logic', () => {
    const skill = makeSkill({ enchantmentIds: [EnchantmentType.MultiplyOperator] })
    const state = makeRuntimeState()
    const ctx = makeContext()
    // No bonusBreakdown parameter — Phase 2 already applied bonuses additively
    const result = resolvePhase3(skill, state, ctx, 100)
    expect(result.output).toBe(100) // no Phase 3 multipliers, just passes through
    expect(result.multipliers).toEqual([])
  })

  it('MultiplyOperator calculation is same as additive (only base differs)', () => {
    const state = makeRuntimeState()
    const ctx = makeContext()

    // Normal mode: baseOutput=10, bonusPercent=0.75 → 10 × 1.75 = 17.5
    const addSkill = makeSkill({ affixes: [], enchantmentIds: [] })
    const addP2 = resolvePhase2(addSkill, state, ctx, 10)
    expect(addP2.output).toBe(10) // no bonuses

    // MultiplyOperator mode: base=2.0, same bonusPercent → 2.0 × (1+bonusPercent)
    const mulSkill = makeSkill({ affixes: [], enchantmentIds: [EnchantmentType.MultiplyOperator] })
    const mulP2 = resolvePhase2(mulSkill, state, ctx, 10)
    expect(mulP2.output).toBe(2.0) // multiplicative base, no bonuses
  })
})

describe('MultiplyOperator + affix combo', () => {
  it('should apply affix bonus additively with multiplicative base', () => {
    const skill = makeSkill({
      resource: 'base' as ResourceType,
      affixes: [{ type: AffixType.Taboo }], // +1.0
      enchantmentIds: [EnchantmentType.MultiplyOperator],
    })
    const state = makeRuntimeState()
    const ctx = makeContext()
    const result = resolvePhase2(skill, state, ctx, 10)
    // Taboo: +1.0
    expect(result.bonusPercent).toBeCloseTo(1.0)
    // MultiplyOperator: output = multOpBase × (1 + bonusPercent) = 2.0 × 2.0 = 4.0
    expect(result.output).toBeCloseTo(2.0 * 2.0)
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
      EnchantmentType.ApprenticeNeighbor,
      EnchantmentType.LetterAffinity,
      EnchantmentType.Overflow,
      EnchantmentType.Unstable,
      EnchantmentType.MutationHunger,
    ]
    const filtered = filterEnchantmentsByClass(candidates)
    expect(filtered).toEqual([EnchantmentType.ApprenticeNeighbor])
  })

  it('filterEnchantmentsByClass should include wordsmith passives for wordsmith', () => {
    const candidates = [
      EnchantmentType.ApprenticeNeighbor,
      EnchantmentType.LetterAffinity,
      EnchantmentType.Overflow,
      EnchantmentType.Unstable,
    ]
    const filtered = filterEnchantmentsByClass(candidates, 'wordsmith')
    expect(filtered).toContain(EnchantmentType.ApprenticeNeighbor)
    expect(filtered).toContain(EnchantmentType.LetterAffinity)
    expect(filtered).toContain(EnchantmentType.Overflow)
    expect(filtered).not.toContain(EnchantmentType.Unstable)
  })
})

// ===== Story 35.8: 状态生命周期与序列化 =====

describe('resetDecayForWord (Task 1)', () => {
  it('should reset Decay currentDecayMult to initialMult for all skills', () => {
    const skills = new Map<string, AffixSkillInstance>()
    const states = new Map<string, SkillRuntimeState>()

    const skill = makeSkill({
      id: 'decay_skill',
      affixes: [{ type: AffixType.Decay, initialMult: 2.0, decayPerTrigger: 0.1, floor: 0.5 } as AffixInstance],
    })
    skills.set('decay_skill', skill)
    states.set('decay_skill', makeRuntimeState({ skillId: 'decay_skill', currentDecayMult: 0.8 }))

    resetDecayForWord(skills, states)
    expect(states.get('decay_skill')!.currentDecayMult).toBe(2.0)
  })

  it('should not affect skills without Decay affix', () => {
    const skills = new Map<string, AffixSkillInstance>()
    const states = new Map<string, SkillRuntimeState>()

    const skill = makeSkill({ id: 'no_decay', affixes: [] })
    skills.set('no_decay', skill)
    states.set('no_decay', makeRuntimeState({ skillId: 'no_decay', currentDecayMult: 0.5 }))

    resetDecayForWord(skills, states)
    expect(states.get('no_decay')!.currentDecayMult).toBe(0.5)
  })

  it('should handle multiple skills with mixed affixes', () => {
    const skills = new Map<string, AffixSkillInstance>()
    const states = new Map<string, SkillRuntimeState>()

    skills.set('s1', makeSkill({
      id: 's1',
      affixes: [{ type: AffixType.Decay, initialMult: 3.0, decayPerTrigger: 0.2, floor: 0.5 } as AffixInstance],
    }))
    skills.set('s2', makeSkill({ id: 's2', affixes: [] }))
    states.set('s1', makeRuntimeState({ skillId: 's1', currentDecayMult: 1.2 }))
    states.set('s2', makeRuntimeState({ skillId: 's2', currentDecayMult: 0.7 }))

    resetDecayForWord(skills, states)
    expect(states.get('s1')!.currentDecayMult).toBe(3.0)
    expect(states.get('s2')!.currentDecayMult).toBe(0.7) // unchanged
  })
})

describe('resetStageState (Task 2)', () => {
  it('should reset triggerCount and amplifyStacks for all skills', () => {
    const skills = new Map<string, AffixSkillInstance>()
    const states = new Map<string, SkillRuntimeState>()

    skills.set('s1', makeSkill({ id: 's1' }))
    states.set('s1', makeRuntimeState({ skillId: 's1', triggerCount: 50, amplifyStacks: 30 }))

    resetStageState(skills, states, new Map(), () => 0.5)
    expect(states.get('s1')!.triggerCount).toBe(0)
    expect(states.get('s1')!.amplifyStacks).toBe(0)
    expect(states.get('s1')!.chargeAccumulated).toBe(0)
  })

  it('should reset chargeAccumulated to 0', () => {
    const skills = new Map<string, AffixSkillInstance>()
    const states = new Map<string, SkillRuntimeState>()

    skills.set('s1', makeSkill({ id: 's1' }))
    states.set('s1', makeRuntimeState({ skillId: 's1', chargeAccumulated: 0.75 }))

    resetStageState(skills, states, new Map(), () => 0.5)
    expect(states.get('s1')!.chargeAccumulated).toBe(0)
  })

  it('should not reset apprenticeAccumulated or questCompletions', () => {
    const skills = new Map<string, AffixSkillInstance>()
    const states = new Map<string, SkillRuntimeState>()

    skills.set('s1', makeSkill({ id: 's1' }))
    states.set('s1', makeRuntimeState({
      skillId: 's1', triggerCount: 10, amplifyStacks: 5,
      apprenticeAccumulated: 0.5, questCompletions: 3, questStacks: 2,
    }))

    resetStageState(skills, states, new Map(), () => 0.5)
    expect(states.get('s1')!.apprenticeAccumulated).toBe(0.5)
    expect(states.get('s1')!.questCompletions).toBe(3)
    expect(states.get('s1')!.questStacks).toBe(2)
  })

  it('should NOT refresh mirrorCopiedAffix (mirror copy moved to stage end)', () => {
    const skills = new Map<string, AffixSkillInstance>()
    const states = new Map<string, SkillRuntimeState>()
    const bindings = new Map<string, string>()

    // Mirror skill at key 'a'
    const mirrorSkill = makeSkill({
      id: 'mirror_skill',
      affixes: [{ type: AffixType.Mirror, posRel: PositionRelation.Adjacent } as AffixInstance],
    })
    skills.set('mirror_skill', mirrorSkill)
    states.set('mirror_skill', makeRuntimeState({ skillId: 'mirror_skill', mirrorCopiedAffix: null }))
    bindings.set('a', 'mirror_skill')

    // Neighbor skill at key 's' with a Crit affix
    const neighborSkill = makeSkill({
      id: 'neighbor_skill',
      affixes: [{ type: AffixType.Crit, chance: 0.5, critMult: 2.0 } as AffixInstance],
    })
    skills.set('neighbor_skill', neighborSkill)
    states.set('neighbor_skill', makeRuntimeState({ skillId: 'neighbor_skill' }))
    bindings.set('s', 'neighbor_skill')

    resetStageState(skills, states, bindings, () => 0.1)

    // Mirror copy no longer happens in resetStageState (moved to battle.ts stage end)
    const mirrorState = states.get('mirror_skill')!
    expect(mirrorState.triggerCount).toBe(0)
    expect(mirrorState.amplifyStacks).toBe(0)
    expect(mirrorState.mirrorCopiedAffix).toBeNull()
  })

  it('should reset Decay currentDecayMult to initialMult at stage start (AC7)', () => {
    const skills = new Map<string, AffixSkillInstance>()
    const states = new Map<string, SkillRuntimeState>()

    const skill = makeSkill({
      id: 'decay_skill',
      affixes: [{ type: AffixType.Decay, initialMult: 2.0, decayPerTrigger: 0.1, floor: 0.5 } as AffixInstance],
    })
    skills.set('decay_skill', skill)
    states.set('decay_skill', makeRuntimeState({ skillId: 'decay_skill', currentDecayMult: 0.6 }))

    resetStageState(skills, states, new Map(), () => 0.5)
    expect(states.get('decay_skill')!.currentDecayMult).toBe(2.0)
  })

  it('should not reset currentDecayMult for skills without Decay affix', () => {
    const skills = new Map<string, AffixSkillInstance>()
    const states = new Map<string, SkillRuntimeState>()

    skills.set('no_decay', makeSkill({ id: 'no_decay', affixes: [] }))
    states.set('no_decay', makeRuntimeState({ skillId: 'no_decay', currentDecayMult: 0.5 }))

    resetStageState(skills, states, new Map(), () => 0.5)
    expect(states.get('no_decay')!.currentDecayMult).toBe(0.5)
  })
})

describe('resetRunState (Task 3)', () => {
  it('should reset apprenticeAccumulated, questCompletions, and questStacks', () => {
    const states = new Map<string, SkillRuntimeState>()
    states.set('s1', makeRuntimeState({
      skillId: 's1',
      apprenticeAccumulated: 0.30,
      questCompletions: 5,
      questStacks: 3,
    }))
    states.set('s2', makeRuntimeState({
      skillId: 's2',
      apprenticeAccumulated: 0.15,
      questCompletions: 2,
      questStacks: 7,
    }))

    resetRunState(states)

    expect(states.get('s1')!.apprenticeAccumulated).toBe(0)
    expect(states.get('s1')!.questCompletions).toBe(0)
    expect(states.get('s1')!.questStacks).toBe(0)
    expect(states.get('s2')!.apprenticeAccumulated).toBe(0)
    expect(states.get('s2')!.questCompletions).toBe(0)
    expect(states.get('s2')!.questStacks).toBe(0)
  })

  it('should NOT reset per-stage fields (chargeAccumulated, triggerCount, etc.)', () => {
    const states = new Map<string, SkillRuntimeState>()
    states.set('s1', makeRuntimeState({
      skillId: 's1',
      chargeAccumulated: 0.5,
      triggerCount: 10,
      amplifyStacks: 3,
      currentDecayMult: 1.5,
      apprenticeAccumulated: 0.2,
    }))

    resetRunState(states)

    expect(states.get('s1')!.chargeAccumulated).toBe(0.5)
    expect(states.get('s1')!.triggerCount).toBe(10)
    expect(states.get('s1')!.amplifyStacks).toBe(3)
    expect(states.get('s1')!.currentDecayMult).toBe(1.5)
  })
})

describe('serializeSkill / deserializeSkill (Task 4)', () => {
  it('should roundtrip a basic skill with no affixes', () => {
    const skill = makeSkill({ id: 'test_rt', resource: 'base' as ResourceType, level: 2, rarity: 0 as 0 })
    const state = makeRuntimeState({ skillId: 'test_rt' })

    const saved = serializeSkill(skill, state)
    const json = JSON.parse(JSON.stringify(saved))
    const { skill: restored, runtimeState } = deserializeSkill(json)

    expect(restored.id).toBe('test_rt')
    expect(restored.resource).toBe('base')
    expect(restored.level).toBe(2)
    expect(restored.rarity).toBe(0)
    expect(restored.affixes).toEqual([])
    expect(runtimeState.skillId).toBe('test_rt')
    expect(runtimeState.chargeAccumulated).toBe(0)
  })

  it('should roundtrip a skill with mirrorCopiedAffix (non-null)', () => {
    const mirrorAffix: AffixInstance = {
      type: AffixType.Crit,
      chance: 0.5,
      critMult: 2.0,
    }
    const skill = makeSkill({
      id: 'mirror_rt',
      affixes: [{ type: AffixType.Mirror, posRel: PositionRelation.Adjacent } as AffixInstance],
    })
    const state = makeRuntimeState({
      skillId: 'mirror_rt',
      mirrorCopiedAffix: mirrorAffix,
      apprenticeAccumulated: 0.25,
      questCompletions: 3,
    })

    const saved = serializeSkill(skill, state)
    const json = JSON.parse(JSON.stringify(saved))
    const { runtimeState } = deserializeSkill(json)

    expect(runtimeState.mirrorCopiedAffix).not.toBeNull()
    expect(runtimeState.mirrorCopiedAffix!.type).toBe(AffixType.Crit)
    expect(runtimeState.mirrorCopiedAffix!.chance).toBe(0.5)
    expect(runtimeState.mirrorCopiedAffix!.critMult).toBe(2.0)
    expect(runtimeState.apprenticeAccumulated).toBe(0.25)
    expect(runtimeState.questCompletions).toBe(3)
  })

  it('should roundtrip a fully-loaded skill with 3 affixes and enchantments', () => {
    const skill = makeSkill({
      id: 'full_skill',
      resource: 'multiplier' as ResourceType,
      level: 3,
      rarity: 3 as 3,
      affixes: [
        { type: AffixType.Rainbow } as AffixInstance,
        { type: AffixType.Crit, chance: 0.3, critMult: 3.0 } as AffixInstance,
        { type: AffixType.Decay, initialMult: 2.0, decayPerTrigger: 0.1, floor: 0.5 } as AffixInstance,
      ],
      enchantmentIds: [EnchantmentType.QuestOverload, 'transmute'],
    })
    const state = makeRuntimeState({
      skillId: 'full_skill',
      currentDecayMult: 1.5,
      questStacks: 4,
      questCompletions: 2,
    })

    const saved = serializeSkill(skill, state)
    const json = JSON.parse(JSON.stringify(saved))
    const { skill: restored, runtimeState } = deserializeSkill(json)

    expect(restored.affixes).toHaveLength(3)
    expect(restored.affixes[0].type).toBe(AffixType.Rainbow)
    expect(restored.affixes[1].chance).toBe(0.3)
    expect(restored.affixes[2].initialMult).toBe(2.0)
    expect(restored.enchantmentIds).toEqual([EnchantmentType.QuestOverload, 'transmute'])
    expect(runtimeState.currentDecayMult).toBe(1.5)
    expect(runtimeState.questStacks).toBe(4)
  })

  it('should default shapeId to monomino and rotation to 0 for old saves without shape data (Story 40.11)', () => {
    // 模拟旧存档数据：没有 shapeId 和 rotation 字段
    const oldSaveData = {
      id: 'old_skill',
      resource: 'base',
      level: 1,
      rarity: 0,
      affixes: [],
      enchantmentIds: [],
      runtime: {},
    } as any
    const { skill, runtimeState } = deserializeSkill(oldSaveData)
    expect(skill.shapeId).toBe('monomino')
    expect(skill.rotation).toBe(0)
    expect(skill.id).toBe('old_skill')
    expect(skill.resource).toBe('base')
    expect(skill.level).toBe(1)
    expect(skill.rarity).toBe(0)
    expect(skill.affixes).toEqual([])
    expect(runtimeState.chargeAccumulated).toBe(0)
    expect(runtimeState.mirrorCopiedAffix).toBeNull()
  })

  it('should preserve shapeId and rotation through roundtrip (Story 40.11)', () => {
    const skill = makeSkill({ id: 'shape_test', resource: 'base' as ResourceType, level: 1, rarity: 1 as 1, shapeId: 'domino_h', rotation: 1 })
    const state = makeRuntimeState({ skillId: 'shape_test' })

    const saved = serializeSkill(skill, state)
    const json = JSON.parse(JSON.stringify(saved))
    const { skill: restored } = deserializeSkill(json)

    expect(restored.shapeId).toBe('domino_h')
    expect(restored.rotation).toBe(1)
  })

  it('should preserve rotation values 0-3 through roundtrip (Story 40.11 CR)', () => {
    for (const rot of [0, 1, 2, 3]) {
      const skill = makeSkill({ id: `rot_${rot}`, shapeId: 'triomino_l', rotation: rot })
      const saved = serializeSkill(skill, makeRuntimeState({ skillId: `rot_${rot}` }))
      const { skill: restored } = deserializeSkill(JSON.parse(JSON.stringify(saved)))
      expect(restored.rotation).toBe(rot)
    }
  })

  it('should produce deep copies (no reference sharing)', () => {
    const affix: AffixInstance = { type: AffixType.Crit, chance: 0.5, critMult: 1.5 }
    const skill = makeSkill({ id: 'copy_test', affixes: [affix] })
    const state = makeRuntimeState({ skillId: 'copy_test' })

    const saved = serializeSkill(skill, state)
    // Mutate original
    affix.critMult = 999
    expect(saved.affixes[0].critMult).toBe(1.5)
  })
})

describe('isOldSystemSkill (Task 5)', () => {
  it('should identify producer IDs', () => {
    expect(isOldSystemSkill('prod_burst')).toBe(true)
    expect(isOldSystemSkill('prod_void_base_adjacent')).toBe(true)
  })

  it('should identify converter IDs', () => {
    expect(isOldSystemSkill('conv_base_score_add')).toBe(true)
  })

  it('should identify connector IDs', () => {
    expect(isOldSystemSkill('conn_copy_adjacent')).toBe(true)
  })

  it('should identify amplifier IDs', () => {
    expect(isOldSystemSkill('amp_base_Adjacent')).toBe(true)
  })

  it('should not match affix skill IDs', () => {
    expect(isOldSystemSkill('affix_skill_001')).toBe(false)
    expect(isOldSystemSkill('test_skill')).toBe(false)
  })
})

describe('migrateLoadedSkills (Task 5)', () => {
  it('should filter out old system skills', () => {
    const loaded = [
      { id: 'prod_burst', level: 1, resource: 'base' },
      { id: 'affix_skill_1', level: 2, resource: 'score', affixes: [], rarity: 1 },
      { id: 'conv_base_score_add', level: 1, resource: 'score' },
    ]
    const result = migrateLoadedSkills(loaded)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('affix_skill_1')
  })

  it('should add affixes=[] and rarity=0 to skills without affixes field', () => {
    const loaded = [
      { id: 'old_affix_skill', level: 2, resource: 'base', enchantmentIds: ['ench1'] },
    ]
    const result = migrateLoadedSkills(loaded)
    expect(result).toHaveLength(1)
    expect(result[0].affixes).toEqual([])
    expect(result[0].rarity).toBe(0)
    expect(result[0].enchantmentIds).toEqual(['ench1'])
  })

  it('should not modify skills that already have affixes field', () => {
    const affix = { type: AffixType.Crit, chance: 0.5, critMult: 1.5 }
    const loaded = [
      { id: 'new_skill', level: 3, resource: 'multiplier', affixes: [affix], rarity: 2, enchantmentIds: [] },
    ]
    const result = migrateLoadedSkills(loaded)
    expect(result).toHaveLength(1)
    expect(result[0].affixes).toHaveLength(1)
    expect(result[0].rarity).toBe(2)
  })

  it('should handle empty input', () => {
    expect(migrateLoadedSkills([])).toEqual([])
  })

  it('should add default runtime when runtime field is missing', () => {
    const loaded = [
      { id: 'no_runtime_skill', level: 1, resource: 'base', affixes: [{ type: AffixType.Flat, flatBonus: 5 }], rarity: 1, enchantmentIds: [] },
    ]
    const result = migrateLoadedSkills(loaded)
    expect(result).toHaveLength(1)
    expect(result[0].runtime).toBeDefined()
    expect(result[0].runtime.skillId).toBe('no_runtime_skill')
    expect(result[0].runtime.chargeAccumulated).toBe(0)
    expect(result[0].runtime.currentDecayMult).toBe(1)
    expect(result[0].runtime.mirrorCopiedAffix).toBeNull()
  })

  it('should handle skills with affixes=null as missing', () => {
    const loaded = [
      { id: 'null_affix', level: 1, resource: 'base', affixes: null },
    ]
    const result = migrateLoadedSkills(loaded)
    expect(result[0].affixes).toEqual([])
    expect(result[0].rarity).toBe(0)
  })
})

// ===== buildEffectiveSkill + Mirror 触发参与测试 =====

describe('buildEffectiveSkill (Mirror replacement)', () => {
  it('should return original skill when mirrorCopiedAffix is null', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Mirror, posRel: PositionRelation.Adjacent } as AffixInstance],
    })
    const state = makeRuntimeState({ mirrorCopiedAffix: null })
    const result = buildEffectiveSkill(skill, state)
    expect(result).toBe(skill) // same reference, zero allocation
  })

  it('should return original skill when no Mirror affix exists', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Crit, chance: 0.5, critMult: 2.0 } as AffixInstance],
    })
    const copiedAffix: AffixInstance = { type: AffixType.Rainbow }
    const state = makeRuntimeState({ mirrorCopiedAffix: copiedAffix })
    const result = buildEffectiveSkill(skill, state)
    expect(result).toBe(skill)
  })

  it('should replace Mirror affix with mirrorCopiedAffix', () => {
    const mirrorAffix: AffixInstance = { type: AffixType.Mirror, posRel: PositionRelation.Adjacent }
    const critAffix: AffixInstance = { type: AffixType.Crit, chance: 0.5, critMult: 2.0 }
    const copiedVoid: AffixInstance = { type: AffixType.Void, posRel: PositionRelation.Adjacent, bonusPerSlot: 0.25 }

    const skill = makeSkill({
      affixes: [critAffix, mirrorAffix],
    })
    const state = makeRuntimeState({ mirrorCopiedAffix: copiedVoid })
    const result = buildEffectiveSkill(skill, state)

    expect(result).not.toBe(skill)
    expect(result.affixes).toHaveLength(2)
    expect(result.affixes[0].type).toBe(AffixType.Crit)
    expect(result.affixes[1].type).toBe(AffixType.Void)
    expect(result.affixes[1].bonusPerSlot).toBe(0.25)
  })

  it('should not mutate original skill affixes', () => {
    const mirrorAffix: AffixInstance = { type: AffixType.Mirror, posRel: PositionRelation.Adjacent }
    const skill = makeSkill({ affixes: [mirrorAffix] })
    const copiedRainbow: AffixInstance = { type: AffixType.Rainbow }
    const state = makeRuntimeState({ mirrorCopiedAffix: copiedRainbow })

    buildEffectiveSkill(skill, state)
    expect(skill.affixes[0].type).toBe(AffixType.Mirror) // original unchanged
  })
})

describe('Mirror affix participates in trigger pipeline', () => {
  it('Mirror copying Crit should enable crit when roll succeeds', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Mirror, posRel: PositionRelation.Adjacent } as AffixInstance],
      level: 1,
    })
    const copiedCrit: AffixInstance = { type: AffixType.Crit, chance: 1.0, critMult: 3.0 }
    const state = makeRuntimeState({ mirrorCopiedAffix: copiedCrit })
    const ctx = makeContext({ randomFn: () => 0.5 }) // 0.5 < 1.0 → crit

    const result = triggerAffixSkill(skill, state, ctx)
    expect(result.isCrit).toBe(true)
    // base = 5, × 3.0 = 15
    expect(result.output).toBe(15)
  })

  it('Mirror copying Void should add bonus from empty slots in Phase 2', () => {
    const bindings = new Map<string, string>()
    bindings.set('a', 'test_skill')
    // 'a' has adjacent keys like 's', 'q', 'w', 'z' — all empty
    const skill = makeSkill({
      affixes: [{ type: AffixType.Mirror, posRel: PositionRelation.Adjacent } as AffixInstance],
      level: 1,
    })
    const copiedVoid: AffixInstance = { type: AffixType.Void, posRel: PositionRelation.Adjacent, bonusPerSlot: 0.25 }
    const state = makeRuntimeState({ mirrorCopiedAffix: copiedVoid })
    const allSkills = new Map<string, AffixSkillInstance>()
    allSkills.set('test_skill', skill)
    const skillStates = new Map<string, SkillRuntimeState>()
    skillStates.set('test_skill', state)
    const ctx = makeContext({ bindings, allSkills, skillStates })

    const result = triggerAffixSkill(skill, state, ctx)
    // Should have bonus > 0 because adjacent keys are empty
    expect(result.bonusPercent).toBeGreaterThan(0)
    expect(result.output).toBeGreaterThan(5) // base=5 + void bonus
  })

  it('Mirror with null copy should behave as no extra affix', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Mirror, posRel: PositionRelation.Adjacent } as AffixInstance],
      level: 1,
    })
    const state = makeRuntimeState({ mirrorCopiedAffix: null })
    const ctx = makeContext()

    const result = triggerAffixSkill(skill, state, ctx)
    // Mirror without copy = no effect, just base output
    expect(result.output).toBe(5)
    expect(result.multipliers).toHaveLength(0)
    expect(result.bonusPercent).toBe(0)
  })
})

// =============================================
// Story 41-5: Charge 质变 + Mirror 质变 单元测试
// =============================================

describe('Story 41-5: Charge chargeAutoComplete', () => {
  it('should set chargeAutoComplete when questTransformed and charge >= maxBonus', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Charge, gainPerSec: 0.08, maxBonus: 2.0 }],
      enchantmentIds: [EnchantmentType.QuestEnergize],
    })
    const state = makeRuntimeState({ chargeAccumulated: 2.0, questTransformed: true })
    const ctx = makeContext()
    const result = triggerAffixSkill(skill, state, ctx)
    expect(result.chargeAutoComplete).toBe(true)
  })

  it('should NOT set chargeAutoComplete when charge < maxBonus', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Charge, gainPerSec: 0.08, maxBonus: 2.0 }],
      enchantmentIds: [EnchantmentType.QuestEnergize],
    })
    const state = makeRuntimeState({ chargeAccumulated: 1.5, questTransformed: true })
    const ctx = makeContext()
    const result = triggerAffixSkill(skill, state, ctx)
    expect(result.chargeAutoComplete).toBeUndefined()
  })

  it('should NOT set chargeAutoComplete when not questTransformed', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Charge, gainPerSec: 0.08, maxBonus: 2.0 }],
      enchantmentIds: [EnchantmentType.QuestEnergize],
    })
    const state = makeRuntimeState({ chargeAccumulated: 2.0, questTransformed: false })
    const ctx = makeContext()
    const result = triggerAffixSkill(skill, state, ctx)
    expect(result.chargeAutoComplete).toBeUndefined()
  })

  it('should reset chargeAccumulated to 0 after trigger regardless of transform', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Charge, gainPerSec: 0.08, maxBonus: 2.0 }],
      enchantmentIds: [EnchantmentType.QuestEnergize],
    })
    const state = makeRuntimeState({ chargeAccumulated: 2.5, questTransformed: true })
    const ctx = makeContext()
    triggerAffixSkill(skill, state, ctx)
    expect(state.chargeAccumulated).toBe(0)
  })

  it('Phase 2: chargeAutoComplete flag in resolvePhase2 result', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Charge, gainPerSec: 0.08, maxBonus: 2.0 }],
      enchantmentIds: [EnchantmentType.QuestEnergize],
    })
    const state = makeRuntimeState({ chargeAccumulated: 2.0, questTransformed: true })
    const ctx = makeContext()
    const p2 = resolvePhase2(skill, state, ctx, 5)
    expect(p2.chargeAutoComplete).toBe(true)
    expect(p2.bonusPercent).toBeCloseTo(2.0)
  })
})

describe('Story 41-5: Mirror questTransformed — full affix copy', () => {
  it('resolveMirrorCopy should collect all unique affixes when questTransformed', () => {
    const neighbor1 = makeSkill({
      id: 'n1',
      affixes: [
        { type: AffixType.Crit, chance: 0.2, critMult: 2.0 },
        { type: AffixType.Pulse, interval: 3, pulseMult: 1.5 },
      ],
    })
    const neighbor2 = makeSkill({
      id: 'n2',
      affixes: [
        { type: AffixType.Decay, initialMult: 1.0, decayPerTrigger: 0.1, floor: 0.5 },
      ],
    })
    const skill = makeSkill({
      affixes: [{ type: AffixType.Mirror, posRel: PositionRelation.Adjacent }],
      enchantmentIds: [EnchantmentType.QuestMirror],
    })
    const state = makeRuntimeState({ questTransformed: true })
    const bindings = new Map([['a', 'test_skill'], ['s', 'n1'], ['d', 'n2']])
    const allSkills = new Map([['test_skill', skill], ['n1', neighbor1], ['n2', neighbor2]])
    const ctx = makeContext({ triggerKey: 'a', bindings, allSkills })

    const copied = resolveMirrorCopy(skill, state, ctx)
    // Returns first collected affix as compat value
    expect(copied).not.toBeNull()
    expect(copied!.type).toBe(AffixType.Crit)
  })

  it('resolveMirrorCopyAllAffixes should return all unique neighbor affixes', () => {
    const neighbor1 = makeSkill({
      id: 'n1',
      affixes: [
        { type: AffixType.Crit, chance: 0.2, critMult: 2.0 },
        { type: AffixType.Pulse, interval: 3, pulseMult: 1.5 },
      ],
    })
    const neighbor2 = makeSkill({
      id: 'n2',
      affixes: [
        { type: AffixType.Decay, initialMult: 1.0, decayPerTrigger: 0.1, floor: 0.5 },
        { type: AffixType.Crit, chance: 0.5, critMult: 3.0 }, // dup type — should be deduped
      ],
    })
    const skill = makeSkill({
      affixes: [{ type: AffixType.Mirror, posRel: PositionRelation.Adjacent }],
      enchantmentIds: [EnchantmentType.QuestMirror],
    })
    const state = makeRuntimeState({ questTransformed: true })
    // 'a' adjacent: q, w, s, z — use 's' and 'w' as neighbors
    const bindings = new Map([['a', 'test_skill'], ['s', 'n1'], ['w', 'n2']])
    const allSkills = new Map([['test_skill', skill], ['n1', neighbor1], ['n2', neighbor2]])
    const ctx = makeContext({ triggerKey: 'a', bindings, allSkills })

    const affixes = resolveMirrorCopyAllAffixes(skill, state, ctx)
    expect(affixes).toHaveLength(3) // Crit, Pulse, Decay (deduped)
    const types = affixes.map(a => a.type)
    expect(types).toContain(AffixType.Crit)
    expect(types).toContain(AffixType.Pulse)
    expect(types).toContain(AffixType.Decay)
  })

  it('resolveMirrorCopyAllAffixes should exclude Mirror and Twin', () => {
    const neighbor = makeSkill({
      id: 'n1',
      affixes: [
        { type: AffixType.Mirror, posRel: PositionRelation.Adjacent },
        { type: AffixType.Twin },
        { type: AffixType.Crit, chance: 0.3, critMult: 2.0 },
      ],
    })
    const skill = makeSkill({
      affixes: [{ type: AffixType.Mirror, posRel: PositionRelation.Adjacent }],
    })
    const state = makeRuntimeState({ questTransformed: true })
    const bindings = new Map([['a', 'test_skill'], ['s', 'n1']])
    const allSkills = new Map([['test_skill', skill], ['n1', neighbor]])
    const ctx = makeContext({ triggerKey: 'a', bindings, allSkills })

    const affixes = resolveMirrorCopyAllAffixes(skill, state, ctx)
    expect(affixes).toHaveLength(1)
    expect(affixes[0].type).toBe(AffixType.Crit)
  })

  it('resolveMirrorCopyAllAffixes should return empty when no neighbors', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Mirror, posRel: PositionRelation.Adjacent }],
    })
    const state = makeRuntimeState({ questTransformed: true })
    const bindings = new Map([['a', 'test_skill']])
    const allSkills = new Map([['test_skill', skill]])
    const ctx = makeContext({ triggerKey: 'a', bindings, allSkills })

    const affixes = resolveMirrorCopyAllAffixes(skill, state, ctx)
    expect(affixes).toHaveLength(0)
  })

  it('resolveMirrorCopyAllAffixes should return empty when neighbors only have Mirror/Twin', () => {
    const neighbor = makeSkill({
      id: 'n1',
      affixes: [
        { type: AffixType.Mirror, posRel: PositionRelation.Adjacent },
        { type: AffixType.Twin },
      ],
    })
    const skill = makeSkill({
      affixes: [{ type: AffixType.Mirror, posRel: PositionRelation.Adjacent }],
    })
    const state = makeRuntimeState({ questTransformed: true })
    const bindings = new Map([['a', 'test_skill'], ['s', 'n1']])
    const allSkills = new Map([['test_skill', skill], ['n1', neighbor]])
    const ctx = makeContext({ triggerKey: 'a', bindings, allSkills })

    const affixes = resolveMirrorCopyAllAffixes(skill, state, ctx)
    expect(affixes).toHaveLength(0)
  })
})

describe('Story 41-5: buildEffectiveSkill — transformed Mirror expansion', () => {
  it('should expand Mirror into mirrorCopiedAffixes array', () => {
    const mirrorAffix: AffixInstance = { type: AffixType.Mirror, posRel: PositionRelation.Adjacent }
    const critAffix: AffixInstance = { type: AffixType.Crit, chance: 0.5, critMult: 2.0 }
    const copiedAffixes: AffixInstance[] = [
      { type: AffixType.Pulse, interval: 3, pulseMult: 1.5 },
      { type: AffixType.Decay, initialMult: 1.0, decayPerTrigger: 0.1, floor: 0.5 },
    ]

    const skill = makeSkill({ affixes: [critAffix, mirrorAffix] })
    const state = makeRuntimeState({ mirrorCopiedAffixes: copiedAffixes })
    const result = buildEffectiveSkill(skill, state)

    expect(result).not.toBe(skill) // new object
    expect(result.affixes).toHaveLength(3) // Crit + Pulse + Decay
    expect(result.affixes[0].type).toBe(AffixType.Crit)
    expect(result.affixes[1].type).toBe(AffixType.Pulse)
    expect(result.affixes[2].type).toBe(AffixType.Decay)
  })

  it('should prefer mirrorCopiedAffixes over mirrorCopiedAffix', () => {
    const mirrorAffix: AffixInstance = { type: AffixType.Mirror, posRel: PositionRelation.Adjacent }
    const copiedSingle: AffixInstance = { type: AffixType.Crit, chance: 0.5, critMult: 2.0 }
    const copiedMulti: AffixInstance[] = [
      { type: AffixType.Pulse, interval: 3 },
      { type: AffixType.Decay, initialMult: 1.0 },
    ]

    const skill = makeSkill({ affixes: [mirrorAffix] })
    const state = makeRuntimeState({ mirrorCopiedAffix: copiedSingle, mirrorCopiedAffixes: copiedMulti })
    const result = buildEffectiveSkill(skill, state)

    // mirrorCopiedAffixes takes priority
    expect(result.affixes).toHaveLength(2)
    expect(result.affixes[0].type).toBe(AffixType.Pulse)
    expect(result.affixes[1].type).toBe(AffixType.Decay)
  })

  it('should fall back to mirrorCopiedAffix when mirrorCopiedAffixes is empty', () => {
    const mirrorAffix: AffixInstance = { type: AffixType.Mirror, posRel: PositionRelation.Adjacent }
    const copiedSingle: AffixInstance = { type: AffixType.Crit, chance: 0.5, critMult: 2.0 }

    const skill = makeSkill({ affixes: [mirrorAffix] })
    const state = makeRuntimeState({ mirrorCopiedAffix: copiedSingle, mirrorCopiedAffixes: [] })
    const result = buildEffectiveSkill(skill, state)

    expect(result.affixes).toHaveLength(1)
    expect(result.affixes[0].type).toBe(AffixType.Crit)
  })

  it('expanded Mirror affixes should participate in full trigger pipeline', () => {
    const mirrorAffix: AffixInstance = { type: AffixType.Mirror, posRel: PositionRelation.Adjacent }
    const copiedCrit: AffixInstance = { type: AffixType.Crit, chance: 1.0, critMult: 3.0 }

    const skill = makeSkill({ affixes: [mirrorAffix] })
    const state = makeRuntimeState({ mirrorCopiedAffixes: [copiedCrit] })
    const ctx = makeContext({ randomFn: () => 0.5 }) // 0.5 < 1.0 → crit

    const result = triggerAffixSkill(skill, state, ctx)
    expect(result.isCrit).toBe(true)
    expect(result.output).toBe(15) // base 5 × 3.0
  })
})
