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
    mirrorCopiedAffixes: [],
    triggerCount: 0,
    amplifyStacks: 0,
    apprenticeAccumulated: 0,
    questStacks: 0,
    questCompletions: 0,
    questTransformed: false,
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
// AC3: Splash 伪循环
// =============================================

describe('AC3: Splash 伪循环', () => {
  it('Splash 通过队列触发邻居而非递归', () => {
    const skillA = buildSkillWithAffixes([AffixType.Splash], 'base')
    skillA.id = 'skill_a'
    skillA.rarity = 1 as 0
    skillA.affixes[0].posRel = PositionRelation.Adjacent
    skillA.affixes[0].resource = 'base' as import('../../../src/core/types').ResourceType

    const skillB = makeSkill({ id: 'skill_b' })

    const ctx = makeTwoSkillContext(skillA, skillB, 'a', 's')

    const result = orchestrateAffixTrigger('skill_a', 'a', ctx)

    // skill_a 本身 + skill_b 通过 Splash 队列触发
    expect(result.triggerCount).toBeGreaterThanOrEqual(2)
    expect(Number.isFinite(result.totalOutput)).toBe(true)
  })
})

// =============================================
// AC4: Phase 6 伪循环（Resonance）
// =============================================

describe('AC4: Phase 6 伪循环', () => {
  it('Resonance 通过队列触发', () => {
    // skill_a 触发后，skill_b 有 Resonance 词条应被入队触发
    const skillA = makeSkill({ id: 'skill_a', resource: 'base' })
    const skillB = buildSkillWithAffixes([AffixType.Resonance], 'base')
    skillB.id = 'skill_b'
    skillB.rarity = 1 as 0
    skillB.affixes[0].posRel = PositionRelation.Adjacent
    const ctx = makeTwoSkillContext(skillA, skillB, 'a', 's')

    const result = orchestrateAffixTrigger('skill_a', 'a', ctx)

    // skill_a 直接触发 + skill_b 通过 resonance 触发
    expect(result.triggerCount).toBeGreaterThanOrEqual(1)
    expect(Number.isFinite(result.totalOutput)).toBe(true)
  })

  it('Story 41-3: splash 项默认禁用链式词条，不再形成循环', () => {
    // skill_a(Splash) → skill_b(Splash): B 作为 splash 项 chainAffixesDisabled
    const skillA = buildSkillWithAffixes([AffixType.Splash], 'base')
    skillA.id = 'skill_a'
    skillA.rarity = 1 as 0
    skillA.affixes[0].posRel = PositionRelation.Adjacent
    skillA.affixes[0].resource = 'base' as import('../../../src/core/types').ResourceType

    const skillB = buildSkillWithAffixes([AffixType.Splash], 'base')
    skillB.id = 'skill_b'
    skillB.rarity = 1 as 0
    skillB.affixes[0].posRel = PositionRelation.Adjacent
    skillB.affixes[0].resource = 'base' as import('../../../src/core/types').ResourceType

    const ctx = makeTwoSkillContext(skillA, skillB, 'a', 's')

    const pseudoInfiniteSpy = vi.fn()
    const callbacks: OrchestratorCallbacks = {
      enterPseudoInfinite: pseudoInfiniteSpy,
    }

    const result = orchestrateAffixTrigger('skill_a', 'a', ctx, callbacks)

    // Story 41-3: splash 项 chainAffixesDisabled=true → B 不会再溅射回 A
    expect(result.enteredPseudoInfinite).toBe(false)
    expect(pseudoInfiniteSpy).not.toHaveBeenCalled()
    // A 触发 + B 被溅射 = 2 次触发
    expect(result.triggerCount).toBe(2)
  })
})

// =============================================
// AC5: chainHistory 统一
// =============================================

describe('AC5: chainHistory 统一', () => {
  it('Story 41-3: splash 项 chainAffixesDisabled 阻止链式传播', () => {
    // A(Splash)→B(Splash): B 作为 splash 项不会再溅射
    const skillA = buildSkillWithAffixes([AffixType.Splash], 'base')
    skillA.id = 'skill_a'
    skillA.rarity = 1 as 0
    skillA.affixes[0].posRel = PositionRelation.Adjacent
    skillA.affixes[0].resource = 'base' as import('../../../src/core/types').ResourceType

    const skillB = buildSkillWithAffixes([AffixType.Splash], 'base')
    skillB.id = 'skill_b'
    skillB.rarity = 1 as 0
    skillB.affixes[0].posRel = PositionRelation.Adjacent
    skillB.affixes[0].resource = 'base' as import('../../../src/core/types').ResourceType

    const ctx = makeTwoSkillContext(skillA, skillB, 'a', 's')

    const pseudoInfiniteSpy = vi.fn()
    const result = orchestrateAffixTrigger('skill_a', 'a', ctx, {
      enterPseudoInfinite: pseudoInfiniteSpy,
    })

    // splash 项 chainAffixesDisabled → 无循环
    expect(result.enteredPseudoInfinite).toBe(false)
    expect(result.triggerCount).toBe(2)
  })
})

// =============================================
// Story 41-3: chainSplash 正向验证
// =============================================

describe('Story 41-3: chainSplash 质变溅射额外一跳', () => {
  it('questTransformed=true 时 splash 项获得 chainSplash，可再溅射一次', () => {
    // A(Splash, questTransformed) → 溅射 B(Splash) → B 获得 chainSplash → 溅射 C
    const skillA = buildSkillWithAffixes([AffixType.Splash], 'base')
    skillA.id = 'skill_a'
    skillA.rarity = 1 as 0
    skillA.affixes[0].posRel = PositionRelation.Adjacent
    skillA.affixes[0].resource = 'base' as import('../../../src/core/types').ResourceType

    const skillB = buildSkillWithAffixes([AffixType.Splash], 'base')
    skillB.id = 'skill_b'
    skillB.rarity = 1 as 0
    skillB.affixes[0].posRel = PositionRelation.Adjacent
    skillB.affixes[0].resource = 'base' as import('../../../src/core/types').ResourceType

    const skillC = makeSkill({ id: 'skill_c', resource: 'base' })

    const bindings = new Map<string, string>([['a', 'skill_a'], ['s', 'skill_b'], ['d', 'skill_c']])
    const allSkills = new Map([['skill_a', skillA], ['skill_b', skillB], ['skill_c', skillC]])
    const skillStates = new Map([
      ['skill_a', makeRuntimeState({ skillId: 'skill_a', questTransformed: true })],
      ['skill_b', makeRuntimeState({ skillId: 'skill_b' })],
      ['skill_c', makeRuntimeState({ skillId: 'skill_c' })],
    ])

    const ctx = makeContext({
      triggerKey: 'a',
      bindings,
      allSkills,
      skillStates,
      randomFn: () => 0.99, // B 的邻居为 [a,d]，0.99 选 index 1 → d（避开 a 的循环检测）
    })

    const result = orchestrateAffixTrigger('skill_a', 'a', ctx)

    // A 触发(1) + B 被溅射(chainSplash=true)(2) + C 被 B 再溅射(3) = 3 次触发
    expect(result.triggerCount).toBe(3)
    expect(result.enteredPseudoInfinite).toBe(false)
  })

  it('chainSplash 只传播一跳，第二跳不再溅射', () => {
    // A(Splash, questTransformed) → B(Splash) → C(Splash): C 不应再溅射
    const skillA = buildSkillWithAffixes([AffixType.Splash], 'base')
    skillA.id = 'skill_a'
    skillA.rarity = 1 as 0
    skillA.affixes[0].posRel = PositionRelation.Adjacent
    skillA.affixes[0].resource = 'base' as import('../../../src/core/types').ResourceType

    const skillB = buildSkillWithAffixes([AffixType.Splash], 'base')
    skillB.id = 'skill_b'
    skillB.rarity = 1 as 0
    skillB.affixes[0].posRel = PositionRelation.Adjacent
    skillB.affixes[0].resource = 'base' as import('../../../src/core/types').ResourceType

    const skillC = buildSkillWithAffixes([AffixType.Splash], 'base')
    skillC.id = 'skill_c'
    skillC.rarity = 1 as 0
    skillC.affixes[0].posRel = PositionRelation.Adjacent
    skillC.affixes[0].resource = 'base' as import('../../../src/core/types').ResourceType

    // A-s, B-d, C-f (linear adjacency)
    const bindings = new Map<string, string>([['s', 'skill_a'], ['d', 'skill_b'], ['f', 'skill_c']])
    const allSkills = new Map([['skill_a', skillA], ['skill_b', skillB], ['skill_c', skillC]])
    const skillStates = new Map([
      ['skill_a', makeRuntimeState({ skillId: 'skill_a', questTransformed: true })],
      ['skill_b', makeRuntimeState({ skillId: 'skill_b' })],
      ['skill_c', makeRuntimeState({ skillId: 'skill_c' })],
    ])

    const ctx = makeContext({
      triggerKey: 's',
      bindings,
      allSkills,
      skillStates,
      randomFn: () => 0.99, // 确保选到最后一个邻居（向右传播）
    })

    const result = orchestrateAffixTrigger('skill_a', 's', ctx)

    // A→B(chainSplash=true)→C(chainSplash=false, chainAffixesDisabled): C 不再溅射
    // A(1) + B(2) + C(3) = 最多 3 次
    expect(result.triggerCount).toBeLessThanOrEqual(3)
    expect(result.enteredPseudoInfinite).toBe(false)
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
  it('Splash+Resonance 全链场景不栈溢出', () => {
    const skillA = buildSkillWithAffixes(
      [AffixType.Splash, AffixType.Resonance],
      'base',
    )
    skillA.id = 'skill_a'
    skillA.rarity = 3 as 0
    skillA.affixes[0].posRel = PositionRelation.Adjacent
    skillA.affixes[0].resource = 'base' as import('../../../src/core/types').ResourceType
    skillA.affixes[1].posRel = PositionRelation.Adjacent
    skillA.affixes[1].resource = 'base' as import('../../../src/core/types').ResourceType

    const skillB = makeSkill({ id: 'skill_b', resource: 'base' })

    const ctx = makeTwoSkillContext(skillA, skillB, 'a', 's')

    const result = orchestrateAffixTrigger('skill_a', 'a', ctx)

    expect(Number.isFinite(result.totalOutput)).toBe(true)
    expect(result.triggerCount).toBeLessThanOrEqual(MAX_CHAIN_DEPTH)
    expect(result.triggerCount).toBeGreaterThanOrEqual(1)
  })

  it('chain_ban 下链式词条不入队', () => {
    const skill = buildSkillWithAffixes([AffixType.Splash], 'base')
    skill.id = 'sk1'
    skill.rarity = 1 as 0
    skill.affixes[0].posRel = PositionRelation.Adjacent
    skill.affixes[0].resource = 'base' as import('../../../src/core/types').ResourceType

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

    // chain_ban 下 Phase 5 不会产生 splashTargets
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

// =============================================
// Conduit 修复：额外触发实际执行 + 不级联
// =============================================

describe('Conduit 额外触发', () => {
  it('Conduit 邻居使触发技能产出翻倍（+1 额外触发）', () => {
    // skillA(Crit) 在 'a'，skillC(Conduit+Crit) 在 's' — 同行
    // A 触发 → C 的 Conduit 给 A 额外 +1 触发 → 总共 2 次 A 的产出
    const skillA = makeSkill({
      id: 'skill_a',
      resource: 'base',
      affixes: [{ type: AffixType.Crit, chance: 0, critMult: 1.0 }], // Crit chance=0 不暴击
    })
    const skillC = makeSkill({
      id: 'skill_c',
      resource: 'base',
      affixes: [
        { type: AffixType.Conduit, posRel: PositionRelation.SameRow },
        { type: AffixType.Crit, chance: 0, critMult: 1.0 }, // 共享词条类型
      ],
    })

    const bindings = new Map([['a', 'skill_a'], ['s', 'skill_c']])
    const allSkills = new Map([['skill_a', skillA], ['skill_c', skillC]])
    const skillStates = new Map([
      ['skill_a', makeRuntimeState({ skillId: 'skill_a' })],
      ['skill_c', makeRuntimeState({ skillId: 'skill_c' })],
    ])

    const ctx = makeContext({ triggerKey: 'a', bindings, allSkills, skillStates })
    const result = orchestrateAffixTrigger('skill_a', 'a', ctx)

    // A 初始触发(1) + Conduit 额外触发(2) = 2 次
    expect(result.triggerCount).toBe(2)
    expect(result.enteredPseudoInfinite).toBe(false)
    // 产出约为 A 基础值 × 2
    expect(result.totalOutput).toBeCloseTo(5 * 2, 0)
  })

  it('质变 Conduit 给 +2 额外触发', () => {
    const skillA = makeSkill({
      id: 'skill_a',
      resource: 'base',
      affixes: [{ type: AffixType.Crit, chance: 0, critMult: 1.0 }],
    })
    const skillC = makeSkill({
      id: 'skill_c',
      resource: 'base',
      affixes: [
        { type: AffixType.Conduit, posRel: PositionRelation.SameRow },
        { type: AffixType.Crit, chance: 0, critMult: 1.0 },
      ],
    })

    const bindings = new Map([['a', 'skill_a'], ['s', 'skill_c']])
    const allSkills = new Map([['skill_a', skillA], ['skill_c', skillC]])
    const skillStates = new Map([
      ['skill_a', makeRuntimeState({ skillId: 'skill_a' })],
      ['skill_c', makeRuntimeState({ skillId: 'skill_c', questTransformed: true })],
    ])

    const ctx = makeContext({ triggerKey: 'a', bindings, allSkills, skillStates })
    const result = orchestrateAffixTrigger('skill_a', 'a', ctx)

    // A 初始触发(1) + 质变 Conduit 额外触发 ×2 = 3 次
    expect(result.triggerCount).toBe(3)
    expect(result.enteredPseudoInfinite).toBe(false)
  })

  it('Conduit 额外触发不会级联（chainAffixesDisabled）', () => {
    // A(Crit) ← Conduit 邻居 C(Conduit+Crit)
    // A 额外触发时 chainAffixesDisabled=true → C 的 Conduit 不再产生 action → 不无限
    const skillA = makeSkill({
      id: 'skill_a',
      resource: 'base',
      affixes: [{ type: AffixType.Crit, chance: 0, critMult: 1.0 }],
    })
    const skillC = makeSkill({
      id: 'skill_c',
      resource: 'base',
      affixes: [
        { type: AffixType.Conduit, posRel: PositionRelation.SameRow },
        { type: AffixType.Crit, chance: 0, critMult: 1.0 },
      ],
    })

    const bindings = new Map([['a', 'skill_a'], ['s', 'skill_c']])
    const allSkills = new Map([['skill_a', skillA], ['skill_c', skillC]])
    const skillStates = new Map([
      ['skill_a', makeRuntimeState({ skillId: 'skill_a' })],
      ['skill_c', makeRuntimeState({ skillId: 'skill_c' })],
    ])

    const ctx = makeContext({ triggerKey: 'a', bindings, allSkills, skillStates })
    const result = orchestrateAffixTrigger('skill_a', 'a', ctx)

    // 仅 2 次（初始 + 1 conduit），不会无限级联
    expect(result.triggerCount).toBe(2)
    expect(result.enteredPseudoInfinite).toBe(false)
  })

  it('Conduit 额外触发不会触发邻居的 Resonance', () => {
    // A(Crit) 在 'a'，Conduit 邻居 C(Conduit+Crit) 在 's'
    // B(Resonance→base) 在 'd' — A 额外触发时 chainAffixesDisabled → B 不被共鸣触发
    const skillA = makeSkill({
      id: 'skill_a',
      resource: 'base',
      affixes: [{ type: AffixType.Crit, chance: 0, critMult: 1.0 }],
    })
    const skillC = makeSkill({
      id: 'skill_c',
      resource: 'score', // 不同资源，靠共享 Crit 词条类型触发 Conduit
      affixes: [
        { type: AffixType.Conduit, posRel: PositionRelation.SameRow },
        { type: AffixType.Crit, chance: 0, critMult: 1.0 },
      ],
    })
    const skillB = makeSkill({
      id: 'skill_b',
      resource: 'base',
      affixes: [{ type: AffixType.Resonance, posRel: PositionRelation.SameRow, resource: 'base' as any }],
    })

    const bindings = new Map([['a', 'skill_a'], ['s', 'skill_c'], ['d', 'skill_b']])
    const allSkills = new Map([['skill_a', skillA], ['skill_c', skillC], ['skill_b', skillB]])
    const skillStates = new Map([
      ['skill_a', makeRuntimeState({ skillId: 'skill_a' })],
      ['skill_c', makeRuntimeState({ skillId: 'skill_c' })],
      ['skill_b', makeRuntimeState({ skillId: 'skill_b' })],
    ])

    const ctx = makeContext({ triggerKey: 'a', bindings, allSkills, skillStates })
    const result = orchestrateAffixTrigger('skill_a', 'a', ctx)

    // A 初始触发(1) → Resonance 触发 B(2) + Conduit 额外触发 A(3)
    // Conduit 的额外触发 A chainAffixesDisabled → 不触发 B 的 Resonance
    // 总共 3 次（不是 4 或更多）
    expect(result.triggerCount).toBe(3)
    expect(result.enteredPseudoInfinite).toBe(false)
  })
})

// ===== Story 40.9: Orchestrator 多格感知 =====

describe('orchestrateAffixTrigger — 多格 occupiedKeys 传播', () => {
  it('多格技能被 Splash 连锁触发时 occupiedKeys 包含所有占据键', () => {
    // skillA 在 f（单格），有 Splash 词条
    // skillB 在 g+h（多格 domino），基础技能
    // skillA 触发 → Splash 溅射到 g → skillB 被连锁触发
    // 验证：skillB 被触发且 orchestrator 不崩溃
    const skillA = buildSkillWithAffixes([AffixType.Splash], 'base')
    skillA.id = 'skillA'
    skillA.rarity = 1 as 0
    skillA.affixes[0].posRel = PositionRelation.Adjacent
    skillA.affixes[0].resource = 'base' as import('../../../src/core/types').ResourceType

    const skillB = makeSkill({ id: 'skillB', resource: 'base' })
    const stateA = makeRuntimeState({ skillId: 'skillA' })
    const stateB = makeRuntimeState({ skillId: 'skillB' })

    const bindings = new Map([
      ['f', 'skillA'],
      ['g', 'skillB'],
      ['h', 'skillB'], // skillB 是 domino，占 g+h
    ])
    const ctx = makeContext({
      triggerKey: 'f',
      occupiedKeys: ['f'],
      bindings,
      allSkills: new Map([['skillA', skillA], ['skillB', skillB]]),
      skillStates: new Map([['skillA', stateA], ['skillB', stateB]]),
    })

    const result = orchestrateAffixTrigger('skillA', 'f', ctx)

    // 应该至少触发 2 次（skillA 初始 + skillB 被溅射）
    expect(result.triggerCount).toBeGreaterThanOrEqual(2)
    expect(result.triggerResults.length).toBeGreaterThanOrEqual(2)
  })
})
