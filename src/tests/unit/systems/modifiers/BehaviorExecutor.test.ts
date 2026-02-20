// ============================================
// 打字肉鸽 - BehaviorExecutor 单元测试
// ============================================
// Story 11.4: 行为修饰器框架

import { describe, it, expect, vi, afterEach } from 'vitest'
import { BehaviorExecutor } from '../../../../src/systems/modifiers/BehaviorExecutor'
import type {
  ModifierBehavior,
  BehaviorCallbacks,
  PipelineResult,
} from '../../../../src/systems/modifiers/ModifierTypes'

// === 工厂函数 ===
function emptyPipelineResult(pendingBehaviors: ModifierBehavior[] = []): PipelineResult {
  return {
    intercepted: false,
    effects: { score: 0, multiply: 0, time: 0, gold: 0, shield: 0 },
    pendingBehaviors,
  }
}

describe('BehaviorExecutor', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // === 常量 ===
  describe('常量', () => {
    it('MAX_DEPTH = 3', () => {
      expect(BehaviorExecutor.MAX_DEPTH).toBe(3)
    })
  })

  // === 空队列 ===
  describe('空队列', () => {
    it('空 behaviors → executedCount=0, skippedByDepth=0', () => {
      const result = BehaviorExecutor.execute([], 0)
      expect(result.executedCount).toBe(0)
      expect(result.skippedByDepth).toBe(0)
      expect(result.chainDepthReached).toBe(0)
    })
  })

  // === intercept ===
  describe('intercept', () => {
    it('intercept 行为被跳过，不计入 executedCount', () => {
      const behaviors: ModifierBehavior[] = [{ type: 'intercept' }]
      const result = BehaviorExecutor.execute(behaviors, 0)
      expect(result.executedCount).toBe(0)
      expect(result.skippedByDepth).toBe(0)
    })
  })

  // === buff_next_skill ===
  describe('buff_next_skill', () => {
    it('有回调 → onBuffNextSkill 被调用, executedCount=1', () => {
      const onBuffNextSkill = vi.fn()
      const callbacks: BehaviorCallbacks = { onBuffNextSkill }
      const behaviors: ModifierBehavior[] = [{ type: 'buff_next_skill', multiplier: 1.5 }]

      const result = BehaviorExecutor.execute(behaviors, 0, callbacks)
      expect(onBuffNextSkill).toHaveBeenCalledWith(1.5)
      expect(result.executedCount).toBe(1)
    })

    it('无回调 → 跳过, executedCount=0', () => {
      const behaviors: ModifierBehavior[] = [{ type: 'buff_next_skill', multiplier: 1.5 }]
      const result = BehaviorExecutor.execute(behaviors, 0)
      expect(result.executedCount).toBe(0)
    })

    it('buff_next_skill 不受深度限制', () => {
      const onBuffNextSkill = vi.fn()
      const callbacks: BehaviorCallbacks = { onBuffNextSkill }
      const behaviors: ModifierBehavior[] = [{ type: 'buff_next_skill', multiplier: 2.0 }]

      const result = BehaviorExecutor.execute(behaviors, 3, callbacks)
      expect(onBuffNextSkill).toHaveBeenCalledWith(2.0)
      expect(result.executedCount).toBe(1)
      expect(result.skippedByDepth).toBe(0)
    })
  })

  // === trigger_adjacent ===
  describe('trigger_adjacent', () => {
    it('深度 0 → 调用 onTriggerAdjacent(0), 递归处理子行为', () => {
      const onTriggerAdjacent = vi.fn().mockReturnValue([
        emptyPipelineResult(),
      ])
      const callbacks: BehaviorCallbacks = { onTriggerAdjacent }
      const behaviors: ModifierBehavior[] = [{ type: 'trigger_adjacent' }]

      const result = BehaviorExecutor.execute(behaviors, 0, callbacks)
      expect(onTriggerAdjacent).toHaveBeenCalledWith(0)
      expect(result.executedCount).toBe(1)
    })

    it('深度 >= MAX_DEPTH → skippedByDepth=1', () => {
      const onTriggerAdjacent = vi.fn()
      const callbacks: BehaviorCallbacks = { onTriggerAdjacent }
      const behaviors: ModifierBehavior[] = [{ type: 'trigger_adjacent' }]

      const result = BehaviorExecutor.execute(behaviors, 3, callbacks)
      expect(onTriggerAdjacent).not.toHaveBeenCalled()
      expect(result.skippedByDepth).toBe(1)
      expect(result.executedCount).toBe(0)
    })

    it('无回调 → 跳过', () => {
      const behaviors: ModifierBehavior[] = [{ type: 'trigger_adjacent' }]
      const result = BehaviorExecutor.execute(behaviors, 0)
      expect(result.executedCount).toBe(0)
    })

    it('多个 PipelineResults → 逐个递归处理', () => {
      const onBuffNextSkill = vi.fn()
      const onTriggerAdjacent = vi.fn().mockReturnValue([
        emptyPipelineResult([{ type: 'buff_next_skill', multiplier: 1.5 }]),
        emptyPipelineResult([{ type: 'buff_next_skill', multiplier: 2.0 }]),
        emptyPipelineResult(),
      ])
      const callbacks: BehaviorCallbacks = { onTriggerAdjacent, onBuffNextSkill }
      const behaviors: ModifierBehavior[] = [{ type: 'trigger_adjacent' }]

      const result = BehaviorExecutor.execute(behaviors, 0, callbacks)
      expect(onBuffNextSkill).toHaveBeenCalledTimes(2)
      expect(onBuffNextSkill).toHaveBeenCalledWith(1.5)
      expect(onBuffNextSkill).toHaveBeenCalledWith(2.0)
      // trigger_adjacent(1) + buff(1) + buff(1) = 3
      expect(result.executedCount).toBe(3)
    })

    it('递归处理返回的 pendingBehaviors', () => {
      const onBuffNextSkill = vi.fn()
      const onTriggerAdjacent = vi.fn().mockReturnValue([
        emptyPipelineResult([{ type: 'buff_next_skill', multiplier: 1.5 }]),
      ])
      const callbacks: BehaviorCallbacks = { onTriggerAdjacent, onBuffNextSkill }
      const behaviors: ModifierBehavior[] = [{ type: 'trigger_adjacent' }]

      const result = BehaviorExecutor.execute(behaviors, 0, callbacks)
      expect(onTriggerAdjacent).toHaveBeenCalledWith(0)
      expect(onBuffNextSkill).toHaveBeenCalledWith(1.5)
      // trigger_adjacent(1) + buff_next_skill(1) = 2
      expect(result.executedCount).toBe(2)
    })
  })

  // === trigger_skill ===
  describe('trigger_skill', () => {
    it('深度 0 → 调用 onTriggerSkill(targetId, 0), 递归处理子行为', () => {
      const onTriggerSkill = vi.fn().mockReturnValue(emptyPipelineResult())
      const callbacks: BehaviorCallbacks = { onTriggerSkill }
      const behaviors: ModifierBehavior[] = [{ type: 'trigger_skill', targetSkillId: 'skill:burst' }]

      const result = BehaviorExecutor.execute(behaviors, 0, callbacks)
      expect(onTriggerSkill).toHaveBeenCalledWith('skill:burst', 0)
      expect(result.executedCount).toBe(1)
    })

    it('返回 null → 技能不存在，跳过', () => {
      const onTriggerSkill = vi.fn().mockReturnValue(null)
      const callbacks: BehaviorCallbacks = { onTriggerSkill }
      const behaviors: ModifierBehavior[] = [{ type: 'trigger_skill', targetSkillId: 'skill:none' }]

      const result = BehaviorExecutor.execute(behaviors, 0, callbacks)
      expect(onTriggerSkill).toHaveBeenCalledWith('skill:none', 0)
      expect(result.executedCount).toBe(0)
    })

    it('深度 >= MAX_DEPTH → skippedByDepth=1', () => {
      const onTriggerSkill = vi.fn()
      const callbacks: BehaviorCallbacks = { onTriggerSkill }
      const behaviors: ModifierBehavior[] = [{ type: 'trigger_skill', targetSkillId: 'skill:burst' }]

      const result = BehaviorExecutor.execute(behaviors, 3, callbacks)
      expect(onTriggerSkill).not.toHaveBeenCalled()
      expect(result.skippedByDepth).toBe(1)
      expect(result.executedCount).toBe(0)
    })

    it('无回调 → 跳过', () => {
      const behaviors: ModifierBehavior[] = [{ type: 'trigger_skill', targetSkillId: 'skill:burst' }]
      const result = BehaviorExecutor.execute(behaviors, 0)
      expect(result.executedCount).toBe(0)
    })

    it('返回含非触发类子行为 → 递归处理 buff_next_skill', () => {
      const onBuffNextSkill = vi.fn()
      const onTriggerSkill = vi.fn().mockReturnValue(
        emptyPipelineResult([{ type: 'buff_next_skill', multiplier: 1.8 }]),
      )
      const callbacks: BehaviorCallbacks = { onTriggerSkill, onBuffNextSkill }
      const behaviors: ModifierBehavior[] = [{ type: 'trigger_skill', targetSkillId: 'skill:echo' }]

      const result = BehaviorExecutor.execute(behaviors, 0, callbacks)
      expect(onTriggerSkill).toHaveBeenCalledWith('skill:echo', 0)
      expect(onBuffNextSkill).toHaveBeenCalledWith(1.8)
      // trigger_skill(1) + buff_next_skill(1) = 2
      expect(result.executedCount).toBe(2)
    })
  })

  // === combo_protect ===
  describe('combo_protect', () => {
    it('有回调 → onComboProtect 被调用, executedCount=1', () => {
      const onComboProtect = vi.fn().mockReturnValue(true)
      const callbacks: BehaviorCallbacks = { onComboProtect }
      const behaviors: ModifierBehavior[] = [{ type: 'combo_protect', probability: 0.5 }]

      const result = BehaviorExecutor.execute(behaviors, 0, callbacks)
      expect(onComboProtect).toHaveBeenCalledWith(0.5)
      expect(result.executedCount).toBe(1)
    })

    it('无回调 → 跳过, executedCount=0', () => {
      const behaviors: ModifierBehavior[] = [{ type: 'combo_protect', probability: 0.5 }]
      const result = BehaviorExecutor.execute(behaviors, 0)
      expect(result.executedCount).toBe(0)
    })

    it('combo_protect 不受深度限制', () => {
      const onComboProtect = vi.fn().mockReturnValue(false)
      const callbacks: BehaviorCallbacks = { onComboProtect }
      const behaviors: ModifierBehavior[] = [{ type: 'combo_protect', probability: 0.3 }]

      const result = BehaviorExecutor.execute(behaviors, 3, callbacks)
      expect(onComboProtect).toHaveBeenCalledWith(0.3)
      expect(result.executedCount).toBe(1)
      expect(result.skippedByDepth).toBe(0)
    })
  })

  // === 链式递归 ===
  describe('链式递归', () => {
    it('trigger_adjacent 返回含 trigger_skill → 深度递增', () => {
      const onTriggerSkill = vi.fn().mockReturnValue(emptyPipelineResult())
      const onTriggerAdjacent = vi.fn().mockReturnValue([
        emptyPipelineResult([{ type: 'trigger_skill', targetSkillId: 'skill:echo' }]),
      ])
      const callbacks: BehaviorCallbacks = { onTriggerAdjacent, onTriggerSkill }
      const behaviors: ModifierBehavior[] = [{ type: 'trigger_adjacent' }]

      const result = BehaviorExecutor.execute(behaviors, 0, callbacks)
      expect(onTriggerAdjacent).toHaveBeenCalledWith(0)
      expect(onTriggerSkill).toHaveBeenCalledWith('skill:echo', 1)
      // trigger_adjacent(1) + trigger_skill(1) = 2
      expect(result.executedCount).toBe(2)
      // depth 0: trigger_adjacent → depth 1: trigger_skill → chainDepthReached = 2
      expect(result.chainDepthReached).toBe(2)
    })

    it('三层链式在 depth=3 截断', () => {
      // depth=0: trigger_adjacent → returns trigger_adjacent
      // depth=1: trigger_adjacent → returns trigger_adjacent
      // depth=2: trigger_adjacent → returns trigger_adjacent
      // depth=3: trigger_adjacent → skipped (MAX_DEPTH)
      const onTriggerAdjacent = vi.fn()
        .mockReturnValueOnce([emptyPipelineResult([{ type: 'trigger_adjacent' }])])
        .mockReturnValueOnce([emptyPipelineResult([{ type: 'trigger_adjacent' }])])
        .mockReturnValueOnce([emptyPipelineResult([{ type: 'trigger_adjacent' }])])

      const callbacks: BehaviorCallbacks = { onTriggerAdjacent }
      const behaviors: ModifierBehavior[] = [{ type: 'trigger_adjacent' }]

      const result = BehaviorExecutor.execute(behaviors, 0, callbacks)
      expect(onTriggerAdjacent).toHaveBeenCalledTimes(3) // depth 0, 1, 2
      // depth 0: executed, depth 1: executed, depth 2: executed, depth 3: skipped
      expect(result.executedCount).toBe(3)
      expect(result.skippedByDepth).toBe(1)
      expect(result.chainDepthReached).toBe(3)
    })
  })

  // === 混合队列 ===
  describe('混合队列', () => {
    it('[buff_next_skill, trigger_adjacent, intercept] → buff 执行, trigger 执行, intercept 跳过', () => {
      const onBuffNextSkill = vi.fn()
      const onTriggerAdjacent = vi.fn().mockReturnValue([emptyPipelineResult()])
      const callbacks: BehaviorCallbacks = { onBuffNextSkill, onTriggerAdjacent }
      const behaviors: ModifierBehavior[] = [
        { type: 'buff_next_skill', multiplier: 1.5 },
        { type: 'trigger_adjacent' },
        { type: 'intercept' },
      ]

      const result = BehaviorExecutor.execute(behaviors, 0, callbacks)
      expect(onBuffNextSkill).toHaveBeenCalledWith(1.5)
      expect(onTriggerAdjacent).toHaveBeenCalledWith(0)
      expect(result.executedCount).toBe(2) // buff + trigger
      expect(result.skippedByDepth).toBe(0)
    })
  })

  // === chainDepthReached 追踪 ===
  describe('chainDepthReached', () => {
    it('无链式触发 → chainDepthReached = 传入的 depth', () => {
      const result = BehaviorExecutor.execute([], 0)
      expect(result.chainDepthReached).toBe(0)
    })

    it('一层链式 → chainDepthReached = 1', () => {
      const onTriggerSkill = vi.fn().mockReturnValue(emptyPipelineResult())
      const callbacks: BehaviorCallbacks = { onTriggerSkill }
      const behaviors: ModifierBehavior[] = [{ type: 'trigger_skill', targetSkillId: 'skill:a' }]

      const result = BehaviorExecutor.execute(behaviors, 0, callbacks)
      expect(result.chainDepthReached).toBe(1)
    })

    it('多层链式 → chainDepthReached = 最大深度', () => {
      const onTriggerSkill = vi.fn()
        .mockReturnValueOnce(emptyPipelineResult([
          { type: 'trigger_skill', targetSkillId: 'skill:b' },
        ]))
        .mockReturnValueOnce(emptyPipelineResult())

      const callbacks: BehaviorCallbacks = { onTriggerSkill }
      const behaviors: ModifierBehavior[] = [{ type: 'trigger_skill', targetSkillId: 'skill:a' }]

      const result = BehaviorExecutor.execute(behaviors, 0, callbacks)
      // depth 0: trigger skill:a → depth 1: trigger skill:b → depth 2: empty
      expect(result.chainDepthReached).toBe(2)
    })
  })
})
