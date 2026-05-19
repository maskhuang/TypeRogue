// ============================================
// 打字肉鸽 - 新 Affix 系统 · SkillFilter 匹配 + 候选池
// ============================================
// gain_skill effect 用：把 SkillFilter 解析为候选种子集合，
// 命中 0 时按 widen 顺序逐步放宽 filter。
//
// SkillSeed 当前仅来自 recipe_pool（ALL_RECIPES），shop_pool / altar_pool 留 stub。
// notOwned / classFilter 是运行时维度（依赖 player state），不在 seed 层裁，
// 由 handler 在 spawn 后过滤 / 由 GenerateSkillOptions 透传。

import { ALL_RECIPES, type AffixV2Recipe } from '../data/affixV2Generator'
import type { SkillFilter } from '../data/affixV2Trigger'
import type { SectionTag } from '../data/affixTags'
import type { ResourceType } from '../core/types'
import type { AffixSkillInstance, SkillRarity } from '../data/affixes'
import { generateSkill } from '../data/skillGeneration'
import { random } from '../core/seededRandom'

// ============================================
// SkillSeed · 候选种子
// ============================================

/** 一个可被 spawn 的候选 skill 描述 */
export interface SkillSeed {
  readonly source: 'recipe_pool' | 'shop_pool' | 'altar_pool'
  /** 关联 recipe（recipe_pool 来源时填）*/
  readonly recipe?: AffixV2Recipe
  /** seed 的 section（作为 hasTag / allTags / excludeTag 匹配维度）*/
  readonly section: SectionTag
  /** 候选 resource 池（recipe-driven · 缺省时视为不限）*/
  readonly resourcePool?: readonly string[]
}

/** 按 source 取候选池 ·
 *  - recipe_pool：从 ALL_RECIPES 映射 SkillSeed，section/resourcePool 透传
 *  - shop_pool / altar_pool：当前 stub 返空，需后续接入对应模块 */
export function getCandidatePool(source: 'recipe_pool' | 'shop_pool' | 'altar_pool'): readonly SkillSeed[] {
  if (source === 'recipe_pool') {
    return ALL_RECIPES.map(r => ({
      source: 'recipe_pool' as const,
      recipe: r,
      section: r.section,
      resourcePool: 'resourcePool' in r ? (r as { resourcePool: readonly string[] }).resourcePool : undefined,
    }))
  }
  return []
}

// ============================================
// matchSkillFilter · seed × filter AND 求值
// ============================================
// 注：notOwned / classFilter / rarity 是运行时维度（依赖 player state / 生成参数），
// 在此层视为"通过"——由 spawn handler 后处理。

export function matchSkillFilter(seed: SkillSeed, filter: SkillFilter): boolean {
  // resource any-of：seed.resourcePool 与 filter.resource 交集非空即过；
  // seed 不限 pool（resourcePool undefined）视为通过
  if (filter.resource !== undefined && seed.resourcePool) {
    const want = Array.isArray(filter.resource) ? filter.resource : [filter.resource]
    if (!want.some(r => seed.resourcePool!.includes(r))) return false
  }
  if (filter.excludeResource !== undefined && seed.resourcePool) {
    const not = Array.isArray(filter.excludeResource) ? filter.excludeResource : [filter.excludeResource]
    // 全部资源都在排除集 → fail；只要有 1 个不在排除集即过
    if (seed.resourcePool.every(r => not.includes(r))) return false
  }
  if (filter.hasTag !== undefined) {
    const wants = Array.isArray(filter.hasTag) ? filter.hasTag : [filter.hasTag]
    if (!wants.includes(seed.section)) return false
  }
  if (filter.allTags && filter.allTags.length > 0) {
    // seed 只携带单 section tag · all-of 仅当 allTags = [seed.section] 时成立
    if (!filter.allTags.every(t => t === seed.section)) return false
  }
  if (filter.excludeTag !== undefined) {
    const nots = Array.isArray(filter.excludeTag) ? filter.excludeTag : [filter.excludeTag]
    if (nots.includes(seed.section)) return false
  }
  return true
}

// ============================================
// widen fallback · 按字段优先级逐步放宽 filter
// ============================================
// 优先级：allTags 最严 → hasTag → rarity → resource 最宽。
// 命中后立即停；全丢仍空 → 返回完全开放 filter + 全池兜底。

const WIDEN_ORDER: readonly (keyof SkillFilter)[] = ['allTags', 'hasTag', 'rarity', 'resource'] as const

export interface WidenResult {
  /** 最终生效的 filter（可能已 widen）*/
  readonly filter: SkillFilter
  /** 该 filter 下命中的 seed 列表 */
  readonly matches: readonly SkillSeed[]
  /** 被丢弃的字段（按 widen 顺序），空数组表示原 filter 直接命中 */
  readonly droppedFields: readonly (keyof SkillFilter)[]
}

export function widenSkillFilter(filter: SkillFilter, pool: readonly SkillSeed[]): WidenResult {
  // 原 filter 先试
  let matches = pool.filter(s => matchSkillFilter(s, filter))
  if (matches.length > 0) return { filter, matches, droppedFields: [] }

  const dropped: (keyof SkillFilter)[] = []
  let current: SkillFilter = { ...filter }
  for (const field of WIDEN_ORDER) {
    if (!(field in current)) continue
    const next: Record<string, unknown> = { ...current }
    delete next[field]
    current = next as SkillFilter
    dropped.push(field)
    matches = pool.filter(s => matchSkillFilter(s, current))
    if (matches.length > 0) return { filter: current, matches, droppedFields: dropped }
  }
  // 全丢光仍空：返回开放 filter + 全池兜底
  return { filter: {}, matches: pool, droppedFields: dropped }
}

// ============================================
// spawnSkillFromSeed · seed + target level → AffixSkillInstance
// ============================================
// 把 SkillSeed 转成实际 AffixSkillInstance：
//   - resource：seed.resourcePool 内随机 1 个；缺省时 generateSkill 走默认 GENERIC_RESOURCES
//   - level：caller 传入（gain_skill levelMode 已解析）
//   - rarity：当前缺省 1（让宿主 + 1 个 V2 词条 · 留口子未来从 filter.rarity 读）
//
// 注：seed.recipe 当前未直接绑到 spawn 出来的 skill —— sampleV2Ids 走 ALL_RECIPES 随机抽。
// 想"教 tool 必出 tool"的严绑后续可加 forcedRecipe 选项到 generateSkill。

export function spawnSkillFromSeed(seed: SkillSeed, level: number): AffixSkillInstance {
  const resource = seed.resourcePool && seed.resourcePool.length > 0
    ? (seed.resourcePool[Math.floor(random() * seed.resourcePool.length)] as ResourceType)
    : undefined
  return generateSkill({
    resource,
    rarity: 1 as SkillRarity,
    level: Math.max(1, Math.floor(level)),
  })
}
