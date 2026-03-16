// ============================================
// 打字肉鸽 - TutorialManager 单元测试
// ============================================
// Story 39.3 Task 8: TutorialManager 核心逻辑测试

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { eventBus } from '../../../../src/core/events/EventBus'
import { tutorialManager } from '../../../../src/systems/tutorial/TutorialManager'
import type { TutorialStep } from '../../../../src/data/tutorialSteps'
import type { TutorialPersistence } from '../../../../src/systems/tutorial/TutorialManager'

// TutorialOverlay 使用 DOM，在 node 环境中需要 mock
vi.mock('../../../../src/systems/tutorial/TutorialOverlay', () => {
  return {
    TutorialOverlay: vi.fn().mockImplementation((opts: { onDismiss: (neverShow: boolean) => void }) => {
      let visible = false
      return {
        show: vi.fn(() => { visible = true }),
        dismiss: vi.fn((neverShow: boolean) => {
          visible = false
          opts.onDismiss(neverShow)
        }),
        isVisible: vi.fn(() => visible),
      }
    }),
  }
})

function createMockPersistence(): TutorialPersistence & {
  completed: Set<string>
} {
  const completed = new Set<string>()
  return {
    completed,
    isTutorialCompleted: vi.fn((stepId: string) => completed.has(stepId)),
    markTutorialCompleted: vi.fn((stepId: string) => completed.add(stepId)),
    resetTutorials: vi.fn(() => completed.clear()),
  }
}

function makeStep(overrides: Partial<TutorialStep> & { id: string; trigger: TutorialStep['trigger'] }): TutorialStep {
  return {
    level: 0,
    content: {
      titleKey: 'tutorial.demo_title',
      bodyKey: 'tutorial.step1',
    },
    ...overrides,
  }
}

describe('TutorialManager', () => {
  let persistence: ReturnType<typeof createMockPersistence>

  beforeEach(() => {
    eventBus.clear()
    tutorialManager._testReset()
    persistence = createMockPersistence()
    tutorialManager.setPersistence(persistence)
  })

  afterEach(() => {
    tutorialManager.stop()
    eventBus.clear()
  })

  // ===========================================
  // 基础功能
  // ===========================================
  describe('register + start', () => {
    it('注册步骤后 start 应绑定事件监听', () => {
      const step = makeStep({
        id: 'test_step',
        trigger: { event: 'battle:start' },
      })
      tutorialManager.register([step])
      tutorialManager.start()

      const handler = vi.fn()
      eventBus.on('tutorial:step_shown', handler)

      eventBus.emit('battle:start', { stageId: 1 })

      expect(handler).toHaveBeenCalledWith({ stepId: 'test_step' })
    })

    it('已完成的步骤不应绑定监听', () => {
      persistence.completed.add('done_step')
      const step = makeStep({
        id: 'done_step',
        trigger: { event: 'battle:start' },
      })
      tutorialManager.register([step])
      tutorialManager.start()

      const handler = vi.fn()
      eventBus.on('tutorial:step_shown', handler)

      eventBus.emit('battle:start', { stageId: 1 })

      expect(handler).not.toHaveBeenCalled()
    })
  })

  // ===========================================
  // 事件触发 + 防重入
  // ===========================================
  describe('事件触发', () => {
    it('触发后 overlay 可见时不再重复触发', () => {
      const step = makeStep({
        id: 'once_step',
        trigger: { event: 'battle:start' },
      })
      tutorialManager.register([step])
      tutorialManager.start()

      const handler = vi.fn()
      eventBus.on('tutorial:step_shown', handler)

      // 首次触发
      eventBus.emit('battle:start', { stageId: 1 })
      expect(handler).toHaveBeenCalledTimes(1)

      // overlay 已可见，第二次触发应被阻塞
      eventBus.emit('battle:start', { stageId: 2 })
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('同时只能有一个浮窗（防重入）', () => {
      const step1 = makeStep({
        id: 'step_a',
        trigger: { event: 'battle:start' },
      })
      const step2 = makeStep({
        id: 'step_b',
        trigger: { event: 'battle:start' },
      })
      tutorialManager.register([step1, step2])
      tutorialManager.start()

      const handler = vi.fn()
      eventBus.on('tutorial:step_shown', handler)

      eventBus.emit('battle:start', { stageId: 1 })

      // 只有一个步骤触发
      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  // ===========================================
  // 前置步骤链
  // ===========================================
  describe('前置步骤链', () => {
    it('前置未完成时不触发', () => {
      const step = makeStep({
        id: 'step_2',
        trigger: { event: 'word:complete' },
        prerequisite: 'step_1',
      })
      tutorialManager.register([step])
      tutorialManager.start()

      const handler = vi.fn()
      eventBus.on('tutorial:step_shown', handler)

      eventBus.emit('word:complete', { word: 'test', score: 100, perfect: true })

      expect(handler).not.toHaveBeenCalled()
    })

    it('前置完成后应可触发', () => {
      persistence.completed.add('step_1')
      const step = makeStep({
        id: 'step_2',
        trigger: { event: 'word:complete' },
        prerequisite: 'step_1',
      })
      tutorialManager.register([step])
      tutorialManager.start()

      const handler = vi.fn()
      eventBus.on('tutorial:step_shown', handler)

      eventBus.emit('word:complete', { word: 'test', score: 100, perfect: true })

      expect(handler).toHaveBeenCalledWith({ stepId: 'step_2' })
    })
  })

  // ===========================================
  // condition 过滤
  // ===========================================
  describe('trigger.condition', () => {
    it('condition 返回 false 时不触发', () => {
      const step = makeStep({
        id: 'conditional',
        trigger: { event: 'battle:start', condition: () => false },
      })
      tutorialManager.register([step])
      tutorialManager.start()

      const handler = vi.fn()
      eventBus.on('tutorial:step_shown', handler)

      eventBus.emit('battle:start', { stageId: 1 })

      expect(handler).not.toHaveBeenCalled()
    })

    it('condition 返回 true 时触发', () => {
      const step = makeStep({
        id: 'conditional',
        trigger: { event: 'battle:start', condition: () => true },
      })
      tutorialManager.register([step])
      tutorialManager.start()

      const handler = vi.fn()
      eventBus.on('tutorial:step_shown', handler)

      eventBus.emit('battle:start', { stageId: 1 })

      expect(handler).toHaveBeenCalledWith({ stepId: 'conditional' })
    })
  })

  // ===========================================
  // delay 延迟
  // ===========================================
  describe('trigger.delay', () => {
    it('有 delay 时应延迟触发', () => {
      vi.useFakeTimers()
      const step = makeStep({
        id: 'delayed',
        trigger: { event: 'battle:start', delay: 500 },
      })
      tutorialManager.register([step])
      tutorialManager.start()

      const handler = vi.fn()
      eventBus.on('tutorial:step_shown', handler)

      eventBus.emit('battle:start', { stageId: 1 })

      // 未到延迟时间
      expect(handler).not.toHaveBeenCalled()

      // 推进时间
      vi.advanceTimersByTime(500)
      expect(handler).toHaveBeenCalledWith({ stepId: 'delayed' })

      vi.useRealTimers()
    })
  })

  // ===========================================
  // setEnabled
  // ===========================================
  describe('setEnabled', () => {
    it('setEnabled(false) 阻止 start', () => {
      tutorialManager.setEnabled(false)
      const step = makeStep({
        id: 'test',
        trigger: { event: 'battle:start' },
      })
      tutorialManager.register([step])
      tutorialManager.start()

      const handler = vi.fn()
      eventBus.on('tutorial:step_shown', handler)

      eventBus.emit('battle:start', { stageId: 1 })

      expect(handler).not.toHaveBeenCalled()
    })

    it('setEnabled(false) 在运行中应停止', () => {
      const step = makeStep({
        id: 'test',
        trigger: { event: 'word:complete' },
      })
      tutorialManager.register([step])
      tutorialManager.start()

      tutorialManager.setEnabled(false)

      const handler = vi.fn()
      eventBus.on('tutorial:step_shown', handler)

      eventBus.emit('word:complete', { word: 'test', score: 100, perfect: true })

      expect(handler).not.toHaveBeenCalled()
    })

    it('isEnabled 返回正确值', () => {
      expect(tutorialManager.isEnabled()).toBe(true)
      tutorialManager.setEnabled(false)
      expect(tutorialManager.isEnabled()).toBe(false)
    })
  })

  // ===========================================
  // stop
  // ===========================================
  describe('stop', () => {
    it('stop 后事件不再触发', () => {
      const step = makeStep({
        id: 'test',
        trigger: { event: 'battle:start' },
      })
      tutorialManager.register([step])
      tutorialManager.start()
      tutorialManager.stop()

      const handler = vi.fn()
      eventBus.on('tutorial:step_shown', handler)

      eventBus.emit('battle:start', { stageId: 1 })

      expect(handler).not.toHaveBeenCalled()
    })
  })

  // ===========================================
  // markCompleted + resetAll
  // ===========================================
  describe('markCompleted + resetAll', () => {
    it('markCompleted 应调用 persistence 并发事件', () => {
      const handler = vi.fn()
      eventBus.on('tutorial:step_completed', handler)

      tutorialManager.markCompleted('step_x')

      expect(persistence.markTutorialCompleted).toHaveBeenCalledWith('step_x')
      expect(handler).toHaveBeenCalledWith({ stepId: 'step_x' })
    })

    it('resetAll 应调用 persistence.resetTutorials', () => {
      persistence.completed.add('step1')
      tutorialManager.resetAll()
      expect(persistence.resetTutorials).toHaveBeenCalled()
    })
  })

  // ===========================================
  // 无 persistence 时降级
  // ===========================================
  describe('无 persistence', () => {
    it('无 persistence 时 isCompleted 返回 false', () => {
      tutorialManager._testReset() // clears persistence
      expect(tutorialManager.isCompleted('any')).toBe(false)
    })

    it('无 persistence 时 markCompleted 不抛错', () => {
      tutorialManager._testReset()
      expect(() => tutorialManager.markCompleted('any')).not.toThrow()
    })
  })
})
