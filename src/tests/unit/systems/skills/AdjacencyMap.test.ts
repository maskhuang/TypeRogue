// ============================================
// 打字肉鸽 - AdjacencyMap 单元测试
// ============================================

import { describe, it, expect, beforeEach } from 'vitest'
import { AdjacencyMap } from '../../../../src/systems/skills/passive/AdjacencyMap'

describe('AdjacencyMap', () => {
  let adjacencyMap: AdjacencyMap

  beforeEach(() => {
    adjacencyMap = new AdjacencyMap()
  })

  describe('getAdjacent', () => {
    it('应该返回 F 键的相邻键', () => {
      const adjacent = adjacencyMap.getAdjacent('f')
      expect(adjacent).toContain('d')
      expect(adjacent).toContain('r')
      expect(adjacent).toContain('t')
      expect(adjacent).toContain('g')
      expect(adjacent).toContain('c')
      expect(adjacent).toContain('v')
    })

    it('应该处理大小写', () => {
      const lower = adjacencyMap.getAdjacent('f')
      const upper = adjacencyMap.getAdjacent('F')
      expect(lower).toEqual(upper)
    })

    it('无效键应该返回空数组', () => {
      const invalid = adjacencyMap.getAdjacent('1')
      expect(invalid).toEqual([])
    })

    it('边缘键应该有较少的相邻', () => {
      // Q 只有 W 和 A 相邻
      const adjacent = adjacencyMap.getAdjacent('q')
      expect(adjacent).toHaveLength(2)
      expect(adjacent).toContain('w')
      expect(adjacent).toContain('a')
    })
  })

  describe('isAdjacent', () => {
    it('相邻的键应该返回 true', () => {
      expect(adjacencyMap.isAdjacent('f', 'g')).toBe(true)
      expect(adjacencyMap.isAdjacent('F', 'G')).toBe(true)
    })

    it('不相邻的键应该返回 false', () => {
      expect(adjacencyMap.isAdjacent('f', 'z')).toBe(false)
    })
  })

  describe('getAdjacentSkills', () => {
    it('应该返回相邻已绑定的技能', () => {
      const bindings = new Map([
        ['f', 'skill1'],
        ['g', 'skill2'],
        ['z', 'skill3']  // 不相邻
      ])

      const skills = adjacencyMap.getAdjacentSkills('d', bindings)
      expect(skills).toHaveLength(1)
      expect(skills[0]).toEqual({ key: 'f', skillId: 'skill1' })
    })

    it('没有相邻技能时返回空数组', () => {
      const bindings = new Map([['z', 'skill1']])
      const skills = adjacencyMap.getAdjacentSkills('q', bindings)
      expect(skills).toEqual([])
    })
  })

  describe('getAdjacentEmptyCount', () => {
    it('应该计算空位数量', () => {
      const bindings = new Map([['g', 'skill1']])
      // F 有 6 个相邻: d, r, t, g, c, v
      // 只有 g 被绑定，所以有 5 个空位
      const emptyCount = adjacencyMap.getAdjacentEmptyCount('f', bindings)
      expect(emptyCount).toBe(5)
    })

    it('全部绑定时返回 0', () => {
      const bindings = new Map([
        ['d', 's1'], ['r', 's2'], ['t', 's3'],
        ['g', 's4'], ['c', 's5'], ['v', 's6']
      ])
      const emptyCount = adjacencyMap.getAdjacentEmptyCount('f', bindings)
      expect(emptyCount).toBe(0)
    })
  })

  describe('isIsolated', () => {
    it('没有相邻技能时应该返回 true', () => {
      const bindings = new Map([['z', 'skill1']])
      expect(adjacencyMap.isIsolated('q', bindings)).toBe(true)
    })

    it('有相邻技能时应该返回 false', () => {
      const bindings = new Map([['w', 'skill1']])
      expect(adjacencyMap.isIsolated('q', bindings)).toBe(false)
    })
  })
})
