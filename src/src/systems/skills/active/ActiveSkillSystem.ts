// ============================================
// 打字肉鸽 - 主动技能系统
// ============================================
// Story 3.2: 实现基于顺序的主动技能效果

import { SKILL_EFFECTS } from '../../../core/constants'
import { SKILLS } from '../../../data/skills'
import { effectQueue, type QueuedEffect } from './EffectQueue'
import type { SkillType } from '../../../core/types'

/**
 * 主动技能触发结果
 */
export interface ActiveSkillResult {
  /** 技能 ID */
  skillId: string
  /** 触发键位 */
  key: string
  /** 技能类型 */
  type: SkillType
  /** 计算后的值 */
  value: number
  /** 是否产生了队列效果 */
  queuedEffect: boolean
  /** 效果描述 */
  description: string
  /** 技能链效果：是否触发下一个技能 */
  triggerNext: boolean
  /** 技能链效果：下一个技能的倍率加成 */
  nextSkillMultiplier: number
}

/**
 * 主动技能系统
 *
 * 职责:
 * - 处理顺序相关的技能效果
 * - 管理效果队列
 * - 应用队列效果到技能触发
 */
class ActiveSkillSystem {
  private skillLevels: Map<string, number> = new Map()

  /**
   * 设置技能等级（防御性拷贝）
   */
  setSkillLevels(levels: Map<string, number>): void {
    this.skillLevels = new Map(levels)
  }

  /**
   * 获取技能等级
   */
  getSkillLevel(skillId: string): number {
    return this.skillLevels.get(skillId) ?? 1
  }

  /**
   * 计算技能基础值（含等级加成）
   */
  calculateBaseValue(skillId: string): number {
    const skill = SKILLS[skillId]
    if (!skill) {
      console.warn(`ActiveSkillSystem: Unknown skill "${skillId}", returning 0`)
      return 0
    }

    const level = this.getSkillLevel(skillId)
    return skill.base + skill.grow * (level - 1)
  }

  /**
   * 应用队列中的下一个效果
   */
  applyNextEffect(baseValue: number): { value: number; appliedEffect: QueuedEffect | null } {
    const result = effectQueue.applyNext(baseValue)
    return {
      value: result.value,
      appliedEffect: result.appliedEffect
    }
  }

  /**
   * 处理技能触发，可能产生技能链效果
   *
   * 技能链逻辑（主动技能互动范围）：
   * - echo（回响）：触发后，下一个技能也被触发
   * - ripple（涟漪）：触发后，下一个技能效果 ×1.5
   */
  processSkillTrigger(
    skillId: string,
    key: string,
    _adjacentKeys: string[] = []
  ): ActiveSkillResult {
    const skill = SKILLS[skillId]
    if (!skill) {
      return {
        skillId,
        key,
        type: 'score',
        value: 0,
        queuedEffect: false,
        description: '',
        triggerNext: false,
        nextSkillMultiplier: 1
      }
    }

    const baseValue = this.calculateBaseValue(skillId)
    let queuedEffect = false
    let description = ''
    let triggerNext = false
    let nextSkillMultiplier = 1

    // 根据技能类型处理技能链效果
    switch (skill.type) {
      case 'echo':
        // 回响（技能链）：触发后，下一个技能也被触发
        triggerNext = true
        queuedEffect = true
        description = '回响 → 下一个技能'
        // 入队 echo 效果，标记下一个技能需要触发
        effectQueue.enqueue({
          type: 'echo',
          value: 1,
          sourceSkillId: skillId,
          sourceKey: key
        })
        break

      case 'ripple':
        // 涟漪（技能链）：触发后，下一个技能效果 ×1.5
        nextSkillMultiplier = SKILL_EFFECTS.RIPPLE_MULTIPLIER
        queuedEffect = true
        description = `涟漪 → 下一个技能 ×${SKILL_EFFECTS.RIPPLE_MULTIPLIER}`
        // 入队 ripple 效果，标记下一个技能获得加成
        effectQueue.enqueue({
          type: 'ripple',
          value: SKILL_EFFECTS.RIPPLE_MULTIPLIER,
          sourceSkillId: skillId,
          sourceKey: key
        })
        break

      default:
        // 其他技能不产生队列效果
        break
    }

    return {
      skillId,
      key,
      type: skill.type,
      value: baseValue,
      queuedEffect,
      description,
      triggerNext,
      nextSkillMultiplier
    }
  }

  /**
   * 检查并消费下一个技能的回响效果
   */
  consumeEchoEffect(): boolean {
    const echoEffects = effectQueue.peekAll().filter(e => e.type === 'echo')
    if (echoEffects.length > 0) {
      // 消费第一个 echo 效果
      effectQueue.applyAllMatching(0, e => e.type === 'echo' && e === echoEffects[0])
      return true
    }
    return false
  }

  /**
   * 检查并消费下一个技能的涟漪效果
   */
  consumeRippleEffect(): number {
    const rippleEffects = effectQueue.peekAll().filter(e => e.type === 'ripple' && !e.targetKey)
    if (rippleEffects.length > 0) {
      const effect = rippleEffects[0]
      effectQueue.applyAllMatching(0, e => e === effect)
      return effect.value
    }
    return 1
  }

  /**
   * 检查并应用定向效果（针对特定键位）
   */
  applyTargetedEffects(key: string, baseValue: number): { value: number; applied: number } {
    const result = effectQueue.applyAllMatching(
      baseValue,
      effect => effect.targetKey === key
    )

    return {
      value: result.value,
      applied: result.appliedEffects.length
    }
  }

  /**
   * 获取当前队列状态
   */
  getQueueStatus(): { length: number; effects: QueuedEffect[] } {
    return {
      length: effectQueue.length,
      effects: effectQueue.peekAll()
    }
  }

  /**
   * 清空效果队列
   */
  clearQueue(): void {
    effectQueue.clear()
  }

  /**
   * 重置系统状态
   */
  reset(): void {
    this.skillLevels.clear()
    effectQueue.clear()
  }
}

// 导出单例实例
export const activeSkillSystem = new ActiveSkillSystem()

// 同时导出类以便测试
export { ActiveSkillSystem }
