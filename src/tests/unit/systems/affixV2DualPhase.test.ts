// ============================================
// 打字肉鸽 - affixV2 双阶段触发（persistScope）单元测试
// ============================================
// 覆盖 resolver 层的 persistScope='run'（战斗外/建造期触发）语义：
//   - consume_skill 'run' 只吞产持久资源(gold)的技能，无 gold 候选 → 静默 no-op
//   - reclaim_consumed 'run' 仍产出（持久资源由建造集成层落地）
//   - 纯战斗运行时态 effect（add/multiply/apply_aura/convert_resource…）'run' 时直接静默 inert
//   - 'fight'（缺省）行为不变（回归保护）

import { describe, it, expect, beforeEach } from 'vitest'
import { resolveEffect, type ResolveContext } from '../../../src/systems/affixV2Effect'
import { resetAllAffixV2State, peekInstanceState } from '../../../src/systems/affixV2State'
import { clearAllEquipped } from '../../../src/systems/affixV2Equipped'
import { state as gameState } from '../../../src/core/state'
import type { AffixSkillInstance } from '../../../src/data/affixes'

const NOW = 1000
const lv1 = (r: string) => ({ score: 11, gold: 3, time: 0.2, shield: 5 } as Record<string, number>)[r] ?? 1

function mkSkill(id: string, resource: string): AffixSkillInstance {
  return { id, name: id, resource, level: 1, rarity: 1, v2Ids: [] } as unknown as AffixSkillInstance
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
