// ============================================
// 打字肉鸽 - V2 词条生成器
// ============================================
// 每个词条 = 一个 EffectSpec（recipe 固定），trigger / 作用范围在生成时随机赋值，
// magnitude 按 trigger 频率 + 作用范围大小 scale 到该 recipe 设定的总贡献 T。
//
// 生成出的 AffixV2Definition 通过 registerDynamicAffixV2 注册进运行时索引，
// 与静态 JSON 词条混用相同 lookup 接口（getAffixV2Definition）。

import type { AffixV2Definition } from './affixV2'
import { registerDynamicAffixV2, TOOL_AFFIX_USES_MIN, TOOL_AFFIX_USES_MAX } from './affixV2'
import type { TriggerSpec, EffectSpec, FireFilter, AuraModifier, TargetSelector, ScaleByTag, ScaleCountSource, SkillFilter } from './affixV2Trigger'
import type { ResourceType } from '../core/types'
import { random, runWithTempSeed } from '../core/seededRandom'
import type { SectionTag } from './affixTags'
import { PositionRelation } from './keyboardTopology'

// ============================================
// Trigger 池 · 每条标"事件频率"（events/battle，30 词/300 键基准）
// ============================================

interface TriggerEntry {
  readonly spec: TriggerSpec
  readonly freq: number
}

// every_n_keys N 范围 · N=1 等同 on_key（合并）
const EVERY_N_MIN = 1
const EVERY_N_MAX = 30

/** on_fire(posRel) freq 表 · 估值 = 30 × 平均位置满足技能数 */
const ONFIRE_POSREL_FREQ: Record<string, number> = {
  Adjacent: 60, SameRow: 90, SameColumn: 45,
  SameHand: 120, SameFinger: 45, Symmetric: 30,
}

const POSREL_VALUES = [
  PositionRelation.Adjacent, PositionRelation.SameRow, PositionRelation.SameColumn,
  PositionRelation.SameHand, PositionRelation.SameFinger, PositionRelation.Symmetric,
] as const

// ============================================
// 二级抽样 trigger · 先大类（on_fire vs non-on-fire 50/50）再细分
// ============================================

/** 顶层：50% on_fire 家族 / 50% 非 fire（on_word_end / on_key / every_n_keys）· kind 用于 on_haste_granted 需求门控 */
function pickTrigger(section: SectionTag, kind: string): TriggerEntry {
  return random() < 0.5 ? pickOnFireTrigger(section) : pickNonFireTrigger(kind)
}

/** on_fire 家族（含 on_self_fire）· 6 子类等权 · 子类内随机参数 */
function pickOnFireTrigger(section: SectionTag): TriggerEntry {
  const r = random()
  if (r < 1 / 6) {
    // on_self_fire · 自身 fire
    return { spec: { type: 'on_self_fire' }, freq: 30 }
  }
  if (r < 2 / 6) {
    // on_fire(tag=本 section)
    return { spec: { type: 'on_fire', filter: { tag: section } }, freq: 45 }
  }
  if (r < 3 / 6) {
    // on_fire(resource) · 6 资源等权
    const resource = pickRandom(MATCHED_RESOURCE_POOL)
    return { spec: { type: 'on_fire', filter: { resource } }, freq: 45 }
  }
  if (r < 4 / 6) {
    // on_fire(posRel) · 6 关系等权
    const posRel = pickRandom(POSREL_VALUES)
    return {
      spec: { type: 'on_fire', filter: { posRel } },
      freq: ONFIRE_POSREL_FREQ[String(posRel)] ?? 60,
    }
  }
  if (r < 5 / 6) {
    // on_fire(rarity) · 稀有度 0-3 等权 · freq 粗估（依赖场上稀有度分布）
    const rarity = Math.floor(random() * 4)
    return { spec: { type: 'on_fire', filter: { rarity } }, freq: 30 }
  }
  // on_fire(is_crit) · true/false 等权
  const isCrit = random() < 0.5
  return {
    spec: { type: 'on_fire', filter: { is_crit: isCrit } },
    freq: isCrit ? 24 : 216,
  }
}

/** 非 fire · on_word_end / on_resource_consumed / every_n_keys / on_haste_granted · 末两者受需求门控（被关掉则回退 every_n_keys）*/
function pickNonFireTrigger(kind: string): TriggerEntry {
  const r = random()
  if (r < 0.30) return { spec: { type: 'on_word_end' }, freq: 30 }
  if (r < 0.42) {
    // on_resource_consumed · 反应型（监听 convert_resource 消耗事件 · 任意资源）·
    // freq 经验值 ~15（依赖场上是否有 convert_resource 源；无源时永不触发 = build-around）
    return { spec: { type: 'on_resource_consumed' }, freq: 15 }
  }
  if (r < 0.72 || !admitDemand(kind)) {
    // every_n_keys · N ∈ [1, 30] 随机；N=1 即每次击键（也承接 on_haste_granted 被门控掉的回退）
    const n = Math.floor(random() * (EVERY_N_MAX - EVERY_N_MIN + 1)) + EVERY_N_MIN
    return { spec: { type: 'every_n_keys', n }, freq: 300 / n }
  }
  // on_haste_granted · scope 加权随机（self 偏多，wide scope 稀有）·
  // freq 经验值 ~20（依赖场上是否有 grant_haste 源；非 fire 系列里频率粗估）
  const scope = pickGatedScope(FULL_SCOPE_POOL, kind)
  return { spec: { type: 'on_haste_granted', scope }, freq: 20 }
}

// ============================================
// Chant scale roll · apply_aura 的 ScaleByTag 抽样
// ============================================

const CHANT_SCALE_PROBABILITY = 0.3
const CHANT_TAG_PER_N_MIN = 2
const CHANT_TAG_PER_N_MAX = 4
const CHANT_TAG_COUNT_FACTOR = 0.1

/** 抽 scale 计数来源（变体）· 词条 42% / 资源 16% / 稀有度 13% / 极速 8% / 目标分数 7% / 同名词条 7% / 空位 7%。
 *  资源用宿主资源（"数同资源技能"，无则随机）；稀有度 0-3 随机；极速数全局动态；目标分数读当前关目标档；
 *  同名词条数携带本词条名（同 defId）的去重技能（自指·宿主自身计入·孤本时计 1）；空位随机锁 posRel。
 *  by:'hasted' 受需求门控——被关掉则回退 targetScore/affixName/empty（非极速来源）。 */
function pickScaleSource(section: SectionTag, skillResource?: ResourceType, kind?: string): ScaleCountSource {
  const roll = random()
  if (roll < 0.42) return { by: 'tag', tag: section }
  if (roll < 0.58) return { by: 'resource', resource: skillResource ?? pickRandom(MATCHED_RESOURCE_POOL) }
  if (roll < 0.71) return { by: 'rarity', rarity: Math.floor(random() * 4) }
  if (roll < 0.79 && admitDemand(kind)) return { by: 'hasted' }
  if (roll < 0.86) return { by: 'targetScore' }
  if (roll < 0.93) return { by: 'affixName' }
  return { by: 'empty', posRel: pickRandom(POSREL_VALUES) }
}

/** 给定 source 选 scope：empty 用自身 posRel、hasted 全局数极速技能、targetScore 读关目标（均 top-level scope 留空）；其余从 SCALE_SCOPE_POOL 抽。 */
function pickScaleScope(source: ScaleCountSource): TargetSelector | undefined {
  return (source.by === 'empty' || source.by === 'hasted' || source.by === 'targetScore') ? undefined : pickWeightedScope(SCALE_SCOPE_POOL).selector
}

/**
 * 给 chant recipe 抽 scale 字段 · 30% 概率挂；rainbow modifier 不抽（无 amount）。
 * 曲线路由：multi_fire_add → per_n（整数步进）；其余 → count（连续 %-scaling）。
 * 计数来源由 pickScaleSource 随机（词条/资源/稀有度/空位）。
 */
function pickChantScale(
  modifierType: AuraModifier['type'],
  section: SectionTag,
  kind: string,
): ScaleByTag | undefined {
  if (modifierType === 'rainbow' || modifierType === 'inherit_tags') return undefined  // 无 amount
  if (random() >= CHANT_SCALE_PROBABILITY) return undefined
  const source = pickScaleSource(section, undefined, kind)
  const scope = pickScaleScope(source)
  if (modifierType === 'multi_fire_add') {
    const perN = Math.floor(random() * (CHANT_TAG_PER_N_MAX - CHANT_TAG_PER_N_MIN + 1)) + CHANT_TAG_PER_N_MIN
    return { type: 'per_n', source, perN, scope }
  }
  return { type: 'count', source, factor: CHANT_TAG_COUNT_FACTOR, scope }
}

// ============================================
// Recipe · 每个 recipe = 一个固定 effect 骨架 + T
// ============================================

/** drip 系：gain_resource 单点产出 · 名字固定 · 资源在生成时随机抽 */
export interface DripRecipe {
  readonly kind: 'drip'
  readonly id: string                  // recipe 标识（dev / 调试用，不显示）
  readonly section: SectionTag
  readonly name_zh: string             // 固定显示名（不再从 vocab 池抽）
  readonly name_en: string
  readonly resourcePool: readonly ResourceType[]  // 可选资源池
  readonly T: number                   // 一关总产出（× resource Lv1 base = 绝对值）
}

/** growth 系：add 关内底分累加 · scope 固定 self · 不挑资源（按 host skill 自身 resource scaling）*/
export interface GrowthRecipe {
  readonly kind: 'growth'
  readonly id: string
  readonly section: SectionTag
  readonly name_zh: string
  readonly name_en: string
  readonly T: number                   // 一关末 cumulativeBaseAdd / skillResourceLv1Base ≈ T
}

/** escalate 系：multiply 关内倍率累加 · scope 固定 self · 资源无关（cumFactor 是 unitless）*/
export interface EscalateRecipe {
  readonly kind: 'escalate'
  readonly id: string
  readonly section: SectionTag
  readonly name_zh: string
  readonly name_en: string
  readonly T: number                   // 一关末 cumulativeFactorAdd ≈ T（产出 × (1+T)）
}

/** chant 系：apply_aura 持续 buff · trigger 固定 passive · scope 随机 · modifier 由 recipe 固定
 *  （每个 modifier 一条独立 recipe，便于独立命名 / 出率 / 调参）·
 *  amount = T（rainbow / inherit_tags 无 amount 字段，T 被忽略）
 */
export interface ChantRecipe {
  readonly kind: 'chant'
  readonly id: string
  readonly section: SectionTag
  readonly name_zh: string
  readonly name_en: string
  /** 固定 modifier（base_add / factor_add 暂无消费端，不可选）*/
  readonly modifier: 'crit_chance_add' | 'output_bonus_pct' | 'multi_fire_add' | 'rainbow' | 'inherit_tags'
  /** 强度预算（crit_chance_add / output_bonus_pct / multi_fire_add 用；rainbow / inherit_tags 忽略）*/
  readonly T: number
}

/** chain 系：fire_target broadcast · scope 排除 self · pick=random · trigger 排除 on_key */
export interface ChainRecipe {
  readonly kind: 'chain'
  readonly id: string
  readonly section: SectionTag
  readonly name_zh: string
  readonly name_en: string
}

/** convert 系：gain_proportional · source 固定为词条所在技能资源 · target 在 resourcePool 随机抽（必与 source 不同）*/
export interface ConvertRecipe {
  readonly kind: 'convert'
  readonly id: string
  readonly section: SectionTag
  readonly name_zh: string
  readonly name_en: string
  readonly resourcePool: readonly ResourceType[]
  readonly T: number  // 一关末（player 持 1 Lv1 source 时）总产出 ≈ T × Lv1[target]
}

/** metabolize 系：convert_resource · 消耗 from 资源、产出 to 资源 ·
 *  与 convert(drink) 区别：drink 读宿主资源持有量产出（不扣除）；metabolize 真扣除 ·
 *  sourceMode 决定 from 的来源：
 *    'non_host'（反刍 regurgitate）：from/to 均排除宿主原资源，从 resourcePool − host 里抽（互异）—— 代谢外部资源
 *    'host'（反吐再食 rr）：from 锁定宿主自身产出资源（病态自我消耗），to 为 resourcePool − from 里抽 */
export interface MetabolizeRecipe {
  readonly kind: 'metabolize'
  readonly id: string
  readonly section: SectionTag
  readonly name_zh: string
  readonly name_en: string
  readonly sourceMode: 'non_host' | 'host'
  // 资源池：可含 base/multiplier —— convert_resource 的 resourceFloor 守护下限（multiplier 不跌破 baseMultiplier、
  // base 词内累加 floor=0），故无需再排除。host 模式下仅约束 to。
  readonly resourcePool: readonly ResourceType[]
  readonly T: number  // 一关产出预算（× Lv1[to] = 绝对值）· 消耗等量 Lv1-单位的 from
}

/** haste 系：grant_haste · 按下绑定键时消耗 1 层 → 额外触发
 *  amount = 每 trigger 固定整数 stack；freqRange 决定 trigger pool 过滤 → 自然守恒总量
 *  典型：amount=1 配 freqRange=[20,30] 一关 ~20-30 极速；
 *        amount=3 配 freqRange=[5,10]  一关 ~15-30 极速（少而大额）
 */
export interface HasteRecipe {
  readonly kind: 'haste'
  readonly id: string
  readonly section: SectionTag
  readonly name_zh: string
  readonly name_en: string
  readonly amount: number           // 每 trigger 整数 stack 数
  readonly freqRange: readonly [number, number]  // 允许的 trigger freq 区间
}

/** teach 系：on_battle_end + gain_skill(recipe_pool) · meta-progression
 *  生成时随机锁定一个 hasTag section（从 ALL_RECIPES 现有 section 集合抽 · 排除 teach 自身防自我教学）
 *  → 同一 teach instance 永远教同一段；不同 instance 不同段（per-shop-roll 多样性）
 */
export interface TeachRecipe {
  readonly kind: 'teach'
  readonly id: string
  readonly section: SectionTag
  readonly name_zh: string
  readonly name_en: string
}

/** imitate 系：on_battle_end + gain_skill(player_skill_pool) · meta-progression
 *  生成时随机锁定一个 PositionRelation（6 种关系）· filter 收紧到宿主键位邻位 ·
 *  每个 instance 锁死一个 posRel（不限段 · 跨段邻位均可复制）
 */
export interface ImitateRecipe {
  readonly kind: 'imitate'
  readonly id: string
  readonly section: SectionTag
  readonly name_zh: string
  readonly name_en: string
}

/** spear_make 系：on_battle_end + upgrade_skill · meta-progression（制造/锻造型）
 *  生成时随机锁定一个 PositionRelation · 关后给该邻位 skill +1 Lv
 */
export interface SpearMakeRecipe {
  readonly kind: 'spear_make'
  readonly id: string
  readonly section: SectionTag
  readonly name_zh: string
  readonly name_en: string
}

/** gaze_follow 系：on_battle_end + graft_affix · meta-progression（读取/嫁接型）
 *  生成时随机锁定一个 PositionRelation · 关后复制该邻位 1 个 V2 词条到宿主
 */
export interface GazeFollowRecipe {
  readonly kind: 'gaze_follow'
  readonly id: string
  readonly section: SectionTag
  readonly name_zh: string
  readonly name_en: string
}

/** crack 系：on_self_fire + per-use 大额 gain_resource · 消耗型「工具」（用完消失）·
 *  与 drip 区别：(1) trigger 固定 on_self_fire（玩家 fire 宿主技能 = 砸一次）;
 *  (2) per-use 固定大额 amount —— 不按 freq 缩放，总产出由 maxUses 上限封顶而非每战 T;
 *  (3) usesRange 覆盖 tool 段默认 maxUses（坚果耐砸，次数多于一般工具）。
 *  resource 在生成时从 resourcePool 随机抽。*/
export interface CrackRecipe {
  readonly kind: 'crack'
  readonly id: string
  readonly section: SectionTag
  readonly name_zh: string
  readonly name_en: string
  readonly resourcePool: readonly ResourceType[]
  readonly amount: number                          // per-use ratio（× resource Lv1 base）· 大额单次产出
  readonly usesRange: readonly [number, number]    // 覆盖 tool 段默认 maxUses（闭区间整数）
}

export type AffixV2Recipe = DripRecipe | GrowthRecipe | EscalateRecipe | ChantRecipe | ChainRecipe | ConvertRecipe | MetabolizeRecipe | HasteRecipe | TeachRecipe | ImitateRecipe | SpearMakeRecipe | GazeFollowRecipe | CrackRecipe

// ============================================
// Scope 池 · 加权抽样 · 范围越广越稀有
// ============================================
// 设计取舍：magnitude 不按 size 缩放（ratio = T/freq 对所有 scope 一致），
// 让范围广的 scope 上限高（每个 target 都拿满）下限低（target 少时贡献趋零）。
// 用 weight 控制稀有度：self 常见，all_skills 极罕见。

interface ScopeEntry {
  readonly selector: TargetSelector
  readonly weight: number          // 加权抽样用，self 高，wide scope 低
}

const ALL_SECTION_TAGS: readonly SectionTag[] = [
  'maintenance', 'locomotion', 'posture', 'agonistic', 'vocal', 'gesture', 'tool', 'abnormal',
]
const MATCHED_RESOURCE_POOL: readonly ResourceType[] = [
  'base', 'score', 'multiplier', 'time', 'shield', 'gold',
]

/** 全 scope 池（aura/growth/escalate/chain 用，含 self）*/
const FULL_SCOPE_POOL: readonly ScopeEntry[] = [
  { selector: { type: 'self' },                                                weight: 100 },
  { selector: { type: 'neighbors', posRel: PositionRelation.Symmetric },        weight: 30 },
  { selector: { type: 'neighbors', posRel: PositionRelation.SameColumn },       weight: 20 },
  { selector: { type: 'neighbors', posRel: PositionRelation.SameFinger },       weight: 20 },
  { selector: { type: 'neighbors', posRel: PositionRelation.Adjacent },         weight: 15 },
  { selector: { type: 'neighbors', posRel: PositionRelation.SameRow },          weight: 5 },
  { selector: { type: 'neighbors', posRel: PositionRelation.SameHand },         weight: 3 },
  { selector: { type: 'all_skills' },                                          weight: 2 },
  // hasted：场上当前处于极速态（haste 层数 ≥ 1）的技能 · 运行时动态范围 · 与 all_skills 同档稀有
  { selector: { type: 'hasted' },                                              weight: 2 },
  // matched_tag：按 section tag 找场上所有挂该 tag 的 affix 所在 skill
  // 每 section 5 weight × 8 sections = 40 total（≈ 15% 命中 matched_tag 抽中）
  ...ALL_SECTION_TAGS.map(tag => ({
    selector: { type: 'matched_tag' as const, tag } as TargetSelector,
    weight: 5,
  })),
  // matched_resource：场上所有该资源 skill
  // 每资源 5 weight × 6 资源 = 30 total
  ...MATCHED_RESOURCE_POOL.map(resource => ({
    selector: { type: 'matched_resource' as const, resource } as TargetSelector,
    weight: 5,
  })),
  // matched_rarity：场上指定稀有度（0-3 词条数）的 skill
  // 每稀有度 3 weight × 4 = 12 total
  ...[0, 1, 2, 3].map(rarity => ({
    selector: { type: 'matched_rarity' as const, rarity } as TargetSelector,
    weight: 3,
  })),
]

/** inherit_tags 的「tag 来源 scope」池（apply_aura.selector 在此 modifier 下语义反转为来源）·
 *  排除 self（继承自身 = no-op）与 hasted（继承不挂靠战斗极速态，resolveSourceScope 对其返空）·
 *  额外纳入 workbench（IN-tray 是 inherit_tags 的签名来源）。其余沿用 FULL_SCOPE_POOL 权重。*/
const INHERIT_TAGS_SOURCE_POOL: readonly ScopeEntry[] = [
  { selector: { type: 'workbench' }, weight: 25 },
  ...FULL_SCOPE_POOL.filter(e => e.selector.type !== 'self' && e.selector.type !== 'hasted'),
]

/** scale-by-tag 的 scope 池 · 决定 scale 计数的范围（"仅监听 scope 内的同 tag 词条数"）·
 *  all_skills 占主（广域基线），辅以 neighbors（键位拓扑）/ matched_resource / matched_rarity 做变化。
 *  neighbors 需宿主键位：已绑定 skill 的 tooltip 可精确预览；shop 未绑定预览只显规则。
 *  不含 self（运行时 = 仅本词条自身，计数退化）/ hasted（运行时动态）。*/
const SCALE_SCOPE_POOL: readonly ScopeEntry[] = [
  { selector: { type: 'all_skills' },                                     weight: 40 },
  { selector: { type: 'neighbors', posRel: PositionRelation.Symmetric },  weight: 6 },
  { selector: { type: 'neighbors', posRel: PositionRelation.SameColumn }, weight: 5 },
  { selector: { type: 'neighbors', posRel: PositionRelation.SameFinger }, weight: 5 },
  { selector: { type: 'neighbors', posRel: PositionRelation.Adjacent },   weight: 5 },
  { selector: { type: 'neighbors', posRel: PositionRelation.SameRow },    weight: 4 },
  { selector: { type: 'neighbors', posRel: PositionRelation.SameHand },   weight: 3 },
  ...MATCHED_RESOURCE_POOL.map(resource => ({
    selector: { type: 'matched_resource' as const, resource } as TargetSelector,
    weight: 4,
  })),
  ...[0, 1, 2, 3].map(rarity => ({
    selector: { type: 'matched_rarity' as const, rarity } as TargetSelector,
    weight: 2,
  })),
]

/** 按 weight 加权随机抽 ScopeEntry */
function pickWeightedScope(pool: readonly ScopeEntry[]): ScopeEntry {
  const total = pool.reduce((s, e) => s + e.weight, 0)
  let roll = random() * total
  for (const e of pool) {
    roll -= e.weight
    if (roll <= 0) return e
  }
  return pool[pool.length - 1]
}

// ============================================
// 公式 · per-event magnitude = T / freq
// ============================================
// 不按 scope size 缩放：范围广的上限高（多 target 都满）下限低（target 少趋零）；
// 用 scope 池权重控制稀有度，而不是稀释每 target 数值。
export function scaleMagnitude(T: number, freq: number): number {
  return T / freq
}

// ============================================
// 生成器
// ============================================

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(random() * arr.length)]
}

// ============================================
// 极速供需预算（方案 B2 · 启动标定 + 需求门控）
// ============================================
// 不变式：给予极速（供给 S，产 grant_haste）始终略高于涉及极速（需求 D，读取极速却不产出）。
// 做法：首次生成时用一条隔离种子流离线 roll 海量 spec，实测当前生成器的 S 与原始需求率 D_raw，
//       解出门控概率 _demandGate，使运行时需求 ≈ S × RATIO < S。
// 因为 S/D_raw 是**实测**而非解析，加任何 recipe/trigger/scope 都被下次标定自动吸收 —— 无需维护修正常数。
// 登记纪律：① classifyHaste 须能认出每个极速消费特征；② 产 grant_haste 的 recipe.kind 须进 HASTE_GRANT_KINDS。

const HASTE_DEMAND_RATIO = 0.85          // 需求 = 供给 × 此值；S − D = S(1−RATIO) > 0，此即"略高"的旋钮
const HASTE_CALIB_SAMPLES = 8000         // 标定采样数（一次性、确定性）
const HASTE_CALIB_SEED = 0x48415354      // "HAST" · 固定种子 → 每会话标定结果一致
/** 产出 grant_haste 的 recipe.kind · 这些 recipe 的需求特征不门控（保留极速自喂回路） */
const HASTE_GRANT_KINDS: ReadonlySet<string> = new Set(['haste'])

let _demandGate = 1        // 默认 1（不门控）· 标定后收紧
let _calibrated = false
let _calibrating = false   // 标定期间需求全放行，以测原始需求率

/** 遍历 effect 树每个节点（含 composite/conditional/stack_release 子节点）*/
function walkEffect(e: EffectSpec, visit: (n: EffectSpec) => void): void {
  visit(e)
  if (e.kind === 'composite') e.effects.forEach(c => walkEffect(c, visit))
  else if (e.kind === 'conditional') { walkEffect(e.then, visit); if (e.else) walkEffect(e.else, visit) }
  else if (e.kind === 'stack_release') walkEffect(e.release, visit)
}
function effectGrantsHaste(e: EffectSpec): boolean {
  let hit = false
  walkEffect(e, n => { if (n.kind === 'grant_haste') hit = true })
  return hit
}
/** effect 是否读取极速状态：hasted selector（selector/target/from）或 by:'hasted' scale 来源 */
function effectReferencesHaste(e: EffectSpec): boolean {
  let hit = false
  walkEffect(e, n => {
    const anyN = n as Record<string, unknown>
    for (const k of ['selector', 'target', 'from'] as const) {
      const v = anyN[k] as TargetSelector | undefined
      if (v && typeof v === 'object' && v.type === 'hasted') hit = true
    }
    const sc = (n as { scale?: ScaleByTag }).scale
    if (sc && sc.source.by === 'hasted') hit = true
  })
  return hit
}
/** 分类一个 spec：grants=产极速（供给）；references=读取极速（on_haste_granted trigger / hasted scope / by:hasted scale）*/
export function classifyHaste(trigger: TriggerSpec, effect: EffectSpec): { grants: boolean; references: boolean } {
  return {
    grants: effectGrantsHaste(effect),
    references: trigger.type === 'on_haste_granted' || effectReferencesHaste(effect),
  }
}

/** 是否放行一次需求特征的发射 · 标定期 / grant recipe 全放行，否则按 _demandGate 掷骰 */
function admitDemand(kind?: string): boolean {
  if (_calibrating) return true
  if (kind !== undefined && HASTE_GRANT_KINDS.has(kind)) return true
  return random() < _demandGate
}

/** 惰性标定：实测 S 与 D_raw，解出 _demandGate 使运行时需求 ≈ S × RATIO */
function ensureHasteCalibrated(): void {
  if (_calibrated) return
  _calibrating = true
  let grants = 0
  let refsOnly = 0
  runWithTempSeed(HASTE_CALIB_SEED, () => {
    for (let i = 0; i < HASTE_CALIB_SAMPLES; i++) {
      const { trigger, effect } = rollAffixV2Spec(pickRecipeForSkill())
      if (effectGrantsHaste(effect)) grants++
      else if (trigger.type === 'on_haste_granted' || effectReferencesHaste(effect)) refsOnly++
    }
  })
  _calibrating = false
  const S = grants / HASTE_CALIB_SAMPLES
  const dRaw = refsOnly / HASTE_CALIB_SAMPLES
  _demandGate = dRaw > 0 ? Math.min(1, Math.max(0, (S * HASTE_DEMAND_RATIO) / dRaw)) : 1
  _calibrated = true
}

/** 加载期预热：提前跑极速预算标定，避免首次生成（如进商店）时同步掉帧。幂等。 */
export function warmupHasteBudget(): void {
  ensureHasteCalibrated()
}

/** 抽 effect/trigger 作用域 · 若抽中 hasted 但需求被门控掉，则从去 hasted 的池里重抽 */
function pickGatedScope(pool: readonly ScopeEntry[], kind: string): TargetSelector {
  const sel = pickWeightedScope(pool).selector
  if (sel.type === 'hasted' && !admitDemand(kind)) {
    return pickWeightedScope(pool.filter(e => e.selector.type !== 'hasted')).selector
  }
  return sel
}

/**
 * 纯 roll：从 recipe 抽出 trigger + effect spec，**不注册**到运行时索引。
 * generateAffixV2 与极速预算标定共用此函数（标定走它避免污染 def 注册表）。
 * @param skillResource  词条所在技能的资源（convert recipe 用作 source 锚点；其他 recipe 不用）
 */
export function rollAffixV2Spec(
  recipe: AffixV2Recipe,
  skillResource?: ResourceType,
): { trigger: TriggerSpec; effect: EffectSpec } {
  // 二级抽样：先 50/50 on_fire vs non-on-fire，再分子类
  const triggerEntry = pickTrigger(recipe.section, recipe.kind)

  let effect: EffectSpec
  let triggerSpec: TriggerSpec = triggerEntry.spec

  if (recipe.kind === 'drip') {
    // drip: 资源随机 · 50% 概率附加 count-scale（来源随机：词条/资源/稀有度/空位 · Bazaar Count synergy）
    const ratio = scaleMagnitude(recipe.T, triggerEntry.freq)
    const resource = pickRandom(recipe.resourcePool)
    const withScale = random() < 0.5
    if (withScale) {
      const source = pickScaleSource(recipe.section, resource, recipe.kind)
      effect = { kind: 'gain_resource', resource, ratio, scale: { type: 'count', source, factor: 0.1, scope: pickScaleScope(source) } }
    } else {
      effect = { kind: 'gain_resource', resource, ratio }
    }
  } else if (recipe.kind === 'growth') {
    // growth: scope 固定 self —— add(底分累加)只对本技能有意义；
    // "+0.02 <宿主资源>" 广播到别的技能（按宿主资源算量、加到对方底分）概念上是糊的
    // （会出现"给产盾技能加 Time"这种无意义组合）。资源无关的广播加成交给 escalate/multiply。
    const ratio = scaleMagnitude(recipe.T, triggerEntry.freq)
    effect = { kind: 'add', ratio }
  } else if (recipe.kind === 'escalate') {
    const sel = pickGatedScope(FULL_SCOPE_POOL, recipe.kind)
    const amount = scaleMagnitude(recipe.T, triggerEntry.freq)
    effect = sel.type === 'self'
      ? { kind: 'multiply', amount }
      : { kind: 'multiply', amount, selector: sel }
  } else if (recipe.kind === 'chant') {
    // chant: trigger 固定 passive；scope 加权随机；modifier 由 recipe 固定（拆分后每条 recipe 一种）
    triggerSpec = { type: 'passive' }
    const modifierType = recipe.modifier
    if (modifierType === 'inherit_tags') {
      // inherit_tags：selector = tag 来源 scope（语义反转，接收方恒为宿主自身）·
      // 无 amount / scale · 来源走专用池（排除 self/hasted no-op，含 workbench=IN-tray）
      const sel = pickGatedScope(INHERIT_TAGS_SOURCE_POOL, recipe.kind)
      effect = { kind: 'apply_aura', selector: sel, modifier: { type: 'inherit_tags' } }
    } else {
      const sel = pickGatedScope(FULL_SCOPE_POOL, recipe.kind)
      const amount = recipe.T
      let modifier: AuraModifier
      switch (modifierType) {
        case 'crit_chance_add':  modifier = { type: 'crit_chance_add', amount };        break
        case 'output_bonus_pct': modifier = { type: 'output_bonus_pct', amount };       break
        case 'multi_fire_add':   modifier = { type: 'multi_fire_add', amount };         break
        case 'rainbow':          modifier = { type: 'rainbow' };                        break
      }
      // 30% 概率挂 scale · rainbow 跳过（无 amount 字段，scale 无意义）
      // 曲线：multi_fire_add → per_n（整数步进）；% 类型 → count（连续）· 来源(词条/资源/稀有度/空位)随机
      const scale = pickChantScale(modifierType, recipe.section, recipe.kind)
      effect = scale
        ? { kind: 'apply_aura', selector: sel, modifier, scale }
        : { kind: 'apply_aura', selector: sel, modifier }
    }
  } else if (recipe.kind === 'convert') {
    // convert: scope 固定 self · source 固定为词条所在 skill 资源 · target 随机（必不同）
    const ratio = scaleMagnitude(recipe.T, triggerEntry.freq)
    const source: ResourceType = skillResource ?? 'score'  // 缺省 score 兜底
    const candidates = recipe.resourcePool.filter(r => r !== source)
    const target = candidates.length > 0 ? pickRandom(candidates) : source  // pool 单项 fallback
    effect = { kind: 'gain_proportional', source, target, ratio }
  } else if (recipe.kind === 'metabolize') {
    // metabolize: 消耗 from、产出 to · from ≠ to
    const ratio = scaleMagnitude(recipe.T, triggerEntry.freq)
    const host: ResourceType = skillResource ?? 'score'
    let from: ResourceType
    let toCandidates: readonly ResourceType[]
    if (recipe.sourceMode === 'host') {
      // 反吐再食 rr：from = 宿主自身产出资源（病态自我消耗）· to 为其余可存资源
      // host 可能是 base/multiplier（不在 resourcePool）→ from 直接取 host，convert_resource
      // 的 have<=0 守卫处理无可消耗情形（per-word 暂存量耗尽即空转）
      from = host
      toCandidates = recipe.resourcePool.filter(r => r !== from)
    } else {
      // 反刍 regurgitate：from/to 均排除宿主原资源（代谢外部资源）
      const candidates = recipe.resourcePool.filter(r => r !== host)
      from = pickRandom(candidates)
      toCandidates = candidates.filter(r => r !== from)
    }
    const to = toCandidates.length > 0 ? pickRandom(toCandidates) : from  // pool 退化兜底
    effect = { kind: 'convert_resource', from, to, ratio }
  } else if (recipe.kind === 'chain') {
    // chain: fire_target broadcast · scope 排除 self · pick=random
    // 排除高频 trigger（freq > 100 = 每键 / 每 2 键 / 每 3 键）防 chain 派发洪水
    let curFreq = triggerEntry.freq
    let retries = 8
    while (curFreq > 100 && retries-- > 0) {
      const retry = pickTrigger(recipe.section, recipe.kind)
      triggerSpec = retry.spec
      curFreq = retry.freq
    }
    const nonSelfScope = FULL_SCOPE_POOL.filter(s => s.selector.type !== 'self')
    const sel = pickGatedScope(nonSelfScope, recipe.kind)
    // 给 selector 注入 pick='random'
    let selector: TargetSelector
    switch (sel.type) {
      case 'neighbors':
        selector = { type: 'neighbors', posRel: sel.posRel, pick: 'random' }
        break
      case 'all_skills':
        selector = { type: 'all_skills', pick: 'random' }
        break
      case 'matched_tag':
        selector = { type: 'matched_tag', tag: sel.tag, pick: 'random' }
        break
      case 'matched_resource':
        selector = { type: 'matched_resource', resource: sel.resource, pick: 'random' }
        break
      case 'hasted':
        selector = { type: 'hasted', pick: 'random' }
        break
      case 'matched_rarity':
        selector = { type: 'matched_rarity', rarity: sel.rarity, pick: 'random' }
        break
      default:
        selector = sel
    }
    effect = { kind: 'fire_target', selector }
  } else if (recipe.kind === 'haste') {
    // haste: 整数 amount per trigger · freqRange 过滤 trigger（重抽至落入区间）
    const [fmin, fmax] = recipe.freqRange
    let curFreq = triggerEntry.freq
    let retries = 16
    while ((curFreq < fmin || curFreq > fmax) && retries-- > 0) {
      const retry = pickTrigger(recipe.section, recipe.kind)
      triggerSpec = retry.spec
      curFreq = retry.freq
    }
    // haste 是 grant recipe → pickGatedScope 不门控 hasted（保留"给极速技能再加速"的自喂回路）
    const sel = pickGatedScope(FULL_SCOPE_POOL, recipe.kind)
    effect = { kind: 'grant_haste', selector: sel, amount: recipe.amount }
  } else if (recipe.kind === 'imitate') {
    // imitate: trigger 固定 on_battle_end(any) · 胜败都触发
    // filter 仅 neighborPosRel：从 6 种 PositionRelation 随机锁 1 个 · 跨战不变
    // 不限 section（跨段邻位也可复制 · narrative "邻位"对应键位拓扑，与 section 解耦）
    // source=player_skill_pool · fallback=skip（无邻位兄弟不强造）
    triggerSpec = { type: 'on_battle_end', result: 'any' }
    const rolledPosRel = pickRandom(POSREL_VALUES)
    effect = {
      kind: 'gain_skill',
      filter: { neighborPosRel: rolledPosRel, notOwned: false },
      source: 'player_skill_pool',
      count: 1,
      levelMode: 'inherit_host',
      fallback: 'skip',
    }
  } else if (recipe.kind === 'spear_make') {
    // spear_make: on_battle_end(any) · 给随机锁定邻位的 skill +1 Lv（制造/锻造）
    triggerSpec = { type: 'on_battle_end', result: 'any' }
    const rolledPosRel = pickRandom(POSREL_VALUES)
    effect = {
      kind: 'upgrade_skill',
      selector: { type: 'neighbors', posRel: rolledPosRel, pick: 'random' },
      amount: 1,
    }
  } else if (recipe.kind === 'gaze_follow') {
    // gaze_follow: on_battle_end(any) · 复制随机锁定邻位 skill 的 1 个 V2 词条到宿主（读取/嫁接）
    triggerSpec = { type: 'on_battle_end', result: 'any' }
    const rolledPosRel = pickRandom(POSREL_VALUES)
    effect = {
      kind: 'graft_affix',
      from: { type: 'neighbors', posRel: rolledPosRel, pick: 'all' },
    }
  } else if (recipe.kind === 'crack') {
    // crack: trigger 固定 on_self_fire（玩家 fire 宿主技能 = 砸一次坚果）·
    // per-use 固定大额产出（不除 freq —— 总量由 maxUses 封顶）· 资源生成时随机抽
    triggerSpec = { type: 'on_self_fire' }
    const resource = pickRandom(recipe.resourcePool)
    effect = { kind: 'gain_resource', resource, ratio: recipe.amount }
  } else if (recipe.kind === 'teach') {
    // teach: trigger 固定 on_battle_end(any) · 胜败都触发
    // filter 三维度复合 · 生成时独立 roll · 每个实例锁死：
    //   - hasTag (100%)：从 recipe_pool 全部段随机 1 段（教学的"对象段"，含 meta 独占的 tool 段）·
    //     meta 词条可被锁/spawn 出来，但其 on_battle_end effect 在 spawn 时被置 noop（见 generateAffixV2 inertMeta）→ 不递归
    //   - resource (40%)：从 6 通用资源随机 1 个（教学的"主产出"）
    //   - rarity (20%)：0-3 等权随机（教学的"水平"）
    // 复合后 widen fallback 顺序 (resource → rarity → allTags → hasTag) 优先保留 section
    triggerSpec = { type: 'on_battle_end', result: 'any' }
    const recipeSections = [...new Set(ALL_RECIPES.map(r => r.section))]
    const rolledSection: SectionTag = pickRandom(recipeSections)

    let teachFilter: SkillFilter = { hasTag: rolledSection, notOwned: false }
    if (random() < 0.4) {
      teachFilter = { ...teachFilter, resource: pickRandom(MATCHED_RESOURCE_POOL) }
    }
    if (random() < 0.2) {
      teachFilter = { ...teachFilter, rarity: Math.floor(random() * 4) }
    }

    effect = {
      kind: 'gain_skill',
      filter: teachFilter,
      source: 'recipe_pool',
      count: 1,
      levelMode: 'inherit_host',
      fallback: 'widen',
    }
  } else {
    throw new Error(`unsupported recipe kind: ${(recipe as { kind: string }).kind}`)
  }

  return { trigger: triggerSpec, effect }
}

/** tool 段词条的 maxUses roll 区间 · crack recipe 用 usesRange 覆盖默认 [MIN, MAX] */
function toolUsesRange(recipe: AffixV2Recipe): readonly [number, number] {
  if (recipe.kind === 'crack') return recipe.usesRange
  return [TOOL_AFFIX_USES_MIN, TOOL_AFFIX_USES_MAX]
}

/**
 * 从 recipe 生成一个动态 AffixV2Definition，并注册到运行时索引。返回 def.id（可塞进 skill.v2Ids）。
 * 首次调用时惰性标定极速供需预算（见 ensureHasteCalibrated）。
 */
export function generateAffixV2(
  recipe: AffixV2Recipe,
  skillResource?: ResourceType,
  opts?: { inertMeta?: boolean },
): string {
  ensureHasteCalibrated()
  const { trigger: triggerSpec, effect: rolledEffect } = rollAffixV2Spec(recipe, skillResource)

  // inertMeta：被 gain_skill spawn 出来的 meta 词条（teach/imitate/spear_make/gaze_follow）
  // 保留段/名/触发器（身份在、tool 段可达），但 effect 置 noop —— on_battle_end 不再
  // 生成/升级/嫁接技能，切断"被生成的技能再去生成技能"的递归 / 滚雪球。
  const effect: EffectSpec =
    opts?.inertMeta && META_RECIPE_KINDS.has(recipe.kind)
      ? { kind: 'noop' }
      : rolledEffect

  const nonce = random().toString(36).slice(2, 8)
  const id = `gen_${recipe.id}_${nonce}`

  // tool/认知段词条生成时 roll 使用次数上限（闭区间整数 · 用完消失）·
  // crack recipe 用 usesRange 覆盖默认 [MIN, MAX]（坚果耐砸 · 次数多于一般工具）
  let maxUses: number | undefined
  if (recipe.section === 'tool') {
    const [usesLo, usesHi] = toolUsesRange(recipe)
    maxUses = usesLo + Math.floor(random() * (usesHi - usesLo + 1))
  }

  const def: AffixV2Definition = {
    id,
    name_zh: recipe.name_zh,
    name_en: recipe.name_en,
    section: recipe.section,
    tags: [recipe.section],
    phase: 'P1',
    trigger: triggerSpec,
    effect,
    ...(maxUses !== undefined ? { maxUses } : {}),
  }
  registerDynamicAffixV2(def)
  return id
}

// ============================================
// Recipe 库（逐一设计）
// ============================================

export const RECIPE_FEED: DripRecipe = {
  kind: 'drip',
  id: 'feed',
  section: 'maintenance',
  name_zh: '进食',
  name_en: 'feed',
  resourcePool: ['score', 'gold', 'shield', 'time', 'multiplier', 'base'],
  T: 3,
}

export const RECIPE_CLIMB: GrowthRecipe = {
  kind: 'growth',
  id: 'climb',
  section: 'locomotion',
  name_zh: '攀爬',
  name_en: 'climb',
  T: 2.5,
}

export const RECIPE_RUN: EscalateRecipe = {
  kind: 'escalate',
  id: 'run',
  section: 'locomotion',
  name_zh: '奔跑',
  name_en: 'run',
  T: 0.5,
}

// chant 系（apply_aura）· 按 modifier 拆分为独立 recipe · 均 posture 段（命名方案A·行为↔机制贴合）
// T 不按 size 缩放（scope 加权抽样已控制稀有度）。

/** crit_chance_add · 毛竖 piloerection — 威吓展示 = 锋芒/致命边缘 */
export const RECIPE_PILOERECTION: ChantRecipe = {
  kind: 'chant',
  id: 'piloerection',
  section: 'posture',
  name_zh: '毛竖',
  name_en: 'piloerection',
  modifier: 'crit_chance_add',
  T: 0.4,
}

/** output_bonus_pct · 举臂 arm-raise — 召集号召 = 群体输出增益 */
export const RECIPE_ARM_RAISE: ChantRecipe = {
  kind: 'chant',
  id: 'arm_raise',
  section: 'posture',
  name_zh: '举臂',
  name_en: 'arm-raise',
  modifier: 'output_bonus_pct',
  T: 0.5,
}

/** multi_fire_add · 双足摇摆步 bipedal-swagger — 摇摆往复 = 重复/额外触发（+1 释放：self→2x）*/
export const RECIPE_BIPEDAL_SWAGGER: ChantRecipe = {
  kind: 'chant',
  id: 'bipedal_swagger',
  section: 'posture',
  name_zh: '双足摇摆步',
  name_en: 'bipedal-swagger',
  modifier: 'multi_fire_add',
  T: 1,
}

/** rainbow · 仰卧 supine — 完全暴露 = 放弃固定身份/输出随机化（无 amount，T 忽略）*/
export const RECIPE_SUPINE: ChantRecipe = {
  kind: 'chant',
  id: 'supine',
  section: 'posture',
  name_zh: '仰卧',
  name_en: 'supine',
  modifier: 'rainbow',
  T: 0,
}

/** inherit_tags · 蜷缩 huddle — 群体蜷挤并入 = tag 并集（无 amount，T 忽略；来源走 INHERIT_TAGS_SOURCE_POOL）*/
export const RECIPE_HUDDLE: ChantRecipe = {
  kind: 'chant',
  id: 'huddle',
  section: 'posture',
  name_zh: '蜷缩',
  name_en: 'huddle',
  modifier: 'inherit_tags',
  T: 0,
}

/** chain 系（fire_target broadcast）· 喘啸 pant-hoot — 远距合唱式叫声引发其他个体加入，
 *  对应"触发其他技能"。broadcast 的天然段是 vocal（archetype registry: broadcast→vocal/agonistic）*/
export const RECIPE_PANT_HOOT: ChainRecipe = {
  kind: 'chain',
  id: 'pant_hoot',
  section: 'vocal',
  name_zh: '喘啸',
  name_en: 'pant-hoot',
}

export const RECIPE_DRINK: ConvertRecipe = {
  kind: 'convert',
  id: 'drink',
  section: 'maintenance',
  name_zh: '饮水',
  name_en: 'drink',
  resourcePool: ['score', 'gold', 'shield', 'time', 'multiplier', 'base'],
  T: 3,
}

export const RECIPE_REGURGITATE: MetabolizeRecipe = {
  kind: 'metabolize',
  id: 'regurgitate',
  section: 'maintenance',
  name_zh: '反刍',
  name_en: 'regurgitate',
  sourceMode: 'non_host',   // 代谢外部资源：from/to 均排除宿主原资源
  // from/to 在此池 − 宿主原资源里抽 · base/multiplier 受 resourceFloor 守护下限，可入池
  resourcePool: ['score', 'gold', 'shield', 'time', 'base', 'multiplier'],
  T: 3,                     // 一关产出 ≈ 3 × Lv1[to]；消耗等量 Lv1-单位的 from
}

/** rr 反吐再食（abnormal）· 参考反刍但 from 锁定宿主自身产出资源（病态自我消耗闭环）·
 *  to 为其余资源（resourcePool − from）· 宿主产 multiplier 时消耗受 baseMultiplier 下限守护、
 *  产 base 时按词内累加量消耗（floor=0）—— 详 affixV2Effect.resourceFloor */
export const RECIPE_RR: MetabolizeRecipe = {
  kind: 'metabolize',
  id: 'rr',
  section: 'abnormal',
  name_zh: '反吐再食',
  name_en: 'regurgitation-reingestion',
  sourceMode: 'host',
  resourcePool: ['score', 'gold', 'shield', 'time', 'base', 'multiplier'],   // 仅约束 to（from = 宿主资源）
  T: 3,                     // 同反刍：一关产出 ≈ 3 × Lv1[to]
}

export const RECIPE_LEAP: HasteRecipe = {
  kind: 'haste',
  id: 'leap',
  section: 'locomotion',
  name_zh: '跳跃',
  name_en: 'leap',
  amount: 1,                // 每 trigger 固定 +1 极速
  freqRange: [20, 30],      // trigger 限 freq=[20,30]，一关约 20-30 极速
}

export const RECIPE_WADGE: GrowthRecipe = {
  kind: 'growth',
  id: 'wadge',
  section: 'maintenance',
  name_zh: '残渣团',
  name_en: 'wadge',
  T: 2.8,                   // 关末累计底分 ≈ 2.8 × 宿主资源 Lv1 base（颊囊食团：关内累积、战后清空）
}

export const RECIPE_NUT_CRACK: CrackRecipe = {
  kind: 'crack',
  id: 'nut_crack',
  section: 'tool',
  name_zh: '砸坚果',
  name_en: 'nut-crack',
  // 大额单次产出 · 资源生成时随机抽（与 feed 同池）
  resourcePool: ['score', 'gold', 'shield', 'time', 'multiplier', 'base'],
  amount: 1.2,              // per-use 大额（全套里最大的单次 gain_resource · ≈ 12× feed 单 tick）
  usesRange: [6, 10],       // 比一般工具（默认 2-4）耐砸 · 战中多次大额但有限，用完即弃
}

export const RECIPE_TEACH: TeachRecipe = {
  kind: 'teach',
  id: 'teach',
  section: 'tool',          // teach 自身 section（Cognitive/Tool 段）
  name_zh: '示教',
  name_en: 'teach',
}

export const RECIPE_IMITATE: ImitateRecipe = {
  kind: 'imitate',
  id: 'imitate',
  section: 'tool',          // imitate 自身 section（Cognitive/Tool 段）
  name_zh: '模仿',
  name_en: 'imitate',
}

export const RECIPE_SPEAR_MAKE: SpearMakeRecipe = {
  kind: 'spear_make',
  id: 'spear_make',
  section: 'tool',
  name_zh: '削矛',
  name_en: 'spear-make',
}

export const RECIPE_GAZE_FOLLOW: GazeFollowRecipe = {
  kind: 'gaze_follow',
  id: 'gaze_follow',
  section: 'tool',
  name_zh: '视线跟随',
  name_en: 'gaze-follow',
}

/** 暂时全部 recipe 列表（生成 shop 选项时遍历此）*/
export const ALL_RECIPES: readonly AffixV2Recipe[] = [
  RECIPE_FEED,
  RECIPE_CLIMB,
  RECIPE_RUN,
  RECIPE_PILOERECTION,
  RECIPE_ARM_RAISE,
  RECIPE_BIPEDAL_SWAGGER,
  RECIPE_SUPINE,
  RECIPE_HUDDLE,
  RECIPE_PANT_HOOT,
  RECIPE_DRINK,
  RECIPE_REGURGITATE,
  RECIPE_RR,
  RECIPE_LEAP,
  RECIPE_WADGE,
  RECIPE_NUT_CRACK,
  RECIPE_TEACH,
  RECIPE_IMITATE,
  RECIPE_SPEAR_MAKE,
  RECIPE_GAZE_FOLLOW,
]

/** drink(convert) 以这些资源为 source 时降权 · time/gold 转化收益偏强，降低出率 */
const DRINK_LOW_WEIGHT_SOURCES: ReadonlySet<string> = new Set(['time', 'gold'])
/** drink 在降权资源上的权重（其余 recipe 等权 1）*/
const DRINK_LOW_WEIGHT = 0.25

/** meta-progression recipe 种类（操纵家族 · teach/imitate/spear_make/gaze_follow）·
 *  这些词条会"创建/改造其他技能"。从 **gain_skill spawn** 中排除（候选池 + spawn 出来技能的随机槽位）：
 *  防递归 spawn / 失控滚雪球——被生成的技能不该自己再带 meta。
 *  但 shop / 普通 generateSkill **不排除**，meta 词条照常刷新出现（玩家主动获取）。
 *  注：排除按 kind（meta 操纵家族），tool/cog 段本身不排除——普通 tool 词条不受影响。 */
export const META_RECIPE_KINDS: ReadonlySet<string> = new Set(['teach', 'imitate', 'spear_make', 'gaze_follow'])

/** 为指定 skill 资源加权抽一个 recipe ·
 *  drink recipe 在 source=time/gold 时降权至 DRINK_LOW_WEIGHT，其余 recipe 恒权 1 ·
 *  opts.excludeMeta：从候选池剔除 meta 操纵家族（gain_skill 按 tag 生成的次要槽位用）*/
export function pickRecipeForSkill(
  skillResource?: ResourceType,
  opts?: { excludeMeta?: boolean },
): AffixV2Recipe {
  const pool = opts?.excludeMeta
    ? ALL_RECIPES.filter(r => !META_RECIPE_KINDS.has(r.kind))
    : ALL_RECIPES
  const lowDrink = skillResource != null && DRINK_LOW_WEIGHT_SOURCES.has(skillResource)
  const weights = pool.map(r =>
    r.kind === 'convert' && lowDrink ? DRINK_LOW_WEIGHT : 1,
  )
  const total = weights.reduce((a, b) => a + b, 0)
  let roll = random() * total
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i]
    if (roll <= 0) return pool[i]
  }
  return pool[pool.length - 1]
}
