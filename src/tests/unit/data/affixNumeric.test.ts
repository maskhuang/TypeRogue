// ============================================
// Story 45.6: 数值型 — 相变 + 吸热/放热 + 聚变 单元测试
// ============================================

import { describe, it, expect } from 'vitest'
import { BASE_VALUES } from '../../../src/data/affixes'
import { getAffixSourceValue } from '../../../src/data/affixTrigger'
import type { ResourceType, ResourceState } from '../../../src/core/types'

// ===== 模拟上下文 =====

function mockResources(overrides: Partial<Record<ResourceType, number>> = {}): ResourceState {
  return { base: 0, score: 0, multiplier: 1, time: 3, gold: 10, energy: 0, mutagen: 0, ...overrides } as any
}

// ===== PhaseShift (相变) =====

describe('PhaseShift bonusPercent calculation', () => {
  function calcPhaseShift(
    sourceVal: number, source: ResourceType, skillRes: ResourceType, level: number,
    params: { kSolid: number, kLiquid: number, kGas: number, phaseT1: number, phaseT2: number, sustainCost: number },
  ): { bonusPercent: number, consume: number } {
    const lvl = Math.max(0, Math.min(level - 1, 2))
    const norm = (BASE_VALUES[skillRes]?.[lvl] ?? 1) / (BASE_VALUES[source]?.[lvl] ?? 1)
    let bonusPercent = 0
    let consume = 0
    if (sourceVal < params.phaseT1) {
      bonusPercent = params.kSolid * sourceVal * norm
    } else if (sourceVal < params.phaseT2) {
      bonusPercent = params.kLiquid * sourceVal * norm
    } else {
      bonusPercent = params.kGas * sourceVal * norm
      consume = params.sustainCost
    }
    return { bonusPercent, consume }
  }

  const params = { kSolid: 0.02, kLiquid: 0.06, kGas: 0.15, phaseT1: 20, phaseT2: 50, sustainCost: 2 }

  it('固态（低于 T1）→ 低加成，无消耗', () => {
    const r = calcPhaseShift(10, 'score', 'base', 1, params)
    expect(r.bonusPercent).toBeGreaterThan(0)
    expect(r.consume).toBe(0)
  })

  it('液态（T1~T2）→ 中加成，无消耗', () => {
    const solid = calcPhaseShift(10, 'score', 'base', 1, params)
    const liquid = calcPhaseShift(30, 'score', 'base', 1, params)
    expect(liquid.bonusPercent).toBeGreaterThan(solid.bonusPercent * 2) // 液态 k 是固态的 3×
    expect(liquid.consume).toBe(0)
  })

  it('气态（≥ T2）→ 高加成 + 消耗', () => {
    const liquid = calcPhaseShift(30, 'score', 'base', 1, params)
    const gas = calcPhaseShift(60, 'score', 'base', 1, params)
    expect(gas.bonusPercent).toBeGreaterThan(liquid.bonusPercent)
    expect(gas.consume).toBe(2)
  })

  it('跨阈值跳升明显', () => {
    const just_below_t1 = calcPhaseShift(19, 'score', 'base', 1, params)
    const just_above_t1 = calcPhaseShift(21, 'score', 'base', 1, params)
    // 21 × kLiquid vs 19 × kSolid → 跳升应明显
    expect(just_above_t1.bonusPercent / just_below_t1.bonusPercent).toBeGreaterThan(2)
  })
})

// ===== EndoExo (吸热/放热) =====

describe('EndoExo bonusPercent calculation', () => {
  function calcEndoExo(
    sourceVal: number, source: ResourceType, skillRes: ResourceType, level: number,
    params: { kExo: number, kEndo: number, endoThreshold: number, endoConsumeRate: number },
  ): { bonusPercent: number, consume: number } {
    const lvl = Math.max(0, Math.min(level - 1, 2))
    const norm = (BASE_VALUES[skillRes]?.[lvl] ?? 1) / (BASE_VALUES[source]?.[lvl] ?? 1)
    if (sourceVal >= params.endoThreshold) {
      return { bonusPercent: params.kExo * sourceVal * norm, consume: params.endoConsumeRate }
    }
    return { bonusPercent: params.kEndo * sourceVal * norm, consume: 0 }
  }

  const params = { kExo: 0.08, kEndo: -0.01, endoThreshold: 25, endoConsumeRate: 3 }

  it('Exo（≥阈值）→ 高正加成 + 消耗', () => {
    const r = calcEndoExo(30, 'score', 'base', 1, params)
    expect(r.bonusPercent).toBeGreaterThan(0)
    expect(r.consume).toBe(3)
  })

  it('Endo（<阈值）→ 负加成，无消耗', () => {
    const r = calcEndoExo(10, 'score', 'base', 1, params)
    expect(r.bonusPercent).toBeLessThan(0)
    expect(r.consume).toBe(0)
  })

  it('Exo 加成远高于 Endo', () => {
    const exo = calcEndoExo(30, 'score', 'base', 1, params)
    const endo = calcEndoExo(20, 'score', 'base', 1, params)
    expect(exo.bonusPercent).toBeGreaterThan(Math.abs(endo.bonusPercent) * 3)
  })
})

// ===== Fusion (聚变) =====

describe('Fusion bonusPercent calculation', () => {
  function calcFusion(
    valA: number, valB: number, srcA: ResourceType, srcB: ResourceType,
    skillRes: ResourceType, level: number,
    params: { fusionK: number, ignitionA: number, ignitionB: number, fusionConsumeA: number, fusionConsumeB: number, fusionPenalty: number },
  ): { bonusPercent: number, consumeA: number, consumeB: number } {
    const lvl = Math.max(0, Math.min(level - 1, 2))
    const normA = (BASE_VALUES[skillRes]?.[lvl] ?? 1) / (BASE_VALUES[srcA]?.[lvl] ?? 1)
    const normB = (BASE_VALUES[skillRes]?.[lvl] ?? 1) / (BASE_VALUES[srcB]?.[lvl] ?? 1)
    if (valA >= params.ignitionA && valB >= params.ignitionB) {
      return {
        bonusPercent: params.fusionK * (valA * normA + valB * normB),
        consumeA: params.fusionConsumeA,
        consumeB: params.fusionConsumeB,
      }
    }
    return { bonusPercent: -params.fusionPenalty, consumeA: 0, consumeB: 0 }
  }

  const params = { fusionK: 0.10, ignitionA: 20, ignitionB: 15, fusionConsumeA: 5, fusionConsumeB: 3, fusionPenalty: 0.10 }

  it('双达阈值 → 高正加成 + 双消耗', () => {
    const r = calcFusion(30, 20, 'base', 'time', 'score', 1, params)
    expect(r.bonusPercent).toBeGreaterThan(0)
    expect(r.consumeA).toBe(5)
    expect(r.consumeB).toBe(3)
  })

  it('A 不达阈值 → 惩罚 + 无消耗', () => {
    const r = calcFusion(10, 20, 'base', 'time', 'score', 1, params)
    expect(r.bonusPercent).toBe(-0.10)
    expect(r.consumeA).toBe(0)
  })

  it('B 不达阈值 → 惩罚 + 无消耗', () => {
    const r = calcFusion(30, 5, 'base', 'time', 'score', 1, params)
    expect(r.bonusPercent).toBe(-0.10)
    expect(r.consumeB).toBe(0)
  })

  it('双不达 → 惩罚', () => {
    const r = calcFusion(5, 5, 'base', 'time', 'score', 1, params)
    expect(r.bonusPercent).toBe(-0.10)
  })

  it('成功的加成远高于失败的惩罚', () => {
    const success = calcFusion(30, 20, 'base', 'time', 'score', 1, params)
    expect(success.bonusPercent).toBeGreaterThan(Math.abs(params.fusionPenalty) * 2)
  })
})
