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
  getAffixV2UseLimit,
  type AffixV2Definition,
  type AffixV2Instance,
} from '../data/affixV2'
import type { TriggerSpec, EffectSpec, TargetSelector, ConditionSpec, SkillFilter, ScaleByTag, ScaleCountSource } from '../data/affixV2Trigger'
import { ALLIANCE_BONUS_PCT } from '../data/affixV2Trigger'
import { scopePosAnchor, triggerPosAnchor } from '../data/keyboardTopology'
import { SECTION_TAG_NAMES_ZH, SECTION_TAG_NAMES_EN, type Tag, type SectionTag } from '../data/affixTags'
import { getLocale } from '../demo/demo-i18n'
import { listAllEquipped, getEnchant, previewCountScaleSource } from '../systems/affixV2Equipped'
import { applyEnchantToEffect, getEnchantDisplay, type EnchantSpec } from '../data/affixV2Enchant'
import { RARITY_NAMES, type SkillRarity } from '../data/affixes'

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
/** 稀有度名 · zh 用 RARITY_NAMES(普通/稀有/史诗/传说)，en 用本地映射；越界回退到数字 */
const EN_RARITY: Record<number, string> = { 0: 'Common', 1: 'Rare', 2: 'Epic', 3: 'Legendary' }
function locRarity(n: number): string {
  return (isZh() ? RARITY_NAMES[n as SkillRarity] : EN_RARITY[n]) ?? String(n)
}
function locTag(tag: Tag): string {
  const map = isZh() ? SECTION_TAG_NAMES_ZH : SECTION_TAG_NAMES_EN
  return map[tag as SectionTag] ?? tag
}

/** 把 ratio × Lv1 底分 预算成绝对数（保 2 位小数，整数省略小数）*/
function lv1Amount(resource: string, ratio: number): string {
  const base = RESOURCE_LV1_BASE[resource]
  if (base === undefined) return isZh() ? `${ratio}×Lv1 底分` : `${ratio}×Lv1 base`
  const n = ratio * base
  if (n === 0) return '0'
  if (Number.isInteger(n)) return String(n)
  const rounded = Math.round(n * 100) / 100
  // 非零但 2 位小数四舍五入到 0（高频触发 × 小 base 资源）→ 退化到 1 位有效数字，
  // 避免误导的 "+0"（运行时确有产出，见 affixV2BattleIntegration.applyResourceAmount）
  if (rounded === 0) return parseFloat(n.toPrecision(1)).toString()
  return rounded.toString()
}

// ============================================
// Trigger → 人读文字
// ============================================

export function formatTriggerDescription(trigger: TriggerSpec, host?: HostCtx): string {
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
        // 已绑定技能 → 显示该技能的 trigger 锚（预览=实际）；未绑定 → 显示 rolled posRel
        const rel = host?.skillId ? triggerPosAnchor(host.skillId) : trigger.filter.posRel
        parts.push(zh ? `${locRel(rel)}位置` : `${locRel(rel)} pos`)
      }
      if (trigger.filter.rarity !== undefined) {
        parts.push(zh ? `${locRarity(trigger.filter.rarity)}技能` : `${locRarity(trigger.filter.rarity)} skill`)
      }
      if (trigger.filter.marked !== undefined) {
        parts.push(trigger.filter.marked ? (zh ? '焦点' : 'focus') : (zh ? '非焦点' : 'non-focus'))
      }
      return zh
        ? `任一技能触发时（${parts.join('、')}）`
        : `When any skill fires (${parts.join(', ')})`
    }
    case 'every_n_keys':
      return trigger.n <= 1
        ? (zh ? '每次击键' : 'On keystroke')
        : (zh ? `每 ${trigger.n} 次击键` : `Every ${trigger.n} keystrokes`)
    case 'on_haste_granted': {
      const scope = trigger.scope ?? { type: 'self' as const }
      return scope.type === 'self'
        ? (zh ? '本技能获得极速时' : 'When this skill gains haste')
        : (zh
          ? `${formatSelector(scope, host)}获得极速时`
          : `When ${formatSelector(scope, host)} gains haste`)
    }
    case 'on_haste_emitted': {
      const scope = trigger.scope ?? { type: 'self' as const }
      return scope.type === 'self'
        ? (zh ? '本技能给予极速时' : 'When this skill grants haste')
        : (zh
          ? `${formatSelector(scope, host)}给予极速时`
          : `When ${formatSelector(scope, host)} grants haste`)
    }
    case 'on_battle_start': return zh ? '战斗开始时' : 'On battle start'
    case 'on_battle_end': {
      const result = trigger.result ?? 'win'
      if (result === 'win')  return zh ? '战斗胜利后' : 'On battle won'
      if (result === 'lose') return zh ? '战斗失败后' : 'On battle lost'
      return zh ? '战斗结束后' : 'On battle end'
    }
    case 'on_resource_consumed':
      return trigger.resource
        ? (zh ? `${locResource(trigger.resource)}被消耗时` : `When ${locResource(trigger.resource)} is consumed`)
        : (zh ? '任一资源被消耗时' : 'When any resource is consumed')
    case 'on_removed':
      return zh ? '本技能被移除时' : 'When this skill is removed'
    case 'on_skill_consumed':
      return zh ? '有技能被移除时' : 'When any skill is removed'
    case 'on_ally_joined': {
      const scope = trigger.scope ?? { type: 'self' as const }
      return scope.type === 'self'
        ? (zh ? '本技能加入结盟时' : 'When this skill joins an alliance')
        : (zh
          ? `${formatSelector(scope, host)}加入结盟时`
          : `When ${formatSelector(scope, host)} joins an alliance`)
    }
    case 'on_window_mode': return zh ? `节奏·${trigger.pattern}` : `Rhythm·${trigger.pattern}`
    case 'on_sequence':   return zh ? `序列·${trigger.pattern}` : `Sequence·${trigger.pattern}`
    case 'one_per_window': return zh ? `${trigger.n} 键内仅一次` : `Once per ${trigger.n} keys`
  }
}

// ============================================
// Selector → 人读文字
// ============================================

function formatSelector(sel: TargetSelector, host?: HostCtx): string {
  const zh = isZh()
  const pick = (sel as { pick?: string }).pick
  const pickSuffix = sel.type !== 'self' && pick === 'random' ? (zh ? '（随机一个）' : ' (random one)') : ''
  switch (sel.type) {
    case 'self':              return zh ? '本技能' : 'this skill'
    case 'neighbors': {
      // 已绑定技能 → 显示该技能的 scope 锚（预览=实际）；未绑定 → 显示 rolled posRel
      const rel = host?.skillId ? scopePosAnchor(host.skillId) : sel.posRel
      return zh ? `${locRel(rel)}位置的技能${pickSuffix}` : `${locRel(rel)} skills${pickSuffix}`
    }
    case 'matched_tag':       return zh
      ? `场上${locTag(sel.tag)}类的技能${pickSuffix}`
      : `all ${locTag(sel.tag)} skills on board${pickSuffix}`
    case 'matched_resource':  return zh
      ? `场上产出${locResource(sel.resource)}的技能${pickSuffix}`
      : `all skills producing ${locResource(sel.resource)}${pickSuffix}`
    case 'all_skills':        return zh
      ? `场上所有技能${pickSuffix}`
      : `all skills on board${pickSuffix}`
    case 'hasted':            return zh
      ? `处于极速状态的技能${pickSuffix}`
      : `skills with haste${pickSuffix}`
    case 'marked':            return zh
      ? `当前焦点技能${pickSuffix}`
      : `the focused skill${pickSuffix}`
    case 'allied':            return zh
      ? `结盟中的技能${pickSuffix}`
      : `allied skills${pickSuffix}`
    case 'matched_rarity':    return zh
      ? `${locRarity(sel.rarity)}技能${pickSuffix}`
      : `${locRarity(sel.rarity)} skills${pickSuffix}`
    case 'workbench':         return zh
      ? `IN-tray 未装配的技能${pickSuffix}`
      : `IN-tray (unequipped) skills${pickSuffix}`
    case 'same_word':         return zh
      ? `同词内的技能${pickSuffix}`
      : `skills in the same word${pickSuffix}`
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

/** 当前场上（已装备）含某 tag 的词条数 + scale 因子 · 仅 all_skills scope 可在 tooltip 精确预览
 *  （所有生成的 scale 都是 all_skills · 见 affixV2Generator）；其他 scope 需宿主键位，返回 null 不预览。*/
/** 宿主上下文（已绑定 skill 的 tooltip 才有）· neighbors scope 需键位解析邻居；affixName scope 需 defId 自指计数 */
type HostCtx = { skillId: string; key: string; defId?: string }

function liveScale(scale: ScaleByTag, host?: HostCtx): { count: number; factor: number } | null {
  // 复用运行时同口径的 source/scope 解析（仅监听 scope 内的匹配单位）· 无法解析的上下文 → null 只显规则
  const count = previewCountScaleSource(scale.source, scale.scope, host?.skillId, host?.key, host?.defId)
  if (count === null) return null
  const factor = scale.type === 'count'
    ? 1 + count * scale.factor
    : (scale.perN <= 0 ? 0 : Math.floor(count / scale.perN))
  return { count, factor }
}

/** 当前 scale 因子（可精确算 → 直接折进展示数值；无法预览的 scope 返回 1 不缩放）*/
function liveScaleFactor(scale: ScaleByTag | undefined, host?: HostCtx): number {
  if (!scale) return 1
  const live = liveScale(scale, host)
  return live ? live.factor : 1
}

/** scale 计数单位的人读名 · 词条/资源/稀有度/空位/极速/结盟数/目标分数档/同名词条 */
function scaleSourceUnit(source: ScaleCountSource): string {
  const zh = isZh()
  switch (source.by) {
    case 'tag': {
      const s = (Array.isArray(source.tag) ? source.tag : [source.tag]).map(t => locTag(t as Tag)).join('/')
      return zh ? `「${s}」词条` : `${s} affix`
    }
    case 'resource':
      return zh ? `产「${locResource(source.resource)}」技能` : `${locResource(source.resource)} skill`
    case 'rarity':
      return zh ? `${locRarity(source.rarity)}技能` : `${locRarity(source.rarity)} skill`
    case 'empty':
      return zh ? `「${locRel(source.posRel)}」空位` : `${locRel(source.posRel)} empty slot`
    case 'hasted':
      return zh ? `极速技能` : `hasted skill`
    case 'allied':
      return zh ? `结盟技能` : `allied skill`
    case 'targetScore':
      return zh ? `目标分数档` : `target-score tier`
    case 'affixName':
      return zh ? `携带本词条的技能` : `skill bearing this affix`
  }
}

/** ScaleByTag 规则后缀（仅说明缩放规则 · 主数值已按当前场上因子直接折算，故不再显 ×factor）*/
function formatScaleSuffix(scale: ScaleByTag | undefined): string {
  if (!scale) return ''
  const zh = isZh()
  const unit = scaleSourceUnit(scale.source)
  if (scale.type === 'count') {
    const pct = Math.round(scale.factor * 1000) / 10
    return zh ? `（每个${unit} +${pct}%）` : ` (+${pct}% per ${unit})`
  }
  return zh ? `（每 ${scale.perN} 个${unit}提升一档）` : ` (scales per ${scale.perN} ${unit})`
}

export function formatEffectDescription(effect: EffectSpec, skillResource?: string, defSection?: SectionTag, host?: HostCtx): string {
  const zh = isZh()
  switch (effect.kind) {
    case 'noop':           return '—'
    case 'add': {
      const scaledRatio = effect.ratio * liveScaleFactor(effect.scale, host)
      const v = skillResource
        ? `${lv1Amount(skillResource, scaledRatio)} ${locResource(skillResource)}`
        : zh ? `${Math.round(scaledRatio * 100) / 100}×Lv1 底分` : `${Math.round(scaledRatio * 100) / 100}×Lv1 base`
      // selector 缺省 = self；非 self 显式标 scope（add 写 per-skill aggregate）
      const target = effect.selector ? formatSelector(effect.selector, host) : (zh ? '本技能' : 'this skill')
      return (zh
        ? `${target}产出 +${v}（叠加、出关重置）`
        : `${target} output +${v} (stacks, resets each battle)`) + formatScaleSuffix(effect.scale)
    }
    case 'multiply': {
      const pct = Math.round(effect.amount * liveScaleFactor(effect.scale, host) * 1000) / 10
      const target = effect.selector ? formatSelector(effect.selector, host) : (zh ? '本技能' : 'this skill')
      return (zh
        ? `${target}产出 +${pct}%（叠加、出关重置）`
        : `${target} output +${pct}% (stacks, resets each battle)`) + formatScaleSuffix(effect.scale)
    }
    case 'gain_resource':
      return `+${lv1Amount(effect.resource, effect.ratio * liveScaleFactor(effect.scale, host))} ${locResource(effect.resource)}` + formatScaleSuffix(effect.scale)
    case 'gain_proportional': {
      // source==target（cache 存量翻倍）：产出 = ratio × 当前存量 → 存量 ×(1+ratio)
      if (effect.source === effect.target) {
        const mult = 1 + effect.ratio
        return zh
          ? `当前 ${locResource(effect.target)} 存量 ×${mult}`
          : `current ${locResource(effect.target)} stock ×${mult}`
      }
      // 每 1 Lv1[source] 持有量产出 ratio × Lv1[target] target
      const perUnit = lv1Amount(effect.target, effect.ratio)
      const sourceUnit = lv1Amount(effect.source, 1)
      return zh
        ? `每持有 ${sourceUnit} ${locResource(effect.source)} → +${perUnit} ${locResource(effect.target)}`
        : `per ${sourceUnit} ${locResource(effect.source)} → +${perUnit} ${locResource(effect.target)}`
    }
    case 'convert_resource': {
      // 消耗 from（按自身 Lv1）→ 产出 to（按自身 Lv1）· 1:1 Lv1-单位代谢
      const fromAmt = lv1Amount(effect.from, effect.ratio)
      const toAmt = lv1Amount(effect.to, effect.ratio)
      return zh
        ? `消耗 ${fromAmt} ${locResource(effect.from)} → +${toAmt} ${locResource(effect.to)}`
        : `consume ${fromAmt} ${locResource(effect.from)} → +${toAmt} ${locResource(effect.to)}`
    }
    case 'reclaim_consumed': {
      // 反应式：每当任意资源被消耗，回收其 fraction（同种资源）·
      // 触发条件由 trigger 段（任一资源被消耗时）描述，effect 不再复述以免冗余
      const pct = Math.round(effect.fraction * 100)
      return zh
        ? `回收被消耗量的 ${pct}%（同种资源）`
        : `reclaim ${pct}% of the amount consumed (same resource)`
    }
    case 'grant_haste': {
      // 每 trigger 固定整数 amount stack（amount 来自 recipe.amount，不再除 freq）
      const n = Math.max(1, Math.round(effect.amount))
      return zh
        ? `给 ${formatSelector(effect.selector, host)} +${n} 极速`
        : `grant ${formatSelector(effect.selector, host)} +${n} haste`
    }
    case 'apply_mark':
      // 标记：把 selector 选出的技能设为焦点 → 其它取对象效果优先汇聚（无数值）
      return zh
        ? `标记 ${formatSelector(effect.selector, host)} 为焦点（取对象效果优先指向它）`
        : `mark ${formatSelector(effect.selector, host)} as focus (targeting effects prefer it)`
    case 'apply_ally': {
      // 结盟：把 selector 选出的技能拉入结盟集 → 每个盟员产出 +ALLIANCE_BONUS_PCT × 盟员数
      const pct = Math.round(ALLIANCE_BONUS_PCT * 1000) / 10
      return zh
        ? `让 ${formatSelector(effect.selector, host)} 加入结盟（每个盟员产出 +${pct}%×盟员数）`
        : `${formatSelector(effect.selector, host)} join an alliance (each ally +${pct}% output × ally count)`
    }
    case 'composite':
      return effect.effects.map(e => formatEffectDescription(e, skillResource, defSection, host)).join(zh ? '；' : '; ')
    case 'conditional': {
      const thenStr = formatEffectDescription(effect.then, skillResource, defSection, host)
      const elseStr = effect.else
        ? (zh ? `；否则 ${formatEffectDescription(effect.else, skillResource, defSection, host)}` : `; else ${formatEffectDescription(effect.else, skillResource, defSection, host)}`)
        : ''
      return zh
        ? `若 ${formatCondition(effect.when)}，则 ${thenStr}${elseStr}`
        : `if ${formatCondition(effect.when)}, then ${thenStr}${elseStr}`
    }
    case 'fire_target':
      return zh ? `额外触发 ${formatSelector(effect.selector, host)}` : `extra-fire ${formatSelector(effect.selector, host)}`
    case 'apply_aura': {
      const mod = effect.modifier
      // inherit_tags：selector 语义为「tag 来源 scope」，接收方是宿主自身 → 单独成句
      if (mod.type === 'inherit_tags') {
        return zh
          ? `本技能拥有 ${formatSelector(effect.selector, host)} 的全部 tag`
          : `this skill gains all tags of ${formatSelector(effect.selector, host)}`
      }
      const factor = liveScaleFactor(effect.scale, host)
      const pct = (x: number) => Math.round(x * 1000) / 10
      // 把当前场上因子直接折进光环数值（multi_fire 数量可能为 0 = 暂未生效）
      const amt = ('amount' in mod ? mod.amount : 0) * factor
      const rat = (mod.type === 'base_add' ? mod.ratio : 0) * factor
      const mfa = Math.round(amt * 100) / 100
      let modStr: string
      if (zh) {
        modStr = mod.type === 'base_add' ? `产出 +${pct(rat)}%（基础值加成）` :
                 mod.type === 'factor_add' ? `产出 +${pct(amt)}%（倍率加成）` :
                 mod.type === 'crit_chance_add' ? `暴击率 +${pct(amt)}%` :
                 mod.type === 'multi_fire_add' ? `多重释放 +${mfa}` :
                 mod.type === 'rainbow' ? `产出随机资源` :
                 `产出 +${pct(amt)}%`
        return `给 ${formatSelector(effect.selector, host)} 加光环：${modStr}` + formatScaleSuffix(effect.scale)
      } else {
        modStr = mod.type === 'base_add' ? `output +${pct(rat)}% (base bonus)` :
                 mod.type === 'factor_add' ? `output +${pct(amt)}% (multiplier bonus)` :
                 mod.type === 'crit_chance_add' ? `crit rate +${pct(amt)}%` :
                 mod.type === 'multi_fire_add' ? `multi-fire +${mfa}` :
                 mod.type === 'rainbow' ? `produces random resource` :
                 `output +${pct(amt)}%`
        return `aura on ${formatSelector(effect.selector, host)}: ${modStr}` + formatScaleSuffix(effect.scale)
      }
    }
    case 'apply_status':
      return zh
        ? `给 ${formatSelector(effect.target, host)} 附 ${effect.amount} 层 ${effect.status} 状态`
        : `apply ${effect.amount} ${effect.status} stack(s) to ${formatSelector(effect.target, host)}`
    case 'stack_inc':
      return zh ? `本词条 +${effect.amount ?? 1} 层` : `this affix +${effect.amount ?? 1} stack`
    case 'stack_release': {
      const inner = formatEffectDescription(effect.release, skillResource, defSection, host)
      const reset = effect.reset !== false ? (zh ? '，层数清零' : ', reset stacks') : ''
      return zh
        ? `满 ${effect.threshold} 层时 → ${inner}${reset}`
        : `at ${effect.threshold} stacks → ${inner}${reset}`
    }
    case 'gain_skill': {
      const count = effect.count ?? 1
      const lvStr = formatLevelMode(effect.levelMode)
      const filterStr = formatSkillFilter(effect.filter, defSection)
      const sourceStr = formatGainSkillSource(effect.source ?? 'recipe_pool')
      return zh
        ? `${sourceStr} ${count} 个${filterStr}技能（${lvStr}）`
        : `${sourceStr} ${count} ${filterStr} skill${count > 1 ? 's' : ''} (${lvStr})`
    }
    case 'gain_temp_skill': {
      // 临时技能：在 placement 内空键位生成一个满足 filter 的技能（本场可用），战斗结束移除
      const count = effect.count ?? 1
      const lvStr = formatLevelMode(effect.levelMode)
      const filterStr = formatSkillFilter(effect.filter, defSection)
      const where = formatSelector(effect.placement, host)
      return zh
        ? `在${where}空位生成 ${count} 个${filterStr}临时技能（${lvStr}）· 战斗结束移除`
        : `spawn ${count} temp ${filterStr} skill${count > 1 ? 's' : ''} on a free key in ${where} (${lvStr}) · removed at battle end`
    }
    case 'upgrade_skill':
      return zh
        ? `${formatSelector(effect.selector, host)}升 ${effect.amount} 级`
        : `upgrade ${formatSelector(effect.selector, host)} +${effect.amount} Lv`
    case 'graft_affix':
      return zh
        ? `复制 ${formatSelector(effect.from, host)} 的 1 个词条到本技能`
        : `graft 1 affix from ${formatSelector(effect.from, host)} to this skill`
    case 'consume_skill': {
      // 取代：移除 selector 内（满足 filter 的）1 个技能，获得 ratio× 其基础产出（本场移除，下场恢复）
      const filterStr = effect.filter ? formatSkillFilter(effect.filter, defSection) : ''
      const target = formatSelector(effect.selector, host)
      const nx = `${Math.round(effect.ratio * 100) / 100}×`
      return zh
        ? `移除${target}中 1 个${filterStr}技能（本场），获得其 ${nx} 基础产出`
        : `remove 1 ${filterStr} skill among ${target} (this fight), gain ${nx} its base output`
    }
  }
}

// ============================================
// SkillFilter / levelMode → 人读
// ============================================

type GainSkillLevelMode = 'inherit_host' | { type: 'fixed'; level: number } | { type: 'host_minus'; delta: number }

function formatLevelMode(mode: GainSkillLevelMode | undefined): string {
  const zh = isZh()
  if (!mode || mode === 'inherit_host') return zh ? '与本技能同 Lv' : 'same Lv as host'
  if (mode.type === 'fixed') return zh ? `固定 Lv ${mode.level}` : `Lv ${mode.level}`
  return zh ? `本技能 Lv -${mode.delta}` : `host Lv -${mode.delta}`
}

type GainSkillSource = 'recipe_pool' | 'shop_pool' | 'altar_pool' | 'player_skill_pool'

const ZH_SOURCE_VERB: Record<GainSkillSource, string> = {
  recipe_pool:        '获得',      // 全新生成（recipe 生成）· 措辞用通用动词
  shop_pool:          '商店复制',  // 从商店在架商品深 clone
  altar_pool:         '祭坛召唤',  // 祭坛池（stub）
  player_skill_pool:  '自有复制',  // 从玩家自有 skill 深 clone（排除宿主）
}

const EN_SOURCE_VERB: Record<GainSkillSource, string> = {
  recipe_pool:        'gain',
  shop_pool:          'copy from shop',
  altar_pool:         'summon from altar',
  player_skill_pool:  'clone from inventory',
}

function formatGainSkillSource(source: GainSkillSource): string {
  return (isZh() ? ZH_SOURCE_VERB : EN_SOURCE_VERB)[source] ?? source
}

function formatSkillFilter(filter: SkillFilter, defSection?: SectionTag): string {
  const zh = isZh()
  const parts: string[] = []
  // hasTagFromHost 优先于显式 hasTag · runtime 同语义（覆盖 hasTag）
  // defSection 已知时 → 显示具体段名（"工具类/Tool"）；缺省时退化为"同类"
  if (filter.hasTagFromHost) {
    if (defSection) {
      const sect = locTag(defSection)
      parts.push(zh ? `${sect}类` : sect)
    } else {
      parts.push(zh ? '同类' : 'same kind')
    }
  } else if (filter.hasTag !== undefined) {
    const tags = Array.isArray(filter.hasTag) ? filter.hasTag.map(locTag).join('/') : locTag(filter.hasTag as Tag)
    parts.push(zh ? `含${tags}类` : `tag: ${tags}`)
  }
  if (filter.allTags) {
    parts.push(zh ? `全含 ${filter.allTags.map(locTag).join('+')}` : `tags: ${filter.allTags.map(locTag).join('+')}`)
  }
  if (filter.excludeTag !== undefined) {
    const tags = Array.isArray(filter.excludeTag) ? filter.excludeTag.map(locTag).join('/') : locTag(filter.excludeTag as Tag)
    parts.push(zh ? `排除${tags}` : `not ${tags}`)
  }
  if (filter.resource !== undefined) {
    const rs = Array.isArray(filter.resource) ? filter.resource.map(locResource).join('/') : locResource(filter.resource as string)
    parts.push(zh ? `${rs}产出` : `${rs}-producing`)
  }
  if (filter.neighborPosRel !== undefined) {
    parts.push(zh ? `${locRel(filter.neighborPosRel)}邻位` : `${locRel(filter.neighborPosRel)} neighbor`)
  }
  if (filter.rarity !== undefined) {
    if (typeof filter.rarity === 'number') {
      parts.push(locRarity(filter.rarity))
    } else {
      const min = filter.rarity.min ?? 0
      const max = filter.rarity.max ?? 3
      parts.push(`${locRarity(min)}-${locRarity(max)}`)
    }
  }
  if (parts.length === 0) return zh ? '任意' : 'any'
  return parts.join(zh ? '·' : ' · ')
}

/** 完整描述：trigger + effect 一行 */
export function formatAffixV2Description(def: AffixV2Definition, skillResource?: string): string {
  return `${formatTriggerDescription(def.trigger)}${isZh() ? '：' : ': '}${formatEffectDescription(def.effect, skillResource, def.section)}`
}

// ============================================
// 适配器
// ============================================

/**
 * 把 AffixV2Definition 转为 AffixTooltipInfo。
 *
 * @param skillResource  词条所在技能的资源，用于把 ratio 预算成绝对值
 * @param enchant        若提供，effect 经 applyEnchantToEffect 变换后再格式化；name 加附魔前缀
 */
export function affixV2DefinitionToTooltipInfo(
  def: AffixV2Definition,
  skillResource?: string,
  enchant?: EnchantSpec,
  host?: HostCtx,
): AffixTooltipInfo {
  // 默认 (passive + noop) 不显描述，避免每条都显 "持续 · —"
  const isDefault = def.trigger.type === 'passive' && def.effect.kind === 'noop'
  const baseName = isZh() ? def.name_zh : def.name_en
  const enchantPrefix = enchant ? `[${getEnchantDisplay(enchant, isZh() ? 'zh' : 'en').name}] ` : ''
  const effect = enchant ? applyEnchantToEffect(def.effect, enchant) : def.effect
  const description = isDefault
    ? def.notes
    : `${formatTriggerDescription(def.trigger, host)}${isZh() ? '：' : ': '}${formatEffectDescription(effect, skillResource, def.section, host)}`
  return {
    typeName: enchantPrefix + baseName,
    typeKey: def.id,
    paramSummary: '',
    description,
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

/** 附魔感知的 skill-level tooltip 构造 ·
 *  已绑定 skill（有装备 entry）→ 用 entry.instanceId 查附魔 + 展示附魔后效果
 *  未绑定（如 shop preview）→ 回退到 skill.v2Ids 直接展示原 def
 *
 *  使用：shop / workbench / 任何"展示已拥有 skill 的 tooltip"场景
 */
export function affixV2SkillToTooltipInfo(skill: {
  id: string
  v2Ids?: readonly string[]
  v2Uses?: Record<string, number>
  resource?: string
}): AffixTooltipInfo[] {
  const skillResource = skill.resource
  const entries = listAllEquipped().filter(e => e.skillId === skill.id)
  const out: AffixTooltipInfo[] = []
  if (entries.length > 0) {
    for (const entry of entries) {
      const def = getAffixV2Definition(entry.defId)
      if (!def) continue
      // 已绑定 → 传宿主上下文（skillId + key + defId），neighbors 解析键位邻居、affixName 自指计数
      const info = affixV2DefinitionToTooltipInfo(def, skillResource, getEnchant(entry.instanceId), { skillId: entry.skillId, key: entry.key, defId: entry.defId })
      out.push(withUsesLeft(info, def, skill.v2Uses?.[entry.defId] ?? 0))
    }
    return out
  }
  // fallback: 未绑定 skill（shop preview 等），用 v2Ids 展示原效果（无附魔）
  if (!skill.v2Ids) return out
  for (const defId of skill.v2Ids) {
    const def = getAffixV2Definition(defId)
    if (!def) continue
    const info = affixV2DefinitionToTooltipInfo(def, skillResource)
    out.push(withUsesLeft(info, def, skill.v2Uses?.[defId] ?? 0))
  }
  return out
}

/** tool/认知词条「用完消失」：在 tooltip 描述末尾补一句剩余次数；非 tool 词条原样返回 */
function withUsesLeft(info: AffixTooltipInfo, def: AffixV2Definition, usesConsumed: number): AffixTooltipInfo {
  const limit = getAffixV2UseLimit(def)
  if (limit == null) return info
  const left = Math.max(0, limit - usesConsumed)
  const suffix = isZh() ? `剩余 ${left}/${limit} 次（用完消失）` : `${left}/${limit} uses left (consumed when spent)`
  return {
    ...info,
    description: info.description ? `${info.description}　·　${suffix}` : suffix,
  }
}
