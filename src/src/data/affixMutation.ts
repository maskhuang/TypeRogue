// ============================================
// 打字肉鸽 - 词条蜕变系统
// ============================================
// Story 35.10: 蜕变师 — 词条重铸(A) + 稀有度升降(C↑/C↓)
// 设计文档: docs/design/affix-skill-system.md §十四

import { state } from '../core/state'
import { RESOURCE_ICONS } from '../core/constants'
import type { AffixInstance } from './affixes'
import {
  AffixType, EnchantmentType,
  QUEST_AFFIX_MAP, AFFIX_WEIGHTS,
  AFFIX_CATEGORY_MAP,
} from './affixes'
import type { AffixCategory } from './affixes'
import {
  rollAffixParams, generateName,
} from './skillGeneration'
import { random } from '../core/seededRandom'

// ===== 常量 =====

// ===== 结果类型 =====

export interface MutationResult {
  success: boolean
  error?: string
  oldAffix?: AffixInstance
  newAffix?: AffixInstance
  removedAffix?: AffixInstance
  mutagenCost: number
  mutagenRefund: number
  /** Excavate：获得指定稀有度的遗物 */
  excavateRelicReward?: { rarity: number }
  /** Treasure：下次商店保底稀有度 */
  treasureShopRarity?: number
  /** Refine：额外退还的变异素 */
  refineRefund?: number
  /** Evolve：稀有度提升结果 */
  evolveResult?: { rarityUp: boolean, extraAffix: boolean }
  /** Harvest：获得金币 */
  harvestGold?: number
  /** Chain：需要连锁蜕变的技能 ID 列表 */
  chainMutateSkillIds?: string[]
  /** Volatile：短期效果倍率和持续关数 */
  volatileBoost?: { multiplier: number, stages: number }
}

// ===== 消耗查询 =====

/** 蜕变消耗：1 + 该技能已蜕变次数 */
export function getMutateCost(skillId: string): number {
  const used = state.mutationACounts.get(skillId) ?? 0
  return 1 + used
}

// ===== 可操作性检查 =====

export function canMutate(skillId: string): boolean {
  const skill = state.affixSkills.get(skillId)
  if (!skill || skill.affixes.length === 0) return false
  return state.mutagenInventory >= getMutateCost(skillId)
}

// ===== 任务附魔失效 =====

/**
 * 当词条被替换/移除时，检查并移除对应的任务附魔。
 * QUEST_AFFIX_MAP: EnchantmentType → AffixType | AffixType[]
 * 若被移除的 affixType 匹配某个 quest 附魔的 targetAffix，则移除。
 */
export function invalidateQuestEnchantment(skillId: string, removedAffixType: AffixType): void {
  const skill = state.affixSkills.get(skillId)
  const rt = state.affixSkillStates.get(skillId)
  if (!skill || !rt) return

  // 找到所有应失效的附魔
  const toRemove: EnchantmentType[] = []
  for (const enchId of skill.enchantmentIds) {
    const mapping = QUEST_AFFIX_MAP[enchId as EnchantmentType]
    if (!mapping) continue
    const targets = Array.isArray(mapping) ? mapping : [mapping]
    if (targets.includes(removedAffixType)) {
      toRemove.push(enchId as EnchantmentType)
    }
  }

  if (toRemove.length === 0) return

  // 移除附魔
  skill.enchantmentIds = skill.enchantmentIds.filter(
    id => !toRemove.includes(id as EnchantmentType),
  )
  // 仅当无其他 quest 附魔存活时，才归零任务状态
  const remainingQuests = skill.enchantmentIds.filter(
    id => QUEST_AFFIX_MAP[id as EnchantmentType] !== undefined,
  )
  if (remainingQuests.length === 0) {
    rt.questStacks = 0
    rt.questCompletions = 0
  }
  // 若 Transmute 附魔被移除，清理 transmuteResource
  if (!skill.enchantmentIds.includes('transmute')) {
    skill.transmuteResource = undefined
  }
}

// ===== 池过滤辅助 =====

/**
 * 从词条权重池中加权抽取 1 个词条，排除指定类型。
 * 返回 { type, convertVariant? }
 *
 * NOTE: 与 skillGeneration.ts 的 weightedSampleWithout(count) 逻辑相似，
 * 但此函数支持 excludeTypes 排除过滤（weightedSampleWithout 仅做不重复抽取）。
 * 若 AFFIX_WEIGHTS 结构变更，两处需同步维护。
 */
function sampleOneExcluding(
  excludeTypes: AffixType[],
  allowedCategory?: AffixCategory,
): { type: AffixType; convertVariant?: 'cross' | 'self' } | null {
  const excludeSet = new Set<string>(excludeTypes.map(t => t as string))

  // 构建过滤后的权重池
  let totalWeight = 0
  const entries: Array<{ key: string; weight: number }> = []

  for (const [key, weight] of Object.entries(AFFIX_WEIGHTS)) {
    // Convert 拆分为 convert_cross/convert_self
    if (key === 'convert_cross' || key === 'convert_self') {
      if (excludeSet.has(AffixType.Convert)) continue
      // mono_affix 类别过滤
      if (allowedCategory && !AFFIX_CATEGORY_MAP[AffixType.Convert]?.includes(allowedCategory)) continue
    } else {
      if (excludeSet.has(key)) continue
      // mono_affix 类别过滤
      if (allowedCategory && !AFFIX_CATEGORY_MAP[key as AffixType]?.includes(allowedCategory)) continue
    }
    entries.push({ key, weight })
    totalWeight += weight
  }

  if (totalWeight <= 0 || entries.length === 0) return null

  let roll = random() * totalWeight
  for (const { key, weight } of entries) {
    roll -= weight
    if (roll <= 0) {
      if (key === 'convert_cross') {
        return { type: AffixType.Convert, convertVariant: 'cross' }
      } else if (key === 'convert_self') {
        return { type: AffixType.Convert, convertVariant: 'self' }
      } else {
        return { type: key as AffixType }
      }
    }
  }

  // Fallback to last entry
  const last = entries[entries.length - 1]
  if (last.key === 'convert_cross' || last.key === 'convert_self') {
    return { type: AffixType.Convert, convertVariant: last.key === 'convert_cross' ? 'cross' : 'self' }
  }
  return { type: last.key as AffixType }
}

// ===== 蜕变单词条（基因稳定器遗物） =====

export function mutateSingle(skillId: string, affixIndex: number, allowedCategory?: AffixCategory): MutationResult {
  const skill = state.affixSkills.get(skillId)
  if (!skill) {
    return { success: false, error: '技能不存在', mutagenCost: 0, mutagenRefund: 0 }
  }
  if (skill.affixes.length === 0) {
    return { success: false, error: '无词条', mutagenCost: 0, mutagenRefund: 0 }
  }
  if (affixIndex < 0 || affixIndex >= skill.affixes.length) {
    return { success: false, error: '词条索引无效', mutagenCost: 0, mutagenRefund: 0 }
  }

  const cost = getMutateCost(skillId)
  if (state.mutagenInventory < cost) {
    return { success: false, error: '变异素不足', mutagenCost: 0, mutagenRefund: 0 }
  }

  // 扣费
  state.mutagenInventory -= cost

  // 累计计数
  state.mutationACounts.set(skillId, (state.mutationACounts.get(skillId) ?? 0) + 1)

  // 保存旧词条
  const oldAffix = skill.affixes[affixIndex]

  // 排除该技能其他词条的类型
  const excludeTypes = skill.affixes
    .filter((_, i) => i !== affixIndex)
    .map(a => a.type)

  const sample = sampleOneExcluding(excludeTypes, allowedCategory)
  if (!sample) {
    state.mutagenInventory += cost
    const counts = state.mutationACounts.get(skillId)!
    state.mutationACounts.set(skillId, counts - 1)
    return { success: false, error: '无可用词条类型', mutagenCost: 0, mutagenRefund: 0 }
  }

  const newAffix = rollAffixParams(sample.type, skill.resource, sample.convertVariant)
  skill.affixes[affixIndex] = newAffix

  // 任务附魔失效检查
  if (oldAffix.type !== newAffix.type) {
    invalidateQuestEnchantment(skillId, oldAffix.type)
  }

  // 更新名称和图标
  skill.name = generateName(skill.resource, skill.affixes)
  skill.icon = RESOURCE_ICONS[skill.resource] || '?'

  return {
    success: true,
    oldAffix,
    newAffix,
    mutagenCost: cost,
    mutagenRefund: 0,
  }
}

// ===== 蜕变：将所有词条替换为池中随机新词条 =====

export function mutate(skillId: string, allowedCategory?: AffixCategory): MutationResult {
  const skill = state.affixSkills.get(skillId)
  if (!skill) {
    return { success: false, error: '技能不存在', mutagenCost: 0, mutagenRefund: 0 }
  }
  if (skill.affixes.length === 0) {
    return { success: false, error: '无词条', mutagenCost: 0, mutagenRefund: 0 }
  }

  const cost = getMutateCost(skillId)
  if (state.mutagenInventory < cost) {
    return { success: false, error: '变异素不足', mutagenCost: 0, mutagenRefund: 0 }
  }

  let excavateRelicReward: { rarity: number } | null = null

  // 扣费
  state.mutagenInventory -= cost

  // 累计计数
  state.mutationACounts.set(skillId, (state.mutationACounts.get(skillId) ?? 0) + 1)

  // Excavate（挖掘）：被蜕变时获得遗物
  const excavateAffix = skill.affixes.find(a => a.type === AffixType.Excavate && !a.spent)
  if (excavateAffix) {
    const rt = state.affixSkillStates?.get(skillId)
    const isTransformed = rt?.questTransformed && skill.enchantmentIds?.includes(EnchantmentType.QuestExcavate as string)
    // 质变：传说遗物（无视等级）；普通：Lv1=0(普通), Lv2=1(稀有), Lv3=2(史诗)
    const relicRarity = isTransformed ? 3 : Math.min(skill.level - 1, 2)
    excavateRelicReward = { rarity: relicRarity }
  }

  // Treasure（寻宝）：被蜕变时下次商店出高稀有度
  let treasureShopRarity: number | undefined
  const treasureAffix = skill.affixes.find(a => a.type === AffixType.Treasure && !a.spent)
  if (treasureAffix) {
    const rt = state.affixSkillStates?.get(skillId)
    const isTransformed = rt?.questTransformed && skill.enchantmentIds?.includes(EnchantmentType.QuestTreasure as string)
    treasureShopRarity = isTransformed ? 3 : Math.min(skill.level - 1, 2)
  }

  // Refine（提纯）：被蜕变时退还变异素
  let refineRefund: number | undefined
  const refineAffix = skill.affixes.find(a => a.type === AffixType.Refine && !a.spent)
  if (refineAffix) {
    const rt = state.affixSkillStates?.get(skillId)
    const isTransformed = rt?.questTransformed && skill.enchantmentIds?.includes(EnchantmentType.QuestRefine as string)
    // Lv1=50%, Lv2=100%, Lv3=150%, 质变=200%
    const ratio = isTransformed ? 2.0 : 0.5 * skill.level
    refineRefund = Math.floor(cost * ratio)
    state.mutagenInventory += refineRefund
  }

  // Evolve（进化）：被蜕变时技能稀有度+1
  let evolveResult: { rarityUp: boolean, extraAffix: boolean } | undefined
  const evolveAffix = skill.affixes.find(a => a.type === AffixType.Evolve && !a.spent)
  if (evolveAffix) {
    const rt = state.affixSkillStates?.get(skillId)
    const isTransformed = rt?.questTransformed && skill.enchantmentIds?.includes(EnchantmentType.QuestEvolve as string)
    // Lv1=50%, Lv2=75%, Lv3=100%, 质变=100%+额外词条
    const chance = isTransformed ? 1.0 : 0.25 + 0.25 * skill.level
    const rarityUp = Math.random() < chance && skill.rarity < 3
    const extraAffix = isTransformed && rarityUp
    if (rarityUp) {
      (skill as any).rarity = skill.rarity + 1
    }
    evolveResult = { rarityUp, extraAffix }
  }

  // Harvest（收割）：被蜕变时获得金币
  let harvestGold: number | undefined
  const harvestAffix = skill.affixes.find(a => a.type === AffixType.Harvest && !a.spent)
  if (harvestAffix) {
    const rt = state.affixSkillStates?.get(skillId)
    const isTransformed = rt?.questTransformed && skill.enchantmentIds?.includes(EnchantmentType.QuestHarvest as string)
    // Lv1=50g, Lv2=100g, Lv3=150g, 质变=250g
    harvestGold = isTransformed ? 250 : 50 * skill.level
    state.gold = (state.gold ?? 0) + harvestGold
  }

  // Chain（连锁）：被蜕变时范围内技能也蜕变
  let chainMutateSkillIds: string[] | undefined
  const chainAffix = skill.affixes.find(a => a.type === AffixType.Chain && !a.spent)
  if (chainAffix && chainAffix.posRel != null) {
    const rt = state.affixSkillStates?.get(skillId)
    const isTransformed = rt?.questTransformed && skill.enchantmentIds?.includes(EnchantmentType.QuestChain as string)
    // 找范围内的技能
    const { getExtendedNeighbors } = require('./affixTrigger')
    const skillKeys = [...state.player.bindings].filter(([, sid]) => sid === skillId).map(([k]) => k)
    const neighborKeys: string[] = getExtendedNeighbors(skillKeys, chainAffix.posRel).filter((k: string) => state.player.bindings.has(k))
    const candidateIds = new Set<string>()
    for (const nk of neighborKeys) {
      const nid = state.player.bindings.get(nk)
      if (nid && nid !== skillId) candidateIds.add(nid)
    }
    const allCandidates = [...candidateIds]
    if (isTransformed) {
      // 质变：全键盘
      const allIds = new Set<string>()
      for (const [, sid] of state.player.bindings) { if (sid !== skillId) allIds.add(sid) }
      chainMutateSkillIds = [...allIds]
    } else {
      // Lv1=1个, Lv2=2个, Lv3=全范围
      const count = skill.level >= 3 ? allCandidates.length : skill.level
      chainMutateSkillIds = allCandidates.slice(0, count)
    }
  }

  // Volatile（不稳定）：被蜕变后短期效果翻倍
  let volatileBoost: { multiplier: number, stages: number } | undefined
  const volatileAffix = skill.affixes.find(a => a.type === AffixType.Volatile && !a.spent)
  if (volatileAffix) {
    const rt = state.affixSkillStates?.get(skillId)
    const isTransformed = rt?.questTransformed && skill.enchantmentIds?.includes(EnchantmentType.QuestVolatile as string)
    // Lv1=1关×1.5, Lv2=1关×2.0, Lv3=2关×2.0, 质变=3关×2.0
    const stages = isTransformed ? 3 : (skill.level >= 3 ? 2 : 1)
    const multiplier = isTransformed ? 2.0 : (skill.level >= 2 ? 2.0 : 1.5)
    volatileBoost = { multiplier, stages }
  }

  // 保存旧词条，用于任务附魔失效检查
  const oldAffixes = skill.affixes.map(a => ({ ...a }))

  // 逐个替换所有词条，每个新词条排除已选类型（保证不重复）
  const newAffixes: AffixInstance[] = []
  for (let i = 0; i < skill.affixes.length; i++) {
    const excludeTypes = newAffixes.map(a => a.type)
    const sample = sampleOneExcluding(excludeTypes, allowedCategory)
    if (!sample) {
      // 极端情况：池中无可用类型 — 回滚
      state.mutagenInventory += cost
      const counts = state.mutationACounts.get(skillId)!
      state.mutationACounts.set(skillId, counts - 1)
      return { success: false, error: '无可用词条类型', mutagenCost: 0, mutagenRefund: 0 }
    }
    newAffixes.push(rollAffixParams(sample.type, skill.resource, sample.convertVariant))
  }

  // Evolve 质变：额外+1词条
  if (evolveResult?.extraAffix) {
    const extraExclude = newAffixes.map(a => a.type)
    const extraSample = sampleOneExcluding(extraExclude, allowedCategory)
    if (extraSample) {
      newAffixes.push(rollAffixParams(extraSample.type, skill.resource, extraSample.convertVariant))
    }
  }

  skill.affixes = newAffixes

  // 任务附魔失效检查：旧词条类型中不再存在于新词条的，触发失效
  const newTypes = new Set(newAffixes.map(a => a.type))
  for (const old of oldAffixes) {
    if (!newTypes.has(old.type)) {
      invalidateQuestEnchantment(skillId, old.type)
    }
  }

  // 更新名称和图标
  skill.name = generateName(skill.resource, skill.affixes)
  skill.icon = RESOURCE_ICONS[skill.resource] || '?'

  return {
    success: true,
    mutagenCost: cost,
    mutagenRefund: refineRefund ?? 0,
    excavateRelicReward: excavateRelicReward ?? undefined,
    treasureShopRarity,
    refineRefund,
    evolveResult,
    harvestGold,
    chainMutateSkillIds,
    volatileBoost,
  }
}
