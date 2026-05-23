// ============================================
// 打字肉鸽 - affixV2 取代(supplant/devour) + on_removed 死亡回响 单元测试
// ============================================
// 覆盖：consume_skill 结算 / same_word 选择器 / 本场移除(consumed) 生命周期 /
//       on_removed 死亡回响派发 / supplant recipe 生成 / 端到端取代流程。

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { resolveEffect, type ResolveContext } from '../../../src/systems/affixV2Effect'
import {
  resetAllAffixV2State,
  markSkillConsumed,
  isSkillConsumed,
  clearConsumedSkills,
  listConsumedSkills,
} from '../../../src/systems/affixV2State'
import {
  equipAffixV2,
  clearAllEquipped,
  hookOnRemoved,
  hookOnSkillFire,
} from '../../../src/systems/affixV2Equipped'
import {
  processV2Results,
  wireV2BattleIntegration,
  defaultResourceLv1Base,
  defaultGetPlayerResource,
} from '../../../src/systems/affixV2BattleIntegration'
import { registerDynamicAffixV2, unregisterDynamicAffixV2 } from '../../../src/data/affixV2'
import { RECIPE_SUPPLANT, ALL_RECIPES, rollAffixV2Spec } from '../../../src/data/affixV2Generator'
import { state as gameState } from '../../../src/core/state'
import type { AffixSkillInstance } from '../../../src/data/affixes'
import type { FireEvent } from '../../../src/systems/fireFilter'

const NOW = 1000
const lv1 = (r: string) => ({ score: 11, gold: 3, time: 0.2, shield: 5 } as Record<string, number>)[r] ?? 1

function mkSkill(id: string, resource: string, opts: { level?: number; rarity?: number; v2Ids?: string[]; name?: string } = {}): AffixSkillInstance {
  return {
    id,
    name: opts.name ?? id,
    resource,
    level: opts.level ?? 1,
    rarity: opts.rarity ?? 1,
    v2Ids: opts.v2Ids ?? [],
  } as unknown as AffixSkillInstance
}

beforeEach(() => {
  clearAllEquipped()
  resetAllAffixV2State()
  gameState.affixSkills.clear()
})

// ============================================
// 1. consume_skill 结算（resolver 层 · mock resolveSelector）
// ============================================

describe('resolveEffect · consume_skill', () => {
  const mkCtx = (resolveSelector: ResolveContext['resolveSelector']): ResolveContext => ({
    instanceId: 'inst_host',
    skillId: 'host',
    key: 'H',
    skillResource: 'gold',
    skillResourceLv1Base: lv1('gold'),
    resourceLv1Base: lv1,
    nowMs: NOW,
    isCrit: false,
    currentWordLength: 3,
    hostSkillLevel: 1,
    getPlayerResource: () => 0,
    resolveSelector,
  })

  it('filter 命中 → 申请移除匹配的那个，携带 ratio', () => {
    gameState.affixSkills.set('vic_score', mkSkill('vic_score', 'score'))
    gameState.affixSkills.set('vic_gold', mkSkill('vic_gold', 'gold'))
    const ctx = mkCtx(() => ['vic_score', 'vic_gold'])
    const r = resolveEffect(
      { kind: 'consume_skill', selector: { type: 'same_word' }, ratio: 10, filter: { resource: 'score' } },
      ctx,
    )
    expect(r.skillsRemoved.length).toBe(1)
    expect(r.skillsRemoved[0].targetSkillId).toBe('vic_score')
    expect(r.skillsRemoved[0].ratio).toBe(10)
    // consume_skill 自身不直接产出资源（产出由集成层据被移除技能算）
    expect(r.resourceProduced.length).toBe(0)
  })

  it('filter 不命中 → 不移除', () => {
    gameState.affixSkills.set('vic_gold', mkSkill('vic_gold', 'gold'))
    const ctx = mkCtx(() => ['vic_gold'])
    const r = resolveEffect(
      { kind: 'consume_skill', selector: { type: 'same_word' }, ratio: 10, filter: { resource: 'score' } },
      ctx,
    )
    expect(r.skillsRemoved.length).toBe(0)
  })

  it('selector 空集 → no-op', () => {
    const ctx = mkCtx(() => [])
    const r = resolveEffect(
      { kind: 'consume_skill', selector: { type: 'same_word' }, ratio: 10 },
      ctx,
    )
    expect(r.skillsRemoved.length).toBe(0)
  })

  it('rarity / hasTag filter 维度', () => {
    gameState.affixSkills.set('r0', mkSkill('r0', 'score', { rarity: 0, v2Ids: [] }))
    gameState.affixSkills.set('r2', mkSkill('r2', 'score', { rarity: 2, v2Ids: [] }))
    const ctx = mkCtx(() => ['r0', 'r2'])
    const r = resolveEffect(
      { kind: 'consume_skill', selector: { type: 'same_word' }, ratio: 5, filter: { rarity: 2 } },
      ctx,
    )
    expect(r.skillsRemoved.map(x => x.targetSkillId)).toEqual(['r2'])
  })

  it('无 filter → 任一候选都合格', () => {
    gameState.affixSkills.set('a', mkSkill('a', 'gold'))
    const ctx = mkCtx(() => ['a'])
    const r = resolveEffect(
      { kind: 'consume_skill', selector: { type: 'same_word' }, ratio: 3 },
      ctx,
    )
    expect(r.skillsRemoved.length).toBe(1)
    expect(r.skillsRemoved[0].targetSkillId).toBe('a')
  })
})

// ============================================
// 2. 本场移除(consumed) 生命周期
// ============================================

describe('consumedSkills · 本场移除生命周期', () => {
  it('mark / is / clear', () => {
    expect(isSkillConsumed('x')).toBe(false)
    markSkillConsumed('x')
    expect(isSkillConsumed('x')).toBe(true)
    expect(listConsumedSkills()).toContain('x')
    clearConsumedSkills()
    expect(isSkillConsumed('x')).toBe(false)
  })

  it('resetAllAffixV2State 清空（= 战斗开始/结束都恢复 → for-the-fight）', () => {
    markSkillConsumed('x')
    expect(isSkillConsumed('x')).toBe(true)
    resetAllAffixV2State()
    expect(isSkillConsumed('x')).toBe(false)
  })
})

// ============================================
// 3. on_removed 死亡回响 hook
// ============================================

describe('hookOnRemoved · 死亡回响', () => {
  afterEach(() => {
    unregisterDynamicAffixV2('test_rattle')
    unregisterDynamicAffixV2('test_passive')
  })

  it('被移除 skill 上的 on_removed 词条触发，按其资源缩放', () => {
    registerDynamicAffixV2({
      id: 'test_rattle', name_zh: '回响', name_en: 'rattle',
      section: 'agonistic', tags: ['agonistic'], phase: 'P1',
      trigger: { type: 'on_removed' },
      effect: { kind: 'gain_resource', resource: 'score', ratio: 2 },
    })
    gameState.affixSkills.set('victim', mkSkill('victim', 'score', { v2Ids: ['test_rattle'] }))
    equipAffixV2('victim', 'V', 'test_rattle')

    const results = hookOnRemoved('victim', defaultResourceLv1Base, defaultGetPlayerResource, NOW)
    expect(results.length).toBe(1)
    expect(results[0].result.resourceProduced[0].resource).toBe('score')
    expect(results[0].result.resourceProduced[0].amount).toBeCloseTo(2 * defaultResourceLv1Base('score', 1), 5)
  })

  it('非 on_removed 词条不被 hookOnRemoved 触发', () => {
    registerDynamicAffixV2({
      id: 'test_passive', name_zh: '常驻', name_en: 'passive',
      section: 'agonistic', tags: ['agonistic'], phase: 'P1',
      trigger: { type: 'passive' },
      effect: { kind: 'gain_resource', resource: 'score', ratio: 2 },
    })
    gameState.affixSkills.set('victim', mkSkill('victim', 'score', { v2Ids: ['test_passive'] }))
    equipAffixV2('victim', 'V', 'test_passive')
    const results = hookOnRemoved('victim', defaultResourceLv1Base, defaultGetPlayerResource, NOW)
    expect(results.length).toBe(0)
  })
})

// ============================================
// 4. supplant recipe 生成
// ============================================

describe('RECIPE_SUPPLANT · agonistic devour 配方', () => {
  it('登记在 ALL_RECIPES，section=agonistic', () => {
    expect(ALL_RECIPES.some(r => r.id === 'supplant' && r.section === 'agonistic')).toBe(true)
    expect(RECIPE_SUPPLANT.kind).toBe('devour')
  })

  it('rollAffixV2Spec → consume_skill + 常规 scope 池(排除 self) + 单维度 filter + ratio', () => {
    const seenSelectors = new Set<string>()
    for (let i = 0; i < 60; i++) {
      const { trigger, effect } = rollAffixV2Spec(RECIPE_SUPPLANT)
      expect(effect.kind).toBe('consume_skill')
      if (effect.kind !== 'consume_skill') continue
      // selector 来自常规 scope 池，但绝不为 self（自取代 degenerate）
      expect(effect.selector.type).not.toBe('self')
      seenSelectors.add(effect.selector.type)
      expect(effect.ratio).toBe(RECIPE_SUPPLANT.ratio)
      expect(effect.filter).toBeDefined()
      // 恰好锁 1 个维度（resource / rarity / hasTag 之一）
      const f = effect.filter!
      const dims = ['resource', 'rarity', 'hasTag'].filter(k => (f as Record<string, unknown>)[k] !== undefined)
      expect(dims.length).toBe(1)
      // trigger 由生成器随机抽（非固定）· 类型合法即可
      expect(typeof trigger.type).toBe('string')
    }
    // 常规池应抽出不止一种 selector（验证不再固定单一 scope）
    expect(seenSelectors.size).toBeGreaterThan(1)
  })
})

// ============================================
// 5. 端到端：同词内取代 + 产出 + 死亡回响 + 不可二次取代
// ============================================

describe('端到端 · supplant 取代同词技能', () => {
  beforeEach(() => {
    wireV2BattleIntegration()   // 注入 resolveSelectorToSkillIds 作为 selector resolver（idempotent）
    registerDynamicAffixV2({
      id: 'e2e_supplant', name_zh: '取代', name_en: 'supplant',
      section: 'agonistic', tags: ['agonistic'], phase: 'P1',
      trigger: { type: 'on_self_fire' },
      effect: { kind: 'consume_skill', selector: { type: 'same_word' }, ratio: 10, filter: { resource: 'score' } },
    })
    registerDynamicAffixV2({
      id: 'e2e_rattle', name_zh: '回响', name_en: 'rattle',
      section: 'agonistic', tags: ['agonistic'], phase: 'P1',
      trigger: { type: 'on_removed' },
      effect: { kind: 'gain_resource', resource: 'score', ratio: 2 },
    })
    gameState.affixSkills.set('host', mkSkill('host', 'gold', { v2Ids: ['e2e_supplant'] }))
    gameState.affixSkills.set('victim', mkSkill('victim', 'score', { v2Ids: ['e2e_rattle'], name: '受害者' }))
    gameState.player.bindings = new Map([['H', 'host'], ['V', 'victim']])
    gameState.player.word = 'hv'
    gameState.score = 0
    ;(gameState.resources as unknown as Record<string, number>).score = 0
    equipAffixV2('host', 'H', 'e2e_supplant')
    equipAffixV2('victim', 'V', 'e2e_rattle')
  })

  afterEach(() => {
    unregisterDynamicAffixV2('e2e_supplant')
    unregisterDynamicAffixV2('e2e_rattle')
  })

  function fireHost(): void {
    const ev: FireEvent = {
      sourceAffixId: 'e2e_supplant', sourceSkillId: 'host', sourceKey: 'H',
      sourceResource: 'gold', isCrit: false, stackState: 'none', amount: 0, timestamp: NOW,
    }
    const results = hookOnSkillFire('host', ev, defaultResourceLv1Base, defaultGetPlayerResource, NOW)
    processV2Results(results)
  }

  it('击发宿主 → 同词内 victim 本场移除 + 注入 10×base 产出 + on_removed 回响 2×base', () => {
    const base = defaultResourceLv1Base('score', 1)
    fireHost()
    expect(isSkillConsumed('victim')).toBe(true)
    // payout 110(=10×base) + 死亡回响 22(=2×base) = 12×base
    expect(gameState.score).toBeCloseTo(12 * base, 4)
  })

  it('已被取代的技能不可二次取代（同词排除 consumed）', () => {
    fireHost()
    const after1 = gameState.score
    fireHost()
    expect(gameState.score).toBeCloseTo(after1, 4)   // 第二次无新移除/产出
  })

  it('本场移除是 for-the-fight：reset 后 victim 恢复，可再次取代', () => {
    fireHost()
    expect(isSkillConsumed('victim')).toBe(true)
    resetAllAffixV2State()   // 模拟下场 battle:start
    expect(isSkillConsumed('victim')).toBe(false)
  })
})
