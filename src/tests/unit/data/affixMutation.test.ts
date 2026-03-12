/**
 * Story 35-10: 蜕变师 — 词条蜕变 单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as seededRandom from '../../../src/core/seededRandom'
import { state, resetState } from '../../../src/core/state'
import {
  AffixType, EnchantmentType, QUEST_AFFIX_MAP,
  createSkillRuntimeState,
} from '../../../src/data/affixes'
import type { AffixSkillInstance, SkillRuntimeState } from '../../../src/data/affixes'
import type { ResourceType } from '../../../src/core/types'
import {
  mutateA,
  mutateUpgrade,
  mutateDowngrade,
  getMutateACost,
  getUpgradeCost,
  canMutateA,
  canUpgrade,
  canDowngrade,
  invalidateQuestEnchantment,
  UPGRADE_COSTS,
} from '../../../src/data/affixMutation'

// ===== 测试辅助 =====

function makeSkill(overrides: Partial<AffixSkillInstance> = {}): AffixSkillInstance {
  return {
    id: 'skill_test_001',
    name: '暴击·基数',
    icon: '🔢',
    resource: 'base' as ResourceType,
    baseValues: [5, 8, 12] as [number, number, number],
    level: 1,
    rarity: 1 as 0 | 1 | 2 | 3,
    affixes: [{ type: AffixType.Crit, chance: 0.5, critMult: 2.0 }],
    enchantmentIds: [],
    ...overrides,
  }
}

function makeOrangeSkill(): AffixSkillInstance {
  return makeSkill({
    id: 'skill_test_orange',
    rarity: 3 as 0 | 1 | 2 | 3,
    affixes: [
      { type: AffixType.Crit, chance: 0.5, critMult: 2.0 },
      { type: AffixType.Pulse, interval: 4, burstMult: 3.0 },
      { type: AffixType.Multiply, multiplier: 1.5 },
    ],
  })
}

function makeWhiteSkill(): AffixSkillInstance {
  return makeSkill({
    id: 'skill_test_white',
    rarity: 0 as 0 | 1 | 2 | 3,
    affixes: [],
  })
}

function setupSkill(skill: AffixSkillInstance): void {
  state.affixSkills.set(skill.id, skill)
  state.affixSkillStates.set(skill.id, createSkillRuntimeState(skill.id))
  state.player.skills.set(skill.id, { level: skill.level, purchasePrice: 50 })
}

beforeEach(() => {
  resetState()
  state.classId = 'metamorph'
})

// ============================================================
// AC3 — getMutateACost: 基础3 + run内累计
// ============================================================
describe('getMutateACost (AC3)', () => {
  it('first mutation on skill costs 3', () => {
    expect(getMutateACost('skill_test_001')).toBe(3)
  })

  it('second mutation on same skill costs 4', () => {
    state.mutationACounts.set('skill_test_001', 1)
    expect(getMutateACost('skill_test_001')).toBe(4)
  })

  it('third mutation on same skill costs 5', () => {
    state.mutationACounts.set('skill_test_001', 2)
    expect(getMutateACost('skill_test_001')).toBe(5)
  })

  it('different skills have independent counters', () => {
    state.mutationACounts.set('skill_a', 3)
    expect(getMutateACost('skill_b')).toBe(3)
  })
})

// ============================================================
// AC4 — getUpgradeCost
// ============================================================
describe('getUpgradeCost (AC4)', () => {
  it('white→blue costs 5', () => {
    expect(getUpgradeCost(0)).toBe(5)
  })

  it('blue→yellow costs 8', () => {
    expect(getUpgradeCost(1)).toBe(8)
  })

  it('yellow→orange costs 12', () => {
    expect(getUpgradeCost(2)).toBe(12)
  })

  it('UPGRADE_COSTS matches design', () => {
    expect(UPGRADE_COSTS).toEqual({ 0: 5, 1: 8, 2: 12 })
  })
})

// ============================================================
// canMutateA / canUpgrade / canDowngrade
// ============================================================
describe('can* guard functions', () => {
  it('canMutateA returns false for white skill (no affixes)', () => {
    const skill = makeWhiteSkill()
    setupSkill(skill)
    expect(canMutateA(skill.id)).toBe(false)
  })

  it('canMutateA returns true for blue skill with sufficient mutagen', () => {
    const skill = makeSkill()
    setupSkill(skill)
    state.mutagenInventory = 10
    expect(canMutateA(skill.id)).toBe(true)
  })

  it('canMutateA returns false when mutagen insufficient', () => {
    const skill = makeSkill()
    setupSkill(skill)
    state.mutagenInventory = 0
    expect(canMutateA(skill.id)).toBe(false)
  })

  it('canUpgrade returns false for orange skill', () => {
    const skill = makeOrangeSkill()
    setupSkill(skill)
    state.mutagenInventory = 99
    expect(canUpgrade(skill.id)).toBe(false)
  })

  it('canUpgrade returns true for blue skill with enough mutagen', () => {
    const skill = makeSkill()
    setupSkill(skill)
    state.mutagenInventory = 8
    expect(canUpgrade(skill.id)).toBe(true)
  })

  it('canDowngrade returns false for white skill', () => {
    const skill = makeWhiteSkill()
    setupSkill(skill)
    expect(canDowngrade(skill.id)).toBe(false)
  })

  it('canDowngrade returns true for blue skill (always free)', () => {
    const skill = makeSkill()
    setupSkill(skill)
    expect(canDowngrade(skill.id)).toBe(true)
  })
})

// ============================================================
// AC2 — mutateA: 词条重铸 + 池过滤
// ============================================================
describe('mutateA (AC1, AC2, AC3)', () => {
  it('reforges the chosen affix', () => {
    const skill = makeSkill()
    setupSkill(skill)
    state.mutagenInventory = 10
    const oldType = skill.affixes[0].type

    const result = mutateA(skill.id, 0)
    expect(result.success).toBe(true)
    expect(result.mutagenCost).toBe(3)

    const updated = state.affixSkills.get(skill.id)!
    // The new affix may or may not be same type (random), but cost was deducted
    expect(state.mutagenInventory).toBe(7) // 10 - 3
  })

  it('excludes existing affix types from pool (AC2)', () => {
    const skill = makeOrangeSkill() // Crit + Pulse + Multiply
    setupSkill(skill)
    state.mutagenInventory = 10

    // Reforge affix[0] (Crit) — should NOT get Pulse or Multiply
    const result = mutateA(skill.id, 0)
    expect(result.success).toBe(true)
    const updated = state.affixSkills.get(skill.id)!
    const newType = updated.affixes[0].type
    // New type should not be Pulse or Multiply (the other affixes)
    expect(newType).not.toBe(AffixType.Pulse)
    expect(newType).not.toBe(AffixType.Multiply)
  })

  it('increments mutationACounts', () => {
    const skill = makeSkill()
    setupSkill(skill)
    state.mutagenInventory = 20

    mutateA(skill.id, 0)
    expect(state.mutationACounts.get(skill.id)).toBe(1)

    mutateA(skill.id, 0)
    expect(state.mutationACounts.get(skill.id)).toBe(2)
  })

  it('fails when mutagen insufficient', () => {
    const skill = makeSkill()
    setupSkill(skill)
    state.mutagenInventory = 1

    const result = mutateA(skill.id, 0)
    expect(result.success).toBe(false)
    expect(result.error).toContain('变异素不足')
    expect(state.mutagenInventory).toBe(1) // unchanged
  })

  it('fails for white skill', () => {
    const skill = makeWhiteSkill()
    setupSkill(skill)
    state.mutagenInventory = 10

    const result = mutateA(skill.id, 0)
    expect(result.success).toBe(false)
    expect(result.error).toContain('无词条')
  })

  it('fails for invalid affix index', () => {
    const skill = makeSkill()
    setupSkill(skill)
    state.mutagenInventory = 10

    const result = mutateA(skill.id, 5)
    expect(result.success).toBe(false)
  })

  it('fails for non-existent skill', () => {
    state.mutagenInventory = 10
    const result = mutateA('nonexistent', 0)
    expect(result.success).toBe(false)
  })
})

// ============================================================
// AC4 — mutateUpgrade: 稀有度升级
// ============================================================
describe('mutateUpgrade (AC4)', () => {
  it('upgrades blue→yellow: rarity+1, adds 1 affix', () => {
    const skill = makeSkill({ rarity: 1 as 0 | 1 | 2 | 3 })
    setupSkill(skill)
    state.mutagenInventory = 20

    const result = mutateUpgrade(skill.id)
    expect(result.success).toBe(true)
    expect(result.mutagenCost).toBe(8) // blue→yellow
    expect(state.mutagenInventory).toBe(12) // 20 - 8

    const updated = state.affixSkills.get(skill.id)!
    expect(updated.rarity).toBe(2)
    expect(updated.affixes).toHaveLength(2) // was 1, now 2
  })

  it('upgrades white→blue: costs 5', () => {
    const skill = makeWhiteSkill()
    setupSkill(skill)
    state.mutagenInventory = 10

    const result = mutateUpgrade(skill.id)
    expect(result.success).toBe(true)
    expect(result.mutagenCost).toBe(5)
    expect(state.mutagenInventory).toBe(5)

    const updated = state.affixSkills.get(skill.id)!
    expect(updated.rarity).toBe(1)
    expect(updated.affixes).toHaveLength(1)
  })

  it('fails for orange skill (already legendary)', () => {
    const skill = makeOrangeSkill()
    setupSkill(skill)
    state.mutagenInventory = 99

    const result = mutateUpgrade(skill.id)
    expect(result.success).toBe(false)
    expect(result.error).toContain('已传说')
  })

  it('fails when mutagen insufficient', () => {
    const skill = makeSkill({ rarity: 2 as 0 | 1 | 2 | 3 })
    setupSkill(skill)
    state.mutagenInventory = 5 // need 12

    const result = mutateUpgrade(skill.id)
    expect(result.success).toBe(false)
  })

  it('new affix type excludes existing types', () => {
    const skill = makeSkill({
      rarity: 2 as 0 | 1 | 2 | 3,
      affixes: [
        { type: AffixType.Crit, chance: 0.5, critMult: 2.0 },
        { type: AffixType.Pulse, interval: 4, burstMult: 3.0 },
      ],
    })
    setupSkill(skill)
    state.mutagenInventory = 20

    const result = mutateUpgrade(skill.id)
    expect(result.success).toBe(true)

    const updated = state.affixSkills.get(skill.id)!
    const newAffix = updated.affixes[2]
    expect(newAffix.type).not.toBe(AffixType.Crit)
    expect(newAffix.type).not.toBe(AffixType.Pulse)
  })

  it('excludes Convert type (both cross/self variants) from pool', () => {
    const skill = makeSkill({
      rarity: 1 as 0 | 1 | 2 | 3,
      affixes: [
        { type: AffixType.Convert, source: 'base' as any, target: 'score' as any, formula: 'add' as any, k: 0.5 },
      ],
    })
    setupSkill(skill)
    state.mutagenInventory = 20

    // Upgrade → new affix must not be Convert (both convert_cross and convert_self excluded)
    const result = mutateUpgrade(skill.id)
    expect(result.success).toBe(true)

    const updated = state.affixSkills.get(skill.id)!
    const newAffix = updated.affixes[1]
    expect(newAffix.type).not.toBe(AffixType.Convert)
  })
})

// ============================================================
// AC5 — mutateDowngrade: 稀有度降级
// ============================================================
describe('mutateDowngrade (AC5)', () => {
  it('downgrades blue→white: rarity-1, removes 1 affix, refunds 1 mutagen', () => {
    const skill = makeSkill()
    setupSkill(skill)
    state.mutagenInventory = 5

    const result = mutateDowngrade(skill.id)
    expect(result.success).toBe(true)
    expect(result.mutagenCost).toBe(0)
    expect(result.mutagenRefund).toBe(1)
    expect(state.mutagenInventory).toBe(6) // 5 + 1

    const updated = state.affixSkills.get(skill.id)!
    expect(updated.rarity).toBe(0)
    expect(updated.affixes).toHaveLength(0)
  })

  it('downgrades orange→yellow: removes 1 of 3 affixes', () => {
    const skill = makeOrangeSkill()
    setupSkill(skill)
    state.mutagenInventory = 0

    const result = mutateDowngrade(skill.id)
    expect(result.success).toBe(true)

    const updated = state.affixSkills.get(skill.id)!
    expect(updated.rarity).toBe(2)
    expect(updated.affixes).toHaveLength(2)
    expect(state.mutagenInventory).toBe(1) // refund
  })

  it('fails for white skill', () => {
    const skill = makeWhiteSkill()
    setupSkill(skill)

    const result = mutateDowngrade(skill.id)
    expect(result.success).toBe(false)
    expect(result.error).toContain('已白装')
  })
})

// ============================================================
// AC6 — 名称更新
// ============================================================
describe('Name update after mutation (AC6)', () => {
  it('mutateA updates skill name', () => {
    const skill = makeSkill()
    setupSkill(skill)
    state.mutagenInventory = 10

    const oldName = skill.name
    mutateA(skill.id, 0)
    const updated = state.affixSkills.get(skill.id)!
    // Name should be regenerated (may or may not equal old name)
    expect(updated.name).toBeDefined()
    expect(updated.name.length).toBeGreaterThan(0)
  })

  it('mutateUpgrade updates skill name with new affix', () => {
    const skill = makeWhiteSkill()
    setupSkill(skill)
    state.mutagenInventory = 10

    mutateUpgrade(skill.id)
    const updated = state.affixSkills.get(skill.id)!
    // Was "基数", now should have affix prefix
    expect(updated.name).toContain('·')
  })

  it('mutateDowngrade updates skill name', () => {
    const skill = makeSkill()
    setupSkill(skill)
    state.mutagenInventory = 0

    mutateDowngrade(skill.id)
    const updated = state.affixSkills.get(skill.id)!
    // Was "暴击·基数", now white → "基数"
    expect(updated.name).toBe('基数')
  })
})

// ============================================================
// AC7 — 任务附魔失效
// ============================================================
describe('invalidateQuestEnchantment (AC7)', () => {
  it('removes quest enchantment when corresponding affix is removed', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Crit, chance: 0.5, critMult: 2.0 }],
      enchantmentIds: [EnchantmentType.QuestOverload], // QuestOverload → Crit
    })
    setupSkill(skill)
    const rt = state.affixSkillStates.get(skill.id)!
    rt.questStacks = 5
    rt.questCompletions = 2

    invalidateQuestEnchantment(skill.id, AffixType.Crit)

    const updated = state.affixSkills.get(skill.id)!
    expect(updated.enchantmentIds).not.toContain(EnchantmentType.QuestOverload)
    const updatedRt = state.affixSkillStates.get(skill.id)!
    expect(updatedRt.questStacks).toBe(0)
    expect(updatedRt.questCompletions).toBe(0)
  })

  it('does not remove unrelated quest enchantment', () => {
    const skill = makeSkill({
      affixes: [
        { type: AffixType.Crit, chance: 0.5, critMult: 2.0 },
        { type: AffixType.Void, posRel: 'adjacent' as any, bonusPerSlot: 0.25 },
      ],
      enchantmentIds: [EnchantmentType.QuestDevour], // QuestDevour → Void
      rarity: 2 as 0 | 1 | 2 | 3,
    })
    setupSkill(skill)

    // Remove Crit — QuestDevour should stay (it maps to Void, not Crit)
    invalidateQuestEnchantment(skill.id, AffixType.Crit)

    const updated = state.affixSkills.get(skill.id)!
    expect(updated.enchantmentIds).toContain(EnchantmentType.QuestDevour)
  })

  it('preserves quest state when a surviving quest enchantment remains', () => {
    const skill = makeSkill({
      affixes: [
        { type: AffixType.Crit, chance: 0.5, critMult: 2.0 },
        { type: AffixType.Void, posRel: 'adjacent' as any, bonusPerSlot: 0.25 },
      ],
      enchantmentIds: [EnchantmentType.QuestOverload, EnchantmentType.QuestDevour],
      rarity: 2 as 0 | 1 | 2 | 3,
    })
    setupSkill(skill)
    const rt = state.affixSkillStates.get(skill.id)!
    rt.questStacks = 7
    rt.questCompletions = 3

    // Remove Crit → QuestOverload removed, but QuestDevour survives (maps to Void)
    invalidateQuestEnchantment(skill.id, AffixType.Crit)

    const updated = state.affixSkills.get(skill.id)!
    expect(updated.enchantmentIds).not.toContain(EnchantmentType.QuestOverload)
    expect(updated.enchantmentIds).toContain(EnchantmentType.QuestDevour)
    // Quest state preserved because QuestDevour still active
    const updatedRt = state.affixSkillStates.get(skill.id)!
    expect(updatedRt.questStacks).toBe(7)
    expect(updatedRt.questCompletions).toBe(3)
  })

  it('handles QuestResonance mapping to [Resonance, Link]', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Resonance, posRel: 'adjacent' as any, resource: 'base' as any }],
      enchantmentIds: [EnchantmentType.QuestResonance],
    })
    setupSkill(skill)

    // Remove Resonance — QuestResonance should be removed (maps to [Resonance, Link])
    invalidateQuestEnchantment(skill.id, AffixType.Resonance)

    const updated = state.affixSkills.get(skill.id)!
    expect(updated.enchantmentIds).not.toContain(EnchantmentType.QuestResonance)
  })

  it('mutateA triggers invalidation when affix type changes', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Crit, chance: 0.5, critMult: 2.0 }],
      enchantmentIds: [EnchantmentType.QuestOverload],
    })
    setupSkill(skill)
    state.mutagenInventory = 10
    const rt = state.affixSkillStates.get(skill.id)!
    rt.questStacks = 3
    rt.questCompletions = 1

    // Mock random to force selection of Multiply (first entry in AFFIX_WEIGHTS), ensuring type change
    const spy = vi.spyOn(seededRandom, 'random').mockReturnValue(0.01)
    mutateA(skill.id, 0)
    spy.mockRestore()

    const updated = state.affixSkills.get(skill.id)!
    const updatedRt = state.affixSkillStates.get(skill.id)!
    // With deterministic random, new type is guaranteed to not be Crit
    expect(updated.affixes[0].type).not.toBe(AffixType.Crit)
    expect(updated.enchantmentIds).not.toContain(EnchantmentType.QuestOverload)
    expect(updatedRt.questStacks).toBe(0)
    expect(updatedRt.questCompletions).toBe(0)
  })

  it('mutateDowngrade triggers invalidation for removed affix', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Crit, chance: 0.5, critMult: 2.0 }],
      enchantmentIds: [EnchantmentType.QuestOverload],
    })
    setupSkill(skill)
    const rt = state.affixSkillStates.get(skill.id)!
    rt.questCompletions = 2

    mutateDowngrade(skill.id)

    const updated = state.affixSkills.get(skill.id)!
    expect(updated.enchantmentIds).not.toContain(EnchantmentType.QuestOverload)
    const updatedRt = state.affixSkillStates.get(skill.id)!
    expect(updatedRt.questStacks).toBe(0)
    expect(updatedRt.questCompletions).toBe(0)
  })
})

// ============================================================
// AC8 — mutationApplied 事件 → ApprenticeAdapt 成长
// ============================================================
describe('mutationApplied event (AC8)', () => {
  it('mutateA triggers ApprenticeAdapt growth (+0.15)', () => {
    // Skill being mutated
    const skill = makeSkill({ id: 'skill_mutated' })
    setupSkill(skill)
    state.mutagenInventory = 10

    // Another skill with ApprenticeAdapt enchantment
    const adaptSkill = makeSkill({
      id: 'skill_adapt',
      enchantmentIds: [EnchantmentType.ApprenticeAdapt],
    })
    setupSkill(adaptSkill)

    mutateA('skill_mutated', 0)

    const adaptRt = state.affixSkillStates.get('skill_adapt')!
    expect(adaptRt.apprenticeAccumulated).toBeCloseTo(0.15, 4)
  })

  it('mutateUpgrade triggers ApprenticeAdapt growth', () => {
    const skill = makeWhiteSkill()
    setupSkill(skill)
    state.mutagenInventory = 10

    const adaptSkill = makeSkill({
      id: 'skill_adapt',
      enchantmentIds: [EnchantmentType.ApprenticeAdapt],
    })
    setupSkill(adaptSkill)

    mutateUpgrade(skill.id)

    const adaptRt = state.affixSkillStates.get('skill_adapt')!
    expect(adaptRt.apprenticeAccumulated).toBeCloseTo(0.15, 4)
  })

  it('mutateDowngrade triggers ApprenticeAdapt growth', () => {
    const skill = makeSkill()
    setupSkill(skill)

    const adaptSkill = makeSkill({
      id: 'skill_adapt',
      enchantmentIds: [EnchantmentType.ApprenticeAdapt],
    })
    setupSkill(adaptSkill)

    mutateDowngrade(skill.id)

    const adaptRt = state.affixSkillStates.get('skill_adapt')!
    expect(adaptRt.apprenticeAccumulated).toBeCloseTo(0.15, 4)
  })

  it('no growth when no skill has ApprenticeAdapt', () => {
    const skill = makeSkill()
    setupSkill(skill)
    state.mutagenInventory = 10

    mutateA(skill.id, 0)

    // No crash, no growth anywhere
    const rt = state.affixSkillStates.get(skill.id)!
    // apprenticeAccumulated should be 0 unless skill itself has adapt
    expect(rt.apprenticeAccumulated).toBe(0)
  })
})
