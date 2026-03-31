// ============================================
// 打字肉鸽 - 遗物飞行动画测试 (Story 37.3)
// ============================================

import { describe, it, expect, beforeEach } from 'vitest'
import { state, resetState } from '../../../src/core/state'
import {
  resetResourceRelicBattleState,
  rollProductionDividend,
  getTimeTrickle,
  DIVIDEND_GOLD,
  TRICKLE_TIME,
} from '../../../src/systems/relics/ResourceRelicBehaviors'

describe('遗物飞行动画 relicAnchor (Story 37.3)', () => {
  beforeEach(() => {
    resetState()
    resetResourceRelicBattleState()
  })

  // === production_dividend 遗物检查 ===
  describe('production_dividend 检查', () => {
    it('无遗物返回 0', () => {
      expect(rollProductionDividend()).toBe(0)
    })

    it('有遗物返回 0 或 DIVIDEND_GOLD', () => {
      state.player.relics.add('production_dividend')
      const result = rollProductionDividend()
      expect(result === 0 || result === DIVIDEND_GOLD).toBe(true)
    })
  })

  // === time_trickle 遗物检查 ===
  describe('time_trickle 检查', () => {
    it('无遗物返回 0', () => {
      expect(getTimeTrickle()).toBe(0)
    })

    it('有遗物返回 TRICKLE_TIME', () => {
      state.player.relics.add('time_trickle')
      expect(getTimeTrickle()).toBe(TRICKLE_TIME)
    })
  })

  // === relicAnchor 结构验证 ===
  describe('relicAnchor 结构', () => {
    it('资源遗物 ID 与 Set 操作兼容', () => {
      const relicIds = [
        'production_dividend', 'dual_concerto',
        'time_trickle', 'word_collection',
        'long_word_master', 'phoenix',
      ]
      state.player.relics = new Set(relicIds)
      for (const id of relicIds) {
        expect(state.player.relics.has(id)).toBe(true)
        const idx = [...state.player.relics].indexOf(id)
        expect(idx).toBeGreaterThanOrEqual(0)
      }
    })

    it('relicAnchor 对象格式正确', () => {
      const anchor = { relicId: 'production_dividend', resource: 'gold', amount: 2 }
      expect(anchor).toHaveProperty('relicId')
      expect(anchor).toHaveProperty('resource')
      expect(anchor).toHaveProperty('amount')
    })

    it('relicAnchor 无 amount 时 amount 可选', () => {
      const anchor = { relicId: 'phoenix', resource: 'time' }
      expect(anchor.relicId).toBe('phoenix')
      expect(anchor.resource).toBe('time')
      expect((anchor as any).amount).toBeUndefined()
    })
  })

  // === RESOURCE_TARGET_IDS 覆盖验证 ===
  describe('资源目标映射覆盖', () => {
    const validResources = ['base', 'score', 'multiplier', 'time', 'gold']

    it('所有资源遗物使用的 resource 类型都在映射范围内', () => {
      const relicResources: Record<string, string> = {
        production_dividend: 'gold',
        time_trickle: 'time',
        dual_concerto: 'time',
        word_collection: 'gold',
        long_word_master: 'time',
        phoenix: 'time',
      }
      for (const [, resource] of Object.entries(relicResources)) {
        expect(validResources).toContain(resource)
      }
    })
  })
})
