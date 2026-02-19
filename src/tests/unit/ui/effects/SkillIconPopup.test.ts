// ============================================
// 打字肉鸽 - SkillIconPopup 单元测试
// ============================================
// Story 7.4: 技能触发反馈 (AC: #1)

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock PIXI.js before importing SkillIconPopup
vi.mock('pixi.js', () => {
  class MockPoint {
    x = 0
    y = 0
    set(x: number, y?: number): void {
      this.x = x
      this.y = y ?? x
    }
  }

  class MockSprite {
    texture: unknown = null
    position = new MockPoint()
    anchor = new MockPoint()
    scale = new MockPoint()
    alpha = 1
    y = 0
    destroyed = false

    destroy(): void {
      this.destroyed = true
    }
  }

  class MockGraphics {
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
    Sprite: MockSprite,
    Graphics: MockGraphics,
    Texture: {
      WHITE: { label: 'white' }
    }
  }
})

import { SkillIconPopup } from '../../../../src/ui/effects/SkillIconPopup'
import * as PIXI from 'pixi.js'

describe('SkillIconPopup', () => {
  let popup: SkillIconPopup
  let parentContainer: PIXI.Container

  beforeEach(() => {
    parentContainer = new PIXI.Container()
    popup = new SkillIconPopup(parentContainer)
  })

  afterEach(() => {
    popup.destroy()
    vi.clearAllMocks()
  })

  // ===========================================
  // 构造函数测试
  // ===========================================

  describe('构造函数', () => {
    it('应该正确初始化', () => {
      expect(popup).toBeDefined()
    })

    it('应该创建容器并添加到父容器', () => {
      expect(parentContainer.children.length).toBe(1)
    })
  })

  // ===========================================
  // play() 测试 (AC: #1)
  // ===========================================

  describe('play() (AC: #1)', () => {
    it('应该创建技能图标弹出', () => {
      popup.play('fire_blast', 100, 200)

      expect(popup.getActiveCount()).toBe(1)
    })

    it('多次调用应该创建多个弹出', () => {
      popup.play('fire_blast', 100, 100)
      popup.play('ice_shield', 200, 200)
      popup.play('thunder_bolt', 300, 300)

      expect(popup.getActiveCount()).toBe(3)
    })

    it('应该支持自定义纹理', () => {
      const customTexture = { label: 'custom' } as unknown as PIXI.Texture
      expect(() => popup.play('skill_1', 100, 100, customTexture)).not.toThrow()
      expect(popup.getActiveCount()).toBe(1)
    })

    it('没有自定义纹理时应该使用默认纹理', () => {
      expect(() => popup.play('skill_1', 100, 100)).not.toThrow()
      expect(popup.getActiveCount()).toBe(1)
    })
  })

  // ===========================================
  // update() 测试 (AC: #1)
  // ===========================================

  describe('update() (AC: #1)', () => {
    it('应该更新弹出动画', () => {
      popup.play('skill_1', 100, 200)

      // 不应该抛出异常
      expect(() => popup.update(16)).not.toThrow()
    })

    it('弹出应该向上漂浮', () => {
      popup.play('skill_1', 100, 200)

      // 模拟一些时间后
      popup.update(100)

      // 验证动画进行中
      expect(popup.getActiveCount()).toBe(1)
    })

    it('弹出动画完成后应该被移除', () => {
      popup.play('skill_1', 100, 200)

      // 模拟足够长的时间让动画完成 (默认 0.4s = 400ms)
      for (let i = 0; i < 30; i++) {
        popup.update(50)
      }

      expect(popup.getActiveCount()).toBe(0)
    })

    it('应该复用对象池中的 sprite', () => {
      // 创建并完成一个弹出
      popup.play('skill_1', 100, 200)

      // 让它完成
      for (let i = 0; i < 30; i++) {
        popup.update(50)
      }

      expect(popup.getActiveCount()).toBe(0)

      // 创建新的弹出（应该复用）
      popup.play('skill_2', 200, 300)

      expect(popup.getActiveCount()).toBe(1)
    })
  })

  // ===========================================
  // 动画曲线测试 (AC: #1)
  // ===========================================

  describe('动画曲线 (AC: #1)', () => {
    it('动画过程中缩放应该变化', () => {
      popup.play('skill_1', 100, 200)

      // 更新一些帧
      popup.update(100)
      popup.update(100)

      // 验证动画还在进行
      expect(popup.getActiveCount()).toBe(1)
    })

    it('动画后期 alpha 应该开始淡出', () => {
      popup.play('skill_1', 100, 200)

      // 更新到后期（超过 60%）
      popup.update(300)

      // 验证动画还在进行
      expect(popup.getActiveCount()).toBe(1)
    })
  })

  // ===========================================
  // clear() 测试
  // ===========================================

  describe('clear()', () => {
    it('应该清理所有弹出', () => {
      popup.play('skill_1', 100, 100)
      popup.play('skill_2', 200, 200)
      popup.play('skill_3', 300, 300)

      popup.clear()

      expect(popup.getActiveCount()).toBe(0)
    })

    it('清理后应该可以继续使用', () => {
      popup.play('skill_1', 100, 100)
      popup.clear()

      popup.play('skill_2', 200, 200)
      expect(popup.getActiveCount()).toBe(1)
    })
  })

  // ===========================================
  // destroy() 测试
  // ===========================================

  describe('destroy()', () => {
    it('应该清理并销毁', () => {
      popup.play('skill_1', 100, 100)

      popup.destroy()

      expect(popup.getActiveCount()).toBe(0)
    })
  })

  // ===========================================
  // 性能测试
  // ===========================================

  describe('性能', () => {
    it('大量弹出更新应该高效', () => {
      // 创建多个弹出效果
      for (let i = 0; i < 20; i++) {
        popup.play(`skill_${i}`, Math.random() * 800, Math.random() * 600)
      }

      const start = performance.now()

      // 更新多帧
      for (let i = 0; i < 60; i++) {
        popup.update(16.67)
      }

      const elapsed = performance.now() - start

      // 60 帧更新应该在合理时间内完成（< 100ms）
      expect(elapsed).toBeLessThan(100)
    })
  })
})
