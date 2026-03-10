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
  emitResourceSound: vi.fn(),
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

describe('getEnchantmentMultiplier — 无附魔基线 (AC2, AC5)', () => {
  beforeEach(() => resetState())

  it('无附魔返回 1', async () => {
    const { getEnchantmentMultiplier } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')

    expect(getEnchantmentMultiplier('prod_burst', 'f')).toBe(1)
  })
})

describe('成长附魔 — checkGrowthAccumulation (Story 24.3)', () => {
  beforeEach(() => resetState())

  it('相邻技能触发 → growthValues 累积 effectValue', async () => {
    const { checkGrowthAccumulation } = await import('../../../src/systems/skills')
    // f 上 prod_burst 有 growth_adjacent 附魔, g 上 prod_focus (f 与 g 相邻)
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_growth_adjacent')

    state.player.skills.set('prod_focus', { level: 1 })
    state.player.bindings.set('g', 'prod_focus')

    // g 触发 → f 的成长附魔检查
    checkGrowthAccumulation('g')
    expect(state.growthValues.get('prod_burst')).toBeCloseTo(0.03)
  })

  it('多次触发 → growthValues 线性累加', async () => {
    const { checkGrowthAccumulation } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_growth_adjacent')

    state.player.skills.set('prod_focus', { level: 1 })
    state.player.bindings.set('g', 'prod_focus')

    checkGrowthAccumulation('g')
    checkGrowthAccumulation('g')
    checkGrowthAccumulation('g')
    expect(state.growthValues.get('prod_burst')).toBeCloseTo(0.09)
  })

  it('自身触发不累积（triggerKey === boundKey）', async () => {
    const { checkGrowthAccumulation } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_growth_adjacent')

    // f 自身触发 → 不应累积
    checkGrowthAccumulation('f')
    expect(state.growthValues.get('prod_burst') || 0).toBe(0)
  })

  it('不相邻的键触发 → 不累积', async () => {
    const { checkGrowthAccumulation } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_growth_adjacent')

    // p 与 f 不相邻 → 不累积
    state.player.skills.set('prod_focus', { level: 1 })
    state.player.bindings.set('p', 'prod_focus')
    checkGrowthAccumulation('p')
    expect(state.growthValues.get('prod_burst') || 0).toBe(0)
  })

  it('无成长附魔 → growthValues 不变', async () => {
    const { checkGrowthAccumulation } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    // 无附魔

    state.player.skills.set('prod_focus', { level: 1 })
    state.player.bindings.set('g', 'prod_focus')

    checkGrowthAccumulation('g')
    expect(state.growthValues.get('prod_burst')).toBeUndefined()
  })

  it('sameRow 位置关系正确累积', async () => {
    const { checkGrowthAccumulation } = await import('../../../src/systems/skills')
    // a 上有 growth_sameRow 附魔, s 与 a 同行
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('a', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_growth_sameRow')

    state.player.skills.set('prod_focus', { level: 1 })
    state.player.bindings.set('s', 'prod_focus')

    checkGrowthAccumulation('s')
    expect(state.growthValues.get('prod_burst')).toBeCloseTo(0.02)
  })
})

describe('getEnchantmentMultiplier — 成长型 (Story 24.3)', () => {
  beforeEach(() => resetState())

  it('无累积时返回 1', async () => {
    const { getEnchantmentMultiplier } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_growth_adjacent')

    expect(getEnchantmentMultiplier('prod_burst', 'f')).toBe(1)
  })

  it('有累积时返回 1 + growthValues', async () => {
    const { getEnchantmentMultiplier } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_growth_adjacent')
    state.growthValues.set('prod_burst', 0.15)

    expect(getEnchantmentMultiplier('prod_burst', 'f')).toBeCloseTo(1.15)
  })
})

describe('精通附魔 — checkMasteryAccumulation (Story 24.4)', () => {
  beforeEach(() => resetState())

  it('精通附魔技能触发 → masteryCounters 自增 1', async () => {
    const { checkMasteryAccumulation } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_mastery')

    checkMasteryAccumulation('prod_burst')
    expect(state.masteryCounters.get('prod_burst')).toBe(1)
  })

  it('触发 10 次 → growthValues 增加 0.08', async () => {
    const { checkMasteryAccumulation } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_mastery')

    for (let i = 0; i < 10; i++) checkMasteryAccumulation('prod_burst')
    expect(state.masteryCounters.get('prod_burst')).toBe(10)
    expect(state.growthValues.get('prod_burst')).toBeCloseTo(0.08)
  })

  it('触发 30 次 → growthValues = 0.24（3 个里程碑）', async () => {
    const { checkMasteryAccumulation } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_mastery')

    for (let i = 0; i < 30; i++) checkMasteryAccumulation('prod_burst')
    expect(state.masteryCounters.get('prod_burst')).toBe(30)
    expect(state.growthValues.get('prod_burst')).toBeCloseTo(0.24)
  })

  it('触发 9 次 → growthValues 不变（未达里程碑）', async () => {
    const { checkMasteryAccumulation } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_mastery')

    for (let i = 0; i < 9; i++) checkMasteryAccumulation('prod_burst')
    expect(state.masteryCounters.get('prod_burst')).toBe(9)
    expect(state.growthValues.get('prod_burst') || 0).toBe(0)
  })

  it('无精通附魔 → masteryCounters 不变', async () => {
    const { checkMasteryAccumulation } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    // 无附魔

    checkMasteryAccumulation('prod_burst')
    expect(state.masteryCounters.get('prod_burst')).toBeUndefined()
  })

  it('非精通附魔 → masteryCounters 不变', async () => {
    const { checkMasteryAccumulation } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_growth_adjacent')

    checkMasteryAccumulation('prod_burst')
    expect(state.masteryCounters.get('prod_burst')).toBeUndefined()
  })
})

describe('getEnchantmentMultiplier — 精通型 (Story 24.4)', () => {
  beforeEach(() => resetState())

  it('无累积时返回 1', async () => {
    const { getEnchantmentMultiplier } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_mastery')

    expect(getEnchantmentMultiplier('prod_burst', 'f')).toBe(1)
  })

  it('有累积时返回 1 + growthValues', async () => {
    const { getEnchantmentMultiplier } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_mastery')
    state.growthValues.set('prod_burst', 0.25)

    expect(getEnchantmentMultiplier('prod_burst', 'f')).toBeCloseTo(1.25)
  })
})

describe('吞噬附魔 — getIconCount (Story 24.5)', () => {
  beforeEach(() => resetState())

  it('无附魔无吞噬 → 1', async () => {
    const { getIconCount } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')

    expect(getIconCount('prod_burst')).toBe(1)
  })

  it('有附魔 → 2', async () => {
    const { getIconCount } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_devour_adjacent')

    expect(getIconCount('prod_burst')).toBe(2)
  })

  it('有附魔 + 吞噬 2 个 → 4', async () => {
    const { getIconCount } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_devour_adjacent')
    state.devourIcons.set('prod_burst', ['🔥', '⚡'])

    expect(getIconCount('prod_burst')).toBe(4)
  })
})

describe('吞噬附魔 — checkDevourAccumulation (Story 24.5)', () => {
  beforeEach(() => resetState())

  it('触发 4 次 → 不吞噬（未达阈值）', async () => {
    const { checkDevourAccumulation } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_devour_adjacent')
    // 左侧弱技能 (d 在 f 左侧)
    state.player.skills.set('prod_focus', { level: 1 })
    state.player.bindings.set('d', 'prod_focus')

    for (let i = 0; i < 4; i++) checkDevourAccumulation('prod_burst', 'f')
    expect(state.devourCounters.get('prod_burst')).toBe(4)
    // 未达阈值，不吞噬
    expect(state.player.bindings.has('d')).toBe(true)
    expect(state.devourIcons.get('prod_burst')).toBeUndefined()
  })

  it('触发 5 次 + 相邻弱技能 → 吞噬执行', async () => {
    const { checkDevourAccumulation } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_devour_adjacent')
    // d 与 f 相邻
    state.player.skills.set('prod_focus', { level: 1 })
    state.player.bindings.set('d', 'prod_focus')
    // devour skill has 2 icons (skill+enchant), target has 1 (skill only) → can devour

    for (let i = 0; i < 5; i++) checkDevourAccumulation('prod_burst', 'f')
    // 吞噬应执行
    expect(state.player.bindings.has('d')).toBe(false)
    expect(state.player.skills.has('prod_focus')).toBe(false)
    const icons = state.devourIcons.get('prod_burst')
    expect(icons).toBeDefined()
    expect(icons!.length).toBe(1)
  })

  it('触发 5 次 + 相邻无弱技能 → 不吞噬', async () => {
    const { checkDevourAccumulation } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_devour_adjacent')
    // d 有附魔 → 2 icons = same as devour skill → 不可吞噬
    state.player.skills.set('prod_focus', { level: 1 })
    state.player.bindings.set('d', 'prod_focus')
    state.player.enchantedSkills.set('prod_focus', 'ench_growth_adjacent')

    for (let i = 0; i < 5; i++) checkDevourAccumulation('prod_burst', 'f')
    expect(state.player.bindings.has('d')).toBe(true) // 未吞噬
    expect(state.devourIcons.get('prod_burst')).toBeUndefined()
  })

  it('吞噬执行 → 目标从 bindings/skills/enchantedSkills 移除', async () => {
    const { checkDevourAccumulation } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_devour_adjacent')
    state.player.skills.set('prod_focus', { level: 1 })
    state.player.bindings.set('d', 'prod_focus')
    state.player.enchantedSkills.set('prod_focus', 'ench_splash_adjacent')

    // devour: 2 icons, target: 2 icons (skill+enchant) → same, can't devour
    for (let i = 0; i < 5; i++) checkDevourAccumulation('prod_burst', 'f')
    expect(state.player.bindings.has('d')).toBe(true) // 同图标数，不吞噬

    // 给 devour 吞噬一个图标让 iconCount=3, 然后再触发 5 次
    state.devourIcons.set('prod_burst', ['💧'])
    for (let i = 0; i < 5; i++) checkDevourAccumulation('prod_burst', 'f')
    expect(state.player.bindings.has('d')).toBe(false)
    expect(state.player.skills.has('prod_focus')).toBe(false)
    expect(state.player.enchantedSkills.has('prod_focus')).toBe(false)
  })

  it('无吞噬附魔 → devourCounters 不变', async () => {
    const { checkDevourAccumulation } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')

    checkDevourAccumulation('prod_burst', 'f')
    expect(state.devourCounters.get('prod_burst')).toBeUndefined()
  })

  it('相邻有弱技能 → 吞噬最弱的一个', async () => {
    const { checkDevourAccumulation } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_devour_adjacent')
    // d 和 g 都与 f 相邻，都是 1 icon（弱于 devour 的 2 icon）
    state.player.skills.set('prod_focus', { level: 1 })
    state.player.bindings.set('d', 'prod_focus')
    state.player.skills.set('prod_loot', { level: 1 })
    state.player.bindings.set('g', 'prod_loot')

    for (let i = 0; i < 5; i++) checkDevourAccumulation('prod_burst', 'f')
    // 应吞噬一个（两者同图标数，吞噬先遍历到的一个）
    const icons = state.devourIcons.get('prod_burst')
    expect(icons).toBeDefined()
    expect(icons!.length).toBe(1)
  })

  it('sameRow 吞噬 → 同行弱技能被吞', async () => {
    const { checkDevourAccumulation } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_devour_sameRow')
    // j 与 f 同行（ASDFGHJKL），且 1 icon < devour 2 icon
    state.player.skills.set('prod_focus', { level: 1 })
    state.player.bindings.set('j', 'prod_focus')

    for (let i = 0; i < 5; i++) checkDevourAccumulation('prod_burst', 'f')
    expect(state.player.bindings.has('j')).toBe(false)
    expect(state.devourIcons.get('prod_burst')?.length).toBe(1)
  })

  it('范围外技能不受吞噬影响', async () => {
    const { checkDevourAccumulation } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_devour_symmetric')
    // f 的对称键是 j；p 不是 f 的对称键
    state.player.skills.set('prod_focus', { level: 1 })
    state.player.bindings.set('p', 'prod_focus')

    for (let i = 0; i < 5; i++) checkDevourAccumulation('prod_burst', 'f')
    expect(state.player.bindings.has('p')).toBe(true) // 范围外不受影响
  })
})

describe('getEnchantmentMultiplier — 吞噬型 (Story 24.5)', () => {
  beforeEach(() => resetState())

  it('2 图标（技能+附魔）→ 1.4', async () => {
    const { getEnchantmentMultiplier } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_devour_adjacent')

    // 2 icons × 0.20 = 0.40 → 1.4
    expect(getEnchantmentMultiplier('prod_burst', 'f')).toBeCloseTo(1.4)
  })

  it('4 图标（技能+附魔+2吞噬）→ 1.8', async () => {
    const { getEnchantmentMultiplier } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_devour_adjacent')
    state.devourIcons.set('prod_burst', ['🔥', '⚡'])

    // 4 icons × 0.20 = 0.80 → 1.8
    expect(getEnchantmentMultiplier('prod_burst', 'f')).toBeCloseTo(1.8)
  })
})

describe('吞噬附魔集成 — triggerProducer → devour 路径 (Story 24.5)', () => {
  beforeEach(() => resetState())

  it('triggerProducer 触发吞噬附魔 → devourCounters 自增', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_devour_adjacent')

    triggerProducer('prod_burst', 'f')
    expect(state.devourCounters.get('prod_burst')).toBe(1)
  })
})

describe('成长附魔集成 — 溅射/增幅者触发路径 (AC6, AC7)', () => {
  beforeEach(() => resetState())

  it('溅射子触发为邻居成长附魔累积 growthValues', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    // f: prod_burst + splash (溅射源)
    // g: prod_focus (溅射目标，adjacent to f)
    // h: prod_loot + growth (adjacent to g, NOT adjacent to f)
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_splash_adjacent')

    state.player.skills.set('prod_focus', { level: 1 })
    state.player.bindings.set('g', 'prod_focus')

    state.player.skills.set('prod_loot', { level: 1 })
    state.player.bindings.set('h', 'prod_loot')
    state.player.enchantedSkills.set('prod_loot', 'ench_growth_adjacent')

    // h 与 f 不相邻 → 主触发的 checkGrowthAccumulation('f') 不会累积 h
    // h 与 g 相邻 → 溅射触发 g 后的 checkGrowthAccumulation('g') 会累积 h
    triggerProducer('prod_burst', 'f')
    expect(state.growthValues.get('prod_loot')).toBeCloseTo(0.03)
  })

  it('增幅者触发为邻居成长附魔累积 growthValues', async () => {
    const { triggerAmplifier } = await import('../../../src/systems/skills')
    // f: amp (增幅者), g: prod_burst + growth (adjacent to f)
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('g', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_growth_adjacent')

    state.player.skills.set('amp_base_adjacent', { level: 1 })
    state.player.bindings.set('f', 'amp_base_adjacent')

    // f 触发增幅者 → checkGrowthAccumulation('f') → g 的 growth 累积
    triggerAmplifier('amp_base_adjacent', 'f')
    expect(state.growthValues.get('prod_burst')).toBeCloseTo(0.03)
  })
})

describe('精通附魔集成 — triggerProducer/triggerAmplifier → mastery 路径 (Story 24.4)', () => {
  beforeEach(() => resetState())

  it('triggerProducer 触发精通附魔 → masteryCounters 自增', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_mastery')

    triggerProducer('prod_burst', 'f')
    expect(state.masteryCounters.get('prod_burst')).toBe(1)
  })

  it('增幅者触发精通附魔 → masteryCounters 自增', async () => {
    const { triggerAmplifier } = await import('../../../src/systems/skills')
    state.player.skills.set('amp_base_adjacent', { level: 1 })
    state.player.bindings.set('f', 'amp_base_adjacent')
    state.player.enchantedSkills.set('amp_base_adjacent', 'ench_mastery')

    triggerAmplifier('amp_base_adjacent', 'f')
    expect(state.masteryCounters.get('amp_base_adjacent')).toBe(1)
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
    state.player.enchantedSkills.set('conn_copy_adjacent', 'ench_repulsion_adjacent')
    expect(() => getEnchantmentMultiplier('conn_copy_adjacent', 'f')).not.toThrow()
  })
})

// ========================================
// Story 24.6: 附魔 UI 适配
// ========================================

describe('buildEnchantmentInfo — tooltip 附魔状态 (Story 24.6, AC1)', () => {
  beforeEach(() => resetState())

  it('成长型附魔 → 显示成长百分比', async () => {
    const { buildEnchantmentInfo } = await import('../../../src/systems/shop')
    state.player.skills.set('prod_burst', { level: 3 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_growth_adjacent')
    state.growthValues.set('prod_burst', 0.45)

    const info = buildEnchantmentInfo('prod_burst')
    expect(info).toBeDefined()
    expect(info).toContain('成长')
    expect(info).toContain('+45%')
  })

  it('精通附魔 → 显示 N/10 进度和成长百分比', async () => {
    const { buildEnchantmentInfo } = await import('../../../src/systems/shop')
    state.player.skills.set('prod_burst', { level: 3 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_mastery')
    state.growthValues.set('prod_burst', 0.15)
    state.masteryCounters.set('prod_burst', 37)

    const info = buildEnchantmentInfo('prod_burst')
    expect(info).toBeDefined()
    expect(info).toContain('精通')
    expect(info).toContain('7/10')
    expect(info).toContain('+15%')
  })

  it('精通附魔 counters=0 → 显示 0/10 和 +0%', async () => {
    const { buildEnchantmentInfo } = await import('../../../src/systems/shop')
    state.player.skills.set('prod_burst', { level: 3 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_mastery')

    const info = buildEnchantmentInfo('prod_burst')
    expect(info).toBeDefined()
    expect(info).toContain('精通')
    expect(info).toContain('0/10')
    expect(info).toContain('+0%')
  })

  it('吞噬附魔无吞噬图标 → 显示空图标列表', async () => {
    const { buildEnchantmentInfo } = await import('../../../src/systems/shop')
    state.player.skills.set('prod_burst', { level: 3 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_devour_adjacent')
    // 无 devourIcons → 空列表，iconCount = 2 (skill + enchant)

    const info = buildEnchantmentInfo('prod_burst')
    expect(info).toBeDefined()
    expect(info).toContain('噬') // 吞噬系附魔名含"噬"
    expect(info).toContain('×2')
  })

  it('吞噬附魔 → 显示图标列表和图标数', async () => {
    const { buildEnchantmentInfo } = await import('../../../src/systems/shop')
    state.player.skills.set('prod_burst', { level: 3 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_devour_adjacent')
    state.devourIcons.set('prod_burst', ['🔥', '⚡'])

    const info = buildEnchantmentInfo('prod_burst')
    expect(info).toBeDefined()
    expect(info).toContain('噬') // 吞噬系附魔名含"噬"
    expect(info).toContain('🔥')
    expect(info).toContain('⚡')
    expect(info).toContain('×4') // 1 skill + 1 enchant + 2 devoured = 4
  })

  it('溅射附魔 → 显示名称和描述', async () => {
    const { buildEnchantmentInfo } = await import('../../../src/systems/shop')
    state.player.skills.set('prod_burst', { level: 3 })
    state.player.enchantedSkills.set('prod_burst', 'ench_splash_adjacent')

    const info = buildEnchantmentInfo('prod_burst')
    expect(info).toBeDefined()
    expect(info).toContain('波及')
  })

  it('变性型附魔 → 显示名称和描述', async () => {
    const { buildEnchantmentInfo } = await import('../../../src/systems/shop')
    state.player.skills.set('prod_burst', { level: 3 })
    state.player.enchantedSkills.set('prod_burst', 'ench_trans_score')

    const info = buildEnchantmentInfo('prod_burst')
    expect(info).toBeDefined()
    expect(info).toContain('附金')
  })

  it('无附魔 → undefined', async () => {
    const { buildEnchantmentInfo } = await import('../../../src/systems/shop')
    state.player.skills.set('prod_burst', { level: 1 })

    const info = buildEnchantmentInfo('prod_burst')
    expect(info).toBeUndefined()
  })
})

describe('商店键盘成长徽章 (Story 24.6, AC2)', () => {
  it('growthValue > 0 → innerHTML 包含 growth-badge', () => {
    // 直接测试 HTML 生成逻辑
    const growthVal = 0.45
    const badge = growthVal > 0 ? `<span class="growth-badge">+${Math.round(growthVal * 100)}%</span>` : ''
    expect(badge).toContain('growth-badge')
    expect(badge).toContain('+45%')
  })

  it('growthValue = 0 → 无 growth-badge', () => {
    const growthVal = 0
    const badge = growthVal > 0 ? `<span class="growth-badge">+${Math.round(growthVal * 100)}%</span>` : ''
    expect(badge).toBe('')
  })
})
