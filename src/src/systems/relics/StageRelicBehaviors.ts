// ============================================
// 打字肉鸽 - 关卡进度系统遗物行为 (Story 36.10)
// ============================================
// 5 个关卡进度系统遗物的纯函数行为模块

import { state } from '../../core/state'
import { getStageType } from '../stage/stageFlow'
import { registerRelicBehavior } from './RelicPipeline'
import { random } from '../../core/seededRandom'

// === 常量 ===
export const WARMUP_DURATION = 10
export const WARMUP_BONUS = 0.10
export const INTERMISSION_GOLD = 25
export const INTERMISSION_FREE_REFRESH = 2
export const ENDURANCE_TIME_BONUS = 10
export const PHOENIX_REVIVE_TIME = 10

// === 模块级状态 ===

/** 关卡开始时间戳（Date.now()） */
let _stageStartTime = 0

/** 幕间准备免费刷新剩余次数 */
let _intermissionFreeRefreshes = 0

// === 暖身操 (warm_up) ===

/** 有遗物 + 关卡进行时间 < WARMUP_DURATION → WARMUP_BONUS，否则 0 */
export function getWarmUpBonus(): number {
  if (!state.player.relics.has('warm_up')) return 0
  if (_stageStartTime === 0) return 0
  const elapsed = (Date.now() - _stageStartTime) / 1000
  if (elapsed < WARMUP_DURATION) return WARMUP_BONUS
  return 0
}

// === 幕间准备 (intermission) ===

/** 有遗物 → 返回金币 + 免费刷新次数，否则 null */
export function checkIntermission(): { gold: number; freeRefreshes: number } | null {
  if (!state.player.relics.has('intermission')) return null
  return { gold: INTERMISSION_GOLD, freeRefreshes: INTERMISSION_FREE_REFRESH }
}

/** 设置幕间准备免费刷新次数 */
export function grantIntermissionFreeRefreshes(count: number): void {
  _intermissionFreeRefreshes = count
}

/** 有免费刷新次数 → true */
export function hasIntermissionFreeRefresh(): boolean {
  return _intermissionFreeRefreshes > 0
}

/** 消耗一次免费刷新 */
export function consumeIntermissionFreeRefresh(): void {
  if (_intermissionFreeRefreshes > 0) _intermissionFreeRefreshes--
}

// === 续航电池 (endurance_battery) ===

/** 有遗物 → ENDURANCE_TIME_BONUS，否则 0 */
export function getEnduranceTimeBonus(): number {
  if (!state.player.relics.has('endurance_battery')) return 0
  return ENDURANCE_TIME_BONUS
}

// === 猎物悬赏 (elite_hunter → bounty hunt) ===

export type BountyType = 'zero_errors' | 'combo_20' | 'words_8' | 'speed_word' | 'perfect_3'

export const BOUNTY_TYPES: BountyType[] = ['zero_errors', 'combo_20', 'words_8', 'speed_word', 'perfect_3']

export const BOUNTY_REWARDS: Record<BountyType, number> = {
  zero_errors: 20,
  combo_20: 15,
  words_8: 15,
  speed_word: 10,
  perfect_3: 20,
}

// 模块级状态
let _activeBounty: BountyType | null = null
let _bountyCompleted = false
let _bountyHasError = false       // zero_errors 追踪
let _consecutivePerfect = 0       // perfect_3 追踪

/** 获取当前悬赏（无遗物或无悬赏返回 null） */
export function getActiveBounty(): { type: BountyType; reward: number; completed: boolean } | null {
  if (!_activeBounty) return null
  return { type: _activeBounty, reward: BOUNTY_REWARDS[_activeBounty], completed: _bountyCompleted }
}

/** 关卡开始时抽取悬赏（使用 seeded random） */
export function rollBounty(): void {
  if (!state.player.relics.has('elite_hunter')) {
    _activeBounty = null
    return
  }
  const idx = Math.floor(random() * BOUNTY_TYPES.length)
  _activeBounty = BOUNTY_TYPES[idx]
  _bountyCompleted = false
  _bountyHasError = false
  _consecutivePerfect = 0
}

/** 打错时调用（zero_errors 失败，perfect_3 重置） */
export function onBountyError(): void {
  if (!_activeBounty || _bountyCompleted) return
  _bountyHasError = true
  _consecutivePerfect = 0
}

/** 完成单词时检查悬赏（返回奖励金币，0 = 未完成/不触发） */
export function checkBountyOnWordComplete(ctx: {
  combo: number;
  wordsCompleted: number;
  wordTime: number;   // 本词用时（秒）
  perfect: boolean;
}): number {
  if (!_activeBounty || _bountyCompleted) return 0

  switch (_activeBounty) {
    case 'combo_20':
      if (ctx.combo >= 20) { _bountyCompleted = true; return BOUNTY_REWARDS.combo_20 }
      break
    case 'words_8':
      if (ctx.wordsCompleted >= 8) { _bountyCompleted = true; return BOUNTY_REWARDS.words_8 }
      break
    case 'speed_word':
      if (ctx.wordTime <= 2) { _bountyCompleted = true; return BOUNTY_REWARDS.speed_word }
      break
    case 'perfect_3':
      if (ctx.perfect) _consecutivePerfect++
      else _consecutivePerfect = 0
      if (_consecutivePerfect >= 3) { _bountyCompleted = true; return BOUNTY_REWARDS.perfect_3 }
      break
    // zero_errors: 在关卡结束时检查
  }
  return 0
}

/** 关卡结束时检查 zero_errors（返回奖励金币） */
export function checkBountyOnStageEnd(): number {
  if (!_activeBounty || _bountyCompleted) return 0
  if (_activeBounty === 'zero_errors' && !_bountyHasError) {
    _bountyCompleted = true
    return BOUNTY_REWARDS.zero_errors
  }
  return 0
}

// === 不死鸟 (phoenix) ===

/** 有遗物 → 返回复活参数，否则 null */
export function checkPhoenixRevive(): { reviveTime: number; refreshModifiers: boolean } | null {
  if (!state.player.relics.has('phoenix')) return null
  const stageType = getStageType(state.level)
  return {
    reviveTime: PHOENIX_REVIVE_TIME,
    refreshModifiers: stageType === 'boss' || stageType === 'elite',
  }
}

/** 消费不死鸟遗物（移除） */
export function consumePhoenix(): void {
  state.player.relics.delete('phoenix')
}

// === 绝境暴击 (desperate_crit) — 跨子系统暴击率遗物 ===

/** 绝境暴击：剩余时间阈值（秒） */
export const DESPERATE_CRIT_TIME_THRESHOLD = 5
/** 绝境暴击：暴击率加成 */
export const DESPERATE_CRIT_RATE = 0.20

/** 剩余时间 ≤ 5s 且持有遗物 → +20% 暴击率，否则 0 */
export function getDesperateCritRate(): number {
  if (!state.player.relics.has('desperate_crit')) return 0
  if (state.time > DESPERATE_CRIT_TIME_THRESHOLD) return 0
  return DESPERATE_CRIT_RATE
}

// === 生命周期 ===

/** 每关开始时重置关级状态 */
export function resetStageRelicBattleState(): void {
  _stageStartTime = Date.now()
  _intermissionFreeRefreshes = 0
  rollBounty()
}

/** 注册关卡进度系统遗物行为 */
export function initStageRelicBehaviors(): void {
  registerRelicBehavior('phoenix', () => {
    // 行为逻辑由 checkPhoenixRevive / consumePhoenix 在 endLevel 中直接调用
  })
}
