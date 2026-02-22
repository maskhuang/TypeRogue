// ============================================
// 打字肉鸽 - 风险回报遗物测试
// ============================================
// Story 13.2: 5 个风险回报遗物

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RELICS, RELIC_MODIFIER_DEFS } from '../../../../src/data/relics'
import { queryRelicFlag, resolveRelicEffects } from '../../../../src/systems/relics/RelicPipeline'
import { ConditionEvaluator } from '../../../../src/systems/modifiers/ConditionEvaluator'
import { BehaviorExecutor } from '../../../../src/systems/modifiers/BehaviorExecutor'
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
      level: 1,
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
// 遗物数据完整性
// ========================================
describe('风险回报遗物数据', () => {
  const riskRewardIds = ['glass_cannon', 'time_thief', 'greedy_hand', 'silence_vow', 'doomsday']

  it('5 个风险回报遗物都在 RELICS 中定义', () => {
    riskRewardIds.forEach(id => {
      expect(RELICS[id]).toBeDefined()
    })
  })

  it('所有风险回报遗物有 category: risk-reward', () => {
    riskRewardIds.forEach(id => {
      expect(RELICS[id].category).toBe('risk-reward')
    })
  })

  it('5 个风险回报遗物都有 RELIC_MODIFIER_DEFS 工厂', () => {
    riskRewardIds.forEach(id => {
      expect(RELIC_MODIFIER_DEFS[id]).toBeDefined()
      expect(typeof RELIC_MODIFIER_DEFS[id]).toBe('function')
    })
  })
})

// ========================================
// 玻璃大炮（glass_cannon）
// ========================================
describe('玻璃大炮 (glass_cannon)', () => {
  beforeEach(() => clearRelics())

  it('数据: rarity=rare, basePrice=40', () => {
    expect(RELICS.glass_cannon.rarity).toBe('rare')
    expect(RELICS.glass_cannon.basePrice).toBe(40)
  })

  it('工厂: 产生 2 个 Modifier（score ×2 + instant_fail）', () => {
    const mods = RELIC_MODIFIER_DEFS.glass_cannon('glass_cannon')
    expect(mods).toHaveLength(2)
  })

  it('增益: global 层 score ×2 multiplicative', () => {
    const mods = RELIC_MODIFIER_DEFS.glass_cannon('glass_cannon')
    const scoreMod = mods.find(m => m.effect?.type === 'score')
    expect(scoreMod).toBeDefined()
    expect(scoreMod!.layer).toBe('global')
    expect(scoreMod!.trigger).toBe('on_skill_trigger')
    expect(scoreMod!.effect!.value).toBe(2.0)
    expect(scoreMod!.effect!.stacking).toBe('multiplicative')
  })

  it('代价: instant_fail 行为', () => {
    const mods = RELIC_MODIFIER_DEFS.glass_cannon('glass_cannon')
    const failMod = mods.find(m => m.behavior?.type === 'instant_fail')
    expect(failMod).toBeDefined()
    expect(failMod!.trigger).toBe('on_error')
    expect(failMod!.phase).toBe('after')
  })

  it('queryRelicFlag: 无遗物 → false', () => {
    expect(queryRelicFlag('glass_cannon')).toBe(false)
  })

  it('queryRelicFlag: 有遗物 → true', () => {
    addRelic('glass_cannon')
    expect(queryRelicFlag('glass_cannon')).toBe(true)
  })

  it('管道集成: score 被 ×2 放大', () => {
    addRelic('glass_cannon')
    const registry = new ModifierRegistry()
    registry.register({
      id: 'skill:burst:score', source: 'skill:burst', sourceType: 'skill',
      layer: 'base', trigger: 'on_skill_trigger', phase: 'calculate',
      effect: { type: 'score', value: 10, stacking: 'additive' }, priority: 100,
    })
    // 注入遗物 global modifier
    const relicMods = RELIC_MODIFIER_DEFS.glass_cannon('glass_cannon')
    registry.registerMany(relicMods.filter(m => m.trigger === 'on_skill_trigger'))
    const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
    // base=10, global=×2 → 10 × 2 = 20
    expect(result.effects.score).toBe(20)
  })

  it('instant_fail 行为通过 BehaviorExecutor 触发回调', () => {
    let failCalled = false
    BehaviorExecutor.execute(
      [{ type: 'instant_fail' }],
      0,
      { onInstantFail: () => { failCalled = true } },
    )
    expect(failCalled).toBe(true)
  })
})

// ========================================
// 时间窃贼（time_thief）
// ========================================
describe('时间窃贼 (time_thief)', () => {
  beforeEach(() => clearRelics())

  it('数据: rarity=rare, basePrice=45', () => {
    expect(RELICS.time_thief.rarity).toBe('rare')
    expect(RELICS.time_thief.basePrice).toBe(45)
  })

  it('工厂: 产生 1 个 Modifier (time_steal 行为)', () => {
    const mods = RELIC_MODIFIER_DEFS.time_thief('time_thief')
    expect(mods).toHaveLength(1)
  })

  it('增益: time_steal 行为 + timeBonus=0.3', () => {
    const mods = RELIC_MODIFIER_DEFS.time_thief('time_thief')
    const timeMod = mods[0]
    expect(timeMod.behavior?.type).toBe('time_steal')
    expect((timeMod.behavior as { type: 'time_steal'; timeBonus: number }).timeBonus).toBe(0.3)
    expect(timeMod.trigger).toBe('on_skill_trigger')
  })

  it('queryRelicFlag: 无遗物 → false', () => {
    expect(queryRelicFlag('time_thief')).toBe(false)
  })

  it('queryRelicFlag: 有遗物 → true', () => {
    addRelic('time_thief')
    expect(queryRelicFlag('time_thief')).toBe(true)
  })

  it('time_steal 行为通过 BehaviorExecutor 触发回调', () => {
    let stolenTime = 0
    BehaviorExecutor.execute(
      [{ type: 'time_steal', timeBonus: 0.3 }],
      0,
      { onTimeSteal: (t: number) => { stolenTime = t } },
    )
    expect(stolenTime).toBe(0.3)
  })
})

// ========================================
// 贪婪之手（greedy_hand）
// ========================================
describe('贪婪之手 (greedy_hand)', () => {
  beforeEach(() => clearRelics())

  it('数据: rarity=rare, basePrice=50', () => {
    expect(RELICS.greedy_hand.rarity).toBe('rare')
    expect(RELICS.greedy_hand.basePrice).toBe(50)
  })

  it('工厂: 产生 1 个 Modifier (gold ×1.5)', () => {
    const mods = RELIC_MODIFIER_DEFS.greedy_hand('greedy_hand')
    expect(mods).toHaveLength(1)
  })

  it('增益: global 层 gold ×1.5 multiplicative', () => {
    const mods = RELIC_MODIFIER_DEFS.greedy_hand('greedy_hand')
    const goldMod = mods[0]
    expect(goldMod.layer).toBe('global')
    expect(goldMod.trigger).toBe('on_battle_end')
    expect(goldMod.effect?.type).toBe('gold')
    expect(goldMod.effect?.value).toBe(1.5)
    expect(goldMod.effect?.stacking).toBe('multiplicative')
  })

  it('queryRelicFlag: 无遗物 → 1 (无加价)', () => {
    expect(queryRelicFlag('greedy_hand')).toBe(1)
  })

  it('queryRelicFlag: 有遗物 → 1.5 (价格系数)', () => {
    addRelic('greedy_hand')
    expect(queryRelicFlag('greedy_hand')).toBe(1.5)
  })

  it('管道集成: 金币被 ×1.5', () => {
    addRelic('greedy_hand')
    const result = resolveRelicEffects('on_battle_end', { overkill: 0 })
    // base gold=0, global ×1.5 → 仍为 0 (0 × 1.5 = 0)
    expect(result.effects.gold).toBe(0)
  })

  it('管道集成: 有基础金币时 ×1.5', () => {
    addRelic('greedy_hand')
    // 同时加入超杀之刃产生基础金币
    addRelic('overkill_blade')
    const result = resolveRelicEffects('on_battle_end', { overkill: 10 })
    // base gold=10 (from overkill), global ×1.5 → 15
    expect(result.effects.gold).toBe(15)
  })
})

// ========================================
// 沉默誓约（silence_vow）
// ========================================
describe('沉默誓约 (silence_vow)', () => {
  beforeEach(() => clearRelics())

  it('数据: rarity=legendary, basePrice=80', () => {
    expect(RELICS.silence_vow.rarity).toBe('legendary')
    expect(RELICS.silence_vow.basePrice).toBe(80)
  })

  it('工厂: 产生 1 个 Modifier (multiply +4 + no_skills_equipped 条件)', () => {
    const mods = RELIC_MODIFIER_DEFS.silence_vow('silence_vow')
    expect(mods).toHaveLength(1)
  })

  it('增益: base 层 on_word_complete multiply +4 (bonusMult=1+4=5)', () => {
    const mods = RELIC_MODIFIER_DEFS.silence_vow('silence_vow')
    const multMod = mods[0]
    expect(multMod.layer).toBe('base')
    expect(multMod.trigger).toBe('on_word_complete')
    expect(multMod.effect?.type).toBe('multiply')
    expect(multMod.effect?.value).toBe(4.0)
    expect(multMod.effect?.stacking).toBe('additive')
    expect(multMod.condition?.type).toBe('no_skills_equipped')
  })

  it('queryRelicFlag: 无遗物 → false', () => {
    expect(queryRelicFlag('silence_vow')).toBe(false)
  })

  it('queryRelicFlag: 有遗物 → true', () => {
    addRelic('silence_vow')
    expect(queryRelicFlag('silence_vow')).toBe(true)
  })

  it('no_skills_equipped 条件: 无技能 → true', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'no_skills_equipped' },
      { totalSkillCount: 0 },
    )).toBe(true)
  })

  it('no_skills_equipped 条件: 有技能 → false', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'no_skills_equipped' },
      { totalSkillCount: 3 },
    )).toBe(false)
  })

  it('管道集成: 无技能时 multiply=4 (bonusMult=5)', () => {
    addRelic('silence_vow')
    // 直接通过 resolveRelicEffects 验证
    const result = resolveRelicEffects('on_word_complete', { totalSkillCount: 0 })
    // multiply base additive: 0 + 4 = 4
    expect(result.effects.multiply).toBe(4)
  })

  it('管道集成: 有技能时条件不满足, multiply=0', () => {
    addRelic('silence_vow')
    const result = resolveRelicEffects('on_word_complete', { totalSkillCount: 5 })
    // 条件不满足, multiply modifier 不生效 → 默认 0
    expect(result.effects.multiply).toBe(0)
  })
})

// ========================================
// 末日倒计时（doomsday）
// ========================================
describe('末日倒计时 (doomsday)', () => {
  beforeEach(() => {
    clearRelics()
    ;(state as any).level = 1
  })

  it('数据: rarity=legendary, basePrice=70', () => {
    expect(RELICS.doomsday.rarity).toBe('legendary')
    expect(RELICS.doomsday.basePrice).toBe(70)
  })

  it('工厂: 产生 1 个 Modifier (+30s time)', () => {
    const mods = RELIC_MODIFIER_DEFS.doomsday('doomsday')
    expect(mods).toHaveLength(1)
  })

  it('增益: base 层 on_battle_start time +30', () => {
    const mods = RELIC_MODIFIER_DEFS.doomsday('doomsday')
    const timeMod = mods[0]
    expect(timeMod.trigger).toBe('on_battle_start')
    expect(timeMod.effect?.type).toBe('time')
    expect(timeMod.effect?.value).toBe(30)
    expect(timeMod.effect?.stacking).toBe('additive')
  })

  it('queryRelicFlag: 无遗物 → 0', () => {
    expect(queryRelicFlag('doomsday')).toBe(0)
  })

  it('queryRelicFlag: 有遗物, 第 1 关 → 0 (无扣减)', () => {
    addRelic('doomsday')
    ;(state as any).level = 1
    expect(queryRelicFlag('doomsday')).toBe(0) // (1-1)*5 = 0
  })

  it('queryRelicFlag: 有遗物, 第 2 关 → 5', () => {
    addRelic('doomsday')
    ;(state as any).level = 2
    expect(queryRelicFlag('doomsday')).toBe(5) // (2-1)*5 = 5
  })

  it('queryRelicFlag: 有遗物, 第 5 关 → 20', () => {
    addRelic('doomsday')
    ;(state as any).level = 5
    expect(queryRelicFlag('doomsday')).toBe(20) // (5-1)*5 = 20
  })

  it('queryRelicFlag: 有遗物, 第 7 关 → 30 (净+0s)', () => {
    addRelic('doomsday')
    ;(state as any).level = 7
    expect(queryRelicFlag('doomsday')).toBe(30) // (7-1)*5 = 30
  })

  it('queryRelicFlag: 有遗物, 第 8 关 → 35 (净-5s)', () => {
    addRelic('doomsday')
    ;(state as any).level = 8
    expect(queryRelicFlag('doomsday')).toBe(35) // (8-1)*5 = 35
  })

  it('管道集成: +30s 时间', () => {
    addRelic('doomsday')
    const result = resolveRelicEffects('on_battle_start')
    expect(result.effects.time).toBe(30)
  })
})

// ========================================
// 遗物组合交互测试
// ========================================
describe('风险回报遗物组合交互', () => {
  beforeEach(() => clearRelics())

  it('glass_cannon + golden_keyboard: score ×2 × ×1.25 = ×2.5', () => {
    addRelic('glass_cannon')
    addRelic('golden_keyboard')
    const registry = new ModifierRegistry()
    registry.register({
      id: 'skill:burst:score', source: 'skill:burst', sourceType: 'skill',
      layer: 'base', trigger: 'on_skill_trigger', phase: 'calculate',
      effect: { type: 'score', value: 10, stacking: 'additive' }, priority: 100,
    })
    const gcMods = RELIC_MODIFIER_DEFS.glass_cannon('glass_cannon')
    const gkMods = RELIC_MODIFIER_DEFS.golden_keyboard('golden_keyboard')
    registry.registerMany([...gcMods, ...gkMods].filter(m => m.trigger === 'on_skill_trigger'))
    const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
    // base=10, global=×2×1.25=×2.5 → 25
    expect(result.effects.score).toBe(25)
  })

  it('greedy_hand + overkill_blade: 金币 ×1.5', () => {
    addRelic('greedy_hand')
    addRelic('overkill_blade')
    const result = resolveRelicEffects('on_battle_end', { overkill: 20 })
    // base gold=20 (overkill), global ×1.5 → 30
    expect(result.effects.gold).toBe(30)
  })

  it('doomsday + time_lord: 时间叠加', () => {
    addRelic('doomsday')
    addRelic('time_lord')
    const result = resolveRelicEffects('on_battle_start')
    // doomsday +30s + time_lord +8s → 38s
    expect(result.effects.time).toBe(38)
  })
})
