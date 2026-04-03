// ============================================
// Story 45.3: 双字组 词条单元测试
// ============================================

import { describe, it, expect } from 'vitest'
import { BIGRAM_FREQ_TABLE } from '../../../src/data/bigramFrequency'

// ===== BIGRAM_FREQ_TABLE 完整性 =====

describe('BIGRAM_FREQ_TABLE', () => {
  it('应包含 676 个条目（26×26）', () => {
    expect(Object.keys(BIGRAM_FREQ_TABLE).length).toBe(676)
  })

  it('所有值在 0~1 范围内', () => {
    for (const [key, val] of Object.entries(BIGRAM_FREQ_TABLE)) {
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThanOrEqual(1)
    }
  })

  it('TH 是最高频（归一化为 1.0）', () => {
    expect(BIGRAM_FREQ_TABLE['th']).toBe(1)
  })

  it('HE 是第二高频（接近 0.86）', () => {
    expect(BIGRAM_FREQ_TABLE['he']).toBeGreaterThan(0.8)
    expect(BIGRAM_FREQ_TABLE['he']).toBeLessThan(0.95)
  })

  it('7 个已知零频 bigram 为 0', () => {
    for (const z of ['jq', 'qg', 'qk', 'qy', 'qz', 'wq', 'wz']) {
      expect(BIGRAM_FREQ_TABLE[z]).toBe(0)
    }
  })

  it('所有 26×26 组合都存在', () => {
    const alpha = 'abcdefghijklmnopqrstuvwxyz'
    for (const a of alpha) {
      for (const b of alpha) {
        expect(BIGRAM_FREQ_TABLE[a + b]).toBeDefined()
      }
    }
  })
})

// ===== Bigram bonusPercent 计算逻辑 =====

describe('Bigram bonusPercent calculation', () => {
  /** 模拟 Bigram 的 Phase 2 计算逻辑 */
  function calcBigramBonus(word: string, bigramK: number): number {
    const w = word.toLowerCase()
    if (w.length < 2) return 0
    let totalRarity = 0
    let pairCount = 0
    for (let i = 0; i < w.length - 1; i++) {
      const a = w[i], b = w[i + 1]
      if (a >= 'a' && a <= 'z' && b >= 'a' && b <= 'z') {
        const freq = BIGRAM_FREQ_TABLE[a + b] ?? 0
        totalRarity += (1 - freq)
        pairCount++
      }
    }
    if (pairCount === 0) return 0
    return bigramK * (totalRarity / pairCount)
  }

  it('"fjord" 的加成应明显高于 "the"', () => {
    const fjord = calcBigramBonus('fjord', 50)
    const the_ = calcBigramBonus('the', 50)
    expect(fjord).toBeGreaterThan(the_)
    // "the" 含 TH(freq=1.0) 和 HE(freq≈0.86) → 低 rarity
    // "fjord" 含 FJ(极罕见) → 高 rarity
    expect(the_).toBeLessThan(15) // TH+HE 都是高频，rarity 很低
    expect(fjord).toBeGreaterThan(30) // FJ 极罕见，拉高平均 rarity
  })

  it('单字母单词 "a" → bonus=0', () => {
    expect(calcBigramBonus('a', 50)).toBe(0)
  })

  it('空字符串 → bonus=0', () => {
    expect(calcBigramBonus('', 50)).toBe(0)
  })

  it('含非字母字符时跳过非字母对', () => {
    // "don't" → 有效对: do, on, nt (跳过 n' 和 't)
    const bonus = calcBigramBonus("don't", 50)
    expect(bonus).toBeGreaterThan(0)
  })

  it('"zz" 两个字母 → 1 个 bigram 对', () => {
    const bonus = calcBigramBonus('zz', 50)
    // zz 应该是极罕见 → 高 rarity
    expect(bonus).toBeGreaterThan(40)
  })
})
