// ============================================
// 打字肉鸽 - 资源系统遗物行为 (Story 36.8)
// ============================================
// 5 个资源系统遗物的纯函数行为模块

import { state } from '../../core/state'
import { registerRelicBehavior } from './RelicPipeline'

// === 常量 ===
export const SCORE_MAGNET_BONUS = 1
export const RESOURCE_SENSE_THRESHOLD = 3
export const RESOURCE_SENSE_BOOST = 0.50
export const TIME_DEW_INTERVAL = 3
export const TIME_DEW_BONUS = 1
export const RESOURCE_TIDE_RATE = 0.40

// === 模块级状态 ===

/** 本词各资源类型产出量（每词开始时清空） */
const _wordResourceAmounts: Record<string, number> = {}

/** 本关已完成单词数（time_dew 计数器） */
let _timeDewCounter = 0

/** 本关单词序号（resource_tide 奇偶判断） */
let _wordParity = 0

// === 分数磁铁 (score_magnet) ===

/** 有遗物 → SCORE_MAGNET_BONUS，否则 0 */
export function checkScoreMagnet(): number {
  if (!state.player.relics.has('score_magnet')) return 0
  return SCORE_MAGNET_BONUS
}

// === 资源感应 (resource_sense) ===

/** 记录本词资源产出（正产出时调用） */
export function recordResourceProduction(resource: string, amount: number): void {
  if (amount <= 0) return
  _wordResourceAmounts[resource] = (_wordResourceAmounts[resource] || 0) + amount
}

/** 有遗物 + ≥3 种资源 → 返回最少那种 + 预计算bonus，否则 null */
export function checkResourceSense(): { resource: string; bonus: number } | null {
  if (!state.player.relics.has('resource_sense')) return null
  const types = Object.keys(_wordResourceAmounts)
  if (types.length < RESOURCE_SENSE_THRESHOLD) return null

  // 找出产出量最少的资源
  let minResource = types[0]
  let minAmount = _wordResourceAmounts[types[0]]
  for (let i = 1; i < types.length; i++) {
    if (_wordResourceAmounts[types[i]] < minAmount) {
      minAmount = _wordResourceAmounts[types[i]]
      minResource = types[i]
    }
  }

  const bonus = Math.floor(minAmount * RESOURCE_SENSE_BOOST)
  return { resource: minResource, bonus }
}

/** 每词开始时清空资源产出追踪 */
export function resetWordResourceAmounts(): void {
  for (const key of Object.keys(_wordResourceAmounts)) {
    delete _wordResourceAmounts[key]
  }
}

// === 时间露珠 (time_dew) ===

/** 递增本关单词计数器 */
export function incrementTimeDewCounter(): void {
  _timeDewCounter++
}

/** 有遗物 + counter 是 INTERVAL 的倍数 → TIME_DEW_BONUS，否则 0 */
export function checkTimeDew(): number {
  if (!state.player.relics.has('time_dew')) return 0
  if (_timeDewCounter === 0) return 0
  if (_timeDewCounter % TIME_DEW_INTERVAL === 0) return TIME_DEW_BONUS
  return 0
}

// === 资源潮汐 (resource_tide) ===

/** 递增本关单词序号 */
export function incrementWordParity(): void {
  _wordParity++
}

/** 当前潮汐增幅的资源类型：'base' 或 'multiplier' */
export function getCurrentTideResource(): 'base' | 'multiplier' {
  return _wordParity % 2 === 1 ? 'base' : 'multiplier'
}

/** 有遗物时按奇偶和资源类型返回加算率，否则 0 */
export function getResourceTideBonus(resource: string): number {
  if (!state.player.relics.has('resource_tide')) return 0
  const isOdd = _wordParity % 2 === 1
  if (isOdd && resource === 'base') return RESOURCE_TIDE_RATE
  if (!isOdd && resource === 'multiplier') return RESOURCE_TIDE_RATE
  return 0
}

// === 万物熔炉 (universal_furnace) ===

/** 有遗物 → 返回转化金币和覆盖标记，否则 null */
export function checkUniversalFurnace(): { bonusGold: number; overrideBase: boolean } | null {
  if (!state.player.relics.has('universal_furnace')) return null
  const overkill = Math.max(0, state.score - state.targetScore)
  const remainingTime = Math.max(0, Math.floor(state.time))
  return {
    bonusGold: overkill + remainingTime,
    overrideBase: true,
  }
}

// === 生命周期 ===

/** 每关开始时重置关级状态 */
export function resetResourceRelicBattleState(): void {
  _timeDewCounter = 0
  _wordParity = 0
}

/** 注册资源系统遗物行为 */
export function initResourceRelicBehaviors(): void {
  registerRelicBehavior('resource_tide', () => {
    // 行为逻辑由 getResourceTideBonus 在 applyResource 中直接调用
  })
}
