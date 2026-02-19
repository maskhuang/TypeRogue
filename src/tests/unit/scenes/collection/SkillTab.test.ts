// ============================================
// 打字肉鸽 - SkillTab 单元测试
// ============================================
// Story 6.4: 图鉴场景 - 技能图鉴标签页测试 (AC: #2, #7)

import { describe, it, expect, beforeEach } from 'vitest'
import { Container } from 'pixi.js'
import { SkillTab } from '../../../../src/scenes/collection/tabs/SkillTab'
import { MetaState } from '../../../../src/core/state/MetaState'
import { SKILLS } from '../../../../src/data/skills'

describe('SkillTab', () => {
  let metaState: MetaState
  let skillTab: SkillTab

  beforeEach(() => {
    metaState = new MetaState()
    skillTab = new SkillTab(metaState)
  })

  // ===========================================
  // Task 4: SkillTab 技能图鉴 (AC: #2, #7)
  // ===========================================

  describe('基础功能', () => {
    it('应该创建 PixiJS Container', () => {
      expect(skillTab).toBeInstanceOf(Container)
    })

    it('应该渲染标题和网格', () => {
      // 至少有标题和网格容器
      expect(skillTab.children.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('技能数据 (AC: #2)', () => {
    it('应该返回所有技能项', () => {
      const items = skillTab.getSkillItems()
      expect(items.length).toBe(Object.keys(SKILLS).length)
    })

    it('每个技能项应该有正确的结构', () => {
      const items = skillTab.getSkillItems()
      items.forEach(item => {
        expect(item).toHaveProperty('id')
        expect(item).toHaveProperty('name')
        expect(item).toHaveProperty('description')
        expect(item).toHaveProperty('icon')
        expect(item).toHaveProperty('unlocked')
      })
    })

    it('应该标记默认解锁的技能', () => {
      const items = skillTab.getSkillItems()
      const unlockedSkills = metaState.getUnlockedSkills()

      items.forEach(item => {
        const shouldBeUnlocked = unlockedSkills.includes(item.id)
        expect(item.unlocked).toBe(shouldBeUnlocked)
      })
    })
  })

  describe('统计数据 (AC: #7)', () => {
    it('应该返回正确的总技能数', () => {
      const total = skillTab.getTotalCount()
      expect(total).toBe(Object.keys(SKILLS).length)
    })

    it('应该返回正确的已解锁数', () => {
      const unlocked = skillTab.getUnlockedCount()
      expect(unlocked).toBe(metaState.getUnlockedSkills().length)
    })

    it('解锁新技能后应该更新计数', () => {
      const initialCount = skillTab.getUnlockedCount()

      // 解锁一个新技能
      metaState.unlockSkill('new_test_skill')
      skillTab.refresh()

      expect(skillTab.getUnlockedCount()).toBe(initialCount + 1)
    })
  })

  describe('内容高度', () => {
    it('应该返回正确的内容高度', () => {
      const height = skillTab.getContentHeight()
      const totalSkills = Object.keys(SKILLS).length
      const columns = 5
      const itemHeight = 150
      const expectedRows = Math.ceil(totalSkills / columns)
      const expectedHeight = 50 + expectedRows * itemHeight

      expect(height).toBe(expectedHeight)
    })
  })

  describe('刷新', () => {
    it('refresh 应该重新渲染', () => {
      const childCountBefore = skillTab.children.length
      skillTab.refresh()
      // 刷新后仍应有子元素
      expect(skillTab.children.length).toBeGreaterThan(0)
    })
  })

  describe('销毁', () => {
    it('应该正确销毁组件', () => {
      expect(() => skillTab.destroy()).not.toThrow()
    })

    it('销毁后应该标记为已销毁', () => {
      skillTab.destroy()
      expect(skillTab.destroyed).toBe(true)
    })
  })
})
