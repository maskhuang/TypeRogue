// ============================================
// 打字肉鸽 - 产出者触发逻辑测试
// ============================================
// Story 19.2: Task 2, 5 — 触发 + 资源修改

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
vi.mock('../../../src/systems/battle', () => ({
  showFeedback: vi.fn(),
  updateHUD: vi.fn(),
  setPseudoInfiniteVisual: vi.fn(),
}))

// Mock DOM for showTriggerPopup
beforeEach(() => {
  const mockEl = { className: '', innerHTML: '', style: { left: '' }, remove: vi.fn() }
  vi.stubGlobal('document', { createElement: () => mockEl })
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('triggerProducer — +N 加法产出者', () => {
  beforeEach(() => {
    resetState()
  })

  it('prod_burst: base += 5 (Lv1)', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.resources.base = 10
    triggerProducer('prod_burst')
    expect(state.resources.base).toBe(15) // 10 + 5
  })

  it('prod_burst: base += 8 (Lv2)', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 2 })
    state.resources.base = 10
    triggerProducer('prod_burst')
    expect(state.resources.base).toBe(18) // 10 + 8
  })

  it('prod_burst: base += 12 (Lv3)', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 3 })
    state.resources.base = 10
    triggerProducer('prod_burst')
    expect(state.resources.base).toBe(22) // 10 + 12
  })

  it('prod_loot: score += 15 并立刻结算到 state.score', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_loot', { level: 1 })
    state.resources.score = 0
    state.score = 50
    triggerProducer('prod_loot')
    expect(state.resources.score).toBe(15)
    expect(state.score).toBe(65) // 50 + 15
  })

  it('prod_boost: multiplier += 0.2', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_boost', { level: 1 })
    state.multiplier = 1.0
    triggerProducer('prod_boost')
    expect(state.multiplier).toBeCloseTo(1.2)
    expect(state.resources.multiplier).toBeCloseTo(1.2) // proxy 同步
  })

  it('prod_freeze: time += 2, clamp to timeMax×2', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_freeze', { level: 1 })
    state.timeMax = 30
    state.time = 55
    triggerProducer('prod_freeze')
    expect(state.time).toBe(57) // 55 + 2
    expect(state.resources.time).toBe(57)
  })

  it('prod_freeze: time clamp 不超过 timeMax×2', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_freeze', { level: 1 })
    state.timeMax = 30
    state.time = 59
    triggerProducer('prod_freeze')
    expect(state.time).toBe(60) // clamp to 30×2=60
  })

  it('prod_shield: shield += 1', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_shield', { level: 1 })
    state.resources.shield = 2
    triggerProducer('prod_shield')
    expect(state.resources.shield).toBe(3)
  })
})

describe('triggerProducer — ×N 乘法产出者', () => {
  beforeEach(() => {
    resetState()
  })

  it('prod_focus: base *= 2 (Lv1)', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_focus', { level: 1 })
    state.resources.base = 10
    triggerProducer('prod_focus')
    expect(state.resources.base).toBe(20) // 10 × 2
  })

  it('prod_focus: base *= 2.3 (Lv2)', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_focus', { level: 2 })
    state.resources.base = 10
    triggerProducer('prod_focus')
    expect(state.resources.base).toBeCloseTo(23) // 10 × 2.3
  })

  it('prod_crit: score *= 1.1 并立刻结算增量到 state.score', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_crit', { level: 1 })
    state.resources.score = 100
    state.score = 200
    triggerProducer('prod_crit')
    expect(state.resources.score).toBeCloseTo(110) // 100 × 1.1
    expect(state.score).toBeCloseTo(210) // 200 + (110 - 100)
  })

  it('prod_frenzy: multiplier *= 1.15', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_frenzy', { level: 1 })
    state.multiplier = 2.0
    triggerProducer('prod_frenzy')
    expect(state.multiplier).toBeCloseTo(2.3) // 2.0 × 1.15
    expect(state.resources.multiplier).toBeCloseTo(2.3) // proxy 同步
  })

  it('prod_eternal: time *= 1.2, clamp to timeMax×2', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_eternal', { level: 1 })
    state.timeMax = 30
    state.time = 25
    triggerProducer('prod_eternal')
    expect(state.time).toBeCloseTo(30) // 25 × 1.2 = 30
  })

  it('prod_eternal: time clamp 不超过 timeMax×2', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_eternal', { level: 1 })
    state.timeMax = 30
    state.time = 55
    triggerProducer('prod_eternal')
    expect(state.time).toBe(60) // 55×1.2=66 → clamp 60
  })

  it('prod_fortress: shield *= 2, floor 取整', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_fortress', { level: 1 })
    state.resources.shield = 3
    triggerProducer('prod_fortress')
    expect(state.resources.shield).toBe(6) // 3 × 2
  })

  it('prod_fortress: shield ×2.3 floor', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_fortress', { level: 2 })
    state.resources.shield = 3
    triggerProducer('prod_fortress')
    expect(state.resources.shield).toBe(6) // floor(3 × 2.3) = floor(6.9) = 6
  })
})

describe('triggerProducer — ×N 当前值为 0', () => {
  beforeEach(() => {
    resetState()
  })

  it('base=0 × 2 = 0（正常行为）', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_focus', { level: 1 })
    state.resources.base = 0
    triggerProducer('prod_focus')
    expect(state.resources.base).toBe(0)
  })

  it('shield=0 × 2 = 0（正常行为）', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_fortress', { level: 1 })
    state.resources.shield = 0
    triggerProducer('prod_fortress')
    expect(state.resources.shield).toBe(0)
  })
})

describe('triggerSkill 产出者分流', () => {
  beforeEach(() => {
    resetState()
  })

  it('产出者 ID 走 triggerProducer 路径', async () => {
    const { triggerSkill } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('a', 'prod_burst')
    state.resources.base = 0
    triggerSkill('prod_burst')
    expect(state.resources.base).toBe(5) // 产出者触发了
  })

  it('wordSkillCount 在产出者触发后递增', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    synergy.wordSkillCount = 2
    triggerProducer('prod_burst')
    expect(synergy.wordSkillCount).toBe(3)
  })
})
