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

    // 提取独特字母
    const uniqueLetters = new Set<string>()
    for (const char of word.toLowerCase()) {
      if (char >= 'a' && char <= 'z') {
        uniqueLetters.add(char)
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
