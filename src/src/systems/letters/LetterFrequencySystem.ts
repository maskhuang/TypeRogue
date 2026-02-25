// ============================================
// 打字肉鸽 - LetterFrequencySystem 字频底分系统
// ============================================
// Story 16.1: 根据词库字频自动计算字母底分

import type { Modifier } from '../modifiers/ModifierTypes'

/** 每 5 次出现 +1 底分 */
const FREQ_DIVISOR = 5

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
 * 将字频转换为底分: floor(freq / 5)
 */
export function letterFrequencyToScore(freq: number): number {
  return Math.floor(freq / FREQ_DIVISOR)
}

/**
 * 根据词库计算所有字母的底分
 * @param wordDeck 玩家词库
 * @returns Map<字母, 底分>
 */
export function getLetterScores(wordDeck: string[]): Map<string, number> {
  const freq = calculateLetterFrequency(wordDeck)
  const scores = new Map<string, number>()
  freq.forEach((count, letter) => {
    const score = letterFrequencyToScore(count)
    if (score > 0) {
      scores.set(letter, score)
    }
  })
  return scores
}

/**
 * 根据词库生成字母底分修饰器数组
 * 与旧 getLetterModifiers() 形状一致，复用 key_is 条件 + on_correct_keystroke 触发
 * @param wordDeck 玩家词库
 */
export function getLetterScoreModifiers(wordDeck: string[]): Modifier[] {
  const scores = getLetterScores(wordDeck)
  const modifiers: Modifier[] = []
  scores.forEach((score, key) => {
    if (score <= 0) return
    modifiers.push({
      id: `letter:${key}:score`,
      source: `letter:${key}`,
      sourceType: 'letter',
      layer: 'base',
      trigger: 'on_correct_keystroke',
      phase: 'calculate',
      condition: { type: 'key_is', key },
      effect: { type: 'score', value: score, stacking: 'additive' },
      priority: 50,
    })
  })
  return modifiers
}
