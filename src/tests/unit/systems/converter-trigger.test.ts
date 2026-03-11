// ============================================
// 转化者触发逻辑测试
// Story 19.4 → Story 34.3: 乘算移入 ench_multiply 附魔
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

describe('triggerConverter — 加法公式', () => {
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

  it('base→time add: time += base × k', async () => {
    const { triggerConverter } = await import('../../../src/systems/skills')
    state.player.skills.set('conv_base_time_add', { level: 1 })
    state.resources.base = 15
    state.timeMax = 30
    state.time = 50
    triggerConverter('conv_base_time_add')
    // time += 15 × 0.15 = 2.25 → 52.25
    expect(state.time).toBeCloseTo(52.25)
  })
})

describe('triggerConverter — 不消耗源资源', () => {
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

describe('triggerConverter — Lv 成长', () => {
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

describe('triggerConverter — 分数为源特殊逻辑', () => {
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
})

describe('triggerConverter — ench_multiply 乘算化附魔（Story 34.3）', () => {
  beforeEach(() => {
    resetState()
  })

  it('加算转化者 + ench_multiply → 乘算公式', async () => {
    const { triggerConverter } = await import('../../../src/systems/skills')
    state.player.skills.set('conv_base_score_add', { level: 1 })
    state.player.enchantedSkills.set('conv_base_score_add', 'ench_multiply')
    state.resources.base = 15
    state.resources.multiplier = 1.0
    state.resources.score = 100
    state.score = 200
    triggerConverter('conv_base_score_add')
    // effectiveFormula = 'multiply', effectiveK = converterMultiplyK[base_score] = 0.005
    // factor = 1 + 15 × 0.005 = 1.075
    // pendingScore = 15 × 1.0 + 100 = 115
    // delta = 115 × 0.075 = 8.625
    expect(state.resources.score).toBeCloseTo(108.625)
    expect(state.score).toBeCloseTo(208.625)
  })

  it('加算转化者 + ench_multiply → base 目标乘算', async () => {
    const { triggerConverter } = await import('../../../src/systems/skills')
    state.player.skills.set('conv_score_base_add', { level: 1 })
    state.player.enchantedSkills.set('conv_score_base_add', 'ench_multiply')
    state.resources.base = 10
    state.resources.score = 800
    state.multiplier = 2.0
    synergy.skillBaseScore = 0
    triggerConverter('conv_score_base_add')
    // effectiveK = converterMultiplyK[score_base] = 0.0006
    // sourceVal = 800 + 10 × 2.0 = 820
    // delta = base × sourceVal × effectiveK × totalMult = 10 × 820 × 0.0006 × 1 = 4.92
    expect(synergy.skillBaseScore).toBeCloseTo(4.92)
  })

  it('加算转化者 + ench_multiply → multiplier 目标乘算', async () => {
    const { triggerConverter } = await import('../../../src/systems/skills')
    state.player.skills.set('conv_base_mult_add', { level: 1 })
    state.player.enchantedSkills.set('conv_base_mult_add', 'ench_multiply')
    state.resources.base = 15
    state.multiplier = 2.0
    synergy.skillMultBonus = 0
    triggerConverter('conv_base_mult_add')
    // effectiveK = converterMultiplyK[base_multiplier] = 0.008
    // delta = multiplier × sourceVal × effectiveK × totalMult = 2.0 × 15 × 0.008 × 1 = 0.24
    expect(synergy.skillMultBonus).toBeCloseTo(0.24)
  })

  it('Lv2 + ench_multiply → k 值随等级成长', async () => {
    const { triggerConverter } = await import('../../../src/systems/skills')
    state.player.skills.set('conv_base_score_add', { level: 2 })
    state.player.enchantedSkills.set('conv_base_score_add', 'ench_multiply')
    state.resources.base = 15
    state.resources.multiplier = 1.0
    state.resources.score = 100
    state.score = 200
    triggerConverter('conv_base_score_add')
    // effectiveK = converterMultiplyK[base_score] × growthFactor[Lv2] = 0.005 × 1.5 = 0.0075
    // factor = 1 + 15 × 0.0075 = 1.1125
    // pendingScore = 15 × 1.0 + 100 = 115
    // delta = 115 × 0.1125 = 12.9375
    expect(state.resources.score).toBeCloseTo(112.9375)
    expect(state.score).toBeCloseTo(212.9375)
  })

  it('无 ench_multiply 附魔时走正常加算路径', async () => {
    const { triggerConverter } = await import('../../../src/systems/skills')
    state.player.skills.set('conv_base_score_add', { level: 1 })
    // 无附魔
    state.resources.base = 15
    state.resources.score = 0
    state.score = 100
    triggerConverter('conv_base_score_add')
    // add: delta = 15 × 1.0 = 15
    expect(state.resources.score).toBeCloseTo(15)
    expect(state.score).toBeCloseTo(115)
  })
})

describe('triggerConverter — 时间无上限', () => {
  beforeEach(() => {
    resetState()
  })

  it('时间无上限', async () => {
    const { triggerConverter } = await import('../../../src/systems/skills')
    state.player.skills.set('conv_base_time_add', { level: 3 })
    state.resources.base = 100
    state.timeMax = 30
    state.time = 55
    triggerConverter('conv_base_time_add')
    // time += 100 × 0.15 × 2.0 = 30 → 85
    expect(state.time).toBeCloseTo(85)
  })
})

describe('triggerSkill 转化者分流', () => {
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
    expect(state.resources.score).toBeCloseTo(15)
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
    expect(state.resources.score).toBeCloseTo(50)
    expect(state.score).toBeCloseTo(100)
  })

  it('base=0 ench_multiply 乘法: target 不变', async () => {
    const { triggerConverter } = await import('../../../src/systems/skills')
    state.player.skills.set('conv_base_score_add', { level: 1 })
    state.player.enchantedSkills.set('conv_base_score_add', 'ench_multiply')
    state.resources.base = 0
    state.resources.score = 50
    state.score = 100
    triggerConverter('conv_base_score_add')
    // multiply: score *= (1 + 0 × 0.005) = ×1 → 不变
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
    expect(state.resources.base).toBe(10)
    expect(state.resources.score).toBeCloseTo(50)
    expect(state.score).toBeCloseTo(100)
  })
})

describe('converterPool — 技能池抽取', () => {
  it('state.converterPool 初始为空数组', () => {
    resetState()
    expect(state.converterPool).toEqual([])
  })
})
