// ============================================
// 打字肉鸽 - 资源系统遗物行为 (Story 36.8)
// ============================================
// 6 个资源系统遗物的纯函数行为模块

import { state } from '../../core/state'
import { registerRelicBehavior } from './RelicPipeline'

// === 产出分红 (production_dividend) ===
export const DIVIDEND_CHANCE = 0.05
export const DIVIDEND_GOLD = 2

/** 产出分红：5%概率+2金币。在 applyResource 正产出时调用 */
export function rollProductionDividend(): number {
  if (!state.player.relics.has('production_dividend')) return 0
  return Math.random() < DIVIDEND_CHANCE ? DIVIDEND_GOLD : 0
}

// === 续命涓流 (time_trickle) ===
export const TRICKLE_TIME = 0.05

/** 续命涓流：+0.05s。在 applyResource 正产出时调用 */
export function getTimeTrickle(): number {
  if (!state.player.relics.has('time_trickle')) return 0
  return TRICKLE_TIME
}

// === 资源专精 (resource_focus) ===
export const RESOURCE_FOCUS_RATE = 0.25

/** 分析已装备技能，找出产出最多的资源类型 */
export function getResourceFocusType(): string | null {
  if (!state.player.relics.has('resource_focus')) return null
  const counts: Record<string, number> = {}
  for (const [, sk] of state.affixSkills) {
    const res = sk.resource
    counts[res] = (counts[res] || 0) + 1
  }
  let maxRes: string | null = null
  let maxCount = 0
  for (const [res, count] of Object.entries(counts)) {
    if (count > maxCount) { maxCount = count; maxRes = res }
  }
  return maxRes
}

/** 返回对指定资源的加成率（加算到 relicBonus） */
export function getResourceFocusBonus(resource: string): number {
  const focusType = getResourceFocusType()
  if (!focusType || focusType !== resource) return 0
  return RESOURCE_FOCUS_RATE
}

// === 多元投资 (resource_diversity) ===
export const DIVERSITY_THRESHOLD = 3
export const DIVERSITY_RATE = 0.20

/** 检查装备技能是否覆盖≥3种资源类型 */
export function getResourceDiversityBonus(): number {
  if (!state.player.relics.has('resource_diversity')) return 0
  const types = new Set<string>()
  for (const [, sk] of state.affixSkills) {
    types.add(sk.resource)
  }
  return types.size >= DIVERSITY_THRESHOLD ? DIVERSITY_RATE : 0
}

// === 资源潮汐 (resource_tide) ===
export const RESOURCE_TIDE_RATE = 0.80

/** 本关单词序号（resource_tide 相位判断） */
let _wordParity = 0

const TIDE_PHASE_RESOURCE = ['base', 'multiplier', 'time', 'gold'] as const

/** 递增本关单词序号 */
export function incrementWordParity(): void {
  _wordParity++
}

/** 获取当前潮汐相位（0=底分, 1=倍率, 2=时间, 3=金币） */
export function getCurrentTidePhase(): number {
  return _wordParity % 4
}

/** 获取当前潮汐相位对应的资源类型名（用于 UI 展示） */
export function getCurrentTideResource(): string {
  return TIDE_PHASE_RESOURCE[getCurrentTidePhase()]
}

/** 有遗物时按相位和资源类型返回加算率，否则 0 */
export function getResourceTideBonus(resource: string): number {
  if (!state.player.relics.has('resource_tide')) return 0
  return resource === TIDE_PHASE_RESOURCE[getCurrentTidePhase()]
    ? RESOURCE_TIDE_RATE : 0
}

// === 贤者之石 (universal_furnace) ===

/** 熔炉源/目标资源（获取遗物时随机赋值） */
let _furnaceFrom: import('../../core/types').ResourceType | null = null
let _furnaceTo: import('../../core/types').ResourceType | null = null

/** 获取熔炉配置 */
export function getFurnaceConfig(): { from: string; to: string } | null {
  if (!state.player.relics.has('universal_furnace') || !_furnaceFrom || !_furnaceTo) return null
  return { from: _furnaceFrom, to: _furnaceTo }
}

/** 初始化熔炉资源（获取遗物时调用） */
export function initFurnace(randomFn: () => number = Math.random): void {
  const pool: import('../../core/types').ResourceType[] = ['base', 'score', 'multiplier', 'time', 'shield']
  _furnaceFrom = pool[Math.floor(randomFn() * pool.length)]
  _furnaceTo = 'gold'
}

/** 资源转化：如果是熔炉源资源，转为目标资源 */
export function applyFurnaceConversion(resource: import('../../core/types').ResourceType): import('../../core/types').ResourceType {
  if (!state.player.relics.has('universal_furnace')) return resource
  if (resource === _furnaceFrom && _furnaceTo) return _furnaceTo
  return resource
}

/** @deprecated 旧版万物熔炉金币覆盖，已重设计 */
export function checkUniversalFurnace(_targetReachedTime?: number): null {
  return null
}

// === 生命周期 ===

/** 每关开始时重置关级状态 */
export function resetResourceRelicBattleState(): void {
  _wordParity = 0
}

/** 注册资源系统遗物行为 */
export function initResourceRelicBehaviors(): void {
  registerRelicBehavior('resource_tide', () => {
    // 行为逻辑由 getResourceTideBonus 在 applyResource 中直接调用
  })
}
