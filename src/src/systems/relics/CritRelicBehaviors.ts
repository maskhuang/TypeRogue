// ============================================
// 打字肉鸽 - 暴击系统遗物行为 (§12 Crit Relics)
// ============================================

import { state } from '../../core/state'
import { registerRelicBehavior } from './RelicPipeline'
import { FATE_COIN_CRIT_CAP, FATE_COIN_CONVERSION } from '../../data/affixes'

// === 常量 ===
export const LUCKY_STRIKE_RATE = 0.08
export const CRIT_BONUS_GOLD = 3
export const CRIT_CHARGE_THRESHOLD = 5
export const CRIT_STORM_MIN_CRITS = 2
export const CRIT_STORM_BONUS = 0.50
// 命运硬币常量 re-exported from affixes.ts (single source of truth)
export { FATE_COIN_CRIT_CAP, FATE_COIN_CONVERSION }

// === 模块级状态 ===
let _critChargeCount = 0
let _critChargeReady = false
let _wordCritCount = 0

// === 幸运一击 (lucky_strike) ===

/** 获取幸运一击基础暴击率：持有遗物 → 0.08，否则 0 */
export function getLuckyStrikeCritRate(): number {
  if (!state.player.relics.has('lucky_strike')) return 0
  return LUCKY_STRIKE_RATE
}

// === 暴击奖金 (crit_bonus) ===

/** 获取暴击奖金香蕉数：持有遗物 → 3，否则 0 */
export function getCritBonusGold(): number {
  if (!state.player.relics.has('crit_bonus')) return 0
  return CRIT_BONUS_GOLD
}

// === 暴击蓄力 (crit_charge) ===

/** 蓄力是否就绪（下一次触发必暴） */
export function isCritChargeReady(): boolean {
  if (!state.player.relics.has('crit_charge')) return false
  return _critChargeReady
}

/** 消耗蓄力暴击 — 在 ctx 构建后立即调用 */
export function consumeCritCharge(): void {
  _critChargeReady = false
  _critChargeCount = 0
}

/** 推进蓄力计数 — 非暴击时递增，达阈值时标记就绪 */
export function advanceCritCharge(wasCrit: boolean): void {
  if (!state.player.relics.has('crit_charge')) return
  if (wasCrit) return // 暴击不推进计数
  _critChargeCount++
  if (_critChargeCount >= CRIT_CHARGE_THRESHOLD) {
    _critChargeReady = true
    _critChargeCount = 0
  }
}

// === 暴击风暴 (crit_storm) ===

/** 记录本词内一次暴击 */
export function recordWordCrit(): void {
  _wordCritCount++
}

/** 获取本词暴击计数（测试用） */
export function getWordCritCount(): number {
  return _wordCritCount
}

/** 获取暴击风暴加成：持有遗物 + 本词暴击 ≥2 → 0.50，否则 0 */
export function getCritStormBonus(): number {
  if (!state.player.relics.has('crit_storm')) return 0
  if (_wordCritCount >= CRIT_STORM_MIN_CRITS) return CRIT_STORM_BONUS
  return 0
}

// === 命运硬币 (fate_coin) ===

/** 命运硬币是否激活 */
export function isFateCoinActive(): boolean {
  return state.player.relics.has('fate_coin')
}

// === 生命周期 ===

/** 每词重置 — completeWord 时调用 */
export function resetCritRelicWordState(): void {
  _wordCritCount = 0
}

/** 每关重置 — startLevel 时调用 */
export function resetCritRelicBattleState(): void {
  _critChargeCount = 0
  _critChargeReady = false
  _wordCritCount = 0
}

/** 注册暴击系统遗物行为 */
export function initCritRelicBehaviors(): void {
  registerRelicBehavior('crit_storm', () => {
    // 逻辑通过 getCritStormBonus() 在 completeWord 中调用
  })
  registerRelicBehavior('fate_coin', () => {
    // 逻辑通过 isFateCoinActive() 在 affixTrigger Phase 3 中调用
  })
}
