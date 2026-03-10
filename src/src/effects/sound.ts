// ============================================
// 打字肉鸽 - 音效系统
// ============================================

import { SOUND_PROFILES } from '../core/constants';
import { state } from '../core/state';
import { getScoreSoundTier } from './juice';

let audioContext: AudioContext | null = null;

// === 打字三层音效：click（触底冲击）+ thock（壳体共鸣）+ tone（combo 积累感） ===
function playTypeSound(): void {
  if (!audioContext) return;
  const ctx = audioContext;
  const t = ctx.currentTime;
  const combo = state.combo;

  // 1) Click 层 — 极短噪声脉冲，模拟触底冲击
  const clickVol = randomize(Math.min(0.035, 0.02 + combo * 0.0005), 0.08); // combo 微升音量
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = getNoiseBuffer();
  const clickFilter = ctx.createBiquadFilter();
  clickFilter.type = 'highpass';
  clickFilter.frequency.value = randomize(800, 0.05);
  const clickGain = ctx.createGain();
  noiseSrc.connect(clickFilter);
  clickFilter.connect(clickGain);
  connectToOutput(clickGain);
  clickGain.gain.setValueAtTime(clickVol, t);
  clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.004); // 4ms 极短
  noiseSrc.start(t);
  noiseSrc.stop(t + 0.005);

  // 2) Thock 层 — 低频 triangle，给予"肉感"，combo 不影响
  const thockFreq = randomize(280, 0.06);
  const thockOsc = ctx.createOscillator();
  const thockGain = ctx.createGain();
  thockOsc.type = 'triangle';
  thockOsc.connect(thockGain);
  connectToOutput(thockGain);
  thockOsc.frequency.setValueAtTime(thockFreq, t);
  thockOsc.frequency.exponentialRampToValueAtTime(thockFreq * 0.6, t + 0.03);
  softAttack(thockGain, randomize(0.025, 0.08), t);
  thockGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  thockOsc.start(t);
  thockOsc.stop(t + 0.04);

  // 3) Tone 层 — 轻柔 sine，combo 驱动音高缓升，体现积累感
  const toneFreq = 300 + 400 * Math.log2(1 + combo * 0.06); // 300→~700Hz
  const toneVol = Math.min(0.025, 0.008 + combo * 0.0004);  // 极轻，陪衬
  const toneDec = 0.06;
  const toneOsc = ctx.createOscillator();
  const toneGain = ctx.createGain();
  toneOsc.type = 'sine';
  toneOsc.connect(toneGain);
  connectToOutput(toneGain);
  toneOsc.frequency.setValueAtTime(randomize(toneFreq, 0.03), t);
  softAttack(toneGain, toneVol, t);
  toneGain.gain.exponentialRampToValueAtTime(0.001, t + toneDec);
  toneOsc.start(t);
  toneOsc.stop(t + toneDec);
}

// === 随机化工具：每次播放微小随机偏移，避免完全相同的重复 ===
function randomize(value: number, range = 0.05): number {
  return value * (1 + (Math.random() * 2 - 1) * range);
}

// === soft attack: 5ms fade-in 代替硬起音 ===
function softAttack(gain: GainNode, vol: number, time: number): void {
  gain.gain.setValueAtTime(0.001, time);
  gain.gain.linearRampToValueAtTime(vol, time + 0.005);
}

// === 噪声缓冲区（预生成，复用）===
let noiseBuffer: AudioBuffer | null = null;
function getNoiseBuffer(): AudioBuffer {
  if (noiseBuffer && audioContext) return noiseBuffer;
  const ctx = audioContext!;
  const len = ctx.sampleRate; // 1秒
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return buf;
}

// === 增厚层：triangle谐波 + 滤波噪声脉冲 ===
function addBodyLayer(freq: number, endFreq: number, vol: number, decay: number): void {
  if (!audioContext) return;
  const time = audioContext.currentTime;

  // 1) Triangle层：同频，自带奇次谐波，音量×0.35
  const tri = audioContext.createOscillator();
  const triGain = audioContext.createGain();
  tri.type = 'triangle';
  tri.connect(triGain);
  connectToOutput(triGain);
  tri.frequency.setValueAtTime(freq, time);
  tri.frequency.exponentialRampToValueAtTime(endFreq, time + decay * 0.7);
  triGain.gain.setValueAtTime(vol * 0.35, time);
  triGain.gain.exponentialRampToValueAtTime(0.01, time + decay);
  tri.start(time);
  tri.stop(time + decay);

  // 2) 噪声脉冲：bandpass滤波，极短衰减，增加"气感"
  const noiseSrc = audioContext.createBufferSource();
  noiseSrc.buffer = getNoiseBuffer();
  const noiseFilter = audioContext.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(freq, time);
  noiseFilter.Q.setValueAtTime(2, time);
  const noiseGain = audioContext.createGain();
  noiseSrc.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  connectToOutput(noiseGain);
  const noiseDec = decay * 0.5; // 噪声比主音短
  noiseGain.gain.setValueAtTime(vol * 0.5, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, time + noiseDec);
  noiseSrc.start(time);
  noiseSrc.stop(time + noiseDec);
}

// === 全局混响（短延迟反馈模拟小空间） ===
let reverbSend: GainNode | null = null;
let dryNode: GainNode | null = null;

function initReverb(ctx: AudioContext): void {
  // dry 通路
  dryNode = ctx.createGain();
  dryNode.gain.value = 1.0;
  dryNode.connect(ctx.destination);

  // wet 通路：delay → feedback → output
  reverbSend = ctx.createGain();
  reverbSend.gain.value = 0.25; // wet 量

  const delay1 = ctx.createDelay();
  delay1.delayTime.value = 0.03; // 30ms 早期反射
  const delay2 = ctx.createDelay();
  delay2.delayTime.value = 0.06; // 60ms 二次反射

  const fb = ctx.createGain();
  fb.gain.value = 0.3; // 反馈衰减

  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = 2500; // 高频吸收，混响更温暖

  reverbSend.connect(delay1);
  delay1.connect(lpf);
  lpf.connect(delay2);
  delay2.connect(fb);
  fb.connect(delay1); // 反馈环
  delay2.connect(ctx.destination);
}

/** 连接音源到输出（dry + wet 混响） */
function connectToOutput(node: AudioNode): void {
  if (dryNode) node.connect(dryNode);
  if (reverbSend) node.connect(reverbSend);
  if (!dryNode && !reverbSend) node.connect(audioContext!.destination);
}

// === 初始化音频上下文 ===
export function initAudio(): void {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    initReverb(audioContext);
  }
}

// === 播放音效 ===
export function playSound(type: keyof typeof SOUND_PROFILES): void {
  if (!audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  connectToOutput(gainNode);

  const time = audioContext.currentTime;

  // 特殊处理: type 音效 — 三层键盘音（click + thock + tone）
  if (type === 'type') {
    // 释放预创建的 oscillator/gainNode（不使用）
    oscillator.disconnect();
    gainNode.disconnect();
    playTypeSound();
    return;
  }

  const [startFreq, endFreq, volume] = SOUND_PROFILES[type] || [600, 800, 0.08];
  const sf = randomize(startFreq, 0.05);
  const ef = randomize(endFreq, 0.05);
  const vol = randomize(volume, 0.08);
  const dec = randomize(0.15, 0.08);

  oscillator.frequency.setValueAtTime(sf, time);
  oscillator.frequency.exponentialRampToValueAtTime(ef, time + 0.1);
  gainNode.gain.setValueAtTime(vol, time);
  gainNode.gain.exponentialRampToValueAtTime(0.01, time + dec);

  oscillator.start(time);
  oscillator.stop(time + dec);
  addBodyLayer(sf, ef, vol, dec);
}


// === 词语结算分数音效（4 档，与打字音效同调） ===
// 设计：以打字 tone 层的 combo 频率为根音，纯比率构建和声
// 最后一个音始终落在五度或九度，营造"开放/未解决"的结尾感

/** 取当前 combo 对应的打字 tone 基频（与 playTypeSound 第 3 层同公式） */
function getTypingRoot(): number {
  return 300 + 400 * Math.log2(1 + state.combo * 0.06);
}

// 开放音程比率池（相对根音）
// 大二度 9/8, 大三度 5/4, 纯四度 4/3, 纯五度 3/2, 大六度 5/3, 八度 2, 大九度 9/4
const OPEN_INTERVALS = [9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 2, 9 / 4];
// 结尾专用：只用纯五度 / 大九度（最"开放"的两个音程）
const ENDING_INTERVALS = [3 / 2, 9 / 4];

/** 播放单个柔和 sine 音 */
function playChimeTone(freq: number, vol: number, decay: number, delay = 0): void {
  if (!audioContext) return;
  const ctx = audioContext;
  const t = ctx.currentTime + delay;

  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.connect(g);
  connectToOutput(g);
  o.frequency.setValueAtTime(randomize(freq, 0.015), t);
  g.gain.setValueAtTime(0.001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.001, t + decay);
  o.start(t);
  o.stop(t + decay);
}

/** 从池中随机取一个 */
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function playScoreSound(score: number): void {
  if (!audioContext) return;
  const tier = getScoreSoundTier(score);
  const root = getTypingRoot();
  const ending = pick(ENDING_INTERVALS);

  switch (tier) {
    // Tier 0 (0-99): 根音 → 开放音（两音，极简）
    case 0: {
      playChimeTone(root, randomize(0.04, 0.1), randomize(0.10, 0.1));
      playChimeTone(root * ending, randomize(0.035, 0.1), randomize(0.14, 0.1), 0.04);
      break;
    }
    // Tier 1 (100-999): 根音 → 三度 → 开放音
    case 1: {
      const mid = pick([5 / 4, 4 / 3]); // 大三度或纯四度
      playChimeTone(root, randomize(0.04, 0.1), randomize(0.14, 0.1));
      playChimeTone(root * mid, randomize(0.035, 0.1), randomize(0.16, 0.1), 0.04);
      playChimeTone(root * ending, randomize(0.03, 0.1), randomize(0.20, 0.1), 0.08);
      break;
    }
    // Tier 2 (1000-4999): 四音琶音，从根音上行到开放音
    case 2: {
      const m1 = pick([9 / 8, 5 / 4]);  // 二度或三度
      const m2 = pick([4 / 3, 3 / 2]);  // 四度或五度
      playChimeTone(root, randomize(0.04, 0.1), randomize(0.20, 0.1));
      playChimeTone(root * m1, randomize(0.035, 0.1), randomize(0.22, 0.1), 0.03);
      playChimeTone(root * m2, randomize(0.03, 0.1), randomize(0.24, 0.1), 0.06);
      playChimeTone(root * ending * 1, randomize(0.03, 0.1), randomize(0.28, 0.1), 0.09);
      break;
    }
    // Tier 3 (5000+): 五音级联 + 低八度垫底，结尾大九度
    case 3: {
      playChimeTone(root * 0.5, randomize(0.025, 0.1), randomize(0.30, 0.1));
      const steps = [1, 5 / 4, 3 / 2, 2, 9 / 4]; // 根 三 五 八 九
      for (let i = 0; i < steps.length; i++) {
        playChimeTone(root * steps[i], randomize(0.032, 0.1), randomize(0.28, 0.1), i * 0.03);
      }
      break;
    }
  }
}

// === 评级音效 (Story 31.6) ===
const RATING_SOUND_CONFIG: Record<string, { freqs: number[]; type: OscillatorType; vol: number; decay: number }> = {
  C:   { freqs: [200],               type: 'sine',     vol: 0.06, decay: 0.15 },
  B:   { freqs: [330],               type: 'sine',     vol: 0.07, decay: 0.2 },
  A:   { freqs: [440],               type: 'triangle', vol: 0.08, decay: 0.25 },
  S:   { freqs: [440, 554, 659],     type: 'triangle', vol: 0.06, decay: 0.3 },
  SS:  { freqs: [523, 659, 784],     type: 'triangle', vol: 0.06, decay: 0.4 },
  SSS: { freqs: [261, 523, 659, 784, 1046], type: 'sawtooth', vol: 0.04, decay: 0.5 },
};

export function playRatingSound(grade: string): void {
  if (!audioContext) return;
  const ctx = audioContext;
  const t = ctx.currentTime;
  const cfg = RATING_SOUND_CONFIG[grade];
  if (!cfg) return;

  for (const freq of cfg.freqs) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const f = randomize(freq, 0.03);
    const v = randomize(cfg.vol, 0.08);
    const d = randomize(cfg.decay, 0.08);
    o.type = cfg.type;
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g);
    connectToOutput(g);
    o.start(t);
    o.stop(t + d);
  }
}

// === 资源和弦系统 (Epic 33) ===
// 五声音阶映射：C大调五声 C-E-G-A-C'，任意组合都和谐
export const RESOURCE_FREQ: Record<string, number> = {
  base: 262,       // C4 — 根音，稳定基底
  score: 330,      // E4 — 大三度，明亮积极
  multiplier: 392, // G4 — 纯五度，力量感
  time: 440,       // A4 — 大六度，轻盈流动
  gold: 523,       // C5 — 八度，高亮点缀
};

// 和弦缓冲区：收集同一微任务内所有资源产出，合并播放
const chordBuffer: Map<string, number> = new Map(); // resource → max intensity
let chordScheduled = false;
let lastChordTime = 0;

const CHORD_COOLDOWN = 0.08;   // 80ms 硬冷却
const CHORD_BASE_VOL = 0.08;   // 每音分量基础音量
const CHORD_DECAY = 0.08;      // 80ms 衰减
const CHORD_MAX_RMS = 0.15;    // RMS 总音量封顶

/** 纯函数：计算 RMS 缩放后的各分量音量 */
export function calculateRMSVolumes(rawVolumes: number[]): number[] {
  if (rawVolumes.length === 0) return [];
  const sumSq = rawVolumes.reduce((s, v) => s + v * v, 0);
  const rms = Math.sqrt(sumSq);
  if (rms <= CHORD_MAX_RMS) return rawVolumes;
  const ratio = CHORD_MAX_RMS / rms;
  return rawVolumes.map(v => v * ratio);
}

/** 缓冲资源音效：仅写缓冲，不立即发声 */
export function emitResourceSound(resource: string, intensity: number): void {
  if (!RESOURCE_FREQ[resource]) return;
  const prev = chordBuffer.get(resource) || 0;
  chordBuffer.set(resource, Math.max(prev, intensity));
  if (!chordScheduled) {
    chordScheduled = true;
    queueMicrotask(flushResourceChord);
  }
}

/** 合成并播放缓冲区中的和弦 */
function flushResourceChord(): void {
  chordScheduled = false;
  if (!audioContext || chordBuffer.size === 0) {
    chordBuffer.clear();
    return;
  }

  const ctx = audioContext;
  const now = ctx.currentTime;

  // 硬冷却检查
  if (now - lastChordTime < CHORD_COOLDOWN) {
    chordBuffer.clear();
    return;
  }
  lastChordTime = now;

  // 收集各音分量音量
  const entries = Array.from(chordBuffer.entries());
  const rawVolumes = entries.map(([, intensity]) =>
    CHORD_BASE_VOL * Math.min(intensity, 2) * randomize(1, 0.08)
  );

  // RMS 缩放
  const volumes = calculateRMSVolumes(rawVolumes);

  // 为每个资源创建振荡器
  entries.forEach(([resource], i) => {
    const freq = RESOURCE_FREQ[resource];
    if (!freq) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.connect(gain);
    connectToOutput(gain);
    osc.frequency.setValueAtTime(randomize(freq, 0.03), now);
    softAttack(gain, volumes[i], now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + CHORD_DECAY);
    osc.start(now);
    osc.stop(now + CHORD_DECAY + 0.01);
  });

  chordBuffer.clear();
}

// 测试辅助：暴露内部状态供测试验证
export const _chordInternals = {
  get buffer() { return chordBuffer; },
  get scheduled() { return chordScheduled; },
  get lastTime() { return lastChordTime; },
  resetCooldown() { lastChordTime = 0; },
  _setMockContext(ctx: AudioContext | null) { audioContext = ctx; },
  _setLastChordTime(t: number) { lastChordTime = t; },
};

// === 便捷函数 ===
export const sound = {
  type: () => playSound('type'),
  wrong: () => playSound('wrong'),
  skill: () => playSound('skill'),
  levelup: () => playSound('levelup'),
  gameover: () => playSound('gameover'),
  buy: () => playSound('buy'),
};
