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
  mutate,
  mutateSingle,
  getMutateCost,
  canMutate,
  invalidateQuestEnchantment,
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
// getMutateCost: 1 + 已蜕变次数
// ============================================================
describe('getMutateCost', () => {
  it('first mutation costs 1', () => {
    expect(getMutateCost('skill_test_001')).toBe(1)
  })

  it('second mutation costs 2', () => {
    state.mutationACounts.set('skill_test_001', 1)
    expect(getMutateCost('skill_test_001')).toBe(2)
  })

  it('third mutation costs 3', () => {
    state.mutationACounts.set('skill_test_001', 2)
    expect(getMutateCost('skill_test_001')).toBe(3)
  })

  it('different skills have independent counters', () => {
    state.mutationACounts.set('skill_a', 3)
    expect(getMutateCost('skill_b')).toBe(1)
  })
})

// ============================================================
// canMutate
// ============================================================
describe('canMutate', () => {
  it('returns false for white skill (no affixes)', () => {
    const skill = makeWhiteSkill()
    setupSkill(skill)
    expect(canMutate(skill.id)).toBe(false)
  })

  it('returns true for blue skill with sufficient mutagen', () => {
    const skill = makeSkill()
    setupSkill(skill)
    state.mutagenInventory = 10
    expect(canMutate(skill.id)).toBe(true)
  })

  it('returns false when mutagen insufficient', () => {
    const skill = makeSkill()
    setupSkill(skill)
    state.mutagenInventory = 0
    expect(canMutate(skill.id)).toBe(false)
  })
})

// ============================================================
// mutate: 将所有词条替换为池中随机新词条
// ============================================================
describe('mutate', () => {
  it('replaces all affixes on a blue skill (1 affix)', () => {
    const skill = makeSkill()
    setupSkill(skill)
    state.mutagenInventory = 10

    const result = mutate(skill.id)
    expect(result.success).toBe(true)
    expect(result.mutagenCost).toBe(1)

    const updated = state.affixSkills.get(skill.id)!
    expect(updated.affixes).toHaveLength(1)
    expect(state.mutagenInventory).toBe(9) // 10 - 1
  })

  it('replaces all 3 affixes on an orange skill', () => {
    const skill = makeOrangeSkill()
    setupSkill(skill)
    state.mutagenInventory = 10

    const result = mutate(skill.id)
    expect(result.success).toBe(true)

    const updated = state.affixSkills.get(skill.id)!
    expect(updated.affixes).toHaveLength(3)
    // rarity unchanged
    expect(updated.rarity).toBe(3)
  })

  it('new affixes are all different types', () => {
    const skill = makeOrangeSkill()
    setupSkill(skill)
    state.mutagenInventory = 10

    mutate(skill.id)

    const updated = state.affixSkills.get(skill.id)!
    const types = updated.affixes.map(a => a.type)
    expect(new Set(types).size).toBe(types.length)
  })

  it('increments mutation count', () => {
    const skill = makeSkill()
    setupSkill(skill)
    state.mutagenInventory = 20

    mutate(skill.id)
    expect(state.mutationACounts.get(skill.id)).toBe(1)

    mutate(skill.id)
    expect(state.mutationACounts.get(skill.id)).toBe(2)
  })

  it('cost increases with mutation count', () => {
    const skill = makeSkill()
    setupSkill(skill)
    state.mutagenInventory = 100

    mutate(skill.id) // cost 1
    expect(state.mutagenInventory).toBe(99)
    mutate(skill.id) // cost 2
    expect(state.mutagenInventory).toBe(97)
    mutate(skill.id) // cost 3
    expect(state.mutagenInventory).toBe(94)
  })

  it('fails when mutagen insufficient', () => {
    const skill = makeSkill()
    setupSkill(skill)
    state.mutagenInventory = 0

    const result = mutate(skill.id)
    expect(result.success).toBe(false)
    expect(result.error).toContain('变异素不足')
    expect(state.mutagenInventory).toBe(0)
  })

  it('fails for white skill (no affixes)', () => {
    const skill = makeWhiteSkill()
    setupSkill(skill)
    state.mutagenInventory = 10

    const result = mutate(skill.id)
    expect(result.success).toBe(false)
    expect(result.error).toContain('无词条')
  })

  it('fails for non-existent skill', () => {
    state.mutagenInventory = 10
    const result = mutate('nonexistent')
    expect(result.success).toBe(false)
  })
})

// ============================================================
// 名称更新
// ============================================================
describe('Name update after mutation', () => {
  it('mutate updates skill name', () => {
    const skill = makeSkill()
    setupSkill(skill)
    state.mutagenInventory = 10

    mutate(skill.id)
    const updated = state.affixSkills.get(skill.id)!
    expect(updated.name).toBeDefined()
    expect(updated.name.length).toBeGreaterThan(0)
  })
})

// ============================================================
// 任务附魔失效
// ============================================================
describe('invalidateQuestEnchantment', () => {
  it('removes quest enchantment when corresponding affix is removed', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Crit, chance: 0.5, critMult: 2.0 }],
      enchantmentIds: [EnchantmentType.QuestOverload],
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
      enchantmentIds: [EnchantmentType.QuestDevour],
      rarity: 2 as 0 | 1 | 2 | 3,
    })
    setupSkill(skill)

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

    invalidateQuestEnchantment(skill.id, AffixType.Crit)

    const updated = state.affixSkills.get(skill.id)!
    expect(updated.enchantmentIds).not.toContain(EnchantmentType.QuestOverload)
    expect(updated.enchantmentIds).toContain(EnchantmentType.QuestDevour)
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

    invalidateQuestEnchantment(skill.id, AffixType.Resonance)

    const updated = state.affixSkills.get(skill.id)!
    expect(updated.enchantmentIds).not.toContain(EnchantmentType.QuestResonance)
  })

  it('mutate triggers invalidation when affix type changes', () => {
    const skill = makeSkill({
      affixes: [{ type: AffixType.Crit, chance: 0.5, critMult: 2.0 }],
      enchantmentIds: [EnchantmentType.QuestOverload],
    })
    setupSkill(skill)
    state.mutagenInventory = 10
    const rt = state.affixSkillStates.get(skill.id)!
    rt.questStacks = 3
    rt.questCompletions = 1

    // Mock random to force selection of Multiply (first entry in AFFIX_WEIGHTS)
    const spy = vi.spyOn(seededRandom, 'random').mockReturnValue(0.01)
    mutate(skill.id)
    spy.mockRestore()

    const updated = state.affixSkills.get(skill.id)!
    const updatedRt = state.affixSkillStates.get(skill.id)!
    expect(updated.affixes[0].type).not.toBe(AffixType.Crit)
    expect(updated.enchantmentIds).not.toContain(EnchantmentType.QuestOverload)
    expect(updatedRt.questStacks).toBe(0)
    expect(updatedRt.questCompletions).toBe(0)
  })
})

// ============================================================
// mutationApplied 事件 → ApprenticeAdapt 成长
// ============================================================
describe('mutationApplied event', () => {
  it('mutate triggers ApprenticeAdapt growth (+0.15)', () => {
    const skill = makeSkill({ id: 'skill_mutated' })
    setupSkill(skill)
    state.mutagenInventory = 10

    const adaptSkill = makeSkill({
      id: 'skill_adapt',
      enchantmentIds: [EnchantmentType.ApprenticeAdapt],
    })
    setupSkill(adaptSkill)

    mutate('skill_mutated')

    const adaptRt = state.affixSkillStates.get('skill_adapt')!
    expect(adaptRt.apprenticeAccumulated).toBeCloseTo(0.15, 4)
  })

  it('no growth when no skill has ApprenticeAdapt', () => {
    const skill = makeSkill()
    setupSkill(skill)
    state.mutagenInventory = 10

    mutate(skill.id)

    const rt = state.affixSkillStates.get(skill.id)!
    expect(rt.apprenticeAccumulated).toBe(0)
  })
})

// ============================================================
// mutateSingle: 基因稳定器 — 单词条蜕变
// ============================================================
describe('mutateSingle (gene_stabilizer)', () => {
  it('replaces only the targeted affix, others unchanged', () => {
    const skill = makeOrangeSkill() // Crit + Pulse + Multiply
    setupSkill(skill)
    state.mutagenInventory = 10

    const origTypes = skill.affixes.map(a => a.type)
    const result = mutateSingle(skill.id, 0)
    expect(result.success).toBe(true)

    const updated = state.affixSkills.get(skill.id)!
    expect(updated.affixes).toHaveLength(3)
    // affixes[1] and affixes[2] should be unchanged
    expect(updated.affixes[1].type).toBe(origTypes[1])
    expect(updated.affixes[2].type).toBe(origTypes[2])
  })

  it('new affix excludes other existing affix types', () => {
    const skill = makeOrangeSkill() // Crit + Pulse + Multiply
    setupSkill(skill)
    state.mutagenInventory = 10

    const result = mutateSingle(skill.id, 0)
    expect(result.success).toBe(true)

    const updated = state.affixSkills.get(skill.id)!
    // New affix[0] should not be Pulse or Multiply
    expect(updated.affixes[0].type).not.toBe(AffixType.Pulse)
    expect(updated.affixes[0].type).not.toBe(AffixType.Multiply)
  })

  it('costs same as full mutate (1 + count)', () => {
    const skill = makeSkill()
    setupSkill(skill)
    state.mutagenInventory = 10

    const result = mutateSingle(skill.id, 0)
    expect(result.success).toBe(true)
    expect(result.mutagenCost).toBe(1)
    expect(state.mutagenInventory).toBe(9)
  })

  it('increments mutation count', () => {
    const skill = makeSkill()
    setupSkill(skill)
    state.mutagenInventory = 20

    mutateSingle(skill.id, 0)
    expect(state.mutationACounts.get(skill.id)).toBe(1)
  })

  it('returns oldAffix and newAffix', () => {
    const skill = makeSkill()
    setupSkill(skill)
    state.mutagenInventory = 10

    const result = mutateSingle(skill.id, 0)
    expect(result.success).toBe(true)
    expect(result.oldAffix).toBeDefined()
    expect(result.newAffix).toBeDefined()
  })

  it('fails for invalid affix index', () => {
    const skill = makeSkill()
    setupSkill(skill)
    state.mutagenInventory = 10

    const result = mutateSingle(skill.id, 5)
    expect(result.success).toBe(false)
    expect(result.error).toContain('索引无效')
  })

  it('fails for white skill', () => {
    const skill = makeWhiteSkill()
    setupSkill(skill)
    state.mutagenInventory = 10

    const result = mutateSingle(skill.id, 0)
    expect(result.success).toBe(false)
  })

  it('fails when mutagen insufficient', () => {
    const skill = makeSkill()
    setupSkill(skill)
    state.mutagenInventory = 0

    const result = mutateSingle(skill.id, 0)
    expect(result.success).toBe(false)
    expect(result.error).toContain('变异素不足')
  })
})
