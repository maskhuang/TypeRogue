// ============================================
// 打字肉鸽 - 生成式底乐 (B 方案)
// ============================================
// 无限猴子 / 打字机 → 程序化背景乐，不依赖任何音频素材。
//
// 双轴模型：
//   · coherence (0..1) — 慢轴，每关驱动。1 = 落在打字根音上的协和开放 pad；
//     0 = 失谐 + 带通噪声吞没（寂静化 / 受理=抹除作者性）。
//   · tension   (0..4) — 快轴，单场时间压力驱动 LPF 亮度 + 总音量。
//
// 反重复演化（防 loop 感）：
//   · 换声部 — 浮动声部在开放和弦音之间缓慢滑行换音；
//   · 密度漂移 — 各声部增益缓变、偶发 dropout，织体疏密变化；
//   · 稀疏 chime — 远处打字机式叮声，按和弦音随机点缀。
//
// 设计语汇沿用 effects/sound.ts：纯律比率池当调色板（防"算法味"）。
// 引擎对 AudioContext 做依赖注入，可单测。

import { getStageType } from '../systems/stage/stageFlow'

// 开放 voicing（仿 sound.ts OPEN_INTERVALS / ENDING_INTERVALS）：
// 低八度垫底 + 根 + 纯五度 + 八度 + 大九度 = 开放、未解决的和声
const VOICING = [0.5, 1, 3 / 2, 2, 9 / 4] as const
const VOICE_GAINS = [0.10, 0.085, 0.06, 0.05, 0.038] as const
const ANCHOR_COUNT = 2             // 前 2 个声部（低八度+根音）固定，作锚
const BED_ROOT_HZ = 131            // 低音区底乐根音（≈ C3）
export const MAX_DETUNE_CENTS = 240 // coherence=0 时的最大随机失谐展宽（打字乐器层共用）
const CHORUS_CENTS = 7             // 成对振荡器的静态合唱失谐
const NOISE_MIX = 0.32             // 噪声端相对 pad 的音量上限

// 浮动声部的可选音程池（开放/协和；换声部时从中取）
const CHORD_POOL = [3 / 2, 5 / 3, 2, 9 / 4, 5 / 2, 3] as const
const GLIDE_TC = 2.5               // 换音滑行时间常数（秒）
const DROPOUT_CHANCE = 0.30        // 换声部时某声部静默的概率（声部进出更明显）

// 根音转调：相对 base 的音级（不累积漂移，始终绕 base 重取）
const ROOT_DEGREES = [2 / 3, 3 / 4, 1, 9 / 8, 4 / 3, 3 / 2] as const

// 稀疏非音高质感事件（远处办公/机械；Papers-Please 式临场杂音，不引入旋律）
const TEXTURE_KINDS = ['thunk', 'click', 'rustle'] as const

// 缓慢旋律线（自然小调纯律；克制、中低音区、暖音色、稍凄凉，不抢前景）
// export：打字乐器层（A 轴）共用同一音阶/八度，保证击键音与底乐永远同调
export const MELODY_SCALE = [1, 9 / 8, 6 / 5, 4 / 3, 3 / 2, 8 / 5, 9 / 5, 2] as const
export const MELODY_OCTAVE = 2    // 根音上方一个八度
const MELODY_VOL = 0.055
const MELODY_NOTE_LEN = 0.9       // 单音时值（秒）
const MELODY_REST_CHANCE = 0.25   // 乐句留白概率
const MELODY_LPF_HZ = 1600        // 去亮、保持暖

// 默认演化周期（ms）；构造可覆盖，0 = 关闭该层自动演化（单测用）
const DEFAULT_RESEED_MS = 2800
const DEFAULT_REVOICE_MS = 8000
const DEFAULT_TEXTURE_MS = 8000     // 稀疏质感事件周期
const DEFAULT_MODULATE_MS = 26000   // 根音转调周期
const DEFAULT_MELODY_MS = 2600      // 旋律单音节奏周期

// tension 0..4 → LPF 截止 + 总音量（仿 sound.ts TENSION_TABLE）
const TENSION_TABLE = [
  { lpf: 700, vol: 0.13 },
  { lpf: 800, vol: 0.15 },
  { lpf: 2000, vol: 0.19 },
  { lpf: 4000, vol: 0.24 },
  { lpf: 6000, vol: 0.30 },
] as const

// === 每关 coherence 曲线（慢轴）===
export const COH_START = 1.0
export const COH_FLOOR = 0.05
export const COH_PER_STAGE_DECAY = 0.025

/** 由关号计算 coherence：逐关沉降，ritual 关回暖、boss 关探底 */
export function computeCoherence(level: number): number {
  let c = COH_START - (level - 1) * COH_PER_STAGE_DECAY
  const type = getStageType(level)
  if (type === 'ritual') c += 0.12
  if (type === 'boss') c -= 0.10
  return Math.max(COH_FLOOR, Math.min(1, c))
}

/** tension 0..4 连续插值出 { lpf, vol } */
export function interpolateTension(level: number): { lpf: number; vol: number } {
  const lv = Math.max(0, Math.min(4, level))
  const lo = Math.floor(lv)
  const hi = Math.min(4, lo + 1)
  const f = lv - lo
  return {
    lpf: TENSION_TABLE[lo].lpf + (TENSION_TABLE[hi].lpf - TENSION_TABLE[lo].lpf) * f,
    vol: TENSION_TABLE[lo].vol + (TENSION_TABLE[hi].vol - TENSION_TABLE[lo].vol) * f,
  }
}

interface Voice {
  oscA: OscillatorNode
  oscB: OscillatorNode
  gain: GainNode
  lfo: OscillatorNode
  lfoGain: GainNode
  ratio: number
  baseGain: number
  floating: boolean
}

export interface GenerativeBedOptions {
  /** 失谐重随机周期（ms）。0 = 关闭 */
  reseedIntervalMs?: number
  /** 换声部周期（ms）。0 = 关闭 */
  revoiceIntervalMs?: number
  /** 稀疏质感事件周期（ms）。0 = 关闭 */
  textureIntervalMs?: number
  /** 根音转调周期（ms）。0 = 关闭 */
  modulateIntervalMs?: number
  /** 旋律单音节奏周期（ms）。0 = 关闭 */
  melodyIntervalMs?: number
  /** 底乐根音 Hz（转调的 base 中心） */
  rootHz?: number
}

/**
 * 生成式底乐引擎。对 AudioContext + 输出连接器做依赖注入。
 */
export class GenerativeBed {
  private ctx: AudioContext
  private connectOutput: (node: AudioNode) => void
  private baseRootHz: number       // 转调中心
  private rootHz: number           // 当前根音（转调后）
  private reseedIntervalMs: number
  private revoiceIntervalMs: number
  private textureIntervalMs: number
  private modulateIntervalMs: number
  private melodyIntervalMs: number

  private output: GainNode | null = null
  private bedMaster: GainNode | null = null   // tension 音量
  private bedLPF: BiquadFilterNode | null = null // tension 亮度
  private padBus: GainNode | null = null       // coherence pad 端
  private noiseGain: GainNode | null = null    // coherence noise 端
  private noiseBuffer: AudioBuffer | null = null // 复用噪声缓冲（质感事件用）
  private melodyOsc: OscillatorNode | null = null  // 持续旋律振荡器（gain 门控出单音）
  private melodyGain: GainNode | null = null
  private melodyIndex = 0                        // 当前音阶级
  private voices: Voice[] = []
  private sources: AudioScheduledSourceNode[] = []
  private detuneSeed: number[] = VOICING.map(() => 0)
  private reseedTimer: ReturnType<typeof setInterval> | null = null
  private revoiceTimer: ReturnType<typeof setTimeout> | null = null
  private textureTimer: ReturnType<typeof setTimeout> | null = null
  private modulateTimer: ReturnType<typeof setTimeout> | null = null
  private melodyTimer: ReturnType<typeof setTimeout> | null = null

  private coherence = 1
  private tension = 1
  private level = 1            // 总输出电平倍率（商店 duck 用，独立于 tension/coherence）
  private active = false

  constructor(
    ctx: AudioContext,
    connectOutput: (node: AudioNode) => void,
    opts: GenerativeBedOptions = {},
  ) {
    this.ctx = ctx
    this.connectOutput = connectOutput
    this.baseRootHz = opts.rootHz ?? BED_ROOT_HZ
    this.rootHz = this.baseRootHz
    this.reseedIntervalMs = opts.reseedIntervalMs ?? DEFAULT_RESEED_MS
    this.revoiceIntervalMs = opts.revoiceIntervalMs ?? DEFAULT_REVOICE_MS
    this.textureIntervalMs = opts.textureIntervalMs ?? DEFAULT_TEXTURE_MS
    this.modulateIntervalMs = opts.modulateIntervalMs ?? DEFAULT_MODULATE_MS
    this.melodyIntervalMs = opts.melodyIntervalMs ?? DEFAULT_MELODY_MS
  }

  isActive(): boolean {
    return this.active
  }

  getCoherence(): number {
    return this.coherence
  }

  getTension(): number {
    return this.tension
  }

  /** 当前根音 Hz（转调后）— 打字乐器层用它锁定调性 */
  getRootHz(): number {
    return this.rootHz
  }

  getLevel(): number {
    return this.level
  }

  /** 设置总输出电平倍率（0..1）— 商店等场景 duck，独立于 tension/coherence */
  setLevel(mul: number): void {
    this.level = Math.max(0, Math.min(1, mul))
    if (this.active && this.output) {
      this.output.gain.setTargetAtTime(this.level, this.ctx.currentTime, 0.3)
    }
  }

  /** 启动底乐（幂等） */
  start(): void {
    if (this.active) return
    const ctx = this.ctx

    // 总线：padBus / noiseGain → bedMaster(tension vol) → bedLPF(tension lpf) → output(level)
    this.level = 1
    this.output = ctx.createGain()
    this.output.gain.value = 1.0
    this.connectOutput(this.output)

    this.bedLPF = ctx.createBiquadFilter()
    this.bedLPF.type = 'lowpass'
    this.bedLPF.connect(this.output)

    this.bedMaster = ctx.createGain()
    this.bedMaster.connect(this.bedLPF)

    this.padBus = ctx.createGain()
    this.padBus.connect(this.bedMaster)

    // pad voices
    this.voices = VOICING.map((ratio, i) => {
      const baseGain = VOICE_GAINS[i]
      const gain = ctx.createGain()
      gain.gain.value = baseGain
      gain.connect(this.padBus!)

      const oscA = ctx.createOscillator()
      oscA.type = 'sine'
      oscA.connect(gain)
      const oscB = ctx.createOscillator()
      oscB.type = 'triangle'
      oscB.connect(gain)

      // 慢呼吸 LFO（不同速率→有机），加在 voiceGain.gain 上
      const lfo = ctx.createOscillator()
      lfo.type = 'sine'
      lfo.frequency.value = 0.05 + i * 0.017
      const lfoGain = ctx.createGain()
      lfoGain.gain.value = baseGain * 0.35
      lfo.connect(lfoGain)
      lfoGain.connect(gain.gain)

      oscA.start()
      oscB.start()
      lfo.start()
      this.sources.push(oscA, oscB, lfo)
      return { oscA, oscB, gain, lfo, lfoGain, ratio, baseGain, floating: i >= ANCHOR_COUNT }
    })

    // noise bed
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const data = noiseBuf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    this.noiseBuffer = noiseBuf
    const noiseSrc = ctx.createBufferSource()
    noiseSrc.buffer = noiseBuf
    noiseSrc.loop = true
    const band = ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = 520
    band.Q.value = 0.8
    this.noiseGain = ctx.createGain()
    this.noiseGain.gain.value = 0
    noiseSrc.connect(band)
    band.connect(this.noiseGain)
    this.noiseGain.connect(this.bedMaster)

    // 带通中心慢扫（管道风声）
    const bandLFO = ctx.createOscillator()
    bandLFO.type = 'sine'
    bandLFO.frequency.value = 0.06
    const bandLFOGain = ctx.createGain()
    bandLFOGain.gain.value = 320
    bandLFO.connect(bandLFOGain)
    bandLFOGain.connect(band.frequency)
    noiseSrc.start()
    bandLFO.start()
    this.sources.push(noiseSrc, bandLFO)

    // 旋律线：持续振荡器（triangle→LPF→gain），gain 门控出单音
    const melodyOsc = ctx.createOscillator()
    melodyOsc.type = 'triangle'
    const melodyLPF = ctx.createBiquadFilter()
    melodyLPF.type = 'lowpass'
    melodyLPF.frequency.value = MELODY_LPF_HZ
    this.melodyGain = ctx.createGain()
    this.melodyGain.gain.value = 0
    melodyOsc.connect(melodyLPF)
    melodyLPF.connect(this.melodyGain)
    this.melodyGain.connect(this.bedMaster)
    melodyOsc.frequency.value = this.rootHz * MELODY_OCTAVE
    melodyOsc.start()
    this.melodyOsc = melodyOsc
    this.melodyIndex = 0
    this.sources.push(melodyOsc)

    this.active = true
    this.applyFreq()
    this.applyCoherence()
    this.applyTension()
    this.reseedDetune()

    if (this.reseedIntervalMs > 0) {
      this.reseedTimer = setInterval(() => this.reseedDetune(), this.reseedIntervalMs)
    }
    if (this.revoiceIntervalMs > 0) this.scheduleRevoice()
    if (this.textureIntervalMs > 0) this.scheduleTexture()
    if (this.modulateIntervalMs > 0) this.scheduleModulate()
    if (this.melodyIntervalMs > 0) this.scheduleMelody()
  }

  /** 停止并释放（幂等） */
  stop(): void {
    if (this.reseedTimer !== null) {
      clearInterval(this.reseedTimer)
      this.reseedTimer = null
    }
    if (this.revoiceTimer !== null) {
      clearTimeout(this.revoiceTimer)
      this.revoiceTimer = null
    }
    if (this.textureTimer !== null) {
      clearTimeout(this.textureTimer)
      this.textureTimer = null
    }
    if (this.modulateTimer !== null) {
      clearTimeout(this.modulateTimer)
      this.modulateTimer = null
    }
    if (this.melodyTimer !== null) {
      clearTimeout(this.melodyTimer)
      this.melodyTimer = null
    }
    if (!this.active) return
    for (const src of this.sources) safeStop(src)
    this.sources = []
    this.voices = []
    this.output = null
    this.bedMaster = null
    this.bedLPF = null
    this.padBus = null
    this.noiseGain = null
    this.noiseBuffer = null
    this.melodyOsc = null
    this.melodyGain = null
    this.active = false
  }

  /** 设置 coherence（0..1，慢轴）— 等功率 crossfade pad↔noise + 失谐展宽 */
  setCoherence(value: number): void {
    this.coherence = Math.max(0, Math.min(1, value))
    this.applyCoherence()
  }

  /** 设置 tension（0..4，快轴）— LPF + 音量 */
  setTension(level: number): void {
    this.tension = Math.max(0, Math.min(4, level))
    this.applyTension()
  }

  /** 重随机失谐种子（避免静态走调和弦），按 coherence 缩放展宽 */
  reseedDetune(): void {
    this.detuneSeed = VOICING.map(() => Math.random() * 2 - 1)
    this.applyDetune()
  }

  /** 换声部：浮动声部从和弦音池重新取音并缓慢滑行；同时密度漂移 + 偶发 dropout */
  revoice(): void {
    if (!this.active) return
    const now = this.ctx.currentTime
    const floating = this.voices.filter(v => v.floating)
    const picks = shuffle(CHORD_POOL.slice()).slice(0, floating.length).sort((a, b) => a - b)
    floating.forEach((v, i) => {
      v.ratio = picks[i] ?? v.ratio
      const f = this.rootHz * v.ratio
      v.oscA.frequency.setTargetAtTime(f, now, GLIDE_TC)
      v.oscB.frequency.setTargetAtTime(f, now, GLIDE_TC)
      const level = Math.random() < DROPOUT_CHANCE ? 0 : 0.5 + Math.random() * 0.5
      v.gain.gain.setTargetAtTime(v.baseGain * level, now, 2.0)
    })
    this.applyDetune()
  }

  /** 转调：绕 base 中心重取根音（不累积漂移），整片 pad 缓慢滑向新的"家" */
  modulate(): void {
    if (!this.active) return
    this.rootHz = this.baseRootHz * pick(ROOT_DEGREES)
    const now = this.ctx.currentTime
    for (const v of this.voices) {
      const f = this.rootHz * v.ratio
      v.oscA.frequency.setTargetAtTime(f, now, GLIDE_TC * 1.5)
      v.oscB.frequency.setTargetAtTime(f, now, GLIDE_TC * 1.5)
    }
  }

  /** 稀疏非音高质感事件：远处办公/机械杂音（闷响/咔哒/纸张），随 coherence 下降变响变亮 */
  playTexture(): void {
    if (!this.active || !this.bedMaster) return
    const kind = pick(TEXTURE_KINDS)
    const dirt = 1 - this.coherence // 越脏越响越亮
    if (kind === 'thunk') this.textureThunk(dirt)
    else if (kind === 'click') this.textureClick(dirt)
    else this.textureRustle(dirt)
  }

  /** 远处抽屉/机械闷响：低通噪声爆 + 低频 thud */
  private textureThunk(dirt: number): void {
    const ctx = this.ctx
    const now = ctx.currentTime
    const v = 0.05 + dirt * 0.04
    const noise = this.makeNoiseSource()
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 240 + dirt * 260
    const ng = ctx.createGain()
    noise.connect(lp)
    lp.connect(ng)
    ng.connect(this.bedMaster!)
    ng.gain.setValueAtTime(0.0001, now)
    ng.gain.linearRampToValueAtTime(v, now + 0.01)
    ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.22)
    noise.start(now)
    noise.stop(now + 0.25)

    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(80, now)
    o.frequency.exponentialRampToValueAtTime(48, now + 0.2)
    const og = ctx.createGain()
    o.connect(og)
    og.connect(this.bedMaster!)
    og.gain.setValueAtTime(0.0001, now)
    og.gain.linearRampToValueAtTime(v * 0.8, now + 0.008)
    og.gain.exponentialRampToValueAtTime(0.0001, now + 0.25)
    o.start(now)
    o.stop(now + 0.27)
  }

  /** 继电器/开关咔哒：1-2 次极短带通噪声 tick */
  private textureClick(dirt: number): void {
    const ctx = this.ctx
    const now = ctx.currentTime
    const count = Math.random() < 0.5 ? 1 : 2
    const v = 0.04 + dirt * 0.03
    for (let i = 0; i < count; i++) {
      const t = now + i * 0.05
      const noise = this.makeNoiseSource()
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 1400 + dirt * 1200
      bp.Q.value = 2
      const g = ctx.createGain()
      noise.connect(bp)
      bp.connect(g)
      g.connect(this.bedMaster!)
      g.gain.setValueAtTime(v, t)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03)
      noise.start(t)
      noise.stop(t + 0.035)
    }
  }

  /** 纸张/气流：高通噪声短促 rustle */
  private textureRustle(dirt: number): void {
    const ctx = this.ctx
    const now = ctx.currentTime
    const v = 0.03 + dirt * 0.025
    const noise = this.makeNoiseSource()
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 1100
    const g = ctx.createGain()
    noise.connect(hp)
    hp.connect(g)
    g.connect(this.bedMaster!)
    g.gain.setValueAtTime(0.0001, now)
    g.gain.linearRampToValueAtTime(v, now + 0.03)
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.2)
    noise.start(now)
    noise.stop(now + 0.22)
  }

  private makeNoiseSource(): AudioBufferSourceNode {
    const src = this.ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    return src
  }

  /** 旋律单音：在自然小调音阶上小步游走（含留白），gain 门控出一个柔和单音 */
  playMelodyNote(): void {
    if (!this.active || !this.melodyOsc || !this.melodyGain) return
    if (Math.random() < MELODY_REST_CHANCE) return // 乐句留白
    const step = Math.floor(Math.random() * 5) - 2 // -2..+2 级
    this.melodyIndex = Math.max(0, Math.min(MELODY_SCALE.length - 1, this.melodyIndex + step))
    const freq = this.rootHz * MELODY_OCTAVE * MELODY_SCALE[this.melodyIndex]
    const now = this.ctx.currentTime
    this.melodyOsc.frequency.setTargetAtTime(freq, now, 0.04)
    this.melodyOsc.detune.setTargetAtTime((Math.random() * 2 - 1) * (1 - this.coherence) * MAX_DETUNE_CENTS, now, 0.1)
    // 单音包络：起音 swell → 时值末释放
    this.melodyGain.gain.setTargetAtTime(MELODY_VOL, now, 0.12)
    this.melodyGain.gain.setTargetAtTime(0.0001, now + MELODY_NOTE_LEN, 0.3)
  }

  // === 内部 ===

  private scheduleRevoice(): void {
    this.revoiceTimer = setTimeout(() => {
      this.revoice()
      this.scheduleRevoice()
    }, jitter(this.revoiceIntervalMs))
  }

  private scheduleTexture(): void {
    this.textureTimer = setTimeout(() => {
      this.playTexture()
      this.scheduleTexture()
    }, jitter(this.textureIntervalMs))
  }

  private scheduleModulate(): void {
    this.modulateTimer = setTimeout(() => {
      this.modulate()
      this.scheduleModulate()
    }, jitter(this.modulateIntervalMs))
  }

  private scheduleMelody(): void {
    this.melodyTimer = setTimeout(() => {
      this.playMelodyNote()
      this.scheduleMelody()
    }, jitter(this.melodyIntervalMs))
  }

  private applyFreq(): void {
    if (!this.active) return
    const t = this.ctx.currentTime
    for (const v of this.voices) {
      const f = this.rootHz * v.ratio
      v.oscA.frequency.setTargetAtTime(f, t, 0.08)
      v.oscB.frequency.setTargetAtTime(f, t, 0.08)
    }
  }

  private applyDetune(): void {
    if (!this.active) return
    const spread = (1 - this.coherence) * MAX_DETUNE_CENTS
    const t = this.ctx.currentTime
    this.voices.forEach((v, i) => {
      const atonal = this.detuneSeed[i] * spread
      v.oscA.detune.setTargetAtTime(atonal - CHORUS_CENTS, t, 1.2)
      v.oscB.detune.setTargetAtTime(atonal + CHORUS_CENTS, t, 1.2)
    })
  }

  private applyCoherence(): void {
    if (!this.active || !this.padBus || !this.noiseGain) return
    const t = this.ctx.currentTime
    const theta = (1 - this.coherence) * (Math.PI / 2)
    this.padBus.gain.setTargetAtTime(Math.cos(theta), t, 0.15)
    this.noiseGain.gain.setTargetAtTime(Math.sin(theta) * NOISE_MIX, t, 0.15)
    this.applyDetune()
  }

  private applyTension(): void {
    if (!this.active || !this.bedLPF || !this.bedMaster) return
    const t = this.ctx.currentTime
    const { lpf, vol } = interpolateTension(this.tension)
    this.bedLPF.frequency.setTargetAtTime(lpf, t, 0.4)
    this.bedMaster.gain.setTargetAtTime(vol, t, 0.4)
  }
}

function safeStop(node: AudioScheduledSourceNode): void {
  try {
    node.stop()
  } catch {
    /* already stopped */
  }
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** 周期 ±40% 抖动，避免演化本身形成可察觉的元 loop */
function jitter(baseMs: number): number {
  return baseMs * (0.6 + Math.random() * 0.8)
}
