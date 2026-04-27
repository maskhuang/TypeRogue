// ============================================
// 打字肉鸽 - 程序化 BGM 控制器（Tone.js）
// ============================================
//
// 跨场景单例：一旦 start()，Tone graph 持续存活，不在 BattleScene 退出时销毁。
// 战斗中由 BattleScene.update 喂入 state 驱动 tension/BPM；
// 进 shop / 其他非战斗场景，调用 setAmbient() 平滑回落到 drone-only。
//
// 输入信号（battle 模式）：
//   combo         → 紧张度（连击 0..20+ 拉满）
//   timeRemaining → 紧张度（时间越少越紧）
//   keypress      → BPM（5 秒滑动窗口的 chars/sec → 80..144 BPM）
//
// 输出层级（按 tension 自动叠加）：
//   pad   永远在
//   bass  tension >= 0.15
//   drums tension >= 0.45
//   lead  tension >= 0.70
//
// 和声：A 小调 i-VI-III-VII，每 2 小节切一次

import * as Tone from 'tone'
import { eventBus } from '../../core/events/EventBus'
import { getSettings } from '../../core/UserSettings'
import { BGM_PRESETS, DEFAULT_PRESET_ID, getPreset, type BgmPreset } from './BgmPresets'

export interface BgmDriveInput {
  combo: number
  timeRemaining: number
  totalTime: number
  paused?: boolean
}

/** 当前 scale/progression/chord 的快照，供 scaleSnap 等模块只读访问 */
export interface ScaleConfig {
  scale: readonly number[]
  progression: readonly number[]
  rootMidi: number
  chordIndex: number
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/** 把 MIDI note number 转换为 Hz */
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

/** 把 Hz 转 MIDI（连续浮点） */
export function freqToMidi(hz: number): number {
  return 69 + 12 * Math.log2(hz / 440)
}

const COMBO_FULL = 20
const KEYPRESS_WINDOW_MS = 3000
const BPM_AMBIENT = 78

// BPM 离散阶梯：4 档具体值改由 preset.bpmTiers 提供（避免连续追踪带来的 wobble）
// 跨档边界用 hysteresis 防抖，且只在小节起点 ramp。
// CPS 阈值是玩家速度阈值（不是音乐速度），保持全局；preset 只决定每档具体 BPM。
const BPM_TIER_EDGES = [1.5, 3.5, 5.5] as const // cps 阈值（升档点）
const BPM_TIER_HYST = 0.5                        // 升降档迟滞

// 每 tick（8n）tension / cps EMA 朝目标值收敛的比例。
// 0.06 → 时间常数约 5 秒，层切换不会突兀
const TENSION_LERP = 0.06
const CPS_LERP = 0.06

// 每层音量淡入淡出窗口（smoothstep 起止点）
// 在窗口内音量从 -Inf dB 平滑过渡到 0 dB（满音量）
const BASS_FADE = [0.05, 0.32] as const
const DRUMS_FADE = [0.32, 0.58] as const
const LEAD_FADE = [0.55, 0.82] as const

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

type Mode = 'idle' | 'battle' | 'ambient'

function noteAt(rootMidi: number, scale: readonly number[], deg: number, octaveOffset: number): number {
  const len = scale.length
  const oct = Math.floor(deg / len) + octaveOffset
  const idx = ((deg % len) + len) % len
  return rootMidi + scale[idx] + oct * 12
}

function midiToName(m: number): string {
  return NOTE_NAMES[m % 12] + (Math.floor(m / 12) - 1)
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

export class BgmController {
  private started = false
  private destroyed = false
  private mode: Mode = 'idle'

  // Tone 节点
  private master!: Tone.Volume
  private reverb!: Tone.Reverb
  private delay!: Tone.FeedbackDelay
  private pad!: Tone.PolySynth
  private bass!: Tone.MonoSynth
  private lead!: Tone.Synth
  private kick!: Tone.MembraneSynth
  private snare!: Tone.NoiseSynth
  private hat!: Tone.NoiseSynth
  private loop!: Tone.Loop
  // 每层独立音量节点，按 tension 平滑淡入淡出（避免硬开关的"啪"声）
  private bassGain!: Tone.Volume
  private drumsGain!: Tone.Volume
  private leadGain!: Tone.Volume

  // 和声/序列状态
  private step = 0
  private chordIndex = 0

  // 当前预设（可在运行时切换）
  private preset: BgmPreset = BGM_PRESETS[DEFAULT_PRESET_ID]
  // 切换请求暂存：在下一个 bar 起点应用，避免半小节断裂
  private pendingPresetId: string | null = null

  // tension：current 朝 target 平滑收敛（lerp）
  private tension = 0
  private tensionTarget = 0

  // cps EMA + 当前 BPM 档位（带 hysteresis）
  private cpsTarget = 0     // drive() 写入的瞬时 cps（来自滑动窗口）
  private cpsEma = 0        // tick() 平滑后的 cps
  private bpmTier = 0       // 当前 BPM 阶梯下标

  // keypress 滑动窗口
  private keypressTimes: number[] = []
  private unsubKeypress: (() => void) | null = null

  /**
   * 安排首次用户交互（pointerdown / keydown）时自动启动 BGM。
   * 用于 app 初始化阶段：在菜单还没被点击之前调用，第一次用户操作就会触发 start()。
   * 已启动后 no-op，可重复调用。
   */
  armAutoStart(): void {
    if (this.started || this.destroyed) return
    const onFirstGesture = () => {
      document.removeEventListener('pointerdown', onFirstGesture)
      document.removeEventListener('keydown', onFirstGesture)
      void this.start()
    }
    document.addEventListener('pointerdown', onFirstGesture, { once: true })
    document.addEventListener('keydown', onFirstGesture, { once: true })
  }

  /**
   * 启动音乐。必须在用户手势上下文中调用（点击/按键），否则 Tone.start() 会被浏览器阻止。
   * 已启动时是 no-op，可重复调用。
   */
  async start(): Promise<void> {
    if (this.started || this.destroyed) return

    await Tone.start()

    this.buildGraph()
    this.syncVolume()
    this.subscribeEvents()

    this.step = 0
    this.chordIndex = 0
    this.tension = 0
    this.tensionTarget = 0
    this.cpsTarget = 0
    this.cpsEma = 0
    this.bpmTier = 0
    this.mode = 'ambient' // 启动后先进 ambient，等 drive() 进入 battle

    Tone.Transport.bpm.value = BPM_AMBIENT
    this.loop.start(0)
    Tone.Transport.start()

    this.started = true
  }

  /**
   * 战斗模式：每帧调用，喂入战斗状态以更新 tension / BPM。
   */
  drive(input: BgmDriveInput): void {
    if (!this.started || this.destroyed) return
    this.mode = 'battle'

    // 暂停态跟随 Tone.Transport
    if (input.paused && Tone.Transport.state === 'started') {
      Tone.Transport.pause()
    } else if (!input.paused && Tone.Transport.state === 'paused') {
      Tone.Transport.start()
    }

    // tension：combo + 时间紧迫感
    const comboBoost = Math.min(input.combo / COMBO_FULL, 1)
    const timeUrgency =
      input.totalTime > 0 ? clamp01(1 - input.timeRemaining / input.totalTime) : 0
    this.tensionTarget = clamp01(0.5 * comboBoost + 0.5 * timeUrgency)

    // cps 瞬时值（窗口内按键数 / 窗口秒数）；EMA 平滑和 BPM 量化在 tick() 里做
    const now = performance.now()
    while (this.keypressTimes.length > 0 && now - this.keypressTimes[0] > KEYPRESS_WINDOW_MS) {
      this.keypressTimes.shift()
    }
    this.cpsTarget = this.keypressTimes.length / (KEYPRESS_WINDOW_MS / 1000)
  }

  /**
   * Ambient 模式：tension 平滑回 0，BPM 缓降到 BPM_AMBIENT，只剩 pad drone。
   * 用于战斗结束进 shop / menu / 任何非战斗场景，保持音乐连贯。
   */
  setAmbient(): void {
    if (!this.started || this.destroyed) return
    this.mode = 'ambient'
    this.tensionTarget = 0
    this.cpsTarget = 0
    this.keypressTimes = []
    this.bpmTier = 0 // 下次进 battle 从最低档开始

    // 战斗暂停期间退出？保险起见恢复 transport
    if (Tone.Transport.state === 'paused') {
      Tone.Transport.start()
    }

    Tone.Transport.bpm.rampTo(BPM_AMBIENT, 4)
  }

  /**
   * 当前 progression 中的和弦下标（0..3）。
   * BGM 未启动时返回 0（i 和弦），SFX 仍能用默认调式兜底。
   */
  getCurrentChordIndex(): number {
    return this.chordIndex
  }

  /**
   * 当前调式快照，供 scaleSnap 等模块查询。永远返回有效值。
   */
  getScaleConfig(): ScaleConfig {
    return {
      scale: this.preset.scale,
      progression: this.preset.progression,
      rootMidi: this.preset.rootMidi,
      chordIndex: this.chordIndex,
    }
  }

  /**
   * 切换 BGM 预设。
   * 已启动时：暂存请求，在下一个小节起点应用（避免半小节断裂）。
   * 未启动时：立即生效，下次 start() 用新预设。
   */
  setPreset(id: string): void {
    if (!BGM_PRESETS[id]) return
    if (!this.started) {
      this.preset = getPreset(id)
      this.chordIndex = 0
      return
    }
    // 已在播：等下个 bar 才换，避免和弦断
    this.pendingPresetId = id
  }

  /** 当前预设 id */
  getPresetId(): string {
    return this.preset.id
  }

  /**
   * 完整销毁，dispose 所有 Tone 节点。一般只在 app 退出时调用；
   * 跨场景过渡用 setAmbient() 而不是 destroy()。
   */
  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.unsubscribeEvents()
    if (this.started) {
      Tone.Transport.stop()
      this.loop?.stop()
    }
    this.loop?.dispose()
    this.disposeSynths()
    this.delay?.dispose()
    this.reverb?.dispose()
    this.master?.dispose()
    this.started = false
  }

  // ============================================
  // 内部
  // ============================================

  private buildGraph(): void {
    // FX 总线：跨 preset 持久存在，preset 切换只重建合成器，不动 FX 链
    this.master = new Tone.Volume(-10).toDestination()
    this.reverb = new Tone.Reverb({ decay: 6, wet: 0.35 }).connect(this.master)
    this.delay = new Tone.FeedbackDelay({
      delayTime: '8n.',
      feedback: 0.25,
      wet: 0.2,
    }).connect(this.reverb)

    // 每层独立 gain：起步 -Inf（静音），随 tension smoothstep ramp 入
    this.bassGain = new Tone.Volume(-Infinity).connect(this.reverb)
    this.drumsGain = new Tone.Volume(-Infinity).connect(this.reverb)
    this.leadGain = new Tone.Volume(-Infinity).connect(this.delay)

    this.buildSynths(this.preset)

    this.loop = new Tone.Loop((time) => this.tick(time), '8n')
  }

  /**
   * 根据 preset.voicing 实例化 pad/bass/lead/drums 合成器。
   * 每次 preset 切换都会调用：先 disposeSynths() 销毁旧的，再调本方法接到现有 FX 总线上。
   */
  private buildSynths(preset: BgmPreset): void {
    const v = preset.voicing

    // pad 永远在，直接接 reverb
    this.pad = new Tone.PolySynth(Tone.Synth, {
      oscillator: v.pad.oscillator as Tone.SynthOptions['oscillator'],
      envelope: v.pad.envelope,
      detune: v.pad.detune ?? 0,
      volume: v.pad.volume ?? -18,
    }).connect(this.reverb)

    this.bass = new Tone.MonoSynth({
      oscillator: v.bass.oscillator as Tone.MonoSynthOptions['oscillator'],
      envelope: v.bass.envelope,
      filter: v.bass.filter,
      volume: v.bass.volume ?? -10,
    }).connect(this.bassGain)

    this.lead = new Tone.Synth({
      oscillator: v.lead.oscillator as Tone.SynthOptions['oscillator'],
      envelope: v.lead.envelope,
      volume: v.lead.volume ?? -16,
    }).connect(this.leadGain)

    this.kick = new Tone.MembraneSynth({
      volume: -6,
      ...(v.drums.kick ?? {}), // 心跳类 preset 用更长 pitchDecay + 低 octaves 做厚 thump
    }).connect(this.drumsGain)
    this.snare = new Tone.NoiseSynth({
      noise: { type: v.drums.snareNoise },
      envelope: { attack: 0.001, decay: 0.18, sustain: 0 },
      volume: -14,
    }).connect(this.drumsGain)
    this.hat = new Tone.NoiseSynth({
      noise: { type: v.drums.hatNoise },
      envelope: { attack: 0.001, decay: 0.04, sustain: 0 },
      volume: -22,
    }).connect(this.drumsGain)
  }

  /** 销毁当前所有合成器（FX 总线保留）。preset 切换 / destroy 共用。 */
  private disposeSynths(): void {
    this.pad?.releaseAll()
    this.pad?.dispose()
    this.bass?.dispose()
    this.lead?.dispose()
    this.kick?.dispose()
    this.snare?.dispose()
    this.hat?.dispose()
  }

  private tick(time: number): void {
    // tension / cps EMA 朝目标平滑收敛（每 8n 一次 lerp）
    this.tension += (this.tensionTarget - this.tension) * TENSION_LERP
    this.cpsEma += (this.cpsTarget - this.cpsEma) * CPS_LERP

    const t = this.tension
    const isBeat = this.step % 4 === 0
    const isBarStart = this.step % 16 === 0

    // 在 bar 起点应用 pending 预设切换（避免半小节断裂）
    // 切换时 dispose 旧合成器并按新 voicing 重建；FX 总线（reverb/delay/各层 gain）保持不变
    if (isBarStart && this.pendingPresetId) {
      const newPreset = getPreset(this.pendingPresetId)
      this.disposeSynths()
      this.preset = newPreset
      this.buildSynths(newPreset)
      this.pendingPresetId = null
      this.chordIndex = 0
      // 新 preset 的 bpmTiers 区间可能完全不同，重置到最低档让 hysteresis 重新定位
      this.bpmTier = 0
    } else if (isBarStart && this.step !== 0) {
      this.chordIndex = (this.chordIndex + 1) % this.preset.progression.length
    }

    // BPM：仅在小节起点决定档位，量化到 bar 边界（FMOD 风格）
    // 用 hysteresis 防止在阈值附近抖动
    if (isBarStart && this.mode === 'battle') {
      const cps = this.cpsEma
      const tiers = this.preset.bpmTiers
      // 升档：cps 超过当前档对应阈值 + hysteresis
      while (
        this.bpmTier < tiers.length - 1 &&
        cps > BPM_TIER_EDGES[this.bpmTier] + BPM_TIER_HYST
      ) {
        this.bpmTier++
      }
      // 降档：cps 低于上一档阈值 - hysteresis
      while (
        this.bpmTier > 0 &&
        cps < BPM_TIER_EDGES[this.bpmTier - 1] - BPM_TIER_HYST
      ) {
        this.bpmTier--
      }
      const targetBpm = tiers[this.bpmTier]
      // ramp 1.5s 跨过去；下次小节起点至少要 1.6s 后（80 BPM 16×8n），刚好顺接
      Tone.Transport.bpm.rampTo(targetBpm, 1.5)
    }

    // 每层音量按 smoothstep 平滑淡入/淡出（核心连贯性）
    const bassG = smoothstep(BASS_FADE[0], BASS_FADE[1], t)
    const drumsG = smoothstep(DRUMS_FADE[0], DRUMS_FADE[1], t)
    const leadG = smoothstep(LEAD_FADE[0], LEAD_FADE[1], t)
    this.bassGain.volume.rampTo(Tone.gainToDb(bassG), 0.4, time)
    this.drumsGain.volume.rampTo(Tone.gainToDb(drumsG), 0.4, time)
    this.leadGain.volume.rampTo(Tone.gainToDb(leadG), 0.4, time)

    // PAD：每 2 小节切一次和弦（永远在）
    if (isBarStart) {
      const tones = this.chordTones().map(midiToName)
      this.pad.releaseAll(time)
      this.pad.triggerAttackRelease(tones, '2m', time)
    }

    // BASS：音量已平滑控制；trigger 在淡入起点之上即可（节省 CPU）
    // preset.bassDisabled = true 时整体跳过（用于纯 drone / 心跳极简 preset）
    if (bassG > 0.001 && isBeat && !this.preset.bassDisabled) {
      const root = this.chordRootMidi()
      const beat = Math.floor(this.step / 4) % 4
      if (beat === 2 && Math.random() < 0.5) {
        this.bass.triggerAttackRelease(midiToName(root + 7), '8n', time)
      } else {
        this.bass.triggerAttackRelease(midiToName(root), '8n', time)
      }
    }

    // DRUMS：音量已平滑控制；具体律动由 preset.drumPattern 决定（policy-as-data）
    if (drumsG > 0.001) {
      const cyclePos = this.step % 16
      const barPos = this.step % 8
      const bar: 0 | 1 = cyclePos < 8 ? 0 : 1
      const hit = this.preset.drumPattern({ cyclePos, barPos, bar, tension: t })

      if (hit.kick) {
        this.kick.triggerAttackRelease('C2', '8n', time)
      }
      if (hit.snare) {
        this.snare.triggerAttackRelease('16n', time)
      }
      if (hit.hat) {
        this.hat.triggerAttackRelease('32n', time, hit.hatVel ?? 1)
      }
    }

    // LEAD：短语化（call/rest）+ 限定和弦音 + 触发概率封顶，避免高 tension 时高频炸开
    // preset.leadDisabled = true 时整体跳过（boss 层"silence is sacred"——pad+kick 单独承载情感）
    if (leadG > 0.001 && !this.preset.leadDisabled) {
      // 2 小节为周期：前 16 个 8n 活跃（弹），后 16 个静默（让和弦透气）
      const activePhrase = (this.step % 32) < 16
      if (activePhrase) {
        // 触发概率封顶 0.42（之前是 0.75），高 tension 时 lead 也只占~40% 8n
        const triggerProb = 0.18 + leadG * 0.24
        if (Math.random() < triggerProb) {
          const deg = this.preset.progression[this.chordIndex]
          // 仅取和弦音：root / 3rd / 5th / 7th（加权偏向中间两个）
          const chordOffsets = [0, 2, 2, 4, 4, 6] as const
          const offset = chordOffsets[Math.floor(Math.random() * chordOffsets.length)]
          const noteMidi = noteAt(this.preset.rootMidi, this.preset.scale, deg + offset, 1)
          // 音长拉长：去掉 16n，主用 8n / 4n，让 delay tail 不互相挤
          const dur = (['8n', '4n', '4n'] as const)[Math.floor(Math.random() * 3)]
          this.lead.triggerAttackRelease(midiToName(noteMidi), dur, time, 0.6)
        }
      }
    }

    this.step = (this.step + 1) % 64
  }

  private chordRootMidi(): number {
    return noteAt(this.preset.rootMidi, this.preset.scale, this.preset.progression[this.chordIndex], -1)
  }

  private chordTones(): number[] {
    const deg = this.preset.progression[this.chordIndex]
    return [
      noteAt(this.preset.rootMidi, this.preset.scale, deg, 0),
      noteAt(this.preset.rootMidi, this.preset.scale, deg + 2, 0),
      noteAt(this.preset.rootMidi, this.preset.scale, deg + 4, 0),
    ]
  }

  // ============================================
  // 事件订阅 & 音量同步
  // ============================================

  private subscribeEvents(): void {
    this.unsubKeypress = eventBus.on('input:keypress', () => {
      // 仅 battle 模式下记录（ambient 不要被 shop 操作影响）
      if (this.mode === 'battle') {
        this.keypressTimes.push(performance.now())
      }
    })
  }

  private unsubscribeEvents(): void {
    this.unsubKeypress?.()
    this.unsubKeypress = null
  }

  /**
   * 从 UserSettings 同步当前音量。设置面板滑块拖动时、启动时、设置加载时调用。
   * 公式：master_dB = -6 + gainToDb(masterVolume * bgmVolume)
   *   slider=1.0×master=1.0 → -6 dB（顶值，不会爆）
   *   默认 0.35×0.7 = 0.245 → -18 dB（柔和背景）
   */
  syncVolume(): void {
    if (!this.master) return
    const s = getSettings()
    const linear = Math.max(0, Math.min(1, s.masterVolume * s.bgmVolume))
    const db = linear <= 0.0001 ? -60 : -6 + Tone.gainToDb(linear)
    this.master.volume.rampTo(db, 0.2)
  }
}

// ============================================
// 跨场景单例
// ============================================

let _instance: BgmController | null = null

export function getBgmController(): BgmController {
  if (!_instance) _instance = new BgmController()
  return _instance
}
