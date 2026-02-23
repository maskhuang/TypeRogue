// ============================================
// 打字肉鸽 - LetterUpgradeSystem 字母升级系统
// ============================================
// Story 14.1: 字母升级核心逻辑

import { state } from '../../core/state'
import { eventBus } from '../../core/events/EventBus'
import type { Modifier } from '../modifiers/ModifierTypes'

const MAX_LEVEL = 3

// 升级价格：Lv0→1=10, Lv1→2=20, Lv2→3=35
export const LETTER_UPGRADE_COSTS = [10, 20, 35] as const

// 元音常量（遗物接口预留）
export const VOWELS = ['a', 'e', 'i', 'o', 'u'] as const

// 修饰器缓存：升级时生成，击键时只读
let cachedModifiers: Modifier[] | null = null
let cachedMapRef: Map<string, number> | null = null

/**
 * 升级指定字母（0→1→2→3），超过 Lv3 返回 false
 * 只接受单个英文字母 (a-z)
 */
export function upgradeLetter(key: string): boolean {
  const k = key.toLowerCase()
  if (k.length !== 1 || k < 'a' || k > 'z') return false
  const current = state.player.letterLevels.get(k) ?? 0
  if (current >= MAX_LEVEL) return false
  const newLevel = current + 1
  state.player.letterLevels.set(k, newLevel)
  cachedModifiers = null
  eventBus.emit('letter:upgraded', { key: k, level: newLevel })
  return true
}

/**
 * 返回字母当前等级
 */
export function getLetterLevel(key: string): number {
  return state.player.letterLevels.get(key.toLowerCase()) ?? 0
}

/**
 * 返回所有已升级字母的 base 层修饰器
 */
export function getLetterModifiers(): Modifier[] {
  if (cachedModifiers !== null && cachedMapRef === state.player.letterLevels) {
    return cachedModifiers
  }
  const modifiers: Modifier[] = []
  state.player.letterLevels.forEach((level, key) => {
    if (level <= 0) return
    modifiers.push({
      id: `letter:${key}:score`,
      source: `letter:${key}`,
      sourceType: 'letter',
      layer: 'base',
      trigger: 'on_correct_keystroke',
      phase: 'calculate',
      condition: { type: 'key_is', key },
      effect: { type: 'score', value: level, stacking: 'additive' },
      priority: 50,
    })
  })
  cachedModifiers = modifiers
  cachedMapRef = state.player.letterLevels
  return modifiers
}

/**
 * 返回指定字母的升级价格，已满级返回 null
 */
export function getUpgradeCost(key: string): number | null {
  const level = getLetterLevel(key)
  if (level >= MAX_LEVEL) return null
  return LETTER_UPGRADE_COSTS[level]
}

/**
 * 批量升级多个字母，返回成功升级的数量
 */
export function upgradeLetters(keys: readonly string[]): number {
  let count = 0
  for (const key of keys) {
    if (upgradeLetter(key)) count++
  }
  return count
}

/**
 * 新一局开始时重置所有字母等级
 */
export function resetLetters(): void {
  state.player.letterLevels.clear()
  cachedModifiers = null
}
