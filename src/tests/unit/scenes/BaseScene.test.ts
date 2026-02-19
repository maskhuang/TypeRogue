// ============================================
// 打字肉鸽 - BaseScene 单元测试
// ============================================
// Story 5.5 Task 4: 添加淡入淡出测试

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { Container } from 'pixi.js'
import { BaseScene } from '../../../src/scenes/BaseScene'

// 创建具体测试类，暴露 protected 方法供测试
class TestScene extends BaseScene {
  readonly name = 'TestScene'
  updateCalled = false
  lastDt = 0

  update(dt: number): void {
    this.updateCalled = true
    this.lastDt = dt
  }

  // 暴露 protected 方法供测试
  public testFadeIn(duration?: number): Promise<void> {
    return this.fadeIn(duration)
  }

  public testFadeOut(duration?: number): Promise<void> {
    return this.fadeOut(duration)
  }

  public testCancelFadeAnimation(): void {
    this.cancelFadeAnimation()
  }
}

describe('BaseScene', () => {
  let scene: TestScene

  beforeEach(() => {
    scene = new TestScene()
  })

  describe('constructor', () => {
    it('应该创建 Container', () => {
      expect(scene.container).toBeInstanceOf(Container)
    })

    it('container 初始应该可见', () => {
      // PixiJS Container 默认 visible = true
      expect(scene.container.visible).toBe(true)
    })
  })

  describe('onEnter', () => {
    it('应该设置 container 可见', () => {
      scene.container.visible = false
      scene.onEnter()
      expect(scene.container.visible).toBe(true)
    })
  })

  describe('onExit', () => {
    it('应该设置 container 不可见', () => {
      scene.onExit()
      expect(scene.container.visible).toBe(false)
    })

    it('应该销毁 container', () => {
      const destroySpy = scene.container.destroy.bind(scene.container)
      let destroyed = false
      scene.container.destroy = (options) => {
        destroyed = true
        // Don't actually destroy in test to avoid issues
      }

      scene.onExit()
      expect(destroyed).toBe(true)
    })

    it('应该设置 isDestroyed 标志', () => {
      scene.onExit()
      expect(scene.isDestroyed).toBe(true)
    })
  })

  describe('onPause', () => {
    it('应该设置 container 不可见', () => {
      scene.onPause()
      expect(scene.container.visible).toBe(false)
    })

    it('不应该销毁 container', () => {
      scene.onPause()
      // Container should still be usable after pause
      expect(scene.container.destroyed).toBeFalsy()
    })
  })

  describe('onResume', () => {
    it('应该设置 container 可见', () => {
      scene.container.visible = false
      scene.onResume()
      expect(scene.container.visible).toBe(true)
    })
  })

  describe('render', () => {
    it('默认实现应该不报错', () => {
      expect(() => scene.render()).not.toThrow()
    })
  })

  describe('abstract update', () => {
    it('子类应该实现 update', () => {
      scene.update(16)
      expect(scene.updateCalled).toBe(true)
      expect(scene.lastDt).toBe(16)
    })
  })

  describe('fade transitions (Story 5.5)', () => {
    // Note: In test environment, requestAnimationFrame is not available
    // so fadeIn/fadeOut complete immediately

    describe('fadeIn', () => {
      it('should make container visible', async () => {
        scene.container.visible = false
        await scene.testFadeIn(300)
        expect(scene.container.visible).toBe(true)
      })

      it('should resolve when animation completes', async () => {
        const fadePromise = scene.testFadeIn(100)
        await expect(fadePromise).resolves.toBeUndefined()
      })

      it('should reach alpha 1 when complete', async () => {
        await scene.testFadeIn(100)
        expect(scene.container.alpha).toBe(1)
      })
    })

    describe('fadeOut', () => {
      it('should resolve when animation completes', async () => {
        const fadePromise = scene.testFadeOut(100)
        await expect(fadePromise).resolves.toBeUndefined()
      })

      it('should reach alpha 0 when complete', async () => {
        await scene.testFadeOut(100)
        expect(scene.container.alpha).toBe(0)
      })

      it('should hide container when complete', async () => {
        await scene.testFadeOut(100)
        expect(scene.container.visible).toBe(false)
      })
    })

    describe('cancelFadeAnimation', () => {
      it('should not throw when no animation is running', () => {
        expect(() => scene.testCancelFadeAnimation()).not.toThrow()
      })
    })
  })
})
