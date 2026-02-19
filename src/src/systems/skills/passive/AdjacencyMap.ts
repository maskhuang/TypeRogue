// ============================================
// 打字肉鸽 - 键盘相邻映射
// ============================================
// Story 2.1: 实现 QWERTY 键盘相邻关系查询

import { ADJACENT_KEYS, KEYS } from '../../../core/constants'

/**
 * 相邻技能信息
 */
export interface AdjacentSkillInfo {
  /** 相邻键位 */
  key: string
  /** 技能 ID */
  skillId: string
}

/**
 * 键盘相邻映射器
 *
 * 职责:
 * - 查询 QWERTY 键盘的相邻关系
 * - 获取相邻技能列表
 * - 计算相邻空位数量
 *
 * QWERTY 布局:
 * ```
 *   Q W E R T Y U I O P
 *    A S D F G H J K L
 *     Z X C V B N M
 * ```
 */
class AdjacencyMap {
  /**
   * 获取相邻键列表
   * @param key 键位（大小写不敏感）
   * @returns 相邻键列表（小写）
   */
  getAdjacent(key: string): string[] {
    const k = key.toLowerCase()
    return ADJACENT_KEYS[k] ? [...ADJACENT_KEYS[k]] : []
  }

  /**
   * 获取相邻键数量
   */
  getAdjacentCount(key: string): number {
    return this.getAdjacent(key).length
  }

  /**
   * 检查两个键是否相邻
   */
  isAdjacent(key1: string, key2: string): boolean {
    const k1 = key1.toLowerCase()
    const k2 = key2.toLowerCase()
    return this.getAdjacent(k1).includes(k2)
  }

  /**
   * 获取所有键位
   */
  getAllKeys(): string[] {
    return [...KEYS]
  }

  /**
   * 获取相邻的已绑定技能
   * @param key 键位
   * @param bindings 技能绑定映射 (key -> skillId)
   * @returns 相邻技能信息列表
   */
  getAdjacentSkills(
    key: string,
    bindings: Map<string, string>
  ): AdjacentSkillInfo[] {
    const adjacent = this.getAdjacent(key)
    const skills: AdjacentSkillInfo[] = []

    for (const adjKey of adjacent) {
      const skillId = bindings.get(adjKey)
      if (skillId) {
        skills.push({ key: adjKey, skillId })
      }
    }

    return skills
  }

  /**
   * 获取相邻空位数量
   * @param key 键位
   * @param bindings 技能绑定映射
   * @returns 没有绑定技能的相邻键数量
   */
  getAdjacentEmptyCount(
    key: string,
    bindings: Map<string, string>
  ): number {
    const adjacent = this.getAdjacent(key)
    return adjacent.filter(k => !bindings.has(k)).length
  }

  /**
   * 获取相邻已绑定数量
   */
  getAdjacentBoundCount(
    key: string,
    bindings: Map<string, string>
  ): number {
    const adjacent = this.getAdjacent(key)
    return adjacent.filter(k => bindings.has(k)).length
  }

  /**
   * 检查是否有相邻技能
   */
  hasAdjacentSkill(
    key: string,
    bindings: Map<string, string>
  ): boolean {
    const adjacent = this.getAdjacent(key)
    return adjacent.some(k => bindings.has(k))
  }

  /**
   * 检查是否完全孤立（无相邻技能）
   */
  isIsolated(
    key: string,
    bindings: Map<string, string>
  ): boolean {
    return !this.hasAdjacentSkill(key, bindings)
  }

  /**
   * 获取特定类型的相邻技能
   * @param key 键位
   * @param bindings 技能绑定映射
   * @param skillData 技能数据映射 (skillId -> skill)
   * @param skillType 要筛选的技能类型
   */
  getAdjacentSkillsByType<T extends { type: string }>(
    key: string,
    bindings: Map<string, string>,
    skillData: Record<string, T>,
    skillType: string
  ): AdjacentSkillInfo[] {
    return this.getAdjacentSkills(key, bindings).filter(info => {
      const skill = skillData[info.skillId]
      return skill && skill.type === skillType
    })
  }
}

// 导出单例实例
export const adjacencyMap = new AdjacencyMap()

// 同时导出类以便测试
export { AdjacencyMap }
