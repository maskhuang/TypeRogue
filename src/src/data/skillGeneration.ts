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
import { RARITY_TO_SHAPE_POOL, SHAPE_TEMPLATES, mapShapeToKeys, getShapeRotationCount } from './skillShapes'
import { KEYS } from '../core/constants'
import {
  AffixType,
  AFFIX_WEIGHTS, BASE_VALUES, RARITY_PROBABILITIES,
  VOID_BONUS_TABLE, CONVERT_K_TABLE,
} from './affixes'
import { t } from '../demo/demo-i18n'

// ===== 常量 =====

const GENERIC_RESOURCES: ResourceType[] = ['base', 'score', 'multiplier', 'time', 'gold']
/** 可作为「读取源」的资源（新词条读产出量而非池量，所有资源均可） */
const READABLE_SOURCE_RESOURCES: ResourceType[] = ['base', 'score', 'multiplier', 'time', 'gold']
const ALL_POS_RELATIONS: PositionRelation[] = Object.values(PositionRelation)
/** Clique 过滤掉 Symmetric（最多 2-clique，无意义） */
const CLIQUE_POS_RELATIONS = ALL_POS_RELATIONS.filter(r => r !== PositionRelation.Symmetric)

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
    // Ethereal 只在多词条技能(rarity≥2)上出现——需要其他词条来增幅
    if (key === AffixType.Ethereal && count < 2) continue
    // MonkeyPatch/Decorator 只在多词条技能(rarity≥2)上出现——需要其他词条来 patch/放大
    if ((key === AffixType.MonkeyPatch || key === AffixType.Decorator) && count < 2) continue
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
      return { type, gainPerSec: 0.50, maxBonus: 0.50 }

    case AffixType.Decay:
      return { type, initialMult: 0.40, decayPerTrigger: 0.05, floor: 0.05 }

    case AffixType.Pulse:
      return { type, interval: 4 }

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
      const posRel = sharedPosRel ?? pickRandom(ALL_POS_RELATIONS)
      return { type, posRel, resonanceCount: 4 } // 叠层间隔
    }

    case AffixType.Mirror:
      return { type, posRel: sharedPosRel ?? pickRandom(ALL_POS_RELATIONS) }

    case AffixType.Splash: {
      const posRel = sharedPosRel ?? pickRandom(ALL_POS_RELATIONS)
      return { type, posRel, splashCount: 4 } // 叠层间隔（每 N 层触发 1 个匹配技能）
    }

    case AffixType.Amplify:
      return { type, posRel: sharedPosRel ?? pickRandom(ALL_POS_RELATIONS), resource }

    case AffixType.Conduit:
      return { type, posRel: sharedPosRel ?? pickRandom(ALL_POS_RELATIONS) }

    case AffixType.Relay: {
      const posRel = sharedPosRel ?? pickRandom(ALL_POS_RELATIONS)
      return { type, posRel, relayCount: 4 } // 叠层间隔
    }

    case AffixType.WarDrum:
      return { type, posRel: sharedPosRel ?? pickRandom(ALL_POS_RELATIONS), critPerStack: 0.02 }

    case AffixType.Burst:
      return { type, burstK: roundTo(0.20 + random() * 0.20, 2), critChance: 0.08 }

    case AffixType.ZeroIn:
      return { type, zeroInK: roundTo(0.15 + random() * 0.15, 2), critChance: 0.08 }

    case AffixType.Sharpshooter:
      return { type, sharpK: roundTo(1.00 + random() * 1.00, 2), critChance: 0.05 }

    case AffixType.Bridge:
      // Bridge 固定 Adjacent（其他关系下人人互连，永远不是桥）
      return { type, posRel: PositionRelation.Adjacent, bridgeK: roundTo(0.25 + random() * 0.20, 2) }

    case AffixType.Clique: {
      // Clique 过滤 Symmetric（最多 2-clique，无意义）
      const posRel = sharedPosRel ?? pickRandom(CLIQUE_POS_RELATIONS)
      return { type, posRel, cliqueK: roundTo(0.10 + random() * 0.10, 2) }
    }

    case AffixType.Component:
      return { type, componentK: roundTo(0.03 + random() * 0.03, 2) }

    case AffixType.Entropy:
      return { type, entropyK: roundTo(0.06 + random() * 0.06, 2) }

    case AffixType.Cipher:
      return { type, cipherK: roundTo(0.01 + random() * 0.02, 2) }

    case AffixType.Pattern:
      return { type, patternK: roundTo(0.03 + random() * 0.03, 2) }

    case AffixType.Parity:
      return { type, oddK: roundTo(0.15 + random() * 0.10, 2), evenK: roundTo(0.08 + random() * 0.07, 2) }

    case AffixType.Prime:
      return { type, primeK: roundTo(0.04 + random() * 0.04, 2) }

    case AffixType.Match: {
      const posRel = sharedPosRel ?? pickRandom(ALL_POS_RELATIONS)
      return { type, posRel, matchK: roundTo(0.08 + random() * 0.07, 2) }
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

    case AffixType.Fallacy:
      return { type, fallacyK: roundTo(0.05 + random() * 0.07, 3), fallacyStacks: 0 }  // 0.05~0.12 per non-crit

    case AffixType.Multiply:
      return { type, multiplyValue: roundTo(1.5 + random() * 0.5, 2) }  // ×1.5~2.0

    case AffixType.Cluster:
      return { type, clusterK: roundTo(0.08 + random() * 0.07, 3) }  // 0.08~0.15 per cluster unit

    case AffixType.Coverage:
      return { type, coverageK: roundTo(0.03 + random() * 0.03, 3) }  // 0.03~0.06 per unique letter

    case AffixType.Bigram:
      return { type, bigramK: roundTo(0.30 + random() * 0.30, 3) }  // 0.30~0.60 per avg rarity

    case AffixType.Flow:
      return { type, posRel: pickRandom(ALL_POS_RELATIONS), flowK: roundTo(0.03 + random() * 0.05, 3) }  // 0.03~0.08

    case AffixType.Confluence:
      return { type, posRel: pickRandom(ALL_POS_RELATIONS), confluenceK: roundTo(0.15 + random() * 0.15, 3) }  // 0.15~0.30

    case AffixType.Turbulence:
      return { type, posRel: pickRandom(ALL_POS_RELATIONS), turbulenceK: roundTo(0.05 + random() * 0.07, 3) }  // 0.05~0.12

    case AffixType.PhaseShift: {
      const src = pickRandom(READABLE_SOURCE_RESOURCES.filter(r => r !== resource))
      const srcBase = BASE_VALUES[src]?.[0] ?? 1
      // 阈值 = N次标准触发的产出量（T1≈15~30次, T2≈40~70次）
      return { type, phaseSource: src, phaseT1: roundTo((15 + random() * 15) * srcBase, 1), phaseT2: roundTo((40 + random() * 30) * srcBase, 1), kSolid: roundTo(0.005 + random() * 0.005, 4), kLiquid: roundTo(0.015 + random() * 0.015, 4), kGas: roundTo(0.03 + random() * 0.02, 4), sustainCost: roundTo((0.5 + random() * 1.5) * srcBase, 2) }
    }

    case AffixType.EndoExo: {
      const src = pickRandom(READABLE_SOURCE_RESOURCES.filter(r => r !== resource))
      const srcBase = BASE_VALUES[src]?.[0] ?? 1
      // 阈值 = N次标准触发的产出量（≈15~35次）
      return { type, endoSource: src, endoThreshold: roundTo((15 + random() * 20) * srcBase, 1), kExo: roundTo(0.02 + random() * 0.02, 4), kEndo: roundTo(-0.005 + random() * 0.008, 4), endoConsumeRate: roundTo((0.5 + random() * 2) * srcBase, 2) }
    }

    case AffixType.Fusion: {
      const pool = READABLE_SOURCE_RESOURCES.filter(r => r !== resource)
      const srcA = pickRandom(pool)
      const srcB = pickRandom(pool.filter(r => r !== srcA))
      const baseA = BASE_VALUES[srcA]?.[0] ?? 1
      const baseB = BASE_VALUES[srcB]?.[0] ?? 1
      // 阈值 = N次标准触发的产出量（≈15~35次）
      return { type, fusionSourceA: srcA, fusionSourceB: srcB, ignitionA: roundTo((15 + random() * 20) * baseA, 1), ignitionB: roundTo((15 + random() * 20) * baseB, 1), fusionK: roundTo(0.02 + random() * 0.02, 4), fusionConsumeA: roundTo((1 + random() * 3) * baseA, 2), fusionConsumeB: roundTo((1 + random() * 3) * baseB, 2), fusionPenalty: roundTo(0.05 + random() * 0.10, 3) }
    }

    case AffixType.Leverage: {
      const levSrc = pickRandom(READABLE_SOURCE_RESOURCES.filter(r => r !== resource))
      const levBase = BASE_VALUES[levSrc]?.[0] ?? 1
      return { type, source: levSrc, leverageK: roundTo(0.06 + random() * 0.06, 2), marginThreshold: roundTo((2 + random() * 2) * levBase, 1) }
    }

    case AffixType.Option: {
      const optSrc = pickRandom(READABLE_SOURCE_RESOURCES.filter(r => r !== resource))
      const optBase = BASE_VALUES[optSrc]?.[0] ?? 1
      const strike = roundTo((3 + random() * 3) * optBase, 1)
      return { type, source: optSrc, optionK: roundTo(0.04 + random() * 0.04, 2), strikePrice: strike, premium: roundTo(0.05 + random() * 0.05, 2) }
    }

    case AffixType.Hedge: {
      const hedgePool = READABLE_SOURCE_RESOURCES.filter(r => r !== resource)
      const hSrcA = pickRandom(hedgePool)
      const hSrcB = pickRandom(hedgePool.filter(r => r !== hSrcA))
      return { type, hedgeSourceA: hSrcA, hedgeSourceB: hSrcB, hedgeK: roundTo(0.20 + random() * 0.20, 2) }
    }

    case AffixType.Decorator:
      return { type, decoratorK: roundTo(0.20 + random() * 0.20, 2) }

    case AffixType.Reflect:
      return { type, reflectK: roundTo(0.04 + random() * 0.04, 2) }

    case AffixType.MonkeyPatch:
      return { type, patchLow: 0.5, patchHigh: 2.0 }

    case AffixType.Innate:
      return { type }

    case AffixType.Counter: {
      const posRel = sharedPosRel ?? pickRandom(ALL_POS_RELATIONS)
      return { type, posRel, maxCharges: Math.floor(2 + random() * 3) }  // 2~4 charges
    }

    case AffixType.Exhaust:
      return { type, exhaustMult: roundTo(2.5 + random() * 1.0, 1), maxTriggers: Math.floor(5 + random() * 6) }  // ×2.5~3.5, 5~10 uses

    case AffixType.Ethereal:
      return { type }  // 效果固定：其他词条+1级，无需参数

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
  }
}
