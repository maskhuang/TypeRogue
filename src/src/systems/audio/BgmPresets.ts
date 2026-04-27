// ============================================
// 打字肉鸽 - BGM 调式预设
// ============================================
//
// 每套预设是 (root, scale, progression, voicing, bpmTiers) 的组合，决定 BGM 的"调"+"嗓子"+"快慢"。
// 全部预设都保持暗色（minor/modal 系），符合 SCP × 40K 的游戏基调。
//
// scale 长度必须是 7（七声音阶 / 调式），progression 是 scale 的度数索引数组。
// chord = noteAt(deg) + noteAt(deg+2) + noteAt(deg+4) — 同一套 noteAt 逻辑能覆盖所有七声调式。
//
// voicing 把 pad/bass/lead/drums 的合成器参数从 BgmController 搬到 preset，
// 让每套预设有独立的"嗓子"——pad osc 类型、bass 滤波、lead 包络、噪声色彩各不相同。
// preset 切换时 BgmController 在 bar 起点重建合成器（FX 总线持久不变）。
//
// bpmTiers 是 4 档 BPM 阶梯。CPS 阈值（升降档点）保持全局——那是玩家速度阈值，
// 不是音乐速度，所以不放进 preset。preset 只决定每档具体 BPM 值。

export interface PadVoicing {
  oscillator: {
    type: string                  // 'sawtooth' | 'pulse' | 'pwm' | 'fatsawtooth' | 'fatsquare' | ...
    spread?: number               // fat* 的 detune cents
    count?: number                // fat* 的 voice 数
    modulationFrequency?: number  // pwm 的 LFO 频率
  }
  envelope: { attack: number; decay: number; sustain: number; release: number }
  detune?: number                 // 整体 detune cents
  volume?: number
}

export interface BassVoicing {
  oscillator: { type: string }
  envelope: { attack: number; decay: number; sustain: number; release: number }
  filter: { Q: number; frequency: number }
  volume?: number
}

export interface LeadVoicing {
  oscillator: { type: string }
  envelope: { attack: number; decay: number; sustain: number; release: number }
  volume?: number
}

export interface DrumVoicing {
  snareNoise: 'white' | 'pink' | 'brown'
  hatNoise: 'white' | 'pink' | 'brown'
  /** Optional MembraneSynth options for kick (pitchDecay / octaves)。心跳类 preset 用更深更长的 thump。 */
  kick?: { pitchDecay?: number; octaves?: number }
}

export interface BgmVoicing {
  pad: PadVoicing
  bass: BassVoicing
  lead: LeadVoicing
  drums: DrumVoicing
}

// === Drum pattern (policy-as-data) ===
// pattern 函数每个 8n tick 调一次，返回该 tick 是否触发 kick/snare/hat。
// BgmController 负责把 DrumStep 翻译成 Tone.js 的 triggerAttackRelease 调用。

export interface DrumPatternContext {
  /** 2 小节循环内位置（0..15，每步是一个 8n） */
  cyclePos: number
  /** 当前小节内位置（0..7，4/4 拍 8 个 8n） */
  barPos: number
  /** 2 小节循环内的小节序号（0=第一小节，1=第二小节） */
  bar: 0 | 1
  /** 当前 tension 0..1（用于密度调节 / fill 决策） */
  tension: number
}

export interface DrumStep {
  kick?: boolean
  snare?: boolean
  hat?: boolean
  /** Hat velocity 0..1（默认 1）。用于 ghost hat / 强弱交替 */
  hatVel?: number
}

export type DrumPattern = (ctx: DrumPatternContext) => DrumStep

// 半速 doom dirge —— kick 1 / snare 3 / hat 四分音符
// 高 tension 时弱拍偶发 ghost hat 填空隙；下沉式黑暗的"半速感"基线。
const PATTERN_HALFTIME_DOOM: DrumPattern = ({ barPos, tension }) => {
  const onQuarter = barPos % 2 === 0
  const offbeat = !onQuarter
  const ghostHat = tension > 0.85 && offbeat && Math.random() < 0.35
  return {
    kick: barPos === 0,
    snare: barPos === 4,
    hat: onQuarter || ghostHat,
    hatVel: ghostHat ? 0.4 : 1,
  }
}

// 4-on-the-floor 钢铁行进 —— kick 每 quarter / snare 反拍 / hat 8n 永远
// 密集 drive 但不混乱，钢铁圣环的"踩着拍子前进"。
const PATTERN_MARCH: DrumPattern = ({ barPos }) => {
  return {
    kick: barPos % 2 === 0,
    snare: barPos === 2 || barPos === 6,
    hat: true,
  }
}

// 瘸腿 syncopation —— kick 1 + "and of 2" / snare 仅 beat 4 / hat 仅反拍 8n
// 缺了 beat 2 的 snare 让重心错位，Phrygian 出走的"什么时候踏空"感。
const PATTERN_LIMP: DrumPattern = ({ barPos }) => {
  return {
    kick: barPos === 0 || barPos === 3,
    snare: barPos === 6,
    hat: barPos % 2 === 1, // offbeat 8n only
  }
}

// 圣咏稀疏 ritual —— kick 仅 beat 1+3 缓慢 tolling / 无 hat
// 留出最大空间给 pad 长 attack 呼吸；高 tension 时第二小节 beat 3 才有 snare 点缀。
const PATTERN_CHANT: DrumPattern = ({ barPos, bar, tension }) => {
  return {
    kick: barPos === 0 || barPos === 4,
    snare: bar === 1 && barPos === 4 && tension > 0.6,
    hat: false,
  }
}

// 引擎心跳 —— 仅 kick / 无 snare 无 hat
// 低 tension 每 quarter 一下（4 拍/bar = 心率 = BPM）；高 tension > 0.55 时弱拍补 echo（变 8 拍/bar，心率翻倍）。
// 配合 bpmTiers [60..140]，BPM 直接 = 心率 bpm，从静息脉搏 → 惊慌；boss 层"神圣寂静 + 60Hz 心跳渐强"。
const PATTERN_HEARTBEAT: DrumPattern = ({ barPos, tension }) => {
  const onQuarter = barPos % 2 === 0
  const echo = tension > 0.55 && !onQuarter
  return { kick: onQuarter || echo, snare: false, hat: false }
}

export interface BgmPreset {
  id: string
  name: string                                          // 内部展示名（暂不出现在 UI）
  rootMidi: number                                      // 主音 MIDI（A3=57, D3=50, E3=52, F#3=54）
  scale: readonly number[]                              // 7 个 pitch class，相对 root 的半音偏移
  progression: readonly number[]                        // 进行中的度数索引（每个值是 scale 的下标）
  voicing: BgmVoicing                                   // 音色身份（pad/bass/lead/drums 合成器参数）
  bpmTiers: readonly [number, number, number, number]   // 4 档 BPM 阶梯（最低 / 中低 / 中高 / 最高）
  drumPattern: DrumPattern                              // 律动身份（每 8n 决定 kick/snare/hat）
  /** 关闭 lead 触发（用于 boss 层"silence is sacred"——合成器仍构建，仅跳过 trigger） */
  leadDisabled?: boolean
  /** 关闭 bass 触发（用于纯心跳/纯 drone 极简 preset） */
  bassDisabled?: boolean
  description?: string
}

// === 预设定义 ===
// 命名取自游戏叙事（Ironpress Cathedral 主题）

export const BGM_PRESETS: Record<string, BgmPreset> = {
  // 默认：A 自然小调，i-VI-III-VII —— 下沉式黑暗（活字大教堂主题）
  // 音色：sawtooth pad + triangle bass + square lead，基线"暗色摇滚"质地
  // 层 1-5 铸字坊（工业铸字 / 抄写室）—— 工业基底
  // 当前音色（sawtooth pad）和叙事"铅炉橙光 + 蒸汽锤"还有差距，待 P3 重做为铅炉嗡鸣 + 铸铁锤
  forge_drone: {
    id: 'forge_drone',
    name: 'Forge Drone',
    rootMidi: 57,
    scale: [0, 2, 3, 5, 7, 8, 10],
    progression: [0, 5, 2, 6],
    description: '层 1-5 铸字坊 — A 自然小调，half-time doom；叙事 1-5 工业基底（音色待按"铅炉嗡鸣"重做）',
    voicing: {
      pad: {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 1.2, decay: 0.4, sustain: 0.8, release: 2.5 },
        volume: -18,
      },
      bass: {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.4 },
        filter: { Q: 2, frequency: 600 },
        volume: -10,
      },
      lead: {
        oscillator: { type: 'square' },
        envelope: { attack: 0.005, decay: 0.15, sustain: 0.1, release: 0.3 },
        volume: -16,
      },
      drums: { snareNoise: 'white', hatNoise: 'white' },
    },
    bpmTiers: [80, 100, 120, 140],
    drumPattern: PATTERN_HALFTIME_DOOM,
  },

  // 层 6-8 机械区（驱动机构 / 收容廊外）—— 仪式 + 机械
  // 当前 PATTERN_MARCH 是 4-on-floor 军队行进，叙事铭刻派是"麻木的仪式执行"，pattern 待按"仪式钟摆"重做
  liturgy_pulse: {
    id: 'liturgy_pulse',
    name: 'Liturgy Pulse',
    rootMidi: 50,
    scale: [0, 2, 3, 5, 7, 9, 10],
    progression: [0, 3, 6, 4],
    description: '层 6-8 机械区 — D Dorian，fatsaw 厚重；叙事铭刻派"麻木仪式"（pattern 待按"仪式钟摆"重做）',
    voicing: {
      pad: {
        oscillator: { type: 'fatsawtooth', spread: 30, count: 3 },
        envelope: { attack: 0.6, decay: 0.4, sustain: 0.7, release: 1.8 },
        volume: -19,
      },
      bass: {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.005, decay: 0.2, sustain: 0.3, release: 0.3 },
        filter: { Q: 4, frequency: 900 },
        volume: -10,
      },
      lead: {
        oscillator: { type: 'square' },
        envelope: { attack: 0.003, decay: 0.18, sustain: 0.15, release: 0.25 },
        volume: -15,
      },
      drums: { snareNoise: 'white', hatNoise: 'white' },
    },
    bpmTiers: [90, 110, 130, 150],
    drumPattern: PATTERN_MARCH,
  },

  // 层 9-11 机械深处（脉动 / 接近心脏）—— 异文挣扎
  // pwm wobble + limp syncopation 已较好对位"金属呼吸 + 不规则脉动"，叙事熔变派"漩涡的恐怖"
  engine_throes: {
    id: 'engine_throes',
    name: 'Engine Throes',
    rootMidi: 52,
    scale: [0, 1, 3, 5, 7, 8, 10],
    progression: [0, 1, 0, 6],
    description: '层 9-11 机械深处 — E Phrygian，pwm wobble + limp syncopation；引擎"试图逃逸自身形态"',
    voicing: {
      pad: {
        oscillator: { type: 'pwm', modulationFrequency: 0.4 },
        envelope: { attack: 0.8, decay: 0.5, sustain: 0.6, release: 2.0 },
        volume: -19,
      },
      bass: {
        oscillator: { type: 'pulse' },
        envelope: { attack: 0.005, decay: 0.25, sustain: 0.2, release: 0.3 },
        filter: { Q: 3, frequency: 700 },
        volume: -10,
      },
      lead: {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.003, decay: 0.12, sustain: 0.05, release: 0.2 },
        volume: -15,
      },
      drums: { snareNoise: 'pink', hatNoise: 'white' },
    },
    bpmTiers: [95, 115, 135, 158],
    drumPattern: PATTERN_LIMP,
  },

  // Ritual 仪式覆盖（层 6 收容廊 / 解锁仪式）—— 抄写室圣咏
  // pulse 管风琴 + 长 attack + 稀疏 PATTERN_CHANT 直接对位"教会声音 / 油灯琥珀光 / 安静仪式"
  scriptorium_chant: {
    id: 'scriptorium_chant',
    name: 'Scriptorium Chant',
    rootMidi: 54,
    scale: [0, 2, 3, 5, 7, 8, 10],
    progression: [0, 4, 5, 0],
    description: 'Ritual 仪式覆盖 — F# 自然小调，pulse 管风琴 + 稀疏 chant；抄写室油灯下的圣咏',
    voicing: {
      pad: {
        oscillator: { type: 'pulse' },
        envelope: { attack: 1.6, decay: 0.5, sustain: 0.85, release: 3.2 },
        volume: -17,
      },
      bass: {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.05, decay: 0.4, sustain: 0.4, release: 0.6 },
        filter: { Q: 1, frequency: 400 },
        volume: -8,
      },
      lead: {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.02, decay: 0.2, sustain: 0.2, release: 0.5 },
        volume: -16,
      },
      drums: { snareNoise: 'pink', hatNoise: 'pink' },
    },
    bpmTiers: [60, 75, 90, 108],
    drumPattern: PATTERN_CHANT,
  },

  // 层 12 引擎核心（boss 战）—— 神圣寂静 + 60Hz 心跳渐强
  // A Phrygian 给"压迫感"（bII 邻根半音）；progression [0,0,1,0] 几乎不动 = drone 静默
  // 纯心跳节奏（仅 kick），bass/lead 全关 = "silence is sacred"；BPM = 心率
  // 直接对位 narrative-design.md:1716 "脉动套 9-12 / 不规则脉动 / 金属呼吸 / 引擎 60Hz 心跳渐强"
  engine_heartbeat: {
    id: 'engine_heartbeat',
    name: 'Engine Heartbeat',
    rootMidi: 57,
    scale: [0, 1, 3, 5, 7, 8, 10], // A Phrygian
    progression: [0, 0, 1, 0],      // 主和弦 drone，仅一次 bII 闪现
    description: '层 12 引擎核心 / Boss — A Phrygian，纯心跳（lead/bass 全关）；BPM 60→140 = 心率',
    voicing: {
      pad: {
        // fatsine spread 12 = 几乎是 sine 但有微小 detune"巨大感"；4s attack 让 chord 像呼吸
        oscillator: { type: 'fatsine', spread: 12, count: 3 },
        envelope: { attack: 4, decay: 1, sustain: 0.6, release: 4 },
        volume: -24, // 极弱，"神圣寂静"——pad 是背景气流不是旋律
      },
      bass: {
        // 关闭，但保留 voicing 以备未来 toggle
        oscillator: { type: 'sine' },
        envelope: { attack: 0.05, decay: 0.4, sustain: 0.4, release: 0.6 },
        filter: { Q: 0.5, frequency: 250 },
        volume: -14,
      },
      lead: {
        // 关闭，留极弱设置以备
        oscillator: { type: 'sine' },
        envelope: { attack: 0.05, decay: 0.2, sustain: 0.2, release: 0.4 },
        volume: -30,
      },
      drums: {
        snareNoise: 'white',
        hatNoise: 'white',
        // 心跳 kick：更长 pitchDecay = 更"扑通"的厚 thump；低 octaves = 减少高频"咔"声
        kick: { pitchDecay: 0.08, octaves: 6 },
      },
    },
    bpmTiers: [60, 80, 110, 140], // BPM 直接 = 心率：静息 60 → 警觉 80 → 焦虑 110 → 惊慌 140
    drumPattern: PATTERN_HEARTBEAT,
    leadDisabled: true,
    bassDisabled: true,
  },
}

export const DEFAULT_PRESET_ID = 'forge_drone'

const PRESET_IDS = Object.keys(BGM_PRESETS)

/**
 * 随机挑一个预设。可传 excludeId 避免连续两次同一首。
 */
export function pickRandomPreset(excludeId?: string): BgmPreset {
  const pool = excludeId
    ? PRESET_IDS.filter((id) => id !== excludeId)
    : PRESET_IDS
  const id = pool[Math.floor(Math.random() * pool.length)]
  return BGM_PRESETS[id]
}

export function getPreset(id: string): BgmPreset {
  return BGM_PRESETS[id] ?? BGM_PRESETS[DEFAULT_PRESET_ID]
}
