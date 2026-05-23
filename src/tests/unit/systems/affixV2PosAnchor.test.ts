// ============================================
// 打字肉鸽 - posRel 锚（同技能 trigger/scope 各自统一范围）单元测试
// ============================================

import { describe, it, expect } from 'vitest'
import { scopePosAnchor, triggerPosAnchor, PositionRelation, getKeysWithRelation } from '../../../src/data/keyboardTopology'
import { resolveSelectorToHighlightKeys } from '../../../src/systems/affixV2ScopeKeys'

describe('posRel 锚 · 确定性 + 独立', () => {
  it('scopePosAnchor 同 id 稳定（跨调用一致 → 跨存档稳定）', () => {
    expect(scopePosAnchor('sk_x')).toBe(scopePosAnchor('sk_x'))
    expect(triggerPosAnchor('sk_x')).toBe(triggerPosAnchor('sk_x'))
  })

  it('scope 锚与 trigger 锚相互独立（至少某些技能两者不同）', () => {
    const ids = ['a', 'b', 'c', 'sk_1', 'sk_2', 'foo', 'bar', 'baz']
    expect(ids.some(id => scopePosAnchor(id) !== triggerPosAnchor(id))).toBe(true)
  })

  it('不同技能得到不同锚（分布非退化）', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    expect(new Set(ids.map(scopePosAnchor)).size).toBeGreaterThan(1)
  })
})

describe('resolveSelectorToHighlightKeys · 同技能 neighbors 统一到 scope 锚', () => {
  const occ = ['g']
  const occSet = new Set(occ)

  it('同一技能上两个不同 rolled posRel 的 neighbors → 高亮一致（= 该技能 scope 锚）', () => {
    const a = resolveSelectorToHighlightKeys({ type: 'neighbors', posRel: PositionRelation.Adjacent }, occ, occSet, 'sk_unify')
    const b = resolveSelectorToHighlightKeys({ type: 'neighbors', posRel: PositionRelation.SameRow }, occ, occSet, 'sk_unify')
    expect(new Set(a)).toEqual(new Set(b))
    expect(new Set(a)).toEqual(new Set(getKeysWithRelation('g', scopePosAnchor('sk_unify'))))
  })

  it('不同技能的同 rolled posRel → 各用各的 scope 锚（不串）', () => {
    const x = new Set(resolveSelectorToHighlightKeys({ type: 'neighbors', posRel: PositionRelation.Adjacent }, occ, occSet, 'sk_x'))
    const y = new Set(resolveSelectorToHighlightKeys({ type: 'neighbors', posRel: PositionRelation.Adjacent }, occ, occSet, 'sk_y'))
    expect(x).toEqual(new Set(getKeysWithRelation('g', scopePosAnchor('sk_x'))))
    expect(y).toEqual(new Set(getKeysWithRelation('g', scopePosAnchor('sk_y'))))
  })

  it('不传 hostSkillId → 退化用 rolled posRel（不统一，向后兼容）', () => {
    const a = resolveSelectorToHighlightKeys({ type: 'neighbors', posRel: PositionRelation.Adjacent }, occ, occSet)
    expect(new Set(a)).toEqual(new Set(getKeysWithRelation('g', PositionRelation.Adjacent)))
  })

  it('self 作用域不受锚影响（恒空高亮）', () => {
    expect(resolveSelectorToHighlightKeys({ type: 'self' }, occ, occSet, 'sk_unify')).toEqual([])
  })
})
