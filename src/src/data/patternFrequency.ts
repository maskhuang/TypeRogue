// ============================================
// 打字肉鸽 - 模式签名频率表（Pattern 词条基础设施）
// ============================================
// Story 47.3: 模式频率表
// 惰性生成：首次调用时从 WORD_POOL 统计模式频率并缓存

import { WORD_POOL } from './words'

/**
 * 将单词转为模式签名：按首次出现顺序分配 A/B/C/...
 * "banana" → "ABCBCB", "apple" → "ABBCD", "the" → "ABC"
 */
export function toPattern(word: string): string {
  if (!word) return ''
  const lower = word.toLowerCase()
  const map = new Map<string, string>()
  let nextChar = 65 // 'A'
  let pattern = ''
  for (const ch of lower) {
    if (ch < 'a' || ch > 'z') continue
    if (!map.has(ch)) {
      map.set(ch, String.fromCharCode(nextChar++))
    }
    pattern += map.get(ch)!
  }
  return pattern
}

const MAX_RARITY = 10

let cachedFreqs: Map<string, number> | null = null

function buildPatternFreqs(): Map<string, number> {
  if (cachedFreqs) return cachedFreqs
  const counts = new Map<string, number>()
  let total = 0
  for (const pool of Object.values(WORD_POOL)) {
    for (const word of pool.words) {
      const p = toPattern(word)
      if (p.length === 0) continue
      counts.set(p, (counts.get(p) ?? 0) + 1)
      total++
    }
  }
  cachedFreqs = new Map()
  if (total > 0) {
    for (const [p, c] of counts) {
      cachedFreqs.set(p, c / total)
    }
  }
  return cachedFreqs
}

/**
 * 返回单词模式签名的稀有度 = -log₂(freq)
 * 常见模式（如 ABC "the/cat/dog"）→ 低稀有度
 * 稀有模式（如 ABCBDB "banana"）→ 高稀有度
 * 未知模式 → MAX_RARITY (10)
 */
export function getPatternRarity(word: string): number {
  const pattern = toPattern(word)
  if (pattern.length === 0) return 0
  const freqs = buildPatternFreqs()
  const freq = freqs.get(pattern)
  if (!freq || freq <= 0) return MAX_RARITY
  return -Math.log2(freq)
}

/** 清除缓存（用于测试） */
export function _resetPatternCache(): void {
  cachedFreqs = null
}
