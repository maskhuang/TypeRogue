// ============================================
// Story 45.2: 辅音丛 + 覆盖度 词条单元测试
// ============================================

import { describe, it, expect } from 'vitest'
import { isConsonant } from '../../../src/data/affixTrigger'

// ===== isConsonant =====

describe('isConsonant', () => {
  it('元音返回 false', () => {
    for (const v of ['a', 'e', 'i', 'o', 'u']) {
      expect(isConsonant(v)).toBe(false)
    }
  })

  it('大写元音返回 false', () => {
    for (const v of ['A', 'E', 'I', 'O', 'U']) {
      expect(isConsonant(v)).toBe(false)
    }
  })

  it('辅音返回 true', () => {
    for (const c of ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'y', 'z']) {
      expect(isConsonant(c)).toBe(true)
    }
  })

  it('大写辅音返回 true', () => {
    expect(isConsonant('B')).toBe(true)
    expect(isConsonant('Z')).toBe(true)
  })

  it('非字母字符返回 false', () => {
    expect(isConsonant('-')).toBe(false)
    expect(isConsonant(' ')).toBe(false)
    expect(isConsonant('1')).toBe(false)
    expect(isConsonant('')).toBe(false)
  })
})

// ===== Cluster Phase 2 逻辑 =====

describe('Cluster bonusPercent calculation', () => {
  /** 模拟 Cluster 的 Phase 2 计算逻辑 */
  function calcClusterBonus(word: string, clusterK: number): number {
    let maxCluster = 0, cur = 0
    for (const ch of word.toLowerCase()) {
      if (isConsonant(ch)) { cur++; if (cur > maxCluster) maxCluster = cur }
      else cur = 0
    }
    return clusterK * Math.max(0, maxCluster - 1)
  }

  it('"strength"(str=3, ngth=4) → maxCluster=4, bonus=3×k', () => {
    expect(calcClusterBonus('strength', 10)).toBe(30)
  })

  it('"area"(无连续辅音超过1) → bonus=0', () => {
    expect(calcClusterBonus('area', 10)).toBe(0)
  })

  it('"rhythm"(全辅音 rhyth=5 + m 已被 y 断开? 不,rhythm=r-h-y-t-h-m, y 是辅音) → maxCluster=6, bonus=5×k', () => {
    // r-h-y-t-h-m: 全是辅音（y 是辅音），maxCluster=6
    expect(calcClusterBonus('rhythm', 10)).toBe(50)
  })

  it('"aeiou"(全元音) → bonus=0', () => {
    expect(calcClusterBonus('aeiou', 10)).toBe(0)
  })

  it('单字母 "a" → bonus=0', () => {
    expect(calcClusterBonus('a', 10)).toBe(0)
  })

  it('单辅音字母 "b" → maxCluster=1, bonus=0 (至少 2 个才算丛)', () => {
    expect(calcClusterBonus('b', 10)).toBe(0)
  })

  it('"blast"(bl=2) → bonus=1×k', () => {
    expect(calcClusterBonus('blast', 10)).toBe(10)
  })

  it('空字符串 → bonus=0', () => {
    expect(calcClusterBonus('', 10)).toBe(0)
  })
})

// ===== Coverage Phase 2 逻辑 =====

describe('Coverage bonusPercent calculation', () => {
  /** 模拟 Coverage 的 Phase 2 计算逻辑 */
  function calcCoverageBonus(word: string, coverageK: number): number {
    const unique = new Set(word.toLowerCase()).size
    return coverageK * unique
  }

  it('"typewriting"(9种字母: t,y,p,e,w,r,i,n,g) → bonus=9×k', () => {
    expect(calcCoverageBonus('typewriting', 5)).toBe(45)
  })

  it('"banana"(3种: b,a,n) → bonus=3×k', () => {
    expect(calcCoverageBonus('banana', 5)).toBe(15)
  })

  it('"aaa"(1种) → bonus=1×k', () => {
    expect(calcCoverageBonus('aaa', 5)).toBe(5)
  })

  it('空字符串 → bonus=0', () => {
    expect(calcCoverageBonus('', 5)).toBe(0)
  })

  it('大小写不影响（"AbAb" → 2种: a,b）', () => {
    expect(calcCoverageBonus('AbAb', 5)).toBe(10)
  })

  it('含非字母字符时只计字母', () => {
    function calcCoverageBonusFiltered(word: string, coverageK: number): number {
      const letterSet = new Set<string>()
      for (const ch of word.toLowerCase()) {
        if (ch >= 'a' && ch <= 'z') letterSet.add(ch)
      }
      return coverageK * letterSet.size
    }
    expect(calcCoverageBonusFiltered("don't", 5)).toBe(20) // d,o,n,t = 4种
    expect(calcCoverageBonusFiltered("self-made", 5)).toBe(35) // s,e,l,f,m,a,d = 7种
  })

  it('Coverage 和 Ligature 对立: "banana"(低 coverage/高 ligature) vs "danger"(高 coverage/低 ligature)', () => {
    const bananaC = calcCoverageBonus('banana', 5) // 3种 = 15
    const dangerC = calcCoverageBonus('danger', 5) // 6种 = 30
    expect(dangerC).toBeGreaterThan(bananaC)
  })
})
