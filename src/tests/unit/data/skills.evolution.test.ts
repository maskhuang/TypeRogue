// ============================================
// 打字肉鸽 - 技能进化数据测试
// ============================================
// Story 15.1: 进化分支数据设计

import { describe, it, expect } from 'vitest'
import {
  SKILLS,
  EVOLUTIONS,
  EVOLUTION_MODIFIER_DEFS,
  SKILL_MODIFIER_DEFS,
  getSkillModifierFactory,
  getEvolutionBranches,
} from '../../../src/data/skills'
import type { EvolutionBranch } from '../../../src/core/types'
import type { PipelineContext } from '../../../src/systems/modifiers/ModifierTypes'

// === 进化分支数据 ===

describe('Evolution System (Story 15.1)', () => {
  // === 5.1 数据完整性 ===
  describe('EVOLUTIONS data integrity', () => {
    it('should contain exactly 12 evolution branches', () => {
      expect(Object.keys(EVOLUTIONS)).toHaveLength(12)
    })

    it('should have all required fields for each branch', () => {
      for (const [id, branch] of Object.entries(EVOLUTIONS)) {
        expect(branch.id).toBe(id)
        expect(branch.name).toBeTruthy()
        expect(branch.icon).toBeTruthy()
        expect(branch.description).toBeTruthy()
        expect(branch.skillId).toBeTruthy()
        expect(['A', 'B']).toContain(branch.branch)
        expect(branch.condition.minLevel).toBeGreaterThan(0)
        expect(branch.condition.goldCost).toBeGreaterThan(0)
      }
    })

    it('should have 2 branches per skill (one A, one B)', () => {
      const skillBranches = new Map<string, string[]>()
      for (const branch of Object.values(EVOLUTIONS)) {
        const branches = skillBranches.get(branch.skillId) ?? []
        branches.push(branch.branch)
        skillBranches.set(branch.skillId, branches)
      }
      for (const [skillId, branches] of skillBranches) {
        expect(branches).toHaveLength(2)
        expect(branches).toContain('A')
        expect(branches).toContain('B')
      }
    })

    it('should cover exactly 6 skills', () => {
      const skillIds = new Set(Object.values(EVOLUTIONS).map(b => b.skillId))
      expect(skillIds.size).toBe(6)
      expect(skillIds).toContain('burst')
      expect(skillIds).toContain('amp')
      expect(skillIds).toContain('echo')
      expect(skillIds).toContain('freeze')
      expect(skillIds).toContain('lone')
      expect(skillIds).toContain('core')
    })

    it('should follow naming convention {skillId}_{branchName}', () => {
      for (const [id, branch] of Object.entries(EVOLUTIONS)) {
        expect(id.startsWith(branch.skillId + '_')).toBe(true)
      }
    })
  })

  // === 5.5 进化条件 ===
  describe('Evolution conditions', () => {
    it('all branches should require minLevel=3', () => {
      for (const branch of Object.values(EVOLUTIONS)) {
        expect(branch.condition.minLevel).toBe(3)
      }
    })

    it('goldCost should be in range 40-60', () => {
      for (const branch of Object.values(EVOLUTIONS)) {
        expect(branch.condition.goldCost).toBeGreaterThanOrEqual(40)
        expect(branch.condition.goldCost).toBeLessThanOrEqual(60)
      }
    })

    it('burst evolutions should cost 40 gold (score type)', () => {
      expect(EVOLUTIONS.burst_inferno.condition.goldCost).toBe(40)
      expect(EVOLUTIONS.burst_precision.condition.goldCost).toBe(40)
    })

    it('amp evolutions should cost 50 gold (multiply type)', () => {
      expect(EVOLUTIONS.amp_crescendo.condition.goldCost).toBe(50)
      expect(EVOLUTIONS.amp_overdrive.condition.goldCost).toBe(50)
    })

    it('echo evolutions should cost 50 gold (chain type)', () => {
      expect(EVOLUTIONS.echo_resonance.condition.goldCost).toBe(50)
      expect(EVOLUTIONS.echo_phantom.condition.goldCost).toBe(50)
    })

    it('freeze evolutions should cost 40 gold (time type)', () => {
      expect(EVOLUTIONS.freeze_permafrost.condition.goldCost).toBe(40)
      expect(EVOLUTIONS.freeze_chrono.condition.goldCost).toBe(40)
    })

    it('lone evolutions should cost 60 gold (rare burst type)', () => {
      expect(EVOLUTIONS.lone_hermit.condition.goldCost).toBe(60)
      expect(EVOLUTIONS.lone_shadow.condition.goldCost).toBe(60)
    })

    it('core evolutions should cost 60 gold (passive type)', () => {
      expect(EVOLUTIONS.core_nexus.condition.goldCost).toBe(60)
      expect(EVOLUTIONS.core_fusion.condition.goldCost).toBe(60)
    })
  })

  // === 5.4 数据一致性 ===
  describe('Data consistency', () => {
    it('all SKILLS[x].evolutions IDs should exist in EVOLUTIONS', () => {
      for (const [skillId, skill] of Object.entries(SKILLS)) {
        if (skill.evolutions) {
          for (const branchId of skill.evolutions) {
            expect(EVOLUTIONS[branchId]).toBeDefined()
            expect(EVOLUTIONS[branchId].skillId).toBe(skillId)
          }
        }
      }
    })

    it('all EVOLUTIONS entries should have matching SKILLS evolutions reference', () => {
      for (const branch of Object.values(EVOLUTIONS)) {
        const skill = SKILLS[branch.skillId]
        expect(skill).toBeDefined()
        expect(skill.evolutions).toBeDefined()
        expect(skill.evolutions).toContain(branch.id)
      }
    })

    it('all EVOLUTIONS entries should have matching EVOLUTION_MODIFIER_DEFS factory', () => {
      for (const branchId of Object.keys(EVOLUTIONS)) {
        expect(EVOLUTION_MODIFIER_DEFS[branchId]).toBeDefined()
        expect(typeof EVOLUTION_MODIFIER_DEFS[branchId]).toBe('function')
      }
    })

    it('EVOLUTION_MODIFIER_DEFS should not have extra entries beyond EVOLUTIONS', () => {
      const evolKeys = Object.keys(EVOLUTIONS)
      const factoryKeys = Object.keys(EVOLUTION_MODIFIER_DEFS)
      expect(factoryKeys.sort()).toEqual(evolKeys.sort())
    })

    it('exactly 6 SKILLS should have evolutions field', () => {
      const withEvolutions = Object.entries(SKILLS).filter(([_, s]) => s.evolutions)
      expect(withEvolutions).toHaveLength(6)
    })
  })

  // === 5.2 工厂输出 ===
  describe('Evolution modifier factories', () => {
    const level3Ctx: PipelineContext = {
      combo: 15,
      skillsTriggeredThisWord: 3,
      adjacentSkillCount: 2,
      shieldCount: 1,
    }

    describe('burst_inferno', () => {
      it('should produce score modifier with combo_gte:10 condition', () => {
        const mods = EVOLUTION_MODIFIER_DEFS.burst_inferno('burst', 3)
        expect(mods).toHaveLength(1)
        expect(mods[0].effect?.type).toBe('score')
        expect(mods[0].condition).toEqual({ type: 'combo_gte', value: 10 })
      })

      it('should double the base skill value', () => {
        const baseMods = SKILL_MODIFIER_DEFS.burst('burst', 3)
        const evolMods = EVOLUTION_MODIFIER_DEFS.burst_inferno('burst', 3)
        expect(evolMods[0].effect!.value).toBe(baseMods[0].effect!.value * 2)
      })

      it('should use source skill:burst (not skill:burst_inferno)', () => {
        const mods = EVOLUTION_MODIFIER_DEFS.burst_inferno('burst', 3)
        expect(mods[0].source).toBe('skill:burst')
      })
    })

    describe('burst_precision', () => {
      it('should produce score modifier (halved) and multiply modifier', () => {
        const mods = EVOLUTION_MODIFIER_DEFS.burst_precision('burst', 3)
        expect(mods).toHaveLength(2)
        expect(mods[0].effect?.type).toBe('score')
        expect(mods[1].effect?.type).toBe('multiply')
      })

      it('should have halved score compared to base', () => {
        const baseMods = SKILL_MODIFIER_DEFS.burst('burst', 3)
        const evolMods = EVOLUTION_MODIFIER_DEFS.burst_precision('burst', 3)
        expect(evolMods[0].effect!.value).toBe(Math.floor(baseMods[0].effect!.value * 0.5))
      })

      it('should add +0.3 multiply', () => {
        const mods = EVOLUTION_MODIFIER_DEFS.burst_precision('burst', 3)
        expect(mods[1].effect!.value).toBe(0.3)
      })
    })

    describe('amp_crescendo', () => {
      it('should increase multiply with more skills triggered', () => {
        const ctx0: PipelineContext = { skillsTriggeredThisWord: 0 }
        const ctx3: PipelineContext = { skillsTriggeredThisWord: 3 }
        const mods0 = EVOLUTION_MODIFIER_DEFS.amp_crescendo('amp', 3, ctx0)
        const mods3 = EVOLUTION_MODIFIER_DEFS.amp_crescendo('amp', 3, ctx3)
        expect(mods3[0].effect!.value).toBeGreaterThan(mods0[0].effect!.value)
      })

      it('should add 0.1 per skill triggered', () => {
        const ctx0: PipelineContext = { skillsTriggeredThisWord: 0 }
        const ctx1: PipelineContext = { skillsTriggeredThisWord: 1 }
        const mods0 = EVOLUTION_MODIFIER_DEFS.amp_crescendo('amp', 3, ctx0)
        const mods1 = EVOLUTION_MODIFIER_DEFS.amp_crescendo('amp', 3, ctx1)
        expect(mods1[0].effect!.value - mods0[0].effect!.value).toBeCloseTo(0.1)
      })

      it('should have same base value as original amp', () => {
        const ctx0: PipelineContext = { skillsTriggeredThisWord: 0 }
        const baseMods = SKILL_MODIFIER_DEFS.amp('amp', 3)
        const evolMods = EVOLUTION_MODIFIER_DEFS.amp_crescendo('amp', 3, ctx0)
        expect(evolMods[0].effect!.value).toBe(baseMods[0].effect!.value)
      })
    })

    describe('amp_overdrive', () => {
      it('should double multiply value compared to base', () => {
        const baseMods = SKILL_MODIFIER_DEFS.amp('amp', 3)
        const evolMods = EVOLUTION_MODIFIER_DEFS.amp_overdrive('amp', 3)
        expect(evolMods[0].effect!.value).toBe(baseMods[0].effect!.value * 2)
      })

      it('should include set_word_cooldown behavior', () => {
        const mods = EVOLUTION_MODIFIER_DEFS.amp_overdrive('amp', 3)
        expect(mods).toHaveLength(2)
        const cooldown = mods.find(m => m.behavior?.type === 'set_word_cooldown')
        expect(cooldown).toBeDefined()
      })
    })

    describe('echo_resonance', () => {
      it('should produce score and set_echo_flag (same as echo)', () => {
        const mods = EVOLUTION_MODIFIER_DEFS.echo_resonance('echo', 3)
        expect(mods).toHaveLength(2)
        expect(mods[0].effect?.type).toBe('score')
        expect(mods[1].behavior?.type).toBe('set_echo_flag')
      })

      it('should have same score value as base echo', () => {
        const baseMods = SKILL_MODIFIER_DEFS.echo('echo', 3)
        const evolMods = EVOLUTION_MODIFIER_DEFS.echo_resonance('echo', 3)
        expect(evolMods[0].effect!.value).toBe(baseMods[0].effect!.value)
      })
    })

    describe('echo_phantom', () => {
      it('should produce score and trigger_random_adjacent behavior', () => {
        const mods = EVOLUTION_MODIFIER_DEFS.echo_phantom('echo', 3)
        expect(mods).toHaveLength(2)
        expect(mods[0].effect?.type).toBe('score')
        expect(mods[1].behavior?.type).toBe('trigger_random_adjacent')
      })
    })

    describe('freeze_permafrost', () => {
      it('should produce time modifier with fixed 1.5 value', () => {
        const mods = EVOLUTION_MODIFIER_DEFS.freeze_permafrost('freeze', 3)
        expect(mods).toHaveLength(1)
        expect(mods[0].effect?.type).toBe('time')
        expect(mods[0].effect?.value).toBe(1.5)
      })
    })

    describe('freeze_chrono', () => {
      it('should produce restore_combo behavior with triggerEvery=3', () => {
        const mods = EVOLUTION_MODIFIER_DEFS.freeze_chrono('freeze', 3)
        expect(mods).toHaveLength(1)
        expect(mods[0].behavior?.type).toBe('restore_combo')
        if (mods[0].behavior?.type === 'restore_combo') {
          expect(mods[0].behavior.triggerEvery).toBe(3)
        }
      })

      it('should not produce any numerical effect', () => {
        const mods = EVOLUTION_MODIFIER_DEFS.freeze_chrono('freeze', 3)
        expect(mods[0].effect).toBeUndefined()
      })
    })

    describe('lone_hermit', () => {
      it('should triple score compared to base lone', () => {
        const baseMods = SKILL_MODIFIER_DEFS.lone('lone', 3)
        const evolMods = EVOLUTION_MODIFIER_DEFS.lone_hermit('lone', 3)
        expect(evolMods[0].effect!.value).toBe(baseMods[0].effect!.value * 3)
      })

      it('should keep skills_triggered_this_word:1 condition', () => {
        const mods = EVOLUTION_MODIFIER_DEFS.lone_hermit('lone', 3)
        expect(mods[0].condition).toEqual({ type: 'skills_triggered_this_word', value: 1 })
      })
    })

    describe('lone_shadow', () => {
      it('should return modifiers when 0 skills triggered (first trigger)', () => {
        const ctx: PipelineContext = { skillsTriggeredThisWord: 0 }
        const mods = EVOLUTION_MODIFIER_DEFS.lone_shadow('lone', 3, ctx)
        expect(mods).toHaveLength(1)
        expect(mods[0].effect?.type).toBe('score')
      })

      it('should return modifiers when 1 skill triggered (lone only)', () => {
        const ctx: PipelineContext = { skillsTriggeredThisWord: 1 }
        const mods = EVOLUTION_MODIFIER_DEFS.lone_shadow('lone', 3, ctx)
        expect(mods).toHaveLength(1)
        expect(mods[0].effect?.type).toBe('score')
      })

      it('should return modifiers when 2 skills triggered (relaxed)', () => {
        const ctx: PipelineContext = { skillsTriggeredThisWord: 2 }
        const mods = EVOLUTION_MODIFIER_DEFS.lone_shadow('lone', 3, ctx)
        expect(mods).toHaveLength(1)
      })

      it('should return empty when >2 skills triggered', () => {
        const ctx: PipelineContext = { skillsTriggeredThisWord: 3 }
        const mods = EVOLUTION_MODIFIER_DEFS.lone_shadow('lone', 3, ctx)
        expect(mods).toHaveLength(0)
      })

      it('should double score compared to base lone', () => {
        const ctx: PipelineContext = { skillsTriggeredThisWord: 1 }
        const baseMods = SKILL_MODIFIER_DEFS.lone('lone', 3)
        const evolMods = EVOLUTION_MODIFIER_DEFS.lone_shadow('lone', 3, ctx)
        expect(evolMods[0].effect!.value).toBe(baseMods[0].effect!.value * 2)
      })
    })

    describe('core_nexus', () => {
      it('should return empty when no triggers', () => {
        const ctx: PipelineContext = { skillsTriggeredThisWord: 0 }
        const mods = EVOLUTION_MODIFIER_DEFS.core_nexus('core', 3, ctx)
        expect(mods).toHaveLength(0)
      })

      it('should apply 15% bonus per 3-trigger stack', () => {
        const ctx: PipelineContext = { skillsTriggeredThisWord: 3 }
        const mods = EVOLUTION_MODIFIER_DEFS.core_nexus('core', 3, ctx)
        expect(mods).toHaveLength(1)
        expect(mods[0].effect?.value).toBeCloseTo(1.15)
        expect(mods[0].effect?.stacking).toBe('multiplicative')
        expect(mods[0].layer).toBe('enhance')
      })

      it('should stack: 6 triggers = 2 stacks = 30% bonus', () => {
        const ctx: PipelineContext = { skillsTriggeredThisWord: 6 }
        const mods = EVOLUTION_MODIFIER_DEFS.core_nexus('core', 3, ctx)
        expect(mods[0].effect?.value).toBeCloseTo(1.30)
      })

      it('should not produce base score (no self-score)', () => {
        const ctx: PipelineContext = { skillsTriggeredThisWord: 6 }
        const mods = EVOLUTION_MODIFIER_DEFS.core_nexus('core', 3, ctx)
        const scoreMods = mods.filter(m => m.layer === 'base')
        expect(scoreMods).toHaveLength(0)
      })
    })

    describe('core_fusion', () => {
      it('should produce base score from adjacent count', () => {
        const ctx: PipelineContext = { adjacentSkillCount: 3, skillsTriggeredThisWord: 0 }
        const mods = EVOLUTION_MODIFIER_DEFS.core_fusion('core', 3, ctx)
        const baseMod = mods.find(m => m.layer === 'base')
        expect(baseMod).toBeDefined()
        expect(baseMod!.effect!.value).toBe(6) // 3 adjacent × 2
      })

      it('should apply 5% enhance per 3-trigger stack', () => {
        const ctx: PipelineContext = { adjacentSkillCount: 2, skillsTriggeredThisWord: 3 }
        const mods = EVOLUTION_MODIFIER_DEFS.core_fusion('core', 3, ctx)
        const enhanceMod = mods.find(m => m.layer === 'enhance')
        expect(enhanceMod).toBeDefined()
        expect(enhanceMod!.effect!.value).toBeCloseTo(1.05)
      })

      it('should return empty when no adjacent skills and no stacks', () => {
        const ctx: PipelineContext = { adjacentSkillCount: 0, skillsTriggeredThisWord: 0 }
        const mods = EVOLUTION_MODIFIER_DEFS.core_fusion('core', 3, ctx)
        expect(mods).toHaveLength(0)
      })
    })

    // === 共通属性测试 ===
    describe('Common factory properties', () => {
      it('all factories should use source skill:{skillId} (not branchId)', () => {
        for (const [branchId, branch] of Object.entries(EVOLUTIONS)) {
          const factory = EVOLUTION_MODIFIER_DEFS[branchId]
          const mods = factory(branch.skillId, 3, level3Ctx)
          for (const mod of mods) {
            expect(mod.source).toBe(`skill:${branch.skillId}`)
          }
        }
      })

      it('all factories should set sourceType to skill', () => {
        for (const [branchId, branch] of Object.entries(EVOLUTIONS)) {
          const factory = EVOLUTION_MODIFIER_DEFS[branchId]
          const mods = factory(branch.skillId, 3, level3Ctx)
          for (const mod of mods) {
            expect(mod.sourceType).toBe('skill')
          }
        }
      })

      it('all factories should produce at least 1 modifier with favorable context', () => {
        // Each factory gets its own favorable context
        const favorableContexts: Record<string, PipelineContext> = {
          lone_shadow: { skillsTriggeredThisWord: 1 },  // needs ≤2
          core_nexus: { skillsTriggeredThisWord: 3 },    // needs ≥3
          core_fusion: { adjacentSkillCount: 2, skillsTriggeredThisWord: 0 }, // needs adjacent > 0
        }
        for (const [branchId, branch] of Object.entries(EVOLUTIONS)) {
          const factory = EVOLUTION_MODIFIER_DEFS[branchId]
          const ctx = favorableContexts[branchId] ?? level3Ctx
          const mods = factory(branch.skillId, 3, ctx)
          expect(mods.length, `${branchId} should produce modifiers`).toBeGreaterThanOrEqual(1)
        }
      })
    })
  })

  // === 5.3 查询测试 ===
  describe('getSkillModifierFactory', () => {
    it('should return base factory when no evolvedSkills', () => {
      const factory = getSkillModifierFactory('burst')
      expect(factory).toBe(SKILL_MODIFIER_DEFS.burst)
    })

    it('should return base factory when evolvedSkills is empty Map', () => {
      const factory = getSkillModifierFactory('burst', new Map())
      expect(factory).toBe(SKILL_MODIFIER_DEFS.burst)
    })

    it('should return evolution factory when skill is evolved', () => {
      const evolved = new Map([['burst', 'burst_inferno']])
      const factory = getSkillModifierFactory('burst', evolved)
      expect(factory).toBe(EVOLUTION_MODIFIER_DEFS.burst_inferno)
    })

    it('should return base factory for non-evolved skill', () => {
      const evolved = new Map([['burst', 'burst_inferno']])
      const factory = getSkillModifierFactory('amp', evolved)
      expect(factory).toBe(SKILL_MODIFIER_DEFS.amp)
    })

    it('should return base factory when branchId is invalid', () => {
      const evolved = new Map([['burst', 'nonexistent_branch']])
      const factory = getSkillModifierFactory('burst', evolved)
      expect(factory).toBe(SKILL_MODIFIER_DEFS.burst)
    })
  })

  describe('getEvolutionBranches', () => {
    it('should return 2 branches for skill with evolutions', () => {
      const branches = getEvolutionBranches('burst')
      expect(branches).toHaveLength(2)
      expect(branches[0].id).toBe('burst_inferno')
      expect(branches[1].id).toBe('burst_precision')
    })

    it('should return empty array for skill without evolutions', () => {
      const branches = getEvolutionBranches('shield')
      expect(branches).toHaveLength(0)
    })

    it('should return empty array for unknown skill', () => {
      const branches = getEvolutionBranches('nonexistent')
      expect(branches).toHaveLength(0)
    })

    it('should return EvolutionBranch objects with correct skillId', () => {
      const branches = getEvolutionBranches('amp')
      for (const b of branches) {
        expect(b.skillId).toBe('amp')
      }
    })
  })
})
