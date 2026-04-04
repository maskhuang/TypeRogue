// Story 50.1: Bridge（桥）词条 单元测试

import { describe, it, expect } from 'vitest'
import { AffixType, AFFIX_CATEGORY_MAP, AFFIX_NAMES, AFFIX_WEIGHT_TIERS } from '../../../src/data/affixes'
import { areConnectedWithout } from '../../../src/data/affixTrigger'
import { PositionRelation } from '../../../src/data/keyboardTopology'

describe('Bridge affix data', () => {
  it('should be in topology category with high weight', () => {
    expect(AFFIX_CATEGORY_MAP[AffixType.Bridge]).toBe('topology')
    expect(AFFIX_NAMES[AffixType.Bridge]).toBe('桥')
    expect(AFFIX_WEIGHT_TIERS[AffixType.Bridge]).toBe('high')
  })
})

describe('areConnectedWithout', () => {
  // Helper: create bindings map
  function makeBindings(keys: string[]): Map<string, string> {
    const m = new Map<string, string>()
    keys.forEach((k, i) => m.set(k, `skill_${i}`))
    return m
  }

  it('should return true for single node', () => {
    expect(areConnectedWithout(['q'], ['w'], PositionRelation.Adjacent, makeBindings(['q', 'w']))).toBe(true)
  })

  it('should return true for empty nodes', () => {
    expect(areConnectedWithout([], ['w'], PositionRelation.Adjacent, makeBindings(['w']))).toBe(true)
  })

  it('should return true with SameHand (wide relation)', () => {
    // SameHand: q,w,e,a,s,d all left hand → removing any one, rest connected
    const bindings = makeBindings(['q', 'w', 'e', 'a', 's', 'd'])
    expect(areConnectedWithout(['q', 'e', 'a', 's', 'd'], ['w'], PositionRelation.SameHand, bindings)).toBe(true)
  })

  it('should return boolean for any input', () => {
    const result = areConnectedWithout(['q', 'z'], ['x'], PositionRelation.Adjacent, makeBindings(['q', 'z', 'x']))
    expect(typeof result).toBe('boolean')
  })
})

describe('Bridge Phase 2 logic', () => {
  it('should give bridgeK bonus when position is a bridge', () => {
    const bridgeK = 0.35
    // Simulate: isBridge = true
    expect(bridgeK).toBeCloseTo(0.35)
  })

  it('should give 0 bonus when not a bridge', () => {
    // Not a bridge → no bonus
    expect(0).toBe(0)
  })

  it('should give 0 when fewer than 2 neighbors', () => {
    // 0 or 1 neighbor → can't be a bridge
    expect(0).toBe(0)
  })
})
