// ============================================
// 打字肉鸽 - RelicPipeline 遗物管道解析
// ============================================
// Story 11.6: 遗物迁移到 Modifier 管道

import { state } from '../../core/state'
import { RELIC_MODIFIER_DEFS, RELIC_FLAGS, RELICS } from '../../data/relics'
import { AFFIX_CATEGORY_MAP } from '../../data/affixes'
import { isProducer } from '../../data/producers'
import { showFeedback } from '../battle'
import type { ModifierTrigger, PipelineContext, PipelineResult, BehaviorCallbacks } from '../modifiers/ModifierTypes'
import { ModifierRegistry } from '../modifiers/ModifierRegistry'
import { EffectPipeline } from '../modifiers/EffectPipeline'
import { BehaviorExecutor } from '../modifiers/BehaviorExecutor'

/**
 * 解析遗物效果 — 遍历玩家拥有的遗物，调用工厂注册临时 ModifierRegistry，
 * 通过 EffectPipeline.resolve() 统一计算。
 *
 * @param trigger 触发事件类型
 * @param context 管道上下文（combo, multiplier, overkill 等）
 * @returns PipelineResult 包含数值效果和待执行行为
 */
export function resolveRelicEffects(
  trigger: ModifierTrigger,
  context?: PipelineContext,
): PipelineResult {
  const registry = new ModifierRegistry()

  // 注入 relicStates 到上下文（ramen 等动态值遗物需要）
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
 *
 * @param trigger 触发事件类型
 * @param context 管道上下文
 * @param callbacks 行为回调
 * @returns PipelineResult
 */
export function resolveRelicEffectsWithBehaviors(
  trigger: ModifierTrigger,
  context?: PipelineContext,
  callbacks?: BehaviorCallbacks,
): PipelineResult {
  const result = resolveRelicEffects(trigger, context)
  if (result.pendingBehaviors.length > 0 && callbacks) {
    BehaviorExecutor.execute(result.pendingBehaviors, 0, callbacks)
  }
  return result
}

/**
 * 查询遗物标记 — 替代 hasRelic() 的语义化查询接口。
 * 用于行为型遗物（不产生数值效果的遗物）。
 *
 * @param flag 标记名称
 * @returns 标记值（数字或 boolean）
 */
export function queryRelicFlag(flag: string): number | boolean {
  switch (flag) {
    case 'price_discount':
      // 幸运硬币：商店折扣 10%
      return state.player.relics.has('lucky_coin') ? 0.1 : 0
    // === 风险回报遗物 ===
    case 'glass_cannon':
      // 玻璃大炮：打错即失败
      return state.player.relics.has('glass_cannon')
    case 'time_thief':
      // 时间窃贼：基础时间减半
      return state.player.relics.has('time_thief')
    case 'greedy_hand':
      // 贪婪之手：价格 ×1.5
      return state.player.relics.has('greedy_hand') ? 1.5 : 1
    case 'silence_vow':
      // 沉默誓约：无法装备技能
      return state.player.relics.has('silence_vow')
    case 'doomsday':
      // 末日倒计时：每过一关 -5s
      return state.player.relics.has('doomsday') ? (state.level - 1) * 5 : 0
    // === T4 限制 Flag (Story 30.1) ===
    case 'connector_lock':
      return (RELIC_FLAGS['connector_lock'] || []).some(id => state.player.relics.has(id))
    case 'enchant_lock':
      return (RELIC_FLAGS['enchant_lock'] || []).some(id => state.player.relics.has(id))
    case 'max_skill_level': {
      const ids = (RELIC_FLAGS['max_skill_level'] || []).filter(id => state.player.relics.has(id))
      if (ids.length === 0) return Infinity
      return Math.min(...ids.map(id => {
        const eff = RELICS[id]?.effects.find(e => e.modifier === 'max_skill_level')
        return eff?.value ?? Infinity
      }))
    }
    // === T4 新 Flag (Story 30.2) ===
    case 'producer_only':
      return (RELIC_FLAGS['producer_only'] || []).some(id => state.player.relics.has(id))
    // === 词条制适配 Flag (Story 35.12) ===
    case 'white_only':
      return (RELIC_FLAGS['white_only'] || []).some(id => state.player.relics.has(id))
    case 'chain_affix_lock':
      return (RELIC_FLAGS['chain_affix_lock'] || []).some(id => state.player.relics.has(id))
    case 'affix_category_lock':
      return false
    case 'max_skill_count': {
      const ids = (RELIC_FLAGS['max_skill_count'] || []).filter(id => state.player.relics.has(id))
      if (ids.length === 0) return Infinity
      return Math.min(...ids.map(id => {
        const eff = RELICS[id]?.effects.find(e => e.modifier === 'max_skill_count')
        return eff?.value ?? Infinity
      }))
    }
    default:
      return false
  }
}

/**
 * 解析 on_skill_trigger 遗物效果，返回分数倍率和待执行行为。
 * 注入 dummy base=1 使 global 层乘法生效，结果 score 即为倍率。
 *
 * @param context 管道上下文（currentSkillCategory, isChainedTrigger, amplifierMaxStacks）
 * @param callbacks 行为回调（onTimeSteal 等）
 * @returns score 倍率（≥1，无遗物时为 1）
 */
export function resolveRelicSkillTrigger(
  context: PipelineContext,
  callbacks?: BehaviorCallbacks,
): number {
  const registry = new ModifierRegistry()
  // dummy base=1: 使 global 层乘法公式 baseSum × enhanceProduct × globalProduct 生效
  registry.register({
    id: '_relic_base:score', source: '_relic_base', sourceType: 'skill',
    layer: 'base', trigger: 'on_skill_trigger', phase: 'calculate',
    effect: { type: 'score', value: 1, stacking: 'additive' }, priority: 0,
  })
  // 注入 relicStates + 词条制动态统计 (Story 35.12)
  const relicStates = { ...state.player.relicStates }
  // affix_spectrum: 不同词条类型数
  if (state.player.relics.has('affix_spectrum')) {
    const types = new Set<string>()
    for (const skill of state.affixSkills.values()) {
      for (const affix of skill.affixes) types.add(affix.type)
    }
    relicStates['_affix_type_count'] = types.size
  }
  // legendary_aura: 传说技能数
  if (state.player.relics.has('legendary_aura')) {
    let count = 0
    for (const skill of state.affixSkills.values()) {
      if (skill.rarity === 3) count++
    }
    relicStates['_legendary_count'] = count
  }
  // quest_momentum: questCompletions 总和
  if (state.player.relics.has('quest_momentum')) {
    let total = 0
    for (const rs of state.affixSkillStates.values()) {
      total += rs.questCompletions ?? 0
    }
    relicStates['_quest_completions_total'] = total
  }
  const ctx = { ...context, relicStates }
  for (const relicId of state.player.relics) {
    const factory = RELIC_MODIFIER_DEFS[relicId]
    if (!factory) continue
    const mods = factory(relicId, ctx)
    registry.registerMany(mods.filter(m => m.trigger === 'on_skill_trigger'))
  }
  const result = EffectPipeline.resolve(registry, 'on_skill_trigger', ctx)
  if (result.pendingBehaviors.length > 0 && callbacks) {
    BehaviorExecutor.execute(result.pendingBehaviors, 0, callbacks)
  }
  return result.effects.score || 1
}

/**
 * 初始化遗物可变状态 — 在遗物获取时调用
 * 仅对需要动态状态的遗物设置初始值
 */
export function initRelicState(relicId: string): void {
  const INITIAL_VALUES: Record<string, number> = {
    campfire_ember: 0,
    star_chart: 0,
    entropy: 30,
    schrodinger_dice: 1.25,
  }
  if (relicId in INITIAL_VALUES) {
    state.player.relicStates[relicId] = INITIAL_VALUES[relicId]
  }

  // === T4 获取时副作用 ===

  // 纯粹之心：移除所有非产出者技能（旧系统）+ 非白装 affix 技能（新系统）
  if (relicId === 'pure_heart') {
    let removedCount = 0
    // 旧系统：移除非产出者
    const toRemove: string[] = []
    for (const [skillId] of state.player.skills) {
      if (!isProducer(skillId)) toRemove.push(skillId)
    }
    for (const skillId of toRemove) {
      state.player.skills.delete(skillId)
      state.player.enchantedSkills.delete(skillId)
      if (state.growthValues) state.growthValues.delete(skillId)
      if (state.amplifierStacks) state.amplifierStacks.delete(skillId)
      const boundKeys = [...state.player.bindings.entries()]
        .filter(([, v]) => v === skillId)
        .map(([k]) => k)
      for (const k of boundKeys) state.player.bindings.delete(k)
    }
    removedCount += toRemove.length
    // 新系统：移除 rarity > 0 的 affix 技能
    const affixToRemove: string[] = []
    for (const [skillId, skill] of state.affixSkills) {
      if (skill.rarity > 0) affixToRemove.push(skillId)
    }
    for (const skillId of affixToRemove) {
      state.affixSkills.delete(skillId)
      state.affixSkillStates.delete(skillId)
      const boundKeys = [...state.player.bindings.entries()]
        .filter(([, v]) => v === skillId)
        .map(([k]) => k)
      for (const k of boundKeys) state.player.bindings.delete(k)
    }
    removedCount += affixToRemove.length
    if (removedCount > 0) {
      showFeedback(`纯粹之心：${removedCount}个非白装技能已移除!`, '#ff0000')
    }
  }

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
    // 队列扩展：追加 2 个空格（getMaxQueueLength 会返回 +2）
    state.fragmentQueue.push('_', '_')
  }


  // 极简主义：将所有已有技能升至 Lv3
  // 注意：checkAutoEnchantment 在 shop.ts 中，此处无法调用（循环依赖）。
  // 升级后的 Lv3 技能的附魔由 checkPendingEnchantments()（shop.ts:131）在商店打开时补偿触发。
  if (relicId === 'minimalist') {
    let upgraded = 0
    for (const [, data] of state.player.skills) {
      if (data.level < 3) {
        data.level = 3
        upgraded++
      }
    }
    if (upgraded > 0) {
      showFeedback(`极简主义：${upgraded}个技能升至 Lv3!`, '#ffe66d')
    }
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
  // 移除不符合类别的 affix 技能
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
