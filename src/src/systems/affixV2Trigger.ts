// ============================================
// 打字肉鸽 - 新 Affix 系统 · Trigger 评估器
// ============================================
// 给定 TriggerSpec + 当前 context（事件类型 + 可选 FireEvent），判断 trigger 是否激发。
//
// 本期范围：
//   ✅ Phase 1 stateless triggers — passive / on_key / on_word_end / on_self_fire / on_fire(filter)
//   ⚠️ Phase 1 stateful trigger — every_n_keys（需 instance state，本期返回简化路径）
//   ⏳ Phase 2 — on_window_mode / on_sequence / one_per_window（返回 false，待 P2 实装）
//
// 触发后做什么（effect 执行）由调用方负责，本评估器不动 state。

import type { TriggerSpec } from '../data/affixV2Trigger'
import { matchFireFilter, type FireEvent } from './fireFilter'

// ============================================
// TriggerContext · 调用方提供的运行时信息
// ============================================

/**
 * 评估 trigger 所需的运行时上下文。
 *
 * 不同 trigger 用不同字段：
 *   - passive: 无需字段（恒返 true）
 *   - on_key: 调用方应在每个 key down 时调用
 *   - on_word_end: 调用方应在 word_end 时调用
 *   - on_self_fire: 需 `selfAffixId` 与 `event.sourceAffixId` 比对
 *   - on_fire(filter): 需 `event` + `selfKey`（filter.posRel 用）
 *   - every_n_keys: 需 `affixKeyCount`（本 affix 累计见过的按键数）
 */
export interface TriggerContext {
  /** 本 affix 的 id（用于 on_self_fire 比对）*/
  readonly selfAffixId?: string
  /** 本 affix 所在键位（用于 on_fire posRel filter）*/
  readonly selfKey?: string
  /** 本 affix 已累计经过的按键数（用于 every_n_keys）*/
  readonly affixKeyCount?: number
  /** 当前触发的 fire 事件（on_fire / on_self_fire 用）*/
  readonly event?: FireEvent
  /** 当前是否处于词末（on_word_end 用）*/
  readonly isWordEnd?: boolean
}

// ============================================
// evaluateTrigger
// ============================================

/**
 * 判断 trigger 是否被给定 context 激发。
 *
 * @returns true 表示触发，false 表示不触发
 */
export function evaluateTrigger(spec: TriggerSpec, ctx: TriggerContext): boolean {
  switch (spec.type) {
    // ── Phase 1 ──
    case 'passive':
      // 永远生效。具体 effect 执行由调用方按需调度。
      return true

    case 'on_key':
      // 每次按键。调用方应仅在 key down 时调用本函数。
      return true

    case 'on_word_end':
      return ctx.isWordEnd === true

    case 'on_self_fire':
      // 自己触发：hook 层已保证只迭代触发 skill 上的 affix，event 存在即命中
      return ctx.event !== undefined

    case 'on_fire': {
      // 监听全场 fire 事件 + filter 匹配
      if (!ctx.event) return false
      if (!spec.filter) return true   // 无 filter = 监听所有
      const listenerKey = ctx.selfKey ?? ''
      return matchFireFilter(ctx.event, spec.filter, listenerKey)
    }

    case 'every_n_keys':
      // 自时钟：本 affix 已见的按键数能整除 n
      if (typeof ctx.affixKeyCount !== 'number' || ctx.affixKeyCount <= 0) return false
      return ctx.affixKeyCount % spec.n === 0

    // ── Phase 2（占位 · 未实装）──
    case 'on_window_mode':
    case 'on_sequence':
    case 'one_per_window':
      // TODO: Phase 2 实装
      return false
  }
}

// ============================================
// 批量评估辅助
// ============================================

/**
 * 给定一组 (TriggerSpec, TriggerContext)，返回所有命中的索引。
 * 便于一次性查多个 affix 是否在本次事件中触发。
 */
export function evaluateAll(
  triggers: ReadonlyArray<{ spec: TriggerSpec; ctx: TriggerContext }>,
): number[] {
  const out: number[] = []
  for (let i = 0; i < triggers.length; i++) {
    if (evaluateTrigger(triggers[i].spec, triggers[i].ctx)) out.push(i)
  }
  return out
}
