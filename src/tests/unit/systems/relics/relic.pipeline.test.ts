// ============================================
// 打字肉鸽 - 遗物 Modifier 管道测试
// ============================================
// Story 11.6: 遗物迁移到 Modifier 管道

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
      rippleBonus: new Map(),
      echoTrigger: new Set(),
      shieldCount: 0,
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

  describe('magnet（行为型）', () => {
    it('返回空数组', () => {
      expect(RELIC_MODIFIER_DEFS.magnet('magnet')).toEqual([])
    })
  })

  describe('perfectionist（行为型）', () => {
    it('返回空数组', () => {
      expect(RELIC_MODIFIER_DEFS.perfectionist('perfectionist')).toEqual([])
    })
  })

  describe('time_crystal', () => {
    it('on_word_complete → time +0.5 additive (base 层)', () => {
      const mods = RELIC_MODIFIER_DEFS.time_crystal('time_crystal')
      expect(mods).toHaveLength(1)
      expect(mods[0].trigger).toBe('on_word_complete')
      expect(mods[0].layer).toBe('base')
      expect(mods[0].phase).toBe('calculate')
      expect(mods[0].effect).toEqual({ type: 'time', value: 0.5, stacking: 'additive' })
    })
  })

  describe('piggy_bank', () => {
    it('on_battle_end → gold +10 additive', () => {
      const mods = RELIC_MODIFIER_DEFS.piggy_bank('piggy_bank')
      expect(mods).toHaveLength(1)
      expect(mods[0].trigger).toBe('on_battle_end')
      expect(mods[0].effect).toEqual({ type: 'gold', value: 10, stacking: 'additive' })
    })
  })

  describe('combo_badge', () => {
    it('combo=0 → multiply +0', () => {
      const mods = RELIC_MODIFIER_DEFS.combo_badge('combo_badge', { combo: 0 })
      expect(mods).toHaveLength(1)
      expect(mods[0].effect?.value).toBe(0)
    })

    it('combo=50 → multiply +0.5', () => {
      const mods = RELIC_MODIFIER_DEFS.combo_badge('combo_badge', { combo: 50 })
      expect(mods[0].effect?.value).toBeCloseTo(0.5)
    })

    it('combo=100 → multiply +1.0', () => {
      const mods = RELIC_MODIFIER_DEFS.combo_badge('combo_badge', { combo: 100 })
      expect(mods[0].effect?.value).toBeCloseTo(1.0)
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

  describe('berserker_mask', () => {
    it('on_word_complete → multiply +0.5, condition multiplier_gte(3.0)', () => {
      const mods = RELIC_MODIFIER_DEFS.berserker_mask('berserker_mask')
      expect(mods).toHaveLength(1)
      expect(mods[0].trigger).toBe('on_word_complete')
      expect(mods[0].layer).toBe('base')
      expect(mods[0].effect).toEqual({ type: 'multiply', value: 0.5, stacking: 'additive' })
      expect(mods[0].condition).toEqual({ type: 'multiplier_gte', value: 3.0 })
    })
  })

  describe('treasure_map', () => {
    it('on_battle_end → gold +15 additive', () => {
      const mods = RELIC_MODIFIER_DEFS.treasure_map('treasure_map')
      expect(mods).toHaveLength(1)
      expect(mods[0].trigger).toBe('on_battle_end')
      expect(mods[0].effect).toEqual({ type: 'gold', value: 15, stacking: 'additive' })
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

  describe('combo_crown', () => {
    it('on_battle_start → multiply +0.3 additive', () => {
      const mods = RELIC_MODIFIER_DEFS.combo_crown('combo_crown')
      expect(mods).toHaveLength(1)
      expect(mods[0].trigger).toBe('on_battle_start')
      expect(mods[0].effect).toEqual({ type: 'multiply', value: 0.3, stacking: 'additive' })
    })
  })

  describe('golden_keyboard', () => {
    it('on_skill_trigger → score ×1.25 multiplicative', () => {
      const mods = RELIC_MODIFIER_DEFS.golden_keyboard('golden_keyboard')
      expect(mods).toHaveLength(1)
      expect(mods[0].trigger).toBe('on_skill_trigger')
      expect(mods[0].effect).toEqual({ type: 'score', value: 1.25, stacking: 'multiplicative' })
    })
  })

  describe('time_lord', () => {
    it('on_battle_start → time +8 additive', () => {
      const mods = RELIC_MODIFIER_DEFS.time_lord('time_lord')
      expect(mods).toHaveLength(1)
      expect(mods[0].trigger).toBe('on_battle_start')
      expect(mods[0].effect).toEqual({ type: 'time', value: 8, stacking: 'additive' })
    })
  })
})

// ========================================
// queryRelicFlag 测试
// ========================================
describe('queryRelicFlag', () => {
  beforeEach(() => clearRelics())

  it('magnet_bias: 无磁石 → 0.6', () => {
    expect(queryRelicFlag('magnet_bias')).toBe(0.6)
  })

  it('magnet_bias: 有磁石 → 0.8', () => {
    addRelic('magnet')
    expect(queryRelicFlag('magnet_bias')).toBe(0.8)
  })

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

  it('time_crystal → on_word_complete 产生 time +0.5', () => {
    addRelic('time_crystal')
    const result = resolveRelicEffects('on_word_complete')
    expect(result.effects.time).toBe(0.5)
  })

  it('piggy_bank + treasure_map → on_battle_end 产生 gold 25', () => {
    addRelic('piggy_bank')
    addRelic('treasure_map')
    const result = resolveRelicEffects('on_battle_end')
    expect(result.effects.gold).toBe(25) // 10 + 15
  })

  it('overkill_blade + treasure_map → on_battle_end 金币叠加', () => {
    addRelic('overkill_blade')
    addRelic('treasure_map')
    const result = resolveRelicEffects('on_battle_end', { overkill: 30 })
    expect(result.effects.gold).toBe(45) // 30 + 15
  })

  it('combo_crown + time_lord → on_battle_start 同时有 multiply 和 time', () => {
    addRelic('combo_crown')
    addRelic('time_lord')
    const result = resolveRelicEffects('on_battle_start')
    expect(result.effects.multiply).toBeCloseTo(0.3)
    expect(result.effects.time).toBe(8)
  })

  it('berserker_mask: multiplier < 3.0 → multiply = 0', () => {
    addRelic('berserker_mask')
    const result = resolveRelicEffects('on_word_complete', { multiplier: 2.5 })
    expect(result.effects.multiply).toBe(0) // 条件不满足
  })

  it('berserker_mask: multiplier >= 3.0 → multiply = 0.5', () => {
    addRelic('berserker_mask')
    const result = resolveRelicEffects('on_word_complete', { multiplier: 3.5 })
    expect(result.effects.multiply).toBe(0.5) // bonusMult = 1 + 0.5 = 1.5
  })

  it('不匹配 trigger 的遗物被忽略', () => {
    addRelic('time_crystal') // on_word_complete
    const result = resolveRelicEffects('on_battle_end')
    expect(result.effects.time).toBe(0) // trigger 不匹配，被过滤
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

  it('golden_keyboard → 注入 on_skill_trigger global score ×1.25', () => {
    addRelic('golden_keyboard')
    const registry = new ModifierRegistry()

    // 注册一个 base 层分数 Modifier（模拟 burst 技能）
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
    // base=10, global=1.25 → 10*1*1.25 = 12.5
    expect(result.effects.score).toBe(12.5)
  })

  it('无 golden_keyboard → 不影响技能管道', () => {
    addRelic('time_crystal') // 不影响 on_skill_trigger
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
    // base=10, 无 global → 10
    expect(result.effects.score).toBe(10)
  })

  it('golden_keyboard + aura enhance → 三层叠加', () => {
    addRelic('golden_keyboard')
    const registry = new ModifierRegistry()

    // burst base
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

    // aura enhance
    registry.register({
      id: 'skill:aura:enhance',
      source: 'skill:aura',
      sourceType: 'skill',
      layer: 'enhance',
      trigger: 'on_skill_trigger',
      phase: 'calculate',
      effect: { type: 'score', value: 1.5, stacking: 'multiplicative' },
      priority: 100,
    })

    injectRelicModifiers(registry)

    const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
    // base=10, enhance=1.5, global=1.25 → 10 * 1.5 * 1.25 = 18.75
    expect(result.effects.score).toBe(18.75)
  })
})
