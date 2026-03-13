// ============================================
// 打字肉鸽 - RelicPipeline 遗物管道解析
// ============================================

import { state } from '../../core/state'
import { RELIC_MODIFIER_DEFS, RELIC_FLAGS, RELICS } from '../../data/relics'
import { AFFIX_CATEGORY_MAP } from '../../data/affixes'
import { showFeedback } from '../battle'
import type { ModifierTrigger, PipelineContext, PipelineResult, BehaviorCallbacks } from '../modifiers/ModifierTypes'
import { ModifierRegistry } from '../modifiers/ModifierRegistry'
import { EffectPipeline } from '../modifiers/EffectPipeline'
import { BehaviorExecutor } from '../modifiers/BehaviorExecutor'

/**
 * 解析遗物效果 — 遍历玩家拥有的遗物，调用工厂注册临时 ModifierRegistry，
 * 通过 EffectPipeline.resolve() 统一计算。
 */
export function resolveRelicEffects(
  trigger: ModifierTrigger,
  context?: PipelineContext,
): PipelineResult {
  const registry = new ModifierRegistry()
  const ctx = { ...context, relicStates: state.player.relicStates }

  for (const relicId of state.player.relics) {
    const factory = RELIC_MODIFIER_DEFS[relicId]
    if (!factory) continue
    const mods = factory(relicId, ctx)
    registry.registerMany(mods.filter(m => m.trigger === trigger))
  }

  return EffectPipeline.resolve(registry, trigger, ctx)
}

/**
 * 解析遗物效果并执行行为
 */
export function resolveRelicEffectsWithBehaviors(
  trigger: ModifierTrigger,
  context?: PipelineContext,
  callbacks?: BehaviorCallbacks,
): PipelineResult {
  const result = resolveRelicEffects(trigger, context)
  if (result.pendingBehaviors.length > 0 && callbacks) {
    BehaviorExecutor.execute(result.pendingBehaviors, callbacks)
  }
  return result
}

/**
 * 查询遗物标记 — 替代 hasRelic() 的语义化查询接口。
 * 非职业专属遗物已删除，大部分 flag 现返回默认值。
 */
export function queryRelicFlag(flag: string): number | boolean {
  switch (flag) {
    case 'price_discount':
      return 0
    case 'connector_lock':
    case 'enchant_lock':
    case 'producer_only':
    case 'white_only':
    case 'chain_affix_lock':
    case 'affix_category_lock':
    case 'glass_cannon':
    case 'time_thief':
    case 'silence_vow':
    case 'doomsday':
      return false
    case 'greedy_hand':
      return 1
    case 'max_skill_level':
    case 'max_skill_count':
      return Infinity
    default:
      return false
  }
}

/**
 * 解析 on_skill_trigger 遗物效果，返回分数倍率和待执行行为。
 */
export function resolveRelicSkillTrigger(
  context: PipelineContext,
  callbacks?: BehaviorCallbacks,
): number {
  const registry = new ModifierRegistry()
  registry.register({
    id: '_relic_base:score', source: '_relic_base', sourceType: 'skill',
    layer: 'base', trigger: 'on_skill_trigger', phase: 'calculate',
    effect: { type: 'score', value: 1, stacking: 'additive' }, priority: 0,
  })
  const relicStates = { ...state.player.relicStates }
  const ctx = { ...context, relicStates }
  for (const relicId of state.player.relics) {
    const factory = RELIC_MODIFIER_DEFS[relicId]
    if (!factory) continue
    const mods = factory(relicId, ctx)
    registry.registerMany(mods.filter(m => m.trigger === 'on_skill_trigger'))
  }
  const result = EffectPipeline.resolve(registry, 'on_skill_trigger', ctx)
  if (result.pendingBehaviors.length > 0 && callbacks) {
    BehaviorExecutor.execute(result.pendingBehaviors, callbacks)
  }
  return result.effects.score || 1
}

/**
 * 初始化遗物可变状态 — 在遗物获取时调用
 */
export function initRelicState(relicId: string): void {
  // === 造词师遗物：学徒笔记 — 元音碎片各 +3 ===
  if (relicId === 'apprentice_notes') {
    for (const vowel of ['a', 'e', 'i', 'o', 'u']) {
      state.fragmentInventory[vowel] = (state.fragmentInventory[vowel] || 0) + 3
    }
  }

  // === 造词师遗物：大师词典 — 全字母碎片各 +2 + 队列 +2 ===
  if (relicId === 'masters_lexicon') {
    for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
      state.fragmentInventory[letter] = (state.fragmentInventory[letter] || 0) + 2
    }
    state.fragmentQueue.push('_', '_')
  }
}

/**
 * 读取遗物可变状态
 */
export function getRelicState(relicId: string): number | undefined {
  return state.player.relicStates[relicId]
}

/**
 * 写入遗物可变状态
 */
export function setRelicState(relicId: string, value: number): void {
  state.player.relicStates[relicId] = value
}

/**
 * 六种词条类别名（用于 mono_affix 类别选择 UI）
 */
export const AFFIX_CATEGORY_LABELS: Record<string, string> = {
  numeric: '数值型',
  rhythm: '节奏型',
  topology: '拓扑型',
  trigger_chain: '触发链型',
  word_sense: '单词感知型',
  meta_rule: '元规则型',
}

/**
 * 设置 mono_affix 已选类别并移除不符合的 affix 技能
 */
export function setMonoAffixCategory(category: string): void {
  state.player.relicStates['mono_affix_category'] = AFFIX_CATEGORY_INDEX[category] ?? 0
  const toRemove: string[] = []
  for (const [skillId, skill] of state.affixSkills) {
    const hasMatchingAffix = skill.affixes.some(
      (a: { type: string }) => AFFIX_CATEGORY_MAP[a.type as keyof typeof AFFIX_CATEGORY_MAP] === category,
    )
    if (!hasMatchingAffix) toRemove.push(skillId)
  }
  for (const skillId of toRemove) {
    state.affixSkills.delete(skillId)
    state.affixSkillStates.delete(skillId)
    const boundKeys = [...state.player.bindings.entries()]
      .filter(([, v]) => v === skillId)
      .map(([k]) => k)
    for (const k of boundKeys) state.player.bindings.delete(k)
  }
  if (toRemove.length > 0) {
    showFeedback(`纯血词条：${toRemove.length}个不符类别技能已移除!`, '#ff0000')
  }
}

/** 类别名 → 编号映射（1-6，0=未选） */
const AFFIX_CATEGORY_INDEX: Record<string, number> = {
  numeric: 1,
  rhythm: 2,
  topology: 3,
  trigger_chain: 4,
  word_sense: 5,
  meta_rule: 6,
}

/** 编号 → 类别名映射 */
export const AFFIX_CATEGORY_BY_INDEX: Record<number, string> = {
  1: 'numeric',
  2: 'rhythm',
  3: 'topology',
  4: 'trigger_chain',
  5: 'word_sense',
  6: 'meta_rule',
}

/**
 * 获取 mono_affix 已选类别名（null = 未选/未激活）
 */
export function getMonoAffixCategory(): string | null {
  const idx = state.player.relicStates['mono_affix_category']
  if (!idx || idx <= 0) return null
  return AFFIX_CATEGORY_BY_INDEX[idx] ?? null
}
