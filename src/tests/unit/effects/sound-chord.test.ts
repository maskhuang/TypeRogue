// ============================================
// 打字肉鸽 - 资源和弦缓冲系统测试
// ============================================
// Story 33.1: 和弦缓冲与合成器

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  RESOURCE_FREQ,
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

describe('RESOURCE_FREQ 映射表 (Task 1)', () => {
  it('包含全部 5 种资源', () => {
    expect(Object.keys(RESOURCE_FREQ)).toHaveLength(5);
    expect(RESOURCE_FREQ).toHaveProperty('base');
    expect(RESOURCE_FREQ).toHaveProperty('score');
    expect(RESOURCE_FREQ).toHaveProperty('multiplier');
    expect(RESOURCE_FREQ).toHaveProperty('time');
    expect(RESOURCE_FREQ).toHaveProperty('gold');
  });

  it('五声音阶频率正确: C4/E4/G4/A4/C5', () => {
    expect(RESOURCE_FREQ.base).toBe(262);
    expect(RESOURCE_FREQ.score).toBe(330);
    expect(RESOURCE_FREQ.multiplier).toBe(392);
    expect(RESOURCE_FREQ.time).toBe(440);
    expect(RESOURCE_FREQ.gold).toBe(523);
  });

  it('频率递增排列', () => {
    const freqs = ['base', 'score', 'multiplier', 'time', 'gold'].map(r => RESOURCE_FREQ[r]);
    for (let i = 1; i < freqs.length; i++) {
      expect(freqs[i]).toBeGreaterThan(freqs[i - 1]);
    }
  });
});

describe('emitResourceSound 缓冲逻辑 (Task 2)', () => {
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
    // queueMicrotask 只在第一次 emit 时调用
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

describe('calculateRMSVolumes (Task 3 - RMS)', () => {
  it('空数组返回空', () => {
    expect(calculateRMSVolumes([])).toEqual([]);
  });

  it('单分量不超限时不缩放', () => {
    const result = calculateRMSVolumes([0.08]);
    expect(result).toEqual([0.08]);
  });

  it('多分量 RMS 不超限时不缩放', () => {
    // RMS(0.08, 0.08) = sqrt(0.0064+0.0064) = sqrt(0.0128) ≈ 0.113 < 0.15
    const result = calculateRMSVolumes([0.08, 0.08]);
    expect(result[0]).toBeCloseTo(0.08);
    expect(result[1]).toBeCloseTo(0.08);
  });

  it('5 分量 RMS 超限时等比缩放', () => {
    // RMS(0.08×5) = sqrt(5×0.0064) = sqrt(0.032) ≈ 0.179 > 0.15
    const input = [0.08, 0.08, 0.08, 0.08, 0.08];
    const result = calculateRMSVolumes(input);
    // 缩放后 RMS 应 ≈ 0.15
    const rms = Math.sqrt(result.reduce((s, v) => s + v * v, 0));
    expect(rms).toBeCloseTo(0.15, 2);
    // 各分量等比
    const ratio = result[0] / result[1];
    expect(ratio).toBeCloseTo(1, 5);
  });

  it('不同分量音量超限时等比缩放', () => {
    const input = [0.1, 0.12, 0.08, 0.11, 0.09];
    const result = calculateRMSVolumes(input);
    const rms = Math.sqrt(result.reduce((s, v) => s + v * v, 0));
    expect(rms).toBeCloseTo(0.15, 2);
    // 比例保持
    expect(result[0] / result[1]).toBeCloseTo(input[0] / input[1], 4);
  });

  it('恰好等于上限时不缩放', () => {
    // 单分量恰好 0.15
    const result = calculateRMSVolumes([0.15]);
    expect(result[0]).toBeCloseTo(0.15);
  });

  it('单分量超限时缩放到上限', () => {
    const result = calculateRMSVolumes([0.3]);
    expect(result[0]).toBeCloseTo(0.15);
  });
});

describe('flushResourceChord 行为 (Task 3 - 集成)', () => {
  // flushResourceChord 是内部函数，通过 queueMicrotask 触发
  // 我们通过 emitResourceSound + await microtask 间接测试

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

    // 等待 microtask 执行 (flushResourceChord)
    await new Promise<void>(resolve => queueMicrotask(resolve));

    expect(_chordInternals.buffer.size).toBe(0);
  });

  it('flush 后 scheduled 重置，允许新一轮缓冲', async () => {
    emitResourceSound('base', 1.0);
    await new Promise<void>(resolve => queueMicrotask(resolve));

    // 新一轮 emit 应能正常缓冲
    const spy = vi.spyOn(globalThis, 'queueMicrotask');
    emitResourceSound('score', 1.5);
    expect(spy).toHaveBeenCalled();
    expect(_chordInternals.buffer.size).toBe(1);
    spy.mockRestore();
  });

  it('冷却期内丢弃缓冲 (AC #6)', async () => {
    // 模拟 audioContext，使 flush 不提前返回
    const mockGainParam = {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    };
    const mockGain = { gain: mockGainParam, connect: vi.fn() };
    const mockOsc = {
      type: 'sine',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    const mockCtx = {
      currentTime: 0.1,
      createOscillator: () => mockOsc,
      createGain: () => mockGain,
      destination: {},
    } as unknown as AudioContext;
    _chordInternals._setMockContext(mockCtx);

    // 第一次 flush: 正常播放（设置 lastChordTime = 0.1）
    emitResourceSound('base', 1.0);
    await new Promise<void>(resolve => queueMicrotask(resolve));
    expect(_chordInternals.buffer.size).toBe(0);
    expect(mockOsc.start).toHaveBeenCalled();

    // 第二次 flush: 冷却期内（currentTime 仍为 0.1，间隔 0 < 0.08）
    mockOsc.start.mockClear();
    emitResourceSound('score', 1.0);
    await new Promise<void>(resolve => queueMicrotask(resolve));
    // 缓冲区被清空但不创建振荡器
    expect(_chordInternals.buffer.size).toBe(0);
    expect(mockOsc.start).not.toHaveBeenCalled();
  });

  it('冷却期过后正常播放', async () => {
    const mockGainParam = {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    };
    const mockGain = { gain: mockGainParam, connect: vi.fn() };
    const mockOsc = {
      type: 'sine',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    let currentTime = 0.1;
    const mockCtx = {
      get currentTime() { return currentTime; },
      createOscillator: () => mockOsc,
      createGain: () => mockGain,
      destination: {},
    } as unknown as AudioContext;
    _chordInternals._setMockContext(mockCtx);

    // 第一次 flush
    emitResourceSound('base', 1.0);
    await new Promise<void>(resolve => queueMicrotask(resolve));
    expect(mockOsc.start).toHaveBeenCalledTimes(1);

    // 推进时间超过冷却期
    currentTime = 0.2; // 0.2 - 0.1 = 0.1 > 0.08
    mockOsc.start.mockClear();
    emitResourceSound('score', 1.0);
    await new Promise<void>(resolve => queueMicrotask(resolve));
    expect(mockOsc.start).toHaveBeenCalledTimes(1);
  });
});
