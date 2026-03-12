// ============================================
// 打字肉鸽 - 词条制遗物适配测试
// ============================================
// Story 35.12: 遗物系统适配 — 7 个改写遗物 + 4 个新遗物

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RELICS, RELIC_MODIFIER_DEFS, RELIC_FLAGS } from '../../../../src/data/relics'
import { ConditionEvaluator } from '../../../../src/systems/modifiers/ConditionEvaluator'
import { ModifierRegistry } from '../../../../src/systems/modifiers/ModifierRegistry'
import { EffectPipeline } from '../../../../src/systems/modifiers/EffectPipeline'
import { AffixType, AFFIX_CATEGORY_MAP } from '../../../../src/data/affixes'

// === Mock state ===
vi.mock('../../../../src/core/state', () => {
  const relics = new Set<string>()
  return {
    state: {
      player: {
        relics,
        bindings: new Map(),
        skills: new Map(),
        relicStates: {} as Record<string, number>,
      },
      combo: 0,
      multiplier: 1,
      overkill: 0,
      affixSkills: new Map(),
      affixSkillStates: new Map(),
    },
  }
})

// Mock keyboardTopology (needed by ConditionEvaluator for is_in_pair/is_isolated)
vi.mock('../../../../src/data/keyboardTopology', () => ({
  isHomeRow: () => false,
  isIsolatedSkill: () => false,
  isInPair: () => false,
  hasRelation: () => false,
  getKeysWithRelation: () => [],
  PositionRelation: {},
}))

import { state } from '../../../../src/core/state'

function clearRelics(): void {
  state.player.relics.clear()
  state.player.relicStates = {}
}

function addRelic(id: string): void {
  state.player.relics.add(id)
}

// ========================================
// 7.1: forge_heart 新条件
// ========================================
describe('forge_heart（熔炉之心）适配', () => {
  beforeEach(() => clearRelics())

  it('description 已更新为转化词条', () => {
    expect(RELICS.forge_heart.description).toContain('转化词条')
  })

  it('工厂: 条件为 skill_has_affix convert', () => {
    const mods = RELIC_MODIFIER_DEFS.forge_heart('forge_heart')
    expect(mods).toHaveLength(1)
    expect(mods[0].condition).toEqual({ type: 'skill_has_affix', affixType: 'convert' })
    expect(mods[0].effect!.value).toBe(1.15)
  })

  it('条件: 拥有 convert 词条 → 生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'skill_has_affix', affixType: 'convert' },
      { currentSkillAffixes: ['convert', 'crit'] },
    )).toBe(true)
  })

  it('条件: 无 convert 词条 → 不生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'skill_has_affix', affixType: 'convert' },
      { currentSkillAffixes: ['multiply', 'crit'] },
    )).toBe(false)
  })

  it('条件: 无 affix 信息（旧系统技能） → 不生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'skill_has_affix', affixType: 'convert' },
      {},
    )).toBe(false)
  })

  it('管道集成: 有 convert 词条 → score ×1.15', () => {
    addRelic('forge_heart')
    const registry = new ModifierRegistry()
    registry.register({
      id: 'base:score', source: 'base', sourceType: 'skill',
      layer: 'base', trigger: 'on_skill_trigger', phase: 'calculate',
      effect: { type: 'score', value: 100, stacking: 'additive' }, priority: 100,
    })
    registry.registerMany(RELIC_MODIFIER_DEFS.forge_heart('forge_heart'))
    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', {
      currentSkillAffixes: ['convert', 'pulse'],
    })
    expect(result.effects.score).toBeCloseTo(115, 1)
  })
})

// ========================================
// 7.2: storm_drum 新条件
// ========================================
describe('storm_drum（风暴战鼓）适配', () => {
  beforeEach(() => clearRelics())

  it('description 已更新为稀有(黄)以上', () => {
    expect(RELICS.storm_drum.description).toContain('稀有')
  })

  it('工厂: 条件为 skill_rarity_gte 2', () => {
    const mods = RELIC_MODIFIER_DEFS.storm_drum('storm_drum')
    expect(mods).toHaveLength(1)
    expect(mods[0].condition).toEqual({ type: 'skill_rarity_gte', value: 2 })
    expect(mods[0].behavior).toEqual({ type: 'retrigger' })
  })

  it('条件: rarity=2 → 生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'skill_rarity_gte', value: 2 },
      { currentSkillRarity: 2 },
    )).toBe(true)
  })

  it('条件: rarity=3(传说) → 生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'skill_rarity_gte', value: 2 },
      { currentSkillRarity: 3 },
    )).toBe(true)
  })

  it('条件: rarity=1(蓝装) → 不生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'skill_rarity_gte', value: 2 },
      { currentSkillRarity: 1 },
    )).toBe(false)
  })

  it('条件: 无 rarity（旧系统技能） → 不生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'skill_rarity_gte', value: 2 },
      {},
    )).toBe(false)
  })
})

// ========================================
// chain_surge 适配
// ========================================
describe('chain_surge（链路增压）适配', () => {
  it('工厂: 条件为 is_affix_chain_trigger', () => {
    const mods = RELIC_MODIFIER_DEFS.chain_surge('chain_surge')
    expect(mods).toHaveLength(1)
    expect(mods[0].condition).toEqual({ type: 'is_affix_chain_trigger' })
    expect(mods[0].effect!.value).toBe(1.25)
  })

  it('条件: isAffixChainTrigger=true → 生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'is_affix_chain_trigger' },
      { isAffixChainTrigger: true },
    )).toBe(true)
  })

  it('条件: isAffixChainTrigger=false → 不生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'is_affix_chain_trigger' },
      { isAffixChainTrigger: false },
    )).toBe(false)
  })
})

// ========================================
// stack_resonance 适配
// ========================================
describe('stack_resonance（层叠共鸣）适配', () => {
  it('工厂: 条件为 affix_amplify_stacks_gte 15', () => {
    const mods = RELIC_MODIFIER_DEFS.stack_resonance('stack_resonance')
    expect(mods).toHaveLength(1)
    expect(mods[0].condition).toEqual({ type: 'affix_amplify_stacks_gte', value: 15 })
  })

  it('条件: amplifyStacks=15 → 生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'affix_amplify_stacks_gte', value: 15 },
      { currentSkillAmplifyStacks: 15 },
    )).toBe(true)
  })

  it('条件: amplifyStacks=14 → 不生效', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'affix_amplify_stacks_gte', value: 15 },
      { currentSkillAmplifyStacks: 14 },
    )).toBe(false)
  })
})

// ========================================
// overcharge 适配
// ========================================
describe('overcharge（过载核心）适配', () => {
  it('工厂: 2 个 Modifier，条件均为 skill_rarity_gte 1', () => {
    const mods = RELIC_MODIFIER_DEFS.overcharge('overcharge')
    expect(mods).toHaveLength(2)
    expect(mods[0].condition).toEqual({ type: 'skill_rarity_gte', value: 1 })
    expect(mods[1].condition).toEqual({ type: 'skill_rarity_gte', value: 1 })
  })

  it('description 已更新为稀有(蓝)以上', () => {
    expect(RELICS.overcharge.description).toContain('稀有')
  })
})

// ========================================
// 7.3: pure_heart 白装限制
// ========================================
describe('pure_heart（纯粹之心）适配', () => {
  beforeEach(() => clearRelics())

  it('description 已更新为白装', () => {
    expect(RELICS.pure_heart.description).toContain('白装')
  })

  it('工厂: 条件为 skill_rarity_gte 0', () => {
    const mods = RELIC_MODIFIER_DEFS.pure_heart('pure_heart')
    expect(mods).toHaveLength(1)
    expect(mods[0].condition).toEqual({ type: 'skill_rarity_gte', value: 0 })
    expect(mods[0].effect!.value).toBe(3.0)
  })

  it('RELIC_FLAGS 包含 white_only → pure_heart', () => {
    expect(RELIC_FLAGS['white_only']).toContain('pure_heart')
  })

  it('管道集成: rarity=0 → score ×3', () => {
    addRelic('pure_heart')
    const registry = new ModifierRegistry()
    registry.register({
      id: 'base:score', source: 'base', sourceType: 'skill',
      layer: 'base', trigger: 'on_skill_trigger', phase: 'calculate',
      effect: { type: 'score', value: 100, stacking: 'additive' }, priority: 100,
    })
    registry.registerMany(RELIC_MODIFIER_DEFS.pure_heart('pure_heart'))
    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', {
      currentSkillRarity: 0,
    })
    expect(result.effects.score).toBe(300)
  })
})

// ========================================
// 7.4: chain_ban Phase 5-6 跳过
// ========================================
describe('chain_ban（链式禁令）适配', () => {
  it('description 包含触发链词条', () => {
    expect(RELICS.chain_ban.description).toContain('触发链词条')
  })

  it('RELIC_FLAGS 包含 chain_affix_lock → chain_ban', () => {
    expect(RELIC_FLAGS['chain_affix_lock']).toContain('chain_ban')
  })

  it('工厂: +30% 全局加成不变', () => {
    const mods = RELIC_MODIFIER_DEFS.chain_ban('chain_ban')
    expect(mods).toHaveLength(1)
    expect(mods[0].effect!.value).toBe(1.30)
    expect(mods[0].layer).toBe('global')
  })
})

// ========================================
// 7.5: affix_spectrum 统计
// ========================================
describe('affix_spectrum（词条光谱）', () => {
  beforeEach(() => clearRelics())

  it('RELICS 数据完整', () => {
    const r = RELICS.affix_spectrum
    expect(r).toBeDefined()
    expect(r.id).toBe('affix_spectrum')
    expect(r.rarity).toBe('rare')
    expect(r.basePrice).toBe(55)
    expect(r.icon).toBeDefined()
  })

  it('工厂: 3 种词条类型 → +9%', () => {
    const mods = RELIC_MODIFIER_DEFS.affix_spectrum('affix_spectrum', {
      relicStates: { _affix_type_count: 3 },
    })
    expect(mods).toHaveLength(1)
    expect(mods[0].effect!.value).toBeCloseTo(0.09)
    expect(mods[0].effect!.stacking).toBe('additive')
  })

  it('工厂: 0 种词条 → 空', () => {
    const mods = RELIC_MODIFIER_DEFS.affix_spectrum('affix_spectrum', {
      relicStates: { _affix_type_count: 0 },
    })
    expect(mods).toHaveLength(0)
  })

  it('工厂: 无 relicStates → 空', () => {
    const mods = RELIC_MODIFIER_DEFS.affix_spectrum('affix_spectrum', {})
    expect(mods).toHaveLength(0)
  })
})

// ========================================
// legendary_aura 统计
// ========================================
describe('legendary_aura（传说气场）', () => {
  it('RELICS 数据完整', () => {
    const r = RELICS.legendary_aura
    expect(r).toBeDefined()
    expect(r.id).toBe('legendary_aura')
    expect(r.rarity).toBe('rare')
  })

  it('工厂: 2 个传说技能 → +16%', () => {
    const mods = RELIC_MODIFIER_DEFS.legendary_aura('legendary_aura', {
      relicStates: { _legendary_count: 2 },
    })
    expect(mods).toHaveLength(1)
    expect(mods[0].effect!.value).toBeCloseTo(0.16)
  })
})

// ========================================
// 7.6: quest_momentum 累计
// ========================================
describe('quest_momentum（任务动力）', () => {
  it('RELICS 数据完整', () => {
    const r = RELICS.quest_momentum
    expect(r).toBeDefined()
    expect(r.id).toBe('quest_momentum')
    expect(r.rarity).toBe('rare')
  })

  it('工厂: 5 次任务完成 → +10%', () => {
    const mods = RELIC_MODIFIER_DEFS.quest_momentum('quest_momentum', {
      relicStates: { _quest_completions_total: 5 },
    })
    expect(mods).toHaveLength(1)
    expect(mods[0].effect!.value).toBeCloseTo(0.10)
  })

  it('工厂: 0 次 → 空', () => {
    const mods = RELIC_MODIFIER_DEFS.quest_momentum('quest_momentum', {
      relicStates: { _quest_completions_total: 0 },
    })
    expect(mods).toHaveLength(0)
  })
})

// ========================================
// 7.7: AFFIX_CATEGORY_MAP 覆盖检查
// ========================================
describe('AFFIX_CATEGORY_MAP 覆盖检查', () => {
  it('AFFIX_CATEGORY_MAP 覆盖所有 20 种词条类型', () => {
    const allTypes = Object.values(AffixType)
    for (const t of allTypes) {
      expect(AFFIX_CATEGORY_MAP[t]).toBeDefined()
    }
    expect(allTypes).toHaveLength(20)
  })
})

// ========================================
// 7.8: 新遗物数据完整性
// ========================================
describe('3 个新遗物数据完整性', () => {
  const newIds = ['affix_spectrum', 'legendary_aura', 'quest_momentum']

  it('3 个遗物都在 RELICS 中定义', () => {
    newIds.forEach(id => expect(RELICS[id]).toBeDefined())
  })

  it('3 个遗物都在 RELIC_MODIFIER_DEFS 中定义', () => {
    newIds.forEach(id => expect(RELIC_MODIFIER_DEFS[id]).toBeDefined())
  })

  it('每个遗物有必需字段', () => {
    newIds.forEach(id => {
      const r = RELICS[id]
      expect(r.id).toBe(id)
      expect(r.name).toBeTruthy()
      expect(r.icon).toBeTruthy()
      expect(r.description).toBeTruthy()
      expect(r.rarity).toBeTruthy()
      expect(typeof r.basePrice).toBe('number')
      expect(Array.isArray(r.effects)).toBe(true)
    })
  })

  it('图标唯一（不与已有遗物冲突）', () => {
    const allIcons = Object.values(RELICS).map(r => r.icon)
    const unique = new Set(allIcons)
    expect(unique.size).toBe(allIcons.length)
  })
})

// ========================================
// 新条件类型完整性
// ========================================
describe('新条件类型评估', () => {
  it('skill_has_affix: 包含目标类型 → true', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'skill_has_affix', affixType: 'multiply' },
      { currentSkillAffixes: ['multiply'] },
    )).toBe(true)
  })

  it('skill_rarity_gte: 边界值', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'skill_rarity_gte', value: 1 },
      { currentSkillRarity: 1 },
    )).toBe(true)
    expect(ConditionEvaluator.evaluate(
      { type: 'skill_rarity_gte', value: 1 },
      { currentSkillRarity: 0 },
    )).toBe(false)
  })

  it('affix_amplify_stacks_gte: 边界值', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'affix_amplify_stacks_gte', value: 10 },
      { currentSkillAmplifyStacks: 10 },
    )).toBe(true)
    expect(ConditionEvaluator.evaluate(
      { type: 'affix_amplify_stacks_gte', value: 10 },
      { currentSkillAmplifyStacks: 9 },
    )).toBe(false)
  })

  it('is_affix_chain_trigger: undefined → false', () => {
    expect(ConditionEvaluator.evaluate(
      { type: 'is_affix_chain_trigger' },
      {},
    )).toBe(false)
  })
})
