// ============================================
// 打字肉鸽 - Story 40.8/40.9/40.10/40.11 多格技能触发适配单元测试
// ============================================
// 40.8: getExtendedNeighbors, Phase 5/6 去重, TriggerContext.occupiedKeys
// 40.9: 空间词条多格适配（Void/Amplify/Splash/Phase6/Mirror/Cascade 回归）
// 40.10: 附魔系统多格适配（Phase 6 按技能分组遍历 + 双侧 any-match）
// 40.11: battle.ts Mirror 刷新多格修复 + 存档兼容验证

import { describe, it, expect } from 'vitest'
import {
  getExtendedNeighbors,
  countEmptySlots,
  sumNeighborAmplifyStacks,
  findWeakestNeighbor,
  resolvePhase3,
  resolvePhase5,
  resolvePhase6,
  resolveMirrorCopy,
  type TriggerContext,
  type TriggerFlags,
} from '../../../src/data/affixTrigger'
import { AffixType, EnchantmentType, APPRENTICE_NEIGHBOR_GROWTH, type AffixInstance, type AffixSkillInstance, type SkillRuntimeState } from '../../../src/data/affixes'
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
    // h 是 g 的 adjacent（键盘拓扑: g→[f,t,y,h,v,b]）
    // occupiedKeys.some() 检测 g→h adjacent → skillB 的 Resonance 应匹配
    expect(neighborKeysInActions).toContain('h')
  })

  it('H1-fix: 多格邻居技能 Phase 6 不产生重复 actions', () => {
    // skillA 在 f，skillB 是 domino 占 g+h（都是 f 的 adjacent）
    // skillB 有 Resonance(base, adjacent) → 应只产生 1 个 action
    const bindings = new Map([
      ['f', 'skillA'],
      ['g', 'skillB'],
      ['h', 'skillB'], // 同一技能占两个键
    ])
    const skillA = makeSkill({ id: 'skillA', resource: 'base' })
    const skillB = makeSkill({
      id: 'skillB',
      resource: 'base',
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
      occupiedKeys: ['f'],
      bindings,
      allSkills,
      skillStates,
    })

    const result = resolvePhase6('f', skillA, makeRuntimeState(), ctx, 'base')

    // g 和 h 都是 f 的 adjacent，且都绑定到 skillB
    // 去重后只应有 1 个 resonance action（不是 2 个）
    const resonanceActions = result.actions.filter(a => a.type === 'resonance')
    expect(resonanceActions.length).toBe(1)
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

// ============================================
// Story 40.9: 空间词条多格适配测试
// ============================================

// ===== 7.1: Void 多格空位计算 =====

describe('countEmptySlots — 多格空位计算', () => {
  it('7.1a: domino [f,g] adjacent — 空位 = f+g 邻居并集中未绑定的键数', () => {
    // f 邻居: d,r,t,g,c,v  g 邻居: f,t,y,h,v,b
    // 并集 - {f,g} = d,r,t,c,v,y,h,b (8 个)
    // 绑定 d → 剩余 7 个空位
    const bindings = new Map([
      ['f', 'skillA'],
      ['g', 'skillA'],
      ['d', 'skillB'],
    ])
    const empty = countEmptySlots(['f', 'g'], PositionRelation.Adjacent, bindings)
    // 并集中有 d,r,t,c,v,y,h,b → d 已绑定 → 7 空位
    expect(empty).toBe(7)
  })

  it('7.1b: 单格 string 参数向后兼容 — shop.ts 传 string 仍可用', () => {
    const bindings = new Map([['f', 'skillA']])
    const empty = countEmptySlots('f', PositionRelation.Adjacent, bindings)
    // f 邻居: d,r,t,g,c,v → 全空 = 6
    expect(empty).toBe(6)
  })

  it('7.1c: triomino [e,r,d] — 扩展范围更大', () => {
    const bindings = new Map([
      ['e', 'skillA'],
      ['r', 'skillA'],
      ['d', 'skillA'],
    ])
    const emptyMono = countEmptySlots(['e'], PositionRelation.Adjacent, bindings)
    const emptyTri = countEmptySlots(['e', 'r', 'd'], PositionRelation.Adjacent, bindings)
    // 三格邻居并集 ≥ 单格邻居（可能相等但通常更多）
    expect(emptyTri).toBeGreaterThanOrEqual(emptyMono)
  })
})

// ===== 7.2: Amplify 多格邻居增幅栈计算 =====

describe('sumNeighborAmplifyStacks — 多格增幅栈计算', () => {
  it('7.2a: domino [f,g] — 统计 f 和 g 的增幅邻居栈', () => {
    // skillB 在 d（f 的邻居）, skillC 在 h（g 的邻居）
    const bindings = new Map([
      ['f', 'skillA'],
      ['g', 'skillA'],
      ['d', 'skillB'],
      ['h', 'skillC'],
    ])
    const skillB = makeSkill({ id: 'skillB', resource: 'base' })
    const skillC = makeSkill({ id: 'skillC', resource: 'base' })
    const stateB = makeRuntimeState()
    stateB.amplifyStacks = 3
    const stateC = makeRuntimeState()
    stateC.amplifyStacks = 2

    const ctx = makeContext({
      triggerKey: 'f',
      occupiedKeys: ['f', 'g'],
      bindings,
      allSkills: new Map([
        ['skillA', makeSkill({ id: 'skillA', resource: 'base' })],
        ['skillB', skillB],
        ['skillC', skillC],
      ]),
      skillStates: new Map([
        ['skillA', makeRuntimeState()],
        ['skillB', stateB],
        ['skillC', stateC],
      ]),
    })

    // vpsEff = 1.0 → bonus = 3 + 2 = 5
    const bonus = sumNeighborAmplifyStacks(['f', 'g'], PositionRelation.Adjacent, 'base', 1.0, ctx)
    expect(bonus).toBe(5)
  })

  it('7.2b: skillId 去重 — 多格邻居技能占多键只统计一次', () => {
    // skillB 是 domino，占 d 和 r（都是 f 的邻居）
    const bindings = new Map([
      ['f', 'skillA'],
      ['d', 'skillB'],
      ['r', 'skillB'], // 同一技能两个键
    ])
    const stateB = makeRuntimeState()
    stateB.amplifyStacks = 4

    const ctx = makeContext({
      triggerKey: 'f',
      occupiedKeys: ['f'],
      bindings,
      allSkills: new Map([
        ['skillA', makeSkill({ id: 'skillA', resource: 'base' })],
        ['skillB', makeSkill({ id: 'skillB', resource: 'base' })],
      ]),
      skillStates: new Map([
        ['skillA', makeRuntimeState()],
        ['skillB', stateB],
      ]),
    })

    // skillB 虽然 d 和 r 都是邻居，但 counted Set 去重 → 只统计一次 = 4
    const bonus = sumNeighborAmplifyStacks(['f'], PositionRelation.Adjacent, 'base', 1.0, ctx)
    expect(bonus).toBe(4)
  })

  it('7.2c: 资源不匹配的邻居不参与统计', () => {
    const bindings = new Map([
      ['f', 'skillA'],
      ['d', 'skillB'],
    ])
    const stateB = makeRuntimeState()
    stateB.amplifyStacks = 5

    const ctx = makeContext({
      triggerKey: 'f',
      occupiedKeys: ['f'],
      bindings,
      allSkills: new Map([
        ['skillA', makeSkill({ id: 'skillA', resource: 'base' })],
        ['skillB', makeSkill({ id: 'skillB', resource: 'score' })], // 资源不同
      ]),
      skillStates: new Map([
        ['skillA', makeRuntimeState()],
        ['skillB', stateB],
      ]),
    })

    const bonus = sumNeighborAmplifyStacks(['f'], PositionRelation.Adjacent, 'base', 1.0, ctx)
    expect(bonus).toBe(0)
  })
})

// ===== 7.3: Splash 多格扩展范围 =====

describe('resolvePhase5 — Splash 多格扩展范围', () => {
  it('7.3a: domino [f,g] — Splash 可溅射到 g 的邻居 h（非 f 的邻居）', () => {
    // h 是 g 的邻居但不是 f 的邻居 → 只有多格扩展后才能被溅射
    // 不绑定 f 的其他邻居，确保 h 是唯一候选
    const bindings = new Map([
      ['f', 'skillA'],
      ['g', 'skillA'],
      ['h', 'skillC'],  // g 的邻居（非 f 的邻居）
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
    const skillC = makeSkill({ id: 'skillC', resource: 'base' })
    const allSkills = new Map([
      ['skillA', skillA],
      ['skillC', skillC],
    ])
    const skillStates = new Map([
      ['skillA', makeRuntimeState()],
      ['skillC', makeRuntimeState()],
    ])

    const ctx = makeContext({
      triggerKey: 'f',
      occupiedKeys: ['f', 'g'],
      bindings,
      allSkills,
      skillStates,
      randomFn: () => 0,
    })

    const result = resolvePhase5(skillA, makeRuntimeState(), ctx, makeFlags(), 100)

    // h 是 g 的邻居 → 多格扩展后被选为溅射目标
    expect(result.splashTargets).toContain('h')
    // 自身键不被溅射
    expect(result.splashTargets).not.toContain('f')
    expect(result.splashTargets).not.toContain('g')
  })
})

// ===== 7.4: Phase 6 Resonance/Link 多格匹配 =====

describe('resolvePhase6 — 多格空间匹配', () => {
  it('7.4a: domino [f,g] — g 的邻居 h 上的 Resonance 技能也能被触发', () => {
    // skillA 占 f+g，skillB 占 h（g 的 adjacent 邻居，但非 f 的 adjacent 邻居）
    const bindings = new Map([
      ['f', 'skillA'],
      ['g', 'skillA'],
      ['h', 'skillB'],
    ])
    const skillA = makeSkill({ id: 'skillA', resource: 'base' })
    const skillB = makeSkill({
      id: 'skillB',
      resource: 'base',
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
    const neighborKeysInActions = result.actions
      .filter(a => a.type === 'resonance')
      .map(a => a.neighborKey)

    // h 和 g 是 adjacent → occupiedKeys.some(k => hasRelation(k, 'h', Adjacent)) → true
    expect(neighborKeysInActions).toContain('h')
  })

  it('7.4b: 单格 [f] — Phase 6 Resonance 行为与改动前一致', () => {
    const bindings = new Map([
      ['f', 'skillA'],
      ['g', 'skillB'],
      ['h', 'skillC'], // h 不是 f 的 adjacent
    ])
    const skillA = makeSkill({ id: 'skillA', resource: 'base' })
    const skillB = makeSkill({
      id: 'skillB',
      resource: 'base',
      affixes: [{
        type: AffixType.Resonance,
        posRel: PositionRelation.Adjacent,
        resource: 'base',
      } as any],
    })
    const skillC = makeSkill({
      id: 'skillC',
      resource: 'base',
      affixes: [{
        type: AffixType.Resonance,
        posRel: PositionRelation.Adjacent,
        resource: 'base',
      } as any],
    })
    const allSkills = new Map([
      ['skillA', skillA],
      ['skillB', skillB],
      ['skillC', skillC],
    ])
    const skillStates = new Map([
      ['skillA', makeRuntimeState()],
      ['skillB', makeRuntimeState()],
      ['skillC', makeRuntimeState()],
    ])

    const ctx = makeContext({
      triggerKey: 'f',
      occupiedKeys: ['f'], // 单格
      bindings,
      allSkills,
      skillStates,
    })

    const result = resolvePhase6('f', skillA, makeRuntimeState(), ctx, 'base')
    const resonanceKeys = result.actions
      .filter(a => a.type === 'resonance')
      .map(a => a.neighborKey)

    // g 是 f 的 adjacent → 应被共鸣
    expect(resonanceKeys).toContain('g')
  })

  it('7.4c: Link 词条多格匹配 — domino [f,g] 扩展 Link 检测范围', () => {
    const bindings = new Map([
      ['f', 'skillA'],
      ['g', 'skillA'],
      ['h', 'skillB'],
    ])
    const skillA = makeSkill({
      id: 'skillA',
      resource: 'base',
      affixes: [{ type: AffixType.Splash, posRel: PositionRelation.Adjacent, resource: 'base' } as any],
    })
    const skillB = makeSkill({
      id: 'skillB',
      resource: 'base',
      affixes: [{
        type: AffixType.Link,
        watchAffix: AffixType.Splash,
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
    const linkKeys = result.actions
      .filter(a => a.type === 'link')
      .map(a => a.neighborKey)

    // h 和 g 是 adjacent → Link 应检测到
    expect(linkKeys).toContain('h')
  })
})

// ===== 7.5: Mirror 多格邻居复制范围 =====

describe('resolveMirrorCopy — 多格扩展邻居', () => {
  it('7.5a: domino [f,g] — Mirror 从 f 和 g 的邻居中选择复制源', () => {
    // skillC 在 h（g 的邻居），有可复制词条
    const bindings = new Map([
      ['f', 'skillA'],
      ['g', 'skillA'],
      ['h', 'skillC'],
    ])
    const skillA = makeSkill({
      id: 'skillA',
      resource: 'base',
      affixes: [{
        type: AffixType.Mirror,
        posRel: PositionRelation.Adjacent,
      } as any],
    })
    const splashAffix: AffixInstance = {
      type: AffixType.Splash,
      posRel: PositionRelation.Adjacent,
      resource: 'base',
    } as any
    const skillC = makeSkill({
      id: 'skillC',
      resource: 'base',
      affixes: [splashAffix],
    })
    const allSkills = new Map([
      ['skillA', skillA],
      ['skillC', skillC],
    ])
    const skillStates = new Map([
      ['skillA', makeRuntimeState()],
      ['skillC', makeRuntimeState()],
    ])

    const ctx = makeContext({
      triggerKey: 'f',
      occupiedKeys: ['f', 'g'],
      bindings,
      allSkills,
      skillStates,
      randomFn: () => 0, // 选第一个邻居
    })

    const copied = resolveMirrorCopy(skillA, makeRuntimeState(), ctx)
    // h 是 g 的邻居 → 在多格扩展后可被选为复制源
    // skillC 有 Splash 词条 → Mirror 应复制到
    expect(copied).not.toBeNull()
    expect(copied!.type).toBe(AffixType.Splash)
  })

  it('7.5b: 单格 [f] — Mirror 仅从 f 的邻居复制', () => {
    const bindings = new Map([
      ['f', 'skillA'],
      ['g', 'skillB'], // f 的邻居
    ])
    const skillA = makeSkill({
      id: 'skillA',
      resource: 'base',
      affixes: [{
        type: AffixType.Mirror,
        posRel: PositionRelation.Adjacent,
      } as any],
    })
    const skillB = makeSkill({
      id: 'skillB',
      resource: 'base',
      affixes: [{
        type: AffixType.Splash,
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
      occupiedKeys: ['f'],
      bindings,
      allSkills,
      skillStates,
      randomFn: () => 0,
    })

    const copied = resolveMirrorCopy(skillA, makeRuntimeState(), ctx)
    expect(copied).not.toBeNull()
    expect(copied!.type).toBe(AffixType.Splash)
  })
})

// ===== 7.6: findWeakestNeighbor 多格扩展 =====

describe('findWeakestNeighbor — 多格扩展范围', () => {
  it('7.6a: domino [f,g] — 从 f 和 g 的邻居并集中选择最弱', () => {
    // skillB 在 d（f 的邻居, level 3），skillC 在 h（g 的邻居, level 1）
    const bindings = new Map([
      ['f', 'skillA'],
      ['g', 'skillA'],
      ['d', 'skillB'],
      ['h', 'skillC'],
    ])
    const skillB = makeSkill({ id: 'skillB', level: 3, resource: 'base', baseValues: [30] } as any)
    const skillC = makeSkill({ id: 'skillC', level: 1, resource: 'base', baseValues: [10] } as any)
    const allSkills = new Map([
      ['skillA', makeSkill({ id: 'skillA', resource: 'base' })],
      ['skillB', skillB],
      ['skillC', skillC],
    ])
    const skillStates = new Map([
      ['skillA', makeRuntimeState()],
      ['skillB', makeRuntimeState()],
      ['skillC', makeRuntimeState()],
    ])

    const ctx = makeContext({
      triggerKey: 'f',
      occupiedKeys: ['f', 'g'],
      bindings,
      allSkills,
      skillStates,
    })

    const weakest = findWeakestNeighbor(['f', 'g'], PositionRelation.Adjacent, ctx)
    // h（skillC level 1）比 d（skillB level 3）弱
    expect(weakest).toBe('h')
  })

  it('7.6b: 单格 [f] — 等价于旧行为', () => {
    const bindings = new Map([
      ['f', 'skillA'],
      ['d', 'skillB'],
      ['g', 'skillC'],
    ])
    const skillB = makeSkill({ id: 'skillB', level: 2, resource: 'base', baseValues: [20] } as any)
    const skillC = makeSkill({ id: 'skillC', level: 1, resource: 'base', baseValues: [10] } as any)
    const allSkills = new Map([
      ['skillA', makeSkill({ id: 'skillA', resource: 'base' })],
      ['skillB', skillB],
      ['skillC', skillC],
    ])
    const skillStates = new Map([
      ['skillA', makeRuntimeState()],
      ['skillB', makeRuntimeState()],
      ['skillC', makeRuntimeState()],
    ])

    const ctx = makeContext({
      triggerKey: 'f',
      occupiedKeys: ['f'],
      bindings,
      allSkills,
      skillStates,
    })

    const weakest = findWeakestNeighbor(['f'], PositionRelation.Adjacent, ctx)
    expect(weakest).toBe('g') // skillC level 1 < skillB level 2
  })
})

// ===== 7.7: 单格回归测试 =====

describe('单格回归测试 — occupiedKeys = [triggerKey]', () => {
  it('7.7a: countEmptySlots 单格等价于旧 countEmptySlots(key, ...)', () => {
    const bindings = new Map([['f', 'skillA'], ['g', 'skillB']])
    const result1 = countEmptySlots('f', PositionRelation.Adjacent, bindings)
    const result2 = countEmptySlots(['f'], PositionRelation.Adjacent, bindings)
    expect(result1).toBe(result2)
  })

  it('7.7b: sumNeighborAmplifyStacks 单格无回归', () => {
    const bindings = new Map([['f', 'skillA'], ['d', 'skillB']])
    const stateB = makeRuntimeState()
    stateB.amplifyStacks = 2
    const ctx = makeContext({
      triggerKey: 'f',
      occupiedKeys: ['f'],
      bindings,
      allSkills: new Map([
        ['skillA', makeSkill({ id: 'skillA', resource: 'base' })],
        ['skillB', makeSkill({ id: 'skillB', resource: 'base' })],
      ]),
      skillStates: new Map([
        ['skillA', makeRuntimeState()],
        ['skillB', stateB],
      ]),
    })

    const bonus = sumNeighborAmplifyStacks(['f'], PositionRelation.Adjacent, 'base', 1.0, ctx)
    expect(bonus).toBe(2)
  })

  it('7.7c: findWeakestNeighbor 单格无回归', () => {
    const bindings = new Map([['f', 'skillA'], ['g', 'skillB']])
    const ctx = makeContext({
      triggerKey: 'f',
      occupiedKeys: ['f'],
      bindings,
      allSkills: new Map([
        ['skillA', makeSkill({ id: 'skillA', resource: 'base', baseValues: [10] } as any)],
        ['skillB', makeSkill({ id: 'skillB', resource: 'base', level: 1, baseValues: [10] } as any)],
      ]),
      skillStates: new Map([
        ['skillA', makeRuntimeState()],
        ['skillB', makeRuntimeState()],
      ]),
    })

    const weakest = findWeakestNeighbor(['f'], PositionRelation.Adjacent, ctx)
    expect(weakest).toBe('g')
  })
})

// ===== 7.6: Cascade 不变回归测试 =====

describe('Cascade — 多格不影响回归', () => {
  it('7.6a: Cascade 仍使用 prevKey vs triggerKey（不受 occupiedKeys 影响）', () => {
    // domino 占 [f,g]，Cascade(adjacent) 词条
    // prevKey='d'（与 f 是 adjacent）→ Cascade 应生效
    const skill = makeSkill({
      id: 'skillA',
      resource: 'base',
      affixes: [{
        type: AffixType.Cascade,
        posRel: PositionRelation.Adjacent,
        cascadeMult: 2.0,
      } as any],
    })

    const ctx = makeContext({
      triggerKey: 'f',
      occupiedKeys: ['f', 'g'], // 多格
      prevKey: 'd', // d 与 f 是 adjacent
    })

    const result = resolvePhase3(skill, makeRuntimeState(), ctx, 100)
    // Cascade 检查 hasRelation(prevKey='d', triggerKey='f', Adjacent) → true
    expect(result.output).toBeGreaterThan(100) // 应用了 cascadeMult
    expect(result.flags.isCascade).toBe(true)
  })

  it('7.6b: Cascade prevKey 与 triggerKey 非相邻时不生效（多格不扩展）', () => {
    // domino 占 [f,g]，Cascade(adjacent)
    // prevKey='h'（h 与 g 是 adjacent，但与 f 不 adjacent）
    // Cascade 只检查 prevKey vs triggerKey(=f)，不检查 occupiedKeys
    const skill = makeSkill({
      id: 'skillA',
      resource: 'base',
      affixes: [{
        type: AffixType.Cascade,
        posRel: PositionRelation.Adjacent,
        cascadeMult: 2.0,
      } as any],
    })

    const ctx = makeContext({
      triggerKey: 'f',
      occupiedKeys: ['f', 'g'], // 多格
      prevKey: 'h', // h 与 g 是 adjacent 但与 f 不是
    })

    const result = resolvePhase3(skill, makeRuntimeState(), ctx, 100)
    // Cascade 检查 hasRelation(prevKey='h', triggerKey='f', Adjacent) → false
    // 即使 h 与 g（另一占据键）adjacent，Cascade 也不应生效
    expect(result.output).toBe(100) // 无 cascadeMult
    expect(result.flags.isCascade).toBe(false)
  })
})

// ============================================
// Story 40.10: 附魔系统多格适配（Phase 6 观察者侧）
// ============================================

// ===== 8.1: ApprenticeNeighbor 观察者侧多格匹配 =====

describe('resolvePhase6 — ApprenticeNeighbor 多格观察者', () => {
  it('8.1a: 观察者侧 — domino 附魔技能通过第二键位的邻接关系被触发', () => {
    // 触发技能在 f（单格）
    // 附魔技能（ApprenticeNeighbor, Adjacent）占 [j, g]
    //   j 不是 f 的 adjacent（j→adj: h,u,i,k,m,n）
    //   g IS f 的 adjacent（g→adj: f,t,y,h,v,b）
    // 新代码：neighborKeys = [j, g]，双侧 any-match 检测到 (f, g) adjacent → 正确触发
    // 且 neighborKey 应为实际匹配键 g（而非任意键 j）
    const bindings = new Map([
      ['f', 'skillA'],
      ['j', 'skillB'],  // j 先于 g（模拟旧 bug 触发顺序）
      ['g', 'skillB'],
    ])
    const skillA = makeSkill({ id: 'skillA', resource: 'base' })
    const skillB = makeSkill({
      id: 'skillB',
      resource: 'base',
      enchantmentIds: [EnchantmentType.ApprenticeNeighbor],
      neighborPosRel: PositionRelation.Adjacent,
    })
    const allSkills = new Map([['skillA', skillA], ['skillB', skillB]])
    const skillStates = new Map([['skillA', makeRuntimeState()], ['skillB', makeRuntimeState()]])

    const ctx = makeContext({
      triggerKey: 'f',
      occupiedKeys: ['f'],
      bindings,
      allSkills,
      skillStates,
    })

    const result = resolvePhase6('f', skillA, makeRuntimeState(), ctx, 'base')
    const apprenticeActions = result.actions.filter(a => a.type === 'apprentice_neighbor')

    // 新代码应检测到 g 与 f 相邻 → ApprenticeNeighbor 触发
    expect(apprenticeActions.length).toBe(1)
    expect(apprenticeActions[0].growthDelta).toBe(APPRENTICE_NEIGHBOR_GROWTH[PositionRelation.Adjacent])
    // neighborKey 应为实际匹配键 g（而非 neighborKeys[0]=j）
    expect(apprenticeActions[0].neighborKey).toBe('g')
  })

  it('8.1b: 双侧多格 — 触发技能多格 × 附魔技能多格', () => {
    // 触发技能 domino [f, g]
    // 附魔技能（ApprenticeNeighbor, Adjacent）domino [j, h]
    //   f→adj: d,r,t,g,c,v → j 和 h 都不在
    //   g→adj: f,t,y,h,v,b → h IS adjacent!
    // 匹配路径: (g, h) → 双侧第二键互相匹配
    const bindings = new Map([
      ['f', 'skillA'],
      ['g', 'skillA'],
      ['j', 'skillB'],  // j 先于 h
      ['h', 'skillB'],
    ])
    const skillA = makeSkill({ id: 'skillA', resource: 'base' })
    const skillB = makeSkill({
      id: 'skillB',
      resource: 'base',
      enchantmentIds: [EnchantmentType.ApprenticeNeighbor],
      neighborPosRel: PositionRelation.Adjacent,
    })
    const allSkills = new Map([['skillA', skillA], ['skillB', skillB]])
    const skillStates = new Map([['skillA', makeRuntimeState()], ['skillB', makeRuntimeState()]])

    const ctx = makeContext({
      triggerKey: 'f',
      occupiedKeys: ['f', 'g'],
      bindings,
      allSkills,
      skillStates,
    })

    const result = resolvePhase6('f', skillA, makeRuntimeState(), ctx, 'base')
    const apprenticeActions = result.actions.filter(a => a.type === 'apprentice_neighbor')

    // g→h adjacent → 双侧 any-match 成功
    expect(apprenticeActions.length).toBe(1)
  })

  it('8.1c: 多格附魔技能范围确实更大 — domino 比 monomino 有更多有效触发邻居', () => {
    // 附魔技能 domino [g, h] vs monomino [g]，都有 ApprenticeNeighbor(Adjacent)
    // 检查：以 domino 配置可被更多触发键激活

    // 测试 domino [g, h] 的有效触发键集合
    const dominoValidTriggers: string[] = []
    for (const testKey of ['d', 'r', 't', 'f', 'c', 'v', 'y', 'u', 'j', 'n', 'b']) {
      const bindings = new Map<string, string>([
        [testKey, 'skillA'],
        ['g', 'skillB'],
        ['h', 'skillB'],
      ])
      const ctx = makeContext({
        triggerKey: testKey,
        occupiedKeys: [testKey],
        bindings,
        allSkills: new Map([
          ['skillA', makeSkill({ id: 'skillA', resource: 'base' })],
          ['skillB', makeSkill({
            id: 'skillB',
            resource: 'base',
            enchantmentIds: [EnchantmentType.ApprenticeNeighbor],
            neighborPosRel: PositionRelation.Adjacent,
          })],
        ]),
        skillStates: new Map([['skillA', makeRuntimeState()], ['skillB', makeRuntimeState()]]),
      })
      const result = resolvePhase6(testKey, makeSkill({ id: 'skillA' }), makeRuntimeState(), ctx, 'base')
      if (result.actions.some(a => a.type === 'apprentice_neighbor')) {
        dominoValidTriggers.push(testKey)
      }
    }

    // 测试 monomino [g] 的有效触发键集合
    const monoValidTriggers: string[] = []
    for (const testKey of ['d', 'r', 't', 'f', 'c', 'v', 'y', 'u', 'j', 'n', 'b']) {
      const bindings = new Map<string, string>([
        [testKey, 'skillA'],
        ['g', 'skillB'],
      ])
      const ctx = makeContext({
        triggerKey: testKey,
        occupiedKeys: [testKey],
        bindings,
        allSkills: new Map([
          ['skillA', makeSkill({ id: 'skillA', resource: 'base' })],
          ['skillB', makeSkill({
            id: 'skillB',
            resource: 'base',
            enchantmentIds: [EnchantmentType.ApprenticeNeighbor],
            neighborPosRel: PositionRelation.Adjacent,
          })],
        ]),
        skillStates: new Map([['skillA', makeRuntimeState()], ['skillB', makeRuntimeState()]]),
      })
      const result = resolvePhase6(testKey, makeSkill({ id: 'skillA' }), makeRuntimeState(), ctx, 'base')
      if (result.actions.some(a => a.type === 'apprentice_neighbor')) {
        monoValidTriggers.push(testKey)
      }
    }

    // domino 覆盖 g+h 的邻居并集 → 有效触发键应 ≥ monomino
    expect(dominoValidTriggers.length).toBeGreaterThan(monoValidTriggers.length)
  })
})

// ===== 8.2: QuestResonance 多格观察者匹配 =====

describe('resolvePhase6 — QuestResonance 多格观察者', () => {
  it('8.2a: QuestResonance 多格观察者 — 通过第二键位匹配', () => {
    // 触发技能在 f（单格），产出 base
    // 附魔技能占 [j, g]，有 QuestResonance + Resonance(base, Adjacent)
    //   j 不是 f 的 adjacent
    //   g IS f 的 adjacent
    const bindings = new Map([
      ['f', 'skillA'],
      ['j', 'skillB'],
      ['g', 'skillB'],
    ])
    const skillA = makeSkill({ id: 'skillA', resource: 'base' })
    const skillB = makeSkill({
      id: 'skillB',
      resource: 'base',
      enchantmentIds: [EnchantmentType.QuestResonance],
      affixes: [{
        type: AffixType.Resonance,
        posRel: PositionRelation.Adjacent,
        resource: 'base',
      } as any],
    })
    const allSkills = new Map([['skillA', skillA], ['skillB', skillB]])
    const skillStates = new Map([['skillA', makeRuntimeState()], ['skillB', makeRuntimeState()]])

    const ctx = makeContext({
      triggerKey: 'f',
      occupiedKeys: ['f'],
      bindings,
      allSkills,
      skillStates,
    })

    const result = resolvePhase6('f', skillA, makeRuntimeState(), ctx, 'base')

    // Resonance 匹配 + QuestResonance 叠层都应通过 g→f adjacent 触发
    const resonanceActions = result.actions.filter(a => a.type === 'resonance')
    const questActions = result.actions.filter(a => a.type === 'quest_resonance')
    expect(resonanceActions.length).toBe(1)
    expect(questActions.length).toBe(1)
  })
})

// ===== 8.3: 单格回归 =====

describe('resolvePhase6 — 40.10 单格回归', () => {
  it('8.3a: ApprenticeNeighbor 单格 — 行为与改动前一致', () => {
    // 触发技能 f，附魔技能 g（单格），ApprenticeNeighbor(Adjacent)
    const bindings = new Map([
      ['f', 'skillA'],
      ['g', 'skillB'],
    ])
    const skillA = makeSkill({ id: 'skillA', resource: 'base' })
    const skillB = makeSkill({
      id: 'skillB',
      resource: 'base',
      enchantmentIds: [EnchantmentType.ApprenticeNeighbor],
      neighborPosRel: PositionRelation.Adjacent,
    })
    const allSkills = new Map([['skillA', skillA], ['skillB', skillB]])
    const skillStates = new Map([['skillA', makeRuntimeState()], ['skillB', makeRuntimeState()]])

    const ctx = makeContext({
      triggerKey: 'f',
      occupiedKeys: ['f'],
      bindings,
      allSkills,
      skillStates,
    })

    const result = resolvePhase6('f', skillA, makeRuntimeState(), ctx, 'base')
    const apprenticeActions = result.actions.filter(a => a.type === 'apprentice_neighbor')

    expect(apprenticeActions.length).toBe(1)
    expect(apprenticeActions[0].growthDelta).toBe(APPRENTICE_NEIGHBOR_GROWTH[PositionRelation.Adjacent])
  })

  it('8.3b: QuestResonance 单格 — 行为与改动前一致', () => {
    const bindings = new Map([
      ['f', 'skillA'],
      ['g', 'skillB'],
    ])
    const skillA = makeSkill({ id: 'skillA', resource: 'base' })
    const skillB = makeSkill({
      id: 'skillB',
      resource: 'base',
      enchantmentIds: [EnchantmentType.QuestResonance],
      affixes: [{
        type: AffixType.Resonance,
        posRel: PositionRelation.Adjacent,
        resource: 'base',
      } as any],
    })
    const allSkills = new Map([['skillA', skillA], ['skillB', skillB]])
    const skillStates = new Map([['skillA', makeRuntimeState()], ['skillB', makeRuntimeState()]])

    const ctx = makeContext({
      triggerKey: 'f',
      occupiedKeys: ['f'],
      bindings,
      allSkills,
      skillStates,
    })

    const result = resolvePhase6('f', skillA, makeRuntimeState(), ctx, 'base')
    const resonanceActions = result.actions.filter(a => a.type === 'resonance')
    const questActions = result.actions.filter(a => a.type === 'quest_resonance')

    expect(resonanceActions.length).toBe(1)
    expect(questActions.length).toBe(1)
  })

  it('8.3c: Resonance/Link 单格 — 行为与改动前一致', () => {
    const bindings = new Map([
      ['f', 'skillA'],
      ['g', 'skillB'],
      ['d', 'skillC'],
    ])
    const skillA = makeSkill({
      id: 'skillA',
      resource: 'base',
      affixes: [{ type: AffixType.Splash, posRel: PositionRelation.Adjacent, resource: 'base' } as any],
    })
    const skillB = makeSkill({
      id: 'skillB',
      resource: 'base',
      affixes: [{
        type: AffixType.Resonance,
        posRel: PositionRelation.Adjacent,
        resource: 'base',
      } as any],
    })
    const skillC = makeSkill({
      id: 'skillC',
      resource: 'base',
      affixes: [{
        type: AffixType.Link,
        watchAffix: AffixType.Splash,
        posRel: PositionRelation.Adjacent,
      } as any],
    })
    const allSkills = new Map([['skillA', skillA], ['skillB', skillB], ['skillC', skillC]])
    const skillStates = new Map([
      ['skillA', makeRuntimeState()],
      ['skillB', makeRuntimeState()],
      ['skillC', makeRuntimeState()],
    ])

    const ctx = makeContext({
      triggerKey: 'f',
      occupiedKeys: ['f'],
      bindings,
      allSkills,
      skillStates,
    })

    const result = resolvePhase6('f', skillA, makeRuntimeState(), ctx, 'base')
    const resonanceActions = result.actions.filter(a => a.type === 'resonance')
    const linkActions = result.actions.filter(a => a.type === 'link')

    // g 是 f 的 adjacent → Resonance 应触发
    expect(resonanceActions.length).toBe(1)
    // d 是 f 的 adjacent, skillA 有 Splash → Link 应触发
    expect(linkActions.length).toBe(1)
  })
})

// ===== 8.4: Phase 6 去重验证（重构后仍然正确） =====

describe('resolvePhase6 — 40.10 去重验证', () => {
  it('8.4a: 多格邻居技能重构后仍只产生 1 个 action', () => {
    // skillB 是 domino 占 [d, r]（都是 f 的 adjacent）
    // skillB 有 Resonance(base, Adjacent) + ApprenticeNeighbor(Adjacent)
    // 按技能分组后 neighborKeys = [d, r] → 每种 action 仍只产生 1 个
    const bindings = new Map([
      ['f', 'skillA'],
      ['d', 'skillB'],
      ['r', 'skillB'],
    ])
    const skillA = makeSkill({ id: 'skillA', resource: 'base' })
    const skillB = makeSkill({
      id: 'skillB',
      resource: 'base',
      affixes: [{
        type: AffixType.Resonance,
        posRel: PositionRelation.Adjacent,
        resource: 'base',
      } as any],
      enchantmentIds: [EnchantmentType.ApprenticeNeighbor],
      neighborPosRel: PositionRelation.Adjacent,
    })
    const allSkills = new Map([['skillA', skillA], ['skillB', skillB]])
    const skillStates = new Map([['skillA', makeRuntimeState()], ['skillB', makeRuntimeState()]])

    const ctx = makeContext({
      triggerKey: 'f',
      occupiedKeys: ['f'],
      bindings,
      allSkills,
      skillStates,
    })

    const result = resolvePhase6('f', skillA, makeRuntimeState(), ctx, 'base')

    // Resonance: 1 个（不因 d+r 两个键而产生 2 个）
    const resonanceActions = result.actions.filter(a => a.type === 'resonance')
    expect(resonanceActions.length).toBe(1)
    // ApprenticeNeighbor: 1 个
    const apprenticeActions = result.actions.filter(a => a.type === 'apprentice_neighbor')
    expect(apprenticeActions.length).toBe(1)
  })
})

// ===== Code Review Fix: 补充测试 =====

describe('resolvePhase6 — H1-fix: 负面测试', () => {
  it('8.5a: 多格观察者所有键位均不满足空间关系时不触发', () => {
    // 触发技能在 p，附魔技能（ApprenticeNeighbor, Adjacent）占 [a, z]
    // p→adj: o,l,0,-  a→adj: q,w,s,z  z→adj: a,s,x
    // a 和 z 都不是 p 的 adjacent → 不应触发
    const bindings = new Map([
      ['p', 'skillA'],
      ['a', 'skillB'],
      ['z', 'skillB'],
    ])
    const skillA = makeSkill({ id: 'skillA', resource: 'base' })
    const skillB = makeSkill({
      id: 'skillB',
      resource: 'base',
      enchantmentIds: [EnchantmentType.ApprenticeNeighbor],
      neighborPosRel: PositionRelation.Adjacent,
    })
    const allSkills = new Map([['skillA', skillA], ['skillB', skillB]])
    const skillStates = new Map([['skillA', makeRuntimeState()], ['skillB', makeRuntimeState()]])

    const ctx = makeContext({
      triggerKey: 'p',
      occupiedKeys: ['p'],
      bindings,
      allSkills,
      skillStates,
    })

    const result = resolvePhase6('p', skillA, makeRuntimeState(), ctx, 'base')
    expect(result.actions.length).toBe(0)
  })
})

describe('resolvePhase6 — M2-fix: Link 观察者侧多格', () => {
  it('8.6a: Link 观察者侧 — domino Link 技能通过第二键位匹配', () => {
    // 触发技能 f（有 Splash 词条），Link 观察者占 [j, g]
    // j 不是 f 的 adjacent，g IS f 的 adjacent
    const bindings = new Map([
      ['f', 'skillA'],
      ['j', 'skillB'],
      ['g', 'skillB'],
    ])
    const skillA = makeSkill({
      id: 'skillA',
      resource: 'base',
      affixes: [{ type: AffixType.Splash, posRel: PositionRelation.Adjacent, resource: 'base' } as any],
    })
    const skillB = makeSkill({
      id: 'skillB',
      resource: 'base',
      affixes: [{
        type: AffixType.Link,
        watchAffix: AffixType.Splash,
        posRel: PositionRelation.Adjacent,
      } as any],
    })
    const allSkills = new Map([['skillA', skillA], ['skillB', skillB]])
    const skillStates = new Map([['skillA', makeRuntimeState()], ['skillB', makeRuntimeState()]])

    const ctx = makeContext({
      triggerKey: 'f',
      occupiedKeys: ['f'],
      bindings,
      allSkills,
      skillStates,
    })

    const result = resolvePhase6('f', skillA, makeRuntimeState(), ctx, 'base')
    const linkActions = result.actions.filter(a => a.type === 'link')

    expect(linkActions.length).toBe(1)
    // neighborKey 应为实际匹配键 g
    expect(linkActions[0].neighborKey).toBe('g')
  })
})

describe('resolvePhase6 — M3-fix: Resonance 观察者侧多格', () => {
  it('8.7a: Resonance 观察者侧 — domino Resonance 技能通过第二键位匹配', () => {
    // 触发技能 f 产出 base，Resonance 观察者占 [j, g]
    // j 不是 f 的 adjacent，g IS f 的 adjacent
    const bindings = new Map([
      ['f', 'skillA'],
      ['j', 'skillB'],
      ['g', 'skillB'],
    ])
    const skillA = makeSkill({ id: 'skillA', resource: 'base' })
    const skillB = makeSkill({
      id: 'skillB',
      resource: 'base',
      affixes: [{
        type: AffixType.Resonance,
        posRel: PositionRelation.Adjacent,
        resource: 'base',
      } as any],
    })
    const allSkills = new Map([['skillA', skillA], ['skillB', skillB]])
    const skillStates = new Map([['skillA', makeRuntimeState()], ['skillB', makeRuntimeState()]])

    const ctx = makeContext({
      triggerKey: 'f',
      occupiedKeys: ['f'],
      bindings,
      allSkills,
      skillStates,
    })

    const result = resolvePhase6('f', skillA, makeRuntimeState(), ctx, 'base')
    const resonanceActions = result.actions.filter(a => a.type === 'resonance')

    expect(resonanceActions.length).toBe(1)
    expect(resonanceActions[0].neighborKey).toBe('g')
  })
})

describe('resolvePhase6 — M4-fix: chainAffixesDisabled 交互', () => {
  it('8.8a: chainAffixesDisabled 阻止 Resonance/Link 但不阻止 ApprenticeNeighbor', () => {
    // 邻居技能有 Resonance + ApprenticeNeighbor
    // chainAffixesDisabled = true → Resonance 跳过，ApprenticeNeighbor 仍触发
    const bindings = new Map([
      ['f', 'skillA'],
      ['g', 'skillB'],
    ])
    const skillA = makeSkill({ id: 'skillA', resource: 'base' })
    const skillB = makeSkill({
      id: 'skillB',
      resource: 'base',
      affixes: [{
        type: AffixType.Resonance,
        posRel: PositionRelation.Adjacent,
        resource: 'base',
      } as any],
      enchantmentIds: [EnchantmentType.ApprenticeNeighbor],
      neighborPosRel: PositionRelation.Adjacent,
    })
    const allSkills = new Map([['skillA', skillA], ['skillB', skillB]])
    const skillStates = new Map([['skillA', makeRuntimeState()], ['skillB', makeRuntimeState()]])

    const ctx = makeContext({
      triggerKey: 'f',
      occupiedKeys: ['f'],
      bindings,
      allSkills,
      skillStates,
      chainAffixesDisabled: true,
    })

    const result = resolvePhase6('f', skillA, makeRuntimeState(), ctx, 'base')

    // Resonance 被 chain_ban 阻止
    expect(result.actions.filter(a => a.type === 'resonance').length).toBe(0)
    // ApprenticeNeighbor 不受 chain_ban 影响
    expect(result.actions.filter(a => a.type === 'apprentice_neighbor').length).toBe(1)
  })
})

// ===== 9.1: Story 40.11 — Mirror 刷新多格修复验证 =====

describe('resolveMirrorCopy — 40.11 battle.ts Mirror 刷新修复', () => {
  // 单元级回归测试：验证 resolveMirrorCopy 在不同 occupiedKeys 下的行为差异
  // battle.ts 调用此函数时已改为传递完整占据键列表（getSkillKeys）
  it('9.1a: 单键 occupiedKeys=[f] 无法到达 h（仅 g 的邻居）→ 复制失败', () => {
    // skillA 是 Mirror 技能，occupiedKeys 只传 [f]（旧 battle.ts bug）
    // skillC 在 h（g 的邻居，但不是 f 的邻居）
    const bindings = new Map([
      ['f', 'skillA'],
      ['g', 'skillA'],
      ['h', 'skillC'],
    ])
    const skillA = makeSkill({
      id: 'skillA',
      resource: 'base',
      affixes: [{
        type: AffixType.Mirror,
        posRel: PositionRelation.Adjacent,
      } as any],
    })
    const skillC = makeSkill({
      id: 'skillC',
      resource: 'base',
      affixes: [{
        type: AffixType.Splash,
        posRel: PositionRelation.Adjacent,
        resource: 'base',
      } as any],
    })
    const allSkills = new Map([['skillA', skillA], ['skillC', skillC]])
    const skillStates = new Map([['skillA', makeRuntimeState()], ['skillC', makeRuntimeState()]])

    // 旧行为：occupiedKeys 只含 anchor key
    const ctxOld = makeContext({
      triggerKey: 'f',
      occupiedKeys: ['f'],
      bindings,
      allSkills,
      skillStates,
      randomFn: () => 0,
    })
    const copiedOld = resolveMirrorCopy(skillA, makeRuntimeState(), ctxOld)
    // h 不是 f 的 adjacent → 单键模式无法到达 skillC
    expect(copiedOld).toBeNull()

    // 新行为：occupiedKeys 含所有占据键 [f, g]
    const ctxNew = makeContext({
      triggerKey: 'f',
      occupiedKeys: ['f', 'g'],
      bindings,
      allSkills,
      skillStates,
      randomFn: () => 0,
    })
    const copiedNew = resolveMirrorCopy(skillA, makeRuntimeState(), ctxNew)
    // h 是 g 的 adjacent → 多格模式可到达 skillC → 复制 Splash
    expect(copiedNew).not.toBeNull()
    expect(copiedNew!.type).toBe(AffixType.Splash)
  })
})
