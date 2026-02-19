// ============================================
// 打字肉鸽 - AudioManager 单元测试
// ============================================
// Story 7.1: 音频管理器 (AC: #1, #3, #4, #5, #7, #8, #9)

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock Howler before importing AudioManager
vi.mock('howler', () => ({
  Howl: vi.fn().mockImplementation((config) => {
    const instance = {
      play: vi.fn().mockReturnValue(1),
      stop: vi.fn(),
      pause: vi.fn(),
      volume: vi.fn().mockReturnThis(),
      fade: vi.fn().mockReturnThis(),
      unload: vi.fn(),
      on: vi.fn().mockReturnThis(),
      once: vi.fn().mockReturnThis(),
      state: vi.fn().mockReturnValue('loaded'),
      loop: vi.fn().mockReturnThis(),
      playing: vi.fn().mockReturnValue(false),
      _src: config?.src
    }
    return instance
  }),
  Howler: {
    volume: vi.fn()
  }
}))

// Mock SoundPool
vi.mock('../../../../src/systems/audio/SoundPool', () => ({
  SoundPool: vi.fn().mockImplementation(() => ({
    play: vi.fn().mockReturnValue(1),
    setVolume: vi.fn(),
    getPoolSize: vi.fn().mockReturnValue(20),
    dispose: vi.fn()
  }))
}))

import { AudioManager } from '../../../../src/systems/audio/AudioManager'
import { eventBus } from '../../../../src/core/events/EventBus'
import { Howl } from 'howler'
import { SoundPool } from '../../../../src/systems/audio/SoundPool'

describe('AudioManager', () => {
  let audioManager: AudioManager

  beforeEach(() => {
    vi.clearAllMocks()
    // 重置单例
    AudioManager.resetInstance()
    audioManager = AudioManager.getInstance()
  })

  afterEach(() => {
    audioManager.dispose()
  })

  // ===========================================
  // Task 3: AudioManager 核心类 (AC: #1)
  // ===========================================

  describe('单例模式 (AC: #1)', () => {
    it('应该返回同一个实例', () => {
      const instance1 = AudioManager.getInstance()
      const instance2 = AudioManager.getInstance()

      expect(instance1).toBe(instance2)
    })

    it('resetInstance 应该重置单例', () => {
      const instance1 = AudioManager.getInstance()
      AudioManager.resetInstance()
      const instance2 = AudioManager.getInstance()

      expect(instance1).not.toBe(instance2)
    })
  })

  describe('init() 初始化 (AC: #1)', () => {
    it('应该创建击键音效池', async () => {
      await audioManager.init()

      expect(SoundPool).toHaveBeenCalled()
    })

    it('应该预加载基础 SFX', async () => {
      await audioManager.init()

      // 检查 sfx 是否已预加载（Howl 被调用）
      expect(Howl).toHaveBeenCalled()
    })

    it('init 只应该执行一次', async () => {
      await audioManager.init()
      const callCount1 = (SoundPool as unknown as ReturnType<typeof vi.fn>).mock.calls.length

      await audioManager.init()
      const callCount2 = (SoundPool as unknown as ReturnType<typeof vi.fn>).mock.calls.length

      expect(callCount2).toBe(callCount1)
    })
  })

  // ===========================================
  // Task 10: 延迟验证设计 (AC: #6)
  // ===========================================

  describe('低延迟设计验证 (AC: #6)', () => {
    /**
     * AC#6 要求音效延迟 < 50ms
     *
     * 设计保证:
     * 1. SoundPool 预创建 20+ Howl 实例，避免运行时创建延迟
     * 2. 所有音效在 init() 时预加载 (preload: true)
     * 3. 轮询播放避免同一实例重叠导致的延迟
     *
     * 注意: 实际延迟测量需要真实音频设备，需在集成测试中验证
     */

    it('击键音效池应该有 20+ 实例支持快速连击', async () => {
      await audioManager.init()

      // 验证 SoundPool 被调用时使用了 20 的池大小
      const soundPoolCalls = (SoundPool as unknown as ReturnType<typeof vi.fn>).mock.calls
      // 第一个调用是 keySoundPool (20)
      expect(soundPoolCalls[0][1]).toBe(20)
    })

    it('所有 SFX 应该预加载 (preload: true)', async () => {
      await audioManager.init()

      // 验证 Howl 被调用时设置了 preload: true
      const howlCalls = (Howl as unknown as ReturnType<typeof vi.fn>).mock.calls
      howlCalls.forEach(call => {
        expect(call[0].preload).toBe(true)
      })
    })

    it('连续快速播放应该使用不同的音效实例', async () => {
      await audioManager.init()
      const soundPoolMock = (SoundPool as unknown as ReturnType<typeof vi.fn>).mock.results[0].value

      // 模拟快速连击
      for (let i = 0; i < 10; i++) {
        audioManager.playSfx('key_correct')
      }

      // 验证 play 被调用 10 次
      expect(soundPoolMock.play).toHaveBeenCalledTimes(10)
    })
  })

  // ===========================================
  // Task 3 & 9: playSfx (AC: #2, #9)
  // ===========================================

  describe('playSfx() 音效播放', () => {
    it('key_correct 应该使用音效池播放', async () => {
      await audioManager.init()
      const handler = vi.fn()
      const unsubscribe = eventBus.on('audio:sfx_play', handler)

      audioManager.playSfx('key_correct')

      expect(handler).toHaveBeenCalledWith({ type: 'key_correct' })
      unsubscribe()
    })

    it('其他 SFX 类型应该播放对应音效', async () => {
      await audioManager.init()
      const handler = vi.fn()
      const unsubscribe = eventBus.on('audio:sfx_play', handler)

      audioManager.playSfx('key_error')

      expect(handler).toHaveBeenCalledWith({ type: 'key_error' })
      unsubscribe()
    })

    it('静音时不应该播放', async () => {
      await audioManager.init()
      audioManager.setMuted(true)
      const handler = vi.fn()
      const unsubscribe = eventBus.on('audio:sfx_play', handler)

      audioManager.playSfx('key_correct')

      expect(handler).not.toHaveBeenCalled()
      unsubscribe()
    })
  })

  // ===========================================
  // Task 4: BGM 管理 (AC: #4)
  // ===========================================

  describe('BGM 管理 (AC: #4)', () => {
    it('playBgm 应该播放 BGM 并发送事件', async () => {
      await audioManager.init()
      await audioManager.preloadBgm('battle')
      const handler = vi.fn()
      const unsubscribe = eventBus.on('audio:bgm_change', handler)

      audioManager.playBgm('battle')

      expect(handler).toHaveBeenCalledWith({ trackId: 'battle' })
      unsubscribe()
    })

    it('stopBgm 应该停止当前 BGM', async () => {
      await audioManager.init()
      await audioManager.preloadBgm('battle')
      audioManager.playBgm('battle')

      audioManager.stopBgm()

      // BGM 应该被淡出停止
      expect(audioManager.getCurrentBgmId()).toBeNull()
    })

    it('pauseBgm 应该暂停 BGM', async () => {
      await audioManager.init()
      await audioManager.preloadBgm('battle')
      audioManager.playBgm('battle')

      // 获取 BGM mock 实例 (preloadBgm 创建的最后一个 Howl)
      const howlCalls = (Howl as unknown as ReturnType<typeof vi.fn>).mock.results
      const bgmInstance = howlCalls[howlCalls.length - 1].value

      audioManager.pauseBgm()

      // 验证 pause 被调用
      expect(bgmInstance.pause).toHaveBeenCalled()
    })

    it('resumeBgm 应该恢复 BGM', async () => {
      await audioManager.init()
      await audioManager.preloadBgm('battle')
      audioManager.playBgm('battle')

      // 获取 BGM mock 实例
      const howlCalls = (Howl as unknown as ReturnType<typeof vi.fn>).mock.results
      const bgmInstance = howlCalls[howlCalls.length - 1].value

      audioManager.pauseBgm()
      audioManager.resumeBgm()

      // 验证 play 被再次调用（恢复播放）
      // playBgm 调用一次 play()，resumeBgm 再调用一次
      expect(bgmInstance.play).toHaveBeenCalledTimes(2)
    })
  })

  // ===========================================
  // Task 5: 音量控制 (AC: #5, #7)
  // ===========================================

  describe('音量控制 (AC: #5)', () => {
    it('应该设置 master 音量', async () => {
      await audioManager.init()
      const handler = vi.fn()
      const unsubscribe = eventBus.on('audio:volume_change', handler)

      audioManager.setMasterVolume(0.8)

      expect(audioManager.getVolumes().master).toBe(0.8)
      expect(handler).toHaveBeenCalled()
      unsubscribe()
    })

    it('应该设置 sfx 音量', async () => {
      await audioManager.init()

      audioManager.setSfxVolume(0.5)

      expect(audioManager.getVolumes().sfx).toBe(0.5)
    })

    it('应该设置 bgm 音量', async () => {
      await audioManager.init()

      audioManager.setBgmVolume(0.3)

      expect(audioManager.getVolumes().bgm).toBe(0.3)
    })

    it('音量应该限制在 0-1 范围', async () => {
      await audioManager.init()

      audioManager.setMasterVolume(-0.5)
      expect(audioManager.getVolumes().master).toBe(0)

      audioManager.setMasterVolume(1.5)
      expect(audioManager.getVolumes().master).toBe(1)
    })

    it('getVolumes 应该返回所有音量设置', async () => {
      await audioManager.init()
      audioManager.setMasterVolume(0.9)
      audioManager.setSfxVolume(0.6)
      audioManager.setBgmVolume(0.4)

      const volumes = audioManager.getVolumes()

      expect(volumes.master).toBe(0.9)
      expect(volumes.sfx).toBe(0.6)
      expect(volumes.bgm).toBe(0.4)
    })
  })

  // ===========================================
  // Task 5: 静音控制 (AC: #7)
  // ===========================================

  describe('静音控制 (AC: #7)', () => {
    it('应该切换静音状态', async () => {
      await audioManager.init()
      const handler = vi.fn()
      const unsubscribe = eventBus.on('audio:mute_change', handler)

      audioManager.setMuted(true)

      expect(audioManager.isMuted()).toBe(true)
      expect(handler).toHaveBeenCalledWith({ muted: true })
      unsubscribe()
    })

    it('取消静音后应该恢复播放能力', async () => {
      await audioManager.init()

      audioManager.setMuted(true)
      audioManager.setMuted(false)

      expect(audioManager.isMuted()).toBe(false)
    })
  })

  // ===========================================
  // Task 6: 技能音效预加载 (AC: #3)
  // ===========================================

  describe('技能音效预加载 (AC: #3)', () => {
    it('preloadSkillSounds 应该加载技能音效', async () => {
      await audioManager.init()

      await audioManager.preloadSkillSounds(['score_boost', 'time_extend'])

      // Howl 应该被调用来创建技能音效
      expect(Howl).toHaveBeenCalled()
    })

    it('playSkillSound 应该播放技能音效', async () => {
      await audioManager.init()
      const howlCallsBefore = (Howl as unknown as ReturnType<typeof vi.fn>).mock.results.length

      await audioManager.preloadSkillSounds(['score_boost'])

      // 获取技能音效的 mock 实例（preloadSkillSounds 创建的 Howl）
      const howlCalls = (Howl as unknown as ReturnType<typeof vi.fn>).mock.results
      const skillSoundInstance = howlCalls[howlCalls.length - 1].value

      audioManager.playSkillSound('score_boost')

      // 验证 play 被调用
      expect(skillSoundInstance.play).toHaveBeenCalled()
    })

    it('未加载的技能音效应该静默失败', async () => {
      await audioManager.init()

      // 不应该抛出错误
      expect(() => audioManager.playSkillSound('unknown_skill')).not.toThrow()
    })
  })

  // ===========================================
  // Task 7: 事件集成 (AC: #9)
  // ===========================================

  describe('事件集成 (AC: #9)', () => {
    it('playSfx 应该发送 audio:sfx_play 事件', async () => {
      await audioManager.init()
      const handler = vi.fn()
      const unsubscribe = eventBus.on('audio:sfx_play', handler)

      audioManager.playSfx('word_complete')

      expect(handler).toHaveBeenCalledWith({ type: 'word_complete' })
      unsubscribe()
    })

    it('playBgm 应该发送 audio:bgm_change 事件', async () => {
      await audioManager.init()
      await audioManager.preloadBgm('menu')
      const handler = vi.fn()
      const unsubscribe = eventBus.on('audio:bgm_change', handler)

      audioManager.playBgm('menu')

      expect(handler).toHaveBeenCalledWith({ trackId: 'menu' })
      unsubscribe()
    })

    it('setMasterVolume 应该发送 audio:volume_change 事件', async () => {
      await audioManager.init()
      const handler = vi.fn()
      const unsubscribe = eventBus.on('audio:volume_change', handler)

      audioManager.setMasterVolume(0.5)

      expect(handler).toHaveBeenCalled()
      unsubscribe()
    })

    it('setMuted 应该发送 audio:mute_change 事件', async () => {
      await audioManager.init()
      const handler = vi.fn()
      const unsubscribe = eventBus.on('audio:mute_change', handler)

      audioManager.setMuted(true)

      expect(handler).toHaveBeenCalledWith({ muted: true })
      unsubscribe()
    })
  })

  // ===========================================
  // dispose
  // ===========================================

  describe('dispose()', () => {
    it('应该清理所有资源', async () => {
      await audioManager.init()
      // 获取 SoundPool mock 实例
      const soundPoolMock = (SoundPool as unknown as ReturnType<typeof vi.fn>).mock.results[0].value

      audioManager.dispose()

      // 验证 SoundPool.dispose 被调用
      expect(soundPoolMock.dispose).toHaveBeenCalled()
    })

    it('dispose 后再次 init 应该能正常工作', async () => {
      await audioManager.init()
      audioManager.dispose()

      // 重新获取实例并初始化
      AudioManager.resetInstance()
      const newManager = AudioManager.getInstance()
      await newManager.init()

      // 验证新实例可以正常工作
      expect(() => newManager.playSfx('key_correct')).not.toThrow()
      newManager.dispose()
    })
  })
})
