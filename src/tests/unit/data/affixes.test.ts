// ============================================
// 打字肉鸽 - 词条制数据定义 单元测试
// ============================================
// Story 35.1: 核心数据结构与词条定义

import { describe, it, expect } from 'vitest'
import {
  AffixType,
  AffixCategory,
  AFFIX_CATEGORY_MAP,
  EnchantmentType,
  QUEST_AFFIX_MAP,
  QUEST_ENCHANTMENT_DEFS,
  AFFIX_WEIGHTS,
  BASE_VALUES,
  VOID_BONUS_TABLE,
  CONVERT_K_TABLE,
  AFFIX_NAMES,
  RESOURCE_NAMES,
  RARITY_NAMES,
  RARITY_COLORS,
  RARITY_PROBABILITIES,
  APPRENTICE_NEIGHBOR_GROWTH,
  createSkillRuntimeState,
} from '../../../src/data/affixes'
import type { AffixSkillSaveData } from '../../../src/data/affixes'
import { PositionRelation } from '../../../src/data/keyboardTopology'
import type { ResourceType } from '../../../src/core/types'

// ===== AffixType 枚举 =====

describe('AffixType', () => {
  const allAffixTypes = Object.values(AffixType)

  it('should have exactly 20 values', () => {
    expect(allAffixTypes).toHaveLength(20)
  })

  it('should have unique string values', () => {
    const unique = new Set(allAffixTypes)
    expect(unique.size).toBe(20)
  })

  it('should contain all expected types', () => {
    const expected = [
      'convert', 'rainbow',
      'charge', 'decay', 'pulse', 'crit', 'cascade',
      'void', 'resonance', 'mirror',
      'link', 'splash', 'amplify', 'conduit',
      'outcast', 'gravity', 'ligature',
      'twin', 'recurse', 'taboo',
    ]
    expect(allAffixTypes.sort()).toEqual(expected.sort())
  })
})

// ===== AFFIX_CATEGORY_MAP =====

describe('AFFIX_CATEGORY_MAP', () => {
  const allAffixTypes = Object.values(AffixType)

  it('should cover all 20 AffixType values', () => {
    for (const t of allAffixTypes) {
      expect(AFFIX_CATEGORY_MAP[t]).toBeDefined()
    }
  })

  it('should only use valid category values', () => {
    const validCategories: AffixCategory[] = ['numeric', 'rhythm', 'topology', 'trigger_chain', 'word_sense', 'meta_rule']
    for (const cat of Object.values(AFFIX_CATEGORY_MAP)) {
      expect(validCategories).toContain(cat)
    }
  })

  it('should have correct category assignments', () => {
    expect(AFFIX_CATEGORY_MAP[AffixType.Convert]).toBe('numeric')
    expect(AFFIX_CATEGORY_MAP[AffixType.Charge]).toBe('rhythm')
    expect(AFFIX_CATEGORY_MAP[AffixType.Void]).toBe('topology')
    expect(AFFIX_CATEGORY_MAP[AffixType.Link]).toBe('trigger_chain')
    expect(AFFIX_CATEGORY_MAP[AffixType.Conduit]).toBe('trigger_chain')
    expect(AFFIX_CATEGORY_MAP[AffixType.Outcast]).toBe('word_sense')
    expect(AFFIX_CATEGORY_MAP[AffixType.Twin]).toBe('meta_rule')
  })

  it('should have 2 numeric, 5 rhythm, 3 topology, 4 trigger_chain, 3 word_sense, 3 meta_rule', () => {
    const counts: Record<AffixCategory, number> = { numeric: 0, rhythm: 0, topology: 0, trigger_chain: 0, word_sense: 0, meta_rule: 0 }
    for (const cat of Object.values(AFFIX_CATEGORY_MAP)) {
      counts[cat]++
    }
    expect(counts.numeric).toBe(2)
    expect(counts.rhythm).toBe(5)
    expect(counts.topology).toBe(3)
    expect(counts.trigger_chain).toBe(4)
    expect(counts.word_sense).toBe(3)
    expect(counts.meta_rule).toBe(3)
  })
})

// ===== EnchantmentType 枚举 =====

describe('EnchantmentType', () => {
  const allEnchTypes = Object.values(EnchantmentType)

  it('should have exactly 46 values', () => {
    expect(allEnchTypes).toHaveLength(46)
  })

  it('should have unique string values', () => {
    const unique = new Set(allEnchTypes)
    expect(unique.size).toBe(46)
  })

  it('should have 28 apprentice types (3 generic + 5 resource + 20 affix)', () => {
    const apprentice = allEnchTypes.filter(v => v.startsWith('apprentice_'))
    expect(apprentice).toHaveLength(28)
  })

  it('should have 17 quest types', () => {
    const quest = allEnchTypes.filter(v => v.startsWith('quest_'))
    expect(quest).toHaveLength(17)
  })
})

// ===== QUEST_AFFIX_MAP =====

describe('QUEST_AFFIX_MAP', () => {
  it('should have 18 quest enchantment mappings', () => {
    const questTypes = Object.values(EnchantmentType).filter(v => v.startsWith('quest_'))
    for (const qt of questTypes) {
      expect(QUEST_AFFIX_MAP[qt as EnchantmentType]).toBeDefined()
    }
  })

  it('should map QuestResonance to both Resonance and Link', () => {
    const mapping = QUEST_AFFIX_MAP[EnchantmentType.QuestResonance]
    expect(Array.isArray(mapping)).toBe(true)
    expect(mapping).toContain(AffixType.Resonance)
    expect(mapping).toContain(AffixType.Link)
  })

  it('should map QuestCharge to Outcast (蓄势→流放)', () => {
    expect(QUEST_AFFIX_MAP[EnchantmentType.QuestCharge]).toBe(AffixType.Outcast)
  })

  it('should map QuestEnergize to Charge (充能→蓄力)', () => {
    expect(QUEST_AFFIX_MAP[EnchantmentType.QuestEnergize]).toBe(AffixType.Charge)
  })

  it('should cover all affix types except Twin and Conduit (no quest)', () => {
    const coveredAffixes = new Set<AffixType>()
    for (const mapping of Object.values(QUEST_AFFIX_MAP)) {
      if (Array.isArray(mapping)) {
        for (const a of mapping) coveredAffixes.add(a)
      } else if (mapping) {
        coveredAffixes.add(mapping)
      }
    }
    const noQuestTypes = new Set([AffixType.Twin, AffixType.Conduit])
    const allAffixTypes = Object.values(AffixType)
    for (const at of allAffixTypes) {
      if (noQuestTypes.has(at)) {
        expect(coveredAffixes.has(at)).toBe(false)
      } else {
        expect(coveredAffixes.has(at)).toBe(true)
      }
    }
  })
})

// ===== QUEST_ENCHANTMENT_DEFS =====

describe('QUEST_ENCHANTMENT_DEFS', () => {
  it('should have 17 definitions', () => {
    expect(QUEST_ENCHANTMENT_DEFS).toHaveLength(17)
  })

  it('should have unique enchantment types', () => {
    const types = QUEST_ENCHANTMENT_DEFS.map(d => d.type)
    expect(new Set(types).size).toBe(17)
  })

  it('should have positive targetStacks for all', () => {
    for (const def of QUEST_ENCHANTMENT_DEFS) {
      expect(def.targetStacks).toBeGreaterThan(0)
    }
  })

  it('should have targetAffix consistent with QUEST_AFFIX_MAP', () => {
    for (const def of QUEST_ENCHANTMENT_DEFS) {
      const mapValue = QUEST_AFFIX_MAP[def.type]
      expect(mapValue).toBeDefined()
      if (Array.isArray(def.targetAffix)) {
        expect(Array.isArray(mapValue)).toBe(true)
        expect(def.targetAffix).toEqual(mapValue)
      } else {
        expect(def.targetAffix).toBe(mapValue)
      }
    }
  })
})

// ===== AFFIX_WEIGHTS =====

describe('AFFIX_WEIGHTS', () => {
  it('should have weights for all AffixType values (convert split into cross/self)', () => {
    const allAffixTypes = Object.values(AffixType)
    for (const at of allAffixTypes) {
      if (at === AffixType.Convert) {
        expect(AFFIX_WEIGHTS['convert_cross']).toBeDefined()
        expect(AFFIX_WEIGHTS['convert_self']).toBeDefined()
      } else {
        expect(AFFIX_WEIGHTS[at]).toBeDefined()
      }
    }
  })

  it('should have all positive weights', () => {
    for (const [key, weight] of Object.entries(AFFIX_WEIGHTS)) {
      expect(weight).toBeGreaterThan(0)
    }
  })

  it('should have convert_cross > convert_self', () => {
    expect(AFFIX_WEIGHTS['convert_cross']).toBeGreaterThan(AFFIX_WEIGHTS['convert_self'])
  })

  it('should have twin as the rarest (weight 2)', () => {
    expect(AFFIX_WEIGHTS[AffixType.Twin]).toBe(2)
    for (const [key, weight] of Object.entries(AFFIX_WEIGHTS)) {
      expect(weight).toBeGreaterThanOrEqual(2)
    }
  })
})

// ===== BASE_VALUES =====

describe('BASE_VALUES', () => {
  const ALL_RESOURCES: ResourceType[] = ['base', 'score', 'multiplier', 'time', 'gold', 'fragment', 'mutagen']

  it('should cover all 7 resource types', () => {
    for (const r of ALL_RESOURCES) {
      expect(BASE_VALUES[r]).toBeDefined()
      expect(BASE_VALUES[r]).toHaveLength(3)
    }
  })

  it('should have strictly increasing values per level', () => {
    for (const r of ALL_RESOURCES) {
      const [lv1, lv2, lv3] = BASE_VALUES[r]
      expect(lv2).toBeGreaterThan(lv1)
      expect(lv3).toBeGreaterThan(lv2)
    }
  })

  it('should match design doc values', () => {
    expect(BASE_VALUES.base).toEqual([5, 8, 12])
    expect(BASE_VALUES.score).toEqual([15, 24, 36])
    expect(BASE_VALUES.multiplier).toEqual([0.2, 0.32, 0.48])
    expect(BASE_VALUES.gold).toEqual([3, 5, 8])
  })
})

// ===== VOID_BONUS_TABLE =====

describe('VOID_BONUS_TABLE', () => {
  const ALL_POS_RELS = Object.values(PositionRelation)

  it('should cover all 6 PositionRelation values', () => {
    for (const pr of ALL_POS_RELS) {
      expect(VOID_BONUS_TABLE[pr]).toBeDefined()
    }
  })

  it('should have values between 0 and 1', () => {
    for (const pr of ALL_POS_RELS) {
      expect(VOID_BONUS_TABLE[pr]).toBeGreaterThan(0)
      expect(VOID_BONUS_TABLE[pr]).toBeLessThanOrEqual(1)
    }
  })

  it('should match design doc values', () => {
    expect(VOID_BONUS_TABLE[PositionRelation.Adjacent]).toBe(0.25)
    expect(VOID_BONUS_TABLE[PositionRelation.SameHand]).toBe(0.05)
    expect(VOID_BONUS_TABLE[PositionRelation.Symmetric]).toBe(0.50)
  })
})

// ===== CONVERT_K_TABLE =====

describe('CONVERT_K_TABLE', () => {
  const ALL_RESOURCES: ResourceType[] = ['base', 'score', 'multiplier', 'time', 'gold', 'fragment', 'mutagen']

  it('should cover all 7 resource types', () => {
    for (const r of ALL_RESOURCES) {
      expect(CONVERT_K_TABLE[r]).toBeDefined()
      expect(CONVERT_K_TABLE[r]).toHaveLength(2)
    }
  })

  it('should have k_min < k_max for all resources', () => {
    for (const r of ALL_RESOURCES) {
      const [kMin, kMax] = CONVERT_K_TABLE[r]
      expect(kMin).toBeGreaterThan(0)
      expect(kMax).toBeGreaterThan(kMin)
    }
  })

  it('should have score k values much smaller than others (score accumulates)', () => {
    const [scoreMin] = CONVERT_K_TABLE.score
    const [baseMin] = CONVERT_K_TABLE.base
    expect(scoreMin).toBeLessThan(baseMin)
  })
})

// ===== AFFIX_NAMES =====

describe('AFFIX_NAMES', () => {
  it('should cover all 20 AffixType values', () => {
    for (const at of Object.values(AffixType)) {
      expect(AFFIX_NAMES[at]).toBeDefined()
      expect(AFFIX_NAMES[at].length).toBeGreaterThan(0)
    }
  })

  it('should have unique names', () => {
    const names = Object.values(AFFIX_NAMES)
    expect(new Set(names).size).toBe(names.length)
  })
})

// ===== RESOURCE_NAMES =====

describe('RESOURCE_NAMES', () => {
  const ALL_RESOURCES: ResourceType[] = ['base', 'score', 'multiplier', 'time', 'gold', 'fragment', 'mutagen']

  it('should cover all 7 ResourceType values', () => {
    for (const r of ALL_RESOURCES) {
      expect(RESOURCE_NAMES[r]).toBeDefined()
      expect(RESOURCE_NAMES[r].length).toBeGreaterThan(0)
    }
  })
})

// ===== RARITY =====

describe('Rarity constants', () => {
  it('RARITY_NAMES should cover 0-3', () => {
    expect(RARITY_NAMES[0]).toBe('普通')
    expect(RARITY_NAMES[1]).toBe('稀有')
    expect(RARITY_NAMES[2]).toBe('史诗')
    expect(RARITY_NAMES[3]).toBe('传说')
  })

  it('RARITY_COLORS should cover 0-3', () => {
    for (const r of [0, 1, 2, 3] as const) {
      expect(RARITY_COLORS[r]).toBeDefined()
      expect(RARITY_COLORS[r]).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('RARITY_PROBABILITIES should sum to 1.0', () => {
    const sum = RARITY_PROBABILITIES.reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1.0)
  })
})

// ===== APPRENTICE_NEIGHBOR_GROWTH =====

describe('APPRENTICE_NEIGHBOR_GROWTH', () => {
  it('should cover all 6 PositionRelation values', () => {
    for (const pr of Object.values(PositionRelation)) {
      expect(APPRENTICE_NEIGHBOR_GROWTH[pr]).toBeDefined()
      expect(APPRENTICE_NEIGHBOR_GROWTH[pr]).toBeGreaterThan(0)
    }
  })
})

// ===== createSkillRuntimeState =====

describe('createSkillRuntimeState', () => {
  it('should create state with default values', () => {
    const state = createSkillRuntimeState('test_skill')
    expect(state.skillId).toBe('test_skill')
    expect(state.chargeAccumulated).toBe(0)
    expect(state.currentDecayMult).toBe(1)  // 中性乘数，衰减词条每词重置为 initialMult
    expect(state.mirrorCopiedAffix).toBeNull()
    expect(state.triggerCount).toBe(0)
    expect(state.amplifyStacks).toBe(0)
    expect(state.apprenticeAccumulated).toBe(0)
    expect(state.questStacks).toBe(0)
    expect(state.questCompletions).toBe(0)
    expect(state.questTransformed).toBe(false)
  })
})

// ===== AffixSkillSaveData =====

describe('AffixSkillSaveData', () => {
  it('should be importable and usable as a type', () => {
    const saveData: AffixSkillSaveData = {
      id: 'test_save',
      resource: 'base',
      level: 1,
      rarity: 2,
      affixes: [{ type: AffixType.Crit, chance: 0.5, critMult: 2.0 }],
      enchantmentIds: [],
      runtime: createSkillRuntimeState('test_save'),
    }
    expect(saveData.id).toBe('test_save')
    expect(saveData.runtime.skillId).toBe('test_save')
    expect(saveData.affixes).toHaveLength(1)
  })
})
