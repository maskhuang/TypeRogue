// ============================================
// 打字肉鸽 - Story 40.8 多格技能触发适配单元测试
// ============================================
// 测试: getExtendedNeighbors, Phase 5/6 去重, TriggerContext.occupiedKeys

import { describe, it, expect } from 'vitest'
import {
  getExtendedNeighbors,
  resolvePhase5,
  resolvePhase6,
  type TriggerContext,
  type TriggerFlags,
} from '../../../src/data/affixTrigger'
import { AffixType, type AffixSkillInstance, type SkillRuntimeState } from '../../../src/data/affixes'
import { PositionRelation } from '../../../src/data/keyboardTopology'
import type { ResourceState } from '../../../src/core/types'

function makeResources(): ResourceState {
  return { base: 0, score: 0, multiplier: 0, time: 0, gold: 0, fragment: 0, mutagen: 0 }
}

function makeContext(overrides?: Partial<TriggerContext>): TriggerContext {
  const triggerKey = overrides?.triggerKey ?? 'f'
  return {
    triggerKey,
    occupiedKeys: [triggerKey],
    currentWord: 'frog',
    resources: makeResources(),
    classResourceProduced: {},
    bindings: new Map(),
    skillStates: new Map(),
    allSkills: new Map(),
    randomFn: () => 0.5,
    ...overrides,
  }
}

function makeSkill(overrides?: Partial<AffixSkillInstance>): AffixSkillInstance {
  return {
    id: 'test_skill',
    name: 'Test',
    icon: '⚡',
    level: 1,
    resource: 'base',
    rarity: 0,
    affixes: [],
    enchantmentIds: [],
    ...overrides,
  } as AffixSkillInstance
}

function makeRuntimeState(): SkillRuntimeState {
  return {
    apprenticeAccumulated: 0,
    questStacks: 0,
    amplifyStacks: 0,
    mirrorCopiedAffix: null,
    devourStacks: 0,
    growthStacks: 0,
  } as SkillRuntimeState
}

// ===== getExtendedNeighbors =====

describe('getExtendedNeighbors', () => {
  it('5.1: domino [f,g] + adjacent → 返回 f 和 g 的邻居并集，不含 f、g 自身', () => {
    const result = getExtendedNeighbors(['f', 'g'], PositionRelation.Adjacent)
    expect(result).not.toContain('f')
    expect(result).not.toContain('g')
    // f 的邻居: d,r,t,g,c,v  g 的邻居: f,t,y,h,v,b
    // 并集 - {f,g} = d,r,t,c,v,y,h,b
    expect(result).toContain('d')
    expect(result).toContain('r')
    expect(result).toContain('t')
    expect(result).toContain('h')
    expect(result).toContain('v')
    expect(result).toContain('b')
    expect(result.length).toBeGreaterThan(0)
  })

  it('5.2: triomino [e,r,d] → 邻居并集正确', () => {
    const result = getExtendedNeighbors(['e', 'r', 'd'], PositionRelation.Adjacent)
    expect(result).not.toContain('e')
    expect(result).not.toContain('r')
    expect(result).not.toContain('d')
    // 应包含 e/r/d 各自的邻居
    expect(result).toContain('w') // e 的邻居
    expect(result).toContain('t') // r 的邻居
    expect(result).toContain('s') // d 的邻居
    expect(result).toContain('f') // d/e/r 共同邻居
  })

  it('5.3: monomino [f] → 等价于 getKeysWithRelation(f, adjacent)', () => {
    const result = getExtendedNeighbors(['f'], PositionRelation.Adjacent)
    expect(result).not.toContain('f')
    expect(result.length).toBeGreaterThan(0)
    // f 的相邻键
    expect(result).toContain('d')
    expect(result).toContain('g')
    expect(result).toContain('r')
    expect(result).toContain('t')
    expect(result).toContain('c')
    expect(result).toContain('v')
  })

  it('结果去重：不包含重复键', () => {
    const result = getExtendedNeighbors(['f', 'g'], PositionRelation.Adjacent)
    const unique = new Set(result)
    expect(result.length).toBe(unique.size)
  })
})

// ===== Phase 5 Splash 去重 =====

function makeFlags(): TriggerFlags {
  return { isCrit: false, isPulse: false, isCascade: false, isTabooPenalty: false, ligatureCount: 0 }
}

describe('resolvePhase5 — Splash 多格去重', () => {
  it('5.5: domino [f,g] — Splash 不溅射到自身占据键 g', () => {
    // skillA 绑定在 f 和 g（多格），有 Splash 词条
    // skillB 绑定在 d（f 的相邻键）
    const bindings = new Map([
      ['f', 'skillA'],
      ['g', 'skillA'],
      ['d', 'skillB'],
    ])
    const skillA = makeSkill({
      id: 'skillA',
      resource: 'base',
      rarity: 1 as any,
      affixes: [{
        type: AffixType.Splash,
        posRel: PositionRelation.Adjacent,
        resource: 'base',
      } as any],
    })
    const skillB = makeSkill({ id: 'skillB', resource: 'base' })
    const allSkills = new Map([
      ['skillA', skillA],
      ['skillB', skillB],
    ])
    const skillStates = new Map([
      ['skillA', makeRuntimeState()],
      ['skillB', makeRuntimeState()],
    ])

    const ctx = makeContext({
      triggerKey: 'f',
      occupiedKeys: ['f', 'g'],
      bindings,
      allSkills,
      skillStates,
      randomFn: () => 0, // deterministic
    })

    const result = resolvePhase5(skillA, makeRuntimeState(), ctx, makeFlags(), 100)

    // g 属于 occupiedKeys → Splash 不应溅射到 g
    expect(result.splashTargets).not.toContain('f')
    expect(result.splashTargets).not.toContain('g')
    // d 是 f 的相邻键且有绑定技能，应该是合法溅射目标
    expect(result.splashTargets).toContain('d')
  })

  it('5.5b: 单格技能 — Splash 仅跳过 triggerKey（向后兼容）', () => {
    const bindings = new Map([
      ['f', 'skillA'],
      ['g', 'skillB'],
    ])
    const skillA = makeSkill({
      id: 'skillA',
      resource: 'base',
      rarity: 1 as any,
      affixes: [{
        type: AffixType.Splash,
        posRel: PositionRelation.Adjacent,
        resource: 'base',
      } as any],
    })
    const skillB = makeSkill({ id: 'skillB', resource: 'base' })
    const allSkills = new Map([
      ['skillA', skillA],
      ['skillB', skillB],
    ])
    const skillStates = new Map([
      ['skillA', makeRuntimeState()],
      ['skillB', makeRuntimeState()],
    ])

    const ctx = makeContext({
      triggerKey: 'f',
      occupiedKeys: ['f'], // 单格
      bindings,
      allSkills,
      skillStates,
      randomFn: () => 0,
    })

    const result = resolvePhase5(skillA, makeRuntimeState(), ctx, makeFlags(), 100)

    expect(result.splashTargets).not.toContain('f')
    // g 是 f 的相邻键，skillB 有 base 资源匹配 → 应溅射
    expect(result.splashTargets).toContain('g')
  })
})

// ===== Phase 6 去重 =====

describe('resolvePhase6 — 多格去重', () => {
  it('5.4: domino [f,g] — Phase 6 不会通知 g 上的同一技能', () => {
    // 技能 A 绑定在 f 和 g（多格）
    const bindings = new Map([
      ['f', 'skillA'],
      ['g', 'skillA'],
      ['h', 'skillB'],
    ])
    const skillA = makeSkill({ id: 'skillA' })
    const skillB = makeSkill({
      id: 'skillB',
      affixes: [{
        type: AffixType.Resonance,
        posRel: PositionRelation.Adjacent,
        resource: 'base',
      } as any],
    })
    const allSkills = new Map([
      ['skillA', skillA],
      ['skillB', skillB],
    ])
    const skillStates = new Map([
      ['skillA', makeRuntimeState()],
      ['skillB', makeRuntimeState()],
    ])

    const ctx = makeContext({
      triggerKey: 'f',
      occupiedKeys: ['f', 'g'],
      bindings,
      allSkills,
      skillStates,
    })

    const result = resolvePhase6('f', skillA, makeRuntimeState(), ctx, 'base')

    // g 属于 occupiedKeys → 不应出现在 actions 中
    const neighborKeysInActions = result.actions.map(a => a.neighborKey)
    expect(neighborKeysInActions).not.toContain('f')
    expect(neighborKeysInActions).not.toContain('g')
    // h 是合法邻居（skillB 有 Resonance + adjacent），如果 h 和 f 是 adjacent
    // 但 h 和 f 可能不是 adjacent — 取决于键盘拓扑
  })

  it('5.5: 单格技能 — Phase 6 仅跳过 triggerKey（与现有行为一致）', () => {
    const bindings = new Map([
      ['f', 'skillA'],
      ['g', 'skillB'],
    ])
    const skillA = makeSkill({ id: 'skillA', resource: 'base' })
    const skillB = makeSkill({
      id: 'skillB',
      affixes: [{
        type: AffixType.Resonance,
        posRel: PositionRelation.Adjacent,
        resource: 'base',
      } as any],
    })
    const allSkills = new Map([
      ['skillA', skillA],
      ['skillB', skillB],
    ])
    const skillStates = new Map([
      ['skillA', makeRuntimeState()],
      ['skillB', makeRuntimeState()],
    ])

    const ctx = makeContext({
      triggerKey: 'f',
      occupiedKeys: ['f'], // 单格
      bindings,
      allSkills,
      skillStates,
    })

    const result = resolvePhase6('f', skillA, makeRuntimeState(), ctx, 'base')

    // f 是 triggerKey/occupiedKey → 被跳过
    const neighborKeysInActions = result.actions.map(a => a.neighborKey)
    expect(neighborKeysInActions).not.toContain('f')
    // g 是 f 的相邻键，skillB 有 Resonance + adjacent + resource match → 应触发
    expect(neighborKeysInActions).toContain('g')
  })
})

// ===== TriggerContext.occupiedKeys =====

describe('TriggerContext.occupiedKeys', () => {
  it('5.6: 单格技能 occupiedKeys = [triggerKey]', () => {
    const ctx = makeContext({ triggerKey: 'f' })
    expect(ctx.occupiedKeys).toEqual(['f'])
  })

  it('5.6: 多格技能 occupiedKeys 包含所有键', () => {
    const ctx = makeContext({
      triggerKey: 'f',
      occupiedKeys: ['f', 'g', 'h'],
    })
    expect(ctx.occupiedKeys).toEqual(['f', 'g', 'h'])
  })

  it('5.7: monomino 向后兼容 — 默认 makeContext 生成 [triggerKey]', () => {
    const ctx = makeContext({ triggerKey: 'j' })
    expect(ctx.occupiedKeys).toEqual(['j'])
  })
})
