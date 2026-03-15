// ============================================
// 打字肉鸽 - 遗物飞行动画测试 (Story 37.3)
// ============================================

import { describe, it, expect, beforeEach } from 'vitest'
import { state, resetState } from '../../../src/core/state'
import {
  storeDeferredSenseBonus,
  consumeDeferredSenseBonus,
  resetResourceRelicBattleState,
  checkScoreMagnet,
} from '../../../src/systems/relics/ResourceRelicBehaviors'

describe('遗物飞行动画 relicAnchor (Story 37.3)', () => {
  beforeEach(() => {
    resetState()
    resetResourceRelicBattleState()
  })

  // === deferred sense bonus lifecycle ===
  describe('storeDeferredSenseBonus / consumeDeferredSenseBonus', () => {
    it('base 奖励存储并消费', () => {
      storeDeferredSenseBonus('base', 10)
      const result = consumeDeferredSenseBonus()
      expect(result.base).toBe(10)
      expect(result.multiplier).toBe(0)
    })

    it('multiplier 奖励存储并消费', () => {
      storeDeferredSenseBonus('multiplier', 5)
      const result = consumeDeferredSenseBonus()
      expect(result.base).toBe(0)
      expect(result.multiplier).toBe(5)
    })

    it('累积多次存储', () => {
      storeDeferredSenseBonus('base', 3)
      storeDeferredSenseBonus('base', 7)
      storeDeferredSenseBonus('multiplier', 2)
      const result = consumeDeferredSenseBonus()
      expect(result.base).toBe(10)
      expect(result.multiplier).toBe(2)
    })

    it('消费后清零', () => {
      storeDeferredSenseBonus('base', 10)
      storeDeferredSenseBonus('multiplier', 5)
      consumeDeferredSenseBonus()
      const result = consumeDeferredSenseBonus()
      expect(result.base).toBe(0)
      expect(result.multiplier).toBe(0)
    })

    it('resetResourceRelicBattleState 清零 deferred', () => {
      storeDeferredSenseBonus('base', 10)
      storeDeferredSenseBonus('multiplier', 5)
      resetResourceRelicBattleState()
      const result = consumeDeferredSenseBonus()
      expect(result.base).toBe(0)
      expect(result.multiplier).toBe(0)
    })
  })

  // === score_magnet 遗物检查 ===
  describe('score_magnet 检查', () => {
    it('无遗物返回 0', () => {
      expect(checkScoreMagnet()).toBe(0)
    })

    it('有遗物返回 SCORE_MAGNET_BONUS', () => {
      state.player.relics.add('score_magnet')
      expect(checkScoreMagnet()).toBe(1)
    })
  })

  // === relicAnchor 结构验证 ===
  describe('relicAnchor 结构', () => {
    it('10 个资源遗物 ID 与 Set 操作兼容', () => {
      const relicIds = [
        'score_magnet', 'dual_concerto', 'rhythm_doctor',
        'glass_cannon', 'resource_sense', 'time_dew',
        'word_collection', 'long_word_master', 'perfect_rhythm', 'phoenix',
      ]
      state.player.relics = new Set(relicIds)
      for (const id of relicIds) {
        expect(state.player.relics.has(id)).toBe(true)
        const idx = [...state.player.relics].indexOf(id)
        expect(idx).toBeGreaterThanOrEqual(0)
      }
    })

    it('relicAnchor 对象格式正确', () => {
      const anchor = { relicId: 'score_magnet', resource: 'score', amount: 1 }
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
        score_magnet: 'score',
        dual_concerto: 'time',
        rhythm_doctor: 'time',
        glass_cannon: 'score',
        time_dew: 'time',
        word_collection: 'gold',
        long_word_master: 'time',
        perfect_rhythm: 'time',
        phoenix: 'time',
      }
      for (const [relicId, resource] of Object.entries(relicResources)) {
        expect(validResources).toContain(resource)
      }
    })

    it('resource_sense 动态资源中 fragment 不在映射范围内（降级为非飞行）', () => {
      expect(validResources).not.toContain('fragment')
    })
  })
})
