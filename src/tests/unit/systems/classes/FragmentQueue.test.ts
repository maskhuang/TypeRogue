// ============================================
// 打字肉鸽 - 采集队列单元测试
// ============================================
// Story 32.4: 字母碎片资源 + 采集队列

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { state, resetState } from '../../../../src/core/state'

// Mock seededRandom
vi.mock('../../../../src/core/seededRandom', () => ({
  random: vi.fn(() => 0.5),
}))

import { random } from '../../../../src/core/seededRandom'
import {
  resolveFragmentAmount,
  distributeFragments,
  setFragmentQueue,
  getMaxQueueLength,
  routeFragmentsToInventory,
} from '../../../../src/systems/classes/FragmentQueue'

const mockedRandom = vi.mocked(random)

describe('getMaxQueueLength', () => {
  it('基础队列长度为 6', () => {
    expect(getMaxQueueLength()).toBe(6)
  })
})

describe('resolveFragmentAmount', () => {
  beforeEach(() => {
    mockedRandom.mockReset()
  })

  it('整数值直接返回（无概率溢出）', () => {
    expect(resolveFragmentAmount(3)).toBe(3)
    expect(resolveFragmentAmount(1)).toBe(1)
    expect(resolveFragmentAmount(0)).toBe(0)
  })

  it('小数部分触发概率溢出 — random < frac → +1', () => {
    mockedRandom.mockReturnValue(0.2) // 0.2 < 0.5 → 额外 +1
    expect(resolveFragmentAmount(2.5)).toBe(3)
  })

  it('小数部分未触发概率溢出 — random >= frac → 保底', () => {
    mockedRandom.mockReturnValue(0.7) // 0.7 >= 0.5 → 保底
    expect(resolveFragmentAmount(2.5)).toBe(2)
  })

  it('frac = 0.0 时不额外加 1', () => {
    mockedRandom.mockReturnValue(0.0) // random = 0，但 frac = 0 → 不触发
    expect(resolveFragmentAmount(2.0)).toBe(2)
  })

  it('frac 极小值 0.01 — 低概率触发', () => {
    mockedRandom.mockReturnValue(0.005) // 0.005 < 0.01 → +1
    expect(resolveFragmentAmount(1.01)).toBe(2)
    mockedRandom.mockReturnValue(0.02) // 0.02 >= 0.01 → 保底
    expect(resolveFragmentAmount(1.01)).toBe(1)
  })

  it('frac 极大值 0.99 — 高概率触发', () => {
    mockedRandom.mockReturnValue(0.98) // 0.98 < 0.99 → +1
    expect(resolveFragmentAmount(1.99)).toBe(2)
    mockedRandom.mockReturnValue(0.995) // 0.995 >= 0.99 → 保底
    expect(resolveFragmentAmount(1.99)).toBe(1)
  })
})

describe('distributeFragments', () => {
  beforeEach(() => {
    resetState()
  })

  it('单碎片分配到当前队列位置的字母', () => {
    state.fragmentQueue = ['e', 'a', 't', '_', '_', '_']
    state.fragmentQueuePosition = 0
    const result = distributeFragments(1)
    expect(result).toEqual({ e: 1 })
    expect(state.fragmentQueuePosition).toBe(1)
  })

  it('多碎片分配到多个字母（推进多格）', () => {
    state.fragmentQueue = ['e', 'a', 't', '_', '_', '_']
    state.fragmentQueuePosition = 0
    const result = distributeFragments(3)
    expect(result).toEqual({ e: 1, a: 1, t: 1 })
    expect(state.fragmentQueuePosition).toBe(3)
  })

  it('跳过 _ 空格', () => {
    state.fragmentQueue = ['e', '_', 'a', '_', '_', '_']
    state.fragmentQueuePosition = 0
    const result = distributeFragments(2)
    expect(result).toEqual({ e: 1, a: 1 })
    // 位置应跳过 _ → e(0), _(1)skip, a(2)
    expect(state.fragmentQueuePosition).toBe(3)
  })

  it('队列循环 — position 到末尾后回到头部', () => {
    state.fragmentQueue = ['e', 'a', 't']
    state.fragmentQueuePosition = 2 // 从 't' 开始
    const result = distributeFragments(3)
    // t(2) → e(0) → a(1)
    expect(result).toEqual({ t: 1, e: 1, a: 1 })
    expect(state.fragmentQueuePosition).toBe(2) // 回到起点
  })

  it('同一字母多次出现时累加', () => {
    state.fragmentQueue = ['e', 'e', 'a']
    state.fragmentQueuePosition = 0
    const result = distributeFragments(3)
    expect(result).toEqual({ e: 2, a: 1 })
  })

  it('全 _ 队列不分配任何碎片且 position 回到起点', () => {
    state.fragmentQueue = ['_', '_', '_', '_', '_', '_']
    state.fragmentQueuePosition = 0
    const result = distributeFragments(5)
    expect(result).toEqual({})
    expect(state.fragmentQueuePosition).toBe(0) // 6 次推进回到 0
  })

  it('amount = 0 返回空结果', () => {
    state.fragmentQueue = ['e', 'a', 't']
    const result = distributeFragments(0)
    expect(result).toEqual({})
  })

  it('空队列返回空结果', () => {
    state.fragmentQueue = []
    const result = distributeFragments(3)
    expect(result).toEqual({})
  })

  it('大量碎片分配正确循环', () => {
    state.fragmentQueue = ['x', 'y']
    state.fragmentQueuePosition = 0
    const result = distributeFragments(6)
    expect(result).toEqual({ x: 3, y: 3 })
  })
})

describe('setFragmentQueue', () => {
  beforeEach(() => {
    resetState()
  })

  it('设定队列内容', () => {
    setFragmentQueue(['E', 'A', 'T', '_', '_', '_'])
    expect(state.fragmentQueue).toEqual(['e', 'a', 't', '_', '_', '_'])
  })

  it('字母自动小写化', () => {
    setFragmentQueue(['A', 'B', 'C'])
    expect(state.fragmentQueue).toEqual(['a', 'b', 'c'])
  })

  it('超过最大长度截断', () => {
    setFragmentQueue(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])
    expect(state.fragmentQueue).toHaveLength(6) // 基础最大 6
  })

  it('队列位置越界时重置为 0', () => {
    state.fragmentQueue = ['a', 'b', 'c', 'd', 'e', 'f']
    state.fragmentQueuePosition = 5
    setFragmentQueue(['x', 'y']) // 长度 2，position 5 越界
    expect(state.fragmentQueuePosition).toBe(0)
  })

  it('队列位置未越界时保持不变', () => {
    state.fragmentQueuePosition = 2
    setFragmentQueue(['a', 'b', 'c', 'd', 'e', 'f'])
    expect(state.fragmentQueuePosition).toBe(2)
  })

  it('非法字符替换为 _', () => {
    setFragmentQueue(['a', '123', 'b', '!', 'cd'])
    expect(state.fragmentQueue).toEqual(['a', '_', 'b', '_', '_'])
  })
})

describe('routeFragmentsToInventory', () => {
  beforeEach(() => {
    resetState()
    mockedRandom.mockReset()
  })

  it('累加 classResourceProduced + 分配到 fragmentInventory', () => {
    state.fragmentQueue = ['e', 'a', 't', '_', '_', '_']
    state.fragmentQueuePosition = 0
    routeFragmentsToInventory(2)
    expect(state.classResourceProduced.fragment).toBe(2)
    expect(state.fragmentInventory.e).toBe(1)
    expect(state.fragmentInventory.a).toBe(1)
  })

  it('多次调用累加 classResourceProduced', () => {
    state.fragmentQueue = ['e', '_', '_', '_', '_', '_']
    state.fragmentQueuePosition = 0
    routeFragmentsToInventory(1)
    routeFragmentsToInventory(3)
    expect(state.classResourceProduced.fragment).toBe(4)
  })

  it('概率溢出影响 inventory 但不影响 classResourceProduced', () => {
    state.fragmentQueue = ['e', '_', '_', '_', '_', '_']
    state.fragmentQueuePosition = 0
    mockedRandom.mockReturnValue(0.1) // 触发 +1
    routeFragmentsToInventory(1.5)
    // classResourceProduced 累加原始浮点 1.5
    expect(state.classResourceProduced.fragment).toBe(1.5)
    // inventory 经过概率溢出: floor(1.5)=1, frac=0.5, random(0.1)<0.5 → +1 → 2
    expect(state.fragmentInventory.e).toBe(2)
  })
})
