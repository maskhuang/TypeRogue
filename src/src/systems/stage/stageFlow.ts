// ============================================
// 打字肉鸽 - 关卡流程辅助（Legacy 系统用）
// ============================================
// Story 18.1: 10 节点关卡流程

import type { StageType } from './StageConfig'

/**
 * 10 节点流程定义
 *
 * 节点 1:  Stage 1 [standard] 30s
 * 节点 2:  Stage 2 [standard] 30s
 * 节点 3:  Stage 3 [elite]    45s  ← 修饰器 A
 * 节点 4:  休息关  [rest]
 * 节点 5:  Stage 4 [standard] 30s
 * 节点 6:  Stage 5 [elite]    45s  ← 修饰器 B
 * 节点 7:  Stage 6 [standard] 30s
 * 节点 8:  休息关  [rest]
 * 节点 9:  Stage 7 [elite]    45s  ← 修饰器 C
 * 节点 10: Stage 8 [boss]     60s  ← A/B/C 交替
 */

/** 每种关卡类型的固定时间 */
export const STAGE_TIME_LIMITS: Record<StageType, number> = {
  standard: 30,
  elite: 45,
  boss: 60,
  rest: 0,
}

/** 节点 → 关卡类型映射 */
const NODE_STAGE_TYPE: Record<number, StageType> = {
  1: 'standard',
  2: 'standard',
  3: 'elite',
  4: 'rest',
  5: 'standard',
  6: 'elite',
  7: 'standard',
  8: 'rest',
  9: 'elite',
  10: 'boss',
}

/** 节点 → Act 映射 */
const NODE_ACT: Record<number, number> = {
  1: 1, 2: 1, 3: 1, 4: 1,
  5: 2, 6: 2, 7: 2, 8: 2,
  9: 3, 10: 3,
}

/** 节点 → 战斗编号映射（休息关无战斗编号） */
const NODE_BATTLE_NUMBER: Record<number, number> = {
  1: 1, 2: 2, 3: 3,
  5: 4, 6: 5, 7: 6,
  9: 7, 10: 8,
}

/** 精英关节点 → 修饰器序号映射 */
const ELITE_MODIFIER_INDEX: Record<number, number> = {
  3: 0,  // 修饰器 A
  6: 1,  // 修饰器 B
  9: 2,  // 修饰器 C
}

export const TOTAL_NODES = 10

export function getStageType(nodeId: number): StageType {
  return NODE_STAGE_TYPE[nodeId] || 'standard'
}

export function getActForNode(nodeId: number): number {
  return NODE_ACT[nodeId] || 1
}

export function getBattleNumber(nodeId: number): number {
  return NODE_BATTLE_NUMBER[nodeId] || 0
}

export function isRestNode(nodeId: number): boolean {
  return getStageType(nodeId) === 'rest'
}

export function isEliteNode(nodeId: number): boolean {
  return getStageType(nodeId) === 'elite'
}

export function isBossNode(nodeId: number): boolean {
  return getStageType(nodeId) === 'boss'
}

export function getTimeLimit(nodeId: number): number {
  return STAGE_TIME_LIMITS[getStageType(nodeId)]
}

/**
 * 获取下一个战斗节点（跳过休息关）
 * @returns 下一个节点 ID，或 -1 表示通关
 */
export function getNextBattleNode(currentNodeId: number): number {
  let next = currentNodeId + 1
  while (next <= TOTAL_NODES) {
    if (!isRestNode(next)) return next
    next++
  }
  return -1 // 通关
}

/**
 * 获取精英关对应的修饰器索引 (0=A, 1=B, 2=C)
 * @returns 修饰器索引，非精英关返回 -1
 */
export function getEliteModifierIndex(nodeId: number): number {
  return ELITE_MODIFIER_INDEX[nodeId] ?? -1
}

/**
 * 检查当前节点后是否有休息关（Act 边界）
 */
export function hasRestAfter(nodeId: number): boolean {
  const next = nodeId + 1
  return next <= TOTAL_NODES && isRestNode(next)
}
