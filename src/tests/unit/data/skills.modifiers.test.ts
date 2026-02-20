// ============================================
// 打字肉鸽 - SKILL_MODIFIER_DEFS 单元测试
// ============================================
// Story 11.5: 现有技能迁移 — Modifier 工厂测试

import { describe, it, expect } from 'vitest'
import { SKILL_MODIFIER_DEFS } from '../../../src/data/skills'
import type { PipelineContext } from '../../../src/systems/modifiers/ModifierTypes'

describe('SKILL_MODIFIER_DEFS', () => {
  // === burst ===
  describe('burst', () => {
    it('level 1 → base score value=5', () => {
      const mods = SKILL_MODIFIER_DEFS.burst('burst', 1)
      expect(mods).toHaveLength(1)
      const m = mods[0]
      expect(m.id).toBe('skill:burst:score')
      expect(m.source).toBe('skill:burst')
      expect(m.sourceType).toBe('skill')
      expect(m.layer).toBe('base')
      expect(m.trigger).toBe('on_skill_trigger')
      expect(m.phase).toBe('calculate')
      expect(m.effect).toEqual({ type: 'score', value: 5, stacking: 'additive' })
      expect(m.condition).toBeUndefined()
      expect(m.priority).toBe(100)
    })

    it('level 3 → score value=9', () => {
      const mods = SKILL_MODIFIER_DEFS.burst('burst', 3)
      expect(mods[0].effect!.value).toBe(9)
    })
  })

  // === amp ===
  describe('amp', () => {
    it('level 1 → base multiply value=0.2', () => {
      const mods = SKILL_MODIFIER_DEFS.amp('amp', 1)
      expect(mods).toHaveLength(1)
      const m = mods[0]
      expect(m.id).toBe('skill:amp:multiply')
      expect(m.layer).toBe('base')
      expect(m.phase).toBe('calculate')
      expect(m.effect).toEqual({ type: 'multiply', value: 0.2, stacking: 'additive' })
    })

    it('level 3 → multiply value=0.3', () => {
      const mods = SKILL_MODIFIER_DEFS.amp('amp', 3)
      expect(mods[0].effect!.value).toBe(0.3)
    })
  })

  // === freeze ===
  describe('freeze', () => {
    it('level 1 → base time value=2', () => {
      const mods = SKILL_MODIFIER_DEFS.freeze('freeze', 1)
      expect(mods).toHaveLength(1)
      const m = mods[0]
      expect(m.id).toBe('skill:freeze:time')
      expect(m.layer).toBe('base')
      expect(m.phase).toBe('calculate')
      expect(m.effect).toEqual({ type: 'time', value: 2, stacking: 'additive' })
    })

    it('level 3 → time value=3', () => {
      const mods = SKILL_MODIFIER_DEFS.freeze('freeze', 3)
      expect(mods[0].effect!.value).toBe(3)
    })
  })

  // === shield ===
  describe('shield', () => {
    it('level 1 → base shield value=1', () => {
      const mods = SKILL_MODIFIER_DEFS.shield('shield', 1)
      expect(mods).toHaveLength(1)
      const m = mods[0]
      expect(m.id).toBe('skill:shield:shield')
      expect(m.layer).toBe('base')
      expect(m.phase).toBe('calculate')
      expect(m.effect).toEqual({ type: 'shield', value: 1, stacking: 'additive' })
    })

    it('level 3 → shield value=3', () => {
      const mods = SKILL_MODIFIER_DEFS.shield('shield', 3)
      expect(mods[0].effect!.value).toBe(3)
    })
  })

  // === core ===
  describe('core', () => {
    it('adjacentSkillCount=0 → score value=5', () => {
      const mods = SKILL_MODIFIER_DEFS.core('core', 1, {})
      expect(mods).toHaveLength(1)
      const m = mods[0]
      expect(m.id).toBe('skill:core:score')
      expect(m.layer).toBe('base')
      expect(m.effect).toEqual({ type: 'score', value: 5, stacking: 'additive' })
    })

    it('adjacentSkillCount=3 → score value=5+6=11', () => {
      const ctx: PipelineContext = { adjacentSkillCount: 3 }
      const mods = SKILL_MODIFIER_DEFS.core('core', 1, ctx)
      expect(mods[0].effect!.value).toBe(11)
    })

    it('level 2, adjacentSkillCount=2 → score value=7+4=11', () => {
      const ctx: PipelineContext = { adjacentSkillCount: 2 }
      const mods = SKILL_MODIFIER_DEFS.core('core', 2, ctx)
      expect(mods[0].effect!.value).toBe(11)
    })
  })

  // === aura ===
  describe('aura', () => {
    it('返回 2 个 Modifier — base score + enhance score×1.5', () => {
      const mods = SKILL_MODIFIER_DEFS.aura('aura', 1)
      expect(mods).toHaveLength(2)
    })

    it('base modifier: score = val/3 = 1', () => {
      const mods = SKILL_MODIFIER_DEFS.aura('aura', 1)
      const base = mods.find(m => m.layer === 'base')!
      expect(base.id).toBe('skill:aura:score')
      expect(base.phase).toBe('calculate')
      expect(base.effect).toEqual({ type: 'score', value: 1, stacking: 'additive' })
    })

    it('enhance modifier: score ×1.5', () => {
      const mods = SKILL_MODIFIER_DEFS.aura('aura', 1)
      const enhance = mods.find(m => m.layer === 'enhance')!
      expect(enhance.id).toBe('skill:aura:enhance')
      expect(enhance.phase).toBe('calculate')
      expect(enhance.effect).toEqual({ type: 'score', value: 1.5, stacking: 'multiplicative' })
    })

    it('level 3: base score = val/3 = (3+2)/3 ≈ 1.67', () => {
      const mods = SKILL_MODIFIER_DEFS.aura('aura', 3)
      const base = mods.find(m => m.layer === 'base')!
      expect(base.effect!.value).toBeCloseTo(5 / 3)
    })
  })

  // === lone ===
  describe('lone', () => {
    it('有 condition skills_triggered_this_word=1', () => {
      const mods = SKILL_MODIFIER_DEFS.lone('lone', 1)
      expect(mods).toHaveLength(1)
      const m = mods[0]
      expect(m.id).toBe('skill:lone:score')
      expect(m.layer).toBe('base')
      expect(m.phase).toBe('calculate')
      expect(m.condition).toEqual({ type: 'skills_triggered_this_word', value: 1 })
      expect(m.effect).toEqual({ type: 'score', value: 8, stacking: 'additive' })
    })

    it('level 3 → score value=14', () => {
      const mods = SKILL_MODIFIER_DEFS.lone('lone', 3)
      expect(mods[0].effect!.value).toBe(14)
    })
  })

  // === echo ===
  describe('echo', () => {
    it('after 阶段 trigger_adjacent 行为', () => {
      const mods = SKILL_MODIFIER_DEFS.echo('echo', 1)
      expect(mods).toHaveLength(1)
      const m = mods[0]
      expect(m.id).toBe('skill:echo:trigger_adjacent')
      expect(m.layer).toBe('base')
      expect(m.trigger).toBe('on_skill_trigger')
      expect(m.phase).toBe('after')
      expect(m.behavior).toEqual({ type: 'trigger_adjacent' })
      expect(m.effect).toBeUndefined()
    })
  })

  // === void ===
  describe('void', () => {
    it('skillsTriggeredThisWord=1 (只有自己) → score value=12', () => {
      const ctx: PipelineContext = { skillsTriggeredThisWord: 1 }
      const mods = SKILL_MODIFIER_DEFS.void('void', 1, ctx)
      expect(mods).toHaveLength(1)
      const m = mods[0]
      expect(m.id).toBe('skill:void:score')
      expect(m.layer).toBe('base')
      expect(m.effect).toEqual({ type: 'score', value: 12, stacking: 'additive' })
    })

    it('skillsTriggeredThisWord=3 → score value=max(0, 12-2)=10', () => {
      const ctx: PipelineContext = { skillsTriggeredThisWord: 3 }
      const mods = SKILL_MODIFIER_DEFS.void('void', 1, ctx)
      expect(mods[0].effect!.value).toBe(10)
    })

    it('skillsTriggeredThisWord=15 → score value=0 (clamped)', () => {
      const ctx: PipelineContext = { skillsTriggeredThisWord: 15 }
      const mods = SKILL_MODIFIER_DEFS.void('void', 1, ctx)
      expect(mods[0].effect!.value).toBe(0)
    })

    it('level 3, skillsTriggeredThisWord=2 → score value=max(0, 20-1)=19', () => {
      const ctx: PipelineContext = { skillsTriggeredThisWord: 2 }
      const mods = SKILL_MODIFIER_DEFS.void('void', 3, ctx)
      expect(mods[0].effect!.value).toBe(19)
    })
  })

  // === ripple ===
  describe('ripple', () => {
    it('返回 2 个 Modifier — base score + after buff_next_skill', () => {
      const mods = SKILL_MODIFIER_DEFS.ripple('ripple', 1)
      expect(mods).toHaveLength(2)
    })

    it('base score modifier: value=3', () => {
      const mods = SKILL_MODIFIER_DEFS.ripple('ripple', 1)
      const base = mods.find(m => m.phase === 'calculate')!
      expect(base.id).toBe('skill:ripple:score')
      expect(base.layer).toBe('base')
      expect(base.effect).toEqual({ type: 'score', value: 3, stacking: 'additive' })
    })

    it('after behavior modifier: buff_next_skill multiplier=1.5', () => {
      const mods = SKILL_MODIFIER_DEFS.ripple('ripple', 1)
      const after = mods.find(m => m.phase === 'after')!
      expect(after.id).toBe('skill:ripple:buff')
      expect(after.layer).toBe('base')
      expect(after.behavior).toEqual({ type: 'buff_next_skill', multiplier: 1.5 })
    })

    it('level 3 → score value=5', () => {
      const mods = SKILL_MODIFIER_DEFS.ripple('ripple', 3)
      const base = mods.find(m => m.phase === 'calculate')!
      expect(base.effect!.value).toBe(5)
    })
  })

  // === 工厂覆盖 ===
  describe('全部 10 个技能有工厂', () => {
    const allSkills = ['burst', 'amp', 'freeze', 'shield', 'core', 'aura', 'lone', 'echo', 'void', 'ripple']

    it('SKILL_MODIFIER_DEFS 包含所有 10 个技能', () => {
      for (const skillId of allSkills) {
        expect(SKILL_MODIFIER_DEFS[skillId], `missing factory for ${skillId}`).toBeDefined()
        expect(typeof SKILL_MODIFIER_DEFS[skillId]).toBe('function')
      }
    })

    it('所有工厂返回 Modifier[]', () => {
      for (const skillId of allSkills) {
        const mods = SKILL_MODIFIER_DEFS[skillId](skillId, 1)
        expect(Array.isArray(mods), `${skillId} factory should return array`).toBe(true)
        expect(mods.length, `${skillId} factory should return at least 1 modifier`).toBeGreaterThanOrEqual(1)
      }
    })
  })
})
