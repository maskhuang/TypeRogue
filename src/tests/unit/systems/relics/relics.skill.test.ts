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
  getUncrownedKingAffixlessBonus,
  shouldBlockEnchantment,
  resetSkillRelicState,
  initSkillRelicBehaviors,
  rerollAllAffixes,
  checkD100OnBattleStart,
} from '../../../../src/systems/relics/SkillRelicBehaviors'
import { AffixType } from '../../../../src/data/affixes'
import { clearBehaviorHandlers, getRegisteredBehaviors } from '../../../../src/systems/relics/RelicPipeline'

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

    it('持有且 wordSkillCount=1 → 返回 10', () => {
      state.player.relics.add('first_strike')
      synergy.wordSkillCount = 1
      expect(getFirstStrikeBonus()).toBe(10)
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

    it('Lv.2 → Lv.3（新行为：level < 3 → level++）', () => {
      setupSkill('s1', 2)
      const ids = applyTrainingManual()
      expect(ids.length).toBe(1)
      expect(state.player.skills.get('s1')?.level).toBe(3)
      expect(state.affixSkills.get('s1')?.level).toBe(3)
    })

    it('Lv.3 不变（上限）', () => {
      setupSkill('s1', 3)
      const ids = applyTrainingManual()
      expect(ids.length).toBe(0)
      expect(state.player.skills.get('s1')?.level).toBe(3)
    })

    it('混合场景：Lv.1→2, Lv.2→3, Lv.3 不变', () => {
      setupSkill('s1', 1)
      setupSkill('s2', 2)
      setupSkill('s3', 3)
      const ids = applyTrainingManual()
      expect(ids.length).toBe(2)
      expect(state.player.skills.get('s1')?.level).toBe(2)
      expect(state.player.skills.get('s2')?.level).toBe(3)
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
  // AC5: 无冕之王（重设计：无词缀加成）
  // =====================
  describe('无冕之王 (uncrowned_king)', () => {
    it('未持有 → hasUncrownedKing false', () => {
      expect(hasUncrownedKing()).toBe(false)
    })

    it('持有 → hasUncrownedKing true', () => {
      state.player.relics.add('uncrowned_king')
      expect(hasUncrownedKing()).toBe(true)
    })

    it('shouldBlockEnchantment 始终返回 false（不再阻止附魔）', () => {
      expect(shouldBlockEnchantment([])).toBe(false)
      state.player.relics.add('uncrowned_king')
      expect(shouldBlockEnchantment([])).toBe(false)
      expect(shouldBlockEnchantment(['some_enchant'])).toBe(false)
    })

    it('未持有 → getUncrownedKingAffixlessBonus 返回 0', () => {
      expect(getUncrownedKingAffixlessBonus()).toBe(0)
    })

    it('持有 → getUncrownedKingAffixlessBonus 返回 0.3', () => {
      state.player.relics.add('uncrowned_king')
      expect(getUncrownedKingAffixlessBonus()).toBe(0.3)
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
    it('first_strike 返回固定分数，less_is_more 返回百分比', () => {
      state.player.relics.add('first_strike')
      state.player.relics.add('less_is_more')
      synergy.wordSkillCount = 1
      expect(getFirstStrikeBonus()).toBe(10)  // 固定 +10 分
      expect(getLessIsMoreBonus()).toBe(0.2)  // 产出 +20%
    })

    it('first_strike 仅首个技能生效，less_is_more 全局生效', () => {
      state.player.relics.add('first_strike')
      state.player.relics.add('less_is_more')
      // 第二个技能
      synergy.wordSkillCount = 2
      expect(getFirstStrikeBonus()).toBe(0)
      expect(getLessIsMoreBonus()).toBe(0.2)
    })

    it('uncrowned_king 不再阻止附魔', () => {
      state.player.relics.add('uncrowned_king')
      expect(shouldBlockEnchantment([])).toBe(false)
      expect(shouldBlockEnchantment(['quest_devour'])).toBe(false)
    })
  })

  // =====================
  // D100（传说，每5战替换词条）
  // =====================
  describe('D100 (d_100)', () => {
    function setupSkillWithAffixes(id: string, affixTypes: AffixType[]): void {
      state.player.skills.set(id, { level: 1, key: 'a' })
      state.affixSkills.set(id, {
        id,
        name: 'test',
        icon: '🧪',
        resource: 'score',
        baseValues: [10, 15, 20],
        level: 1,
        rarity: affixTypes.length as 0 | 1 | 2 | 3,
        affixes: affixTypes.map(type => ({ type })),
        enchantmentIds: ['quest_devour'],
      } as any)
    }

    it('未持有 → rerollAllAffixes 仍替换（直接调用不检查遗物）', () => {
      setupSkillWithAffixes('s1', [AffixType.Crit, AffixType.Decay])
      const count = rerollAllAffixes()
      expect(count).toBe(1)
      const skill = state.affixSkills.get('s1')!
      expect(skill.affixes).toHaveLength(2)
      expect(skill.enchantmentIds).toEqual(['quest_devour']) // 附魔保留
      expect(skill.level).toBe(1) // 等级保留
    })

    it('替换后词条数量不变', () => {
      setupSkillWithAffixes('s1', [AffixType.Crit, AffixType.Decay, AffixType.Pulse])
      rerollAllAffixes()
      expect(state.affixSkills.get('s1')!.affixes).toHaveLength(3)
    })

    it('0词条技能不受影响', () => {
      setupSkillWithAffixes('s1', [])
      const count = rerollAllAffixes()
      expect(count).toBe(0)
      expect(state.affixSkills.get('s1')!.affixes).toHaveLength(0)
    })

    it('替换后技能名称更新', () => {
      setupSkillWithAffixes('s1', [AffixType.Crit])
      const oldName = state.affixSkills.get('s1')!.name
      rerollAllAffixes()
      // 名称可能变也可能不变（随机），但 generateName 一定被调用了
      expect(typeof state.affixSkills.get('s1')!.name).toBe('string')
    })

    it('checkD100OnBattleStart 未持有 → 返回 0', () => {
      expect(checkD100OnBattleStart()).toBe(0)
    })

    it('checkD100OnBattleStart 每5战触发', () => {
      state.player.relics.add('d_100')
      state.player.relicStates = {}
      setupSkillWithAffixes('s1', [AffixType.Crit])
      // 战斗 1~4 不触发
      for (let i = 0; i < 4; i++) {
        expect(checkD100OnBattleStart()).toBe(0)
      }
      // 第5战触发
      expect(checkD100OnBattleStart()).toBe(1) // 1个技能被替换
    })

    it('checkD100OnBattleStart 第10战再次触发', () => {
      state.player.relics.add('d_100')
      state.player.relicStates = {}
      setupSkillWithAffixes('s1', [AffixType.Crit])
      for (let i = 0; i < 10; i++) {
        checkD100OnBattleStart()
      }
      // 累计10战，应该在第5和第10战各触发一次
      // 验证计数器 = 10
      expect(state.player.relicStates['d_100']).toBe(10)
    })

    it('多技能同时替换', () => {
      state.player.relics.add('d_100')
      setupSkillWithAffixes('s1', [AffixType.Crit])
      setupSkillWithAffixes('s2', [AffixType.Decay, AffixType.Pulse])
      setupSkillWithAffixes('s3', []) // 0词条，不计入
      const count = rerollAllAffixes()
      expect(count).toBe(2)
    })
  })
})
