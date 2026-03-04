// ============================================
// 打字肉鸽 - 产出者数据定义测试
// ============================================
// Story 19.2: Task 1 — 数据定义正确性

import { describe, it, expect } from 'vitest'
import { PRODUCERS, isProducer, getProducerValue } from '../../../src/data/producers'

describe('PRODUCERS 数据定义', () => {
  it('定义了 10 个产出者', () => {
    expect(Object.keys(PRODUCERS)).toHaveLength(10)
  })

  it('每个产出者有完整字段', () => {
    for (const [id, prod] of Object.entries(PRODUCERS)) {
      expect(prod.id).toBe(id)
      expect(prod.name).toBeTruthy()
      expect(prod.icon).toBeTruthy()
      expect(['base', 'score', 'multiplier', 'time', 'shield']).toContain(prod.resource)
      expect(['add', 'multiply']).toContain(prod.operator)
      expect(prod.values).toHaveLength(3)
      expect(prod.desc).toBeTruthy()
    }
  })

  it('5 种资源各有 2 个产出者（+N 和 ×N）', () => {
    const byResource: Record<string, string[]> = {}
    for (const prod of Object.values(PRODUCERS)) {
      if (!byResource[prod.resource]) byResource[prod.resource] = []
      byResource[prod.resource].push(prod.operator)
    }
    for (const resource of ['base', 'score', 'multiplier', 'time', 'shield']) {
      expect(byResource[resource]).toHaveLength(2)
      expect(byResource[resource]).toContain('add')
      expect(byResource[resource]).toContain('multiply')
    }
  })
})

describe('产出者数值正确性', () => {
  const addProducers = Object.values(PRODUCERS).filter(p => p.operator === 'add')
  const mulProducers = Object.values(PRODUCERS).filter(p => p.operator === 'multiply')

  it('+N 类 Lv1 < Lv2 < Lv3（单调递增）', () => {
    for (const prod of addProducers) {
      expect(prod.values[1]).toBeGreaterThan(prod.values[0])
      expect(prod.values[2]).toBeGreaterThan(prod.values[1])
    }
  })

  it('+N 类非整数资源 Lv2 ≈ Lv1×1.6, Lv3 ≈ Lv1×2.4', () => {
    // 排除 shield（整数资源，手动调整值）
    const nonIntProducers = addProducers.filter(p => p.resource !== 'shield')
    for (const prod of nonIntProducers) {
      expect(prod.values[1]).toBeCloseTo(prod.values[0] * 1.6, 1)
      expect(prod.values[2]).toBeCloseTo(prod.values[0] * 2.4, 1)
    }
  })

  it('×N 类 Lv2 > Lv1, Lv3 > Lv2（递增）', () => {
    for (const prod of mulProducers) {
      expect(prod.values[1]).toBeGreaterThan(prod.values[0])
      expect(prod.values[2]).toBeGreaterThan(prod.values[1])
    }
  })

  it('×N 类增量递减（Lv3-Lv2 ≤ Lv2-Lv1）', () => {
    for (const prod of mulProducers) {
      const delta1 = prod.values[1] - prod.values[0]
      const delta2 = prod.values[2] - prod.values[1]
      expect(delta2).toBeLessThanOrEqual(delta1 + 0.001) // 浮点容差
    }
  })

  // 逐个验证关键数值
  it('A1 爆发: base +5/+8/+12', () => {
    expect(PRODUCERS.prod_burst.values).toEqual([5, 8, 12])
  })

  it('A2 聚能: base ×2/×2.3/×2.6', () => {
    expect(PRODUCERS.prod_focus.values).toEqual([2, 2.3, 2.6])
  })

  it('A3 掠夺: score +15/+24/+36', () => {
    expect(PRODUCERS.prod_loot.values).toEqual([15, 24, 36])
  })

  it('A4 暴击: score ×1.1/×1.15/×1.2', () => {
    expect(PRODUCERS.prod_crit.values).toEqual([1.1, 1.15, 1.2])
  })

  it('A5 强化: multiplier +0.2/+0.32/+0.48', () => {
    expect(PRODUCERS.prod_boost.values).toEqual([0.2, 0.32, 0.48])
  })

  it('A6 狂热: multiplier ×1.15/×1.2/×1.25', () => {
    expect(PRODUCERS.prod_frenzy.values).toEqual([1.15, 1.2, 1.25])
  })

  it('A7 冻结: time +2/+3.2/+4.8', () => {
    expect(PRODUCERS.prod_freeze.values).toEqual([2, 3.2, 4.8])
  })

  it('A8 永恒: time ×1.2/×1.25/×1.3', () => {
    expect(PRODUCERS.prod_eternal.values).toEqual([1.2, 1.25, 1.3])
  })

  it('A9 护盾: shield +1/+2/+3', () => {
    expect(PRODUCERS.prod_shield.values).toEqual([1, 2, 3])
  })

  it('A10 铁壁: shield ×2/×2.3/×2.6', () => {
    expect(PRODUCERS.prod_fortress.values).toEqual([2, 2.3, 2.6])
  })
})

describe('isProducer', () => {
  it('产出者 ID 返回 true', () => {
    expect(isProducer('prod_burst')).toBe(true)
    expect(isProducer('prod_focus')).toBe(true)
    expect(isProducer('prod_loot')).toBe(true)
    expect(isProducer('prod_fortress')).toBe(true)
  })

  it('非产出者 ID 返回 false', () => {
    expect(isProducer('burst')).toBe(false)
    expect(isProducer('freeze')).toBe(false)
    expect(isProducer('shield')).toBe(false)
    expect(isProducer('')).toBe(false)
    expect(isProducer('nonexistent')).toBe(false)
  })
})

describe('getProducerValue', () => {
  it('Lv1 返回 values[0]', () => {
    expect(getProducerValue('prod_burst', 1)).toBe(5)
    expect(getProducerValue('prod_loot', 1)).toBe(15)
  })

  it('Lv2 返回 values[1]', () => {
    expect(getProducerValue('prod_burst', 2)).toBe(8)
    expect(getProducerValue('prod_loot', 2)).toBe(24)
  })

  it('Lv3 返回 values[2]', () => {
    expect(getProducerValue('prod_burst', 3)).toBe(12)
    expect(getProducerValue('prod_loot', 3)).toBe(36)
  })

  it('level > 3 cap 到 Lv3', () => {
    expect(getProducerValue('prod_burst', 5)).toBe(12)
  })

  it('不存在的 ID 返回 0', () => {
    expect(getProducerValue('nonexistent', 1)).toBe(0)
  })
})
