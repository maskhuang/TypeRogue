// ============================================
// 打字肉鸽 - RelicPipeline 遗物管道解析
// ============================================
// Story 11.6: 遗物迁移到 Modifier 管道

import { state } from '../../core/state'
import { RELIC_MODIFIER_DEFS } from '../../data/relics'
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

  for (const relicId of state.player.relics) {
    const factory = RELIC_MODIFIER_DEFS[relicId]
    if (!factory) continue
    const mods = factory(relicId, context)
    registry.registerMany(mods.filter(m => m.trigger === trigger))
  }

  return EffectPipeline.resolve(registry, trigger, context)
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
  for (const relicId of state.player.relics) {
    const factory = RELIC_MODIFIER_DEFS[relicId]
    if (!factory) continue
    const mods = factory(relicId, context)
    registry.registerMany(mods.filter(m => m.trigger === 'on_skill_trigger'))
  }
  const result = EffectPipeline.resolve(registry, 'on_skill_trigger', context)
  if (result.pendingBehaviors.length > 0 && callbacks) {
    BehaviorExecutor.execute(result.pendingBehaviors, 0, callbacks)
  }
  return result.effects.score || 1
}
