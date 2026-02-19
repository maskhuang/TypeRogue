// ============================================
// 打字肉鸽 - 技能协调器
// ============================================
// Story 3.3: 协调被动与主动技能系统

import { eventBus } from '../../core/events/EventBus'
import { SKILLS } from '../../data/skills'
import { adjacencyMap } from './passive/AdjacencyMap'
import { passiveSkillSystem, type PassiveBonus, type GlobalPassiveBonus } from './passive/PassiveSkillSystem'
import { activeSkillSystem, type ActiveSkillResult } from './active/ActiveSkillSystem'
import { effectQueue, type QueuedEffect } from './active/EffectQueue'
import type { SkillType } from '../../core/types'

/**
 * 技能触发完整结果
 */
export interface FullSkillTriggerResult {
  /** 技能 ID */
  skillId: string
  /** 触发键位 */
  key: string
  /** 技能类型 */
  type: SkillType
  /** 最终计算值 */
  finalValue: number
  /** 被动加成详情 */
  passiveBonus: PassiveBonus
  /** 主动效果详情 */
  activeResult: ActiveSkillResult | null
  /** 队列效果 */
  appliedEffects: QueuedEffect[]
  /** 连锁触发 */
  chainTriggers: FullSkillTriggerResult[]
}

/**
 * 协调器配置
 */
export interface CoordinatorConfig {
  /** 启用连锁触发 */
  enableChain: boolean
  /** 最大连锁深度 */
  maxChainDepth: number
  /** 启用回响触发 */
  enableEcho: boolean
}

const DEFAULT_CONFIG: CoordinatorConfig = {
  enableChain: true,
  maxChainDepth: 3,
  enableEcho: true
}

/**
 * 技能协调器
 *
 * 职责:
 * - 统一管理技能触发流程
 * - 协调被动系统与主动系统
 * - 处理技能链（echo、ripple）
 * - 计算全局被动加成（lone、void）
 * - 发出技能相关事件
 */
class SkillCoordinator {
  private bindings: Map<string, string> = new Map()
  private skillLevels: Map<string, number> = new Map()
  private triggeredThisTurn: Set<string> = new Set()
  private config: CoordinatorConfig = DEFAULT_CONFIG
  /** 全局被动加成（战斗开始时计算） */
  private globalPassiveBonus: GlobalPassiveBonus = { globalMultiplier: 1, sources: [] }
  /** 技能链状态：是否触发下一个技能 */
  private pendingEchoTrigger = false
  /** 技能链状态：下一个技能的倍率加成 */
  private pendingRippleMultiplier = 1

  /**
   * 设置配置
   */
  setConfig(config: Partial<CoordinatorConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 设置技能绑定（防御性拷贝）
   * 设置后自动计算全局被动加成
   */
  setBindings(bindings: Map<string, string>): void {
    this.bindings = new Map(bindings)
    passiveSkillSystem.setBindings(this.bindings)
    // 计算全局被动加成（lone、void 等真正的被动技能）
    this.globalPassiveBonus = passiveSkillSystem.calculateGlobalPassiveBonus()
  }

  /**
   * 获取全局被动加成
   */
  getGlobalPassiveBonus(): GlobalPassiveBonus {
    return this.globalPassiveBonus
  }

  /**
   * 重新计算全局被动加成
   */
  recalculateGlobalPassive(): GlobalPassiveBonus {
    this.globalPassiveBonus = passiveSkillSystem.calculateGlobalPassiveBonus()
    return this.globalPassiveBonus
  }

  /**
   * 设置技能等级（防御性拷贝）
   */
  setSkillLevels(levels: Map<string, number>): void {
    this.skillLevels = new Map(levels)
    passiveSkillSystem.setSkillLevels(this.skillLevels)
    activeSkillSystem.setSkillLevels(this.skillLevels)
  }

  /**
   * 获取键位绑定的技能
   */
  getSkillAtKey(key: string): string | undefined {
    return this.bindings.get(key)
  }

  /**
   * 触发技能（主入口）
   *
   * 技能链处理：
   * - echo（回响）：设置 pendingEchoTrigger，下一个技能会额外触发
   * - ripple（涟漪）：设置 pendingRippleMultiplier，下一个技能效果 ×1.5
   */
  triggerSkill(key: string, depth = 0): FullSkillTriggerResult | null {
    const skillId = this.bindings.get(key)
    if (!skillId) return null

    const skill = SKILLS[skillId]
    if (!skill) return null

    // 防止无限循环
    if (depth >= this.config.maxChainDepth) return null

    // 标记已触发
    this.triggeredThisTurn.add(key)

    // 获取相邻键位（用于 aura 等被动加成）
    const adjacentKeys = adjacencyMap.getAdjacent(key)
    const adjacentSkillKeys = adjacentKeys.filter(k => this.bindings.has(k))

    // 1. 计算被动加成（aura 等基于键盘布局的加成）
    const passiveBonus = passiveSkillSystem.calculateBonus(key, skillId)

    // 2. 处理联动效果（core 等需要按键触发的被动）
    const synergyValue = passiveSkillSystem.calculateSynergyEffect(key, skillId)

    // 3. 应用技能链效果（来自上一个技能的 ripple）
    const appliedEffects: QueuedEffect[] = []
    let valueAfterQueue = synergyValue

    // 应用待处理的涟漪加成
    if (this.pendingRippleMultiplier > 1 && depth === 0) {
      valueAfterQueue = Math.floor(valueAfterQueue * this.pendingRippleMultiplier)
      appliedEffects.push({
        type: 'ripple',
        value: this.pendingRippleMultiplier,
        sourceSkillId: '',
        sourceKey: ''
      })
      this.pendingRippleMultiplier = 1
    }

    // 应用队列中的其他效果
    const targetedResult = activeSkillSystem.applyTargetedEffects(key, valueAfterQueue)
    valueAfterQueue = targetedResult.value

    const queueResult = activeSkillSystem.applyNextEffect(valueAfterQueue)
    valueAfterQueue = queueResult.value
    if (queueResult.appliedEffect) {
      appliedEffects.push(queueResult.appliedEffect)
    }

    // 4. 处理主动技能的技能链效果
    let activeResult: ActiveSkillResult | null = null
    if (skill.type === 'echo' || skill.type === 'ripple' || skill.type === 'combo') {
      activeResult = activeSkillSystem.processSkillTrigger(skillId, key, adjacentSkillKeys)

      // 设置技能链状态
      if (activeResult.triggerNext) {
        this.pendingEchoTrigger = true
      }
      if (activeResult.nextSkillMultiplier > 1) {
        this.pendingRippleMultiplier = activeResult.nextSkillMultiplier
      }
    }

    // 5. 计算最终值（应用被动加成和全局被动加成）
    let finalValue = Math.floor(valueAfterQueue * passiveBonus.multiplier)
    // 应用全局被动加成（lone、void）
    finalValue = Math.floor(finalValue * this.globalPassiveBonus.globalMultiplier)

    // 6. 发出事件
    eventBus.emit('skill:triggered', {
      key,
      skillId,
      type: depth === 0 ? 'active' : 'passive'
    })

    // 7. 处理连锁触发（不再使用基于位置的回响，技能链在 triggerSkillsForWord 中处理）
    const chainTriggers: FullSkillTriggerResult[] = []

    return {
      skillId,
      key,
      type: skill.type,
      finalValue,
      passiveBonus,
      activeResult,
      appliedEffects,
      chainTriggers
    }
  }

  /**
   * 批量触发技能（用于单词完成时）
   *
   * 技能链处理逻辑：
   * 1. 按顺序触发每个键位的技能
   * 2. 如果技能是 echo，下一个非 echo 技能会被额外触发
   * 3. 如果技能是 ripple，下一个技能效果 ×1.5
   */
  triggerSkillsForWord(keys: string[]): FullSkillTriggerResult[] {
    this.triggeredThisTurn.clear()
    this.pendingEchoTrigger = false
    this.pendingRippleMultiplier = 1

    const results: FullSkillTriggerResult[] = []

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      const skillId = this.bindings.get(key)
      const hasSkill = !!skillId

      // 检查是否有待处理的回响触发
      const shouldTriggerFromEcho = this.pendingEchoTrigger

      // 如果该键有技能
      if (hasSkill) {
        const skill = SKILLS[skillId]

        // 回响不能触发回响（防止无限循环）
        if (shouldTriggerFromEcho && skill?.type === 'echo') {
          // 跳过此 echo 技能，但保留 pendingEchoTrigger 给下一个非 echo 技能
          continue
        }

        // 消费回响触发状态
        if (shouldTriggerFromEcho) {
          this.pendingEchoTrigger = false
        }

        const result = this.triggerSkill(key)
        if (result) {
          results.push(result)
        }
      } else if (shouldTriggerFromEcho) {
        // 回响触发但该键没有技能，消耗回响效果
        this.pendingEchoTrigger = false
      }
    }

    return results
  }

  /**
   * 计算总分数
   */
  calculateTotalScore(results: FullSkillTriggerResult[]): number {
    let total = 0

    for (const result of results) {
      total += result.finalValue

      // 加上连锁触发的分数
      for (const chain of result.chainTriggers) {
        total += chain.finalValue
      }
    }

    return total
  }

  /**
   * 获取队列状态
   */
  getQueueStatus(): { length: number; effects: QueuedEffect[] } {
    return activeSkillSystem.getQueueStatus()
  }

  /**
   * 回合结束清理
   */
  endTurn(): void {
    this.triggeredThisTurn.clear()
    // 重置技能链状态
    this.pendingEchoTrigger = false
    this.pendingRippleMultiplier = 1
    // 清除过期效果
    effectQueue.clearExpired()
  }

  /**
   * 重置所有状态
   */
  reset(): void {
    this.bindings.clear()
    this.skillLevels.clear()
    this.triggeredThisTurn.clear()
    this.config = DEFAULT_CONFIG
    this.globalPassiveBonus = { globalMultiplier: 1, sources: [] }
    this.pendingEchoTrigger = false
    this.pendingRippleMultiplier = 1
    passiveSkillSystem.reset()
    activeSkillSystem.reset()
  }
}

// 导出单例实例
export const skillCoordinator = new SkillCoordinator()

// 同时导出类以便测试
export { SkillCoordinator }
