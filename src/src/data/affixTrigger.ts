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
  TRANSMUTE_RATIO_TABLE, MULTIPLY_OPERATOR_BASE_VALUES, BASE_VALUES, CRIT_MULTIPLIER, FATE_COIN_CRIT_CAP, FATE_COIN_CONVERSION,
  isOldSystemSkill, applyAffixLevelScaling, getQuestEquipTarget, AFFIX_CATEGORY_MAP, AFFIX_LEVEL_SCALING, AFFIX_CLASS_RESTRICTION, AFFIX_WEIGHTS,
} from './affixes'
import { hasRelation, getKeysWithRelation, PositionRelation } from './keyboardTopology'
import { rollAffixParams } from './skillGeneration'

function roundTo(n: number, d: number): number { const f = 10 ** d; return Math.round(n * f) / f }

// ===== Conduit 模式共享匹配 =====

/**
 * 判断两个技能是否共享资源或词条类型（Conduit 匹配模式）。
 * 条件：同资源 OR skillB 拥有 excludeType 以外的词条类型且 skillA 也拥有该类型。
 */
export function hasSharedMatch(
  skillA: AffixSkillInstance,
  skillB: AffixSkillInstance,
  excludeType: AffixType,
): boolean {
  if (skillA.resource === skillB.resource) return true
  const otherTypes = skillB.affixes.filter(a => a.type !== excludeType).map(a => a.type)
  return skillA.affixes.some(a => otherTypes.includes(a.type))
}

// ===== Story 40.8: 多格技能扩展邻居计算 =====

/**
 * 获取多格技能占据键位的所有邻居（并集），排除自身占据的键位。
 * 单格技能等价于 getKeysWithRelation(triggerKey, posRel)。
 */
export function getExtendedNeighbors(
  occupiedKeys: string[],
  posRel: PositionRelation,
): string[] {
  if (!posRel) return []
  const occupied = new Set(occupiedKeys)
  const neighbors = new Set<string>()
  for (const key of occupiedKeys) {
    for (const n of getKeysWithRelation(key, posRel)) {
      if (!occupied.has(n)) neighbors.add(n)
    }
  }
  return Array.from(neighbors)
}

/** 判断词条类型是否属于叠层类 */
function isStackingAffixType(type: AffixType): boolean {
  return AFFIX_CATEGORY_MAP[type].includes('stack')
}

/** 判断技能是否为叠层类（含 Pulse 质变转化） */
export function isStackingSkill(skill: AffixSkillInstance, skillStates: Map<string, SkillRuntimeState>): boolean {
  return skill.affixes.some(a => isStackingAffixType(a.type))
}

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
  /** 衍生附魔目标资源 */
  transmuteResource?: ResourceType
  /** @deprecated 使用 TRANSMUTE_RATIO_TABLE[resource] 替代 */
  transmuteRatio?: number
  /** @deprecated 不再使用——ApprenticeNeighbor 改用 skill.neighborPosRel */
  skillEnchantmentParams?: Map<string, { posRel?: PositionRelation }>
  // ── 遗物注入（由 skills.ts 提供，避免 data→systems 依赖）(Story 35.12) ──
  /** resolveRelicSkillTrigger() 结果乘数 */
  relicMultiplier?: number
  /** chain_ban 生效时为 true：跳过连接/复制/共鸣词条 Phase 5-6 */
  chainAffixesDisabled?: boolean
  // ── 附魔遗物注入（Story 36.5，避免 data→systems 依赖） ──
  /** 学徒之袍：学徒成长乘数（默认 1） */
  apprenticeGrowthMultiplier?: number
  /** 试炼徽章：试炼堆叠增量（默认 1） */
  questStackIncrement?: number
  // ── Story 40.8: 多格技能占据键位 ──
  /** 触发技能占据的所有键位（单格 = [triggerKey]） */
  occupiedKeys: string[]
  // ── Story 41.3: Ligature 质变关卡累计按键计数 ──
  /** 关卡内每个键被按下的累计次数（质变 Ligature 使用） */
  ligatureStageCounts?: Map<string, number>
  // ── 暴击子系统 ──
  /** 基础暴击率（默认 0，遗物可注入） */
  baseCritRate?: number
  /** 命运硬币激活（覆盖暴击判定） */
  fateCoinActive?: boolean
  /** 递归暴击率覆盖（由调度器传入，每次暴击重触发减半） */
  recurseCritOverride?: number
  // ── Story 45: 累积产出追踪 ──
  /** 本关各资源累积产出量（备用） */
  stageProduced?: Partial<Record<ResourceType, number>>
  /** 本词 base 累积产出（synergy.skillBaseScore，每词重置） */
  wordBaseScore?: number
  // ── 叠层子系统遗物 ──
  /** 层层递进：每技能间隔减少量 */
  stackMomentumReduction?: Map<string, number>
  /** 永动引擎：间隔倍数（默认 1） */
  perpetualIntervalMult?: number
  /** 暴击溢层：暴击时额外叠层数（默认 0） */
  critOverflowStacks?: number
  /** 浪涌激活 */
  surgeActive?: boolean
  /** 浪涌当前加成%（编排器运行时更新） */
  surgeBonus?: number
  /** 过载电路激活 */
  overloadCircuitActive?: boolean
  /** 邻里守望激活 */
  neighborWatchActive?: boolean
  /** 铭文涌流成长加成 */
  inscriptionFlowGrowth?: number
}

// ===== 全场质变检查 =====

/**
 * 检查某词条类型是否已被全场任意技能质变。
 * 遍历所有技能：找到任一已完成质变且任务附魔目标含指定词条类型的技能即返回 true。
 * 质变效果全场共享：只要有一个技能完成了针对该词条类型的任务，所有带此词条的技能都受益。
 */
export function isAffixGloballyTransformed(
  affixType: AffixType,
  allSkills: Map<string, AffixSkillInstance>,
  skillStates: Map<string, SkillRuntimeState>,
): boolean {
  for (const [skillId, skill] of allSkills) {
    const rt = skillStates.get(skillId)
    if (!rt?.questTransformed) continue
    if (_skillMatchesTransform(skill, affixType)) return true
  }
  return false
}

/** 内部：检查单个已质变技能是否匹配指定词条类型 */
function _skillMatchesTransform(skill: AffixSkillInstance, affixType: AffixType): boolean {
  // 精确匹配：通过任务附魔映射表判断
  let hasQuestEnch = false
  for (const enchId of skill.enchantmentIds) {
    // MultiplyOperator 是被动附魔但等效于 Multiply 质变
    if (enchId === EnchantmentType.MultiplyOperator && affixType === AffixType.Multiply) return true
    const mapping = QUEST_AFFIX_MAP[enchId as EnchantmentType]
    if (!mapping) continue
    hasQuestEnch = true
    if (Array.isArray(mapping)) {
      if (mapping.includes(affixType)) return true
    } else if (mapping === affixType) {
      return true
    }
  }
  // 回退：无任务附魔但拥有该词条 → 视为已质变
  if (!hasQuestEnch && skill.affixes.some(a => a.type === affixType)) return true
  return false
}

/**
 * 流水线内用：先检查当前技能自身质变，再全场扫描。
 * 保证单技能单元测试（ctx.allSkills 为空）也能正确判断。
 */
function isTransformedForAffix(
  affixType: AffixType,
  runtimeState: SkillRuntimeState,
  skill: AffixSkillInstance,
  ctx: TriggerContext,
): boolean {
  // 快速路径：当前技能自身已质变且匹配
  if (runtimeState.questTransformed && _skillMatchesTransform(skill, affixType)) return true
  // 全场扫描
  return isAffixGloballyTransformed(affixType, ctx.allSkills, ctx.skillStates)
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
  /** 衰减到达 floor（QuestPurify 叠层条件） */
  isDecayFloor: boolean
  ligatureCount: number
  tabooConvertResource: import('../core/types').ResourceType | null
  /** 暴击子系统：Crit 词条已质变（Phase 5 crit echo 使用） */
  critTransformed: boolean
  /** 递归+回声暴击率贡献（Phase 5 暴击重触发减半用） */
  recurseCritContribution: number
  /** 叠层效果是否触发（供遗物钩子使用） */
  stackEffectFired: boolean
}

// ===== Phase 4-6 返回类型 =====

export interface Phase4Result {
  targetResource: ResourceType
  output: number
  /** 质变Rainbow：同时产出所有资源（按比例缩放） */
  allResources?: boolean
  /** Rainbow 按比例缩放用：技能本资源基础值 */
  rainbowSkillBase?: number
  /** Rainbow 按比例缩放用：技能等级 */
  rainbowSkillLevel?: number
}

export interface Phase5Result {
  /** 递归词条重触发指令 */
  recurse: { shouldRecurse: boolean, newChance: number }
  /** 衍生附魔额外资源产出（异资源时） */
  transmuteOutput: { resource: ResourceType, amount: number } | null
  /** 衍生附魔同资源增强比率（同资源时，系统层应用 output × (1 + boost)）— 由 35-9 shop-integration 消费 */
  transmuteSameResourceBoost: number
  /** 溅射词条需触发的邻居键位 */
  /** 质变后溅射：被溅射目标也向自己的邻居溅射一次 */
  /** 吞噬目标键位（QuestDevour 满层时） */
  devourTarget: string | null
  /** 是否完成一次任务循环 */
  questCompleted: boolean
  /** 质变Outcast首尾呼应：对端技能触发键位 */
  outcastEchoTarget: string | null
  /** 暴击质变回响：暴击时触发随机无Crit技能的键位 */
  critEchoTarget?: string
  /** 脉冲：爆发时立刻自触发一次 */
  /** Cluster 满层：触发元音键位技能 */
  /** Outcast 满层：触发词另一端字母键技能 */
  outcastTarget?: string
  /** Component 满层：触发链最远端技能 */
  /** Component 质变满层：触发链上所有技能 */
  /** Turbulence 满层：触发最弱邻居技能 */
  /** Turbulence 质变满层：触发所有邻居技能 */
  /** 脉冲质变：爆发时触发的匹配技能键位（进入伪循环） */
  /** 脉冲：爆发时触发范围内叠层类邻居技能 */
  /** 增幅质变：层数增加时触发的匹配技能键位 */
  amplifyTriggerTargets?: string[]
  /** 溅射：触发叠层数个匹配技能键位 */
  splashTargets?: string[]
}

export type Phase6Action =
  | { type: 'resonance', neighborKey: string, triggerCount: number }
  | { type: 'conduit', targetKey: string, conduitCount: number }
  | { type: 'relay', targetKey: string }
  | { type: 'apprentice_neighbor', neighborKey: string, growthDelta: number }

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
  /** 是否乘算化附魔（resource *= amount 而非 resource += amount） */
  isMultiplyOp: boolean
  /** 连字倍数（0=无连字） */
  ligatureCount: number
  /** 需要应用的状态变更列表 */
  stateMutations: StateMutation[]
  /** 质变Convert双向转化：反向产出 */
  convertReverseOutputs?: { resource: ResourceType, amount: number }[]
  /** Phase 4 结果 */
  phase4?: Phase4Result
  /** Phase 5 结果 */
  phase5?: Phase5Result
  /** Phase 6 结果 */
  phase6?: Phase6Result
  /** 本次触发的键位（链式飞行定位用） */
  triggerKey: string
  /** Story 41-5: Charge 质变 — 满蓄力释放自动完成当前单词 */
  chargeAutoComplete?: boolean
  /** 叠层效果是否触发（遗物钩子用） */
  stackEffectFired?: boolean
  /** 当前叠层数（叠层类技能浮字反馈用） */
  currentStacks?: number
  /** Story 45.5: 延迟消耗请求列表 */
  consumeRequests?: { resource: ResourceType, amount: number }[]
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

/** 统计 posRel 范围内空位数（支持多格技能：传入 occupiedKeys 计算扩展邻居范围） */
export function countEmptySlots(
  keyOrKeys: string | string[],
  posRel: PositionRelation,
  bindings: Map<string, string>,
): number {
  const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys]
  const related = getExtendedNeighbors(keys, posRel)
  return related.filter(k => !bindings.has(k)).length
}

/** 获取 posRel 范围内的邻居技能实例（去重，排除自身） */
export function getNeighborSkills(
  occupiedKeys: string[],
  posRel: PositionRelation,
  ctx: { bindings: Map<string, string>; allSkills: Map<string, AffixSkillInstance> },
): AffixSkillInstance[] {
  const neighbors = getExtendedNeighbors(occupiedKeys, posRel)
  const occupiedSet = new Set(occupiedKeys)
  const counted = new Set<string>()
  const result: AffixSkillInstance[] = []
  for (const nk of neighbors) {
    if (occupiedSet.has(nk)) continue
    const nSkillId = ctx.bindings.get(nk)
    if (!nSkillId || counted.has(nSkillId)) continue
    counted.add(nSkillId)
    const nSkill = ctx.allSkills?.get(nSkillId)
    if (nSkill) result.push(nSkill)
  }
  return result
}

/** Story 45.9: 运行时移除技能的指定类型词条 */
export function removeAffixAtRuntime(skill: AffixSkillInstance, affixType: AffixType): boolean {
  const idx = skill.affixes.findIndex(a => a.type === affixType)
  if (idx >= 0) {
    skill.affixes.splice(idx, 1)
    return true
  }
  return false
}

/** 流放判定：键是否为单词首字母或尾字母 */
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u'])
/** 判断字母是否为辅音（非元音字母） */
export function isConsonant(ch: string): boolean {
  const lower = ch.toLowerCase()
  return lower >= 'a' && lower <= 'z' && !VOWELS.has(lower)
}

export function isFirstOrLastLetter(key: string, word: string): boolean {
  if (!key || !word || word.length === 0) return false
  const k = key.toLowerCase()
  const w = word.toLowerCase()
  return w[0] === k || w[w.length - 1] === k
}

/** 连字：统计字母在单词中出现的次数 */
export function countOccurrences(key: string, word: string): number {
  if (!key || !word) return 0
  const k = key.toLowerCase()
  const w = word.toLowerCase()
  let count = 0
  for (const ch of w) {
    if (ch === k) count++
  }
  return count
}

/**
 * 被触发技能视角：扫描范围内增幅技能，累加其基础产出值作为加成。
 * 每个增幅技能提供其 baseValues[level-1] 的绝对值加成。
 * 匹配条件：增幅技能的 posRel 范围覆盖被触发技能 AND 匹配（同资源 OR 共享词条类型）。
 */
export function sumNeighborAmplifyBaseBonus(
  triggeredSkill: AffixSkillInstance,
  occupiedKeys: string[],
  ctx: TriggerContext,
): number {
  const occupiedSet = new Set(occupiedKeys)
  let bonus = 0
  const counted = new Set<string>()

  for (const [nk, nSkillId] of ctx.bindings) {
    if (occupiedSet.has(nk)) continue // 跳过自身键位
    if (counted.has(nSkillId)) continue
    counted.add(nSkillId)
    const nSkill = ctx.allSkills.get(nSkillId)
    if (!nSkill) continue

    // 邻居必须有 Amplify 词条
    for (const affix of nSkill.affixes) {
      if (affix.type !== AffixType.Amplify || affix.posRel == null) continue
      // 范围检查：增幅技能的 posRel 覆盖被触发技能任意键位
      const ampKeys = [...ctx.bindings].filter(([, sid]) => sid === nSkillId).map(([k]) => k)
      const inRange = occupiedKeys.some(ok =>
        ampKeys.some(ak => hasRelation(ak, ok, affix.posRel!))
      )
      if (!inRange) continue
      // 匹配条件：同资源 OR 共享任意词条类型（排除 Amplify 自身）
      if (hasSharedMatch(triggeredSkill, nSkill, AffixType.Amplify)) {
        // 加成 = 增幅技能的 baseValues[level-1]
        const lvIdx = Math.max(0, Math.min(nSkill.level - 1, nSkill.baseValues.length - 1))
        bonus += nSkill.baseValues[lvIdx]
      }
      break // 同一技能只计一次
    }
  }
  return bonus
}

/**
 * 被触发技能视角：扫描范围内战鼓技能，累加 stacks × critPerStack 作为暴击率加成。
 */
export function sumNeighborWarDrumCrit(
  triggeredSkill: AffixSkillInstance,
  occupiedKeys: string[],
  ctx: TriggerContext,
): number {
  const occupiedSet = new Set(occupiedKeys)
  let critBonus = 0
  const counted = new Set<string>()

  for (const [nk, nSkillId] of ctx.bindings) {
    if (occupiedSet.has(nk)) continue
    if (counted.has(nSkillId)) continue
    counted.add(nSkillId)
    const nSkill = ctx.allSkills.get(nSkillId)
    if (!nSkill) continue
    const nState = ctx.skillStates.get(nSkillId)
    if (!nState || nState.stacks <= 0) continue

    for (const affix of nSkill.affixes) {
      if (affix.type !== AffixType.WarDrum || affix.posRel == null) continue
      const ampKeys = [...ctx.bindings].filter(([, sid]) => sid === nSkillId).map(([k]) => k)
      const inRange = occupiedKeys.some(ok =>
        ampKeys.some(ak => hasRelation(ak, ok, affix.posRel!))
      )
      if (!inRange) continue
      if (hasSharedMatch(triggeredSkill, nSkill, AffixType.WarDrum)) {
        critBonus += nState.stacks * (affix.critPerStack ?? 0)
      }
      break
    }
  }
  return critBonus
}

// ===== Phase 1: 基础值 =====

/** Phase 1: 返回基础值 baseValues[level-1] */
export function resolvePhase1(skill: AffixSkillInstance): number {
  const idx = Math.max(0, Math.min(skill.level - 1, skill.baseValues.length - 1))
  return skill.baseValues[idx]
}

// ===== getAffixSourceValue =====

/**
 * 读取转化词条的源资源当前值（读池子存量，非产出量）。
 */
export function getAffixSourceValue(source: ResourceType, ctx: TriggerContext): number {
  return ctx.resources[source] ?? 0
}



// ===== Phase 2: 加算层 =====

export interface Phase2Result {
  output: number
  bonusPercent: number
  mutations: StateMutation[]
  /** 质变Convert双向转化：反向产出到source资源 */
  convertReverseOutputs: { resource: ResourceType, amount: number }[]
  /** Story 41-5: Charge 质变 — 满蓄力释放自动完成当前单词 */
  chargeAutoComplete: boolean
  /** Story 45.5: 延迟消耗请求，Phase 4 后统一执行 */
  consumeRequests: { resource: ResourceType, amount: number }[]
  /** MonkeyPatch: 被 patch 的词条索引和倍率（供 Phase 3 暴击调整用） */
  patchTarget: number
  patchMultiplier: number
}

/**
 * Phase 2: 加算层 — 所有加算增益汇总为 bonusPercent，最后 output × (1 + bonusPercent)。
 * 乘算化附魔（MultiplyOperator）时，基础值替换为乘数基底，但加算逻辑与普通模式一致。
 * 蓄力清零作为必要副作用直接写入 runtimeState。
 */
export function resolvePhase2(
  skill: AffixSkillInstance,
  runtimeState: SkillRuntimeState,
  ctx: TriggerContext,
  baseOutput: number,
): Phase2Result {
  const hasMultOp = (skill.enchantmentIds.includes(EnchantmentType.MultiplyOperator) || skill.enchantmentIds.includes(EnchantmentType.QuestMultiplyOp)) && isTransformedForAffix(AffixType.Multiply, runtimeState, skill, ctx)
  // 乘算化（质变后）：基础值替换为乘数基底
  let effectiveBase = hasMultOp
    ? (MULTIPLY_OPERATOR_BASE_VALUES[skill.resource]?.[skill.level - 1] ?? baseOutput)
    : baseOutput

  // Story 45.9: Exhaust base 倍率（Phase 1 后立即应用）
  for (const affix of skill.affixes) {
    if (affix.type === AffixType.Exhaust && (affix.exhaustMult ?? 0) > 1) {
      effectiveBase *= affix.exhaustMult!
      // 质变·燃尽：最后一次触发 ×3
      const isLastExhaust = (runtimeState.exhaustCount + 1) >= (affix.maxTriggers ?? Infinity)
      if (isLastExhaust && isTransformedForAffix(AffixType.Exhaust, runtimeState, skill, ctx)) {
        effectiveBase *= 3
      }
    }
  }

  let bonusPercent = 0
  // 质变·反噬：消费上次 Counter 吸收的负值
  let flatBonus = 0 // 增幅词条：绝对值加成
  let chargeAutoComplete = false
  const mutations: StateMutation[] = []
  const convertReverseOutputs: { resource: ResourceType, amount: number }[] = []
  const consumeRequests: { resource: ResourceType, amount: number }[] = []

  // ── 词条加算 ──
  for (let _affixIdx = 0; _affixIdx < skill.affixes.length; _affixIdx++) {
    const affix = skill.affixes[_affixIdx]
    if (affix.spent) continue // 耗尽的词条跳过
    // MonkeyPatch: 记录 patch 前的值，用于计算 delta
    const _prePatchBonus = bonusPercent
    const _prePatchStacks = runtimeState.stacks
    switch (affix.type) {
      case AffixType.Convert: {
        if (affix.source == null) break
        const kEff = affix.k ?? 0
        // 按 BASE_VALUES 比例归一化源资源值（与 Rainbow 同理）
        const cvtLvIdx = Math.max(0, Math.min(skill.level - 1, 2))
        const cvtSkillBase = BASE_VALUES[skill.resource]?.[cvtLvIdx] ?? 1
        const cvtSourceBase = BASE_VALUES[affix.source]?.[cvtLvIdx] ?? 1
        bonusPercent += kEff * getAffixSourceValue(affix.source, ctx) * (cvtSkillBase / cvtSourceBase)
        // 质变：双向转化 — 反向产出按比例缩放到源资源
        if (isTransformedForAffix(AffixType.Convert, runtimeState, skill, ctx)) {
          const reverseBonus = kEff * getAffixSourceValue(skill.resource, ctx)
          if (reverseBonus > 0) {
            convertReverseOutputs.push({
              resource: affix.source,
              amount: reverseBonus * effectiveBase * (cvtSourceBase / cvtSkillBase),
            })
          }
        }
        break
      }

      case AffixType.Void: {
        if (affix.posRel == null) break
        const slotEff = affix.bonusPerSlot ?? 0
        const empty = countEmptySlots(ctx.occupiedKeys, affix.posRel, ctx.bindings)
        bonusPercent += empty * slotEff
        break
      }

      case AffixType.Flow: {
        // 落差：每个同资源且产出更高的邻居，加成 flowK
        if (affix.posRel == null) break
        const selfLvl = Math.max(0, Math.min(skill.level - 1, 2))
        const selfBase = skill.baseValues[selfLvl] ?? BASE_VALUES[skill.resource]?.[selfLvl] ?? 1
        const flowTransformed = isTransformedForAffix(AffixType.Flow, runtimeState, skill, ctx)
        for (const ns of getNeighborSkills(ctx.occupiedKeys, affix.posRel, ctx)) {
          if (ns.resource !== skill.resource) continue
          const nLvl = Math.max(0, Math.min(ns.level - 1, 2))
          const nBase = ns.baseValues[nLvl] ?? BASE_VALUES[ns.resource]?.[nLvl] ?? 1
          // 质变·瀑布：双向（邻居更低也算）
          if (nBase > selfBase || flowTransformed) {
            bonusPercent += affix.flowK ?? 0
          }
        }
        break
      }

      case AffixType.Confluence: {
        // 汇流：邻居资源类型种类数越多，加成越高（边际递减）
        if (affix.posRel == null) break
        const resTypes = new Set<string>()
        for (const ns of getNeighborSkills(ctx.occupiedKeys, affix.posRel, ctx)) {
          resTypes.add(ns.resource)
        }
        if (resTypes.size > 0) {
          bonusPercent += (affix.confluenceK ?? 0) * (1 - 1 / (resTypes.size + 1))
          // 质变·洪流：每种独特资源额外产出到该资源
          if (isTransformedForAffix(AffixType.Confluence, runtimeState, skill, ctx)) {
            const confExtra = effectiveBase * 0.01 * resTypes.size
            for (const r of resTypes) {
              if (r !== skill.resource) convertReverseOutputs.push({ resource: r as ResourceType, amount: confExtra })
            }
          }
        }
        break
      }

      case AffixType.Union: {
        // 联合：范围内匹配技能越多，加成越高
        if (affix.posRel == null) break
        let matchCount = 0
        for (const ns of getNeighborSkills(ctx.occupiedKeys, affix.posRel, ctx)) {
          if (hasSharedMatch(skill, ns, AffixType.Union)) matchCount++
        }
        if (matchCount > 0) {
          bonusPercent += (affix.unionK ?? 0) * matchCount
        }
        break
      }

      case AffixType.Charge: {
        // 蓄力→产出倍率：accumulated 从 0 增长到 maxBonus，触发时乘以 1.0 + accumulated/maxBonus * (maxBonus - 1.0)
        const maxMult = affix.maxBonus ?? 2.5
        const ratio = maxMult > 0 ? Math.min(runtimeState.chargeAccumulated / maxMult, 1) : 0
        const chargeMult = 1.0 + ratio * (maxMult - 1.0)
        if (chargeMult > 1) {
          bonusPercent += chargeMult - 1  // 作为加算百分比
        }
        // 质变 — 满蓄力释放自动完成当前单词
        if (isTransformedForAffix(AffixType.Charge, runtimeState, skill, ctx) && ratio >= 1) {
          chargeAutoComplete = true
        }
        // 蓄力释放清零
        runtimeState.chargeAccumulated = 0
        break
      }

      case AffixType.Outcast: {
        // 首尾字母命中时叠层，满层触发词另一端字母键上的技能
        if (isFirstOrLastLetter(ctx.triggerKey, ctx.currentWord)) {
          runtimeState.stacks += 1
          const outcastInterval = getEffectiveInterval(affix.outcastInterval ?? 4, skill.id, ctx)
          if (runtimeState.stacks > 0 && runtimeState.stacks % outcastInterval === 0) {
            // 找另一端字母的键
            const word = (ctx.currentWord ?? '').toLowerCase()
            const first = word[0], last = word[word.length - 1]
            const otherEnd = ctx.triggerKey === first ? last : first
            if (otherEnd && ctx.bindings.has(otherEnd) && ctx.bindings.get(otherEnd) !== skill.id) {
              mutations.push({ type: 'outcastTarget' as any, value: otherEnd })
            }
          }
        }
        break
      }

      case AffixType.Amplify:
        // 增幅技能自身不产出（base=0），增幅效果在下方「被增幅」逻辑中施加给邻居
        break

      case AffixType.Taboo:
        // 禁忌并入暴击系统：暴击率贡献在 Phase 3 处理
        break

      case AffixType.Reflect: {
        const reflectScore = skill.affixes.length * skill.level
        bonusPercent += (affix.reflectK ?? 0) * reflectScore
        break
      }

      // 其余词条类型在 Phase 2 无加算效果
      default:
        break
    }
    // MonkeyPatch: 参数已在 resetStageState 中直接修改，无需运行时乘法
  }


  // ── 浪涌加成 ──
  if (ctx.surgeBonus && ctx.surgeBonus > 0 && effectiveBase > 0) {
    bonusPercent += ctx.surgeBonus
  }

  // ── 附魔加算 ──

  // 学徒系列：升华系统重设计 — apprenticeAccumulated 不再提供 bonusPercent 加成
  // 价值改为解锁升华能力 + EXP 积累（见 canAscend / executeAscend）

  // 附魔循环（预留）
  // 41-4: QuestDevour 额外数值加成已移除，质变行为在 Phase 5 实现

  // ── 被增幅：扫描范围内增幅技能，获得其基础产出值作为加成 ──
  if (effectiveBase > 0) {
    flatBonus += sumNeighborAmplifyBaseBonus(skill, ctx.occupiedKeys, ctx)
  }

  // 乘算化模式与普通模式统一：bonusPercent 加算后应用到 output + 增幅绝对值
  return {
    output: effectiveBase * (1 + bonusPercent) + flatBonus,
    bonusPercent,
    mutations,
    convertReverseOutputs,
    chargeAutoComplete,
    consumeRequests,
    patchTarget: runtimeState.patchTargetIndex ?? -1,
    patchMultiplier: runtimeState.patchMultiplier ?? 1.0,
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
    isDecayFloor: false,
    ligatureCount: 0,
    tabooConvertResource: null,
    critTransformed: false,
    recurseCritContribution: 0,
    stackEffectFired: false,
  }

  // 暴击子系统：累计暴击率（affix loop 内只累加，loop 后统一判定）
  let totalCritChance = 0
  let hasTaboo = false
  let recurseCritContribution = 0 // 递归暴击率贡献（暴击重触发时减半）
  // MonkeyPatch: 读取 patch 目标（Phase 2 已存入 runtimeState）
  const _critPatchIdx = runtimeState.patchTargetIndex ?? -1
  const _critPatchMult = runtimeState.patchMultiplier ?? 1.0

  for (let _critAffixIdx = 0; _critAffixIdx < skill.affixes.length; _critAffixIdx++) {
    const affix = skill.affixes[_critAffixIdx]
    if (affix.spent) continue // 耗尽的词条跳过
    const _preCritChance = totalCritChance
    switch (affix.type) {
      case AffixType.Crit: {
        totalCritChance += affix.chance ?? 0
        break
      }

      // Charge: 已移至 Phase 2（产出倍率）

      case AffixType.Decay: {
        // 衰减并入暴击：首次触发暴击率最高，逐次衰减至下限
        totalCritChance += runtimeState.currentDecayMult
        // 计算衰减后的新值
        if (isTransformedForAffix(AffixType.Decay, runtimeState, skill, ctx)) {
          // 质变后：衰减逆转为递增（无上限）
          runtimeState.currentDecayMult = runtimeState.currentDecayMult + (affix.decayPerTrigger ?? 0)
        } else {
          const floorEff = Math.max(0, affix.floor ?? 0.05)
          const newDecay = Math.max(floorEff, runtimeState.currentDecayMult - (affix.decayPerTrigger ?? 0))
          // 到达 floor 时标记（QuestPurify 叠层条件）
          if (newDecay <= floorEff) {
            flags.isDecayFloor = true
          }
          runtimeState.currentDecayMult = newDecay
        }
        break
      }

      case AffixType.Taboo: {
        // 禁忌并入暴击：大幅增加暴击率，若未暴击则产出负值
        totalCritChance += affix.bonusPercent ?? 0
        hasTaboo = true
        break
      }

      case AffixType.Recurse: {
        // 递归并入暴击：增加暴击率，暴击时额外触发一次（每次减半）
        const rc = ctx.recurseCritOverride ?? affix.recurseChance ?? 0
        recurseCritContribution = rc
        totalCritChance += rc
        break
      }

      case AffixType.Fallacy: {
        // 赌徒谬误：连续未暴击次数 × K → 暴击率加成
        if (affix.fallacyK == null) break
        totalCritChance += (affix.fallacyStacks ?? 0) * affix.fallacyK
        break
      }

      case AffixType.Ligature: {
        let nEff: number
        if (isTransformedForAffix(AffixType.Ligature, runtimeState, skill, ctx) && ctx.ligatureStageCounts) {
          // 质变后：使用关卡累计按键次数
          nEff = ctx.ligatureStageCounts.get(ctx.triggerKey) ?? 0
        } else {
          nEff = countOccurrences(ctx.triggerKey, ctx.currentWord)
        }
        if (nEff >= 2) {
          const ligMult = nEff * (affix.ligatureBonus ?? 1.0)
          output *= ligMult
          multipliers.push(ligMult)
          flags.ligatureCount = nEff
        }
        break
      }

      case AffixType.Multiply: {
        const m = affix.multiplyValue ?? 1
        output *= m
        multipliers.push(m)
        break
      }

      // 其余词条类型在 Phase 3 无乘算效果
      default:
        break
    }
    // MonkeyPatch: 参数已在 resetStageState 中直接修改，无需运行时乘法
  }

  // ── 暴击子系统：affix 循环后统一判定 ──
  {
    // 战鼓暴击率贡献（范围内战鼓技能 stacks × critPerStack）
    totalCritChance += sumNeighborWarDrumCrit(skill, ctx.occupiedKeys, ctx)
    const echoCrit = 0
    recurseCritContribution += echoCrit
    flags.recurseCritContribution = recurseCritContribution
    // Mutacrit 永久暴击率累积
    const mutacritAccum = runtimeState.mutacritAccum ?? 0
    const rawCritChance = (ctx.baseCritRate ?? 0) + totalCritChance + echoCrit + mutacritAccum

    // 命运硬币：超出 50% 的暴击率转化为暴击倍数加成
    let effectiveCritChance = rawCritChance
    let critMult = CRIT_MULTIPLIER
    // Crit 质变：暴击倍率翻倍
    const hasCritTransform = skill.affixes.some(a => a.type === AffixType.Crit)
      && isTransformedForAffix(AffixType.Crit, runtimeState, skill, ctx)
    if (hasCritTransform) critMult *= 2
    if (ctx.fateCoinActive && rawCritChance > FATE_COIN_CRIT_CAP) {
      const excess = rawCritChance - FATE_COIN_CRIT_CAP
      effectiveCritChance = FATE_COIN_CRIT_CAP
      critMult = critMult + excess * FATE_COIN_CONVERSION
    }


    if (effectiveCritChance > 0 && ctx.randomFn() < effectiveCritChance) {
      output *= critMult
      multipliers.push(critMult)
      flags.isCrit = true
      flags.critTransformed = hasCritTransform
      // 暴击溢层（遗物）：暴击时自身额外叠层
      runtimeState.stacks += (ctx.critOverflowStacks ?? 0)
      // Overflow 词条：暴击时范围内叠层类邻居 +N 层（质变后全部，否则随机1个）
      for (const a of skill.affixes) {
      }
    } else if (hasTaboo) {
      // 禁忌：未暴击时产出负值
      if (isAffixGloballyTransformed(AffixType.Taboo, ctx.allSkills, ctx.skillStates)) {
        // 质变后：惩罚转化为随机资源（不产生负值，排除职业限制资源）
        const otherResources = ALL_RESOURCES.filter(r => {
          if (r === skill.resource) return false
          if (r === 'energy' && (!ctx.playerClass || ctx.playerClass === 'metamorph')) return false
          if (r === 'mutagen' && (!ctx.playerClass || ctx.playerClass === 'wordsmith')) return false
          return true
        })
        flags.tabooConvertResource = otherResources[Math.floor(ctx.randomFn() * otherResources.length)]
      } else {
        output *= -1
        multipliers.push(-1)
      }
      flags.isTabooPenalty = true
    }

    // 赌徒谬误：暴击后归零（质变·豪赌：减半），未暴击后 stacks+1
    for (const affix of skill.affixes) {
      if (affix.type === AffixType.Fallacy) {
        if (flags.isCrit) {
          if (isTransformedForAffix(AffixType.Fallacy, runtimeState, skill, ctx)) {
            affix.fallacyStacks = Math.floor((affix.fallacyStacks ?? 0) / 2)
          } else {
            affix.fallacyStacks = 0
          }
        } else {
          affix.fallacyStacks = (affix.fallacyStacks ?? 0) + 1
        }
      }
    }
  }

  // 质变·蓄能：暴击时 missStreak 转为 stacks（在清零前读取）
  if (flags.isCrit && (runtimeState.missStreak ?? 0) > 0) {
    for (const a of skill.affixes) {
    }
  }

  // critStreak / missStreak 更新（暴击判定后）
  if (totalCritChance > 0) {
    if (flags.isCrit) {
      runtimeState.critStreak = (runtimeState.critStreak ?? 0) + 1
      runtimeState.missStreak = 0
    } else {
      runtimeState.missStreak = (runtimeState.missStreak ?? 0) + 1
      runtimeState.critStreak = 0
    }
  }

  return { output, multipliers, flags, mutations }
}

// ===== Phase 4-6 常量 =====

/** 叠层式词条默认间隔（每 N 层触发一次效果） */
export const DEFAULT_STACK_INTERVAL = 4

/** 计算有效叠层间隔（应用遗物修正） */
export function getEffectiveInterval(baseInterval: number, skillId: string, ctx: TriggerContext): number {
  let interval = baseInterval
  // 永动引擎：间隔 ×N
  interval *= (ctx.perpetualIntervalMult ?? 1)
  // 层层递进：间隔 -N
  interval -= (ctx.stackMomentumReduction?.get(skillId) ?? 0)
  return Math.max(1, Math.round(interval))
}

export const ALL_RESOURCES: ResourceType[] = ['base', 'score', 'multiplier', 'time', 'gold', 'energy', 'mutagen']
export const MAX_RECURSE_DEPTH = 10
export const MAX_CHAIN_DEPTH = 20

/** 学徒附魔 growthPerProc 默认值（Phase 5 自触发类型 + 外部事件类型）
 * ApprenticeSelf 已删除（观摩可覆盖自身）
 * ApprenticeRes* 已改为按产出量缩放，不再使用固定值
 * ApprenticeNeighbor 按 APPRENTICE_NEIGHBOR_GROWTH 查 posRel 表
 */
export const APPRENTICE_GROWTH_DEFAULTS: Partial<Record<EnchantmentType, number>> = {
  // 保留空表供旧代码兼容查询（返回 undefined → 走新逻辑）
}

/** 资源专精 EXP = (output / baseLv1Value) × rate × growthMultiplier */
export const APPRENTICE_RES_EXP_RATE = 0.01
/** 学徒·暴击：每次暴击的成长量 */
export const APPRENTICE_CRIT_GROWTH = 0.03

/** 资源专精附魔→目标资源映射 */
export const APPRENTICE_RESOURCE_MAP: Partial<Record<EnchantmentType, ResourceType>> = {
  [EnchantmentType.ApprenticeResBase]: 'base',
  [EnchantmentType.ApprenticeResScore]: 'score',
  [EnchantmentType.ApprenticeResMultiplier]: 'multiplier',
  [EnchantmentType.ApprenticeResTime]: 'time',
  [EnchantmentType.ApprenticeResGold]: 'gold',
}

/** 资源类型→资源专精附魔映射（APPRENTICE_RESOURCE_MAP 反向） */
export const RES_ENCHANTMENT_BY_RESOURCE: Partial<Record<ResourceType, EnchantmentType>> = {
  base: EnchantmentType.ApprenticeResBase,
  score: EnchantmentType.ApprenticeResScore,
  multiplier: EnchantmentType.ApprenticeResMultiplier,
  time: EnchantmentType.ApprenticeResTime,
  gold: EnchantmentType.ApprenticeResGold,
}

// 悟道·词条附魔已删除（ApprenticeProc + ApprenticeAffix* 全系移除）

// ===== Phase 4-6 辅助函数 =====

/** 根据职业过滤可用资源 */
export function getClassResources(playerClass?: string): ResourceType[] {
  const pool: ResourceType[] = ['base', 'score', 'multiplier', 'time', 'gold']
  if (playerClass === 'wordsmith') pool.push('energy')
  if (playerClass === 'metamorph') pool.push('mutagen')
  return pool
}

/** 随机资源选择（等概率，职业约束） */
export function weightedRandomResource(ctx: TriggerContext): ResourceType {
  const pool = getClassResources(ctx.playerClass)
  const idx = Math.floor(ctx.randomFn() * pool.length)
  return pool[Math.min(idx, pool.length - 1)]
}

/** 找 posRel 范围内产出最低的邻居键位（支持多格扩展邻居） */
export function findWeakestNeighbor(
  occupiedKeys: string[],
  posRel: PositionRelation,
  ctx: TriggerContext,
): string | null {
  const neighbors = getExtendedNeighbors(occupiedKeys, posRel)
  let weakestKey: string | null = null
  let weakestLevel = Infinity
  let weakestBase = Infinity

  for (const nk of neighbors) {
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
    case 'affixProc:splash': return false
    case 'affixProc:taboo_penalty': return triggerFlags.isTabooPenalty
    case 'decayFloor': return triggerFlags.isDecayFloor
    case 'rangeFull': {
      const voidAffix = skill.affixes.find(a => a.type === AffixType.Void)
      return voidAffix?.posRel != null && countEmptySlots(ctx.occupiedKeys, voidAffix.posRel, ctx.bindings) === 0
    }
    // ── equip_count：装备数量型任务，由 evaluateEquipQuests 统一处理，Phase 5 不叠层 ──
    case 'equip_count': return false
    // ── neighborTrigger 在 Phase 6 独立处理，Phase 5 不重复叠层 ──
    case 'neighborTrigger': return false
    // ── 外部事件（wordComplete, gravityWordMatch, multiResourceWord, stageCleared）
    //    由调用方通过 applyQuestEvent 处理，Phase 5 不重复叠层 ──
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
  // 质变·编码：模式签名决定产出资源
  const hasRainbow = skill.affixes.some(a => a.type === AffixType.Rainbow)

  if (!hasRainbow) {
    return { targetResource: skill.resource, output }
  }

  // 质变：同时产出所有资源（按比例缩放）
  if (isTransformedForAffix(AffixType.Rainbow, runtimeState, skill, ctx)) {
    const skillBase = BASE_VALUES[skill.resource]?.[skill.level - 1] ?? 1
    return { targetResource: skill.resource, output, allResources: true, rainbowSkillBase: skillBase, rainbowSkillLevel: skill.level }
  }

  const targetResource = weightedRandomResource(ctx)
  // 按目标资源与技能本资源的基础值比例缩放产出
  const skillBase = BASE_VALUES[skill.resource]?.[skill.level - 1] ?? 1
  const targetBase = BASE_VALUES[targetResource]?.[skill.level - 1] ?? 1
  const scaledOutput = skillBase > 0 ? output * (targetBase / skillBase) : output
  return { targetResource, output: scaledOutput }
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
  targetResource?: ResourceType,
): Phase5Result {
  const result: Phase5Result = {
    recurse: { shouldRecurse: false, newChance: 0 },
    transmuteOutput: null,
    transmuteSameResourceBoost: 0,
      devourTarget: null,
    questCompleted: false,
    outcastEchoTarget: null,
  }

  let recurseProc = false

  // ── 词条后触发 ──
  for (const affix of skill.affixes) {
    switch (affix.type) {
      case AffixType.Amplify: {
        // 自身叠层（不再给范围内技能叠层）
        runtimeState.stacks += 1
        // 质变：层数增加时触发范围内匹配技能
        if (affix.posRel != null && isTransformedForAffix(AffixType.Amplify, runtimeState, skill, ctx)) {
          const ampNeighborKeys = getExtendedNeighbors(ctx.occupiedKeys, affix.posRel)
          const ampCounted = new Set<string>()
          for (const nk of ampNeighborKeys) {
            const nSkillId = ctx.bindings.get(nk)
            if (!nSkillId || ampCounted.has(nSkillId)) continue
            if (nSkillId === skill.id) continue
            ampCounted.add(nSkillId)
            const nSkill = ctx.allSkills.get(nSkillId)
            if (!nSkill) continue
            if (!hasSharedMatch(nSkill, skill, AffixType.Amplify)) continue
            if (!result.amplifyTriggerTargets) result.amplifyTriggerTargets = []
            result.amplifyTriggerTargets.push(nk)
          }
        }
        break
      }

      case AffixType.Splash: {
        // 溅射：叠层，然后触发叠层数个匹配技能
        runtimeState.stacks += 1
        if (affix.posRel != null && !ctx.chainAffixesDisabled) {
          const splashNeighborKeys = getExtendedNeighbors(ctx.occupiedKeys, affix.posRel)
            .filter(k => ctx.bindings.has(k))
          const validTargets: string[] = []
          const seenIds = new Set<string>()
          for (const k of splashNeighborKeys) {
            const sid = ctx.bindings.get(k)!
            if (sid === skill.id || seenIds.has(sid)) continue
            seenIds.add(sid)
            const target = ctx.allSkills.get(sid)
            if (!target) continue
            if (!hasSharedMatch(skill, target, AffixType.Splash)) continue
            validTargets.push(k)
          }
          if (validTargets.length > 0) {
            const count = Math.min(runtimeState.stacks, validTargets.length)
            const targets = pickRandomKeys(validTargets, count, ctx.randomFn)
            result.splashTargets = targets
          }
        }
        break
      }

      case AffixType.Recurse:
        // 递归重触发已移至暴击子系统（Phase 3 贡献暴击率，下方统一处理暴击重触发）
        break

      default:
        break
    }
  }


  // ── Parity 质变·相变：奇数叠层时额外自触发 ──
  if (!ctx.chainAffixesDisabled && runtimeState.stacks % 2 === 1) {
    for (const a of skill.affixes) {
    }
  }

  // ── Bridge 质变·枢纽：是桥时触发两侧各一个邻居 ──
  if (!ctx.chainAffixesDisabled) {
    for (const a of skill.affixes) {
    }
  }

  // ── Pulse 质变：爆发时将范围内 1 个非叠层类技能转化为叠层类（每关重置） ──
  // ── 暴击重触发：递归词条/回声指套 — 暴击时自触发一次，暴击率减半 ──
  if (triggerFlags.isCrit && triggerFlags.recurseCritContribution > 0 && recurseDepth < MAX_RECURSE_DEPTH) {
    const rcc = triggerFlags.recurseCritContribution
    const hasRecurseAffix = skill.affixes.some(a => a.type === AffixType.Recurse)
    // 质变（迭代）：暴击率不减半
    const nextCrit = (hasRecurseAffix && isTransformedForAffix(AffixType.Recurse, runtimeState, skill, ctx))
      ? rcc
      : rcc / 2
    result.recurse = { shouldRecurse: true, newChance: nextCrit }
    recurseProc = true
  }

  // ── Outcast 质变：首尾呼应 — 找到对端技能并触发 ──
  if (isTransformedForAffix(AffixType.Outcast, runtimeState, skill, ctx) && !ctx.chainAffixesDisabled) {
    const outcastAffix = skill.affixes.find(a => a.type === AffixType.Outcast)
    if (outcastAffix && isFirstOrLastLetter(ctx.triggerKey, ctx.currentWord)) {
      const word = ctx.currentWord.toLowerCase()
      const firstKey = word[0]
      const lastKey = word[word.length - 1]
      const oppositeKey = ctx.triggerKey === firstKey ? lastKey : firstKey
      if (oppositeKey !== ctx.triggerKey && ctx.bindings.has(oppositeKey)) {
        result.outcastEchoTarget = oppositeKey
      }
    }
  }

  // ── Crit 质变回响：暴击时触发随机无 Crit 技能 ──
  if (triggerFlags.isCrit && triggerFlags.critTransformed && !ctx.chainAffixesDisabled) {
    const candidates = [...ctx.allSkills.entries()]
      .filter(([id, s]) => id !== skill.id && !s.affixes.some(a => a.type === AffixType.Crit))
      .filter(([id]) => {
        // 必须已绑定到键位
        const boundKey = [...ctx.bindings].find(([_, v]) => v === id)?.[0]
        return boundKey != null
      })
    if (candidates.length > 0) {
      const [targetId] = candidates[Math.floor(ctx.randomFn() * candidates.length)]
      const targetKey = [...ctx.bindings].find(([_, v]) => v === targetId)?.[0]
      if (targetKey) result.critEchoTarget = targetKey
    }
  }

  // ── 附魔后触发 ──

  // 学徒附魔（Phase 5 自触发类型）
  for (const enchId of skill.enchantmentIds) {
    const ench = enchId as EnchantmentType

    let shouldGrow = false
    let overrideGrowth = 0
    switch (ench) {
      case EnchantmentType.ApprenticeNeighbor:
        // 自触发也成长（替代旧 ApprenticeSelf 的角色）
        shouldGrow = true
        overrideGrowth = APPRENTICE_NEIGHBOR_GROWTH[skill.neighborPosRel!] ?? 0.04
        break
      // Res* 系列已改为全场资源产出监听（见 skills.ts applyResource），不再在 Phase 5 自触发
    }

    if (shouldGrow && overrideGrowth > 0) {
      runtimeState.apprenticeAccumulated += overrideGrowth * (ctx.apprenticeGrowthMultiplier ?? 1)
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
      runtimeState.questStacks += (ctx.questStackIncrement ?? 1)

      if (runtimeState.questStacks >= questDef.targetStacks) {
        runtimeState.questStacks = 0
        runtimeState.questCompletions++
        if (!runtimeState.questTransformed) {
          runtimeState.questTransformed = true
        }
        result.questCompleted = true

        // QuestDevour 特殊：吃最弱邻居
        if (questEnchType === EnchantmentType.QuestDevour) {
          const voidAffix = skill.affixes.find(a => a.type === AffixType.Void)
          if (voidAffix?.posRel != null) {
            result.devourTarget = findWeakestNeighbor(ctx.occupiedKeys, voidAffix.posRel, ctx)
          }
        }
      }
    }
  }

  // Void 质变：每次触发都产出 devourTarget（系统层限制每关一次）
  if (isTransformedForAffix(AffixType.Void, runtimeState, skill, ctx) && !result.devourTarget) {
    const voidAffix = skill.affixes.find(a => a.type === AffixType.Void)
    if (voidAffix?.posRel != null) {
      result.devourTarget = findWeakestNeighbor(ctx.occupiedKeys, voidAffix.posRel, ctx)
    }
  }

  // @deprecated 嬗变系已删除（Story 41.2），保留供旧存档向后兼容
  if (skill.enchantmentIds.includes('transmute')) {
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

  return result
}

// ===== Phase 6: 邻居通知 =====

/**
 * Phase 6: 遍历所有已绑定邻居，检查共鸣/导能/学徒·观摩。
 * 返回动作描述符，由调用方执行对应触发/成长/叠层。
 */
export function resolvePhase6(
  triggerKey: string,
  skill: AffixSkillInstance,
  runtimeState: SkillRuntimeState,
  ctx: TriggerContext,
  actualResource?: ResourceType,
  isCrit?: boolean,
  triggerBonusPercent?: number,
): Phase6Result {
  const actions: Phase6Action[] = []

  // Story 40.8+40.9: 排除自身占据的所有键位
  const occupiedKeySet = new Set(ctx.occupiedKeys)
  const occupiedKeys = ctx.occupiedKeys

  // Story 40.10: 预构建邻居技能→键位映射（按技能分组，天然去重）
  const neighborSkillKeys = new Map<string, string[]>()
  for (const [nk, nsid] of ctx.bindings) {
    if (occupiedKeySet.has(nk)) continue
    if (!neighborSkillKeys.has(nsid)) neighborSkillKeys.set(nsid, [])
    neighborSkillKeys.get(nsid)!.push(nk)
  }

  for (const [neighborSkillId, neighborKeys] of neighborSkillKeys) {
    const neighborSkill = ctx.allSkills.get(neighborSkillId)
    if (!neighborSkill) continue
    const neighborState = ctx.skillStates.get(neighborSkillId)

    // 共鸣词条：范围内共享资源或词条的技能触发时，本技能自动触发N次
    for (const affix of neighborSkill.affixes) {
    }

    // 质变·战号：触发技能暴击时，WarDrum 邻居+2叠层
    if (isCrit && neighborState) {
      for (const nAffix of neighborSkill.affixes) {
        if (nAffix.type !== AffixType.WarDrum || nAffix.posRel == null) continue
        if (!isTransformedForAffix(AffixType.WarDrum, neighborState, neighborSkill, ctx)) continue
        const wdKeys = [...ctx.bindings].filter(([, sid]) => sid === neighborSkillId).map(([k]) => k)
        const wdInRange = occupiedKeys.some(ok => wdKeys.some(wk => hasRelation(wk, ok, nAffix.posRel!)))
        if (wdInRange && hasSharedMatch(skill, neighborSkill, AffixType.WarDrum)) {
          neighborState.stacks += 2
        }
        break
      }
    }

    // （已删除：Clique/Leverage 质变逻辑）

    // 学徒·观摩附魔：邻居触发 → 自身永久成长（双侧 any-match，取实际匹配键）
    if (neighborSkill.enchantmentIds.includes(EnchantmentType.ApprenticeNeighbor) && neighborSkill.neighborPosRel) {
      const matchedNk = neighborKeys.find(nk => occupiedKeys.some(ok => hasRelation(ok, nk, neighborSkill.neighborPosRel!)))
      if (matchedNk != null) {
        const growth = APPRENTICE_NEIGHBOR_GROWTH[neighborSkill.neighborPosRel]
        actions.push({ type: 'apprentice_neighbor', neighborKey: matchedNk, growthDelta: growth })
      }
    }

    // 导能词条：匹配技能触发时额外触发一次（质变：+2 次）
    if (!ctx.chainAffixesDisabled) {
      for (const affix of neighborSkill.affixes) {
        if (affix.type !== AffixType.Conduit || affix.posRel == null) continue
        const matchedNk = neighborKeys.find(nk => occupiedKeys.some(ok => hasRelation(ok, nk, affix.posRel!)))
        if (matchedNk == null) continue
        if (hasSharedMatch(skill, neighborSkill, AffixType.Conduit)) {
          const conduitCount = isAffixGloballyTransformed(AffixType.Conduit, ctx.allSkills, ctx.skillStates) ? 2 : 1
          actions.push({ type: 'conduit', targetKey: triggerKey, conduitCount })
        }
      }
    }

    // 中转词条：直接触发 — 匹配技能触发时直接触发 1 个匹配技能
    if (!ctx.chainAffixesDisabled) {
      for (const affix of neighborSkill.affixes) {
        if (affix.type !== AffixType.Relay || affix.posRel == null) continue
        const matchedNk = neighborKeys.find(nk => occupiedKeys.some(ok => hasRelation(ok, nk, affix.posRel!)))
        if (matchedNk == null) continue
        if (!hasSharedMatch(skill, neighborSkill, AffixType.Relay)) continue

        // 从 Relay 技能的邻居中找匹配目标
        const relayNeighborKeys = getExtendedNeighbors(neighborKeys, affix.posRel)
          .filter(k => ctx.bindings.has(k) && !occupiedKeySet.has(k))
        const validTargets: string[] = []
        const seenSkillIds = new Set<string>()
        for (const k of relayNeighborKeys) {
          const sid = ctx.bindings.get(k)!
          if (sid === neighborSkillId) continue
          if (seenSkillIds.has(sid)) continue
          const target = ctx.allSkills.get(sid)
          if (!target) continue
          if (target.affixes.some(a => a.type === AffixType.Relay)) continue
          if (!hasSharedMatch(neighborSkill, target, AffixType.Relay)) continue
          seenSkillIds.add(sid)
          validTargets.push(k)
        }

        // 质变：触发 ALL；非质变：触发 1 个
        const relayTransformed = isAffixGloballyTransformed(AffixType.Relay, ctx.allSkills, ctx.skillStates)
        const targets = relayTransformed ? validTargets : pickRandomKeys(validTargets, 1, ctx.randomFn)
        for (const targetKey of targets) {
          actions.push({ type: 'relay', targetKey })
        }
      }
    }

  }

  return { actions }
}

// ===== Mirror 有效词条替换 =====

/**
 * 构建有效技能：将 Mirror 词条替换为运行时复制的词条。
 * - 非质变：替换为单个 mirrorCopiedAffix
 * - 质变（Story 41-5）：替换为 mirrorCopiedAffixes 数组（数组膨胀）
 * 若无 Mirror 或无复制词条，直接返回原 skill（零分配）。
 */
export function buildEffectiveSkill(
  skill: AffixSkillInstance,
  runtimeState: SkillRuntimeState,
): AffixSkillInstance {
  const hasMirror = skill.affixes.some(a => a.type === AffixType.Mirror)
  if (!hasMirror) return skill

  // Story 41-5: 质变模式 — Mirror 替换为所有复制词条（数组膨胀）
  if (runtimeState.mirrorCopiedAffixes && runtimeState.mirrorCopiedAffixes.length > 0) {
    const expanded: AffixInstance[] = []
    for (const a of skill.affixes) {
      if (a.type === AffixType.Mirror) {
        expanded.push(...runtimeState.mirrorCopiedAffixes)
      } else {
        expanded.push(a)
      }
    }
    return { ...skill, affixes: expanded }
  }

  // 非质变：单个替换
  if (!runtimeState.mirrorCopiedAffix) return skill
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

  // Phase 1: 基础值（Conduit/Amplify/Splash 技能自身不产出，基础值为 0）
  const hasSelfZero = effectiveSkill.affixes.some(a => a.type === AffixType.Conduit || a.type === AffixType.Amplify || a.type === AffixType.Splash || a.type === AffixType.Relay || a.type === AffixType.WarDrum)
  const base = hasSelfZero ? 0 : resolvePhase1(effectiveSkill)

  // Phase 2: 加算层
  const p2 = resolvePhase2(effectiveSkill, runtimeState, ctx, base)

  // Phase 3: 乘算层
  const p3 = resolvePhase3(effectiveSkill, runtimeState, ctx, p2.output)

  // Twin 质变：非 Twin 词条效果翻倍（等效词条复制）
  const hasTwin = effectiveSkill.affixes.some(a => a.type === AffixType.Twin)
  if (hasTwin && isTransformedForAffix(AffixType.Twin, runtimeState, skill, ctx)) {
    p3.output *= 2
  }

  // 质变·内省：reflectScore 作为全词条效果乘数（影响所有 Phase 产出）
  for (const affix of effectiveSkill.affixes) {
    if (affix.type === AffixType.Reflect && isTransformedForAffix(AffixType.Reflect, runtimeState, skill, ctx)) {
      const reflectScore = effectiveSkill.affixes.length * effectiveSkill.level
      p3.output *= 1 + (affix.reflectK ?? 0) * reflectScore
    }
  }

  // Phase 4: 资源选择
  const p4 = resolvePhase4(effectiveSkill, p3.output, runtimeState, ctx)

  // Taboo 质变：惩罚转化为随机资源
  if (p3.flags.tabooConvertResource) {
    p4.targetResource = p3.flags.tabooConvertResource
  }

  // Phase 5: 后触发
  const p5 = resolvePhase5(effectiveSkill, runtimeState, ctx, p3.flags, p3.output, recurseDepth, p4.targetResource)

  // 质变·弹幕：3连击时溅射一个 Adjacent 邻居

  // Phase 6: 邻居通知（感应词条检查触发技能词条类型）
  const p6 = resolvePhase6(ctx.triggerKey, effectiveSkill, runtimeState, ctx, p4.targetResource, p3.flags.isCrit, p2.bonusPercent)

  // 合并状态变更
  const allMutations = [...p2.mutations, ...p3.mutations]

  // Cluster/Pattern 满层效果：从 Phase 2 mutations 提取
  for (const m of p2.mutations) {
    if ((m as any).type === 'clusterVowel') {
      // 找一个绑定在元音键上的技能
      const vowelCandidates: string[] = []
      for (const [k, sid] of ctx.bindings) {
        if (VOWELS.has(k) && sid !== skill.id) vowelCandidates.push(k)
      }
      if (vowelCandidates.length > 0) {
      }
    }
    if ((m as any).type === 'outcastTarget') p5.outcastTarget = (m as any).value
    if ((m as any).type === 'componentFar' || (m as any).type === 'componentAll') {
      // BFS 从触发键出发，遍历连通分量
      const startKey = (m as any).value as string
      const isAll = (m as any).type === 'componentAll'
      const boundKeys = new Set(ctx.bindings.keys())
      const visited = new Set<string>()
      const queue = [startKey]
      visited.add(startKey)
      let farthest = startKey
      while (queue.length > 0) {
        const current = queue.shift()!
        farthest = current
        for (const n of getKeysWithRelation(current, PositionRelation.Adjacent)) {
          if (!visited.has(n) && boundKeys.has(n)) { visited.add(n); queue.push(n) }
        }
      }
      if (isAll) {
        // 质变：触发链上所有技能（排除自身）
        const allTargets: string[] = []
        for (const k of visited) {
          if (ctx.bindings.get(k) !== skill.id) allTargets.push(k)
        }
      } else {
        if (farthest !== startKey && ctx.bindings.get(farthest) !== skill.id) {
        }
      }
    }
    if ((m as any).type === 'turbulenceWeak') {
      const weakId = (m as any).value as string
      for (const [k, sid] of ctx.bindings) {
      }
    }
    if ((m as any).type === 'turbulenceAll') {
      const targetId = (m as any).value as string
      for (const [k, sid] of ctx.bindings) {
        if (sid === targetId) {
          break
        }
      }
    }
  }

  return {
    output: p3.output,
    bonusPercent: p2.bonusPercent,
    multipliers: p3.multipliers,
    isCrit: p3.flags.isCrit,
    isPulse: p3.flags.isPulse,
    isCascade: p3.flags.isCascade,
    isTabooPenalty: p3.flags.isTabooPenalty,
    isMultiplyOp: (skill.enchantmentIds.includes(EnchantmentType.MultiplyOperator) || skill.enchantmentIds.includes(EnchantmentType.QuestMultiplyOp)) && isTransformedForAffix(AffixType.Multiply, runtimeState, skill, ctx),
    ligatureCount: p3.flags.ligatureCount,
    stateMutations: allMutations,
    convertReverseOutputs: p2.convertReverseOutputs.length > 0 ? p2.convertReverseOutputs : undefined,
    phase4: p4,
    phase5: p5,
    phase6: p6,
    triggerKey: ctx.triggerKey,
    chargeAutoComplete: p2.chargeAutoComplete || undefined,
    stackEffectFired: hasSelfZero || undefined,
    currentStacks: hasSelfZero ? runtimeState.stacks : undefined,
    consumeRequests: p2.consumeRequests.length > 0 ? p2.consumeRequests : undefined,
  }
}

// ===== 外部事件回调 =====

/** 学徒附魔事件→附魔类型映射（一个事件可映射多个附魔类型） */
const APPRENTICE_EVENT_MAP: Record<string, EnchantmentType[]> = {
  // 精简后仅保留 Self/Neighbor/Proc，无外部事件类型
}

/**
 * 外部事件回调：系统层在对应事件发生时调用此函数。
 * 遍历 enchantmentIds，匹配事件→累加 growthPerProc 到 runtimeState.apprenticeAccumulated。
 * 纯函数（仅修改传入的 runtimeState），不调用系统层。
 * @param growthMultiplier 学徒之袍遗物成长乘数（默认 1）
 */
export function applyApprenticeEvent(
  event: string,
  runtimeState: SkillRuntimeState,
  enchantmentIds: string[],
  growthMultiplier: number = 1,
): boolean {
  const targetEnchs = APPRENTICE_EVENT_MAP[event]
  if (!targetEnchs) return false

  let applied = false
  for (const targetEnch of targetEnchs) {
    const growth = APPRENTICE_GROWTH_DEFAULTS[targetEnch]
    if (growth == null) continue
    if (enchantmentIds.includes(targetEnch)) {
      runtimeState.apprenticeAccumulated += growth * growthMultiplier
      applied = true
    }
  }
  return applied
}

// ===== 任务附魔外部事件回调 =====

/** @deprecated 所有任务附魔已改为 equip_count 型，外部事件映射已清空 */
const QUEST_EXTERNAL_EVENT_MAP: Record<string, EnchantmentType[]> = {}

/**
 * 外部任务事件回调：系统层在对应事件发生时调用。
 * 遍历 enchantmentIds，匹配事件→questStacks++→满层 questCompletions++ 并重置。
 * 纯函数（仅修改传入的 runtimeState），不调用系统层。
 * @param stackIncrement 试炼徽章遗物叠层增量（默认 1）
 */
export function applyQuestEvent(
  event: string,
  runtimeState: SkillRuntimeState,
  enchantmentIds: string[],
  stackIncrement: number = 1,
): boolean {
  const targetEnchs = QUEST_EXTERNAL_EVENT_MAP[event]
  if (!targetEnchs) return false

  let applied = false
  for (const targetEnch of targetEnchs) {
    if (!enchantmentIds.includes(targetEnch)) continue
    const def = QUEST_ENCHANTMENT_DEFS.find(d => d.type === targetEnch)
    if (!def) continue

    runtimeState.questStacks += stackIncrement
    if (runtimeState.questStacks >= def.targetStacks) {
      runtimeState.questStacks = 0
      runtimeState.questCompletions++
      if (!runtimeState.questTransformed) {
        runtimeState.questTransformed = true
      }
    }
    applied = true
  }
  return applied
}

// ===== 装备数量型任务评估 =====

/**
 * 评估所有装备数量型任务附魔（equip_count）的质变状态。
 * 统计每种目标词条类型已绑定的技能数量，与 getQuestEquipTarget 对比：
 * - 达标 → questTransformed = true
 * - 未达标 → questTransformed = false（可逆，卸下技能后取消质变）
 *
 * questStacks 记录当前已装备数量（用于 UI 进度显示）。
 *
 * 应在绑定变更（购买/出售/拖拽/旋转）和战斗开始时调用。
 * 纯函数——仅修改传入的 skillStates。
 */
export function evaluateEquipQuests(
  skills: Map<string, AffixSkillInstance>,
  skillStates: Map<string, SkillRuntimeState>,
  bindings: Map<string, string>,
  questEquipReduction: number = 0,
): void {
  // 1. 统计已绑定技能按词条类型计数
  const boundSkillIds = new Set(bindings.values())
  const affixTypeCount = new Map<AffixType, number>()
  for (const skillId of boundSkillIds) {
    const skill = skills.get(skillId)
    if (!skill) continue
    const seenTypes = new Set<AffixType>()
    for (const affix of skill.affixes) {
      if (!seenTypes.has(affix.type)) {
        seenTypes.add(affix.type)
        affixTypeCount.set(affix.type, (affixTypeCount.get(affix.type) ?? 0) + 1)
      }
    }
  }

  // 2. 遍历所有技能的任务附魔，更新质变状态
  for (const [skillId, skill] of skills) {
    const rt = skillStates.get(skillId)
    if (!rt) continue

    const questEnchType = skill.enchantmentIds.find(id =>
      QUEST_ENCHANTMENT_DEFS.some(d => d.type === id && d.event === 'equip_count'),
    ) as EnchantmentType | undefined
    if (!questEnchType) continue

    const questDef = QUEST_ENCHANTMENT_DEFS.find(d => d.type === questEnchType)!
    const targetAffixes = Array.isArray(questDef.targetAffix) ? questDef.targetAffix : [questDef.targetAffix]
    const target = getQuestEquipTarget(questDef.targetAffix, questEquipReduction)

    // 统计目标词条中装备数量最大值（多词条取最高）
    let equipped = 0
    for (const at of targetAffixes) {
      equipped = Math.max(equipped, affixTypeCount.get(at) ?? 0)
    }

    // 更新 questStacks 为当前装备数量（用于 UI 进度显示）
    rt.questStacks = equipped

    // 达标 → 质变；未达标 → 取消质变（equip_count 可逆）
    const wasTransformed = rt.questTransformed
    rt.questTransformed = equipped >= target
    if (rt.questTransformed && !wasTransformed) {
      rt.questCompletions++
    }
  }
}

// ===== Gravity / Mirror 数据助手 =====

/**
 * 获取 Gravity 词条的有效 probMult。
 * 供词选系统在触发流水线外调用，data 层纯函数。
 */
export function getEffectiveProbMult(
  affix: AffixInstance,
  runtimeState: SkillRuntimeState,
  skill: AffixSkillInstance,
  allSkills?: Map<string, AffixSkillInstance>,
  skillStates?: Map<string, SkillRuntimeState>,
): number {
  const baseProbMult = affix.probMult ?? 1
  const transformed = allSkills && skillStates
    ? isAffixGloballyTransformed(AffixType.Gravity, allSkills, skillStates)
    : runtimeState.questTransformed
  if (!transformed) return baseProbMult
  // 质变：双向锁定 — 吸引→必含(Infinity)，排斥→必不含(0)，中性→不变(1)
  if (baseProbMult > 1) return Infinity
  if (baseProbMult < 1) return 0
  return 1
}

/**
 * Mirror 词条关卡初始化：从邻居复制词条。
 * - 非质变：随机复制一个邻居的一个词条，返回单个 AffixInstance。
 * - 质变（Story 41-5）：复制范围内所有邻居的不同类型词条，返回数组。
 * 供系统层在关卡开始时调用。
 * 注意：调用方须将 ctx.triggerKey 设为 Mirror 技能的绑定键位（非当前按键）。
 */
export function resolveMirrorCopy(
  skill: AffixSkillInstance,
  runtimeState: SkillRuntimeState,
  ctx: TriggerContext,
): AffixInstance | null {
  const mirrorAffix = skill.affixes.find(a => a.type === AffixType.Mirror)
  if (!mirrorAffix?.posRel) return null

  // Story 40.9: 扩展邻居范围（多格技能从所有占据键的邻居中选取复制源）
  const neighborKeys = getExtendedNeighbors(ctx.occupiedKeys, mirrorAffix.posRel)
    .filter(k => ctx.bindings.has(k))

  if (neighborKeys.length === 0) return null

  // Story 41-5: 质变模式 — 复制所有邻居的不同类型词条
  if (isTransformedForAffix(AffixType.Mirror, runtimeState, skill, ctx)) {
    return resolveMirrorCopyAll(neighborKeys, ctx)
  }

  // 非质变：随机选一个邻居 → 随机选一个词条
  const neighborKey = neighborKeys[Math.floor(ctx.randomFn() * neighborKeys.length)]
  const neighborSkillId = ctx.bindings.get(neighborKey)
  if (!neighborSkillId) return null

  const neighborSkill = ctx.allSkills.get(neighborSkillId)
  if (!neighborSkill || neighborSkill.affixes.length === 0) return null

  const copyable = neighborSkill.affixes.filter(
    a => a.type !== AffixType.Mirror && a.type !== AffixType.Twin,
  )
  if (copyable.length === 0) return null

  const source = copyable[Math.floor(ctx.randomFn() * copyable.length)]
  return { ...source }
}

/**
 * Story 41-5: 从邻居键列表中收集所有不同类型词条（去重、排除 Mirror/Twin）。
 * 共用逻辑，供 resolveMirrorCopyAll 和 resolveMirrorCopyAllAffixes 调用。
 */
function collectNeighborAffixes(
  neighborKeys: string[],
  ctx: TriggerContext,
): AffixInstance[] {
  const seen = new Set<string>()
  const collected: AffixInstance[] = []

  for (const nk of neighborKeys) {
    const neighborSkillId = ctx.bindings.get(nk)
    if (!neighborSkillId) continue
    const neighborSkill = ctx.allSkills.get(neighborSkillId)
    if (!neighborSkill) continue

    for (const affix of neighborSkill.affixes) {
      if (affix.type === AffixType.Mirror || affix.type === AffixType.Twin) continue
      if (seen.has(affix.type)) continue
      seen.add(affix.type)
      collected.push({ ...affix })
    }
  }

  return collected
}

/**
 * Story 41-5: Mirror 质变 — 复制范围内所有邻居的不同类型词条。
 * 返回单个代表（用于兼容 mirrorCopiedAffix），完整数组通过 runtimeState.mirrorCopiedAffixes 存储。
 */
function resolveMirrorCopyAll(
  neighborKeys: string[],
  ctx: TriggerContext,
): AffixInstance | null {
  const collected = collectNeighborAffixes(neighborKeys, ctx)
  return collected.length > 0 ? collected[0] : null
}

/**
 * Story 41-5: Mirror 质变 — 获取所有复制词条的完整数组。
 * 供 battle.ts endLevel() 在质变模式下调用。
 */
export function resolveMirrorCopyAllAffixes(
  skill: AffixSkillInstance,
  runtimeState: SkillRuntimeState,
  ctx: TriggerContext,
): AffixInstance[] {
  const mirrorAffix = skill.affixes.find(a => a.type === AffixType.Mirror)
  if (!mirrorAffix?.posRel) return []

  const neighborKeys = getExtendedNeighbors(ctx.occupiedKeys, mirrorAffix.posRel)
    .filter(k => ctx.bindings.has(k))

  if (neighborKeys.length === 0) return []

  return collectNeighborAffixes(neighborKeys, ctx)
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

// ===== 分类候选 + 两层加权抽取 =====

export interface CategorizedEnchantments {
  apprentice: EnchantmentType[]
  quest: EnchantmentType[]
  transmute: EnchantmentType[]
  operator: EnchantmentType[]
}

/**
 * 返回按四大类分组的附魔候选（学徒/任务/衍生/运算符）。
 * 排除已装备的附魔。职业过滤由外部处理。
 */
export function categorizeEnchantmentCandidates(skill: AffixSkillInstance, _equippedAffixTypes?: Set<AffixType>): CategorizedEnchantments {
  const existingEnchs = new Set(skill.enchantmentIds)

  // 学徒附魔 — 1 通用 + 5 资源专精（排除本技能产出资源对应的专精）
  const sameResEnch = RES_ENCHANTMENT_BY_RESOURCE[skill.resource]
  const apprenticeTypes: EnchantmentType[] = [
    EnchantmentType.ApprenticeNeighbor,
    EnchantmentType.ApprenticeResBase, EnchantmentType.ApprenticeResScore,
    EnchantmentType.ApprenticeResMultiplier, EnchantmentType.ApprenticeResTime,
    EnchantmentType.ApprenticeResGold,
    EnchantmentType.ApprenticeCrit,
  ]
  const apprentice = apprenticeTypes.filter(t => !existingEnchs.has(t) && t !== sameResEnch)

  // 任务附魔（需匹配词条）
  const quest = filterQuestCandidates(skill)

  // 衍生附魔（@deprecated — 嬗变系已删除，始终返回空）
  const transmute: EnchantmentType[] = []

  // 运算符（不再独立提供，通过 Multiply 词条的质变附魔获取）
  const operator: EnchantmentType[] = []

  return { apprentice, quest, transmute, operator }
}

/**
 * 两层加权抽取：先等权抽四大类，再在类内等权抽具体附魔。
 * 空类跳过，权重均分给剩余类。
 */
export function weightedPickEnchantment(
  categorized: CategorizedEnchantments,
  randomFn: () => number = Math.random,
): EnchantmentType | null {
  const categories = [categorized.apprentice, categorized.quest, categorized.transmute, categorized.operator]
    .filter(c => c.length > 0)
  if (categories.length === 0) return null
  const chosen = categories[Math.floor(randomFn() * categories.length)]
  return chosen[Math.floor(randomFn() * chosen.length)]
}

/**
 * 返回技能可获取的全部附魔候选列表（学徒+任务+衍生+运算符）。
 * 排除已装备的附魔。职业过滤由外部 filterEnchantmentsByClass 处理。
 */
export function filterEnchantmentCandidates(skill: AffixSkillInstance): EnchantmentType[] {
  const c = categorizeEnchantmentCandidates(skill)
  return [...c.apprentice, ...c.quest, ...c.transmute, ...c.operator]
}

/**
 * @deprecated 嬗变系已删除（Story 41.2），保留供旧存档兼容。
 * 返回衍生附魔可选的目标资源列表。
 */
export function getTransmuteEligibleResources(
  skillResource: ResourceType,
  playerClass?: string,
): ResourceType[] {
  const allResources: ResourceType[] = ['base', 'score', 'multiplier', 'time', 'gold', 'energy', 'mutagen']
  return allResources.filter(r => {
    // 排除与自身相同的资源
    if (r === skillResource) return false
    // fragment: 仅造词师可用
    if (r === 'energy' && (!playerClass || playerClass === 'metamorph')) return false
    // mutagen: 仅蜕变师可用
    if (r === 'mutagen' && (!playerClass || playerClass === 'wordsmith')) return false
    return true
  })
}

/**
 * 返回技能的附魔槽位数量。Twin 词条使附魔数量翻倍（1→2）。
 * @param bonusSlots 额外槽位加成（附魔锚点遗物提供，默认 0）
 */
export function getEnchantmentSlotCount(skill: AffixSkillInstance, bonusSlots: number = 0): number {
  return (skill.affixes.some(a => a.type === AffixType.Twin) ? 2 : 1) + bonusSlots
}

// ===== 生命周期钩子 (Story 35.8) =====

/**
 * @deprecated Decay 跨单词不再重置，仅跨关重置（Story 41.2 AC7）。
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
 * 每关初始化：重置所有技能的 stacks，刷新 Mirror 词条。
 * 纯函数——直接修改传入的 skillStates。
 * Mirror 刷新通过 resolveMirrorCopy 实现，需要构造最小 TriggerContext。
 */
export function resetStageState(
  skills: Map<string, AffixSkillInstance>,
  skillStates: Map<string, SkillRuntimeState>,
  bindings: Map<string, string>,
  randomFn: () => number,
  perpetualEngine: boolean = false,
): void {
  for (const [skillId, state] of skillStates) {
    if (!perpetualEngine) state.stacks = 0
    state.chargeAccumulated = 0

    // Decay: 每关重置 currentDecayMult（Story 41.2 AC7 — 跨单词不重置，仅跨关重置）
    const skill = skills.get(skillId)
    if (skill) {
      for (const affix of skill.affixes) {
        if (affix.type === AffixType.Decay) {
          state.currentDecayMult = affix.initialMult ?? 1
        }
      }
    }

    // Mirror 词条复制已移至关卡结束时（battle.ts），此处不再刷新

    // critStreak / missStreak 每关重置
    state.critStreak = 0
    state.missStreak = 0

    // MonkeyPatch：每关随机修改同技能一个词条的参数
    state.patchTargetIndex = -1
    state.patchMultiplier = 1.0
    if (skill) {
      for (const affix of skill.affixes) {
        if (affix.type === AffixType.MonkeyPatch) {
          // 过滤有可修改参数的词条
          const candidates = skill.affixes
            .map((a, i) => ({ a, i, scaling: AFFIX_LEVEL_SCALING[a.type] }))
            .filter(({ a, scaling }) => a.type !== AffixType.MonkeyPatch && scaling && (a as any)[scaling.param] != null)
          if (candidates.length === 0) {
            // 彩蛋：无可修改词条时，猴子补丁把自己替换成随机词条
            const mpIdx = skill.affixes.findIndex(a => a.type === AffixType.MonkeyPatch)
            if (mpIdx >= 0) {
              const excludeSet = new Set<string>()
              for (const [at, cls] of Object.entries(AFFIX_CLASS_RESTRICTION)) {
                // 无法确定职业时排除所有职业限定
                excludeSet.add(at)
              }
              excludeSet.add(AffixType.MonkeyPatch)
              const pool = Object.values(AffixType)
                .filter(t => !excludeSet.has(t))
                .map(t => ({ type: t, w: AFFIX_WEIGHTS[t as Exclude<AffixType, AffixType.Convert>] ?? 0 }))
                .filter(e => e.w > 0)
              if (pool.length > 0) {
                const totalW = pool.reduce((s, e) => s + e.w, 0)
                let r = randomFn() * totalW
                let picked = pool[pool.length - 1].type
                for (const e of pool) { r -= e.w; if (r <= 0) { picked = e.type; break } }
                skill.affixes[mpIdx] = rollAffixParams(picked, skill.resource)
              }
            }
            break
          }
          const low = affix.patchLow ?? 0.5
          const high = affix.patchHigh ?? 2.0
          const mult = low + randomFn() * (high - low)
          // 质变·热更新：修改所有词条
          const isTransformed = state.questTransformed && skill.enchantmentIds.includes(EnchantmentType.QuestMonkeyPatch)
          const targets = isTransformed ? candidates : [candidates[Math.floor(randomFn() * candidates.length)]]
          const tmult = isTransformed ? 0.8 + randomFn() * 0.7 : mult
          state.patchTargetIndex = targets.length === 1 ? targets[0].i : -2
          state.patchMultiplier = tmult
          for (const { a, scaling } of targets) {
            const cur = (a as any)[scaling!.param] as number
            ;(a as any)[scaling!.param] = roundTo(cur * tmult, 4)
          }
        }
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
    state.questTransformed = false
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
    transmuteResource: skill.transmuteResource,
    neighborPosRel: skill.neighborPosRel,
    shapeId: skill.shapeId,
    rotation: skill.rotation,
    runtime: {
      ...runtimeState,
      mirrorCopiedAffix: runtimeState.mirrorCopiedAffix ? { ...runtimeState.mirrorCopiedAffix } : null,
      mirrorCopiedAffixes: runtimeState.mirrorCopiedAffixes.map(a => ({ ...a })),
    },
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
    transmuteResource: data.transmuteResource,
    neighborPosRel: data.neighborPosRel,
    shapeId: data.shapeId ?? 'monomino',
    rotation: data.rotation ?? 0,
  }
  const runtimeState: SkillRuntimeState = {
    skillId: data.id,
    chargeAccumulated: data.runtime.chargeAccumulated ?? 0,
    currentDecayMult: data.runtime.currentDecayMult ?? 1,
    mirrorCopiedAffix: data.runtime.mirrorCopiedAffix ? { ...data.runtime.mirrorCopiedAffix } : null,
    mirrorCopiedAffixes: (data.runtime as any).mirrorCopiedAffixes?.map((a: any) => ({ ...a })) ?? [],
    stacks: (data.runtime as any).stacks ?? (data.runtime as any).triggerCount ?? (data.runtime as any).amplifyStacks ?? 0,
    apprenticeAccumulated: data.runtime.apprenticeAccumulated ?? 0,
    questStacks: data.runtime.questStacks ?? 0,
    questCompletions: data.runtime.questCompletions ?? 0,
    questTransformed: data.runtime.questTransformed ?? ((data.runtime.questCompletions ?? 0) > 0),
    exhaustCount: (data.runtime as any).exhaustCount ?? 0,
    critStreak: (data.runtime as any).critStreak ?? 0,
    missStreak: (data.runtime as any).missStreak ?? 0,
    patchTargetIndex: (data.runtime as any).patchTargetIndex ?? -1,
    patchMultiplier: (data.runtime as any).patchMultiplier ?? 1.0,
    mutacritAccum: (data.runtime as any).mutacritAccum ?? 0,
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
          mirrorCopiedAffixes: [],
          stacks: 0,
          apprenticeAccumulated: 0,
          questStacks: 0,
          questCompletions: 0,
          questTransformed: false,
        }
      }
      return patched
    })
}

// ===== 内部辅助 =====

/** 判断附魔类型是否为学徒系列 */
export function isApprenticeEnchantment(ench: EnchantmentType): boolean {
  return ench === EnchantmentType.ApprenticeNeighbor
    || ench === EnchantmentType.ApprenticeResBase
    || ench === EnchantmentType.ApprenticeResScore
    || ench === EnchantmentType.ApprenticeResMultiplier
    || ench === EnchantmentType.ApprenticeResTime
    || ench === EnchantmentType.ApprenticeResGold
    || ench === EnchantmentType.ApprenticeCrit
}

// ===== 升华系统 (Apprentice Ascension) =====

/** 升华基础阈值（Lv.3→4 所需 EXP） */
export const ASCEND_BASE_THRESHOLD = 0.5
/** 升华后基础值指数增长率 */
export const ASCEND_GROWTH_RATE = 1.6

/** 升华所需 EXP 阈值: 每级翻倍 — 0.5 × 2^(level - 3) */
export function getAscendThreshold(level: number): number {
  return ASCEND_BASE_THRESHOLD * Math.pow(2, level - 3)
}

/** 检查技能是否可以升华 */
export function canAscend(skill: AffixSkillInstance, runtimeState: SkillRuntimeState): boolean {
  // 必须有学徒附魔
  if (!skill.enchantmentIds.some(id => isApprenticeEnchantment(id as EnchantmentType))) return false
  // 必须 Lv.3+
  if (skill.level < 3) return false
  // EXP 必须达到阈值
  const threshold = getAscendThreshold(skill.level)
  return runtimeState.apprenticeAccumulated >= threshold
}

/** 执行升华：level++, 扣减 EXP, 词缀参数缩放 */
export function executeAscend(skill: AffixSkillInstance, runtimeState: SkillRuntimeState): void {
  const threshold = getAscendThreshold(skill.level)
  runtimeState.apprenticeAccumulated -= threshold
  skill.level++
  applyAffixLevelScaling(skill.affixes, 1)
}

/** 升华后基础值缩放: level <= 3 ? 1 : 1.6^(level-3) */
export function getAscendBaseScale(level: number): number {
  if (level <= 3) return 1
  return Math.pow(ASCEND_GROWTH_RATE, level - 3)
}
