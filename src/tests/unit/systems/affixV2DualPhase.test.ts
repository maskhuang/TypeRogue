// ============================================
// 打字肉鸽 - affixV2 双阶段触发（persistScope）单元测试
// ============================================
// 覆盖 resolver 层的 persistScope='run'（战斗外/建造期触发）语义：
//   - consume_skill 'run' 只吞产持久资源(gold)的技能，无 gold 候选 → 静默 no-op
//   - reclaim_consumed 'run' 仍产出（持久资源由建造集成层落地）
//   - 纯战斗运行时态 effect（add/multiply/apply_aura/convert_resource…）'run' 时直接静默 inert
//   - 'fight'（缺省）行为不变（回归保护）

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { resolveEffect, type ResolveContext } from '../../../src/systems/affixV2Effect'
import { resetAllAffixV2State, peekInstanceState } from '../../../src/systems/affixV2State'
import { clearAllEquipped } from '../../../src/systems/affixV2Equipped'
import { runBuildResourceConsumed, runBuildSkillSold, wireV2BuildIntegration } from '../../../src/systems/affixV2BuildIntegration'
import { wireV2BattleIntegration, defaultResourceLv1Base } from '../../../src/systems/affixV2BattleIntegration'
import { registerDynamicAffixV2, unregisterDynamicAffixV2 } from '../../../src/data/affixV2'
import { eventBus } from '../../../src/core/events/EventBus'
import { state as gameState } from '../../../src/core/state'
import type { AffixSkillInstance } from '../../../src/data/affixes'

const NOW = 1000
const lv1 = (r: string) => ({ score: 11, gold: 3, time: 0.2, shield: 5 } as Record<string, number>)[r] ?? 1

function mkSkill(id: string, resource: string, v2Ids: string[] = []): AffixSkillInstance {
  return { id, name: id, resource, level: 1, rarity: 1, v2Ids } as unknown as AffixSkillInstance
}

function mkCtx(over: Partial<ResolveContext> = {}): ResolveContext {
  return {
    instanceId: 'inst_host',
    skillId: 'host',
    key: 'H',
    skillResource: 'score',
    skillResourceLv1Base: lv1('score'),
    resourceLv1Base: lv1,
    nowMs: NOW,
    isCrit: false,
    currentWordLength: 3,
    hostSkillLevel: 1,
    getPlayerResource: () => 0,
    ...over,
  }
}

beforeEach(() => {
  clearAllEquipped()
  resetAllAffixV2State()
  gameState.affixSkills.clear()
})

// ============================================
// 1. consume_skill · persistScope='run' 只吞 gold 技能
// ============================================

describe('consume_skill · persistScope=run（战斗外永久移除）', () => {
  beforeEach(() => {
    gameState.affixSkills.set('vic_score', mkSkill('vic_score', 'score'))
    gameState.affixSkills.set('vic_gold', mkSkill('vic_gold', 'gold'))
  })

  it("'run' 多候选 → 只锁定产 gold 的技能（非持久资源产出会蒸发=无意义）", () => {
    const ctx = mkCtx({ persistScope: 'run', resolveSelector: () => ['vic_score', 'vic_gold'] })
    const r = resolveEffect({ kind: 'consume_skill', selector: { type: 'same_word' }, ratio: 10 }, ctx)
    expect(r.skillsRemoved.map(x => x.targetSkillId)).toEqual(['vic_gold'])
  })

  it("'run' 无 gold 候选 → 整条静默 no-op（不移除）", () => {
    gameState.affixSkills.delete('vic_gold')
    const ctx = mkCtx({ persistScope: 'run', resolveSelector: () => ['vic_score'] })
    const r = resolveEffect({ kind: 'consume_skill', selector: { type: 'same_word' }, ratio: 10 }, ctx)
    expect(r.skillsRemoved.length).toBe(0)
  })

  it("'fight'（缺省）不受 gold 约束 → 可吞任意候选（回归）", () => {
    const ctx = mkCtx({ resolveSelector: () => ['vic_score'] })
    const r = resolveEffect({ kind: 'consume_skill', selector: { type: 'same_word' }, ratio: 10 }, ctx)
    expect(r.skillsRemoved.map(x => x.targetSkillId)).toEqual(['vic_score'])
  })
})

// ============================================
// 2. reclaim_consumed · 'run' 仍产出（购物返现的底层）
// ============================================

describe('reclaim_consumed · persistScope=run', () => {
  it("'run' 回收被消耗的 gold（fraction × consumedAmount）", () => {
    const ctx = mkCtx({ persistScope: 'run', consumedResource: 'gold', consumedAmount: 100 })
    const r = resolveEffect({ kind: 'reclaim_consumed', fraction: 0.3 }, ctx)
    expect(r.resourceProduced).toEqual([{ resource: 'gold', amount: 30 }])
  })
})

// ============================================
// 3. 纯战斗运行时态 effect · 'run' 直接静默 inert
// ============================================

describe('RUN_SILENT_KINDS · persistScope=run 静默', () => {
  it("add 'run' → 不累加（instance cum 保持空）", () => {
    const ctx = mkCtx({ persistScope: 'run' })
    resolveEffect({ kind: 'add', ratio: 1 }, ctx)
    expect(peekInstanceState('inst_host')?.cumulativeBaseAdd ?? 0).toBe(0)
  })

  it("add 'fight'（缺省）→ 正常累加（回归）", () => {
    const ctx = mkCtx()
    resolveEffect({ kind: 'add', ratio: 1 }, ctx)
    expect(peekInstanceState('inst_host')?.cumulativeBaseAdd).toBeCloseTo(lv1('score'), 5)
  })

  it("apply_aura 'run' → 不注册 aura", () => {
    const ctx = mkCtx({ persistScope: 'run' })
    const r = resolveEffect(
      { kind: 'apply_aura', selector: { type: 'self' }, modifier: { type: 'output_bonus_pct', amount: 0.5 } },
      ctx,
    )
    expect(r.aurasApplied.length).toBe(0)
  })

  it("convert_resource 'run' → 不消耗不产出", () => {
    const ctx = mkCtx({ persistScope: 'run', getPlayerResource: () => 999 })
    const r = resolveEffect({ kind: 'convert_resource', from: 'score', to: 'gold', ratio: 1 }, ctx)
    expect(r.resourceProduced.length).toBe(0)
    expect(r.resourcesConsumed.length).toBe(0)
  })
})

// ============================================
// 4. 端到端 · 建造期买东西(消耗 gold) → on_resource_consumed 派发
//    覆盖 coprophagy 返现 / supplant 永久吞 gold 技能 / on_removed 死亡回响链
// ============================================

describe('建造期 on_resource_consumed 端到端（runBuildResourceConsumed）', () => {
  const goldBase = defaultResourceLv1Base('gold', 1)

  beforeEach(() => {
    wireV2BattleIntegration()   // 注入 selector resolver + resync（idempotent）
    clearAllEquipped()
    resetAllAffixV2State()
    gameState.affixSkills.clear()
    gameState.player.bindings = new Map()
    gameState.gold = 1000
    ;(gameState.resources as unknown as Record<string, number>).gold = 1000
    ;(gameState.player as unknown as Record<string, number>).gold = 1000
  })

  afterEach(() => {
    unregisterDynamicAffixV2('dp_cop')
    unregisterDynamicAffixV2('dp_supp')
    unregisterDynamicAffixV2('dp_rattle')
    unregisterDynamicAffixV2('dp_observer')
    unregisterDynamicAffixV2('dp_sold_drip')
    unregisterDynamicAffixV2('dp_sold_supp')
  })

  it('coprophagy：买 100 gold → 永久返现 fraction×100', () => {
    registerDynamicAffixV2({
      id: 'dp_cop', name_zh: '食粪', name_en: 'coprophagy', section: 'abnormal', tags: ['abnormal'], phase: 'P1',
      trigger: { type: 'on_resource_consumed' }, effect: { kind: 'reclaim_consumed', fraction: 0.3 },
    })
    gameState.affixSkills.set('cop_host', mkSkill('cop_host', 'gold', ['dp_cop']))
    gameState.player.bindings = new Map([['A', 'cop_host']])

    const changed = runBuildResourceConsumed(100)
    expect(changed).toBe(true)
    expect(gameState.gold).toBe(1030)
  })

  it('supplant：永久吞 gold 技能 + payout + on_removed 死亡回响（persistScope=run）', () => {
    // supplant：on_resource_consumed + consume_skill（无 filter，all_skills），'run' 自动收紧到 gold 技能
    registerDynamicAffixV2({
      id: 'dp_supp', name_zh: '取代', name_en: 'supplant', section: 'agonistic', tags: ['agonistic'], phase: 'P1',
      trigger: { type: 'on_resource_consumed' }, effect: { kind: 'consume_skill', selector: { type: 'all_skills' }, ratio: 10 },
    })
    // 被吞的 gold 技能带 on_removed 死亡回响：被移除时产 gold 2×base
    registerDynamicAffixV2({
      id: 'dp_rattle', name_zh: '回响', name_en: 'rattle', section: 'agonistic', tags: ['agonistic'], phase: 'P1',
      trigger: { type: 'on_removed' }, effect: { kind: 'gain_resource', resource: 'gold', ratio: 2 },
    })
    gameState.affixSkills.set('supp_host', mkSkill('supp_host', 'score', ['dp_supp']))
    gameState.affixSkills.set('gold_victim', mkSkill('gold_victim', 'gold', ['dp_rattle']))
    gameState.affixSkills.set('score_victim', mkSkill('score_victim', 'score', []))
    gameState.player.bindings = new Map([['B', 'supp_host'], ['C', 'gold_victim'], ['D', 'score_victim']])

    const changed = runBuildResourceConsumed(50)

    expect(changed).toBe(true)
    expect(gameState.affixSkills.has('gold_victim')).toBe(false)   // 永久移除
    expect(gameState.affixSkills.has('score_victim')).toBe(true)   // 非 gold → 不吞（无意义静默）
    expect(gameState.player.bindings.has('C')).toBe(false)         // 键位解绑
    // payout 10×base + 死亡回响 2×base = 12×base
    expect(gameState.gold).toBeCloseTo(1000 + 12 * goldBase, 4)
  })

  it('on_skill_consumed 全局观察者：别的技能在吞噬发生时各响一次（persistScope=run）', () => {
    registerDynamicAffixV2({
      id: 'dp_supp', name_zh: '取代', name_en: 'supplant', section: 'agonistic', tags: ['agonistic'], phase: 'P1',
      trigger: { type: 'on_resource_consumed' }, effect: { kind: 'consume_skill', selector: { type: 'all_skills' }, ratio: 10 },
    })
    // 旁观者：挂在另一个技能上，任一技能被吞 → 产 gold 3×base
    registerDynamicAffixV2({
      id: 'dp_observer', name_zh: '旁观', name_en: 'observer', section: 'agonistic', tags: ['agonistic'], phase: 'P1',
      trigger: { type: 'on_skill_consumed' }, effect: { kind: 'gain_resource', resource: 'gold', ratio: 3 },
    })
    gameState.affixSkills.set('supp_host', mkSkill('supp_host', 'score', ['dp_supp']))
    gameState.affixSkills.set('gold_victim', mkSkill('gold_victim', 'gold', []))   // 无 on_removed → 隔离观察者
    gameState.affixSkills.set('observer_skill', mkSkill('observer_skill', 'score', ['dp_observer']))
    gameState.player.bindings = new Map([['B', 'supp_host'], ['C', 'gold_victim'], ['E', 'observer_skill']])

    const changed = runBuildResourceConsumed(50)

    expect(changed).toBe(true)
    expect(gameState.affixSkills.has('gold_victim')).toBe(false)      // 被吞
    expect(gameState.affixSkills.has('observer_skill')).toBe(true)    // 旁观者自身不被吞（score）
    // payout 10×base（supplant）+ 观察者 3×base（dp_observer 产 gold）= 13×base
    expect(gameState.gold).toBeCloseTo(1000 + 13 * goldBase, 4)
  })

  it('on_sold（一次性）：卖技能 → 被售 skill 上的 on_sold 词条产 gold（persistScope=run）', () => {
    // 一次性大额（T 参考 nut_crack ≈ 18）
    registerDynamicAffixV2({
      id: 'dp_sold_drip', name_zh: '清仓', name_en: 'sold-drip', section: 'maintenance', tags: ['maintenance'], phase: 'P1',
      trigger: { type: 'on_sold' }, effect: { kind: 'gain_resource', resource: 'gold', ratio: 18 },
    })
    gameState.affixSkills.set('wares', mkSkill('wares', 'gold', ['dp_sold_drip']))
    gameState.player.bindings = new Map([['A', 'wares']])

    const changed = runBuildSkillSold('wares')
    expect(changed).toBe(true)
    expect(gameState.gold).toBeCloseTo(1000 + 18 * goldBase, 4)
  })

  it('on_sold + supplant：卖技能 → 吞一个 gold 邻居换 payout（不吞自己）', () => {
    registerDynamicAffixV2({
      id: 'dp_sold_supp', name_zh: '清仓取代', name_en: 'sold-supplant', section: 'agonistic', tags: ['agonistic'], phase: 'P1',
      trigger: { type: 'on_sold' }, effect: { kind: 'consume_skill', selector: { type: 'all_skills' }, ratio: 10 },
    })
    gameState.affixSkills.set('seller', mkSkill('seller', 'gold', ['dp_sold_supp']))
    gameState.affixSkills.set('gold_neighbor', mkSkill('gold_neighbor', 'gold', []))
    gameState.player.bindings = new Map([['A', 'seller'], ['B', 'gold_neighbor']])

    const changed = runBuildSkillSold('seller')
    expect(changed).toBe(true)
    expect(gameState.affixSkills.has('gold_neighbor')).toBe(false)   // 吞掉邻居
    expect(gameState.affixSkills.has('seller')).toBe(true)           // 不吞自己（consume_skill 默认排除 self）
    expect(gameState.gold).toBeCloseTo(1000 + 10 * goldBase, 4)
  })

  it('事件链：emit skill:sold → 建造集成派发 on_sold', () => {
    wireV2BuildIntegration()   // 订阅 skill:sold（idempotent）
    registerDynamicAffixV2({
      id: 'dp_sold_drip', name_zh: '清仓', name_en: 'sold-drip', section: 'maintenance', tags: ['maintenance'], phase: 'P1',
      trigger: { type: 'on_sold' }, effect: { kind: 'gain_resource', resource: 'gold', ratio: 5 },
    })
    gameState.affixSkills.set('wares', mkSkill('wares', 'gold', ['dp_sold_drip']))
    gameState.player.bindings = new Map([['A', 'wares']])

    eventBus.emit('skill:sold', { skillId: 'wares' })
    expect(gameState.gold).toBeCloseTo(1000 + 5 * goldBase, 4)
  })
})
