// ============================================
// 打字肉鸽 - 新 Affix 系统 · 数据 + tag query 单元测试
// ============================================

import { describe, it, expect } from 'vitest'
import {
  AFFIX_V2_DEFINITIONS,
  getAffixV2Definition,
  isAffixV2Id,
  listAffixV2BySection,
  listAffixV2ByPhase,
} from '../../../src/data/affixV2'
import { SECTION_TAGS } from '../../../src/data/affixTags'
import type { EffectSpec } from '../../../src/data/affixV2Trigger'
import {
  hasTag,
  countByTagInRegistry,
  countByTagInInstances,
  countAnyInInstances,
  countAllInInstances,
  matchTagFilter,
  countByTag,
  type FireEvent,
} from '../../../src/systems/tagQuery'

describe('EffectSpec · 10 个 kind 类型构造', () => {
  it('noop / add / multiply / gain_resource / composite 基础 5 件', () => {
    const specs: EffectSpec[] = [
      { kind: 'noop' },
      { kind: 'add', ratio: 0.5 },                          // 关内成长 base：+50% Lv1 base/fire
      { kind: 'multiply', amount: 0.5 },                     // 关内成长 factor：+0.5/fire
      { kind: 'gain_resource', resource: 'score', ratio: 0.5 }, // 一次性：50% Lv1 base
      { kind: 'composite', effects: [
        { kind: 'add', ratio: 0.3 },
        { kind: 'multiply', amount: 0.2 },
      ]},
    ]
    expect(specs.length).toBe(5)
    expect(specs[1].kind).toBe('add')
    if (specs[1].kind === 'add') expect(specs[1].ratio).toBe(0.5)
  })

  it('conditional / fire_target / apply_aura / apply_status / stack_inc / stack_release 扩展 5 件', () => {
    const specs: EffectSpec[] = [
      { kind: 'conditional', when: { type: 'is_crit' }, then: { kind: 'add', ratio: 0.5 } },
      { kind: 'fire_target', selector: { type: 'all_skills', pick: 'all' } },
      { kind: 'apply_aura', selector: { type: 'all_skills', pick: 'all' }, modifier: { type: 'crit_chance_add', amount: 0.1 } },
      { kind: 'apply_status', target: { type: 'self' }, status: 'placeholder', amount: 1 },
      { kind: 'stack_inc', amount: 1 },
      { kind: 'stack_release', threshold: 8, release: { kind: 'gain_resource', resource: 'score', ratio: 3 }, reset: true },
    ]
    expect(specs.length).toBe(6)
    expect(specs[0].kind).toBe('conditional')
    if (specs[5].kind === 'stack_release') {
      expect(specs[5].threshold).toBe(8)
      expect(specs[5].reset).toBe(true)
    }
  })

  it('AuraModifier · base_add 用 ratio，其他用 amount', () => {
    const mods = [
      { type: 'base_add' as const, ratio: 0.1 },           // 资源-anchored
      { type: 'factor_add' as const, amount: 0.2 },         // factor delta
      { type: 'crit_chance_add' as const, amount: 0.05 },   // 百分比
      { type: 'output_bonus_pct' as const, amount: 0.1 },   // 百分比
    ]
    expect(mods.length).toBe(4)
  })

  it('ConditionSpec 基础 8 条 + status 占位 2 条', () => {
    const conditions = [
      { type: 'is_crit' as const },
      { type: 'word_length_gte' as const, n: 5 },
      { type: 'word_length_lte' as const, n: 3 },
      { type: 'count_tag_gte' as const, tag: 'vocal' as const, n: 4 },
      { type: 'count_tag_lte' as const, tag: 'tool' as const, n: 2 },
      { type: 'resource_below' as const, resource: 'shield', ratio: 0.5 },  // 资源-anchored
      { type: 'resource_above' as const, resource: 'score', ratio: 5 },     // 资源-anchored
      { type: 'affix_key_count_gte' as const, n: 30 },
      { type: 'has_status' as const, target: { type: 'self' as const }, status: 'placeholder' },
      { type: 'status_count_gte' as const, target: { type: 'self' as const }, status: 'placeholder', n: 3 },
    ]
    expect(conditions.length).toBe(10)
  })
})

describe('AffixV2 数据完整性', () => {
  it('数据加载非空', () => {
    expect(AFFIX_V2_DEFINITIONS.length).toBeGreaterThan(100)
  })

  it('所有 id 唯一', () => {
    const ids = AFFIX_V2_DEFINITIONS.map(d => d.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('所有 section 属于 SECTION_TAGS', () => {
    for (const def of AFFIX_V2_DEFINITIONS) {
      expect(SECTION_TAGS).toContain(def.section)
    }
  })

  it('每个定义 tags 至少含其 section', () => {
    for (const def of AFFIX_V2_DEFINITIONS) {
      expect(def.tags).toContain(def.section)
    }
  })

  it('每个定义 name_zh 非空', () => {
    for (const def of AFFIX_V2_DEFINITIONS) {
      expect(def.name_zh.length).toBeGreaterThan(0)
    }
  })

  it('phase 只能是 P1 或 P2', () => {
    for (const def of AFFIX_V2_DEFINITIONS) {
      expect(['P1', 'P2']).toContain(def.phase)
    }
  })
})

describe('AffixV2 注册表查询', () => {
  it('getAffixV2Definition 命中已存在的 id', () => {
    const def = getAffixV2Definition('pant_hoot')
    expect(def).toBeDefined()
    expect(def?.section).toBe('vocal')
    expect(def?.name_zh).toBe('喘啸')
  })

  it('getAffixV2Definition 对未知 id 返 undefined', () => {
    expect(getAffixV2Definition('nonexistent_id')).toBeUndefined()
  })

  it('isAffixV2Id 真假判定正确', () => {
    expect(isAffixV2Id('pant_hoot')).toBe(true)
    expect(isAffixV2Id('xxx_invalid')).toBe(false)
  })

  it('listAffixV2BySection 返回正确分组', () => {
    const vocal = listAffixV2BySection('vocal')
    expect(vocal.every(d => d.section === 'vocal')).toBe(true)
    expect(vocal.length).toBeGreaterThan(0)
  })

  it('listAffixV2ByPhase 返回正确分组', () => {
    const p1 = listAffixV2ByPhase('P1')
    const p2 = listAffixV2ByPhase('P2')
    expect(p1.every(d => d.phase === 'P1')).toBe(true)
    expect(p2.every(d => d.phase === 'P2')).toBe(true)
    expect(p1.length + p2.length).toBe(AFFIX_V2_DEFINITIONS.length)
  })
})

describe('tagQuery · 静态注册表', () => {
  it('hasTag 命中已存在的 affix tag', () => {
    expect(hasTag('pant_hoot', 'vocal')).toBe(true)
    expect(hasTag('pant_hoot', 'agonistic')).toBe(false)
  })

  it('hasTag 对未知 id 返 false', () => {
    expect(hasTag('xxx', 'vocal')).toBe(false)
  })

  it('countByTagInRegistry 各 section 之和等于总数', () => {
    let sum = 0
    for (const sec of SECTION_TAGS) {
      sum += countByTagInRegistry(sec)
    }
    // 初版 tags 长度恰好 1（仅 section），所以总数等于 AFFIX_V2_DEFINITIONS.length
    expect(sum).toBe(AFFIX_V2_DEFINITIONS.length)
  })

  it('countByTag scope=registry 与 countByTagInRegistry 一致', () => {
    for (const sec of SECTION_TAGS) {
      expect(countByTag(sec, { kind: 'registry' })).toBe(countByTagInRegistry(sec))
    }
  })

  it('countByTag scope=self 1 或 0', () => {
    expect(countByTag('vocal', { kind: 'self', affixId: 'pant_hoot' })).toBe(1)
    expect(countByTag('agonistic', { kind: 'self', affixId: 'pant_hoot' })).toBe(0)
  })
})

describe('tagQuery · instances scope', () => {
  const instances = [
    { defId: 'pant_hoot' },     // vocal
    { defId: 'alarm_call' },    // vocal
    { defId: 'bite' },          // agonistic
    { defId: 'climb' },         // locomotion
  ]

  it('countByTagInInstances 多个命中', () => {
    expect(countByTagInInstances('vocal', instances)).toBe(2)
    expect(countByTagInInstances('agonistic', instances)).toBe(1)
    expect(countByTagInInstances('tool', instances)).toBe(0)
  })

  it('countAnyInInstances 并集去重计数', () => {
    expect(countAnyInInstances(['vocal', 'agonistic'], instances)).toBe(3)
    expect(countAnyInInstances(['vocal', 'tool'], instances)).toBe(2)
  })

  it('countAllInInstances all-of 语义', () => {
    // 单个 tag = 至少包含此 tag 的 instance 数
    expect(countAllInInstances(['vocal'], instances)).toBe(2)
    // 多个 tag = 单个 instance 同时含全部 tag（初版每 instance 只有 1 个 section tag）
    expect(countAllInInstances(['vocal', 'agonistic'], instances)).toBe(0)
  })
})

describe('tagQuery · matchTagFilter', () => {
  const baseEvent: FireEvent = {
    sourceAffixId: 'pant_hoot',
    sourceSkillId: 'skill_1',
    sourceKey: 'K',
    sourceResource: 'score',
    isCrit: false,
    stackState: 'none',
    amount: 1,
    timestamp: 0,
  }

  it('无 filter 时直接命中', () => {
    expect(matchTagFilter(baseEvent, {})).toBe(true)
  })

  it('单 tag 命中', () => {
    expect(matchTagFilter(baseEvent, { tag: 'vocal' })).toBe(true)
    expect(matchTagFilter(baseEvent, { tag: 'agonistic' })).toBe(false)
  })

  it('多 tag any-of 命中', () => {
    expect(matchTagFilter(baseEvent, { tag: ['vocal', 'agonistic'] })).toBe(true)
    expect(matchTagFilter(baseEvent, { tag: ['tool', 'agonistic'] })).toBe(false)
  })

  it('未知 sourceAffixId 不命中', () => {
    const badEvent = { ...baseEvent, sourceAffixId: 'xxx' }
    expect(matchTagFilter(badEvent, { tag: 'vocal' })).toBe(false)
  })
})
