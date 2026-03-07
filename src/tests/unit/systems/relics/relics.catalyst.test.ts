// ============================================
// 打字肉鸽 - 催化剂遗物测试
// ============================================
// Story 13.1: 6 个构筑催化剂遗物

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RELIC_MODIFIER_DEFS } from '../../../../src/data/relics'
import { injectRelicModifiers } from '../../../../src/systems/relics/RelicPipeline'
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

// ========================================
// 虚空之心（void_heart）
// ========================================
describe('虚空之心 (void_heart)', () => {
  beforeEach(() => clearRelics())

  it('空键位=0 → 底分加成 0', () => {
    const mods = RELIC_MODIFIER_DEFS.void_heart('void_heart', { adjacentEmptyCount: 0 })
    expect(mods[0].effect?.value).toBe(0)
  })

  it('空键位=2 → 底分加成 6', () => {
    const mods = RELIC_MODIFIER_DEFS.void_heart('void_heart', { adjacentEmptyCount: 2 })
    expect(mods[0].effect?.value).toBe(6)
  })

  it('空键位=5 → 底分加成 15', () => {
    const mods = RELIC_MODIFIER_DEFS.void_heart('void_heart', { adjacentEmptyCount: 5 })
    expect(mods[0].effect?.value).toBe(15)
  })

  it('与技能底分叠加（base additive stacking）', () => {
    addRelic('void_heart')
    const registry = new ModifierRegistry()
    // 模拟技能底分
    registry.register({
      id: 'skill:burst:score', source: 'skill:burst', sourceType: 'skill',
      layer: 'base', trigger: 'on_skill_trigger', phase: 'calculate',
      effect: { type: 'score', value: 10, stacking: 'additive' }, priority: 100,
    })
    injectRelicModifiers(registry, { adjacentEmptyCount: 3 })
    const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
    // base = 10 + 9 = 19
    expect(result.effects.score).toBe(19)
  })
})

// ========================================
// 键盘风暴（keyboard_storm）
// ========================================
describe('键盘风暴 (keyboard_storm)', () => {
  beforeEach(() => clearRelics())

  it('total_skills_gte 条件: totalSkillCount=12 → true', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'total_skills_gte', value: 12 },
      { totalSkillCount: 12 }
    )).toBe(true)
  })

  it('total_skills_gte 条件: totalSkillCount=11 → false', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'total_skills_gte', value: 12 },
      { totalSkillCount: 11 }
    )).toBe(false)
  })

  it('total_skills_gte 条件: totalSkillCount=15 → true', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'total_skills_gte', value: 12 },
      { totalSkillCount: 15 }
    )).toBe(true)
  })

  it('管道集成: 条件满足时加底分 +2', () => {
    addRelic('keyboard_storm')
    const registry = new ModifierRegistry()
    registry.register({
      id: 'skill:burst:score', source: 'skill:burst', sourceType: 'skill',
      layer: 'base', trigger: 'on_skill_trigger', phase: 'calculate',
      effect: { type: 'score', value: 10, stacking: 'additive' }, priority: 100,
    })
    injectRelicModifiers(registry, { totalSkillCount: 12 })
    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', { totalSkillCount: 12 })
    expect(result.effects.score).toBe(12) // 10 + 2
  })

  it('管道集成: 条件不满足时不加底分', () => {
    addRelic('keyboard_storm')
    const registry = new ModifierRegistry()
    registry.register({
      id: 'skill:burst:score', source: 'skill:burst', sourceType: 'skill',
      layer: 'base', trigger: 'on_skill_trigger', phase: 'calculate',
      effect: { type: 'score', value: 10, stacking: 'additive' }, priority: 100,
    })
    injectRelicModifiers(registry, { totalSkillCount: 8 })
    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', { totalSkillCount: 8 })
    expect(result.effects.score).toBe(10) // 条件不满足，仍然只有 10
  })
})

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
})
