// ============================================
// 商店产出者机制分组加权测试
// Story 34.5: AC1-AC6
// ============================================

import { describe, it, expect } from 'vitest'
import { PRODUCERS, isProducer, getProducerMechanic } from '../../../src/data/producers'
import { PRODUCER_MECHANIC_WEIGHTS, buildMechanicWeightedBucket } from '../../../src/systems/shop'
import { ENCHANTMENTS } from '../../../src/data/enchantments'
import { drawConverterPool, CONVERTERS } from '../../../src/data/converters'
import { isResourceActiveForClass } from '../../../src/systems/classes/ClassResourceFilter'
import type { ProducerMechanic, ResourceType } from '../../../src/core/types'

// === AC1: 产出者机制分组权重常量 ===
describe('PRODUCER_MECHANIC_WEIGHTS 常量 (AC1)', () => {
  it('包含 6 种机制', () => {
    expect(Object.keys(PRODUCER_MECHANIC_WEIGHTS).length).toBe(6)
    expect(PRODUCER_MECHANIC_WEIGHTS['standard']).toBeDefined()
    expect(PRODUCER_MECHANIC_WEIGHTS['charge']).toBeDefined()
    expect(PRODUCER_MECHANIC_WEIGHTS['decay']).toBeDefined()
    expect(PRODUCER_MECHANIC_WEIGHTS['pulse']).toBeDefined()
    expect(PRODUCER_MECHANIC_WEIGHTS['crit']).toBeDefined()
    expect(PRODUCER_MECHANIC_WEIGHTS['void']).toBeDefined()
  })

  it('所有权重为正整数', () => {
    for (const [, w] of Object.entries(PRODUCER_MECHANIC_WEIGHTS)) {
      expect(w).toBeGreaterThan(0)
      expect(Number.isInteger(w)).toBe(true)
    }
  })

  it('void 权重低于其他机制', () => {
    const voidW = PRODUCER_MECHANIC_WEIGHTS['void']
    for (const mech of ['standard', 'charge', 'decay', 'pulse', 'crit']) {
      expect(voidW).toBeLessThan(PRODUCER_MECHANIC_WEIGHTS[mech])
    }
  })
})

// === AC1: 产出者机制分桶正确性 ===
describe('getProducerMechanic 机制识别 (AC1)', () => {
  it('标准产出者返回 standard', () => {
    expect(getProducerMechanic('prod_burst')).toBe('standard')
    expect(getProducerMechanic('prod_loot')).toBe('standard')
    expect(getProducerMechanic('prod_boost')).toBe('standard')
    expect(getProducerMechanic('prod_freeze')).toBe('standard')
    expect(getProducerMechanic('prod_mint')).toBe('standard')
    expect(getProducerMechanic('prod_harvest')).toBe('standard')
    expect(getProducerMechanic('prod_mutagen_drip')).toBe('standard')
  })

  it('蓄力产出者返回 charge', () => {
    expect(getProducerMechanic('prod_charge_base')).toBe('charge')
    expect(getProducerMechanic('prod_charge_score')).toBe('charge')
  })

  it('衰减产出者返回 decay', () => {
    expect(getProducerMechanic('prod_decay_base')).toBe('decay')
    expect(getProducerMechanic('prod_decay_gold')).toBe('decay')
  })

  it('脉冲产出者返回 pulse', () => {
    expect(getProducerMechanic('prod_pulse_multiplier')).toBe('pulse')
  })

  it('暴击产出者返回 crit', () => {
    expect(getProducerMechanic('prod_crit_time')).toBe('crit')
  })

  it('虚无产出者返回 void', () => {
    expect(getProducerMechanic('prod_void_base_adjacent')).toBe('void')
    expect(getProducerMechanic('prod_void_score_same_row')).toBe('void')
  })

  it('不存在的 ID 返回 standard', () => {
    expect(getProducerMechanic('nonexistent')).toBe('standard')
  })

  it('每种机制的产出者数量正确', () => {
    const counts: Record<string, number> = {}
    for (const id of Object.keys(PRODUCERS)) {
      const mech = getProducerMechanic(id)
      counts[mech] = (counts[mech] || 0) + 1
    }
    expect(counts['standard']).toBe(7)
    expect(counts['charge']).toBe(7)
    expect(counts['decay']).toBe(7)
    expect(counts['pulse']).toBe(7)
    expect(counts['crit']).toBe(7)
    expect(counts['void']).toBe(42)
  })
})

// === AC2: 虚无产出者加权抑制（行为测试） ===
describe('buildMechanicWeightedBucket 加权效果 (AC2)', () => {
  const allProducerIds = Object.keys(PRODUCERS)

  it('输出长度与输入相同', () => {
    const result = buildMechanicWeightedBucket(allProducerIds)
    expect(result.length).toBe(allProducerIds.length)
  })

  it('输出包含所有输入 ID（无遗漏无重复）', () => {
    const result = buildMechanicWeightedBucket(allProducerIds)
    expect(new Set(result).size).toBe(allProducerIds.length)
    for (const id of allProducerIds) {
      expect(result).toContain(id)
    }
  })

  it('前 10 个元素包含多种机制（不被虚无淹没）', () => {
    const result = buildMechanicWeightedBucket(allProducerIds)
    const first10Mechs = result.slice(0, 10).map(id => getProducerMechanic(id))
    const uniqueMechs = new Set(first10Mechs)
    expect(uniqueMechs.size).toBeGreaterThan(1)
  })

  it('虚无产出者不集中在前半段', () => {
    const result = buildMechanicWeightedBucket(allProducerIds)
    const halfLen = Math.floor(result.length / 2)
    const firstHalfVoid = result.slice(0, halfLen).filter(id => getProducerMechanic(id) === 'void').length
    // void 占总量 42/77 ≈ 55%，但加权后前半段占比应低于 55%
    expect(firstHalfVoid / halfLen).toBeLessThan(0.55)
  })

  it('空输入返回空数组', () => {
    const result = buildMechanicWeightedBucket([])
    expect(result.length).toBe(0)
  })

  it('单一机制输入正常返回', () => {
    const standardOnly = allProducerIds.filter(id => getProducerMechanic(id) === 'standard')
    const result = buildMechanicWeightedBucket(standardOnly)
    expect(result.length).toBe(standardOnly.length)
    expect(new Set(result)).toEqual(new Set(standardOnly))
  })
})

// === AC3: 品类多样性（源码验证 — generateShopItems 集成点，无法独立行为测试） ===
describe('产出者品类多样性保证 (AC3)', () => {
  it('shop.ts 包含品类多样性检查逻辑', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const shopPath = path.resolve(__dirname, '../../../src/systems/shop.ts')
    const content = fs.readFileSync(shopPath, 'utf-8')
    expect(content).toContain('品类多样性保证')
    expect(content).toContain('mechanics.size === 1')
    // 验证使用 splice 正确移除替代产出者（而非 find）
    expect(content).toContain('producerBucket.findIndex')
    expect(content).toContain('producerBucket.splice(altIdx, 1)')
  })
})

// === AC4: 转化者池数量调整 ===
describe('drawConverterPool 默认数量 (AC4)', () => {
  it('默认抽取 23 个', () => {
    const pool = drawConverterPool()
    expect(pool.length).toBe(23)
  })

  it('自定义数量仍然有效', () => {
    const pool10 = drawConverterPool(10)
    expect(pool10.length).toBe(10)
    const pool45 = drawConverterPool(45)
    expect(pool45.length).toBe(45)
  })

  it('不超出总转化者数量', () => {
    const total = Object.keys(CONVERTERS).length
    const pool = drawConverterPool(100)
    expect(pool.length).toBe(total)
  })
})

// === AC5: 附魔池包含 ench_multiply ===
describe('附魔池 ench_multiply 可用性 (AC5)', () => {
  it('ench_multiply 存在于 ENCHANTMENTS', () => {
    expect(ENCHANTMENTS['ench_multiply']).toBeDefined()
    expect(ENCHANTMENTS['ench_multiply'].category).toBe('operator')
  })

  it('ench_multiply 不是 spatial 类也不是 class-exclusive', () => {
    const ench = ENCHANTMENTS['ench_multiply']
    expect(ench.category).not.toBe('spatial')
    expect(ench.category).not.toBe('class-exclusive')
  })

  it('drawEnchantmentPair 过滤逻辑不排除 operator 类附魔', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const enchPath = path.resolve(__dirname, '../../../src/data/enchantments.ts')
    const content = fs.readFileSync(enchPath, 'utf-8')
    const filterSection = content.slice(
      content.indexOf('export function drawEnchantmentPair'),
      content.indexOf('export function drawEnchantmentPair') + 500
    )
    expect(filterSection).not.toContain("category === 'operator'")
  })
})

// === AC6: 职业资源产出者门控 ===
describe('职业资源产出者门控 (AC6)', () => {
  it('fragment 产出者仅 wordsmith 可见', () => {
    const fragProducers = Object.keys(PRODUCERS).filter(id => PRODUCERS[id].resource === 'fragment')
    expect(fragProducers.length).toBeGreaterThan(0)
    for (const id of fragProducers) {
      const res = PRODUCERS[id].resource as ResourceType
      expect(isResourceActiveForClass(res, 'wordsmith' as any), `${id} should be active for wordsmith`).toBe(true)
      expect(isResourceActiveForClass(res, 'metamorph' as any), `${id} should NOT be active for metamorph`).toBe(false)
    }
  })

  it('mutagen 产出者仅 metamorph 可见', () => {
    const mutProducers = Object.keys(PRODUCERS).filter(id => PRODUCERS[id].resource === 'mutagen')
    expect(mutProducers.length).toBeGreaterThan(0)
    for (const id of mutProducers) {
      const res = PRODUCERS[id].resource as ResourceType
      expect(isResourceActiveForClass(res, 'metamorph' as any), `${id} should be active for metamorph`).toBe(true)
      expect(isResourceActiveForClass(res, 'wordsmith' as any), `${id} should NOT be active for wordsmith`).toBe(false)
    }
  })

  it('各机制类型的 fragment/mutagen 产出者都存在', () => {
    for (const mech of ['charge', 'decay', 'pulse', 'crit']) {
      const fragId = `prod_${mech}_fragment`
      const mutId = `prod_${mech}_mutagen`
      expect(PRODUCERS[fragId]).toBeDefined()
      expect(PRODUCERS[fragId].resource).toBe('fragment')
      expect(PRODUCERS[mutId]).toBeDefined()
      expect(PRODUCERS[mutId].resource).toBe('mutagen')
    }
  })

  it('虚无产出者的 fragment/mutagen 变体也存在', () => {
    const voidFrag = Object.keys(PRODUCERS).filter(id => id.startsWith('prod_void_fragment'))
    const voidMut = Object.keys(PRODUCERS).filter(id => id.startsWith('prod_void_mutagen'))
    expect(voidFrag.length).toBe(6)
    expect(voidMut.length).toBe(6)
  })

  it('通用资源产出者对所有职业可见', () => {
    for (const res of ['base', 'score', 'multiplier', 'time', 'gold'] as ResourceType[]) {
      expect(isResourceActiveForClass(res, 'wordsmith' as any)).toBe(true)
      expect(isResourceActiveForClass(res, 'metamorph' as any)).toBe(true)
    }
  })
})

// === 加权统计测试 ===
describe('产出者加权抽取统计 (AC2 补充)', () => {
  it('虚无产出者权重密度远低于其他机制', () => {
    const voidDensity = PRODUCER_MECHANIC_WEIGHTS['void'] / 42
    const standardDensity = PRODUCER_MECHANIC_WEIGHTS['standard'] / 7
    expect(standardDensity / voidDensity).toBeGreaterThan(10)
  })

  it('所有非虚无机制的组权重相近', () => {
    const nonVoidMechs = ['standard', 'charge', 'decay', 'pulse', 'crit']
    const weights = nonVoidMechs.map(m => PRODUCER_MECHANIC_WEIGHTS[m])
    const max = Math.max(...weights)
    const min = Math.min(...weights)
    expect(max / min).toBeLessThanOrEqual(2)
  })

  it('加权桶输出中虚无占比低于未加权的理论占比', () => {
    const allIds = Object.keys(PRODUCERS)
    const result = buildMechanicWeightedBucket(allIds)
    // 未加权时虚无占 42/77 ≈ 54.5%
    const voidCount = result.filter(id => getProducerMechanic(id) === 'void').length
    // 加权后虚无总数仍是 42（全部产出者都在输出中），但在前半段占比降低
    expect(voidCount).toBe(42) // 全量保留
    const firstQuarter = result.slice(0, Math.floor(result.length / 4))
    const firstQuarterVoid = firstQuarter.filter(id => getProducerMechanic(id) === 'void').length
    // 前 1/4 中虚无占比应明显低于 55%
    expect(firstQuarterVoid / firstQuarter.length).toBeLessThan(0.5)
  })
})
