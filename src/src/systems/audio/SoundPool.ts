// ============================================
// 打字肉鸽 - SoundPool 音效池
// ============================================
// Story 7.1: 音频管理器 - 音效池 (AC: #2, #6)

import { Howl } from 'howler'

/**
 * SoundPool - 音效池
 *
 * 预创建多个 Howl 实例，支持快速连续播放而不会产生延迟或重叠问题。
 * 使用轮询方式播放，确保每次播放使用不同的实例。
 *
 * 职责:
 * - 管理预加载的音效实例池 (AC: #2)
 * - 轮询播放避免重叠 (AC: #2)
 * - 支持音量控制 (AC: #5)
 * - 确保低延迟 < 50ms (AC: #6)
 *
 * 延迟设计 (AC: #6):
 * - 所有 Howl 实例在构造时预加载 (preload: true)
 * - 默认池大小 20 支持 100+ WPM 打字速度
 * - 轮询播放确保每个实例有足够的恢复时间
 * - 避免运行时创建 Howl 实例的开销
 *
 * 注意: 实际延迟测量需要真实音频设备，建议在集成测试中使用
 * performance.now() 进行端到端延迟验证。
 */
export class SoundPool {
  private sounds: Howl[] = []
  private currentIndex = 0
  private volume = 1.0

  /**
   * 创建音效池
   * @param src 音频文件路径数组（支持多格式 fallback）
   * @param poolSize 池大小，默认 20（支持 100+ WPM 打字速度）
   */
  constructor(src: string[], poolSize: number = 20) {
    for (let i = 0; i < poolSize; i++) {
      this.sounds.push(new Howl({
        src,
        volume: this.volume,
        preload: true
      }))
    }
  }

  /**
   * 播放音效
   * 使用轮询方式选择实例，避免同一实例重叠播放
   * @returns 播放 ID
   */
  play(): number {
    if (this.sounds.length === 0) {
      return -1
    }

    const sound = this.sounds[this.currentIndex]
    this.currentIndex = (this.currentIndex + 1) % this.sounds.length

    return sound.play()
  }

  /**
   * 设置所有实例的音量
   * @param volume 音量值 (0-1)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume))
    this.sounds.forEach(s => s.volume(this.volume))
  }

  /**
   * 获取当前音量
   */
  getVolume(): number {
    return this.volume
  }

  /**
   * 获取池大小
   */
  getPoolSize(): number {
    return this.sounds.length
  }

  /**
   * 释放所有资源
   */
  dispose(): void {
    this.sounds.forEach(s => s.unload())
    this.sounds = []
    this.currentIndex = 0
  }
}
