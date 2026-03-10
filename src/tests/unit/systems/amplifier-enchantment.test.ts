// ============================================
// 打字肉鸽 - 增幅者附魔适配测试
// ============================================
// 统一 +N%/层 机制

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
  emitResourceSound: vi.fn(),
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

// === Task 1: 附魔门控验证（逻辑在 shop.ts，此处通过 skills 侧验证行为不变） ===

describe('triggerAmplifier — 无附魔时行为不变（回归）', () => {
  beforeEach(() => { resetState() })

  it('无附魔增幅者叠层 +1', async () => {
    const { triggerAmplifier } = await import('../../../src/systems/skills')
    state.player.bindings.set('a', 'amp_base_adjacent')
    state.player.skills.set('amp_base_adjacent', { level: 1 })
    state.amplifierStacks.set('amp_base_adjacent', 5)

    triggerAmplifier('amp_base_adjacent', 'a')
    expect(state.amplifierStacks.get('amp_base_adjacent')).toBe(6) // 5 + 1
  })
})

// === Task 2: repulsion 附魔增加叠层增量 ===

describe('triggerAmplifier — repulsion 附魔增加叠层增量', () => {
  beforeEach(() => { resetState() })

  it('repulsion·adjacent: f 键 6 个空位邻居 → enchMult=2.5, 叠层+3', async () => {
    const { triggerAmplifier } = await import('../../../src/systems/skills')
    // 增幅者在 'f', enchanted with repulsion·adjacent (effectValue=0.25)
    // f 的相邻键: d, r, t, g, c, v — 全部空位
    state.player.bindings.set('f', 'amp_base_adjacent')
    state.player.skills.set('amp_base_adjacent', { level: 1 })
    state.player.enchantedSkills.set('amp_base_adjacent', 'ench_repulsion_adjacent')
    state.amplifierStacks.set('amp_base_adjacent', 0)

    triggerAmplifier('amp_base_adjacent', 'f')
    // enchMult = 1 + 6 * 0.25 = 2.5, ceil(2.5) = 3
    expect(state.amplifierStacks.get('amp_base_adjacent')).toBe(3)
  })
})

// === Task 3: splash 附魔触发范围内技能 ===

describe('triggerAmplifier — splash 附魔触发范围内技能', () => {
  beforeEach(() => { resetState() })

  it('splash·adjacent: 触发相邻产出者', async () => {
    const { triggerAmplifier } = await import('../../../src/systems/skills')
    // 增幅者在 'a', enchanted with splash·adjacent
    state.player.bindings.set('a', 'amp_base_adjacent')
    state.player.skills.set('amp_base_adjacent', { level: 1 })
    state.player.enchantedSkills.set('amp_base_adjacent', 'ench_splash_adjacent')
    state.amplifierStacks.set('amp_base_adjacent', 0)

    // 相邻产出者在 's'
    state.player.bindings.set('s', 'prod_burst')
    state.player.skills.set('prod_burst', { level: 1 })

    state.resources.base = 0
    triggerAmplifier('amp_base_adjacent', 'a')
    // 溅射效率 = 100% / 1 个技能 = 100%: +5 * 1.0 = 5
    expect(state.resources.base).toBeCloseTo(5)
  })

  it('splash: 跳过相邻增幅者（不触发其他增幅者）', async () => {
    const { triggerAmplifier } = await import('../../../src/systems/skills')
    state.player.bindings.set('a', 'amp_base_adjacent')
    state.player.skills.set('amp_base_adjacent', { level: 1 })
    state.player.enchantedSkills.set('amp_base_adjacent', 'ench_splash_adjacent')
    state.amplifierStacks.set('amp_base_adjacent', 0)

    // 相邻键 's' 绑定另一个增幅者
    state.player.bindings.set('s', 'amp_mult_adjacent')
    state.player.skills.set('amp_mult_adjacent', { level: 1 })
    state.amplifierStacks.set('amp_mult_adjacent', 0)

    triggerAmplifier('amp_base_adjacent', 'a')
    // 溅射不应触发增幅者，所以 amp_mult_adjacent 的叠层不变
    expect(state.amplifierStacks.get('amp_mult_adjacent')).toBe(0)
  })

  it('splash: _splashActive 防递归标志正常工作', async () => {
    const { triggerAmplifier } = await import('../../../src/systems/skills')
    // 增幅者 A 在 'a' 有 splash 附魔
    state.player.bindings.set('a', 'amp_base_adjacent')
    state.player.skills.set('amp_base_adjacent', { level: 1 })
    state.player.enchantedSkills.set('amp_base_adjacent', 'ench_splash_adjacent')
    state.amplifierStacks.set('amp_base_adjacent', 0)

    // 产出者 B 在 's' 也有 splash 附魔 — 被溅射触发时不应再次溅射
    state.player.bindings.set('s', 'prod_burst')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.enchantedSkills.set('prod_burst', 'ench_splash_adjacent')

    // 不应死循环，正常返回
    triggerAmplifier('amp_base_adjacent', 'a')
    expect(state.amplifierStacks.get('amp_base_adjacent')).toBe(1)
  })
})

// === Task 4: resonance 附魔自动叠层 ===

describe('checkResonanceTriggers — 增幅者自动叠层', () => {
  beforeEach(() => { resetState() })

  it('共鸣增幅者被邻居触发时自动叠层 +1', async () => {
    const { checkResonanceTriggers } = await import('../../../src/systems/skills')
    // 增幅者在 's', enchanted with resonance·adjacent (effectValue=0.5)
    state.player.bindings.set('s', 'amp_base_adjacent')
    state.player.skills.set('amp_base_adjacent', { level: 1 })
    state.player.enchantedSkills.set('amp_base_adjacent', 'ench_resonance_adjacent')
    state.amplifierStacks.set('amp_base_adjacent', 3)

    // 邻居键 'a' 有产出者被触发
    state.player.bindings.set('a', 'prod_burst')

    checkResonanceTriggers('a')
    // 增幅者应自动叠层: 3 + 1 = 4
    expect(state.amplifierStacks.get('amp_base_adjacent')).toBe(4)
  })

  it('共鸣自动叠层与手动叠层正确累积', async () => {
    const { triggerAmplifier, checkResonanceTriggers } = await import('../../../src/systems/skills')
    state.player.bindings.set('s', 'amp_base_adjacent')
    state.player.skills.set('amp_base_adjacent', { level: 1 })
    state.player.enchantedSkills.set('amp_base_adjacent', 'ench_resonance_adjacent')
    state.amplifierStacks.set('amp_base_adjacent', 0)

    state.player.bindings.set('a', 'prod_burst')

    // 手动叠层
    triggerAmplifier('amp_base_adjacent', 's')
    expect(state.amplifierStacks.get('amp_base_adjacent')).toBe(1)

    // 邻居触发导致共鸣自动叠层
    checkResonanceTriggers('a')
    expect(state.amplifierStacks.get('amp_base_adjacent')).toBe(2) // 1 + 1
  })
})

// === Task 5: transmutation 附魔双资源增幅 ===

describe('getAmplifierBonus — transmutation 双资源增幅', () => {
  beforeEach(() => { resetState() })

  it('变性附魔使增幅者同时增幅第二种资源类型', async () => {
    const { getAmplifierBonus } = await import('../../../src/systems/skills')
    // base 增幅者 + transmutation → score (effectValue=0.3)
    state.player.bindings.set('s', 'amp_base_adjacent')
    state.player.skills.set('amp_base_adjacent', { level: 1 })
    state.amplifierStacks.set('amp_base_adjacent', 10)
    state.player.enchantedSkills.set('amp_base_adjacent', 'ench_trans_score')

    // 产出者在 'a' (与 's' 相邻)
    state.player.bindings.set('a', 'prod_burst')

    // 对 base 产出者请求 score 增幅
    const result = getAmplifierBonus('prod_burst', 'a', 'score')
    // 10 stacks × 0.03 valuePerStack × 0.3 efficiency = 0.09 → mulBonus = 1.09
    expect(result.mulBonus).toBeCloseTo(1.09)
  })

  it('变性附魔不影响主资源增幅（100%效率不变）', async () => {
    const { getAmplifierBonus } = await import('../../../src/systems/skills')
    state.player.bindings.set('s', 'amp_base_adjacent')
    state.player.skills.set('amp_base_adjacent', { level: 1 })
    state.amplifierStacks.set('amp_base_adjacent', 10)
    state.player.enchantedSkills.set('amp_base_adjacent', 'ench_trans_score')

    state.player.bindings.set('a', 'prod_burst')

    // 主资源 base 仍然 100% 效率
    const result = getAmplifierBonus('prod_burst', 'a', 'base')
    expect(result.mulBonus).toBeCloseTo(1.3) // 1 + 10 × 0.03 × 1.0
  })

  it('无变性附魔时资源不匹配返回 mulBonus=1', async () => {
    const { getAmplifierBonus } = await import('../../../src/systems/skills')
    state.player.bindings.set('s', 'amp_base_adjacent')
    state.player.skills.set('amp_base_adjacent', { level: 1 })
    state.amplifierStacks.set('amp_base_adjacent', 10)
    // 无附魔

    state.player.bindings.set('a', 'prod_burst')

    // 请求 score 增幅，但增幅者是 base 且无变性附魔
    const result = getAmplifierBonus('prod_burst', 'a', 'score')
    expect(result.addBonus).toBe(0)
    expect(result.mulBonus).toBe(1)
  })

  it('变性附魔的双资源增幅走 mulBonus', async () => {
    const { getAmplifierBonus } = await import('../../../src/systems/skills')
    state.player.bindings.set('s', 'amp_base_adjacent')
    state.player.skills.set('amp_base_adjacent', { level: 1 })
    state.amplifierStacks.set('amp_base_adjacent', 20)
    state.player.enchantedSkills.set('amp_base_adjacent', 'ench_trans_score')

    state.player.bindings.set('a', 'prod_burst')

    // mulBonus = 1 + 20 × 0.03 × 0.3 = 1.18
    const result = getAmplifierBonus('prod_burst', 'a', 'score')
    expect(result.addBonus).toBe(0) // addBonus 始终为 0
    expect(result.mulBonus).toBeCloseTo(1.18)
  })
})
