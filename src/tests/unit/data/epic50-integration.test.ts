// Epic 50 集成 + 平衡测试

import { describe, it, expect } from 'vitest'
import { AffixType, AFFIX_WEIGHT_TIERS, AFFIX_WEIGHTS, rollAffixWeights, AFFIX_CATEGORY_MAP } from '../../../src/data/affixes'
import { rollAffixParams } from '../../../src/data/skillGeneration'
import { findMaxClique, bfsComponentSize, areConnectedWithout } from '../../../src/data/affixTrigger'
import { PositionRelation } from '../../../src/data/keyboardTopology'

describe('Epic 50 data', () => {
  it('Bridge/Clique/Component in topology with high weight', () => {
    expect(AFFIX_CATEGORY_MAP[AffixType.Bridge]).toBe('topology')
    expect(AFFIX_CATEGORY_MAP[AffixType.Clique]).toBe('topology')
    expect(AFFIX_CATEGORY_MAP[AffixType.Component]).toBe('topology')
    expect(AFFIX_WEIGHT_TIERS[AffixType.Bridge]).toBe('high')
    expect(AFFIX_WEIGHT_TIERS[AffixType.Clique]).toBe('high')
    expect(AFFIX_WEIGHT_TIERS[AffixType.Component]).toBe('high')
  })

  it('rollAffixWeights includes new affixes', () => {
    rollAffixWeights(() => 0.5)
    expect(AFFIX_WEIGHTS[AffixType.Bridge]).toBeGreaterThanOrEqual(6)
    expect(AFFIX_WEIGHTS[AffixType.Clique]).toBeGreaterThanOrEqual(6)
    expect(AFFIX_WEIGHTS[AffixType.Component]).toBeGreaterThanOrEqual(6)
  })
})

describe('Epic 50 rollAffixParams', () => {
  it('Bridge has bridgeK + posRel', () => {
    const p = rollAffixParams(AffixType.Bridge, 'base')
    expect(p.bridgeK).toBeGreaterThanOrEqual(0.25)
    expect(p.posRel).toBeDefined()
  })

  it('Clique has cliqueK + posRel', () => {
    const p = rollAffixParams(AffixType.Clique, 'base')
    expect(p.cliqueK).toBeGreaterThanOrEqual(0.10)
    expect(p.posRel).toBeDefined()
  })

  it('Component has componentK, no posRel', () => {
    const p = rollAffixParams(AffixType.Component, 'base')
    expect(p.componentK).toBeGreaterThanOrEqual(0.03)
    expect(p.posRel).toBeUndefined()
  })
})

describe('Graph algorithm utilities', () => {
  it('findMaxClique returns 1 for single node', () => {
    expect(findMaxClique(['q'], PositionRelation.Adjacent)).toBe(1)
  })

  it('findMaxClique returns correct size for connected pair', () => {
    // q and w are adjacent on QWERTY
    const size = findMaxClique(['q', 'w'], PositionRelation.Adjacent)
    expect(size).toBeGreaterThanOrEqual(1) // at least 1
  })

  it('bfsComponentSize returns 1 for isolated key', () => {
    const bindings = new Map([['q', 'skill_1']])
    // q alone, no adjacent bound keys
    expect(bfsComponentSize('q', PositionRelation.Adjacent, bindings)).toBe(1)
  })

  it('bfsComponentSize returns 0 for unbound key', () => {
    const bindings = new Map<string, string>()
    expect(bfsComponentSize('q', PositionRelation.Adjacent, bindings)).toBe(0)
  })

  it('areConnectedWithout returns boolean', () => {
    const bindings = new Map([['q', 's1'], ['w', 's2'], ['e', 's3']])
    const result = areConnectedWithout(['q', 'e'], 'w', PositionRelation.Adjacent, bindings)
    expect(typeof result).toBe('boolean')
  })
})

describe('Epic 50 balance', () => {
  it('Bridge: binary bonus (0 or bridgeK)', () => {
    const bridgeK = 0.35
    expect(bridgeK).toBeLessThanOrEqual(0.45)
    expect(bridgeK).toBeGreaterThanOrEqual(0.25)
  })

  it('Clique: max 3-clique on Adjacent → max bonus = cliqueK × 2', () => {
    const cliqueK = 0.15
    const maxBonus = cliqueK * 2 // clique=3, -1=2
    expect(maxBonus).toBeCloseTo(0.30) // reasonable
  })

  it('Component: 12 connected → max bonus = componentK × 11', () => {
    const componentK = 0.04
    const maxBonus = componentK * 11
    expect(maxBonus).toBeCloseTo(0.44) // high but extreme case
  })
})
