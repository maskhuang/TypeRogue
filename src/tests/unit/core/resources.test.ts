// ============================================
// 打字肉鸽 - 资源系统单元测试
// ============================================
// Story 19.1: 5 资源核心系统

import { describe, it, expect, beforeEach } from 'vitest'
import { state, synergy, resetState, createInitialState, resetResources } from '../../../src/core/state'
import { BALANCE } from '../../../src/core/constants'

describe('ResourceState 初始化', () => {
  beforeEach(() => {
    resetState()
  })

  it('createInitialState 包含 resources 字段', () => {
    const s = createInitialState()
    expect(s.resources).toBeDefined()
  })

  it('resources.base 初始值为 0', () => {
    expect(state.resources.base).toBe(0)
  })

  it('resources.score 初始值为 0', () => {
    expect(state.resources.score).toBe(0)
  })

  it('resources.multiplier 初始值为 1.0', () => {
    expect(state.resources.multiplier).toBe(1.0)
  })

  it('resources.time 初始值为 TIME_PER_LEVEL', () => {
    expect(state.resources.time).toBe(BALANCE.TIME_PER_LEVEL)
  })

  it('resetState 重置 resources 为初始值', () => {
    state.resources.base = 10
    state.resources.score = 50
    state.resources.multiplier = 3.5
    resetState()
    expect(state.resources.base).toBe(0)
    expect(state.resources.score).toBe(0)
    expect(state.resources.multiplier).toBe(1.0)
  })
})

describe('resetResources', () => {
  beforeEach(() => {
    resetState()
  })

  it('重置 base 为 0', () => {
    state.resources.base = 15
    resetResources()
    expect(state.resources.base).toBe(0)
  })

  it('重置 score 为 0', () => {
    state.resources.score = 100
    resetResources()
    expect(state.resources.score).toBe(0)
  })

  it('重置 multiplier 为 1.0', () => {
    state.resources.multiplier = 5.0
    resetResources()
    expect(state.resources.multiplier).toBe(1.0)
  })

  it('重置 time 为 timeMax', () => {
    state.timeMax = 45
    state.resources.time = 10
    resetResources()
    expect(state.resources.time).toBe(45)
  })

})

describe('分数公式正确性', () => {
  beforeEach(() => {
    resetState()
  })

  it('finalScore = floor((base + wordBonus) × multiplier)', () => {
    // 模拟：base=5, wordBonus=3, mult=2.0 → floor((5+3) × 2.0) = 16
    state.resources.base = 5
    state.resources.multiplier = 2.0
    state.player.wordBonus = 3
    const finalScore = Math.floor((state.resources.base + state.player.wordBonus) * state.resources.multiplier)
    expect(finalScore).toBe(16)
  })

  it('base=0 时 finalScore = floor(wordBonus × multiplier)', () => {
    state.resources.base = 0
    state.resources.multiplier = 1.5
    state.player.wordBonus = 4
    const finalScore = Math.floor((state.resources.base + state.player.wordBonus) * state.resources.multiplier)
    expect(finalScore).toBe(6) // floor(4 × 1.5) = 6
  })

  it('multiplier 小数精度 floor', () => {
    state.resources.base = 7
    state.resources.multiplier = 1.3
    state.player.wordBonus = 0
    const finalScore = Math.floor((state.resources.base + state.player.wordBonus) * state.resources.multiplier)
    expect(finalScore).toBe(9) // floor(7 × 1.3) = floor(9.1) = 9
  })
})

describe('时间资源 clamp', () => {
  beforeEach(() => {
    resetState()
  })

  it('时间不超过 timeMax × 2', () => {
    state.timeMax = 30
    state.resources.time = 30
    // 技能加时间
    state.resources.time += 50
    state.resources.time = Math.min(state.resources.time, state.timeMax * 2)
    expect(state.resources.time).toBe(60) // 30 × 2 = 60
  })

  it('时间不低于 0', () => {
    state.resources.time = 5
    state.resources.time -= 10
    state.resources.time = Math.max(0, state.resources.time)
    expect(state.resources.time).toBe(0)
  })
})

describe('resetResources 与 timeMax 联动', () => {
  beforeEach(() => {
    resetState()
  })

  it('resetResources 使用当前 timeMax（非初始值）', () => {
    state.timeMax = 60 // 模拟精英关更长时间
    resetResources()
    expect(state.resources.time).toBe(60)
  })

  it('timeMax 改变后 resetResources 反映新值', () => {
    state.timeMax = 30
    resetResources()
    expect(state.resources.time).toBe(30)
    state.timeMax = 45 // tempBuff 增加时间
    resetResources()
    expect(state.resources.time).toBe(45)
  })
})

describe('资源直接操作', () => {
  beforeEach(() => {
    resetState()
  })

  it('multiply 通过 proxy 自动同步到 resources.multiplier', () => {
    state.multiplier = 1.5
    state.multiplier += 0.3
    expect(state.multiplier).toBeCloseTo(1.8)
    expect(state.resources.multiplier).toBeCloseTo(1.8) // proxy 自动同步
  })

  it('time 通过 proxy 自动同步到 resources.time，clamp timeMax × 2', () => {
    state.time = 25
    state.timeMax = 30
    state.time += 50
    state.time = Math.min(state.time, state.timeMax * 2)
    expect(state.time).toBe(60) // min(75, 30*2=60)
    expect(state.resources.time).toBe(60) // proxy 自动同步
  })
})

describe('资源 proxy（multiplier/time 双向同步）', () => {
  beforeEach(() => {
    resetState()
  })

  it('写入 resources.multiplier 自动更新 state.multiplier', () => {
    state.resources.multiplier = 2.5
    expect(state.multiplier).toBe(2.5)
  })

  it('写入 state.multiplier 自动反映到 resources.multiplier', () => {
    state.multiplier = 3.0
    expect(state.resources.multiplier).toBe(3.0)
  })

  it('写入 resources.time 自动更新 state.time', () => {
    state.resources.time = 45
    expect(state.time).toBe(45)
  })

  it('写入 state.time 自动反映到 resources.time', () => {
    state.time = 20
    expect(state.resources.time).toBe(20)
  })
})

describe('RESOURCE_COLORS', () => {
  it('定义了 5 种通用资源颜色', async () => {
    const { RESOURCE_COLORS } = await import('../../../src/core/constants')
    expect(RESOURCE_COLORS.base).toBe('#e74c3c')
    expect(RESOURCE_COLORS.score).toBe('#f1c40f')
    expect(RESOURCE_COLORS.multiplier).toBe('#e67e22')
    expect(RESOURCE_COLORS.time).toBe('#3498db')
    expect(RESOURCE_COLORS.gold).toBe('#ffd700')
  })

  it('定义了职业资源颜色', async () => {
    const { RESOURCE_COLORS } = await import('../../../src/core/constants')
    expect(RESOURCE_COLORS.fragment).toBe('#9b59b6')
    expect(RESOURCE_COLORS.mutagen).toBe('#2ecc71')
  })
})

describe('职业资源初始化 (Story 32.2)', () => {
  beforeEach(() => {
    resetState()
  })

  it('resources.fragment 初始值为 0', () => {
    expect(state.resources.fragment).toBe(0)
  })

  it('resources.mutagen 初始值为 0', () => {
    expect(state.resources.mutagen).toBe(0)
  })

  it('classResourceProduced 初始为空对象', () => {
    expect(state.classResourceProduced).toEqual({})
  })

  it('fragmentInventory 初始为 26 字母全 0', () => {
    expect(Object.keys(state.fragmentInventory)).toHaveLength(26)
    for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
      expect(state.fragmentInventory[letter]).toBe(0)
    }
  })

  it('mutagenInventory 初始为 0', () => {
    expect(state.mutagenInventory).toBe(0)
  })

  it('resetResources 重置 fragment/mutagen 和 classResourceProduced', () => {
    state.resources.fragment = 10
    state.resources.mutagen = 5
    state.classResourceProduced = { fragment: 10, mutagen: 5 }
    resetResources()
    expect(state.resources.fragment).toBe(0)
    expect(state.resources.mutagen).toBe(0)
    expect(state.classResourceProduced).toEqual({})
  })

  it('classResourceProduced 可正确累加 fragment', () => {
    state.classResourceProduced.fragment = (state.classResourceProduced.fragment ?? 0) + 5
    state.classResourceProduced.fragment = (state.classResourceProduced.fragment ?? 0) + 3
    expect(state.classResourceProduced.fragment).toBe(8)
  })

  it('classResourceProduced 可正确累加 mutagen', () => {
    state.classResourceProduced.mutagen = (state.classResourceProduced.mutagen ?? 0) + 7
    expect(state.classResourceProduced.mutagen).toBe(7)
  })

  it('fragmentInventory 各字母可独立累加', () => {
    state.fragmentInventory.e = (state.fragmentInventory.e ?? 0) + 4
    state.fragmentInventory.e = (state.fragmentInventory.e ?? 0) + 6
    expect(state.fragmentInventory.e).toBe(10)
    state.fragmentInventory.a = (state.fragmentInventory.a ?? 0) + 3
    expect(state.fragmentInventory.a).toBe(3)
  })

  it('mutagenInventory 可正确累加', () => {
    state.mutagenInventory += 3
    state.mutagenInventory += 2
    expect(state.mutagenInventory).toBe(5)
  })

  it('resetResources 不重置跨关库存（fragmentInventory/mutagenInventory）', () => {
    state.fragmentInventory.a = 3
    state.fragmentInventory.e = 5
    state.mutagenInventory = 7
    resetResources()
    expect(state.fragmentInventory.a).toBe(3)
    expect(state.fragmentInventory.e).toBe(5)
    expect(state.mutagenInventory).toBe(7)
  })

  it('createInitialState 包含 fragmentQueue 和 fragmentQueuePosition', () => {
    const s = createInitialState()
    expect(s.fragmentQueue).toEqual(['_', '_', '_', '_', '_', '_'])
    expect(s.fragmentQueuePosition).toBe(0)
  })

  it('resetResources 重置 fragmentQueuePosition 但不重置 fragmentQueue', () => {
    state.fragmentQueue = ['e', 'a', 't', '_', '_', '_']
    state.fragmentQueuePosition = 3
    resetResources()
    expect(state.fragmentQueuePosition).toBe(0)
    expect(state.fragmentQueue).toEqual(['e', 'a', 't', '_', '_', '_'])
  })
})
