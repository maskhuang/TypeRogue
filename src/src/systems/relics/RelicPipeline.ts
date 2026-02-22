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
    case 'perfectionist_streak':
      // 完美主义者：是否启用完美连击加成
      return state.player.relics.has('perfectionist')
    case 'chain_amplifier':
      // 连锁放大器：echo/ripple 额外触发一次
      return state.player.relics.has('chain_amplifier')
    case 'fortress_shield_bonus':
      // 铁壁：shield 额外 +2
      return state.player.relics.has('fortress') ? 2 : 0
    case 'fortress_sentinel_bonus':
      // 铁壁：sentinel 每层护盾额外 +1 分
      return state.player.relics.has('fortress') ? 1 : 0
    case 'passive_mastery':
      // 被动大师：被动技能 enhance 效果翻倍
      return state.player.relics.has('passive_mastery')
    case 'gamblers_creed':
      // 赌徒信条：gamble 100% 成功
      return state.player.relics.has('gamblers_creed')
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
 * 为技能管道注入遗物 global 层 Modifier。
 * 目前仅 golden_keyboard 影响技能管道（技能效果 +25%）。
 *
 * @param registry 技能的 ModifierRegistry（会被修改）
 * @param context 管道上下文
 */
export function injectRelicModifiers(
  registry: ModifierRegistry,
  context?: PipelineContext,
): void {
  for (const relicId of state.player.relics) {
    const factory = RELIC_MODIFIER_DEFS[relicId]
    if (!factory) continue
    const mods = factory(relicId, context)
    // 只注入 on_skill_trigger 的 global 层 Modifier
    registry.registerMany(mods.filter(m => m.trigger === 'on_skill_trigger'))
  }
}
