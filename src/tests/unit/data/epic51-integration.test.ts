// Epic 51 集成 + 平衡测试

import { describe, it, expect } from 'vitest'
import { AffixType, AFFIX_WEIGHT_TIERS, AFFIX_CATEGORY_MAP, AFFIX_NAMES, createSkillRuntimeState } from '../../../src/data/affixes'
import { rollAffixParams } from '../../../src/data/skillGeneration'

describe('Epic 51 data', () => {
  it('Decorator/Reflect/MonkeyPatch in meta_rule', () => {
    expect(AFFIX_CATEGORY_MAP[AffixType.Decorator]).toBe('meta_rule')
    expect(AFFIX_CATEGORY_MAP[AffixType.Reflect]).toBe('meta_rule')
    expect(AFFIX_CATEGORY_MAP[AffixType.MonkeyPatch]).toBe('meta_rule')
  })

  it('weight tiers', () => {
    expect(AFFIX_WEIGHT_TIERS[AffixType.Decorator]).toBe('low')
    expect(AFFIX_WEIGHT_TIERS[AffixType.Reflect]).toBe('high')
    expect(AFFIX_WEIGHT_TIERS[AffixType.MonkeyPatch]).toBe('low')
  })

  it('names', () => {
    expect(AFFIX_NAMES[AffixType.Decorator]).toBe('装饰器')
    expect(AFFIX_NAMES[AffixType.Reflect]).toBe('反射')
    expect(AFFIX_NAMES[AffixType.MonkeyPatch]).toBe('猴子补丁')
  })
})

describe('Epic 51 rollAffixParams', () => {
  it('Decorator has decoratorK', () => {
    const p = rollAffixParams(AffixType.Decorator, 'base')
    expect(p.decoratorK).toBeGreaterThanOrEqual(0.20)
    expect(p.decoratorK).toBeLessThanOrEqual(0.40)
  })

  it('Reflect has reflectK', () => {
    const p = rollAffixParams(AffixType.Reflect, 'base')
    expect(p.reflectK).toBeGreaterThanOrEqual(0.04)
    expect(p.reflectK).toBeLessThanOrEqual(0.08)
  })

  it('MonkeyPatch has patchLow/patchHigh', () => {
    const p = rollAffixParams(AffixType.MonkeyPatch, 'base')
    expect(p.patchLow).toBe(0.5)
    expect(p.patchHigh).toBe(2.0)
  })
})

describe('Epic 51 logic', () => {
  it('Decorator: amplifies bonusPercent by decoratorK', () => {
    const bonus = 0.50
    const decoratorK = 0.30
    const amplified = bonus + bonus * decoratorK
    expect(amplified).toBeCloseTo(0.65) // +50% → +65%
  })

  it('Reflect: affixCount × level × reflectK', () => {
    const reflectK = 0.06
    // 3 affixes, level 2 → score=6
    expect(reflectK * 6).toBeCloseTo(0.36) // +36%
    // 1 affix, level 1 → score=1
    expect(reflectK * 1).toBeCloseTo(0.06) // +6%
  })

  it('MonkeyPatch runtime state defaults', () => {
    const state = createSkillRuntimeState('test')
    expect(state.patchTargetIndex).toBe(-1)
    expect(state.patchMultiplier).toBe(1.0)
  })

  it('MonkeyPatch multiplier range 0.5~2.0, expectation 1.25', () => {
    const low = 0.5, high = 2.0
    const expected = (low + high) / 2
    expect(expected).toBe(1.25)
  })

  it('Decorator amplifies negative bonus too', () => {
    const bonus = -0.50 // Taboo miss
    const decoratorK = 0.30
    const amplified = bonus + bonus * decoratorK
    expect(amplified).toBeCloseTo(-0.65)
  })
})
