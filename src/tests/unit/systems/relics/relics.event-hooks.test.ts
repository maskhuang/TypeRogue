// ============================================
// 打字肉鸽 - T2 事件钩子测试
// ============================================
// Story 28.1: on_skill_purchase, on_enchantment_acquire, on_act_end

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type {
  ModifierTrigger,
  PipelineContext,
  Modifier,
} from '../../../../src/systems/modifiers/ModifierTypes'
import { ModifierRegistry } from '../../../../src/systems/modifiers/ModifierRegistry'
import { EffectPipeline } from '../../../../src/systems/modifiers/EffectPipeline'

// === Mock state ===
vi.mock('../../../../src/core/state', () => {
  const relics = new Set<string>()
  return {
    state: {
      player: {
        relics,
        relicStates: {} as Record<string, number>,
        bindings: new Map<string, string>(),
        skills: new Map(),
      },
      combo: 0,
      multiplier: 1,
      overkill: 0,
      gold: 0,
      time: 0,
    },
    synergy: {
      wordSkillCount: 0,
      skillBaseScore: 0,
      skillMultBonus: 0,
    },
  }
})

import { state } from '../../../../src/core/state'

function clearRelics(): void {
  state.player.relics.clear()
  state.player.relicStates = {}
}

/** 构建满足 Modifier 接口的测试对象 */
function testMod(
  id: string,
  trigger: ModifierTrigger,
  effectType: 'score' | 'gold' | 'time' | 'multiply',
  value: number,
): Modifier {
  return {
    id, source: id.split(':')[0], sourceType: 'relic',
    layer: 'base', trigger, phase: 'calculate',
    effect: { type: effectType, value, stacking: 'additive' }, priority: 0,
  }
}

// ========================================
// ModifierTrigger 类型包含新值
// ========================================
describe('ModifierTrigger 新事件类型', () => {
  it('on_skill_purchase 是合法的 ModifierTrigger', () => {
    const trigger: ModifierTrigger = 'on_skill_purchase'
    expect(trigger).toBe('on_skill_purchase')
  })

  it('on_enchantment_acquire 是合法的 ModifierTrigger', () => {
    const trigger: ModifierTrigger = 'on_enchantment_acquire'
    expect(trigger).toBe('on_enchantment_acquire')
  })

  it('on_act_end 是合法的 ModifierTrigger', () => {
    const trigger: ModifierTrigger = 'on_act_end'
    expect(trigger).toBe('on_act_end')
  })
})

// ========================================
// PipelineContext 新字段
// ========================================
describe('PipelineContext 新字段', () => {
  it('purchasedSkillId 和 isUpgrade 可赋值', () => {
    const ctx: PipelineContext = {
      purchasedSkillId: 'prod_flame',
      isUpgrade: false,
    }
    expect(ctx.purchasedSkillId).toBe('prod_flame')
    expect(ctx.isUpgrade).toBe(false)
  })

  it('enchantedSkillId 和 enchantmentId 可赋值', () => {
    const ctx: PipelineContext = {
      enchantedSkillId: 'prod_flame',
      enchantmentId: 'growth',
    }
    expect(ctx.enchantedSkillId).toBe('prod_flame')
    expect(ctx.enchantmentId).toBe('growth')
  })

  it('endedAct 可赋值', () => {
    const ctx: PipelineContext = {
      endedAct: 2,
    }
    expect(ctx.endedAct).toBe(2)
  })
})

// ========================================
// EffectPipeline 对新 trigger 正确 resolve
// ========================================
describe('EffectPipeline 对新 trigger 正确 resolve', () => {
  it('on_skill_purchase trigger 可 resolve 空 registry', () => {
    const registry = new ModifierRegistry()
    const result = EffectPipeline.resolve(registry, 'on_skill_purchase')
    expect(result.intercepted).toBe(false)
    expect(result.effects.score).toBe(0)
    expect(result.effects.gold).toBe(0)
  })

  it('on_enchantment_acquire trigger 可 resolve 空 registry', () => {
    const registry = new ModifierRegistry()
    const result = EffectPipeline.resolve(registry, 'on_enchantment_acquire')
    expect(result.intercepted).toBe(false)
    expect(result.effects.score).toBe(0)
  })

  it('on_act_end trigger 可 resolve 空 registry', () => {
    const registry = new ModifierRegistry()
    const result = EffectPipeline.resolve(registry, 'on_act_end')
    expect(result.intercepted).toBe(false)
    expect(result.effects.score).toBe(0)
  })

  it('on_skill_purchase trigger 含 modifier → 产出 gold', () => {
    const registry = new ModifierRegistry()
    registry.register(testMod('test:gold', 'on_skill_purchase', 'gold', 10))
    const result = EffectPipeline.resolve(registry, 'on_skill_purchase')
    expect(result.effects.gold).toBe(10)
  })

  it('on_enchantment_acquire trigger 含 modifier → 产出 score', () => {
    const registry = new ModifierRegistry()
    registry.register(testMod('test:score', 'on_enchantment_acquire', 'score', 8))
    const result = EffectPipeline.resolve(registry, 'on_enchantment_acquire')
    expect(result.effects.score).toBe(8)
  })

  it('on_act_end trigger 含 modifier → 产出 gold', () => {
    const registry = new ModifierRegistry()
    registry.register(testMod('test:gold', 'on_act_end', 'gold', 20))
    const result = EffectPipeline.resolve(registry, 'on_act_end')
    expect(result.effects.gold).toBe(20)
  })
})

// ========================================
// resolveRelicEffectsWithBehaviors 无遗物时安全空操作
// ========================================
describe('resolveRelicEffectsWithBehaviors 无遗物安全', () => {
  beforeEach(clearRelics)

  it('on_skill_purchase 无遗物 → 空结果', async () => {
    const { resolveRelicEffectsWithBehaviors } = await import('../../../../src/systems/relics/RelicPipeline')
    const result = resolveRelicEffectsWithBehaviors('on_skill_purchase', {
      purchasedSkillId: 'prod_flame',
      isUpgrade: false,
    })
    expect(result.intercepted).toBe(false)
    expect(result.effects.gold).toBe(0)
    expect(result.effects.score).toBe(0)
    expect(result.pendingBehaviors).toHaveLength(0)
  })

  it('on_enchantment_acquire 无遗物 → 空结果', async () => {
    const { resolveRelicEffectsWithBehaviors } = await import('../../../../src/systems/relics/RelicPipeline')
    const result = resolveRelicEffectsWithBehaviors('on_enchantment_acquire', {
      enchantedSkillId: 'prod_flame',
      enchantmentId: 'growth',
    })
    expect(result.intercepted).toBe(false)
    expect(result.effects.gold).toBe(0)
    expect(result.pendingBehaviors).toHaveLength(0)
  })

  it('on_act_end 无遗物 → 空结果', async () => {
    const { resolveRelicEffectsWithBehaviors } = await import('../../../../src/systems/relics/RelicPipeline')
    const result = resolveRelicEffectsWithBehaviors('on_act_end', {
      endedAct: 1,
    })
    expect(result.intercepted).toBe(false)
    expect(result.effects.gold).toBe(0)
    expect(result.pendingBehaviors).toHaveLength(0)
  })
})

// ========================================
// 多遗物同时监听同一新 trigger
// ========================================
describe('多遗物同时监听新 trigger', () => {
  beforeEach(clearRelics)

  it('两个遗物监听 on_skill_purchase 时均生效', () => {
    const registry = new ModifierRegistry()
    registry.register(testMod('relic_a:gold', 'on_skill_purchase', 'gold', 5))
    registry.register(testMod('relic_b:gold', 'on_skill_purchase', 'gold', 3))
    const result = EffectPipeline.resolve(registry, 'on_skill_purchase')
    expect(result.effects.gold).toBe(8)
  })
})
