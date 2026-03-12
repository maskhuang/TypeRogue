// ============================================
// 打字肉鸽 - 技能生成引擎 单元测试
// ============================================
// Story 35.2: 运行时随机生成词条制技能

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { setSeededMode, setNormalMode } from '../../../src/core/seededRandom'
import {
  AffixType,
  AffixInstance,
  AffixSkillInstance,
  AFFIX_WEIGHTS,
  BASE_VALUES,
  RARITY_PROBABILITIES,
  VOID_BONUS_TABLE,
  RESONANCE_EFFICIENCY_TABLE,
  CONVERT_K_TABLE,
  AFFIX_NAMES,
  RESOURCE_NAMES,
} from '../../../src/data/affixes'
import { PositionRelation } from '../../../src/data/keyboardTopology'
import { RESOURCE_ICONS } from '../../../src/core/constants'
import type { ResourceType } from '../../../src/core/types'
import {
  roundTo,
  pickRandom,
  rollRarity,
  weightedSampleWithout,
  rollAffixParams,
  generateName,
  generateSkill,
} from '../../../src/data/skillGeneration'
import type { SkillRarity } from '../../../src/data/affixes'

const ALL_RESOURCES: ResourceType[] = ['base', 'score', 'multiplier', 'time', 'gold', 'fragment', 'mutagen']
const ALL_POS_RELATIONS = Object.values(PositionRelation)

// 使用种子模式确保测试可重复
beforeAll(() => setSeededMode(42))
afterAll(() => setNormalMode())

// ===== roundTo =====

describe('roundTo', () => {
  it('should round to specified decimal places', () => {
    expect(roundTo(1.2345, 2)).toBe(1.23)
    expect(roundTo(1.2355, 2)).toBe(1.24)
    expect(roundTo(1.5, 0)).toBe(2)
    expect(roundTo(0.123456, 4)).toBe(0.1235)
  })

  it('should handle zero decimals', () => {
    expect(roundTo(3.7, 0)).toBe(4)
    expect(roundTo(3.2, 0)).toBe(3)
  })

  it('should handle negative numbers', () => {
    // 注意：JS 浮点精度导致 -1.555*100 = -155.4999...，Math.round 得 -155 而非 -156
    // 此断言反映 JS 实际行为，非数学上的四舍五入
    expect(roundTo(-1.555, 2)).toBe(-1.55)
  })
})

// ===== pickRandom =====

describe('pickRandom', () => {
  it('should return an element from the array', () => {
    const arr = [10, 20, 30, 40, 50]
    for (let i = 0; i < 20; i++) {
      expect(arr).toContain(pickRandom(arr))
    }
  })

  it('should work with single-element arrays', () => {
    expect(pickRandom([99])).toBe(99)
  })
})

// ===== ALL_RESOURCES 完整性验证 =====

describe('ALL_RESOURCES completeness', () => {
  it('should match RESOURCE_NAMES keys (proxy for ResourceType union)', () => {
    const resourceNameKeys = Object.keys(RESOURCE_NAMES).sort()
    expect([...ALL_RESOURCES].sort()).toEqual(resourceNameKeys)
  })

  it('should match BASE_VALUES keys', () => {
    const baseValueKeys = Object.keys(BASE_VALUES).sort()
    expect([...ALL_RESOURCES].sort()).toEqual(baseValueKeys)
  })

  it('should match RESOURCE_ICONS keys', () => {
    for (const res of ALL_RESOURCES) {
      expect(RESOURCE_ICONS[res]).toBeDefined()
    }
  })
})

// ===== rollRarity =====

describe('rollRarity', () => {
  it('should return values in 0-3 range', () => {
    for (let i = 0; i < 100; i++) {
      const r = rollRarity()
      expect(r).toBeGreaterThanOrEqual(0)
      expect(r).toBeLessThanOrEqual(3)
    }
  })

  it('should follow approximate probability distribution over 10000 rolls', () => {
    // 使用固定种子确保可重复
    setSeededMode(12345)
    const counts = [0, 0, 0, 0]
    const N = 10000
    for (let i = 0; i < N; i++) {
      counts[rollRarity()]++
    }
    // 白 40%, 蓝 30%, 黄 20%, 橙 10%, 容差 ±5%
    expect(counts[0] / N).toBeCloseTo(0.40, 1) // ±0.05
    expect(counts[1] / N).toBeCloseTo(0.30, 1)
    expect(counts[2] / N).toBeCloseTo(0.20, 1)
    expect(counts[3] / N).toBeCloseTo(0.10, 1)
    // 恢复种子
    setSeededMode(42)
  })
})

// ===== weightedSampleWithout =====

describe('weightedSampleWithout', () => {
  it('should return empty array for count=0', () => {
    expect(weightedSampleWithout(0)).toEqual([])
  })

  it('should return requested number of items', () => {
    for (let n = 1; n <= 3; n++) {
      const result = weightedSampleWithout(n)
      expect(result).toHaveLength(n)
    }
  })

  it('should not return duplicate affix types', () => {
    setSeededMode(999)
    for (let trial = 0; trial < 50; trial++) {
      const result = weightedSampleWithout(3)
      const types = result.map(r => r.type)
      // Convert 可以只出现一次（cross 和 self 共占一个 Convert 位）
      const uniqueTypes = new Set(types)
      expect(uniqueTypes.size).toBe(types.length)
    }
    setSeededMode(42)
  })

  it('should return valid AffixType values', () => {
    const allTypes = Object.values(AffixType)
    for (let i = 0; i < 30; i++) {
      const result = weightedSampleWithout(3)
      for (const r of result) {
        expect(allTypes).toContain(r.type)
      }
    }
  })

  it('should include convertVariant field only for Convert type', () => {
    setSeededMode(7777)
    let foundConvert = false
    for (let i = 0; i < 200; i++) {
      const result = weightedSampleWithout(3)
      for (const r of result) {
        if (r.type === AffixType.Convert) {
          foundConvert = true
          expect(['cross', 'self']).toContain(r.convertVariant)
        } else {
          expect(r.convertVariant).toBeUndefined()
        }
      }
    }
    expect(foundConvert).toBe(true) // 确保至少出现过一次 Convert
    setSeededMode(42)
  })

  it('should gracefully handle count > pool size', () => {
    // 池中最多 21 项（20 个 AffixType，Convert 拆为 cross/self）
    const result = weightedSampleWithout(100)
    expect(result.length).toBeLessThanOrEqual(21)
    expect(result.length).toBeGreaterThan(0)
    // 仍然不重复
    const types = result.map(r => r.type)
    expect(new Set(types).size).toBe(types.length)
  })

  it('should have higher-weight types appear more frequently over many samples', () => {
    setSeededMode(54321)
    const typeCounts = new Map<string, number>()
    const N = 5000
    for (let i = 0; i < N; i++) {
      const result = weightedSampleWithout(1)
      const key = result[0].type === AffixType.Convert
        ? `convert_${result[0].convertVariant}`
        : result[0].type
      typeCounts.set(key, (typeCounts.get(key) || 0) + 1)
    }
    // Void (weight 10) 应出现比 Twin (weight 2) 频率高约 5 倍
    const voidCount = typeCounts.get(AffixType.Void) || 0
    const twinCount = typeCounts.get(AffixType.Twin) || 0
    expect(voidCount).toBeGreaterThan(twinCount * 2) // 至少 2 倍（保守）
    setSeededMode(42)
  })
})

// ===== rollAffixParams =====

describe('rollAffixParams', () => {
  const resource: ResourceType = 'base'

  describe('Multiply', () => {
    it('should return multiplier in [1.3, 2.0]', () => {
      for (let i = 0; i < 100; i++) {
        const a = rollAffixParams(AffixType.Multiply, resource)
        expect(a.type).toBe(AffixType.Multiply)
        expect(a.multiplier).toBeGreaterThanOrEqual(1.3)
        expect(a.multiplier).toBeLessThanOrEqual(2.0)
      }
    })
  })

  describe('Convert (cross)', () => {
    it('should have source ≠ resource when cross variant', () => {
      for (let i = 0; i < 50; i++) {
        const a = rollAffixParams(AffixType.Convert, 'base', 'cross')
        expect(a.type).toBe(AffixType.Convert)
        expect(a.source).toBeDefined()
        expect(a.source).not.toBe('base')
        expect(ALL_RESOURCES).toContain(a.source)
        expect(a.k).toBeDefined()
        expect(a.k!).toBeGreaterThan(0)
      }
    })
  })

  describe('Convert (self)', () => {
    it('should have source === resource when self variant', () => {
      for (const res of ALL_RESOURCES) {
        const a = rollAffixParams(AffixType.Convert, res, 'self')
        expect(a.source).toBe(res)
        const [kMin, kMax] = CONVERT_K_TABLE[res]
        expect(a.k!).toBeGreaterThanOrEqual(kMin)
        expect(a.k!).toBeLessThanOrEqual(kMax)
      }
    })
  })

  describe('Convert k value', () => {
    it('should have k within CONVERT_K_TABLE range for the source', () => {
      for (let i = 0; i < 100; i++) {
        const a = rollAffixParams(AffixType.Convert, 'gold', 'cross')
        const [kMin, kMax] = CONVERT_K_TABLE[a.source!]
        expect(a.k!).toBeGreaterThanOrEqual(kMin)
        expect(a.k!).toBeLessThanOrEqual(kMax)
      }
    })
  })

  describe('Rainbow', () => {
    it('should return only type', () => {
      const a = rollAffixParams(AffixType.Rainbow, resource)
      expect(a.type).toBe(AffixType.Rainbow)
    })
  })

  describe('Charge', () => {
    it('should have fixed parameters', () => {
      const a = rollAffixParams(AffixType.Charge, resource)
      expect(a.gainPerSec).toBe(0.08)
      expect(a.maxBonus).toBe(2.0)
    })
  })

  describe('Decay', () => {
    it('should have fixed parameters', () => {
      const a = rollAffixParams(AffixType.Decay, resource)
      expect(a.initialMult).toBe(2.0)
      expect(a.decayPerTrigger).toBe(0.15)
      expect(a.floor).toBe(0.5)
    })
  })

  describe('Pulse', () => {
    it('should have fixed parameters', () => {
      const a = rollAffixParams(AffixType.Pulse, resource)
      expect(a.interval).toBe(4)
      expect(a.burstMult).toBe(3.0)
    })
  })

  describe('Crit', () => {
    it('should have fixed parameters', () => {
      const a = rollAffixParams(AffixType.Crit, resource)
      expect(a.chance).toBe(0.5)
      expect(a.critMult).toBe(2.0)
    })
  })

  describe('Cascade', () => {
    it('should have posRel and cascadeMult in [1.8, 2.5]', () => {
      for (let i = 0; i < 50; i++) {
        const a = rollAffixParams(AffixType.Cascade, resource)
        expect(ALL_POS_RELATIONS).toContain(a.posRel)
        expect(a.cascadeMult).toBeGreaterThanOrEqual(1.8)
        expect(a.cascadeMult).toBeLessThanOrEqual(2.5)
      }
    })
  })

  describe('Void', () => {
    it('should have posRel and correct bonusPerSlot from table', () => {
      for (let i = 0; i < 50; i++) {
        const a = rollAffixParams(AffixType.Void, resource)
        expect(ALL_POS_RELATIONS).toContain(a.posRel)
        expect(a.bonusPerSlot).toBe(VOID_BONUS_TABLE[a.posRel!])
      }
    })
  })

  describe('Resonance', () => {
    it('should have posRel and correct efficiency from table', () => {
      for (let i = 0; i < 50; i++) {
        const a = rollAffixParams(AffixType.Resonance, resource)
        expect(ALL_POS_RELATIONS).toContain(a.posRel)
        expect(a.efficiency).toBe(RESONANCE_EFFICIENCY_TABLE[a.posRel!])
      }
    })
  })

  describe('Mirror', () => {
    it('should have posRel', () => {
      const a = rollAffixParams(AffixType.Mirror, resource)
      expect(ALL_POS_RELATIONS).toContain(a.posRel)
    })
  })

  describe('Link (感应)', () => {
    it('should have posRel and random watchAffix (excluding Link itself)', () => {
      const allAffixTypes = Object.values(AffixType)
      for (let i = 0; i < 30; i++) {
        const a = rollAffixParams(AffixType.Link, resource)
        expect(ALL_POS_RELATIONS).toContain(a.posRel)
        expect(a.watchAffix).toBeDefined()
        expect(allAffixTypes).toContain(a.watchAffix)
        expect(a.watchAffix).not.toBe(AffixType.Link)
      }
    })
  })

  describe('Replicate', () => {
    it('should have posRel', () => {
      const a = rollAffixParams(AffixType.Replicate, resource)
      expect(ALL_POS_RELATIONS).toContain(a.posRel)
    })
  })

  describe('Amplify', () => {
    it('should use skill resource (not random) and have valuePerStack', () => {
      for (const res of ALL_RESOURCES) {
        const a = rollAffixParams(AffixType.Amplify, res)
        expect(ALL_POS_RELATIONS).toContain(a.posRel)
        expect(a.resource).toBe(res) // 设计文档 §八：使用技能本身的资源
        expect(a.valuePerStack).toBe(0.02)
      }
    })
  })

  describe('Outcast', () => {
    it('should have bonusPercent in [0.4, 0.8]', () => {
      for (let i = 0; i < 50; i++) {
        const a = rollAffixParams(AffixType.Outcast, resource)
        expect(a.bonusPercent).toBeGreaterThanOrEqual(0.4)
        expect(a.bonusPercent).toBeLessThanOrEqual(0.8)
      }
    })
  })

  describe('Gravity', () => {
    it('should have probMult in [0, 2.0]', () => {
      for (let i = 0; i < 50; i++) {
        const a = rollAffixParams(AffixType.Gravity, resource)
        expect(a.probMult).toBeGreaterThanOrEqual(0)
        expect(a.probMult).toBeLessThanOrEqual(2.0)
      }
    })
  })

  describe('Ligature', () => {
    it('should return only type', () => {
      const a = rollAffixParams(AffixType.Ligature, resource)
      expect(a.type).toBe(AffixType.Ligature)
    })
  })

  describe('Twin', () => {
    it('should return only type', () => {
      const a = rollAffixParams(AffixType.Twin, resource)
      expect(a.type).toBe(AffixType.Twin)
    })
  })

  describe('Recurse', () => {
    it('should have recurseChance in [0.15, 0.30]', () => {
      for (let i = 0; i < 50; i++) {
        const a = rollAffixParams(AffixType.Recurse, resource)
        expect(a.recurseChance).toBeGreaterThanOrEqual(0.15)
        expect(a.recurseChance).toBeLessThanOrEqual(0.30)
      }
    })
  })

  describe('Taboo', () => {
    it('should have fixed parameters', () => {
      const a = rollAffixParams(AffixType.Taboo, resource)
      expect(a.bonusPercent).toBe(1.0)
      expect(a.penaltyChance).toBe(0.10)
    })
  })

  it('should cover all 20 AffixType cases', () => {
    for (const at of Object.values(AffixType)) {
      const a = rollAffixParams(at, resource)
      expect(a.type).toBe(at)
    }
  })
})

// ===== generateName =====

describe('generateName', () => {
  it('should return resource name only for zero affixes (白装)', () => {
    expect(generateName('base', [])).toBe('基数')
    expect(generateName('score', [])).toBe('分数')
    expect(generateName('mutagen', [])).toBe('变异素')
  })

  it('should format as "词条·资源" for one affix (蓝装)', () => {
    const affixes: AffixInstance[] = [{ type: AffixType.Crit }]
    expect(generateName('base', affixes)).toBe('暴击·基数')
  })

  it('should format as "词条1·词条2·资源" for two affixes (黄装)', () => {
    const affixes: AffixInstance[] = [
      { type: AffixType.Crit },
      { type: AffixType.Charge },
    ]
    expect(generateName('base', affixes)).toBe('暴击·蓄力·基数')
  })

  it('should format as "词条1·词条2·词条3·资源" for three affixes (橙装)', () => {
    const affixes: AffixInstance[] = [
      { type: AffixType.Crit },
      { type: AffixType.Charge },
      { type: AffixType.Resonance },
    ]
    expect(generateName('base', affixes)).toBe('暴击·蓄力·共鸣·基数')
  })

  it('should use correct AFFIX_NAMES and RESOURCE_NAMES', () => {
    for (const at of Object.values(AffixType)) {
      const name = generateName('gold', [{ type: at }])
      expect(name).toBe(`${AFFIX_NAMES[at]}·金币`)
    }
    for (const res of ALL_RESOURCES) {
      expect(generateName(res, [])).toBe(RESOURCE_NAMES[res])
    }
  })
})

// ===== generateSkill =====

describe('generateSkill', () => {
  it('should return a valid AffixSkillInstance', () => {
    const skill = generateSkill()
    expect(skill.id).toMatch(/^skill_\d+_[a-z0-9]+$/)
    expect(ALL_RESOURCES).toContain(skill.resource)
    expect(skill.baseValues).toEqual(BASE_VALUES[skill.resource])
    expect(skill.level).toBe(1)
    expect([0, 1, 2, 3]).toContain(skill.rarity)
    expect(skill.affixes).toHaveLength(skill.rarity)
    expect(skill.enchantmentIds).toEqual([])
    expect(skill.icon).toBe(RESOURCE_ICONS[skill.resource])
    expect(skill.name.length).toBeGreaterThan(0)
  })

  it('should respect forced resource option', () => {
    for (const res of ALL_RESOURCES) {
      const skill = generateSkill({ resource: res })
      expect(skill.resource).toBe(res)
      expect(skill.baseValues).toEqual(BASE_VALUES[res])
      expect(skill.icon).toBe(RESOURCE_ICONS[res])
    }
  })

  it('should respect forced rarity option', () => {
    for (const r of [0, 1, 2, 3] as SkillRarity[]) {
      const skill = generateSkill({ rarity: r })
      expect(skill.rarity).toBe(r)
      expect(skill.affixes).toHaveLength(r)
    }
  })

  it('should respect forced level option', () => {
    const skill = generateSkill({ level: 3 })
    expect(skill.level).toBe(3)
  })

  it('white (0) should have no affixes, name = resource name', () => {
    const skill = generateSkill({ rarity: 0 as SkillRarity, resource: 'base' })
    expect(skill.affixes).toHaveLength(0)
    expect(skill.name).toBe('基数')
  })

  it('blue (1) should have 1 affix', () => {
    const skill = generateSkill({ rarity: 1 as SkillRarity })
    expect(skill.affixes).toHaveLength(1)
    expect(skill.name).toContain('·')
  })

  it('yellow (2) should have 2 affixes', () => {
    const skill = generateSkill({ rarity: 2 as SkillRarity })
    expect(skill.affixes).toHaveLength(2)
  })

  it('orange (3) should have 3 affixes', () => {
    const skill = generateSkill({ rarity: 3 as SkillRarity })
    expect(skill.affixes).toHaveLength(3)
  })

  it('should generate unique IDs', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      const skill = generateSkill()
      ids.add(skill.id)
    }
    expect(ids.size).toBe(100)
  })

  it('should generate 100 valid skills end-to-end', () => {
    setSeededMode(99999)
    for (let i = 0; i < 100; i++) {
      const skill = generateSkill()
      // 基础结构校验
      expect(skill.id).toBeTruthy()
      expect(ALL_RESOURCES).toContain(skill.resource)
      expect(skill.baseValues).toEqual(BASE_VALUES[skill.resource])
      expect(skill.affixes).toHaveLength(skill.rarity)
      // 每个词条的 type 应有效
      for (const aff of skill.affixes) {
        expect(Object.values(AffixType)).toContain(aff.type)
      }
      // 词条不应重复
      const affTypes = skill.affixes.map(a => a.type)
      expect(new Set(affTypes).size).toBe(affTypes.length)
    }
    setSeededMode(42)
  })
})

// ===== JSON 序列化往返 =====

describe('JSON serialization roundtrip', () => {
  it('should survive JSON.stringify/parse without data loss', () => {
    setSeededMode(77777)
    for (let i = 0; i < 20; i++) {
      const skill = generateSkill()
      const json = JSON.stringify(skill)
      const parsed = JSON.parse(json) as AffixSkillInstance
      expect(parsed).toEqual(skill)
    }
    setSeededMode(42)
  })

  it('should preserve all affix fields through serialization', () => {
    // 生成一个橙装（3 词条）来最大化字段覆盖
    const skill = generateSkill({ rarity: 3 as SkillRarity })
    const roundTripped = JSON.parse(JSON.stringify(skill))
    expect(roundTripped.id).toBe(skill.id)
    expect(roundTripped.name).toBe(skill.name)
    expect(roundTripped.resource).toBe(skill.resource)
    expect(roundTripped.affixes).toHaveLength(3)
    for (let i = 0; i < 3; i++) {
      expect(roundTripped.affixes[i]).toEqual(skill.affixes[i])
    }
  })
})

// ===== 转化同源/异源权重差异测试 =====

describe('Convert cross/self weight differentiation', () => {
  it('convert_cross should appear more frequently than convert_self', () => {
    setSeededMode(11111)
    let crossCount = 0
    let selfCount = 0
    const N = 5000
    for (let i = 0; i < N; i++) {
      const result = weightedSampleWithout(1)
      if (result[0].type === AffixType.Convert) {
        if (result[0].convertVariant === 'cross') crossCount++
        else if (result[0].convertVariant === 'self') selfCount++
      }
    }
    // convert_cross: 10, convert_self: 3, 所以 cross 应出现约 3.3 倍
    if (selfCount > 0) {
      expect(crossCount / selfCount).toBeGreaterThan(1.5) // 保守
    } else {
      // selfCount 太少也合理（权重低），但 cross 应有足够量
      expect(crossCount).toBeGreaterThan(0)
    }
    setSeededMode(42)
  })

  it('rollAffixParams with cross variant should never pick same resource as skill', () => {
    for (const res of ALL_RESOURCES) {
      for (let i = 0; i < 20; i++) {
        const a = rollAffixParams(AffixType.Convert, res, 'cross')
        expect(a.source).not.toBe(res)
      }
    }
  })

  it('rollAffixParams with self variant should always pick same resource as skill', () => {
    for (const res of ALL_RESOURCES) {
      const a = rollAffixParams(AffixType.Convert, res, 'self')
      expect(a.source).toBe(res)
    }
  })
})
