// ============================================
// 打字肉鸽 - ParticleManager 单元测试
// ============================================
// Story 7.3: 粒子效果系统 (AC: #1, #5, #6, #7)

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock PIXI.js before importing ParticleManager
vi.mock('pixi.js', () => {
  class MockGraphics {
    position = { x: 0, y: 0, set: vi.fn() }
    scale = { set: vi.fn() }
    alpha = 1
    destroyed = false

    circle(): this { return this }
    fill(): this { return this }
    clear(): this { return this }
    destroy(): void { this.destroyed = true }
  }

  class MockContainer {
    children: unknown[] = []
    label = ''
    destroyed = false

    addChild(child: unknown): unknown {
      this.children.push(child)
      return child
    }

    removeChild(child: unknown): unknown {
      const idx = this.children.indexOf(child)
      if (idx >= 0) this.children.splice(idx, 1)
      return child
    }

    destroy(): void {
      this.destroyed = true
      this.children = []
    }
  }

  return {
    Container: MockContainer,
    Graphics: MockGraphics,
    Texture: {
      WHITE: { label: 'white' }
    }
  }
})

import { ParticleManager } from '../../../../src/ui/effects/ParticleManager'
import * as PIXI from 'pixi.js'

describe('ParticleManager', () => {
  let manager: ParticleManager
  let parentContainer: PIXI.Container

  beforeEach(() => {
    parentContainer = new PIXI.Container()
    manager = new ParticleManager(parentContainer)
  })

  afterEach(() => {
    manager.destroy()
    vi.clearAllMocks()
  })

  // ===========================================
  // 构造函数测试
  // ===========================================

  describe('构造函数', () => {
    it('应该正确初始化', () => {
      expect(manager).toBeDefined()
      expect(manager.isEnabled()).toBe(true)
    })

    it('应该创建粒子容器并添加到父容器', () => {
      expect(parentContainer.children.length).toBe(1)
    })
  })

  // ===========================================
  // enable/disable 测试 (AC: #6)
  // ===========================================

  describe('setEnabled/isEnabled (AC: #6)', () => {
    it('默认应该启用', () => {
      expect(manager.isEnabled()).toBe(true)
    })

    it('setEnabled(false) 应该禁用粒子效果', () => {
      manager.setEnabled(false)
      expect(manager.isEnabled()).toBe(false)
    })

    it('setEnabled(true) 应该启用粒子效果', () => {
      manager.setEnabled(false)
      manager.setEnabled(true)
      expect(manager.isEnabled()).toBe(true)
    })

    it('禁用时应该清理现有粒子', () => {
      // 先播放一些粒子
      manager.play('skill_trigger', 100, 100)
      expect(manager.getActiveParticleCount()).toBeGreaterThan(0)

      // 禁用时应该清理
      manager.setEnabled(false)

      // 验证已启用状态变为 false 且粒子被清理
      expect(manager.isEnabled()).toBe(false)
      expect(manager.getActiveParticleCount()).toBe(0)
    })
  })

  // ===========================================
  // play() 测试 (AC: #1)
  // ===========================================

  describe('play() (AC: #1)', () => {
    it('启用时应该创建粒子', () => {
      manager.play('skill_trigger', 100, 100)

      // 应该有粒子被创建
      expect(manager.getActiveParticleCount()).toBeGreaterThan(0)
    })

    it('禁用时不应该创建粒子', () => {
      manager.setEnabled(false)

      manager.play('skill_trigger', 100, 100)

      expect(manager.getActiveParticleCount()).toBe(0)
    })

    it('应该支持不同的预设类型', () => {
      expect(() => manager.play('skill_trigger', 100, 100)).not.toThrow()
      expect(() => manager.play('word_complete', 100, 100)).not.toThrow()
      expect(() => manager.play('combo_milestone', 100, 100)).not.toThrow()
    })
  })

  // ===========================================
  // playSkillTrigger() 测试 (AC: #1)
  // ===========================================

  describe('playSkillTrigger() (AC: #1)', () => {
    it('应该播放技能触发粒子', () => {
      expect(() => manager.playSkillTrigger('fire_blast', 100, 100)).not.toThrow()
      expect(manager.getActiveParticleCount()).toBeGreaterThan(0)
    })
  })

  // ===========================================
  // playComboFlame() 测试 (AC: #3)
  // ===========================================

  describe('playComboFlame() (AC: #3)', () => {
    it('应该播放连击火焰效果', () => {
      expect(() => manager.playComboFlame(15, 100, 100)).not.toThrow()
    })

    it('连击越高火焰越强', () => {
      // 验证不抛出异常
      expect(() => manager.playComboFlame(10, 100, 100)).not.toThrow()
      expect(() => manager.playComboFlame(50, 100, 100)).not.toThrow()
      expect(() => manager.playComboFlame(100, 100, 100)).not.toThrow()
    })
  })

  // ===========================================
  // playComboMilestone() 测试 (AC: #4)
  // ===========================================

  describe('playComboMilestone() (AC: #4)', () => {
    it('应该播放连击里程碑效果', () => {
      expect(() => manager.playComboMilestone(10, 100, 100)).not.toThrow()
      expect(() => manager.playComboMilestone(25, 100, 100)).not.toThrow()
      expect(() => manager.playComboMilestone(50, 100, 100)).not.toThrow()
      expect(() => manager.playComboMilestone(100, 100, 100)).not.toThrow()

      // 应该创建了粒子
      expect(manager.getActiveParticleCount()).toBeGreaterThan(0)
    })
  })

  // ===========================================
  // update() 测试 (AC: #5)
  // ===========================================

  describe('update() (AC: #5)', () => {
    it('应该更新粒子位置和生命周期', () => {
      manager.play('skill_trigger', 100, 100)

      // 不应该抛出异常
      expect(() => manager.update(16)).not.toThrow()
    })

    it('禁用时不应该更新', () => {
      manager.setEnabled(false)

      // 不应该抛出异常
      expect(() => manager.update(16)).not.toThrow()
    })

    it('应该移除已完成的粒子', () => {
      manager.play('skill_trigger', 100, 100)
      const initialCount = manager.getActiveParticleCount()
      expect(initialCount).toBeGreaterThan(0)

      // 模拟很长时间后，粒子应该消失
      for (let i = 0; i < 100; i++) {
        manager.update(100) // 100ms per frame, total 10 seconds
      }

      expect(manager.getActiveParticleCount()).toBe(0)
    })
  })

  // ===========================================
  // clear() 测试
  // ===========================================

  describe('clear()', () => {
    it('应该清理所有粒子', () => {
      manager.play('skill_trigger', 100, 100)
      manager.play('word_complete', 200, 200)
      expect(manager.getActiveParticleCount()).toBeGreaterThan(0)

      manager.clear()

      expect(manager.getActiveParticleCount()).toBe(0)
    })
  })

  // ===========================================
  // destroy() 测试
  // ===========================================

  describe('destroy()', () => {
    it('应该清理并销毁容器', () => {
      manager.play('skill_trigger', 100, 100)

      manager.destroy()

      expect(manager.getActiveParticleCount()).toBe(0)
    })
  })

  // ===========================================
  // 性能测试 (AC: #5)
  // ===========================================

  describe('性能 (AC: #5)', () => {
    it('大量粒子更新应该高效', () => {
      // 创建多个粒子效果
      for (let i = 0; i < 10; i++) {
        manager.play('skill_trigger', Math.random() * 800, Math.random() * 600)
      }

      const start = performance.now()

      // 更新多帧
      for (let i = 0; i < 60; i++) {
        manager.update(16.67)
      }

      const elapsed = performance.now() - start

      // 60 帧更新应该在合理时间内完成（< 100ms）
      expect(elapsed).toBeLessThan(100)
    })
  })
})
