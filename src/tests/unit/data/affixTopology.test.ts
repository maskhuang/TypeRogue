// ============================================
// Story 45.4: 拓扑型 — 落差 + 汇流 + 湍流 单元测试
// ============================================

import { describe, it, expect } from 'vitest'
import { BASE_VALUES } from '../../../src/data/affixes'
import type { AffixSkillInstance } from '../../../src/data/affixes'
import type { ResourceType } from '../../../src/core/types'

// ===== 模拟工具 =====

/** 创建最小化的模拟技能 */
function mockSkill(resource: ResourceType, level: number): AffixSkillInstance {
  return {
    id: `skill_${resource}_${level}`,
    name: `test`,
    icon: '',
    resource,
    baseValues: BASE_VALUES[resource],
    level,
    rarity: 0 as any,
    affixes: [],
    enchantmentIds: [],
  }
}

/** 获取技能的 base value */
function getBase(skill: AffixSkillInstance): number {
  const lvlIdx = Math.max(0, Math.min(skill.level - 1, 3))
  return BASE_VALUES[skill.resource]?.[lvlIdx] ?? 1
}

// ===== Flow (落差) 计算逻辑 =====

describe('Flow bonusPercent calculation', () => {
  function calcFlowBonus(self: AffixSkillInstance, neighbors: AffixSkillInstance[], flowK: number): number {
    const selfBase = getBase(self)
    let bonus = 0
    for (const ns of neighbors) {
      const nBase = getBase(ns)
      const delta = nBase - selfBase
      if (delta > 0) {
        const norm = selfBase / nBase
        bonus += flowK * delta * norm
      }
    }
    return bonus
  }

  it('弱技能旁有强邻居 → 正加成', () => {
    const weak = mockSkill('base', 1)   // base Lv1 = 5
    const strong = mockSkill('base', 3) // base Lv3 = 12
    const bonus = calcFlowBonus(weak, [strong], 5)
    expect(bonus).toBeGreaterThan(0)
  })

  it('强技能旁有弱邻居 → 无加成（delta ≤ 0）', () => {
    const strong = mockSkill('base', 3)
    const weak = mockSkill('base', 1)
    const bonus = calcFlowBonus(strong, [weak], 5)
    expect(bonus).toBe(0)
  })

  it('等强技能 → 无加成（delta = 0）', () => {
    const a = mockSkill('base', 2)
    const b = mockSkill('base', 2)
    expect(calcFlowBonus(a, [b], 5)).toBe(0)
  })

  it('无邻居 → 0', () => {
    const self = mockSkill('base', 1)
    expect(calcFlowBonus(self, [], 5)).toBe(0)
  })

  it('多个强邻居 → 累加', () => {
    const weak = mockSkill('base', 1)
    const strong1 = mockSkill('base', 3)
    const strong2 = mockSkill('score', 3)  // score Lv3 = 36，比 base 高更多
    const bonus = calcFlowBonus(weak, [strong1, strong2], 5)
    expect(bonus).toBeGreaterThan(calcFlowBonus(weak, [strong1], 5))
  })
})

// ===== Confluence (汇流) 计算逻辑 =====

describe('Confluence bonusPercent calculation', () => {
  function calcConfluenceBonus(neighbors: AffixSkillInstance[], confluenceK: number): number {
    const resTypes = new Set<string>()
    for (const ns of neighbors) resTypes.add(ns.resource)
    if (resTypes.size === 0) return 0
    return confluenceK * (1 - 1 / (resTypes.size + 1))
  }

  it('3 种不同资源 > 1 种', () => {
    const n3 = [mockSkill('base', 1), mockSkill('score', 1), mockSkill('time', 1)]
    const n1 = [mockSkill('base', 1), mockSkill('base', 2), mockSkill('base', 3)]
    expect(calcConfluenceBonus(n3, 20)).toBeGreaterThan(calcConfluenceBonus(n1, 20))
  })

  it('1 种资源 → bonus = k × 0.5', () => {
    const n = [mockSkill('base', 1)]
    expect(calcConfluenceBonus(n, 20)).toBeCloseTo(10) // 20 × (1 - 1/2)
  })

  it('2 种资源 → bonus = k × 0.667', () => {
    const n = [mockSkill('base', 1), mockSkill('score', 1)]
    expect(calcConfluenceBonus(n, 20)).toBeCloseTo(20 * (1 - 1/3), 1)
  })

  it('无邻居 → 0', () => {
    expect(calcConfluenceBonus([], 20)).toBe(0)
  })

  it('边际递减：5种 vs 3种差距小于 3种 vs 1种', () => {
    const n1 = [mockSkill('base', 1)]
    const n3 = [mockSkill('base', 1), mockSkill('score', 1), mockSkill('time', 1)]
    const n5 = [mockSkill('base', 1), mockSkill('score', 1), mockSkill('time', 1), mockSkill('gold', 1), mockSkill('multiplier', 1)]
    const diff_1_to_3 = calcConfluenceBonus(n3, 20) - calcConfluenceBonus(n1, 20)
    const diff_3_to_5 = calcConfluenceBonus(n5, 20) - calcConfluenceBonus(n3, 20)
    expect(diff_1_to_3).toBeGreaterThan(diff_3_to_5)
  })
})

// ===== Turbulence (湍流) 计算逻辑 =====

describe('Turbulence bonusPercent calculation', () => {
  function calcTurbulenceBonus(neighbors: AffixSkillInstance[], turbulenceK: number): number {
    if (neighbors.length < 2) return 0
    let minBase = Infinity, maxBase = -Infinity
    for (const ns of neighbors) {
      const b = getBase(ns)
      if (b < minBase) minBase = b
      if (b > maxBase) maxBase = b
    }
    if (maxBase <= 0) return 0
    const spread = (maxBase - minBase) / maxBase
    return turbulenceK * spread * neighbors.length
  }

  it('高 spread → 高加成', () => {
    const neighbors = [mockSkill('base', 1), mockSkill('score', 3)] // base=5, score=36 → spread高
    const bonus = calcTurbulenceBonus(neighbors, 10)
    expect(bonus).toBeGreaterThan(0)
  })

  it('零 spread（全部相同）→ 零加成', () => {
    const neighbors = [mockSkill('base', 1), mockSkill('base', 1)] // 都是5
    expect(calcTurbulenceBonus(neighbors, 10)).toBe(0)
  })

  it('< 2 邻居 → 0', () => {
    expect(calcTurbulenceBonus([mockSkill('base', 1)], 10)).toBe(0)
    expect(calcTurbulenceBonus([], 10)).toBe(0)
  })

  it('更多邻居+高 spread → 更高加成', () => {
    const n2 = [mockSkill('base', 1), mockSkill('score', 3)]
    const n3 = [mockSkill('base', 1), mockSkill('score', 3), mockSkill('gold', 2)]
    expect(calcTurbulenceBonus(n3, 10)).toBeGreaterThan(calcTurbulenceBonus(n2, 10))
  })
})
