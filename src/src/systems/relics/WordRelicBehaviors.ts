// ============================================
// 打字肉鸽 - 单词/词库系统遗物行为 (Story 36.7)
// ============================================

import { state } from '../../core/state'
import { registerRelicBehavior } from './RelicPipeline'

/** 词汇收藏：首次打出单词的金币奖励 */
export const WORD_COLLECTION_GOLD = 3

/** 短词冲刺：≤4字母单词的技能产出加成 */
export const SHORT_SPRINT_RATE = 0.20

/** 长词达人：≥6字母单词完成时的时间奖励（秒） */
export const LONG_WORD_TIME_BONUS = 1

// === 模块级状态（Run 级别） ===
let _collectedWords: Set<string> = new Set()

// === 词汇收藏 (word_collection) ===

/**
 * 检查词汇收藏触发
 * 持有 word_collection + 本 Run 首次完成该单词 → WORD_COLLECTION_GOLD，否则 0
 * 同时将单词加入已收藏集合
 */
export function checkWordCollection(word: string): number {
  if (!state.player.relics.has('word_collection')) return 0
  const upper = word.toUpperCase()
  if (_collectedWords.has(upper)) return 0
  _collectedWords.add(upper)
  return WORD_COLLECTION_GOLD
}

/**
 * 获取已收藏单词集合（测试用）
 */
export function getCollectedWords(): ReadonlySet<string> {
  return _collectedWords
}

// === 短词冲刺 (short_sprint) ===

/**
 * 获取短词冲刺加成
 * 持有 short_sprint + 当前单词长度 ≤4 → SHORT_SPRINT_RATE，否则 0
 */
export function getShortSprintBonus(wordLength: number): number {
  if (!state.player.relics.has('short_sprint')) return 0
  return wordLength <= 4 ? SHORT_SPRINT_RATE : 0
}

// === 长词达人 (long_word_master) ===

/**
 * 检查长词达人触发
 * 持有 long_word_master + 当前单词长度 ≥6 → LONG_WORD_TIME_BONUS，否则 0
 */
export function checkLongWordMaster(wordLength: number): number {
  if (!state.player.relics.has('long_word_master')) return 0
  return wordLength >= 6 ? LONG_WORD_TIME_BONUS : 0
}

// === 词语经销商 (word_dealer) ===

/**
 * 设置词语经销商免费刷新 flag
 * 持有 word_dealer 遗物才写入 flag，否则忽略
 * @returns true 表示 flag 已设置
 */
export function setWordDealerFlag(): boolean {
  if (!state.player.relics.has('word_dealer')) return false
  state.player.relicStates['word_dealer'] = 1
  return true
}

/**
 * 消费词语经销商免费刷新
 * 有遗物 + flag=1 → 清除 flag 并返回 true，否则 false
 */
export function consumeWordDealerFreeRefresh(): boolean {
  if (!state.player.relics.has('word_dealer')) return false
  if (state.player.relicStates['word_dealer'] !== 1) return false
  state.player.relicStates['word_dealer'] = 0
  return true
}

// === 标点解放 (punctuation_liberation) ===

/**
 * 标点解放遗物是否激活
 */
export function isPunctuationRelicActive(): boolean {
  return state.player.relics.has('punctuation_liberation')
}

// === Run 级别重置 ===

/**
 * 重置 Run 级别状态 — 在 startRun() 中调用
 */
export function resetWordRelicRunState(): void {
  _collectedWords = new Set()
}

// === 注册所有行为 ===

/**
 * 初始化单词子系统遗物行为注册
 */
export function initWordRelicBehaviors(): void {
  registerRelicBehavior('word_dealer', (_relicId, _context) => {
    // 实际逻辑在 setWordDealerFlag() / consumeWordDealerFreeRefresh() 中
  })
  registerRelicBehavior('punctuation_liberation', (_relicId, _context) => {
    // 乱码逻辑在 bossModifiers.ts / battle.ts 中，绑定逻辑在 shop.ts 中
  })
}
