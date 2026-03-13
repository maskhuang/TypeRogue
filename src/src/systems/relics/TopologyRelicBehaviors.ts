// ============================================
// 打字肉鸽 - 键盘拓扑系统遗物行为 (Story 36.6)
// ============================================

import { state } from '../../core/state'
import { ADJACENT_KEYS } from '../../core/constants'
import { HAND_MAP, ROW_MAP, SYMMETRIC_PAIRS } from '../../data/keyboardTopology'
import { registerRelicBehavior } from './RelicPipeline'

/** 邻键之力：每个相邻已装备技能的加成 */
export const ADJACENT_POWER_RATE = 0.06

/** 对称契约：对称位双装备的加成 */
export const SYMMETRY_PACT_RATE = 0.15

/** 行会勋章：选定行的加成 */
export const ROW_MEDAL_RATE = 0.25

/** 双手协奏：手切换时间加成 */
export const DUAL_CONCERTO_TIME = 0.5

/** 全键风暴：最多触发技能数 */
export const KEY_STORM_MAX_TRIGGERS = 3

/** 全键风暴：生效的前 N 个单词 */
export const KEY_STORM_WORD_LIMIT = 3

// === 模块级状态 ===
let _lastKeyHand: 'left' | 'right' | null = null
let _stormWordCount = 0

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

// === 对称契约 (symmetry_pact) ===

/**
 * 获取对称契约加成
 * 持有 symmetry_pact + 对称位有装备技能 → 0.15，否则 0
 */
export function getSymmetryPactBonus(triggerKey: string): number {
  if (!state.player.relics.has('symmetry_pact')) return 0
  const symmetricKey = SYMMETRIC_PAIRS[triggerKey]
  if (!symmetricKey) return 0
  return state.player.bindings.has(symmetricKey) ? SYMMETRY_PACT_RATE : 0
}

// === 行会勋章 (row_medal) ===

/**
 * 设置行会勋章选择的行号
 */
export function setRowMedalRow(rowIndex: number): void {
  state.player.relicStates['row_medal'] = rowIndex
}

/**
 * 获取行会勋章加成
 * 持有 row_medal + 触发键在选定行 → 0.25，否则 0
 */
export function getRowMedalBonus(triggerKey: string): number {
  if (!state.player.relics.has('row_medal')) return 0
  const selectedRow = state.player.relicStates['row_medal']
  if (selectedRow === undefined) return 0
  return ROW_MAP[triggerKey] === selectedRow ? ROW_MEDAL_RATE : 0
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

/**
 * 增加风暴单词计数
 */
export function incrementStormWordCount(): void {
  _stormWordCount++
}

/**
 * 获取当前风暴单词计数
 */
export function getStormWordCount(): number {
  return _stormWordCount
}

/**
 * 检查全键风暴触发
 * 返回要触发的 {skillId, key}[]（最多 3 个）
 */
export function checkKeyStorm(
  currentWord: string,
  randomFn: () => number,
): { skillId: string; key: string }[] {
  if (!state.player.relics.has('key_storm')) return []
  if (_stormWordCount > KEY_STORM_WORD_LIMIT) return []

  const wordLetters = new Set(currentWord.toLowerCase().split(''))
  const unhitSkills: { skillId: string; key: string }[] = []
  for (const [key, skillId] of state.player.bindings) {
    if (!wordLetters.has(key)) unhitSkills.push({ skillId, key })
  }

  if (unhitSkills.length <= KEY_STORM_MAX_TRIGGERS) return unhitSkills

  // Fisher-Yates shuffle, take first 3
  const arr = [...unhitSkills]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.slice(0, KEY_STORM_MAX_TRIGGERS)
}

// === 模块重置（关级别） ===

/**
 * 重置关级别状态 — 在 startLevel() 中调用
 */
export function resetTopologyRelicState(): void {
  _lastKeyHand = null
  _stormWordCount = 0
}

// === 注册所有行为 ===

/**
 * 初始化拓扑子系统遗物行为注册
 */
export function initTopologyRelicBehaviors(): void {
  registerRelicBehavior('row_select', (_relicId, _context) => {
    // 实际逻辑在 getRowMedalBonus() 中，由 skills.ts 调用
  })

  registerRelicBehavior('hand_alternation', (_relicId, _context) => {
    // 实际逻辑在 checkDualConcerto() 中，由 battle.ts 调用
  })

  registerRelicBehavior('key_storm', (_relicId, _context) => {
    // 实际逻辑在 checkKeyStorm() 中，由 battle.ts 调用
  })
}
