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
import { state as gameState } from '../core/state'
import { getAffixV2Definition } from '../data/affixV2'
import { getLocale } from '../demo/demo-i18n'
import { hasRelation, scopePosAnchor, type PositionRelation } from '../data/keyboardTopology'

// ============================================
// SkillSeed · 候选种子
// ============================================

/** 一个可被 spawn 的候选 skill 描述 */
export interface SkillSeed {
  readonly source: 'recipe_pool' | 'shop_pool' | 'altar_pool'
  /** 关联 recipe（recipe_pool 来源时填）*/
  readonly recipe?: AffixV2Recipe
  /** 现成 skill 模板（shop_pool / altar_pool 来源时填 · spawn 时深 clone + 改 id/level）*/
  readonly templateSkill?: AffixSkillInstance
  /** seed 的 section（作为 hasTag / allTags / excludeTag 匹配维度）*/
  readonly section: SectionTag
  /** 候选 resource 池（recipe-driven · 缺省时视为不限）*/
  readonly resourcePool?: readonly string[]
}

/** 按 source 取候选池 ·
 *  - recipe_pool：从 ALL_RECIPES 映射 SkillSeed，section/resourcePool 透传
 *  - shop_pool：读 state.shop.items 当前在架 skill，每个映射为模板 seed（spawn 时深 clone）
 *  - player_skill_pool：读 state.affixSkills 玩家自有 skill，排除 excludeSkillId（imitate 主用）
 *  - altar_pool：stub 返空（altar 暂无候选源 · 后续接入）
 *  @param excludeSkillId · 仅 player_skill_pool 用 · 排除宿主自身防递归 */
export function getCandidatePool(
  source: 'recipe_pool' | 'shop_pool' | 'altar_pool' | 'player_skill_pool',
  excludeSkillId?: string,
): readonly SkillSeed[] {
  if (source === 'recipe_pool') {
    // 全 recipe（含 meta 操纵家族 teach/imitate/spear_make/gaze_follow）· tool 段由 meta 持有，
    // 纳入后 teach 等才能锁/生成 tool 段技能。meta 词条被 spawn 出来时其 on_battle_end effect
    // 在生成处被置 noop（generateSkill inertMeta）→ 不会递归 spawn / 滚雪球，故无需在池层排除。
    return ALL_RECIPES.map(r => ({
      source: 'recipe_pool' as const,
      recipe: r,
      section: r.section,
      resourcePool: 'resourcePool' in r ? (r as { resourcePool: readonly string[] }).resourcePool : undefined,
    }))
  }
  if (source === 'shop_pool') {
    const seeds: SkillSeed[] = []
    for (const item of gameState.shop.items) {
      if (item.type !== 'skill' || !item.affixSkill) continue
      const sk = item.affixSkill
      // 取第一个 V2 def 的 section 作为代表 tag（无 v2Ids 时跳过 · 防 hasTag 永远不命中）
      const firstDefId = sk.v2Ids?.[0]
      if (!firstDefId) continue
      const def = getAffixV2Definition(firstDefId)
      if (!def) continue
      seeds.push({
        source: 'shop_pool' as const,
        templateSkill: sk,
        section: def.section,
        resourcePool: [sk.resource],
      })
    }
    return seeds
  }
  if (source === 'player_skill_pool') {
    const seeds: SkillSeed[] = []
    for (const sk of gameState.affixSkills.values()) {
      if (sk.id === excludeSkillId) continue           // 排除宿主 · 防无限自克隆
      const firstDefId = sk.v2Ids?.[0]
      if (!firstDefId) continue
      const def = getAffixV2Definition(firstDefId)
      if (!def) continue
      seeds.push({
        source: 'player_skill_pool' as const,
        templateSkill: sk,
        section: def.section,
        resourcePool: [sk.resource],
      })
    }
    return seeds
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
// filterByNeighborPosRel · player_skill_pool 候选池按宿主键位 + posRel 收紧
// ============================================
// 把候选池过滤为"绑定到宿主键位 X 邻位"的 skill · 仅 template seed 路径有意义
// 多键绑定（shape）任一格命中即过

export function filterByNeighborPosRel(
  pool: readonly SkillSeed[],
  hostKey: string,
  posRel: PositionRelation,
): readonly SkillSeed[] {
  if (!hostKey) return []          // 无 host key 上下文 · 无法计算邻位 · 返空
  // 多格宿主：并集所有占位键 — 候选任一格与宿主任一格成 posRel 即过
  const hostSkillId = gameState.player.bindings.get(hostKey)
  const hostKeys: string[] = []
  if (hostSkillId) {
    for (const [k, sid] of gameState.player.bindings) {
      if (sid === hostSkillId) hostKeys.push(k)
    }
  }
  if (hostKeys.length === 0) hostKeys.push(hostKey)
  // scope 锚统一：宿主已绑定时用其 scope 锚（忽略 per-affix rolled posRel）；未绑定退化用传入 posRel
  const rel = hostSkillId ? scopePosAnchor(hostSkillId) : posRel
  return pool.filter(seed => {
    if (!seed.templateSkill) return false
    const targetId = seed.templateSkill.id
    // 找该 skill 当前绑定到哪些键位 · 候选任一格与宿主任一格满足 posRel 即过
    for (const [k, sid] of gameState.player.bindings) {
      if (sid !== targetId) continue
      if (hostKeys.some(hk => hasRelation(hk, k, rel))) return true
    }
    return false
  })
}

// ============================================
// widen fallback · 按字段优先级逐步放宽 filter
// ============================================
// 优先级：allTags 最严 → hasTag → rarity → resource 最宽。
// 命中后立即停；全丢仍空 → 返回完全开放 filter + 全池兜底。

// widen 优先级：先丢 secondary 维度（resource/rarity）· 再丢 allTags · 最后才丢 hasTag
// 设计意图：hasTag（如 teach.section）是 narrative 主身份 · 保留到最后；
//          rarity/resource 是细分维度 · 找不到时先放宽这两个 · 让 tooltip 描述与实际产出尽量一致
const WIDEN_ORDER: readonly (keyof SkillFilter)[] = ['resource', 'rarity', 'allTags', 'hasTag'] as const

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
// seed.recipe 通过 generateSkill 的 forcedRecipe 绑到 spawn 出来的 skill：
// 第 1 个 V2 词条强制用该 recipe（保证至少 1 个 affix 满足 gain_skill 的 hasTag 过滤），
// 其余槽位仍 sampleV2Ids 随机。修正了此前"按 tag 过滤却生成不匹配 tag 技能"的问题。

/** "[副本]" 后缀 · 仅 template 路径加，避免与原 skill 同名混淆
 *  recipe 路径不加（recipe 生成的是 fresh skill 不算复制）*/
function copySuffix(): string {
  return getLocale() === 'en' ? ' [Copy]' : ' [副本]'
}

export function spawnSkillFromSeed(
  seed: SkillSeed,
  level: number,
  filter?: SkillFilter,
): AffixSkillInstance {
  const targetLv = Math.max(1, Math.floor(level))
  // 模板 spawn：深 clone shop / player 持有的 skill · 换 id · 改 level · 加 [副本] 后缀 · 清 purchasePrice
  // 模板路径忽略 filter.rarity/resource（深 clone 保留模板的这些字段）
  if (seed.templateSkill) {
    const t = seed.templateSkill
    const rnd = random() || 0.0001
    const newId = `skill_${Date.now()}_${rnd.toString(36).slice(2, 6)}`
    const cloned: AffixSkillInstance = {
      ...t,
      id: newId,
      name: `${t.name}${copySuffix()}`,                // 名字加 [副本]/[Copy] 防 inbox 混淆
      level: targetLv,
      affixes: t.affixes.map(a => ({ ...a })),
      enchantmentIds: [...t.enchantmentIds],
      v2Ids: t.v2Ids ? [...t.v2Ids] : undefined,
    }
    // 防套现：克隆体不带购买价格 · 卖出走默认折算
    delete cloned.purchasePrice
    return cloned
  }

  // recipe spawn：调 generateSkill · resource/rarity 受 filter 约束
  // resource 候选 = seed.resourcePool ∩ filter.resource（交集空 fallback seed.resourcePool）
  let candidateResources: readonly string[] | undefined = seed.resourcePool
  if (filter?.resource !== undefined && seed.resourcePool && seed.resourcePool.length > 0) {
    const want = Array.isArray(filter.resource) ? filter.resource : [filter.resource]
    const intersection = seed.resourcePool.filter(r => want.includes(r))
    if (intersection.length > 0) candidateResources = intersection
  }
  const resource = candidateResources && candidateResources.length > 0
    ? (candidateResources[Math.floor(random() * candidateResources.length)] as ResourceType)
    : undefined

  // rarity = filter.rarity（单值直取，区间从 [min,max] 随机）· 缺省 1
  let rarity: SkillRarity = 1 as SkillRarity
  if (typeof filter?.rarity === 'number') {
    rarity = Math.max(0, Math.min(3, filter.rarity)) as SkillRarity
  } else if (filter?.rarity && typeof filter.rarity === 'object') {
    const min = filter.rarity.min ?? 0
    const max = filter.rarity.max ?? 3
    const rolled = min + Math.floor(random() * (max - min + 1))
    rarity = Math.max(0, Math.min(3, rolled)) as SkillRarity
  }

  // seed.recipe 绑定到生成的 skill：保证至少 1 个 affix 来自被 filter 选中的 recipe
  // （= 满足 gain_skill 的 hasTag 过滤 · "教 X 必出 X"）· 修正此前 sampleV2Ids 纯随机忽略 filter 的问题
  // excludeMeta：随机槽位不滚 meta · inertMeta：forcedRecipe 若为 meta（如 tool 段的 imitate/teach）
  // 则其 effect 置 noop —— meta 词条可被 spawn（tool 段可达）但 on_battle_end 不触发 → 不递归 spawn / 滚雪球
  return generateSkill({
    resource,
    rarity,
    level: targetLv,
    forcedRecipe: seed.recipe,
    excludeMeta: true,
    inertMeta: true,
  })
}
