// ============================================
// 打字肉鸽 - SkillFeedbackManager 单元测试
// ============================================
// Story 7.4: 技能触发反馈 (AC: #1-#6, #7)

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Hoisted mock variables - must be declared before vi.mock to be accessible
const { mockGetAdjacent, eventHandlers } = vi.hoisted(() => ({
  mockGetAdjacent: vi.fn().mockReturnValue(['W', 'A', 'S']),
  eventHandlers: new Map<string, Function>()
}))

// Mock PIXI.js before importing SkillFeedbackManager
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

    destroy(): void { this.destroyed = true }
  }

  class MockText {
    text = ''
    style: Record<string, unknown> = {}
    position = new MockPoint()
    anchor = new MockPoint()
    scale = new MockPoint()
    alpha = 1
    x = 0
    y = 0
    destroyed = false

    constructor(options?: { text?: string; style?: Record<string, unknown> }) {
      if (options?.text) this.text = options.text
      if (options?.style) this.style = options.style
    }

    destroy(): void { this.destroyed = true }
  }

  class MockGraphics {
    position = new MockPoint()
    scale = new MockPoint()
    alpha = 1
    destroyed = false

    moveTo(): this { return this }
    lineTo(): this { return this }
    stroke(): this { return this }
    circle(): this { return this }
    rect(): this { return this }
    fill(): this { return this }
    clear(): this { return this }
    destroy(): void { this.destroyed = true }
  }

  class MockContainer {
    children: unknown[] = []
    label = ''
    position = new MockPoint()
    scale = new MockPoint()
    alpha = 1
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
    Text: MockText,
    Graphics: MockGraphics,
    Texture: {
      WHITE: { label: 'white' }
    }
  }
})

// Mock EventBus - store handlers for testing
vi.mock('../../../../src/core/events/EventBus', () => ({
  eventBus: {
    on: vi.fn((event: string, handler: Function) => {
      eventHandlers.set(event, handler)
      return vi.fn() // unsubscribe function
    }),
    off: vi.fn(),
    emit: vi.fn()
  }
}))

// Mock AdjacencyMap - using hoisted mockGetAdjacent
vi.mock('../../../../src/systems/skills/passive/AdjacencyMap', () => ({
  adjacencyMap: {
    getAdjacent: mockGetAdjacent
  }
}))

// Mock SKILLS data
vi.mock('../../../../src/data/skills', () => ({
  SKILLS: {
    fire_blast: { id: 'fire_blast', name: '火焰冲击', type: 'score' },
    ice_shield: { id: 'ice_shield', name: '冰霜护盾', type: 'multiply' },
    thunder_bolt: { id: 'thunder_bolt', name: '雷电一击', type: 'special' }
  }
}))

import { SkillFeedbackManager } from '../../../../src/ui/effects/SkillFeedbackManager'
import * as PIXI from 'pixi.js'
import { eventBus } from '../../../../src/core/events/EventBus'

describe('SkillFeedbackManager', () => {
  let manager: SkillFeedbackManager
  let parentContainer: PIXI.Container
  let mockKeyboardVisualizer: {
    getKey: ReturnType<typeof vi.fn>
  }
  let mockParticleManager: {
    playSkillTrigger: ReturnType<typeof vi.fn>
  }
  let mockAudioManager: {
    play: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    // 清空事件处理器
    eventHandlers.clear()

    parentContainer = new PIXI.Container()

    mockKeyboardVisualizer = {
      getKey: vi.fn().mockReturnValue({
        getGlobalPosition: () => ({ x: 100, y: 200 })
      })
    }

    mockParticleManager = {
      playSkillTrigger: vi.fn()
    }

    mockAudioManager = {
      play: vi.fn()
    }

    manager = new SkillFeedbackManager(
      parentContainer,
      mockKeyboardVisualizer as never,
      mockParticleManager as never,
      mockAudioManager as never
    )
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
    })

    it('应该创建子组件容器', () => {
      // 父容器应该有子组件
      expect(parentContainer.children.length).toBeGreaterThan(0)
    })

    it('默认应该禁用', () => {
      expect(manager.isEnabled()).toBe(false)
    })
  })

  // ===========================================
  // enable/disable 测试 (AC: #6)
  // ===========================================

  describe('enable/disable (AC: #6)', () => {
    it('enable() 应该订阅所有必需事件', () => {
      manager.enable()

      expect(eventBus.on).toHaveBeenCalledWith('skill:triggered', expect.any(Function))
      expect(eventBus.on).toHaveBeenCalledWith('effect:queued', expect.any(Function))
      expect(eventBus.on).toHaveBeenCalledWith('effect:dequeued', expect.any(Function))
      expect(eventBus.on).toHaveBeenCalledTimes(3)
      expect(manager.isEnabled()).toBe(true)
    })

    it('disable() 应该取消订阅事件', () => {
      manager.enable()
      manager.disable()

      expect(manager.isEnabled()).toBe(false)
    })

    it('enable() 应该幂等', () => {
      manager.enable()
      manager.enable()
      manager.enable()

      // 只应该订阅一次（3个事件）
      expect(eventBus.on).toHaveBeenCalledTimes(3)
    })

    it('disable() 应该幂等', () => {
      manager.enable()
      manager.disable()
      manager.disable()
      manager.disable()

      // 不应该抛出异常
      expect(manager.isEnabled()).toBe(false)
    })
  })

  // ===========================================
  // skill:triggered 事件处理测试 (AC: #1-#4)
  // ===========================================

  describe('skill:triggered 事件处理 (AC: #1-#4)', () => {
    let triggerHandler: (data: unknown) => void

    beforeEach(() => {
      manager.enable()
      // 获取技能触发事件处理器
      triggerHandler = eventHandlers.get('skill:triggered') as (data: unknown) => void
    })

    it('应该响应技能触发事件并调用键位查询', () => {
      triggerHandler({
        key: 'Q',
        skillId: 'fire_blast',
        type: 'passive',
        value: 100
      })

      // 验证键位被查询
      expect(mockKeyboardVisualizer.getKey).toHaveBeenCalledWith('Q')
    })

    it('应该调用粒子管理器播放技能效果', () => {
      triggerHandler({
        key: 'Q',
        skillId: 'fire_blast',
        type: 'passive',
        value: 100
      })

      // 验证粒子效果被触发
      expect(mockParticleManager.playSkillTrigger).toHaveBeenCalledWith('fire_blast', 100, 200)
    })

    it('未知技能ID不应该崩溃且不调用粒子效果', () => {
      triggerHandler({
        key: 'Q',
        skillId: 'unknown_skill',
        type: 'passive'
      })

      // 未知技能不应该触发粒子效果
      expect(mockParticleManager.playSkillTrigger).not.toHaveBeenCalled()
    })

    it('无效键位不应该崩溃', () => {
      mockKeyboardVisualizer.getKey.mockReturnValueOnce(null)

      expect(() => triggerHandler({
        key: 'INVALID',
        skillId: 'fire_blast',
        type: 'passive'
      })).not.toThrow()

      // 没有有效键位时不应该触发效果
      expect(mockParticleManager.playSkillTrigger).not.toHaveBeenCalled()
    })

    it('被动技能应该查询相邻键位', () => {
      triggerHandler({
        key: 'Q',
        skillId: 'fire_blast',
        type: 'passive',
        value: 100
      })

      // 验证查询了相邻键位
      expect(mockGetAdjacent).toHaveBeenCalledWith('Q')
    })

    it('主动技能不应该查询相邻键位', () => {
      mockGetAdjacent.mockClear()

      triggerHandler({
        key: 'Q',
        skillId: 'fire_blast',
        type: 'active',
        value: 100
      })

      // 主动技能不应该触发相邻可视化
      expect(mockGetAdjacent).not.toHaveBeenCalled()
    })
  })

  // ===========================================
  // effect:queued/dequeued 事件处理测试 (AC: #5)
  // ===========================================

  describe('effect:queued/dequeued 事件处理 (AC: #5)', () => {
    beforeEach(() => {
      manager.enable()
    })

    it('effect:queued 应该触发入队动画', () => {
      const queuedHandler = eventHandlers.get('effect:queued') as (data: unknown) => void

      expect(() => queuedHandler({
        effect: { id: '1', skillId: 'fire_blast', name: '火焰冲击', type: 'damage' },
        queueSize: 1
      })).not.toThrow()
    })

    it('effect:dequeued 应该触发出队动画', () => {
      const dequeuedHandler = eventHandlers.get('effect:dequeued') as (data: unknown) => void

      expect(() => dequeuedHandler({
        effect: { id: '1', skillId: 'fire_blast', name: '火焰冲击', type: 'damage' }
      })).not.toThrow()
    })
  })

  // ===========================================
  // update() 测试
  // ===========================================

  describe('update()', () => {
    it('应该更新所有子组件', () => {
      expect(() => manager.update(16)).not.toThrow()
    })

    it('启用后更新不应该抛出异常', () => {
      manager.enable()

      expect(() => manager.update(16)).not.toThrow()
    })
  })

  // ===========================================
  // setEffectQueue() 测试 (AC: #5)
  // ===========================================

  describe('setEffectQueue() (AC: #5)', () => {
    it('应该接受效果队列引用', () => {
      const mockQueue = {
        getQueue: vi.fn().mockReturnValue([])
      }

      expect(() => manager.setEffectQueue(mockQueue)).not.toThrow()
    })
  })

  // ===========================================
  // clear() 测试
  // ===========================================

  describe('clear()', () => {
    it('应该清理所有子组件', () => {
      expect(() => manager.clear()).not.toThrow()
    })
  })

  // ===========================================
  // destroy() 测试
  // ===========================================

  describe('destroy()', () => {
    it('应该调用 disable()', () => {
      manager.enable()
      manager.destroy()

      expect(manager.isEnabled()).toBe(false)
    })

    it('应该销毁所有子组件', () => {
      expect(() => manager.destroy()).not.toThrow()
    })
  })
})
