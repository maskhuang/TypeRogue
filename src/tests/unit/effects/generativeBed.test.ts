// ============================================
// 打字肉鸽 - 生成式底乐 (B 方案) 测试
// ============================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  GenerativeBed,
  computeCoherence,
  interpolateTension,
  COH_FLOOR,
} from '../../../src/effects/generativeBed'

// --- mock AudioContext ---
function createMockAudioContext(time = 1.0) {
  const oscillators: any[] = []
  const gains: any[] = []
  const filters: any[] = []
  const bufferSources: any[] = []

  const param = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    connect: vi.fn(),
  })

  const ctx = {
    get currentTime() {
      return time
    },
    sampleRate: 44100,
    createOscillator: vi.fn(() => {
      const o = {
        type: 'sine' as string,
        frequency: param(),
        detune: param(),
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      }
      oscillators.push(o)
      return o
    }),
    createGain: vi.fn(() => {
      const g = { gain: param(), connect: vi.fn() }
      gains.push(g)
      return g
    }),
    createBiquadFilter: vi.fn(() => {
      const f = { type: 'lowpass' as string, frequency: param(), Q: param(), connect: vi.fn() }
      filters.push(f)
      return f
    }),
    createBufferSource: vi.fn(() => {
      const s = { buffer: null as any, loop: false, connect: vi.fn(), start: vi.fn(), stop: vi.fn() }
      bufferSources.push(s)
      return s
    }),
    createBuffer: vi.fn(() => ({ getChannelData: () => new Float32Array(128) })),
    oscillators,
    gains,
    filters,
    bufferSources,
  }
  return ctx
}

type MockCtx = ReturnType<typeof createMockAudioContext>

/** 收集所有 gain 上 setTargetAtTime 的目标值 */
function gainTargets(ctx: MockCtx): number[] {
  return ctx.gains.flatMap(g => g.gain.setTargetAtTime.mock.calls.map((c: any[]) => c[0]))
}
/** 收集所有 filter.frequency 上 setTargetAtTime 的目标值 */
function filterFreqTargets(ctx: MockCtx): number[] {
  return ctx.filters.flatMap(f => f.frequency.setTargetAtTime.mock.calls.map((c: any[]) => c[0]))
}
/** 收集所有 oscillator.detune 上 setTargetAtTime 的目标值 */
function detuneTargets(ctx: MockCtx): number[] {
  return ctx.oscillators.flatMap(o => o.detune.setTargetAtTime.mock.calls.map((c: any[]) => c[0]))
}

const approx = (arr: number[], v: number, eps = 1e-6) => arr.some(x => Math.abs(x - v) < eps)

// ============================================================
// computeCoherence — 每关曲线
// ============================================================
describe('computeCoherence — 每关 coherence 曲线', () => {
  it('L1 = 满协和 1.0', () => {
    expect(computeCoherence(1)).toBeCloseTo(1.0, 5)
  })
  it('每关线性沉降 0.025（standard 关）', () => {
    expect(computeCoherence(2)).toBeCloseTo(0.975, 5)
    expect(computeCoherence(3)).toBeCloseTo(0.95, 5)
  })
  it('ritual 关（pos 6）回暖 +0.12', () => {
    // L6: 1 - 5*0.025 = 0.875，ritual +0.12 = 0.995
    expect(computeCoherence(6)).toBeCloseTo(0.995, 5)
  })
  it('boss 关（pos 12）探底 -0.10', () => {
    // L12: 1 - 11*0.025 = 0.725，boss -0.10 = 0.625
    expect(computeCoherence(12)).toBeCloseTo(0.625, 5)
    // L24: 1 - 23*0.025 = 0.425，boss -0.10 = 0.325
    expect(computeCoherence(24)).toBeCloseTo(0.325, 5)
  })
  it('深关 clamp 到 floor', () => {
    expect(computeCoherence(60)).toBe(COH_FLOOR)
    expect(computeCoherence(200)).toBe(COH_FLOOR)
  })
  it('单调不增（除 ritual 回暖外整体下行）', () => {
    expect(computeCoherence(12)).toBeLessThan(computeCoherence(2))
    expect(computeCoherence(24)).toBeLessThan(computeCoherence(12))
  })
})

// ============================================================
// interpolateTension — 快轴映射
// ============================================================
describe('interpolateTension — TENSION_TABLE 连续插值', () => {
  it('整数档位精确命中', () => {
    expect(interpolateTension(0)).toEqual({ lpf: 700, vol: 0.13 })
    expect(interpolateTension(1)).toEqual({ lpf: 800, vol: 0.15 })
    expect(interpolateTension(2)).toEqual({ lpf: 2000, vol: 0.19 })
    expect(interpolateTension(4)).toEqual({ lpf: 6000, vol: 0.30 })
  })
  it('档位间线性插值', () => {
    const r = interpolateTension(1.5)
    expect(r.lpf).toBeCloseTo(1400, 5) // 800↔2000 中点
    expect(r.vol).toBeCloseTo(0.17, 5) // 0.15↔0.19 中点
  })
  it('越界 clamp', () => {
    expect(interpolateTension(-3)).toEqual({ lpf: 700, vol: 0.13 })
    expect(interpolateTension(99)).toEqual({ lpf: 6000, vol: 0.30 })
  })
})

// ============================================================
// GenerativeBed 引擎
// ============================================================
describe('GenerativeBed — 引擎生命周期与双轴', () => {
  let ctx: MockCtx
  let connected: AudioNode[]
  let bed: GenerativeBed

  beforeEach(() => {
    ctx = createMockAudioContext(1.0)
    connected = []
    bed = new GenerativeBed(
      ctx as unknown as AudioContext,
      n => connected.push(n),
      { reseedIntervalMs: 0, revoiceIntervalMs: 0, textureIntervalMs: 0, modulateIntervalMs: 0, melodyIntervalMs: 0 }, // 关闭自动演化，单测手动调
    )
  })

  afterEach(() => {
    bed.stop()
    vi.restoreAllMocks()
  })

  it('start() 启动 5 个 pad voice（各 2 振荡器）+ 噪声 + 旋律 + 总线，并接入输出', () => {
    bed.start()
    expect(bed.isActive()).toBe(true)
    // 5 voice ×(oscA+oscB+lfo)=15 + 噪声 bandLFO 1 + 旋律 osc 1 = 17 振荡器
    expect(ctx.oscillators).toHaveLength(17)
    // 噪声 bufferSource
    expect(ctx.bufferSources).toHaveLength(1)
    expect(ctx.bufferSources[0].loop).toBe(true)
    // bedLPF + 噪声 bandpass + 旋律 LPF = 3 filter
    expect(ctx.filters).toHaveLength(3)
    // 输出节点接入宿主图一次
    expect(connected).toHaveLength(1)
    // 所有振荡器都 start
    expect(ctx.oscillators.every(o => o.start.mock.calls.length === 1)).toBe(true)
  })

  it('start() 幂等', () => {
    bed.start()
    const oscCount = ctx.oscillators.length
    bed.start()
    expect(ctx.oscillators).toHaveLength(oscCount)
  })

  it('stop() 停止所有振荡器并失活', () => {
    bed.start()
    const oscs = [...ctx.oscillators]
    bed.stop()
    expect(bed.isActive()).toBe(false)
    expect(oscs.every(o => o.stop.mock.calls.length === 1)).toBe(true)
  })

  it('stop() 幂等且未启动时安全', () => {
    expect(() => bed.stop()).not.toThrow()
    bed.start()
    bed.stop()
    expect(() => bed.stop()).not.toThrow()
  })

  it('coherence=1：pad 满、噪声静（等功率 crossfade）', () => {
    bed.start()
    bed.setCoherence(1)
    const g = gainTargets(ctx)
    // pad 端 cos(0)=1
    expect(approx(g, 1, 1e-6)).toBe(true)
    // 噪声端 sin(0)*0.32 = 0
    expect(approx(g, 0, 1e-6)).toBe(true)
  })

  it('coherence=0：pad 静、噪声满（NOISE_MIX=0.32）', () => {
    bed.start()
    bed.setCoherence(0)
    const g = gainTargets(ctx)
    // 噪声端 sin(pi/2)*0.32 = 0.32
    expect(approx(g, 0.32, 1e-6)).toBe(true)
    // pad 端 cos(pi/2) ≈ 0
    expect(approx(g, Math.cos(Math.PI / 2), 1e-6)).toBe(true)
    expect(bed.getCoherence()).toBe(0)
  })

  it('coherence 输入越界 clamp 到 [0,1]', () => {
    bed.start()
    bed.setCoherence(5)
    expect(bed.getCoherence()).toBe(1)
    bed.setCoherence(-2)
    expect(bed.getCoherence()).toBe(0)
  })

  it('setTension(2)：LPF→2000Hz，音量→0.19', () => {
    bed.start()
    bed.setTension(2)
    expect(approx(filterFreqTargets(ctx), 2000)).toBe(true)
    expect(approx(gainTargets(ctx), 0.19)).toBe(true)
    expect(bed.getTension()).toBe(2)
  })

  it('setTension(4)：LPF→6000Hz，音量→0.30', () => {
    bed.start()
    bed.setTension(4)
    expect(approx(filterFreqTargets(ctx), 6000)).toBe(true)
    expect(approx(gainTargets(ctx), 0.30)).toBe(true)
  })

  it('coherence=0 时失谐展宽生效（detune 远超合唱 ±7）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1) // seed = 1*2-1 = 1
    bed.start()
    bed.setCoherence(0)
    bed.reseedDetune()
    // spread = (1-0)*240 = 240；atonal = 1*240 = 240；oscB detune = 240+7 = 247
    expect(approx(detuneTargets(ctx), 247)).toBe(true)
  })

  it('coherence=1 时无失谐展宽（detune 仅合唱 ±7）', () => {
    bed.start()
    bed.setCoherence(1)
    bed.reseedDetune()
    const d = detuneTargets(ctx)
    // spread=0 → 所有 detune ∈ {-7, +7}
    expect(d.every(v => Math.abs(Math.abs(v) - 7) < 1e-6)).toBe(true)
  })

  it('start 时不设自动重随机定时器（reseedIntervalMs:0）— stop 不报错', () => {
    bed.start()
    expect(() => bed.stop()).not.toThrow()
  })

  it('未启动时 set* 安全（不报错、记录值）', () => {
    expect(() => bed.setCoherence(0.5)).not.toThrow()
    expect(() => bed.setTension(3)).not.toThrow()
    expect(bed.getCoherence()).toBe(0.5)
    expect(bed.getTension()).toBe(3)
  })

  // ---- 反重复演化 ----

  it('revoice() 让浮动声部换音（产生新的频率滑行），锚声部不掉线', () => {
    bed.start()
    // 浮动声部 = 后 3 个 voice，每个 2 振荡器；记录换音前 frequency.setTargetAtTime 次数
    const before = ctx.oscillators.reduce((n, o) => n + o.frequency.setTargetAtTime.mock.calls.length, 0)
    bed.revoice()
    const after = ctx.oscillators.reduce((n, o) => n + o.frequency.setTargetAtTime.mock.calls.length, 0)
    // 3 浮动声部 × 2 振荡器 = 6 次新的频率滑行
    expect(after - before).toBe(6)
    expect(bed.isActive()).toBe(true)
  })

  it('revoice() 浮动声部音程落在开放和弦音池内', () => {
    bed.start()
    bed.revoice()
    // 换音后频率滑行目标 / 根音 应是 CHORD_POOL 内的比率
    const pool = [3 / 2, 5 / 3, 2, 9 / 4, 5 / 2, 3]
    const root = 131
    // 取最后 6 个 frequency.setTargetAtTime 调用（换音产生的）
    const allFreqTargets = ctx.oscillators.flatMap(o =>
      o.frequency.setTargetAtTime.mock.calls.map((c: any[]) => c[0]),
    )
    const revoiced = allFreqTargets.slice(-6)
    for (const f of revoiced) {
      const ratio = f / root
      expect(pool.some(p => Math.abs(p - ratio) < 1e-6)).toBe(true)
    }
  })

  it('playTexture() thunk（random=0）：低通噪声爆 + 低频 thud 振荡器', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // pick → 'thunk'
    bed.start()
    const oscBefore = ctx.oscillators.length
    const srcBefore = ctx.bufferSources.length
    bed.playTexture()
    expect(ctx.oscillators.length).toBe(oscBefore + 1) // thud sine
    expect(ctx.bufferSources.length).toBe(srcBefore + 1) // 噪声爆
    const thud = ctx.oscillators[ctx.oscillators.length - 1]
    expect(thud.type).toBe('sine')
    expect(thud.start).toHaveBeenCalled()
    expect(thud.stop).toHaveBeenCalled()
    const src = ctx.bufferSources[ctx.bufferSources.length - 1]
    expect(src.start).toHaveBeenCalled()
    expect(src.stop).toHaveBeenCalled()
  })

  it('playTexture() click（random=0.5）：无音高，仅带通噪声 tick（不新建振荡器）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // pick → 'click'，count → 2
    bed.start()
    const oscBefore = ctx.oscillators.length
    const srcBefore = ctx.bufferSources.length
    bed.playTexture()
    expect(ctx.oscillators.length).toBe(oscBefore) // 无旋律/无音高
    expect(ctx.bufferSources.length).toBe(srcBefore + 2) // 2 次 tick
  })

  it('playTexture() rustle（random=0.9）：高通噪声，无振荡器', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // pick → 'rustle'
    bed.start()
    const oscBefore = ctx.oscillators.length
    const srcBefore = ctx.bufferSources.length
    bed.playTexture()
    expect(ctx.oscillators.length).toBe(oscBefore)
    expect(ctx.bufferSources.length).toBe(srcBefore + 1)
  })

  it('revoice / playTexture 未启动时安全', () => {
    expect(() => bed.revoice()).not.toThrow()
    expect(() => bed.playTexture()).not.toThrow()
  })

  // ---- 旋律线 ----

  it('playMelodyNote() 将旋律音高滑到自然小调音阶上的音 + gain swell', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // 无留白(0.5≥0.25)；step=floor(2.5)-2=0 → 留在 index 0
    bed.start()
    bed.playMelodyNote()
    const melOsc = ctx.oscillators[ctx.oscillators.length - 1] // 最后创建 = 旋律 osc
    const melGain = ctx.gains[ctx.gains.length - 1]            // 最后创建 = melodyGain
    // index 0 → ratio 1 → freq = root(131) × MELODY_OCTAVE(2) × 1 = 262
    const freqTargets = melOsc.frequency.setTargetAtTime.mock.calls.map((c: any[]) => c[0])
    expect(freqTargets.some((f: number) => Math.abs(f - 262) < 1e-6)).toBe(true)
    // gain swell 到 MELODY_VOL 0.055
    const gainTargets = melGain.gain.setTargetAtTime.mock.calls.map((c: any[]) => c[0])
    expect(gainTargets.some((v: number) => Math.abs(v - 0.055) < 1e-6)).toBe(true)
  })

  it('playMelodyNote() 音高始终落在 MELODY_SCALE × root × octave 上', () => {
    bed.start()
    const scale = [1, 9 / 8, 6 / 5, 4 / 3, 3 / 2, 8 / 5, 9 / 5, 2]
    const allowed = scale.map(r => 131 * 2 * r)
    for (let i = 0; i < 30; i++) bed.playMelodyNote()
    const melOsc = ctx.oscillators[ctx.oscillators.length - 1]
    const freqTargets = melOsc.frequency.setTargetAtTime.mock.calls.map((c: any[]) => c[0])
    for (const f of freqTargets) {
      expect(allowed.some(a => Math.abs(a - f) < 1e-3)).toBe(true)
    }
  })

  it('coherence=0 时旋律失谐（detune≠0）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // 无留白
    bed.start()
    bed.setCoherence(0)
    bed.playMelodyNote()
    const melOsc = ctx.oscillators[ctx.oscillators.length - 1]
    const detuneTargets = melOsc.detune.setTargetAtTime.mock.calls.map((c: any[]) => c[0])
    expect(detuneTargets.some((d: number) => Math.abs(d) > 1)).toBe(true)
  })

  it('playMelodyNote 未启动时安全', () => {
    expect(() => bed.playMelodyNote()).not.toThrow()
  })

  it('modulate() 整片 pad 滑向绕 base 重取的新根音（统一音级 2/3）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // pick → 第 0 个音级 = 2/3
    bed.start()
    bed.modulate()
    const base = 131
    const ratios = [0.5, 1, 3 / 2, 2, 9 / 4] // VOICING（未 revoice，仍是初值）
    // 每个 freq 振荡器最后一次滑行目标 = modulate 的目标
    const lastTargets = ctx.oscillators
      .filter(o => o.frequency.setTargetAtTime.mock.calls.length > 0)
      .map(o => o.frequency.setTargetAtTime.mock.calls.at(-1)![0])
    expect(lastTargets).toHaveLength(10) // 5 voice × 2 osc
    // 全部落在 base × (2/3) × VOICING 上（统一 degree）
    const expected = ratios.map(r => base * (2 / 3) * r)
    for (const f of lastTargets) {
      expect(expected.some(e => Math.abs(e - f) < 1e-3)).toBe(true)
    }
    // 根音 voice(ratio=1) → 131 × 2/3 ≈ 87.3Hz 在场
    expect(lastTargets.some(f => Math.abs(f - base * (2 / 3)) < 1e-3)).toBe(true)
  })

  it('modulate() 未启动时安全', () => {
    expect(() => bed.modulate()).not.toThrow()
  })

  // ---- 输出电平（商店 duck）----

  it('setLevel() 调整输出 gain（商店 duck），clamp 到 [0,1]', () => {
    bed.start()
    bed.setLevel(0.5)
    expect(bed.getLevel()).toBe(0.5)
    const out = ctx.gains[0] // output = 第一个创建的 gain
    const targets = out.gain.setTargetAtTime.mock.calls.map((c: any[]) => c[0])
    expect(targets.some((v: number) => Math.abs(v - 0.5) < 1e-6)).toBe(true)
    bed.setLevel(5)
    expect(bed.getLevel()).toBe(1)
    bed.setLevel(-2)
    expect(bed.getLevel()).toBe(0)
  })

  it('start() 重置电平到满', () => {
    bed.start()
    bed.setLevel(0.4)
    bed.stop()
    bed.start()
    expect(bed.getLevel()).toBe(1)
  })
})
