// ============================================
// 打字肉鸽 - 遗物三选一系统测试
// ============================================
// Q2: 加权遗物候选生成 + hasUnownedRelics

import { describe, it, expect, beforeEach } from 'vitest'
import { state, resetState } from '../../../src/core/state'
import { RELICS, getAllRelicIds } from '../../../src/data/relics'
import {
  generateRelicCandidates,
  hasUnownedRelics,
  RELIC_WEIGHT_PRESETS,
} from '../../../src/systems/relicPicker'
import type { RelicWeights } from '../../../src/systems/relicPicker'

describe('加权遗物候选生成 (Q2)', () => {
  beforeEach(() => {
    resetState()
    // 所有遗物都是职业专属，需要设置职业才能获取候选
    state.classId = 'wordsmith'
  })

  it('返回至多 3 个候选', () => {
    const candidates = generateRelicCandidates()
    expect(candidates.length).toBeLessThanOrEqual(3)
    expect(candidates.length).toBeGreaterThan(0)
  })

  it('不返回已拥有遗物', () => {
    const allIds = getAllRelicIds()
    // 拥有前 3 个
    allIds.slice(0, 3).forEach(id => state.player.relics.add(id))
    const candidates = generateRelicCandidates()
    for (const c of candidates) {
      expect(state.player.relics.has(c)).toBe(false)
    }
  })

  it('bossDrop 只返回传说或史诗遗物', () => {
    const candidates = generateRelicCandidates(RELIC_WEIGHT_PRESETS.bossDrop)
    for (const c of candidates) {
      expect(['epic', 'legendary']).toContain(RELICS[c].rarity)
    }
  })

  it('common:0 不返回普通遗物', () => {
    const weights: RelicWeights = { common: 0, rare: 60, epic: 20, legendary: 40 }
    // 多次运行确保无 common
    for (let i = 0; i < 20; i++) {
      resetState()
      state.classId = 'wordsmith'
      const candidates = generateRelicCandidates(weights)
      for (const c of candidates) {
        expect(RELICS[c].rarity).not.toBe('common')
      }
    }
  })

  it('eliteDrop 权重不返回普通遗物', () => {
    for (let i = 0; i < 20; i++) {
      resetState()
      state.classId = 'wordsmith'
      const candidates = generateRelicCandidates(RELIC_WEIGHT_PRESETS.eliteDrop)
      for (const c of candidates) {
        expect(RELICS[c].rarity).not.toBe('common')
      }
    }
  })

  it('候选无重复', () => {
    const candidates = generateRelicCandidates()
    expect(new Set(candidates).size).toBe(candidates.length)
  })

  it('池不足时返回少于 3', () => {
    // 拥有全部遗物，仅留 1 个未拥有
    const allIds = getAllRelicIds()
    allIds.slice(1).forEach(id => state.player.relics.add(id))
    const candidates = generateRelicCandidates()
    expect(candidates.length).toBe(1)
  })

  it('全部拥有时返回空数组', () => {
    getAllRelicIds().forEach(id => state.player.relics.add(id))
    const candidates = generateRelicCandidates()
    expect(candidates.length).toBe(0)
  })

  it('无职业时职业专属遗物被过滤', () => {
    state.classId = 'none'
    const candidates = generateRelicCandidates()
    const exclusiveIds = [
      'apprentice_notes', 'masters_lexicon', 'perpetual_queue',
      'word_scissors', 'resonance_mold',
      'word_collection', 'thick_deck', 'long_word_crit',
      'short_sprint', 'long_word_master', 'word_dealer',
      'punctuation_liberation',
      'primal_mutant', 'ultimate_mutant_strain', 'gene_stabilizer',
      'chaos_seed', 'fittest_survivors',
      'enchant_dividend', 'enchant_boost', 'rune_spike',
      'apprentice_robe', 'trial_badge', 'fate_fork',
      'greedy_inscription',
    ]
    for (const c of candidates) {
      expect(exclusiveIds).not.toContain(c)
    }
  })
})

describe('hasUnownedRelics (Q2)', () => {
  beforeEach(() => {
    resetState()
  })

  it('初始状态有未拥有遗物', () => {
    expect(hasUnownedRelics()).toBe(true)
  })

  it('全部拥有后返回 false', () => {
    getAllRelicIds().forEach(id => state.player.relics.add(id))
    expect(hasUnownedRelics()).toBe(false)
  })
})
