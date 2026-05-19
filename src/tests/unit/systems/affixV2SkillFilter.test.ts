// ============================================
// 打字肉鸽 - SkillFilter 匹配 + widen 兜底测试
// ============================================

import { describe, it, expect, afterEach } from 'vitest'
import {
  matchSkillFilter,
  getCandidatePool,
  widenSkillFilter,
  spawnSkillFromSeed,
  type SkillSeed,
} from '../../../src/systems/affixV2SkillFilter'
import type { SkillFilter } from '../../../src/src/data/affixV2Trigger'
import { state as gameState } from '../../../src/core/state'
import type { ShopItem, AffixSkillInstance } from '../../../src/core/types'

// 构造测试用 seed
function mkSeed(section: SkillSeed['section'], resourcePool?: readonly string[]): SkillSeed {
  return { source: 'recipe_pool', section, resourcePool }
}

describe('matchSkillFilter · 单字段', () => {
  it('空 filter → 全部命中', () => {
    expect(matchSkillFilter(mkSeed('tool'), {})).toBe(true)
    expect(matchSkillFilter(mkSeed('abnormal'), {})).toBe(true)
  })

  it('hasTag · 单 tag any-of', () => {
    const seed = mkSeed('tool')
    expect(matchSkillFilter(seed, { hasTag: 'tool' })).toBe(true)
    expect(matchSkillFilter(seed, { hasTag: 'vocal' })).toBe(false)
  })

  it('hasTag · 数组 any-of', () => {
    const seed = mkSeed('tool')
    expect(matchSkillFilter(seed, { hasTag: ['vocal', 'tool', 'abnormal'] })).toBe(true)
    expect(matchSkillFilter(seed, { hasTag: ['vocal', 'abnormal'] })).toBe(false)
  })

  it('allTags · 全 tag all-of · seed 单 tag 只能匹配 length=1 且匹配该 tag', () => {
    const seed = mkSeed('tool')
    expect(matchSkillFilter(seed, { allTags: ['tool'] })).toBe(true)
    expect(matchSkillFilter(seed, { allTags: ['tool', 'vocal'] })).toBe(false)
  })

  it('excludeTag · 命中即拒', () => {
    const seed = mkSeed('tool')
    expect(matchSkillFilter(seed, { excludeTag: 'vocal' })).toBe(true)
    expect(matchSkillFilter(seed, { excludeTag: 'tool' })).toBe(false)
    expect(matchSkillFilter(seed, { excludeTag: ['tool', 'vocal'] })).toBe(false)
  })

  it('resource · seed.resourcePool 存在时取交集', () => {
    const seed = mkSeed('tool', ['score', 'gold'])
    expect(matchSkillFilter(seed, { resource: 'score' })).toBe(true)
    expect(matchSkillFilter(seed, { resource: 'time' })).toBe(false)
    expect(matchSkillFilter(seed, { resource: ['time', 'score'] })).toBe(true)
  })

  it('resource · seed.resourcePool 缺省时 → filter.resource 不裁（视为通过）', () => {
    const seed = mkSeed('tool')   // 无 resourcePool
    expect(matchSkillFilter(seed, { resource: 'shield' })).toBe(true)
  })

  it('excludeResource · 全部资源都在排除集才拒', () => {
    const seed = mkSeed('tool', ['score', 'gold'])
    expect(matchSkillFilter(seed, { excludeResource: 'score' })).toBe(true)         // gold 没被排除 → 通过
    expect(matchSkillFilter(seed, { excludeResource: ['score', 'gold'] })).toBe(false)  // 全排除 → 拒
  })
})

describe('matchSkillFilter · AND 组合', () => {
  it('hasTag + resource AND 通过', () => {
    const seed = mkSeed('tool', ['score'])
    expect(matchSkillFilter(seed, { hasTag: 'tool', resource: 'score' })).toBe(true)
    expect(matchSkillFilter(seed, { hasTag: 'tool', resource: 'gold' })).toBe(false)
    expect(matchSkillFilter(seed, { hasTag: 'vocal', resource: 'score' })).toBe(false)
  })

  it('hasTag + excludeTag 冲突 → 排除胜', () => {
    const seed = mkSeed('tool')
    expect(matchSkillFilter(seed, { hasTag: 'tool', excludeTag: 'tool' })).toBe(false)
  })
})

describe('widenSkillFilter · 兜底逐档放宽', () => {
  const pool: SkillSeed[] = [
    mkSeed('tool', ['score']),
    mkSeed('vocal', ['gold']),
    mkSeed('abnormal', ['shield']),
  ]

  it('原 filter 已命中 → 不 widen', () => {
    const r = widenSkillFilter({ hasTag: 'tool' }, pool)
    expect(r.matches.length).toBe(1)
    expect(r.droppedFields).toEqual([])
    expect(r.filter).toEqual({ hasTag: 'tool' })
  })

  it('hasTag 不命中 → drop hasTag → 全池命中', () => {
    const r = widenSkillFilter({ hasTag: 'gesture' }, pool)
    expect(r.matches.length).toBe(3)
    expect(r.droppedFields).toContain('hasTag')
  })

  it('allTags 先 drop · 再 hasTag · 再 rarity · 再 resource', () => {
    // 构造一个所有字段都不匹配的 filter
    const filter: SkillFilter = {
      allTags: ['gesture'],
      hasTag: 'gesture',
      resource: 'multiplier',  // pool 里没人产 multiplier
    }
    const r = widenSkillFilter(filter, pool)
    // 直到 drop 到只剩 resource:multiplier，因为 pool 里 resource 全是 score/gold/shield，
    // resource 字段也得 drop。最终 droppedFields ⊇ {allTags, hasTag, resource}
    expect(r.droppedFields).toEqual(expect.arrayContaining(['allTags', 'hasTag', 'resource']))
    expect(r.matches.length).toBeGreaterThan(0)   // 全池兜底
  })

  it('完全不可命中 → 返回全池开放 filter', () => {
    // 空 pool 时不应崩；带 pool 时 widen 到完全开放
    const r = widenSkillFilter({ allTags: ['gesture'], hasTag: 'gesture', resource: 'mutagen' }, pool)
    expect(r.matches.length).toBeGreaterThan(0)
  })
})

describe('getCandidatePool · recipe_pool 来源', () => {
  it('recipe_pool 返非空（ALL_RECIPES 已有 7 条）', () => {
    const pool = getCandidatePool('recipe_pool')
    expect(pool.length).toBeGreaterThan(0)
    // 每个 seed 至少有 section
    for (const s of pool) {
      expect(s.section).toBeDefined()
      expect(s.source).toBe('recipe_pool')
    }
  })

  it('shop_pool 在 state.shop.items 为空时返空', () => {
    expect(getCandidatePool('shop_pool').length).toBe(0)
  })

  it('altar_pool 当前 stub 返空', () => {
    expect(getCandidatePool('altar_pool').length).toBe(0)
  })

  it('recipe_pool 含 tool 段（nut_crack）→ teach filter:{hasTag:tool} 直接命中', () => {
    // 当前 ALL_RECIPES: feed/climb/run/piloerection/drumming/drink/leap/nut_crack
    // tool 段 ≥1 个 → filter:{hasTag:'tool'} 不再走 widen
    const pool = getCandidatePool('recipe_pool')
    const toolMatches = pool.filter(s => s.section === 'tool')
    expect(toolMatches.length).toBeGreaterThan(0)
  })
})

describe('shop_pool · state.shop.items 接入', () => {
  // 测试中临时塞 shop item · afterEach 清空恢复
  afterEach(() => {
    gameState.shop.items = []
  })

  function mkShopSkill(resource: string, v2Def: string, section: string): ShopItem {
    const skill: AffixSkillInstance = {
      id: `mock_${v2Def}_${Math.random()}`,
      name: `Mock ${section}`,
      icon: '?',
      resource: resource as AffixSkillInstance['resource'],
      baseValues: [1, 2, 3, 4],
      level: 1,
      rarity: 1,
      affixes: [],
      enchantmentIds: [],
      v2Ids: [v2Def],
    }
    return {
      id: `item_${v2Def}`,
      type: 'skill',
      affixSkill: skill,
      cost: 10,
      isUpgrade: false,
      locked: false,
    }
  }

  it('shop 有在架 skill → seed source=shop_pool · section 取首 v2Id', () => {
    // 用现有静态 def 'feed' (maintenance) 做测试
    gameState.shop.items = [mkShopSkill('score', 'feed', 'maintenance')]
    const pool = getCandidatePool('shop_pool')
    expect(pool.length).toBe(1)
    expect(pool[0].source).toBe('shop_pool')
    expect(pool[0].section).toBe('maintenance')
    expect(pool[0].templateSkill).toBeDefined()
    expect(pool[0].resourcePool).toEqual(['score'])
  })

  it('shop skill 无 v2Ids → 跳过（hasTag filter 无 section 可匹配）', () => {
    const sk: AffixSkillInstance = {
      id: 'no_v2', name: 'no v2', icon: '?', resource: 'score',
      baseValues: [1], level: 1, rarity: 0, affixes: [], enchantmentIds: [],
    }
    gameState.shop.items = [{ id: 'i', type: 'skill', affixSkill: sk, cost: 1, isUpgrade: false, locked: false }]
    expect(getCandidatePool('shop_pool').length).toBe(0)
  })

  it('shop 混杂 type （pack/relic/enchantment）→ 仅取 skill', () => {
    gameState.shop.items = [
      mkShopSkill('score', 'feed', 'maintenance'),
      { id: 'p', type: 'pack', cost: 1, isUpgrade: false, locked: false },
      { id: 'r', type: 'relic', cost: 1, isUpgrade: false, locked: false },
    ]
    expect(getCandidatePool('shop_pool').length).toBe(1)
  })

  it('spawnSkillFromSeed(templateSkill) → 深 clone · 新 id · 改 level', () => {
    const template = mkShopSkill('score', 'feed', 'maintenance').affixSkill!
    const seed: SkillSeed = {
      source: 'shop_pool',
      templateSkill: template,
      section: 'maintenance',
      resourcePool: ['score'],
    }
    const spawned = spawnSkillFromSeed(seed, 5)
    expect(spawned.id).not.toBe(template.id)         // 新 id
    expect(spawned.level).toBe(5)                     // 改 level
    expect(spawned.resource).toBe('score')            // 资源继承
    expect(spawned.v2Ids).toEqual(template.v2Ids)     // V2 词条引用一致
    expect(spawned.v2Ids).not.toBe(template.v2Ids)    // 数组深 clone（不共享引用）
    expect(spawned.rarity).toBe(1)                    // rarity 继承
  })

  it('spawnSkillFromSeed(recipe) → recipe 路径走 generateSkill', () => {
    const seed: SkillSeed = {
      source: 'recipe_pool',
      section: 'maintenance',
      resourcePool: ['score', 'gold'],
    }
    const spawned = spawnSkillFromSeed(seed, 3)
    expect(spawned.level).toBe(3)
    expect(['score', 'gold']).toContain(spawned.resource)
  })
})

describe('player_skill_pool · state.affixSkills 接入 + 排除宿主', () => {
  afterEach(() => {
    gameState.affixSkills.clear()
  })

  function mkOwnedSkill(id: string, resource: string, v2Def: string, level = 1): AffixSkillInstance {
    return {
      id, name: `Owned ${id}`, icon: '?',
      resource: resource as AffixSkillInstance['resource'],
      baseValues: [1, 2, 3, 4], level, rarity: 1,
      affixes: [], enchantmentIds: [], v2Ids: [v2Def],
    }
  }

  it('player_skill_pool 在 affixSkills 为空时返空', () => {
    expect(getCandidatePool('player_skill_pool').length).toBe(0)
  })

  it('player_skill_pool 读 affixSkills · 每个 owned skill 一个 seed', () => {
    gameState.affixSkills.set('sk1', mkOwnedSkill('sk1', 'score', 'feed'))
    gameState.affixSkills.set('sk2', mkOwnedSkill('sk2', 'gold', 'climb'))
    const pool = getCandidatePool('player_skill_pool')
    expect(pool.length).toBe(2)
    expect(pool.every(s => s.source === 'player_skill_pool')).toBe(true)
  })

  it('excludeSkillId · 宿主自身从候选池排除（防自我无限克隆）', () => {
    gameState.affixSkills.set('host', mkOwnedSkill('host', 'score', 'feed'))
    gameState.affixSkills.set('sibling', mkOwnedSkill('sibling', 'gold', 'climb'))
    const pool = getCandidatePool('player_skill_pool', 'host')
    expect(pool.length).toBe(1)
    expect(pool[0].templateSkill?.id).toBe('sibling')
  })

  it('player_skill_pool 跳过无 v2Ids 的 owned skill', () => {
    const noV2: AffixSkillInstance = {
      id: 'plain', name: 'plain', icon: '?', resource: 'score',
      baseValues: [1], level: 1, rarity: 0, affixes: [], enchantmentIds: [],
    }
    gameState.affixSkills.set('plain', noV2)
    expect(getCandidatePool('player_skill_pool').length).toBe(0)
  })

  it('section 取首 v2Id 的 def · imitate filter hasTag 匹配维度', () => {
    gameState.affixSkills.set('sk', mkOwnedSkill('sk', 'score', 'feed'))   // feed 是 maintenance 段
    const pool = getCandidatePool('player_skill_pool')
    expect(pool[0].section).toBe('maintenance')
  })
})
