// ============================================
// 打字肉鸽 - 附魔系统遗物行为测试 (Story 36.5)
// ============================================

import { describe, it, expect, beforeEach } from 'vitest'
import { state } from '../../../../src/core/state'
import {
  getApprenticeGrowthMultiplier,
  getQuestStackIncrement,
  getEnchantmentChoiceCount,
  getMinEnchantmentLevel,
  getEnchantAnchorSlotBonus,
  getEnchantAnchorPriceMultiplier,
  resetEnchantmentRelicState,
  initEnchantmentRelicBehaviors,
} from '../../../../src/systems/relics/EnchantmentRelicBehaviors'
import { clearBehaviorHandlers, getRegisteredBehaviors } from '../../../../src/systems/relics/RelicPipeline'
import { shouldBlockEnchantment } from '../../../../src/systems/relics/SkillRelicBehaviors'
import { getEnchantmentSlotCount } from '../../../../src/data/affixTrigger'
import { AffixType } from '../../../../src/data/affixes'

// === 辅助：清理遗物 + 状态 ===
function clearRelics(): void {
  state.player.relics.clear()
  state.player.relicStates = {}
}

function setupAffixSkill(skillId: string, enchantmentIds: string[] = []): void {
  state.affixSkills.set(skillId, {
    id: skillId,
    name: `Skill ${skillId}`,
    icon: '⚡',
    resource: 'base' as const,
    baseValues: [5, 8, 12] as [number, number, number],
    level: 1,
    rarity: 0,
    affixes: [],
    enchantmentIds,
  })
}

describe('附魔系统遗物行为 (Story 36.5)', () => {
  beforeEach(() => {
    clearRelics()
    clearBehaviorHandlers()
    state.player.skills.clear()
    state.affixSkills.clear()
  })

  // =====================
  // AC1: 学徒之袍
  // =====================
  describe('学徒之袍 (apprentice_robe)', () => {
    it('未持有 → 返回 1', () => {
      expect(getApprenticeGrowthMultiplier()).toBe(1)
    })

    it('持有 → 返回 1.3', () => {
      state.player.relics.add('apprentice_robe')
      expect(getApprenticeGrowthMultiplier()).toBe(1.3)
    })
  })

  // =====================
  // AC2: 试炼徽章
  // =====================
  describe('试炼徽章 (trial_badge)', () => {
    it('未持有 → 返回 1', () => {
      expect(getQuestStackIncrement()).toBe(1)
    })

    it('持有 → 返回 1.3', () => {
      state.player.relics.add('trial_badge')
      expect(getQuestStackIncrement()).toBe(1.3)
    })
  })

  // =====================
  // AC3: 命运三岔
  // =====================
  describe('命运三岔 (fate_fork)', () => {
    it('未持有 → 返回 2', () => {
      expect(getEnchantmentChoiceCount()).toBe(2)
    })

    it('持有 → 返回 3', () => {
      state.player.relics.add('fate_fork')
      expect(getEnchantmentChoiceCount()).toBe(3)
    })
  })

  // =====================
  // AC4: 早期觉醒
  // =====================
  describe('早期觉醒 (early_awakening)', () => {
    it('未持有 → 返回 3', () => {
      expect(getMinEnchantmentLevel()).toBe(3)
    })

    it('持有 → 返回 2', () => {
      state.player.relics.add('early_awakening')
      expect(getMinEnchantmentLevel()).toBe(2)
    })
  })

  // =====================
  // AC5: 附魔锚点 - 槽位
  // =====================
  describe('附魔锚点 - 槽位 (enchant_anchor)', () => {
    it('未持有 → slotBonus 0', () => {
      expect(getEnchantAnchorSlotBonus()).toBe(0)
    })

    it('持有 → slotBonus 1', () => {
      state.player.relics.add('enchant_anchor')
      expect(getEnchantAnchorSlotBonus()).toBe(1)
    })
  })

  // =====================
  // AC5: 附魔锚点 - getEnchantmentSlotCount 集成
  // =====================
  describe('附魔锚点 - getEnchantmentSlotCount 集成', () => {
    const makeSkill = (hasTwin: boolean) => ({
      id: 'test',
      name: 'Test',
      icon: '⚡',
      resource: 'base' as const,
      baseValues: [5, 8, 12] as [number, number, number],
      level: 1,
      rarity: 0,
      affixes: hasTwin ? [{ type: AffixType.Twin, value: 0 }] : [],
      enchantmentIds: [],
    })

    it('无 Twin + 无锚点 → 1 槽', () => {
      expect(getEnchantmentSlotCount(makeSkill(false))).toBe(1)
    })

    it('有 Twin + 无锚点 → 2 槽', () => {
      expect(getEnchantmentSlotCount(makeSkill(true))).toBe(2)
    })

    it('无 Twin + 锚点 bonus=1 → 2 槽', () => {
      expect(getEnchantmentSlotCount(makeSkill(false), 1)).toBe(2)
    })

    it('有 Twin + 锚点 bonus=1 → 3 槽', () => {
      expect(getEnchantmentSlotCount(makeSkill(true), 1)).toBe(3)
    })
  })

  // =====================
  // AC5 + AC6: 附魔锚点 - 价格
  // =====================
  describe('附魔锚点 - 价格乘数 (enchant_anchor)', () => {
    it('未持有 → 返回 1', () => {
      expect(getEnchantAnchorPriceMultiplier()).toBe(1)
    })

    it('持有 + 0 个附魔 → 返回 1 (0% 增加)', () => {
      state.player.relics.add('enchant_anchor')
      setupAffixSkill('s1', [])
      setupAffixSkill('s2', [])
      expect(getEnchantAnchorPriceMultiplier()).toBe(1)
    })

    it('持有 + 1 个附魔 → 返回 1.1 (10% 增加)', () => {
      state.player.relics.add('enchant_anchor')
      setupAffixSkill('s1', ['quest_chain'])
      setupAffixSkill('s2', [])
      expect(getEnchantAnchorPriceMultiplier()).toBeCloseTo(1.1)
    })

    it('持有 + 5 个附魔 → 返回 1.5 (50% 增加)', () => {
      state.player.relics.add('enchant_anchor')
      setupAffixSkill('s1', ['quest_chain', 'apprentice_speed'])
      setupAffixSkill('s2', ['quest_devour'])
      setupAffixSkill('s3', ['transmute', 'apprentice_perfect'])
      expect(getEnchantAnchorPriceMultiplier()).toBeCloseTo(1.5)
    })

    it('持有 + 10 个附魔 → 返回 2.0 (100% 增加)', () => {
      state.player.relics.add('enchant_anchor')
      // 5 skills × 2 enchantments each = 10
      for (let i = 0; i < 5; i++) {
        setupAffixSkill(`s${i}`, [`ench_a_${i}`, `ench_b_${i}`])
      }
      expect(getEnchantAnchorPriceMultiplier()).toBeCloseTo(2.0)
    })
  })

  // =====================
  // 关级别重置
  // =====================
  describe('resetEnchantmentRelicState', () => {
    it('调用不报错（当前为 no-op）', () => {
      expect(() => resetEnchantmentRelicState()).not.toThrow()
    })
  })

  // =====================
  // 行为注册
  // =====================
  describe('initEnchantmentRelicBehaviors', () => {
    it('注册 fate_fork、early_awakening 行为', () => {
      initEnchantmentRelicBehaviors()
      const registered = getRegisteredBehaviors()
      expect(registered).toContain('fate_fork')
      expect(registered).toContain('early_awakening')
    })
  })

  // =====================
  // 交互测试
  // =====================
  describe('遗物交互', () => {
    it('AC7: early_awakening + uncrowned_king — UK 阻止附魔优先于 EA', () => {
      state.player.relics.add('early_awakening')
      state.player.relics.add('uncrowned_king')
      // EA 让 Lv2 可附魔，但 UK 阻止无附魔技能的附魔
      expect(getMinEnchantmentLevel()).toBe(2)
      expect(shouldBlockEnchantment([])).toBe(true) // UK 阻止
      expect(shouldBlockEnchantment(['some_ench'])).toBe(false) // 有附魔的不阻止
    })

    it('AC8: enchant_anchor + uncrowned_king — UK 无附魔技能 slot+1 无效', () => {
      state.player.relics.add('enchant_anchor')
      state.player.relics.add('uncrowned_king')
      // enchant_anchor 提供 +1 slot，但 UK 阻止无附魔技能获得附魔
      // 所以对于无附魔技能，slot+1 实际无效（因为 shouldBlockEnchantment 先拦截）
      expect(getEnchantAnchorSlotBonus()).toBe(1)
      expect(shouldBlockEnchantment([])).toBe(true) // UK 先拦截
    })
  })
})
