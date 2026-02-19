// ============================================
// 打字肉鸽 - 被动技能系统
// ============================================
// Story 2.4: 实现基于位置的被动技能联动

import { eventBus } from '../../../core/events/EventBus'
import { SKILL_EFFECTS } from '../../../core/constants'
import { SKILLS } from '../../../data/skills'
import { adjacencyMap, type AdjacentSkillInfo } from './AdjacencyMap'
import type { SkillType } from '../../../core/types'

/**
 * 被动加成结果
 */
export interface PassiveBonus {
  /** 基础值 */
  baseValue: number
  /** 加成后的值 */
  finalValue: number
  /** 加成倍率 */
  multiplier: number
  /** 加成来源 */
  sources: PassiveBonusSource[]
}

/**
 * 加成来源
 */
export interface PassiveBonusSource {
  type: 'aura' | 'core' | 'lone' | 'void' | 'ripple'
  key: string
  skillId: string
  bonus: number
}

/**
 * 全局被动加成结果
 */
export interface GlobalPassiveBonus {
  /** 全局分数倍率 */
  globalMultiplier: number
  /** 加成来源详情 */
  sources: PassiveBonusSource[]
}

/**
 * 技能触发结果
 */
export interface SkillTriggerResult {
  skillId: string
  key: string
  type: SkillType
  value: number
  bonus: PassiveBonus
}

/**
 * 被动技能系统
 *
 * 职责:
 * - 计算位置相关的被动加成
 * - 处理联动技能效果
 * - 管理技能触发
 */
class PassiveSkillSystem {
  private bindings: Map<string, string> = new Map()
  private skillLevels: Map<string, number> = new Map()
  private rippleBonus: Map<string, number> = new Map()

  /**
   * 设置技能绑定（防御性拷贝）
   */
  setBindings(bindings: Map<string, string>): void {
    this.bindings = new Map(bindings)
  }

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
    if (!skill) return 0

    const level = this.getSkillLevel(skillId)
    return skill.base + skill.grow * (level - 1)
  }

  /**
   * 计算被动加成
   */
  calculateBonus(key: string, skillId: string): PassiveBonus {
    const skill = SKILLS[skillId]
    if (!skill) {
      return { baseValue: 0, finalValue: 0, multiplier: 1, sources: [] }
    }

    const baseValue = this.calculateBaseValue(skillId)
    const sources: PassiveBonusSource[] = []
    let multiplier = 1

    // 获取相邻技能
    const adjacentSkills = adjacencyMap.getAdjacentSkills(key, this.bindings)

    // 光环加成：分数类技能被相邻光环加成
    if (skill.type === 'score') {
      const auraSkills = adjacentSkills.filter(s => SKILLS[s.skillId]?.type === 'aura')
      if (auraSkills.length > 0) {
        multiplier *= SKILL_EFFECTS.AURA_MULTIPLIER
        auraSkills.forEach(s => {
          sources.push({
            type: 'aura',
            key: s.key,
            skillId: s.skillId,
            bonus: SKILL_EFFECTS.AURA_MULTIPLIER - 1
          })
        })
      }
    }

    // 涟漪加成：检查是否有涟漪 buff
    if (this.rippleBonus.has(key)) {
      const rippleMultiplier = this.rippleBonus.get(key)!
      multiplier *= rippleMultiplier
      sources.push({
        type: 'ripple',
        key,
        skillId: '',
        bonus: rippleMultiplier - 1
      })
      this.rippleBonus.delete(key)
    }

    const finalValue = Math.floor(baseValue * multiplier)

    return { baseValue, finalValue, multiplier, sources }
  }

  /**
   * 计算联动技能的额外效果（仅用于需要按键触发的被动技能）
   */
  calculateSynergyEffect(key: string, skillId: string): number {
    const skill = SKILLS[skillId]
    if (!skill) return 0

    const baseValue = this.calculateBaseValue(skillId)

    switch (skill.type) {
      case 'core': {
        // 核心：每个相邻技能增加分数（需要按键触发）
        const adjacentCount = adjacencyMap.getAdjacentSkills(key, this.bindings).length
        return baseValue + adjacentCount * SKILL_EFFECTS.CORE_BONUS_PER_ADJACENT
      }

      // lone 和 void 现在是真正的被动技能，不需要按键触发
      // 它们的效果通过 calculateGlobalPassiveBonus() 计算

      default:
        return baseValue
    }
  }

  /**
   * 计算全局被动加成（战斗开始时调用，无需按键触发）
   *
   * 真正的被动技能基于键盘布局持续生效：
   * - lone（孤狼）：若技能所在键位无相邻技能，+20% 全局分数
   * - void（虚空）：每个相邻空位 +3% 全局分数
   */
  calculateGlobalPassiveBonus(): GlobalPassiveBonus {
    const sources: PassiveBonusSource[] = []
    let totalBonusPercent = 0

    // 遍历所有绑定的技能
    for (const [key, skillId] of this.bindings) {
      const skill = SKILLS[skillId]
      if (!skill || skill.category !== 'passive') continue

      const level = this.getSkillLevel(skillId)

      switch (skill.type) {
        case 'lone': {
          // 孤狼：若无相邻技能，+20% 全局分数（基于等级）
          const hasAdjacent = adjacencyMap.hasAdjacentSkill(key, this.bindings)
          if (!hasAdjacent) {
            const bonusPercent = skill.base + skill.grow * (level - 1)
            totalBonusPercent += bonusPercent
            sources.push({
              type: 'lone',
              key,
              skillId,
              bonus: bonusPercent / 100
            })
          }
          break
        }

        case 'void': {
          // 虚空：每个相邻空位 +3% 全局分数（基于等级）
          const emptyCount = adjacencyMap.getAdjacentEmptyCount(key, this.bindings)
          if (emptyCount > 0) {
            const bonusPerEmpty = skill.base + skill.grow * (level - 1)
            const bonusPercent = emptyCount * bonusPerEmpty
            totalBonusPercent += bonusPercent
            sources.push({
              type: 'void',
              key,
              skillId,
              bonus: bonusPercent / 100
            })
          }
          break
        }
      }
    }

    return {
      globalMultiplier: 1 + totalBonusPercent / 100,
      sources
    }
  }

  /**
   * 处理涟漪效果（现在用于技能链，设置下一个技能的加成）
   * @deprecated 涟漪现在通过 ActiveSkillSystem 的技能链处理
   */
  applyRipple(key: string): void {
    // 保留旧接口以兼容，但现在涟漪通过技能链处理
    this.rippleBonus.set(key, SKILL_EFFECTS.RIPPLE_MULTIPLIER)

    eventBus.emit('effect:queued', {
      effect: { type: 'ripple', target: 'next_skill' },
      queueSize: this.rippleBonus.size
    })
  }

  /**
   * 设置下一个技能的涟漪加成（技能链模式）
   */
  setNextSkillRipple(multiplier: number): void {
    this.rippleBonus.set('__next__', multiplier)
  }

  /**
   * 获取并消费下一个技能的涟漪加成
   */
  consumeNextSkillRipple(): number {
    const multiplier = this.rippleBonus.get('__next__') ?? 1
    this.rippleBonus.delete('__next__')
    return multiplier
  }

  /**
   * 检查是否有下一个技能的涟漪加成
   */
  hasNextSkillRipple(): boolean {
    return this.rippleBonus.has('__next__')
  }

  /**
   * 检查共鸣触发（已弃用，回响现在通过技能链处理）
   * @deprecated 回响现在通过 ActiveSkillSystem 的技能链处理
   */
  checkEchoTrigger(_key: string, _triggeredKeys: Set<string>): AdjacentSkillInfo[] {
    // 保留旧接口以兼容，但返回空数组
    // 回响现在通过技能链触发下一个技能
    return []
  }

  /**
   * 重置涟漪状态
   */
  clearRipple(): void {
    this.rippleBonus.clear()
  }

  /**
   * 重置所有状态
   */
  reset(): void {
    this.bindings.clear()
    this.skillLevels.clear()
    this.rippleBonus.clear()
  }
}

// 导出单例实例
export const passiveSkillSystem = new PassiveSkillSystem()

// 同时导出类以便测试
export { PassiveSkillSystem }
