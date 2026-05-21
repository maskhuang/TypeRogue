// ============================================
// 打字肉鸽 - 生成式底乐 (B 方案) 接线测试
// ============================================
// 验证 sound.ts 的公共 BGM API 正确驱动 GenerativeBed：
//   startBGM('battle') → 每关 coherence；startBGM('chill') → 平静；
//   updateBGMTension / releaseBGMTension 仅 battle 生效。

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  startBGM,
  stopBGM,
  updateBGMTension,
  releaseBGMTension,
  setMusicVolume,
  initAudio,
  _chordInternals,
} from '../../../src/effects/sound';
import { computeCoherence } from '../../../src/effects/generativeBed';
import { eventBus } from '../../../src/core/events/EventBus';

// Mock state — startBGM('battle') 读取 state.level 计算 coherence
const mockState = vi.hoisted(() => ({ combo: 0, level: 1, player: { relics: new Set() } }));
vi.mock('../../../src/core/state', () => ({
  state: mockState,
  synergy: {},
}));

vi.mock('../../../src/effects/juice', () => ({
  getScoreSoundTier: () => 0,
}));

/** mock AudioContext（含 destination + detune + setTargetAtTime） */
function createMockAudioContext(time = 1.0) {
  const oscillators: any[] = [];
  const gains: any[] = [];
  const filters: any[] = [];
  const bufferSources: any[] = [];

  const param = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    connect: vi.fn(),
  });

  return {
    get currentTime() { return time; },
    sampleRate: 44100,
    destination: {},
    createOscillator: vi.fn(() => {
      const o = { type: 'sine', frequency: param(), detune: param(), connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
      oscillators.push(o);
      return o;
    }),
    createGain: vi.fn(() => {
      const g = { gain: param(), connect: vi.fn() };
      gains.push(g);
      return g;
    }),
    createBiquadFilter: vi.fn(() => {
      const f = { type: 'lowpass', frequency: param(), Q: param(), connect: vi.fn() };
      filters.push(f);
      return f;
    }),
    createBufferSource: vi.fn(() => {
      const s = { buffer: null as any, loop: false, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
      bufferSources.push(s);
      return s;
    }),
    createBuffer: vi.fn(() => ({ getChannelData: () => new Float32Array(128) })),
    createDelay: vi.fn(() => ({ delayTime: param(), connect: vi.fn() })),
    oscillators,
    gains,
    filters,
    bufferSources,
  };
}

type MockCtx = ReturnType<typeof createMockAudioContext>;

describe('生成式底乐接线 — startBGM / stopBGM / tension', () => {
  let mockCtx: MockCtx;

  beforeEach(() => {
    mockCtx = createMockAudioContext(1.0);
    _chordInternals._setMockContext(mockCtx as unknown as AudioContext);
    mockState.level = 1;
  });

  afterEach(() => {
    stopBGM();
    _chordInternals._setMockContext(null);
  });

  // ---- 启停 ----

  it('startBGM("battle") 启动底乐', () => {
    startBGM('battle');
    expect(_chordInternals.bedActive).toBe(true);
    expect(_chordInternals.bedMode).toBe('battle');
    expect(mockCtx.oscillators.length).toBeGreaterThan(0);
  });

  it('startBGM 幂等（重复调用不重建振荡器）', () => {
    startBGM('battle');
    const n = mockCtx.oscillators.length;
    startBGM('battle');
    expect(mockCtx.oscillators.length).toBe(n);
  });

  it('stopBGM 停止底乐并清空 mode', () => {
    startBGM('battle');
    stopBGM();
    expect(_chordInternals.bedActive).toBe(false);
    expect(_chordInternals.bedMode).toBeNull();
  });

  it('无 audioContext 时 startBGM 不崩溃', () => {
    _chordInternals._setMockContext(null);
    expect(() => startBGM('battle')).not.toThrow();
    expect(_chordInternals.bedActive).toBe(false);
  });

  // ---- 每关 coherence（慢轴）----

  it('startBGM("battle") 用当前关号设置 coherence', () => {
    mockState.level = 12; // boss 关
    startBGM('battle');
    expect(_chordInternals.bedCoherence).toBeCloseTo(computeCoherence(12), 5);
  });

  it('不同关号 → 不同 coherence（逐关沉降）', () => {
    mockState.level = 2;
    startBGM('battle');
    const early = _chordInternals.bedCoherence;
    stopBGM();
    mockState.level = 24;
    startBGM('battle');
    const late = _chordInternals.bedCoherence;
    expect(late).toBeLessThan(early);
  });

  // ---- tension（快轴）----

  it('battle 模式下 updateBGMTension 生效', () => {
    startBGM('battle');
    updateBGMTension(3);
    expect(_chordInternals.bedTension).toBe(3);
  });

  it('chill 模式下 updateBGMTension 为空操作（张力仅 battle）', () => {
    startBGM('chill');
    updateBGMTension(3);
    expect(_chordInternals.bedTension).toBe(0);
  });

  it('startBGM("chill") 张力归零', () => {
    startBGM('battle');
    updateBGMTension(4);
    expect(_chordInternals.bedTension).toBe(4);
    startBGM('chill');
    expect(_chordInternals.bedTension).toBe(0);
    expect(_chordInternals.bedMode).toBe('chill');
  });

  it('releaseBGMTension 在 battle 下归零张力', () => {
    startBGM('battle');
    updateBGMTension(4);
    releaseBGMTension();
    expect(_chordInternals.bedTension).toBe(0);
  });

  it('未启动时 tension 调用安全', () => {
    expect(() => updateBGMTension(2)).not.toThrow();
    expect(() => releaseBGMTension()).not.toThrow();
  });

  // ---- 商店 duck ----

  it('shop:opened 事件把底乐电平调低', () => {
    startBGM('chill');
    expect(_chordInternals.bedLevel).toBe(1);
    eventBus.emit('shop:opened');
    expect(_chordInternals.bedLevel).toBe(0.5);
  });

  it('下一场战斗 startBGM("battle") 恢复满电平（撤销商店 duck）', () => {
    startBGM('chill');
    eventBus.emit('shop:opened');
    expect(_chordInternals.bedLevel).toBe(0.5);
    // bed 持续 active（start 幂等），靠 startBGM 显式复位
    startBGM('battle');
    expect(_chordInternals.bedLevel).toBe(1);
  });

  // ---- 音乐音量（独立于 master，仅底乐总线）----

  it('setMusicVolume 调节底乐总线音量，clamp 到 [0,1]', () => {
    startBGM('battle'); // 创建 bed + bgmBus
    setMusicVolume(0.3);
    expect(_chordInternals.bedMusicVolume).toBeCloseTo(0.3, 6);
    setMusicVolume(5);
    expect(_chordInternals.bedMusicVolume).toBe(1);
    setMusicVolume(-1);
    expect(_chordInternals.bedMusicVolume).toBe(0);
  });

  it('music 音量独立于 bed 电平/张力（互不干扰）', () => {
    startBGM('battle');
    setMusicVolume(0.4);
    updateBGMTension(3);
    eventBus.emit('shop:opened');
    // 三者各自记账
    expect(_chordInternals.bedMusicVolume).toBeCloseTo(0.4, 6);
    expect(_chordInternals.bedTension).toBe(3);
    expect(_chordInternals.bedLevel).toBe(0.5);
  });
});
