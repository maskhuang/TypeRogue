// ============================================
// 附魔数据完整性 + 工具函数测试
// Story 19.6: AC1, AC2, AC3, AC4
// ============================================

import { describe, it, expect } from 'vitest'
import { ENCHANTMENTS, isEnchantment, getEnchantmentDesc, drawEnchantmentPair } from '../../../src/data/enchantments'

describe('附魔数据完整性 (AC1)', () => {
  const allIds = Object.keys(ENCHANTMENTS)

  it('共 33 个附魔', () => {
    expect(allIds.length).toBe(33)
  })

  it('每个附魔的 id 与 key 匹配', () => {
    for (const [key, ench] of Object.entries(ENCHANTMENTS)) {
      expect(ench.id).toBe(key)
    }
  })

  it('每个附魔有必要字段', () => {
    for (const ench of Object.values(ENCHANTMENTS)) {
      expect(ench.id).toBeTruthy()
      expect(ench.name).toBeTruthy()
      expect(ench.icon).toBeTruthy()
      expect(ench.category).toBeTruthy()
      expect(ench.desc).toBeTruthy()
      expect(typeof ench.effectValue).toBe('number')
      expect(ench.effectValue).toBeGreaterThan(0)
    }
  })

  it('id 唯一', () => {
    const ids = allIds
    const uniqueIds = new Set(ids)
    expect(ids.length).toBe(uniqueIds.size)
  })
})

describe('24 个空间型附魔 (AC2)', () => {
  const spatials = Object.values(ENCHANTMENTS).filter(e => e.category === 'spatial')

  it('共 24 个', () => {
    expect(spatials.length).toBe(24)
  })

  it('4 种效果类型 × 6 种位置关系', () => {
    const types = ['amplify', 'splash', 'resonance', 'repulsion']
    const relations = ['adjacent', 'sameRow', 'sameColumn', 'sameHand', 'sameFinger', 'symmetric']

    for (const type of types) {
      for (const rel of relations) {
        const match = spatials.find(e => e.spatialType === type && e.positionRelation === rel)
        expect(match, `missing ${type}+${rel}`).toBeTruthy()
      }
    }
  })

  it('每个空间型附魔有 spatialType 和 positionRelation', () => {
    for (const ench of spatials) {
      expect(ench.spatialType).toBeTruthy()
      expect(ench.positionRelation).toBeTruthy()
    }
  })

  it('增幅型百分比正确', () => {
    const amplifyEnchants = spatials.filter(e => e.spatialType === 'amplify')
    expect(amplifyEnchants.find(e => e.positionRelation === 'adjacent')?.effectValue).toBe(0.20)
    expect(amplifyEnchants.find(e => e.positionRelation === 'sameRow')?.effectValue).toBe(0.15)
    expect(amplifyEnchants.find(e => e.positionRelation === 'sameColumn')?.effectValue).toBe(0.25)
    expect(amplifyEnchants.find(e => e.positionRelation === 'sameHand')?.effectValue).toBe(0.08)
    expect(amplifyEnchants.find(e => e.positionRelation === 'sameFinger')?.effectValue).toBe(0.30)
    expect(amplifyEnchants.find(e => e.positionRelation === 'symmetric')?.effectValue).toBe(0.40)
  })
})

describe('5 个变性型附魔 (AC3)', () => {
  const transmutations = Object.values(ENCHANTMENTS).filter(e => e.category === 'transmutation')

  it('共 5 个', () => {
    expect(transmutations.length).toBe(5)
  })

  it('每个有 extraResource', () => {
    for (const ench of transmutations) {
      expect(ench.extraResource).toBeTruthy()
    }
  })

  it('覆盖 5 种资源', () => {
    const resources = transmutations.map(e => e.extraResource)
    expect(resources).toContain('base')
    expect(resources).toContain('score')
    expect(resources).toContain('multiplier')
    expect(resources).toContain('time')
    expect(resources).toContain('shield')
  })

  it('系数正确', () => {
    expect(transmutations.find(e => e.extraResource === 'base')?.effectValue).toBe(0.30)
    expect(transmutations.find(e => e.extraResource === 'score')?.effectValue).toBe(0.30)
    expect(transmutations.find(e => e.extraResource === 'multiplier')?.effectValue).toBe(0.10)
    expect(transmutations.find(e => e.extraResource === 'time')?.effectValue).toBe(0.20)
    expect(transmutations.find(e => e.extraResource === 'shield')?.effectValue).toBe(0.15)
  })
})

describe('4 个独立型附魔 (AC4)', () => {
  const independents = Object.values(ENCHANTMENTS).filter(e => e.category === 'independent')

  it('共 4 个', () => {
    expect(independents.length).toBe(4)
  })

  it('包含先手/终幕/一刀/渴血', () => {
    const ids = independents.map(e => e.id)
    expect(ids).toContain('ench_pioneer')
    expect(ids).toContain('ench_finale')
    expect(ids).toContain('ench_decay')
    expect(ids).toContain('ench_thirst')
  })

  it('不依赖位置关系', () => {
    for (const ench of independents) {
      expect(ench.positionRelation).toBeUndefined()
      expect(ench.spatialType).toBeUndefined()
    }
  })
})

describe('isEnchantment', () => {
  it('有效 ID 返回 true', () => {
    expect(isEnchantment('ench_amplify_adjacent')).toBe(true)
    expect(isEnchantment('ench_trans_base')).toBe(true)
    expect(isEnchantment('ench_pioneer')).toBe(true)
  })

  it('无效 ID 返回 false', () => {
    expect(isEnchantment('prod_burst')).toBe(false)
    expect(isEnchantment('nonexistent')).toBe(false)
  })
})

describe('getEnchantmentDesc', () => {
  it('返回描述', () => {
    expect(getEnchantmentDesc('ench_amplify_adjacent')).toContain('相邻')
    expect(getEnchantmentDesc('ench_pioneer')).toContain('第一个')
  })

  it('无效 ID 返回空串', () => {
    expect(getEnchantmentDesc('nonexistent')).toBe('')
  })
})

describe('drawEnchantmentPair', () => {
  it('返回 2 个不同的有效 ID', () => {
    for (let i = 0; i < 20; i++) {
      const [a, b] = drawEnchantmentPair()
      expect(a).not.toBe(b)
      expect(isEnchantment(a)).toBe(true)
      expect(isEnchantment(b)).toBe(true)
    }
  })
})
