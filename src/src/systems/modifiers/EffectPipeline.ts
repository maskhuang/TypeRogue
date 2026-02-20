// ============================================
// 打字肉鸽 - EffectPipeline 三层计算管道
// ============================================
// Story 11.2: before → calculate → after 三阶段处理
// Story 11.3: 条件评估集成

import type {
  ModifierTrigger,
  ModifierEffectType,
  EffectAccumulator,
  PipelineResult,
  PipelineContext,
} from './ModifierTypes'
import type { ModifierRegistry } from './ModifierRegistry'
import { ConditionEvaluator } from './ConditionEvaluator'

const EFFECT_TYPES: ModifierEffectType[] = ['score', 'multiply', 'time', 'gold', 'shield']

function createEmptyAccumulator(): EffectAccumulator {
  return { score: 0, multiply: 0, time: 0, gold: 0, shield: 0 }
}

/**
 * 三层效果计算管道
 *
 * Phase 1 (before): 拦截检查 — 任一 intercept 行为终止事件
 * Phase 2 (calculate): 三层数值计算 — Σ(base) × Π(enhance) × Π(global)
 * Phase 3 (after): 收集待执行行为（echo, ripple 等）
 */
export class EffectPipeline {
  static resolve(
    registry: ModifierRegistry,
    trigger: ModifierTrigger,
    context?: PipelineContext,
  ): PipelineResult {
    // === Phase 1: BEFORE — 拦截检查 ===
    const beforeMods = registry.getByTrigger(trigger, 'before')
    for (const mod of beforeMods) {
      if (mod.condition && !ConditionEvaluator.evaluate(mod.condition, context)) continue
      if (mod.behavior?.type === 'intercept') {
        return {
          intercepted: true,
          effects: createEmptyAccumulator(),
          pendingBehaviors: [],
        }
      }
    }

    // === Phase 2: CALCULATE — 三层数值计算 ===
    const calcMods = registry.getByTrigger(trigger, 'calculate')
    const effects = createEmptyAccumulator()

    for (const effectType of EFFECT_TYPES) {
      let baseSum = 0
      let enhanceProduct = 1
      let globalProduct = 1

      for (const mod of calcMods) {
        if (mod.effect?.type !== effectType) continue
        if (mod.condition && !ConditionEvaluator.evaluate(mod.condition, context)) continue

        switch (mod.layer) {
          case 'base':
            baseSum += mod.effect.value
            break
          case 'enhance':
            enhanceProduct *= mod.effect.value
            break
          case 'global':
            globalProduct *= mod.effect.value
            break
        }
      }

      effects[effectType] = baseSum * enhanceProduct * globalProduct
    }

    // === Phase 3: AFTER — 收集待执行行为 ===
    const afterMods = registry.getByTrigger(trigger, 'after')
    const pendingBehaviors = afterMods
      .filter(mod => mod.behavior != null && (!mod.condition || ConditionEvaluator.evaluate(mod.condition, context)))
      .map(mod => mod.behavior!)

    return { intercepted: false, effects, pendingBehaviors }
  }
}
