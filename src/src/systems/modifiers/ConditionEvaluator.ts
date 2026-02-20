// ============================================
// 打字肉鸽 - ConditionEvaluator 条件评估器
// ============================================
// Story 11.3: 12 种条件原语评估

import type { ModifierCondition, PipelineContext } from './ModifierTypes'

/**
 * 条件评估器 — 纯函数，无副作用
 *
 * 评估 ModifierCondition 是否在给定 PipelineContext 下满足。
 * 无条件的修饰器始终生效（condition=undefined → true）。
 */
export class ConditionEvaluator {
  static evaluate(condition: ModifierCondition | undefined, context?: PipelineContext): boolean {
    if (!condition) return true

    const ctx = context ?? {}

    switch (condition.type) {
      // === 战斗状态 ===
      case 'combo_gte':
        return (ctx.combo ?? 0) >= condition.value
      case 'combo_lte':
        return (ctx.combo ?? 0) <= condition.value
      case 'no_errors':
        return !(ctx.hasError ?? false)
      case 'random':
        return Math.random() < condition.probability

      // === 位置 ===
      case 'adjacent_skills_gte':
        return (ctx.adjacentSkillCount ?? 0) >= condition.value
      case 'adjacent_empty_gte':
        return (ctx.adjacentEmptyCount ?? 0) >= condition.value
      case 'adjacent_has_type':
        return (ctx.adjacentSkillTypes ?? []).includes(condition.skillType)

      // === 词语 ===
      case 'word_length_gte':
        return (ctx.currentWord ?? '').length >= condition.value
      case 'word_length_lte':
        return (ctx.currentWord ?? '').length <= condition.value
      case 'word_has_letter':
        return (ctx.currentWord ?? '').includes(condition.letter)

      // === 上下文 ===
      case 'skills_triggered_this_word':
        return (ctx.skillsTriggeredThisWord ?? 0) === condition.value
      case 'nth_word': {
        const wn = ctx.wordNumber ?? 0
        return wn > 0 && wn % condition.value === 0
      }
    }
  }
}
