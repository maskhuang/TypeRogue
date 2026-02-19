// ============================================
// 打字肉鸽 - SoundPool 单元测试
// ============================================
// Story 7.1: 音频管理器 - 音效池测试 (AC: #2, #6)

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Howler before importing SoundPool
vi.mock('howler', () => ({
  Howl: vi.fn().mockImplementation(() => ({
    play: vi.fn().mockReturnValue(1),
    stop: vi.fn(),
    pause: vi.fn(),
    volume: vi.fn().mockReturnThis(),
    fade: vi.fn(),
    unload: vi.fn(),
    on: vi.fn().mockReturnThis(),
    once: vi.fn().mockReturnThis(),
    state: vi.fn().mockReturnValue('loaded')
  })),
  Howler: {
    volume: vi.fn()
  }
}))

import { SoundPool } from '../../../../src/systems/audio/SoundPool'
import { Howl } from 'howler'

describe('SoundPool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ===========================================
  // Task 2: SoundPool 音效池 (AC: #2, #6)
  // ===========================================

  describe('构造函数', () => {
    it('应该创建指定数量的 Howl 实例', () => {
      const pool = new SoundPool(['test.ogg'], 20)

      expect(Howl).toHaveBeenCalledTimes(20)
      pool.dispose()
    })

    it('应该使用默认池大小 20', () => {
      const pool = new SoundPool(['test.ogg'])

      expect(Howl).toHaveBeenCalledTimes(20)
      pool.dispose()
    })

    it('应该使用自定义池大小', () => {
      const pool = new SoundPool(['test.ogg'], 10)

      expect(Howl).toHaveBeenCalledTimes(10)
      pool.dispose()
    })

    it('应该传递正确的配置给 Howl', () => {
      const pool = new SoundPool(['test.ogg', 'test.mp3'], 5)

      expect(Howl).toHaveBeenCalledWith(expect.objectContaining({
        src: ['test.ogg', 'test.mp3'],
        preload: true
      }))
      pool.dispose()
    })
  })

  describe('play() 轮询播放', () => {
    it('应该调用当前索引的 sound.play()', () => {
      const pool = new SoundPool(['test.ogg'], 3)

      pool.play()

      // 获取第一个创建的 Howl 实例
      const firstInstance = (Howl as unknown as ReturnType<typeof vi.fn>).mock.results[0].value
      expect(firstInstance.play).toHaveBeenCalled()
      pool.dispose()
    })

    it('应该轮询播放不同实例', () => {
      const pool = new SoundPool(['test.ogg'], 3)

      // 播放 3 次
      pool.play()
      pool.play()
      pool.play()

      // 每个实例应该被调用一次
      const instances = (Howl as unknown as ReturnType<typeof vi.fn>).mock.results
      expect(instances[0].value.play).toHaveBeenCalledTimes(1)
      expect(instances[1].value.play).toHaveBeenCalledTimes(1)
      expect(instances[2].value.play).toHaveBeenCalledTimes(1)
      pool.dispose()
    })

    it('应该循环回到第一个实例', () => {
      const pool = new SoundPool(['test.ogg'], 3)

      // 播放 4 次，第 4 次应该回到第一个
      pool.play()
      pool.play()
      pool.play()
      pool.play()

      const instances = (Howl as unknown as ReturnType<typeof vi.fn>).mock.results
      expect(instances[0].value.play).toHaveBeenCalledTimes(2)
      pool.dispose()
    })

    it('应该返回播放 ID', () => {
      const pool = new SoundPool(['test.ogg'], 3)

      const playId = pool.play()

      expect(playId).toBe(1)
      pool.dispose()
    })
  })

  describe('setVolume() 音量控制', () => {
    it('应该设置所有实例的音量', () => {
      const pool = new SoundPool(['test.ogg'], 3)

      pool.setVolume(0.5)

      const instances = (Howl as unknown as ReturnType<typeof vi.fn>).mock.results
      instances.forEach(result => {
        expect(result.value.volume).toHaveBeenCalledWith(0.5)
      })
      pool.dispose()
    })

    it('应该接受 0-1 范围的音量值', () => {
      const pool = new SoundPool(['test.ogg'], 2)

      pool.setVolume(0)
      pool.setVolume(1)
      pool.setVolume(0.75)

      const firstInstance = (Howl as unknown as ReturnType<typeof vi.fn>).mock.results[0].value
      expect(firstInstance.volume).toHaveBeenCalledWith(0)
      expect(firstInstance.volume).toHaveBeenCalledWith(1)
      expect(firstInstance.volume).toHaveBeenCalledWith(0.75)
      pool.dispose()
    })
  })

  describe('getPoolSize()', () => {
    it('应该返回池大小', () => {
      const pool = new SoundPool(['test.ogg'], 15)

      expect(pool.getPoolSize()).toBe(15)
      pool.dispose()
    })
  })

  describe('dispose() 资源清理', () => {
    it('应该卸载所有实例', () => {
      const pool = new SoundPool(['test.ogg'], 3)

      pool.dispose()

      const instances = (Howl as unknown as ReturnType<typeof vi.fn>).mock.results
      instances.forEach(result => {
        expect(result.value.unload).toHaveBeenCalled()
      })
    })

    it('dispose 后池大小应该为 0', () => {
      const pool = new SoundPool(['test.ogg'], 3)

      pool.dispose()

      expect(pool.getPoolSize()).toBe(0)
    })
  })
})
