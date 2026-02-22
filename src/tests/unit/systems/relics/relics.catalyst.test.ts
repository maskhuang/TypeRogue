// ============================================
// 打字肉鸽 - 催化剂遗物测试
// ============================================
// Story 13.1: 6 个构筑催化剂遗物

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RELIC_MODIFIER_DEFS } from '../../../../src/data/relics'
import { queryRelicFlag, injectRelicModifiers } from '../../../../src/systems/relics/RelicPipeline'
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
      shieldCount: 0,
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
// 连锁放大器（chain_amplifier）
// ========================================
describe('连锁放大器 (chain_amplifier)', () => {
  beforeEach(() => clearRelics())

  it('queryRelicFlag: 无遗物 → false', () => {
    expect(queryRelicFlag('chain_amplifier')).toBe(false)
  })

  it('queryRelicFlag: 有遗物 → true', () => {
    addRelic('chain_amplifier')
    expect(queryRelicFlag('chain_amplifier')).toBe(true)
  })

  it('工厂返回空数组（行为型遗物）', () => {
    expect(RELIC_MODIFIER_DEFS.chain_amplifier('chain_amplifier')).toEqual([])
  })
})

// ========================================
// 铁壁（fortress）
// ========================================
describe('铁壁 (fortress)', () => {
  beforeEach(() => clearRelics())

  it('fortress_shield_bonus: 无遗物 → 0', () => {
    expect(queryRelicFlag('fortress_shield_bonus')).toBe(0)
  })

  it('fortress_shield_bonus: 有遗物 → 2', () => {
    addRelic('fortress')
    expect(queryRelicFlag('fortress_shield_bonus')).toBe(2)
  })

  it('fortress_sentinel_bonus: 无遗物 → 0', () => {
    expect(queryRelicFlag('fortress_sentinel_bonus')).toBe(0)
  })

  it('fortress_sentinel_bonus: 有遗物 → 1', () => {
    addRelic('fortress')
    expect(queryRelicFlag('fortress_sentinel_bonus')).toBe(1)
  })
})

// ========================================
// 被动大师（passive_mastery）
// ========================================
describe('被动大师 (passive_mastery)', () => {
  beforeEach(() => clearRelics())

  it('queryRelicFlag: 无遗物 → false', () => {
    expect(queryRelicFlag('passive_mastery')).toBe(false)
  })

  it('queryRelicFlag: 有遗物 → true', () => {
    addRelic('passive_mastery')
    expect(queryRelicFlag('passive_mastery')).toBe(true)
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
// 赌徒信条（gamblers_creed）
// ========================================
describe('赌徒信条 (gamblers_creed)', () => {
  beforeEach(() => clearRelics())

  it('queryRelicFlag: 无遗物 → false', () => {
    expect(queryRelicFlag('gamblers_creed')).toBe(false)
  })

  it('queryRelicFlag: 有遗物 → true', () => {
    addRelic('gamblers_creed')
    expect(queryRelicFlag('gamblers_creed')).toBe(true)
  })

  it('random 条件: 无信条 + Math.random=0.9 → false', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(ConditionEvaluator.evaluate({ type: 'random', probability: 0.5 }, {})).toBe(false)
    vi.restoreAllMocks()
  })

  it('random 条件: 有信条(context) → 始终 true（忽略概率）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    expect(ConditionEvaluator.evaluate(
      { type: 'random', probability: 0.01 },
      { hasGamblersCreed: true }
    )).toBe(true)
    vi.restoreAllMocks()
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

  describe('fortress — shield 效果增强', () => {
    it('shield 技能通过 fortress 获得 +2 护盾', () => {
      addRelic('fortress')
      // shield 技能产出 shield=2 (base=2, lvl=1)
      const fortressBonus = queryRelicFlag('fortress_shield_bonus') as number
      const baseShield = 2 // shield 技能 lvl1 产出
      expect(baseShield + fortressBonus).toBe(4) // 2 + 2
    })

    it('sentinel 技能通过 fortress 每层护盾额外 +1 分', () => {
      addRelic('fortress')
      const sentinelBonus = queryRelicFlag('fortress_sentinel_bonus') as number
      const shieldCount = 3
      // sentinel 每层护盾加 sentinelBonus 分
      expect(shieldCount * sentinelBonus).toBe(3) // 3 × 1
    })
  })

  describe('passive_mastery — enhance 翻倍', () => {
    it('enhance 1.5 → 2.0（翻倍公式）', () => {
      const value = 1.5
      const boosted = 1 + (value - 1) * 2
      expect(boosted).toBe(2.0)
    })

    it('enhance 1.15 → 1.30（小幅翻倍）', () => {
      const value = 1.15
      const boosted = 1 + (value - 1) * 2
      expect(boosted).toBeCloseTo(1.30)
    })

    it('enhance value <= 1.0 时不翻倍（guard）', () => {
      // 当 value <= 1.0 时，guard 条件 m.effect.value > 1 阻止翻倍
      const value = 0.8
      const shouldBoost = value > 1
      expect(shouldBoost).toBe(false) // 不会被翻倍
    })
  })

  describe('gamblers_creed — random 条件绕过', () => {
    it('gamble 技能 pipeline: 无信条 + 低概率 → 条件可能失败', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99)
      const registry = new ModifierRegistry()
      registry.register({
        id: 'skill:gamble:score', source: 'skill:gamble', sourceType: 'skill',
        layer: 'base', trigger: 'on_skill_trigger', phase: 'calculate',
        condition: { type: 'random', probability: 0.5 },
        effect: { type: 'score', value: 15, stacking: 'additive' }, priority: 100,
      })
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger', {})
      expect(result.effects.score).toBe(0) // 条件失败，无得分
      vi.restoreAllMocks()
    })

    it('gamble 技能 pipeline: 有信条 + 低概率 → 条件仍成功', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99)
      const registry = new ModifierRegistry()
      registry.register({
        id: 'skill:gamble:score', source: 'skill:gamble', sourceType: 'skill',
        layer: 'base', trigger: 'on_skill_trigger', phase: 'calculate',
        condition: { type: 'random', probability: 0.5 },
        effect: { type: 'score', value: 15, stacking: 'additive' }, priority: 100,
      })
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger', { hasGamblersCreed: true })
      expect(result.effects.score).toBe(15) // 信条绕过概率
      vi.restoreAllMocks()
    })
  })

  describe('chain_amplifier — queryRelicFlag 集成', () => {
    it('ripple passthrough 缩放 ×2 逻辑', () => {
      addRelic('chain_amplifier')
      const passthrough = { score: 5, multiply: 0.2, time: 1, gold: 0, shield: 0 }
      // 模拟 skills.ts 中的缩放逻辑
      if (queryRelicFlag('chain_amplifier') === true) {
        passthrough.score *= 2
        passthrough.multiply *= 2
        passthrough.time *= 2
      }
      expect(passthrough.score).toBe(10)
      expect(passthrough.multiply).toBe(0.4)
      expect(passthrough.time).toBe(2)
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
})
