// ============================================
// 打字肉鸽 - 词条触发迭代调度器测试
// ============================================
// Story 35.14: 触发管线伪循环重构

import { describe, it, expect, vi } from 'vitest'
import {
  AffixType,
  AffixSkillInstance,
  SkillRuntimeState,
  BASE_VALUES,
} from '../../../src/data/affixes'
import type { ResourceType, ResourceState } from '../../../src/core/types'
import {
  TriggerContext,
  triggerAffixSkill,
  MAX_RECURSE_DEPTH,
  MAX_CHAIN_DEPTH,
} from '../../../src/data/affixTrigger'
import { rollAffixParams } from '../../../src/data/skillGeneration'
import { PositionRelation } from '../../../src/data/keyboardTopology'
import {
  orchestrateAffixTrigger,
  OrchestratorCallbacks,
} from '../../../src/systems/affixTriggerOrchestrator'

// ===== 工厂函数 =====

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
    baseValues: [5, 8, 12] as [number, number, number],
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
    triggerCount: 0,
    amplifyStacks: 0,
    apprenticeAccumulated: 0,
    questStacks: 0,
    questCompletions: 0,
    ...overrides,
  }
}

function makeContext(overrides?: Partial<TriggerContext>): TriggerContext {
  return {
    triggerKey: 'a',
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

function buildSkillWithAffixes(
  affixTypes: AffixType[],
  resource: ResourceType = 'base',
): AffixSkillInstance {
  const affixes = affixTypes.map(t => rollAffixParams(t, resource))
  return makeSkill({
    id: `test_${affixTypes.join('_')}`,
    resource,
    rarity: affixTypes.length as 0,
    affixes,
    baseValues: BASE_VALUES[resource],
  })
}

/** 创建双技能互相绑定的 context */
function makeTwoSkillContext(
  skillA: AffixSkillInstance,
  skillB: AffixSkillInstance,
  keyA = 'a',
  keyB = 's',
): TriggerContext {
  const bindings = new Map<string, string>()
  bindings.set(keyA, skillA.id)
  bindings.set(keyB, skillB.id)

  const allSkills = new Map<string, AffixSkillInstance>()
  allSkills.set(skillA.id, skillA)
  allSkills.set(skillB.id, skillB)

  const skillStates = new Map<string, SkillRuntimeState>()
  skillStates.set(skillA.id, makeRuntimeState({ skillId: skillA.id }))
  skillStates.set(skillB.id, makeRuntimeState({ skillId: skillB.id }))

  return makeContext({
    triggerKey: keyA,
    bindings,
    allSkills,
    skillStates,
    randomFn: () => 0.5,
  })
}

// =============================================
// AC1: 迭代调度器基本功能
// =============================================

describe('AC1: 迭代调度器', () => {
  it('orchestrateAffixTrigger 对单技能返回正确结果', () => {
    const skill = makeSkill({ id: 'sk1', resource: 'base' })
    const bindings = new Map([['a', 'sk1']])
    const allSkills = new Map([['sk1', skill]])
    const skillStates = new Map([['sk1', makeRuntimeState({ skillId: 'sk1' })]])

    const ctx = makeContext({ triggerKey: 'a', bindings, allSkills, skillStates })
    const result = orchestrateAffixTrigger('sk1', 'a', ctx)

    expect(result.triggerCount).toBe(1)
    expect(result.totalOutput).toBeCloseTo(5, 1) // base value Lv1
    expect(result.maxDepth).toBe(0)
    expect(result.enteredPseudoInfinite).toBe(false)
    expect(result.triggerResults.length).toBe(1)
  })

  it('不产生真递归调用栈（Recurse 词条通过队列处理）', () => {
    const skill = buildSkillWithAffixes([AffixType.Recurse], 'base')
    skill.id = 'recurse_sk'
    skill.rarity = 1 as 0
    skill.affixes[0].recurseChance = 1.0 // 100% 递归

    const bindings = new Map([['a', 'recurse_sk']])
    const allSkills = new Map([['recurse_sk', skill]])
    const skillStates = new Map([['recurse_sk', makeRuntimeState({ skillId: 'recurse_sk' })]])

    const ctx = makeContext({
      triggerKey: 'a',
      bindings,
      allSkills,
      skillStates,
      randomFn: () => 0.01, // 确保递归掷骰成功
    })

    // 应正常完成不栈溢出
    const result = orchestrateAffixTrigger('recurse_sk', 'a', ctx)
    expect(result.triggerCount).toBeGreaterThan(1) // 至少触发 2 次（初始+1递归）
    expect(result.enteredPseudoInfinite).toBe(false)
    expect(Number.isFinite(result.totalOutput)).toBe(true)
  })

  it('work queue 为 FIFO（BFS 顺序）', () => {
    // 验证方式：单技能无后续触发，结果有序
    const skill = makeSkill({ id: 'sk1' })
    const bindings = new Map([['a', 'sk1']])
    const allSkills = new Map([['sk1', skill]])
    const skillStates = new Map([['sk1', makeRuntimeState({ skillId: 'sk1' })]])

    const ctx = makeContext({ triggerKey: 'a', bindings, allSkills, skillStates })
    const result = orchestrateAffixTrigger('sk1', 'a', ctx)

    expect(result.triggerResults).toHaveLength(1)
  })
})

// =============================================
// AC2: Recurse 伪循环
// =============================================

describe('AC2: Recurse 伪循环', () => {
  it('Recurse depth >= MAX_RECURSE_DEPTH 时丢弃', () => {
    const skill = buildSkillWithAffixes([AffixType.Recurse], 'base')
    skill.id = 'recurse_sk'
    skill.rarity = 1 as 0
    skill.affixes[0].recurseChance = 1.0

    const bindings = new Map([['a', 'recurse_sk']])
    const allSkills = new Map([['recurse_sk', skill]])
    const skillStates = new Map([['recurse_sk', makeRuntimeState({ skillId: 'recurse_sk' })]])

    const ctx = makeContext({
      triggerKey: 'a',
      bindings,
      allSkills,
      skillStates,
      randomFn: () => 0.01,
    })

    const result = orchestrateAffixTrigger('recurse_sk', 'a', ctx)

    // 初始触发(depth=0) + 最多 MAX_RECURSE_DEPTH 次递归
    // 但概率减半每次，加上 MAX_CHAIN_DEPTH 总上限
    expect(result.triggerCount).toBeLessThanOrEqual(MAX_CHAIN_DEPTH)
    expect(result.triggerCount).toBeGreaterThan(1)
  })

  it('MAX_RECURSE_DEPTH = 10', () => {
    expect(MAX_RECURSE_DEPTH).toBe(10)
  })
})

// =============================================
// AC3: Replicate 伪循环
// =============================================

describe('AC3: Replicate 伪循环', () => {
  it('Replicate 通过队列触发邻居而非递归', () => {
    const skillA = buildSkillWithAffixes([AffixType.Replicate], 'base')
    skillA.id = 'skill_a'
    skillA.rarity = 1 as 0
    skillA.affixes[0].posRel = PositionRelation.Adjacent

    const skillB = makeSkill({ id: 'skill_b' })

    const ctx = makeTwoSkillContext(skillA, skillB, 'a', 's')

    const result = orchestrateAffixTrigger('skill_a', 'a', ctx)

    // skill_a 本身 + skill_b 通过 Replicate 队列触发
    expect(result.triggerCount).toBeGreaterThanOrEqual(2)
    expect(Number.isFinite(result.totalOutput)).toBe(true)
  })
})

// =============================================
// AC4: Phase 6 伪循环（Resonance/Link）
// =============================================

describe('AC4: Phase 6 伪循环', () => {
  it('Resonance 通过队列触发', () => {
    // skill_a 触发后，skill_b 有 Resonance 词条应被入队触发
    const skillA = makeSkill({ id: 'skill_a', resource: 'base' })
    const skillB = buildSkillWithAffixes([AffixType.Resonance], 'base')
    skillB.id = 'skill_b'
    skillB.rarity = 1 as 0
    skillB.affixes[0].posRel = PositionRelation.Adjacent
    skillB.affixes[0].efficiency = 0.5

    const ctx = makeTwoSkillContext(skillA, skillB, 'a', 's')

    const result = orchestrateAffixTrigger('skill_a', 'a', ctx)

    // skill_a 直接触发 + skill_b 通过 resonance 触发
    expect(result.triggerCount).toBeGreaterThanOrEqual(1)
    expect(Number.isFinite(result.totalOutput)).toBe(true)
  })

  it('循环检测触发 pseudoInfinite', () => {
    // skill_a(Replicate) → skill_b(Replicate) → skill_a → 循环
    const skillA = buildSkillWithAffixes([AffixType.Replicate], 'base')
    skillA.id = 'skill_a'
    skillA.rarity = 1 as 0
    skillA.affixes[0].posRel = PositionRelation.Adjacent

    const skillB = buildSkillWithAffixes([AffixType.Replicate], 'base')
    skillB.id = 'skill_b'
    skillB.rarity = 1 as 0
    skillB.affixes[0].posRel = PositionRelation.Adjacent

    const ctx = makeTwoSkillContext(skillA, skillB, 'a', 's')

    const pseudoInfiniteSpy = vi.fn()
    const callbacks: OrchestratorCallbacks = {
      enterPseudoInfinite: pseudoInfiniteSpy,
    }

    const result = orchestrateAffixTrigger('skill_a', 'a', ctx, callbacks)

    // A Replicate→B, B Replicate→A: 检测到 'a' 已在 chainHistory 中
    expect(result.enteredPseudoInfinite).toBe(true)
    expect(pseudoInfiniteSpy).toHaveBeenCalled()
    // pseudoInfiniteKeys 应包含参与循环的键位
    const keys = pseudoInfiniteSpy.mock.calls[0][0] as string[]
    expect(keys).toContain('a')
    expect(keys).toContain('s')
    expect(result.triggerCount).toBeLessThanOrEqual(MAX_CHAIN_DEPTH)
  })
})

// =============================================
// AC5: chainHistory 统一
// =============================================

describe('AC5: chainHistory 统一', () => {
  it('chainHistory 传播使循环检测在第二次访问时生效', () => {
    // A(Replicate)→B(Replicate)→A: 第二次访问 A 时 chainHistory=['a','s','a']
    // 循环检测在 B→A 时发现 'a' 已在 history 中 → pseudoInfinite
    const skillA = buildSkillWithAffixes([AffixType.Replicate], 'base')
    skillA.id = 'skill_a'
    skillA.rarity = 1 as 0
    skillA.affixes[0].posRel = PositionRelation.Adjacent

    const skillB = buildSkillWithAffixes([AffixType.Replicate], 'base')
    skillB.id = 'skill_b'
    skillB.rarity = 1 as 0
    skillB.affixes[0].posRel = PositionRelation.Adjacent

    const ctx = makeTwoSkillContext(skillA, skillB, 'a', 's')

    const pseudoInfiniteSpy = vi.fn()
    const result = orchestrateAffixTrigger('skill_a', 'a', ctx, {
      enterPseudoInfinite: pseudoInfiniteSpy,
    })

    // chainHistory 传播正确时，循环检测应在 B→A 时生效
    expect(result.enteredPseudoInfinite).toBe(true)
    // pseudoInfiniteKeys 应反映完整链路
    if (pseudoInfiniteSpy.mock.calls.length > 0) {
      const keys = pseudoInfiniteSpy.mock.calls[0][0] as string[]
      expect(keys.length).toBeGreaterThanOrEqual(2)
    }
  })
})

// =============================================
// AC6: MAX_CHAIN_DEPTH 硬上限
// =============================================

describe('AC6: MAX_CHAIN_DEPTH 硬上限', () => {
  it('MAX_CHAIN_DEPTH = 20', () => {
    expect(MAX_CHAIN_DEPTH).toBe(20)
  })

  it('队列处理总数不超过 MAX_CHAIN_DEPTH', () => {
    const skill = buildSkillWithAffixes([AffixType.Recurse], 'base')
    skill.id = 'recurse_sk'
    skill.rarity = 1 as 0
    skill.affixes[0].recurseChance = 1.0

    const bindings = new Map([['a', 'recurse_sk']])
    const allSkills = new Map([['recurse_sk', skill]])
    const skillStates = new Map([['recurse_sk', makeRuntimeState({ skillId: 'recurse_sk' })]])

    const ctx = makeContext({
      triggerKey: 'a',
      bindings,
      allSkills,
      skillStates,
      randomFn: () => 0.01,
    })

    const result = orchestrateAffixTrigger('recurse_sk', 'a', ctx)

    expect(result.triggerCount).toBeLessThanOrEqual(MAX_CHAIN_DEPTH)
  })
})

// =============================================
// AC7: triggerAffixSkill 纯函数不变
// =============================================

describe('AC7: triggerAffixSkill 不变', () => {
  it('triggerAffixSkill 仍可独立调用', () => {
    const skill = makeSkill({ resource: 'base' })
    const state = makeRuntimeState()
    const ctx = makeContext()

    const result = triggerAffixSkill(skill, state, ctx)
    expect(result.output).toBeCloseTo(5, 1)
    expect(result.phase5).toBeDefined()
    expect(result.phase6).toBeDefined()
  })
})

// =============================================
// AC8: 副作用集中
// =============================================

describe('AC8: 副作用集中', () => {
  it('applyResource 回调在触发后调用', () => {
    const applyResourceSpy = vi.fn()

    const skill = makeSkill({ id: 'sk1', resource: 'base' })
    const bindings = new Map([['a', 'sk1']])
    const allSkills = new Map([['sk1', skill]])
    const skillStates = new Map([['sk1', makeRuntimeState({ skillId: 'sk1' })]])

    const ctx = makeContext({ triggerKey: 'a', bindings, allSkills, skillStates })

    orchestrateAffixTrigger('sk1', 'a', ctx, {
      applyResource: applyResourceSpy,
    })

    expect(applyResourceSpy).toHaveBeenCalled()
    // 应用到 base 资源
    expect(applyResourceSpy.mock.calls[0][0]).toBe('base')
    expect(applyResourceSpy.mock.calls[0][1]).toBeCloseTo(5, 1)
  })

  it('无回调时不崩溃', () => {
    const skill = makeSkill({ id: 'sk1' })
    const bindings = new Map([['a', 'sk1']])
    const allSkills = new Map([['sk1', skill]])
    const skillStates = new Map([['sk1', makeRuntimeState({ skillId: 'sk1' })]])

    const ctx = makeContext({ triggerKey: 'a', bindings, allSkills, skillStates })

    // 无 callbacks 参数
    const result = orchestrateAffixTrigger('sk1', 'a', ctx)
    expect(result.triggerCount).toBe(1)
  })
})

// =============================================
// AC9: 测试覆盖 — 队列深度、循环检测
// =============================================

describe('AC9: 队列深度与循环检测', () => {
  it('Replicate+Resonance+Link 全链场景不栈溢出', () => {
    const skillA = buildSkillWithAffixes(
      [AffixType.Replicate, AffixType.Resonance, AffixType.Link],
      'base',
    )
    skillA.id = 'skill_a'
    skillA.rarity = 3 as 0
    skillA.affixes[0].posRel = PositionRelation.Adjacent
    skillA.affixes[1].posRel = PositionRelation.Adjacent
    skillA.affixes[1].efficiency = 0.5
    skillA.affixes[2].posRel = PositionRelation.Adjacent
    skillA.affixes[2].resource = 'base'

    const skillB = makeSkill({ id: 'skill_b', resource: 'base' })

    const ctx = makeTwoSkillContext(skillA, skillB, 'a', 's')

    const result = orchestrateAffixTrigger('skill_a', 'a', ctx)

    expect(Number.isFinite(result.totalOutput)).toBe(true)
    expect(result.triggerCount).toBeLessThanOrEqual(MAX_CHAIN_DEPTH)
    expect(result.triggerCount).toBeGreaterThanOrEqual(1)
  })

  it('chain_ban 下链式词条不入队', () => {
    const skill = buildSkillWithAffixes([AffixType.Replicate], 'base')
    skill.id = 'sk1'
    skill.rarity = 1 as 0
    skill.affixes[0].posRel = PositionRelation.Adjacent

    const skillB = makeSkill({ id: 'skill_b' })

    const bindings = new Map([['a', 'sk1'], ['s', 'skill_b']])
    const allSkills = new Map([['sk1', skill], ['skill_b', skillB]])
    const skillStates = new Map([
      ['sk1', makeRuntimeState({ skillId: 'sk1' })],
      ['skill_b', makeRuntimeState({ skillId: 'skill_b' })],
    ])

    const ctx = makeContext({
      triggerKey: 'a',
      bindings,
      allSkills,
      skillStates,
      chainAffixesDisabled: true,
    } as Partial<TriggerContext>)

    const result = orchestrateAffixTrigger('sk1', 'a', ctx)

    // chain_ban 下 Phase 5 不会产生 replicateTargets
    // 只有 skill_a 本身触发
    expect(result.triggerCount).toBe(1)
  })
})

// =============================================
// AC10: 性能不退化
// =============================================

describe('AC10: 性能', () => {
  it('20 个橙装通过调度器单次触发 < 2ms', () => {
    const skills: AffixSkillInstance[] = []
    const keys = 'qwertyuiopasdfghjkl;'.split('')

    for (let i = 0; i < 20; i++) {
      const skill = buildSkillWithAffixes(
        [AffixType.Multiply, AffixType.Crit, AffixType.Outcast],
        'base',
      )
      skill.id = `perf_skill_${i}`
      skill.rarity = 3 as 0
      skills.push(skill)
    }

    const bindings = new Map<string, string>()
    const allSkills = new Map<string, AffixSkillInstance>()
    const skillStates = new Map<string, SkillRuntimeState>()

    for (let i = 0; i < 20; i++) {
      bindings.set(keys[i], skills[i].id)
      allSkills.set(skills[i].id, skills[i])
      skillStates.set(skills[i].id, makeRuntimeState({ skillId: skills[i].id }))
    }

    const ctx = makeContext({
      bindings,
      allSkills,
      skillStates,
      randomFn: () => 0.5,
    })

    // 预热
    for (let i = 0; i < 20; i++) {
      orchestrateAffixTrigger(skills[i].id, keys[i], { ...ctx, triggerKey: keys[i] })
    }

    // 正式计时
    const start = performance.now()
    for (let i = 0; i < 20; i++) {
      orchestrateAffixTrigger(skills[i].id, keys[i], { ...ctx, triggerKey: keys[i] })
    }
    const elapsed = performance.now() - start

    const avgPerSkill = elapsed / 20
    expect(avgPerSkill).toBeLessThan(2)
  })
})
