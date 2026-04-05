// ============================================
// 打字肉鸽 - RelicPipeline 遗物管道解析
// ============================================

import { state } from '../../core/state'
import { RELIC_MODIFIER_DEFS, RELIC_FLAGS, RELICS } from '../../data/relics'
import type { RelicBehaviorType, RelicCondition } from '../../data/relics'
import { AFFIX_CATEGORY_MAP } from '../../data/affixes'
import { showFeedback } from '../battle'
import type { ModifierTrigger, PipelineContext, PipelineResult, BehaviorCallbacks } from '../modifiers/ModifierTypes'
import { ModifierRegistry } from '../modifiers/ModifierRegistry'
import { EffectPipeline } from '../modifiers/EffectPipeline'
import { BehaviorExecutor } from '../modifiers/BehaviorExecutor'
import { unbindSkill, getBindingState } from '../bindingManager'

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
 * TODO: 未被调用 — 所有遗物效果均通过纯函数在 applyResource 回调中直接应用。
 * 若 55 个通用遗物实现完毕后仍无使用场景，可连同 RELIC_MODIFIER_DEFS 一起清理。
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
  crit: '暴击型',
  stack: '叠层型',
  topology: '拓扑型',
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
      (a: { type: string }) => AFFIX_CATEGORY_MAP[a.type as keyof typeof AFFIX_CATEGORY_MAP]?.includes(category),
    )
    if (!hasMatchingAffix) toRemove.push(skillId)
  }
  for (const skillId of toRemove) {
    state.affixSkills.delete(skillId)
    state.affixSkillStates.delete(skillId)
    unbindSkill(getBindingState(state), skillId)
  }
  if (toRemove.length > 0) {
    showFeedback(`纯血词条：${toRemove.length}个不符类别技能已移除!`, '#ff0000')
  }
}

/** 类别名 → 编号映射（0=未选，旧编号 2/4 已废弃不复用以保存档兼容） */
const AFFIX_CATEGORY_INDEX: Record<string, number> = {
  numeric: 1,
  // 2: 旧 rhythm（已废弃，不复用）
  topology: 3,
  // 4: 旧 trigger_chain（已废弃，不复用）
  word_sense: 5,
  meta_rule: 6,
  crit: 7,
  stack: 8,
}

/** 编号 → 类别名映射（旧编号 2/4 不映射，读到时返回 undefined→null） */
export const AFFIX_CATEGORY_BY_INDEX: Record<number, string> = {
  1: 'numeric',
  3: 'topology',
  5: 'word_sense',
  6: 'meta_rule',
  7: 'crit',
  8: 'stack',
}

/**
 * 获取 mono_affix 已选类别名（null = 未选/未激活）
 */
export function getMonoAffixCategory(): string | null {
  const idx = state.player.relicStates['mono_affix_category']
  if (!idx || idx <= 0) return null
  return AFFIX_CATEGORY_BY_INDEX[idx] ?? null
}

// ============================================
// Story 36.1: 遗物条件评估 + 行为分发框架
// ============================================

/**
 * 评估遗物条件是否满足
 */
export function evaluateRelicCondition(
  condition: RelicCondition,
  context: RelicConditionContext,
): boolean {
  switch (condition.type) {
    case 'combo_threshold':
      return (context.combo ?? 0) >= (condition.threshold ?? 0)
    case 'multiplier_threshold':
      return (context.multiplier ?? 1) >= (condition.threshold ?? 0)
    case 'skill_count_lt':
      return (context.equippedSkillCount ?? 0) < (condition.threshold ?? 0)
    case 'word_length_gte':
      return (context.wordLength ?? 0) >= (condition.threshold ?? 0)
    case 'word_length_lte':
      return (context.wordLength ?? 0) <= (condition.threshold ?? 0)
    case 'time_elapsed_lt':
      return (context.timeElapsed ?? 0) < (condition.threshold ?? 0)
    case 'stage_type':
      return context.stageType === condition.stageType
    case 'resource_types_gte':
      return (context.resourceTypesThisWord ?? 0) >= (condition.threshold ?? 0)
    default:
      return false
  }
}

/** 遗物条件评估所需的运行时上下文 */
export interface RelicConditionContext {
  combo?: number
  multiplier?: number
  equippedSkillCount?: number
  wordLength?: number
  timeElapsed?: number
  stageType?: 'normal' | 'boss'
  resourceTypesThisWord?: number
}

// === 行为分发注册表 ===

/** 遗物行为处理函数签名 */
export type RelicBehaviorHandler = (relicId: string, context: PipelineContext) => void

/** 已注册的行为处理函数 */
const behaviorHandlers: Map<RelicBehaviorType, RelicBehaviorHandler> = new Map()

/**
 * 注册遗物行为处理函数 — 后续 Stories 在各自模块中调用此函数注册具体行为
 */
export function registerRelicBehavior(
  behaviorType: RelicBehaviorType,
  handler: RelicBehaviorHandler,
): void {
  behaviorHandlers.set(behaviorType, handler)
}

/**
 * 分发遗物行为 — 查找并执行已注册的行为处理函数
 * @returns true 如果找到并执行了处理函数
 */
export function dispatchRelicBehavior(
  behaviorType: RelicBehaviorType,
  relicId: string,
  context: PipelineContext,
): boolean {
  const handler = behaviorHandlers.get(behaviorType)
  if (handler) {
    handler(relicId, context)
    return true
  }
  return false
}

/**
 * 获取所有已注册行为类型（用于测试）
 */
export function getRegisteredBehaviors(): RelicBehaviorType[] {
  return [...behaviorHandlers.keys()]
}

/**
 * 清空所有已注册行为处理函数（用于测试隔离）
 */
export function clearBehaviorHandlers(): void {
  behaviorHandlers.clear()
}
