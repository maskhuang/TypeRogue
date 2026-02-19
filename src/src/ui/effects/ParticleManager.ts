// ============================================
// 打字肉鸽 - ParticleManager 粒子效果管理器
// ============================================
// Story 7.3: 粒子效果系统 (AC: #1, #3, #4, #5, #6)

import * as PIXI from 'pixi.js'
import {
  PARTICLE_PRESETS,
  type ParticlePresetType,
  type ParticlePresetConfig,
  getMilestoneParticleCount,
  getFlameIntensity
} from './ParticlePresets'

/**
 * 单个粒子实例
 */
interface Particle {
  /** 粒子图形对象 */
  graphics: PIXI.Graphics
  /** X 位置 */
  x: number
  /** Y 位置 */
  y: number
  /** X 速度 */
  vx: number
  /** Y 速度 */
  vy: number
  /** 已存活时间（毫秒） */
  elapsed: number
  /** 总生命周期（毫秒） */
  lifetime: number
  /** 起始缩放 */
  scaleStart: number
  /** 结束缩放 */
  scaleEnd: number
  /** 起始透明度 */
  alphaStart: number
  /** 结束透明度 */
  alphaEnd: number
  /** 重力 */
  gravity: number
}

/**
 * 持续发射器
 */
interface ContinuousEmitter {
  /** 预设类型 */
  preset: ParticlePresetType
  /** X 位置 */
  x: number
  /** Y 位置 */
  y: number
  /** 上次发射时间 */
  lastEmitTime: number
  /** 强度倍数 */
  intensity: number
  /** 是否激活 */
  active: boolean
}

/**
 * ParticleManager - 粒子效果管理器
 *
 * 基于 PixiJS v8 的自定义粒子系统，提供高性能的粒子效果。
 *
 * 职责:
 * - 管理粒子的创建、更新和销毁 (AC: #1)
 * - 提供技能触发、连击火焰、里程碑庆祝等预设效果 (AC: #3, #4)
 * - 维持 60fps 性能（单帧更新 < 2ms）(AC: #5)
 * - 支持禁用粒子效果 (AC: #6)
 */
export class ParticleManager {
  private container: PIXI.Container
  private particles: Particle[] = []
  private enabled = true
  private particlePool: PIXI.Graphics[] = []
  private continuousEmitters: Map<string, ContinuousEmitter> = new Map()
  private currentTime = 0

  constructor(parentContainer: PIXI.Container) {
    this.container = new PIXI.Container()
    this.container.label = 'particles'
    parentContainer.addChild(this.container)
  }

  /**
   * 在指定位置播放预设粒子效果
   */
  play(preset: ParticlePresetType, x: number, y: number): void {
    if (!this.enabled) return

    const config = PARTICLE_PRESETS[preset]
    this.emitParticles(config, x, y, config.count)
  }

  /**
   * 播放技能触发粒子
   */
  playSkillTrigger(skillId: string, x: number, y: number): void {
    if (!this.enabled) return

    // 可以根据 skillId 定制颜色，目前使用默认预设
    this.play('skill_trigger', x, y)
  }

  /**
   * 播放连击火焰效果
   */
  playComboFlame(combo: number, x: number, y: number): void {
    if (!this.enabled) return

    const intensity = getFlameIntensity(combo)
    const emitterId = 'combo_flame'

    if (this.continuousEmitters.has(emitterId)) {
      // 更新现有发射器
      const emitter = this.continuousEmitters.get(emitterId)!
      emitter.x = x
      emitter.y = y
      emitter.intensity = intensity
      emitter.active = true
    } else {
      // 创建新发射器
      this.continuousEmitters.set(emitterId, {
        preset: 'combo_flame',
        x,
        y,
        lastEmitTime: this.currentTime,
        intensity,
        active: true
      })
    }
  }

  /**
   * 停止连击火焰效果
   */
  stopComboFlame(): void {
    const emitter = this.continuousEmitters.get('combo_flame')
    if (emitter) {
      emitter.active = false
    }
  }

  /**
   * 播放连击里程碑庆祝效果
   */
  playComboMilestone(milestone: number, x: number, y: number): void {
    if (!this.enabled) return

    const config = PARTICLE_PRESETS.combo_milestone
    const count = getMilestoneParticleCount(milestone)
    this.emitParticles(config, x, y, count)
  }

  /**
   * 更新所有活动粒子（每帧调用）
   * @param deltaTime 帧时间（毫秒）
   */
  update(deltaTime: number): void {
    if (!this.enabled) return

    this.currentTime += deltaTime
    const dtSeconds = deltaTime / 1000

    // 处理持续发射器
    this.updateContinuousEmitters()

    // 更新所有粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i]
      particle.elapsed += deltaTime

      const progress = Math.min(particle.elapsed / particle.lifetime, 1)

      // 更新位置
      particle.vy += particle.gravity * dtSeconds
      particle.x += particle.vx * dtSeconds
      particle.y += particle.vy * dtSeconds

      // 更新缩放
      const scale = particle.scaleStart + (particle.scaleEnd - particle.scaleStart) * progress
      particle.graphics.scale.set(scale)

      // 更新透明度
      const alpha = particle.alphaStart + (particle.alphaEnd - particle.alphaStart) * progress
      particle.graphics.alpha = alpha

      // 更新图形位置
      particle.graphics.position.set(particle.x, particle.y)

      // 移除已完成的粒子
      if (progress >= 1) {
        this.releaseParticle(particle)
        this.particles.splice(i, 1)
      }
    }
  }

  /**
   * 更新持续发射器
   */
  private updateContinuousEmitters(): void {
    for (const [_, emitter] of this.continuousEmitters) {
      if (!emitter.active) continue

      const config = PARTICLE_PRESETS[emitter.preset]
      const interval = config.emitInterval || 50

      if (this.currentTime - emitter.lastEmitTime >= interval) {
        const count = Math.ceil(config.count * emitter.intensity)
        this.emitParticles(config, emitter.x, emitter.y, count)
        emitter.lastEmitTime = this.currentTime
      }
    }
  }

  /**
   * 发射粒子
   */
  private emitParticles(
    config: ParticlePresetConfig,
    x: number,
    y: number,
    count: number
  ): void {
    for (let i = 0; i < count; i++) {
      const particle = this.createParticle(config, x, y)
      this.particles.push(particle)
    }
  }

  /**
   * 创建单个粒子
   */
  private createParticle(
    config: ParticlePresetConfig,
    x: number,
    y: number
  ): Particle {
    // 从对象池获取或创建新图形
    const graphics = this.particlePool.pop() || this.createParticleGraphics()

    // 随机选择颜色
    const color = config.colors[Math.floor(Math.random() * config.colors.length)]
    graphics.clear()
    graphics.circle(0, 0, 6)
    graphics.fill({ color })

    // 随机生命周期
    const lifetime = config.lifetime.min +
      Math.random() * (config.lifetime.max - config.lifetime.min)

    // 随机速度和角度
    const speed = config.speed.min +
      Math.random() * (config.speed.max - config.speed.min)
    const angle = config.angleRange.min +
      Math.random() * (config.angleRange.max - config.angleRange.min)

    const vx = Math.cos(angle) * speed
    const vy = Math.sin(angle) * speed

    graphics.position.set(x, y)
    graphics.scale.set(config.scaleStart)
    graphics.alpha = config.alphaStart
    this.container.addChild(graphics)

    return {
      graphics,
      x,
      y,
      vx,
      vy,
      elapsed: 0,
      lifetime,
      scaleStart: config.scaleStart,
      scaleEnd: config.scaleEnd,
      alphaStart: config.alphaStart,
      alphaEnd: config.alphaEnd,
      gravity: config.gravity
    }
  }

  /**
   * 创建粒子图形对象
   */
  private createParticleGraphics(): PIXI.Graphics {
    const g = new PIXI.Graphics()
    return g
  }

  /**
   * 释放粒子到对象池
   */
  private releaseParticle(particle: Particle): void {
    this.container.removeChild(particle.graphics)
    // 限制对象池大小
    if (this.particlePool.length < 100) {
      this.particlePool.push(particle.graphics)
    } else {
      particle.graphics.destroy()
    }
  }

  /**
   * 启用/禁用粒子效果
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled) {
      this.clear()
    }
  }

  /**
   * 检查是否启用
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * 获取活动粒子数量
   */
  getActiveParticleCount(): number {
    return this.particles.length
  }

  /**
   * 清理所有粒子
   */
  clear(): void {
    // 清理所有粒子
    for (const particle of this.particles) {
      this.container.removeChild(particle.graphics)
      particle.graphics.destroy()
    }
    this.particles = []

    // 停止所有持续发射器
    for (const [_, emitter] of this.continuousEmitters) {
      emitter.active = false
    }
    this.continuousEmitters.clear()
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.clear()

    // 清理对象池
    for (const g of this.particlePool) {
      g.destroy()
    }
    this.particlePool = []

    this.container.destroy()
  }
}
