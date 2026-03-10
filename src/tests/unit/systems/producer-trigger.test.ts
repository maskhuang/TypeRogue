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
  emitResourceSound: vi.fn(),
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
    synergy.skillBaseScore = 0
    triggerProducer('prod_burst')
    expect(synergy.skillBaseScore).toBe(5) // +5
  })

  it('prod_burst: base += 8 (Lv2)', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 2 })
    synergy.skillBaseScore = 0
    triggerProducer('prod_burst')
    expect(synergy.skillBaseScore).toBe(8) // +8
  })

  it('prod_burst: base += 12 (Lv3)', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 3 })
    synergy.skillBaseScore = 0
    triggerProducer('prod_burst')
    expect(synergy.skillBaseScore).toBe(12) // +12
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
    synergy.skillMultBonus = 0
    triggerProducer('prod_boost')
    expect(synergy.skillMultBonus).toBeCloseTo(0.2)
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

  it('prod_freeze: time 无上限', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_freeze', { level: 1 })
    state.timeMax = 30
    state.time = 59
    triggerProducer('prod_freeze')
    expect(state.time).toBe(61) // 59 + 2, 无上限
  })

})

describe('triggerProducer — ×N 乘法产出者', () => {
  beforeEach(() => {
    resetState()
  })

  it('prod_focus: base ×2 → delta = resources.base × (2-1) (Lv1)', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_focus', { level: 1 })
    state.resources.base = 10
    triggerProducer('prod_focus')
    // delta = 10 × (2 - 1) = 10
    expect(synergy.skillBaseScore).toBe(10)
  })

  it('prod_focus: base ×2.3 → delta = resources.base × (2.3-1) (Lv2)', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_focus', { level: 2 })
    state.resources.base = 10
    triggerProducer('prod_focus')
    // delta = 10 × (2.3 - 1) = 13
    expect(synergy.skillBaseScore).toBeCloseTo(13)
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

  it('prod_frenzy: mult ×1.15 → delta = state.multiplier × (1.15-1)', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_frenzy', { level: 1 })
    state.multiplier = 2.0
    triggerProducer('prod_frenzy')
    // delta = 2.0 × (1.15 - 1) = 0.3
    expect(synergy.skillMultBonus).toBeCloseTo(0.3)
  })

  it('prod_eternal: time *= 1.2, clamp to timeMax×2', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_eternal', { level: 1 })
    state.timeMax = 30
    state.time = 25
    triggerProducer('prod_eternal')
    expect(state.time).toBeCloseTo(30) // 25 × 1.2 = 30
  })

  it('prod_eternal: time 无上限', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_eternal', { level: 1 })
    state.timeMax = 30
    state.time = 55
    triggerProducer('prod_eternal')
    expect(state.time).toBeCloseTo(66) // 55×1.2=66, 无上限
  })

})

describe('triggerProducer — ×N 当前值为 0', () => {
  beforeEach(() => {
    resetState()
  })

  it('skillBaseScore=0 × 2 = 0（正常行为）', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_focus', { level: 1 })
    synergy.skillBaseScore = 0
    triggerProducer('prod_focus')
    expect(synergy.skillBaseScore).toBe(0)
  })
})

describe('triggerProducer — 碎片产出者 + base_score 附带', () => {
  beforeEach(() => {
    resetState()
  })

  it('prod_harvest: fragment +1 (Lv1) 并附带 skillBaseScore += 1', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_harvest', { level: 1 })
    state.classId = 'wordsmith'
    synergy.skillBaseScore = 0
    triggerProducer('prod_harvest')
    // 碎片产出者附带固定 +1 base（不随等级缩放）
    expect(synergy.skillBaseScore).toBe(1)
    // 碎片路由到 classResourceProduced
    expect(state.classResourceProduced.fragment).toBeGreaterThan(0)
  })

  it('prod_harvest Lv3: skillBaseScore 仍为 +1（不随等级缩放）', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_harvest', { level: 3 })
    state.classId = 'wordsmith'
    synergy.skillBaseScore = 0
    triggerProducer('prod_harvest')
    expect(synergy.skillBaseScore).toBe(1) // 固定 +1，与等级无关
  })

  it('prod_refine: ×N 碎片也附带 skillBaseScore += 1', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_refine', { level: 1 })
    state.classId = 'wordsmith'
    state.resources.fragment = 5 // 需要有碎片基数才能乘
    synergy.skillBaseScore = 0
    triggerProducer('prod_refine')
    expect(synergy.skillBaseScore).toBe(1) // 固定 +1
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
    synergy.skillBaseScore = 0
    triggerSkill('prod_burst')
    expect(synergy.skillBaseScore).toBe(5) // 产出者触发了
  })

  it('wordSkillCount 在产出者触发后递增', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    synergy.wordSkillCount = 2
    triggerProducer('prod_burst')
    expect(synergy.wordSkillCount).toBe(3)
  })
})
