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

  // === 催化剂遗物工厂测试 ===
  describe('void_heart（催化剂）', () => {
    it('adjacentEmptyCount=0 → score +0', () => {
      const mods = RELIC_MODIFIER_DEFS.void_heart('void_heart', { adjacentEmptyCount: 0 })
      expect(mods).toHaveLength(1)
      expect(mods[0].effect?.value).toBe(0)
    })

    it('adjacentEmptyCount=3 → score +9', () => {
      const mods = RELIC_MODIFIER_DEFS.void_heart('void_heart', { adjacentEmptyCount: 3 })
      expect(mods[0].effect).toEqual({ type: 'score', value: 9, stacking: 'additive' })
    })

    it('adjacentEmptyCount 未提供 → score +0', () => {
      const mods = RELIC_MODIFIER_DEFS.void_heart('void_heart')
      expect(mods[0].effect?.value).toBe(0)
    })
  })

  describe('chain_amplifier（催化剂，行为型）', () => {
    it('返回空数组', () => {
      expect(RELIC_MODIFIER_DEFS.chain_amplifier('chain_amplifier')).toEqual([])
    })
  })

  describe('fortress（催化剂，行为型）', () => {
    it('返回空数组', () => {
      expect(RELIC_MODIFIER_DEFS.fortress('fortress')).toEqual([])
    })
  })

  describe('passive_mastery（催化剂，行为型）', () => {
    it('返回空数组', () => {
      expect(RELIC_MODIFIER_DEFS.passive_mastery('passive_mastery')).toEqual([])
    })
  })

  describe('keyboard_storm（催化剂）', () => {
    it('on_skill_trigger → score +2 with total_skills_gte(12) condition', () => {
      const mods = RELIC_MODIFIER_DEFS.keyboard_storm('keyboard_storm')
      expect(mods).toHaveLength(1)
      expect(mods[0].trigger).toBe('on_skill_trigger')
      expect(mods[0].effect).toEqual({ type: 'score', value: 2, stacking: 'additive' })
      expect(mods[0].condition).toEqual({ type: 'total_skills_gte', value: 12 })
    })
  })

  describe('gamblers_creed（催化剂，行为型）', () => {
    it('返回空数组', () => {
      expect(RELIC_MODIFIER_DEFS.gamblers_creed('gamblers_creed')).toEqual([])
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

  it('chain_amplifier: 无 → false', () => {
    expect(queryRelicFlag('chain_amplifier')).toBe(false)
  })

  it('chain_amplifier: 有 → true', () => {
    addRelic('chain_amplifier')
    expect(queryRelicFlag('chain_amplifier')).toBe(true)
  })

  it('fortress_shield_bonus: 无 → 0', () => {
    expect(queryRelicFlag('fortress_shield_bonus')).toBe(0)
  })

  it('fortress_shield_bonus: 有 → 2', () => {
    addRelic('fortress')
    expect(queryRelicFlag('fortress_shield_bonus')).toBe(2)
  })

  it('fortress_sentinel_bonus: 无 → 0', () => {
    expect(queryRelicFlag('fortress_sentinel_bonus')).toBe(0)
  })

  it('fortress_sentinel_bonus: 有 → 1', () => {
    addRelic('fortress')
    expect(queryRelicFlag('fortress_sentinel_bonus')).toBe(1)
  })

  it('passive_mastery: 无 → false', () => {
    expect(queryRelicFlag('passive_mastery')).toBe(false)
  })

  it('passive_mastery: 有 → true', () => {
    addRelic('passive_mastery')
    expect(queryRelicFlag('passive_mastery')).toBe(true)
  })

  it('gamblers_creed: 无 → false', () => {
    expect(queryRelicFlag('gamblers_creed')).toBe(false)
  })

  it('gamblers_creed: 有 → true', () => {
    addRelic('gamblers_creed')
    expect(queryRelicFlag('gamblers_creed')).toBe(true)
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

  it('overkill_blade → on_battle_end 金币 = overkill', () => {
    addRelic('overkill_blade')
    const result = resolveRelicEffects('on_battle_end', { overkill: 30 })
    expect(result.effects.gold).toBe(30)
  })

  it('time_lord → on_battle_start time +8', () => {
    addRelic('time_lord')
    const result = resolveRelicEffects('on_battle_start')
    expect(result.effects.time).toBe(8)
  })

  it('void_heart: adjacentEmptyCount=4 → score +12', () => {
    addRelic('void_heart')
    const result = resolveRelicEffects('on_skill_trigger', { adjacentEmptyCount: 4 })
    expect(result.effects.score).toBe(12)
  })

  it('keyboard_storm: totalSkillCount=12 → score +2', () => {
    addRelic('keyboard_storm')
    const result = resolveRelicEffects('on_skill_trigger', { totalSkillCount: 12 })
    expect(result.effects.score).toBe(2)
  })

  it('keyboard_storm: totalSkillCount=8 → score 0 (条件不满足)', () => {
    addRelic('keyboard_storm')
    const result = resolveRelicEffects('on_skill_trigger', { totalSkillCount: 8 })
    expect(result.effects.score).toBe(0)
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

  it('void_heart → 注入 on_skill_trigger base score (空位数×3)', () => {
    addRelic('void_heart')
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

    injectRelicModifiers(registry, { adjacentEmptyCount: 2 })

    const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
    // base = 10 + 6(void_heart) = 16
    expect(result.effects.score).toBe(16)
  })

  it('keyboard_storm + totalSkillCount=12 → 注入额外底分', () => {
    addRelic('keyboard_storm')
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

    injectRelicModifiers(registry, { totalSkillCount: 12 })

    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', { totalSkillCount: 12 })
    // base = 10 + 2(keyboard_storm) = 12
    expect(result.effects.score).toBe(12)
  })

  it('无影响遗物 → 不改变技能管道', () => {
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
    expect(result.effects.score).toBe(10)
  })

  it('golden_keyboard + aura enhance → 三层叠加', () => {
    addRelic('golden_keyboard')
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
