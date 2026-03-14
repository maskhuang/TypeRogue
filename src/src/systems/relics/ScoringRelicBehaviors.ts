import { state } from '../../core/state'
import { registerRelicBehavior } from './RelicPipeline'

// === 常量 ===
export const BASE_SHIELD_MIN = 15
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

export function getSnowballWordIndex(): number {
  return _snowballWordIndex
}

// === 致命礼物 (score_black_hole) ===
// 奖励表：overkill% 越低（越接近目标分），奖励越丰厚
// perfect=获得所有遗物, excellent=史诗/传说三选一, great=5次免费刷新
export type DeadlyGiftAction = 'all_relics' | 'epic_legendary_pick' | 'free_refreshes' | 'random_relic' | 'time_buff' | 'none'

export interface DeadlyGiftResult {
  gold: number
  tier: string
  action: DeadlyGiftAction
}

export const DEADLY_GIFT_REWARDS: { maxOverkill: number; gold: number; tier: string; action: DeadlyGiftAction }[] = [
  { maxOverkill: 0,    gold: 100, tier: 'perfect',   action: 'all_relics' },         // 恰好达标：全部遗物
  { maxOverkill: 0.05, gold: 70,  tier: 'excellent',  action: 'epic_legendary_pick' }, // 0-5%：史诗/传说三选一
  { maxOverkill: 0.15, gold: 45,  tier: 'great',      action: 'random_relic' },       // 5-15%：随机获得1个遗物
  { maxOverkill: 0.30, gold: 25,  tier: 'good',       action: 'free_refreshes' },     // 15-30%：5次免费刷新
  { maxOverkill: 0.50, gold: 12,  tier: 'fair',       action: 'time_buff' },          // 30-50%：下关+8s时间
  { maxOverkill: Infinity, gold: 5, tier: 'minimal',  action: 'none' },               // >50%：仅金币
]

export function getDeadlyGiftReward(score: number, target: number): DeadlyGiftResult {
  if (target <= 0 || score < target) return { gold: 0, tier: 'none', action: 'none' }
  const overkill = (score - target) / target
  for (const row of DEADLY_GIFT_REWARDS) {
    if (overkill <= row.maxOverkill) {
      return { gold: row.gold, tier: row.tier, action: row.action }
    }
  }
  return { gold: 5, tier: 'minimal', action: 'none' }
}

// 致命礼物免费刷新计数器
let _deadlyGiftFreeRefreshes = 0
export function getDeadlyGiftFreeRefreshes(): number { return _deadlyGiftFreeRefreshes }
export function consumeDeadlyGiftFreeRefresh(): boolean {
  if (_deadlyGiftFreeRefreshes > 0) { _deadlyGiftFreeRefreshes--; return true }
  return false
}
export function grantDeadlyGiftFreeRefreshes(count: number): void { _deadlyGiftFreeRefreshes += count }

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
