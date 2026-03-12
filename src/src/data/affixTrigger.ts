// ============================================
// 打字肉鸽 - 词条制触发流水线 Phase 1~6
// ============================================
// Story 35.3: Phase 1~3（基础值 → 加算层 → 乘算层）
// Story 35.4: Phase 4~6（资源写入 → 后触发 → 邻居通知）
// Story 35.5: 学徒附魔 12 类 + 溅射数据 + 职业过滤
// Story 35.6: 任务附魔完善 + Mirror/Gravity 助手 + 抽取过滤 + Twin
// Story 35.7: 衍生 ratio 校准 + 同资源优化 + MultiplyOperator
// 设计文档: docs/design/affix-skill-system.md §五

import type { ResourceType, ResourceState } from '../core/types'
import type { AffixInstance, AffixSkillInstance, AffixSkillSaveData, SkillRuntimeState } from './affixes'
import {
  AffixType,
  EnchantmentType, APPRENTICE_NEIGHBOR_GROWTH, QUEST_ENCHANTMENT_DEFS, QUEST_AFFIX_MAP,
  TRANSMUTE_RATIO_TABLE, MULTIPLY_OPERATOR_CALIBRATION, BASE_VALUES,
  isOldSystemSkill,
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
  // ── Phase 5 学徒附魔事件上下文（由调用方注入） ──
  /** 本次触发是否完成了一个单词（学徒·造词/丰收） */
  wordCompleted?: boolean
  /** 本次触发是否零错误完成单词 */
  perfectWord?: boolean
  /** 当前连击数（学徒·连击在 comboReach(15) 时触发） */
  comboCount?: number
  /** 当前玩家职业（造词师限定/蜕变师限定附魔） */
  playerClass?: string
  /** 本次触发是否应用了变异 */
  mutationApplied?: boolean
  // ── Phase 4-6 附魔运行时参数（由调用方填充） ──
  /** 溅射附魔位置关系（Splash 变体） */
  splashPosRel?: PositionRelation
  /** 衍生附魔目标资源 */
  transmuteResource?: ResourceType
  /** @deprecated 使用 TRANSMUTE_RATIO_TABLE[resource] 替代 */
  transmuteRatio?: number
  /** 嗜变附魔概率（默认 MUTATION_HUNGER_CHANCE） */
  mutationHungerChance?: number
  /** 各技能附魔运行时参数（键为 skillId） */
  skillEnchantmentParams?: Map<string, { posRel?: PositionRelation }>
  // ── 遗物注入（由 skills.ts 提供，避免 data→systems 依赖）(Story 35.12) ──
  /** resolveRelicSkillTrigger() 结果乘数 */
  relicMultiplier?: number
  /** chain_ban 生效时为 true：跳过连接/复制/共鸣词条 Phase 5-6 */
  chainAffixesDisabled?: boolean
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

// ===== Phase 4-6 返回类型 =====

export interface Phase4Result {
  targetResource: ResourceType
  output: number
}

export interface Phase5Result {
  /** 复制词条需触发的邻居键位 */
  replicateTargets: string[]
  /** 递归词条重触发指令 */
  recurse: { shouldRecurse: boolean, newChance: number }
  /** 衍生附魔额外资源产出（异资源时） */
  transmuteOutput: { resource: ResourceType, amount: number } | null
  /** 衍生附魔同资源增强比率（同资源时，系统层应用 output × (1 + boost)）— 由 35-9 shop-integration 消费 */
  transmuteSameResourceBoost: number
  /** 溅射附魔目标列表 */
  splashTargets: { key: string, efficiency: number }[]
  /** 嗜变附魔产出（0 或 1） */
  mutagenOutput: number
  /** 吞噬目标键位（QuestDevour 满层时） */
  devourTarget: string | null
  /** 是否完成一次任务循环 */
  questCompleted: boolean
}

export type Phase6Action =
  | { type: 'resonance', neighborKey: string, efficiencyMult: number }
  | { type: 'link', neighborKey: string }
  | { type: 'apprentice_neighbor', neighborKey: string, growthDelta: number }
  | { type: 'quest_resonance', neighborKey: string }

export interface Phase6Result {
  actions: Phase6Action[]
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
  /** Phase 4 结果 */
  phase4?: Phase4Result
  /** Phase 5 结果 */
  phase5?: Phase5Result
  /** Phase 6 结果 */
  phase6?: Phase6Result
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
  /** 乘算化模式：各加算项独立拆分（Phase 3 逐项相乘） */
  bonusBreakdown?: number[]
}

/**
 * Phase 2: 加算层 — 所有加算增益汇总为 bonusPercent，最后 output × (1 + bonusPercent)。
 * 乘算化附魔（MultiplyOperator）时，各项 bonus 独立记录到 bonusBreakdown，
 * output 保持 baseOutput 不变，由 Phase 3 逐项相乘。
 * 蓄力清零作为必要副作用直接写入 runtimeState。
 */
export function resolvePhase2(
  skill: AffixSkillInstance,
  runtimeState: SkillRuntimeState,
  ctx: TriggerContext,
  baseOutput: number,
): Phase2Result {
  const hasMultOp = skill.enchantmentIds.includes(EnchantmentType.MultiplyOperator)
  let bonusPercent = 0
  const mutations: StateMutation[] = []
  const breakdown: number[] = []

  // 乘算化 breakdown 追踪辅助
  let snap = 0
  const track = () => {
    const delta = bonusPercent - snap
    if (hasMultOp && delta !== 0) breakdown.push(delta)
    snap = bonusPercent
  }

  // ── 词条加算 ──
  for (const affix of skill.affixes) {
    switch (affix.type) {
      case AffixType.Convert: {
        if (affix.source == null) break
        const c = getQuestCompletions(skill, runtimeState, EnchantmentType.QuestRefine)
        const kEff = (affix.k ?? 0) * (c > 0 ? Math.pow(1.1, c) : 1)
        bonusPercent += kEff * getAffixSourceValue(affix.source, ctx)
        track()
        break
      }

      case AffixType.Void: {
        if (affix.posRel == null) break
        const c = getQuestCompletions(skill, runtimeState, EnchantmentType.QuestDevour)
        const slotEff = (affix.bonusPerSlot ?? 0) + c * 0.05
        const empty = countEmptySlots(ctx.triggerKey, affix.posRel, ctx.bindings)
        bonusPercent += empty * slotEff
        track()
        break
      }

      case AffixType.Charge: {
        const c = getQuestCompletions(skill, runtimeState, EnchantmentType.QuestEnergize)
        const maxEff = (affix.maxBonus ?? 0) + c * 0.3
        bonusPercent += Math.min(runtimeState.chargeAccumulated, maxEff)
        // 蓄力释放清零 — 直接写入 runtimeState
        runtimeState.chargeAccumulated = 0
        track()
        break
      }

      case AffixType.Outcast: {
        if (isFirstOrLastLetter(ctx.triggerKey, ctx.currentWord)) {
          const c = getQuestCompletions(skill, runtimeState, EnchantmentType.QuestCharge)
          bonusPercent += (affix.bonusPercent ?? 0) + c * 0.15
        }
        track()
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
        track()
        break
      }

      case AffixType.Taboo: {
        bonusPercent += 1.0
        track()
        break
      }

      // 其余词条类型在 Phase 2 无加算效果
      default:
        break
    }
  }

  // ── 附魔加算 ──

  // 学徒系列：永久成长累积（所有学徒共享同一累积值，只加一次）
  if (skill.enchantmentIds.some(id => isApprenticeEnchantment(id as EnchantmentType))) {
    bonusPercent += runtimeState.apprenticeAccumulated
    track()
  }

  for (const enchId of skill.enchantmentIds) {
    const ench = enchId as EnchantmentType

    // 任务·吞噬 额外加成（c >= 3 时）
    if (ench === EnchantmentType.QuestDevour) {
      const c = runtimeState.questCompletions
      if (c >= 3) {
        bonusPercent += c * 0.10
      }
      track()
    }

    // 满溢：碎片库存中 ≥15 的字母数 × 20%
    if (ench === EnchantmentType.Overflow) {
      if (ctx.fragmentInventory) {
        const count = Object.values(ctx.fragmentInventory).filter(v => Math.floor(v) >= 15).length
        bonusPercent += count * 0.20
      }
      track()
    }

    // 字母亲和：队列含 triggerKey 时 +25%
    if (ench === EnchantmentType.LetterAffinity) {
      if (ctx.fragmentQueue && ctx.fragmentQueue.includes(ctx.triggerKey.toLowerCase())) {
        bonusPercent += 0.25
      }
      track()
    }

    // 不稳定：资源匹配时 +30%
    if (ench === EnchantmentType.Unstable) {
      if (ctx.unstableBonusResource && skill.resource === ctx.unstableBonusResource) {
        bonusPercent += 0.30
      }
      track()
    }
  }

  // 乘算化模式：不应用 bonusPercent 到 output，由 Phase 3 逐项相乘
  // 注意：MultiplyOperator 模式下 bonusPercent 仅作信息参考（不反映在 output 中），
  // 实际乘算通过 bonusBreakdown 在 Phase 3 逐项应用
  return {
    output: hasMultOp ? baseOutput : baseOutput * (1 + bonusPercent),
    bonusPercent,
    mutations,
    bonusBreakdown: hasMultOp ? breakdown : undefined,
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
 * 乘算化附魔（MultiplyOperator）时，bonusBreakdown 各项在末尾逐项相乘。
 * 衰减更新作为必要副作用直接写入 runtimeState。
 */
export function resolvePhase3(
  skill: AffixSkillInstance,
  runtimeState: SkillRuntimeState,
  ctx: TriggerContext,
  input: number,
  bonusBreakdown?: number[],
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
        const cLig = getQuestCompletions(skill, runtimeState, EnchantmentType.QuestOverlap)
        const nEff = n + cLig
        if (nEff >= 2) {
          output *= nEff
          multipliers.push(nEff)
          flags.ligatureCount = nEff
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

  // 乘算化附魔（MultiplyOperator）— Phase 2 各加算项独立相乘
  if (bonusBreakdown && bonusBreakdown.length > 0) {
    const calibration = MULTIPLY_OPERATOR_CALIBRATION[skill.resource] ?? 1
    for (const bonus of bonusBreakdown) {
      const m = 1 + bonus * calibration
      output *= m
      multipliers.push(m)
    }
  }

  return { output, multipliers, flags, mutations }
}

// ===== Phase 4-6 常量 =====

export const ALL_RESOURCES: ResourceType[] = ['base', 'score', 'multiplier', 'time', 'gold', 'fragment', 'mutagen']
export const MAX_RECURSE_DEPTH = 10
export const MAX_CHAIN_DEPTH = 20
export const MUTATION_HUNGER_CHANCE = 0.05

/** 学徒附魔 growthPerProc 默认值（Phase 5 自触发类型 + 外部事件类型） */
export const APPRENTICE_GROWTH_DEFAULTS: Partial<Record<EnchantmentType, number>> = {
  // Phase 5 自触发类型
  [EnchantmentType.ApprenticeSelf]: 0.005,      // 0.5% — selfTrigger（每次触发）
  [EnchantmentType.ApprenticeCrit]: 0.02,        // 2%   — critHit
  [EnchantmentType.ApprenticeOutcast]: 0.015,    // 1.5% — outcastProc
  [EnchantmentType.ApprenticeProc]: 0.015,       // 1.5% — affixProc
  [EnchantmentType.ApprenticeWord]: 0.02,        // 2%   — wordComplete
  [EnchantmentType.ApprenticeLongWord]: 0.025,   // 2.5% — longWord(≥6)
  [EnchantmentType.ApprenticePerfect]: 0.03,     // 3%   — perfectWord
  [EnchantmentType.ApprenticeHarvest]: 0.08,     // 8%   — wordComplete（造词师限定）
  [EnchantmentType.ApprenticeAdapt]: 0.15,       // 15%  — mutationApplied（蜕变师限定）
  // 外部事件类型（由 applyApprenticeEvent 处理）
  [EnchantmentType.ApprenticeCombo]: 0.01,       // 1%   — comboReach(15)
  [EnchantmentType.ApprenticeStage]: 0.08,       // 8%   — stageCleared
  // ApprenticeNeighbor 不在此表，按 APPRENTICE_NEIGHBOR_GROWTH 查 posRel 表
}

// ===== Phase 4-6 辅助函数 =====

/** 加权随机资源选择（光谱附魔偏向最低资源） */
export function weightedRandomResource(ctx: TriggerContext, spectrumCompletions: number): ResourceType {
  if (spectrumCompletions <= 0) {
    // 等概率随机
    const idx = Math.floor(ctx.randomFn() * ALL_RESOURCES.length)
    return ALL_RESOURCES[Math.min(idx, ALL_RESOURCES.length - 1)]
  }

  // 找到当前值最低的资源
  let minVal = Infinity
  let minIdx = 0
  for (let i = 0; i < ALL_RESOURCES.length; i++) {
    const val = getAffixSourceValue(ALL_RESOURCES[i], ctx)
    if (val < minVal) {
      minVal = val
      minIdx = i
    }
  }

  // 加权：base = 1，最低资源额外 + completions × 0.15
  const weights: number[] = ALL_RESOURCES.map(() => 1)
  weights[minIdx] += spectrumCompletions * 0.15

  const totalWeight = weights.reduce((a, b) => a + b, 0)
  let roll = ctx.randomFn() * totalWeight
  for (let i = 0; i < ALL_RESOURCES.length; i++) {
    roll -= weights[i]
    if (roll <= 0) return ALL_RESOURCES[i]
  }
  return ALL_RESOURCES[ALL_RESOURCES.length - 1]
}

/** 找 posRel 范围内产出最低的邻居键位 */
export function findWeakestNeighbor(
  triggerKey: string,
  posRel: PositionRelation,
  ctx: TriggerContext,
): string | null {
  const neighbors = getKeysWithRelation(triggerKey, posRel)
  let weakestKey: string | null = null
  let weakestLevel = Infinity
  let weakestBase = Infinity

  for (const nk of neighbors) {
    if (nk === triggerKey) continue
    const nSkillId = ctx.bindings.get(nk)
    if (!nSkillId) continue
    const nSkill = ctx.allSkills.get(nSkillId)
    if (!nSkill) continue

    if (nSkill.level < weakestLevel || (nSkill.level === weakestLevel && nSkill.baseValues[0] < weakestBase)) {
      weakestKey = nk
      weakestLevel = nSkill.level
      weakestBase = nSkill.baseValues[0]
    }
  }

  return weakestKey
}

/** 从候选中不重复随机选取 N 个键位 */
export function pickRandomKeys(keys: string[], count: number, randomFn: () => number): string[] {
  if (keys.length <= count) return [...keys]

  const pool = [...keys]
  const picked: string[] = []
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(randomFn() * pool.length)
    picked.push(pool[idx])
    pool.splice(idx, 1)
  }
  return picked
}

/** 检查任务附魔事件条件是否满足 */
function checkQuestEventCondition(
  event: string,
  triggerFlags: TriggerFlags,
  skill: AffixSkillInstance,
  ctx: TriggerContext,
  recurseProc: boolean,
): boolean {
  switch (event) {
    case 'selfTrigger': return true
    case 'critHit': return triggerFlags.isCrit
    case 'outcastProc':
      return skill.affixes.some(a => a.type === AffixType.Outcast) && isFirstOrLastLetter(ctx.triggerKey, ctx.currentWord)
    case 'affixProc:pulse': return triggerFlags.isPulse
    case 'affixProc:cascade': return triggerFlags.isCascade
    case 'affixProc:recurse': return recurseProc
    case 'affixProc:taboo_penalty': return triggerFlags.isTabooPenalty
    // ── Phase 5 可判断的事件（使用 TriggerContext 字段） ──
    case 'perfectWord': return ctx.perfectWord === true
    case 'wordComplete': return ctx.wordCompleted === true
    case 'longWord:6': return ctx.wordCompleted === true && ctx.currentWord.length >= 6
    // ── neighborTrigger 在 Phase 6 独立处理（QuestResonance），Phase 5 不重复叠层 ──
    case 'neighborTrigger': return false
    // ── 外部事件（comboReach:15, stageCleared）由调用方通过 applyQuestEvent 处理 ──
    default: return false
  }
}

// ===== Phase 4: 资源选择 =====

/**
 * Phase 4: 确定目标资源。彩虹词条随机选择资源，光谱附魔偏向最低资源。
 * 实际资源写入和反馈/音效由调用方执行。
 */
export function resolvePhase4(
  skill: AffixSkillInstance,
  output: number,
  runtimeState: SkillRuntimeState,
  ctx: TriggerContext,
): Phase4Result {
  const hasRainbow = skill.affixes.some(a => a.type === AffixType.Rainbow)

  if (!hasRainbow) {
    return { targetResource: skill.resource, output }
  }

  const spectrumCompletions = getQuestCompletions(skill, runtimeState, EnchantmentType.QuestSpectrum)
  const targetResource = weightedRandomResource(ctx, spectrumCompletions)
  return { targetResource, output }
}

// ===== Phase 5: 后触发效果 =====

/**
 * Phase 5: 处理词条后触发和附魔后触发。
 * 副作用：增幅叠层、学徒成长、任务叠层直接写入 runtimeState。
 * 返回动作描述符（复制/递归/衍生/溅射/嗜变/吞噬），由调用方执行。
 */
export function resolvePhase5(
  skill: AffixSkillInstance,
  runtimeState: SkillRuntimeState,
  ctx: TriggerContext,
  triggerFlags: TriggerFlags,
  output: number,
  recurseDepth: number = 0,
): Phase5Result {
  const result: Phase5Result = {
    replicateTargets: [],
    recurse: { shouldRecurse: false, newChance: 0 },
    transmuteOutput: null,
    transmuteSameResourceBoost: 0,
    splashTargets: [],
    mutagenOutput: 0,
    devourTarget: null,
    questCompleted: false,
  }

  let recurseProc = false

  // ── 词条后触发 ──
  for (const affix of skill.affixes) {
    switch (affix.type) {
      case AffixType.Replicate: {
        if (ctx.chainAffixesDisabled) break // chain_ban: 跳过复制词条
        if (affix.posRel == null) break
        const c = getQuestCompletions(skill, runtimeState, EnchantmentType.QuestFission)
        const targetCount = 1 + c
        const candidates = getKeysWithRelation(ctx.triggerKey, affix.posRel)
          .filter(k => ctx.bindings.has(k) && k !== ctx.triggerKey)
        result.replicateTargets = pickRandomKeys(candidates, targetCount, ctx.randomFn)
        break
      }

      case AffixType.Amplify: {
        runtimeState.amplifyStacks += 1
        break
      }

      case AffixType.Recurse: {
        if (recurseDepth >= MAX_RECURSE_DEPTH) break
        const cRec = getQuestCompletions(skill, runtimeState, EnchantmentType.QuestIterate)
        const chanceEff = (affix.recurseChance ?? 0) + cRec * 0.03
        if (ctx.randomFn() < chanceEff) {
          result.recurse = { shouldRecurse: true, newChance: chanceEff / 2 }
          recurseProc = true
        }
        break
      }

      default:
        break
    }
  }

  // ── 附魔后触发 ──

  // 学徒附魔（Phase 5 自触发类型）
  for (const enchId of skill.enchantmentIds) {
    const ench = enchId as EnchantmentType
    const growth = APPRENTICE_GROWTH_DEFAULTS[ench]
    if (growth == null) continue

    let shouldGrow = false
    switch (ench) {
      case EnchantmentType.ApprenticeSelf:
        shouldGrow = true
        break
      case EnchantmentType.ApprenticeCrit:
        shouldGrow = triggerFlags.isCrit
        break
      case EnchantmentType.ApprenticeOutcast:
        shouldGrow = skill.affixes.some(a => a.type === AffixType.Outcast)
          && isFirstOrLastLetter(ctx.triggerKey, ctx.currentWord)
        break
      case EnchantmentType.ApprenticeProc:
        shouldGrow = triggerFlags.isCrit || triggerFlags.isPulse
          || triggerFlags.isCascade || triggerFlags.isTabooPenalty
        break
      case EnchantmentType.ApprenticeWord:
        shouldGrow = ctx.wordCompleted === true
        break
      case EnchantmentType.ApprenticeLongWord:
        shouldGrow = ctx.wordCompleted === true && ctx.currentWord.length >= 6
        break
      case EnchantmentType.ApprenticePerfect:
        shouldGrow = ctx.perfectWord === true
        break
      case EnchantmentType.ApprenticeHarvest:
        // 造词师限定 — 抽取时已过滤，触发时不再检查职业
        shouldGrow = ctx.wordCompleted === true
        break
      case EnchantmentType.ApprenticeAdapt:
        // 蜕变师限定 — 抽取时已过滤，触发时不再检查职业
        shouldGrow = ctx.mutationApplied === true
        break
      // ApprenticeCombo / ApprenticeStage — 外部事件，不在 Phase 5 处理
      case EnchantmentType.ApprenticeCombo:
      case EnchantmentType.ApprenticeStage:
        shouldGrow = false
        break
    }

    if (shouldGrow) {
      runtimeState.apprenticeAccumulated += growth
    }
  }

  // 任务附魔叠层
  const questEnchType = skill.enchantmentIds.find(id =>
    QUEST_ENCHANTMENT_DEFS.some(d => d.type === id),
  ) as EnchantmentType | undefined

  if (questEnchType) {
    const questDef = QUEST_ENCHANTMENT_DEFS.find(d => d.type === questEnchType)!
    const eventMet = checkQuestEventCondition(questDef.event, triggerFlags, skill, ctx, recurseProc)

    if (eventMet) {
      runtimeState.questStacks++

      if (runtimeState.questStacks >= questDef.targetStacks) {
        runtimeState.questStacks = 0
        runtimeState.questCompletions++
        result.questCompleted = true

        // QuestDevour 特殊：吃最弱邻居
        if (questEnchType === EnchantmentType.QuestDevour) {
          const voidAffix = skill.affixes.find(a => a.type === AffixType.Void)
          if (voidAffix?.posRel != null) {
            result.devourTarget = findWeakestNeighbor(ctx.triggerKey, voidAffix.posRel, ctx)
          }
        }
      }
    }
  }

  // 衍生附魔（per-resource ratio，同资源时直接增强主产出）
  if (skill.enchantmentIds.includes(EnchantmentType.Transmute)) {
    const extraResource = ctx.transmuteResource
    if (extraResource) {
      const ratio = TRANSMUTE_RATIO_TABLE[extraResource]
      if (extraResource === skill.resource) {
        // 同资源：系统层应用 output × (1 + ratio)，不产生独立 transmuteOutput
        result.transmuteSameResourceBoost = ratio
      } else {
        result.transmuteOutput = { resource: extraResource, amount: output * ratio }
      }
    }
  }

  // 溅射附魔
  if (skill.enchantmentIds.includes(EnchantmentType.Splash)) {
    const posRel = ctx.splashPosRel
    if (posRel != null) {
      const candidates = getKeysWithRelation(ctx.triggerKey, posRel)
        .filter(k => ctx.bindings.has(k) && k !== ctx.triggerKey)
      if (candidates.length > 0) {
        const eff = 1 / candidates.length
        result.splashTargets = candidates.map(k => ({ key: k, efficiency: eff }))
      }
    }
  }

  // 嗜变附魔
  if (skill.enchantmentIds.includes(EnchantmentType.MutationHunger)) {
    const chance = ctx.mutationHungerChance ?? MUTATION_HUNGER_CHANCE
    if (ctx.randomFn() < chance) {
      result.mutagenOutput = 1
    }
  }

  return result
}

// ===== Phase 6: 邻居通知 =====

/**
 * Phase 6: 遍历所有已绑定邻居，检查共鸣/连接/学徒·观摩/任务·共振。
 * 返回动作描述符，由调用方执行对应触发/成长/叠层。
 */
export function resolvePhase6(
  triggerKey: string,
  skill: AffixSkillInstance,
  runtimeState: SkillRuntimeState,
  ctx: TriggerContext,
  actualResource?: ResourceType,
): Phase6Result {
  const actions: Phase6Action[] = []

  for (const [neighborKey, neighborSkillId] of ctx.bindings) {
    if (neighborKey === triggerKey) continue

    const neighborSkill = ctx.allSkills.get(neighborSkillId)
    if (!neighborSkill) continue

    const neighborState = ctx.skillStates.get(neighborSkillId)

    // 共鸣词条：邻居触发 → 自身以 effectiveEff 触发
    for (const affix of neighborSkill.affixes) {
      if (affix.type === AffixType.Resonance && ctx.chainAffixesDisabled) continue // chain_ban: 跳过共鸣
      if (affix.type === AffixType.Link && ctx.chainAffixesDisabled) continue // chain_ban: 跳过连接
      if (affix.type === AffixType.Resonance && affix.posRel != null) {
        if (hasRelation(triggerKey, neighborKey, affix.posRel)) {
          const baseEff = affix.efficiency ?? 0
          const c = neighborState ? getQuestCompletions(neighborSkill, neighborState, EnchantmentType.QuestResonance) : 0
          const effectiveEff = baseEff + c * 0.08
          actions.push({ type: 'resonance', neighborKey, efficiencyMult: effectiveEff })
        }
      }

      // 连接词条：当前技能产出资源 === 连接词条监听资源 → 邻居触发
      if (affix.type === AffixType.Link && affix.resource != null && affix.posRel != null) {
        const producedResource = actualResource ?? skill.resource
        if (producedResource === affix.resource && hasRelation(triggerKey, neighborKey, affix.posRel)) {
          actions.push({ type: 'link', neighborKey })
        }
      }
    }

    // 学徒·观摩附魔：邻居触发 → 自身永久成长（不触发技能）
    if (neighborSkill.enchantmentIds.includes(EnchantmentType.ApprenticeNeighbor)) {
      const params = ctx.skillEnchantmentParams?.get(neighborSkillId)
      if (params?.posRel != null && hasRelation(triggerKey, neighborKey, params.posRel)) {
        const growth = APPRENTICE_NEIGHBOR_GROWTH[params.posRel]
        actions.push({ type: 'apprentice_neighbor', neighborKey, growthDelta: growth })
      }
    }

    // 任务·共振附魔：邻居触发 → 叠层
    if (neighborSkill.enchantmentIds.includes(EnchantmentType.QuestResonance)) {
      const hasResonanceOrLink = neighborSkill.affixes.some(a =>
        a.type === AffixType.Resonance || a.type === AffixType.Link,
      )
      if (hasResonanceOrLink) {
        const posRelMatch = neighborSkill.affixes.some(a => {
          if ((a.type === AffixType.Resonance || a.type === AffixType.Link) && a.posRel != null) {
            return hasRelation(triggerKey, neighborKey, a.posRel)
          }
          return false
        })
        if (posRelMatch) {
          actions.push({ type: 'quest_resonance', neighborKey })
        }
      }
    }
  }

  return { actions }
}

// ===== Mirror 有效词条替换 =====

/**
 * 构建有效技能：将 Mirror 词条替换为运行时复制的词条。
 * 若无 Mirror 或 mirrorCopiedAffix 为 null，直接返回原 skill（零分配）。
 */
export function buildEffectiveSkill(
  skill: AffixSkillInstance,
  runtimeState: SkillRuntimeState,
): AffixSkillInstance {
  if (!runtimeState.mirrorCopiedAffix) return skill
  const hasMirror = skill.affixes.some(a => a.type === AffixType.Mirror)
  if (!hasMirror) return skill

  return {
    ...skill,
    affixes: skill.affixes.map(a =>
      a.type === AffixType.Mirror ? runtimeState.mirrorCopiedAffix! : a,
    ),
  }
}

// ===== 组合入口 =====

/**
 * 触发词条制技能的完整 Phase 1~6 计算。
 * 副作用：蓄力清零（Phase 2）、衰减更新（Phase 3）、增幅/学徒/任务叠层（Phase 5）直接写入 runtimeState。
 */
export function triggerAffixSkill(
  skill: AffixSkillInstance,
  runtimeState: SkillRuntimeState,
  ctx: TriggerContext,
  recurseDepth: number = 0,
): TriggerResult {
  // Mirror 词条替换：将 Mirror 替换为运行时复制的词条，使其参与所有 Phase 计算
  const effectiveSkill = buildEffectiveSkill(skill, runtimeState)

  // Phase 1: 基础值
  const base = resolvePhase1(effectiveSkill)

  // Phase 2: 加算层
  const p2 = resolvePhase2(effectiveSkill, runtimeState, ctx, base)

  // Phase 3: 乘算层（乘算化模式传入 bonusBreakdown）
  const p3 = resolvePhase3(effectiveSkill, runtimeState, ctx, p2.output, p2.bonusBreakdown)

  // Phase 4: 资源选择
  const p4 = resolvePhase4(effectiveSkill, p3.output, runtimeState, ctx)

  // Phase 5: 后触发
  const p5 = resolvePhase5(effectiveSkill, runtimeState, ctx, p3.flags, p3.output, recurseDepth)

  // Phase 6: 邻居通知（传入 Phase 4 解析后的实际资源，供 Link 检查使用）
  const p6 = resolvePhase6(ctx.triggerKey, effectiveSkill, runtimeState, ctx, p4.targetResource)

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
    phase4: p4,
    phase5: p5,
    phase6: p6,
  }
}

// ===== 外部事件回调 =====

/** 学徒附魔事件→附魔类型映射 */
const APPRENTICE_EVENT_MAP: Record<string, EnchantmentType> = {
  stageCleared: EnchantmentType.ApprenticeStage,
  comboReach: EnchantmentType.ApprenticeCombo,
}

/**
 * 外部事件回调：系统层在对应事件发生时调用此函数。
 * 遍历 enchantmentIds，匹配事件→累加 growthPerProc 到 runtimeState.apprenticeAccumulated。
 * 纯函数（仅修改传入的 runtimeState），不调用系统层。
 */
export function applyApprenticeEvent(
  event: string,
  runtimeState: SkillRuntimeState,
  enchantmentIds: string[],
): boolean {
  const targetEnch = APPRENTICE_EVENT_MAP[event]
  if (!targetEnch) return false

  const growth = APPRENTICE_GROWTH_DEFAULTS[targetEnch]
  if (growth == null) return false

  if (enchantmentIds.includes(targetEnch)) {
    runtimeState.apprenticeAccumulated += growth
    return true
  }
  return false
}

// ===== 任务附魔外部事件回调 =====

/** 任务附魔外部事件→附魔类型映射（可多对一） */
const QUEST_EXTERNAL_EVENT_MAP: Record<string, EnchantmentType[]> = {
  stageCleared: [EnchantmentType.QuestMirror],
  comboReach: [EnchantmentType.QuestPurify],
}

/**
 * 外部任务事件回调：系统层在对应事件发生时调用。
 * 遍历 enchantmentIds，匹配事件→questStacks++→满层 questCompletions++ 并重置。
 * 纯函数（仅修改传入的 runtimeState），不调用系统层。
 */
export function applyQuestEvent(
  event: string,
  runtimeState: SkillRuntimeState,
  enchantmentIds: string[],
): boolean {
  const targetEnchs = QUEST_EXTERNAL_EVENT_MAP[event]
  if (!targetEnchs) return false

  let applied = false
  for (const targetEnch of targetEnchs) {
    if (!enchantmentIds.includes(targetEnch)) continue
    const def = QUEST_ENCHANTMENT_DEFS.find(d => d.type === targetEnch)
    if (!def) continue

    runtimeState.questStacks++
    if (runtimeState.questStacks >= def.targetStacks) {
      runtimeState.questStacks = 0
      runtimeState.questCompletions++
    }
    applied = true
  }
  return applied
}

// ===== Gravity / Mirror 数据助手 =====

/**
 * 获取 Gravity 词条的有效 probMult（含 QuestPolarize 增强）。
 * 供词选系统在触发流水线外调用，data 层纯函数。
 * 注意：probMult=1.0（中性）时，quest 增强偏向引力方向（>=1 分支）。
 */
export function getEffectiveProbMult(
  affix: AffixInstance,
  runtimeState: SkillRuntimeState,
  skill: AffixSkillInstance,
): number {
  const baseProbMult = affix.probMult ?? 1
  const c = getQuestCompletions(skill, runtimeState, EnchantmentType.QuestPolarize)
  if (c === 0) return baseProbMult

  const delta = Math.abs(baseProbMult - 1)
  const enhancedDelta = delta + c * 0.15
  return baseProbMult >= 1 ? 1 + enhancedDelta : 1 - enhancedDelta
}

/**
 * Mirror 词条关卡初始化：从邻居复制一个词条（含 QuestMirror ×1.1^c 增强）。
 * 供系统层在关卡开始时调用，返回复制的 AffixInstance 或 null。
 * 注意：调用方须将 ctx.triggerKey 设为 Mirror 技能的绑定键位（非当前按键）。
 */
export function resolveMirrorCopy(
  skill: AffixSkillInstance,
  runtimeState: SkillRuntimeState,
  ctx: TriggerContext,
): AffixInstance | null {
  const mirrorAffix = skill.affixes.find(a => a.type === AffixType.Mirror)
  if (!mirrorAffix?.posRel) return null

  // 获取范围内有绑定技能的邻居键位
  const neighborKeys = getKeysWithRelation(ctx.triggerKey, mirrorAffix.posRel)
    .filter(k => ctx.bindings.has(k) && k !== ctx.triggerKey)

  if (neighborKeys.length === 0) return null

  // 随机选一个邻居
  const neighborKey = neighborKeys[Math.floor(ctx.randomFn() * neighborKeys.length)]
  const neighborSkillId = ctx.bindings.get(neighborKey)
  if (!neighborSkillId) return null

  const neighborSkill = ctx.allSkills.get(neighborSkillId)
  if (!neighborSkill || neighborSkill.affixes.length === 0) return null

  // 随机选一个词条（排除 Mirror 和 Twin）
  const copyable = neighborSkill.affixes.filter(
    a => a.type !== AffixType.Mirror && a.type !== AffixType.Twin,
  )
  if (copyable.length === 0) return null

  const source = copyable[Math.floor(ctx.randomFn() * copyable.length)]
  const copied: AffixInstance = { ...source }

  // QuestMirror 增强：所有数值参数 ×1.1^c（设计文档："复制参数 ×1.1"）
  const c = getQuestCompletions(skill, runtimeState, EnchantmentType.QuestMirror)
  if (c > 0) {
    const boost = Math.pow(1.1, c)
    // 加算类参数：直接 ×boost
    if (copied.k != null) copied.k *= boost
    if (copied.bonusPercent != null) copied.bonusPercent *= boost
    if (copied.bonusPerSlot != null) copied.bonusPerSlot *= boost
    if (copied.valuePerStack != null) copied.valuePerStack *= boost
    if (copied.maxBonus != null) copied.maxBonus *= boost
    if (copied.recurseChance != null) copied.recurseChance *= boost
    if (copied.efficiency != null) copied.efficiency *= boost
    if (copied.chance != null) copied.chance *= boost
    if (copied.gainPerSec != null) copied.gainPerSec *= boost
    if (copied.floor != null) copied.floor *= boost
    if (copied.penaltyChance != null) copied.penaltyChance *= boost
    if (copied.decayPerTrigger != null) copied.decayPerTrigger *= boost
    if (copied.probMult != null) copied.probMult *= boost
    if (copied.interval != null) copied.interval *= boost
    // 乘算类参数：boost 作用于 (m-1) 增量
    if (copied.multiplier != null) copied.multiplier = 1 + (copied.multiplier - 1) * boost
    if (copied.critMult != null) copied.critMult = 1 + (copied.critMult - 1) * boost
    if (copied.burstMult != null) copied.burstMult = 1 + (copied.burstMult - 1) * boost
    if (copied.cascadeMult != null) copied.cascadeMult = 1 + (copied.cascadeMult - 1) * boost
    if (copied.initialMult != null) copied.initialMult = 1 + (copied.initialMult - 1) * boost
  }

  return copied
}

// ===== 任务附魔抽取过滤 + Twin =====

/**
 * 返回技能可抽取的任务附魔候选列表。
 * 仅返回技能拥有对应词条的任务，且排除已有的附魔。
 */
export function filterQuestCandidates(skill: AffixSkillInstance): EnchantmentType[] {
  const skillAffixTypes = new Set(skill.affixes.map(a => a.type))
  const existingEnchs = new Set(skill.enchantmentIds)

  return (Object.entries(QUEST_AFFIX_MAP) as [EnchantmentType, AffixType | AffixType[]][])
    .filter(([enchType, targetAffix]) => {
      if (existingEnchs.has(enchType)) return false
      if (Array.isArray(targetAffix)) {
        return targetAffix.some(t => skillAffixTypes.has(t))
      }
      return skillAffixTypes.has(targetAffix)
    })
    .map(([enchType]) => enchType)
}

/**
 * 返回技能的附魔槽位数量。Twin 词条使附魔数量翻倍（1→2）。
 */
export function getEnchantmentSlotCount(skill: AffixSkillInstance): number {
  return skill.affixes.some(a => a.type === AffixType.Twin) ? 2 : 1
}

// ===== 生命周期钩子 (Story 35.8) =====

/**
 * 每词初始化：重置所有技能的 Decay 词条 currentDecayMult 为该词条的 initialMult。
 * 纯函数——直接修改传入的 skillStates。
 */
export function resetDecayForWord(
  skills: Map<string, AffixSkillInstance>,
  skillStates: Map<string, SkillRuntimeState>,
): void {
  for (const [skillId, skill] of skills) {
    const state = skillStates.get(skillId)
    if (!state) continue
    for (const affix of skill.affixes) {
      if (affix.type === AffixType.Decay) {
        state.currentDecayMult = affix.initialMult ?? 1
      }
    }
  }
}

/**
 * 每关初始化：重置所有技能的 triggerCount/amplifyStacks，刷新 Mirror 词条。
 * 纯函数——直接修改传入的 skillStates。
 * Mirror 刷新通过 resolveMirrorCopy 实现，需要构造最小 TriggerContext。
 */
export function resetStageState(
  skills: Map<string, AffixSkillInstance>,
  skillStates: Map<string, SkillRuntimeState>,
  bindings: Map<string, string>,
  randomFn: () => number,
): void {
  for (const [skillId, state] of skillStates) {
    state.triggerCount = 0
    state.amplifyStacks = 0
    state.chargeAccumulated = 0

    // Mirror 词条刷新
    const skill = skills.get(skillId)
    if (!skill) continue
    const hasMirror = skill.affixes.some(a => a.type === AffixType.Mirror)
    if (hasMirror) {
      // 找到该技能绑定的键位
      let boundKey: string | undefined
      for (const [key, sid] of bindings) {
        if (sid === skillId) { boundKey = key; break }
      }
      if (boundKey) {
        // 构造最小 TriggerContext 供 resolveMirrorCopy 使用
        const mirrorCtx: TriggerContext = {
          triggerKey: boundKey,
          currentWord: '',
          resources: { base: 0, score: 0, multiplier: 1, time: 0, gold: 0, fragment: 0, mutagen: 0 },
          classResourceProduced: {},
          bindings,
          skillStates,
          allSkills: skills,
          randomFn,
        }
        state.mirrorCopiedAffix = resolveMirrorCopy(skill, state, mirrorCtx)
      }
    }
  }
}

/**
 * Run 结束重置：清零所有技能的跨关累积状态。
 * 纯函数——直接修改传入的 skillStates。
 */
export function resetRunState(
  skillStates: Map<string, SkillRuntimeState>,
): void {
  for (const [, state] of skillStates) {
    state.apprenticeAccumulated = 0
    state.questCompletions = 0
    state.questStacks = 0
  }
}

// ===== 序列化 (Story 35.8) =====

/**
 * 序列化技能为存档格式。纯函数。
 */
export function serializeSkill(
  skill: AffixSkillInstance,
  runtimeState: SkillRuntimeState,
): AffixSkillSaveData {
  return {
    id: skill.id,
    resource: skill.resource,
    level: skill.level,
    rarity: skill.rarity,
    affixes: skill.affixes.map(a => ({ ...a })),
    enchantmentIds: [...skill.enchantmentIds],
    runtime: { ...runtimeState, mirrorCopiedAffix: runtimeState.mirrorCopiedAffix ? { ...runtimeState.mirrorCopiedAffix } : null },
  }
}

/**
 * 反序列化存档数据为技能实例 + 运行时状态。纯函数。
 */
export function deserializeSkill(
  data: AffixSkillSaveData,
): { skill: AffixSkillInstance, runtimeState: SkillRuntimeState } {
  const skill: AffixSkillInstance = {
    id: data.id,
    name: data.id, // TODO(35-9): 由 shop-integration 根据生成规则恢复显示名
    icon: '',      // TODO(35-9): 由 shop-integration 根据生成规则恢复图标
    resource: data.resource,
    baseValues: BASE_VALUES[data.resource] ?? [0, 0, 0],
    level: data.level,
    rarity: data.rarity,
    affixes: data.affixes.map(a => ({ ...a })),
    enchantmentIds: [...data.enchantmentIds],
  }
  const runtimeState: SkillRuntimeState = {
    skillId: data.id,
    chargeAccumulated: data.runtime.chargeAccumulated ?? 0,
    currentDecayMult: data.runtime.currentDecayMult ?? 1,
    mirrorCopiedAffix: data.runtime.mirrorCopiedAffix ? { ...data.runtime.mirrorCopiedAffix } : null,
    triggerCount: data.runtime.triggerCount ?? 0,
    amplifyStacks: data.runtime.amplifyStacks ?? 0,
    apprenticeAccumulated: data.runtime.apprenticeAccumulated ?? 0,
    questStacks: data.runtime.questStacks ?? 0,
    questCompletions: data.runtime.questCompletions ?? 0,
  }
  return { skill, runtimeState }
}

/**
 * 旧存档迁移：过滤已删除的旧系统技能 + 补全缺失的 affixes 字段。纯函数。
 */
export function migrateLoadedSkills(
  loadedSkills: any[],
): AffixSkillSaveData[] {
  return loadedSkills
    .filter((s: any) => !isOldSystemSkill(s.id))
    .map((s: any) => {
      const patched = { ...s }
      if (patched.affixes === undefined || patched.affixes === null) {
        patched.affixes = []
        patched.rarity = 0
      }
      if (patched.runtime === undefined || patched.runtime === null) {
        patched.runtime = {
          skillId: patched.id,
          chargeAccumulated: 0,
          currentDecayMult: 1,
          mirrorCopiedAffix: null,
          triggerCount: 0,
          amplifyStacks: 0,
          apprenticeAccumulated: 0,
          questStacks: 0,
          questCompletions: 0,
        }
      }
      return patched
    })
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
