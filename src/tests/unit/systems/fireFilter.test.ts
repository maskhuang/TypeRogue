// ============================================
// 打字肉鸽 - 新 Affix 系统 · 5 维 matchFireFilter 单元测试
// ============================================

import { describe, it, expect } from 'vitest'
import { matchFireFilter, type FireEvent } from '../../../src/systems/fireFilter'
import { PositionRelation } from '../../../src/data/keyboardTopology'
import { state } from '../../../src/core/state'

const baseEvent: FireEvent = {
  sourceAffixId: 'pant_hoot',      // section=vocal
  sourceSkillId: 'skill_1',
  sourceKey: 'K',
  sourceResource: 'score',
  isCrit: false,
  stackState: 'none',
  amount: 1,
  timestamp: 0,
}

describe('matchFireFilter · 单维度匹配', () => {
  it('空 filter → true', () => {
    expect(matchFireFilter(baseEvent, {}, 'K')).toBe(true)
  })

  it('tag 维度命中', () => {
    expect(matchFireFilter(baseEvent, { tag: 'vocal' }, 'K')).toBe(true)
    expect(matchFireFilter(baseEvent, { tag: 'agonistic' }, 'K')).toBe(false)
  })

  it('tag any-of 多 tag', () => {
    expect(matchFireFilter(baseEvent, { tag: ['vocal', 'agonistic'] }, 'K')).toBe(true)
    expect(matchFireFilter(baseEvent, { tag: ['tool', 'agonistic'] }, 'K')).toBe(false)
  })

  it('未知 sourceAffixId 不命中 tag', () => {
    const bad = { ...baseEvent, sourceAffixId: 'xxx' }
    expect(matchFireFilter(bad, { tag: 'vocal' }, 'K')).toBe(false)
  })

  it('posRel SameRow 命中（不同键、同行）', () => {
    // baseEvent.sourceKey='K'；listener='L'；K 和 L 都在 home row
    expect(matchFireFilter(baseEvent, { posRel: PositionRelation.SameRow }, 'L')).toBe(true)
  })

  it('posRel SameRow 不命中（不同行）', () => {
    // baseEvent.sourceKey='K'（home row）；listener='Q'（top row）
    expect(matchFireFilter(baseEvent, { posRel: PositionRelation.SameRow }, 'Q')).toBe(false)
  })

  it('posRel · 技能不是自己的位置邻位（多格技能 fire 自身不命中自身 on_fire(posRel)）', () => {
    // skill_X 占两格 A、S（同行/相邻/同手皆成立）· fire 自身时任何 posRel 都不应命中
    state.player.bindings.set('A', 'skill_X')
    state.player.bindings.set('S', 'skill_X')
    const selfFire: FireEvent = { ...baseEvent, sourceSkillId: 'skill_X', sourceKey: 'A' }
    for (const rel of [PositionRelation.SameRow, PositionRelation.Adjacent, PositionRelation.SameHand,
      PositionRelation.SameColumn, PositionRelation.SameFinger, PositionRelation.Symmetric]) {
      expect(matchFireFilter(selfFire, { posRel: rel }, 'S')).toBe(false)
    }
    state.player.bindings.delete('A')
    state.player.bindings.delete('S')
  })

  it('resource 维度匹配', () => {
    expect(matchFireFilter(baseEvent, { resource: 'score' }, 'K')).toBe(true)
    expect(matchFireFilter(baseEvent, { resource: 'gold' }, 'K')).toBe(false)
  })

  it('is_crit 维度', () => {
    expect(matchFireFilter(baseEvent, { is_crit: false }, 'K')).toBe(true)
    expect(matchFireFilter(baseEvent, { is_crit: true }, 'K')).toBe(false)
    const critEvent = { ...baseEvent, isCrit: true }
    expect(matchFireFilter(critEvent, { is_crit: true }, 'K')).toBe(true)
  })

  it('stack_state 维度', () => {
    const fullEvent = { ...baseEvent, stackState: 'full' as const }
    expect(matchFireFilter(fullEvent, { stack_state: 'full' }, 'K')).toBe(true)
    expect(matchFireFilter(fullEvent, { stack_state: 'partial' }, 'K')).toBe(false)
    expect(matchFireFilter(baseEvent, { stack_state: 'full' }, 'K')).toBe(false)
  })
})

describe('matchFireFilter · 多维度 AND', () => {
  it('两维度同时满足 → true', () => {
    expect(matchFireFilter(baseEvent, { tag: 'vocal', resource: 'score' }, 'K')).toBe(true)
  })

  it('一个维度不满足 → false（AND 语义）', () => {
    expect(matchFireFilter(baseEvent, { tag: 'vocal', resource: 'gold' }, 'K')).toBe(false)
    expect(matchFireFilter(baseEvent, { tag: 'agonistic', resource: 'score' }, 'K')).toBe(false)
  })

  it('正交组合：resource + is_crit', () => {
    const critEvent = { ...baseEvent, isCrit: true }
    expect(matchFireFilter(critEvent, { resource: 'score', is_crit: true }, 'K')).toBe(true)
    expect(matchFireFilter(critEvent, { resource: 'gold', is_crit: true }, 'K')).toBe(false)
  })

  it('全 5 维同时命中', () => {
    const fullEvent: FireEvent = {
      ...baseEvent,
      isCrit: true,
      stackState: 'full',
    }
    // listener='L'，source='K'：同行不同键
    expect(matchFireFilter(
      fullEvent,
      {
        tag: 'vocal',
        posRel: PositionRelation.SameRow,
        resource: 'score',
        is_crit: true,
        stack_state: 'full',
      },
      'L',
    )).toBe(true)
  })
})
