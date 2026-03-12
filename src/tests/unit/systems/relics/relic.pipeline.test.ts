// ============================================
// 打字肉鸽 - 遗物 Modifier 管道测试
// ============================================
// Story 11.6 + 13.1: 遗物管道 + 催化剂遗物

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RELIC_MODIFIER_DEFS } from '../../../../src/data/relics'
import { resolveRelicEffects, resolveRelicEffectsWithBehaviors, queryRelicFlag, resolveRelicSkillTrigger } from '../../../../src/systems/relics/RelicPipeline'
import type { PipelineContext, BehaviorCallbacks } from '../../../../src/systems/modifiers/ModifierTypes'

// === Mock state ===
vi.mock('../../../../src/core/state', () => {
  const relics = new Set<string>()
  return {
    state: {
      player: {
        relics,
        relicStates: {} as Record<string, number>,
        bindings: new Map(),
        skills: new Map(),
      },
      combo: 0,
      multiplier: 1,
      overkill: 0,
      affixSkills: new Map(),
      affixSkillStates: new Map(),
    },
    synergy: {
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

  describe('perfectionist（得分 ×2 + 断连击失去遗物）', () => {
    it('返回 2 个 Modifier（score ×2 + remove_relic）', () => {
      const mods = RELIC_MODIFIER_DEFS.perfectionist('perfectionist')
      expect(mods).toHaveLength(2)
      const scoreMod = mods.find(m => m.effect?.type === 'score')
      expect(scoreMod).toBeDefined()
      expect(scoreMod!.layer).toBe('global')
      expect(scoreMod!.trigger).toBe('on_word_complete')
      expect(scoreMod!.effect!.value).toBe(2.0)
      expect(scoreMod!.effect!.stacking).toBe('multiplicative')
      const loseMod = mods.find(m => m.behavior?.type === 'remove_relic')
      expect(loseMod).toBeDefined()
      expect(loseMod!.trigger).toBe('on_combo_break')
      expect(loseMod!.phase).toBe('after')
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

  // perfectionist_streak queryRelicFlag 已移除，完美主义者改用 RELIC_MODIFIER_DEFS 管道

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
// resolveRelicSkillTrigger 测试
// ========================================
describe('resolveRelicSkillTrigger', () => {
  beforeEach(() => clearRelics())

  it('无遗物 → 倍率 = 1', () => {
    const mult = resolveRelicSkillTrigger({})
    expect(mult).toBe(1)
  })

  it('非 on_skill_trigger 遗物 → 倍率 = 1', () => {
    addRelic('phoenix_feather') // on_error 遗物
    const mult = resolveRelicSkillTrigger({})
    expect(mult).toBe(1)
  })

  it('glass_cannon → 倍率 = 3', () => {
    addRelic('glass_cannon')
    const mult = resolveRelicSkillTrigger({})
    expect(mult).toBe(3)
  })

  it('forge_heart + 含 convert 词条 → 倍率 = 1.15', () => {
    addRelic('forge_heart')
    const mult = resolveRelicSkillTrigger({ currentSkillAffixes: ['convert'] })
    expect(mult).toBeCloseTo(1.15, 5)
  })

  it('forge_heart + 无 convert 词条 → 倍率 = 1（条件不满足）', () => {
    addRelic('forge_heart')
    const mult = resolveRelicSkillTrigger({ currentSkillAffixes: ['amplify'] })
    expect(mult).toBe(1)
  })

  it('多遗物叠加: glass_cannon × forge_heart(含 convert 词条) → 3 × 1.15', () => {
    addRelic('glass_cannon')
    addRelic('forge_heart')
    const mult = resolveRelicSkillTrigger({ currentSkillAffixes: ['convert'] })
    expect(mult).toBeCloseTo(3 * 1.15, 5)
  })

  it('time_thief → 执行 onTimeSteal 行为', () => {
    addRelic('time_thief')
    let bonus = 0
    resolveRelicSkillTrigger({}, { onTimeSteal: (b) => { bonus = b } })
    expect(bonus).toBe(0.3)
  })
})
