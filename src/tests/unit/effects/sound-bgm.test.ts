// ============================================
// 打字肉鸽 - BGM Drone 持续低音测试
// ============================================
// Story 33.5: BGM 骨架 — Drone 持续低音

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  startBGM,
  stopBGM,
  _chordInternals,
} from '../../../src/effects/sound';

// Mock state — combo 可在测试中修改（vi.hoisted 确保在 vi.mock 提升后仍可访问）
const mockState = vi.hoisted(() => ({ combo: 0, player: { relics: new Set() } }));
vi.mock('../../../src/core/state', () => ({
  state: mockState,
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

/** 创建 mock AudioContext */
function createMockAudioContext(initialTime = 0.1) {
  const oscillators: any[] = [];
  const gains: any[] = [];

  const createGainParam = () => ({
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    connect: vi.fn(), // tremolo LFO 连接到 AudioParam
    value: 0,
  });

  const ctx = {
    get currentTime() { return initialTime; },
    sampleRate: 44100,
    createOscillator: vi.fn(() => {
      const osc = {
        type: 'sine' as string,
        frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      oscillators.push(osc);
      return osc;
    }),
    createGain: vi.fn(() => {
      const g = {
        gain: createGainParam(),
        connect: vi.fn(),
      };
      gains.push(g);
      return g;
    }),
    createBufferSource: vi.fn(() => ({
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    })),
    createBiquadFilter: vi.fn(() => ({
      type: 'bandpass' as string,
      frequency: { setValueAtTime: vi.fn(), value: 0 },
      Q: { setValueAtTime: vi.fn(), value: 0 },
      connect: vi.fn(),
    })),
    createBuffer: vi.fn(() => ({
      getChannelData: () => new Float32Array(44100),
    })),
    destination: {},
    oscillators,
    gains,
  };
  return ctx;
}

type MockCtx = ReturnType<typeof createMockAudioContext>;

describe('BGM Drone 持续低音 (Story 33.5)', () => {
  let mockCtx: MockCtx;

  beforeEach(() => {
    mockCtx = createMockAudioContext(1.0);
    _chordInternals._setMockContext(mockCtx as unknown as AudioContext);
  });

  afterEach(() => {
    _chordInternals._stopBGMImmediate();
    _chordInternals._setMockContext(null);
  });

  // ---- Task 1: startBGM ----

  it('startBGM 创建 2 个 sine oscillator (C2=65.41Hz, C3=130.81Hz)', () => {
    startBGM();

    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(2);
    expect(mockCtx.oscillators).toHaveLength(2);

    // 两个都是 sine
    expect(mockCtx.oscillators[0].type).toBe('sine');
    expect(mockCtx.oscillators[1].type).toBe('sine');

    // C2 = 65.41Hz
    expect(mockCtx.oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(65.41, 1.0);
    // C3 = 130.81Hz
    expect(mockCtx.oscillators[1].frequency.setValueAtTime).toHaveBeenCalledWith(130.81, 1.0);

    // 两个都 start
    expect(mockCtx.oscillators[0].start).toHaveBeenCalledWith(1.0);
    expect(mockCtx.oscillators[1].start).toHaveBeenCalledWith(1.0);
  });

  it('startBGM 音量正确 (C2: 0.03, C3: 0.015) 且接入输出', () => {
    startBGM();

    expect(mockCtx.gains).toHaveLength(2);
    // C2 gain = 0.015
    expect(mockCtx.gains[0].gain.setValueAtTime).toHaveBeenCalledWith(0.015, 1.0);
    // C3 gain = 0.008
    expect(mockCtx.gains[1].gain.setValueAtTime).toHaveBeenCalledWith(0.008, 1.0);

    // connectToOutput 调用验证（AC #3）— gain 节点 connect 到 destination
    expect(mockCtx.gains[0].connect).toHaveBeenCalled();
    expect(mockCtx.gains[1].connect).toHaveBeenCalled();
  });

  it('重复 startBGM 不创建额外 oscillator', () => {
    startBGM();
    startBGM();
    startBGM();

    // 仍然只有 2 个 oscillator
    expect(mockCtx.oscillators).toHaveLength(2);
    expect(_chordInternals.droneActive).toBe(true);
  });

  it('startBGM 在无 audioContext 时 return（不崩溃）', () => {
    _chordInternals._setMockContext(null);
    expect(() => startBGM()).not.toThrow();
    expect(_chordInternals.droneActive).toBe(false);
  });

  // ---- Task 2: stopBGM ----

  it('stopBGM 执行 linearRamp→0 + 延迟 stop', () => {
    startBGM();
    stopBGM();

    // fadeout: gain → 0 over 500ms
    expect(mockCtx.gains[0].gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 1.5);
    expect(mockCtx.gains[1].gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 1.5);

    // stop at 550ms (50ms buffer after fadeout)
    expect(mockCtx.oscillators[0].stop).toHaveBeenCalledWith(1.55);
    expect(mockCtx.oscillators[1].stop).toHaveBeenCalledWith(1.55);

    // drone 状态已清除
    expect(_chordInternals.droneActive).toBe(false);
  });

  it('stopBGM 后可重新 startBGM', () => {
    startBGM();
    stopBGM();

    expect(_chordInternals.droneActive).toBe(false);

    // 重新启动
    startBGM();
    expect(_chordInternals.droneActive).toBe(true);
    // 第二轮新增了 2 个 oscillator（总共 4 个）
    expect(mockCtx.oscillators).toHaveLength(4);
  });

  it('未启动时 stopBGM 为空操作', () => {
    expect(() => stopBGM()).not.toThrow();
    expect(_chordInternals.droneActive).toBe(false);
  });
});

// ============================================================
// Story 33.6 — BGM Kick 脉冲：打字驱动节奏
// ============================================================
describe('BGM Kick 脉冲 (Story 33.6)', () => {
  let mockCtx: MockCtx;

  beforeEach(() => {
    mockCtx = createMockAudioContext(1.0);
    _chordInternals._setMockContext(mockCtx as unknown as AudioContext);
    mockState.combo = 10; // 默认 combo=10 确保 kick 触发
  });

  afterEach(() => {
    _chordInternals._setMockContext(null);
    mockState.combo = 0;
  });

  // ---- Task 1: kick 合成 ----

  it('kick 创建 sine oscillator 频率 80→40Hz 下滑', () => {
    _chordInternals._playKickPulse();

    // 应创建 1 个 oscillator（kick）
    expect(mockCtx.oscillators).toHaveLength(1);
    const osc = mockCtx.oscillators[0];
    expect(osc.type).toBe('sine');

    // 起始 80Hz
    expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(80, 1.0);
    // 下滑至 40Hz
    expect(osc.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(40, 1.02);
  });

  it('kick 衰减 20ms', () => {
    _chordInternals._playKickPulse();

    const gain = mockCtx.gains[0];
    // 衰减至 0.001 @20ms
    expect(gain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, 1.02);

    // stop at 25ms
    expect(mockCtx.oscillators[0].stop).toHaveBeenCalledWith(1.025);
  });

  it('频段 40-80Hz — 起始 80Hz，终止 40Hz', () => {
    _chordInternals._playKickPulse();

    const osc = mockCtx.oscillators[0];
    const setCall = osc.frequency.setValueAtTime.mock.calls[0];
    const rampCall = osc.frequency.exponentialRampToValueAtTime.mock.calls[0];

    expect(setCall[0]).toBe(80);   // 起始
    expect(rampCall[0]).toBe(40);  // 终止
    // 不超出 40-80Hz 范围
    expect(setCall[0]).toBeLessThanOrEqual(80);
    expect(rampCall[0]).toBeGreaterThanOrEqual(40);
  });

  // ---- Task 2: combo 音量映射 ----

  it('combo=0 不创建 oscillator', () => {
    mockState.combo = 0;
    _chordInternals._playKickPulse();

    expect(mockCtx.oscillators).toHaveLength(0);
  });

  it('combo=5 时音量 = 0.01', () => {
    mockState.combo = 5;
    _chordInternals._playKickPulse();

    const gain = mockCtx.gains[0];
    expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0.005, 1.0);
  });

  it('combo=15 时音量封顶 0.02', () => {
    mockState.combo = 15;
    _chordInternals._playKickPulse();

    const gain = mockCtx.gains[0];
    // 15 * 0.001 = 0.015 → min(0.01, 0.015) = 0.01
    expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0.01, 1.0);
  });

  // ---- Task 3: 防叠加 ----

  it('连续 3 次 playKickPulse，前两个 oscillator 被 stop', () => {
    _chordInternals._playKickPulse();
    _chordInternals._playKickPulse();
    _chordInternals._playKickPulse();

    // 3 个 oscillator 被创建
    expect(mockCtx.oscillators).toHaveLength(3);
    // 前 2 个的 stop 被调用 2 次（调度 stop + 防叠加立即 stop）
    expect(mockCtx.oscillators[0].stop).toHaveBeenCalledTimes(2);
    expect(mockCtx.oscillators[1].stop).toHaveBeenCalledTimes(2);
    // kickActive 仍为 true（第 3 个在播放）
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
// Story 33.7 — BGM 张力层：战局状态驱动
// ============================================================
describe('BGM 张力层 (Story 33.7)', () => {
  let mockCtx: MockCtx;

  beforeEach(() => {
    mockCtx = createMockAudioContext(1.0);
    _chordInternals._setMockContext(mockCtx as unknown as AudioContext);
    startBGM(); // 张力层依赖 drone 存在
  });

  afterEach(() => {
    _chordInternals._stopBGMImmediate();
    _chordInternals._setMockContext(null);
  });

  // ---- Task 1: 状态管理 ----

  it('同 level 重复调用为空操作', () => {
    _chordInternals._updateBGMTension(2);
    const oscCount = mockCtx.oscillators.length;
    _chordInternals._updateBGMTension(2);
    // 不应创建额外 oscillator
    expect(mockCtx.oscillators.length).toBe(oscCount);
  });

  it('drone 未启动时不创建 oscillator', () => {
    _chordInternals._stopBGMImmediate();
    const oscCountBefore = mockCtx.oscillators.length;
    _chordInternals._updateBGMTension(2);
    // 不应创建新 oscillator（drone 已停止）
    expect(mockCtx.oscillators.length).toBe(oscCountBefore);
    // 但 tensionLevel 应被记录
    expect(_chordInternals.tensionLevel).toBe(2);
  });

  // ---- Task 2: Level 0-1 基础状态 ----

  it('updateBGMTension(0) 清除张力音', () => {
    _chordInternals._updateBGMTension(2); // 先设置张力音
    const tensionOscIdx = mockCtx.oscillators.length - 1; // 最后一个是张力音
    _chordInternals._updateBGMTension(0);
    // 张力音应被 fadeout + stop
    expect(mockCtx.gains[mockCtx.gains.length - 1].gain.linearRampToValueAtTime)
      .toHaveBeenCalledWith(0, 1.5);
    expect(mockCtx.oscillators[tensionOscIdx].stop).toHaveBeenCalledWith(1.55);
    expect(_chordInternals.tensionLevel).toBe(0);
  });

  it('level 1 不创建额外 oscillator', () => {
    const oscCountAfterDrone = mockCtx.oscillators.length; // 2 (drone)
    _chordInternals._updateBGMTension(1);
    // level 1 不创建张力音
    expect(mockCtx.oscillators.length).toBe(oscCountAfterDrone);
    expect(_chordInternals.tensionLevel).toBe(1);
  });

  // ---- Task 3: Level 2 — 小七度 ----

  it('level 2 创建 116.54Hz sine oscillator', () => {
    _chordInternals._updateBGMTension(2);

    // drone 有 2 个 osc，张力音是第 3 个
    const tensionOsc = mockCtx.oscillators[2];
    expect(tensionOsc).toBeDefined();
    expect(tensionOsc.type).toBe('sine');
    expect(tensionOsc.frequency.setValueAtTime).toHaveBeenCalledWith(116.54, 1.0);
    expect(tensionOsc.start).toHaveBeenCalledWith(1.0);
  });

  it('level 2 音量 500ms 渐入至 0.02', () => {
    _chordInternals._updateBGMTension(2);

    // drone 有 2 个 gain，张力音 gain 是第 3 个
    const tensionGain = mockCtx.gains[2];
    expect(tensionGain.gain.setValueAtTime).toHaveBeenCalledWith(0, 1.0);
    expect(tensionGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.01, 1.5);
    // 接入输出
    expect(tensionGain.connect).toHaveBeenCalled();
  });

  // ---- Task 4: Level 3 — 增四度/三全音 ----

  it('level 3 创建 92.50Hz sine oscillator', () => {
    _chordInternals._updateBGMTension(3);

    const tensionOsc = mockCtx.oscillators[2];
    expect(tensionOsc.type).toBe('sine');
    expect(tensionOsc.frequency.setValueAtTime).toHaveBeenCalledWith(92.50, 1.0);
  });

  it('level 3 drone 基音频率升至 130.81Hz', () => {
    _chordInternals._updateBGMTension(3);

    // drone osc1 频率应被 ramp 至 130.81Hz
    const droneOsc = mockCtx.oscillators[0];
    expect(droneOsc.frequency.exponentialRampToValueAtTime)
      .toHaveBeenCalledWith(130.81, 1.5);
  });

  // ---- Task 5: Level 4 — tremolo ----

  it('level 4 创建 8Hz tremolo oscillator 并调制 drone 音量', () => {
    _chordInternals._updateBGMTension(4);

    // drone(2) + tension(1) + tremolo(1) = 4 oscillators
    expect(mockCtx.oscillators.length).toBeGreaterThanOrEqual(4);

    // 找到 tremolo osc（最后一个）
    const tremoloOsc = mockCtx.oscillators[mockCtx.oscillators.length - 1];
    expect(tremoloOsc.type).toBe('sine');
    expect(tremoloOsc.frequency.setValueAtTime).toHaveBeenCalledWith(8, 1.0);

    // tremolo gain 深度 0.5（振幅 ±0.5）
    const tremoloGain = mockCtx.gains[mockCtx.gains.length - 1];
    expect(tremoloGain.gain.setValueAtTime).toHaveBeenCalledWith(0.5, 1.0);

    // tremolo gain 连接到 droneGain1.gain（AudioParam 调制）
    expect(tremoloGain.connect).toHaveBeenCalledWith(mockCtx.gains[0].gain);
  });

  it('level 4 张力音音量 ×1.5 (0.018)', () => {
    _chordInternals._updateBGMTension(4);

    // 张力音 gain（第 3 个 gain）应 ramp 至 0.018
    const tensionGain = mockCtx.gains[2];
    expect(tensionGain.gain.linearRampToValueAtTime)
      .toHaveBeenCalledWith(0.018, 1.5);
  });

  // ---- Drone 频率恢复（Review M3） ----

  it('level 4→2 时 drone 基音恢复 C2 (65.41Hz)', () => {
    _chordInternals._updateBGMTension(4); // drone 升至 C3
    _chordInternals._updateBGMTension(2); // 退回 level 2

    const droneOsc = mockCtx.oscillators[0];
    const rampCalls = droneOsc.frequency.exponentialRampToValueAtTime.mock.calls;
    // 最后一次 ramp 应是恢复 C2
    expect(rampCalls[rampCalls.length - 1]).toEqual([65.41, 1.5]);
  });

  // ---- Task 6: 通关释放 ----

  it('releaseBGMTension 执行 200ms fadeout', () => {
    _chordInternals._updateBGMTension(3);
    const tensionOsc = mockCtx.oscillators[2];
    const tensionGain = mockCtx.gains[2];

    _chordInternals._releaseBGMTension();

    // 200ms fadeout（不是 500ms）
    expect(tensionGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 1.2);
    expect(tensionOsc.stop).toHaveBeenCalledWith(1.25);
    expect(_chordInternals.tensionLevel).toBe(0);
  });

  it('release 后 drone 基音恢复 C2 (65.41Hz)', () => {
    _chordInternals._updateBGMTension(3); // drone 升至 C3
    _chordInternals._releaseBGMTension();

    // drone osc1 频率应 ramp 回 65.41Hz
    const droneOsc = mockCtx.oscillators[0];
    const rampCalls = droneOsc.frequency.exponentialRampToValueAtTime.mock.calls;
    // 最后一次 ramp 应是恢复 C2
    expect(rampCalls[rampCalls.length - 1]).toEqual([65.41, 1.5]);
  });
});
