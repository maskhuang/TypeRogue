// ============================================
// 打字肉鸽 - 增幅者附魔适配测试
// ============================================
// Story 23.6: 增幅者附魔适配

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

// === Task 1: 附魔门控验证（逻辑在 shop.ts，此处通过 skills 侧验证行为不变） ===

describe('triggerAmplifier — 无附魔时行为不变（回归）', () => {
  beforeEach(() => { resetState() })

  it('无附魔增幅者叠层 +1', async () => {
    const { triggerAmplifier } = await import('../../../src/systems/skills')
    state.player.bindings.set('a', 'amp_base_add_adjacent')
    state.player.skills.set('amp_base_add_adjacent', { level: 1 })
    state.amplifierStacks.set('amp_base_add_adjacent', 5)

    triggerAmplifier('amp_base_add_adjacent', 'a')
    expect(state.amplifierStacks.get('amp_base_add_adjacent')).toBe(6) // 5 + 1
  })
})

// === Task 2: amplify 附魔增加叠层增量 ===

describe('triggerAmplifier — amplify 附魔增加叠层增量', () => {
  beforeEach(() => { resetState() })

  it('amplify·adjacent: 2个相邻技能 → enchMult=1.4, 叠层+2', async () => {
    const { triggerAmplifier } = await import('../../../src/systems/skills')
    // 增幅者在 'a', enchanted with amplify·adjacent (effectValue=0.2)
    state.player.bindings.set('a', 'amp_base_add_adjacent')
    state.player.skills.set('amp_base_add_adjacent', { level: 1 })
    state.player.enchantedSkills.set('amp_base_add_adjacent', 'ench_amplify_adjacent')
    state.amplifierStacks.set('amp_base_add_adjacent', 0)

    // 2 个相邻技能绑定到 'a' 的邻居键：s, w
    state.player.bindings.set('s', 'prod_burst')
    state.player.bindings.set('w', 'prod_sustain')

    triggerAmplifier('amp_base_add_adjacent', 'a')
    // enchMult = 1 + 2 * 0.2 = 1.4, ceil(1.4) = 2
    expect(state.amplifierStacks.get('amp_base_add_adjacent')).toBe(2)
  })
})

// === Task 2: repulsion 附魔增加叠层增量 ===

describe('triggerAmplifier — repulsion 附魔增加叠层增量', () => {
  beforeEach(() => { resetState() })

  it('repulsion·adjacent: f 键 6 个空位邻居 → enchMult=2.5, 叠层+3', async () => {
    const { triggerAmplifier } = await import('../../../src/systems/skills')
    // 增幅者在 'f', enchanted with repulsion·adjacent (effectValue=0.25)
    // f 的相邻键: d, r, t, g, c, v — 全部空位
    state.player.bindings.set('f', 'amp_base_add_adjacent')
    state.player.skills.set('amp_base_add_adjacent', { level: 1 })
    state.player.enchantedSkills.set('amp_base_add_adjacent', 'ench_repulsion_adjacent')
    state.amplifierStacks.set('amp_base_add_adjacent', 0)

    triggerAmplifier('amp_base_add_adjacent', 'f')
    // enchMult = 1 + 6 * 0.25 = 2.5, ceil(2.5) = 3
    expect(state.amplifierStacks.get('amp_base_add_adjacent')).toBe(3)
  })
})

// === Task 3: splash 附魔触发范围内技能 ===

describe('triggerAmplifier — splash 附魔触发范围内技能', () => {
  beforeEach(() => { resetState() })

  it('splash·adjacent: 触发相邻产出者', async () => {
    const { triggerAmplifier } = await import('../../../src/systems/skills')
    // 增幅者在 'a', enchanted with splash·adjacent (effectValue=0.3)
    state.player.bindings.set('a', 'amp_base_add_adjacent')
    state.player.skills.set('amp_base_add_adjacent', { level: 1 })
    state.player.enchantedSkills.set('amp_base_add_adjacent', 'ench_splash_adjacent')
    state.amplifierStacks.set('amp_base_add_adjacent', 0)

    // 相邻产出者在 's'
    state.player.bindings.set('s', 'prod_burst')
    state.player.skills.set('prod_burst', { level: 1 })

    state.resources.base = 0
    triggerAmplifier('amp_base_add_adjacent', 'a')
    // 溅射应触发 prod_burst (减效30%): +5 * 0.3 = 1.5
    // triggerProducerWithReduction 直接加到 state.resources.base
    expect(state.resources.base).toBeCloseTo(1.5)
  })

  it('splash: 跳过相邻增幅者（不触发其他增幅者）', async () => {
    const { triggerAmplifier } = await import('../../../src/systems/skills')
    state.player.bindings.set('a', 'amp_base_add_adjacent')
    state.player.skills.set('amp_base_add_adjacent', { level: 1 })
    state.player.enchantedSkills.set('amp_base_add_adjacent', 'ench_splash_adjacent')
    state.amplifierStacks.set('amp_base_add_adjacent', 0)

    // 相邻键 's' 绑定另一个增幅者
    state.player.bindings.set('s', 'amp_base_mul_adjacent')
    state.player.skills.set('amp_base_mul_adjacent', { level: 1 })
    state.amplifierStacks.set('amp_base_mul_adjacent', 0)

    triggerAmplifier('amp_base_add_adjacent', 'a')
    // 溅射不应触发增幅者，所以 amp_base_mul_adjacent 的叠层不变
    expect(state.amplifierStacks.get('amp_base_mul_adjacent')).toBe(0)
  })

  it('splash: _splashActive 防递归标志正常工作', async () => {
    const { triggerAmplifier } = await import('../../../src/systems/skills')
    // 增幅者 A 在 'a' 有 splash 附魔
    state.player.bindings.set('a', 'amp_base_add_adjacent')
    state.player.skills.set('amp_base_add_adjacent', { level: 1 })
    state.player.enchantedSkills.set('amp_base_add_adjacent', 'ench_splash_adjacent')
    state.amplifierStacks.set('amp_base_add_adjacent', 0)

    // 产出者 B 在 's' 也有 splash 附魔 — 被溅射触发时不应再次溅射
    state.player.bindings.set('s', 'prod_burst')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.enchantedSkills.set('prod_burst', 'ench_splash_adjacent')

    // 不应死循环，正常返回
    triggerAmplifier('amp_base_add_adjacent', 'a')
    expect(state.amplifierStacks.get('amp_base_add_adjacent')).toBe(1)
  })
})

// === Task 4: resonance 附魔自动叠层 ===

describe('checkResonanceTriggers — 增幅者自动叠层', () => {
  beforeEach(() => { resetState() })

  it('共鸣增幅者被邻居触发时自动叠层 +1', async () => {
    const { checkResonanceTriggers } = await import('../../../src/systems/skills')
    // 增幅者在 's', enchanted with resonance·adjacent (effectValue=0.5)
    state.player.bindings.set('s', 'amp_base_add_adjacent')
    state.player.skills.set('amp_base_add_adjacent', { level: 1 })
    state.player.enchantedSkills.set('amp_base_add_adjacent', 'ench_resonance_adjacent')
    state.amplifierStacks.set('amp_base_add_adjacent', 3)

    // 邻居键 'a' 有产出者被触发
    state.player.bindings.set('a', 'prod_burst')

    checkResonanceTriggers('a')
    // 增幅者应自动叠层: 3 + 1 = 4
    expect(state.amplifierStacks.get('amp_base_add_adjacent')).toBe(4)
  })

  it('共鸣自动叠层与手动叠层正确累积', async () => {
    const { triggerAmplifier, checkResonanceTriggers } = await import('../../../src/systems/skills')
    state.player.bindings.set('s', 'amp_base_add_adjacent')
    state.player.skills.set('amp_base_add_adjacent', { level: 1 })
    state.player.enchantedSkills.set('amp_base_add_adjacent', 'ench_resonance_adjacent')
    state.amplifierStacks.set('amp_base_add_adjacent', 0)

    state.player.bindings.set('a', 'prod_burst')

    // 手动叠层 (注意: resonance 走 getEnchantmentMultiplier 返回 1，因为 spatialType=resonance 不在 amplify/repulsion 分支)
    triggerAmplifier('amp_base_add_adjacent', 's')
    expect(state.amplifierStacks.get('amp_base_add_adjacent')).toBe(1) // +1 (enchMult=1)

    // 邻居触发导致共鸣自动叠层
    checkResonanceTriggers('a')
    expect(state.amplifierStacks.get('amp_base_add_adjacent')).toBe(2) // 1 + 1
  })
})

// === Task 5: transmutation 附魔双资源增幅 ===

describe('getAmplifierBonus — transmutation 双资源增幅', () => {
  beforeEach(() => { resetState() })

  it('变性附魔使增幅者同时增幅第二种资源类型', async () => {
    const { getAmplifierBonus } = await import('../../../src/systems/skills')
    // base 增幅者 + transmutation → score (effectValue=0.3)
    state.player.bindings.set('s', 'amp_base_add_adjacent')
    state.player.skills.set('amp_base_add_adjacent', { level: 1 })
    state.amplifierStacks.set('amp_base_add_adjacent', 10)
    state.player.enchantedSkills.set('amp_base_add_adjacent', 'ench_trans_score')

    // 产出者在 'a' (与 's' 相邻)
    state.player.bindings.set('a', 'prod_burst')

    // 对 base 产出者请求 score 增幅
    const result = getAmplifierBonus('prod_burst', 'a', 'score')
    // 10 stacks × 1 valuePerStack × 0.3 efficiency = 3
    expect(result.addBonus).toBeCloseTo(3)
  })

  it('变性附魔不影响主资源增幅（100%效率不变）', async () => {
    const { getAmplifierBonus } = await import('../../../src/systems/skills')
    state.player.bindings.set('s', 'amp_base_add_adjacent')
    state.player.skills.set('amp_base_add_adjacent', { level: 1 })
    state.amplifierStacks.set('amp_base_add_adjacent', 10)
    state.player.enchantedSkills.set('amp_base_add_adjacent', 'ench_trans_score')

    state.player.bindings.set('a', 'prod_burst')

    // 主资源 base 仍然 100% 效率
    const result = getAmplifierBonus('prod_burst', 'a', 'base')
    expect(result.addBonus).toBe(10) // 10 × 1 × 1.0
  })

  it('无变性附魔时资源不匹配返回 0', async () => {
    const { getAmplifierBonus } = await import('../../../src/systems/skills')
    state.player.bindings.set('s', 'amp_base_add_adjacent')
    state.player.skills.set('amp_base_add_adjacent', { level: 1 })
    state.amplifierStacks.set('amp_base_add_adjacent', 10)
    // 无附魔

    state.player.bindings.set('a', 'prod_burst')

    // 请求 score 增幅，但增幅者是 base 且无变性附魔
    const result = getAmplifierBonus('prod_burst', 'a', 'score')
    expect(result.addBonus).toBe(0)
  })

  it('乘法增幅者也支持变性双资源', async () => {
    const { getAmplifierBonus } = await import('../../../src/systems/skills')
    state.player.bindings.set('s', 'amp_base_mul_adjacent')
    state.player.skills.set('amp_base_mul_adjacent', { level: 1 })
    state.amplifierStacks.set('amp_base_mul_adjacent', 10)
    state.player.enchantedSkills.set('amp_base_mul_adjacent', 'ench_trans_score')

    state.player.bindings.set('a', 'prod_burst')

    // 乘法增幅: mulBonus = 1 + 10 × 0.05 × 0.3 = 1.15
    const result = getAmplifierBonus('prod_burst', 'a', 'score')
    expect(result.mulBonus).toBeCloseTo(1.15)
  })
})

