// ============================================
// 打字肉鸽 - 解锁系统
// ============================================
// Story 6.3: 解锁系统 - 核心实现

import { eventBus } from '../events/EventBus'
import type { MetaState, MetaStats, RunResultData } from '../state/MetaState'
import { UNLOCK_DEFINITIONS } from './unlock-definitions'

// ===========================================
// 类型定义 (AC: #1)
// ===========================================

/**
 * 解锁条件类型
 */
export type UnlockConditionType =
  | 'milestone'    // 里程碑：首次通关特定 Act
  | 'build'        // Build 成就：特定技能组合通关
  | 'stats'        // 统计阈值：总局数、胜利次数等
  | 'challenge'    // 挑战完成：Ascension 等级等

/**
 * 解锁条件接口 (AC: #1)
 */
export interface UnlockCondition {
  type: UnlockConditionType
  // 里程碑条件
  milestone?: {
    act: number        // 通关的 Act (1, 2, 3)
    minStages: number  // 最少通关关卡数
  }
  // Build 成就条件
  build?: {
    requiredSkills: string[]  // 需要的技能 ID 列表
    minSkillCount?: number    // 最少持有技能数（可选）
    mustWin: boolean          // 是否必须胜利
  }
  // 统计阈值条件
  stats?: {
    field: keyof MetaStats    // 统计字段
    threshold: number         // 阈值
  }
  // 挑战条件
  challenge?: {
    ascensionLevel: number    // Ascension 等级
  }
}

/**
 * 解锁定义 (AC: #1)
 */
export interface UnlockDefinition {
  id: string                   // 解锁项 ID
  type: 'skill' | 'relic'      // 解锁类型
  targetId: string             // 目标技能/遗物 ID
  name: string                 // 显示名称
  description: string          // 解锁条件描述
  condition: UnlockCondition   // 解锁条件
}

// ===========================================
// UnlockSystem 类 (AC: #2, #3, #4, #5, #6)
// ===========================================

/**
 * UnlockSystem - 管理解锁条件检查
 *
 * 职责:
 * - 检查解锁条件是否满足
 * - 触发解锁并通知 MetaState
 * - 发送解锁通知事件
 */
export class UnlockSystem {
  private metaState: MetaState
  private definitions: UnlockDefinition[]

  constructor(metaState: MetaState) {
    this.metaState = metaState
    this.definitions = UNLOCK_DEFINITIONS
  }

  /**
   * 检查所有解锁条件 (AC: #5)
   * @returns 新解锁的项目列表
   */
  checkUnlocks(data: RunResultData): UnlockDefinition[] {
    const newUnlocks: UnlockDefinition[] = []
    const stats = this.metaState.getStats()

    for (const def of this.definitions) {
      // 跳过已解锁的
      if (this.isAlreadyUnlocked(def)) {
        continue
      }

      // 检查条件是否满足
      if (this.checkCondition(def.condition, data, stats)) {
        // 执行解锁
        this.unlock(def)
        newUnlocks.push(def)
      }
    }

    return newUnlocks
  }

  /**
   * 检查是否已解锁
   */
  private isAlreadyUnlocked(def: UnlockDefinition): boolean {
    if (def.type === 'skill') {
      return this.metaState.isSkillUnlocked(def.targetId)
    } else {
      return this.metaState.isRelicUnlocked(def.targetId)
    }
  }

  /**
   * 检查单个条件 (AC: #2, #3, #4)
   */
  private checkCondition(
    condition: UnlockCondition,
    data: RunResultData,
    stats: MetaStats
  ): boolean {
    switch (condition.type) {
      case 'milestone':
        return this.checkMilestone(condition, data)
      case 'build':
        return this.checkBuild(condition, data)
      case 'stats':
        return this.checkStats(condition, stats)
      case 'challenge':
        return this.checkChallenge(condition, data)
      default:
        return false
    }
  }

  /**
   * 里程碑检查 (AC: #2)
   * 首次通关指定 Act
   */
  private checkMilestone(
    condition: UnlockCondition,
    data: RunResultData
  ): boolean {
    const milestone = condition.milestone
    if (!milestone) return false

    // 必须胜利
    if (data.runResult !== 'victory') return false

    // 检查通关关卡数
    return data.runStats.stagesCleared >= milestone.minStages
  }

  /**
   * Build 成就检查 (AC: #3)
   * 特定技能组合通关
   */
  private checkBuild(
    condition: UnlockCondition,
    data: RunResultData
  ): boolean {
    const build = condition.build
    if (!build) return false

    // 检查胜利条件
    if (build.mustWin && data.runResult !== 'victory') {
      return false
    }

    const playerSkills = data.runStats.skills

    // 检查必需技能
    for (const required of build.requiredSkills) {
      if (!playerSkills.includes(required)) {
        return false
      }
    }

    // 检查技能数量
    if (build.minSkillCount !== undefined) {
      if (playerSkills.length < build.minSkillCount) {
        return false
      }
    }

    return true
  }

  /**
   * 统计阈值检查 (AC: #4)
   */
  private checkStats(
    condition: UnlockCondition,
    stats: MetaStats
  ): boolean {
    const statsCond = condition.stats
    if (!statsCond) return false

    const value = stats[statsCond.field]
    return value >= statsCond.threshold
  }

  /**
   * 挑战检查
   * 注意：Ascension 数据需要从 RunResultData 扩展
   */
  private checkChallenge(
    condition: UnlockCondition,
    data: RunResultData
  ): boolean {
    const challenge = condition.challenge
    if (!challenge) return false

    // 必须胜利
    if (data.runResult !== 'victory') return false

    // 检查 Ascension 等级（从 runStats 扩展字段获取）
    const ascension = (data.runStats as { ascensionLevel?: number }).ascensionLevel ?? 0
    return ascension >= challenge.ascensionLevel
  }

  /**
   * 执行解锁 (AC: #6)
   */
  private unlock(def: UnlockDefinition): void {
    if (def.type === 'skill') {
      this.metaState.unlockSkill(def.targetId)
    } else {
      this.metaState.unlockRelic(def.targetId)
    }

    // 发送解锁通知事件（用于 UI 显示）
    eventBus.emit('unlock:new', {
      definition: def,
      type: def.type,
      targetId: def.targetId,
      name: def.name,
      description: def.description,
    })
  }
}
