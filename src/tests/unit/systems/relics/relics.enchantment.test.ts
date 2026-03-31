// ============================================
// 打字肉鸽 - 附魔系统遗物行为测试 (Story 36.5)
// ============================================

import { describe, it, expect, beforeEach } from 'vitest'
import { state } from '../../../../src/core/state'
import {
  getApprenticeGrowthMultiplier,
  getQuestEquipReduction,
  getEnchantmentChoiceCount,
  getMinEnchantmentLevel,
  getEnchantAnchorSlotBonus,
  getEnchantAnchorPriceMultiplier,
  getEnchantDividendGold,
  getEnchantBoostBonus,
  isEnchantGuaranteed,
  getGreedyInscriptionTargetMult,
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
  // 附魔红利 (enchant_dividend)
  // =====================
  describe('附魔红利 (enchant_dividend)', () => {
    it('未持有 → 返回 0', () => {
      expect(getEnchantDividendGold(true)).toBe(0)
      expect(getEnchantDividendGold(false)).toBe(0)
    })

    it('持有 + 有附魔 → 返回 2', () => {
      state.player.relics.add('enchant_dividend')
      expect(getEnchantDividendGold(true)).toBe(2)
    })

    it('持有 + 无附魔 → 返回 0', () => {
      state.player.relics.add('enchant_dividend')
      expect(getEnchantDividendGold(false)).toBe(0)
    })
  })

  // =====================
  // 附魔增幅 (enchant_boost)
  // =====================
  describe('附魔增幅 (enchant_boost)', () => {
    it('未持有 → 返回 0', () => {
      expect(getEnchantBoostBonus(true)).toBe(0)
      expect(getEnchantBoostBonus(false)).toBe(0)
    })

    it('持有 + 有附魔 → 返回 0.15', () => {
      state.player.relics.add('enchant_boost')
      expect(getEnchantBoostBonus(true)).toBe(0.15)
    })

    it('持有 + 无附魔 → 返回 0', () => {
      state.player.relics.add('enchant_boost')
      expect(getEnchantBoostBonus(false)).toBe(0)
    })
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
    it('未持有 → 返回 0', () => {
      expect(getQuestEquipReduction()).toBe(0)
    })

    it('持有 → 返回 1', () => {
      state.player.relics.add('trial_badge')
      expect(getQuestEquipReduction()).toBe(1)
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
  // 附魔等级门槛
  // =====================
  describe('附魔等级门槛 (getMinEnchantmentLevel)', () => {
    it('统一返回 3', () => {
      expect(getMinEnchantmentLevel()).toBe(3)
      expect(getMinEnchantmentLevel(0)).toBe(3)
      expect(getMinEnchantmentLevel(1)).toBe(3)
      expect(getMinEnchantmentLevel(2)).toBe(3)
      expect(getMinEnchantmentLevel(3)).toBe(3)
    })
  })

  // =====================
  // 已删除遗物存根
  // =====================
  describe('已删除遗物存根', () => {
    it('getEnchantAnchorSlotBonus 始终返回 0', () => {
      expect(getEnchantAnchorSlotBonus()).toBe(0)
      state.player.relics.add('enchant_anchor')
      expect(getEnchantAnchorSlotBonus()).toBe(0)
    })

    it('getEnchantAnchorPriceMultiplier 始终返回 1', () => {
      expect(getEnchantAnchorPriceMultiplier()).toBe(1)
      state.player.relics.add('enchant_anchor')
      expect(getEnchantAnchorPriceMultiplier()).toBe(1)
    })
  })

  // =====================
  // getEnchantmentSlotCount 集成
  // =====================
  describe('getEnchantmentSlotCount 集成', () => {
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

    it('无 Twin → 1 槽', () => {
      expect(getEnchantmentSlotCount(makeSkill(false))).toBe(1)
    })

    it('有 Twin → 2 槽', () => {
      expect(getEnchantmentSlotCount(makeSkill(true))).toBe(2)
    })

    it('无 Twin + bonus=1 → 2 槽', () => {
      expect(getEnchantmentSlotCount(makeSkill(false), 1)).toBe(2)
    })

    it('有 Twin + bonus=1 → 3 槽', () => {
      expect(getEnchantmentSlotCount(makeSkill(true), 1)).toBe(3)
    })
  })

  // =====================
  // 贪婪铭刻 (greedy_inscription)
  // =====================
  describe('贪婪铭刻 (greedy_inscription)', () => {
    it('未持有 → isEnchantGuaranteed 返回 false', () => {
      expect(isEnchantGuaranteed()).toBe(false)
    })

    it('持有 → isEnchantGuaranteed 返回 true', () => {
      state.player.relics.add('greedy_inscription')
      expect(isEnchantGuaranteed()).toBe(true)
    })

    it('未持有 → 目标倍率 1', () => {
      expect(getGreedyInscriptionTargetMult()).toBe(1)
    })

    it('持有 + 0 附魔 → 目标倍率 1', () => {
      state.player.relics.add('greedy_inscription')
      setupAffixSkill('s1', [])
      expect(getGreedyInscriptionTargetMult()).toBe(1)
    })

    it('持有 + 1 附魔 → 目标倍率 2', () => {
      state.player.relics.add('greedy_inscription')
      setupAffixSkill('s1', ['ench_a'])
      expect(getGreedyInscriptionTargetMult()).toBe(2)
    })

    it('持有 + 3 附魔 → 目标倍率 8', () => {
      state.player.relics.add('greedy_inscription')
      setupAffixSkill('s1', ['ench_a', 'ench_b'])
      setupAffixSkill('s2', ['ench_c'])
      expect(getGreedyInscriptionTargetMult()).toBe(8)
    })

    it('持有 + 5 附魔 → 目标倍率 32', () => {
      state.player.relics.add('greedy_inscription')
      setupAffixSkill('s1', ['a', 'b'])
      setupAffixSkill('s2', ['c', 'd'])
      setupAffixSkill('s3', ['e'])
      expect(getGreedyInscriptionTargetMult()).toBe(32)
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
    it('注册 fate_fork 行为', () => {
      initEnchantmentRelicBehaviors()
      const registered = getRegisteredBehaviors()
      expect(registered).toContain('fate_fork')
    })
  })
})
