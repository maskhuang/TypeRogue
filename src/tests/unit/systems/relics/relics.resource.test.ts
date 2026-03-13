// ============================================
// 打字肉鸽 - 资源系统遗物行为测试 (Story 36.8)
// ============================================

import { describe, it, expect, beforeEach } from 'vitest'
import { state } from '../../../../src/core/state'
import {
  SCORE_MAGNET_BONUS,
  RESOURCE_SENSE_THRESHOLD,
  RESOURCE_SENSE_BOOST,
  TIME_DEW_INTERVAL,
  TIME_DEW_BONUS,
  RESOURCE_TIDE_RATE,
  checkScoreMagnet,
  recordResourceProduction,
  checkResourceSense,
  resetWordResourceAmounts,
  checkTimeDew,
  incrementTimeDewCounter,
  getResourceTideBonus,
  incrementWordParity,
  checkUniversalFurnace,
  resetResourceRelicBattleState,
  initResourceRelicBehaviors,
} from '../../../../src/systems/relics/ResourceRelicBehaviors'
import { clearBehaviorHandlers, getRegisteredBehaviors } from '../../../../src/systems/relics/RelicPipeline'
import { getShortSprintBonus } from '../../../../src/systems/relics/WordRelicBehaviors'

// === 辅助 ===
function clearRelics(): void {
  state.player.relics.clear()
  state.player.relicStates = {}
}

describe('资源系统遗物行为 (Story 36.8)', () => {
  beforeEach(() => {
    clearRelics()
    clearBehaviorHandlers()
    resetResourceRelicBattleState()
    resetWordResourceAmounts()
  })

  // === 常量校验 ===
  describe('常量', () => {
    it('SCORE_MAGNET_BONUS = 1', () => {
      expect(SCORE_MAGNET_BONUS).toBe(1)
    })
    it('RESOURCE_SENSE_THRESHOLD = 3', () => {
      expect(RESOURCE_SENSE_THRESHOLD).toBe(3)
    })
    it('RESOURCE_SENSE_BOOST = 0.50', () => {
      expect(RESOURCE_SENSE_BOOST).toBe(0.50)
    })
    it('TIME_DEW_INTERVAL = 3', () => {
      expect(TIME_DEW_INTERVAL).toBe(3)
    })
    it('TIME_DEW_BONUS = 1', () => {
      expect(TIME_DEW_BONUS).toBe(1)
    })
    it('RESOURCE_TIDE_RATE = 0.40', () => {
      expect(RESOURCE_TIDE_RATE).toBe(0.40)
    })
  })

  // === 分数磁铁 (score_magnet) ===
  describe('分数磁铁 (score_magnet)', () => {
    it('无遗物 → 0', () => {
      expect(checkScoreMagnet()).toBe(0)
    })

    it('有遗物 → 1', () => {
      state.player.relics.add('score_magnet')
      expect(checkScoreMagnet()).toBe(SCORE_MAGNET_BONUS)
    })
  })

  // === 资源感应 (resource_sense) ===
  describe('资源感应 (resource_sense)', () => {
    it('无遗物 → null', () => {
      expect(checkResourceSense()).toBeNull()
    })

    it('有遗物 + <3种资源 → null', () => {
      state.player.relics.add('resource_sense')
      // 记录2种资源产出
      recordResourceProduction('base', 5)
      recordResourceProduction('gold', 3)
      expect(checkResourceSense()).toBeNull()
    })

    it('有遗物 + ≥3种资源 → 返回最少那种的预计算bonus', () => {
      state.player.relics.add('resource_sense')
      // 记录3种资源：base最少(2)
      recordResourceProduction('base', 2)
      recordResourceProduction('gold', 10)
      recordResourceProduction('time', 8)
      const result = checkResourceSense()
      expect(result).not.toBeNull()
      expect(result!.resource).toBe('base')
      expect(result!.bonus).toBe(Math.floor(2 * RESOURCE_SENSE_BOOST)) // floor(2*0.5) = 1
    })

    it('多种数量相同时取任一', () => {
      state.player.relics.add('resource_sense')
      // 3种资源数量相同
      recordResourceProduction('base', 5)
      recordResourceProduction('gold', 5)
      recordResourceProduction('time', 5)
      const result = checkResourceSense()
      expect(result).not.toBeNull()
      expect(['base', 'gold', 'time']).toContain(result!.resource)
      expect(result!.bonus).toBe(Math.floor(5 * RESOURCE_SENSE_BOOST)) // floor(5*0.5) = 2
    })

    it('恰好3种资源触发，返回最少的那种', () => {
      state.player.relics.add('resource_sense')
      recordResourceProduction('multiplier', 1)
      recordResourceProduction('score', 4)
      recordResourceProduction('time', 6)
      const result = checkResourceSense()
      expect(result).not.toBeNull()
      expect(result!.resource).toBe('multiplier')
    })
  })

  // === 时间露珠 (time_dew) ===
  describe('时间露珠 (time_dew)', () => {
    it('无遗物 → 0', () => {
      // counter=0，无遗物
      expect(checkTimeDew()).toBe(0)
    })

    it('有遗物 + 第1词 → 0', () => {
      state.player.relics.add('time_dew')
      incrementTimeDewCounter() // counter = 1
      expect(checkTimeDew()).toBe(0)
    })

    it('有遗物 + 第2词 → 0', () => {
      state.player.relics.add('time_dew')
      incrementTimeDewCounter() // counter = 1
      incrementTimeDewCounter() // counter = 2
      expect(checkTimeDew()).toBe(0)
    })

    it('有遗物 + 第3词 → 1', () => {
      state.player.relics.add('time_dew')
      incrementTimeDewCounter() // counter = 1
      incrementTimeDewCounter() // counter = 2
      incrementTimeDewCounter() // counter = 3
      expect(checkTimeDew()).toBe(TIME_DEW_BONUS)
    })

    it('有遗物 + 第4词 → 0', () => {
      state.player.relics.add('time_dew')
      incrementTimeDewCounter() // counter = 1
      incrementTimeDewCounter() // counter = 2
      incrementTimeDewCounter() // counter = 3
      incrementTimeDewCounter() // counter = 4
      expect(checkTimeDew()).toBe(0)
    })

    it('有遗物 + 第6词 → 1', () => {
      state.player.relics.add('time_dew')
      for (let i = 0; i < 6; i++) incrementTimeDewCounter()
      expect(checkTimeDew()).toBe(TIME_DEW_BONUS)
    })
  })

  // === 资源潮汐 (resource_tide) ===
  describe('资源潮汐 (resource_tide)', () => {
    it('无遗物 → 0', () => {
      incrementWordParity() // 奇数词
      expect(getResourceTideBonus('base')).toBe(0)
    })

    it('奇数词 + base → 0.40', () => {
      state.player.relics.add('resource_tide')
      incrementWordParity() // 奇数词（第1词）
      expect(getResourceTideBonus('base')).toBe(RESOURCE_TIDE_RATE)
    })

    it('奇数词 + multiplier → 0', () => {
      state.player.relics.add('resource_tide')
      incrementWordParity() // 奇数词（第1词）
      expect(getResourceTideBonus('multiplier')).toBe(0)
    })

    it('偶数词 + multiplier → 0.40', () => {
      state.player.relics.add('resource_tide')
      incrementWordParity() // 奇数（第1词）
      incrementWordParity() // 偶数（第2词）
      expect(getResourceTideBonus('multiplier')).toBe(RESOURCE_TIDE_RATE)
    })

    it('偶数词 + base → 0', () => {
      state.player.relics.add('resource_tide')
      incrementWordParity() // 奇数（第1词）
      incrementWordParity() // 偶数（第2词）
      expect(getResourceTideBonus('base')).toBe(0)
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
    it('resetResourceRelicBattleState 重置 counter 和 parity', () => {
      state.player.relics.add('time_dew')
      state.player.relics.add('resource_tide')
      // 推进计数器
      incrementTimeDewCounter()
      incrementTimeDewCounter()
      incrementTimeDewCounter() // counter = 3，下一次 checkTimeDew() 应该返回1
      incrementWordParity()
      incrementWordParity() // parity = 2（偶数）

      // 重置
      resetResourceRelicBattleState()

      // counter 归零后推进1次仍为奇数词，不触发time_dew
      incrementTimeDewCounter() // counter = 1
      expect(checkTimeDew()).toBe(0)

      // parity 归零后推进1次为奇数
      incrementWordParity()
      expect(getResourceTideBonus('base')).toBe(RESOURCE_TIDE_RATE)
    })

    it('initResourceRelicBehaviors 注册行为', () => {
      initResourceRelicBehaviors()
      const handlers = getRegisteredBehaviors()
      expect(handlers.length).toBeGreaterThan(0)
    })
  })

  // === 遗物组合交互 ===
  describe('遗物组合交互', () => {
    it('资源潮汐 + 短词冲刺可叠加（各自返回独立加成）', () => {
      state.player.relics.add('resource_tide')
      state.player.relics.add('short_sprint')
      incrementWordParity() // 奇数词（第1词）

      // 资源潮汐：奇数词 + base → 0.40
      const tideBonus = getResourceTideBonus('base')
      expect(tideBonus).toBe(RESOURCE_TIDE_RATE)

      // 短词冲刺：长度≤4 → 0.20
      const sprintBonus = getShortSprintBonus(3)
      expect(sprintBonus).toBeGreaterThan(0)

      // 两者独立，叠加由 skills.ts 完成
      expect(tideBonus + sprintBonus).toBeGreaterThan(RESOURCE_TIDE_RATE)
    })
  })
})
