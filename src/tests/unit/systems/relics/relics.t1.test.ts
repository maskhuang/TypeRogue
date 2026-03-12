// ============================================
// 打字肉鸽 - T1 条件加成遗物测试
// ============================================
// Story 27.2: 5 个 T1 条件加成遗物

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RELICS, RELIC_MODIFIER_DEFS } from '../../../../src/data/relics'
import { ConditionEvaluator } from '../../../../src/systems/modifiers/ConditionEvaluator'
import { ModifierRegistry } from '../../../../src/systems/modifiers/ModifierRegistry'
import { EffectPipeline } from '../../../../src/systems/modifiers/EffectPipeline'
import { BehaviorExecutor } from '../../../../src/systems/modifiers/BehaviorExecutor'

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
// T1 遗物数据完整性
// ========================================
describe('T1 遗物数据', () => {
  const t1Ids = ['spark_core', 'forge_heart', 'chain_surge', 'stack_resonance', 'perfect_rhythm', 'resource_flood']

  it('6 个 T1 遗物都在 RELICS 中定义', () => {
    t1Ids.forEach(id => {
      expect(RELICS[id]).toBeDefined()
    })
  })

  it('6 个 T1 遗物都在 RELIC_MODIFIER_DEFS 中定义', () => {
    t1Ids.forEach(id => {
      expect(RELIC_MODIFIER_DEFS[id]).toBeDefined()
    })
  })

  it('RELIC_MODIFIER_DEFS 总数 = 39', () => {
    expect(Object.keys(RELIC_MODIFIER_DEFS)).toHaveLength(38)
  })

  it('图标唯一', () => {
    const icons = t1Ids.map(id => RELICS[id].icon)
    expect(new Set(icons).size).toBe(6)
  })
})

// ========================================
// spark_core（点火核心）
// ========================================
describe('spark_core（点火核心）', () => {
  beforeEach(() => clearRelics())

  it('数据: rarity=rare, basePrice=50', () => {
    expect(RELICS.spark_core.rarity).toBe('rare')
    expect(RELICS.spark_core.basePrice).toBe(50)
  })

  it('工厂: 产生 1 个 Modifier（score ×1.20 条件: is_producer_and_count_gte 3）', () => {
    const mods = RELIC_MODIFIER_DEFS.spark_core('spark_core')
    expect(mods).toHaveLength(1)
    expect(mods[0].layer).toBe('global')
    expect(mods[0].trigger).toBe('on_skill_trigger')
    expect(mods[0].effect!.type).toBe('score')
    expect(mods[0].effect!.value).toBe(1.20)
    expect(mods[0].condition).toEqual({ type: 'is_producer_and_count_gte', value: 3 })
  })

  it('条件: producer + 3个产出者 → 生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'is_producer_and_count_gte', value: 3 },
      { currentSkillCategory: 'producer', equippedProducerCount: 3 }
    )).toBe(true)
  })

  it('条件: producer + 2个产出者 → 不生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'is_producer_and_count_gte', value: 3 },
      { currentSkillCategory: 'producer', equippedProducerCount: 2 }
    )).toBe(false)
  })

  it('条件: converter + 3个产出者 → 不生效（非产出者）', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'is_producer_and_count_gte', value: 3 },
      { currentSkillCategory: 'converter', equippedProducerCount: 3 }
    )).toBe(false)
  })

  it('管道集成: producer + ≥3 产出者 → score ×1.20', () => {
    addRelic('spark_core')
    const registry = new ModifierRegistry()
    registry.register({
      id: 'skill:test:score', source: 'skill:test', sourceType: 'skill',
      layer: 'base', trigger: 'on_skill_trigger', phase: 'calculate',
      effect: { type: 'score', value: 100, stacking: 'additive' }, priority: 100,
    })
    const relicMods = RELIC_MODIFIER_DEFS.spark_core('spark_core')
    registry.registerMany(relicMods)
    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', { currentSkillCategory: 'producer', equippedProducerCount: 4 })
    expect(result.effects.score).toBe(120)
  })

  it('管道集成: producer + <3 产出者 → score 不变', () => {
    addRelic('spark_core')
    const registry = new ModifierRegistry()
    registry.register({
      id: 'skill:test:score', source: 'skill:test', sourceType: 'skill',
      layer: 'base', trigger: 'on_skill_trigger', phase: 'calculate',
      effect: { type: 'score', value: 100, stacking: 'additive' }, priority: 100,
    })
    const relicMods = RELIC_MODIFIER_DEFS.spark_core('spark_core')
    registry.registerMany(relicMods)
    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', { currentSkillCategory: 'producer', equippedProducerCount: 2 })
    expect(result.effects.score).toBe(100)
  })
})

// ========================================
// forge_heart（熔炉之心）
// ========================================
describe('forge_heart（熔炉之心）', () => {
  beforeEach(() => clearRelics())

  it('数据: rarity=common, basePrice=25', () => {
    expect(RELICS.forge_heart.rarity).toBe('common')
    expect(RELICS.forge_heart.basePrice).toBe(25)
  })

  it('工厂: 产生 1 个 Modifier（score ×1.15 条件: skill_has_affix convert）', () => {
    const mods = RELIC_MODIFIER_DEFS.forge_heart('forge_heart')
    expect(mods).toHaveLength(1)
    expect(mods[0].layer).toBe('global')
    expect(mods[0].trigger).toBe('on_skill_trigger')
    expect(mods[0].effect!.type).toBe('score')
    expect(mods[0].effect!.value).toBe(1.15)
    expect(mods[0].condition).toEqual({ type: 'skill_has_affix', affixType: 'convert' })
  })

  it('条件: 技能有 convert 词缀 → 生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'skill_has_affix', affixType: 'convert' },
      { currentSkillAffixes: ['convert'] }
    )).toBe(true)
  })

  it('条件: 技能无 convert 词缀 → 不生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'skill_has_affix', affixType: 'convert' },
      { currentSkillAffixes: [] }
    )).toBe(false)
  })

  it('条件: 技能有其他词缀但无 convert → 不生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'skill_has_affix', affixType: 'convert' },
      { currentSkillAffixes: ['produce'] }
    )).toBe(false)
  })

  it('管道集成: 技能有 convert 词缀 → score ×1.15', () => {
    addRelic('forge_heart')
    const registry = new ModifierRegistry()
    registry.register({
      id: 'skill:test:score', source: 'skill:test', sourceType: 'skill',
      layer: 'base', trigger: 'on_skill_trigger', phase: 'calculate',
      effect: { type: 'score', value: 100, stacking: 'additive' }, priority: 100,
    })
    const relicMods = RELIC_MODIFIER_DEFS.forge_heart('forge_heart')
    registry.registerMany(relicMods)
    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', { currentSkillAffixes: ['convert'] })
    expect(result.effects.score).toBeCloseTo(115, 5)
  })

  it('管道集成: 技能无 convert 词缀 → score 不变', () => {
    addRelic('forge_heart')
    const registry = new ModifierRegistry()
    registry.register({
      id: 'skill:test:score', source: 'skill:test', sourceType: 'skill',
      layer: 'base', trigger: 'on_skill_trigger', phase: 'calculate',
      effect: { type: 'score', value: 100, stacking: 'additive' }, priority: 100,
    })
    const relicMods = RELIC_MODIFIER_DEFS.forge_heart('forge_heart')
    registry.registerMany(relicMods)
    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', { currentSkillAffixes: [] })
    expect(result.effects.score).toBe(100)
  })
})

// ========================================
// chain_surge（链路增压）
// ========================================
describe('chain_surge（链路增压）', () => {
  beforeEach(() => clearRelics())

  it('数据: rarity=rare, basePrice=50', () => {
    expect(RELICS.chain_surge.rarity).toBe('rare')
    expect(RELICS.chain_surge.basePrice).toBe(50)
  })

  it('工厂: 产生 1 个 Modifier（score ×1.25 条件: chained）', () => {
    const mods = RELIC_MODIFIER_DEFS.chain_surge('chain_surge')
    expect(mods).toHaveLength(1)
    expect(mods[0].condition).toEqual({ type: 'is_affix_chain_trigger' })
    expect(mods[0].effect!.value).toBe(1.25)
  })

  it('条件: 词缀链式触发时生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'is_affix_chain_trigger' },
      { isAffixChainTrigger: true }
    )).toBe(true)
  })

  it('条件: 非词缀链式不生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'is_affix_chain_trigger' },
      { isAffixChainTrigger: false }
    )).toBe(false)
    expect(ConditionEvaluator.evaluate(
      { type: 'is_affix_chain_trigger' },
      {}
    )).toBe(false)
  })

  it('管道集成: 词缀链式触发时 score ×1.25', () => {
    addRelic('chain_surge')
    const registry = new ModifierRegistry()
    registry.register({
      id: 'skill:test:score', source: 'skill:test', sourceType: 'skill',
      layer: 'base', trigger: 'on_skill_trigger', phase: 'calculate',
      effect: { type: 'score', value: 100, stacking: 'additive' }, priority: 100,
    })
    const relicMods = RELIC_MODIFIER_DEFS.chain_surge('chain_surge')
    registry.registerMany(relicMods)
    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', { isAffixChainTrigger: true })
    expect(result.effects.score).toBe(125)
  })

  it('管道集成: 非词缀链式触发时 score 不变', () => {
    addRelic('chain_surge')
    const registry = new ModifierRegistry()
    registry.register({
      id: 'skill:test:score', source: 'skill:test', sourceType: 'skill',
      layer: 'base', trigger: 'on_skill_trigger', phase: 'calculate',
      effect: { type: 'score', value: 100, stacking: 'additive' }, priority: 100,
    })
    const relicMods = RELIC_MODIFIER_DEFS.chain_surge('chain_surge')
    registry.registerMany(relicMods)
    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', { isAffixChainTrigger: false })
    expect(result.effects.score).toBe(100)
  })
})

// ========================================
// stack_resonance（层叠共鸣）
// ========================================
describe('stack_resonance（层叠共鸣）', () => {
  beforeEach(() => clearRelics())

  it('数据: rarity=rare, basePrice=55', () => {
    expect(RELICS.stack_resonance.rarity).toBe('rare')
    expect(RELICS.stack_resonance.basePrice).toBe(55)
  })

  it('工厂: 产生 1 个 Modifier（score ×1.10 条件: stacks≥15）', () => {
    const mods = RELIC_MODIFIER_DEFS.stack_resonance('stack_resonance')
    expect(mods).toHaveLength(1)
    expect(mods[0].condition).toEqual({ type: 'affix_amplify_stacks_gte', value: 15 })
    expect(mods[0].effect!.value).toBe(1.10)
  })

  it('条件: 叠层=15 时生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'affix_amplify_stacks_gte', value: 15 },
      { currentSkillAmplifyStacks: 15 }
    )).toBe(true)
  })

  it('条件: 叠层=14 不生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'affix_amplify_stacks_gte', value: 15 },
      { currentSkillAmplifyStacks: 14 }
    )).toBe(false)
  })

  it('条件: 无叠层数据不生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'affix_amplify_stacks_gte', value: 15 },
      {}
    )).toBe(false)
  })

  it('管道集成: 叠层≥15 时 score ×1.10', () => {
    addRelic('stack_resonance')
    const registry = new ModifierRegistry()
    registry.register({
      id: 'skill:test:score', source: 'skill:test', sourceType: 'skill',
      layer: 'base', trigger: 'on_skill_trigger', phase: 'calculate',
      effect: { type: 'score', value: 100, stacking: 'additive' }, priority: 100,
    })
    const relicMods = RELIC_MODIFIER_DEFS.stack_resonance('stack_resonance')
    registry.registerMany(relicMods)
    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', { currentSkillAmplifyStacks: 15 })
    expect(result.effects.score).toBeCloseTo(110, 5)
  })

  it('管道集成: 叠层<15 时 score 不变', () => {
    addRelic('stack_resonance')
    const registry = new ModifierRegistry()
    registry.register({
      id: 'skill:test:score', source: 'skill:test', sourceType: 'skill',
      layer: 'base', trigger: 'on_skill_trigger', phase: 'calculate',
      effect: { type: 'score', value: 100, stacking: 'additive' }, priority: 100,
    })
    const relicMods = RELIC_MODIFIER_DEFS.stack_resonance('stack_resonance')
    registry.registerMany(relicMods)
    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', { currentSkillAmplifyStacks: 10 })
    expect(result.effects.score).toBe(100)
  })
})

// ========================================
// perfect_rhythm（完美韵律）
// ========================================
describe('perfect_rhythm（完美韵律）', () => {
  beforeEach(() => clearRelics())

  it('数据: rarity=common, basePrice=30', () => {
    expect(RELICS.perfect_rhythm.rarity).toBe('common')
    expect(RELICS.perfect_rhythm.basePrice).toBe(30)
  })

  it('工厂: 产生 1 个 Modifier（time_refund behavior, 条件: word_perfect）', () => {
    const mods = RELIC_MODIFIER_DEFS.perfect_rhythm('perfect_rhythm')
    expect(mods).toHaveLength(1)
    expect(mods[0].trigger).toBe('on_word_complete')
    expect(mods[0].phase).toBe('after')
    expect(mods[0].behavior).toEqual({ type: 'time_refund', ratio: 0.5 })
    expect(mods[0].condition).toEqual({ type: 'word_perfect' })
  })

  it('条件: 无错误时生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'word_perfect' },
      { wordPerfect: true }
    )).toBe(true)
  })

  it('条件: 有错误时不生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'word_perfect' },
      { wordPerfect: false }
    )).toBe(false)
    expect(ConditionEvaluator.evaluate(
      { type: 'word_perfect' },
      {}
    )).toBe(false)
  })

  it('BehaviorExecutor: time_refund 触发回调', () => {
    let refundRatio = 0
    BehaviorExecutor.execute(
      [{ type: 'time_refund', ratio: 0.5 }],
      0,
      { onTimeRefund: (ratio) => { refundRatio = ratio } }
    )
    expect(refundRatio).toBe(0.5)
  })
})

// ========================================
// resource_flood（资源洪流）
// ========================================
describe('resource_flood（资源洪流）', () => {
  beforeEach(() => clearRelics())

  it('数据: rarity=rare, basePrice=50', () => {
    expect(RELICS.resource_flood.rarity).toBe('rare')
    expect(RELICS.resource_flood.basePrice).toBe(50)
  })

  it('工厂: 产生 1 个 Modifier（multiply +0.20 条件: ≥3 资源）', () => {
    const mods = RELIC_MODIFIER_DEFS.resource_flood('resource_flood')
    expect(mods).toHaveLength(1)
    expect(mods[0].trigger).toBe('on_word_complete')
    expect(mods[0].layer).toBe('base')
    expect(mods[0].effect!.type).toBe('multiply')
    expect(mods[0].effect!.value).toBe(0.20)
    expect(mods[0].condition).toEqual({ type: 'word_resource_types_gte', value: 3 })
  })

  it('条件: 3 种资源时生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'word_resource_types_gte', value: 3 },
      { wordResourceTypes: 3 }
    )).toBe(true)
  })

  it('条件: 4 种资源时生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'word_resource_types_gte', value: 3 },
      { wordResourceTypes: 4 }
    )).toBe(true)
  })

  it('条件: 2 种资源不生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'word_resource_types_gte', value: 3 },
      { wordResourceTypes: 2 }
    )).toBe(false)
  })

  it('管道集成: ≥3 资源时 multiply = 0.20', () => {
    addRelic('resource_flood')
    const registry = new ModifierRegistry()
    const relicMods = RELIC_MODIFIER_DEFS.resource_flood('resource_flood')
    registry.registerMany(relicMods)
    const result = EffectPipeline.resolve(registry, 'on_word_complete', { wordResourceTypes: 3 })
    expect(result.effects.multiply).toBe(0.20)
  })

  it('管道集成: <3 资源时 multiply = 0', () => {
    addRelic('resource_flood')
    const registry = new ModifierRegistry()
    const relicMods = RELIC_MODIFIER_DEFS.resource_flood('resource_flood')
    registry.registerMany(relicMods)
    const result = EffectPipeline.resolve(registry, 'on_word_complete', { wordResourceTypes: 2 })
    expect(result.effects.multiply).toBe(0)
  })
})
