// ============================================
// 打字肉鸽 - 新机制产出者触发逻辑测试
// ============================================
// Story 34.1: 蓄力/衰减/脉冲/暴击/虚无 5 种机制

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { state, synergy, resetState } from '../../../src/core/state'
import { PRODUCERS } from '../../../src/data/producers'
import type { VoidParams } from '../../../src/core/types'

// Mock seededRandom（暴击产出者测试需要控制随机数）
vi.mock('../../../src/core/seededRandom', () => ({
  random: vi.fn(() => 0.99), // 默认不暴击
  seed: vi.fn(),
}))

// Mock DOM 和音效（同 producer-trigger.test.ts 模式）
vi.mock('../../../src/ui/elements', () => ({
  getElements: () => ({ triggerZone: { appendChild: vi.fn() } }),
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

// Mock document for showTriggerPopup
beforeEach(() => {
  const mockEl = { className: '', innerHTML: '', style: { left: '' }, remove: vi.fn() }
  vi.stubGlobal('document', { createElement: () => mockEl })
})
afterEach(() => {
  vi.unstubAllGlobals()
})

// ========== 蓄力 (Charge) ==========

describe('蓄力产出者 (charge)', () => {
  beforeEach(() => { resetState() })

  it('updateChargeProducers 累积蓄力值 (gainPerSec=0.08)', async () => {
    const { updateChargeProducers } = await import('../../../src/systems/skills')
    state.player.bindings.set('f', 'prod_charge_base')
    state.player.skills.set('prod_charge_base', { level: 1 })

    updateChargeProducers(5) // 5 秒 → 0.08 × 5 = 0.4
    expect(state.chargeAccumulated.get('prod_charge_base')).toBeCloseTo(0.4)
  })

  it('蓄力值 cap 在 maxBonus (2.0)', async () => {
    const { updateChargeProducers } = await import('../../../src/systems/skills')
    state.player.bindings.set('f', 'prod_charge_base')
    state.player.skills.set('prod_charge_base', { level: 1 })

    updateChargeProducers(100) // 远超上限
    expect(state.chargeAccumulated.get('prod_charge_base')).toBe(2.0)
  })

  it('触发时消耗蓄力并加成 Phase 2 (base=5, charge=0.8 → 9)', async () => {
    const { triggerProducer, updateChargeProducers } = await import('../../../src/systems/skills')
    state.player.bindings.set('f', 'prod_charge_base')
    state.player.skills.set('prod_charge_base', { level: 1 })
    synergy.skillBaseScore = 0

    updateChargeProducers(10) // charge = min(0.08×10, 2.0) = 0.8
    triggerProducer('prod_charge_base', 'f')

    expect(synergy.skillBaseScore).toBeCloseTo(9) // 5 × (1 + 0.8)
    expect(state.chargeAccumulated.get('prod_charge_base')).toBe(0) // 释放后归零
  })

  it('无蓄力时产出基础值', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_charge_base', { level: 1 })
    synergy.skillBaseScore = 0

    triggerProducer('prod_charge_base', 'f')
    expect(synergy.skillBaseScore).toBe(5) // 5 × (1 + 0) = 5
  })
})

// ========== 衰减 (Decay) ==========

describe('衰减产出者 (decay)', () => {
  beforeEach(() => { resetState() })

  it('首次触发 Phase 3 乘 initialMult (15 × 2.0 = 30)', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_decay_score', { level: 1 })
    state.resources.score = 0
    state.score = 0

    triggerProducer('prod_decay_score')
    expect(state.resources.score).toBeCloseTo(30)
  })

  it('连续触发倍率递减 (2.0 → 1.85 → 1.7)', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_decay_score', { level: 1 })
    state.resources.score = 0
    state.score = 0

    triggerProducer('prod_decay_score') // mult=2.0 → score += 30
    const after1 = state.resources.score
    expect(after1).toBeCloseTo(30)

    triggerProducer('prod_decay_score') // mult=1.85 → score += 27.75
    expect(state.resources.score - after1).toBeCloseTo(27.75)
  })

  it('倍率不低于 floor (0.5)', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_decay_score', { level: 1 })
    state.resources.score = 0
    state.score = 0

    // (2.0-0.5)/0.15 ≈ 10 次到达 floor
    for (let i = 0; i < 15; i++) triggerProducer('prod_decay_score')
    expect(state.decayMultipliers.get('prod_decay_score')).toBeCloseTo(0.5)
  })

  it('resetWordResourceTypes 重置倍率到 initialMult', async () => {
    const { triggerProducer, resetWordResourceTypes } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_decay_score', { level: 1 })
    state.resources.score = 0
    state.score = 0

    triggerProducer('prod_decay_score')
    triggerProducer('prod_decay_score')
    expect(state.decayMultipliers.get('prod_decay_score')).toBeLessThan(2.0)

    resetWordResourceTypes() // 新词 → 重置衰减
    expect(state.decayMultipliers.get('prod_decay_score')).toBe(2.0)
  })
})

// ========== 脉冲 (Pulse) ==========

describe('脉冲产出者 (pulse)', () => {
  beforeEach(() => { resetState() })

  it('非脉冲回合正常产出 (mechanicMult=1)', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_pulse_base', { level: 1 })
    synergy.skillBaseScore = 0

    triggerProducer('prod_pulse_base') // count=1, 1%4≠0
    expect(synergy.skillBaseScore).toBe(5)
  })

  it('第 4 次触发脉冲爆发 (5 × 3.0 = 15)', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_pulse_base', { level: 1 })

    // 触发 3 次普通
    for (let i = 0; i < 3; i++) triggerProducer('prod_pulse_base')

    // 第 4 次 → 爆发
    synergy.skillBaseScore = 0
    triggerProducer('prod_pulse_base')
    expect(synergy.skillBaseScore).toBeCloseTo(15) // 5 × 3.0
  })

  it('脉冲计数跨词持续（不被 resetWordResourceTypes 清除）', async () => {
    const { triggerProducer, resetWordResourceTypes } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_pulse_base', { level: 1 })

    triggerProducer('prod_pulse_base') // count=1
    triggerProducer('prod_pulse_base') // count=2
    resetWordResourceTypes() // 新词，pulseCounts 不清除
    triggerProducer('prod_pulse_base') // count=3

    synergy.skillBaseScore = 0
    triggerProducer('prod_pulse_base') // count=4 → burst
    expect(synergy.skillBaseScore).toBeCloseTo(15)
  })

  it('第 8 次再次脉冲', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_pulse_base', { level: 1 })

    for (let i = 0; i < 7; i++) triggerProducer('prod_pulse_base')

    synergy.skillBaseScore = 0
    triggerProducer('prod_pulse_base') // count=8 → 8%4=0 burst
    expect(synergy.skillBaseScore).toBeCloseTo(15)
  })
})

// ========== 暴击 (Crit) ==========

describe('暴击产出者 (crit)', () => {
  beforeEach(() => { resetState() })

  it('random < chance (0.5) 触发暴击 (×2.0)', async () => {
    const { random } = await import('../../../src/core/seededRandom')
    ;(random as any).mockReturnValueOnce(0.1) // < 0.5

    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_crit_base', { level: 1 })
    synergy.skillBaseScore = 0

    triggerProducer('prod_crit_base')
    expect(synergy.skillBaseScore).toBeCloseTo(10) // 5 × 2.0
  })

  it('random >= chance (0.5) 无暴击', async () => {
    const { random } = await import('../../../src/core/seededRandom')
    ;(random as any).mockReturnValueOnce(0.8) // >= 0.5

    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_crit_base', { level: 1 })
    synergy.skillBaseScore = 0

    triggerProducer('prod_crit_base')
    expect(synergy.skillBaseScore).toBe(5)
  })

  it('暴击反馈含💥前缀', async () => {
    const { random } = await import('../../../src/core/seededRandom')
    ;(random as any).mockReturnValueOnce(0.1) // crit

    const battle = await import('../../../src/systems/battle')
    ;(battle.showFeedback as any).mockClear()

    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_crit_base', { level: 1 })

    triggerProducer('prod_crit_base')
    expect(battle.showFeedback).toHaveBeenCalledWith(
      expect.stringContaining('💥'),
      expect.any(String),
      expect.any(Number),
    )
  })

  it('暴击反馈 scale ≥ 2.0', async () => {
    const { random } = await import('../../../src/core/seededRandom')
    ;(random as any).mockReturnValueOnce(0.1) // crit

    const battle = await import('../../../src/systems/battle')
    ;(battle.showFeedback as any).mockClear()

    const { triggerProducer } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_crit_base', { level: 1 })

    triggerProducer('prod_crit_base')
    // showFeedback(text, color, scale) — scale 应 ≥ 2.0
    const call = (battle.showFeedback as any).mock.calls[0]
    expect(call[2]).toBeGreaterThanOrEqual(2.0)
  })
})

// ========== 虚无 (Void) ==========

describe('虚无产出者 (void)', () => {
  beforeEach(() => { resetState() })

  it('空位邻居越多加成越高', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    const { getKeysWithRelation } = await import('../../../src/data/keyboardTopology')

    const PROD_ID = 'prod_void_base_adjacent'
    const prod = PRODUCERS[PROD_ID]
    const vp = prod.mechanicParams as VoidParams

    state.player.skills.set(PROD_ID, { level: 1 })
    state.player.bindings.set('f', PROD_ID)

    // 'f' 的相邻键全部为空 → 最大加成
    const adjacentKeys = getKeysWithRelation('f', vp.posRel)
    synergy.skillBaseScore = 0
    triggerProducer(PROD_ID, 'f')

    const expectedBonus = adjacentKeys.length * vp.bonusPerSlot
    expect(synergy.skillBaseScore).toBeCloseTo(5 * (1 + expectedBonus))
  })

  it('邻居全满时无虚无加成', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    const { getKeysWithRelation } = await import('../../../src/data/keyboardTopology')

    const PROD_ID = 'prod_void_base_adjacent'
    const prod = PRODUCERS[PROD_ID]
    const vp = prod.mechanicParams as VoidParams

    state.player.skills.set(PROD_ID, { level: 1 })
    state.player.bindings.set('f', PROD_ID)

    // 将所有相邻键绑定 → emptyCount = 0
    const adjacentKeys = getKeysWithRelation('f', vp.posRel)
    for (const k of adjacentKeys) state.player.bindings.set(k, 'prod_burst')

    synergy.skillBaseScore = 0
    triggerProducer(PROD_ID, 'f')
    expect(synergy.skillBaseScore).toBe(5) // 无加成
  })

  it('部分空位时按比例加成', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')
    const { getKeysWithRelation } = await import('../../../src/data/keyboardTopology')

    const PROD_ID = 'prod_void_base_adjacent'
    const prod = PRODUCERS[PROD_ID]
    const vp = prod.mechanicParams as VoidParams

    state.player.skills.set(PROD_ID, { level: 1 })
    state.player.bindings.set('f', PROD_ID)

    const adjacentKeys = getKeysWithRelation('f', vp.posRel)
    // 只占一半
    const halfCount = Math.floor(adjacentKeys.length / 2)
    for (let i = 0; i < halfCount; i++) {
      state.player.bindings.set(adjacentKeys[i], 'prod_burst')
    }
    const emptyCount = adjacentKeys.length - halfCount

    synergy.skillBaseScore = 0
    triggerProducer(PROD_ID, 'f')

    const expectedBonus = emptyCount * vp.bonusPerSlot
    expect(synergy.skillBaseScore).toBeCloseTo(5 * (1 + expectedBonus))
  })

  it('无 triggerKey 时跳过虚无计算', async () => {
    const { triggerProducer } = await import('../../../src/systems/skills')

    const PROD_ID = 'prod_void_base_adjacent'
    state.player.skills.set(PROD_ID, { level: 1 })
    synergy.skillBaseScore = 0

    triggerProducer(PROD_ID) // 无 triggerKey
    expect(synergy.skillBaseScore).toBe(5) // 无加成
  })
})
