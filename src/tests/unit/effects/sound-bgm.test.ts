// ============================================
// 打字肉鸽 - BGM 多轨播放 + 张力系统测试
// ============================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  startBGM,
  stopBGM,
  _chordInternals,
} from '../../../src/effects/sound';

// Mock state
const mockState = vi.hoisted(() => ({ combo: 0, player: { relics: new Set() } }));
vi.mock('../../../src/core/state', () => ({
  state: mockState,
  synergy: {},
}));

vi.mock('../../../src/effects/juice', () => ({
  getScoreSoundTier: () => 0,
}));

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

/** 创建 mock AudioContext（含 fetch + decodeAudioData mock） */
function createMockAudioContext(initialTime = 0.1) {
  const oscillators: any[] = [];
  const gains: any[] = [];
  const filters: any[] = [];
  const bufferSources: any[] = [];

  const createAudioParam = () => ({
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    connect: vi.fn(),
    value: 0,
  });

  const mockBuffer = { duration: 250, length: 44100 * 250, sampleRate: 44100 } as unknown as AudioBuffer;
  const mockBufferChill = { duration: 180, length: 44100 * 180, sampleRate: 44100 } as unknown as AudioBuffer;

  const ctx = {
    get currentTime() { return initialTime; },
    sampleRate: 44100,
    createOscillator: vi.fn(() => {
      const osc = {
        type: 'sine' as string,
        frequency: createAudioParam(),
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      oscillators.push(osc);
      return osc;
    }),
    createGain: vi.fn(() => {
      const g = {
        gain: createAudioParam(),
        connect: vi.fn(),
      };
      gains.push(g);
      return g;
    }),
    createBufferSource: vi.fn(() => {
      const src = {
        buffer: null,
        loop: false,
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      bufferSources.push(src);
      return src;
    }),
    createBiquadFilter: vi.fn(() => {
      const f = {
        type: 'lowpass' as string,
        frequency: createAudioParam(),
        Q: createAudioParam(),
        connect: vi.fn(),
      };
      filters.push(f);
      return f;
    }),
    createBuffer: vi.fn(() => ({
      getChannelData: () => new Float32Array(44100),
    })),
    decodeAudioData: vi.fn().mockResolvedValue(mockBuffer),
    destination: {},
    oscillators,
    gains,
    filters,
    bufferSources,
    mockBuffer,
    mockBufferChill,
  };
  return ctx;
}

type MockCtx = ReturnType<typeof createMockAudioContext>;

/** 创建包含 battle 和 chill 的 buffer map */
function createBufferMap(mockCtx: MockCtx): Map<string, AudioBuffer> {
  const map = new Map<string, AudioBuffer>();
  map.set('battle', mockCtx.mockBuffer);
  map.set('chill', mockCtx.mockBufferChill);
  return map;
}

// ============================================================
// BGM 多轨播放
// ============================================================
describe('BGM 多轨播放 — BufferSource + LPF + Gain + 交叉淡化', () => {
  let mockCtx: MockCtx;

  beforeEach(() => {
    mockCtx = createMockAudioContext(1.0);
    _chordInternals._setMockContext(mockCtx as unknown as AudioContext);
    _chordInternals._setBgmBuffers(createBufferMap(mockCtx));
  });

  afterEach(() => {
    _chordInternals._stopBGMImmediate();
    _chordInternals._setBgmBuffers(new Map());
    _chordInternals._setMockContext(null);
  });

  it('startBGM("battle") 创建 BufferSource (loop=true) + LPF(800Hz) + Gain 淡入到 0.15', async () => {
    await startBGM('battle');

    // 1 个 bufferSource
    expect(mockCtx.bufferSources).toHaveLength(1);
    const src = mockCtx.bufferSources[0];
    expect(src.loop).toBe(true);
    expect(src.buffer).toBe(mockCtx.mockBuffer);
    expect(src.start).toHaveBeenCalledWith(1.0);

    // 1 个 lowpass filter
    expect(mockCtx.filters).toHaveLength(1);
    const lpf = mockCtx.filters[0];
    expect(lpf.type).toBe('lowpass');
    expect(lpf.frequency.setValueAtTime).toHaveBeenCalledWith(800, 1.0);

    // gain: 从 0 淡入到 0.15
    expect(mockCtx.gains).toHaveLength(1);
    const gain = mockCtx.gains[0];
    expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0, 1.0);
    expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.15, 1.5);

    // 信号链: source → LPF → gain → output
    expect(src.connect).toHaveBeenCalledWith(lpf);
    expect(lpf.connect).toHaveBeenCalledWith(gain);
    expect(gain.connect).toHaveBeenCalled();

    expect(_chordInternals.currentTrack).toBe('battle');
  });

  it('startBGM("chill") 使用 chill buffer + LPF(20000Hz) + 淡入到 0.18', async () => {
    await startBGM('chill');

    const src = mockCtx.bufferSources[0];
    expect(src.buffer).toBe(mockCtx.mockBufferChill);

    const lpf = mockCtx.filters[0];
    expect(lpf.frequency.setValueAtTime).toHaveBeenCalledWith(20000, 1.0);

    const gain = mockCtx.gains[0];
    expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0, 1.0);
    expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.18, 1.5);

    expect(_chordInternals.currentTrack).toBe('chill');
  });

  it('同曲重复调用跳过（幂等）', async () => {
    await startBGM('battle');
    await startBGM('battle');
    await startBGM('battle');

    expect(mockCtx.bufferSources).toHaveLength(1);
    expect(_chordInternals.droneActive).toBe(true);
    expect(_chordInternals.currentTrack).toBe('battle');
  });

  it('交叉淡化：battle→chill 旧曲淡出 + 新曲淡入', async () => {
    await startBGM('battle');
    expect(mockCtx.bufferSources).toHaveLength(1);

    await startBGM('chill');

    // 旧曲淡出
    const oldGain = mockCtx.gains[0];
    expect(oldGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 1.5);
    const oldSrc = mockCtx.bufferSources[0];
    expect(oldSrc.stop).toHaveBeenCalledWith(1.55);

    // 新曲淡入
    expect(mockCtx.bufferSources).toHaveLength(2);
    const newSrc = mockCtx.bufferSources[1];
    expect(newSrc.buffer).toBe(mockCtx.mockBufferChill);
    expect(newSrc.loop).toBe(true);

    const newGain = mockCtx.gains[1];
    expect(newGain.gain.setValueAtTime).toHaveBeenCalledWith(0, 1.0);
    expect(newGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.18, 1.5);

    expect(_chordInternals.currentTrack).toBe('chill');
  });

  it('交叉淡化重置 tensionLevel', async () => {
    await startBGM('battle');
    _chordInternals._updateBGMTension(3);
    expect(_chordInternals.tensionLevel).toBe(3);

    await startBGM('chill');
    expect(_chordInternals.tensionLevel).toBe(0);
  });

  it('startBGM 在无 audioContext 时 return（不崩溃）', async () => {
    _chordInternals._setMockContext(null);
    await expect(startBGM('battle')).resolves.not.toThrow();
    expect(_chordInternals.droneActive).toBe(false);
  });

  // ---- stopBGM ----

  it('stopBGM 执行 500ms fadeout 并 stop source + 重置 currentTrack', async () => {
    await startBGM('battle');
    stopBGM();

    const gain = mockCtx.gains[0];
    expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 1.5);

    const src = mockCtx.bufferSources[0];
    expect(src.stop).toHaveBeenCalledWith(1.55);

    expect(_chordInternals.droneActive).toBe(false);
    expect(_chordInternals.currentTrack).toBeNull();
  });

  it('stopBGM 后可重新 startBGM', async () => {
    await startBGM('battle');
    stopBGM();
    expect(_chordInternals.droneActive).toBe(false);

    await startBGM('battle');
    expect(_chordInternals.droneActive).toBe(true);
    expect(mockCtx.bufferSources).toHaveLength(2);
  });

  it('未启动时 stopBGM 为空操作', () => {
    expect(() => stopBGM()).not.toThrow();
    expect(_chordInternals.droneActive).toBe(false);
  });
});

// ============================================================
// Kick 脉冲（柔化 triangle）
// ============================================================
describe('BGM Kick 脉冲 — 柔化 triangle', () => {
  let mockCtx: MockCtx;

  beforeEach(() => {
    mockCtx = createMockAudioContext(1.0);
    _chordInternals._setMockContext(mockCtx as unknown as AudioContext);
    mockState.combo = 10;
  });

  afterEach(() => {
    _chordInternals._setMockContext(null);
    mockState.combo = 0;
  });

  it('kick 创建 triangle oscillator 频率 60→35Hz', () => {
    _chordInternals._playKickPulse();

    expect(mockCtx.oscillators).toHaveLength(1);
    const osc = mockCtx.oscillators[0];
    expect(osc.type).toBe('triangle');
    expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(60, 1.0);
    expect(osc.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(35, 1.03);
  });

  it('kick 衰减 30ms', () => {
    _chordInternals._playKickPulse();

    const gain = mockCtx.gains[0];
    expect(gain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, 1.03);
    expect(mockCtx.oscillators[0].stop).toHaveBeenCalledWith(1.035);
  });

  it('combo=0 不创建 oscillator', () => {
    mockState.combo = 0;
    _chordInternals._playKickPulse();
    expect(mockCtx.oscillators).toHaveLength(0);
  });

  it('combo=5 时音量 = 0.005', () => {
    mockState.combo = 5;
    _chordInternals._playKickPulse();
    expect(mockCtx.gains[0].gain.setValueAtTime).toHaveBeenCalledWith(0.005, 1.0);
  });

  it('combo=15 时音量封顶 0.007', () => {
    mockState.combo = 15;
    _chordInternals._playKickPulse();
    expect(mockCtx.gains[0].gain.setValueAtTime).toHaveBeenCalledWith(0.007, 1.0);
  });

  it('连续 3 次 playKickPulse，前两个被 stop', () => {
    _chordInternals._playKickPulse();
    _chordInternals._playKickPulse();
    _chordInternals._playKickPulse();

    expect(mockCtx.oscillators).toHaveLength(3);
    expect(mockCtx.oscillators[0].stop).toHaveBeenCalledTimes(2);
    expect(mockCtx.oscillators[1].stop).toHaveBeenCalledTimes(2);
    expect(_chordInternals.kickActive).toBe(true);
  });

  it('快速连续触发不崩溃', () => {
    expect(() => {
      for (let i = 0; i < 10; i++) {
        _chordInternals._playKickPulse();
      }
    }).not.toThrow();
  });
});

// ============================================================
// 张力系统 — LPF + Gain 驱动
// ============================================================
describe('BGM 张力系统 — LPF + Gain 驱动', () => {
  let mockCtx: MockCtx;

  beforeEach(async () => {
    mockCtx = createMockAudioContext(1.0);
    _chordInternals._setMockContext(mockCtx as unknown as AudioContext);
    _chordInternals._setBgmBuffers(createBufferMap(mockCtx));
    await startBGM('battle');
  });

  afterEach(() => {
    _chordInternals._stopBGMImmediate();
    _chordInternals._setBgmBuffers(new Map());
    _chordInternals._setMockContext(null);
  });

  // ---- 状态管理 ----

  it('同 level 重复调用为空操作', () => {
    _chordInternals._updateBGMTension(2);
    const lpfRampCount = mockCtx.filters[0].frequency.linearRampToValueAtTime.mock.calls.length;
    _chordInternals._updateBGMTension(2);
    expect(mockCtx.filters[0].frequency.linearRampToValueAtTime.mock.calls.length).toBe(lpfRampCount);
  });

  it('BGM 未启动时不调整参数，仅记录 level', () => {
    _chordInternals._stopBGMImmediate();
    // 需要重新设置 currentTrack 为 battle 以通过守卫
    // stopBGMImmediate 已重置 currentTrack，所以 updateBGMTension 会被守卫拦截
    // 直接验证 tensionLevel 不变
    _chordInternals._updateBGMTension(2);
    expect(_chordInternals.tensionLevel).toBe(0);
  });

  // ---- Level 2: LPF 打开 ----

  it('level 2: LPF→2000Hz, padVol→0.20, 800ms ramp', () => {
    _chordInternals._updateBGMTension(2);

    const lpf = mockCtx.filters[0];
    expect(lpf.frequency.linearRampToValueAtTime).toHaveBeenCalledWith(2000, 1.8);

    const gain = mockCtx.gains[0];
    expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.20, 1.8);
  });

  // ---- Level 3 ----

  it('level 3: LPF→4000Hz, padVol→0.25, 600ms ramp', () => {
    _chordInternals._updateBGMTension(3);

    const lpf = mockCtx.filters[0];
    expect(lpf.frequency.linearRampToValueAtTime).toHaveBeenCalledWith(4000, 1.6);

    const gain = mockCtx.gains[0];
    expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.25, 1.6);
  });

  // ---- Level 4 ----

  it('level 4: LPF→6000Hz, padVol→0.30, 400ms ramp', () => {
    _chordInternals._updateBGMTension(4);

    const lpf = mockCtx.filters[0];
    expect(lpf.frequency.linearRampToValueAtTime).toHaveBeenCalledWith(6000, 1.4);

    const gain = mockCtx.gains[0];
    expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.30, 1.4);
  });

  // ---- 回退 ----

  it('level 2→0: 恢复基线参数 LPF=800, vol=0.15', () => {
    _chordInternals._updateBGMTension(2);
    _chordInternals._updateBGMTension(0);

    const lpf = mockCtx.filters[0];
    const rampCalls = lpf.frequency.linearRampToValueAtTime.mock.calls;
    expect(rampCalls[rampCalls.length - 1][0]).toBe(800);

    expect(_chordInternals.tensionLevel).toBe(0);
  });

  it('张力升降不创建额外节点', () => {
    expect(mockCtx.bufferSources).toHaveLength(1);
    expect(mockCtx.filters).toHaveLength(1);

    _chordInternals._updateBGMTension(2);
    _chordInternals._updateBGMTension(3);
    _chordInternals._updateBGMTension(4);
    _chordInternals._updateBGMTension(0);

    // 不应创建任何新节点
    expect(mockCtx.bufferSources).toHaveLength(1);
    expect(mockCtx.filters).toHaveLength(1);
  });

  // ---- 释放 ----

  it('releaseBGMTension: 200ms 快速恢复基线', () => {
    _chordInternals._updateBGMTension(3);
    _chordInternals._releaseBGMTension();

    const lpf = mockCtx.filters[0];
    const lpfRamps = lpf.frequency.linearRampToValueAtTime.mock.calls;
    expect(lpfRamps[lpfRamps.length - 1]).toEqual([800, 1.2]);

    const gain = mockCtx.gains[0];
    const gainRamps = gain.gain.linearRampToValueAtTime.mock.calls;
    expect(gainRamps[gainRamps.length - 1]).toEqual([0.15, 1.2]);

    expect(_chordInternals.tensionLevel).toBe(0);
  });

  it('releaseBGMTension: BGM 未启动时为空操作', () => {
    _chordInternals._stopBGMImmediate();
    expect(() => _chordInternals._releaseBGMTension()).not.toThrow();
  });

  // ---- 张力守卫：仅对 battle 曲生效 ----

  it('chill 曲目时 updateBGMTension 为空操作', async () => {
    _chordInternals._stopBGMImmediate();
    _chordInternals._setBgmBuffers(createBufferMap(mockCtx));
    await startBGM('chill');

    const filterCount = mockCtx.filters.length;
    const lastFilter = mockCtx.filters[filterCount - 1];
    const rampsBefore = lastFilter.frequency.linearRampToValueAtTime.mock.calls.length;

    _chordInternals._updateBGMTension(3);

    expect(lastFilter.frequency.linearRampToValueAtTime.mock.calls.length).toBe(rampsBefore);
    expect(_chordInternals.tensionLevel).toBe(0);
  });

  it('chill 曲目时 releaseBGMTension 为空操作', async () => {
    _chordInternals._stopBGMImmediate();
    _chordInternals._setBgmBuffers(createBufferMap(mockCtx));
    await startBGM('chill');

    expect(() => _chordInternals._releaseBGMTension()).not.toThrow();
  });
});
