// ============================================
// 打字肉鸽 - 增幅者商店集成测试
// ============================================
// 统一 +N%/层 机制

import { describe, it, expect, beforeEach, vi } from 'vitest'
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

import { ACT_SKILL_WEIGHTS, SKILL_TYPE_TOOLTIPS } from '../../../src/systems/shop'

describe('ACT_SKILL_WEIGHTS — 增幅者权重', () => {
  it('Act1 增幅者权重为 0', () => {
    expect(ACT_SKILL_WEIGHTS[1].amplifier).toBe(0)
  })

  it('Act2 增幅者权重为 10', () => {
    expect(ACT_SKILL_WEIGHTS[2].amplifier).toBe(10)
  })

  it('Act3 增幅者权重为 20', () => {
    expect(ACT_SKILL_WEIGHTS[3].amplifier).toBe(20)
  })

  it('每个 Act 权重总和为 100', () => {
    for (const act of [1, 2, 3]) {
      const w = ACT_SKILL_WEIGHTS[act]
      expect(w.producer + w.converter + w.connector + w.amplifier).toBe(100)
    }
  })

  it('所有 Act 都包含 amplifier 字段', () => {
    for (const act of [1, 2, 3]) {
      expect(ACT_SKILL_WEIGHTS[act]).toHaveProperty('amplifier')
    }
  })
})

describe('SKILL_TYPE_TOOLTIPS — 增幅者', () => {
  it('包含 amplifier tooltip', () => {
    expect(SKILL_TYPE_TOOLTIPS).toHaveProperty('amplifier')
    expect(SKILL_TYPE_TOOLTIPS.amplifier.text).toContain('增幅')
    expect(SKILL_TYPE_TOOLTIPS.amplifier.color).toBe('#7c5cbf')
  })
})

describe('getSkillCategory — 增幅者', () => {
  it('增幅者 ID 返回 amplifier', async () => {
    const { isAmplifier } = await import('../../../src/data/amplifiers')
    expect(isAmplifier('amp_base_adjacent')).toBe(true)
    expect(isAmplifier('prod_burst')).toBe(false)
    expect(isAmplifier('conv_base_score_add')).toBe(false)
  })
})

describe('triggerAmplifier — 统计记录 (AC5)', () => {
  beforeEach(() => {
    resetState()
  })

  it('triggerAmplifier 后 battleStats 记录触发次数', async () => {
    const { createBattleStats } = await import('../../../src/core/state')
    const { triggerAmplifier } = await import('../../../src/systems/skills')

    state.battleStats = createBattleStats()
    state.player.bindings.set('a', 'amp_base_adjacent')
    state.player.skills.set('amp_base_adjacent', { level: 1 })

    triggerAmplifier('amp_base_adjacent', 'a')

    const ks = state.battleStats!.keyStats.get('a')
    expect(ks).toBeDefined()
    expect(ks!.triggerCount).toBe(1)

    const ss = state.battleStats!.skillStats.get('amp_base_adjacent')
    expect(ss).toBeDefined()
    expect(ss!.triggerCount).toBe(1)
    // 增幅者不产出资源，delta=0
    expect(ss!.resources.base).toBe(0)
  })

  it('多次触发累积 triggerCount', async () => {
    const { createBattleStats } = await import('../../../src/core/state')
    const { triggerAmplifier } = await import('../../../src/systems/skills')

    state.battleStats = createBattleStats()
    state.player.bindings.set('s', 'amp_base_adjacent')
    state.player.skills.set('amp_base_adjacent', { level: 1 })

    triggerAmplifier('amp_base_adjacent', 's')
    triggerAmplifier('amp_base_adjacent', 's')
    triggerAmplifier('amp_base_adjacent', 's')

    const ks = state.battleStats!.keyStats.get('s')
    expect(ks!.triggerCount).toBe(3)
    expect(state.amplifierStacks.get('amp_base_adjacent')).toBe(3)
  })
})

describe('amplifierPool — 池初始化', () => {
  it('drawAmplifierPool 返回数组', async () => {
    const { drawAmplifierPool } = await import('../../../src/data/amplifiers')
    const pool = drawAmplifierPool()
    expect(Array.isArray(pool)).toBe(true)
    expect(pool.length).toBeGreaterThan(0)
    expect(pool.length).toBeLessThanOrEqual(15)
  })

  it('drawAmplifierPool 返回的都是有效增幅者 ID', async () => {
    const { drawAmplifierPool, AMPLIFIERS } = await import('../../../src/data/amplifiers')
    const pool = drawAmplifierPool()
    for (const id of pool) {
      expect(AMPLIFIERS[id]).toBeDefined()
    }
  })
})
