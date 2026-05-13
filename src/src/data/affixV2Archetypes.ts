// ============================================
// 打字肉鸽 - 新 Affix 系统 · Archetype 模板
// ============================================
// 6 个通用 archetype，每个 = "trigger × effect kind × scaling" 的招式骨架。
// 设计师选 archetype + 调参数（target / amount / scale）→ 自动产出 AffixV2 spec。
//
// 设计原则：archetype 不绑 trigger（用户决议：trigger 自由 + auto-scaling）。
// archetype 仅描述 effect 形状 + 用途约束。

import type { EffectSpec, TriggerSpec, ConditionSpec, TargetSelector, AuraModifier } from './affixV2Trigger'
import type { SectionTag, Tag } from './affixTags'
import { computeAutoMagnitude } from './affixV2Balance'

// ============================================
// Archetype 标签
// ============================================

export type ArchetypeId =
  | 'drip'           // 持续小额产出
  | 'burst'          // 单次大额（关内成长 base 或 factor 累加）
  | 'stack_release'  // 累积释放
  | 'aura'           // 持续 buff 邻居
  | 'broadcast'      // 触发邻居 fire
  | 'conditional'    // if-then 条件型

// ============================================
// Archetype meta · 玩家可读名 + 设计师约束
// ============================================

export interface ArchetypeMeta {
  readonly id: ArchetypeId
  readonly name_zh: string
  readonly feel: string                          // "持续小额" / "单次爆发" / ...
  readonly typicalSections: readonly SectionTag[]
  readonly typicalTriggers: readonly TriggerSpec['type'][]
  readonly notes?: string
}

export const ARCHETYPE_REGISTRY: Record<ArchetypeId, ArchetypeMeta> = {
  drip: {
    id: 'drip',
    name_zh: '滴灌',
    feel: '高频小额产出，温和累积',
    typicalSections: ['maintenance', 'vocal', 'gesture'],
    typicalTriggers: ['on_key', 'on_word_end', 'every_n_keys'],
    notes: 'effect = gain_resource，amount 反推自 T/f',
  },
  burst: {
    id: 'burst',
    name_zh: '爆发',
    feel: '低频大额单次 / 关内成长',
    typicalSections: ['locomotion', 'agonistic', 'tool'],
    typicalTriggers: ['on_self_fire', 'every_n_keys', 'on_window_mode'],
    notes: 'effect = add (base 累加) 或 multiply (factor 累加) · 关内成长',
  },
  stack_release: {
    id: 'stack_release',
    name_zh: '蓄势释放',
    feel: '累积到阈值后大爆发',
    typicalSections: ['gesture', 'vocal'],
    typicalTriggers: ['on_key', 'on_word_end'],
    notes: 'composite([stack_inc, stack_release(threshold, release_effect, reset)])',
  },
  aura: {
    id: 'aura',
    name_zh: 'aura 持续',
    feel: '常驻 buff 邻居',
    typicalSections: ['posture', 'vocal'],
    typicalTriggers: ['passive'],
    notes: 'apply_aura · K3 仅 fight duration',
  },
  broadcast: {
    id: 'broadcast',
    name_zh: '广播触发',
    feel: '触发邻居 fire',
    typicalSections: ['vocal', 'agonistic'],
    typicalTriggers: ['on_word_end', 'on_self_fire', 'on_fire'],
    notes: 'fire_target · K1 限流 4/sec/source',
  },
  conditional: {
    id: 'conditional',
    name_zh: '条件触发',
    feel: 'if-then 适配情境',
    typicalSections: ['abnormal'],
    typicalTriggers: ['on_self_fire', 'on_word_end'],
    notes: 'conditional 包裹任意 effect；常配 status 占位（K4 D-prime）',
  },
}

// ============================================
// Archetype 模板构造器
// ============================================
// 每个 archetype 提供一个 makeXxxEffect() helper，
// 设计师传参 → 自动构造合规的 EffectSpec。
//
// 调用方式：
//   const effect = makeDripEffect({ section, rarity, trigger, resource: 'score' })
// 内部用 computeAutoMagnitude 反推 ratio，落 gain_resource spec。

interface BaseTemplateParams {
  section: SectionTag
  rarity: 0 | 1 | 2 | 3
  trigger: TriggerSpec
}

/** Archetype 1 · drip 滴灌型 → gain_resource */
export function makeDripEffect(params: BaseTemplateParams & { resource: string }): EffectSpec {
  const ratio = computeAutoMagnitude(params.section, params.rarity, params.trigger)
  return { kind: 'gain_resource', resource: params.resource, ratio }
}

/** Archetype 2a · burst 关内成长 base */
export function makeBurstAddEffect(params: BaseTemplateParams): EffectSpec {
  const ratio = computeAutoMagnitude(params.section, params.rarity, params.trigger)
  return { kind: 'add', ratio }
}

/** Archetype 2b · burst 关内成长 factor */
export function makeBurstMultiplyEffect(params: BaseTemplateParams): EffectSpec {
  // factor delta 不走资源 ratio 归一；用 throughput target 直接当 amount baseline
  const amount = computeAutoMagnitude(params.section, params.rarity, params.trigger)
  return { kind: 'multiply', amount }
}

/** Archetype 3 · stack_release 累积释放 */
export function makeStackReleaseEffect(params: BaseTemplateParams & {
  threshold: number
  releaseEffect: EffectSpec
  reset?: boolean
}): EffectSpec {
  return {
    kind: 'composite',
    effects: [
      { kind: 'stack_inc', amount: 1 },
      { kind: 'stack_release', threshold: params.threshold, release: params.releaseEffect, reset: params.reset !== false },
    ],
  }
}

/** Archetype 4 · aura 持续 buff（不走 magnitude 反推；duration 制）*/
export function makeAuraEffect(params: {
  selector: TargetSelector
  modifier: AuraModifier
}): EffectSpec {
  return { kind: 'apply_aura', selector: params.selector, modifier: params.modifier }
}

/** Archetype 5 · broadcast 触发目标 skill */
export function makeBroadcastEffect(params: {
  selector: TargetSelector
}): EffectSpec {
  return { kind: 'fire_target', selector: params.selector }
}

/** Archetype 6 · conditional 条件型 */
export function makeConditionalEffect(params: {
  when: ConditionSpec
  then: EffectSpec
  fallback?: EffectSpec
}): EffectSpec {
  const result: EffectSpec = { kind: 'conditional', when: params.when, then: params.then }
  if (params.fallback) (result as { else?: EffectSpec }).else = params.fallback
  return result
}

// ============================================
// 缩放助手：在任何 archetype effect 上挂 count_by_tag scale
// ============================================

/** 给已构造的 effect 挂 tag-count scaling（仅 add / multiply / gain_resource 有 scale 字段）*/
export function withTagCountScale(effect: EffectSpec, tag: Tag, factor: number): EffectSpec {
  if (effect.kind === 'add' || effect.kind === 'multiply' || effect.kind === 'gain_resource') {
    return { ...effect, scale: { type: 'tag_count', tag, factor } }
  }
  // 其他 kind 不支持 scale，原样返
  return effect
}
