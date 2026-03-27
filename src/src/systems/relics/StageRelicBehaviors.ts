// ============================================
// 打字肉鸽 - 关卡进度系统遗物行为 (Story 36.10)
// ============================================
// 5 个关卡进度系统遗物的纯函数行为模块

import { state } from '../../core/state'
import { getStageType } from '../stage/stageFlow'
import { registerRelicBehavior } from './RelicPipeline'

// === 常量 ===
export const WARMUP_DURATION = 10
export const WARMUP_BONUS = 0.40
export const INTERMISSION_GOLD = 10
export const INTERMISSION_FREE_REFRESH = 1
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

// === 精英猎手 (elite_hunter) ===
// 注意：精英关已移除（Story 42.1），此遗物暂时不会触发

/** 有遗物 + Boss 关 → 2，否则 1（原精英猎手，暂改为 Boss 关生效） */
export function checkEliteHunterGoldMultiplier(): number {
  if (!state.player.relics.has('elite_hunter')) return 1
  if (getStageType(state.level) !== 'boss') return 1
  return 2
}

// === 不死鸟 (phoenix) ===

/** 有遗物 → 返回复活参数，否则 null */
export function checkPhoenixRevive(): { reviveTime: number; refreshModifiers: boolean } | null {
  if (!state.player.relics.has('phoenix')) return null
  const stageType = getStageType(state.level)
  return {
    reviveTime: PHOENIX_REVIVE_TIME,
    refreshModifiers: stageType === 'boss',
  }
}

/** 消费不死鸟遗物（移除） */
export function consumePhoenix(): void {
  state.player.relics.delete('phoenix')
}

// === 生命周期 ===

/** 每关开始时重置关级状态 */
export function resetStageRelicBattleState(): void {
  _stageStartTime = Date.now()
  // 注意：_intermissionFreeRefreshes 不在此重置，它在商店关闭时自然过期
}

/** 注册关卡进度系统遗物行为 */
export function initStageRelicBehaviors(): void {
  registerRelicBehavior('phoenix', () => {
    // 行为逻辑由 checkPhoenixRevive / consumePhoenix 在 endLevel 中直接调用
  })
}
