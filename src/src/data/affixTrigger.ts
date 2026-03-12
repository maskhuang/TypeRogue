// ============================================
// 打字肉鸽 - 词条制触发流水线 Phase 1~3
// ============================================
// Story 35.3: 基础值 → 加算层 → 乘算层
// 设计文档: docs/design/affix-skill-system.md §五

import type { ResourceType, ResourceState } from '../core/types'
import {
  AffixType, AffixInstance, AffixSkillInstance, SkillRuntimeState,
  EnchantmentType,
} from './affixes'
import { hasRelation, getKeysWithRelation, PositionRelation } from './keyboardTopology'

// ===== 触发上下文 =====

/** 战斗中触发计算所需的只读上下文快照 */
export interface TriggerContext {
  /** 当前触发的键位 */
  triggerKey: string
  /** 上一个按下的键位（级联词条需要） */
  prevKey?: string
  /** 当前正在打的单词 */
  currentWord: string
  /** 当前资源状态快照 */
  resources: ResourceState
  /** 本关职业资源累积产出（fragment/mutagen） */
  classResourceProduced: Record<string, number>
  /** 键位→技能ID绑定 */
  bindings: Map<string, string>
  /** 所有技能运行时状态 */
  skillStates: Map<string, SkillRuntimeState>
  /** 所有已装备的技能实例 */
  allSkills: Map<string, AffixSkillInstance>
  /** 随机函数注入（暴击/禁忌掷骰） */
  randomFn: () => number
  /** 造词师采集队列（字母亲和附魔） */
  fragmentQueue?: string[]
  /** 碎片库存（满溢附魔） */
  fragmentInventory?: Record<string, number>
  /** 不稳定附魔本关随机资源 */
  unstableBonusResource?: ResourceType
}

// ===== 状态变更 =====

export interface StateMutation {
  skillId: string
  field: string
  value: number
}

// ===== 触发标志 =====

export interface TriggerFlags {
  isCrit: boolean
  isPulse: boolean
  isCascade: boolean
  isTabooPenalty: boolean
  ligatureCount: number
}

// ===== 触发结果 =====

export interface TriggerResult {
  /** Phase 3 最终数值 */
  output: number
  /** Phase 2 总加算百分比（UI 展示用） */
  bonusPercent: number
  /** Phase 3 各乘算因子（UI 展示用） */
  multipliers: number[]
  /** 是否暴击 */
  isCrit: boolean
  /** 是否脉冲爆发 */
  isPulse: boolean
  /** 是否级联 */
  isCascade: boolean
  /** 是否禁忌负产出 */
  isTabooPenalty: boolean
  /** 连字倍数（0=无连字） */
  ligatureCount: number
  /** 需要应用的状态变更列表 */
  stateMutations: StateMutation[]
}

// ===== 辅助函数 =====

/** 检查技能是否有指定附魔类型 */
export function hasEnchantment(skill: AffixSkillInstance, enchType: EnchantmentType): boolean {
  return skill.enchantmentIds.includes(enchType)
}

/** 获取任务附魔完成次数（若技能无此附魔返回 0） */
export function getQuestCompletions(
  skill: AffixSkillInstance,
  runtimeState: SkillRuntimeState,
  questType: EnchantmentType,
): number {
  if (!skill.enchantmentIds.includes(questType)) return 0
  return runtimeState.questCompletions
}

/** 统计 posRel 范围内空位数 */
export function countEmptySlots(
  key: string,
  posRel: PositionRelation,
  bindings: Map<string, string>,
): number {
  const related = getKeysWithRelation(key, posRel)
  return related.filter(k => !bindings.has(k)).length
}

/** 流放判定：键是否为单词首字母或尾字母 */
export function isFirstOrLastLetter(key: string, word: string): boolean {
  if (!word || word.length === 0) return false
  const k = key.toLowerCase()
  const w = word.toLowerCase()
  return w[0] === k || w[w.length - 1] === k
}

/** 连字：统计字母在单词中出现的次数 */
export function countOccurrences(key: string, word: string): number {
  const k = key.toLowerCase()
  const w = word.toLowerCase()
  let count = 0
  for (const ch of w) {
    if (ch === k) count++
  }
  return count
}

/** 邻居增幅层数加成：累加 posRel 范围内同资源技能的增幅层数 × vpsEff */
export function sumNeighborAmplifyStacks(
  key: string,
  posRel: PositionRelation,
  resource: ResourceType,
  vpsEff: number,
  ctx: TriggerContext,
): number {
  const neighbors = getKeysWithRelation(key, posRel)
  let bonus = 0
  for (const nk of neighbors) {
    const nSkillId = ctx.bindings.get(nk)
    if (!nSkillId) continue
    const nSkill = ctx.allSkills.get(nSkillId)
    if (!nSkill || nSkill.resource !== resource) continue
    const nState = ctx.skillStates.get(nSkillId)
    if (!nState) continue
    bonus += nState.amplifyStacks * vpsEff
  }
  return bonus
}

// ===== Phase 1: 基础值 =====

/** Phase 1: 返回基础值 baseValues[level-1] */
export function resolvePhase1(skill: AffixSkillInstance): number {
  const idx = Math.max(0, Math.min(skill.level - 1, skill.baseValues.length - 1))
  return skill.baseValues[idx]
}

// ===== getAffixSourceValue =====

/**
 * 读取转化词条的源资源当前值。
 * 对齐设计文档 §五 和现有 converters.ts:getSourceValue。
 */
export function getAffixSourceValue(source: ResourceType, ctx: TriggerContext): number {
  if (source === 'fragment' || source === 'mutagen') {
    return ctx.classResourceProduced[source] ?? 0
  }
  if (source === 'score') {
    return ctx.resources.score + ctx.resources.base * ctx.resources.multiplier
  }
  return ctx.resources[source]
}

// ===== Phase 2: 加算层 =====

export interface Phase2Result {
  output: number
  bonusPercent: number
  mutations: StateMutation[]
}

/**
 * Phase 2: 加算层 — 所有加算增益汇总为 bonusPercent，最后 output × (1 + bonusPercent)。
 * 蓄力清零作为必要副作用直接写入 runtimeState。
 */
export function resolvePhase2(
  skill: AffixSkillInstance,
  runtimeState: SkillRuntimeState,
  ctx: TriggerContext,
  baseOutput: number,
): Phase2Result {
  let bonusPercent = 0
  const mutations: StateMutation[] = []

  // ── 词条加算 ──
  for (const affix of skill.affixes) {
    switch (affix.type) {
      case AffixType.Convert: {
        if (affix.source == null) break
        const c = getQuestCompletions(skill, runtimeState, EnchantmentType.QuestRefine)
        const kEff = (affix.k ?? 0) * (c > 0 ? Math.pow(1.1, c) : 1)
        bonusPercent += kEff * getAffixSourceValue(affix.source, ctx)
        break
      }

      case AffixType.Void: {
        if (affix.posRel == null) break
        const c = getQuestCompletions(skill, runtimeState, EnchantmentType.QuestDevour)
        const slotEff = (affix.bonusPerSlot ?? 0) + c * 0.05
        const empty = countEmptySlots(ctx.triggerKey, affix.posRel, ctx.bindings)
        bonusPercent += empty * slotEff
        break
      }

      case AffixType.Charge: {
        const c = getQuestCompletions(skill, runtimeState, EnchantmentType.QuestEnergize)
        const maxEff = (affix.maxBonus ?? 0) + c * 0.3
        bonusPercent += Math.min(runtimeState.chargeAccumulated, maxEff)
        // 蓄力释放清零 — 直接写入 runtimeState
        runtimeState.chargeAccumulated = 0
        break
      }

      case AffixType.Outcast: {
        if (isFirstOrLastLetter(ctx.triggerKey, ctx.currentWord)) {
          const c = getQuestCompletions(skill, runtimeState, EnchantmentType.QuestCharge)
          bonusPercent += (affix.bonusPercent ?? 0) + c * 0.15
        }
        break
      }

      case AffixType.Amplify: {
        if (affix.posRel == null || affix.resource == null) break
        const c = getQuestCompletions(skill, runtimeState, EnchantmentType.QuestStack)
        const vpsEff = (affix.valuePerStack ?? 0) + c * 0.005
        // 邻居增幅层数
        bonusPercent += sumNeighborAmplifyStacks(
          ctx.triggerKey, affix.posRel, affix.resource, vpsEff, ctx,
        )
        // 自身增幅（同资源时）
        if (skill.resource === affix.resource) {
          bonusPercent += runtimeState.amplifyStacks * vpsEff
        }
        break
      }

      case AffixType.Taboo: {
        bonusPercent += 1.0
        break
      }

      // 其余词条类型在 Phase 2 无加算效果
      default:
        break
    }
  }

  // ── 附魔加算 ──
  for (const enchId of skill.enchantmentIds) {
    const ench = enchId as EnchantmentType

    // 学徒系列：永久成长累积
    if (isApprenticeEnchantment(ench)) {
      bonusPercent += runtimeState.apprenticeAccumulated
    }

    // 任务·吞噬 额外加成（c >= 3 时）
    if (ench === EnchantmentType.QuestDevour) {
      const c = runtimeState.questCompletions
      if (c >= 3) {
        bonusPercent += c * 0.10
      }
    }

    // 满溢：碎片库存中 ≥15 的字母数 × 20%
    if (ench === EnchantmentType.Overflow && ctx.fragmentInventory) {
      const count = Object.values(ctx.fragmentInventory).filter(v => Math.floor(v) >= 15).length
      bonusPercent += count * 0.20
    }

    // 字母亲和：队列含 triggerKey 时 +25%
    if (ench === EnchantmentType.LetterAffinity && ctx.fragmentQueue) {
      if (ctx.fragmentQueue.includes(ctx.triggerKey.toLowerCase())) {
        bonusPercent += 0.25
      }
    }

    // 不稳定：资源匹配时 +30%
    if (ench === EnchantmentType.Unstable && ctx.unstableBonusResource) {
      if (skill.resource === ctx.unstableBonusResource) {
        bonusPercent += 0.30
      }
    }
  }

  return {
    output: baseOutput * (1 + bonusPercent),
    bonusPercent,
    mutations,
  }
}

// ===== Phase 3: 乘算层 =====

export interface Phase3Result {
  output: number
  multipliers: number[]
  flags: TriggerFlags
  mutations: StateMutation[]
}

/**
 * Phase 3: 乘算层 — 各词条独立相乘。
 * 衰减更新作为必要副作用直接写入 runtimeState。
 */
export function resolvePhase3(
  skill: AffixSkillInstance,
  runtimeState: SkillRuntimeState,
  ctx: TriggerContext,
  input: number,
): Phase3Result {
  let output = input
  const multipliers: number[] = []
  const mutations: StateMutation[] = []
  const flags: TriggerFlags = {
    isCrit: false,
    isPulse: false,
    isCascade: false,
    isTabooPenalty: false,
    ligatureCount: 0,
  }

  for (const affix of skill.affixes) {
    switch (affix.type) {
      case AffixType.Multiply: {
        const c = getQuestCompletions(skill, runtimeState, EnchantmentType.QuestAscend)
        const m = (affix.multiplier ?? 1) + c * 0.15
        output *= m
        multipliers.push(m)
        break
      }

      case AffixType.Crit: {
        const roll = ctx.randomFn()
        if (roll < (affix.chance ?? 0)) {
          const c = getQuestCompletions(skill, runtimeState, EnchantmentType.QuestOverload)
          const m = (affix.critMult ?? 1) + c * 0.5
          output *= m
          multipliers.push(m)
          flags.isCrit = true
        }
        break
      }

      case AffixType.Pulse: {
        const interval = affix.interval ?? 1
        // 设计文档仅写 triggerCount % interval === 0，但 triggerCount=0 时不应爆发
        // （首次触发即爆发属于免费收益，不符合"蓄力后爆发"的节奏设计意图）
        if (runtimeState.triggerCount > 0 && runtimeState.triggerCount % interval === 0) {
          const c = getQuestCompletions(skill, runtimeState, EnchantmentType.QuestEcho)
          const m = (affix.burstMult ?? 1) + c * 0.3
          output *= m
          multipliers.push(m)
          flags.isPulse = true
        }
        break
      }

      case AffixType.Decay: {
        const m = runtimeState.currentDecayMult
        output *= m
        multipliers.push(m)
        // 计算衰减后的新值
        const c = getQuestCompletions(skill, runtimeState, EnchantmentType.QuestPurify)
        const floorEff = Math.max(0.1, (affix.floor ?? 0.5) - c * 0.05)
        const newDecay = Math.max(floorEff, runtimeState.currentDecayMult - (affix.decayPerTrigger ?? 0))
        runtimeState.currentDecayMult = newDecay
        break
      }

      case AffixType.Cascade: {
        if (ctx.prevKey && affix.posRel != null && hasRelation(ctx.prevKey, ctx.triggerKey, affix.posRel)) {
          const c = getQuestCompletions(skill, runtimeState, EnchantmentType.QuestChain)
          const m = (affix.cascadeMult ?? 1) + c * 0.2
          output *= m
          multipliers.push(m)
          flags.isCascade = true
        }
        break
      }

      case AffixType.Ligature: {
        const n = countOccurrences(ctx.triggerKey, ctx.currentWord)
        if (n >= 2) {
          output *= n
          multipliers.push(n)
          flags.ligatureCount = n
        }
        break
      }

      case AffixType.Taboo: {
        const c = getQuestCompletions(skill, runtimeState, EnchantmentType.QuestSacrifice)
        const effPenalty = Math.max(0.02, (affix.penaltyChance ?? 0.1) - c * 0.01)
        if (ctx.randomFn() < effPenalty) {
          output *= -1
          multipliers.push(-1)
          flags.isTabooPenalty = true
        }
        break
      }

      // 其余词条类型在 Phase 3 无乘算效果
      default:
        break
    }
  }

  // 乘算化附魔（MultiplyOperator）— 暂为占位，具体逻辑在 Story 35.7 实现
  // 此处不做处理，保留接口

  return { output, multipliers, flags, mutations }
}

// ===== 组合入口 =====

/**
 * 触发词条制技能的完整 Phase 1~3 计算。
 * 副作用：蓄力清零（Phase 2）、衰减更新（Phase 3）直接写入 runtimeState。
 */
export function triggerAffixSkill(
  skill: AffixSkillInstance,
  runtimeState: SkillRuntimeState,
  ctx: TriggerContext,
): TriggerResult {
  // Phase 1: 基础值
  const base = resolvePhase1(skill)

  // Phase 2: 加算层
  const p2 = resolvePhase2(skill, runtimeState, ctx, base)

  // Phase 3: 乘算层
  const p3 = resolvePhase3(skill, runtimeState, ctx, p2.output)

  // 合并状态变更
  const allMutations = [...p2.mutations, ...p3.mutations]

  return {
    output: p3.output,
    bonusPercent: p2.bonusPercent,
    multipliers: p3.multipliers,
    isCrit: p3.flags.isCrit,
    isPulse: p3.flags.isPulse,
    isCascade: p3.flags.isCascade,
    isTabooPenalty: p3.flags.isTabooPenalty,
    ligatureCount: p3.flags.ligatureCount,
    stateMutations: allMutations,
  }
}

// ===== 内部辅助 =====

/** 判断附魔类型是否为学徒系列 */
function isApprenticeEnchantment(ench: EnchantmentType): boolean {
  return ench === EnchantmentType.ApprenticeSelf
    || ench === EnchantmentType.ApprenticeNeighbor
    || ench === EnchantmentType.ApprenticeWord
    || ench === EnchantmentType.ApprenticeProc
    || ench === EnchantmentType.ApprenticeCrit
    || ench === EnchantmentType.ApprenticeOutcast
    || ench === EnchantmentType.ApprenticeLongWord
    || ench === EnchantmentType.ApprenticePerfect
    || ench === EnchantmentType.ApprenticeCombo
    || ench === EnchantmentType.ApprenticeStage
    || ench === EnchantmentType.ApprenticeHarvest
    || ench === EnchantmentType.ApprenticeAdapt
}
