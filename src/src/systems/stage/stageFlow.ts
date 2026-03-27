// ============================================
// 打字肉鸽 - 关卡流程辅助（Cycle 制）
// ============================================
// Story 42.1: 无限循环 — 每 CYCLE_LENGTH 关一个 Boss

import type { StageType } from './StageConfig'
import { BALANCE } from '../../core/constants'

/** 每个 Cycle 包含的关卡数（2 standard + 1 boss） */
export const CYCLE_LENGTH = BALANCE.CYCLE_LENGTH

/** 每种关卡类型的固定时间 */
export const STAGE_TIME_LIMITS: Record<StageType, number> = {
  standard: 30,
  boss: 60,
}

/** 动态获取关卡类型：每 CYCLE_LENGTH 关一个 Boss */
export function getStageType(stageNum: number): StageType {
  return isBossNode(stageNum) ? 'boss' : 'standard'
}

/** 获取战斗编号（无限循环中 battleNumber = stageNum） */
export function getBattleNumber(stageNum: number): number {
  return stageNum
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
