// ============================================
// 打字肉鸽 - 关卡流程辅助（Cycle 制）
// ============================================
// Story 42.1: 无限循环 — 每 CYCLE_LENGTH 关一个 Boss
// 12-Stage Cycle: (battle-shop)×5 → ritual → (battle-shop)×5 → boss

import type { StageType } from './StageConfig'
import { BALANCE } from '../../core/constants'

/** 每个 Cycle 包含的关卡数（5 standard + ritual + 5 standard + boss = 12） */
export const CYCLE_LENGTH = BALANCE.CYCLE_LENGTH

/** 每种关卡类型的固定时间 */
export const STAGE_TIME_LIMITS: Record<StageType, number> = {
  standard: 30,
  boss: 60,
  ritual: 0,
}

/** 获取当前关在 Cycle 内的位置（1-12） */
export function getPositionInCycle(stageNum: number): number {
  return ((stageNum - 1) % CYCLE_LENGTH) + 1
}

/** 检查是否为仪式节点（Cycle 内第 6 关） */
export function isRitualNode(stageNum: number): boolean {
  return getPositionInCycle(stageNum) === 6
}

/** 检查是否为 Cycle 后半段（位置 7-12） */
export function isSecondHalf(stageNum: number): boolean {
  return getPositionInCycle(stageNum) >= 7
}

/** 动态获取关卡类型：boss → ritual → standard */
export function getStageType(stageNum: number): StageType {
  if (isBossNode(stageNum)) return 'boss'
  if (isRitualNode(stageNum)) return 'ritual'
  return 'standard'
}

/** 获取战斗编号（跳过仪式节点：位置 7→battle 6, 位置 12→battle 10, boss=11th battle） */
export function getBattleNumber(stageNum: number): number {
  const cycle = getCycleForStage(stageNum)
  const pos = getPositionInCycle(stageNum)
  const cycleOffset = (cycle - 1) * 11 // each cycle has 11 battles (12 stages - 1 ritual)
  // positions 1-5: battles 1-5
  if (pos <= 5) return cycleOffset + pos
  // position 6: ritual (no battle, but shouldn't be called)
  if (pos === 6) return cycleOffset + 5
  // positions 7-11: battles 6-10
  if (pos <= 11) return cycleOffset + (pos - 1)
  // position 12 (boss): battle 11
  return cycleOffset + 11
}

/** 检查是否为 Boss 关（每 CYCLE_LENGTH 关） */
export function isBossNode(stageNum: number): boolean {
  return stageNum > 0 && stageNum % CYCLE_LENGTH === 0
}

/** 获取关卡所属 Cycle（从 1 开始） */
export function getCycleForStage(stageNum: number): number {
  return Math.ceil(stageNum / CYCLE_LENGTH)
}

/** 获取基础时间限制 */
export function getTimeLimit(stageNum: number): number {
  return STAGE_TIME_LIMITS[getStageType(stageNum)]
}

/** 获取 cycle 衰减后的时间限制（取整） */
export function getCycleTimeLimit(stageNum: number, cycle: number): number {
  const base = STAGE_TIME_LIMITS[getStageType(stageNum)]
  return Math.round(base * Math.pow(BALANCE.CYCLE_TIME_DECAY, cycle - 1))
}

/** 获取下一个战斗节点（无限循环，始终 +1） */
export function getNextBattleNode(currentStageNum: number): number {
  return currentStageNum + 1
}
