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

describe('triggerConverter — 同源转化者（Story 34.4）', () => {
  beforeEach(() => {
    resetState()
  })

  it('base→base add: skillBaseScore += base × k', async () => {
    const { triggerConverter } = await import('../../../src/systems/skills')
    state.player.skills.set('conv_base_base_add', { level: 1 })
    state.resources.base = 15
    synergy.skillBaseScore = 0
    triggerConverter('conv_base_base_add')
    // target=base → skillBaseScore += 15 × 0.03 = 0.45
    expect(synergy.skillBaseScore).toBeCloseTo(0.45)
  })

  it('score→score add: score += sourceVal × k', async () => {
    const { triggerConverter } = await import('../../../src/systems/skills')
    state.player.skills.set('conv_score_score_add', { level: 1 })
    state.resources.score = 500
    state.resources.base = 10
    state.multiplier = 1.0
    state.score = 600
    triggerConverter('conv_score_score_add')
    // sourceVal = 500 + 10 × 1.0 = 510
    // delta = 510 × 0.0008 = 0.408
    expect(state.resources.score).toBeCloseTo(500.408)
    expect(state.score).toBeCloseTo(600.408)
  })

  it('mult→mult add: skillMultBonus += mult × k', async () => {
    const { triggerConverter } = await import('../../../src/systems/skills')
    state.player.skills.set('conv_mult_mult_add', { level: 1 })
    state.multiplier = 2.0
    synergy.skillMultBonus = 0
    triggerConverter('conv_mult_mult_add')
    // delta = 2.0 × 0.15 = 0.30
    expect(synergy.skillMultBonus).toBeCloseTo(0.30)
  })

  it('同源转化者不消耗源资源', async () => {
    const { triggerConverter } = await import('../../../src/systems/skills')
    state.player.skills.set('conv_base_base_add', { level: 1 })
    state.resources.base = 15
    synergy.skillBaseScore = 0
    triggerConverter('conv_base_base_add')
    expect(state.resources.base).toBe(15)
  })

  it('同源转化者 + ench_multiply → 降级为 add（不走乘算）', async () => {
    const { triggerConverter } = await import('../../../src/systems/skills')
    state.player.skills.set('conv_base_base_add', { level: 1 })
    state.player.enchantedSkills.set('conv_base_base_add', 'ench_multiply')
    state.resources.base = 15
    synergy.skillBaseScore = 0
    triggerConverter('conv_base_base_add')
    // converterMultiplyK 无 base_base 键 → 降级为 add
    // delta = 15 × 0.03 = 0.45
    expect(synergy.skillBaseScore).toBeCloseTo(0.45)
  })

  it('fragment→fragment: 读 classResourceProduced 写回 classResourceProduced', async () => {
    const { triggerConverter } = await import('../../../src/systems/skills')
    state.classId = 'wordsmith'
    state.player.skills.set('conv_fragment_fragment_add', { level: 1 })
    state.classResourceProduced = { fragment: 10 }
    state.resources.fragment = 0
    triggerConverter('conv_fragment_fragment_add')
    // sourceVal = classResourceProduced.fragment = 10
    // delta = 10 × 0.03 = 0.3
    // routeFragmentsToInventory → classResourceProduced.fragment += 0.3
    expect(state.classResourceProduced.fragment).toBeCloseTo(10.3)
  })

  it('mutagen→mutagen: 读 classResourceProduced 写回 classResourceProduced', async () => {
    const { triggerConverter } = await import('../../../src/systems/skills')
    state.classId = 'metamorph'
    state.player.skills.set('conv_mutagen_mutagen_add', { level: 1 })
    state.classResourceProduced = { mutagen: 8 }
    state.resources.mutagen = 0
    triggerConverter('conv_mutagen_mutagen_add')
    // sourceVal = classResourceProduced.mutagen = 8
    // delta = 8 × 0.03 = 0.24
    // classResourceProduced.mutagen += 0.24
    expect(state.classResourceProduced.mutagen).toBeCloseTo(8.24)
    expect(state.mutagenInventory).toBeCloseTo(0.24)
  })
})

describe('同资源衍生附魔（Story 34.4 AC3）', () => {
  beforeEach(() => {
    resetState()
  })

  it('base 产出者 + ench_trans_base → 额外 30% base', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.enchantedSkills.set('prod_burst', 'ench_trans_base')
    state.resources.base = 0
    synergy.skillBaseScore = 0
    triggerProducer('prod_burst')
    // prod_burst Lv1 base add = 5 → skillBaseScore += 5
    // ench_trans_base effectValue=0.30 → extra base = 5 × 0.30 = 1.5
    // extra base goes to resources.base (not skillBaseScore)
    expect(synergy.skillBaseScore).toBeCloseTo(5)
    expect(state.resources.base).toBeCloseTo(1.5)
  })

  it('score 产出者 + ench_trans_score → 额外 30% score', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_loot', { level: 1 })
    state.player.enchantedSkills.set('prod_loot', 'ench_trans_score')
    state.resources.score = 0
    state.score = 0
    triggerProducer('prod_loot')
    // prod_loot Lv1 score add = 15 → score += 15, resources.score += 15
    // ench_trans_score effectValue=0.30 → extra score = 15 × 0.30 = 4.5
    // total resources.score = 15 + 4.5 = 19.5, state.score = 15 + 4.5 = 19.5
    expect(state.resources.score).toBeCloseTo(19.5)
    expect(state.score).toBeCloseTo(19.5)
  })
})

describe('converterPool — 技能池抽取', () => {
  it('state.converterPool 初始为空数组', () => {
    resetState()
    expect(state.converterPool).toEqual([])
  })
})
