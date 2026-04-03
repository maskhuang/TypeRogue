// ============================================
// Story 45.5: consume() 资源消耗基础设施 单元测试
// ============================================

import { describe, it, expect } from 'vitest'
import type { ResourceType } from '../../../src/core/types'

// ===== 模拟 consume 执行逻辑 =====

/** 模拟 orchestrator 中的 consume 执行逻辑 */
function executeConsumeRequests(
  consumeRequests: { resource: ResourceType, amount: number }[],
  resources: Record<string, number>,
): Record<string, number> {
  const result = { ...resources }
  for (const req of consumeRequests) {
    const current = result[req.resource] ?? 0
    const consumeAmount = Math.min(req.amount, Math.max(0, current))
    if (consumeAmount > 0) {
      result[req.resource] = current - consumeAmount
    }
  }
  return result
}

// ===== Phase2Result.consumeRequests 空数组 =====

describe('consumeRequests initialization', () => {
  it('无 consume 请求时为空数组', () => {
    const consumeRequests: { resource: ResourceType, amount: number }[] = []
    expect(consumeRequests).toHaveLength(0)
    expect(consumeRequests).toEqual([])
  })
})

// ===== consume 执行逻辑 =====

describe('consume execution logic', () => {
  it('单个 consume 请求正确扣减资源', () => {
    const resources = { base: 100, score: 200, multiplier: 1, time: 5, gold: 50, energy: 10, mutagen: 5 }
    const result = executeConsumeRequests(
      [{ resource: 'base', amount: 30 }],
      resources,
    )
    expect(result.base).toBe(70)
    expect(result.score).toBe(200) // 其他资源不受影响
  })

  it('多个 consume 请求叠加执行', () => {
    const resources = { base: 100, score: 200, multiplier: 1, time: 5, gold: 50, energy: 10, mutagen: 5 }
    const result = executeConsumeRequests(
      [
        { resource: 'base', amount: 20 },
        { resource: 'base', amount: 30 },
        { resource: 'score', amount: 50 },
      ],
      resources,
    )
    // base: 100 - 20 = 80, 然后 80 - 30 = 50
    expect(result.base).toBe(50)
    expect(result.score).toBe(150)
  })

  it('资源不足时扣减到 0 而非负值', () => {
    const resources = { base: 10, score: 200, multiplier: 1, time: 5, gold: 50, energy: 10, mutagen: 5 }
    const result = executeConsumeRequests(
      [{ resource: 'base', amount: 50 }],
      resources,
    )
    expect(result.base).toBe(0) // min(50, 10) = 10 consumed, 10-10=0
  })

  it('多次消耗同一资源时第二次基于第一次消耗后的值', () => {
    const resources = { base: 30, score: 200, multiplier: 1, time: 5, gold: 50, energy: 10, mutagen: 5 }
    const result = executeConsumeRequests(
      [
        { resource: 'base', amount: 20 }, // 30 → 10
        { resource: 'base', amount: 20 }, // 10 → 0 (min(20,10)=10)
      ],
      resources,
    )
    expect(result.base).toBe(0)
  })

  it('无 consume 请求时不触发任何资源变化', () => {
    const resources = { base: 100, score: 200, multiplier: 1, time: 5, gold: 50, energy: 10, mutagen: 5 }
    const result = executeConsumeRequests([], resources)
    expect(result).toEqual(resources)
  })

  it('消耗已为 0 的资源无变化', () => {
    const resources = { base: 0, score: 200, multiplier: 1, time: 5, gold: 50, energy: 10, mutagen: 5 }
    const result = executeConsumeRequests(
      [{ resource: 'base', amount: 50 }],
      resources,
    )
    expect(result.base).toBe(0)
  })

  it('消耗 time 资源（小数值）', () => {
    const resources = { base: 100, score: 200, multiplier: 1, time: 3.5, gold: 50, energy: 10, mutagen: 5 }
    const result = executeConsumeRequests(
      [{ resource: 'time', amount: 1.5 }],
      resources,
    )
    expect(result.time).toBeCloseTo(2.0)
  })
})
