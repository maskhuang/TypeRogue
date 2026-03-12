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
import {
  AffixType,
  AFFIX_WEIGHTS, BASE_VALUES, RARITY_PROBABILITIES,
  VOID_BONUS_TABLE, RESONANCE_EFFICIENCY_TABLE, CONVERT_K_TABLE,
  AFFIX_NAMES, RESOURCE_NAMES,
} from './affixes'

// ===== 常量 =====

const ALL_RESOURCES: ResourceType[] = ['base', 'score', 'multiplier', 'time', 'gold', 'fragment', 'mutagen']
const ALL_POS_RELATIONS: PositionRelation[] = Object.values(PositionRelation)

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
): AffixInstance {
  switch (type) {
    case AffixType.Multiply:
      return { type, multiplier: roundTo(1.3 + random() * 0.7, 2) }

    case AffixType.Convert: {
      let source: ResourceType
      if (convertVariant === 'self') {
        source = resource
      } else if (convertVariant === 'cross') {
        // 异源：排除本资源
        const others = ALL_RESOURCES.filter(r => r !== resource)
        source = pickRandom(others)
      } else {
        // 无指定：随机（后续系统可按需处理）
        source = pickRandom(ALL_RESOURCES)
      }
      const [kMin, kMax] = CONVERT_K_TABLE[source]
      const k = roundTo(kMin + random() * (kMax - kMin), 4)
      return { type, source, k }
    }

    case AffixType.Rainbow:
      return { type }

    case AffixType.Charge:
      return { type, gainPerSec: 0.08, maxBonus: 2.0 }

    case AffixType.Decay:
      return { type, initialMult: 2.0, decayPerTrigger: 0.15, floor: 0.5 }

    case AffixType.Pulse:
      return { type, interval: 4, burstMult: 3.0 }

    case AffixType.Crit:
      return { type, chance: 0.5, critMult: 2.0 }

    case AffixType.Cascade: {
      const posRel = pickRandom(ALL_POS_RELATIONS)
      return { type, posRel, cascadeMult: roundTo(1.8 + random() * 0.7, 2) }
    }

    case AffixType.Void: {
      const posRel = pickRandom(ALL_POS_RELATIONS)
      return { type, posRel, bonusPerSlot: VOID_BONUS_TABLE[posRel] }
    }

    case AffixType.Resonance: {
      const posRel = pickRandom(ALL_POS_RELATIONS)
      return { type, posRel, efficiency: RESONANCE_EFFICIENCY_TABLE[posRel] }
    }

    case AffixType.Mirror:
      return { type, posRel: pickRandom(ALL_POS_RELATIONS) }

    case AffixType.Link:
      return { type, posRel: pickRandom(ALL_POS_RELATIONS), resource: pickRandom(ALL_RESOURCES) }

    case AffixType.Replicate:
      return { type, posRel: pickRandom(ALL_POS_RELATIONS) }

    case AffixType.Amplify:
      return { type, posRel: pickRandom(ALL_POS_RELATIONS), resource, valuePerStack: 0.02 }

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
      return { type, bonusPercent: 1.0, penaltyChance: 0.10 }

    default: {
      const _exhaustive: never = type
      throw new Error(`Unknown AffixType: ${type}`)
    }
  }
}

// ===== 自动命名 =====

/** "词条1·词条2·…·资源名" 格式 */
export function generateName(resource: ResourceType, affixes: AffixInstance[]): string {
  const prefix = affixes.map(a => AFFIX_NAMES[a.type]).join('·')
  const base = RESOURCE_NAMES[resource]
  return prefix ? `${prefix}·${base}` : base
}

// ===== 完整生成 =====

export interface GenerateSkillOptions {
  /** 强制资源类型（不随机） */
  resource?: ResourceType
  /** 强制稀有度（不掷骰） */
  rarity?: SkillRarity
  /** 强制等级 */
  level?: number
}

/** 生成一个随机词条制技能实例 */
export function generateSkill(options?: GenerateSkillOptions): AffixSkillInstance {
  const resource = options?.resource ?? pickRandom(ALL_RESOURCES)
  const rarity = options?.rarity ?? rollRarity()
  const level = options?.level ?? 1

  // 加权不重复抽取 rarity 个词条
  const samples = weightedSampleWithout(rarity)

  // 每个词条掷参数
  const affixes = samples.map(s => rollAffixParams(s.type, resource, s.convertVariant))

  // 自动命名
  const name = generateName(resource, affixes)

  // 唯一 ID
  // 保证至少 4 位随机后缀（防止 random()===0 时 slice 得空串）
  const rnd = random() || 0.0001
  const id = `skill_${Date.now()}_${rnd.toString(36).slice(2, 6)}`

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
  }
}
