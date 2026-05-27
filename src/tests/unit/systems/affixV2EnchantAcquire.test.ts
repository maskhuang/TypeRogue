// ============================================
// 打字肉鸽 - Lv.3 附魔触发迁移 · 局内升级跨越门槛入队
// ============================================
// 覆盖：notePotentialLv3Enchant 只在"跨越 Lv.3"那一次入队（避免丢失 + 避免重复）·
//       takePendingV2EnchantSkillIds 取出即清 · clearAllEquipped（切 run）清空队列。

import { describe, it, expect, beforeEach } from 'vitest'
import {
  notePotentialLv3Enchant,
  takePendingV2EnchantSkillIds,
  clearAllEquipped,
} from '../../../src/systems/affixV2Equipped'
import { getMinEnchantmentLevel } from '../../../src/systems/relics/EnchantmentRelicBehaviors'

beforeEach(() => {
  clearAllEquipped()
})

describe('Lv.3 附魔触发门槛', () => {
  it('门槛统一 Lv.3', () => {
    expect(getMinEnchantmentLevel()).toBe(3)
  })
})

describe('局内升级跨越 Lv.3 → 入队（避免丢失）', () => {
  it('2→3 跨越门槛 → 入队', () => {
    notePotentialLv3Enchant('s1', 2, 3)
    expect(takePendingV2EnchantSkillIds()).toEqual(['s1'])
  })

  it('1→2 未达门槛 → 不入队', () => {
    notePotentialLv3Enchant('s1', 1, 2)
    expect(takePendingV2EnchantSkillIds()).toEqual([])
  })

  it('3→4 已过门槛 → 不入队（避免重复触发）', () => {
    notePotentialLv3Enchant('s1', 3, 4)
    expect(takePendingV2EnchantSkillIds()).toEqual([])
  })

  it('1→5 一次跨多级 → 只入队一次', () => {
    notePotentialLv3Enchant('s1', 1, 5)
    expect(takePendingV2EnchantSkillIds()).toEqual(['s1'])
  })

  it('同技能重复登记 → 去重', () => {
    notePotentialLv3Enchant('s1', 2, 3)
    notePotentialLv3Enchant('s1', 2, 3)
    expect(takePendingV2EnchantSkillIds()).toEqual(['s1'])
  })
})

describe('队列生命周期', () => {
  it('take 取出后清空', () => {
    notePotentialLv3Enchant('s1', 2, 3)
    takePendingV2EnchantSkillIds()
    expect(takePendingV2EnchantSkillIds()).toEqual([])
  })

  it('clearAllEquipped（切 run）清空队列', () => {
    notePotentialLv3Enchant('s1', 2, 3)
    clearAllEquipped()
    expect(takePendingV2EnchantSkillIds()).toEqual([])
  })
})
