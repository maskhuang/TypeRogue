// ============================================
// 打字肉鸽 - T5 空间策略遗物测试
// ============================================
// Story 27.4: 4 个 T5 空间策略遗物

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RELICS, RELIC_MODIFIER_DEFS } from '../../../../src/data/relics'
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
        bindings: new Map<string, string>(),
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
  state.player.bindings.clear()
}

function addRelic(id: string): void {
  state.player.relics.add(id)
}

function setBindings(map: Record<string, string>): void {
  state.player.bindings.clear()
  for (const [key, skillId] of Object.entries(map)) {
    state.player.bindings.set(key, skillId)
  }
}

// ========================================
// T5 遗物数据完整性
// ========================================
describe('T5 遗物数据', () => {
  const t5Ids = ['home_advantage', 'ambidextrous', 'twin_bond', 'lone_wolf']

  it('4 个 T5 遗物都在 RELICS 中定义', () => {
    t5Ids.forEach(id => {
      expect(RELICS[id]).toBeDefined()
    })
  })

  it('4 个 T5 遗物都在 RELIC_MODIFIER_DEFS 中定义', () => {
    t5Ids.forEach(id => {
      expect(RELIC_MODIFIER_DEFS[id]).toBeDefined()
    })
  })

  it('RELIC_MODIFIER_DEFS 总数 = 39', () => {
    expect(Object.keys(RELIC_MODIFIER_DEFS)).toHaveLength(39)
  })

  it('图标唯一', () => {
    const icons = t5Ids.map(id => RELICS[id].icon)
    expect(new Set(icons).size).toBe(4)
  })

  it('全部 rarity=rare', () => {
    t5Ids.forEach(id => {
      expect(RELICS[id].rarity).toBe('rare')
    })
  })
})

// ========================================
// home_advantage（主行优势）
// ========================================
describe('home_advantage（主行优势）', () => {
  beforeEach(() => clearRelics())

  it('数据: rarity=rare, basePrice=50', () => {
    expect(RELICS.home_advantage.rarity).toBe('rare')
    expect(RELICS.home_advantage.basePrice).toBe(50)
  })

  it('工厂: 产生 1 个 Modifier（score ×1.30 条件: is_home_row）', () => {
    const mods = RELIC_MODIFIER_DEFS.home_advantage('home_advantage')
    expect(mods).toHaveLength(1)
    expect(mods[0].layer).toBe('global')
    expect(mods[0].trigger).toBe('on_skill_trigger')
    expect(mods[0].effect!.type).toBe('score')
    expect(mods[0].effect!.value).toBe(1.30)
    expect(mods[0].condition).toEqual({ type: 'is_home_row' })
  })

  it('条件: 主行键 f → 生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'is_home_row' },
      { currentSkillKey: 'f' }
    )).toBe(true)
  })

  it('条件: 主行键 l → 生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'is_home_row' },
      { currentSkillKey: 'l' }
    )).toBe(true)
  })

  it('条件: 非主行键 q → 不生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'is_home_row' },
      { currentSkillKey: 'q' }
    )).toBe(false)
  })

  it('条件: 非主行键 z → 不生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'is_home_row' },
      { currentSkillKey: 'z' }
    )).toBe(false)
  })

  it('条件: 无 currentSkillKey → 不生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'is_home_row' },
      {}
    )).toBe(false)
  })

  it('管道集成: 主行键 → score ×1.30', () => {
    addRelic('home_advantage')
    const registry = new ModifierRegistry()
    registry.register({
      id: 'skill:test:score', source: 'skill:test', sourceType: 'skill',
      layer: 'base', trigger: 'on_skill_trigger', phase: 'calculate',
      effect: { type: 'score', value: 100, stacking: 'additive' }, priority: 100,
    })
    const relicMods = RELIC_MODIFIER_DEFS.home_advantage('home_advantage')
    registry.registerMany(relicMods)
    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', { currentSkillKey: 'f' })
    expect(result.effects.score).toBeCloseTo(130, 5)
  })

  it('管道集成: 非主行键 → score 不变', () => {
    addRelic('home_advantage')
    const registry = new ModifierRegistry()
    registry.register({
      id: 'skill:test:score', source: 'skill:test', sourceType: 'skill',
      layer: 'base', trigger: 'on_skill_trigger', phase: 'calculate',
      effect: { type: 'score', value: 100, stacking: 'additive' }, priority: 100,
    })
    const relicMods = RELIC_MODIFIER_DEFS.home_advantage('home_advantage')
    registry.registerMany(relicMods)
    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', { currentSkillKey: 'q' })
    expect(result.effects.score).toBe(100)
  })
})

// ========================================
// ambidextrous（双手兼备）
// ========================================
describe('ambidextrous（双手兼备）', () => {
  beforeEach(() => clearRelics())

  it('数据: rarity=rare, basePrice=55', () => {
    expect(RELICS.ambidextrous.rarity).toBe('rare')
    expect(RELICS.ambidextrous.basePrice).toBe(55)
  })

  it('工厂: 产生 1 个 Modifier（multiply +0.30 条件: both_hands_triggered）', () => {
    const mods = RELIC_MODIFIER_DEFS.ambidextrous('ambidextrous')
    expect(mods).toHaveLength(1)
    expect(mods[0].trigger).toBe('on_word_complete')
    expect(mods[0].effect!.type).toBe('multiply')
    expect(mods[0].effect!.value).toBe(0.30)
    expect(mods[0].condition).toEqual({ type: 'both_hands_triggered' })
  })

  it('条件: 双手都触发 → 生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'both_hands_triggered' },
      { leftHandTriggered: true, rightHandTriggered: true }
    )).toBe(true)
  })

  it('条件: 仅左手 → 不生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'both_hands_triggered' },
      { leftHandTriggered: true, rightHandTriggered: false }
    )).toBe(false)
  })

  it('条件: 仅右手 → 不生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'both_hands_triggered' },
      { leftHandTriggered: false, rightHandTriggered: true }
    )).toBe(false)
  })

  it('条件: 均未触发 → 不生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'both_hands_triggered' },
      {}
    )).toBe(false)
  })

  it('管道集成: 双手触发 → multiply = 0.30', () => {
    addRelic('ambidextrous')
    const registry = new ModifierRegistry()
    const relicMods = RELIC_MODIFIER_DEFS.ambidextrous('ambidextrous')
    registry.registerMany(relicMods)
    const result = EffectPipeline.resolve(registry, 'on_word_complete', { leftHandTriggered: true, rightHandTriggered: true })
    expect(result.effects.multiply).toBe(0.30)
  })

  it('管道集成: 仅左手 → multiply = 0', () => {
    addRelic('ambidextrous')
    const registry = new ModifierRegistry()
    const relicMods = RELIC_MODIFIER_DEFS.ambidextrous('ambidextrous')
    registry.registerMany(relicMods)
    const result = EffectPipeline.resolve(registry, 'on_word_complete', { leftHandTriggered: true, rightHandTriggered: false })
    expect(result.effects.multiply).toBe(0)
  })
})

// ========================================
// twin_bond（成双成对）
// ========================================
describe('twin_bond（成双成对）', () => {
  beforeEach(() => clearRelics())

  it('数据: rarity=rare, basePrice=55', () => {
    expect(RELICS.twin_bond.rarity).toBe('rare')
    expect(RELICS.twin_bond.basePrice).toBe(55)
  })

  it('工厂: 产生 1 个 Modifier（score ×1.25 条件: is_in_pair）', () => {
    const mods = RELIC_MODIFIER_DEFS.twin_bond('twin_bond')
    expect(mods).toHaveLength(1)
    expect(mods[0].layer).toBe('global')
    expect(mods[0].trigger).toBe('on_skill_trigger')
    expect(mods[0].effect!.value).toBe(1.25)
    expect(mods[0].condition).toEqual({ type: 'is_in_pair' })
  })

  it('条件: f-g 配对（连通分量=2）→ 生效', () => {
    // f 和 g 相邻，且只有这两个技能
    setBindings({ f: 'skill_a', g: 'skill_b' })
    expect(ConditionEvaluator.evaluate(
      { type: 'is_in_pair' },
      { currentSkillKey: 'f' }
    )).toBe(true)
  })

  it('条件: g 在 f-g 配对中 → 也生效', () => {
    setBindings({ f: 'skill_a', g: 'skill_b' })
    expect(ConditionEvaluator.evaluate(
      { type: 'is_in_pair' },
      { currentSkillKey: 'g' }
    )).toBe(true)
  })

  it('条件: f-g-h 三联体（连通分量=3）→ 不生效', () => {
    setBindings({ f: 'skill_a', g: 'skill_b', h: 'skill_c' })
    expect(ConditionEvaluator.evaluate(
      { type: 'is_in_pair' },
      { currentSkillKey: 'f' }
    )).toBe(false)
  })

  it('条件: 孤立键（连通分量=1）→ 不生效', () => {
    setBindings({ q: 'skill_a', l: 'skill_b' })
    expect(ConditionEvaluator.evaluate(
      { type: 'is_in_pair' },
      { currentSkillKey: 'q' }
    )).toBe(false)
  })

  it('条件: 两对独立配对 — 各自生效', () => {
    // f-g 一对，j-k 一对（互不相邻）
    setBindings({ f: 'skill_a', g: 'skill_b', j: 'skill_c', k: 'skill_d' })
    expect(ConditionEvaluator.evaluate(
      { type: 'is_in_pair' },
      { currentSkillKey: 'f' }
    )).toBe(true)
    expect(ConditionEvaluator.evaluate(
      { type: 'is_in_pair' },
      { currentSkillKey: 'j' }
    )).toBe(true)
  })

  it('条件: 无 currentSkillKey → 不生效', () => {
    setBindings({ f: 'skill_a', g: 'skill_b' })
    expect(ConditionEvaluator.evaluate(
      { type: 'is_in_pair' },
      {}
    )).toBe(false)
  })

  it('管道集成: 配对时 score ×1.25', () => {
    setBindings({ f: 'skill_a', g: 'skill_b' })
    addRelic('twin_bond')
    const registry = new ModifierRegistry()
    registry.register({
      id: 'skill:test:score', source: 'skill:test', sourceType: 'skill',
      layer: 'base', trigger: 'on_skill_trigger', phase: 'calculate',
      effect: { type: 'score', value: 100, stacking: 'additive' }, priority: 100,
    })
    const relicMods = RELIC_MODIFIER_DEFS.twin_bond('twin_bond')
    registry.registerMany(relicMods)
    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', { currentSkillKey: 'f' })
    expect(result.effects.score).toBe(125)
  })

  it('管道集成: 非配对时 score 不变', () => {
    setBindings({ q: 'skill_a', l: 'skill_b' })
    addRelic('twin_bond')
    const registry = new ModifierRegistry()
    registry.register({
      id: 'skill:test:score', source: 'skill:test', sourceType: 'skill',
      layer: 'base', trigger: 'on_skill_trigger', phase: 'calculate',
      effect: { type: 'score', value: 100, stacking: 'additive' }, priority: 100,
    })
    const relicMods = RELIC_MODIFIER_DEFS.twin_bond('twin_bond')
    registry.registerMany(relicMods)
    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', { currentSkillKey: 'q' })
    expect(result.effects.score).toBe(100)
  })
})

// ========================================
// lone_wolf（独狼）
// ========================================
describe('lone_wolf（独狼）', () => {
  beforeEach(() => clearRelics())

  it('数据: rarity=rare, basePrice=55', () => {
    expect(RELICS.lone_wolf.rarity).toBe('rare')
    expect(RELICS.lone_wolf.basePrice).toBe(55)
  })

  it('工厂: 产生 1 个 Modifier（score ×1.80 条件: is_isolated）', () => {
    const mods = RELIC_MODIFIER_DEFS.lone_wolf('lone_wolf')
    expect(mods).toHaveLength(1)
    expect(mods[0].layer).toBe('global')
    expect(mods[0].trigger).toBe('on_skill_trigger')
    expect(mods[0].effect!.value).toBe(1.80)
    expect(mods[0].condition).toEqual({ type: 'is_isolated' })
  })

  it('条件: 孤立键 q（无相邻技能）→ 生效', () => {
    setBindings({ q: 'skill_a', l: 'skill_b' }) // q 和 l 不相邻
    expect(ConditionEvaluator.evaluate(
      { type: 'is_isolated' },
      { currentSkillKey: 'q' }
    )).toBe(true)
  })

  it('条件: 有相邻技能 f（g 相邻）→ 不生效', () => {
    setBindings({ f: 'skill_a', g: 'skill_b' })
    expect(ConditionEvaluator.evaluate(
      { type: 'is_isolated' },
      { currentSkillKey: 'f' }
    )).toBe(false)
  })

  it('条件: 唯一技能 m（无其他绑定）→ 生效', () => {
    setBindings({ m: 'skill_a' })
    expect(ConditionEvaluator.evaluate(
      { type: 'is_isolated' },
      { currentSkillKey: 'm' }
    )).toBe(true)
  })

  it('条件: 无 currentSkillKey → 不生效', () => {
    setBindings({ q: 'skill_a' })
    expect(ConditionEvaluator.evaluate(
      { type: 'is_isolated' },
      {}
    )).toBe(false)
  })

  it('管道集成: 孤立时 score ×1.80', () => {
    setBindings({ q: 'skill_a', l: 'skill_b' })
    addRelic('lone_wolf')
    const registry = new ModifierRegistry()
    registry.register({
      id: 'skill:test:score', source: 'skill:test', sourceType: 'skill',
      layer: 'base', trigger: 'on_skill_trigger', phase: 'calculate',
      effect: { type: 'score', value: 100, stacking: 'additive' }, priority: 100,
    })
    const relicMods = RELIC_MODIFIER_DEFS.lone_wolf('lone_wolf')
    registry.registerMany(relicMods)
    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', { currentSkillKey: 'q' })
    expect(result.effects.score).toBeCloseTo(180, 5)
  })

  it('管道集成: 非孤立时 score 不变', () => {
    setBindings({ f: 'skill_a', g: 'skill_b' })
    addRelic('lone_wolf')
    const registry = new ModifierRegistry()
    registry.register({
      id: 'skill:test:score', source: 'skill:test', sourceType: 'skill',
      layer: 'base', trigger: 'on_skill_trigger', phase: 'calculate',
      effect: { type: 'score', value: 100, stacking: 'additive' }, priority: 100,
    })
    const relicMods = RELIC_MODIFIER_DEFS.lone_wolf('lone_wolf')
    registry.registerMany(relicMods)
    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', { currentSkillKey: 'f' })
    expect(result.effects.score).toBe(100)
  })
})

// ========================================
// 组合边界测试
// ========================================
describe('T5 遗物组合边界', () => {
  beforeEach(() => clearRelics())

  it('lone_wolf 和 twin_bond 互斥：同键不可同时满足', () => {
    setBindings({ f: 'skill_a', g: 'skill_b' })
    const isPair = ConditionEvaluator.evaluate({ type: 'is_in_pair' }, { currentSkillKey: 'f' })
    const isIso = ConditionEvaluator.evaluate({ type: 'is_isolated' }, { currentSkillKey: 'f' })
    // f 和 g 相邻，f 是配对，不是孤立
    expect(isPair).toBe(true)
    expect(isIso).toBe(false)
  })

  it('孤立键同时满足 is_isolated 和不满足 is_in_pair', () => {
    setBindings({ q: 'skill_a' })
    const isPair = ConditionEvaluator.evaluate({ type: 'is_in_pair' }, { currentSkillKey: 'q' })
    const isIso = ConditionEvaluator.evaluate({ type: 'is_isolated' }, { currentSkillKey: 'q' })
    expect(isPair).toBe(false)
    expect(isIso).toBe(true)
  })

  it('大小写不敏感: currentSkillKey=F → is_home_row 生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'is_home_row' },
      { currentSkillKey: 'F' }
    )).toBe(true)
  })

  it('ambidextrous 完整管道: leftHandTriggered + rightHandTriggered → bonusMult +0.30', () => {
    addRelic('ambidextrous')
    const registry = new ModifierRegistry()
    // 模拟词完成时有基础分
    registry.register({
      id: 'skill:test:score', source: 'skill:test', sourceType: 'skill',
      layer: 'base', trigger: 'on_word_complete', phase: 'calculate',
      effect: { type: 'score', value: 50, stacking: 'additive' }, priority: 100,
    })
    const relicMods = RELIC_MODIFIER_DEFS.ambidextrous('ambidextrous')
    registry.registerMany(relicMods)
    // 模拟 battle.ts 传入的上下文
    const result = EffectPipeline.resolve(registry, 'on_word_complete', {
      combo: 5,
      multiplier: 2.0,
      totalSkillCount: 4,
      wordPerfect: true,
      wordResourceTypes: 2,
      leftHandTriggered: true,
      rightHandTriggered: true,
    })
    expect(result.effects.multiply).toBe(0.30)
    expect(result.effects.score).toBe(50)
  })

  it('is_isolated 对大写 binding 键也正确判断', () => {
    // 验证 isIsolatedSkill 规范化了 binding keys
    state.player.bindings = new Map([['F', 'skill_a'], ['G', 'skill_b']])
    expect(ConditionEvaluator.evaluate(
      { type: 'is_isolated' },
      { currentSkillKey: 'f' }
    )).toBe(false) // f 和 g 相邻，有大写 G 绑定也能检测到
  })
})
