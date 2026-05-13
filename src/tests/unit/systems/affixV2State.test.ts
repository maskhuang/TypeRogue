// ============================================
// 打字肉鸽 - affixV2 State Registry 单元测试
// ============================================

import { describe, it, expect, beforeEach } from 'vitest'
import {
  getInstanceState,
  peekInstanceState,
  clearInstanceState,
  resetFightState,
  resetAllFightStates,
  resetAllAffixV2State,
  addAura,
  listActiveAuras,
  clearAuras,
  clearAurasFromSource,
  addStatus,
  listStatuses,
  tryFireTargetQuota,
} from '../../../src/systems/affixV2State'

beforeEach(() => {
  resetAllAffixV2State()
})

describe('Instance State · 自动创建 / 持久化', () => {
  it('首次 get 自动创建 fresh state', () => {
    const s = getInstanceState('inst_1')
    expect(s.cumulativeBaseAdd).toBe(0)
    expect(s.cumulativeFactorAdd).toBe(0)
    expect(s.stacks).toBe(0)
    expect(s.affixKeyCount).toBe(0)
  })

  it('修改 state 持久化', () => {
    const s1 = getInstanceState('inst_1')
    s1.cumulativeBaseAdd = 5
    s1.stacks = 3

    const s2 = getInstanceState('inst_1')
    expect(s2.cumulativeBaseAdd).toBe(5)
    expect(s2.stacks).toBe(3)
  })

  it('peek 不创建', () => {
    expect(peekInstanceState('inst_x')).toBeUndefined()
    getInstanceState('inst_x')
    expect(peekInstanceState('inst_x')).toBeDefined()
  })

  it('clearInstanceState 单独清', () => {
    getInstanceState('a').stacks = 5
    getInstanceState('b').stacks = 3
    clearInstanceState('a')
    expect(peekInstanceState('a')).toBeUndefined()
    expect(peekInstanceState('b')?.stacks).toBe(3)
  })
})

describe('Fight reset · K3 关内成长归零', () => {
  it('resetFightState 清成长字段，不清 affixKeyCount', () => {
    const s = getInstanceState('inst_1')
    s.cumulativeBaseAdd = 10
    s.cumulativeFactorAdd = 0.5
    s.stacks = 7
    s.affixKeyCount = 50

    resetFightState('inst_1')
    expect(s.cumulativeBaseAdd).toBe(0)
    expect(s.cumulativeFactorAdd).toBe(0)
    expect(s.stacks).toBe(0)
    expect(s.affixKeyCount).toBe(50)  // 不重置
  })

  it('resetAllFightStates 全 instance 重置', () => {
    getInstanceState('a').stacks = 5
    getInstanceState('b').stacks = 3
    resetAllFightStates()
    expect(peekInstanceState('a')?.stacks).toBe(0)
    expect(peekInstanceState('b')?.stacks).toBe(0)
  })
})

describe('Aura store · K3 仅 fight duration', () => {
  it('addAura 注册 + listActiveAuras 查询', () => {
    addAura('source1', { type: 'all_skills', pick: 'all' }, { type: 'crit_chance_add', amount: 0.1 })
    expect(listActiveAuras().length).toBe(1)
  })

  it('clearAuras 一键清空', () => {
    addAura('a', { type: 'self' }, { type: 'crit_chance_add', amount: 0.1 })
    addAura('b', { type: 'self' }, { type: 'factor_add', amount: 0.2 })
    clearAuras()
    expect(listActiveAuras().length).toBe(0)
  })

  it('clearAurasFromSource 仅清特定来源', () => {
    addAura('a', { type: 'self' }, { type: 'crit_chance_add', amount: 0.1 })
    addAura('b', { type: 'self' }, { type: 'factor_add', amount: 0.2 })
    clearAurasFromSource('a')
    expect(listActiveAuras().length).toBe(1)
    expect(listActiveAuras()[0].sourceInstanceId).toBe('b')
  })
})

describe('Status store · K4 D 占位', () => {
  it('addStatus 注册', () => {
    addStatus({ type: 'self' }, 'placeholder', 3, 5)
    expect(listStatuses().length).toBe(1)
    expect(listStatuses()[0].amount).toBe(3)
  })
})

describe('Fire target rate limiter · K1 4/sec/source', () => {
  it('4 次内放行', () => {
    expect(tryFireTargetQuota('s1', 1000)).toBe(true)
    expect(tryFireTargetQuota('s1', 1100)).toBe(true)
    expect(tryFireTargetQuota('s1', 1200)).toBe(true)
    expect(tryFireTargetQuota('s1', 1300)).toBe(true)
  })

  it('第 5 次同窗口被限流', () => {
    tryFireTargetQuota('s1', 1000)
    tryFireTargetQuota('s1', 1100)
    tryFireTargetQuota('s1', 1200)
    tryFireTargetQuota('s1', 1300)
    expect(tryFireTargetQuota('s1', 1400)).toBe(false)
  })

  it('1s 后新窗口又放行', () => {
    tryFireTargetQuota('s1', 1000)
    tryFireTargetQuota('s1', 1100)
    tryFireTargetQuota('s1', 1200)
    tryFireTargetQuota('s1', 1300)
    expect(tryFireTargetQuota('s1', 2100)).toBe(true)  // > 1s 后新窗口
  })

  it('不同 source 各自独立限流', () => {
    tryFireTargetQuota('s1', 1000)
    tryFireTargetQuota('s1', 1100)
    tryFireTargetQuota('s1', 1200)
    tryFireTargetQuota('s1', 1300)
    expect(tryFireTargetQuota('s1', 1400)).toBe(false)
    expect(tryFireTargetQuota('s2', 1400)).toBe(true)  // 不同 source
  })
})

describe('resetAllAffixV2State · 一键全 reset', () => {
  it('清 state + aura + status + rate limit', () => {
    getInstanceState('a').stacks = 5
    addAura('a', { type: 'self' }, { type: 'crit_chance_add', amount: 0.1 })
    addStatus({ type: 'self' }, 's', 1)

    resetAllAffixV2State()

    expect(peekInstanceState('a')).toBeUndefined()
    expect(listActiveAuras().length).toBe(0)
    expect(listStatuses().length).toBe(0)
  })
})
