// ============================================
// 打字肉鸽 - V2 附魔层 · Bazaar-style 统一模板（注册表派发）
// ============================================
// 模板：词条被附魔后 → 有对应机制 = 数值×2；无 = 并行触发对应机制 effect
//
// 扩展方式：在 ENCHANT_HANDLERS 加一项 + 扩 EnchantSpec union 即可，不改 dispatch。
// 一个 handler 是 { doubleIfMatch, parallel, display } 三件套。

import type { EffectSpec, TargetSelector, AuraModifier } from './affixV2Trigger'

// ===== 常数（无机制分支的并行 effect 数值）=====

export const ENCHANT_HASTE_AMOUNT = 1          // 迅疾：+1 极速
export const ENCHANT_CRIT_AMOUNT = 0.2         // 致命：+20% 暴击率
export const ENCHANT_RESOURCE_RATIO = 0.1      // 资源附魔：ratio 0.1
export const ENCHANT_MULTI_FIRE_AMOUNT = 1     // 闪亮：+1 multi_fire

// 学徒：threshold(skill.level) = 3 × 2^(level-1) → Lv1→2 用 3 次，Lv2→3 用 6 次，Lv3→4 用 12 次...
// 不设 level 上限——V2 baseValues 表仅 4 entries (Lv4 封顶按表查值)，但 skill.level 本身可继续涨，
// 兼容旧 affixes.ts 的 ascend 系（getAscendBaseScale = 1.6^(level-3)）。
export const APPRENTICE_THRESHOLD_BASE = 3

/** 学徒：从当前 skill level 算下一次升级所需 trigger 命中次数 */
export function apprenticeNextThreshold(currentSkillLevel: number): number {
  return APPRENTICE_THRESHOLD_BASE * Math.pow(2, Math.max(0, currentSkillLevel - 1))
}

// ===== EnchantSpec =====

/** 资源附魔的 6 种资源池 · 获取时随机 roll 一个，玩家预览随机结果（不让选）*/
export const ENCHANT_RESOURCE_POOL = ['base', 'score', 'multiplier', 'time', 'shield', 'gold'] as const
export type EnchantResource = typeof ENCHANT_RESOURCE_POOL[number]

export type EnchantSpec =
  | { id: 'haste' }
  | { id: 'crit' }
  | { id: 'resource'; resource: EnchantResource }
  | { id: 'multi_fire' }
  /** 学徒：监听本词条 trigger 命中次数 → 达阈值 → 宿主 skill level++（无上限）
   *  阈值递增 3 → 6 → 12 → 24...（× 2），跨战永久。
   *  effect 本身不变（doubleIfMatch / parallel 均 noop），实际副作用在 hook 层 */
  | { id: 'apprentice' }

export type EnchantId = EnchantSpec['id']
export type EnchantDisplay = { name: string; desc: string }
export type Locale = 'zh' | 'en'

// ===== Selector 继承 helper（公用，独立于具体附魔）=====

/** 从 EffectSpec 提取 selector · apply_status 用 target，其它用 selector ·
 *  无 selector 字段的 effect kind 返 undefined → caller fallback 到 self */
function inheritSelector(spec: EffectSpec): TargetSelector | undefined {
  switch (spec.kind) {
    case 'add':
    case 'multiply':
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

// ===== EnchantHandler 接口 + 注册表 =====

interface EnchantHandler {
  /** 检测 effect 是否带本附魔的「对应机制」· 命中返"数值×2"的新 effect，未命中返 null */
  doubleIfMatch: (effect: EffectSpec, spec: EnchantSpec) => EffectSpec | null
  /** 无机制分支：构造并行 effect（selector 由 caller fallback 到 self 后传入）*/
  parallel: (spec: EnchantSpec, selector: TargetSelector) => EffectSpec
  /** UI 显示信息（按 locale 切 ZH/EN）*/
  display: (spec: EnchantSpec, locale: Locale) => EnchantDisplay
}

// 资源附魔的 display 词表（封装在 handler 内）
const RES_NAMES_ZH: Record<string, string> = {
  base: '稳固', score: '辉煌', multiplier: '倍增', time: '永恒', shield: '坚韧', gold: '镀金',
}
const RES_NAMES_EN: Record<string, string> = {
  base: 'Steadfast', score: 'Resplendent', multiplier: 'Amplified', time: 'Eternal', shield: 'Resilient', gold: 'Gilded',
}
const RES_DISPLAY_ZH: Record<string, string> = {
  base: '基础', score: '分数', multiplier: '倍率', time: '时间', shield: '护盾', gold: '金币',
}

const ENCHANT_HANDLERS: Record<EnchantId, EnchantHandler> = {
  haste: {
    doubleIfMatch: (effect) =>
      effect.kind === 'grant_haste' ? { ...effect, amount: effect.amount * 2 } : null,
    parallel: (_spec, selector) =>
      ({ kind: 'grant_haste', selector, amount: ENCHANT_HASTE_AMOUNT }),
    display: (_spec, locale) => locale === 'zh'
      ? { name: '迅疾', desc: '触发时给目标技能 +1 极速；若词条已含 grant_haste，数值 ×2' }
      : { name: 'Swift', desc: 'On fire: +1 haste to target skill; if affix has grant_haste, amount ×2' },
  },

  crit: {
    doubleIfMatch: (effect) => {
      if (effect.kind === 'apply_aura' && effect.modifier.type === 'crit_chance_add') {
        const newMod: AuraModifier = { type: 'crit_chance_add', amount: effect.modifier.amount * 2 }
        return { ...effect, modifier: newMod }
      }
      return null
    },
    parallel: (_spec, selector) =>
      ({ kind: 'apply_aura', selector, modifier: { type: 'crit_chance_add', amount: ENCHANT_CRIT_AMOUNT } }),
    display: (_spec, locale) => locale === 'zh'
      ? { name: '致命', desc: '触发时挂 +20% 暴击率 aura；若词条已含 crit_chance_add aura，数值 ×2' }
      : { name: 'Lethal', desc: 'On fire: +20% crit rate aura; if affix has crit_chance_add, amount ×2' },
  },

  resource: {
    doubleIfMatch: (effect, spec) => {
      if (spec.id !== 'resource') return null   // type guard for narrowing
      if (effect.kind === 'gain_resource' && effect.resource === spec.resource) {
        return { ...effect, ratio: effect.ratio * 2 }
      }
      return null
    },
    parallel: (spec, _selector) => {
      if (spec.id !== 'resource') throw new Error('resource handler got non-resource spec')
      // gain_resource 没有 selector 字段（产出到 player），故忽略 _selector
      return { kind: 'gain_resource', resource: spec.resource, ratio: ENCHANT_RESOURCE_RATIO }
    },
    display: (spec, locale) => {
      if (spec.id !== 'resource') return { name: '?', desc: '' }
      const r = spec.resource
      const name = locale === 'zh' ? (RES_NAMES_ZH[r] ?? r) : (RES_NAMES_EN[r] ?? r)
      const display = locale === 'zh' ? (RES_DISPLAY_ZH[r] ?? r) : r
      return locale === 'zh'
        ? { name, desc: `触发时额外产出 ${display} (ratio 0.1)；若词条已含 gain_resource(${display})，ratio ×2` }
        : { name, desc: `On fire: extra ${r} (ratio 0.1); if affix has gain_resource(${r}), ratio ×2` }
    },
  },

  multi_fire: {
    doubleIfMatch: (effect) => {
      if (effect.kind === 'apply_aura' && effect.modifier.type === 'multi_fire_add') {
        const newMod: AuraModifier = { type: 'multi_fire_add', amount: effect.modifier.amount * 2 }
        return { ...effect, modifier: newMod }
      }
      return null
    },
    parallel: (_spec, selector) =>
      ({ kind: 'apply_aura', selector, modifier: { type: 'multi_fire_add', amount: ENCHANT_MULTI_FIRE_AMOUNT } }),
    display: (_spec, locale) => locale === 'zh'
      ? { name: '闪亮', desc: '触发时挂 +1 多重释放 aura；若词条已含 multi_fire_add aura，数值 ×2' }
      : { name: 'Shiny', desc: 'On fire: +1 multi-fire aura; if affix has multi_fire_add, amount ×2' },
  },

  // 学徒：effect 完全不变；副作用在 hook 层
  // 注意 noop 经 applyEnchantToEffect 会被包成 composite([orig, noop])——resolveEffect 跳过 noop
  apprentice: {
    doubleIfMatch: () => null,
    parallel: () => ({ kind: 'noop' }),
    display: (_spec, locale) => locale === 'zh'
      ? { name: '学徒', desc: '本词条每触发 N 次，宿主技能等级 +1；N = 3 × 2^(Lv-1)（3, 6, 12, 24...），无上限' }
      : { name: 'Apprentice', desc: 'Every N trigger fires, host skill level +1; N = 3 × 2^(Lv-1) (3, 6, 12, 24...), uncapped' },
  },
}

// ===== 公共 API =====

/** 给原 effect 应用附魔，返回最终 effect ·
 *  - 有对应机制 → 数值×2（原 effect 字段调整）
 *  - 无对应机制 → composite([原 effect, 并行 enchant effect])
 *  - 无附魔（enchant === undefined） → 原 effect 透传 */
export function applyEnchantToEffect(spec: EffectSpec, enchant: EnchantSpec | undefined): EffectSpec {
  if (!enchant) return spec
  const handler = ENCHANT_HANDLERS[enchant.id]
  const doubled = handler.doubleIfMatch(spec, enchant)
  if (doubled) return doubled
  const selector = inheritSelector(spec) ?? { type: 'self' }
  return { kind: 'composite', effects: [spec, handler.parallel(enchant, selector)] }
}

/** 查询附魔的显示信息 · UI 调用入口（替代 restStage 内联的 enchantDisplayInfo）*/
export function getEnchantDisplay(enchant: EnchantSpec, locale: Locale): EnchantDisplay {
  return ENCHANT_HANDLERS[enchant.id].display(enchant, locale)
}

/** 列出全部已注册的 enchant id（UI 调试用）*/
export function listEnchantIds(): readonly EnchantId[] {
  return Object.keys(ENCHANT_HANDLERS) as EnchantId[]
}

// ===== Resource 附魔的随机 roll =====

/** 获取资源附魔时随机抽 1 种资源（caller 提供 randomFn 以接入 seeded random）*/
export function rollEnchantResource(randomFn: () => number): EnchantResource {
  const idx = Math.floor(randomFn() * ENCHANT_RESOURCE_POOL.length)
  return ENCHANT_RESOURCE_POOL[Math.min(idx, ENCHANT_RESOURCE_POOL.length - 1)]
}
