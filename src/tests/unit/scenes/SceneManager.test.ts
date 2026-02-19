// ============================================
// 打字肉鸽 - SceneManager 单元测试
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Container } from 'pixi.js'
import { SceneManager } from '../../../src/scenes/SceneManager'
import type { Scene } from '../../../src/scenes/Scene'
import { eventBus } from '../../../src/core/events/EventBus'

// Mock eventBus
vi.mock('../../../src/core/events/EventBus', () => ({
  eventBus: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  }
}))

// Mock PixiJS Application
const createMockApp = () => ({
  stage: new Container()
})

// Mock Scene for testing
const createMockScene = (name: string): Scene => ({
  name,
  container: new Container(),
  onEnter: vi.fn(),
  onExit: vi.fn(),
  onPause: vi.fn(),
  onResume: vi.fn(),
  update: vi.fn(),
  render: vi.fn()
})

describe('SceneManager', () => {
  let manager: SceneManager
  let mockApp: ReturnType<typeof createMockApp>

  beforeEach(() => {
    mockApp = createMockApp()
    manager = new SceneManager(mockApp as any)
  })

  describe('current', () => {
    it('空栈时应该返回 null', () => {
      expect(manager.current()).toBeNull()
    })

    it('应该返回栈顶场景', () => {
      const scene = createMockScene('test')
      manager.push(scene)
      expect(manager.current()).toBe(scene)
    })
  })

  describe('push', () => {
    it('push 空栈时应该调用 onEnter', () => {
      const scene = createMockScene('test')
      manager.push(scene)

      expect(scene.onEnter).toHaveBeenCalledTimes(1)
      expect(scene.onPause).not.toHaveBeenCalled()
    })

    it('push 非空栈时应该调用前场景的 onPause 和新场景的 onEnter', () => {
      const scene1 = createMockScene('scene1')
      const scene2 = createMockScene('scene2')

      manager.push(scene1)
      manager.push(scene2)

      expect(scene1.onPause).toHaveBeenCalledTimes(1)
      expect(scene2.onEnter).toHaveBeenCalledTimes(1)
    })

    it('场景容器应该被添加到 stage', () => {
      const scene = createMockScene('test')
      manager.push(scene)

      // sceneContainer is a child of stage, and scene.container is a child of sceneContainer
      expect(mockApp.stage.children.length).toBe(1)
    })

    it('应该增加栈深度', () => {
      expect(manager.depth).toBe(0)
      manager.push(createMockScene('s1'))
      expect(manager.depth).toBe(1)
      manager.push(createMockScene('s2'))
      expect(manager.depth).toBe(2)
    })
  })

  describe('pop', () => {
    it('空栈 pop 应该返回 null', () => {
      expect(manager.pop()).toBeNull()
    })

    it('pop 应该调用当前场景的 onExit', () => {
      const scene = createMockScene('test')
      manager.push(scene)
      manager.pop()

      expect(scene.onExit).toHaveBeenCalledTimes(1)
    })

    it('pop 后应该恢复下层场景的 onResume', () => {
      const scene1 = createMockScene('scene1')
      const scene2 = createMockScene('scene2')

      manager.push(scene1)
      manager.push(scene2)
      manager.pop()

      expect(scene1.onResume).toHaveBeenCalledTimes(1)
    })

    it('pop 应该返回被移除的场景', () => {
      const scene = createMockScene('test')
      manager.push(scene)
      const removed = manager.pop()

      expect(removed).toBe(scene)
    })

    it('pop 应该减少栈深度', () => {
      manager.push(createMockScene('s1'))
      manager.push(createMockScene('s2'))
      expect(manager.depth).toBe(2)
      manager.pop()
      expect(manager.depth).toBe(1)
    })
  })

  describe('replace', () => {
    it('replace 应该调用旧场景 onExit 和新场景 onEnter', () => {
      const scene1 = createMockScene('scene1')
      const scene2 = createMockScene('scene2')

      manager.push(scene1)
      manager.replace(scene2)

      expect(scene1.onExit).toHaveBeenCalledTimes(1)
      expect(scene2.onEnter).toHaveBeenCalledTimes(1)
    })

    it('replace 时栈深度应该不变', () => {
      manager.push(createMockScene('s1'))
      expect(manager.depth).toBe(1)

      manager.replace(createMockScene('s2'))
      expect(manager.depth).toBe(1)
    })

    it('空栈 replace 应该相当于 push', () => {
      const scene = createMockScene('test')
      manager.replace(scene)

      expect(manager.depth).toBe(1)
      expect(scene.onEnter).toHaveBeenCalledTimes(1)
    })
  })

  describe('clear', () => {
    it('应该清空所有场景', () => {
      manager.push(createMockScene('s1'))
      manager.push(createMockScene('s2'))
      manager.push(createMockScene('s3'))

      manager.clear()

      expect(manager.depth).toBe(0)
      expect(manager.current()).toBeNull()
    })

    it('应该对每个场景调用 onExit', () => {
      const scene1 = createMockScene('s1')
      const scene2 = createMockScene('s2')

      manager.push(scene1)
      manager.push(scene2)
      manager.clear()

      expect(scene1.onExit).toHaveBeenCalled()
      expect(scene2.onExit).toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('应该只更新栈顶场景', () => {
      const scene1 = createMockScene('s1')
      const scene2 = createMockScene('s2')

      manager.push(scene1)
      manager.push(scene2)
      manager.update(16)

      expect(scene1.update).not.toHaveBeenCalled()
      expect(scene2.update).toHaveBeenCalledWith(16)
    })

    it('空栈时 update 应该不报错', () => {
      expect(() => manager.update(16)).not.toThrow()
    })

    it('应该调用 render 如果存在', () => {
      const scene = createMockScene('test')
      manager.push(scene)
      manager.update(16)

      expect(scene.render).toHaveBeenCalled()
    })
  })

  describe('has', () => {
    it('应该检测场景是否在栈中', () => {
      const scene = createMockScene('test')
      manager.push(scene)

      expect(manager.has('test')).toBe(true)
      expect(manager.has('nonexistent')).toBe(false)
    })
  })

  describe('生命周期顺序', () => {
    it('push 时应该先 onPause 再 onEnter', () => {
      const callOrder: string[] = []
      const scene1 = createMockScene('s1')
      const scene2 = createMockScene('s2')

      scene1.onPause = vi.fn(() => callOrder.push('s1.onPause'))
      scene2.onEnter = vi.fn(() => callOrder.push('s2.onEnter'))

      manager.push(scene1)
      manager.push(scene2)

      expect(callOrder).toEqual(['s1.onPause', 's2.onEnter'])
    })

    it('pop 时应该先 onExit 再 onResume', () => {
      const callOrder: string[] = []
      const scene1 = createMockScene('s1')
      const scene2 = createMockScene('s2')

      scene1.onResume = vi.fn(() => callOrder.push('s1.onResume'))
      scene2.onExit = vi.fn(() => callOrder.push('s2.onExit'))

      manager.push(scene1)
      manager.push(scene2)
      callOrder.length = 0  // Reset

      manager.pop()

      expect(callOrder).toEqual(['s2.onExit', 's1.onResume'])
    })
  })

  describe('重复 push 保护', () => {
    it('不应该允许同一场景实例被 push 两次', () => {
      const scene = createMockScene('test')
      manager.push(scene)
      manager.push(scene)  // 尝试重复 push

      expect(manager.depth).toBe(1)  // 仍然只有一个
    })

    it('应该允许不同场景实例被 push', () => {
      const scene1 = createMockScene('test1')
      const scene2 = createMockScene('test2')
      manager.push(scene1)
      manager.push(scene2)

      expect(manager.depth).toBe(2)
    })
  })

  describe('destroy', () => {
    it('应该清空所有场景并标记为已销毁', () => {
      manager.push(createMockScene('s1'))
      manager.push(createMockScene('s2'))

      manager.destroy()

      expect(manager.depth).toBe(0)
      expect(manager.isDestroyed).toBe(true)
    })

    it('多次调用 destroy 应该是安全的', () => {
      manager.push(createMockScene('test'))
      manager.destroy()

      expect(() => manager.destroy()).not.toThrow()
    })
  })

  describe('scene:change 事件', () => {
    beforeEach(() => {
      vi.mocked(eventBus.emit).mockClear()
    })

    it('push 应该发送 scene:change 事件', () => {
      const scene = createMockScene('test')
      manager.push(scene)

      expect(eventBus.emit).toHaveBeenCalledWith('scene:change', {
        from: null,
        to: 'test',
        action: 'push'
      })
    })

    it('push 第二个场景应该包含 from 信息', () => {
      const scene1 = createMockScene('scene1')
      const scene2 = createMockScene('scene2')

      manager.push(scene1)
      vi.mocked(eventBus.emit).mockClear()
      manager.push(scene2)

      expect(eventBus.emit).toHaveBeenCalledWith('scene:change', {
        from: 'scene1',
        to: 'scene2',
        action: 'push'
      })
    })

    it('pop 应该发送 scene:change 事件', () => {
      const scene1 = createMockScene('scene1')
      const scene2 = createMockScene('scene2')

      manager.push(scene1)
      manager.push(scene2)
      vi.mocked(eventBus.emit).mockClear()
      manager.pop()

      expect(eventBus.emit).toHaveBeenCalledWith('scene:change', {
        from: 'scene2',
        to: 'scene1',
        action: 'pop'
      })
    })

    it('pop 最后一个场景时 to 应该为 null', () => {
      const scene = createMockScene('test')
      manager.push(scene)
      vi.mocked(eventBus.emit).mockClear()
      manager.pop()

      expect(eventBus.emit).toHaveBeenCalledWith('scene:change', {
        from: 'test',
        to: null,
        action: 'pop'
      })
    })

    it('replace 应该发送 scene:change 事件', () => {
      const scene1 = createMockScene('scene1')
      const scene2 = createMockScene('scene2')

      manager.push(scene1)
      vi.mocked(eventBus.emit).mockClear()
      manager.replace(scene2)

      expect(eventBus.emit).toHaveBeenCalledWith('scene:change', {
        from: 'scene1',
        to: 'scene2',
        action: 'replace'
      })
    })

    it('空栈 replace 时 from 应该为 null', () => {
      const scene = createMockScene('test')
      manager.replace(scene)

      expect(eventBus.emit).toHaveBeenCalledWith('scene:change', {
        from: null,
        to: 'test',
        action: 'replace'
      })
    })
  })
})
