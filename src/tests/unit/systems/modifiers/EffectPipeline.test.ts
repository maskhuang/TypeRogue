// ============================================
// 打字肉鸽 - EffectPipeline 单元测试
// ============================================
// Story 11.2: 三层计算管道

import { describe, it, expect, beforeEach } from 'vitest'
import { ModifierRegistry } from '../../../../src/systems/modifiers/ModifierRegistry'
import { EffectPipeline } from '../../../../src/systems/modifiers/EffectPipeline'
import type { Modifier } from '../../../../src/systems/modifiers/ModifierTypes'

// === 测试工厂函数 ===
function createTestModifier(overrides: Partial<Modifier> = {}): Modifier {
  return {
    id: 'test:mod:1',
    source: 'test:mod',
    sourceType: 'skill',
    layer: 'base',
    trigger: 'on_skill_trigger',
    phase: 'calculate',
    priority: 100,
    effect: { type: 'score', value: 5, stacking: 'additive' },
    ...overrides,
  }
}

describe('EffectPipeline', () => {
  let registry: ModifierRegistry

  beforeEach(() => {
    registry = new ModifierRegistry()
  })

  // === 空 registry ===
  describe('空 registry', () => {
    it('应该返回零值结果，intercepted=false', () => {
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
      expect(result.intercepted).toBe(false)
      expect(result.effects.score).toBe(0)
      expect(result.effects.multiply).toBe(0)
      expect(result.effects.time).toBe(0)
      expect(result.effects.gold).toBe(0)
      expect(result.effects.shield).toBe(0)
      expect(result.pendingBehaviors).toEqual([])
    })
  })

  // === 纯 base 层 ===
  describe('纯 base 层', () => {
    it('单个 score 效果', () => {
      registry.register(createTestModifier({
        id: 'skill:burst:score',
        effect: { type: 'score', value: 5, stacking: 'additive' },
      }))
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
      expect(result.effects.score).toBe(5)
    })

    it('多个 score 效果加法叠加', () => {
      registry.register(createTestModifier({
        id: 'skill:burst:score',
        effect: { type: 'score', value: 5, stacking: 'additive' },
      }))
      registry.register(createTestModifier({
        id: 'skill:lone:score',
        effect: { type: 'score', value: 8, stacking: 'additive' },
      }))
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
      expect(result.effects.score).toBe(13)
    })
  })

  // === base + enhance ===
  describe('base + enhance 两层', () => {
    it('base Σ=15，enhance ×1.5 → 最终 22.5', () => {
      registry.register(createTestModifier({
        id: 'skill:burst:score',
        layer: 'base',
        effect: { type: 'score', value: 10, stacking: 'additive' },
      }))
      registry.register(createTestModifier({
        id: 'skill:lone:score',
        layer: 'base',
        effect: { type: 'score', value: 5, stacking: 'additive' },
      }))
      registry.register(createTestModifier({
        id: 'passive:aura:score',
        layer: 'enhance',
        effect: { type: 'score', value: 1.5, stacking: 'multiplicative' },
      }))
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
      expect(result.effects.score).toBe(22.5)
    })
  })

  // === 三层叠加 ===
  describe('三层叠加', () => {
    it('base Σ=10，enhance ×2，global ×1.5 → 最终 30', () => {
      registry.register(createTestModifier({
        id: 'skill:burst:score',
        layer: 'base',
        effect: { type: 'score', value: 10, stacking: 'additive' },
      }))
      registry.register(createTestModifier({
        id: 'passive:aura:score',
        layer: 'enhance',
        effect: { type: 'score', value: 2, stacking: 'multiplicative' },
      }))
      registry.register(createTestModifier({
        id: 'relic:magnet:score',
        layer: 'global',
        effect: { type: 'score', value: 1.5, stacking: 'multiplicative' },
      }))
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
      expect(result.effects.score).toBe(30)
    })

    it('多个 enhance 乘法累积', () => {
      registry.register(createTestModifier({
        id: 'skill:burst:score',
        layer: 'base',
        effect: { type: 'score', value: 10, stacking: 'additive' },
      }))
      registry.register(createTestModifier({
        id: 'passive:aura:score',
        layer: 'enhance',
        effect: { type: 'score', value: 1.5, stacking: 'multiplicative' },
      }))
      registry.register(createTestModifier({
        id: 'passive:core:score',
        layer: 'enhance',
        effect: { type: 'score', value: 2, stacking: 'multiplicative' },
      }))
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
      // 10 * 1.5 * 2 = 30
      expect(result.effects.score).toBe(30)
    })
  })

  // === 拦截终止 ===
  describe('拦截终止 (before phase)', () => {
    it('before 阶段有 intercept → intercepted=true，effects 全为零', () => {
      registry.register(createTestModifier({
        id: 'skill:shield:intercept',
        phase: 'before',
        layer: 'base',
        effect: undefined,
        behavior: { type: 'intercept' },
      }))
      registry.register(createTestModifier({
        id: 'skill:burst:score',
        phase: 'calculate',
        layer: 'base',
        effect: { type: 'score', value: 10, stacking: 'additive' },
      }))
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
      expect(result.intercepted).toBe(true)
      expect(result.effects.score).toBe(0)
      expect(result.pendingBehaviors).toEqual([])
    })

    it('before 阶段无 intercept 行为 → 不拦截', () => {
      registry.register(createTestModifier({
        id: 'passive:before:buff',
        phase: 'before',
        layer: 'base',
        effect: undefined,
        behavior: { type: 'buff_next_skill', multiplier: 1.5 },
      }))
      registry.register(createTestModifier({
        id: 'skill:burst:score',
        phase: 'calculate',
        layer: 'base',
        effect: { type: 'score', value: 10, stacking: 'additive' },
      }))
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
      expect(result.intercepted).toBe(false)
      expect(result.effects.score).toBe(10)
    })
  })

  // === after 阶段 ===
  describe('after 阶段 pendingBehaviors', () => {
    it('收集 after 阶段的行为修饰器', () => {
      registry.register(createTestModifier({
        id: 'skill:echo:chain',
        phase: 'after',
        layer: 'base',
        effect: undefined,
        behavior: { type: 'trigger_adjacent' },
      }))
      registry.register(createTestModifier({
        id: 'skill:ripple:buff',
        phase: 'after',
        layer: 'base',
        effect: undefined,
        behavior: { type: 'buff_next_skill', multiplier: 1.5 },
        priority: 200,
      }))
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
      expect(result.pendingBehaviors).toHaveLength(2)
      expect(result.pendingBehaviors[0]).toEqual({ type: 'trigger_adjacent' })
      expect(result.pendingBehaviors[1]).toEqual({ type: 'buff_next_skill', multiplier: 1.5 })
    })
  })

  // === 多 effect.type 独立计算 ===
  describe('多 effect.type 独立计算', () => {
    it('score 和 time 各自独立三层', () => {
      // score: base=10, enhance=×2, global=×1.5 → 30
      registry.register(createTestModifier({
        id: 'skill:burst:score',
        layer: 'base',
        effect: { type: 'score', value: 10, stacking: 'additive' },
      }))
      registry.register(createTestModifier({
        id: 'passive:aura:score',
        layer: 'enhance',
        effect: { type: 'score', value: 2, stacking: 'multiplicative' },
      }))
      registry.register(createTestModifier({
        id: 'relic:magnet:score',
        layer: 'global',
        effect: { type: 'score', value: 1.5, stacking: 'multiplicative' },
      }))
      // time: base=3, global=×2 → 6
      registry.register(createTestModifier({
        id: 'skill:freeze:time',
        layer: 'base',
        effect: { type: 'time', value: 3, stacking: 'additive' },
      }))
      registry.register(createTestModifier({
        id: 'relic:crystal:time',
        layer: 'global',
        effect: { type: 'time', value: 2, stacking: 'multiplicative' },
      }))

      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
      expect(result.effects.score).toBe(30)
      expect(result.effects.time).toBe(6)
      expect(result.effects.multiply).toBe(0) // 无 multiply 效果
      expect(result.effects.gold).toBe(0)
      expect(result.effects.shield).toBe(0)
    })
  })

  // === 无匹配 trigger ===
  describe('无匹配 trigger', () => {
    it('注册的修饰器 trigger 不匹配 → 返回零值结果', () => {
      registry.register(createTestModifier({
        id: 'skill:burst:score',
        trigger: 'on_word_complete',
        effect: { type: 'score', value: 10, stacking: 'additive' },
      }))
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
      expect(result.effects.score).toBe(0)
    })
  })

  // === 条件暂时全部通过 ===
  describe('条件处理', () => {
    it('带 condition 的 modifier 目前始终通过（不被过滤）', () => {
      registry.register(createTestModifier({
        id: 'relic:berserker:score',
        layer: 'global',
        condition: { type: 'combo_gte', value: 20 },
        effect: { type: 'score', value: 1.3, stacking: 'multiplicative' },
      }))
      registry.register(createTestModifier({
        id: 'skill:burst:score',
        layer: 'base',
        effect: { type: 'score', value: 10, stacking: 'additive' },
      }))
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
      // condition ignored, so 10 * 1.3 = 13
      expect(result.effects.score).toBe(13)
    })
  })

  // === 同时有 effect 和 behavior 的修饰器 ===
  describe('effect + behavior 共存', () => {
    it('calculate 阶段：effect 被计算，behavior 被忽略（设计意图）', () => {
      registry.register(createTestModifier({
        id: 'skill:burst:combo',
        phase: 'calculate',
        layer: 'base',
        effect: { type: 'score', value: 10, stacking: 'additive' },
        behavior: { type: 'trigger_adjacent' },
      }))
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
      expect(result.effects.score).toBe(10)
      expect(result.pendingBehaviors).toEqual([]) // calculate 阶段的 behavior 不收集
    })
  })

  // === 多个 before 修饰器混合 intercept ===
  describe('多个 before 修饰器', () => {
    it('非 intercept 在前，intercept 在后 → 仍然拦截', () => {
      registry.register(createTestModifier({
        id: 'passive:before:buff',
        phase: 'before',
        layer: 'base',
        effect: undefined,
        behavior: { type: 'buff_next_skill', multiplier: 1.5 },
        priority: 10,
      }))
      registry.register(createTestModifier({
        id: 'skill:shield:intercept',
        phase: 'before',
        layer: 'base',
        effect: undefined,
        behavior: { type: 'intercept' },
        priority: 20,
      }))
      registry.register(createTestModifier({
        id: 'skill:burst:score',
        phase: 'calculate',
        layer: 'base',
        effect: { type: 'score', value: 10, stacking: 'additive' },
      }))
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
      expect(result.intercepted).toBe(true)
      expect(result.effects.score).toBe(0)
    })
  })

  // === 无 base 效果时结果为零 ===
  describe('边缘情况', () => {
    it('只有 enhance/global 无 base → 结果为零', () => {
      registry.register(createTestModifier({
        id: 'passive:aura:score',
        layer: 'enhance',
        effect: { type: 'score', value: 2, stacking: 'multiplicative' },
      }))
      registry.register(createTestModifier({
        id: 'relic:magnet:score',
        layer: 'global',
        effect: { type: 'score', value: 1.5, stacking: 'multiplicative' },
      }))
      const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
      expect(result.effects.score).toBe(0) // 0 * 2 * 1.5 = 0
    })
  })
})
