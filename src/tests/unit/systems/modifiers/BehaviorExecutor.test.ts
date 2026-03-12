// ============================================
// 打字肉鸽 - BehaviorExecutor 单元测试
// ============================================
// Story 11.4: 行为修饰器框架

import { describe, it, expect, vi, afterEach } from 'vitest'
import { BehaviorExecutor } from '../../../../src/systems/modifiers/BehaviorExecutor'
import type {
  ModifierBehavior,
  BehaviorCallbacks,
} from '../../../../src/systems/modifiers/ModifierTypes'

describe('BehaviorExecutor', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // === 空队列 ===
  describe('空队列', () => {
    it('空 behaviors → executedCount=0', () => {
      const result = BehaviorExecutor.execute([])
      expect(result).toBe(0)
    })
  })

  // === intercept ===
  describe('intercept', () => {
    it('intercept 行为被跳过，不计入 executedCount', () => {
      const behaviors: ModifierBehavior[] = [{ type: 'intercept' }]
      const result = BehaviorExecutor.execute(behaviors)
      expect(result).toBe(0)
    })
  })

  // === buff_next_skill ===
  describe('buff_next_skill', () => {
    it('有回调 → onBuffNextSkill 被调用, executedCount=1', () => {
      const onBuffNextSkill = vi.fn()
      const callbacks: BehaviorCallbacks = { onBuffNextSkill }
      const behaviors: ModifierBehavior[] = [{ type: 'buff_next_skill', multiplier: 1.5 }]

      const result = BehaviorExecutor.execute(behaviors, callbacks)
      expect(onBuffNextSkill).toHaveBeenCalledWith(1.5)
      expect(result).toBe(1)
    })

    it('无回调 → 跳过, executedCount=0', () => {
      const behaviors: ModifierBehavior[] = [{ type: 'buff_next_skill', multiplier: 1.5 }]
      const result = BehaviorExecutor.execute(behaviors)
      expect(result).toBe(0)
    })
  })

  // === combo_protect ===
  describe('combo_protect', () => {
    it('有回调 → onComboProtect 被调用, executedCount=1', () => {
      const onComboProtect = vi.fn().mockReturnValue(true)
      const callbacks: BehaviorCallbacks = { onComboProtect }
      const behaviors: ModifierBehavior[] = [{ type: 'combo_protect', probability: 0.5 }]

      const result = BehaviorExecutor.execute(behaviors, callbacks)
      expect(onComboProtect).toHaveBeenCalledWith(0.5)
      expect(result).toBe(1)
    })

    it('无回调 → 跳过, executedCount=0', () => {
      const behaviors: ModifierBehavior[] = [{ type: 'combo_protect', probability: 0.5 }]
      const result = BehaviorExecutor.execute(behaviors)
      expect(result).toBe(0)
    })
  })

  // === 混合队列 ===
  describe('混合队列', () => {
    it('[buff_next_skill, intercept] → buff 执行, intercept 跳过', () => {
      const onBuffNextSkill = vi.fn()
      const callbacks: BehaviorCallbacks = { onBuffNextSkill }
      const behaviors: ModifierBehavior[] = [
        { type: 'buff_next_skill', multiplier: 1.5 },
        { type: 'intercept' },
      ]

      const result = BehaviorExecutor.execute(behaviors, callbacks)
      expect(onBuffNextSkill).toHaveBeenCalledWith(1.5)
      expect(result).toBe(1)
    })

    it('多种行为组合', () => {
      const onBuffNextSkill = vi.fn()
      const onComboProtect = vi.fn().mockReturnValue(true)
      const onRetrigger = vi.fn()
      const callbacks: BehaviorCallbacks = { onBuffNextSkill, onComboProtect, onRetrigger }
      const behaviors: ModifierBehavior[] = [
        { type: 'buff_next_skill', multiplier: 1.5 },
        { type: 'combo_protect', probability: 0.3 },
        { type: 'retrigger' },
      ]

      const result = BehaviorExecutor.execute(behaviors, callbacks)
      expect(onBuffNextSkill).toHaveBeenCalledWith(1.5)
      expect(onComboProtect).toHaveBeenCalledWith(0.3)
      expect(onRetrigger).toHaveBeenCalled()
      expect(result).toBe(3)
    })
  })

  // === retrigger ===
  describe('retrigger', () => {
    it('有回调 → onRetrigger 被调用', () => {
      const onRetrigger = vi.fn()
      const callbacks: BehaviorCallbacks = { onRetrigger }
      const behaviors: ModifierBehavior[] = [{ type: 'retrigger' }]

      const result = BehaviorExecutor.execute(behaviors, callbacks)
      expect(onRetrigger).toHaveBeenCalled()
      expect(result).toBe(1)
    })
  })

  // === time_steal ===
  describe('time_steal', () => {
    it('有回调 → onTimeSteal 被调用', () => {
      const onTimeSteal = vi.fn()
      const callbacks: BehaviorCallbacks = { onTimeSteal }
      const behaviors: ModifierBehavior[] = [{ type: 'time_steal', timeBonus: 0.3 }]

      const result = BehaviorExecutor.execute(behaviors, callbacks)
      expect(onTimeSteal).toHaveBeenCalledWith(0.3)
      expect(result).toBe(1)
    })
  })

  // === instant_fail ===
  describe('instant_fail', () => {
    it('有回调 → onInstantFail 被调用', () => {
      const onInstantFail = vi.fn()
      const callbacks: BehaviorCallbacks = { onInstantFail }
      const behaviors: ModifierBehavior[] = [{ type: 'instant_fail' }]

      const result = BehaviorExecutor.execute(behaviors, callbacks)
      expect(onInstantFail).toHaveBeenCalled()
      expect(result).toBe(1)
    })
  })

  // === remove_relic ===
  describe('remove_relic', () => {
    it('有回调 → onRemoveRelic 被调用', () => {
      const onRemoveRelic = vi.fn()
      const callbacks: BehaviorCallbacks = { onRemoveRelic }
      const behaviors: ModifierBehavior[] = [{ type: 'remove_relic', relicId: 'perfectionist' }]

      const result = BehaviorExecutor.execute(behaviors, callbacks)
      expect(onRemoveRelic).toHaveBeenCalledWith('perfectionist')
      expect(result).toBe(1)
    })
  })

  // === time_refund ===
  describe('time_refund', () => {
    it('有回调 → onTimeRefund 被调用', () => {
      const onTimeRefund = vi.fn()
      const callbacks: BehaviorCallbacks = { onTimeRefund }
      const behaviors: ModifierBehavior[] = [{ type: 'time_refund', ratio: 0.5 }]

      const result = BehaviorExecutor.execute(behaviors, callbacks)
      expect(onTimeRefund).toHaveBeenCalledWith(0.5)
      expect(result).toBe(1)
    })
  })
})
