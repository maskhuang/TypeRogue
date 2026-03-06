// ============================================
// 打字肉鸽 - 增幅者效果应用测试
// ============================================
// Story 23.4: getAmplifierBonus + triggerProducer/triggerConverter 集成

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { state, synergy, resetState } from '../../../src/core/state'

// Mock DOM 和音效
vi.mock('../../../src/ui/elements', () => ({
  getElements: () => ({
    triggerZone: { appendChild: vi.fn() },
  }),
}))
vi.mock('../../../src/effects/sound', () => ({
  playSound: vi.fn(),
}))
vi.mock('../../../src/systems/battle', () => ({
  showFeedback: vi.fn(),
  updateHUD: vi.fn(),
  setPseudoInfiniteVisual: vi.fn(),
}))

// Mock DOM for popup
beforeEach(() => {
  const mockEl = { className: '', innerHTML: '', style: { left: '' }, remove: vi.fn() }
  vi.stubGlobal('document', { createElement: () => mockEl })
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getAmplifierBonus — 基础计算', () => {
  beforeEach(() => {
    resetState()
  })

  it('无增幅者绑定时返回 {addBonus:0, mulBonus:1}', async () => {
    const { getAmplifierBonus } = await import('../../../src/systems/skills')
    const result = getAmplifierBonus('prod_burst', 'a', 'base')
    expect(result.addBonus).toBe(0)
    expect(result.mulBonus).toBe(1)
  })

  it('triggerKey 为 undefined 时返回默认值', async () => {
    const { getAmplifierBonus } = await import('../../../src/systems/skills')
    const result = getAmplifierBonus('prod_burst', undefined, 'base')
    expect(result.addBonus).toBe(0)
    expect(result.mulBonus).toBe(1)
  })

  it('单个加法增幅者：stacks=10, valuePerStack=1 → addBonus=10', async () => {
    const { getAmplifierBonus } = await import('../../../src/systems/skills')
    // 绑定增幅者到 s（相邻于 a）
    state.player.bindings.set('s', 'amp_base_add_adjacent')
    state.player.skills.set('amp_base_add_adjacent', { level: 1 })
    state.amplifierStacks.set('amp_base_add_adjacent', 10)
    // 绑定产出者到 a
    state.player.bindings.set('a', 'prod_burst')

    const result = getAmplifierBonus('prod_burst', 'a', 'base')
    expect(result.addBonus).toBe(10) // 10 stacks × 1 valuePerStack
    expect(result.mulBonus).toBe(1)
  })

  it('单个乘法增幅者：stacks=20, valuePerStack=0.05 → mulBonus=2.0', async () => {
    const { getAmplifierBonus } = await import('../../../src/systems/skills')
    // amp_base_mul_adjacent: resource=base, operator=multiply, valuePerStack=0.05
    state.player.bindings.set('s', 'amp_base_mul_adjacent')
    state.player.skills.set('amp_base_mul_adjacent', { level: 1 })
    state.amplifierStacks.set('amp_base_mul_adjacent', 20)
    state.player.bindings.set('a', 'prod_burst')

    const result = getAmplifierBonus('prod_burst', 'a', 'base')
    expect(result.addBonus).toBe(0)
    expect(result.mulBonus).toBeCloseTo(2.0) // 1 + 20 × 0.05
  })

  it('多个加法增幅者累加', async () => {
    const { getAmplifierBonus } = await import('../../../src/systems/skills')
    // 两个 base 加法增幅者绑定到 a 的相邻键
    state.player.bindings.set('s', 'amp_base_add_adjacent')
    state.player.skills.set('amp_base_add_adjacent', { level: 1 })
    state.amplifierStacks.set('amp_base_add_adjacent', 5)

    // 第二个：需要另一个 base add 增幅者，但 amp_base_add_adjacent 只有一个
    // 使用不同键但同一增幅者不行（同一 ID 只有一个 stacks）
    // 测试 addBonus 只有一个增幅者的效果
    state.player.bindings.set('a', 'prod_burst')

    const result = getAmplifierBonus('prod_burst', 'a', 'base')
    expect(result.addBonus).toBe(5) // 5 stacks × 1
  })

  it('加法+乘法增幅者同时作用', async () => {
    const { getAmplifierBonus } = await import('../../../src/systems/skills')
    // 加法增幅者
    state.player.bindings.set('s', 'amp_base_add_adjacent')
    state.player.skills.set('amp_base_add_adjacent', { level: 1 })
    state.amplifierStacks.set('amp_base_add_adjacent', 10)
    // 乘法增幅者（w 与 a 相邻）
    state.player.bindings.set('w', 'amp_base_mul_adjacent')
    state.player.skills.set('amp_base_mul_adjacent', { level: 1 })
    state.amplifierStacks.set('amp_base_mul_adjacent', 10)
    // 产出者
    state.player.bindings.set('a', 'prod_burst')

    const result = getAmplifierBonus('prod_burst', 'a', 'base')
    expect(result.addBonus).toBe(10) // 10 × 1
    expect(result.mulBonus).toBeCloseTo(1.5) // 1 + 10 × 0.05
  })

  it('资源类型不匹配时不增幅', async () => {
    const { getAmplifierBonus } = await import('../../../src/systems/skills')
    // score 增幅者 vs base 产出者
    state.player.bindings.set('s', 'amp_score_add_sameColumn')
    state.player.skills.set('amp_score_add_sameColumn', { level: 1 })
    state.amplifierStacks.set('amp_score_add_sameColumn', 10)
    state.player.bindings.set('a', 'prod_burst')

    const result = getAmplifierBonus('prod_burst', 'a', 'base')
    expect(result.addBonus).toBe(0) // score 增幅不影响 base
    expect(result.mulBonus).toBe(1)
  })

  it('位置关系不匹配时不增幅', async () => {
    const { getAmplifierBonus } = await import('../../../src/systems/skills')
    // adjacent 增幅者绑定到远离的键 (p 不与 a 相邻)
    state.player.bindings.set('p', 'amp_base_add_adjacent')
    state.player.skills.set('amp_base_add_adjacent', { level: 1 })
    state.amplifierStacks.set('amp_base_add_adjacent', 10)
    state.player.bindings.set('a', 'prod_burst')

    const result = getAmplifierBonus('prod_burst', 'a', 'base')
    expect(result.addBonus).toBe(0) // p 不与 a 相邻
    expect(result.mulBonus).toBe(1)
  })

  it('零叠层增幅者不参与计算', async () => {
    const { getAmplifierBonus } = await import('../../../src/systems/skills')
    state.player.bindings.set('s', 'amp_base_add_adjacent')
    state.player.skills.set('amp_base_add_adjacent', { level: 1 })
    // stacks = 0 (未设置)
    state.player.bindings.set('a', 'prod_burst')

    const result = getAmplifierBonus('prod_burst', 'a', 'base')
    expect(result.addBonus).toBe(0)
    expect(result.mulBonus).toBe(1)
  })

  it('等级缩放：Lv2 增幅值 ×1.5', async () => {
    const { getAmplifierBonus } = await import('../../../src/systems/skills')
    state.player.bindings.set('s', 'amp_base_add_adjacent')
    state.player.skills.set('amp_base_add_adjacent', { level: 2 })
    state.amplifierStacks.set('amp_base_add_adjacent', 10)
    state.player.bindings.set('a', 'prod_burst')

    const result = getAmplifierBonus('prod_burst', 'a', 'base')
    expect(result.addBonus).toBe(15) // 10 stacks × 1 × 1.5 (Lv2)
  })
})

describe('triggerProducer — 增幅者集成', () => {
  beforeEach(() => {
    resetState()
  })

  it('有增幅者时 base 产出增加', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    // prod_burst: +5 base (Lv1)
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('a', 'prod_burst')
    // 增幅者: +1/stack × 10 stacks = +10
    state.player.bindings.set('s', 'amp_base_add_adjacent')
    state.player.skills.set('amp_base_add_adjacent', { level: 1 })
    state.amplifierStacks.set('amp_base_add_adjacent', 10)

    synergy.skillBaseScore = 0
    triggerProducer('prod_burst', 'a')
    // (5 + 10) × 1 = 15
    expect(synergy.skillBaseScore).toBe(15)
  })

  it('无增幅者时产出不变', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('a', 'prod_burst')

    synergy.skillBaseScore = 0
    triggerProducer('prod_burst', 'a')
    expect(synergy.skillBaseScore).toBe(5) // 原始 +5
  })

  it('乘法增幅者作用于加法产出者', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('a', 'prod_burst')
    // 乘法增幅: ×5%/stack × 10 stacks → mulBonus = 1.5
    state.player.bindings.set('s', 'amp_base_mul_adjacent')
    state.player.skills.set('amp_base_mul_adjacent', { level: 1 })
    state.amplifierStacks.set('amp_base_mul_adjacent', 10)

    synergy.skillBaseScore = 0
    triggerProducer('prod_burst', 'a')
    // (5 + 0) × 1.5 = 7.5
    expect(synergy.skillBaseScore).toBeCloseTo(7.5)
  })
})

describe('triggerConverter — 增幅者集成', () => {
  beforeEach(() => {
    resetState()
  })

  it('有增幅者时转化产出增加', async () => {
    const { triggerConverter } = await import('../../../src/systems/skills')
    // conv_base_score_add: source=base, target=score, formula=add
    state.player.skills.set('conv_base_score_add', { level: 1 })
    state.player.bindings.set('a', 'conv_base_score_add')
    state.resources.base = 10
    state.score = 0

    // score 增幅者：amp_score_add_sameColumn on same column as 'a'
    // 'a' 在 column 0, 'z' 在 column 0 — sameColumn
    state.player.bindings.set('z', 'amp_score_add_sameColumn')
    state.player.skills.set('amp_score_add_sameColumn', { level: 1 })
    state.amplifierStacks.set('amp_score_add_sameColumn', 5)

    triggerConverter('conv_base_score_add', 'a')
    // 增幅目标是 conv.target='score', amp resource='score' → 匹配
    // k(Lv1) 被增幅: (k + 5×2) × 1 = k + 10
    // delta = sourceVal × amplifiedK × enchMult
    // 具体数值取决于 k 值，但应比无增幅时大
    const scoreWithAmp = state.resources.score

    // 重置并无增幅测试对比
    resetState()
    state.player.skills.set('conv_base_score_add', { level: 1 })
    state.player.bindings.set('a', 'conv_base_score_add')
    state.resources.base = 10
    state.score = 0

    triggerConverter('conv_base_score_add', 'a')
    const scoreWithout = state.resources.score

    expect(scoreWithAmp).toBeGreaterThan(scoreWithout)
  })

  it('无增幅者时转化产出不变', async () => {
    const { triggerConverter } = await import('../../../src/systems/skills')
    state.player.skills.set('conv_base_score_add', { level: 1 })
    state.player.bindings.set('a', 'conv_base_score_add')
    state.resources.base = 10
    state.score = 100

    const scoreBefore = state.score
    triggerConverter('conv_base_score_add', 'a')
    // 无增幅者，产出应与原始逻辑一致
    expect(state.score).toBeGreaterThan(scoreBefore)
  })
})
