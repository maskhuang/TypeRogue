// ============================================
// 打字肉鸽 - T6 经济 + T7 风险回报遗物测试
// ============================================
// Story 27.5: cornucopia, time_bank, ramen, overcharge

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RELICS, RELIC_MODIFIER_DEFS } from '../../../../src/data/relics'
import { ModifierRegistry } from '../../../../src/systems/modifiers/ModifierRegistry'
import { EffectPipeline } from '../../../../src/systems/modifiers/EffectPipeline'
import { BehaviorExecutor } from '../../../../src/systems/modifiers/BehaviorExecutor'
import type { PipelineContext } from '../../../../src/systems/modifiers/ModifierTypes'

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

function addRelic(id: string): void {
  state.player.relics.add(id)
}

/** 用工厂注册 modifier 并 resolve 指定 trigger */
function resolveFactory(
  relicId: string,
  trigger: string,
  context?: PipelineContext,
) {
  const factory = RELIC_MODIFIER_DEFS[relicId]
  expect(factory).toBeDefined()
  const mods = factory(relicId, context)
  const registry = new ModifierRegistry()
  registry.registerMany(mods.filter(m => m.trigger === trigger))
  return EffectPipeline.resolve(registry, trigger as any, context)
}

/** resolve on_skill_trigger 并注入 dummy base=1 使 global 层生效 */
function resolveSkillTrigger(
  relicId: string,
  context?: PipelineContext,
) {
  const factory = RELIC_MODIFIER_DEFS[relicId]
  expect(factory).toBeDefined()
  const mods = factory(relicId, context)
  const registry = new ModifierRegistry()
  // dummy base=1
  registry.register({
    id: '_base:score', source: '_base', sourceType: 'skill',
    layer: 'base', trigger: 'on_skill_trigger', phase: 'calculate',
    effect: { type: 'score', value: 1, stacking: 'additive' }, priority: 0,
  })
  registry.registerMany(mods.filter(m => m.trigger === 'on_skill_trigger'))
  return EffectPipeline.resolve(registry, 'on_skill_trigger', context)
}

// ========================================
// T6/T7 遗物数据完整性
// ========================================
describe('T6/T7 遗物数据', () => {
  const t6Ids = ['cornucopia', 'time_bank']
  const t7Ids = ['ramen', 'overcharge']
  const allIds = [...t6Ids, ...t7Ids]

  it('4 个遗物都在 RELICS 中定义', () => {
    allIds.forEach(id => {
      expect(RELICS[id]).toBeDefined()
    })
  })

  it('4 个遗物都有 RELIC_MODIFIER_DEFS 工厂', () => {
    allIds.forEach(id => {
      expect(RELIC_MODIFIER_DEFS[id]).toBeDefined()
    })
  })

  it('图标唯一', () => {
    const allIcons = Object.values(RELICS).map(r => r.icon)
    expect(new Set(allIcons).size).toBe(allIcons.length)
  })

  it('cornucopia 数据正确 — Common, 🧧, 25g', () => {
    const r = RELICS.cornucopia
    expect(r.rarity).toBe('common')
    expect(r.icon).toBe('🧧')
    expect(r.basePrice).toBe(25)
  })

  it('time_bank 数据正确 — Rare, 💳, 55g', () => {
    const r = RELICS.time_bank
    expect(r.rarity).toBe('rare')
    expect(r.icon).toBe('💳')
    expect(r.basePrice).toBe(55)
  })

  it('ramen 数据正确 — Rare, 🍜, 45g, risk-reward', () => {
    const r = RELICS.ramen
    expect(r.rarity).toBe('rare')
    expect(r.icon).toBe('🍜')
    expect(r.basePrice).toBe(45)
    expect(r.category).toBe('risk-reward')
  })

  it('overcharge 数据正确 — Rare, 🔋, 50g, risk-reward', () => {
    const r = RELICS.overcharge
    expect(r.rarity).toBe('rare')
    expect(r.icon).toBe('🔋')
    expect(r.basePrice).toBe(50)
    expect(r.category).toBe('risk-reward')
  })
})

// ========================================
// cornucopia（聚宝盆）
// ========================================
describe('cornucopia — 每关开始 +15 金币', () => {
  beforeEach(clearRelics)

  it('on_battle_start 产出 gold=15', () => {
    addRelic('cornucopia')
    const result = resolveFactory('cornucopia', 'on_battle_start')
    expect(result.effects.gold).toBe(15)
  })

  it('非 on_battle_start trigger 不产出', () => {
    addRelic('cornucopia')
    const result = resolveFactory('cornucopia', 'on_battle_end')
    expect(result.effects.gold).toBe(0)
  })
})

// ========================================
// time_bank（时间银行）
// ========================================
describe('time_bank — 剩余时间转金币', () => {
  beforeEach(clearRelics)

  it('remainingTime=12.7 → gold=12（向下取整）', () => {
    addRelic('time_bank')
    const result = resolveFactory('time_bank', 'on_battle_end', { remainingTime: 12.7 })
    expect(result.effects.gold).toBe(12)
  })

  it('remainingTime=0 → gold=0', () => {
    addRelic('time_bank')
    const result = resolveFactory('time_bank', 'on_battle_end', { remainingTime: 0 })
    expect(result.effects.gold).toBe(0)
  })

  it('无 context → gold=0', () => {
    addRelic('time_bank')
    const result = resolveFactory('time_bank', 'on_battle_end')
    expect(result.effects.gold).toBe(0)
  })

  it('remainingTime=30 → gold=30', () => {
    addRelic('time_bank')
    const result = resolveFactory('time_bank', 'on_battle_end', { remainingTime: 30 })
    expect(result.effects.gold).toBe(30)
  })
})

// ========================================
// ramen（拉面）— 速度条件型 (Story 28.3 重设计)
// ========================================
describe('ramen — 快速完词 +30% / 慢速 -20%', () => {
  beforeEach(clearRelics)

  it('工厂始终返回 2 个条件修饰器（无状态依赖）', () => {
    const factory = RELIC_MODIFIER_DEFS.ramen
    const mods = factory('ramen')
    expect(mods).toHaveLength(2)
    expect(mods[0].condition).toBeDefined()
    expect(mods[1].condition).toBeDefined()
  })

  it('快速完词 wordElapsed=1.5 → multiply=+0.3', () => {
    addRelic('ramen')
    const result = resolveFactory('ramen', 'on_word_complete', {
      wordElapsed: 1.5,
    })
    expect(result.effects.multiply).toBeCloseTo(0.3)
  })

  it('慢速完词 wordElapsed=5.0 → multiply=-0.2', () => {
    addRelic('ramen')
    const result = resolveFactory('ramen', 'on_word_complete', {
      wordElapsed: 5.0,
    })
    expect(result.effects.multiply).toBeCloseTo(-0.2)
  })

  it('中间速度 wordElapsed=3.0 → multiply=0（无效果）', () => {
    addRelic('ramen')
    const result = resolveFactory('ramen', 'on_word_complete', {
      wordElapsed: 3.0,
    })
    expect(result.effects.multiply).toBe(0)
  })

  it('边界值 wordElapsed=2.0 → 不触发快速（<2 不含 =2）', () => {
    addRelic('ramen')
    const result = resolveFactory('ramen', 'on_word_complete', {
      wordElapsed: 2.0,
    })
    expect(result.effects.multiply).toBe(0)
  })

  it('边界值 wordElapsed=4.0 → 不触发慢速（>4 不含 =4）', () => {
    addRelic('ramen')
    const result = resolveFactory('ramen', 'on_word_complete', {
      wordElapsed: 4.0,
    })
    expect(result.effects.multiply).toBe(0)
  })

  it('非 on_word_complete trigger 不产出', () => {
    addRelic('ramen')
    const result = resolveFactory('ramen', 'on_skill_trigger', {
      wordElapsed: 1.0,
    })
    expect(result.effects.multiply).toBe(0)
  })
})

// ========================================
// overcharge（过载核心）
// ========================================
describe('overcharge — 蓝装及以上 +50% / -0.1s', () => {
  beforeEach(clearRelics)

  it('rarity≥1 触发 → score ×1.50（global 层）', () => {
    addRelic('overcharge')
    const result = resolveSkillTrigger('overcharge', {
      currentSkillRarity: 1,
    })
    expect(result.effects.score).toBeCloseTo(1.50)
  })

  it('rarity=0(白装) 触发 → score ×1.00（无增益）', () => {
    addRelic('overcharge')
    const result = resolveSkillTrigger('overcharge', {
      currentSkillRarity: 0,
    })
    expect(result.effects.score).toBeCloseTo(1.0)
  })

  it('rarity≥1 触发 → 产生 time_steal 行为（-0.1s）', () => {
    addRelic('overcharge')
    const result = resolveSkillTrigger('overcharge', {
      currentSkillRarity: 2,
    })
    expect(result.pendingBehaviors).toHaveLength(1)
    expect(result.pendingBehaviors[0]).toEqual({
      type: 'time_steal',
      timeBonus: -0.1,
    })
  })

  it('rarity=0 触发 → 无 time_steal 行为', () => {
    addRelic('overcharge')
    const result = resolveSkillTrigger('overcharge', {
      currentSkillRarity: 0,
    })
    expect(result.pendingBehaviors).toHaveLength(0)
  })

  it('time_steal 行为可被 BehaviorExecutor 执行', () => {
    addRelic('overcharge')
    const result = resolveSkillTrigger('overcharge', {
      currentSkillRarity: 1,
    })
    let timeStolen = 0
    BehaviorExecutor.execute(result.pendingBehaviors, 0, {
      onTimeSteal: (bonus) => { timeStolen = bonus },
    })
    expect(timeStolen).toBe(-0.1)
  })

  it('无 rarity 信息（旧系统） → 无效果', () => {
    addRelic('overcharge')
    const result = resolveSkillTrigger('overcharge', {})
    expect(result.effects.score).toBeCloseTo(1.0)
    expect(result.pendingBehaviors).toHaveLength(0)
  })
})

// ========================================
// current_skill_is_producer 条件
// ========================================
describe('current_skill_is_producer 条件', () => {
  it('ConditionEvaluator 正确评估 producer', async () => {
    const { ConditionEvaluator } = await import('../../../../src/systems/modifiers/ConditionEvaluator')
    expect(ConditionEvaluator.evaluate(
      { type: 'current_skill_is_producer' },
      { currentSkillCategory: 'producer' },
    )).toBe(true)
  })

  it('ConditionEvaluator 非 producer 返回 false', async () => {
    const { ConditionEvaluator } = await import('../../../../src/systems/modifiers/ConditionEvaluator')
    expect(ConditionEvaluator.evaluate(
      { type: 'current_skill_is_producer' },
      { currentSkillCategory: 'converter' },
    )).toBe(false)
  })

  it('ConditionEvaluator 无 category 返回 false', async () => {
    const { ConditionEvaluator } = await import('../../../../src/systems/modifiers/ConditionEvaluator')
    expect(ConditionEvaluator.evaluate(
      { type: 'current_skill_is_producer' },
      {},
    )).toBe(false)
  })
})

// ========================================
// initRelicState
// ========================================
describe('initRelicState', () => {
  beforeEach(clearRelics)

  it('ramen 无状态：initRelicState 不写入 relicStates', async () => {
    const { initRelicState } = await import('../../../../src/systems/relics/RelicPipeline')
    initRelicState('ramen')
    expect(state.player.relicStates['ramen']).toBeUndefined()
  })

  it('非状态遗物不写入 relicStates', async () => {
    const { initRelicState } = await import('../../../../src/systems/relics/RelicPipeline')
    initRelicState('cornucopia')
    expect(state.player.relicStates['cornucopia']).toBeUndefined()
  })
})
