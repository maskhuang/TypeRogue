// ============================================
// 打字肉鸽 - RelicEffects 遗物效果处理器
// ============================================
// Story 5.4 Task 3: 遗物效果处理器

import type {
  RelicData,
  RelicEffect,
  RelicEffectType,
  RelicModifiers
} from './RelicTypes'
import { createDefaultModifiers } from './RelicTypes'

/**
 * 战斗上下文（用于条件判断）
 */
export interface BattleContext {
  combo: number
  score: number
  timeRemaining: number
  hasError: boolean
}

/**
 * 创建默认战斗上下文
 */
export function createDefaultContext(): BattleContext {
  return {
    combo: 0,
    score: 0,
    timeRemaining: 0,
    hasError: false
  }
}

/**
 * 遗物效果处理器
 *
 * 职责:
 * - 计算指定触发类型的遗物效果
 * - 处理条件效果判断
 * - 合并多个遗物的效果
 */
export class RelicEffects {
  /**
   * 计算指定触发类型的效果
   * @param relics 玩家拥有的遗物
   * @param triggerType 触发类型
   * @param context 战斗上下文（用于条件判断）
   */
  static calculate(
    relics: RelicData[],
    triggerType: RelicEffectType,
    context?: BattleContext
  ): RelicModifiers {
    const modifiers = createDefaultModifiers()

    for (const relic of relics) {
      for (const effect of relic.effects) {
        // 检查触发类型匹配
        // passive 类型在任何 triggerType 下都应该被计算（除了特定触发器）
        const isPassive = effect.type === 'passive'
        const isMatchingTrigger = effect.type === triggerType

        if (!isPassive && !isMatchingTrigger) {
          continue
        }

        // 检查条件
        if (effect.condition && context) {
          if (!this.checkCondition(effect, context)) {
            continue
          }
        }

        // 应用效果
        this.applyEffect(modifiers, effect)
      }
    }

    return modifiers
  }

  /**
   * 检查效果条件是否满足
   */
  static checkCondition(
    effect: RelicEffect,
    context: BattleContext
  ): boolean {
    if (!effect.condition) return true

    const { type, threshold } = effect.condition

    switch (type) {
      case 'combo_threshold':
        // 特殊值 -1 表示无断连（战斗中无错误）
        if (threshold === -1) {
          return !context.hasError
        }
        return context.combo >= threshold

      case 'score_threshold':
        return context.score >= threshold

      case 'time_remaining':
        return context.timeRemaining >= threshold

      default:
        return true
    }
  }

  /**
   * 应用单个效果到修改器
   */
  static applyEffect(
    modifiers: RelicModifiers,
    effect: RelicEffect
  ): void {
    switch (effect.modifier) {
      case 'time_bonus':
        modifiers.timeBonus += effect.value
        break

      case 'score_multiplier':
        // 倍率是加法叠加 (1 + 0.3 + 0.25 = 1.55)
        modifiers.scoreMultiplier += effect.value
        break

      case 'gold_multiplier':
        // 金币倍率是乘法叠加 (1 × 1.25 × 1.5 = 1.875)
        modifiers.goldMultiplier *= effect.value
        break

      case 'combo_protection':
        // 保护概率取最高值（不叠加）
        modifiers.comboProtectionChance = Math.max(
          modifiers.comboProtectionChance,
          effect.value
        )
        break

      case 'skill_effect_bonus':
        modifiers.skillEffectBonus += effect.value
        break

      case 'price_discount':
        // 折扣叠加，但上限 50%
        modifiers.priceDiscount = Math.min(0.5, modifiers.priceDiscount + effect.value)
        break

      case 'word_score_bonus':
        modifiers.wordScoreBonus += effect.value
        break

      case 'multiplier_per_combo':
        modifiers.multiplierPerCombo += effect.value
        break

      case 'gold_flat':
        modifiers.goldFlat += effect.value
        break
    }
  }

  /**
   * 计算连击保护是否生效
   * @param chance 保护概率 (0-1)
   * @returns 是否保护成功
   */
  static rollComboProtection(chance: number): boolean {
    if (chance <= 0) return false
    if (chance >= 1) return true
    return Math.random() < chance
  }

  /**
   * 合并两个修改器
   */
  static mergeModifiers(
    base: RelicModifiers,
    additional: RelicModifiers
  ): RelicModifiers {
    return {
      timeBonus: base.timeBonus + additional.timeBonus,
      scoreMultiplier: base.scoreMultiplier + additional.scoreMultiplier - 1, // 减1避免重复计算基础值
      goldMultiplier: base.goldMultiplier * additional.goldMultiplier,
      comboProtectionChance: Math.max(
        base.comboProtectionChance,
        additional.comboProtectionChance
      ),
      skillEffectBonus: base.skillEffectBonus + additional.skillEffectBonus,
      priceDiscount: Math.min(0.5, base.priceDiscount + additional.priceDiscount),
      wordScoreBonus: base.wordScoreBonus + additional.wordScoreBonus,
      multiplierPerCombo: base.multiplierPerCombo + additional.multiplierPerCombo,
      goldFlat: base.goldFlat + additional.goldFlat
    }
  }
}
