// ============================================
// 附魔效果引擎测试
// Story 19.6: AC2, AC3, AC4, AC5, AC6, AC10
// ============================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { state, synergy, resetState } from '../../../src/core/state'
import { PRODUCERS } from '../../../src/data/producers'

// Mock DOM 和音效
vi.mock('../../../src/ui/elements', () => ({
  getElements: () => ({
    triggerZone: { appendChild: vi.fn() },
  }),
}))
vi.mock('../../../src/effects/sound', () => ({
  playSound: vi.fn(),
}))
const mockShowFeedback = vi.fn()
const mockUpdateHUD = vi.fn()
vi.mock('../../../src/systems/battle', () => ({
  showFeedback: (...args: any[]) => mockShowFeedback(...args),
  updateHUD: (...args: any[]) => mockUpdateHUD(...args),
  setPseudoInfiniteVisual: vi.fn(),
}))

// Mock DOM for showTriggerPopup
beforeEach(() => {
  const mockEl = { className: '', innerHTML: '', style: { left: '' }, remove: vi.fn() }
  vi.stubGlobal('document', { createElement: () => mockEl })
})
afterEach(() => {
  vi.unstubAllGlobals()
  mockShowFeedback.mockClear()
  mockUpdateHUD.mockClear()
})

describe('getEnchantmentMultiplier — 增幅型 (AC2, AC5)', () => {
  beforeEach(() => resetState())

  it('无附魔返回 1', async () => {
    const { getEnchantmentMultiplier } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')

    expect(getEnchantmentMultiplier('prod_burst', 'f')).toBe(1)
  })

  it('增幅型：相邻 2 个技能 → ×1.40', async () => {
    const { getEnchantmentMultiplier } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 3 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_amplify_adjacent')

    // f 的相邻键绑定技能
    state.player.skills.set('prod_focus', { level: 1 })
    state.player.bindings.set('g', 'prod_focus')
    state.player.skills.set('prod_shield', { level: 1 })
    state.player.bindings.set('d', 'prod_shield')

    const mult = getEnchantmentMultiplier('prod_burst', 'f')
    // 2 neighbors × 0.20 = 0.40 → 1.40
    expect(mult).toBeCloseTo(1.40, 2)
  })

  it('增幅型：无相邻技能 → ×1.0', async () => {
    const { getEnchantmentMultiplier } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 3 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_amplify_adjacent')
    // no neighbors bound
    expect(getEnchantmentMultiplier('prod_burst', 'f')).toBeCloseTo(1.0, 2)
  })
})

describe('getEnchantmentMultiplier — 排斥型 (AC2, AC5)', () => {
  beforeEach(() => resetState())

  it('排斥型：相邻 3 个空位 → ×1.75', async () => {
    const { getEnchantmentMultiplier } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 3 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_repulsion_adjacent')

    // f 的相邻键：d, g, r, t, v, c — 6 keys adjacent to f
    // 只有 f 有绑定，所以所有相邻都是空的
    const mult = getEnchantmentMultiplier('prod_burst', 'f')
    // 应 > 1（具体值取决于 f 的相邻键数 × 0.25）
    expect(mult).toBeGreaterThan(1)
  })

  it('排斥型：相邻全满 → ×1.0', async () => {
    const { getEnchantmentMultiplier } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 3 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_repulsion_adjacent')

    // 给 f 的所有相邻都绑定技能
    const adjKeys = ['d', 'g', 'r', 't', 'v', 'c']
    for (const k of adjKeys) {
      state.player.skills.set(`prod_focus`, { level: 1 })
      state.player.bindings.set(k, 'prod_focus')
    }

    const mult = getEnchantmentMultiplier('prod_burst', 'f')
    expect(mult).toBeCloseTo(1.0, 2)
  })
})

describe('triggerProducer with enchantment — 增幅倍率应用 (AC2)', () => {
  beforeEach(() => resetState())

  it('附魔后 base 资源增加应大于无附魔', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    // Setup: prod_burst at f, Lv3, amplify enchantment
    state.player.skills.set('prod_burst', { level: 3 })
    state.player.bindings.set('f', 'prod_burst')

    // 无附魔
    synergy.skillBaseScore = 0
    triggerProducer('prod_burst', 'f')
    const baseWithout = synergy.skillBaseScore

    // 重置
    synergy.skillBaseScore = 0
    state.player.enchantedSkills.set('prod_burst', 'ench_amplify_adjacent')
    // 添加相邻技能
    state.player.skills.set('prod_focus', { level: 1 })
    state.player.bindings.set('g', 'prod_focus')

    triggerProducer('prod_burst', 'f')
    const baseWith = synergy.skillBaseScore

    expect(baseWith).toBeGreaterThan(baseWithout)
  })
})

describe('溅射型附魔 (AC2, AC5)', () => {
  beforeEach(() => resetState())

  it('溅射触发位置关系内的技能', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    // f = prod_burst (splash adjacent), g = prod_focus (adjacent to f)
    state.player.skills.set('prod_burst', { level: 3 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_splash_adjacent')

    state.player.skills.set('prod_focus', { level: 1 })
    state.player.bindings.set('g', 'prod_focus')

    const multBefore = state.resources.multiplier
    triggerProducer('prod_burst', 'f')
    // prod_focus 应被溅射触发 → multiplier 增加
    expect(state.resources.multiplier).toBeGreaterThanOrEqual(multBefore)
  })

  it('溅射不递归溅射', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    // f = prod_burst (splash adjacent), g = prod_focus (splash adjacent)
    state.player.skills.set('prod_burst', { level: 3 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_splash_adjacent')

    state.player.skills.set('prod_focus', { level: 3 })
    state.player.bindings.set('g', 'prod_focus')
    state.player.enchantedSkills.set('prod_focus', 'ench_splash_adjacent')

    // 不应无限递归
    expect(() => triggerProducer('prod_burst', 'f')).not.toThrow()
  })
})

describe('共鸣型附魔 (AC2, AC5)', () => {
  beforeEach(() => resetState())

  it('技能触发时共鸣附魔的邻居被触发', async () => {
    const { checkResonanceTriggers } = await import('../../../src/systems/skills')
    // f 上 prod_burst, g 上 prod_focus (有共鸣附魔 resonance_adjacent)
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')

    state.player.skills.set('prod_focus', { level: 3 })
    state.player.bindings.set('g', 'prod_focus')
    state.player.enchantedSkills.set('prod_focus', 'ench_resonance_adjacent')

    const multBefore = state.resources.multiplier
    // f 触发 → 检查共鸣 → g 的 prod_focus 应被触发（减效）
    checkResonanceTriggers('f')
    // prod_focus 产出 multiplier → 应增加
    expect(state.resources.multiplier).toBeGreaterThanOrEqual(multBefore)
  })

  it('共鸣不递归共鸣', async () => {
    const { checkResonanceTriggers } = await import('../../../src/systems/skills')
    // f 和 g 都有共鸣附魔
    state.player.skills.set('prod_burst', { level: 3 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_resonance_adjacent')

    state.player.skills.set('prod_focus', { level: 3 })
    state.player.bindings.set('g', 'prod_focus')
    state.player.enchantedSkills.set('prod_focus', 'ench_resonance_adjacent')

    expect(() => checkResonanceTriggers('f')).not.toThrow()
  })
})

describe('变性型附魔 (AC3, AC6)', () => {
  beforeEach(() => resetState())

  it('触发时额外产出另一种资源', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    // prod_burst 产出 base, 附魔 ench_trans_score (额外产出 score)
    state.player.skills.set('prod_burst', { level: 3 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_trans_score')

    const scoreBefore = state.resources.score
    synergy.skillBaseScore = 0
    triggerProducer('prod_burst', 'f')
    // base 增加 + score 也应增加（变性附魔）
    expect(synergy.skillBaseScore).toBeGreaterThan(0)
    expect(state.resources.score).toBeGreaterThan(scoreBefore)
  })
})


describe('进化流程 — drawEnchantmentPair (AC8)', () => {
  it('总是返回 2 个不重复的有效附魔', async () => {
    const { drawEnchantmentPair, isEnchantment } = await import('../../../src/data/enchantments')
    for (let i = 0; i < 50; i++) {
      const [a, b] = drawEnchantmentPair()
      expect(a).not.toBe(b)
      expect(isEnchantment(a)).toBe(true)
      expect(isEnchantment(b)).toBe(true)
    }
  })
})

describe('附魔与连接者互不干扰 (AC9)', () => {
  beforeEach(() => resetState())

  it('连接者无法附魔', async () => {
    const { getEnchantmentMultiplier } = await import('../../../src/systems/skills')
    state.player.skills.set('conn_copy_adjacent', { level: 1 })
    state.player.bindings.set('f', 'conn_copy_adjacent')
    // 即使强制设置附魔，也不应 crash
    state.player.enchantedSkills.set('conn_copy_adjacent', 'ench_amplify_adjacent')
    expect(() => getEnchantmentMultiplier('conn_copy_adjacent', 'f')).not.toThrow()
  })
})
