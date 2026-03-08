// ============================================
// 打字肉鸽 - T3 重触发遗物管道测试
// ============================================
// Story 29.1: retrigger 管道基础设施

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BehaviorExecutor } from '../../../../src/systems/modifiers/BehaviorExecutor'
import { ModifierRegistry } from '../../../../src/systems/modifiers/ModifierRegistry'
import { EffectPipeline } from '../../../../src/systems/modifiers/EffectPipeline'
import type {
  ModifierBehavior,
  BehaviorCallbacks,
  PipelineContext,
  Modifier,
} from '../../../../src/systems/modifiers/ModifierTypes'

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
    },
    synergy: {
      wordSkillCount: 0,
      skillBaseScore: 0,
      skillMultBonus: 0,
    },
  }
})

// === BehaviorExecutor 单元测试 ===
describe('BehaviorExecutor — retrigger', () => {
  it('retrigger 行为触发 onRetrigger 回调', () => {
    const onRetrigger = vi.fn()
    const callbacks: BehaviorCallbacks = { onRetrigger }
    const behaviors: ModifierBehavior[] = [{ type: 'retrigger' }]

    const result = BehaviorExecutor.execute(behaviors, 0, callbacks)
    expect(onRetrigger).toHaveBeenCalledTimes(1)
    expect(result.executedCount).toBe(1)
  })

  it('无回调 → 跳过, executedCount=0', () => {
    const behaviors: ModifierBehavior[] = [{ type: 'retrigger' }]
    const result = BehaviorExecutor.execute(behaviors, 0)
    expect(result.executedCount).toBe(0)
  })

  it('retrigger 不受深度限制', () => {
    const onRetrigger = vi.fn()
    const callbacks: BehaviorCallbacks = { onRetrigger }
    const behaviors: ModifierBehavior[] = [{ type: 'retrigger' }]

    const result = BehaviorExecutor.execute(behaviors, 3, callbacks)
    expect(onRetrigger).toHaveBeenCalledTimes(1)
    expect(result.executedCount).toBe(1)
    expect(result.skippedByDepth).toBe(0)
  })

  it('retrigger + 其他行为混合队列正常执行', () => {
    const onRetrigger = vi.fn()
    const onBuffNextSkill = vi.fn()
    const callbacks: BehaviorCallbacks = { onRetrigger, onBuffNextSkill }
    const behaviors: ModifierBehavior[] = [
      { type: 'retrigger' },
      { type: 'buff_next_skill', multiplier: 1.5 },
    ]

    const result = BehaviorExecutor.execute(behaviors, 0, callbacks)
    expect(onRetrigger).toHaveBeenCalledTimes(1)
    expect(onBuffNextSkill).toHaveBeenCalledWith(1.5)
    expect(result.executedCount).toBe(2)
  })
})

// === Modifier 管道集成测试 ===
describe('retrigger 管道集成', () => {
  function createRetriggerModifier(
    relicId: string,
    condition?: Modifier['condition'],
  ): Modifier {
    return {
      id: `relic:${relicId}:retrigger`,
      source: `relic:${relicId}`,
      sourceType: 'relic',
      layer: 'base',
      trigger: 'on_skill_trigger',
      phase: 'after',
      behavior: { type: 'retrigger' },
      condition,
      priority: 200,
    }
  }

  it('retrigger modifier 经 EffectPipeline → pendingBehaviors 包含 retrigger', () => {
    const registry = new ModifierRegistry()
    registry.register(createRetriggerModifier('echo_bell'))

    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', {})
    expect(result.pendingBehaviors).toHaveLength(1)
    expect(result.pendingBehaviors[0]).toEqual({ type: 'retrigger' })
  })

  it('retrigger modifier 有条件 → 条件不满足时不产生 behavior', () => {
    const registry = new ModifierRegistry()
    registry.register(createRetriggerModifier('storm_drum', {
      type: 'current_skill_is_producer',
    }))

    // 转化者不满足 current_skill_is_producer
    const ctx: PipelineContext = { currentSkillCategory: 'converter' }
    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', ctx)
    expect(result.pendingBehaviors).toHaveLength(0)
  })

  it('retrigger modifier 有条件 → 条件满足时产生 behavior', () => {
    const registry = new ModifierRegistry()
    registry.register(createRetriggerModifier('storm_drum', {
      type: 'current_skill_is_producer',
    }))

    const ctx: PipelineContext = { currentSkillCategory: 'producer' }
    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', ctx)
    expect(result.pendingBehaviors).toHaveLength(1)
    expect(result.pendingBehaviors[0]).toEqual({ type: 'retrigger' })
  })

  it('isRetriggered=true 上下文可在条件中使用（防循环验证）', () => {
    // 模拟一个条件：只在非 retrigger 时触发
    const registry = new ModifierRegistry()
    const mod = createRetriggerModifier('echo_bell')
    registry.register(mod)

    // 正常上下文：retrigger 行为出现
    const normalResult = EffectPipeline.resolve(registry, 'on_skill_trigger', {
      isRetriggered: false,
    })
    expect(normalResult.pendingBehaviors).toHaveLength(1)

    // retrigger 上下文：行为仍出现（防循环由 skills.ts 的 _isRetriggered 标志负责，不由条件负责）
    const retriggeredResult = EffectPipeline.resolve(registry, 'on_skill_trigger', {
      isRetriggered: true,
    })
    expect(retriggeredResult.pendingBehaviors).toHaveLength(1)
  })

  it('retrigger 与数值效果可共存在同一队列', () => {
    const registry = new ModifierRegistry()
    registry.register(createRetriggerModifier('echo_bell'))
    registry.register({
      id: 'relic:glass_cannon:score',
      source: 'relic:glass_cannon',
      sourceType: 'relic',
      layer: 'global',
      trigger: 'on_skill_trigger',
      phase: 'calculate',
      effect: { type: 'score', value: 3.0, stacking: 'multiplicative' },
      priority: 200,
    })
    // 添加 dummy base 使 score 可计算
    registry.register({
      id: '_base:score',
      source: '_base',
      sourceType: 'skill',
      layer: 'base',
      trigger: 'on_skill_trigger',
      phase: 'calculate',
      effect: { type: 'score', value: 1, stacking: 'additive' },
      priority: 0,
    })

    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', {})
    expect(result.effects.score).toBe(3.0) // 1 * 3.0
    expect(result.pendingBehaviors).toHaveLength(1)
    expect(result.pendingBehaviors[0]).toEqual({ type: 'retrigger' })
  })
})

// === T3 遗物工厂测试 (Story 29.2) ===
import { RELIC_MODIFIER_DEFS } from '../../../../src/data/relics'

describe('T3 遗物工厂 — echo_bell', () => {
  it('工厂产出正确 modifier（retrigger 行为 + skills_triggered_this_word 条件）', () => {
    const mods = RELIC_MODIFIER_DEFS.echo_bell('echo_bell')
    expect(mods).toHaveLength(1)
    const mod = mods[0]
    expect(mod.trigger).toBe('on_skill_trigger')
    expect(mod.phase).toBe('after')
    expect(mod.behavior).toEqual({ type: 'retrigger' })
    expect(mod.condition).toEqual({ type: 'skills_triggered_this_word', value: 0 })
  })

  it('skillsTriggeredThisWord=0 → 产出 retrigger 行为', () => {
    const registry = new ModifierRegistry()
    const mods = RELIC_MODIFIER_DEFS.echo_bell('echo_bell')
    mods.forEach(m => registry.register(m))

    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', {
      skillsTriggeredThisWord: 0,
    })
    expect(result.pendingBehaviors).toHaveLength(1)
    expect(result.pendingBehaviors[0]).toEqual({ type: 'retrigger' })
  })

  it('skillsTriggeredThisWord=1 → 不产出 retrigger 行为', () => {
    const registry = new ModifierRegistry()
    const mods = RELIC_MODIFIER_DEFS.echo_bell('echo_bell')
    mods.forEach(m => registry.register(m))

    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', {
      skillsTriggeredThisWord: 1,
    })
    expect(result.pendingBehaviors).toHaveLength(0)
  })
})

describe('T3 遗物工厂 — storm_drum', () => {
  it('工厂产出正确 modifier（retrigger 行为 + current_skill_is_producer 条件）', () => {
    const mods = RELIC_MODIFIER_DEFS.storm_drum('storm_drum')
    expect(mods).toHaveLength(1)
    const mod = mods[0]
    expect(mod.trigger).toBe('on_skill_trigger')
    expect(mod.phase).toBe('after')
    expect(mod.behavior).toEqual({ type: 'retrigger' })
    expect(mod.condition).toEqual({ type: 'current_skill_is_producer' })
  })

  it('producer → 产出 retrigger 行为', () => {
    const registry = new ModifierRegistry()
    const mods = RELIC_MODIFIER_DEFS.storm_drum('storm_drum')
    mods.forEach(m => registry.register(m))

    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', {
      currentSkillCategory: 'producer',
    })
    expect(result.pendingBehaviors).toHaveLength(1)
    expect(result.pendingBehaviors[0]).toEqual({ type: 'retrigger' })
  })

  it('converter → 不产出 retrigger 行为', () => {
    const registry = new ModifierRegistry()
    const mods = RELIC_MODIFIER_DEFS.storm_drum('storm_drum')
    mods.forEach(m => registry.register(m))

    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', {
      currentSkillCategory: 'converter',
    })
    expect(result.pendingBehaviors).toHaveLength(0)
  })
})

describe('T3 遗物工厂 — finale', () => {
  it('工厂产出正确 modifier（retrigger 行为 + combo_gte 条件）', () => {
    const mods = RELIC_MODIFIER_DEFS.finale('finale')
    expect(mods).toHaveLength(1)
    const mod = mods[0]
    expect(mod.trigger).toBe('on_skill_trigger')
    expect(mod.phase).toBe('after')
    expect(mod.behavior).toEqual({ type: 'retrigger' })
    expect(mod.condition).toEqual({ type: 'combo_gte', value: 20 })
  })

  it('combo=20 → 产出 retrigger 行为', () => {
    const registry = new ModifierRegistry()
    const mods = RELIC_MODIFIER_DEFS.finale('finale')
    mods.forEach(m => registry.register(m))

    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', {
      combo: 20,
    })
    expect(result.pendingBehaviors).toHaveLength(1)
    expect(result.pendingBehaviors[0]).toEqual({ type: 'retrigger' })
  })

  it('combo=5 → 不产出 retrigger 行为', () => {
    const registry = new ModifierRegistry()
    const mods = RELIC_MODIFIER_DEFS.finale('finale')
    mods.forEach(m => registry.register(m))

    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', {
      combo: 5,
    })
    expect(result.pendingBehaviors).toHaveLength(0)
  })
})

// === 多 retrigger 遗物共存测试 (Story 29.2 review fix) ===
describe('T3 多 retrigger 遗物共存', () => {
  it('echo_bell + storm_drum 同时装备，producer 首技能 → 2 个 retrigger behavior', () => {
    const registry = new ModifierRegistry()
    RELIC_MODIFIER_DEFS.echo_bell('echo_bell').forEach(m => registry.register(m))
    RELIC_MODIFIER_DEFS.storm_drum('storm_drum').forEach(m => registry.register(m))

    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', {
      skillsTriggeredThisWord: 0,
      currentSkillCategory: 'producer',
    })
    // 两个条件都满足 → 2 个 retrigger behavior
    expect(result.pendingBehaviors).toHaveLength(2)
    expect(result.pendingBehaviors.every(b => b.type === 'retrigger')).toBe(true)

    // BehaviorExecutor：回调被调用 2 次，但实际 _retriggerRequested 是布尔，效果等价 1 次
    let retriggerCount = 0
    BehaviorExecutor.execute(result.pendingBehaviors, 0, {
      onRetrigger: () => { retriggerCount++ },
    })
    expect(retriggerCount).toBe(2)
  })

  it('echo_bell + storm_drum 同时装备，converter 首技能 → 仅 echo_bell 触发', () => {
    const registry = new ModifierRegistry()
    RELIC_MODIFIER_DEFS.echo_bell('echo_bell').forEach(m => registry.register(m))
    RELIC_MODIFIER_DEFS.storm_drum('storm_drum').forEach(m => registry.register(m))

    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', {
      skillsTriggeredThisWord: 0,
      currentSkillCategory: 'converter',
    })
    expect(result.pendingBehaviors).toHaveLength(1)
  })
})
