// ============================================
// 打字肉鸽 - ClassManager 单元测试
// ============================================
// Story 32.1 Task 6: 职业系统测试

import { describe, it, expect, beforeEach } from 'vitest'
import { classManager } from '../../../../src/systems/classes/ClassManager'
import { state, resetState } from '../../../../src/core/state'
import { CLASS_DEFINITIONS } from '../../../../src/data/classes'

describe('ClassManager', () => {
  beforeEach(() => {
    resetState()
  })

  // ===========================================
  // 注册测试 (AC: #2)
  // ===========================================
  describe('register', () => {
    it('应预注册所有内置职业', () => {
      const all = classManager.getAllClasses()
      expect(all.length).toBe(3) // none, wordsmith, metamorph
      expect(all.map(c => c.id)).toContain('none')
      expect(all.map(c => c.id)).toContain('wordsmith')
      expect(all.map(c => c.id)).toContain('metamorph')
    })

    it('应能查询已注册职业', () => {
      const def = classManager.getClassDefinition('wordsmith')
      expect(def).toBeDefined()
      expect(def!.name).toBe('造词师')
    })
  })

  // ===========================================
  // 当前职业查询测试 (AC: #2)
  // ===========================================
  describe('getCurrentClass', () => {
    it('默认应返回 none 职业', () => {
      const current = classManager.getCurrentClass()
      expect(current.id).toBe('none')
      expect(current.uniqueResource).toBeNull()
      expect(current.loseFeature).toBeNull()
      expect(current.starterRelic).toBeNull()
    })

    it('选择职业后应返回对应职业', () => {
      classManager.selectClass('wordsmith')
      const current = classManager.getCurrentClass()
      expect(current.id).toBe('wordsmith')
      expect(current.name).toBe('造词师')
    })
  })

  // ===========================================
  // 选择职业测试 (AC: #2, #3, #6)
  // ===========================================
  describe('selectClass', () => {
    it('应将 classId 写入 state', () => {
      expect(state.classId).toBe('none')
      classManager.selectClass('metamorph')
      expect(state.classId).toBe('metamorph')
    })

    it('选择造词师应添加 starterRelic', () => {
      expect(state.player.relics.has('apprentice_notes')).toBe(false)
      classManager.selectClass('wordsmith')
      expect(state.player.relics.has('apprentice_notes')).toBe(true)
    })

    it('选择蜕变师应添加 starterRelic', () => {
      expect(state.player.relics.has('primal_mutant')).toBe(false)
      classManager.selectClass('metamorph')
      expect(state.player.relics.has('primal_mutant')).toBe(true)
    })

    it('选择 none 不应添加任何遗物', () => {
      const relicsBefore = state.player.relics.size
      classManager.selectClass('none')
      expect(state.player.relics.size).toBe(relicsBefore)
    })

    it('选择未知职业应打印警告且不改变 state', () => {
      classManager.selectClass('unknown' as any)
      expect(state.classId).toBe('none')
    })
  })

  // ===========================================
  // 重置测试 (AC: #2)
  // ===========================================
  describe('resetClass', () => {
    it('应将 classId 重置为 none', () => {
      classManager.selectClass('wordsmith')
      expect(state.classId).toBe('wordsmith')
      classManager.resetClass()
      expect(state.classId).toBe('none')
    })
  })
})

describe('GameState classId', () => {
  beforeEach(() => {
    resetState()
  })

  // ===========================================
  // GameState 初始化测试 (AC: #3)
  // ===========================================
  it('createInitialState 应包含 classId 字段默认为 none', () => {
    expect(state.classId).toBe('none')
  })

  it('resetState 应重置 classId 为 none', () => {
    state.classId = 'wordsmith'
    resetState()
    expect(state.classId).toBe('none')
  })
})

describe('ClassDefinition data', () => {
  it('none 职业应无特殊属性', () => {
    const none = CLASS_DEFINITIONS.none
    expect(none.uniqueResource).toBeNull()
    expect(none.loseFeature).toBeNull()
    expect(none.starterRelic).toBeNull()
  })

  it('wordsmith 职业应有正确属性', () => {
    const ws = CLASS_DEFINITIONS.wordsmith
    expect(ws.uniqueResource).toBe('fragment')
    expect(ws.loseFeature).toBe('pack-system')
    expect(ws.starterRelic).toBe('apprentice_notes')
  })

  it('metamorph 职业应有正确属性', () => {
    const mm = CLASS_DEFINITIONS.metamorph
    expect(mm.uniqueResource).toBe('mutagen')
    expect(mm.loseFeature).toBe('enchant-choice')
    expect(mm.starterRelic).toBe('primal_mutant')
  })
})
