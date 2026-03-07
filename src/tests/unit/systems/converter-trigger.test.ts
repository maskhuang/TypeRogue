// ============================================
// 转化者触发逻辑测试
// Story 19.4: AC3, AC4, AC5, AC6, AC8, AC9, AC10, AC11
// ============================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { state, synergy, resetState } from '../../../src/core/state'
import { CONVERTERS } from '../../../src/data/converters'

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

describe('triggerConverter — 加法公式 (AC3)', () => {
  beforeEach(() => {
    resetState()
  })

  it('base→score add: target += sourceVal × k', async () => {
    const { triggerConverter } = await import('../../../src/systems/skills')
    state.player.skills.set('conv_base_score_add', { level: 1 })
    state.resources.base = 15
    state.resources.score = 0
    state.score = 100
    triggerConverter('conv_base_score_add')
    // target += 15 × 1.0 = 15
    expect(state.resources.score).toBeCloseTo(15)
    expect(state.score).toBeCloseTo(115) // 100 + 15
  })

  it('base→multiplier add: skillMultBonus += base × k', async () => {
    const { triggerConverter } = await import('../../../src/systems/skills')
    state.player.skills.set('conv_base_mult_add', { level: 1 })
    state.resources.base = 15
    synergy.skillMultBonus = 0
    triggerConverter('conv_base_mult_add')
    // skillMultBonus += 15 × 0.02 = 0.3
    expect(synergy.skillMultBonus).toBeCloseTo(0.3)
  })

  it('base→time add: time += base × k, clamp to timeMax×2', async () => {
    const { triggerConverter } = await import('../../../src/systems/skills')
    state.player.skills.set('conv_base_time_add', { level: 1 })
    state.resources.base = 15
    state.timeMax = 30
    state.time = 50
    triggerConverter('conv_base_time_add')
    // time += 15 × 0.15 = 2.25 → 52.25, within 60 limit
    expect(state.time).toBeCloseTo(52.25)
  })

})

describe('triggerConverter — 乘法公式 (AC4)', () => {
  beforeEach(() => {
    resetState()
  })

  it('base→score mul: pendingScore = base×mult+score, delta = pendingScore × (factor-1)', async () => {
    const { triggerConverter } = await import('../../../src/systems/skills')
    state.player.skills.set('conv_base_score_mul', { level: 1 })
    state.resources.base = 15
    state.resources.multiplier = 1.0
    state.resources.score = 100
    state.score = 200
    triggerConverter('conv_base_score_mul')
    // factor = 1 + 15 × 0.005 = 1.075
    // pendingScore = 15 × 1.0 + 100 = 115
    // delta = 115 × 0.075 = 8.625
    expect(state.resources.score).toBeCloseTo(108.625)
    expect(state.score).toBeCloseTo(208.625)
  })

  it('base→multiplier mul: skillMultBonus += multiplier × base × k', async () => {
    const { triggerConverter } = await import('../../../src/systems/skills')
    state.player.skills.set('conv_base_mult_mul', { level: 1 })
    state.resources.base = 15
    state.multiplier = 2.0
    synergy.skillMultBonus = 0
    triggerConverter('conv_base_mult_mul')
    // delta = 2.0 × 15 × 0.008 = 0.24
    expect(synergy.skillMultBonus).toBeCloseTo(0.24)
  })

})

describe('triggerConverter — 不消耗源资源 (AC5)', () => {
  beforeEach(() => {
    resetState()
  })

  it('base→score: base 值不变', async () => {
    const { triggerConverter } = await import('../../../src/systems/skills')
    state.player.skills.set('conv_base_score_add', { level: 1 })
    state.resources.base = 15
    state.resources.score = 0
    state.score = 0
    triggerConverter('conv_base_score_add')
    expect(state.resources.base).toBe(15) // 不消耗
  })

  it('multiplier→score: multiplier 值不变', async () => {
    const { triggerConverter } = await import('../../../src/systems/skills')
    state.player.skills.set('conv_mult_score_add', { level: 1 })
    state.multiplier = 2.0
    state.resources.score = 0
    state.score = 0
    triggerConverter('conv_mult_score_add')
    expect(state.multiplier).toBeCloseTo(2.0) // 不消耗
  })

})

describe('triggerConverter — Lv 成长 (AC6)', () => {
  beforeEach(() => {
    resetState()
  })

  it('Lv1: k × 1.0', async () => {
    const { triggerConverter } = await import('../../../src/systems/skills')
    state.player.skills.set('conv_base_score_add', { level: 1 })
    state.resources.base = 10
    state.resources.score = 0
    state.score = 0
    triggerConverter('conv_base_score_add')
    expect(state.resources.score).toBeCloseTo(10) // 10 × 1.0 × 1.0
  })

  it('Lv2: k × 1.5', async () => {
    const { triggerConverter } = await import('../../../src/systems/skills')
    state.player.skills.set('conv_base_score_add', { level: 2 })
    state.resources.base = 10
    state.resources.score = 0
    state.score = 0
    triggerConverter('conv_base_score_add')
    expect(state.resources.score).toBeCloseTo(15) // 10 × 1.0 × 1.5
  })

  it('Lv3: k × 2.0', async () => {
    const { triggerConverter } = await import('../../../src/systems/skills')
    state.player.skills.set('conv_base_score_add', { level: 3 })
    state.resources.base = 10
    state.resources.score = 0
    state.score = 0
    triggerConverter('conv_base_score_add')
    expect(state.resources.score).toBeCloseTo(20) // 10 × 1.0 × 2.0
  })
})

describe('triggerConverter — 分数为源特殊逻辑 (AC8)', () => {
  beforeEach(() => {
    resetState()
  })

  it('分数为源: 读取 score + base × multiplier', async () => {
    const { triggerConverter } = await import('../../../src/systems/skills')
    state.player.skills.set('conv_score_base_add', { level: 1 })
    state.resources.score = 800
    state.resources.base = 15
    state.multiplier = 2.0
    synergy.skillBaseScore = 0
    triggerConverter('conv_score_base_add')
    // sourceVal = 800 + 15 × 2.0 = 830
    // skillBaseScore += 830 × 0.006 = 4.98
    expect(synergy.skillBaseScore).toBeCloseTo(4.98)
  })

  it('分数为源 multiply: 读取累计得分', async () => {
    const { triggerConverter } = await import('../../../src/systems/skills')
    state.player.skills.set('conv_score_mult_mul', { level: 1 })
    state.resources.score = 800
    state.resources.base = 15
    state.multiplier = 2.0
    synergy.skillMultBonus = 0
    triggerConverter('conv_score_mult_mul')
    // sourceVal = 830
    // delta = multiplier × sourceVal × k = 2.0 × 830 × 0.00012 = 0.1992
    expect(synergy.skillMultBonus).toBeCloseTo(0.1992)
  })
})

describe('triggerConverter — 时间无上限 (AC11)', () => {
  beforeEach(() => {
    resetState()
  })

  it('时间无上限', async () => {
    const { triggerConverter } = await import('../../../src/systems/skills')
    state.player.skills.set('conv_base_time_add', { level: 3 })
    state.resources.base = 100  // large base
    state.timeMax = 30
    state.time = 55
    triggerConverter('conv_base_time_add')
    // time += 100 × 0.15 × 2.0 = 30 → 85, 无上限
    expect(state.time).toBeCloseTo(85)
  })
})

describe('triggerSkill 转化者分流 (AC10)', () => {
  beforeEach(() => {
    resetState()
  })

  it('转化者 ID 走 triggerConverter 路径', async () => {
    const { triggerSkill } = await import('../../../src/systems/skills')
    state.player.skills.set('conv_base_score_add', { level: 1 })
    state.player.bindings.set('a', 'conv_base_score_add')
    state.resources.base = 15
    state.resources.score = 0
    state.score = 0
    triggerSkill('conv_base_score_add')
    expect(state.resources.score).toBeCloseTo(15) // 转化者触发了
  })

  it('wordSkillCount 在转化者触发后递增', async () => {
    const { triggerConverter } = await import('../../../src/systems/skills')
    state.player.skills.set('conv_base_score_add', { level: 1 })
    synergy.wordSkillCount = 2
    triggerConverter('conv_base_score_add')
    expect(synergy.wordSkillCount).toBe(3)
  })
})

describe('triggerConverter — 源值为 0 时的边界行为', () => {
  beforeEach(() => {
    resetState()
  })

  it('base=0 加法: target 不变', async () => {
    const { triggerConverter } = await import('../../../src/systems/skills')
    state.player.skills.set('conv_base_score_add', { level: 1 })
    state.resources.base = 0
    state.resources.score = 50
    state.score = 100
    triggerConverter('conv_base_score_add')
    // 0 × 1.0 = 0 → score 不变
    expect(state.resources.score).toBeCloseTo(50)
    expect(state.score).toBeCloseTo(100)
  })

  it('base=0 乘法: target 不变', async () => {
    const { triggerConverter } = await import('../../../src/systems/skills')
    state.player.skills.set('conv_base_score_mul', { level: 1 })
    state.resources.base = 0
    state.resources.score = 50
    state.score = 100
    triggerConverter('conv_base_score_mul')
    // score *= (1 + 0 × 0.005) = × 1 → 不变
    expect(state.resources.score).toBeCloseTo(50)
    expect(state.score).toBeCloseTo(100)
  })
})

describe('triggerConverter — 无效 ID 安全 no-op', () => {
  beforeEach(() => {
    resetState()
  })

  it('不存在的 converter ID 不崩溃', async () => {
    const { triggerConverter } = await import('../../../src/systems/skills')
    state.resources.base = 10
    state.resources.score = 50
    state.score = 100
    triggerConverter('nonexistent')
    // 所有资源不变
    expect(state.resources.base).toBe(10)
    expect(state.resources.score).toBeCloseTo(50)
    expect(state.score).toBeCloseTo(100)
  })
})

describe('converterPool — 技能池抽取 (AC7)', () => {
  it('state.converterPool 初始为空数组', () => {
    resetState()
    expect(state.converterPool).toEqual([])
  })
})
