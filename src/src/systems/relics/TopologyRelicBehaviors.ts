// ============================================
// 打字肉鸽 - 键盘拓扑系统遗物行为 (Story 36.6)
// ============================================

import { state } from '../../core/state'
import { ADJACENT_KEYS, KEYBOARD_ROWS } from '../../core/constants'
import { HAND_MAP, ROW_MAP } from '../../data/keyboardTopology'
import { registerRelicBehavior } from './RelicPipeline'

/** 邻键之力：每个相邻已装备技能的加成 */
export const ADJACENT_POWER_RATE = 0.06

/** 角隅之力：角落键加成 */
export const CORNER_POWER_RATE = 0.20

/** 角落键集合 (Q/P/Z/M) */
const CORNER_KEYS = new Set(['q', 'p', 'z', 'm'])

/** 双手协奏：手切换时间加成 */
export const DUAL_CONCERTO_TIME = 0.5

/** 换行奖励：跨行金币 */
export const ROW_SWITCH_GOLD = 1

/** 消行满贯：额外触发的产出比例 */
export const LINE_CLEAR_OUTPUT_RATIO = 0.5

// === 模块级状态 ===
let _lastKeyHand: 'left' | 'right' | null = null
let _lastKeyRow: number | null = null
/** 消行追踪：本词每行已命中的已装备技能键集合 */
let _wordRowHits: Map<number, Set<string>> = new Map()

// === 邻键之力 (adjacent_power) ===

/**
 * 获取邻键之力加成
 * 持有 adjacent_power → adjacentCount * 0.06，否则 0
 */
export function getAdjacentPowerBonus(triggerKey: string): number {
  if (!state.player.relics.has('adjacent_power')) return 0
  const adjacentKeys = ADJACENT_KEYS[triggerKey]
  if (!adjacentKeys) return 0
  let count = 0
  for (const adj of adjacentKeys) {
    if (state.player.bindings.has(adj)) count++
  }
  return count * ADJACENT_POWER_RATE
}

// === 角隅之力 (corner_power) ===

/**
 * 获取角隅之力加成
 * 触发键在角落(Q/P/Z/M) → +20%，否则 0
 */
export function getCornerPowerBonus(triggerKey: string): number {
  if (!state.player.relics.has('corner_power')) return 0
  return CORNER_KEYS.has(triggerKey) ? CORNER_POWER_RATE : 0
}

// === 换行奖励 (row_switch) ===

/**
 * 检查换行奖励
 * 当前按键与上一个按键不在同一行 → +1 金币
 * @returns 金币数（0 或 1）
 */
export function checkRowSwitch(key: string): number {
  if (!state.player.relics.has('row_switch')) {
    // 即使没有遗物也更新行号（为其他系统准备）
    _lastKeyRow = ROW_MAP[key] ?? null
    return 0
  }
  const currentRow = ROW_MAP[key]
  if (currentRow === undefined) return 0
  const bonus = (_lastKeyRow !== null && _lastKeyRow !== currentRow) ? ROW_SWITCH_GOLD : 0
  _lastKeyRow = currentRow
  return bonus
}

// === 消行满贯 (line_clear) ===

/**
 * 记录本词技能命中（由 battle.ts 在技能触发后调用）
 */
export function recordLineClearHit(triggerKey: string): void {
  if (!state.player.relics.has('line_clear')) return
  const row = ROW_MAP[triggerKey]
  if (row === undefined) return
  if (!state.player.bindings.has(triggerKey)) return
  if (!_wordRowHits.has(row)) _wordRowHits.set(row, new Set())
  _wordRowHits.get(row)!.add(triggerKey)
}

/**
 * 检查消行满贯触发（在单词完成时调用）
 * @returns 要额外触发的 {skillId, key}[]，空数组表示未触发
 */
export function checkLineClear(): { skillId: string; key: string }[] {
  if (!state.player.relics.has('line_clear')) return []
  const result: { skillId: string; key: string }[] = []
  const clearedRows: number[] = []

  for (const [row, hitKeys] of _wordRowHits) {
    // 获取该行所有已装备技能的键
    const rowEquippedKeys: string[] = []
    for (const [key] of state.player.bindings) {
      if (ROW_MAP[key] === row) rowEquippedKeys.push(key)
    }
    // 该行至少有2个已装备技能，且全部命中 → 消行
    if (rowEquippedKeys.length >= 2 && rowEquippedKeys.every(k => hitKeys.has(k))) {
      for (const key of rowEquippedKeys) {
        const skillId = state.player.bindings.get(key)
        if (skillId) result.push({ skillId, key })
      }
      clearedRows.push(row)
    }
  }

  // 消行后清除已消行的记录，允许重新积累
  for (const row of clearedRows) {
    _wordRowHits.delete(row)
  }

  return result
}

// === 双手协奏 (dual_concerto) ===

/**
 * 检查双手协奏加成
 * 返回 0.5（手切换）或 0（同手/首次）
 * 同时更新 _lastKeyHand
 */
export function checkDualConcerto(key: string): number {
  if (!state.player.relics.has('dual_concerto')) return 0
  const hand = HAND_MAP[key]
  if (!hand) return 0
  const bonus = (_lastKeyHand !== null && _lastKeyHand !== hand) ? DUAL_CONCERTO_TIME : 0
  _lastKeyHand = hand
  return bonus
}

/**
 * 重置双手协奏手追踪（每词开始调用）
 */
export function resetDualConcertoHand(): void {
  _lastKeyHand = null
}

// === 全键风暴 (key_storm) ===

/** 全键风暴得分惩罚系数 */
export const KEY_STORM_SCORE_PENALTY = 0.5

/**
 * 是否持有全键风暴
 */
export function hasKeyStorm(): boolean {
  return state.player.relics.has('key_storm')
}

/**
 * 检查全键风暴触发
 * 每命中1个技能，随机触发1个未被该词命中的已装备技能
 */
export function checkKeyStorm(
  hitCount: number,
  currentWord: string,
  randomFn: () => number,
): { skillId: string; key: string }[] {
  if (!state.player.relics.has('key_storm')) return []
  if (hitCount <= 0) return []

  const wordLetters = new Set(currentWord.toLowerCase().split(''))
  const unhitSkills: { skillId: string; key: string }[] = []
  for (const [key, skillId] of state.player.bindings) {
    if (!wordLetters.has(key)) unhitSkills.push({ skillId, key })
  }

  if (unhitSkills.length === 0) return []

  // Fisher-Yates shuffle
  const arr = [...unhitSkills]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }

  return arr.slice(0, Math.min(hitCount, arr.length))
}

// === 模块重置（关级别） ===

// === 精准打击 (precision_strike) — 跨子系统暴击率遗物 ===

/** Home Row 键位集合 */
const HOME_ROW_KEYS = new Set(['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'])
/** 精准打击暴击率加成 */
export const PRECISION_STRIKE_CRIT_RATE = 0.10

/** Home Row 按键时持有遗物 → +10% 暴击率，否则 0 */
export function getPrecisionStrikeCritRate(triggerKey: string): number {
  if (!state.player.relics.has('precision_strike')) return 0
  if (!HOME_ROW_KEYS.has(triggerKey.toLowerCase())) return 0
  return PRECISION_STRIKE_CRIT_RATE
}

/**
 * 重置关级别状态 — 在 startLevel() 中调用
 */
export function resetTopologyRelicState(): void {
  _lastKeyHand = null
  _lastKeyRow = null
  _wordRowHits.clear()
}

// === 注册所有行为 ===

/**
 * 初始化拓扑子系统遗物行为注册
 */
export function initTopologyRelicBehaviors(): void {
  registerRelicBehavior('line_clear', (_relicId, _context) => {
    // 实际逻辑在 checkLineClear() 中，由 battle.ts 调用
  })

  registerRelicBehavior('hand_alternation', (_relicId, _context) => {
    // 实际逻辑在 checkDualConcerto() 中，由 battle.ts 调用
  })

  registerRelicBehavior('key_storm', (_relicId, _context) => {
    // 实际逻辑在 checkKeyStorm() 中，由 battle.ts 调用
  })
}
