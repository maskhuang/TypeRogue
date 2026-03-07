// ============================================
// 打字肉鸽 - 遗物 Modifier 管道测试
// ============================================
// Story 11.6 + 13.1: 遗物管道 + 催化剂遗物

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RELIC_MODIFIER_DEFS } from '../../../../src/data/relics'
import { resolveRelicEffects, resolveRelicEffectsWithBehaviors, queryRelicFlag, injectRelicModifiers } from '../../../../src/systems/relics/RelicPipeline'
import { ModifierRegistry } from '../../../../src/systems/modifiers/ModifierRegistry'
import { EffectPipeline } from '../../../../src/systems/modifiers/EffectPipeline'
import type { PipelineContext, BehaviorCallbacks } from '../../../../src/systems/modifiers/ModifierTypes'

// === Mock state ===
vi.mock('../../../../src/core/state', () => {
  const relics = new Set<string>()
  return {
    state: {
      player: {
        relics,
        bindings: new Map(),
        skills: new Map(),
      },
      combo: 0,
      multiplier: 1,
      overkill: 0,
    },
    synergy: {
      perfectStreak: 0,
      wordSkillCount: 0,
    },
  }
})

// 获取 mock state 引用
import { state } from '../../../../src/core/state'

function clearRelics(): void {
  state.player.relics.clear()
}

function addRelic(id: string): void {
  state.player.relics.add(id)
}

// ========================================
// RELIC_MODIFIER_DEFS 工厂单元测试
// ========================================
describe('RELIC_MODIFIER_DEFS 工厂', () => {
  describe('lucky_coin（行为型）', () => {
    it('返回空数组', () => {
      expect(RELIC_MODIFIER_DEFS.lucky_coin('lucky_coin')).toEqual([])
    })
  })

  describe('perfectionist（行为型）', () => {
    it('返回空数组', () => {
      expect(RELIC_MODIFIER_DEFS.perfectionist('perfectionist')).toEqual([])
    })
  })

  describe('phoenix_feather', () => {
    it('on_error → combo_protect behavior (probability 0.5)', () => {
      const mods = RELIC_MODIFIER_DEFS.phoenix_feather('phoenix_feather')
      expect(mods).toHaveLength(1)
      expect(mods[0].trigger).toBe('on_error')
      expect(mods[0].phase).toBe('after')
      expect(mods[0].behavior).toEqual({ type: 'combo_protect', probability: 0.5 })
    })
  })

  describe('overkill_blade', () => {
    it('overkill=0 → gold +0', () => {
      const mods = RELIC_MODIFIER_DEFS.overkill_blade('overkill_blade', { overkill: 0 })
      expect(mods[0].effect?.value).toBe(0)
    })

    it('overkill=25 → gold +25', () => {
      const mods = RELIC_MODIFIER_DEFS.overkill_blade('overkill_blade', { overkill: 25 })
      expect(mods[0].effect?.value).toBe(25)
    })

    it('overkill 未提供 → gold +0', () => {
      const mods = RELIC_MODIFIER_DEFS.overkill_blade('overkill_blade')
      expect(mods[0].effect?.value).toBe(0)
    })
  })

})

// ========================================
// queryRelicFlag 测试
// ========================================
describe('queryRelicFlag', () => {
  beforeEach(() => clearRelics())

  it('price_discount: 无幸运硬币 → 0', () => {
    expect(queryRelicFlag('price_discount')).toBe(0)
  })

  it('price_discount: 有幸运硬币 → 0.1', () => {
    addRelic('lucky_coin')
    expect(queryRelicFlag('price_discount')).toBe(0.1)
  })

  it('perfectionist_streak: 无完美主义者 → false', () => {
    expect(queryRelicFlag('perfectionist_streak')).toBe(false)
  })

  it('perfectionist_streak: 有完美主义者 → true', () => {
    addRelic('perfectionist')
    expect(queryRelicFlag('perfectionist_streak')).toBe(true)
  })

  it('deleted relics return false/default', () => {
    expect(queryRelicFlag('chain_amplifier')).toBe(false)
    expect(queryRelicFlag('fortress_shield_bonus')).toBe(false)
    expect(queryRelicFlag('fortress_sentinel_bonus')).toBe(false)
    expect(queryRelicFlag('passive_mastery')).toBe(false)
    expect(queryRelicFlag('gamblers_creed')).toBe(false)
  })

  it('unknown flag → false', () => {
    expect(queryRelicFlag('nonexistent')).toBe(false)
  })
})

// ========================================
// resolveRelicEffects 管道集成测试
// ========================================
describe('resolveRelicEffects 管道集成', () => {
  beforeEach(() => clearRelics())

  it('无遗物 → 所有效果为 0', () => {
    const result = resolveRelicEffects('on_word_complete')
    expect(result.effects.score).toBe(0)
    expect(result.effects.time).toBe(0)
    expect(result.effects.gold).toBe(0)
    expect(result.effects.multiply).toBe(0)
  })

  it('overkill_blade → on_battle_end 金币 = overkill', () => {
    addRelic('overkill_blade')
    const result = resolveRelicEffects('on_battle_end', { overkill: 30 })
    expect(result.effects.gold).toBe(30)
  })

  it('不匹配 trigger 的遗物被忽略', () => {
    addRelic('phoenix_feather') // on_error
    const result = resolveRelicEffects('on_battle_end')
    expect(result.effects.score).toBe(0) // trigger 不匹配，被过滤
  })
})

// ========================================
// resolveRelicEffectsWithBehaviors 测试
// ========================================
describe('resolveRelicEffectsWithBehaviors', () => {
  beforeEach(() => clearRelics())
  afterEach(() => vi.restoreAllMocks())

  it('phoenix_feather: on_error → 调用 onComboProtect', () => {
    addRelic('phoenix_feather')
    const onComboProtect = vi.fn().mockReturnValue(true)
    const callbacks: BehaviorCallbacks = { onComboProtect }

    resolveRelicEffectsWithBehaviors('on_error', { hasError: true }, callbacks)
    expect(onComboProtect).toHaveBeenCalledWith(0.5)
  })

  it('phoenix_feather: 非 on_error trigger → 不触发行为', () => {
    addRelic('phoenix_feather')
    const onComboProtect = vi.fn()
    const callbacks: BehaviorCallbacks = { onComboProtect }

    resolveRelicEffectsWithBehaviors('on_word_complete', {}, callbacks)
    expect(onComboProtect).not.toHaveBeenCalled()
  })
})

// ========================================
// injectRelicModifiers 测试
// ========================================
describe('injectRelicModifiers', () => {
  beforeEach(() => clearRelics())

  it('无影响遗物 → 不改变技能管道', () => {
    addRelic('phoenix_feather') // 不影响 on_skill_trigger
    const registry = new ModifierRegistry()

    registry.register({
      id: 'skill:burst:score',
      source: 'skill:burst',
      sourceType: 'skill',
      layer: 'base',
      trigger: 'on_skill_trigger',
      phase: 'calculate',
      effect: { type: 'score', value: 10, stacking: 'additive' },
      priority: 100,
    })

    injectRelicModifiers(registry)

    const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
    expect(result.effects.score).toBe(10)
  })

})
