// ============================================
// 打字肉鸽 - 催化剂遗物测试
// ============================================
// Story 13.1: 6 个构筑催化剂遗物

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RELIC_MODIFIER_DEFS } from '../../../../src/data/relics'
import { ConditionEvaluator } from '../../../../src/systems/modifiers/ConditionEvaluator'
import { ModifierRegistry } from '../../../../src/systems/modifiers/ModifierRegistry'
import { EffectPipeline } from '../../../../src/systems/modifiers/EffectPipeline'

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
      wordSkillCount: 0,
      skillBaseScore: 0,
      skillMultBonus: 0,
    },
  }
})

import { state } from '../../../../src/core/state'

function clearRelics(): void {
  state.player.relics.clear()
}

function addRelic(id: string): void {
  state.player.relics.add(id)
}

// (void_heart 和 keyboard_storm 已在遗物系统重构中移除)

// ========================================
// always_true 条件
// ========================================
describe('always_true 条件', () => {
  it('始终返回 true', () => {
    expect(ConditionEvaluator.evaluate({ type: 'always_true' })).toBe(true)
  })
})

// ========================================
// 行为集成测试
// ========================================
describe('催化剂遗物行为集成', () => {
  beforeEach(() => clearRelics())

  describe('random 条件（无赌徒信条）', () => {
    it('random 条件使用概率', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const registry = new ModifierRegistry()
      registry.register({
        id: 'skill:gamble:score', source: 'skill:gamble', sourceType: 'skill',
        layer: 'base', trigger: 'on_skill_trigger', phase: 'calculate',
        condition: { type: 'random', probability: 0.5 },
        effect: { type: 'score', value: 15, stacking: 'additive' }, priority: 100,
      })
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger', {})
      expect(result.effects.score).toBe(0) // 概率失败
      vi.restoreAllMocks()
    })
  })
})

// ========================================
// 旧遗物已移除
// ========================================
describe('旧遗物已移除', () => {
  it('RELIC_MODIFIER_DEFS 不含已移除遗物', () => {
    expect(RELIC_MODIFIER_DEFS['magnet']).toBeUndefined()
    expect(RELIC_MODIFIER_DEFS['combo_badge']).toBeUndefined()
    expect(RELIC_MODIFIER_DEFS['berserker_mask']).toBeUndefined()
    expect(RELIC_MODIFIER_DEFS['combo_crown']).toBeUndefined()
    expect(RELIC_MODIFIER_DEFS['treasure_map']).toBeUndefined()
    expect(RELIC_MODIFIER_DEFS['piggy_bank']).toBeUndefined()
  })

  it('RELIC_MODIFIER_DEFS 不含 Story 19.9 删除遗物', () => {
    expect(RELIC_MODIFIER_DEFS['chain_amplifier']).toBeUndefined()
    expect(RELIC_MODIFIER_DEFS['fortress']).toBeUndefined()
    expect(RELIC_MODIFIER_DEFS['passive_mastery']).toBeUndefined()
    expect(RELIC_MODIFIER_DEFS['gamblers_creed']).toBeUndefined()
  })

  it('RELIC_MODIFIER_DEFS 不含遗物重构删除的遗物', () => {
    expect(RELIC_MODIFIER_DEFS['golden_keyboard']).toBeUndefined()
    expect(RELIC_MODIFIER_DEFS['void_heart']).toBeUndefined()
    expect(RELIC_MODIFIER_DEFS['rhyme_master']).toBeUndefined()
    expect(RELIC_MODIFIER_DEFS['keyboard_storm']).toBeUndefined()
    expect(RELIC_MODIFIER_DEFS['time_lord']).toBeUndefined()
    expect(RELIC_MODIFIER_DEFS['time_crystal']).toBeUndefined()
  })
})
