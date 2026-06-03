// ============================================
// 产资源遗物 · 生成时赋值资源类型（A 方案：ratio × 资源Lv1基数 归一）
// ============================================

import { describe, it, expect, beforeEach } from 'vitest'
import { state } from '../../../../src/core/state'
import {
  RESOURCE_ROLL_POOL,
  isResourceRollRelic,
  getRelicRolledResource,
  getRelicRolledGrant,
  assignRolledResource,
  preRollOfferedResources,
} from '../../../../src/systems/relics/ResourceRelicBehaviors'

// 资源 Lv1 基数（与实现一致）
const BASE = { base: 4, multiplier: 0.35, time: 0.2, gold: 3 } as const

function reset(): void {
  state.player.relics.clear()
  state.player.relicStates = {}
}

describe('产资源遗物 · 生成时赋值资源类型', () => {
  beforeEach(reset)

  it('资源池 = base/multiplier/time/gold（不含 score/shield）', () => {
    expect([...RESOURCE_ROLL_POOL]).toEqual(['base', 'multiplier', 'time', 'gold'])
  })

  it('isResourceRollRelic 覆盖 10 个目标遗物，排除非目标', () => {
    const targets = [
      'production_dividend', 'time_trickle', 'crit_bonus', 'enchant_dividend',
      'word_collection', 'long_word_master', 'accelerate_reward',
      'decelerate_reward', 'row_switch', 'dual_concerto',
    ]
    for (const id of targets) expect(isResourceRollRelic(id)).toBe(true)
    for (const id of ['resource_tide', 'endurance_battery', 's_rank_trophy', 'universal_furnace', 'phoenix']) {
      expect(isResourceRollRelic(id)).toBe(false)
    }
  })

  it('assignRolledResource 幂等：已赋值不覆盖', () => {
    state.player.relicStates['crit_bonus'] = 2 // time
    assignRolledResource('crit_bonus', () => 0) // 即使 roll 出 0 也不应覆盖
    expect(state.player.relicStates['crit_bonus']).toBe(2)
  })

  it('assignRolledResource 按 randomFn 落到池索引', () => {
    assignRolledResource('row_switch', () => 0.99) // floor(0.99*4)=3 → gold
    expect(getRelicRolledResource('row_switch')).toBe('gold')
    state.player.relicStates = {}
    assignRolledResource('row_switch', () => 0) // idx 0 → base
    expect(getRelicRolledResource('row_switch')).toBe('base')
  })

  it('非目标遗物不被赋值', () => {
    assignRolledResource('resource_tide', () => 0.5)
    expect(state.player.relicStates['resource_tide']).toBeUndefined()
  })

  it('preRollOfferedResources：商店/奖励上架即赋值（未拥有也赋），只赋目标遗物', () => {
    expect(state.player.relics.has('production_dividend')).toBe(false) // 未拥有
    preRollOfferedResources(['production_dividend', 'enchant_boost', 'time_trickle'])
    // 目标遗物已赋值（购买前即可见）
    expect(state.player.relicStates['production_dividend']).toBeGreaterThanOrEqual(0)
    expect(state.player.relicStates['time_trickle']).toBeGreaterThanOrEqual(0)
    // 非产资源遗物跳过
    expect(state.player.relicStates['enchant_boost']).toBeUndefined()
  })

  it('preRollOfferedResources 幂等：再上架不改已赋值（roll 稳定）', () => {
    state.player.relicStates['row_switch'] = 2 // time
    preRollOfferedResources(['row_switch'])
    expect(state.player.relicStates['row_switch']).toBe(2)
    expect(getRelicRolledResource('row_switch')).toBe('time')
  })

  it('未赋值时 getRelicRolledResource 回退 gold', () => {
    expect(getRelicRolledResource('time_trickle')).toBe('gold')
  })

  it('归一：roll 到原资源时数值不变（production_dividend +2金 → gold 仍 2）', () => {
    state.player.relicStates['production_dividend'] = 3 // gold
    const g = getRelicRolledGrant('production_dividend')!
    expect(g.resource).toBe('gold')
    expect(g.amount).toBeCloseTo(2)
  })

  it('归一：production_dividend roll 到 time = ratio(0.667) × 0.2 ≈ 0.133', () => {
    state.player.relicStates['production_dividend'] = 2 // time
    const g = getRelicRolledGrant('production_dividend')!
    expect(g.amount).toBeCloseTo((2 / 3) * BASE.time)
  })

  it('归一：long_word_master +1s → roll 到 gold = 5 × 3 = 15（时间系增值）', () => {
    state.player.relicStates['long_word_master'] = 3 // gold
    const g = getRelicRolledGrant('long_word_master')!
    expect(g.resource).toBe('gold')
    expect(g.amount).toBeCloseTo(15)
  })

  it('归一：long_word_master roll 到 time 仍 = 1s', () => {
    state.player.relicStates['long_word_master'] = 2 // time
    expect(getRelicRolledGrant('long_word_master')!.amount).toBeCloseTo(1)
  })

  it('非产资源遗物 getRelicRolledGrant 返回 null', () => {
    expect(getRelicRolledGrant('resource_tide')).toBeNull()
  })

  it('四资源全覆盖归一一致性（crit_bonus ratio=1 → amount=各资源基数）', () => {
    const expected = { base: BASE.base, multiplier: BASE.multiplier, time: BASE.time, gold: BASE.gold }
    RESOURCE_ROLL_POOL.forEach((res, idx) => {
      state.player.relicStates['crit_bonus'] = idx
      expect(getRelicRolledGrant('crit_bonus')!.amount).toBeCloseTo(expected[res])
    })
  })
})
