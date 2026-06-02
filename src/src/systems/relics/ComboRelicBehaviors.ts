// ============================================
// 打字肉鸽 - 连击/倍率系统遗物行为 (Story 36.3)
// ============================================

import { state } from '../../core/state'
import { registerRelicBehavior, setRelicState, getRelicState } from './RelicPipeline'
import { eventBus } from '../../core/events/EventBus'

// === 回声指套 (echo_thimble) — 从 TypingRelicBehaviors 迁入 ===

/** 回声指套暴击率（并入暴击子系统，暴击时额外触发） */
export const ECHO_THIMBLE_CRIT_RATE = 0.08

/** 获取回声指套暴击率（未装备返回 0） */
export function getEchoThimbleCritRate(): number {
  return state.player.relics.has('echo_thimble') ? ECHO_THIMBLE_CRIT_RATE : 0
}

/** @deprecated 回声指套已并入暴击子系统，保留供旧代码兼容 */
export function checkEchoThimble(_randomValue: number): boolean {
  return false
}

// === 连击缓冲 (combo_buffer) ===

/**
 * 计算 combo 缓冲后应保留的值
 * @param currentCombo 中断前的 combo 值
 * @returns 缓冲后保留的 combo 值（0 = 无缓冲或未持有）
 */
export function calculateComboBuffer(currentCombo: number): number {
  if (!state.player.relics.has('combo_buffer')) return 0
  return Math.floor(currentCombo * 0.5)
}

// === 倍率棱镜 (multiplier_prism) ===

/**
 * 获取倍率棱镜加成（技能产出百分比）
 * @returns 0.2 当 multiplier >= 2.5 且持有遗物；否则 0
 */
export function getMultiplierPrismBonus(): number {
  if (!state.player.relics.has('multiplier_prism')) return 0
  if (state.multiplier < 2.5) return 0
  return 0.2
}

// === 连击引爆 (combo_detonator) ===

const DETONATOR_THRESHOLD = 15

/**
 * 检查连击引爆是否应触发
 * combo 达到 15 时触发一次；之后需要 combo 归零（打错）才能再次触发。
 * @param newCombo combo++ 后的新值
 * @returns 应触发的技能数（0 = 不触发，3 = 触发）
 */
export function checkComboDetonator(newCombo: number): number {
  if (!state.player.relics.has('combo_detonator')) return 0
  const fired = getRelicState('combo_detonator') ?? 0
  if (!fired && newCombo >= DETONATOR_THRESHOLD) {
    setRelicState('combo_detonator', 1)
    return 3
  }
  return 0
}

/**
 * combo 归零时重置引爆状态（由 playerWrong 调用）
 */
export function onComboBreakDetonator(): void {
  if (state.player.relics.has('combo_detonator')) {
    setRelicState('combo_detonator', 0)
  }
}

/**
 * 重置连击引爆状态（每关调用）
 */
export function resetComboDetonator(): void {
  if (state.player.relics.has('combo_detonator')) {
    setRelicState('combo_detonator', 0)
  }
}

// === 不灭连击 (immortal_combo) ===

/** 上关结束时的 combo 数（获得不断之链时追溯用） */
let _lastBattleCombo = 0

/** 由 battle.ts 在关卡初始化时调用，保存上关 combo */
export function saveLastBattleCombo(combo: number): void {
  _lastBattleCombo = combo
}

/**
 * 检查是否持有不灭连击
 */
export function hasImmortalCombo(): boolean {
  return state.player.relics.has('immortal_combo')
}

// === 暴走节拍 (fury_beat) — 跨子系统暴击率遗物 ===

/** 暴走节拍 combo 阈值 */
export const FURY_BEAT_COMBO_THRESHOLD = 10
/** 暴走节拍暴击率加成 */
export const FURY_BEAT_CRIT_RATE = 0.10

/** combo ≥ 阈值且持有遗物 → FURY_BEAT_CRIT_RATE，否则 0 */
export function getFuryBeatCritRate(): number {
  if (!state.player.relics.has('fury_beat')) return 0
  if (state.combo < FURY_BEAT_COMBO_THRESHOLD) return 0
  return FURY_BEAT_CRIT_RATE
}

// === 模块重置（关级别） ===

/**
 * 重置关级别状态 — 在 startLevel() 中调用
 */
export function resetComboRelicState(): void {
  resetComboDetonator()
}

// === 注册所有行为 ===

/**
 * 初始化连击子系统遗物行为注册
 */
export function initComboRelicBehaviors(): void {
  registerRelicBehavior('double_keystroke', (_relicId, _context) => {
    // 回声指套的实际逻辑在 checkEchoThimble() 中，由 battle.ts 直接调用
  })

  registerRelicBehavior('combo_detonator', (_relicId, _context) => {
    // 实际逻辑在 checkComboDetonator() 中，由 battle.ts 直接调用
  })

  registerRelicBehavior('immortal_combo', (_relicId, _context) => {
    // 实际逻辑在 hasImmortalCombo() 中
  })

  // 获得不断之链时追溯上关 combo
  eventBus.on('relic:acquired', ({ relicId }) => {
    if (relicId === 'immortal_combo' && _lastBattleCombo > 0) {
      state.combo = _lastBattleCombo
    }
  })
}
