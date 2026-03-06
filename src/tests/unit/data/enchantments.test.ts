// ============================================
// 附魔数据完整性 + 工具函数测试
// Story 24.2: 36 个附魔（30 空间型 + 5 变性型 + 1 独立型）
// ============================================

import { describe, it, expect } from 'vitest'
import { ENCHANTMENTS, isEnchantment, getEnchantmentDesc, drawEnchantmentPair } from '../../../src/data/enchantments'

describe('附魔数据完整性', () => {
  const allIds = Object.keys(ENCHANTMENTS)

  it('共 36 个附魔', () => {
    expect(allIds.length).toBe(36)
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

describe('30 个空间型附魔', () => {
  const spatials = Object.values(ENCHANTMENTS).filter(e => e.category === 'spatial')

  it('共 30 个', () => {
    expect(spatials.length).toBe(30)
  })

  it('5 种效果类型 × 6 种位置关系', () => {
    const types = ['growth', 'splash', 'resonance', 'repulsion', 'devour']
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

  it('成长型百分比正确', () => {
    const growthEnchants = spatials.filter(e => e.spatialType === 'growth')
    expect(growthEnchants.find(e => e.positionRelation === 'adjacent')?.effectValue).toBe(0.03)
    expect(growthEnchants.find(e => e.positionRelation === 'sameRow')?.effectValue).toBe(0.02)
    expect(growthEnchants.find(e => e.positionRelation === 'sameColumn')?.effectValue).toBe(0.04)
    expect(growthEnchants.find(e => e.positionRelation === 'sameHand')?.effectValue).toBe(0.01)
    expect(growthEnchants.find(e => e.positionRelation === 'sameFinger')?.effectValue).toBe(0.05)
    expect(growthEnchants.find(e => e.positionRelation === 'symmetric')?.effectValue).toBe(0.06)
  })

  it('无 amplify 类型附魔', () => {
    const amplifyEnchants = spatials.filter(e => e.spatialType === 'amplify' as any)
    expect(amplifyEnchants.length).toBe(0)
  })
})

describe('5 个变性型附魔', () => {
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

describe('1 个独立型附魔', () => {
  const independents = Object.values(ENCHANTMENTS).filter(e => e.category === 'independent')

  it('共 1 个', () => {
    expect(independents.length).toBe(1)
  })

  it('包含精通', () => {
    const ids = independents.map(e => e.id)
    expect(ids).toContain('ench_mastery')
  })

  it('精通不依赖位置关系', () => {
    const mastery = independents.find(e => e.id === 'ench_mastery')!
    expect(mastery.positionRelation).toBeUndefined()
    expect(mastery.spatialType).toBeUndefined()
  })

  it('精通 effectValue = 0.08', () => {
    expect(independents.find(e => e.id === 'ench_mastery')?.effectValue).toBe(0.08)
  })
})

describe('6 个吞噬型空间附魔', () => {
  const devours = Object.values(ENCHANTMENTS).filter(e => e.spatialType === 'devour')

  it('共 6 个', () => {
    expect(devours.length).toBe(6)
  })

  it('覆盖 6 种位置关系', () => {
    const relations = ['adjacent', 'sameRow', 'sameColumn', 'sameHand', 'sameFinger', 'symmetric']
    for (const rel of relations) {
      expect(devours.find(e => e.positionRelation === rel), `missing devour+${rel}`).toBeTruthy()
    }
  })

  it('所有 effectValue = 0.20', () => {
    for (const ench of devours) {
      expect(ench.effectValue).toBe(0.20)
    }
  })

  it('category 均为 spatial', () => {
    for (const ench of devours) {
      expect(ench.category).toBe('spatial')
    }
  })
})

describe('isEnchantment', () => {
  it('有效 ID 返回 true', () => {
    expect(isEnchantment('ench_growth_adjacent')).toBe(true)
    expect(isEnchantment('ench_trans_base')).toBe(true)
    expect(isEnchantment('ench_splash_adjacent')).toBe(true)
    expect(isEnchantment('ench_mastery')).toBe(true)
    expect(isEnchantment('ench_devour_adjacent')).toBe(true)
  })

  it('已移除的 amplify ID 返回 false', () => {
    expect(isEnchantment('ench_amplify_adjacent')).toBe(false)
    expect(isEnchantment('ench_amplify_sameRow')).toBe(false)
  })

  it('无效 ID 返回 false', () => {
    expect(isEnchantment('prod_burst')).toBe(false)
    expect(isEnchantment('nonexistent')).toBe(false)
  })
})

describe('getEnchantmentDesc', () => {
  it('返回描述', () => {
    expect(getEnchantmentDesc('ench_growth_adjacent')).toContain('相邻')
    expect(getEnchantmentDesc('ench_trans_base')).toContain('基数')
    expect(getEnchantmentDesc('ench_mastery')).toContain('触发')
  })

  it('无效 ID 返回空串', () => {
    expect(getEnchantmentDesc('nonexistent')).toBe('')
  })
})

describe('drawEnchantmentPair', () => {
  it('无过滤时返回 2 个不同的有效 ID', () => {
    for (let i = 0; i < 20; i++) {
      const [a, b] = drawEnchantmentPair()
      expect(a).not.toBe(b)
      expect(isEnchantment(a)).toBe(true)
      expect(isEnchantment(b)).toBe(true)
    }
  })

  it('传入 positionRelation 时空间类只返回匹配的', () => {
    for (let i = 0; i < 30; i++) {
      const [a, b] = drawEnchantmentPair('adjacent' as any)
      for (const id of [a, b]) {
        const ench = ENCHANTMENTS[id]
        if (ench.category === 'spatial') {
          expect(ench.positionRelation).toBe('adjacent')
        }
      }
    }
  })

  it('传入 positionRelation 时非空间类不受限', () => {
    // adjacent 过滤后池: 5 spatial(adjacent) + 5 transmutation + 1 independent = 11
    // 多次抽取应能抽到非空间类
    const nonSpatialIds = new Set<string>()
    for (let i = 0; i < 100; i++) {
      const [a, b] = drawEnchantmentPair('adjacent' as any)
      for (const id of [a, b]) {
        if (ENCHANTMENTS[id].category !== 'spatial') nonSpatialIds.add(id)
      }
    }
    expect(nonSpatialIds.size).toBeGreaterThan(0)
  })
})
