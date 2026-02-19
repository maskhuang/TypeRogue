// ============================================
// 打字肉鸽 - ParticleController 单元测试
// ============================================
// Story 7.3: 粒子效果系统 (AC: #1, #3, #4, #7)

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ParticleController } from '../../../../src/ui/effects/ParticleController'
import { eventBus } from '../../../../src/core/events/EventBus'

// Mock ParticleManager
const mockParticleManager = {
  play: vi.fn(),
  playSkillTrigger: vi.fn(),
  playComboFlame: vi.fn(),
  playComboMilestone: vi.fn(),
  stopComboFlame: vi.fn(),
  update: vi.fn(),
  setEnabled: vi.fn(),
  isEnabled: vi.fn().mockReturnValue(true),
  clear: vi.fn(),
  destroy: vi.fn(),
  getActiveParticleCount: vi.fn().mockReturnValue(0)
}

// Mock ScorePopup
const mockScorePopup = {
  show: vi.fn(),
  showMultiplier: vi.fn(),
  update: vi.fn(),
  clear: vi.fn(),
  destroy: vi.fn(),
  getActiveCount: vi.fn().mockReturnValue(0)
}

describe('ParticleController', () => {
  let controller: ParticleController

  beforeEach(() => {
    vi.clearAllMocks()
    controller = new ParticleController(
      mockParticleManager as any,
      mockScorePopup as any
    )
  })

  afterEach(() => {
    controller.destroy()
    eventBus.clear()
  })

  // ===========================================
  // 构造函数测试
  // ===========================================

  describe('构造函数', () => {
    it('应该正确初始化', () => {
      expect(controller).toBeDefined()
      expect(controller.isEnabled()).toBe(false)
    })
  })

  // ===========================================
  // enable/disable 测试
  // ===========================================

  describe('enable/disable', () => {
    it('enable() 应该启用控制器', () => {
      controller.enable()
      expect(controller.isEnabled()).toBe(true)
    })

    it('disable() 应该禁用控制器', () => {
      controller.enable()
      controller.disable()
      expect(controller.isEnabled()).toBe(false)
    })

    it('重复 enable() 应该是幂等的', () => {
      controller.enable()
      controller.enable()
      expect(controller.isEnabled()).toBe(true)
    })

    it('重复 disable() 应该是幂等的', () => {
      controller.disable()
      controller.disable()
      expect(controller.isEnabled()).toBe(false)
    })
  })

  // ===========================================
  // skill:triggered 事件测试 (AC: #1)
  // ===========================================

  describe('skill:triggered 事件 (AC: #1)', () => {
    it('启用后应该在技能触发时播放粒子', () => {
      controller.enable()

      eventBus.emit('skill:triggered', {
        key: 'A',
        skillId: 'fire_blast',
        type: 'passive' as const
      })

      expect(mockParticleManager.playSkillTrigger).toHaveBeenCalledWith(
        'fire_blast',
        expect.any(Number),
        expect.any(Number)
      )
    })

    it('禁用后不应该响应技能触发事件', () => {
      controller.enable()
      controller.disable()

      eventBus.emit('skill:triggered', {
        key: 'A',
        skillId: 'fire_blast',
        type: 'passive' as const
      })

      expect(mockParticleManager.playSkillTrigger).not.toHaveBeenCalled()
    })
  })

  // ===========================================
  // word:complete 事件测试 (AC: #2)
  // ===========================================

  describe('word:complete 事件 (AC: #2)', () => {
    it('启用后应该在词语完成时播放粒子和飘字', () => {
      controller.enable()

      eventBus.emit('word:complete', {
        word: 'TEST',
        score: 150,
        perfect: true
      })

      expect(mockParticleManager.play).toHaveBeenCalledWith(
        'word_complete',
        expect.any(Number),
        expect.any(Number)
      )
      expect(mockScorePopup.show).toHaveBeenCalledWith(
        150,
        expect.any(Number),
        expect.any(Number)
      )
    })

    it('禁用后不应该响应词语完成事件', () => {
      controller.enable()
      controller.disable()

      eventBus.emit('word:complete', {
        word: 'TEST',
        score: 150,
        perfect: true
      })

      expect(mockParticleManager.play).not.toHaveBeenCalled()
      expect(mockScorePopup.show).not.toHaveBeenCalled()
    })
  })

  // ===========================================
  // combo:update 里程碑测试 (AC: #4)
  // ===========================================

  describe('combo:update 里程碑 (AC: #4)', () => {
    it('达到里程碑 10 时应该播放庆祝粒子', () => {
      controller.enable()

      eventBus.emit('combo:update', { combo: 10 })

      expect(mockParticleManager.playComboMilestone).toHaveBeenCalledWith(
        10,
        expect.any(Number),
        expect.any(Number)
      )
    })

    it('达到里程碑 25 时应该播放庆祝粒子', () => {
      controller.enable()

      // 先到达 10
      eventBus.emit('combo:update', { combo: 10 })
      vi.clearAllMocks()

      // 然后到达 25
      eventBus.emit('combo:update', { combo: 25 })

      expect(mockParticleManager.playComboMilestone).toHaveBeenCalledWith(
        25,
        expect.any(Number),
        expect.any(Number)
      )
    })

    it('达到里程碑 50 时应该播放庆祝粒子', () => {
      controller.enable()
      eventBus.emit('combo:update', { combo: 10 })
      eventBus.emit('combo:update', { combo: 25 })
      vi.clearAllMocks()

      eventBus.emit('combo:update', { combo: 50 })

      expect(mockParticleManager.playComboMilestone).toHaveBeenCalledWith(
        50,
        expect.any(Number),
        expect.any(Number)
      )
    })

    it('达到里程碑 100 时应该播放庆祝粒子', () => {
      controller.enable()
      eventBus.emit('combo:update', { combo: 10 })
      eventBus.emit('combo:update', { combo: 25 })
      eventBus.emit('combo:update', { combo: 50 })
      vi.clearAllMocks()

      eventBus.emit('combo:update', { combo: 100 })

      expect(mockParticleManager.playComboMilestone).toHaveBeenCalledWith(
        100,
        expect.any(Number),
        expect.any(Number)
      )
    })

    it('未达到里程碑时不应该播放庆祝粒子', () => {
      controller.enable()

      eventBus.emit('combo:update', { combo: 5 })

      expect(mockParticleManager.playComboMilestone).not.toHaveBeenCalled()
    })

    it('同一里程碑不应该重复播放', () => {
      controller.enable()

      eventBus.emit('combo:update', { combo: 10 })
      eventBus.emit('combo:update', { combo: 11 })
      eventBus.emit('combo:update', { combo: 12 })

      // 只应该播放一次
      expect(mockParticleManager.playComboMilestone).toHaveBeenCalledTimes(1)
    })

    it('combo 断裂后应该重置里程碑状态', () => {
      controller.enable()

      // 先达到里程碑 10
      eventBus.emit('combo:update', { combo: 10 })
      expect(mockParticleManager.playComboMilestone).toHaveBeenCalledTimes(1)

      // combo 断裂
      eventBus.emit('combo:update', { combo: 0 })
      vi.clearAllMocks()

      // 再次达到里程碑 10 应该再次播放
      eventBus.emit('combo:update', { combo: 10 })
      expect(mockParticleManager.playComboMilestone).toHaveBeenCalledWith(
        10,
        expect.any(Number),
        expect.any(Number)
      )
    })
  })

  // ===========================================
  // combo:update 火焰效果测试 (AC: #3)
  // ===========================================

  describe('combo:update 火焰效果 (AC: #3)', () => {
    it('连击 10+ 时应该启动火焰效果', () => {
      controller.enable()

      eventBus.emit('combo:update', { combo: 10 })

      expect(mockParticleManager.playComboFlame).toHaveBeenCalled()
    })

    it('连击降到 10 以下时应该停止火焰效果', () => {
      controller.enable()

      // 启动火焰
      eventBus.emit('combo:update', { combo: 15 })
      vi.clearAllMocks()

      // 降到 10 以下
      eventBus.emit('combo:update', { combo: 5 })

      expect(mockParticleManager.stopComboFlame).toHaveBeenCalled()
    })

    it('combo 断裂时应该停止火焰效果', () => {
      controller.enable()

      // 启动火焰
      eventBus.emit('combo:update', { combo: 15 })
      vi.clearAllMocks()

      // 断裂
      eventBus.emit('combo:update', { combo: 0 })

      expect(mockParticleManager.stopComboFlame).toHaveBeenCalled()
    })
  })

  // ===========================================
  // destroy 测试
  // ===========================================

  describe('destroy()', () => {
    it('应该禁用并清理控制器', () => {
      controller.enable()
      controller.destroy()

      expect(controller.isEnabled()).toBe(false)

      // 销毁后不应该响应事件
      eventBus.emit('skill:triggered', {
        key: 'A',
        skillId: 'fire_blast',
        type: 'passive' as const
      })
      expect(mockParticleManager.playSkillTrigger).not.toHaveBeenCalled()
    })
  })

  // ===========================================
  // 位置提供者测试
  // ===========================================

  describe('位置提供者', () => {
    it('应该支持设置键位位置提供者', () => {
      const positionProvider = vi.fn().mockReturnValue({ x: 100, y: 200 })
      controller.setKeyPositionProvider(positionProvider)
      controller.enable()

      eventBus.emit('skill:triggered', {
        key: 'A',
        skillId: 'fire_blast',
        type: 'passive' as const
      })

      expect(positionProvider).toHaveBeenCalledWith('A')
      expect(mockParticleManager.playSkillTrigger).toHaveBeenCalledWith(
        'fire_blast',
        100,
        200
      )
    })

    it('应该支持设置词语位置提供者', () => {
      const positionProvider = vi.fn().mockReturnValue({ x: 300, y: 400 })
      controller.setWordPositionProvider(positionProvider)
      controller.enable()

      eventBus.emit('word:complete', {
        word: 'TEST',
        score: 100,
        perfect: true
      })

      expect(positionProvider).toHaveBeenCalled()
      expect(mockParticleManager.play).toHaveBeenCalledWith(
        'word_complete',
        300,
        400
      )
    })

    it('应该支持设置连击位置提供者', () => {
      const positionProvider = vi.fn().mockReturnValue({ x: 500, y: 600 })
      controller.setComboPositionProvider(positionProvider)
      controller.enable()

      eventBus.emit('combo:update', { combo: 10 })

      expect(positionProvider).toHaveBeenCalled()
      expect(mockParticleManager.playComboMilestone).toHaveBeenCalledWith(
        10,
        500,
        600
      )
    })
  })
})
