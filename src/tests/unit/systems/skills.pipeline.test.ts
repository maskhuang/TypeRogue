// ============================================
// 打字肉鸽 - 技能管道集成测试
// ============================================
// Story 11.5: 现有技能迁移 — pipeline 集成 + 效果应用 + 行为回调

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SKILL_MODIFIER_DEFS, SKILLS } from '../../../src/data/skills'
import { ModifierRegistry } from '../../../src/systems/modifiers/ModifierRegistry'
import { EffectPipeline } from '../../../src/systems/modifiers/EffectPipeline'
import { BehaviorExecutor } from '../../../src/systems/modifiers/BehaviorExecutor'
import {
  createScopedRegistry,
  applyEffects,
  buildTriggerContext,
  generateFeedback,
  getAdjacentSkills,
} from '../../../src/systems/skills'
import { state, synergy, resetState } from '../../../src/core/state'
import type { PipelineContext, PipelineResult, EffectAccumulator } from '../../../src/systems/modifiers/ModifierTypes'

// === 工具函数 ===
function emptyEffects(): EffectAccumulator {
  return { score: 0, multiply: 0, time: 0, gold: 0, shield: 0 }
}

describe('技能管道集成', () => {
  beforeEach(() => {
    resetState()
  })

  // === createScopedRegistry ===
  describe('createScopedRegistry', () => {
    it('burst 单独 → 1 个 base modifier', () => {
      state.player.bindings.set('f', 'burst')
      state.player.skills.set('burst', { level: 1 })
      const ctx: PipelineContext = { skillsTriggeredThisWord: 1 }
      const registry = createScopedRegistry('burst', 1, 'f', ctx, false)
      const mods = registry.getAll()
      expect(mods.length).toBe(1)
      expect(mods[0].source).toBe('skill:burst')
      expect(mods[0].layer).toBe('base')
    })

    it('burst + 相邻 aura → base + enhance modifier', () => {
      state.player.bindings.set('f', 'burst')
      state.player.bindings.set('g', 'aura')
      state.player.skills.set('burst', { level: 1 })
      state.player.skills.set('aura', { level: 1 })
      const ctx: PipelineContext = {
        adjacentSkillCount: 1,
        adjacentSkillTypes: ['aura'],
        skillsTriggeredThisWord: 1,
      }
      const registry = createScopedRegistry('burst', 1, 'f', ctx, false)
      const mods = registry.getAll()
      // burst base score + aura enhance score (aura base score NOT included)
      const enhanceMod = mods.find(m => m.layer === 'enhance')
      expect(enhanceMod).toBeDefined()
      expect(enhanceMod!.effect!.type).toBe('score')
      expect(enhanceMod!.effect!.value).toBe(1.5)
    })

    it('ripple bonus 不再通过 createScopedRegistry 注入', () => {
      state.player.bindings.set('f', 'burst')
      state.player.skills.set('burst', { level: 1 })
      synergy.rippleBonus.set('f', 1.5)
      const ctx: PipelineContext = { skillsTriggeredThisWord: 1 }
      const registry = createScopedRegistry('burst', 1, 'f', ctx, false)
      const mods = registry.getAll()
      const globalMod = mods.find(m => m.layer === 'global')
      expect(globalMod).toBeUndefined()
    })

    it('echo isEcho=true → 无 set_echo_flag 行为', () => {
      state.player.bindings.set('f', 'echo')
      state.player.skills.set('echo', { level: 1 })
      const ctx: PipelineContext = { skillsTriggeredThisWord: 1 }
      const registry = createScopedRegistry('echo', 1, 'f', ctx, true)
      const mods = registry.getAll()
      const hasEchoFlag = mods.some(m => m.behavior?.type === 'set_echo_flag')
      expect(hasEchoFlag).toBe(false)
    })

    it('echo isEcho=false → 有 set_echo_flag 行为', () => {
      state.player.bindings.set('f', 'echo')
      state.player.skills.set('echo', { level: 1 })
      const ctx: PipelineContext = { skillsTriggeredThisWord: 1 }
      const registry = createScopedRegistry('echo', 1, 'f', ctx, false)
      const mods = registry.getAll()
      const hasEchoFlag = mods.some(m => m.behavior?.type === 'set_echo_flag')
      expect(hasEchoFlag).toBe(true)
    })
  })

  // === applyEffects ===
  describe('applyEffects', () => {
    it('score=10, multiplier=2.0 → wordScore += 20', () => {
      state.multiplier = 2.0
      const effects: EffectAccumulator = { ...emptyEffects(), score: 10 }
      applyEffects(effects)
      expect(state.wordScore).toBe(20)
    })

    it('multiply=0.2 → state.multiplier += 0.2', () => {
      state.multiplier = 1.0
      const effects: EffectAccumulator = { ...emptyEffects(), multiply: 0.2 }
      applyEffects(effects)
      expect(state.multiplier).toBeCloseTo(1.2)
    })

    it('time=2 → state.time += 2 (capped)', () => {
      state.time = 25
      state.timeMax = 30
      const effects: EffectAccumulator = { ...emptyEffects(), time: 2 }
      applyEffects(effects)
      expect(state.time).toBe(27)
    })

    it('time 上限为 timeMax + 10', () => {
      state.time = 38
      state.timeMax = 30
      const effects: EffectAccumulator = { ...emptyEffects(), time: 5 }
      applyEffects(effects)
      expect(state.time).toBe(40) // min(43, 30+10=40)
    })

    it('shield=1 → synergy.shieldCount += 1', () => {
      synergy.shieldCount = 0
      const effects: EffectAccumulator = { ...emptyEffects(), shield: 1 }
      applyEffects(effects)
      expect(synergy.shieldCount).toBe(1)
    })

    it('多效果同时应用', () => {
      state.multiplier = 1.5
      state.time = 20
      state.timeMax = 30
      const effects: EffectAccumulator = { score: 5, multiply: 0.1, time: 1, gold: 0, shield: 2 }
      applyEffects(effects)
      expect(state.wordScore).toBe(7.5) // 5 * 1.5
      expect(state.multiplier).toBeCloseTo(1.6)
      expect(state.time).toBe(21)
      expect(synergy.shieldCount).toBe(2)
    })
  })

  // === Pipeline 解析 ===
  describe('Pipeline 解析', () => {
    it('burst Lv1 → effects.score = 5', () => {
      const registry = new ModifierRegistry()
      registry.registerMany(SKILL_MODIFIER_DEFS.burst('burst', 1))
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
      expect(result.intercepted).toBe(false)
      expect(result.effects.score).toBe(5)
    })

    it('burst + aura enhance → effects.score = 5 * 1.5 = 7.5', () => {
      const registry = new ModifierRegistry()
      registry.registerMany(SKILL_MODIFIER_DEFS.burst('burst', 1))
      // 只注册 aura 的 enhance modifier（不注册 base）
      const auraMods = SKILL_MODIFIER_DEFS.aura('aura', 1)
      registry.registerMany(auraMods.filter(m => m.layer === 'enhance'))
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
      expect(result.effects.score).toBe(7.5)
    })

    it('burst + ripple global → effects.score = 5 * 1.5 = 7.5', () => {
      const registry = new ModifierRegistry()
      registry.registerMany(SKILL_MODIFIER_DEFS.burst('burst', 1))
      registry.register({
        id: 'bonus:ripple',
        source: 'bonus:ripple',
        sourceType: 'passive',
        layer: 'global',
        trigger: 'on_skill_trigger',
        phase: 'calculate',
        effect: { type: 'score', value: 1.5, stacking: 'multiplicative' },
        priority: 200,
      })
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
      expect(result.effects.score).toBe(7.5)
    })

    it('burst + aura + ripple → effects.score = 5 * 1.5 * 1.5 = 11.25', () => {
      const registry = new ModifierRegistry()
      registry.registerMany(SKILL_MODIFIER_DEFS.burst('burst', 1))
      const auraMods = SKILL_MODIFIER_DEFS.aura('aura', 1)
      registry.registerMany(auraMods.filter(m => m.layer === 'enhance'))
      registry.register({
        id: 'bonus:ripple',
        source: 'bonus:ripple',
        sourceType: 'passive',
        layer: 'global',
        trigger: 'on_skill_trigger',
        phase: 'calculate',
        effect: { type: 'score', value: 1.5, stacking: 'multiplicative' },
        priority: 200,
      })
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
      expect(result.effects.score).toBe(11.25)
    })

    it('lone 条件满足 (skillsTriggeredThisWord=1) → effects.score = 8', () => {
      const registry = new ModifierRegistry()
      registry.registerMany(SKILL_MODIFIER_DEFS.lone('lone', 1))
      const ctx: PipelineContext = { skillsTriggeredThisWord: 1 }
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger', ctx)
      expect(result.effects.score).toBe(8)
    })

    it('lone 条件不满足 (skillsTriggeredThisWord=2) → effects.score = 0', () => {
      const registry = new ModifierRegistry()
      registry.registerMany(SKILL_MODIFIER_DEFS.lone('lone', 1))
      const ctx: PipelineContext = { skillsTriggeredThisWord: 2 }
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger', ctx)
      expect(result.effects.score).toBe(0)
    })

    it('echo → effects.score=2 + pendingBehaviors 含 set_echo_flag', () => {
      const registry = new ModifierRegistry()
      registry.registerMany(SKILL_MODIFIER_DEFS.echo('echo', 1))
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
      expect(result.effects.score).toBe(2)
      expect(result.pendingBehaviors).toHaveLength(1)
      expect(result.pendingBehaviors[0].type).toBe('set_echo_flag')
    })

    it('ripple → effects.score=3 + pendingBehaviors 含 set_ripple_flag', () => {
      const registry = new ModifierRegistry()
      registry.registerMany(SKILL_MODIFIER_DEFS.ripple('ripple', 1))
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
      expect(result.effects.score).toBe(3)
      expect(result.pendingBehaviors).toHaveLength(1)
      expect(result.pendingBehaviors[0].type).toBe('set_ripple_flag')
    })

    it('amp Lv1 → effects.multiply = 0.2', () => {
      const registry = new ModifierRegistry()
      registry.registerMany(SKILL_MODIFIER_DEFS.amp('amp', 1))
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
      expect(result.effects.multiply).toBeCloseTo(0.2)
    })

    it('freeze Lv1 → effects.time = 2', () => {
      const registry = new ModifierRegistry()
      registry.registerMany(SKILL_MODIFIER_DEFS.freeze('freeze', 1))
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
      expect(result.effects.time).toBe(2)
    })

    it('shield Lv1 → effects.shield = 1', () => {
      const registry = new ModifierRegistry()
      registry.registerMany(SKILL_MODIFIER_DEFS.shield('shield', 1))
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
      expect(result.effects.shield).toBe(1)
    })
  })

  // === generateFeedback ===
  describe('generateFeedback', () => {
    it('burst: +N分 #4ecdc4', () => {
      state.multiplier = 2.0
      const effects: EffectAccumulator = { ...emptyEffects(), score: 5 }
      const fb = generateFeedback('burst', effects, { skillsTriggeredThisWord: 1 })
      expect(fb).not.toBeNull()
      expect(fb!.text).toBe('+10分')
      expect(fb!.color).toBe('#4ecdc4')
    })

    it('amp: 倍率+N #ffe66d', () => {
      const effects: EffectAccumulator = { ...emptyEffects(), multiply: 0.2 }
      const fb = generateFeedback('amp', effects, {})
      expect(fb).not.toBeNull()
      expect(fb!.text).toBe('倍率+0.2')
      expect(fb!.color).toBe('#ffe66d')
    })

    it('freeze: +N秒 #87ceeb', () => {
      const effects: EffectAccumulator = { ...emptyEffects(), time: 2 }
      const fb = generateFeedback('freeze', effects, {})
      expect(fb!.text).toBe('+2秒')
      expect(fb!.color).toBe('#87ceeb')
    })

    it('shield: 护盾+N #87ceeb', () => {
      const effects: EffectAccumulator = { ...emptyEffects(), shield: 1 }
      const fb = generateFeedback('shield', effects, {})
      expect(fb!.text).toBe('护盾+1')
      expect(fb!.color).toBe('#87ceeb')
    })

    it('core: null (被动，静默增强)', () => {
      state.multiplier = 1.5
      const effects: EffectAccumulator = { ...emptyEffects(), multiply: 0.1 }
      const fb = generateFeedback('core', effects, {})
      expect(fb).toBeNull()
    })

    it('aura: 无反馈', () => {
      const effects: EffectAccumulator = { ...emptyEffects(), score: 1 }
      const fb = generateFeedback('aura', effects, {})
      expect(fb).toBeNull()
    })

    it('lone 条件满足: 孤狼! +N #e74c3c', () => {
      state.multiplier = 2.0
      const effects: EffectAccumulator = { ...emptyEffects(), score: 8 }
      const fb = generateFeedback('lone', effects, { skillsTriggeredThisWord: 1 })
      expect(fb!.text).toBe('孤狼! +16')
      expect(fb!.color).toBe('#e74c3c')
    })

    it('lone 条件不满足: 孤狼失效... #666', () => {
      const effects: EffectAccumulator = { ...emptyEffects(), score: 0 }
      const fb = generateFeedback('lone', effects, { skillsTriggeredThisWord: 2 })
      expect(fb!.text).toBe('孤狼失效...')
      expect(fb!.color).toBe('#666')
    })

    it('echo: 回响→双触发 #e056fd', () => {
      const effects: EffectAccumulator = emptyEffects()
      const fb = generateFeedback('echo', effects, {})
      expect(fb!.text).toBe('回响→双触发')
      expect(fb!.color).toBe('#e056fd')
    })

    it('void 有扣减: 虚空+N (-M) #2c3e50', () => {
      state.multiplier = 1.0
      const effects: EffectAccumulator = { ...emptyEffects(), score: 10 }
      const fb = generateFeedback('void', effects, { skillsTriggeredThisWord: 3 })
      expect(fb!.text).toBe('虚空+10 (-2)')
      expect(fb!.color).toBe('#2c3e50')
    })

    it('void 无扣减: 虚空+N #2c3e50', () => {
      state.multiplier = 1.0
      const effects: EffectAccumulator = { ...emptyEffects(), score: 12 }
      const fb = generateFeedback('void', effects, { skillsTriggeredThisWord: 1 })
      expect(fb!.text).toBe('虚空+12')
      expect(fb!.color).toBe('#2c3e50')
    })

    it('ripple: 涟漪→传递 +N #3498db', () => {
      state.multiplier = 1.0
      const effects: EffectAccumulator = { ...emptyEffects(), score: 3 }
      const fb = generateFeedback('ripple', effects, { adjacentSkillCount: 2 })
      expect(fb!.text).toBe('涟漪→传递 +3')
      expect(fb!.color).toBe('#3498db')
    })
  })

  // === BehaviorExecutor 回调 ===
  describe('BehaviorExecutor 回调', () => {
    it('ripple pipeline → BehaviorExecutor 调用 onSetRippleFlag', () => {
      const registry = new ModifierRegistry()
      registry.registerMany(SKILL_MODIFIER_DEFS.ripple('ripple', 1))
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')

      const onSetRippleFlag = vi.fn()
      BehaviorExecutor.execute(result.pendingBehaviors, 0, { onSetRippleFlag })

      expect(onSetRippleFlag).toHaveBeenCalledOnce()
    })

    it('echo pipeline → BehaviorExecutor 调用 onSetEchoFlag', () => {
      const registry = new ModifierRegistry()
      registry.registerMany(SKILL_MODIFIER_DEFS.echo('echo', 1))
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')

      const onSetEchoFlag = vi.fn()
      BehaviorExecutor.execute(result.pendingBehaviors, 0, { onSetEchoFlag })

      expect(onSetEchoFlag).toHaveBeenCalledOnce()
    })

    it('echo isEcho=true → BehaviorExecutor 无 set_echo_flag 行为', () => {
      state.player.bindings.set('f', 'echo')
      state.player.skills.set('echo', { level: 1 })
      const ctx: PipelineContext = { skillsTriggeredThisWord: 1 }
      const registry = createScopedRegistry('echo', 1, 'f', ctx, true)
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')

      const onSetEchoFlag = vi.fn()
      BehaviorExecutor.execute(result.pendingBehaviors, 0, { onSetEchoFlag })

      expect(onSetEchoFlag).not.toHaveBeenCalled()
    })
  })

  // === aura 自增强回归测试 (H1) ===
  describe('aura 不自我增强', () => {
    it('aura 自身触发 → 只有 base score, 无 enhance 自乘', () => {
      state.player.bindings.set('f', 'aura')
      state.player.skills.set('aura', { level: 1 })
      const ctx: PipelineContext = { skillsTriggeredThisWord: 1 }
      const registry = createScopedRegistry('aura', 1, 'f', ctx, false)

      // registry 中不应有 enhance 层 modifier
      const mods = registry.getAll()
      const enhanceMod = mods.find(m => m.layer === 'enhance')
      expect(enhanceMod).toBeUndefined()

      // pipeline 解析：score = base only = 3/3 = 1（不乘 1.5）
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
      expect(result.effects.score).toBe(1)
    })

    it('aura 相邻 burst → burst 获得 enhance ×1.5', () => {
      state.player.bindings.set('f', 'burst')
      state.player.bindings.set('g', 'aura')
      state.player.skills.set('burst', { level: 1 })
      state.player.skills.set('aura', { level: 1 })
      const ctx: PipelineContext = {
        adjacentSkillCount: 1,
        adjacentSkillTypes: ['aura'],
        skillsTriggeredThisWord: 1,
      }
      const registry = createScopedRegistry('burst', 1, 'f', ctx, false)
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
      expect(result.effects.score).toBe(7.5) // 5 × 1.5
    })
  })

  // === Story 12.1: 新技能管道集成 ===
  describe('gamble 管道集成', () => {
    afterEach(() => vi.restoreAllMocks())

    it('gamble random win → effects.score = 15', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.3) // < 0.5 → win
      const registry = new ModifierRegistry()
      registry.registerMany(SKILL_MODIFIER_DEFS.gamble('gamble', 1))
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
      expect(result.effects.score).toBe(15)
    })

    it('gamble random lose → effects.score = 0', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.7) // >= 0.5 → lose
      const registry = new ModifierRegistry()
      registry.registerMany(SKILL_MODIFIER_DEFS.gamble('gamble', 1))
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
      expect(result.effects.score).toBe(0)
    })
  })

  describe('chain 管道集成', () => {
    it('chain 前一个技能不同 → effects.multiply = 0.1', () => {
      const registry = new ModifierRegistry()
      registry.registerMany(SKILL_MODIFIER_DEFS.chain('chain', 1))
      const ctx: PipelineContext = {
        currentSkillId: 'chain',
        lastTriggeredSkillId: 'burst',
      }
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger', ctx)
      expect(result.effects.multiply).toBeCloseTo(0.1)
    })

    it('chain 前一个技能相同 → effects.multiply = 0', () => {
      const registry = new ModifierRegistry()
      registry.registerMany(SKILL_MODIFIER_DEFS.chain('chain', 1))
      const ctx: PipelineContext = {
        currentSkillId: 'chain',
        lastTriggeredSkillId: 'chain',
      }
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger', ctx)
      expect(result.effects.multiply).toBe(0)
    })

    it('chain 无前置技能 → effects.multiply = 0', () => {
      const registry = new ModifierRegistry()
      registry.registerMany(SKILL_MODIFIER_DEFS.chain('chain', 1))
      const ctx: PipelineContext = { currentSkillId: 'chain' }
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger', ctx)
      expect(result.effects.multiply).toBe(0)
    })
  })

  describe('overclock 管道集成', () => {
    it('overclock + burst, 3rd trigger → score = 5 × 1.5 = 7.5', () => {
      const registry = new ModifierRegistry()
      // burst base
      registry.registerMany(SKILL_MODIFIER_DEFS.burst('burst', 1))
      // overclock enhance (模拟相邻注入)
      registry.registerMany(SKILL_MODIFIER_DEFS.overclock('overclock', 1))
      const ctx: PipelineContext = { skillsTriggeredThisWord: 3 }
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger', ctx)
      expect(result.effects.score).toBe(7.5)
    })

    it('overclock + burst, 2nd trigger → score = 5 (无增强)', () => {
      const registry = new ModifierRegistry()
      registry.registerMany(SKILL_MODIFIER_DEFS.burst('burst', 1))
      registry.registerMany(SKILL_MODIFIER_DEFS.overclock('overclock', 1))
      const ctx: PipelineContext = { skillsTriggeredThisWord: 2 }
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger', ctx)
      expect(result.effects.score).toBe(5)
    })

    it('overclock 单独触发 → score = 0 (无 base)', () => {
      const registry = new ModifierRegistry()
      registry.registerMany(SKILL_MODIFIER_DEFS.overclock('overclock', 1))
      const ctx: PipelineContext = { skillsTriggeredThisWord: 3 }
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger', ctx)
      expect(result.effects.score).toBe(0)
    })
  })

  // === Story 12.1: 新技能反馈 ===
  describe('generateFeedback 新技能', () => {
    it('gamble win: 豪赌! +N #f1c40f', () => {
      state.multiplier = 2.0
      const effects: EffectAccumulator = { ...emptyEffects(), score: 15 }
      const fb = generateFeedback('gamble', effects, {})
      expect(fb!.text).toBe('豪赌! +30')
      expect(fb!.color).toBe('#f1c40f')
    })

    it('gamble lose: 豪赌...空手 #666', () => {
      state.multiplier = 2.0
      const effects: EffectAccumulator = { ...emptyEffects(), score: 0 }
      const fb = generateFeedback('gamble', effects, {})
      expect(fb!.text).toBe('豪赌...空手')
      expect(fb!.color).toBe('#666')
    })

    it('chain active: 连锁! +N #e67e22', () => {
      const effects: EffectAccumulator = { ...emptyEffects(), multiply: 0.1 }
      const fb = generateFeedback('chain', effects, {})
      expect(fb!.text).toBe('连锁! +0.1')
      expect(fb!.color).toBe('#e67e22')
    })

    it('chain inactive: 连锁断裂... #666', () => {
      const effects: EffectAccumulator = { ...emptyEffects(), multiply: 0 }
      const fb = generateFeedback('chain', effects, {})
      expect(fb!.text).toBe('连锁断裂...')
      expect(fb!.color).toBe('#666')
    })

    it('overclock 条件满足: 超频! #e74c3c', () => {
      const effects: EffectAccumulator = { ...emptyEffects() }
      const fb = generateFeedback('overclock', effects, { skillsTriggeredThisWord: 3 })
      expect(fb!.text).toBe('超频!')
      expect(fb!.color).toBe('#e74c3c')
    })

    it('overclock 条件不满足: 超频待机... #666', () => {
      const effects: EffectAccumulator = { ...emptyEffects() }
      const fb = generateFeedback('overclock', effects, { skillsTriggeredThisWord: 2 })
      expect(fb!.text).toBe('超频待机...')
      expect(fb!.color).toBe('#666')
    })
  })

  // === 管道链路集成测试 (M2) ===
  describe('管道链路集成', () => {
    it('burst 完整链路: context → registry → resolve → applyEffects → feedback', () => {
      state.player.bindings.set('f', 'burst')
      state.player.skills.set('burst', { level: 1 })
      state.multiplier = 2.0
      synergy.wordSkillCount = 0

      // 1. buildTriggerContext
      const adjacent = getAdjacentSkills('f')
      synergy.wordSkillCount++
      const context = buildTriggerContext('f', adjacent)
      expect(context.skillsTriggeredThisWord).toBe(1)

      // 2. createScopedRegistry
      const registry = createScopedRegistry('burst', 1, 'f', context, false, adjacent)

      // 3. EffectPipeline.resolve
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger', context)
      expect(result.effects.score).toBe(5)

      // 4. applyEffects
      applyEffects(result.effects)
      expect(state.wordScore).toBe(10) // 5 × 2.0

      // 5. generateFeedback
      const fb = generateFeedback('burst', result.effects, context)
      expect(fb!.text).toBe('+10分')
    })

    it('burst + 相邻 aura 完整链路', () => {
      state.player.bindings.set('f', 'burst')
      state.player.bindings.set('g', 'aura')
      state.player.skills.set('burst', { level: 1 })
      state.player.skills.set('aura', { level: 1 })
      state.multiplier = 1.0

      const adjacent = getAdjacentSkills('f')
      synergy.wordSkillCount++
      const context = buildTriggerContext('f', adjacent)
      const registry = createScopedRegistry('burst', 1, 'f', context, false, adjacent)
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger', context)

      // burst 5 × aura enhance 1.5 = 7.5
      expect(result.effects.score).toBe(7.5)

      applyEffects(result.effects)
      expect(state.wordScore).toBe(7.5)

      const fb = generateFeedback('burst', result.effects, context)
      expect(fb!.text).toBe('+7分') // Math.floor(7.5 * 1.0) = 7
    })

    it('ripple 完整链路: score + set_ripple_flag 回调', () => {
      state.player.bindings.set('f', 'ripple')
      state.player.bindings.set('g', 'burst')
      state.player.skills.set('ripple', { level: 1 })
      state.player.skills.set('burst', { level: 1 })
      state.multiplier = 1.0

      const adjacent = getAdjacentSkills('f')
      synergy.wordSkillCount++
      const context = buildTriggerContext('f', adjacent)
      const registry = createScopedRegistry('ripple', 1, 'f', context, false, adjacent)
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger', context)

      expect(result.effects.score).toBe(3)
      expect(result.pendingBehaviors).toHaveLength(1)

      // 执行行为回调
      const onSetRippleFlag = vi.fn(() => {
        synergy.ripplePending = true
      })
      BehaviorExecutor.execute(result.pendingBehaviors, 0, { onSetRippleFlag })

      // 验证 ripple flag 已设置
      expect(onSetRippleFlag).toHaveBeenCalled()
      expect(synergy.ripplePending).toBe(true)
    })
  })

  // === Story 12.2: 新技能管道集成 ===
  describe('pulse 管道集成', () => {
    it('pulse → after 行为 pulse_counter, timeBonus=1', () => {
      const registry = new ModifierRegistry()
      registry.registerMany(SKILL_MODIFIER_DEFS.pulse('pulse', 1))
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
      expect(result.pendingBehaviors).toHaveLength(1)
      expect(result.pendingBehaviors[0].type).toBe('pulse_counter')
      if (result.pendingBehaviors[0].type === 'pulse_counter') {
        expect(result.pendingBehaviors[0].timeBonus).toBe(1)
      }
    })
  })

  describe('sentinel 管道集成', () => {
    it('sentinel shieldCount=2 → score=4', () => {
      const registry = new ModifierRegistry()
      const ctx: PipelineContext = { shieldCount: 2 }
      registry.registerMany(SKILL_MODIFIER_DEFS.sentinel('sentinel', 1, ctx))
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
      expect(result.effects.score).toBe(4) // 2 shields * base 2
    })

    it('sentinel shieldCount=0 → score=0', () => {
      const registry = new ModifierRegistry()
      const ctx: PipelineContext = { shieldCount: 0 }
      registry.registerMany(SKILL_MODIFIER_DEFS.sentinel('sentinel', 1, ctx))
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
      expect(result.effects.score).toBe(0)
    })
  })

  describe('leech 管道集成', () => {
    it('leech, 3 skills triggered → score = 6', () => {
      const registry = new ModifierRegistry()
      const ctx: PipelineContext = { skillsTriggeredThisWord: 3 }
      registry.registerMany(SKILL_MODIFIER_DEFS.leech('leech', 1, ctx))
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
      expect(result.effects.score).toBe(6) // 3 * 2
    })

    it('leech, 0 skills triggered → score = 0', () => {
      const registry = new ModifierRegistry()
      registry.registerMany(SKILL_MODIFIER_DEFS.leech('leech', 1, {}))
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
      expect(result.effects.score).toBe(0)
    })
  })

  describe('shield on_error 拦截', () => {
    it('shield factory 包含 on_error 拦截器', () => {
      const mods = SKILL_MODIFIER_DEFS.shield('shield', 1)
      const onErrorMod = mods.find(m => m.trigger === 'on_error')
      expect(onErrorMod).toBeDefined()
      expect(onErrorMod!.phase).toBe('before')
      expect(onErrorMod!.behavior).toEqual({ type: 'intercept' })
    })

    it('shield on_error → intercepted=true', () => {
      const registry = new ModifierRegistry()
      const mods = SKILL_MODIFIER_DEFS.shield('shield', 1)
      registry.registerMany(mods.filter(m => m.trigger === 'on_error'))
      const result = EffectPipeline.resolve(registry, 'on_error')
      expect(result.intercepted).toBe(true)
    })
  })

  describe('mirror 管道集成', () => {
    it('mirror → after 行为 trigger_row_mirror', () => {
      const registry = new ModifierRegistry()
      registry.registerMany(SKILL_MODIFIER_DEFS.mirror('mirror', 1))
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
      expect(result.pendingBehaviors).toHaveLength(1)
      expect(result.pendingBehaviors[0].type).toBe('trigger_row_mirror')
    })
  })

  // === Story 12.2: 新技能反馈 ===
  describe('generateFeedback 12.2 新技能', () => {
    it('echo: 回响→双触发 #e056fd', () => {
      const effects: EffectAccumulator = { ...emptyEffects(), score: 2 }
      const fb = generateFeedback('echo', effects, {})
      expect(fb!.text).toBe('回响→双触发')
      expect(fb!.color).toBe('#e056fd')
    })

    it('ripple 有分数: 涟漪→传递 +N #3498db', () => {
      state.multiplier = 2.0
      const effects: EffectAccumulator = { ...emptyEffects(), score: 3 }
      const fb = generateFeedback('ripple', effects, {})
      expect(fb!.text).toBe('涟漪→传递 +6')
      expect(fb!.color).toBe('#3498db')
    })

    it('ripple 无分数: 涟漪→传递 #3498db', () => {
      const effects: EffectAccumulator = emptyEffects()
      const fb = generateFeedback('ripple', effects, {})
      expect(fb!.text).toBe('涟漪→传递')
      expect(fb!.color).toBe('#3498db')
    })

    it('pulse: null (反馈在回调中)', () => {
      const effects: EffectAccumulator = emptyEffects()
      const fb = generateFeedback('pulse', effects, {})
      expect(fb).toBeNull()
    })

    it('sentinel: 有盾时显示分数', () => {
      const effects: EffectAccumulator = { ...emptyEffects(), score: 4 }
      const fb = generateFeedback('sentinel', effects, {})
      expect(fb!.text).toContain('哨兵')
      expect(fb!.color).toBe('#27ae60')
    })

    it('sentinel: 无盾时显示灰色', () => {
      const effects: EffectAccumulator = emptyEffects()
      const fb = generateFeedback('sentinel', effects, {})
      expect(fb!.text).toBe('哨兵(无盾)')
      expect(fb!.color).toBe('#666')
    })

    it('mirror: 镜像! #9b59b6', () => {
      const effects: EffectAccumulator = emptyEffects()
      const fb = generateFeedback('mirror', effects, {})
      expect(fb!.text).toBe('镜像!')
      expect(fb!.color).toBe('#9b59b6')
    })

    it('leech: 汲取+N #27ae60', () => {
      state.multiplier = 1.5
      const effects: EffectAccumulator = { ...emptyEffects(), score: 6 }
      const fb = generateFeedback('leech', effects, {})
      expect(fb!.text).toBe('汲取+9')
      expect(fb!.color).toBe('#27ae60')
    })

    it('anchor: null (被动，静默增强)', () => {
      const effects: EffectAccumulator = emptyEffects()
      const fb = generateFeedback('anchor', effects, {})
      expect(fb).toBeNull()
    })
  })

  // === Story 12.3: 被动流技能管道集成 ===
  describe('core 重设计管道集成', () => {
    it('core enhance, 3 triggers → burst score × 1.1 = 5.5', () => {
      const registry = new ModifierRegistry()
      registry.registerMany(SKILL_MODIFIER_DEFS.burst('burst', 1))
      const ctx: PipelineContext = { skillsTriggeredThisWord: 3 }
      const coreMods = SKILL_MODIFIER_DEFS.core('core', 1, ctx)
      registry.registerMany(coreMods)
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger', ctx)
      expect(result.effects.score).toBeCloseTo(5.5) // 5 × 1.1
    })

    it('core enhance, 6 triggers → burst score × 1.2 = 6', () => {
      const registry = new ModifierRegistry()
      registry.registerMany(SKILL_MODIFIER_DEFS.burst('burst', 1))
      const ctx: PipelineContext = { skillsTriggeredThisWord: 6 }
      const coreMods = SKILL_MODIFIER_DEFS.core('core', 1, ctx)
      registry.registerMany(coreMods)
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger', ctx)
      expect(result.effects.score).toBeCloseTo(6) // 5 × 1.2
    })

    it('core enhance, < 3 triggers → 无加成', () => {
      const registry = new ModifierRegistry()
      registry.registerMany(SKILL_MODIFIER_DEFS.burst('burst', 1))
      const ctx: PipelineContext = { skillsTriggeredThisWord: 2 }
      const coreMods = SKILL_MODIFIER_DEFS.core('core', 1, ctx)
      expect(coreMods).toHaveLength(0)
      registry.registerMany(coreMods)
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger', ctx)
      expect(result.effects.score).toBe(5)
    })

    it('core Lv2, 3 triggers → score enhance ×1.15', () => {
      const ctx: PipelineContext = { skillsTriggeredThisWord: 3 }
      const coreMods = SKILL_MODIFIER_DEFS.core('core', 2, ctx)
      expect(coreMods).toHaveLength(1)
      expect(coreMods[0].effect!.value).toBeCloseTo(1.15)
    })
  })

  describe('anchor 同行注入集成', () => {
    it('anchor 在同行 → burst 获得 enhance score ×1.15', () => {
      // f(burst) 和 j(anchor) 都在 asdfghjkl 行
      state.player.bindings.set('f', 'burst')
      state.player.bindings.set('j', 'anchor')
      state.player.skills.set('burst', { level: 1 })
      state.player.skills.set('anchor', { level: 1 })
      const ctx: PipelineContext = { skillsTriggeredThisWord: 1 }
      const registry = createScopedRegistry('burst', 1, 'f', ctx, false)
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger', ctx)
      // burst base 5 × anchor enhance 1.15 = 5.75
      expect(result.effects.score).toBeCloseTo(5.75)
    })

    it('anchor 不在同行 → burst 无额外加成', () => {
      // f(burst) 在 asdfghjkl 行, q(anchor) 在 qwertyuiop 行
      state.player.bindings.set('f', 'burst')
      state.player.bindings.set('q', 'anchor')
      state.player.skills.set('burst', { level: 1 })
      state.player.skills.set('anchor', { level: 1 })
      const ctx: PipelineContext = { skillsTriggeredThisWord: 1 }
      const registry = createScopedRegistry('burst', 1, 'f', ctx, false)
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger', ctx)
      expect(result.effects.score).toBe(5) // 无增强
    })

    it('anchor 同行 + aura 相邻 → 叠加', () => {
      // f(burst), g(aura)相邻, j(anchor)同行
      state.player.bindings.set('f', 'burst')
      state.player.bindings.set('g', 'aura')
      state.player.bindings.set('j', 'anchor')
      state.player.skills.set('burst', { level: 1 })
      state.player.skills.set('aura', { level: 1 })
      state.player.skills.set('anchor', { level: 1 })
      const ctx: PipelineContext = {
        adjacentSkillCount: 1,
        adjacentSkillTypes: ['aura'],
        skillsTriggeredThisWord: 1,
      }
      const registry = createScopedRegistry('burst', 1, 'f', ctx, false)
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger', ctx)
      // burst base 5 × aura enhance 1.5 × anchor enhance 1.15 = 8.625
      expect(result.effects.score).toBeCloseTo(8.625)
    })

    it('anchor 既是相邻又是同行 → 只注入一次（不重复）', () => {
      // g(burst), h(anchor) — h 既相邻 g 又同行
      state.player.bindings.set('g', 'burst')
      state.player.bindings.set('h', 'anchor')
      state.player.skills.set('burst', { level: 1 })
      state.player.skills.set('anchor', { level: 1 })
      const ctx: PipelineContext = {
        adjacentSkillCount: 1,
        adjacentSkillTypes: ['anchor'],
        skillsTriggeredThisWord: 1,
      }
      const registry = createScopedRegistry('burst', 1, 'g', ctx, false)
      const mods = registry.getAll()
      const anchorMods = mods.filter(m => m.source === 'skill:anchor')
      expect(anchorMods).toHaveLength(1) // 不重复
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger', ctx)
      expect(result.effects.score).toBeCloseTo(5.75)
    })

    it('core 同行但非相邻 → 不注入（只限 adjacent）', () => {
      // a(burst) 和 l(core) 同行但不相邻
      state.player.bindings.set('a', 'burst')
      state.player.bindings.set('l', 'core')
      state.player.skills.set('burst', { level: 1 })
      state.player.skills.set('core', { level: 1 })
      const ctx: PipelineContext = { skillsTriggeredThisWord: 3 }
      const registry = createScopedRegistry('burst', 1, 'a', ctx, false)
      const mods = registry.getAll()
      const coreMods = mods.filter(m => m.source === 'skill:core')
      expect(coreMods).toHaveLength(0) // core 不应从同行注入
    })

    it('aura 同行但非相邻 → 不注入（只限 adjacent）', () => {
      // a(burst) 和 l(aura) 同行但不相邻
      state.player.bindings.set('a', 'burst')
      state.player.bindings.set('l', 'aura')
      state.player.skills.set('burst', { level: 1 })
      state.player.skills.set('aura', { level: 1 })
      const ctx: PipelineContext = { skillsTriggeredThisWord: 1 }
      const registry = createScopedRegistry('burst', 1, 'a', ctx, false)
      const mods = registry.getAll()
      const auraMods = mods.filter(m => m.source === 'skill:aura')
      expect(auraMods).toHaveLength(0) // aura 不应从同行注入
    })

    it('被动技能不计入 wordSkillCount（AC #4 天然满足）', () => {
      // 被动技能不通过 triggerSkill 触发，所以 wordSkillCount 不递增
      // 这里验证 createScopedRegistry 不会修改 synergy.wordSkillCount
      state.player.bindings.set('f', 'burst')
      state.player.bindings.set('j', 'anchor')
      state.player.skills.set('burst', { level: 1 })
      state.player.skills.set('anchor', { level: 1 })
      synergy.wordSkillCount = 1
      const ctx: PipelineContext = { skillsTriggeredThisWord: 1 }
      createScopedRegistry('burst', 1, 'f', ctx, false)
      expect(synergy.wordSkillCount).toBe(1) // 未改变
    })
  })
})
