// ============================================
// 打字肉鸽 - V2 词条生成器
// ============================================
// 每个词条 = 一个 EffectSpec（recipe 固定），trigger / 作用范围在生成时随机赋值，
// magnitude 按 trigger 频率 + 作用范围大小 scale 到该 recipe 设定的总贡献 T。
//
// 生成出的 AffixV2Definition 通过 registerDynamicAffixV2 注册进运行时索引，
// 与静态 JSON 词条混用相同 lookup 接口（getAffixV2Definition）。

import type { AffixV2Definition } from './affixV2'
import { registerDynamicAffixV2 } from './affixV2'
import type { TriggerSpec, EffectSpec, FireFilter, AuraModifier, TargetSelector } from './affixV2Trigger'
import type { ResourceType } from '../core/types'
import { random } from '../core/seededRandom'
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

/** 顶层：50% on_fire 家族 / 50% 非 fire（on_word_end / on_key / every_n_keys）*/
function pickTrigger(section: SectionTag): TriggerEntry {
  return random() < 0.5 ? pickOnFireTrigger(section) : pickNonFireTrigger()
}

/** on_fire 家族（含 on_self_fire）· 5 子类等权 · 子类内随机参数 */
function pickOnFireTrigger(section: SectionTag): TriggerEntry {
  const r = random()
  if (r < 0.2) {
    // on_self_fire · 自身 fire
    return { spec: { type: 'on_self_fire' }, freq: 30 }
  }
  if (r < 0.4) {
    // on_fire(tag=本 section)
    return { spec: { type: 'on_fire', filter: { tag: section } }, freq: 45 }
  }
  if (r < 0.6) {
    // on_fire(resource) · 6 资源等权
    const resource = pickRandom(MATCHED_RESOURCE_POOL)
    return { spec: { type: 'on_fire', filter: { resource } }, freq: 45 }
  }
  if (r < 0.8) {
    // on_fire(posRel) · 6 关系等权
    const posRel = pickRandom(POSREL_VALUES)
    return {
      spec: { type: 'on_fire', filter: { posRel } },
      freq: ONFIRE_POSREL_FREQ[String(posRel)] ?? 60,
    }
  }
  // on_fire(is_crit) · true/false 等权
  const isCrit = random() < 0.5
  return {
    spec: { type: 'on_fire', filter: { is_crit: isCrit } },
    freq: isCrit ? 24 : 216,
  }
}

/** 非 fire · 3 子类等权 · every_n_keys 含 N=1 等同 on_key · on_haste_granted 含随机 scope */
function pickNonFireTrigger(): TriggerEntry {
  const r = random()
  if (r < 1 / 3) return { spec: { type: 'on_word_end' }, freq: 30 }
  if (r < 2 / 3) {
    // every_n_keys · N ∈ [1, 30] 随机；N=1 即每次击键
    const n = Math.floor(random() * (EVERY_N_MAX - EVERY_N_MIN + 1)) + EVERY_N_MIN
    return { spec: { type: 'every_n_keys', n }, freq: 300 / n }
  }
  // on_haste_granted · scope 加权随机（self 偏多，wide scope 稀有）·
  // freq 经验值 ~20（依赖场上是否有 grant_haste 源；非 fire 系列里频率粗估）
  const scope = pickWeightedScope(FULL_SCOPE_POOL).selector
  return { spec: { type: 'on_haste_granted', scope }, freq: 20 }
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

/** chant 系：apply_aura 持续 buff · trigger 固定 passive · scope + modifier 随机
 *  amount = T_modifier / scope_size（按 size 反比，total buff "强度预算"维持 T）
 */
export interface ChantRecipe {
  readonly kind: 'chant'
  readonly id: string
  readonly section: SectionTag
  readonly name_zh: string
  readonly name_en: string
  readonly T_byModifier: Readonly<Record<AuraModifier['type'], number>>
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

export type AffixV2Recipe = DripRecipe | GrowthRecipe | EscalateRecipe | ChantRecipe | ChainRecipe | ConvertRecipe | HasteRecipe

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
  // hasted：场上当前处于极速状态的技能 · 运行时动态范围，稀有
  { selector: { type: 'hasted' },                                              weight: 4 },
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

/**
 * 从 recipe 生成一个动态 AffixV2Definition，并注册到运行时索引。
 * 返回 def.id（可塞进 skill.v2Ids）。
 *
 * @param skillResource  词条所在技能的资源（convert recipe 用作 source 锚点；其他 recipe 不用）
 */
export function generateAffixV2(recipe: AffixV2Recipe, skillResource?: ResourceType): string {
  // 二级抽样：先 50/50 on_fire vs non-on-fire，再分子类
  const triggerEntry = pickTrigger(recipe.section)

  let effect: EffectSpec
  let triggerSpec: TriggerSpec = triggerEntry.spec

  if (recipe.kind === 'drip') {
    // drip: scope 固定 self · 资源随机
    const ratio = scaleMagnitude(recipe.T, triggerEntry.freq)
    const resource = pickRandom(recipe.resourcePool)
    effect = { kind: 'gain_resource', resource, ratio }
  } else if (recipe.kind === 'growth') {
    // growth: scope 加权随机（self 常见，wide scope 稀有）
    const scope = pickWeightedScope(FULL_SCOPE_POOL)
    const ratio = scaleMagnitude(recipe.T, triggerEntry.freq)
    effect = scope.selector.type === 'self'
      ? { kind: 'add', ratio }
      : { kind: 'add', ratio, selector: scope.selector }
  } else if (recipe.kind === 'escalate') {
    const scope = pickWeightedScope(FULL_SCOPE_POOL)
    const amount = scaleMagnitude(recipe.T, triggerEntry.freq)
    effect = scope.selector.type === 'self'
      ? { kind: 'multiply', amount }
      : { kind: 'multiply', amount, selector: scope.selector }
  } else if (recipe.kind === 'chant') {
    // chant: trigger 固定 passive；scope 与 modifier 加权随机；amount 不按 size 缩放
    triggerSpec = { type: 'passive' }
    const scope = pickWeightedScope(FULL_SCOPE_POOL)
    const modifierType = pickRandom([
      'crit_chance_add', 'output_bonus_pct', 'base_add', 'factor_add', 'multi_fire_add',
    ] as const)
    const amount = recipe.T_byModifier[modifierType]
    let modifier: AuraModifier
    switch (modifierType) {
      case 'base_add':         modifier = { type: 'base_add', ratio: amount };        break
      case 'factor_add':       modifier = { type: 'factor_add', amount };             break
      case 'crit_chance_add':  modifier = { type: 'crit_chance_add', amount };        break
      case 'output_bonus_pct': modifier = { type: 'output_bonus_pct', amount };       break
      case 'multi_fire_add':   modifier = { type: 'multi_fire_add', amount };         break
    }
    effect = { kind: 'apply_aura', selector: scope.selector, modifier }
  } else if (recipe.kind === 'convert') {
    // convert: scope 固定 self · source 固定为词条所在 skill 资源 · target 随机（必不同）
    const ratio = scaleMagnitude(recipe.T, triggerEntry.freq)
    const source: ResourceType = skillResource ?? 'score'  // 缺省 score 兜底
    const candidates = recipe.resourcePool.filter(r => r !== source)
    const target = candidates.length > 0 ? pickRandom(candidates) : source  // pool 单项 fallback
    effect = { kind: 'gain_proportional', source, target, ratio }
  } else if (recipe.kind === 'chain') {
    // chain: fire_target broadcast · scope 排除 self · pick=random
    // 排除高频 trigger（freq > 100 = 每键 / 每 2 键 / 每 3 键）防 chain 派发洪水
    let curFreq = triggerEntry.freq
    let retries = 8
    while (curFreq > 100 && retries-- > 0) {
      const retry = pickTrigger(recipe.section)
      triggerSpec = retry.spec
      curFreq = retry.freq
    }
    const nonSelfScope = FULL_SCOPE_POOL.filter(s => s.selector.type !== 'self')
    const scope = pickWeightedScope(nonSelfScope)
    // 给 selector 注入 pick='random'
    let selector: TargetSelector
    switch (scope.selector.type) {
      case 'neighbors':
        selector = { type: 'neighbors', posRel: scope.selector.posRel, pick: 'random' }
        break
      case 'all_skills':
        selector = { type: 'all_skills', pick: 'random' }
        break
      case 'matched_tag':
        selector = { type: 'matched_tag', tag: scope.selector.tag, pick: 'random' }
        break
      case 'matched_resource':
        selector = { type: 'matched_resource', resource: scope.selector.resource, pick: 'random' }
        break
      case 'hasted':
        selector = { type: 'hasted', pick: 'random' }
        break
      default:
        selector = scope.selector
    }
    effect = { kind: 'fire_target', selector }
  } else if (recipe.kind === 'haste') {
    // haste: 整数 amount per trigger · freqRange 过滤 trigger（重抽至落入区间）
    const [fmin, fmax] = recipe.freqRange
    let curFreq = triggerEntry.freq
    let retries = 16
    while ((curFreq < fmin || curFreq > fmax) && retries-- > 0) {
      const retry = pickTrigger(recipe.section)
      triggerSpec = retry.spec
      curFreq = retry.freq
    }
    const scope = pickWeightedScope(FULL_SCOPE_POOL)
    effect = { kind: 'grant_haste', selector: scope.selector, amount: recipe.amount }
  } else {
    throw new Error(`unsupported recipe kind: ${(recipe as { kind: string }).kind}`)
  }

  const nonce = random().toString(36).slice(2, 8)
  const id = `gen_${recipe.id}_${nonce}`

  const def: AffixV2Definition = {
    id,
    name_zh: recipe.name_zh,
    name_en: recipe.name_en,
    section: recipe.section,
    tags: [recipe.section],
    phase: 'P1',
    trigger: triggerSpec,
    effect,
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

export const RECIPE_PILOERECTION: ChantRecipe = {
  kind: 'chant',
  id: 'piloerection',
  section: 'posture',
  name_zh: '毛竖',
  name_en: 'piloerection',
  // T per modifier · 不按 size 缩放（scope 加权抽样已控制稀有度）
  T_byModifier: {
    crit_chance_add:   0.4,
    output_bonus_pct:  0.5,
    base_add:          0.5,
    factor_add:        0.5,
    multi_fire_add:    1,    // +1 释放（self → 2x；adjacent 4 邻 → 每邻位 +1 各自双发）
  },
}

export const RECIPE_DRUMMING: ChainRecipe = {
  kind: 'chain',
  id: 'drumming',
  section: 'agonistic',
  name_zh: '击鼓',
  name_en: 'drumming',
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

export const RECIPE_LEAP: HasteRecipe = {
  kind: 'haste',
  id: 'leap',
  section: 'locomotion',
  name_zh: '跳跃',
  name_en: 'leap',
  amount: 1,                // 每 trigger 固定 +1 极速
  freqRange: [20, 30],      // trigger 限 freq=[20,30]，一关约 20-30 极速
}

/** 暂时全部 recipe 列表（生成 shop 选项时遍历此）*/
export const ALL_RECIPES: readonly AffixV2Recipe[] = [
  RECIPE_FEED,
  RECIPE_CLIMB,
  RECIPE_RUN,
  RECIPE_PILOERECTION,
  RECIPE_DRUMMING,
  RECIPE_DRINK,
  RECIPE_LEAP,
]
