// ============================================
// 打字肉鸽 - 资源系统遗物行为测试 (Story 36.8)
// ============================================

import { describe, it, expect, beforeEach } from 'vitest'
import { state } from '../../../../src/core/state'
import {
  DIVIDEND_CHANCE,
  DIVIDEND_GOLD,
  TRICKLE_TIME,
  RESOURCE_FOCUS_RATE,
  DIVERSITY_THRESHOLD,
  DIVERSITY_RATE,
  RESOURCE_TIDE_RATE,
  rollProductionDividend,
  getTimeTrickle,
  getResourceFocusType,
  getResourceFocusBonus,
  getResourceDiversityBonus,
  getResourceTideBonus,
  incrementWordParity,
  getCurrentTidePhase,
  getCurrentTideResource,
  checkUniversalFurnace,
  resetResourceRelicBattleState,
  initResourceRelicBehaviors,
} from '../../../../src/systems/relics/ResourceRelicBehaviors'
import { clearBehaviorHandlers, getRegisteredBehaviors } from '../../../../src/systems/relics/RelicPipeline'

// === 辅助 ===
function clearRelics(): void {
  state.player.relics.clear()
  state.player.relicStates = {}
}

/** 设置 affixSkills mock 数据 */
function setAffixSkills(skills: Array<{ id: string; resource: string }>): void {
  state.affixSkills.clear()
  for (const sk of skills) {
    state.affixSkills.set(sk.id, {
      id: sk.id,
      name: sk.id,
      icon: '',
      resource: sk.resource as any,
      baseValues: [1],
      level: 1,
      rarity: 'common' as any,
      affixes: [],
      enchantmentIds: [],
    })
  }
}

describe('资源系统遗物行为 (Story 36.8)', () => {
  beforeEach(() => {
    clearRelics()
    clearBehaviorHandlers()
    resetResourceRelicBattleState()
    state.affixSkills.clear()
  })

  // === 常量校验 ===
  describe('常量', () => {
    it('DIVIDEND_CHANCE = 0.05', () => {
      expect(DIVIDEND_CHANCE).toBe(0.05)
    })
    it('DIVIDEND_GOLD = 2', () => {
      expect(DIVIDEND_GOLD).toBe(2)
    })
    it('TRICKLE_TIME = 0.05', () => {
      expect(TRICKLE_TIME).toBe(0.05)
    })
    it('RESOURCE_FOCUS_RATE = 0.25', () => {
      expect(RESOURCE_FOCUS_RATE).toBe(0.25)
    })
    it('DIVERSITY_THRESHOLD = 3', () => {
      expect(DIVERSITY_THRESHOLD).toBe(3)
    })
    it('DIVERSITY_RATE = 0.20', () => {
      expect(DIVERSITY_RATE).toBe(0.20)
    })
    it('RESOURCE_TIDE_RATE = 0.80', () => {
      expect(RESOURCE_TIDE_RATE).toBe(0.80)
    })
  })

  // === 产出分红 (production_dividend) ===
  describe('产出分红 (production_dividend)', () => {
    it('无遗物 → 0', () => {
      expect(rollProductionDividend()).toBe(0)
    })

    it('有遗物 → 0 或 DIVIDEND_GOLD', () => {
      state.player.relics.add('production_dividend')
      const result = rollProductionDividend()
      expect(result === 0 || result === DIVIDEND_GOLD).toBe(true)
    })
  })

  // === 续命涓流 (time_trickle) ===
  describe('续命涓流 (time_trickle)', () => {
    it('无遗物 → 0', () => {
      expect(getTimeTrickle()).toBe(0)
    })

    it('有遗物 → TRICKLE_TIME', () => {
      state.player.relics.add('time_trickle')
      expect(getTimeTrickle()).toBe(TRICKLE_TIME)
    })
  })

  // === 资源专精 (resource_focus) ===
  describe('资源专精 (resource_focus)', () => {
    it('无遗物 → focusType null', () => {
      expect(getResourceFocusType()).toBeNull()
    })

    it('无遗物 → bonus 0', () => {
      expect(getResourceFocusBonus('base')).toBe(0)
    })

    it('有遗物 + 单一资源类型 → 该类型+25%', () => {
      state.player.relics.add('resource_focus')
      setAffixSkills([
        { id: 's1', resource: 'base' },
        { id: 's2', resource: 'base' },
        { id: 's3', resource: 'gold' },
      ])
      expect(getResourceFocusType()).toBe('base')
      expect(getResourceFocusBonus('base')).toBe(RESOURCE_FOCUS_RATE)
      expect(getResourceFocusBonus('gold')).toBe(0)
    })

    it('有遗物 + 无技能 → null', () => {
      state.player.relics.add('resource_focus')
      expect(getResourceFocusType()).toBeNull()
    })
  })

  // === 多元投资 (resource_diversity) ===
  describe('多元投资 (resource_diversity)', () => {
    it('无遗物 → 0', () => {
      expect(getResourceDiversityBonus()).toBe(0)
    })

    it('有遗物 + <3种 → 0', () => {
      state.player.relics.add('resource_diversity')
      setAffixSkills([
        { id: 's1', resource: 'base' },
        { id: 's2', resource: 'gold' },
      ])
      expect(getResourceDiversityBonus()).toBe(0)
    })

    it('有遗物 + ≥3种 → DIVERSITY_RATE', () => {
      state.player.relics.add('resource_diversity')
      setAffixSkills([
        { id: 's1', resource: 'base' },
        { id: 's2', resource: 'gold' },
        { id: 's3', resource: 'time' },
      ])
      expect(getResourceDiversityBonus()).toBe(DIVERSITY_RATE)
    })

    it('有遗物 + 恰好3种（含重复） → DIVERSITY_RATE', () => {
      state.player.relics.add('resource_diversity')
      setAffixSkills([
        { id: 's1', resource: 'base' },
        { id: 's2', resource: 'gold' },
        { id: 's3', resource: 'time' },
        { id: 's4', resource: 'base' },
      ])
      expect(getResourceDiversityBonus()).toBe(DIVERSITY_RATE)
    })
  })

  // === 资源潮汐 (resource_tide) — 4相位 ===
  describe('资源潮汐 (resource_tide)', () => {
    it('无遗物 → 0', () => {
      expect(getResourceTideBonus('base')).toBe(0)
    })

    it('phase 0 (初始) → base +80%', () => {
      state.player.relics.add('resource_tide')
      expect(getCurrentTidePhase()).toBe(0)
      expect(getCurrentTideResource()).toBe('base')
      expect(getResourceTideBonus('base')).toBe(RESOURCE_TIDE_RATE)
      expect(getResourceTideBonus('multiplier')).toBe(0)
      expect(getResourceTideBonus('time')).toBe(0)
      expect(getResourceTideBonus('gold')).toBe(0)
    })

    it('phase 1 → multiplier +80%', () => {
      state.player.relics.add('resource_tide')
      incrementWordParity() // phase 1
      expect(getCurrentTidePhase()).toBe(1)
      expect(getCurrentTideResource()).toBe('multiplier')
      expect(getResourceTideBonus('multiplier')).toBe(RESOURCE_TIDE_RATE)
      expect(getResourceTideBonus('base')).toBe(0)
    })

    it('phase 2 → time +80%', () => {
      state.player.relics.add('resource_tide')
      incrementWordParity() // phase 1
      incrementWordParity() // phase 2
      expect(getCurrentTidePhase()).toBe(2)
      expect(getCurrentTideResource()).toBe('time')
      expect(getResourceTideBonus('time')).toBe(RESOURCE_TIDE_RATE)
      expect(getResourceTideBonus('base')).toBe(0)
    })

    it('phase 3 → gold +80%', () => {
      state.player.relics.add('resource_tide')
      incrementWordParity() // 1
      incrementWordParity() // 2
      incrementWordParity() // 3
      expect(getCurrentTidePhase()).toBe(3)
      expect(getCurrentTideResource()).toBe('gold')
      expect(getResourceTideBonus('gold')).toBe(RESOURCE_TIDE_RATE)
      expect(getResourceTideBonus('time')).toBe(0)
    })

    it('phase 4 → 循环回 base (phase 0)', () => {
      state.player.relics.add('resource_tide')
      incrementWordParity() // 1
      incrementWordParity() // 2
      incrementWordParity() // 3
      incrementWordParity() // 4 → phase 0
      expect(getCurrentTidePhase()).toBe(0)
      expect(getCurrentTideResource()).toBe('base')
      expect(getResourceTideBonus('base')).toBe(RESOURCE_TIDE_RATE)
    })
  })

  // === 万物熔炉 (universal_furnace) ===
  describe('万物熔炉 (universal_furnace)', () => {
    it('无遗物 → null', () => {
      state.score = 1000
      state.targetScore = 950
      state.time = 10.5
      expect(checkUniversalFurnace()).toBeNull()
    })

    it('overkill=0 + time=5 → bonusGold=5, overrideBase=true', () => {
      state.player.relics.add('universal_furnace')
      state.score = 1000
      state.targetScore = 1000  // overkill = 0
      state.time = 5.9          // floor(5.9) = 5
      const result = checkUniversalFurnace()
      expect(result).not.toBeNull()
      expect(result!.bonusGold).toBe(5)
      expect(result!.overrideBase).toBe(true)
    })

    it('overkill=50 + time=10 → bonusGold=60, overrideBase=true', () => {
      state.player.relics.add('universal_furnace')
      state.score = 1000
      state.targetScore = 950   // overkill = 50
      state.time = 10.5         // floor(10.5) = 10
      const result = checkUniversalFurnace()
      expect(result).not.toBeNull()
      expect(result!.bonusGold).toBe(60)
      expect(result!.overrideBase).toBe(true)
    })

    it('边界: overkill=0 + time=0 → bonusGold=0', () => {
      state.player.relics.add('universal_furnace')
      state.score = 500
      state.targetScore = 500   // overkill = 0
      state.time = 0.9          // floor(0.9) = 0
      const result = checkUniversalFurnace()
      expect(result).not.toBeNull()
      expect(result!.bonusGold).toBe(0)
    })
  })

  // === 生命周期 ===
  describe('生命周期', () => {
    it('resetResourceRelicBattleState 重置 parity', () => {
      state.player.relics.add('resource_tide')
      incrementWordParity()
      incrementWordParity() // parity = 2
      resetResourceRelicBattleState()
      // parity 归零后 phase=0 → base
      expect(getCurrentTidePhase()).toBe(0)
      expect(getResourceTideBonus('base')).toBe(RESOURCE_TIDE_RATE)
    })

    it('initResourceRelicBehaviors 注册行为', () => {
      initResourceRelicBehaviors()
      const handlers = getRegisteredBehaviors()
      expect(handlers.length).toBeGreaterThan(0)
    })
  })
})
