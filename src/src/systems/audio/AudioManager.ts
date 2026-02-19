// ============================================
// 打字肉鸽 - AudioManager 音频管理器
// ============================================
// Story 7.1: 音频管理器 (AC: #1, #3, #4, #5, #7, #9)

import { Howl } from 'howler'
import { SoundPool } from './SoundPool'
import { eventBus } from '../../core/events/EventBus'

/**
 * 音量设置
 */
export interface VolumeSettings {
  master: number  // 0-1
  sfx: number     // 0-1
  bgm: number     // 0-1
}

/**
 * 音效类型
 */
export type SfxType =
  | 'key_correct'
  | 'key_error'
  | 'word_complete'
  | 'combo_milestone'
  | 'multiplier_burst'
  | 'ui_click'

/**
 * 音频管理器接口
 * 定义 AudioManager 的公共 API
 */
export interface IAudioManager {
  // 初始化
  init(): Promise<void>

  // 音效播放
  playSfx(type: SfxType): void
  playSkillSound(skillId: string): void

  // BGM 控制
  playBgm(trackId: string, fadeIn?: number): void
  stopBgm(fadeOut?: number): void
  pauseBgm(): void
  resumeBgm(): void
  getCurrentBgmId(): string | null

  // 音量控制
  setMasterVolume(volume: number): void
  setSfxVolume(volume: number): void
  setBgmVolume(volume: number): void
  getVolumes(): VolumeSettings

  // 静音
  setMuted(muted: boolean): void
  isMuted(): boolean

  // 预加载
  preloadSkillSounds(skillIds: string[]): Promise<void>
  preloadBgm(trackId: string): Promise<void>

  // 清理
  dispose(): void
}

/**
 * 音频路径配置
 */
const AUDIO_PATHS = {
  sfx: {
    key_correct: ['assets/audio/sfx/typing/key-correct.ogg'],
    key_error: ['assets/audio/sfx/typing/key-error.ogg'],
    word_complete: ['assets/audio/sfx/ui/word-complete.ogg'],
    combo_milestone: ['assets/audio/sfx/ui/combo-milestone.ogg'],
    multiplier_burst: ['assets/audio/sfx/ui/multiplier-burst.ogg'],
    ui_click: ['assets/audio/sfx/ui/click.ogg']
  },
  bgm: {
    menu: ['assets/audio/bgm/menu.ogg'],
    battle: ['assets/audio/bgm/battle-act1.ogg'],
    shop: ['assets/audio/bgm/shop.ogg']
  },
  skillPrefix: 'assets/audio/sfx/skills/'
}

/**
 * AudioManager - 音频管理器 (单例)
 *
 * 封装 Howler.js，提供统一的音频管理接口。
 *
 * 职责:
 * - 管理击键音效池 (AC: #2)
 * - 管理技能音效预加载 (AC: #3)
 * - 管理 BGM 播放和淡入淡出 (AC: #4)
 * - 提供三级音量控制 (AC: #5)
 * - 支持静音模式 (AC: #7)
 * - 发送音频相关事件 (AC: #9)
 */
export class AudioManager implements IAudioManager {
  private static instance: AudioManager | null = null

  // 音效池 (用于高频击键音效)
  private keySoundPool: SoundPool | null = null
  private errorSoundPool: SoundPool | null = null

  // 单次音效
  private sfxSounds: Map<string, Howl> = new Map()

  // 技能音效
  private skillSounds: Map<string, Howl> = new Map()

  // BGM
  private currentBgm: Howl | null = null
  private currentBgmId: string | null = null
  private bgmCache: Map<string, Howl> = new Map()
  private bgmPaused = false

  // 音量设置
  private volumes: VolumeSettings = {
    master: 1.0,
    sfx: 0.7,
    bgm: 0.5
  }

  // 静音状态
  private muted = false

  // 初始化标记
  private initialized = false

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager()
    }
    return AudioManager.instance
  }

  /**
   * 重置单例（用于测试）
   */
  static resetInstance(): void {
    if (AudioManager.instance) {
      AudioManager.instance.dispose()
    }
    AudioManager.instance = null
  }

  /**
   * 初始化音频系统
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return
    }

    // 创建击键音效池 (20 个实例支持快速连击)
    this.keySoundPool = new SoundPool(AUDIO_PATHS.sfx.key_correct, 20)
    this.errorSoundPool = new SoundPool(AUDIO_PATHS.sfx.key_error, 10)

    // 预加载基础 SFX
    await this.preloadBaseSfx()

    this.initialized = true
  }

  /**
   * 预加载基础音效
   */
  private async preloadBaseSfx(): Promise<void> {
    const sfxToLoad: SfxType[] = ['word_complete', 'combo_milestone', 'multiplier_burst', 'ui_click']

    for (const type of sfxToLoad) {
      const paths = AUDIO_PATHS.sfx[type]
      if (paths) {
        const sound = new Howl({
          src: paths,
          preload: true,
          volume: this.getEffectiveSfxVolume()
        })
        this.sfxSounds.set(type, sound)
      }
    }
  }

  // ===========================================
  // SFX 播放
  // ===========================================

  /**
   * 播放音效
   */
  playSfx(type: SfxType): void {
    if (this.muted) {
      return
    }

    const effectiveVolume = this.getEffectiveSfxVolume()

    // 高频音效使用音效池
    if (type === 'key_correct' && this.keySoundPool) {
      this.keySoundPool.setVolume(effectiveVolume)
      this.keySoundPool.play()
    } else if (type === 'key_error' && this.errorSoundPool) {
      this.errorSoundPool.setVolume(effectiveVolume)
      this.errorSoundPool.play()
    } else {
      // 其他音效直接播放
      const sound = this.sfxSounds.get(type)
      if (sound) {
        sound.volume(effectiveVolume)
        sound.play()
      }
    }

    eventBus.emit('audio:sfx_play', { type })
  }

  /**
   * 播放技能音效
   */
  playSkillSound(skillId: string): void {
    if (this.muted) {
      return
    }

    const sound = this.skillSounds.get(skillId)
    if (sound) {
      sound.volume(this.getEffectiveSfxVolume())
      sound.play()
      eventBus.emit('audio:sfx_play', { type: `skill_${skillId}` })
    }
  }

  /**
   * 预加载技能音效
   */
  async preloadSkillSounds(skillIds: string[]): Promise<void> {
    for (const skillId of skillIds) {
      if (!this.skillSounds.has(skillId)) {
        const sound = new Howl({
          src: [`${AUDIO_PATHS.skillPrefix}${skillId}.ogg`],
          preload: true,
          volume: this.getEffectiveSfxVolume()
        })
        this.skillSounds.set(skillId, sound)
      }
    }
  }

  // ===========================================
  // BGM 管理
  // ===========================================

  /**
   * 预加载 BGM
   */
  async preloadBgm(trackId: string): Promise<void> {
    if (this.bgmCache.has(trackId)) {
      return
    }

    const paths = AUDIO_PATHS.bgm[trackId as keyof typeof AUDIO_PATHS.bgm]
    if (paths) {
      const bgm = new Howl({
        src: paths,
        loop: true,
        preload: true,
        volume: 0
      })
      this.bgmCache.set(trackId, bgm)
    } else {
      console.warn(`[AudioManager] Unknown BGM trackId: ${trackId}`)
    }
  }

  /**
   * 播放 BGM（带淡入效果）
   */
  playBgm(trackId: string, fadeIn = 1000): void {
    // 如果当前有 BGM 在播放，先淡出
    if (this.currentBgm && this.currentBgmId !== trackId) {
      const oldBgm = this.currentBgm
      oldBgm.fade(oldBgm.volume(), 0, fadeIn / 2)
      setTimeout(() => {
        oldBgm.stop()
      }, fadeIn / 2)
    }

    // 获取新 BGM
    const bgm = this.bgmCache.get(trackId)
    if (!bgm) {
      console.warn(`[AudioManager] BGM not preloaded: ${trackId}. Call preloadBgm() first.`)
      return
    }

    // 设置并播放
    const targetVolume = this.getEffectiveBgmVolume()
    bgm.volume(0)
    bgm.play()
    bgm.fade(0, targetVolume, fadeIn)

    this.currentBgm = bgm
    this.currentBgmId = trackId
    this.bgmPaused = false

    eventBus.emit('audio:bgm_change', { trackId })
  }

  /**
   * 停止 BGM（带淡出效果）
   */
  stopBgm(fadeOut = 1000): void {
    if (this.currentBgm) {
      const bgm = this.currentBgm
      bgm.fade(bgm.volume(), 0, fadeOut)
      setTimeout(() => {
        bgm.stop()
      }, fadeOut)

      this.currentBgm = null
      this.currentBgmId = null
      this.bgmPaused = false
    }
  }

  /**
   * 暂停 BGM
   */
  pauseBgm(): void {
    if (this.currentBgm && !this.bgmPaused) {
      this.currentBgm.pause()
      this.bgmPaused = true
    }
  }

  /**
   * 恢复 BGM
   */
  resumeBgm(): void {
    if (this.currentBgm && this.bgmPaused) {
      this.currentBgm.play()
      this.bgmPaused = false
    }
  }

  /**
   * 获取当前 BGM ID
   */
  getCurrentBgmId(): string | null {
    return this.currentBgmId
  }

  // ===========================================
  // 音量控制
  // ===========================================

  /**
   * 设置主音量
   */
  setMasterVolume(volume: number): void {
    this.volumes.master = Math.max(0, Math.min(1, volume))
    this.updateAllVolumes()
    eventBus.emit('audio:volume_change', { volumes: this.getVolumes() })
  }

  /**
   * 设置音效音量
   */
  setSfxVolume(volume: number): void {
    this.volumes.sfx = Math.max(0, Math.min(1, volume))
    this.updateSfxVolumes()
    eventBus.emit('audio:volume_change', { volumes: this.getVolumes() })
  }

  /**
   * 设置 BGM 音量
   */
  setBgmVolume(volume: number): void {
    this.volumes.bgm = Math.max(0, Math.min(1, volume))
    this.updateBgmVolume()
    eventBus.emit('audio:volume_change', { volumes: this.getVolumes() })
  }

  /**
   * 获取当前音量设置
   */
  getVolumes(): VolumeSettings {
    return { ...this.volumes }
  }

  // ===========================================
  // 静音控制
  // ===========================================

  /**
   * 设置静音状态
   */
  setMuted(muted: boolean): void {
    this.muted = muted

    if (muted) {
      // 静音时暂停 BGM
      if (this.currentBgm) {
        this.currentBgm.volume(0)
      }
    } else {
      // 取消静音时恢复 BGM 音量
      if (this.currentBgm) {
        this.currentBgm.volume(this.getEffectiveBgmVolume())
      }
    }

    eventBus.emit('audio:mute_change', { muted })
  }

  /**
   * 获取静音状态
   */
  isMuted(): boolean {
    return this.muted
  }

  // ===========================================
  // 内部方法
  // ===========================================

  private getEffectiveSfxVolume(): number {
    return this.volumes.master * this.volumes.sfx
  }

  private getEffectiveBgmVolume(): number {
    return this.volumes.master * this.volumes.bgm
  }

  private updateAllVolumes(): void {
    this.updateSfxVolumes()
    this.updateBgmVolume()
  }

  private updateSfxVolumes(): void {
    const volume = this.getEffectiveSfxVolume()

    if (this.keySoundPool) {
      this.keySoundPool.setVolume(volume)
    }
    if (this.errorSoundPool) {
      this.errorSoundPool.setVolume(volume)
    }

    this.sfxSounds.forEach(sound => {
      sound.volume(volume)
    })

    this.skillSounds.forEach(sound => {
      sound.volume(volume)
    })
  }

  private updateBgmVolume(): void {
    if (this.currentBgm && !this.muted) {
      this.currentBgm.volume(this.getEffectiveBgmVolume())
    }
  }

  // ===========================================
  // 清理
  // ===========================================

  /**
   * 释放所有资源
   */
  dispose(): void {
    // 停止 BGM
    this.stopBgm(0)

    // 清理音效池
    this.keySoundPool?.dispose()
    this.errorSoundPool?.dispose()

    // 卸载所有音效
    this.sfxSounds.forEach(sound => sound.unload())
    this.sfxSounds.clear()

    this.skillSounds.forEach(sound => sound.unload())
    this.skillSounds.clear()

    this.bgmCache.forEach(sound => sound.unload())
    this.bgmCache.clear()

    this.initialized = false
  }
}
