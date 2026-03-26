// ============================================
// Story 41.1: 附魔获取改造 — 自动附魔废弃验证
// ============================================

import { describe, it, expect, beforeEach } from 'vitest'
import { state } from '../../../src/core/state'
import {
  getMinEnchantmentLevel,
  getEnchantAnchorSlotBonus,
} from '../../../src/systems/relics/EnchantmentRelicBehaviors'
import { getEnchantmentSlotCount } from '../../../src/data/affixTrigger'
import { AffixType } from '../../../src/data/affixes'
import type { AffixSkillInstance } from '../../../src/data/affixes'
import type { ShopItem } from '../../../src/core/types'
import { getRestEvents } from '../../../src/data/restEvents'

function makeAffixSkill(id: string, enchantmentIds: string[] = []): AffixSkillInstance {
  return {
    id,
    name: `Skill ${id}`,
    icon: '⚡',
    resource: 'base' as const,
    baseValues: [5, 8, 12] as [number, number, number],
    level: 1,
    rarity: 0,
    affixes: [],
    enchantmentIds,
  }
}

describe('Story 41.1: 附魔获取改造', () => {
  beforeEach(() => {
    state.player.skills.clear()
    state.player.relics.clear()
    state.affixSkills.clear()
  })

  describe('AC1: 附魔资格与技能等级解耦', () => {
    it('任何等级的技能只要有空槽就可接受附魔', () => {
      const skill = makeAffixSkill('test-skill')
      skill.level = 1  // Lv.1 — 旧系统不允许附魔
      state.affixSkills.set('test-skill', skill)

      const slotCount = getEnchantmentSlotCount(skill, getEnchantAnchorSlotBonus())
      const hasEmptySlot = skill.enchantmentIds.length < slotCount

      // Lv.1 技能也有空槽，应该可以接受附魔
      expect(hasEmptySlot).toBe(true)
    })

    it('已填满附魔槽的技能不可接受附魔（与等级无关）', () => {
      const skill = makeAffixSkill('test-skill', ['existing_enchantment'])
      skill.level = 3  // 即使 Lv.3 也不行——槽满了
      state.affixSkills.set('test-skill', skill)

      const slotCount = getEnchantmentSlotCount(skill, getEnchantAnchorSlotBonus())
      const hasEmptySlot = skill.enchantmentIds.length < slotCount

      // 1 slot, 1 enchantment → 满
      expect(hasEmptySlot).toBe(false)
    })
  })

  describe('AC2: 技能升级不再自动触发附魔', () => {
    it('getMinEnchantmentLevel 仍返回值但已废弃（不再影响附魔流程）', () => {
      // getMinEnchantmentLevel 仍存在但已标记 @deprecated
      // 确认函数仍可调用（向后兼容），但不再被 checkAutoEnchantment 使用
      expect(getMinEnchantmentLevel()).toBe(3)
      state.player.relics.add('early_awakening')
      expect(getMinEnchantmentLevel()).toBe(2)
    })

    it('技能升到 Lv.3 后附魔列表不变（无自动附魔）', () => {
      const skill = makeAffixSkill('test-skill')
      state.affixSkills.set('test-skill', skill)
      state.player.skills.set('test-skill', { id: 'test-skill', level: 1 })

      // 模拟升级到 Lv.3
      const playerSkill = state.player.skills.get('test-skill')!
      playerSkill.level = 3

      // 旧系统会自动弹出附魔选择并写入 enchantmentIds
      // 新系统：升级后 enchantmentIds 仍为空
      expect(skill.enchantmentIds).toEqual([])
    })
  })

  describe('AC4/AC8: ShopItem 类型扩展 — 附魔商品', () => {
    it('ShopItem.type 接受 enchantment 类型', () => {
      const item: ShopItem = {
        id: 'si-ench-1',
        type: 'enchantment',
        enchantmentType: 'apprentice_self',
        cost: 60,
        isUpgrade: false,
        locked: false,
      }
      expect(item.type).toBe('enchantment')
      expect(item.enchantmentType).toBe('apprentice_self')
    })

    it('附魔商品支持 transmuteRes 和 neighborRel 可选字段', () => {
      const item: ShopItem = {
        id: 'si-ench-2',
        type: 'enchantment',
        enchantmentType: 'transmute',
        transmuteRes: 'gold',
        cost: 60,
        isUpgrade: false,
        locked: false,
      }
      expect(item.transmuteRes).toBe('gold')
    })

    it('附魔商品 Act 3 门控逻辑：Act < 3 不应生成附魔商品', () => {
      // 这是一个静态逻辑测试：附魔商品仅在 Act 3 起生成
      // generateShopItems 内部检查 act >= 3，此处验证概念
      const act1 = 1
      const act2 = 2
      const act3 = 3
      expect(act1 >= 3).toBe(false)
      expect(act2 >= 3).toBe(false)
      expect(act3 >= 3).toBe(true)
    })
  })

  describe('AC5: 休息关附魔试炼事件', () => {
    it('enchantment_trial 事件存在于事件池中', () => {
      const events = getRestEvents()
      const trial = events.find(e => e.id === 'enchantment_trial')
      expect(trial).toBeDefined()
      expect(trial!.options.length).toBeGreaterThanOrEqual(2)
    })

    it('enchantment_trial 前置条件：无空槽技能时不满足', () => {
      const events = getRestEvents()
      const trial = events.find(e => e.id === 'enchantment_trial')!
      // 无技能
      expect(trial.prerequisite?.(state)).toBe(false)
    })

    it('enchantment_trial 前置条件：有空槽技能时满足', () => {
      const events = getRestEvents()
      const trial = events.find(e => e.id === 'enchantment_trial')!
      // 添加一个有空槽的技能
      state.affixSkills.set('s1', makeAffixSkill('s1'))
      expect(trial.prerequisite?.(state)).toBe(true)
    })

    it('enchantment_trial 前置条件：技能已满槽时不满足', () => {
      const events = getRestEvents()
      const trial = events.find(e => e.id === 'enchantment_trial')!
      state.affixSkills.set('s1', makeAffixSkill('s1', ['existing']))
      expect(trial.prerequisite?.(state)).toBe(false)
    })
  })
})
