// ============================================
// 造词师·校勘 Proofread 词末结算单元测试
// ============================================
// 验证 resolveProofreadWordEnd：未触发叠层、满层自触发、层数减阈值

import { describe, it, expect } from 'vitest'
import { AffixType, type AffixSkillInstance, type SkillRuntimeState } from '../../../src/data/affixes'
import { resolveProofreadWordEnd } from '../../../src/data/affixTrigger'

function makeSkill(id: string, hasProofread: boolean, interval = 4): AffixSkillInstance {
  return {
    id,
    name: id,
    icon: '📖',
    resource: 'base',
    baseValues: [5, 8, 12],
    level: 1,
    rarity: 0,
    affixes: hasProofread
      ? [{ type: AffixType.Proofread, proofreadInterval: interval }]
      : [],
    enchantmentIds: [],
  }
}

function makeRt(id: string, stacks = 0): SkillRuntimeState {
  return {
    skillId: id,
    chargeAccumulated: 0,
    currentDecayMult: 1,
    mirrorCopiedAffix: null,
    mirrorCopiedAffixes: [],
    stacks,
    triggerCount: 0,
    amplifyStacks: 0,
    apprenticeAccumulated: 0,
    questStacks: 0,
    questCompletions: 0,
    questTransformed: false,
  } as unknown as SkillRuntimeState
}

describe('resolveProofreadWordEnd', () => {
  it('non-proofread skills are ignored', () => {
    const skills = new Map<string, AffixSkillInstance>([['a', makeSkill('a', false)]])
    const states = new Map<string, SkillRuntimeState>([['a', makeRt('a')]])
    const fired = resolveProofreadWordEnd(skills, states, new Set())
    expect(fired).toEqual([])
    expect(states.get('a')!.stacks).toBe(0)
  })

  it('triggered-this-word proofread skill does not stack', () => {
    const skills = new Map([['p', makeSkill('p', true, 4)]])
    const states = new Map([['p', makeRt('p', 2)]])
    const fired = resolveProofreadWordEnd(skills, states, new Set(['p']))
    expect(fired).toEqual([])
    expect(states.get('p')!.stacks).toBe(2) // 未变
  })

  it('untriggered proofread skill stacks by 1 but does not fire below threshold', () => {
    const skills = new Map([['p', makeSkill('p', true, 4)]])
    const states = new Map([['p', makeRt('p', 0)]])
    const fired = resolveProofreadWordEnd(skills, states, new Set())
    expect(fired).toEqual([])
    expect(states.get('p')!.stacks).toBe(1)
  })

  it('fires and subtracts interval when stacks reach threshold', () => {
    const skills = new Map([['p', makeSkill('p', true, 4)]])
    const states = new Map([['p', makeRt('p', 3)]]) // 3 -> +1 -> 4 -> fire
    const fired = resolveProofreadWordEnd(skills, states, new Set())
    expect(fired).toEqual(['p'])
    expect(states.get('p')!.stacks).toBe(0)
  })

  it('defaults to interval 4 when proofreadInterval missing', () => {
    const skills = new Map([['p', { ...makeSkill('p', true), affixes: [{ type: AffixType.Proofread }] }]])
    const states = new Map([['p', makeRt('p', 3)]])
    const fired = resolveProofreadWordEnd(skills, states, new Set())
    expect(fired).toEqual(['p'])
    expect(states.get('p')!.stacks).toBe(0)
  })

  it('handles multiple skills independently', () => {
    const skills = new Map<string, AffixSkillInstance>([
      ['a', makeSkill('a', true, 4)],           // untriggered, stacks 3 -> fire
      ['b', makeSkill('b', true, 4)],           // triggered, ignored
      ['c', makeSkill('c', true, 4)],           // untriggered, stacks 0 -> no fire
      ['d', makeSkill('d', false)],             // no proofread
    ])
    const states = new Map<string, SkillRuntimeState>([
      ['a', makeRt('a', 3)],
      ['b', makeRt('b', 2)],
      ['c', makeRt('c', 0)],
      ['d', makeRt('d', 0)],
    ])
    const fired = resolveProofreadWordEnd(skills, states, new Set(['b']))
    expect(fired.sort()).toEqual(['a'])
    expect(states.get('a')!.stacks).toBe(0)
    expect(states.get('b')!.stacks).toBe(2) // 未变
    expect(states.get('c')!.stacks).toBe(1)
    expect(states.get('d')!.stacks).toBe(0)
  })

  it('skips proofread skill with missing runtime state', () => {
    const skills = new Map([['p', makeSkill('p', true, 4)]])
    const states = new Map<string, SkillRuntimeState>() // empty
    const fired = resolveProofreadWordEnd(skills, states, new Set())
    expect(fired).toEqual([])
  })
})
