// ============================================
// 打字肉鸽 - 技能生成引擎
// ============================================
// Story 35.2: 运行时随机生成词条制技能
// 设计文档: docs/design/affix-skill-system.md §八、§九

import { random } from '../core/seededRandom'
import { RESOURCE_ICONS } from '../core/constants'
import type { ResourceType } from '../core/types'
import { GENERIC_RESOURCES } from '../systems/classes/ClassResourceFilter'
import { PositionRelation } from './keyboardTopology'
import type { AffixInstance, AffixSkillInstance, SkillRarity } from './affixes'
import { RARITY_TO_SHAPE_POOL, SHAPE_TEMPLATES, mapShapeToKeys, getShapeRotationCount } from './skillShapes'
import { KEYS } from '../core/constants'
import {
  AffixType,
  AFFIX_WEIGHTS, BASE_VALUES, RARITY_PROBABILITIES,
  VOID_BONUS_TABLE, SWARM_BONUS_TABLE, FLOW_BONUS_TABLE, CONFLUENCE_BONUS_TABLE, UNION_BONUS_TABLE, CONVERT_K_TABLE, AFFIX_CLASS_RESTRICTION,
} from './affixes'
import { t } from '../demo/demo-i18n'
import { ALL_RECIPES, generateAffixV2, pickRecipeForSkill, type AffixV2Recipe } from './affixV2Generator'

// ===== 常量 =====

const ALL_POS_RELATIONS: PositionRelation[] = Object.values(PositionRelation)

/** 获取词条的有效权重（Convert 仅使用 cross 变体权重） */
function getAffixWeight(type: AffixType): number {
  if (type === AffixType.Convert) {
    return AFFIX_WEIGHTS.convert_cross
  }
  return AFFIX_WEIGHTS[type as Exclude<AffixType, AffixType.Convert>] ?? 0
}

// ===== 辅助函数 =====

/** 四舍五入到指定小数位 */
export function roundTo(n: number, decimals: number): number {
  const f = 10 ** decimals
  return Math.round(n * f) / f
}

/** 随机选取数组中一个元素 */
export function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(random() * arr.length)]
}

/** 按本局词条权重加权选取一个 AffixType（权重高的更容易被选中） */
function pickAffixWeighted(candidates: AffixType[]): AffixType {
  const weights = candidates.map(t => getAffixWeight(t))
  const total = weights.reduce((a, b) => a + b, 0)
  if (total <= 0) return pickRandom(candidates)
  let roll = random() * total
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i]
    if (roll <= 0) return candidates[i]
  }
  return candidates[candidates.length - 1]
}

// ===== 稀有度掷骰 =====

/** 按 RARITY_PROBABILITIES 概率分布返回 0~3 */
export function rollRarity(): SkillRarity {
  const r = random()
  let cumulative = 0
  for (let i = 0; i < RARITY_PROBABILITIES.length; i++) {
    cumulative += RARITY_PROBABILITIES[i]
    if (r < cumulative) return i as SkillRarity
  }
  return 3 as SkillRarity
}

// ===== 加权不重复抽取 =====

/**
 * 从词条权重池中加权不重复抽取 count 个词条类型。
 *
 * Convert 在池中拆为 convert_cross / convert_self 两项，
 * 抽到任一后两项同时移除，返回 AffixType.Convert。
 * 调用方通过 convertVariant 标记区分同源/异源。
 */
export interface WeightedSampleResult {
  type: AffixType
  convertVariant?: 'cross' | 'self'  // 仅 Convert 类型有此字段
}

export function weightedSampleWithout(count: number, excludeTypes?: Set<string>): WeightedSampleResult[] {
  if (count <= 0) return []

  // 构建带权重的可变池
  const pool = new Map<string, number>()
  for (const [key, weight] of Object.entries(AFFIX_WEIGHTS)) {
    // 职业限制：排除非本职业的词条
    if (excludeTypes && excludeTypes.has(key)) continue
    // MonkeyPatch/Decorator 只在多词条技能(rarity≥2)上出现——需要其他词条来 patch/放大
    if ((key === AffixType.MonkeyPatch) && count < 2) continue
    // Conduit 可在单词条技能上出现（通过相同资源也能导能）
    pool.set(key, weight)
  }

  const result: WeightedSampleResult[] = []

  for (let i = 0; i < count && pool.size > 0; i++) {
    const totalWeight = [...pool.values()].reduce((a, b) => a + b, 0)
    if (totalWeight <= 0) break

    let roll = random() * totalWeight
    for (const [key, weight] of pool) {
      roll -= weight
      if (roll <= 0) {
        // 确定 AffixType 和变体
        if (key === 'convert_cross') {
          result.push({ type: AffixType.Convert, convertVariant: 'cross' })
          pool.delete('convert_cross')
          pool.delete('convert_self')
        } else if (key === 'convert_self') {
          result.push({ type: AffixType.Convert, convertVariant: 'self' })
          pool.delete('convert_cross')
          pool.delete('convert_self')
        } else {
          result.push({ type: key as AffixType })
          pool.delete(key)
        }
        break
      }
    }
  }

  return result
}

// ===== 词条参数掷骰 =====

/**
 * 为指定词条类型生成参数实例。
 * @param type 词条类型
 * @param resource 技能基底资源（影响 Amplify.resource 和 Convert 同源判定）
 * @param convertVariant 转化变体：'cross' 强制异源，'self' 强制同源
 */
export function rollAffixParams(
  type: AffixType,
  resource: ResourceType,
  convertVariant?: 'cross' | 'self',
  availableResources?: readonly ResourceType[],
  sharedPosRel?: PositionRelation,
  excludeAffixTypes?: Set<string>,
): AffixInstance {
  const pool = availableResources ?? GENERIC_RESOURCES
  switch (type) {
    case AffixType.Convert: {
      // time 作为源是稀有变体：仅 20% 概率入池
      const convertPool = pool.filter(r => r !== 'time' || random() < 0.2)
      let source: ResourceType
      if (convertVariant === 'self') {
        source = resource
      } else if (convertVariant === 'cross') {
        const others = convertPool.filter(r => r !== resource)
        source = others.length > 0 ? pickRandom(others) : pickRandom(pool.filter(r => r !== resource))
      } else {
        source = pickRandom(convertPool)
      }
      return { type, source }
    }

    case AffixType.Rainbow:
      return { type }

    case AffixType.Charge:
      return { type, maxBonus: roundTo(2.0 + random() * 1.0, 2) }  // 上限×2.0~3.0

    case AffixType.Decay:
      return { type, initialMult: 0.40, decayPerTrigger: 0.05, floor: 0.05 }

    case AffixType.Crit:
      return { type, chance: roundTo(0.15 + random() * 0.25, 2) }

    case AffixType.Cascade: {
      const posRel = sharedPosRel ?? pickRandom(ALL_POS_RELATIONS)
      return { type, posRel, cascadeMult: roundTo(1.8 + random() * 0.7, 2) }
    }

    case AffixType.Void: {
      const posRel = sharedPosRel ?? pickRandom(ALL_POS_RELATIONS)
      return { type, posRel, bonusPerSlot: VOID_BONUS_TABLE[posRel] }
    }

    case AffixType.Swarm:
      return { type, swarmK: roundTo(0.10 + random() * 0.10, 2) }  // 每虫群 +10%~20%

    case AffixType.Mercenary:
      return { type, hireCost: Math.floor(3 + random() * 5), hireBonus: roundTo(0.50 + random() * 1.00, 2) }  // cost 3~7, bonus 50%~150%

    case AffixType.Mirror:
      return { type, posRel: sharedPosRel ?? pickRandom(ALL_POS_RELATIONS) }

    case AffixType.Amplify:
      return { type, posRel: sharedPosRel ?? pickRandom(ALL_POS_RELATIONS), resource, amplifyK: roundTo(0.03 + random() * 0.03, 2) }  // +3%~6% per stack

    case AffixType.Splash:
      return { type, posRel: sharedPosRel ?? pickRandom(ALL_POS_RELATIONS) }

    case AffixType.Resonance:
      return { type, resource: pickRandom(GENERIC_RESOURCES), interval: 4 }

    case AffixType.Echo: {
      // 按本局词条权重加权抽取两个不同的词条类型（排除职业不可用词条）
      const weightEntries = Object.values(AffixType)
        .filter(t => t !== AffixType.Echo && t !== AffixType.Resonance)
        .filter(t => !excludeAffixTypes || !excludeAffixTypes.has(t))
        .map(t => ({ type: t, w: AFFIX_WEIGHTS[t as Exclude<AffixType, AffixType.Convert>] ?? 0 }))
        .filter(e => e.w > 0)
      const totalW = weightEntries.reduce((s, e) => s + e.w, 0)
      const pickWeighted = (): AffixType => {
        let r = random() * totalW
        for (const e of weightEntries) { r -= e.w; if (r <= 0) return e.type }
        return weightEntries[weightEntries.length - 1].type
      }
      const a = pickWeighted()
      let b = pickWeighted()
      let attempts = 0
      while (b === a && attempts++ < 20) b = pickWeighted()
      return { type, echoAffixA: a, echoAffixB: b, interval: 4 }
    }

    case AffixType.Fury:
      return { type, interval: 4 }

    case AffixType.Tide:
      return { type, interval: 6, tideRate: 1 }  // 每秒+1叠层

    case AffixType.Union: {
      const posRel = sharedPosRel ?? pickRandom(ALL_POS_RELATIONS)
      return { type, posRel, unionK: UNION_BONUS_TABLE[posRel] }
    }

    case AffixType.Conduit:
      return { type, posRel: sharedPosRel ?? pickRandom(ALL_POS_RELATIONS) }

    case AffixType.Relay:
      return { type, posRel: sharedPosRel ?? pickRandom(ALL_POS_RELATIONS) }

    case AffixType.WarDrum:
      return { type, posRel: sharedPosRel ?? pickRandom(ALL_POS_RELATIONS), critPerStack: 0.02 }

    case AffixType.Outcast:
      return { type, bonusPercent: 0.30 }  // 首尾字母+30%暴击率

    case AffixType.Gravity:
      return { type, probMult: roundTo(1.5 + random() * 0.5, 2) }  // 固定增加出现概率 1.5~2.0x

    case AffixType.Repulsion:
      return { type, probMult: roundTo(0.2 + random() * 0.3, 2) }  // 减少出现概率 0.2~0.5x

    case AffixType.Ligature:
      return { type, ligatureBonus: 1.0 }

    case AffixType.Twin:
      return { type }

    case AffixType.Recurse:
      return { type, recurseChance: roundTo(0.08 + random() * 0.12, 2) }

    case AffixType.Taboo:
      return { type, bonusPercent: roundTo(0.60 + random() * 0.20, 2) }  // 60%~80%

    case AffixType.Fallacy:
      return { type, fallacyK: roundTo(0.05 + random() * 0.07, 3), fallacyStacks: 0 }  // 0.05~0.12 per non-crit

    case AffixType.Multiply:
      return { type, multiplyValue: roundTo(1.0 + random() * 1.0, 2) }  // ×1.0~2.0

    case AffixType.Flow: {
      const posRel = sharedPosRel ?? pickRandom(ALL_POS_RELATIONS)
      return { type, posRel, flowK: FLOW_BONUS_TABLE[posRel] }
    }

    case AffixType.Confluence: {
      const posRel = sharedPosRel ?? pickRandom(ALL_POS_RELATIONS)
      return { type, posRel, confluenceK: CONFLUENCE_BONUS_TABLE[posRel] }
    }

    case AffixType.Reflect:
      return { type, reflectK: roundTo(0.04 + random() * 0.04, 2) }

    case AffixType.MonkeyPatch:
      return { type, patchLow: 0.5, patchHigh: 2.0 }

    case AffixType.Innate:
      return { type, innateCount: 1 }

    case AffixType.Exhaust:
      return { type, exhaustMult: roundTo(2.0 + random() * 1.0, 1), maxTriggers: Math.floor(5 + random() * 6) }  // ×2.0~3.0, 5~10 uses

    case AffixType.Excavate:
      return { type }  // 被蜕变时按等级获得遗物
    case AffixType.Treasure:
      return { type }  // 被蜕变时下次商店出高稀有度
    case AffixType.Refine:
      return { type }  // 被蜕变时退还变异素
    case AffixType.Evolve:
      return { type }  // 被蜕变时技能稀有度+1
    case AffixType.Harvest:
      return { type }  // 被蜕变时获得金币
    case AffixType.Chain:
      return { type, posRel: sharedPosRel ?? pickRandom(ALL_POS_RELATIONS) }  // 被蜕变时连锁范围内技能
    case AffixType.Volatile:
      return { type }  // 被蜕变后短期效果翻倍
    case AffixType.Mutacrit:
      return { type }  // 被蜕变时永久+暴击率
    case AffixType.Ascend:
      return { type }  // 被蜕变时技能升级

    case AffixType.Reecho:
      return { type, reechoPenalty: roundTo(0.10 + random() * 0.10, 2) }  // 10%~20% 每次打错累积惩罚

    case AffixType.Myopia:
      return { type, myopiaBonus: roundTo(0.50 + random() * 1.00, 2), myopiaCost: Math.floor(11 + random() * 16) }  // +50%~150%, cost 11~26 target score

    case AffixType.AuraFury:
      return { type, posRel: sharedPosRel ?? pickRandom(ALL_POS_RELATIONS), auraCrit: roundTo(0.05 + random() * 0.10, 2) }  // +5%~15% crit

    case AffixType.AuraMorale:
      return { type, posRel: sharedPosRel ?? pickRandom(ALL_POS_RELATIONS), auraMorale: roundTo(0.15 + random() * 0.15, 2) }  // +15%~30% bonus

    case AffixType.Fiber:
      return { type, fiberInterval: 4 }  // 每4层触发尾字母技能

    case AffixType.Handoff:
      return { type, handoffCount: 2 + Math.floor(random() * 3) }  // N=2~4 额外触发

    case AffixType.Rewind:
      return { type, rewindCount: 2 + Math.floor(random() * 2) }  // N=2~3 回溯触发

    case AffixType.Endow:
      return { type, endowCount: 2 + Math.floor(random() * 3) }  // N=2~4 捐赠目标

    case AffixType.Silkworm:
      return { type, silkwormK: roundTo(0.30 + random() * 0.40, 2) }  // 每点损失底分+30%~70%产出

    case AffixType.Proofread:
      return { type, proofreadInterval: 4 }  // 未触发叠 1 层，满 4 层词末自触发

    case AffixType.Spelling:
      return { type, spellingInterval: 5 }  // 元音 +2 / 辅音 +1，满 5 层本次 +100%

    case AffixType.FirstEdition:
      return { type, firstEditionMult: roundTo(1.80 + random() * 0.40, 2) }  // ×1.80~2.20

    case AffixType.Reprint:
      return { type, reprintK: roundTo(0.25 + random() * 0.15, 2) }  // 每次重复 +25%~40%

    case AffixType.Matrix:
      return { type, matrixK: roundTo(0.08 + random() * 0.07, 2) }  // 每个交集字母 +8%~15%

    case AffixType.Typeset:
      return { type, typesetK: roundTo(0.06 + random() * 0.04, 2) }  // 每个字母 +6%~10%

    default: {
      const _exhaustive: never = type
      throw new Error(`Unknown AffixType: ${type}`)
    }
  }
}

// ===== 自动命名 =====

/** "词条1·词条2·…·资源名" 格式 */
export function generateName(resource: ResourceType, affixes: AffixInstance[]): string {
  const prefix = affixes.map(a => t('affix.' + a.type)).join('·')
  const base = t('resource.' + resource)
  return prefix ? `${prefix}·${base}` : base
}

// ===== 放置约束检查 =====

/**
 * 检查给定 shapeId+rotation 是否能在键盘上找到至少一个合法放置位置。
 * 若 preferredRotation 可行直接返回；否则依次尝试其余 3 个旋转态。
 * 全部不可行时回退到 0。
 */
export function findPlaceableRotation(shapeId: string, preferredRotation: number): number {
  // 快速路径：preferred 可行
  if (KEYS.some(k => mapShapeToKeys(k, shapeId, preferredRotation) !== null)) {
    return preferredRotation
  }
  // 尝试其余旋转态
  const rotCount = getShapeRotationCount(shapeId)
  for (let d = 1; d < rotCount; d++) {
    const rot = (preferredRotation + d) % rotCount
    if (KEYS.some(k => mapShapeToKeys(k, shapeId, rot) !== null)) {
      return rot
    }
  }
  // 理论上不应到达此处
  return 0
}

// ===== 完整生成 =====

export interface GenerateSkillOptions {
  /** 强制资源类型（不随机） */
  resource?: ResourceType
  /** 强制稀有度（不掷骰） */
  rarity?: SkillRarity
  /** 强制等级 */
  level?: number
  /** 职业可用资源池（约束转化源/连接监听/增幅资源） */
  availableResources?: readonly ResourceType[]
  /** 强制形状 ID（不随机） */
  shapeId?: string
  /** 强制旋转态（不随机，0~3） */
  rotation?: number
  /** 当前职业 ID（过滤职业专属词条） */
  playerClass?: string
  /** 强制至少 1 个 V2 词条来自此 recipe（gain_skill 按 tag 过滤生成时绑定 ·
   *  保证生成的技能至少拥有一个该 recipe section 的 affix；rarity<1 时提升到 1） */
  forcedRecipe?: AffixV2Recipe
  /** 随机槽位排除 meta 操纵家族（teach/imitate/spear_make/gaze_follow）·
   *  gain_skill spawn 传 true 防递归；shop/普通生成缺省 false（meta 正常刷新出现） */
  excludeMeta?: boolean
  /** forcedRecipe 若为 meta 家族，则其 effect 置 noop（保留身份/段，不触发 on_battle_end 效果）·
   *  gain_skill spawn 传 true：让 meta 词条可被 spawn（tool 段可达）又不递归 spawn / 滚雪球 */
  inertMeta?: boolean
}

/** 生成一个随机词条制技能实例 */
export function generateSkill(options?: GenerateSkillOptions): AffixSkillInstance {
  const pool = options?.availableResources ?? GENERIC_RESOURCES
  const resource = options?.resource ?? pickRandom(pool)
  // forcedRecipe（gain_skill 按 tag 生成）要求至少 1 个词条 → rarity 最低 1，否则会出 0 词条技能
  const rarity = options?.forcedRecipe
    ? (Math.max(1, options?.rarity ?? rollRarity()) as SkillRarity)
    : (options?.rarity ?? rollRarity())
  const level = options?.level ?? 1

  // 构建职业排除集：非当前职业的专属词条不参与抽取
  let excludeTypes: Set<string> | undefined
  if (options?.playerClass) {
    excludeTypes = new Set<string>()
    for (const [affixType, requiredClass] of Object.entries(AFFIX_CLASS_RESTRICTION)) {
      if (requiredClass !== options.playerClass) excludeTypes.add(affixType)
    }
  } else {
    // 无职业时排除所有职业专属词条
    excludeTypes = new Set(Object.keys(AFFIX_CLASS_RESTRICTION))
  }

  // 资源互斥：避免代价/加成与自身资源冲突
  if (resource === 'gold') excludeTypes.add(AffixType.Mercenary)
  if (resource === 'score') excludeTypes.add(AffixType.Myopia)
  if (resource === 'time') excludeTypes.add(AffixType.Charge)
  if (resource === 'multiplier') excludeTypes.add(AffixType.Reecho)
  if (resource === 'base') excludeTypes.add(AffixType.Silkworm)

  // ── V2 接管：词条数 = rarity + 1（稀有度 0/1/2/3 → 1/2/3/4 个词条）· hostRarity 仍传实际稀有度(0-3)──
  // 旧 AffixInstance 通道已禁用（orchestrator 入口短路）；保留 affixes=[] 供 UI 兼容
  const v2Ids = sampleV2Ids(rarity + 1, resource, rarity, options?.forcedRecipe, options?.excludeMeta, options?.inertMeta)
  const affixes: AffixInstance[] = []

  // 自动命名：skill.name 只存资源 base，V2 词条名由 display 层（itemDescriptors / shopTerminal）
  // 按当前 locale 动态拼接（避免存 def.id "gen_drumming_xxx" 导致界面显示乱码）
  const name = generateName(resource, affixes)

  // 唯一 ID
  // 保证至少 4 位随机后缀（防止 random()===0 时 slice 得空串）
  const rnd = random() || 0.0001
  const id = `skill_${Date.now()}_${rnd.toString(36).slice(2, 6)}`

  // 形状分配：根据 rarity 从形状池中随机选取
  const shapeId = options?.shapeId != null && SHAPE_TEMPLATES[options.shapeId]
    ? options.shapeId
    : pickRandom(RARITY_TO_SHAPE_POOL[rarity])
  const rotCount = getShapeRotationCount(shapeId)
  let rotation = options?.rotation != null
    ? ((options.rotation % rotCount) + rotCount) % rotCount
    : Math.floor(random() * rotCount)
  // 商店刷新时确保初始姿态能在键盘上放置
  if (options?.rotation == null) {
    rotation = findPlaceableRotation(shapeId, rotation)
  }

  return {
    id,
    name,
    icon: RESOURCE_ICONS[resource] || '?',
    resource,
    baseValues: BASE_VALUES[resource],
    level,
    rarity: rarity as SkillRarity,
    affixes,
    enchantmentIds: [],
    shapeId,
    rotation,
    v2Ids,
  }
}

// ===== V2 affix 生成 =====

/** 用 affixV2Generator.generateAffixV2 为 skill 滚 count 个 V2 词条
 *  每个词条独立选 recipe + 随机 trigger + magnitude scaling
 *  count = rarity + 1（稀有度 0/1/2/3 → 1/2/3/4 个词条）；返回生成出的 (动态注册的) def id 列表
 *  @param skillResource  词条所在 skill 的资源（传给 convert recipe 用作 source 锚点）
 *  @param hostRarity     宿主技能实际稀有度(0-3) · 用于 by:'rarity' scale 排除自身稀有度（≠ count）
 *  @param forcedRecipe   非空时第 1 个词条强制用此 recipe（gain_skill 按 tag 生成 ·
 *                        保证技能至少有一个该 section 的 affix）
 *  @param excludeMeta    随机槽位是否排除 meta 操纵家族（teach/imitate/spear_make/gaze_follow）·
 *                        gain_skill spawn 传 true（随机槽位不滚 meta）；shop/普通生成不传
 *  @param inertMeta      forcedRecipe 若为 meta 家族 → 其 effect 置 noop（身份/段保留，不触发 on_battle_end）·
 *                        gain_skill spawn 传 true：meta 可被生成（tool 段可达）但不递归 spawn
 */
function sampleV2Ids(count: number, skillResource: ResourceType, hostRarity: number, forcedRecipe?: AffixV2Recipe, excludeMeta = false, inertMeta = false): string[] {
  if (count <= 0) return []
  if (ALL_RECIPES.length === 0) return []
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    // 第 1 槽位绑定 forcedRecipe（如有）；其余槽位加权随机（drink 在 time/gold source 降权）
    const recipe = (i === 0 && forcedRecipe)
      ? forcedRecipe
      : pickRecipeForSkill(skillResource, { excludeMeta })
    // inertMeta 仅对 meta recipe 生效（generateAffixV2 内部判定）· 随机槽位已 excludeMeta 故无 meta，透传无副作用
    out.push(generateAffixV2(recipe, skillResource, { inertMeta, hostRarity }))
  }
  return out
}
