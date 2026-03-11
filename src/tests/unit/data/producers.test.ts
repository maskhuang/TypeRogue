// ============================================
// 打字肉鸽 - 产出者数据定义测试
// ============================================
// Story 19.2 + 34.1 + 34.2: 7 原始加算 + 70 新机制产出者（7 旧乘算已移入附魔系统）

import { describe, it, expect } from 'vitest'
import { PRODUCERS, isProducer, getProducerValue, getProducerDesc } from '../../../src/data/producers'
import { isCompositeIcon } from '../../../src/data/iconRegistry'

describe('PRODUCERS 数据定义', () => {
  it('定义了 77 个产出者（7 原始加算 + 70 新机制）', () => {
    expect(Object.keys(PRODUCERS)).toHaveLength(77)
  })

  it('每个产出者有完整字段', () => {
    for (const [id, prod] of Object.entries(PRODUCERS)) {
      expect(prod.id).toBe(id)
      expect(prod.name).toBeTruthy()
      expect(prod.icon).toBeTruthy()
      expect(['base', 'score', 'multiplier', 'time', 'gold', 'fragment', 'mutagen']).toContain(prod.resource)
      expect(['add', 'multiply']).toContain(prod.operator)
      expect(prod.values).toHaveLength(3)
      expect(prod.desc).toBeTruthy()
    }
  })

  it('原子图标（非组合）唯一', () => {
    const atomicIcons = Object.values(PRODUCERS)
      .map(p => p.icon)
      .filter(icon => !isCompositeIcon(icon))
    expect(new Set(atomicIcons).size).toBe(atomicIcons.length)
  })

  it('所有产出者均为 add 类型（乘算已移入附魔）', () => {
    for (const prod of Object.values(PRODUCERS)) {
      expect(prod.operator).toBe('add')
    }
  })

  it('新机制产出者全部是 add 类型', () => {
    const mechanicProducers = Object.values(PRODUCERS).filter(p => p.mechanic && p.mechanic !== 'standard')
    for (const prod of mechanicProducers) {
      expect(prod.operator).toBe('add')
    }
  })

  it('新机制产出者有有效的 mechanic 和 mechanicParams', () => {
    const validMechanics = ['charge', 'decay', 'pulse', 'crit', 'void']
    const mechanicProducers = Object.values(PRODUCERS).filter(p => p.mechanic && p.mechanic !== 'standard')
    expect(mechanicProducers).toHaveLength(70)
    for (const prod of mechanicProducers) {
      expect(validMechanics).toContain(prod.mechanic)
      expect(prod.mechanicParams).toBeDefined()
    }
  })
})

describe('新机制产出者数量', () => {
  it('蓄力产出者 7 个（每种资源 1 个）', () => {
    const charge = Object.values(PRODUCERS).filter(p => p.mechanic === 'charge')
    expect(charge).toHaveLength(7)
    const resources = new Set(charge.map(p => p.resource))
    expect(resources.size).toBe(7)
  })

  it('衰减产出者 7 个（每种资源 1 个）', () => {
    const decay = Object.values(PRODUCERS).filter(p => p.mechanic === 'decay')
    expect(decay).toHaveLength(7)
    const resources = new Set(decay.map(p => p.resource))
    expect(resources.size).toBe(7)
  })

  it('脉冲产出者 7 个（每种资源 1 个）', () => {
    const pulse = Object.values(PRODUCERS).filter(p => p.mechanic === 'pulse')
    expect(pulse).toHaveLength(7)
    const resources = new Set(pulse.map(p => p.resource))
    expect(resources.size).toBe(7)
  })

  it('暴击产出者 7 个（每种资源 1 个）', () => {
    const crit = Object.values(PRODUCERS).filter(p => p.mechanic === 'crit')
    expect(crit).toHaveLength(7)
    const resources = new Set(crit.map(p => p.resource))
    expect(resources.size).toBe(7)
  })

  it('虚无产出者 42 个（7 资源 × 6 位置关系）', () => {
    const voidProds = Object.values(PRODUCERS).filter(p => p.mechanic === 'void')
    expect(voidProds).toHaveLength(42)
    for (const resource of ['base', 'score', 'multiplier', 'time', 'gold', 'fragment', 'mutagen']) {
      const forRes = voidProds.filter(p => p.resource === resource)
      expect(forRes).toHaveLength(6)
    }
  })
})

describe('机制参数正确性', () => {
  it('蓄力参数: gainPerSec=0.08, maxBonus=2.0', () => {
    const charge = Object.values(PRODUCERS).filter(p => p.mechanic === 'charge')
    for (const prod of charge) {
      const params = prod.mechanicParams as { gainPerSec: number; maxBonus: number }
      expect(params.gainPerSec).toBe(0.08)
      expect(params.maxBonus).toBe(2.0)
    }
  })

  it('衰减参数: initialMult=2.0, decayPerTrigger=0.15, floor=0.5', () => {
    const decay = Object.values(PRODUCERS).filter(p => p.mechanic === 'decay')
    for (const prod of decay) {
      const params = prod.mechanicParams as { initialMult: number; decayPerTrigger: number; floor: number }
      expect(params.initialMult).toBe(2.0)
      expect(params.decayPerTrigger).toBe(0.15)
      expect(params.floor).toBe(0.5)
    }
  })

  it('脉冲参数: interval=4, burstMult=3.0', () => {
    const pulse = Object.values(PRODUCERS).filter(p => p.mechanic === 'pulse')
    for (const prod of pulse) {
      const params = prod.mechanicParams as { interval: number; burstMult: number }
      expect(params.interval).toBe(4)
      expect(params.burstMult).toBe(3.0)
    }
  })

  it('暴击参数: chance=0.5, critMult=2.0', () => {
    const crit = Object.values(PRODUCERS).filter(p => p.mechanic === 'crit')
    for (const prod of crit) {
      const params = prod.mechanicParams as { chance: number; critMult: number }
      expect(params.chance).toBe(0.5)
      expect(params.critMult).toBe(2.0)
    }
  })

  it('虚无参数: bonusPerSlot 按位置关系不同', () => {
    const voidProds = Object.values(PRODUCERS).filter(p => p.mechanic === 'void')
    const bonusValues = new Set(voidProds.map(p => (p.mechanicParams as { bonusPerSlot: number }).bonusPerSlot))
    // 6 种位置关系有 6 种不同的 bonusPerSlot
    expect(bonusValues.size).toBe(6)
    // 验证所有 bonusPerSlot 在 0~1 范围内
    for (const prod of voidProds) {
      const bonus = (prod.mechanicParams as { bonusPerSlot: number }).bonusPerSlot
      expect(bonus).toBeGreaterThan(0)
      expect(bonus).toBeLessThanOrEqual(1)
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
    // 排除 gold（整数资源，手动调整值）和 base（整数资源）
    const nonIntProducers = addProducers.filter(p => p.resource !== 'gold' && p.resource !== 'base')
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

  // 逐个验证关键数值（原始产出者）
  it('A1 爆发: base +5/+8/+12', () => {
    expect(PRODUCERS.prod_burst.values).toEqual([5, 8, 12])
  })

  it('A3 掠夺: score +15/+24/+36', () => {
    expect(PRODUCERS.prod_loot.values).toEqual([15, 24, 36])
  })

  it('A5 强化: multiplier +0.2/+0.32/+0.48', () => {
    expect(PRODUCERS.prod_boost.values).toEqual([0.2, 0.32, 0.48])
  })

  it('A7 冻结: time +2/+3.2/+4.8', () => {
    expect(PRODUCERS.prod_freeze.values).toEqual([2, 3.2, 4.8])
  })

  it('A9 采集: fragment +1/+1.6/+2.4', () => {
    expect(PRODUCERS.prod_harvest.values).toEqual([1, 1.6, 2.4])
    expect(PRODUCERS.prod_harvest.resource).toBe('fragment')
    expect(PRODUCERS.prod_harvest.operator).toBe('add')
  })

  it('A11 铸币: gold +3/+5/+8', () => {
    expect(PRODUCERS.prod_mint.values).toEqual([3, 5, 8])
    expect(PRODUCERS.prod_mint.resource).toBe('gold')
    expect(PRODUCERS.prod_mint.operator).toBe('add')
  })

  // 新机制产出者共享基础值
  it('新机制产出者复用对应资源的基础值', () => {
    const baseByResource: Record<string, [number, number, number]> = {
      base: [5, 8, 12], score: [15, 24, 36], multiplier: [0.2, 0.32, 0.48],
      time: [2, 3.2, 4.8], gold: [3, 5, 8], fragment: [1, 1.6, 2.4], mutagen: [1, 1.6, 2.4],
    }
    const mechanicProducers = Object.values(PRODUCERS).filter(p => p.mechanic && p.mechanic !== 'standard')
    for (const prod of mechanicProducers) {
      expect(prod.values).toEqual(baseByResource[prod.resource])
    }
  })
})

describe('isProducer', () => {
  it('原始产出者 ID 返回 true', () => {
    expect(isProducer('prod_burst')).toBe(true)
    expect(isProducer('prod_loot')).toBe(true)
    expect(isProducer('prod_mint')).toBe(true)
  })

  it('新机制产出者 ID 返回 true', () => {
    expect(isProducer('prod_charge_base')).toBe(true)
    expect(isProducer('prod_decay_score')).toBe(true)
    expect(isProducer('prod_pulse_multiplier')).toBe(true)
    expect(isProducer('prod_crit_gold')).toBe(true)
    expect(isProducer('prod_void_base_adjacent')).toBe(true)
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

describe('getProducerDesc', () => {
  it('标准产出者描述不含机制标签', () => {
    const desc = getProducerDesc('prod_burst', 1)
    expect(desc).toBe('⚔️基数+5')
    expect(desc).not.toContain('(')
  })

  it('蓄力产出者描述含(蓄力)', () => {
    const desc = getProducerDesc('prod_charge_base', 1)
    expect(desc).toContain('基数+5')
    expect(desc).toContain('(蓄力)')
  })

  it('虚无产出者描述含(虚无·位置关系)', () => {
    const desc = getProducerDesc('prod_void_base_adjacent', 1)
    expect(desc).toContain('基数+5')
    expect(desc).toContain('(虚无·相邻)')
  })
})
