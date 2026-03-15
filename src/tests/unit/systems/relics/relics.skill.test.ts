// ============================================
// 打字肉鸽 - 技能系统遗物行为测试 (Story 36.4)
// ============================================

import { describe, it, expect, beforeEach } from 'vitest'
import { state, synergy } from '../../../../src/core/state'
import {
  getFirstStrikeBonus,
  getLessIsMoreBonus,
  applyTrainingManual,
  trackWordAffixTypes,
  getWordAffixTypeCount,
  resetWordAffixTypes,
  checkJazzBonus,
  hasUncrownedKing,
  getUncrownedKingBaseValue,
  shouldBlockEnchantment,
  resetSkillRelicState,
  initSkillRelicBehaviors,
} from '../../../../src/systems/relics/SkillRelicBehaviors'
import { clearBehaviorHandlers, getRegisteredBehaviors } from '../../../../src/systems/relics/RelicPipeline'
import { AffixType } from '../../../../src/data/affixes'

// === 辅助：清理遗物 + 状态 ===
function clearRelics(): void {
  state.player.relics.clear()
  state.player.relicStates = {}
}

function setupSkill(skillId: string, level: number, enchantmentIds: string[] = []): void {
  state.player.skills.set(skillId, { level, purchasePrice: 50 })
  state.affixSkills.set(skillId, {
    id: skillId,
    name: `Skill ${skillId}`,
    icon: '⚡',
    resource: 'base' as const,
    baseValues: [5, 8, 12] as [number, number, number],
    level,
    rarity: 0,
    affixes: [],
    enchantmentIds,
  })
}

describe('技能系统遗物行为 (Story 36.4)', () => {
  beforeEach(() => {
    clearRelics()
    clearBehaviorHandlers()
    synergy.wordSkillCount = 0
    state.player.skills.clear()
    state.affixSkills.clear()
    resetWordAffixTypes()
  })

  // =====================
  // AC1: 首发强化
  // =====================
  describe('首发强化 (first_strike)', () => {
    it('未持有 → 返回 0', () => {
      synergy.wordSkillCount = 1
      expect(getFirstStrikeBonus()).toBe(0)
    })

    it('持有且 wordSkillCount=1 → 返回 0.2', () => {
      state.player.relics.add('first_strike')
      synergy.wordSkillCount = 1
      expect(getFirstStrikeBonus()).toBe(0.2)
    })

    it('持有且 wordSkillCount=2 → 返回 0（非首个）', () => {
      state.player.relics.add('first_strike')
      synergy.wordSkillCount = 2
      expect(getFirstStrikeBonus()).toBe(0)
    })

    it('持有且 wordSkillCount=0 → 返回 0（未触发）', () => {
      state.player.relics.add('first_strike')
      synergy.wordSkillCount = 0
      expect(getFirstStrikeBonus()).toBe(0)
    })

    it('持有且 wordSkillCount=10 → 返回 0', () => {
      state.player.relics.add('first_strike')
      synergy.wordSkillCount = 10
      expect(getFirstStrikeBonus()).toBe(0)
    })
  })

  // =====================
  // AC2: 少而精
  // =====================
  describe('少而精 (less_is_more)', () => {
    it('未持有 → 返回 0', () => {
      expect(getLessIsMoreBonus()).toBe(0)
    })

    it('持有且 skills.size=9 → 返回 0.2', () => {
      state.player.relics.add('less_is_more')
      for (let i = 0; i < 9; i++) state.player.skills.set(`s${i}`, { level: 1 })
      expect(getLessIsMoreBonus()).toBe(0.2)
    })

    it('持有且 skills.size=10 → 返回 0（不满足 <10）', () => {
      state.player.relics.add('less_is_more')
      for (let i = 0; i < 10; i++) state.player.skills.set(`s${i}`, { level: 1 })
      expect(getLessIsMoreBonus()).toBe(0)
    })

    it('持有且 skills.size=0 → 返回 0.2', () => {
      state.player.relics.add('less_is_more')
      expect(getLessIsMoreBonus()).toBe(0.2)
    })

    it('持有且 skills.size=1 → 返回 0.2', () => {
      state.player.relics.add('less_is_more')
      state.player.skills.set('s1', { level: 1 })
      expect(getLessIsMoreBonus()).toBe(0.2)
    })

    it('持有且 skills.size=15 → 返回 0', () => {
      state.player.relics.add('less_is_more')
      for (let i = 0; i < 15; i++) state.player.skills.set(`s${i}`, { level: 1 })
      expect(getLessIsMoreBonus()).toBe(0)
    })
  })

  // =====================
  // AC3 + AC6: 集训手册
  // =====================
  describe('集训手册 (training_manual)', () => {
    it('全部 Lv.1 → 全部升至 Lv.2', () => {
      setupSkill('s1', 1)
      setupSkill('s2', 1)
      setupSkill('s3', 1)
      const ids = applyTrainingManual()
      expect(ids.length).toBe(3)
      expect(state.player.skills.get('s1')?.level).toBe(2)
      expect(state.player.skills.get('s2')?.level).toBe(2)
      expect(state.player.skills.get('s3')?.level).toBe(2)
      expect(state.affixSkills.get('s1')?.level).toBe(2)
      expect(state.affixSkills.get('s2')?.level).toBe(2)
      expect(state.affixSkills.get('s3')?.level).toBe(2)
    })

    it('Lv.2 不变', () => {
      setupSkill('s1', 2)
      const ids = applyTrainingManual()
      expect(ids.length).toBe(0)
      expect(state.player.skills.get('s1')?.level).toBe(2)
    })

    it('Lv.3 不变', () => {
      setupSkill('s1', 3)
      const ids = applyTrainingManual()
      expect(ids.length).toBe(0)
      expect(state.player.skills.get('s1')?.level).toBe(3)
    })

    it('混合场景：Lv.1 升级，Lv.2/3 不变', () => {
      setupSkill('s1', 1)
      setupSkill('s2', 2)
      setupSkill('s3', 3)
      const ids = applyTrainingManual()
      expect(ids.length).toBe(1)
      expect(state.player.skills.get('s1')?.level).toBe(2)
      expect(state.player.skills.get('s2')?.level).toBe(2)
      expect(state.player.skills.get('s3')?.level).toBe(3)
    })

    it('空技能集 → 返回空数组', () => {
      const ids = applyTrainingManual()
      expect(ids.length).toBe(0)
    })

    it('AC6: 获取后新技能不自动升级', () => {
      setupSkill('s1', 1)
      applyTrainingManual()
      expect(state.player.skills.get('s1')?.level).toBe(2)
      // 新获得 Lv.1 技能
      setupSkill('s2', 1)
      // 不会自动升级
      expect(state.player.skills.get('s2')?.level).toBe(1)
    })
  })

  // =====================
  // AC4: 爵士乐
  // =====================
  describe('爵士乐 (jazz)', () => {
    beforeEach(() => {
      state.player.relics.add('jazz')
    })

    it('未持有 → trackWordAffixTypes 不追踪', () => {
      state.player.relics.delete('jazz')
      trackWordAffixTypes([{ type: AffixType.Multiply }, { type: AffixType.Crit }])
      expect(getWordAffixTypeCount()).toBe(0) // 不追踪
    })

    it('未持有 → checkJazzBonus 返回 0', () => {
      state.player.relics.delete('jazz')
      expect(checkJazzBonus()).toBe(0)
    })

    it('3 种词条类型 → 返回 0.3', () => {
      trackWordAffixTypes([{ type: AffixType.Multiply }])
      trackWordAffixTypes([{ type: AffixType.Crit }])
      trackWordAffixTypes([{ type: AffixType.Void }])
      expect(getWordAffixTypeCount()).toBe(3)
      expect(checkJazzBonus()).toBeCloseTo(0.3)
    })

    it('4 种词条类型 → 返回 0.4', () => {
      trackWordAffixTypes([{ type: AffixType.Multiply }])
      trackWordAffixTypes([{ type: AffixType.Crit }])
      trackWordAffixTypes([{ type: AffixType.Void }])
      trackWordAffixTypes([{ type: AffixType.Charge }])
      expect(checkJazzBonus()).toBeCloseTo(0.4)
    })

    it('2 种词条类型 → 返回 0', () => {
      trackWordAffixTypes([{ type: AffixType.Multiply }])
      trackWordAffixTypes([{ type: AffixType.Crit }])
      expect(checkJazzBonus()).toBe(0)
    })

    it('1 种词条类型 → 返回 0', () => {
      trackWordAffixTypes([{ type: AffixType.Multiply }])
      expect(checkJazzBonus()).toBe(0)
    })

    it('同一类型重复不计', () => {
      trackWordAffixTypes([{ type: AffixType.Multiply }])
      trackWordAffixTypes([{ type: AffixType.Multiply }])
      trackWordAffixTypes([{ type: AffixType.Multiply }])
      expect(getWordAffixTypeCount()).toBe(1)
      expect(checkJazzBonus()).toBe(0)
    })

    it('跨词重置', () => {
      trackWordAffixTypes([{ type: AffixType.Multiply }])
      trackWordAffixTypes([{ type: AffixType.Crit }])
      trackWordAffixTypes([{ type: AffixType.Void }])
      expect(getWordAffixTypeCount()).toBe(3)
      resetWordAffixTypes()
      expect(getWordAffixTypeCount()).toBe(0)
      expect(checkJazzBonus()).toBe(0)
    })

    it('一个技能多个词条 — 一次追踪', () => {
      trackWordAffixTypes([
        { type: AffixType.Multiply },
        { type: AffixType.Crit },
        { type: AffixType.Void },
      ])
      expect(getWordAffixTypeCount()).toBe(3)
      expect(checkJazzBonus()).toBeCloseTo(0.3)
    })
  })

  // =====================
  // AC5 + AC7: 无冕之王
  // =====================
  describe('无冕之王 (uncrowned_king)', () => {
    it('未持有 → hasUncrownedKing false', () => {
      expect(hasUncrownedKing()).toBe(false)
    })

    it('持有 → hasUncrownedKing true', () => {
      state.player.relics.add('uncrowned_king')
      expect(hasUncrownedKing()).toBe(true)
    })

    it('未持有 → shouldBlockEnchantment 返回 false', () => {
      expect(shouldBlockEnchantment([])).toBe(false)
    })

    it('持有 + 无附魔 → shouldBlockEnchantment 返回 true', () => {
      state.player.relics.add('uncrowned_king')
      expect(shouldBlockEnchantment([])).toBe(true)
    })

    it('持有 + 有附魔 → shouldBlockEnchantment 返回 false', () => {
      state.player.relics.add('uncrowned_king')
      expect(shouldBlockEnchantment(['some_enchant'])).toBe(false)
    })
  })

  // =====================
  // AC5: 无冕之王 baseValue
  // =====================
  describe('无冕之王 baseValue 计算', () => {
    const baseValues: [number, number, number] = [5, 8, 12]

    it('Lv1 → baseValues[0]', () => {
      expect(getUncrownedKingBaseValue(1, baseValues)).toBe(5)
    })

    it('Lv2 → baseValues[1]', () => {
      expect(getUncrownedKingBaseValue(2, baseValues)).toBe(8)
    })

    it('Lv3 → baseValues[2]', () => {
      expect(getUncrownedKingBaseValue(3, baseValues)).toBe(12)
    })

    it('Lv4 → Lv3 × 1.6', () => {
      expect(getUncrownedKingBaseValue(4, baseValues)).toBeCloseTo(12 * 1.6)
    })

    it('Lv5 → Lv3 × 1.6²', () => {
      expect(getUncrownedKingBaseValue(5, baseValues)).toBeCloseTo(12 * 1.6 * 1.6)
    })

    it('Lv6 → Lv3 × 1.6³', () => {
      expect(getUncrownedKingBaseValue(6, baseValues)).toBeCloseTo(12 * Math.pow(1.6, 3))
    })

    it('Lv10 → Lv3 × 1.6⁷', () => {
      expect(getUncrownedKingBaseValue(10, baseValues)).toBeCloseTo(12 * Math.pow(1.6, 7))
    })
  })

  // =====================
  // 关级别重置
  // =====================
  describe('resetSkillRelicState', () => {
    it('重置爵士乐词条追踪', () => {
      state.player.relics.add('jazz')
      trackWordAffixTypes([{ type: AffixType.Multiply }])
      trackWordAffixTypes([{ type: AffixType.Crit }])
      expect(getWordAffixTypeCount()).toBe(2)
      resetSkillRelicState()
      expect(getWordAffixTypeCount()).toBe(0)
    })
  })

  // =====================
  // 行为注册
  // =====================
  describe('initSkillRelicBehaviors', () => {
    it('注册 training_manual、jazz_diversity、uncrowned_king 行为', () => {
      initSkillRelicBehaviors()
      const registered = getRegisteredBehaviors()
      expect(registered).toContain('training_manual')
      expect(registered).toContain('jazz_diversity')
      expect(registered).toContain('uncrowned_king')
    })
  })

  // =====================
  // 交互测试
  // =====================
  describe('遗物交互', () => {
    it('first_strike + less_is_more 加算合并 → +0.4', () => {
      state.player.relics.add('first_strike')
      state.player.relics.add('less_is_more')
      synergy.wordSkillCount = 1
      // 各自返回 0.2
      const fs = getFirstStrikeBonus()
      const lim = getLessIsMoreBonus()
      expect(fs + lim).toBeCloseTo(0.4)
    })

    it('first_strike 仅首个技能生效，less_is_more 全局生效', () => {
      state.player.relics.add('first_strike')
      state.player.relics.add('less_is_more')
      // 第二个技能
      synergy.wordSkillCount = 2
      expect(getFirstStrikeBonus()).toBe(0)
      expect(getLessIsMoreBonus()).toBe(0.2)
    })

    it('uncrowned_king + 有附魔技能 → 不能突破 Lv3', () => {
      state.player.relics.add('uncrowned_king')
      // 有附魔的技能 → shouldBlockEnchantment false → 不阻止附魔
      expect(shouldBlockEnchantment(['quest_devour'])).toBe(false)
      // 有附魔的技能不受 uncrowned_king 影响（仍受 Lv.3 上限）
      // 这由 shop.ts 的 effectiveCap 逻辑保证（有附魔 → levelCap=3）
    })

    it('uncrowned_king + 无附魔技能 → 阻止附魔', () => {
      state.player.relics.add('uncrowned_king')
      expect(shouldBlockEnchantment([])).toBe(true)
    })
  })
})
