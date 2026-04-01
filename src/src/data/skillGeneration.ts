// ============================================
// 打字肉鸽 - 技能生成引擎
// ============================================
// Story 35.2: 运行时随机生成词条制技能
// 设计文档: docs/design/affix-skill-system.md §八、§九

import { random } from '../core/seededRandom'
import { RESOURCE_ICONS } from '../core/constants'
import type { ResourceType } from '../core/types'
import { PositionRelation } from './keyboardTopology'
import type { AffixInstance, AffixSkillInstance, SkillRarity } from './affixes'
import { RARITY_TO_SHAPE_POOL, SHAPE_TEMPLATES, mapShapeToKeys } from './skillShapes'
import { KEYS } from '../core/constants'
import {
  AffixType,
  AFFIX_WEIGHTS, BASE_VALUES, RARITY_PROBABILITIES,
  VOID_BONUS_TABLE, CONVERT_K_TABLE,
} from './affixes'
import { t } from '../demo/demo-i18n'

// ===== 常量 =====

const GENERIC_RESOURCES: ResourceType[] = ['base', 'score', 'multiplier', 'time', 'gold']
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

export function weightedSampleWithout(count: number): WeightedSampleResult[] {
  if (count <= 0) return []

  // 构建带权重的可变池
  const pool = new Map<string, number>()
  for (const [key, weight] of Object.entries(AFFIX_WEIGHTS)) {
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
  availableResources?: ResourceType[],
  sharedPosRel?: PositionRelation,
): AffixInstance {
  const pool = availableResources ?? GENERIC_RESOURCES
  switch (type) {
    case AffixType.Convert: {
      let source: ResourceType
      if (convertVariant === 'self') {
        source = resource
      } else if (convertVariant === 'cross') {
        // 异源：排除本资源
        const others = pool.filter(r => r !== resource)
        source = pickRandom(others)
      } else {
        // 无指定：随机
        source = pickRandom(pool)
      }
      const [kMin, kMax] = CONVERT_K_TABLE[source]
      const k = roundTo(kMin + random() * (kMax - kMin), 4)
      return { type, source, k }
    }

    case AffixType.Rainbow:
      return { type }

    case AffixType.Charge:
      return { type, gainPerSec: 0.25, maxBonus: 0.50 }

    case AffixType.Decay:
      return { type, initialMult: 0.40, decayPerTrigger: 0.05, floor: 0.05 }

    case AffixType.Pulse:
      return { type, interval: 4, burstMult: 3.0 }

    case AffixType.Crit:
      return { type, chance: roundTo(0.1 + random() * 0.2, 2) }

    case AffixType.Cascade: {
      const posRel = sharedPosRel ?? pickRandom(ALL_POS_RELATIONS)
      return { type, posRel, cascadeMult: roundTo(1.8 + random() * 0.7, 2) }
    }

    case AffixType.Void: {
      const posRel = sharedPosRel ?? pickRandom(ALL_POS_RELATIONS)
      return { type, posRel, bonusPerSlot: VOID_BONUS_TABLE[posRel] }
    }

    case AffixType.Resonance: {
      // 共鸣词条：范围内共享资源或词条的技能触发时，本技能自动触发N次
      const posRel = sharedPosRel ?? pickRandom(ALL_POS_RELATIONS)
      return { type, posRel, resonanceCount: 1 }
    }

    case AffixType.Mirror:
      return { type, posRel: sharedPosRel ?? pickRandom(ALL_POS_RELATIONS) }

    case AffixType.Splash: {
      // 溅射词条：自身不产出；触发后触发范围内N个共享资源或词条的技能
      const posRel = sharedPosRel ?? pickRandom(ALL_POS_RELATIONS)
      return { type, posRel, splashCount: 1 }
    }

    case AffixType.Amplify:
      return { type, posRel: sharedPosRel ?? pickRandom(ALL_POS_RELATIONS), resource }

    case AffixType.Conduit:
      return { type, posRel: sharedPosRel ?? pickRandom(ALL_POS_RELATIONS) }

    case AffixType.Relay: {
      // 中转词条：范围内共享技能触发时，中转触发N个匹配技能（不含其他中转）
      const posRel = sharedPosRel ?? pickRandom(ALL_POS_RELATIONS)
      return { type, posRel, relayCount: 1 }
    }

    case AffixType.Outcast:
      return { type, bonusPercent: roundTo(0.4 + random() * 0.4, 2) }

    case AffixType.Gravity:
      return { type, probMult: roundTo(random() * 2.0, 2) }

    case AffixType.Ligature:
      return { type }

    case AffixType.Twin:
      return { type }

    case AffixType.Recurse:
      return { type, recurseChance: roundTo(0.15 + random() * 0.15, 2) }

    case AffixType.Taboo:
      return { type, bonusPercent: 0.60 }

    case AffixType.Multiply:
      return { type, multiplyValue: roundTo(1.5 + random() * 0.5, 2) }  // ×1.5~2.0

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
  // 尝试其余 3 个旋转态
  for (let d = 1; d <= 3; d++) {
    const rot = (preferredRotation + d) % 4
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
  availableResources?: ResourceType[]
  /** 强制形状 ID（不随机） */
  shapeId?: string
  /** 强制旋转态（不随机，0~3） */
  rotation?: number
}

/** 生成一个随机词条制技能实例 */
export function generateSkill(options?: GenerateSkillOptions): AffixSkillInstance {
  const pool = options?.availableResources ?? GENERIC_RESOURCES
  const resource = options?.resource ?? pickRandom(pool)
  const rarity = options?.rarity ?? rollRarity()
  const level = options?.level ?? 1

  // 加权不重复抽取 rarity 个词条
  const samples = weightedSampleWithout(rarity)

  // 同一技能共享同一个 posRel
  const sharedPosRel = pickRandom(ALL_POS_RELATIONS)

  // 每个词条掷参数
  const affixes = samples.map(s => rollAffixParams(s.type, resource, s.convertVariant, pool, sharedPosRel))

  // 自动命名
  const name = generateName(resource, affixes)

  // 唯一 ID
  // 保证至少 4 位随机后缀（防止 random()===0 时 slice 得空串）
  const rnd = random() || 0.0001
  const id = `skill_${Date.now()}_${rnd.toString(36).slice(2, 6)}`

  // 形状分配：根据 rarity 从形状池中随机选取
  const shapeId = options?.shapeId != null && SHAPE_TEMPLATES[options.shapeId]
    ? options.shapeId
    : pickRandom(RARITY_TO_SHAPE_POOL[rarity])
  let rotation = options?.rotation != null
    ? ((options.rotation % 4) + 4) % 4
    : Math.floor(random() * 4)
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
  }
}
