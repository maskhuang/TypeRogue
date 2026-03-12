// ============================================
// 打字肉鸽 - BehaviorExecutor 行为处理器
// ============================================
// Story 11.4: 回调驱动的行为执行

import type {
  ModifierBehavior,
  BehaviorCallbacks,
} from './ModifierTypes'

/**
 * 行为处理器 — 执行 EffectPipeline 收集的 pendingBehaviors
 *
 * - intercept: 跳过（已在 EffectPipeline Phase 1 处理）
 * - buff_next_skill: 通过回调通知调用方设置临时增益
 */
export class BehaviorExecutor {
  static execute(
    behaviors: ModifierBehavior[],
    callbacks?: BehaviorCallbacks,
  ): number {
    let executedCount = 0

    for (const behavior of behaviors) {
      switch (behavior.type) {
        case 'intercept':
          // 已在 EffectPipeline Phase 1 处理，此处跳过
          break

        case 'buff_next_skill':
          if (callbacks?.onBuffNextSkill) {
            callbacks.onBuffNextSkill(behavior.multiplier)
            executedCount++
          }
          break

        case 'combo_protect':
          if (callbacks?.onComboProtect) {
            callbacks.onComboProtect(behavior.probability)
            executedCount++
          }
          break

        case 'set_echo_flag':
          if (callbacks?.onSetEchoFlag) {
            callbacks.onSetEchoFlag()
            executedCount++
          }
          break

        case 'set_ripple_flag':
          if (callbacks?.onSetRippleFlag) {
            callbacks.onSetRippleFlag()
            executedCount++
          }
          break

        case 'pulse_counter':
          if (callbacks?.onPulseCounter) {
            callbacks.onPulseCounter(behavior.timeBonus)
            executedCount++
          }
          break

        case 'amplify_chain':
          if (callbacks?.onAmplifyChain) {
            callbacks.onAmplifyChain()
            executedCount++
          }
          break

        case 'instant_fail':
          if (callbacks?.onInstantFail) {
            callbacks.onInstantFail()
            executedCount++
          }
          break

        case 'time_steal':
          if (callbacks?.onTimeSteal) {
            callbacks.onTimeSteal(behavior.timeBonus)
            executedCount++
          }
          break

        case 'remove_relic':
          if (callbacks?.onRemoveRelic) {
            callbacks.onRemoveRelic(behavior.relicId)
            executedCount++
          }
          break

        case 'time_refund':
          if (callbacks?.onTimeRefund) {
            callbacks.onTimeRefund(behavior.ratio)
            executedCount++
          }
          break

        // 进化系统行为 (Story 15.2)
        case 'restore_combo':
          if (callbacks?.onRestoreCombo) {
            callbacks.onRestoreCombo(behavior.triggerEvery)
            executedCount++
          }
          break

        case 'set_word_cooldown':
          if (callbacks?.onSetWordCooldown) {
            callbacks.onSetWordCooldown()
            executedCount++
          }
          break

        // T3 重触发遗物 (Story 29.1)
        case 'retrigger':
          if (callbacks?.onRetrigger) {
            callbacks.onRetrigger()
            executedCount++
          }
          break
      }
    }

    return executedCount
  }
}
