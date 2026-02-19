// ============================================
// 打字肉鸽 - RelicTab 单元测试
// ============================================
// Story 6.4: 图鉴场景 - 遗物图鉴标签页测试 (AC: #3, #7)

import { describe, it, expect, beforeEach } from 'vitest'
import { Container } from 'pixi.js'
import { RelicTab } from '../../../../src/scenes/collection/tabs/RelicTab'
import { MetaState } from '../../../../src/core/state/MetaState'
import { RELICS } from '../../../../src/data/relics'

describe('RelicTab', () => {
  let metaState: MetaState
  let relicTab: RelicTab

  beforeEach(() => {
    metaState = new MetaState()
    relicTab = new RelicTab(metaState)
  })

  // ===========================================
  // Task 5: RelicTab 遗物图鉴 (AC: #3, #7)
  // ===========================================

  describe('基础功能', () => {
    it('应该创建 PixiJS Container', () => {
      expect(relicTab).toBeInstanceOf(Container)
    })

    it('应该渲染标题和网格', () => {
      // 至少有标题和网格容器
      expect(relicTab.children.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('遗物数据 (AC: #3)', () => {
    it('应该返回所有遗物项', () => {
      const items = relicTab.getRelicItems()
      expect(items.length).toBe(Object.keys(RELICS).length)
    })

    it('每个遗物项应该有正确的结构', () => {
      const items = relicTab.getRelicItems()
      items.forEach(item => {
        expect(item).toHaveProperty('id')
        expect(item).toHaveProperty('name')
        expect(item).toHaveProperty('description')
        expect(item).toHaveProperty('icon')
        expect(item).toHaveProperty('unlocked')
      })
    })

    it('应该标记默认解锁的遗物', () => {
      const items = relicTab.getRelicItems()
      const unlockedRelics = metaState.getUnlockedRelics()

      items.forEach(item => {
        const shouldBeUnlocked = unlockedRelics.includes(item.id)
        expect(item.unlocked).toBe(shouldBeUnlocked)
      })
    })
  })

  describe('统计数据 (AC: #7)', () => {
    it('应该返回正确的总遗物数', () => {
      const total = relicTab.getTotalCount()
      expect(total).toBe(Object.keys(RELICS).length)
    })

    it('应该返回正确的已解锁数', () => {
      const unlocked = relicTab.getUnlockedCount()
      expect(unlocked).toBe(metaState.getUnlockedRelics().length)
    })

    it('解锁新遗物后应该更新计数', () => {
      const initialCount = relicTab.getUnlockedCount()

      // 解锁一个新遗物
      metaState.unlockRelic('phoenix_feather')
      relicTab.refresh()

      expect(relicTab.getUnlockedCount()).toBe(initialCount + 1)
    })
  })

  describe('内容高度', () => {
    it('应该返回正确的内容高度', () => {
      const height = relicTab.getContentHeight()
      const totalRelics = Object.keys(RELICS).length
      const columns = 5
      const itemHeight = 150
      const expectedRows = Math.ceil(totalRelics / columns)
      const expectedHeight = 50 + expectedRows * itemHeight

      expect(height).toBe(expectedHeight)
    })
  })

  describe('刷新', () => {
    it('refresh 应该重新渲染', () => {
      relicTab.refresh()
      // 刷新后仍应有子元素
      expect(relicTab.children.length).toBeGreaterThan(0)
    })
  })

  describe('销毁', () => {
    it('应该正确销毁组件', () => {
      expect(() => relicTab.destroy()).not.toThrow()
    })

    it('销毁后应该标记为已销毁', () => {
      relicTab.destroy()
      expect(relicTab.destroyed).toBe(true)
    })
  })
})
