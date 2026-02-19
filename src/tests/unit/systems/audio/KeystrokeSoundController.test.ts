// ============================================
// 打字肉鸽 - KeystrokeSoundController 单元测试
// ============================================
// Story 7.2: 击键音效 (AC: #1, #2, #3, #5, #6, #7, #8)

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { KeystrokeSoundController } from '../../../../src/systems/audio/KeystrokeSoundController'
import { eventBus } from '../../../../src/core/events/EventBus'
import type { IAudioManager } from '../../../../src/systems/audio/AudioManager'

describe('KeystrokeSoundController', () => {
  let controller: KeystrokeSoundController
  let mockAudioManager: IAudioManager

  beforeEach(() => {
    // 创建 mock AudioManager
    mockAudioManager = {
      init: vi.fn().mockResolvedValue(undefined),
      playSfx: vi.fn(),
      playSkillSound: vi.fn(),
      playBgm: vi.fn(),
      stopBgm: vi.fn(),
      pauseBgm: vi.fn(),
      resumeBgm: vi.fn(),
      getCurrentBgmId: vi.fn().mockReturnValue(null),
      setMasterVolume: vi.fn(),
      setSfxVolume: vi.fn(),
      setBgmVolume: vi.fn(),
      getVolumes: vi.fn().mockReturnValue({ master: 1, sfx: 0.7, bgm: 0.5 }),
      setMuted: vi.fn(),
      isMuted: vi.fn().mockReturnValue(false),
      preloadSkillSounds: vi.fn().mockResolvedValue(undefined),
      preloadBgm: vi.fn().mockResolvedValue(undefined),
      dispose: vi.fn()
    }

    controller = new KeystrokeSoundController(mockAudioManager)
  })

  afterEach(() => {
    controller.destroy()
    eventBus.clear()
    vi.clearAllMocks()
  })

  // ===========================================
  // Task 1: 基础结构 (AC: #1, #2, #3)
  // ===========================================

  describe('构造函数', () => {
    it('应该正确初始化', () => {
      expect(controller).toBeDefined()
      expect(controller.isEnabled()).toBe(false)
    })
  })

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

  describe('word:correct 事件 (AC: #1)', () => {
    it('启用后应该在 word:correct 时播放 key_correct 音效', () => {
      controller.enable()

      eventBus.emit('word:correct', { key: 'A', index: 0 })

      expect(mockAudioManager.playSfx).toHaveBeenCalledWith('key_correct')
    })

    it('禁用后不应该响应 word:correct 事件', () => {
      controller.enable()
      controller.disable()

      eventBus.emit('word:correct', { key: 'A', index: 0 })

      expect(mockAudioManager.playSfx).not.toHaveBeenCalled()
    })
  })

  describe('word:error 事件 (AC: #2)', () => {
    it('启用后应该在 word:error 时播放 key_error 音效', () => {
      controller.enable()

      eventBus.emit('word:error', { key: 'B', expected: 'A' })

      expect(mockAudioManager.playSfx).toHaveBeenCalledWith('key_error')
    })

    it('禁用后不应该响应 word:error 事件', () => {
      controller.enable()
      controller.disable()

      eventBus.emit('word:error', { key: 'B', expected: 'A' })

      expect(mockAudioManager.playSfx).not.toHaveBeenCalled()
    })
  })

  // ===========================================
  // Task 2: 词语完成音效 (AC: #5)
  // ===========================================

  describe('word:complete 事件 (AC: #5)', () => {
    it('启用后应该在 word:complete 时播放 word_complete 音效', () => {
      controller.enable()

      eventBus.emit('word:complete', { word: 'TEST', score: 100, perfect: true })

      expect(mockAudioManager.playSfx).toHaveBeenCalledWith('word_complete')
    })

    it('禁用后不应该响应 word:complete 事件', () => {
      controller.enable()
      controller.disable()

      eventBus.emit('word:complete', { word: 'TEST', score: 100, perfect: true })

      expect(mockAudioManager.playSfx).not.toHaveBeenCalled()
    })
  })

  // ===========================================
  // Task 3: 连击里程碑音效 (AC: #6)
  // ===========================================

  describe('combo:update 里程碑 (AC: #6)', () => {
    it('达到里程碑 10 时应该播放 combo_milestone 音效', () => {
      controller.enable()

      eventBus.emit('combo:update', { combo: 10 })

      expect(mockAudioManager.playSfx).toHaveBeenCalledWith('combo_milestone')
    })

    it('达到里程碑 25 时应该播放 combo_milestone 音效', () => {
      controller.enable()
      // 先到达 10
      eventBus.emit('combo:update', { combo: 10 })
      vi.clearAllMocks()

      // 然后到达 25
      eventBus.emit('combo:update', { combo: 25 })

      expect(mockAudioManager.playSfx).toHaveBeenCalledWith('combo_milestone')
    })

    it('达到里程碑 50 时应该播放 combo_milestone 音效', () => {
      controller.enable()
      eventBus.emit('combo:update', { combo: 10 })
      eventBus.emit('combo:update', { combo: 25 })
      vi.clearAllMocks()

      eventBus.emit('combo:update', { combo: 50 })

      expect(mockAudioManager.playSfx).toHaveBeenCalledWith('combo_milestone')
    })

    it('达到里程碑 100 时应该播放 combo_milestone 音效', () => {
      controller.enable()
      eventBus.emit('combo:update', { combo: 10 })
      eventBus.emit('combo:update', { combo: 25 })
      eventBus.emit('combo:update', { combo: 50 })
      vi.clearAllMocks()

      eventBus.emit('combo:update', { combo: 100 })

      expect(mockAudioManager.playSfx).toHaveBeenCalledWith('combo_milestone')
    })

    it('未达到里程碑时不应该播放音效', () => {
      controller.enable()

      eventBus.emit('combo:update', { combo: 5 })

      expect(mockAudioManager.playSfx).not.toHaveBeenCalled()
    })

    it('同一里程碑不应该重复播放', () => {
      controller.enable()

      eventBus.emit('combo:update', { combo: 10 })
      eventBus.emit('combo:update', { combo: 11 })
      eventBus.emit('combo:update', { combo: 12 })

      // 只应该播放一次
      expect(mockAudioManager.playSfx).toHaveBeenCalledTimes(1)
    })

    it('combo 断裂后应该重置里程碑状态', () => {
      controller.enable()

      // 先达到里程碑 10
      eventBus.emit('combo:update', { combo: 10 })
      expect(mockAudioManager.playSfx).toHaveBeenCalledTimes(1)

      // combo 断裂
      eventBus.emit('combo:update', { combo: 0 })
      vi.clearAllMocks()

      // 再次达到里程碑 10 应该再次播放
      eventBus.emit('combo:update', { combo: 10 })
      expect(mockAudioManager.playSfx).toHaveBeenCalledWith('combo_milestone')
    })
  })

  // ===========================================
  // Task 4: 音高变化 (AC: #4) [可选]
  // ===========================================

  describe('音高变化 (AC: #4) [可选]', () => {
    it('getCurrentPitch() 默认返回 1.0', () => {
      expect(controller.getCurrentPitch()).toBe(1.0)
    })

    it('resetPitch() 应该重置音高到 1.0', () => {
      controller.resetPitch()
      expect(controller.getCurrentPitch()).toBe(1.0)
    })
  })

  // ===========================================
  // Task 5: 静音模式 (AC: #8)
  // ===========================================

  describe('静音模式 (AC: #8)', () => {
    it('AudioManager.playSfx 被调用（静音逻辑在 AudioManager 内部处理）', () => {
      // 静音模式的检查在 AudioManager 内部
      // KeystrokeSoundController 只需正常调用 playSfx
      controller.enable()

      eventBus.emit('word:correct', { key: 'A', index: 0 })

      // 验证调用被发出，实际静音由 AudioManager 处理
      expect(mockAudioManager.playSfx).toHaveBeenCalled()
    })
  })

  // ===========================================
  // destroy
  // ===========================================

  describe('destroy()', () => {
    it('应该禁用并清理控制器', () => {
      controller.enable()
      controller.destroy()

      expect(controller.isEnabled()).toBe(false)

      // 销毁后不应该响应事件
      eventBus.emit('word:correct', { key: 'A', index: 0 })
      expect(mockAudioManager.playSfx).not.toHaveBeenCalled()
    })
  })
})
