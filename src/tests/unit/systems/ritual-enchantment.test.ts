// ============================================
// Story 41.1: 仪式附魔系统单元测试 (Task 2.6)
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { state } from '../../../src/core/state'
import {
  getEligibleSkills,
  generateRitualCandidates,
  pickRitualChoices,
  applyRitualEnchantment,
  shouldShowRitual,
  getRitualRounds,
} from '../../../src/systems/ritualEnchantment'
import type { RitualCandidate } from '../../../src/systems/ritualEnchantment'
import { EnchantmentType } from '../../../src/data/affixes'
import { PositionRelation } from '../../../src/data/keyboardTopology'
import type { AffixSkillInstance } from '../../../src/data/affixes'

// Mock sound to avoid side effects
vi.mock('../../../src/effects/sound', () => ({
  playSound: vi.fn(),
}))

function makeAffixSkill(
  id: string,
  overrides: Partial<AffixSkillInstance> = {},
): AffixSkillInstance {
  return {
    id,
    name: `Skill ${id}`,
    icon: '⚡',
    resource: 'base' as const,
    baseValues: [5, 8, 12] as [number, number, number],
    level: 1,
    rarity: 0,
    affixes: [],
    enchantmentIds: [],
    ...overrides,
  }
}

describe('Story 41.1: 仪式附魔系统', () => {
  beforeEach(() => {
    state.player.skills.clear()
    state.player.relics.clear()
    state.affixSkills.clear()
    state.classId = 'none'
  })

  describe('getEligibleSkills', () => {
    it('返回有空附魔槽的技能', () => {
      const skill = makeAffixSkill('s1')
      state.affixSkills.set('s1', skill)

      const eligible = getEligibleSkills()
      expect(eligible).toHaveLength(1)
      expect(eligible[0].skillId).toBe('s1')
      expect(eligible[0].emptySlots).toBe(1) // 默认 1 槽
    })

    it('跳过已填满附魔槽的技能', () => {
      const skill = makeAffixSkill('s1', {
        enchantmentIds: [EnchantmentType.ApprenticeSelf],
      })
      state.affixSkills.set('s1', skill)

      const eligible = getEligibleSkills()
      expect(eligible).toHaveLength(0)
    })

    it('无技能时返回空数组', () => {
      expect(getEligibleSkills()).toHaveLength(0)
    })
  })

  describe('pickRitualChoices', () => {
    it('候选不超过上限时返回全部', () => {
      const candidates: RitualCandidate[] = [
        { enchType: EnchantmentType.ApprenticeSelf },
      ]
      const choices = pickRitualChoices(candidates)
      expect(choices).toHaveLength(1)
    })

    it('候选超过上限时截断为 2 个（无 fate_fork）', () => {
      const candidates: RitualCandidate[] = [
        { enchType: EnchantmentType.ApprenticeSelf },
        { enchType: EnchantmentType.ApprenticeWord },
        { enchType: EnchantmentType.ApprenticeCombo },
        { enchType: EnchantmentType.ApprenticeStage },
      ]
      const choices = pickRitualChoices(candidates)
      expect(choices).toHaveLength(2)
    })

    it('持有 fate_fork 时截断为 3 个', () => {
      state.player.relics.add('fate_fork')
      const candidates: RitualCandidate[] = [
        { enchType: EnchantmentType.ApprenticeSelf },
        { enchType: EnchantmentType.ApprenticeWord },
        { enchType: EnchantmentType.ApprenticeCombo },
        { enchType: EnchantmentType.ApprenticeStage },
      ]
      const choices = pickRitualChoices(candidates)
      expect(choices).toHaveLength(3)
    })
  })

  describe('applyRitualEnchantment', () => {
    it('写入附魔到技能的 enchantmentIds', () => {
      const skill = makeAffixSkill('s1')
      const candidate: RitualCandidate = { enchType: EnchantmentType.ApprenticeSelf }

      applyRitualEnchantment('s1', skill, candidate)

      expect(skill.enchantmentIds).toContain(EnchantmentType.ApprenticeSelf)
    })

    it('Transmute 候选分配 transmuteResource', () => {
      const skill = makeAffixSkill('s1')
      const candidate: RitualCandidate = {
        enchType: EnchantmentType.Transmute,
        transmuteRes: 'gold',
      }

      applyRitualEnchantment('s1', skill, candidate)

      expect(skill.enchantmentIds).toContain(EnchantmentType.Transmute)
      expect(skill.transmuteResource).toBe('gold')
    })

    it('ApprenticeNeighbor 候选分配 neighborPosRel', () => {
      const skill = makeAffixSkill('s1')
      const candidate: RitualCandidate = {
        enchType: EnchantmentType.ApprenticeNeighbor,
        neighborRel: PositionRelation.Adjacent,
      }

      applyRitualEnchantment('s1', skill, candidate)

      expect(skill.enchantmentIds).toContain(EnchantmentType.ApprenticeNeighbor)
      expect(skill.neighborPosRel).toBe(PositionRelation.Adjacent)
    })
  })

  describe('shouldShowRitual', () => {
    it('Node 4 → Node 5 (Act 1→2 转折) 且有空槽技能时返回 true', () => {
      state.affixSkills.set('s1', makeAffixSkill('s1'))
      expect(shouldShowRitual(4)).toBe(true)
    })

    it('Node 4 但无空槽技能时返回 false', () => {
      expect(shouldShowRitual(4)).toBe(false)
    })

    it('非 Act 转折节点返回 false', () => {
      state.affixSkills.set('s1', makeAffixSkill('s1'))
      expect(shouldShowRitual(1)).toBe(false)
      expect(shouldShowRitual(5)).toBe(false)
      expect(shouldShowRitual(8)).toBe(false)
    })
  })

  describe('getRitualRounds', () => {
    it('返回 1 轮', () => {
      expect(getRitualRounds()).toBe(1)
    })
  })
})
