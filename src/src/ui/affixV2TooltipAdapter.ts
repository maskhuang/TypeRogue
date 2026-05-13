// ============================================
// 打字肉鸽 - 新 Affix 系统 · Tooltip 适配器
// ============================================
// 把 AffixV2Definition / AffixV2Instance 转成现有 AffixTooltipInfo 形态，
// 让 KeyTooltip.ts buildAffixSection / buildHeaderSection 不变即可渲染新词条。
//
// 详 docs/design/affix-rewrite-tag-system.md §9

import type { AffixTooltipInfo } from './keyboard/KeyTooltip'
import {
  getAffixV2Definition,
  type AffixV2Definition,
  type AffixV2Instance,
} from '../data/affixV2'
import type { TriggerSpec, EffectSpec, TargetSelector, ConditionSpec } from '../data/affixV2Trigger'
import { SECTION_TAG_NAMES_ZH, SECTION_TAG_NAMES_EN, type Tag, type SectionTag } from '../data/affixTags'
import { getLocale } from '../demo/demo-i18n'

// ============================================
// 词典 · ZH / EN 双语
// ============================================

const ZH_RESOURCE: Record<string, string> = {
  base: '基数', score: '分数', multiplier: '倍率', time: '时间',
  shield: '护盾', gold: '金币', energy: '能量', mutagen: '诱变素',
}
const EN_RESOURCE: Record<string, string> = {
  base: 'Base', score: 'Score', multiplier: 'Mult', time: 'Time',
  shield: 'Shield', gold: 'Gold', energy: 'Energy', mutagen: 'Mutagen',
}

const ZH_REL: Record<string, string> = {
  adjacent: '相邻', sameRow: '同行', sameColumn: '同列',
  sameHand: '同手', sameFinger: '同指', symmetric: '对称',
}
const EN_REL: Record<string, string> = {
  adjacent: 'adjacent', sameRow: 'same-row', sameColumn: 'same-column',
  sameHand: 'same-hand', sameFinger: 'same-finger', symmetric: 'symmetric',
}

/** 资源 → Lv1 基础值（ratio scaling 锚点；详 affixV2BattleIntegration.DEFAULT_LV1_BASES） */
const RESOURCE_LV1_BASE: Record<string, number> = {
  base: 4, score: 11, multiplier: 0.35, time: 0.2,
  shield: 5, gold: 3, energy: 1, mutagen: 1,
}

function isZh(): boolean { return getLocale() === 'zh' }
function locResource(r: string): string { return (isZh() ? ZH_RESOURCE : EN_RESOURCE)[r] ?? r }
function locRel(rel: string | number): string { return (isZh() ? ZH_REL : EN_REL)[String(rel)] ?? String(rel) }
function locTag(tag: Tag): string {
  const map = isZh() ? SECTION_TAG_NAMES_ZH : SECTION_TAG_NAMES_EN
  return map[tag as SectionTag] ?? tag
}

/** 把 ratio × Lv1 底分 预算成绝对数（保 2 位小数，整数省略小数）*/
function lv1Amount(resource: string, ratio: number): string {
  const base = RESOURCE_LV1_BASE[resource]
  if (base === undefined) return isZh() ? `${ratio}×Lv1 底分` : `${ratio}×Lv1 base`
  const n = ratio * base
  return Number.isInteger(n) ? String(n) : (Math.round(n * 100) / 100).toString()
}

// ============================================
// Trigger → 人读文字
// ============================================

export function formatTriggerDescription(trigger: TriggerSpec): string {
  const zh = isZh()
  switch (trigger.type) {
    case 'passive':       return zh ? '常驻' : 'Always-on'
    case 'on_key':        return zh ? '每次击键' : 'On keystroke'
    case 'on_word_end':   return zh ? '每词末' : 'On word end'
    case 'on_self_fire':  return zh ? '本技能触发时' : 'When this skill fires'
    case 'on_fire': {
      if (!trigger.filter) return zh ? '任一技能触发时' : 'When any skill fires'
      const parts: string[] = []
      if (trigger.filter.tag) {
        const tags = Array.isArray(trigger.filter.tag)
          ? trigger.filter.tag.map(locTag).join('/')
          : locTag(trigger.filter.tag)
        parts.push(zh ? `类别 ${tags}` : `tag: ${tags}`)
      }
      if (trigger.filter.resource) {
        parts.push(zh ? `资源 ${locResource(trigger.filter.resource)}` : `resource: ${locResource(trigger.filter.resource)}`)
      }
      if (trigger.filter.is_crit !== undefined) {
        parts.push(trigger.filter.is_crit ? (zh ? '暴击' : 'crit') : (zh ? '非暴击' : 'non-crit'))
      }
      if (trigger.filter.stack_state) {
        parts.push(zh ? `层态 ${trigger.filter.stack_state}` : `stack: ${trigger.filter.stack_state}`)
      }
      if (trigger.filter.posRel !== undefined) {
        parts.push(zh ? '邻位位置' : 'neighbor pos')
      }
      return zh
        ? `任一技能触发时（${parts.join('、')}）`
        : `When any skill fires (${parts.join(', ')})`
    }
    case 'every_n_keys':  return zh ? `每 ${trigger.n} 次击键` : `Every ${trigger.n} keystrokes`
    case 'on_window_mode': return zh ? `节奏·${trigger.pattern}` : `Rhythm·${trigger.pattern}`
    case 'on_sequence':   return zh ? `序列·${trigger.pattern}` : `Sequence·${trigger.pattern}`
    case 'one_per_window': return zh ? `${trigger.n} 键内仅一次` : `Once per ${trigger.n} keys`
  }
}

// ============================================
// Selector → 人读文字
// ============================================

function formatSelector(sel: TargetSelector): string {
  const zh = isZh()
  const pick = (sel as { pick?: string }).pick
  const pickSuffix = sel.type !== 'self' && pick === 'random' ? (zh ? '（随机一个）' : ' (random one)') : ''
  switch (sel.type) {
    case 'self':              return zh ? '本技能' : 'this skill'
    case 'neighbors':         return zh
      ? `${locRel(sel.posRel)}位置的技能${pickSuffix}`
      : `${locRel(sel.posRel)} skills${pickSuffix}`
    case 'matched_tag':       return zh
      ? `场上${locTag(sel.tag)}类的技能${pickSuffix}`
      : `all ${locTag(sel.tag)} skills on board${pickSuffix}`
    case 'matched_resource':  return zh
      ? `场上产出${locResource(sel.resource)}的技能${pickSuffix}`
      : `all skills producing ${locResource(sel.resource)}${pickSuffix}`
    case 'all_skills':        return zh
      ? `场上所有技能${pickSuffix}`
      : `all skills on board${pickSuffix}`
  }
}

// ============================================
// Condition → 人读文字
// ============================================

function formatCondition(cond: ConditionSpec): string {
  const zh = isZh()
  switch (cond.type) {
    case 'is_crit':              return zh ? '本次为暴击' : 'this is a crit'
    case 'word_length_gte':      return zh ? `词长 ≥ ${cond.n}` : `word length ≥ ${cond.n}`
    case 'word_length_lte':      return zh ? `词长 ≤ ${cond.n}` : `word length ≤ ${cond.n}`
    case 'count_tag_gte':        return zh
      ? `场上 ${locTag(cond.tag)} 类技能 ≥ ${cond.n} 个`
      : `≥ ${cond.n} ${locTag(cond.tag)} skills on board`
    case 'count_tag_lte':        return zh
      ? `场上 ${locTag(cond.tag)} 类技能 ≤ ${cond.n} 个`
      : `≤ ${cond.n} ${locTag(cond.tag)} skills on board`
    case 'resource_below':       return zh
      ? `${locResource(cond.resource)} < ${lv1Amount(cond.resource, cond.ratio)}`
      : `${locResource(cond.resource)} < ${lv1Amount(cond.resource, cond.ratio)}`
    case 'resource_above':       return zh
      ? `${locResource(cond.resource)} > ${lv1Amount(cond.resource, cond.ratio)}`
      : `${locResource(cond.resource)} > ${lv1Amount(cond.resource, cond.ratio)}`
    case 'affix_key_count_gte':  return zh
      ? `本词条已累计 ≥ ${cond.n} 次击键`
      : `this affix has counted ≥ ${cond.n} keystrokes`
    case 'has_status':           return zh ? `已附 ${cond.status} 状态` : `has ${cond.status} status`
    case 'status_count_gte':     return zh
      ? `${cond.status} 状态层数 ≥ ${cond.n}`
      : `${cond.status} stacks ≥ ${cond.n}`
  }
}

// ============================================
// Effect → 人读文字
// ============================================

export function formatEffectDescription(effect: EffectSpec, skillResource?: string): string {
  const zh = isZh()
  switch (effect.kind) {
    case 'noop':           return '—'
    case 'add': {
      const v = skillResource
        ? `${lv1Amount(skillResource, effect.ratio)} ${locResource(skillResource)}`
        : zh ? `${effect.ratio}×Lv1 底分` : `${effect.ratio}×Lv1 base`
      return zh
        ? `产出 +${v}（叠加、出关重置）`
        : `output +${v} (stacks, resets each battle)`
    }
    case 'multiply': {
      const pct = Math.round(effect.amount * 1000) / 10
      return zh
        ? `产出 +${pct}%（叠加、出关重置）`
        : `output +${pct}% (stacks, resets each battle)`
    }
    case 'gain_resource':
      return `+${lv1Amount(effect.resource, effect.ratio)} ${locResource(effect.resource)}`
    case 'composite':
      return effect.effects.map(e => formatEffectDescription(e, skillResource)).join(zh ? '；' : '; ')
    case 'conditional': {
      const thenStr = formatEffectDescription(effect.then, skillResource)
      const elseStr = effect.else
        ? (zh ? `；否则 ${formatEffectDescription(effect.else, skillResource)}` : `; else ${formatEffectDescription(effect.else, skillResource)}`)
        : ''
      return zh
        ? `若 ${formatCondition(effect.when)}，则 ${thenStr}${elseStr}`
        : `if ${formatCondition(effect.when)}, then ${thenStr}${elseStr}`
    }
    case 'fire_target':
      return zh ? `额外触发 ${formatSelector(effect.selector)}` : `extra-fire ${formatSelector(effect.selector)}`
    case 'apply_aura': {
      const mod = effect.modifier
      const pct = (x: number) => Math.round(x * 1000) / 10
      let modStr: string
      if (zh) {
        modStr = mod.type === 'base_add' ? `产出 +${pct(mod.ratio)}%（基础值加成）` :
                 mod.type === 'factor_add' ? `产出 +${pct(mod.amount)}%（倍率加成）` :
                 mod.type === 'crit_chance_add' ? `暴击率 +${pct(mod.amount)}%` :
                 `产出 +${pct(mod.amount)}%`
        return `给 ${formatSelector(effect.selector)} 加光环：${modStr}`
      } else {
        modStr = mod.type === 'base_add' ? `output +${pct(mod.ratio)}% (base bonus)` :
                 mod.type === 'factor_add' ? `output +${pct(mod.amount)}% (multiplier bonus)` :
                 mod.type === 'crit_chance_add' ? `crit rate +${pct(mod.amount)}%` :
                 `output +${pct(mod.amount)}%`
        return `aura on ${formatSelector(effect.selector)}: ${modStr}`
      }
    }
    case 'apply_status':
      return zh
        ? `给 ${formatSelector(effect.target)} 附 ${effect.amount} 层 ${effect.status} 状态`
        : `apply ${effect.amount} ${effect.status} stack(s) to ${formatSelector(effect.target)}`
    case 'stack_inc':
      return zh ? `本词条 +${effect.amount ?? 1} 层` : `this affix +${effect.amount ?? 1} stack`
    case 'stack_release': {
      const inner = formatEffectDescription(effect.release, skillResource)
      const reset = effect.reset !== false ? (zh ? '，层数清零' : ', reset stacks') : ''
      return zh
        ? `满 ${effect.threshold} 层时 → ${inner}${reset}`
        : `at ${effect.threshold} stacks → ${inner}${reset}`
    }
  }
}

/** 完整描述：trigger + effect 一行 */
export function formatAffixV2Description(def: AffixV2Definition, skillResource?: string): string {
  return `${formatTriggerDescription(def.trigger)}${isZh() ? '：' : ': '}${formatEffectDescription(def.effect, skillResource)}`
}

// ============================================
// 适配器
// ============================================

/**
 * 把 AffixV2Definition 转为 AffixTooltipInfo。
 *
 * @param skillResource  词条所在技能的资源，用于把 ratio 预算成绝对值
 */
export function affixV2DefinitionToTooltipInfo(def: AffixV2Definition, skillResource?: string): AffixTooltipInfo {
  // 默认 (passive + noop) 不显描述，避免每条都显 "持续 · —"
  const isDefault = def.trigger.type === 'passive' && def.effect.kind === 'noop'
  const name = isZh() ? def.name_zh : def.name_en
  return {
    typeName: name,
    typeKey: def.id,
    paramSummary: '',
    description: isDefault ? def.notes : formatAffixV2Description(def, skillResource),
    section: def.section,
  }
}

/**
 * 把 AffixV2Instance 转为 AffixTooltipInfo。
 */
export function affixV2InstanceToTooltipInfo(inst: AffixV2Instance, skillResource?: string): AffixTooltipInfo | null {
  const def = getAffixV2Definition(inst.defId)
  if (!def) return null
  return affixV2DefinitionToTooltipInfo(def, skillResource)
}

/** 批量转换 */
export function affixV2InstancesToTooltipInfo(
  instances: readonly AffixV2Instance[],
  skillResource?: string,
): AffixTooltipInfo[] {
  const out: AffixTooltipInfo[] = []
  for (const inst of instances) {
    const info = affixV2InstanceToTooltipInfo(inst, skillResource)
    if (info) out.push(info)
  }
  return out
}
