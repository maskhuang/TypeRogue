// ============================================
// 打字肉鸽 - affixV2 Effect Resolver 单元测试
// ============================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { resolveEffect, evaluateCondition, type ResolveContext } from '../../../src/systems/affixV2Effect'
import { resetAllAffixV2State, peekInstanceState, listActiveAuras, listStatuses, getInstanceState } from '../../../src/systems/affixV2State'
import { state as gameState } from '../../../src/core/state'
import { BALANCE } from '../../../src/core/constants'

const baseCtx: ResolveContext = {
  instanceId: 'inst_1',
  skillId: 'skill_1',
  key: 'K',
  skillResource: 'score',
  skillResourceLv1Base: 11,
  resourceLv1Base: (r) => ({ score: 11, time: 0.2, gold: 3, shield: 5 } as Record<string, number>)[r] ?? 1,
  nowMs: 1000,
  isCrit: false,
  currentWordLength: 5,
  getPlayerResource: () => 0,
}

beforeEach(() => {
  resetAllAffixV2State()
})

describe('resolveEffect · 基础 5 kind', () => {
  it('noop 不产出', () => {
    const r = resolveEffect({ kind: 'noop' }, baseCtx)
    expect(r.resourceProduced.length).toBe(0)
    expect(r.fireTargetsTriggered.length).toBe(0)
  })

  it('add · 关内成长 base 累积到 state', () => {
    resolveEffect({ kind: 'add', ratio: 0.5 }, baseCtx)
    const s = peekInstanceState('inst_1')!
    expect(s.cumulativeBaseAdd).toBeCloseTo(0.5 * 11, 5)  // 5.5

    resolveEffect({ kind: 'add', ratio: 0.5 }, baseCtx)
    expect(s.cumulativeBaseAdd).toBeCloseTo(11, 5)  // 累加
  })

  it('multiply · 关内成长 factor 累加', () => {
    resolveEffect({ kind: 'multiply', amount: 0.3 }, baseCtx)
    const s = peekInstanceState('inst_1')!
    expect(s.cumulativeFactorAdd).toBeCloseTo(0.3, 5)

    resolveEffect({ kind: 'multiply', amount: 0.3 }, baseCtx)
    expect(s.cumulativeFactorAdd).toBeCloseTo(0.6, 5)
  })

  it('gain_resource · 一次性产出 = ratio × Lv1_base', () => {
    const r = resolveEffect({ kind: 'gain_resource', resource: 'score', ratio: 0.5 }, baseCtx)
    expect(r.resourceProduced).toEqual([{ resource: 'score', amount: 5.5 }])
  })

  it('gain_resource · 不同资源用各自 Lv1 base', () => {
    const r1 = resolveEffect({ kind: 'gain_resource', resource: 'score', ratio: 1 }, baseCtx)
    const r2 = resolveEffect({ kind: 'gain_resource', resource: 'time', ratio: 1 }, baseCtx)
    expect(r1.resourceProduced[0].amount).toBe(11)
    expect(r2.resourceProduced[0].amount).toBeCloseTo(0.2, 5)
  })

  it('composite · 顺序结算', () => {
    const r = resolveEffect({
      kind: 'composite',
      effects: [
        { kind: 'add', ratio: 0.5 },
        { kind: 'gain_resource', resource: 'score', ratio: 0.1 },
      ],
    }, baseCtx)
    expect(peekInstanceState('inst_1')!.cumulativeBaseAdd).toBeCloseTo(5.5, 5)
    expect(r.resourceProduced[0].amount).toBeCloseTo(1.1, 5)
  })
})

describe('resolveEffect · 扩展 5 kind', () => {
  it('conditional · when 命中走 then', () => {
    const r = resolveEffect({
      kind: 'conditional',
      when: { type: 'is_crit' },
      then: { kind: 'gain_resource', resource: 'score', ratio: 1 },
    }, { ...baseCtx, isCrit: true })
    expect(r.resourceProduced.length).toBe(1)
  })

  it('conditional · 不命中且无 else → 不产出', () => {
    const r = resolveEffect({
      kind: 'conditional',
      when: { type: 'is_crit' },
      then: { kind: 'gain_resource', resource: 'score', ratio: 1 },
    }, { ...baseCtx, isCrit: false })
    expect(r.resourceProduced.length).toBe(0)
  })

  it('conditional · 不命中走 else', () => {
    const r = resolveEffect({
      kind: 'conditional',
      when: { type: 'is_crit' },
      then: { kind: 'gain_resource', resource: 'score', ratio: 5 },
      else: { kind: 'gain_resource', resource: 'score', ratio: 1 },
    }, { ...baseCtx, isCrit: false })
    expect(r.resourceProduced[0].amount).toBeCloseTo(11, 5)  // ratio 1 路径
  })

  it('fire_target · 申请配额 + result 记录', () => {
    const r = resolveEffect({ kind: 'fire_target', selector: { type: 'all_skills', pick: 'all' } }, baseCtx)
    expect(r.fireTargetsTriggered.length).toBe(1)
    expect(r.fireTargetsTriggered[0].sourceInstanceId).toBe('inst_1')
  })

  it('fire_target · 不丢 result · rate-limit 由 integration 层 setTimeout 推迟', () => {
    // 改版后：resolveEffect 永远 push result，rate limit 在 dispatch 层（integration）处理
    // 实现"无限限流循环"：超额 dispatch setTimeout 到下窗口，循环不中断
    for (let i = 0; i < 4; i++) {
      resolveEffect({ kind: 'fire_target', selector: { type: 'self' } }, { ...baseCtx, nowMs: 1000 + i * 100 })
    }
    const r = resolveEffect({ kind: 'fire_target', selector: { type: 'self' } }, { ...baseCtx, nowMs: 1500 })
    expect(r.fireTargetsTriggered.length).toBe(1)
    expect(r.rateLimitedFireTargets).toBe(0)
  })

  it('apply_aura · 注册到 store + result', () => {
    const r = resolveEffect({
      kind: 'apply_aura',
      selector: { type: 'all_skills', pick: 'all' },
      modifier: { type: 'crit_chance_add', amount: 0.1 },
    }, baseCtx)
    expect(r.aurasApplied.length).toBe(1)
    expect(listActiveAuras().length).toBe(1)
  })

  it('apply_status · 注册 stub（K4 D 占位）', () => {
    const r = resolveEffect({
      kind: 'apply_status',
      target: { type: 'self' },
      status: 'placeholder',
      amount: 3,
    }, baseCtx)
    expect(r.statusesApplied.length).toBe(1)
    expect(listStatuses().length).toBe(1)
  })

  it('stack_inc · state.stacks 累加', () => {
    resolveEffect({ kind: 'stack_inc', amount: 3 }, baseCtx)
    resolveEffect({ kind: 'stack_inc', amount: 2 }, baseCtx)
    expect(peekInstanceState('inst_1')!.stacks).toBe(5)
  })

  it('stack_inc · 默认 +1', () => {
    resolveEffect({ kind: 'stack_inc' }, baseCtx)
    expect(peekInstanceState('inst_1')!.stacks).toBe(1)
  })

  it('stack_release · 满阈值 → 释放 + 重置', () => {
    const state = getInstanceState('inst_1')
    state.stacks = 8

    const r = resolveEffect({
      kind: 'stack_release',
      threshold: 8,
      release: { kind: 'gain_resource', resource: 'score', ratio: 5 },
      reset: true,
    }, baseCtx)

    expect(r.resourceProduced.length).toBe(1)
    expect(r.resourceProduced[0].amount).toBeCloseTo(55, 5)
    expect(state.stacks).toBe(0)  // 已 reset
  })

  it('stack_release · 未达阈值 → 不释放', () => {
    getInstanceState('inst_1').stacks = 5

    const r = resolveEffect({
      kind: 'stack_release',
      threshold: 8,
      release: { kind: 'gain_resource', resource: 'score', ratio: 5 },
    }, baseCtx)

    expect(r.resourceProduced.length).toBe(0)
    expect(peekInstanceState('inst_1')!.stacks).toBe(5)
  })
})

describe('evaluateCondition · 8 基础 + 2 占位', () => {
  it('is_crit', () => {
    expect(evaluateCondition({ type: 'is_crit' }, { ...baseCtx, isCrit: true })).toBe(true)
    expect(evaluateCondition({ type: 'is_crit' }, { ...baseCtx, isCrit: false })).toBe(false)
  })

  it('word_length_gte / lte', () => {
    expect(evaluateCondition({ type: 'word_length_gte', n: 5 }, baseCtx)).toBe(true)
    expect(evaluateCondition({ type: 'word_length_gte', n: 6 }, baseCtx)).toBe(false)
    expect(evaluateCondition({ type: 'word_length_lte', n: 5 }, baseCtx)).toBe(true)
    expect(evaluateCondition({ type: 'word_length_lte', n: 4 }, baseCtx)).toBe(false)
  })

  it('resource_below · ratio × Lv1_base 阈值', () => {
    // score Lv1=11，ratio=2 → 阈值=22
    expect(evaluateCondition(
      { type: 'resource_below', resource: 'score', ratio: 2 },
      { ...baseCtx, getPlayerResource: (r) => r === 'score' ? 20 : 0 },
    )).toBe(true)

    expect(evaluateCondition(
      { type: 'resource_below', resource: 'score', ratio: 2 },
      { ...baseCtx, getPlayerResource: (r) => r === 'score' ? 25 : 0 },
    )).toBe(false)
  })

  it('affix_key_count_gte 读 state', () => {
    getInstanceState('inst_1').affixKeyCount = 30
    expect(evaluateCondition({ type: 'affix_key_count_gte', n: 30 }, baseCtx)).toBe(true)
    expect(evaluateCondition({ type: 'affix_key_count_gte', n: 31 }, baseCtx)).toBe(false)
  })

  it('has_status / status_count_gte · K4 D 占位返 false', () => {
    expect(evaluateCondition({ type: 'has_status', target: { type: 'self' }, status: 'x' }, baseCtx)).toBe(false)
    expect(evaluateCondition({ type: 'status_count_gte', target: { type: 'self' }, status: 'x', n: 1 }, baseCtx)).toBe(false)
  })
})

describe('Scope-aware ScaleByTag', () => {
  // 测试辅助：构造带 tag 的 mock EquippedView 列表
  const mockViews = (count: number, tag: string) =>
    Array.from({ length: count }, (_, i) => ({
      defId: `m_${i}`, skillId: `sk_${i}`, key: 'q', instanceId: `inst_${i}`, tags: [tag],
    }))

  it('scope=self · 命中本 affix 的 tag', () => {
    const ctxQ = { ...baseCtx, queryEquipped: (sc: { type: string }) => sc.type === 'self' ? mockViews(1, 'vocal') : [] }
    const r = resolveEffect({
      kind: 'gain_resource',
      resource: 'score',
      ratio: 0.1,
      scale: { type: 'count', source: { by: 'tag', tag: 'vocal' }, factor: 0.5, scope: { type: 'self' } },
    }, ctxQ)
    // base 0.1 × 11 × (1 + 1 × 0.5) = 1.65
    expect(r.resourceProduced[0].amount).toBeCloseTo(1.65, 3)
  })

  it('scope=neighbors · queryEquipped 返 3 个匹配', () => {
    const ctxQ = { ...baseCtx, queryEquipped: (sc: { type: string }) => sc.type === 'neighbors' ? mockViews(3, 'vocal') : [] }
    const r = resolveEffect({
      kind: 'gain_resource',
      resource: 'score',
      ratio: 0.1,
      scale: { type: 'count', source: { by: 'tag', tag: 'vocal' }, factor: 0.5, scope: { type: 'neighbors', posRel: 0 as never } },
    }, ctxQ)
    // base 0.1 × 11 × (1 + 3 × 0.5) = 2.75
    expect(r.resourceProduced[0].amount).toBeCloseTo(2.75, 3)
  })

  it('scope=matched_resource · queryEquipped 返 4 个匹配', () => {
    const ctxQ = { ...baseCtx, queryEquipped: (sc: { type: string }) => sc.type === 'matched_resource' ? mockViews(4, 'vocal') : [] }
    const r = resolveEffect({
      kind: 'gain_resource',
      resource: 'score',
      ratio: 0.1,
      scale: { type: 'count', source: { by: 'tag', tag: 'vocal' }, factor: 0.5, scope: { type: 'matched_resource', resource: 'score' } },
    }, ctxQ)
    // base 0.1 × 11 × (1 + 4 × 0.5) = 3.3
    expect(r.resourceProduced[0].amount).toBeCloseTo(3.3, 3)
  })

  it('scope 缺省 → all_skills · queryEquipped 返 23 个匹配', () => {
    const ctxQ = { ...baseCtx, queryEquipped: (_sc: { type: string }) => mockViews(23, 'vocal') }
    const r = resolveEffect({
      kind: 'gain_resource',
      resource: 'score',
      ratio: 0.1,
      scale: { type: 'count', source: { by: 'tag', tag: 'vocal' }, factor: 0.5 },
    }, ctxQ)
    // base 0.1 × 11 × (1 + 23 × 0.5) = 13.75
    expect(r.resourceProduced[0].amount).toBeCloseTo(13.75, 2)
  })
})

describe('ScaleByTag · tag_per_n（步进整数）', () => {
  const mockViews = (count: number, tag: string) =>
    Array.from({ length: count }, (_, i) => ({
      defId: `m_${i}`, skillId: `sk_${i}`, key: 'q', instanceId: `inst_${i}`, tags: [tag],
    }))

  it('gain_resource · count<perN → factor=0 产出 0', () => {
    const ctxQ = { ...baseCtx, queryEquipped: (_sc: { type: string }) => mockViews(2, 'vocal') }
    const r = resolveEffect({
      kind: 'gain_resource',
      resource: 'score',
      ratio: 1,
      scale: { type: 'per_n', source: { by: 'tag', tag: 'vocal' }, perN: 3 },
    }, ctxQ)
    expect(r.resourceProduced[0].amount).toBe(0)
  })

  it('gain_resource · count=perN → factor=1 产出全 base', () => {
    const ctxQ = { ...baseCtx, queryEquipped: (_sc: { type: string }) => mockViews(3, 'vocal') }
    const r = resolveEffect({
      kind: 'gain_resource',
      resource: 'score',
      ratio: 1,
      scale: { type: 'per_n', source: { by: 'tag', tag: 'vocal' }, perN: 3 },
    }, ctxQ)
    // 1 × 11 × floor(3/3) = 11
    expect(r.resourceProduced[0].amount).toBe(11)
  })

  it('gain_resource · count=7, perN=3 → floor(7/3)=2', () => {
    const ctxQ = { ...baseCtx, queryEquipped: (_sc: { type: string }) => mockViews(7, 'vocal') }
    const r = resolveEffect({
      kind: 'gain_resource',
      resource: 'score',
      ratio: 1,
      scale: { type: 'per_n', source: { by: 'tag', tag: 'vocal' }, perN: 3 },
    }, ctxQ)
    // 1 × 11 × 2 = 22
    expect(r.resourceProduced[0].amount).toBe(22)
  })

  it('perN<=0 → factor=0（防御性）', () => {
    const ctxQ = { ...baseCtx, queryEquipped: (_sc: { type: string }) => mockViews(100, 'vocal') }
    const r = resolveEffect({
      kind: 'gain_resource',
      resource: 'score',
      ratio: 1,
      scale: { type: 'per_n', source: { by: 'tag', tag: 'vocal' }, perN: 0 },
    }, ctxQ)
    expect(r.resourceProduced[0].amount).toBe(0)
  })
})

describe('ScaleByTag · targetScore（目标分数档 · 全局 · 不用 scope）', () => {
  const origTarget = gameState.targetScore
  afterEach(() => { gameState.targetScore = origTarget })

  it('count 曲线 · n = round(targetScore / TARGET_BASE)', () => {
    gameState.targetScore = BALANCE.TARGET_BASE * 4   // n = 4
    const r = resolveEffect({
      kind: 'gain_resource', resource: 'score', ratio: 1,
      scale: { type: 'count', source: { by: 'targetScore' }, factor: 0.1 },
    }, baseCtx)
    // 1 × 11 × (1 + 4×0.1) = 15.4
    expect(r.resourceProduced[0].amount).toBeCloseTo(15.4, 5)
  })

  it('档位四舍五入 · target = 3.4 档 → n = 3', () => {
    gameState.targetScore = BALANCE.TARGET_BASE * 3.4
    const r = resolveEffect({
      kind: 'gain_resource', resource: 'score', ratio: 1,
      scale: { type: 'count', source: { by: 'targetScore' }, factor: 0.1 },
    }, baseCtx)
    // n = round(3.4) = 3 → 11 × 1.3 = 14.3
    expect(r.resourceProduced[0].amount).toBeCloseTo(14.3, 5)
  })

  it('per_n 曲线 · floor(n / perN)', () => {
    gameState.targetScore = BALANCE.TARGET_BASE * 7   // n = 7
    const r = resolveEffect({
      kind: 'gain_resource', resource: 'score', ratio: 1,
      scale: { type: 'per_n', source: { by: 'targetScore' }, perN: 3 },
    }, baseCtx)
    // floor(7/3) = 2 → 11 × 2 = 22
    expect(r.resourceProduced[0].amount).toBe(22)
  })
})

describe('apply_aura · scale 缩放 modifier amount', () => {
  const mockViews = (count: number, tag: string) =>
    Array.from({ length: count }, (_, i) => ({
      defId: `m_${i}`, skillId: `sk_${i}`, key: 'q', instanceId: `inst_${i}`, tags: [tag],
    }))

  it('无 scale · modifier 原样注册', () => {
    resolveEffect({
      kind: 'apply_aura',
      selector: { type: 'self' },
      modifier: { type: 'multi_fire_add', amount: 1 },
    }, baseCtx)
    const auras = listActiveAuras()
    expect(auras.length).toBe(1)
    const mod = auras[0].modifier
    expect(mod.type).toBe('multi_fire_add')
    expect((mod as { amount: number }).amount).toBe(1)
  })

  it('"每 2 vocal +1 multi_fire" · count=4 → amount=2', () => {
    // 用户原始用例：amount=1, perN=2, vocal
    const ctxQ = { ...baseCtx, queryEquipped: (_sc: { type: string }) => mockViews(4, 'vocal') }
    resolveEffect({
      kind: 'apply_aura',
      selector: { type: 'all_skills', pick: 'all' },
      modifier: { type: 'multi_fire_add', amount: 1 },
      scale: { type: 'per_n', source: { by: 'tag', tag: 'vocal' }, perN: 2 },
    }, ctxQ)
    const auras = listActiveAuras()
    expect(auras.length).toBe(1)
    expect((auras[0].modifier as { amount: number }).amount).toBe(2)  // 1 × floor(4/2)
  })

  it('count=1 (< perN=2) → amount=0（aura 仍注册但 effect 0）', () => {
    const ctxQ = { ...baseCtx, queryEquipped: (_sc: { type: string }) => mockViews(1, 'vocal') }
    resolveEffect({
      kind: 'apply_aura',
      selector: { type: 'self' },
      modifier: { type: 'multi_fire_add', amount: 1 },
      scale: { type: 'per_n', source: { by: 'tag', tag: 'vocal' }, perN: 2 },
    }, ctxQ)
    const auras = listActiveAuras()
    expect((auras[0].modifier as { amount: number }).amount).toBe(0)
  })

  it('tag_count scale 也适用于 apply_aura', () => {
    const ctxQ = { ...baseCtx, queryEquipped: (_sc: { type: string }) => mockViews(3, 'vocal') }
    resolveEffect({
      kind: 'apply_aura',
      selector: { type: 'self' },
      modifier: { type: 'crit_chance_add', amount: 0.1 },
      scale: { type: 'count', source: { by: 'tag', tag: 'vocal' }, factor: 0.5 },
    }, ctxQ)
    const auras = listActiveAuras()
    // 0.1 × (1 + 3 × 0.5) = 0.25
    expect((auras[0].modifier as { amount: number }).amount).toBeCloseTo(0.25, 5)
  })

  it('rainbow modifier · scale 无意义被透传', () => {
    const ctxQ = { ...baseCtx, queryEquipped: (_sc: { type: string }) => mockViews(5, 'vocal') }
    resolveEffect({
      kind: 'apply_aura',
      selector: { type: 'self' },
      modifier: { type: 'rainbow' },
      scale: { type: 'per_n', source: { by: 'tag', tag: 'vocal' }, perN: 2 },
    }, ctxQ)
    const auras = listActiveAuras()
    expect(auras[0].modifier.type).toBe('rainbow')
  })
})
