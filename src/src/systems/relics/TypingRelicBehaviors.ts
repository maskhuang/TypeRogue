// ============================================
// 打字肉鸽 - 打字/输入系统遗物行为 (Story 36.2)
// ============================================

import { state } from '../../core/state'
import { registerRelicBehavior, setRelicState, getRelicState } from './RelicPipeline'

// === 模块级状态（关级别，不需持久化） ===

/** 本关已出现过的单词（小助手用） */
let seenWords: Set<string> = new Set()

/**
 * 重置关级别状态 — 在 startLevel() 中调用
 */
export function resetTypingRelicState(): void {
  seenWords.clear()
}

/**
 * 记录当前单词到已见列表 — 在 setWord() 中调用
 */
export function trackWord(word: string): void {
  seenWords.add(word.toUpperCase())
}

/**
 * 检查单词是否为重复词（已出现过）
 */
export function isRepeatWord(word: string): boolean {
  return seenWords.has(word.toUpperCase())
}

// === 蜡封检查（在 playerWrong 最前面调用） ===

/**
 * 检查打字蜡封是否免除本次错误
 * @returns true 如果错误被免除（应跳过后续 on_error 管道）
 */
export function checkWaxSealForgive(): boolean {
  if (!state.player.relics.has('typing_wax_seal')) return false
  const used = getRelicState('typing_wax_seal') ?? 0
  if (used === 0) {
    setRelicState('typing_wax_seal', 1)
    return true
  }
  return false
}

/**
 * 重置蜡封状态（每个新词调用）
 */
export function resetWaxSeal(): void {
  if (state.player.relics.has('typing_wax_seal')) {
    setRelicState('typing_wax_seal', 0)
  }
}

// === 回声指套检查（在 playerCorrect 技能触发后调用） ===

/** 回声指套触发概率 */
const ECHO_THIMBLE_CHANCE = 0.08

/**
 * 检查回声指套是否触发双重击键
 * @param randomValue 0-1 随机数（外部传入便于测试）
 * @returns true 如果触发双重击键
 */
export function checkEchoThimble(randomValue: number): boolean {
  if (!state.player.relics.has('echo_thimble')) return false
  return randomValue < ECHO_THIMBLE_CHANCE
}

// === 小助手 Tab 自动补全检查 ===

/**
 * 检查是否可以 Tab 自动补全
 * @returns true 如果当前词可以自动补全（重复词 + 已打完首字母）
 */
export function canAutocomplete(): boolean {
  if (!state.player.relics.has('little_helper')) return false
  if (state.player.index < 1) return false // 还没打完首字母
  return isRepeatWord(state.player.word)
}

// === 节奏适应（在 completeWord 中调用） ===

/** 节奏适应时间阈值（秒） */
const RHYTHM_THRESHOLD = 3
/** 慢速奖励时间（秒） */
const RHYTHM_SLOW_TIME_BONUS = 1
/** 快速奖励分数倍率 */
const RHYTHM_FAST_SCORE_MULT = 1.3

export interface RhythmAdaptResult {
  timeBonus: number
  scoreMult: number
}

/**
 * 计算节奏适应效果
 * @param wordElapsed 单词用时（秒）
 * @returns 时间加成和分数倍率
 */
export function calculateRhythmAdapt(wordElapsed: number): RhythmAdaptResult {
  if (!state.player.relics.has('rhythm_adapt')) {
    return { timeBonus: 0, scoreMult: 1 }
  }
  if (wordElapsed > RHYTHM_THRESHOLD) {
    return { timeBonus: RHYTHM_SLOW_TIME_BONUS, scoreMult: 1 }
  }
  if (wordElapsed < RHYTHM_THRESHOLD) {
    return { timeBonus: 0, scoreMult: RHYTHM_FAST_SCORE_MULT }
  }
  // 恰好 3s：无额外效果
  return { timeBonus: 0, scoreMult: 1 }
}

// === 玻璃大炮检查（在 on_error 管道中） ===

/**
 * 检查玻璃大炮是否应触发即死
 * @returns true 如果持有玻璃大炮
 */
export function hasGlassCannon(): boolean {
  return state.player.relics.has('glass_cannon_v2')
}

// === 注册所有行为 ===

/**
 * 初始化打字子系统遗物行为注册
 * 在应用启动时调用一次
 */
export function initTypingRelicBehaviors(): void {
  registerRelicBehavior('error_forgive_first', (_relicId, _context) => {
    // 蜡封的实际逻辑在 checkWaxSealForgive() 中，由 battle.ts 直接调用
    // 此注册仅为行为分发框架的完整性
  })

  registerRelicBehavior('double_keystroke', (_relicId, _context) => {
    // 回声指套的实际逻辑在 checkEchoThimble() 中，由 battle.ts 直接调用
  })

  registerRelicBehavior('autocomplete', (_relicId, _context) => {
    // 小助手的实际逻辑在 canAutocomplete() 中，由 battle.ts 直接调用
  })

  registerRelicBehavior('rhythm_adapt', (_relicId, _context) => {
    // 节奏适应的实际逻辑在 calculateRhythmAdapt() 中，由 battle.ts 直接调用
  })

  registerRelicBehavior('glass_cannon', (_relicId, _context) => {
    // 玻璃大炮的 instant_fail 逻辑在 battle.ts playerWrong() 中直接处理
    // score×2 通过 RELIC_MODIFIER_DEFS factory 实现
  })
}
