// ============================================
// 打字肉鸽 - BehaviorExecutor 行为处理器
// ============================================
// Story 11.4: 回调驱动的行为执行，链式深度限制

import type {
  ModifierBehavior,
  BehaviorCallbacks,
  BehaviorExecutionResult,
} from './ModifierTypes'

/**
 * 行为处理器 — 执行 EffectPipeline 收集的 pendingBehaviors
 *
 * - intercept: 跳过（已在 EffectPipeline Phase 1 处理）
 * - trigger_adjacent / trigger_skill: 通过回调触发，递归处理链式行为
 * - buff_next_skill: 通过回调通知调用方设置临时增益
 * - 链式触发深度限制: depth >= MAX_DEPTH 时跳过触发类行为
 */
export class BehaviorExecutor {
  static readonly MAX_DEPTH = 3

  static execute(
    behaviors: ModifierBehavior[],
    depth: number,
    callbacks?: BehaviorCallbacks,
  ): BehaviorExecutionResult {
    const result: BehaviorExecutionResult = {
      executedCount: 0,
      skippedByDepth: 0,
      chainDepthReached: depth,
    }

    for (const behavior of behaviors) {
      switch (behavior.type) {
        case 'intercept':
          // 已在 EffectPipeline Phase 1 处理，此处跳过
          break

        case 'trigger_adjacent': {
          if (depth >= BehaviorExecutor.MAX_DEPTH) {
            result.skippedByDepth++
            break
          }
          const adjacentResults = callbacks?.onTriggerAdjacent?.(depth)
          if (!adjacentResults) break
          result.executedCount++
          result.chainDepthReached = Math.max(result.chainDepthReached, depth + 1)
          for (const pr of adjacentResults) {
            if (pr.pendingBehaviors.length > 0) {
              const sub = BehaviorExecutor.execute(pr.pendingBehaviors, depth + 1, callbacks)
              result.executedCount += sub.executedCount
              result.skippedByDepth += sub.skippedByDepth
              result.chainDepthReached = Math.max(result.chainDepthReached, sub.chainDepthReached)
            }
          }
          break
        }

        case 'trigger_skill': {
          if (depth >= BehaviorExecutor.MAX_DEPTH) {
            result.skippedByDepth++
            break
          }
          const skillResult = callbacks?.onTriggerSkill?.(behavior.targetSkillId, depth)
          if (!skillResult) break
          result.executedCount++
          result.chainDepthReached = Math.max(result.chainDepthReached, depth + 1)
          if (skillResult.pendingBehaviors.length > 0) {
            const sub = BehaviorExecutor.execute(skillResult.pendingBehaviors, depth + 1, callbacks)
            result.executedCount += sub.executedCount
            result.skippedByDepth += sub.skippedByDepth
            result.chainDepthReached = Math.max(result.chainDepthReached, sub.chainDepthReached)
          }
          break
        }

        case 'buff_next_skill':
          if (callbacks?.onBuffNextSkill) {
            callbacks.onBuffNextSkill(behavior.multiplier)
            result.executedCount++
          }
          break

        case 'combo_protect':
          if (callbacks?.onComboProtect) {
            callbacks.onComboProtect(behavior.probability)
            result.executedCount++
          }
          break

        case 'set_echo_flag':
          if (callbacks?.onSetEchoFlag) {
            callbacks.onSetEchoFlag()
            result.executedCount++
          }
          break

        case 'set_ripple_flag':
          if (callbacks?.onSetRippleFlag) {
            callbacks.onSetRippleFlag()
            result.executedCount++
          }
          break

        case 'pulse_counter':
          if (callbacks?.onPulseCounter) {
            callbacks.onPulseCounter(behavior.timeBonus)
            result.executedCount++
          }
          break

        case 'restore_shield':
          if (callbacks?.onRestoreShield) {
            callbacks.onRestoreShield(behavior.amount)
            result.executedCount++
          }
          break

        case 'trigger_row_mirror': {
          if (depth >= BehaviorExecutor.MAX_DEPTH) {
            result.skippedByDepth++
            break
          }
          const mirrorResult = callbacks?.onTriggerRowMirror?.(depth)
          if (!mirrorResult) break
          result.executedCount++
          result.chainDepthReached = Math.max(result.chainDepthReached, depth + 1)
          if (mirrorResult.pendingBehaviors.length > 0) {
            const sub = BehaviorExecutor.execute(mirrorResult.pendingBehaviors, depth + 1, callbacks)
            result.executedCount += sub.executedCount
            result.skippedByDepth += sub.skippedByDepth
            result.chainDepthReached = Math.max(result.chainDepthReached, sub.chainDepthReached)
          }
          break
        }
      }
    }

    return result
  }
}
