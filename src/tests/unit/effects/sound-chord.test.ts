// ============================================
// 打字肉鸽 - 资源音效系统测试
// ============================================
// Story 33.1: 和弦缓冲与合成器
// Story 33.2: 资源独立音色设计

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  RESOURCE_SYNTH,
  calculateRMSVolumes,
  emitResourceSound,
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
    expect(_chordInternals.buffer.get('base')).toBe(1.5);
  });

  it('同种资源多次 emit 取 max intensity', () => {
    emitResourceSound('base', 1.0);
    emitResourceSound('base', 2.5);
    emitResourceSound('base', 1.8);
    expect(_chordInternals.buffer.get('base')).toBe(2.5);
  });

  it('不同资源各自保留', () => {
    emitResourceSound('base', 1.0);
    emitResourceSound('score', 2.0);
    emitResourceSound('gold', 1.5);
    expect(_chordInternals.buffer.size).toBe(3);
    expect(_chordInternals.buffer.get('base')).toBe(1.0);
    expect(_chordInternals.buffer.get('score')).toBe(2.0);
    expect(_chordInternals.buffer.get('gold')).toBe(1.5);
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
    expect(_chordInternals.buffer.get('base')).toBe(0);
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
    const result = calculateRMSVolumes([0.08]);
    expect(result).toEqual([0.08]);
  });

  it('多分量 RMS 不超限时不缩放', () => {
    const result = calculateRMSVolumes([0.08, 0.08]);
    expect(result[0]).toBeCloseTo(0.08);
    expect(result[1]).toBeCloseTo(0.08);
  });

  it('5 分量 RMS 超限时等比缩放', () => {
    // RMS(0.12×5) = sqrt(5×0.0144) = sqrt(0.072) ≈ 0.268 > 0.20
    const input = [0.12, 0.12, 0.12, 0.12, 0.12];
    const result = calculateRMSVolumes(input);
    const rms = Math.sqrt(result.reduce((s, v) => s + v * v, 0));
    expect(rms).toBeCloseTo(0.20, 2);
    const ratio = result[0] / result[1];
    expect(ratio).toBeCloseTo(1, 5);
  });

  it('不同分量音量超限时等比缩放', () => {
    const input = [0.15, 0.18, 0.12, 0.16, 0.13];
    const result = calculateRMSVolumes(input);
    const rms = Math.sqrt(result.reduce((s, v) => s + v * v, 0));
    expect(rms).toBeCloseTo(0.20, 2);
    expect(result[0] / result[1]).toBeCloseTo(input[0] / input[1], 4);
  });

  it('恰好等于上限时不缩放', () => {
    const result = calculateRMSVolumes([0.20]);
    expect(result[0]).toBeCloseTo(0.20);
  });

  it('单分量超限时缩放到上限', () => {
    const result = calculateRMSVolumes([0.4]);
    expect(result[0]).toBeCloseTo(0.20);
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
});
