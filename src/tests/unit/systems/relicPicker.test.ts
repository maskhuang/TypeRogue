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
  })

  it('返回至多 3 个候选', () => {
    const candidates = generateRelicCandidates()
    expect(candidates.length).toBeLessThanOrEqual(3)
    expect(candidates.length).toBeGreaterThan(0)
  })

  it('不返回已拥有遗物', () => {
    const allIds = getAllRelicIds()
    // 拥有前 5 个
    allIds.slice(0, 5).forEach(id => state.player.relics.add(id))
    const candidates = generateRelicCandidates()
    for (const c of candidates) {
      expect(state.player.relics.has(c)).toBe(false)
    }
  })

  it('legendary:100 只返回传说遗物', () => {
    const candidates = generateRelicCandidates(RELIC_WEIGHT_PRESETS.bossDrop)
    for (const c of candidates) {
      expect(RELICS[c].rarity).toBe('legendary')
    }
  })

  it('common:0 不返回普通遗物', () => {
    const weights: RelicWeights = { common: 0, rare: 60, legendary: 40 }
    // 多次运行确保无 common
    for (let i = 0; i < 20; i++) {
      resetState()
      const candidates = generateRelicCandidates(weights)
      for (const c of candidates) {
        expect(RELICS[c].rarity).not.toBe('common')
      }
    }
  })

  it('eliteDrop 权重不返回普通遗物', () => {
    for (let i = 0; i < 20; i++) {
      resetState()
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
    const allIds = getAllRelicIds()
    // 拥有除 1 个以外的所有遗物
    allIds.slice(1).forEach(id => state.player.relics.add(id))
    const candidates = generateRelicCandidates()
    expect(candidates.length).toBe(1)
    expect(candidates[0]).toBe(allIds[0])
  })

  it('全部拥有时返回空数组', () => {
    getAllRelicIds().forEach(id => state.player.relics.add(id))
    const candidates = generateRelicCandidates()
    expect(candidates.length).toBe(0)
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
