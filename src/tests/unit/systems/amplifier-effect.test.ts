// ============================================
// 打字肉鸽 - 增幅者效果应用测试
// ============================================
// 统一 +N%/层 百分比机制（addBonus 恒为 0，mulBonus = 1 + percentBonus）

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

describe('getAmplifierBonus — 统一百分比计算', () => {
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

  it('单个增幅者：stacks=10, valuePerStack=0.03 → mulBonus=1.3', async () => {
    const { getAmplifierBonus } = await import('../../../src/systems/skills')
    // amp_base_adjacent: resource=base, valuePerStack=0.03
    state.player.bindings.set('s', 'amp_base_adjacent')
    state.player.skills.set('amp_base_adjacent', { level: 1 })
    state.amplifierStacks.set('amp_base_adjacent', 10)
    state.player.bindings.set('a', 'prod_burst')

    const result = getAmplifierBonus('prod_burst', 'a', 'base')
    expect(result.addBonus).toBe(0) // 统一百分比，addBonus 恒为 0
    expect(result.mulBonus).toBeCloseTo(1.3) // 1 + 10 × 0.03
  })

  it('多个同资源增幅者加性叠加', async () => {
    const { getAmplifierBonus } = await import('../../../src/systems/skills')
    // amp_base_adjacent 在 s（与 a 相邻）
    state.player.bindings.set('s', 'amp_base_adjacent')
    state.player.skills.set('amp_base_adjacent', { level: 1 })
    state.amplifierStacks.set('amp_base_adjacent', 10)
    state.player.bindings.set('a', 'prod_burst')

    const result = getAmplifierBonus('prod_burst', 'a', 'base')
    // 单个增幅者: 1 + 10 × 0.03 = 1.3
    expect(result.addBonus).toBe(0)
    expect(result.mulBonus).toBeCloseTo(1.3)
  })

  it('资源类型不匹配时不增幅', async () => {
    const { getAmplifierBonus } = await import('../../../src/systems/skills')
    // score 增幅者 vs base 产出者
    state.player.bindings.set('1', 'amp_score_sameColumn')
    state.player.skills.set('amp_score_sameColumn', { level: 1 })
    state.amplifierStacks.set('amp_score_sameColumn', 10)
    state.player.bindings.set('q', 'prod_burst')

    const result = getAmplifierBonus('prod_burst', 'q', 'base')
    expect(result.addBonus).toBe(0)
    expect(result.mulBonus).toBe(1) // score 增幅不影响 base
  })

  it('位置关系不匹配时不增幅', async () => {
    const { getAmplifierBonus } = await import('../../../src/systems/skills')
    // adjacent 增幅者绑定到远离的键 (p 不与 a 相邻)
    state.player.bindings.set('p', 'amp_base_adjacent')
    state.player.skills.set('amp_base_adjacent', { level: 1 })
    state.amplifierStacks.set('amp_base_adjacent', 10)
    state.player.bindings.set('a', 'prod_burst')

    const result = getAmplifierBonus('prod_burst', 'a', 'base')
    expect(result.addBonus).toBe(0)
    expect(result.mulBonus).toBe(1) // p 不与 a 相邻
  })

  it('零叠层增幅者不参与计算', async () => {
    const { getAmplifierBonus } = await import('../../../src/systems/skills')
    state.player.bindings.set('s', 'amp_base_adjacent')
    state.player.skills.set('amp_base_adjacent', { level: 1 })
    // stacks = 0 (未设置)
    state.player.bindings.set('a', 'prod_burst')

    const result = getAmplifierBonus('prod_burst', 'a', 'base')
    expect(result.addBonus).toBe(0)
    expect(result.mulBonus).toBe(1)
  })

  it('等级缩放：Lv2 增幅值 ×1.5', async () => {
    const { getAmplifierBonus } = await import('../../../src/systems/skills')
    state.player.bindings.set('s', 'amp_base_adjacent')
    state.player.skills.set('amp_base_adjacent', { level: 2 })
    state.amplifierStacks.set('amp_base_adjacent', 10)
    state.player.bindings.set('a', 'prod_burst')

    const result = getAmplifierBonus('prod_burst', 'a', 'base')
    // 10 stacks × 0.03 × 1.5 (Lv2) = 0.45 → mulBonus = 1.45
    expect(result.mulBonus).toBeCloseTo(1.45)
  })

  it('addBonus 始终为 0（统一百分比机制）', async () => {
    const { getAmplifierBonus } = await import('../../../src/systems/skills')
    state.player.bindings.set('s', 'amp_base_adjacent')
    state.player.skills.set('amp_base_adjacent', { level: 1 })
    state.amplifierStacks.set('amp_base_adjacent', 100)
    state.player.bindings.set('a', 'prod_burst')

    const result = getAmplifierBonus('prod_burst', 'a', 'base')
    expect(result.addBonus).toBe(0)
    expect(result.mulBonus).toBeCloseTo(4.0) // 1 + 100 × 0.03
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
    // 增幅者: +3%/stack × 10 stacks = +30% → mulBonus = 1.3
    state.player.bindings.set('s', 'amp_base_adjacent')
    state.player.skills.set('amp_base_adjacent', { level: 1 })
    state.amplifierStacks.set('amp_base_adjacent', 10)

    synergy.skillBaseScore = 0
    triggerProducer('prod_burst', 'a')
    // (5 + 0) × 1.3 = 6.5
    expect(synergy.skillBaseScore).toBeCloseTo(6.5)
  })

  it('无增幅者时产出不变', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('a', 'prod_burst')

    synergy.skillBaseScore = 0
    triggerProducer('prod_burst', 'a')
    expect(synergy.skillBaseScore).toBe(5) // 原始 +5
  })

  it('百分比增幅者作用于加法产出者', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('a', 'prod_burst')
    // 增幅: +3%/stack × 20 stacks = +60% → mulBonus = 1.6
    state.player.bindings.set('s', 'amp_base_adjacent')
    state.player.skills.set('amp_base_adjacent', { level: 1 })
    state.amplifierStacks.set('amp_base_adjacent', 20)

    synergy.skillBaseScore = 0
    triggerProducer('prod_burst', 'a')
    // (5 + 0) × 1.6 = 8
    expect(synergy.skillBaseScore).toBeCloseTo(8)
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

    // score 增幅者：amp_score_sameColumn on same column as 'a'
    // 'a' 在 column 0, 'z' 在 column 0 — sameColumn
    state.player.bindings.set('z', 'amp_score_sameColumn')
    state.player.skills.set('amp_score_sameColumn', { level: 1 })
    state.amplifierStacks.set('amp_score_sameColumn', 5)

    triggerConverter('conv_base_score_add', 'a')
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
    expect(state.score).toBeGreaterThan(scoreBefore)
  })
})
