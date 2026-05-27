// ============================================
// 打字肉鸽 - LetterFrequencySystem 字频系统
// ============================================
// Story 16.1: 字频解锁
// 词语效果系统: 效果词字母产出加成

import type { Modifier, ModifierEffectType } from '../modifiers/ModifierTypes'
import type { WordEffect } from '../../core/types'

/** 字频解锁阈值：字母出现 ≥ 此值即解锁格子 */
export const FREQ_UNLOCK_THRESHOLD = 1

/**
 * 计算词库中各字母的出现频率
 * @param words 词库中的词语列表
 * @returns Map<字母, 出现次数>
 */
export function calculateLetterFrequency(words: string[]): Map<string, number> {
  const freq = new Map<string, number>()
  for (const word of words) {
    for (const char of word.toLowerCase()) {
      if (char >= 'a' && char <= 'z') {
        freq.set(char, (freq.get(char) ?? 0) + 1)
      }
    }
  }
  return freq
}

/**
 * 计算每个字母的"额外底分"显示值（与商店键盘 slot 同款公式）
 * base_score 在词内按独特字母分摊，base_multiplier 仅锁定 targetLetter；
 * 显示值 = round((1 + sum) * mult - 1)，0 不进 Map。
 */
export function calculateLetterScores(wordEffects: Map<string, WordEffect>): Map<string, number> {
  const scoreSums = new Map<string, number>()
  const multProducts = new Map<string, number>()

  for (const [word, effect] of wordEffects) {
    if (effect.type === 'base_score') {
      if (effect.targetLetter) {
        const k = effect.targetLetter.toLowerCase()
        scoreSums.set(k, (scoreSums.get(k) ?? 0) + effect.value)
      } else {
        const unique = new Set(word.toLowerCase())
        for (const k of unique) {
          scoreSums.set(k, (scoreSums.get(k) ?? 0) + effect.value)
        }
      }
    } else if (effect.type === 'base_multiplier' && effect.targetLetter) {
      const k = effect.targetLetter.toLowerCase()
      multProducts.set(k, (multProducts.get(k) ?? 1) * effect.value)
    }
  }

  const result = new Map<string, number>()
  const allKeys = new Set<string>()
  for (const k of scoreSums.keys()) allKeys.add(k)
  for (const k of multProducts.keys()) allKeys.add(k)
  for (const k of allKeys) {
    const sum = scoreSums.get(k) ?? 0
    const mult = multProducts.get(k) ?? 1
    const score = Math.round((1 + sum) * mult - 1)
    if (score !== 0) result.set(k, score)
  }
  return result
}

/**
 * 词语效果·暴击率：所有 type==='crit' 的词效，对「包含该 key 的词」累加 value。
 * 返回值 = 绑定在该键上的技能 fire 时的额外暴击率（与 crit_chance_add aura 同口径，0.01 = 1%）。
 * 多张含此字母的暴击词会叠加。
 */
export function getWordEffectCritRate(wordEffects: Map<string, WordEffect>, key: string): number {
  const k = key.toLowerCase()
  if (k < 'a' || k > 'z') return 0
  let total = 0
  for (const [word, effect] of wordEffects) {
    if (effect.type !== 'crit') continue
    if (word.toLowerCase().includes(k)) total += effect.value
  }
  return total
}

/**
 * 词语效果·目标分数减免：累加所有 type==='target_reduce' 的 value（小数，0.02 = 2%）。
 * 在每关目标分数结算时按此比例下调（调用方负责封顶）。
 */
export function getWordEffectTargetReduction(wordEffects: Map<string, WordEffect>): number {
  let total = 0
  for (const [, effect] of wordEffects) {
    if (effect.type === 'target_reduce') total += effect.value
  }
  return total
}

/** WordEffectType → ModifierEffectType 映射 */
const EFFECT_TYPE_MAP: Record<string, ModifierEffectType> = {
  base_score: 'score',
  multiplier: 'multiply',
  time: 'time',
  gold: 'gold',
}

/**
 * 根据词语效果生成修饰器数组
 * 遍历效果词，提取独特字母，按 (letter, effectType) 叠加 value
 * @param wordEffects Map<word, WordEffect>
 */
export function getWordEffectModifiers(wordEffects: Map<string, WordEffect>): Modifier[] {
  // 按 (letter, effectType) 叠加 value
  const accumulated = new Map<string, Map<ModifierEffectType, number>>()

  for (const [word, effect] of wordEffects) {
    const effectType = EFFECT_TYPE_MAP[effect.type]
    if (!effectType) continue

    // 传说词包：锁定单字母
    let uniqueLetters: Set<string>
    if (effect.targetLetter) {
      uniqueLetters = new Set([effect.targetLetter.toLowerCase()])
    } else {
      uniqueLetters = new Set<string>()
      for (const char of word.toLowerCase()) {
        if (char >= 'a' && char <= 'z') {
          uniqueLetters.add(char)
        }
      }
    }

    for (const letter of uniqueLetters) {
      if (!accumulated.has(letter)) {
        accumulated.set(letter, new Map())
      }
      const letterMap = accumulated.get(letter)!
      letterMap.set(effectType, (letterMap.get(effectType) ?? 0) + effect.value)
    }
  }

  // 生成修饰器
  const modifiers: Modifier[] = []
  for (const [letter, effectMap] of accumulated) {
    for (const [effectType, value] of effectMap) {
      modifiers.push({
        id: `wordeffect:${letter}:${effectType}`,
        source: `wordeffect:${letter}`,
        sourceType: 'letter',
        layer: 'base',
        trigger: 'on_correct_keystroke',
        phase: 'calculate',
        condition: { type: 'key_is', key: letter },
        effect: { type: effectType, value, stacking: 'additive' },
        priority: 50,
      })
    }
  }
  return modifiers
}
