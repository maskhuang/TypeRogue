// ============================================
// 打字肉鸽 - 词条制触发流水线 Phase 1~3 单元测试
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
} from '../../../src/data/affixes'
import { PositionRelation } from '../../../src/data/keyboardTopology'
import type { ResourceType, ResourceState } from '../../../src/core/types'
import {
  TriggerContext,
  TriggerResult,
  resolvePhase1,
  resolvePhase2,
  resolvePhase3,
  getAffixSourceValue,
  triggerAffixSkill,
  countEmptySlots,
  isFirstOrLastLetter,
  countOccurrences,
  sumNeighborAmplifyStacks,
  hasEnchantment,
  getQuestCompletions,
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
})
