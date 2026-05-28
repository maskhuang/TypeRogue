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
import { RECIPE_FEED, RECIPE_IMITATE } from '../../../src/data/affixV2Generator'
import { getAffixV2Definition } from '../../../src/data/affixV2'

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

  it('widen 按 resource → rarity → allTags → hasTag 顺序逐步丢字段', () => {
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

  it('recipe_pool 含全部段（含 meta 持有的 tool 段）· 至少 5 种 section 覆盖', () => {
    // recipe_pool = 全 ALL_RECIPES（含 meta 操纵家族）· tool 段由 teach/imitate/spear_make/gaze_follow 持有
    // → maintenance / locomotion / posture / agonistic / tool 5 段
    // meta 被 spawn 出来时 effect 置 noop（spawnSkillFromSeed inertMeta）→ 不递归，故池层不排除
    const pool = getCandidatePool('recipe_pool')
    const sections = new Set(pool.map(s => s.section))
    expect(sections.has('tool')).toBe(true)
    expect(sections.size).toBeGreaterThanOrEqual(5)
    expect(pool.some(s => s.recipe?.kind === 'teach')).toBe(true)   // meta 已纳入池
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

  it('spawnSkillFromSeed(templateSkill) → 深 clone · 新 id · 改 level · 加 [副本] · 清 purchasePrice', () => {
    const template = mkShopSkill('score', 'feed', 'maintenance').affixSkill!
    template.purchasePrice = 42                       // 模拟商品有价格
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
    expect(spawned.name).toMatch(/\[(副本|Copy)\]/)   // name 加后缀
    expect(spawned.name).not.toBe(template.name)
    expect(spawned.purchasePrice).toBeUndefined()     // purchasePrice 清空 · 防套现
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

  it('spawnSkillFromSeed(recipe) → 第 1 个 affix 必出自 seed.recipe 的 section（按 tag 生成）', () => {
    const seed: SkillSeed = {
      source: 'recipe_pool',
      recipe: RECIPE_FEED,        // maintenance
      section: 'maintenance',
      resourcePool: ['score'],
    }
    // 即使 filter.rarity=0，也至少保底 1 个该 recipe 的词条（≥1 affix 满足过滤 tag）
    const spawned = spawnSkillFromSeed(seed, 3, { rarity: 0 })
    expect(spawned.v2Ids?.length ?? 0).toBeGreaterThanOrEqual(1)
    expect(getAffixV2Definition(spawned.v2Ids![0])?.section).toBe('maintenance')
  })

  it('spawnSkillFromSeed(recipe) · 多词条时仍保证第 1 个匹配 seed.recipe', () => {
    const seed: SkillSeed = {
      source: 'recipe_pool',
      recipe: RECIPE_FEED,
      section: 'maintenance',
      resourcePool: ['score'],
    }
    const spawned = spawnSkillFromSeed(seed, 1, { rarity: 3 })
    expect(spawned.v2Ids?.length).toBe(4)   // rarity 3 = 4 词条
    expect(getAffixV2Definition(spawned.v2Ids![0])?.section).toBe('maintenance')
  })

  it('forcedRecipe 路径次要槽位排除 meta 操纵家族（teach 给的技能不再带 teach/imitate 等）', () => {
    const META_IDS = ['teach', 'imitate', 'spear_make', 'gaze_follow']
    const isMeta = (defId: string) => META_IDS.some(id => defId.startsWith(`gen_${id}_`))
    const seed: SkillSeed = {
      source: 'recipe_pool',
      recipe: RECIPE_FEED,
      section: 'maintenance',
      resourcePool: ['score'],
    }
    for (let i = 0; i < 50; i++) {
      const spawned = spawnSkillFromSeed(seed, 1, { rarity: 3 })
      for (const defId of spawned.v2Ids ?? []) {
        expect(isMeta(defId)).toBe(false)
      }
    }
  })

  it('forcedRecipe 为 meta（tool 段）→ 首词条段保留但 effect 置 noop（inertMeta 防递归）', () => {
    // teach 锁 tool 段后会 spawn 出 meta 词条（如 imitate）· 段/名保留让 tool 可达，
    // 但 effect 被置 noop · on_battle_end 不再生成技能 → 切断递归 spawn / 滚雪球
    const seed: SkillSeed = {
      source: 'recipe_pool',
      recipe: RECIPE_IMITATE,   // meta · tool 段
      section: 'tool',
    }
    for (let i = 0; i < 20; i++) {
      const spawned = spawnSkillFromSeed(seed, 1, { rarity: 3 })
      const firstDef = getAffixV2Definition(spawned.v2Ids![0])!
      expect(firstDef.section).toBe('tool')        // 身份/段保留 · tool 可达
      expect(firstDef.effect.kind).toBe('noop')    // meta effect 置空 → 不递归
    }
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
