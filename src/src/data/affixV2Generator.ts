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

const BASE_TRIGGER_POOL: readonly TriggerEntry[] = [
  { spec: { type: 'on_word_end' },              freq: 30 },
  { spec: { type: 'on_self_fire' },             freq: 30 },
  { spec: { type: 'on_key' },                   freq: 300 },
  { spec: { type: 'every_n_keys', n: 10 },      freq: 30 },
]

/** on_fire(tag=section)：听本 section 其他技能 fire · freq ≈ 30 词 × 1.5 平均同 section 技能数 */
function makeOnFireTagTrigger(section: SectionTag): TriggerEntry {
  return { spec: { type: 'on_fire', filter: { tag: section } }, freq: 45 }
}

/** on_fire(resource)：听场上指定资源技能 fire · freq ≈ 30 × 1.5 平均同资源技能数 */
function makeOnFireResourceTriggers(): readonly TriggerEntry[] {
  return MATCHED_RESOURCE_POOL.map(resource => ({
    spec: { type: 'on_fire', filter: { resource } } as TriggerSpec,
    freq: 45,
  }))
}

/** on_fire(posRel)：听该位置关系技能 fire · freq ≈ 30 × 平均位置满足技能数（粗估） */
const ONFIRE_POSREL_FREQ: Record<keyof typeof PositionRelation | string, number> = {
  Adjacent:   60,    // ~2 邻位
  SameRow:    90,    // ~3 同行
  SameColumn: 45,    // ~1.5 同列
  SameHand:   120,   // ~4 同手
  SameFinger: 45,    // ~1.5 同指
  Symmetric:  30,    // ~1 镜像
}
function makeOnFirePosRelTriggers(): readonly TriggerEntry[] {
  return [
    PositionRelation.Adjacent, PositionRelation.SameRow, PositionRelation.SameColumn,
    PositionRelation.SameHand, PositionRelation.SameFinger, PositionRelation.Symmetric,
  ].map(posRel => ({
    spec: { type: 'on_fire', filter: { posRel } } as TriggerSpec,
    freq: ONFIRE_POSREL_FREQ[String(posRel)] ?? 60,
  }))
}

/** 构造完整 trigger 池：4 基础 + 1 on_fire(tag=section) + 6 on_fire(resource) + 6 on_fire(posRel) */
function buildTriggerPool(section: SectionTag): readonly TriggerEntry[] {
  return [
    ...BASE_TRIGGER_POOL,
    makeOnFireTagTrigger(section),
    ...makeOnFireResourceTriggers(),
    ...makeOnFirePosRelTriggers(),
  ]
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

export type AffixV2Recipe = DripRecipe | GrowthRecipe | EscalateRecipe | ChantRecipe | ChainRecipe

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
 */
export function generateAffixV2(recipe: AffixV2Recipe): string {
  const triggerPool = buildTriggerPool(recipe.section)
  const triggerEntry = pickRandom(triggerPool)

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
      'crit_chance_add', 'output_bonus_pct', 'base_add', 'factor_add',
    ] as const)
    const amount = recipe.T_byModifier[modifierType]
    let modifier: AuraModifier
    switch (modifierType) {
      case 'base_add':         modifier = { type: 'base_add', ratio: amount };        break
      case 'factor_add':       modifier = { type: 'factor_add', amount };             break
      case 'crit_chance_add':  modifier = { type: 'crit_chance_add', amount };        break
      case 'output_bonus_pct': modifier = { type: 'output_bonus_pct', amount };       break
    }
    effect = { kind: 'apply_aura', selector: scope.selector, modifier }
  } else if (recipe.kind === 'chain') {
    // chain: fire_target broadcast · scope 排除 self · pick=random · trigger 排除 on_key
    if (triggerEntry.spec.type === 'on_key') {
      const filtered = triggerPool.filter(t => t.spec.type !== 'on_key')
      triggerSpec = pickRandom(filtered).spec
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
      default:
        selector = scope.selector
    }
    effect = { kind: 'fire_target', selector }
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
  },
}

export const RECIPE_DRUMMING: ChainRecipe = {
  kind: 'chain',
  id: 'drumming',
  section: 'agonistic',
  name_zh: '击鼓',
  name_en: 'drumming',
}

/** 暂时全部 recipe 列表（生成 shop 选项时遍历此）*/
export const ALL_RECIPES: readonly AffixV2Recipe[] = [
  RECIPE_FEED,
  RECIPE_CLIMB,
  RECIPE_RUN,
  RECIPE_PILOERECTION,
  RECIPE_DRUMMING,
]
