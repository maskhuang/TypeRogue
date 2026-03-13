import { state } from '../../core/state'
import { registerRelicBehavior } from './RelicPipeline'

// === 常量 ===
export const BASE_SHIELD_MIN = 20
export const LENIENT_REDUCE = 0.10
export const S_RANK_GOLD: Record<string, number> = { S: 25, SS: 50, SSS: 100 }
export const SNOWBALL_INCREMENT = 0.05

// === 模块级状态 ===
let _snowballWordIndex = 0
let _blackHolePool = 0
let _blackHoleSettled = false
let _blackHoleActive = false

// === 基数护盾 (base_shield) ===
export function applyBaseShield(wordScore: number): number {
  if (!state.player.relics.has('base_shield')) return wordScore
  return Math.max(BASE_SHIELD_MIN, wordScore)
}

// === 宽容评审 (lenient_judge) ===
export function applyLenientJudge(targetScore: number): number {
  if (!state.player.relics.has('lenient_judge')) return targetScore
  return Math.floor(targetScore * (1 - LENIENT_REDUCE))
}

// === S 级奖杯 (s_rank_trophy) ===
export function getSRankTrophyGold(rating: string): number {
  if (!state.player.relics.has('s_rank_trophy')) return 0
  return S_RANK_GOLD[rating] ?? 0
}

// === 雪球效应 (snowball) ===
export function applySnowball(wordScore: number): number {
  const index = _snowballWordIndex
  _snowballWordIndex++
  if (!state.player.relics.has('snowball')) return wordScore
  return Math.floor(wordScore * (1 + SNOWBALL_INCREMENT * index))
}

// === 分数黑洞 (score_black_hole) ===
export function isBlackHoleActive(): boolean {
  return _blackHoleActive
}

export function accumulateBlackHole(wordScore: number): void {
  _blackHolePool += wordScore
}

export function settleBlackHole(): number {
  const pool = _blackHolePool
  _blackHoleSettled = true
  return pool
}

export function hasBlackHoleSettled(): boolean {
  return _blackHoleSettled
}

export function getBlackHolePool(): number {
  return _blackHolePool
}

// === 生命周期 ===
export function resetScoringRelicBattleState(): void {
  _snowballWordIndex = 0
  _blackHolePool = 0
  _blackHoleSettled = false
  _blackHoleActive = state.player.relics.has('score_black_hole')
}

export function initScoringRelicBehaviors(): void {
  registerRelicBehavior('snowball', () => {
    // 雪球效应：逻辑通过 applySnowball() 纯函数在 completeWord 中调用
  })
  registerRelicBehavior('score_black_hole', () => {
    // 分数黑洞：逻辑通过 isBlackHoleActive/accumulateBlackHole/settleBlackHole 在 battle.ts 中调用
  })
}
