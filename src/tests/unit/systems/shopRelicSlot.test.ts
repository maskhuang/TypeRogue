// ============================================
// 打字肉鸽 - 商店遗物槽位测试
// ============================================
// Q2: 商店遗物商品生成/购买

import { describe, it, expect, beforeEach } from 'vitest'
import { state, resetState, addRelicWithCapacity } from '../../../src/core/state'
import { RELICS, getAllRelicIds, MAX_RELIC_SLOTS } from '../../../src/data/relics'
import { generateShopRelicItem } from '../../../src/systems/shop'

describe('商店遗物槽位 (Q2)', () => {
  beforeEach(() => {
    resetState()
    // 所有遗物都是职业专属，需要设置职业才能生成遗物商品
    state.classId = 'wordsmith'
  })

  it('生成的遗物商品有 relicId 和 cost', () => {
    const item = generateShopRelicItem(1)
    if (item) {
      expect(item.type).toBe('relic')
      expect(item.relicId).toBeDefined()
      expect(typeof item.relicId).toBe('string')
      expect(RELICS[item.relicId!]).toBeDefined()
      expect(item.cost).toBeGreaterThanOrEqual(0)
    }
  })

  it('槽位满时不生成遗物', () => {
    // 填满遗物槽位
    const allIds = getAllRelicIds()
    for (let i = 0; i < allIds.length; i++) {
      state.player.relics.add(allIds[i])
    }
    // 若实际遗物不够填满槽位，用占位 ID 补齐
    let idx = 0
    while (state.player.relics.size < MAX_RELIC_SLOTS) {
      state.player.relics.add(`test_relic_${idx++}`)
    }
    expect(state.player.relics.size).toBe(MAX_RELIC_SLOTS)
    const item = generateShopRelicItem(1)
    expect(item).toBeNull()
  })

  it('全部拥有时不生成遗物', () => {
    // 即使槽位未满，但所有遗物都已拥有
    getAllRelicIds().forEach(id => state.player.relics.add(id))
    const item = generateShopRelicItem(1)
    expect(item).toBeNull()
  })

  it('遗物商品不会是已拥有的遗物', () => {
    const allIds = getAllRelicIds()
    // 拥有前 5 个（不满 10 槽位）
    allIds.slice(0, 5).forEach(id => state.player.relics.add(id))
    for (let i = 0; i < 20; i++) {
      const item = generateShopRelicItem(1)
      if (item) {
        expect(state.player.relics.has(item.relicId!)).toBe(false)
      }
    }
  })

  it('不同 Act 都能生成遗物商品', () => {
    for (const act of [1, 2, 3]) {
      resetState()
      state.classId = 'wordsmith'
      const item = generateShopRelicItem(act)
      // 至少有未拥有遗物，应该能生成
      expect(item).not.toBeNull()
      expect(item!.type).toBe('relic')
    }
  })
})
