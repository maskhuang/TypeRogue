// ============================================
// 打字肉鸽 - 资源系统遗物行为 (Story 36.8)
// ============================================
// 6 个资源系统遗物的纯函数行为模块

import { state } from '../../core/state'
import { registerRelicBehavior } from './RelicPipeline'
import { GENERIC_RESOURCES } from '../classes/ClassResourceFilter'
import { eventBus } from '../../core/events/EventBus'
import { t, setRelicPlaceholderResolver } from '../../demo/demo-i18n'
import { random as seededRandom } from '../../core/seededRandom'
import type { ResourceType } from '../../core/types'

// ============================================
// 产资源遗物 · 生成时赋值资源类型（A 方案：ratio × 资源Lv1基数 归一）
// ============================================
// 这些遗物原本写死产出 gold / time；改为获取时从 RESOURCE_ROLL_POOL 随机 roll
// 一种资源类型，存入 relicStates[relicId]（索引，随存档持久化）。
// 数量经 ratio × 资源Lv1基数 归一，使 roll 到原资源时数值不变（与 affixV2 gain_resource 一致）。

/** 可 roll 的通用资源池（= resource_tide 同款四资源；不含 score/shield） */
export const RESOURCE_ROLL_POOL: readonly ResourceType[] = ['base', 'multiplier', 'time', 'gold']

/** 资源 Lv1 基数（与 affixV2BattleIntegration DEFAULT_LV1_BASES 对齐；本地副本避免循环依赖） */
const RESOURCE_LV1_BASE: Record<string, number> = { base: 4, multiplier: 0.35, time: 0.2, gold: 3 }

/** 各产资源遗物的 ratio（= 原固定额度 ÷ 原资源Lv1基数）。注释列出原值。 */
const RESOURCE_ROLL_RATIO: Record<string, number> = {
  production_dividend: 2 / 3,     // 原 +2 金币
  time_trickle:        0.05 / 0.2,// 原 +0.05s
  crit_bonus:          3 / 3,     // 原 +3 金币
  enchant_dividend:    2 / 3,     // 原 +2 金币
  word_collection:     3 / 3,     // 原 +3 金币
  long_word_master:    1 / 0.2,   // 原 +1s
  accelerate_reward:   2 / 3,     // 原 +2 金币
  decelerate_reward:   0.5 / 0.2, // 原 +0.5s
  row_switch:          1 / 3,     // 原 +1 金币
  dual_concerto:       0.5 / 0.2, // 原 +0.5s
}

/** 该遗物是否走"生成时赋资源"机制 */
export function isResourceRollRelic(relicId: string): boolean {
  return relicId in RESOURCE_ROLL_RATIO
}

/** 获取遗物 roll 到的资源类型（未赋值时回退 gold） */
export function getRelicRolledResource(relicId: string): ResourceType {
  const idx = state.player.relicStates[relicId]
  if (idx === undefined || idx < 0 || idx >= RESOURCE_ROLL_POOL.length) return 'gold'
  return RESOURCE_ROLL_POOL[idx]
}

/** 获取遗物本次应产出的 {资源, 数量}；非产资源遗物或未持有返回 null */
export function getRelicRolledGrant(relicId: string): { resource: ResourceType; amount: number } | null {
  const ratio = RESOURCE_ROLL_RATIO[relicId]
  if (ratio === undefined) return null
  const resource = getRelicRolledResource(relicId)
  return { resource, amount: ratio * (RESOURCE_LV1_BASE[resource] ?? 1) }
}

/** 随机赋资源类型（幂等：已赋值则不动，保证存档稳定 + 回放确定性）·
 *  默认用 seeded random；roll 时机见 preRollOfferedResources（生成时）与 relic:acquired（兜底） */
export function assignRolledResource(relicId: string, randomFn: () => number = seededRandom): void {
  if (RESOURCE_ROLL_RATIO[relicId] === undefined) return
  if (state.player.relicStates[relicId] === undefined) {
    state.player.relicStates[relicId] = Math.floor(randomFn() * RESOURCE_ROLL_POOL.length)
  }
}

/** 生成时预 roll：给一批"将要展示给玩家"的遗物（商店上架 / 奖励候选）提前赋值，
 *  使其在【购买/选取前】即可见资源类型。幂等 + seeded；非产资源遗物自动跳过。 */
export function preRollOfferedResources(relicIds: readonly string[]): void {
  for (const id of relicIds) assignRolledResource(id)
}

/** 描述占位符 {resource} 解析：已赋值（商店上架即赋值）→实际资源名；从未赋值→"随机资源" */
function resolveRolledResourceLabel(relicId: string): string {
  if (state.player.relicStates[relicId] === undefined) return t('resource.random')
  return t(`resource.${getRelicRolledResource(relicId)}`)
}

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
  // 熔炉源资源池：所有通用资源排除转换目标（金币）
  const pool = GENERIC_RESOURCES.filter(r => r !== 'gold')
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

  // 产资源遗物：获取时随机赋资源类型
  eventBus.on('relic:acquired', ({ relicId }) => assignRolledResource(relicId))

  // 描述 {resource} 占位符解析（localizeItemDesc 渲染时回调）
  setRelicPlaceholderResolver((id, desc) =>
    isResourceRollRelic(id) && desc.includes('{resource}')
      ? desc.replace(/\{resource\}/g, resolveRolledResourceLabel(id))
      : desc
  )
}
