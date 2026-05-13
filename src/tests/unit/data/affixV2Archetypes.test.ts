// ============================================
// 打字肉鸽 - affixV2 Archetype 模板单元测试
// ============================================

import { describe, it, expect } from 'vitest'
import {
  ARCHETYPE_REGISTRY,
  makeDripEffect,
  makeBurstAddEffect,
  makeBurstMultiplyEffect,
  makeStackReleaseEffect,
  makeAuraEffect,
  makeBroadcastEffect,
  makeConditionalEffect,
  withTagCountScale,
} from '../../../src/data/affixV2Archetypes'

describe('ARCHETYPE_REGISTRY · 6 个 archetype', () => {
  it('全部 6 个 archetype 都有 meta', () => {
    const expected = ['drip', 'burst', 'stack_release', 'aura', 'broadcast', 'conditional']
    for (const id of expected) {
      expect(ARCHETYPE_REGISTRY[id as keyof typeof ARCHETYPE_REGISTRY]).toBeDefined()
    }
  })

  it('每个 archetype 有非空 name_zh / feel', () => {
    for (const a of Object.values(ARCHETYPE_REGISTRY)) {
      expect(a.name_zh.length).toBeGreaterThan(0)
      expect(a.feel.length).toBeGreaterThan(0)
    }
  })
})

describe('Archetype 模板构造器', () => {
  it('makeDripEffect → gain_resource', () => {
    const eff = makeDripEffect({ section: 'maintenance', rarity: 0, trigger: { type: 'on_word_end' }, resource: 'score' })
    expect(eff.kind).toBe('gain_resource')
    if (eff.kind === 'gain_resource') {
      expect(eff.resource).toBe('score')
      expect(eff.ratio).toBeGreaterThan(0)
    }
  })

  it('makeBurstAddEffect → add (关内成长 base)', () => {
    const eff = makeBurstAddEffect({ section: 'locomotion', rarity: 1, trigger: { type: 'on_self_fire' } })
    expect(eff.kind).toBe('add')
    if (eff.kind === 'add') expect(eff.ratio).toBeGreaterThan(0)
  })

  it('makeBurstMultiplyEffect → multiply (关内成长 factor)', () => {
    const eff = makeBurstMultiplyEffect({ section: 'tool', rarity: 0, trigger: { type: 'on_self_fire' } })
    expect(eff.kind).toBe('multiply')
    if (eff.kind === 'multiply') expect(eff.amount).toBeGreaterThan(0)
  })

  it('makeStackReleaseEffect → composite([stack_inc, stack_release])', () => {
    const eff = makeStackReleaseEffect({
      section: 'gesture', rarity: 0, trigger: { type: 'on_key' },
      threshold: 8,
      releaseEffect: { kind: 'gain_resource', resource: 'score', ratio: 3 },
    })
    expect(eff.kind).toBe('composite')
    if (eff.kind === 'composite') {
      expect(eff.effects.length).toBe(2)
      expect(eff.effects[0].kind).toBe('stack_inc')
      expect(eff.effects[1].kind).toBe('stack_release')
    }
  })

  it('makeAuraEffect → apply_aura', () => {
    const eff = makeAuraEffect({
      selector: { type: 'all_skills', pick: 'all' },
      modifier: { type: 'crit_chance_add', amount: 0.1 },
    })
    expect(eff.kind).toBe('apply_aura')
  })

  it('makeBroadcastEffect → fire_target', () => {
    const eff = makeBroadcastEffect({ selector: { type: 'all_skills', pick: 'all' } })
    expect(eff.kind).toBe('fire_target')
  })

  it('makeConditionalEffect → conditional', () => {
    const eff = makeConditionalEffect({
      when: { type: 'is_crit' },
      then: { kind: 'gain_resource', resource: 'score', ratio: 1 },
    })
    expect(eff.kind).toBe('conditional')
  })
})

describe('withTagCountScale · 给 effect 挂 scale', () => {
  it('给 gain_resource 挂 scale', () => {
    const base = makeDripEffect({ section: 'vocal', rarity: 0, trigger: { type: 'on_word_end' }, resource: 'score' })
    const scaled = withTagCountScale(base, 'vocal', 0.5)
    expect(scaled.kind).toBe('gain_resource')
    if (scaled.kind === 'gain_resource') {
      expect(scaled.scale).toBeDefined()
      expect(scaled.scale?.factor).toBe(0.5)
    }
  })

  it('给不支持 scale 的 kind 原样返', () => {
    const aura = makeAuraEffect({ selector: { type: 'self' }, modifier: { type: 'crit_chance_add', amount: 0.1 } })
    const scaled = withTagCountScale(aura, 'vocal', 0.5)
    expect(scaled).toEqual(aura)
  })
})
