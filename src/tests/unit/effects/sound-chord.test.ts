// ============================================
// 打字肉鸽 - 资源音效系统测试
// ============================================
// Story 33.1: 和弦缓冲与合成器
// Story 33.2: 资源独立音色设计
// Story 33.3: 连锁深度与强度调制
// Story 33.4: 混音平衡与极端场景

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  RESOURCE_SYNTH,
  calculateRMSVolumes,
  emitResourceSound,
  playScoreSound,
  _chordInternals,
} from '../../../src/effects/sound';

// Mock state（playTypeSound 需要）
vi.mock('../../../src/core/state', () => ({
  state: { combo: 0, player: { relics: new Set() } },
  synergy: {},
}));

// Mock juice
vi.mock('../../../src/effects/juice', () => ({
  getScoreSoundTier: () => 0,
}));

// Mock constants
vi.mock('../../../src/core/constants', () => ({
  SOUND_PROFILES: {
    type: [500, 800, 0.06],
    wrong: [150, 80, 0.1],
    skill: [450, 850, 0.12],
    levelup: [400, 800, 0.15],
    gameover: [300, 100, 0.2],
    buy: [500, 380, 0.06],
  },
}));

/** 创建完整 mock AudioContext（支持所有 synth 函数的节点类型）
 *  收集创建的 oscillators/filters 实例，便于验证波形类型和参数 */
function createMockAudioContext(initialTime = 0.1) {
  let currentTime = initialTime;
  const nodeStartCount = { value: 0 };
  const oscillators: any[] = [];
  const filters: any[] = [];

  const createGainParam = () => ({
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    value: 0,
  });

  const ctx = {
    get currentTime() { return currentTime; },
    set _currentTime(t: number) { currentTime = t; },
    sampleRate: 44100,
    createOscillator: vi.fn(() => {
      const osc = {
        type: 'sine' as string,
        frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(() => { nodeStartCount.value++; }),
        stop: vi.fn(),
      };
      oscillators.push(osc);
      return osc;
    }),
    createGain: vi.fn(() => ({
      gain: createGainParam(),
      connect: vi.fn(),
    })),
    createBufferSource: vi.fn(() => ({
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(() => { nodeStartCount.value++; }),
      stop: vi.fn(),
    })),
    createBiquadFilter: vi.fn(() => {
      const filter = {
        type: 'bandpass' as string,
        frequency: { setValueAtTime: vi.fn(), value: 0 },
        Q: { setValueAtTime: vi.fn(), value: 0 },
        connect: vi.fn(),
      };
      filters.push(filter);
      return filter;
    }),
    createBuffer: vi.fn(() => ({
      getChannelData: () => new Float32Array(44100),
    })),
    destination: {},
    nodeStartCount,
    oscillators,
    filters,
  };
  return ctx as unknown as AudioContext & {
    _currentTime: number;
    nodeStartCount: { value: number };
    oscillators: any[];
    filters: any[];
  };
}

describe('RESOURCE_SYNTH 调度表 (Task 1)', () => {
  it('包含全部 5 种资源', () => {
    expect(Object.keys(RESOURCE_SYNTH)).toHaveLength(5);
    expect(RESOURCE_SYNTH).toHaveProperty('base');
    expect(RESOURCE_SYNTH).toHaveProperty('score');
    expect(RESOURCE_SYNTH).toHaveProperty('multiplier');
    expect(RESOURCE_SYNTH).toHaveProperty('time');
    expect(RESOURCE_SYNTH).toHaveProperty('gold');
  });

  it('每个值为函数', () => {
    for (const key of Object.keys(RESOURCE_SYNTH)) {
      expect(typeof RESOURCE_SYNTH[key]).toBe('function');
    }
  });
});

describe('独立合成函数节点创建 (Task 2)', () => {
  let mockCtx: ReturnType<typeof createMockAudioContext>;

  beforeEach(() => {
    mockCtx = createMockAudioContext();
    // connectToOutput 需要 audioContext 设置（用于 fallback destination 路径）
    _chordInternals._setMockContext(mockCtx as unknown as AudioContext);
  });

  afterEach(() => {
    _chordInternals._setMockContext(null);
  });

  it('synthBase 创建 oscillator(triangle) + bufferSource + biquadFilter', () => {
    RESOURCE_SYNTH.base(mockCtx as unknown as AudioContext, 0.1, 0.1);
    expect(mockCtx.createOscillator).toHaveBeenCalled();
    expect(mockCtx.createBufferSource).toHaveBeenCalled();
    expect(mockCtx.createBiquadFilter).toHaveBeenCalled();
    // 验证波形类型
    expect(mockCtx.oscillators[0].type).toBe('triangle');
    // 验证起始频率 ~120Hz (±5% randomize → [114, 126])
    const freqStart = mockCtx.oscillators[0].frequency.setValueAtTime.mock.calls[0][0];
    expect(freqStart).toBeGreaterThan(113);
    expect(freqStart).toBeLessThan(127);
    // 验证 bandpass 滤波器频率 ~150Hz
    expect(mockCtx.filters[0].type).toBe('bandpass');
  });

  it('synthScore 创建 3 个 oscillator(square)，琶音间隔 25ms', () => {
    RESOURCE_SYNTH.score(mockCtx as unknown as AudioContext, 0.1, 0.1);
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(3);
    // 验证波形类型全部为 square
    mockCtx.oscillators.forEach(osc => expect(osc.type).toBe('square'));
    // 验证 3 音起始时间间隔 ~25ms
    const startTimes = mockCtx.oscillators.map(
      (osc: any) => osc.start.mock.calls[0][0]
    );
    expect(startTimes[1] - startTimes[0]).toBeCloseTo(0.025, 3);
    expect(startTimes[2] - startTimes[1]).toBeCloseTo(0.025, 3);
  });

  it('synthMultiplier 创建 oscillator(sawtooth) + biquadFilter', () => {
    RESOURCE_SYNTH.multiplier(mockCtx as unknown as AudioContext, 0.1, 0.1);
    expect(mockCtx.createOscillator).toHaveBeenCalled();
    expect(mockCtx.createBiquadFilter).toHaveBeenCalled();
    // 验证波形类型
    expect(mockCtx.oscillators[0].type).toBe('sawtooth');
    expect(mockCtx.filters[0].type).toBe('bandpass');
    // 验证上扫起始频率 ~200Hz
    const freqStart = mockCtx.oscillators[0].frequency.setValueAtTime.mock.calls[0][0];
    expect(freqStart).toBeGreaterThan(189);
    expect(freqStart).toBeLessThan(211);
  });

  it('synthTime 创建 2 个 oscillator(sine)，间隔 30ms', () => {
    RESOURCE_SYNTH.time(mockCtx as unknown as AudioContext, 0.1, 0.1);
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(2);
    // 验证波形类型全部为 sine
    mockCtx.oscillators.forEach(osc => expect(osc.type).toBe('sine'));
    // 验证双击间隔 ~30ms
    const startTimes = mockCtx.oscillators.map(
      (osc: any) => osc.start.mock.calls[0][0]
    );
    expect(startTimes[1] - startTimes[0]).toBeCloseTo(0.03, 3);
  });

  it('synthGold 创建 2 个 oscillator(square+sine)，基音+泛音', () => {
    RESOURCE_SYNTH.gold(mockCtx as unknown as AudioContext, 0.1, 0.1);
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(2);
    // 验证波形类型：第一个 square（基音），第二个 sine（泛音）
    expect(mockCtx.oscillators[0].type).toBe('square');
    expect(mockCtx.oscillators[1].type).toBe('sine');
    // 验证泛音频率 ~2× 基音（1200Hz → 2400Hz）
    const baseFreq = mockCtx.oscillators[0].frequency.setValueAtTime.mock.calls[0][0];
    const harmonicFreq = mockCtx.oscillators[1].frequency.setValueAtTime.mock.calls[0][0];
    expect(harmonicFreq / baseFreq).toBeCloseTo(2, 0);
  });
});

describe('emitResourceSound 缓冲逻辑 (Task 4)', () => {
  beforeEach(() => {
    _chordInternals.buffer.clear();
    _chordInternals.resetCooldown();
  });

  it('写入缓冲区', () => {
    emitResourceSound('base', 1.5);
    expect(_chordInternals.buffer.get('base')).toEqual({ intensity: 1.5, chainDepth: 0 });
  });

  it('同种资源多次 emit 取 max intensity', () => {
    emitResourceSound('base', 1.0);
    emitResourceSound('base', 2.5);
    emitResourceSound('base', 1.8);
    expect(_chordInternals.buffer.get('base')).toEqual({ intensity: 2.5, chainDepth: 0 });
  });

  it('不同资源各自保留', () => {
    emitResourceSound('base', 1.0);
    emitResourceSound('score', 2.0);
    emitResourceSound('gold', 1.5);
    expect(_chordInternals.buffer.size).toBe(3);
    expect(_chordInternals.buffer.get('base')).toEqual({ intensity: 1.0, chainDepth: 0 });
    expect(_chordInternals.buffer.get('score')).toEqual({ intensity: 2.0, chainDepth: 0 });
    expect(_chordInternals.buffer.get('gold')).toEqual({ intensity: 1.5, chainDepth: 0 });
  });

  it('只调度一次 microtask', () => {
    const spy = vi.spyOn(globalThis, 'queueMicrotask');
    emitResourceSound('base', 1.0);
    emitResourceSound('score', 2.0);
    emitResourceSound('time', 1.5);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('intensity=0 仍写入缓冲', () => {
    emitResourceSound('base', 0);
    expect(_chordInternals.buffer.has('base')).toBe(true);
    expect(_chordInternals.buffer.get('base')).toEqual({ intensity: 0, chainDepth: 0 });
  });

  it('非映射资源（fragment/mutagen）不写入缓冲', () => {
    emitResourceSound('fragment', 1.0);
    emitResourceSound('mutagen', 2.0);
    expect(_chordInternals.buffer.size).toBe(0);
  });
});

describe('calculateRMSVolumes (RMS 计算)', () => {
  it('空数组返回空', () => {
    expect(calculateRMSVolumes([])).toEqual([]);
  });

  it('单分量不超限时不缩放', () => {
    const result = calculateRMSVolumes([0.02]);
    expect(result).toEqual([0.02]);
  });

  it('多分量 RMS 不超限时不缩放', () => {
    const result = calculateRMSVolumes([0.01, 0.01]);
    expect(result[0]).toBeCloseTo(0.01);
    expect(result[1]).toBeCloseTo(0.01);
  });

  it('5 分量 RMS 超限时等比缩放至 0.03', () => {
    // RMS(0.04×5) = sqrt(5×0.0016) = sqrt(0.008) ≈ 0.089 > 0.03
    const input = [0.04, 0.04, 0.04, 0.04, 0.04];
    const result = calculateRMSVolumes(input);
    const rms = Math.sqrt(result.reduce((s, v) => s + v * v, 0));
    expect(rms).toBeCloseTo(0.03, 2);
    const ratio = result[0] / result[1];
    expect(ratio).toBeCloseTo(1, 5);
  });

  it('不同分量音量超限时等比缩放至 0.03', () => {
    const input = [0.03, 0.04, 0.02, 0.035, 0.025];
    const result = calculateRMSVolumes(input);
    const rms = Math.sqrt(result.reduce((s, v) => s + v * v, 0));
    expect(rms).toBeCloseTo(0.03, 2);
    expect(result[0] / result[1]).toBeCloseTo(input[0] / input[1], 4);
  });

  it('恰好等于上限时不缩放', () => {
    const result = calculateRMSVolumes([0.03]);
    expect(result[0]).toBeCloseTo(0.03);
  });

  it('单分量超限时缩放到上限 0.03', () => {
    const result = calculateRMSVolumes([0.1]);
    expect(result[0]).toBeCloseTo(0.03);
  });
});

describe('flushResourceChord 行为', () => {
  beforeEach(() => {
    _chordInternals.buffer.clear();
    _chordInternals.resetCooldown();
  });

  afterEach(() => {
    _chordInternals._setMockContext(null);
  });

  it('microtask 后缓冲区被清空（audioContext=null 路径）', async () => {
    emitResourceSound('base', 1.0);
    emitResourceSound('score', 2.0);
    expect(_chordInternals.buffer.size).toBe(2);

    await new Promise<void>(resolve => queueMicrotask(resolve));

    expect(_chordInternals.buffer.size).toBe(0);
  });

  it('flush 后 scheduled 重置，允许新一轮缓冲', async () => {
    emitResourceSound('base', 1.0);
    await new Promise<void>(resolve => queueMicrotask(resolve));

    const spy = vi.spyOn(globalThis, 'queueMicrotask');
    emitResourceSound('score', 1.5);
    expect(spy).toHaveBeenCalled();
    expect(_chordInternals.buffer.size).toBe(1);
    spy.mockRestore();
  });

  it('冷却期内丢弃缓冲', async () => {
    const mockCtx = createMockAudioContext(0.1);
    _chordInternals._setMockContext(mockCtx as unknown as AudioContext);

    // 第一次 flush: 正常播放
    emitResourceSound('base', 1.0);
    await new Promise<void>(resolve => queueMicrotask(resolve));
    expect(_chordInternals.buffer.size).toBe(0);
    expect(mockCtx.nodeStartCount.value).toBeGreaterThan(0);

    // 第二次 flush: 冷却期内（currentTime 仍为 0.1）
    const prevCount = mockCtx.nodeStartCount.value;
    emitResourceSound('score', 1.0);
    await new Promise<void>(resolve => queueMicrotask(resolve));
    expect(_chordInternals.buffer.size).toBe(0);
    expect(mockCtx.nodeStartCount.value).toBe(prevCount); // 无新节点
  });

  it('冷却期过后正常播放', async () => {
    const mockCtx = createMockAudioContext(0.1);
    _chordInternals._setMockContext(mockCtx as unknown as AudioContext);

    // 第一次 flush
    emitResourceSound('base', 1.0);
    await new Promise<void>(resolve => queueMicrotask(resolve));
    const firstCount = mockCtx.nodeStartCount.value;
    expect(firstCount).toBeGreaterThan(0);

    // 推进时间超过冷却期
    mockCtx._currentTime = 0.2;
    emitResourceSound('score', 1.0);
    await new Promise<void>(resolve => queueMicrotask(resolve));
    expect(mockCtx.nodeStartCount.value).toBeGreaterThan(firstCount);
  });

  it('flush 调度正确的 synth 函数（score→synthScore, 非 synthBase）', async () => {
    const mockCtx = createMockAudioContext(0.1);
    _chordInternals._setMockContext(mockCtx as unknown as AudioContext);

    const spyBase = vi.spyOn(RESOURCE_SYNTH, 'base');
    const spyScore = vi.spyOn(RESOURCE_SYNTH, 'score');
    const spyGold = vi.spyOn(RESOURCE_SYNTH, 'gold');

    emitResourceSound('score', 1.0);
    emitResourceSound('gold', 1.5);
    await new Promise<void>(resolve => queueMicrotask(resolve));

    expect(spyBase).not.toHaveBeenCalled();
    expect(spyScore).toHaveBeenCalledTimes(1);
    expect(spyGold).toHaveBeenCalledTimes(1);
    // 验证传入了正确的参数类型
    expect(spyScore.mock.calls[0][0]).toBe(mockCtx); // ctx
    expect(typeof spyScore.mock.calls[0][2]).toBe('number'); // vol

    spyBase.mockRestore();
    spyScore.mockRestore();
    spyGold.mockRestore();
  });

  it('flush 传入正确的 pitchShift 和 decayMul (chainDepth=3, intensity=1.0)', async () => {
    const mockCtx = createMockAudioContext(0.1);
    _chordInternals._setMockContext(mockCtx as unknown as AudioContext);

    const spyBase = vi.spyOn(RESOURCE_SYNTH, 'base');
    emitResourceSound('base', 1.0, 3);
    await new Promise<void>(resolve => queueMicrotask(resolve));

    expect(spyBase).toHaveBeenCalledTimes(1);
    const args = spyBase.mock.calls[0];
    // pitchShift = 2^(3/12) ≈ 1.189
    expect(args[3]).toBeCloseTo(2 ** (3 / 12), 3);
    // decayMul = 1 + log₂(max(1, 1)) * 0.3 = 1 (since log₂(1) = 0)
    expect(args[4]).toBeCloseTo(1, 3);
    // stagger: now + 3 * 0.015 = 0.1 + 0.045
    expect(args[1]).toBeCloseTo(0.1 + 0.045, 3);

    spyBase.mockRestore();
  });
});

describe('chainDepth 缓冲逻辑 (Story 33.3 Task 1)', () => {
  beforeEach(() => {
    _chordInternals.buffer.clear();
    _chordInternals.resetCooldown();
  });

  it('chainDepth 写入缓冲', () => {
    emitResourceSound('base', 1.0, 3);
    expect(_chordInternals.buffer.get('base')).toEqual({ intensity: 1.0, chainDepth: 3 });
  });

  it('同资源多次 emit 取 max chainDepth', () => {
    emitResourceSound('base', 1.0, 1);
    emitResourceSound('base', 1.5, 4);
    emitResourceSound('base', 2.0, 2);
    expect(_chordInternals.buffer.get('base')).toEqual({ intensity: 2.0, chainDepth: 4 });
  });

  it('默认 chainDepth=0', () => {
    emitResourceSound('score', 1.0);
    expect(_chordInternals.buffer.get('score')).toEqual({ intensity: 1.0, chainDepth: 0 });
  });
});

describe('音高偏移 + 时间展开 (Story 33.3 Task 3)', () => {
  let mockCtx: ReturnType<typeof createMockAudioContext>;

  beforeEach(() => {
    mockCtx = createMockAudioContext(1.0);
    _chordInternals._setMockContext(mockCtx as unknown as AudioContext);
    _chordInternals.buffer.clear();
    _chordInternals.resetCooldown();
  });

  afterEach(() => {
    _chordInternals._setMockContext(null);
  });

  it('chainDepth=0 时无偏移（pitchShift=1, stagger=0）', async () => {
    const spy = vi.spyOn(RESOURCE_SYNTH, 'base');
    emitResourceSound('base', 1.0, 0);
    await new Promise<void>(resolve => queueMicrotask(resolve));

    const args = spy.mock.calls[0];
    expect(args[1]).toBeCloseTo(1.0, 3); // now, no stagger
    expect(args[3]).toBeCloseTo(1.0, 3); // pitchShift = 1
    spy.mockRestore();
  });

  it('chainDepth=3 时频率上移 3 半音 + 延迟 45ms', async () => {
    const spy = vi.spyOn(RESOURCE_SYNTH, 'score');
    emitResourceSound('score', 1.0, 3);
    await new Promise<void>(resolve => queueMicrotask(resolve));

    const args = spy.mock.calls[0];
    // stagger = 3 * 0.015 = 0.045
    expect(args[1]).toBeCloseTo(1.0 + 0.045, 3);
    // pitchShift = 2^(3/12) ≈ 1.1892
    expect(args[3]).toBeCloseTo(2 ** (3 / 12), 3);
    spy.mockRestore();
  });

  it('chainDepth=8 被截断为 6（最大增四度）', async () => {
    const spy = vi.spyOn(RESOURCE_SYNTH, 'gold');
    emitResourceSound('gold', 1.0, 8);
    await new Promise<void>(resolve => queueMicrotask(resolve));

    const args = spy.mock.calls[0];
    // clamped to 6: stagger = 6 * 0.015 = 0.09
    expect(args[1]).toBeCloseTo(1.0 + 0.09, 3);
    // pitchShift = 2^(6/12) = sqrt(2) ≈ 1.4142
    expect(args[3]).toBeCloseTo(Math.SQRT2, 3);
    spy.mockRestore();
  });
});

describe('ResourceSynth pitchShift / decayMul 扩展 (Story 33.3 Task 4)', () => {
  let mockCtx: ReturnType<typeof createMockAudioContext>;

  beforeEach(() => {
    mockCtx = createMockAudioContext();
    _chordInternals._setMockContext(mockCtx as unknown as AudioContext);
  });

  afterEach(() => {
    _chordInternals._setMockContext(null);
  });

  it('pitchShift=1.5 使 synthBase 频率 ×1.5', () => {
    RESOURCE_SYNTH.base(mockCtx as unknown as AudioContext, 0.1, 0.1, 1.5, 1);
    // synthBase 起始频率 ~120 * 1.5 = 180 (±5%)
    const freqStart = mockCtx.oscillators[0].frequency.setValueAtTime.mock.calls[0][0];
    expect(freqStart).toBeGreaterThan(170);
    expect(freqStart).toBeLessThan(190);
  });

  it('decayMul=2 延长 synthScore 的 stop 时间', () => {
    RESOURCE_SYNTH.score(mockCtx as unknown as AudioContext, 0.1, 0.1, 1, 2);
    // synthScore osc.stop(t + 0.07 * decayMul) = t + 0.14
    // First oscillator: t = 0.1
    const stopTime = mockCtx.oscillators[0].stop.mock.calls[0][0];
    expect(stopTime).toBeCloseTo(0.1 + 0.14, 2);
  });

  it('默认 pitchShift=1, decayMul=1 不改变行为', () => {
    RESOURCE_SYNTH.time(mockCtx as unknown as AudioContext, 0.1, 0.1);
    // synthTime 频率 ~2000 (±5%)
    const freq = mockCtx.oscillators[0].frequency.setValueAtTime.mock.calls[0][0];
    expect(freq).toBeGreaterThan(1890);
    expect(freq).toBeLessThan(2110);
  });
});

describe('强度调制 — 泛音增厚 + 衰减延展 (Story 33.3 Task 5)', () => {
  let mockCtx: ReturnType<typeof createMockAudioContext>;

  beforeEach(() => {
    mockCtx = createMockAudioContext(1.0);
    _chordInternals._setMockContext(mockCtx as unknown as AudioContext);
    _chordInternals.buffer.clear();
    _chordInternals.resetCooldown();
  });

  afterEach(() => {
    _chordInternals._setMockContext(null);
  });

  it('intensity=1.0 时不叠加泛音增厚层', async () => {
    emitResourceSound('base', 1.0, 0);
    await new Promise<void>(resolve => queueMicrotask(resolve));

    // synthBase 创建 1 oscillator + 1 bufferSource = 1 in oscillators[]
    // No addHarmonicLayer called → no extra triangle oscillator
    const triangleOscs = mockCtx.oscillators.filter((o: any) => o.type === 'triangle');
    // synthBase 自身有 1 个 triangle
    expect(triangleOscs).toHaveLength(1);
  });

  it('intensity=2.5 时叠加泛音增厚层（额外 triangle oscillator, 2 次谐波）', async () => {
    emitResourceSound('base', 2.5, 0);
    await new Promise<void>(resolve => queueMicrotask(resolve));

    // synthBase: 1 triangle + addHarmonicLayer: 1 triangle = 2 triangle total
    const triangleOscs = mockCtx.oscillators.filter((o: any) => o.type === 'triangle');
    expect(triangleOscs).toHaveLength(2);
    // 增厚层频率 = base 基频 120Hz × 2 = 240Hz (±5%)
    const harmonicFreq = triangleOscs[1].frequency.setValueAtTime.mock.calls[0][0];
    expect(harmonicFreq).toBeGreaterThan(227);
    expect(harmonicFreq).toBeLessThan(253);
  });

  it('decayMul 随 intensity 正确增长', async () => {
    const spy = vi.spyOn(RESOURCE_SYNTH, 'score');

    // intensity=4.0 → decayMul = 1 + log₂(4) * 0.3 = 1 + 2 * 0.3 = 1.6
    emitResourceSound('score', 4.0, 0);
    await new Promise<void>(resolve => queueMicrotask(resolve));

    expect(spy).toHaveBeenCalledTimes(1);
    const decayMul = spy.mock.calls[0][4];
    expect(decayMul).toBeCloseTo(1.6, 2);

    spy.mockRestore();
  });

  it('多资源不同 chainDepth 和弦：各自独立 stagger 和 pitchShift', async () => {
    const spyBase = vi.spyOn(RESOURCE_SYNTH, 'base');
    const spyScore = vi.spyOn(RESOURCE_SYNTH, 'score');
    const spyGold = vi.spyOn(RESOURCE_SYNTH, 'gold');

    emitResourceSound('base', 1.0, 0);
    emitResourceSound('score', 1.0, 2);
    emitResourceSound('gold', 1.0, 5);
    await new Promise<void>(resolve => queueMicrotask(resolve));

    // base: depth=0, stagger=0, pitchShift=1
    expect(spyBase.mock.calls[0][1]).toBeCloseTo(1.0, 3);
    expect(spyBase.mock.calls[0][3]).toBeCloseTo(1.0, 3);

    // score: depth=2, stagger=2*0.015=0.03, pitchShift=2^(2/12)
    expect(spyScore.mock.calls[0][1]).toBeCloseTo(1.0 + 0.03, 3);
    expect(spyScore.mock.calls[0][3]).toBeCloseTo(2 ** (2 / 12), 3);

    // gold: depth=5, stagger=5*0.015=0.075, pitchShift=2^(5/12)
    expect(spyGold.mock.calls[0][1]).toBeCloseTo(1.0 + 0.075, 3);
    expect(spyGold.mock.calls[0][3]).toBeCloseTo(2 ** (5 / 12), 3);

    spyBase.mockRestore();
    spyScore.mockRestore();
    spyGold.mockRestore();
  });

  it('intensity < 1 时 decayMul=1（log₂ 不产生负值）', async () => {
    const spy = vi.spyOn(RESOURCE_SYNTH, 'time');

    emitResourceSound('time', 0.5, 0);
    await new Promise<void>(resolve => queueMicrotask(resolve));

    // max(0.5, 1) = 1 → log₂(1) = 0 → decayMul = 1
    const decayMul = spy.mock.calls[0][4];
    expect(decayMul).toBeCloseTo(1, 3);

    spy.mockRestore();
  });
});

// ============================================================
// Story 33.4 Task 1 — 混音平衡：音量比例校准
// ============================================================
describe('混音平衡 — 音量比例 (Story 33.4 Task 1)', () => {
  beforeEach(() => {
    const mockCtx = createMockAudioContext(1.0);
    _chordInternals._setMockContext(mockCtx as unknown as AudioContext);
    _chordInternals.resetCooldown();
  });

  afterEach(() => {
    _chordInternals._setMockContext(null);
  });

  it('5 资源满载和弦的 RMS ≤ 0.03', async () => {
    const spies = {
      base: vi.spyOn(RESOURCE_SYNTH, 'base'),
      score: vi.spyOn(RESOURCE_SYNTH, 'score'),
      multiplier: vi.spyOn(RESOURCE_SYNTH, 'multiplier'),
      time: vi.spyOn(RESOURCE_SYNTH, 'time'),
      gold: vi.spyOn(RESOURCE_SYNTH, 'gold'),
    };

    // 5 资源满载
    emitResourceSound('base', 1.0);
    emitResourceSound('score', 1.0);
    emitResourceSound('multiplier', 1.0);
    emitResourceSound('time', 1.0);
    emitResourceSound('gold', 1.0);
    await new Promise<void>(resolve => queueMicrotask(resolve));

    // 收集所有 synth vol 参数 — 必须全部被调用
    const vols = Object.values(spies).map(s => {
      expect(s).toHaveBeenCalled();
      return s.mock.calls[0][2];
    });
    const rms = Math.sqrt(vols.reduce((sum, v) => sum + v * v, 0));
    expect(rms).toBeLessThanOrEqual(0.03 + 1e-6);

    Object.values(spies).forEach(s => s.mockRestore());
  });

  it('CHORD_BASE_VOL 和 CHORD_MAX_RMS 常量值正确', () => {
    const internals = _chordInternals;
    expect(internals.CHORD_BASE_VOL).toBeCloseTo(0.04, 3);
    expect(internals.CHORD_MAX_RMS).toBeCloseTo(0.03, 3);
  });
});

// ============================================================
// Story 33.4 Task 2 — 侧链回避：playScoreSound ducking
// ============================================================
describe('侧链回避 — playScoreSound ducking (Story 33.4 Task 2)', () => {
  let mockCtx: ReturnType<typeof createMockAudioContext>;

  beforeEach(() => {
    mockCtx = createMockAudioContext(1.0);
    _chordInternals._setMockContext(mockCtx as unknown as AudioContext);
    _chordInternals.resetCooldown();
    _chordInternals._setScoreSoundActive(false);
  });

  afterEach(() => {
    _chordInternals._setMockContext(null);
    _chordInternals._setScoreSoundActive(false);
  });

  it('playScoreSound 激活期间 flush 的 synth vol 降半（-6dB）', async () => {
    const spy = vi.spyOn(RESOURCE_SYNTH, 'base');

    emitResourceSound('base', 1.0);
    // 模拟 playScoreSound 设置标志
    _chordInternals._setScoreSoundActive(true);
    await new Promise<void>(resolve => queueMicrotask(resolve));

    const volWithDuck = spy.mock.calls[0][2];

    spy.mockRestore();
    _chordInternals._setScoreSoundActive(false);

    // 重置冷却以允许再次 flush
    _chordInternals.resetCooldown();

    // 再次不带 ducking 触发
    const spy2 = vi.spyOn(RESOURCE_SYNTH, 'base');
    emitResourceSound('base', 1.0);
    await new Promise<void>(resolve => queueMicrotask(resolve));

    const volNoDuck = spy2.mock.calls[0][2];
    spy2.mockRestore();

    // ducked vol 应约为正常 vol 的一半
    expect(volWithDuck).toBeCloseTo(volNoDuck * 0.5, 4);
  });

  it('非激活期间 flush 音量不变（duckFactor=1.0）', async () => {
    const spy = vi.spyOn(RESOURCE_SYNTH, 'base');

    // 确保标志关闭
    _chordInternals._setScoreSoundActive(false);
    emitResourceSound('base', 1.0);
    await new Promise<void>(resolve => queueMicrotask(resolve));

    const vol = spy.mock.calls[0][2];
    // 单资源不带 duck 因子，duckFactor=1.0
    expect(vol).toBeGreaterThan(0);

    spy.mockRestore();
  });

  it('标志在 microtask 后自动复位', async () => {
    // 直接调用 playScoreSound — 它会设置标志并 queueMicrotask 复位
    playScoreSound(100);

    // 同步阶段标志应为 true
    expect(_chordInternals.scoreSoundActive).toBe(true);

    // 等待 microtask 执行
    await new Promise<void>(resolve => queueMicrotask(resolve));

    // 标志应复位
    expect(_chordInternals.scoreSoundActive).toBe(false);
  });
});
