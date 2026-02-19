// ============================================
// 打字肉鸽 - 粒子效果预设配置
// ============================================
// Story 7.3: 粒子效果系统 (AC: #1, #3, #4)

/**
 * 粒子预设类型
 */
export type ParticlePresetType =
  | 'skill_trigger'    // 技能触发
  | 'combo_flame'      // 连击火焰
  | 'combo_milestone'  // 连击里程碑
  | 'word_complete'    // 词语完成

/**
 * 粒子配置
 */
export interface ParticlePresetConfig {
  /** 粒子数量 */
  count: number
  /** 生命周期（毫秒） */
  lifetime: { min: number; max: number }
  /** 速度范围 */
  speed: { min: number; max: number }
  /** 起始缩放 */
  scaleStart: number
  /** 结束缩放 */
  scaleEnd: number
  /** 起始透明度 */
  alphaStart: number
  /** 结束透明度 */
  alphaEnd: number
  /** 颜色列表（随机选择） */
  colors: number[]
  /** 重力影响（正数向下，负数向上） */
  gravity: number
  /** 发射角度范围（弧度，0=右，PI/2=下） */
  angleRange: { min: number; max: number }
  /** 是否持续发射（用于火焰效果） */
  continuous: boolean
  /** 持续发射频率（毫秒） */
  emitInterval?: number
}

/**
 * 粒子预设配置
 */
export const PARTICLE_PRESETS: Record<ParticlePresetType, ParticlePresetConfig> = {
  // 技能触发 - 向四周扩散的彩色粒子
  skill_trigger: {
    count: 15,
    lifetime: { min: 300, max: 500 },
    speed: { min: 100, max: 200 },
    scaleStart: 0.5,
    scaleEnd: 0.1,
    alphaStart: 1.0,
    alphaEnd: 0,
    colors: [0x9b59b6, 0xe74c3c, 0x3498db, 0x2ecc71], // 紫、红、蓝、绿
    gravity: 50,
    angleRange: { min: 0, max: Math.PI * 2 }, // 360度
    continuous: false
  },

  // 连击火焰 - 向上飘散的橙红色火焰
  combo_flame: {
    count: 3,
    lifetime: { min: 400, max: 700 },
    speed: { min: 60, max: 120 },
    scaleStart: 0.4,
    scaleEnd: 0.1,
    alphaStart: 0.8,
    alphaEnd: 0,
    colors: [0xff6b6b, 0xffe66d, 0xff9f43], // 玫红、金黄、橙
    gravity: -80, // 向上
    angleRange: { min: -Math.PI * 0.75, max: -Math.PI * 0.25 }, // 向上扇形
    continuous: true,
    emitInterval: 30
  },

  // 连击里程碑 - 庆祝爆炸效果
  combo_milestone: {
    count: 40,
    lifetime: { min: 500, max: 1000 },
    speed: { min: 150, max: 300 },
    scaleStart: 0.4,
    scaleEnd: 0.1,
    alphaStart: 1.0,
    alphaEnd: 0,
    colors: [0xffe66d, 0x9b59b6, 0x4ecdc4, 0xff6b6b], // 金、紫、青、粉
    gravity: 100,
    angleRange: { min: 0, max: Math.PI * 2 },
    continuous: false
  },

  // 词语完成 - 青绿色粒子
  word_complete: {
    count: 12,
    lifetime: { min: 300, max: 500 },
    speed: { min: 80, max: 150 },
    scaleStart: 0.3,
    scaleEnd: 0.05,
    alphaStart: 1.0,
    alphaEnd: 0,
    colors: [0x4ecdc4, 0xffe66d], // 青绿、金黄
    gravity: -30, // 轻微向上
    angleRange: { min: -Math.PI * 0.8, max: -Math.PI * 0.2 },
    continuous: false
  }
}

/**
 * 根据里程碑数值调整粒子数量
 */
export function getMilestoneParticleCount(milestone: number): number {
  if (milestone >= 100) return 60
  if (milestone >= 50) return 50
  if (milestone >= 25) return 40
  return 30
}

/**
 * 根据连击数调整火焰强度
 */
export function getFlameIntensity(combo: number): number {
  // 10 combo = 1.0, 每增加 10 combo 增加 0.2，最高 2.0
  return Math.min(2.0, 1.0 + (combo - 10) / 50)
}
