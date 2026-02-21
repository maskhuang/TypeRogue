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
    it('level 1 → base shield value=1 + on_error interceptor', () => {
      const mods = SKILL_MODIFIER_DEFS.shield('shield', 1)
      expect(mods).toHaveLength(2)
      const shieldMod = mods.find(m => m.trigger === 'on_skill_trigger')!
      expect(shieldMod.id).toBe('skill:shield:shield')
      expect(shieldMod.layer).toBe('base')
      expect(shieldMod.phase).toBe('calculate')
      expect(shieldMod.effect).toEqual({ type: 'shield', value: 1, stacking: 'additive' })
      const protectMod = mods.find(m => m.trigger === 'on_error')!
      expect(protectMod.id).toBe('skill:shield:protect')
      expect(protectMod.phase).toBe('before')
      expect(protectMod.behavior).toEqual({ type: 'intercept' })
      expect(protectMod.priority).toBe(50)
    })

    it('level 3 → shield value=3', () => {
      const mods = SKILL_MODIFIER_DEFS.shield('shield', 3)
      const shieldMod = mods.find(m => m.trigger === 'on_skill_trigger')!
      expect(shieldMod.effect!.value).toBe(3)
    })
  })

  // === core (重设计: enhance multiply, 每3次触发+bonusPerStack) ===
  describe('core', () => {
    it('skillsTriggeredThisWord=0 → 返回空数组', () => {
      const mods = SKILL_MODIFIER_DEFS.core('core', 1, {})
      expect(mods).toHaveLength(0)
    })

    it('skillsTriggeredThisWord=2 → 返回空数组 (不足3次)', () => {
      const ctx: PipelineContext = { skillsTriggeredThisWord: 2 }
      const mods = SKILL_MODIFIER_DEFS.core('core', 1, ctx)
      expect(mods).toHaveLength(0)
    })

    it('skillsTriggeredThisWord=3 → enhance score ×1.1', () => {
      const ctx: PipelineContext = { skillsTriggeredThisWord: 3 }
      const mods = SKILL_MODIFIER_DEFS.core('core', 1, ctx)
      expect(mods).toHaveLength(1)
      const m = mods[0]
      expect(m.id).toBe('skill:core:enhance')
      expect(m.source).toBe('skill:core')
      expect(m.layer).toBe('enhance')
      expect(m.trigger).toBe('on_skill_trigger')
      expect(m.phase).toBe('calculate')
      expect(m.effect).toEqual({ type: 'score', value: 1.1, stacking: 'multiplicative' })
    })

    it('skillsTriggeredThisWord=6 → enhance score ×1.2 (2 stacks)', () => {
      const ctx: PipelineContext = { skillsTriggeredThisWord: 6 }
      const mods = SKILL_MODIFIER_DEFS.core('core', 1, ctx)
      expect(mods).toHaveLength(1)
      expect(mods[0].effect!.value).toBeCloseTo(1.2)
    })

    it('level 2, skillsTriggeredThisWord=3 → score ×1.15', () => {
      const ctx: PipelineContext = { skillsTriggeredThisWord: 3 }
      const mods = SKILL_MODIFIER_DEFS.core('core', 2, ctx)
      expect(mods).toHaveLength(1)
      expect(mods[0].effect!.value).toBeCloseTo(1.15) // 1 + (10+5)/100 = 1.15
    })

    it('level 3, skillsTriggeredThisWord=3 → score ×1.2', () => {
      const ctx: PipelineContext = { skillsTriggeredThisWord: 3 }
      const mods = SKILL_MODIFIER_DEFS.core('core', 3, ctx)
      expect(mods).toHaveLength(1)
      expect(mods[0].effect!.value).toBeCloseTo(1.2) // 1 + (10+10)/100 = 1.2
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
    it('base score + after set_echo_flag 行为', () => {
      const mods = SKILL_MODIFIER_DEFS.echo('echo', 1)
      expect(mods).toHaveLength(2)
      const scoreMod = mods.find(m => m.phase === 'calculate')!
      expect(scoreMod.id).toBe('skill:echo:score')
      expect(scoreMod.layer).toBe('base')
      expect(scoreMod.effect).toEqual({ type: 'score', value: 2, stacking: 'additive' })
      const flagMod = mods.find(m => m.phase === 'after')!
      expect(flagMod.id).toBe('skill:echo:flag')
      expect(flagMod.behavior).toEqual({ type: 'set_echo_flag' })
    })

    it('level 3 → score value=4', () => {
      const mods = SKILL_MODIFIER_DEFS.echo('echo', 3)
      const scoreMod = mods.find(m => m.phase === 'calculate')!
      expect(scoreMod.effect!.value).toBe(4) // 2 + 1*2 = 4
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
    it('返回 2 个 Modifier — base score + after set_ripple_flag', () => {
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

    it('after behavior modifier: set_ripple_flag', () => {
      const mods = SKILL_MODIFIER_DEFS.ripple('ripple', 1)
      const after = mods.find(m => m.phase === 'after')!
      expect(after.id).toBe('skill:ripple:flag')
      expect(after.layer).toBe('base')
      expect(after.behavior).toEqual({ type: 'set_ripple_flag' })
    })

    it('level 3 → score value=5', () => {
      const mods = SKILL_MODIFIER_DEFS.ripple('ripple', 3)
      const base = mods.find(m => m.phase === 'calculate')!
      expect(base.effect!.value).toBe(5)
    })
  })

  // === Story 12.1: gamble ===
  describe('gamble', () => {
    it('level 1 → base score value=15, random(0.5) 条件', () => {
      const mods = SKILL_MODIFIER_DEFS.gamble('gamble', 1)
      expect(mods).toHaveLength(1)
      const m = mods[0]
      expect(m.id).toBe('skill:gamble:score')
      expect(m.source).toBe('skill:gamble')
      expect(m.sourceType).toBe('skill')
      expect(m.layer).toBe('base')
      expect(m.trigger).toBe('on_skill_trigger')
      expect(m.phase).toBe('calculate')
      expect(m.effect).toEqual({ type: 'score', value: 15, stacking: 'additive' })
      expect(m.condition).toEqual({ type: 'random', probability: 0.5 })
    })

    it('level 3 → score value=25', () => {
      const mods = SKILL_MODIFIER_DEFS.gamble('gamble', 3)
      expect(mods[0].effect!.value).toBe(25) // 15 + 5*2 = 25
    })
  })

  // === Story 12.1: chain ===
  describe('chain', () => {
    it('level 1 → base multiply value=0.1, different_skill_from_last 条件', () => {
      const mods = SKILL_MODIFIER_DEFS.chain('chain', 1)
      expect(mods).toHaveLength(1)
      const m = mods[0]
      expect(m.id).toBe('skill:chain:multiply')
      expect(m.source).toBe('skill:chain')
      expect(m.layer).toBe('base')
      expect(m.trigger).toBe('on_skill_trigger')
      expect(m.phase).toBe('calculate')
      expect(m.effect).toEqual({ type: 'multiply', value: 0.1, stacking: 'additive' })
      expect(m.condition).toEqual({ type: 'different_skill_from_last' })
    })

    it('level 3 → multiply value=0.2', () => {
      const mods = SKILL_MODIFIER_DEFS.chain('chain', 3)
      expect(mods[0].effect!.value).toBe(0.2) // 10 + 5*2 = 20, /100 = 0.2
    })
  })

  // === Story 12.1: overclock ===
  describe('overclock', () => {
    it('level 1 → enhance score ×1.5, skills_triggered_gte(3) 条件', () => {
      const mods = SKILL_MODIFIER_DEFS.overclock('overclock', 1)
      expect(mods).toHaveLength(1)
      const m = mods[0]
      expect(m.id).toBe('skill:overclock:enhance')
      expect(m.source).toBe('skill:overclock')
      expect(m.sourceType).toBe('skill')
      expect(m.layer).toBe('enhance')
      expect(m.trigger).toBe('on_skill_trigger')
      expect(m.phase).toBe('calculate')
      expect(m.effect).toEqual({ type: 'score', value: 1.5, stacking: 'multiplicative' })
      expect(m.condition).toEqual({ type: 'skills_triggered_gte', value: 3 })
    })

    it('level 2 → score ×1.6', () => {
      const mods = SKILL_MODIFIER_DEFS.overclock('overclock', 2)
      expect(mods[0].effect!.value).toBeCloseTo(1.6) // 1 + (50+10)/100 = 1.6
    })

    it('level 3 → score ×1.7', () => {
      const mods = SKILL_MODIFIER_DEFS.overclock('overclock', 3)
      expect(mods[0].effect!.value).toBeCloseTo(1.7) // 1 + (50+20)/100 = 1.7
    })
  })

  // === Story 12.2: pulse ===
  describe('pulse', () => {
    it('after 阶段 pulse_counter 行为, timeBonus=1', () => {
      const mods = SKILL_MODIFIER_DEFS.pulse('pulse', 1)
      expect(mods).toHaveLength(1)
      const m = mods[0]
      expect(m.id).toBe('skill:pulse:counter')
      expect(m.phase).toBe('after')
      expect(m.trigger).toBe('on_skill_trigger')
      expect(m.behavior).toEqual({ type: 'pulse_counter', timeBonus: 1 })
    })

    it('level 3 → timeBonus=2', () => {
      const mods = SKILL_MODIFIER_DEFS.pulse('pulse', 3)
      expect((mods[0].behavior as any).timeBonus).toBe(2) // 1 + 0.5*2 = 2
    })
  })

  // === Story 12.2: sentinel ===
  describe('sentinel', () => {
    it('shieldCount=2 → score = 2*2 = 4', () => {
      const ctx = { shieldCount: 2 }
      const mods = SKILL_MODIFIER_DEFS.sentinel('sentinel', 1, ctx)
      expect(mods).toHaveLength(1)
      const m = mods[0]
      expect(m.id).toBe('skill:sentinel:score')
      expect(m.trigger).toBe('on_skill_trigger')
      expect(m.phase).toBe('calculate')
      expect(m.effect).toEqual({ type: 'score', value: 4, stacking: 'additive' })
    })

    it('level 3, shieldCount=1 → score = 1*4 = 4', () => {
      const ctx = { shieldCount: 1 }
      const mods = SKILL_MODIFIER_DEFS.sentinel('sentinel', 3, ctx)
      expect(mods[0].effect!.value).toBe(4) // (2 + 1*2) * 1 = 4
    })

    it('shieldCount=0 → score = 0', () => {
      const ctx = { shieldCount: 0 }
      const mods = SKILL_MODIFIER_DEFS.sentinel('sentinel', 1, ctx)
      expect(mods[0].effect!.value).toBe(0)
    })
  })

  // === Story 12.2: mirror ===
  describe('mirror', () => {
    it('enhance 层 after 阶段 trigger_row_mirror 行为', () => {
      const mods = SKILL_MODIFIER_DEFS.mirror('mirror', 1)
      expect(mods).toHaveLength(1)
      const m = mods[0]
      expect(m.id).toBe('skill:mirror:trigger')
      expect(m.layer).toBe('enhance')
      expect(m.phase).toBe('after')
      expect(m.behavior).toEqual({ type: 'trigger_row_mirror' })
    })
  })

  // === Story 12.2: leech ===
  describe('leech', () => {
    it('skillsTriggeredThisWord=0 → score=0', () => {
      const mods = SKILL_MODIFIER_DEFS.leech('leech', 1, {})
      expect(mods).toHaveLength(1)
      expect(mods[0].effect!.value).toBe(0)
    })

    it('skillsTriggeredThisWord=3 → score=6', () => {
      const mods = SKILL_MODIFIER_DEFS.leech('leech', 1, { skillsTriggeredThisWord: 3 })
      expect(mods[0].effect!.value).toBe(6) // 3 * 2 = 6
    })

    it('level 3, skillsTriggeredThisWord=2 → score=8', () => {
      const mods = SKILL_MODIFIER_DEFS.leech('leech', 3, { skillsTriggeredThisWord: 2 })
      expect(mods[0].effect!.value).toBe(8) // 2 * (2 + 1*2) = 8
    })
  })

  // === Story 12.3: anchor ===
  describe('anchor', () => {
    it('enhance 层 score ×1.15 (base=15 → 1+15/100=1.15)', () => {
      const mods = SKILL_MODIFIER_DEFS.anchor('anchor', 1)
      expect(mods).toHaveLength(1)
      const m = mods[0]
      expect(m.id).toBe('skill:anchor:enhance')
      expect(m.source).toBe('skill:anchor')
      expect(m.sourceType).toBe('skill')
      expect(m.layer).toBe('enhance')
      expect(m.trigger).toBe('on_skill_trigger')
      expect(m.phase).toBe('calculate')
      expect(m.effect).toEqual({ type: 'score', value: 1.15, stacking: 'multiplicative' })
      expect(m.priority).toBe(100)
    })

    it('grow=0 → 所有等级都是 ×1.15', () => {
      const mods2 = SKILL_MODIFIER_DEFS.anchor('anchor', 2)
      expect(mods2[0].effect!.value).toBeCloseTo(1.15)
      const mods3 = SKILL_MODIFIER_DEFS.anchor('anchor', 3)
      expect(mods3[0].effect!.value).toBeCloseTo(1.15)
    })
  })

  // === 工厂覆盖 ===
  describe('全部 18 个技能有工厂', () => {
    const allSkills = ['burst', 'amp', 'freeze', 'shield', 'core', 'aura', 'lone', 'echo', 'void', 'ripple', 'gamble', 'chain', 'overclock', 'pulse', 'sentinel', 'mirror', 'leech', 'anchor']

    it('SKILL_MODIFIER_DEFS 包含所有 18 个技能', () => {
      for (const skillId of allSkills) {
        expect(SKILL_MODIFIER_DEFS[skillId], `missing factory for ${skillId}`).toBeDefined()
        expect(typeof SKILL_MODIFIER_DEFS[skillId]).toBe('function')
      }
    })

    it('所有工厂返回 Modifier[]', () => {
      for (const skillId of allSkills) {
        const mods = SKILL_MODIFIER_DEFS[skillId](skillId, 1)
        expect(Array.isArray(mods), `${skillId} factory should return array`).toBe(true)
        // core 在无触发上下文时返回空数组，这是正常行为
        if (skillId !== 'core') {
          expect(mods.length, `${skillId} factory should return at least 1 modifier`).toBeGreaterThanOrEqual(1)
        }
      }
    })
  })
})
