// ============================================
// 打字肉鸽 - StatsTab 单元测试
// ============================================
// Story 6.4: 图鉴场景 - 统计标签页测试 (AC: #4)

import { describe, it, expect, beforeEach } from 'vitest'
import { Container } from 'pixi.js'
import { StatsTab } from '../../../../src/scenes/collection/tabs/StatsTab'
import { MetaState } from '../../../../src/core/state/MetaState'

describe('StatsTab', () => {
  let metaState: MetaState
  let statsTab: StatsTab

  beforeEach(() => {
    metaState = new MetaState()
    statsTab = new StatsTab(metaState)
  })

  // ===========================================
  // Task 6: StatsTab 统计页面 (AC: #4)
  // ===========================================

  describe('基础功能', () => {
    it('应该创建 PixiJS Container', () => {
      expect(statsTab).toBeInstanceOf(Container)
    })

    it('应该渲染标题和统计容器', () => {
      // 至少有标题和统计容器
      expect(statsTab.children.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('统计数据 (AC: #4)', () => {
    it('应该返回统计数据', () => {
      const stats = statsTab.getStats()
      expect(stats).toBeDefined()
      expect(stats).toHaveProperty('totalRuns')
      expect(stats).toHaveProperty('victories')
      expect(stats).toHaveProperty('highestScore')
    })

    it('初始统计数据应该为 0', () => {
      const stats = statsTab.getStats()
      expect(stats.totalRuns).toBe(0)
      expect(stats.victories).toBe(0)
      expect(stats.highestScore).toBe(0)
      expect(stats.longestCombo).toBe(0)
    })

    it('更新统计后应该反映变化', () => {
      // 模拟一次游戏结果
      metaState.updateStats({
        runResult: 'victory',
        runStats: {
          totalScore: 1000,
          stagesCleared: 5,
          maxCombo: 20,
          skills: [],
          relics: []
        }
      })

      statsTab.refresh()
      const stats = statsTab.getStats()

      expect(stats.totalRuns).toBe(1)
      expect(stats.victories).toBe(1)
      expect(stats.highestScore).toBe(1000)
      expect(stats.longestCombo).toBe(20)
    })
  })

  describe('内容高度', () => {
    it('应该返回正确的内容高度', () => {
      const height = statsTab.getContentHeight()
      // 9 个统计项 × 50px + 50px 标题
      expect(height).toBe(50 + 9 * 50)
    })
  })

  describe('刷新', () => {
    it('refresh 应该重新渲染', () => {
      statsTab.refresh()
      // 刷新后仍应有子元素
      expect(statsTab.children.length).toBeGreaterThan(0)
    })
  })

  describe('销毁', () => {
    it('应该正确销毁组件', () => {
      expect(() => statsTab.destroy()).not.toThrow()
    })

    it('销毁后应该标记为已销毁', () => {
      statsTab.destroy()
      expect(statsTab.destroyed).toBe(true)
    })
  })
})
