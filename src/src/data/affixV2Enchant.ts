// ============================================
// 打字肉鸽 - V2 附魔层 · Bazaar-style 统一模板
// ============================================
// 模板：词条被附魔后 → 有对应机制 = 数值×2；无 = 并行触发对应机制 effect
// 4 个附魔：疾 / 暴 / 资(随机 6 资源之一) / 多
// 默认并行 effect 数值常数，无机制分支用

import type { EffectSpec, TargetSelector, AuraModifier } from './affixV2Trigger'

// ===== 常数（无机制分支的并行 effect 数值）=====

export const ENCHANT_HASTE_AMOUNT = 1          // 疾：+1 极速
export const ENCHANT_CRIT_AMOUNT = 0.2         // 暴：+20% 暴击率（crit_chance_add）
export const ENCHANT_RESOURCE_RATIO = 0.1      // 资：ratio 0.1（× Lv.N base）
export const ENCHANT_MULTI_FIRE_AMOUNT = 1     // 多：+1 multi_fire

// ===== EnchantSpec =====

/** 资源附魔的 6 种资源池 · 获取时随机 roll 一个，玩家预览随机结果（不让选）*/
export const ENCHANT_RESOURCE_POOL = ['base', 'score', 'multiplier', 'time', 'shield', 'gold'] as const
export type EnchantResource = typeof ENCHANT_RESOURCE_POOL[number]

export type EnchantSpec =
  | { id: 'haste' }
  | { id: 'crit' }
  | { id: 'resource'; resource: EnchantResource }
  | { id: 'multi_fire' }

export type EnchantId = EnchantSpec['id']

// ===== Selector 继承 helper =====

/** 从 EffectSpec 提取 selector（apply_status 用 target 字段，其它用 selector）·
 *  无 selector 字段的 effect kind 返 undefined → caller fallback 到 self */
function inheritSelector(spec: EffectSpec): TargetSelector | undefined {
  switch (spec.kind) {
    case 'add':
    case 'multiply':
      return spec.selector
    case 'grant_haste':
    case 'fire_target':
    case 'apply_aura':
      return spec.selector
    case 'apply_status':
      return spec.target
    default:
      return undefined
  }
}

// ===== 「有机制」判定 + 数值×2 =====

/** 检查 effect 是否带 enchant 对应的机制；命中返一个 amount×2 的新 effect，否则 null */
function tryDoubleMechanic(spec: EffectSpec, enchant: EnchantSpec): EffectSpec | null {
  switch (enchant.id) {
    case 'haste':
      // 机制 = grant_haste
      if (spec.kind === 'grant_haste') {
        return { ...spec, amount: spec.amount * 2 }
      }
      return null

    case 'crit':
      // 机制 = apply_aura(crit_chance_add)
      if (spec.kind === 'apply_aura' && spec.modifier.type === 'crit_chance_add') {
        const newMod: AuraModifier = { type: 'crit_chance_add', amount: spec.modifier.amount * 2 }
        return { ...spec, modifier: newMod }
      }
      return null

    case 'resource':
      // 机制 = gain_resource(resource === enchant.resource)
      if (spec.kind === 'gain_resource' && spec.resource === enchant.resource) {
        return { ...spec, ratio: spec.ratio * 2 }
      }
      return null

    case 'multi_fire':
      // 机制 = apply_aura(multi_fire_add)
      if (spec.kind === 'apply_aura' && spec.modifier.type === 'multi_fire_add') {
        const newMod: AuraModifier = { type: 'multi_fire_add', amount: spec.modifier.amount * 2 }
        return { ...spec, modifier: newMod }
      }
      return null
  }
}

// ===== 「无机制」并行 effect =====

/** 给定 enchant 构造一个并行 effect · selector 继承自原 effect，缺省 self */
function makeParallelEffect(spec: EffectSpec, enchant: EnchantSpec): EffectSpec {
  const selector: TargetSelector = inheritSelector(spec) ?? { type: 'self' }
  switch (enchant.id) {
    case 'haste':
      return { kind: 'grant_haste', selector, amount: ENCHANT_HASTE_AMOUNT }
    case 'crit':
      return {
        kind: 'apply_aura',
        selector,
        modifier: { type: 'crit_chance_add', amount: ENCHANT_CRIT_AMOUNT },
      }
    case 'resource':
      return { kind: 'gain_resource', resource: enchant.resource, ratio: ENCHANT_RESOURCE_RATIO }
    case 'multi_fire':
      return {
        kind: 'apply_aura',
        selector,
        modifier: { type: 'multi_fire_add', amount: ENCHANT_MULTI_FIRE_AMOUNT },
      }
  }
}

// ===== 主入口：附魔变换 =====

/** 给原 effect 应用附魔，返回最终 effect ·
 *  - 有对应机制 → 数值×2（原 effect 字段调整）
 *  - 无对应机制 → composite([原 effect, 并行 enchant effect])
 *  - 无附魔（enchant === undefined） → 原 effect 透传 */
export function applyEnchantToEffect(spec: EffectSpec, enchant: EnchantSpec | undefined): EffectSpec {
  if (!enchant) return spec
  const doubled = tryDoubleMechanic(spec, enchant)
  if (doubled) return doubled
  const parallel = makeParallelEffect(spec, enchant)
  return { kind: 'composite', effects: [spec, parallel] }
}

// ===== Resource 附魔的随机 roll =====

/** 获取资源附魔时随机抽 1 种资源（caller 提供 randomFn 以接入 seeded random）*/
export function rollEnchantResource(randomFn: () => number): EnchantResource {
  const idx = Math.floor(randomFn() * ENCHANT_RESOURCE_POOL.length)
  return ENCHANT_RESOURCE_POOL[Math.min(idx, ENCHANT_RESOURCE_POOL.length - 1)]
}
