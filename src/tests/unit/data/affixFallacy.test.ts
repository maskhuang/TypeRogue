// ============================================
// 打字肉鸽 - Fallacy（赌徒谬误）词条单元测试
// ============================================

import { describe, it, expect } from 'vitest'
import {
  AffixType,
  AffixInstance,
  AffixSkillInstance,
  SkillRuntimeState,
} from '../../../src/data/affixes'
import {
  resolvePhase3,
  TriggerContext,
} from '../../../src/data/affixTrigger'
import type { ResourceState } from '../../../src/core/types'

// ===== 工厂辅助 =====

function makeResources(overrides?: Partial<ResourceState>): ResourceState {
  return {
    base: 0, score: 0, multiplier: 1, time: 30, gold: 100,
    fragment: 0, mutagen: 0,
    ...overrides,
  }
}

function makeSkill(overrides?: Partial<AffixSkillInstance>): AffixSkillInstance {
  return {
    id: 'test_skill',
    name: '测试技能',
    icon: '⚔️',
    resource: 'base',
    baseValues: [5, 8, 12],
    level: 1,
    rarity: 0 as 0,
    affixes: [],
    enchantmentIds: [],
    ...overrides,
  }
}

function makeRuntimeState(overrides?: Partial<SkillRuntimeState>): SkillRuntimeState {
  return {
    skillId: 'test_skill',
    chargeAccumulated: 0,
    currentDecayMult: 1,
    mirrorCopiedAffix: null,
    mirrorCopiedAffixes: [],
    stacks: 0,
    apprenticeAccumulated: 0,
    questStacks: 0,
    questCompletions: 0,
    questTransformed: false,
    counterCharges: 0,
    exhaustCount: 0,
    etherealTriggered: false,
    ...overrides,
  }
}

function makeContext(overrides?: Partial<TriggerContext>): TriggerContext {
  const triggerKey = overrides?.triggerKey ?? 'a'
  return {
    triggerKey,
    occupiedKeys: [triggerKey],
    currentWord: 'apple',
    resources: makeResources(),
    classResourceProduced: {},
    bindings: new Map(),
    skillStates: new Map(),
    allSkills: new Map(),
    randomFn: () => 0.5,
    ...overrides,
  }
}

// ===== Fallacy 测试 =====

describe('Fallacy affix (赌徒谬误)', () => {
  const fallacyK = 0.08

  function makeFallacyAffix(fallacyStacks: number = 0): AffixInstance {
    return { type: AffixType.Fallacy, fallacyK, fallacyStacks }
  }

  it('should add stacks × fallacyK to crit chance', () => {
    const affix = makeFallacyAffix(5)
    const skill = makeSkill({ affixes: [affix] })
    const state = makeRuntimeState()
    // 5 stacks × 0.08 = 0.40 crit chance; randomFn=0.3 < 0.40 → crit
    const ctx = makeContext({ randomFn: () => 0.3 })
    const result = resolvePhase3(skill, state, ctx, 10)
    expect(result.flags.isCrit).toBe(true)
  })

  it('should NOT crit when stacks × fallacyK < roll', () => {
    const affix = makeFallacyAffix(2)
    const skill = makeSkill({ affixes: [affix] })
    const state = makeRuntimeState()
    // 2 stacks × 0.08 = 0.16 crit chance; randomFn=0.5 > 0.16 → no crit
    const ctx = makeContext({ randomFn: () => 0.5 })
    const result = resolvePhase3(skill, state, ctx, 10)
    expect(result.flags.isCrit).toBe(false)
  })

  it('should reset stacks to 0 on crit', () => {
    const affix = makeFallacyAffix(5)
    const skill = makeSkill({ affixes: [affix] })
    const state = makeRuntimeState()
    // 5 × 0.08 = 0.40; randomFn=0.3 → crit
    const ctx = makeContext({ randomFn: () => 0.3 })
    resolvePhase3(skill, state, ctx, 10)
    expect(affix.fallacyStacks).toBe(0)
  })

  it('should increment stacks on non-crit', () => {
    const affix = makeFallacyAffix(2)
    const skill = makeSkill({ affixes: [affix] })
    const state = makeRuntimeState()
    // 2 × 0.08 = 0.16; randomFn=0.5 → no crit
    const ctx = makeContext({ randomFn: () => 0.5 })
    resolvePhase3(skill, state, ctx, 10)
    expect(affix.fallacyStacks).toBe(3)
  })

  it('should start at 0 stacks and increment on first trigger (no crit)', () => {
    const affix = makeFallacyAffix(0)
    const skill = makeSkill({ affixes: [affix] })
    const state = makeRuntimeState()
    // 0 stacks → 0% crit chance; randomFn=0.5 → no crit
    const ctx = makeContext({ randomFn: () => 0.5 })
    resolvePhase3(skill, state, ctx, 10)
    expect(affix.fallacyStacks).toBe(1)
  })

  it('should combine with Crit affix for higher crit chance', () => {
    const fallacy = makeFallacyAffix(3) // 3 × 0.08 = 0.24
    const crit: AffixInstance = { type: AffixType.Crit, chance: 0.20 }
    const skill = makeSkill({ affixes: [crit, fallacy] })
    const state = makeRuntimeState()
    // total crit = 0.20 + 0.24 = 0.44; randomFn=0.4 < 0.44 → crit
    const ctx = makeContext({ randomFn: () => 0.4 })
    const result = resolvePhase3(skill, state, ctx, 10)
    expect(result.flags.isCrit).toBe(true)
    expect(fallacy.fallacyStacks).toBe(0) // reset on crit
  })

  it('should handle null fallacyK gracefully', () => {
    const affix: AffixInstance = { type: AffixType.Fallacy }
    const skill = makeSkill({ affixes: [affix] })
    const state = makeRuntimeState()
    const ctx = makeContext({ randomFn: () => 0.5 })
    // Should not throw
    const result = resolvePhase3(skill, state, ctx, 10)
    expect(result.output).toBeCloseTo(10)
  })
})
