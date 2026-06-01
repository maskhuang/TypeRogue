// ============================================
// 打字肉鸽 - 音效系统
// ============================================

import { SOUND_PROFILES } from '../core/constants';
import { state } from '../core/state';
import { getScoreSoundTier } from './juice';
import { GenerativeBed, computeCoherence, MELODY_SCALE, MELODY_OCTAVE, MAX_DETUNE_CENTS } from './generativeBed';
import { eventBus } from '../core/events/EventBus';

let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;

// === 打字三层音效：click（触底冲击）+ thock（壳体共鸣）+ tone（combo 积累感） ===
function playTypeSound(char?: string): void {
  if (!audioContext) return;
  const ctx = audioContext;
  const t = ctx.currentTime;
  const combo = state.combo;

  // 1) Click 层 — 极短噪声脉冲，模拟触底冲击
  const clickVol = randomize(Math.min(0.10, 0.06 + combo * 0.001), 0.08); // combo 微升音量
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
  softAttack(thockGain, randomize(0.07, 0.08), t);
  thockGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  thockOsc.start(t);
  thockOsc.stop(t + 0.04);

  // 3) 乐器层（A 轴：打字即乐器）
  // 底乐活跃时 → 锁定底乐当前调性的旋律音，走 bgmBus，受 coherence 调制（文本即乐谱）。
  // 否则（菜单/教学，无底乐）→ 回退到旧的 combo-tone 陪衬层。
  if (char && bed && bed.isActive() && bgmBusGain) {
    playTypeInstrument(char, combo, t);
  } else {
    const toneFreq = 300 + 400 * Math.log2(1 + combo * 0.06); // 300→~700Hz
    const toneVol = Math.min(0.07, 0.024 + combo * 0.001);  // 陪衬
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
}

// === A 轴：打字即乐器 ===
// 字符决定论：degree = charCode % 音阶长度 → 同一文本永远弹出同一段旋律
//（未受理文本通过录入员的击键"唱"出来）。combo 升八度；coherence 失谐 + 受理闪断。
const TYPE_INSTR_LPF = 2600;        // 去亮保暖
const TYPE_INSTR_DECAY = 0.18;      // 短衰减，快打不糊
const TYPE_INSTR_MAX_OCTAVE = 2;    // combo 升八度封顶（每 +10 combo 升一级）

/** 在底乐当前调性上合成一个锁调旋律音；低 coherence 时失谐并偶发受理闪断 */
function playTypeInstrument(char: string, combo: number, t: number): void {
  if (!audioContext || !bgmBusGain || !bed) return;
  const ctx = audioContext;
  const coh = bed.getCoherence();

  // 受理闪断：coherence < 0.3 后按概率把这次击键"抹除"为一声 redaction 杂音
  // （coh 0.3→0%，coh 0.05→~8.75%）
  const blipChance = Math.max(0, 0.3 - coh) * 0.35;
  if (Math.random() < blipChance) {
    playRedactionBlip(t);
    return;
  }

  const root = bed.getRootHz();
  const octaveStep = Math.min(TYPE_INSTR_MAX_OCTAVE, Math.floor(combo / 10));
  const octaveMul = MELODY_OCTAVE * Math.pow(2, octaveStep);
  const code = char.charCodeAt(0);
  const degree = ((code % MELODY_SCALE.length) + MELODY_SCALE.length) % MELODY_SCALE.length;
  const freq = root * octaveMul * MELODY_SCALE[degree];
  const detune = (Math.random() * 2 - 1) * (1 - coh) * MAX_DETUNE_CENTS; // 越不协和越走调
  const vol = Math.min(0.05, 0.03 + combo * 0.0006);

  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = TYPE_INSTR_LPF;
  const g = ctx.createGain();
  osc.connect(lpf);
  lpf.connect(g);
  g.connect(bgmBusGain);
  osc.frequency.setValueAtTime(randomize(freq, 0.01), t);
  osc.detune.setValueAtTime(detune, t);
  g.gain.setValueAtTime(0.001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.001, t + TYPE_INSTR_DECAY);
  osc.start(t);
  osc.stop(t + TYPE_INSTR_DECAY + 0.02);
}

/** 受理闪断：一声极短带通杂音，替代本该响起的旋律音（"你输入的字当场被抹掉了"） */
function playRedactionBlip(t: number): void {
  if (!audioContext || !bgmBusGain) return;
  const ctx = audioContext;
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer();
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = randomize(900, 0.2);
  bp.Q.value = 1.2;
  const g = ctx.createGain();
  noise.connect(bp);
  bp.connect(g);
  g.connect(bgmBusGain);
  g.gain.setValueAtTime(0.05, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  noise.start(t);
  noise.stop(t + 0.06);
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
  const dest = masterGain || ctx.destination;
  // dry 通路
  dryNode = ctx.createGain();
  dryNode.gain.value = 1.0;
  dryNode.connect(dest);

  // wet 通路：delay → feedback → output
  reverbSend = ctx.createGain();
  reverbSend.gain.value = 0.25;

  const delay1 = ctx.createDelay();
  delay1.delayTime.value = 0.03;
  const delay2 = ctx.createDelay();
  delay2.delayTime.value = 0.06;

  const fb = ctx.createGain();
  fb.gain.value = 0.3;

  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = 2500;

  reverbSend.connect(delay1);
  delay1.connect(lpf);
  lpf.connect(delay2);
  delay2.connect(fb);
  fb.connect(delay1);
  delay2.connect(dest);
}

/** 连接音源到输出（dry + wet 混响） */
function connectToOutput(node: AudioNode): void {
  const dest = masterGain || audioContext!.destination;
  if (dryNode) node.connect(dryNode);
  if (reverbSend) node.connect(reverbSend);
  if (!dryNode && !reverbSend) node.connect(dest);
}

// === 初始化音频上下文 ===
export function initAudio(): void {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);
    initReverb(audioContext);
  }
}

/** 设置主音量 (0-1) */
export function setMasterVolume(v: number): void {
  if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, v));
}

// === 播放音效 ===
export function playSound(type: keyof typeof SOUND_PROFILES, char?: string): void {
  if (!audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  connectToOutput(gainNode);

  const time = audioContext.currentTime;

  // 特殊处理: type 音效 — click + thock（触感）+ 乐器层（A 轴，char 决定旋律音）
  if (type === 'type') {
    // 释放预创建的 oscillator/gainNode（不使用）
    oscillator.disconnect();
    gainNode.disconnect();
    playTypeSound(char);
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

// === Stage 5+ (2026-05) · 桌面化 menu 专用重 UI 音效 ===
// 单振荡器 sine 太轻薄；这里用 noise burst + 低频 body 分层合成，匹配 desk + paper 视觉重量。
// 4 种类型：
//   stamp      — 橡皮章 thwack（绿章 / CLOCKED IN / ASSIGNED 用）
//   stamp_red  — 红章 thwack（DENIED · 略 sharper, 锯齿底音）
//   paper      — 纸张 rustle（覆盖层开 / 行 hover / 翻页）
//   pen        — 钢笔划过（签字逐字音）
//   punch      — 打孔（卡片打孔的 short snap）

function makeNoiseBuffer(ctx: AudioContext, durationS: number): AudioBufferSourceNode {
  const sampleCount = Math.max(1, Math.ceil(ctx.sampleRate * durationS));
  const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < sampleCount; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  return src;
}

export function playDeskSound(type: 'stamp' | 'stamp_red' | 'paper' | 'pen' | 'punch' | 'whoosh'): void {
  if (!audioContext) return;
  const ctx = audioContext;
  const t = ctx.currentTime;

  if (type === 'stamp' || type === 'stamp_red') {
    const isRed = type === 'stamp_red';
    // 1 · noise impact (the "thwack")
    const noise = makeNoiseBuffer(ctx, 0.06);
    const nFilter = ctx.createBiquadFilter();
    nFilter.type = 'lowpass';
    nFilter.frequency.value = isRed ? 1200 : 800;
    const nGain = ctx.createGain();
    noise.connect(nFilter);
    nFilter.connect(nGain);
    connectToOutput(nGain);
    nGain.gain.setValueAtTime(isRed ? 0.22 : 0.20, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.10);
    noise.start(t);
    noise.stop(t + 0.10);

    // 2 · low body resonance (the "thud")
    const osc = ctx.createOscillator();
    const oGain = ctx.createGain();
    osc.type = isRed ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(isRed ? 180 : 120, t);
    osc.frequency.exponentialRampToValueAtTime(isRed ? 60 : 40, t + 0.20);
    osc.connect(oGain);
    connectToOutput(oGain);
    oGain.gain.setValueAtTime(0.001, t);
    oGain.gain.linearRampToValueAtTime(isRed ? 0.16 : 0.18, t + 0.005);
    oGain.gain.exponentialRampToValueAtTime(0.001, t + (isRed ? 0.30 : 0.42));
    osc.start(t);
    osc.stop(t + (isRed ? 0.32 : 0.44));
    return;
  }

  if (type === 'paper') {
    // 高频 noise rustle，短促
    const noise = makeNoiseBuffer(ctx, 0.20);
    const nFilter = ctx.createBiquadFilter();
    nFilter.type = 'highpass';
    nFilter.frequency.value = 2200;
    const nGain = ctx.createGain();
    noise.connect(nFilter);
    nFilter.connect(nGain);
    connectToOutput(nGain);
    nGain.gain.setValueAtTime(0.001, t);
    nGain.gain.linearRampToValueAtTime(0.06, t + 0.025);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    noise.start(t);
    noise.stop(t + 0.20);
    return;
  }

  if (type === 'pen') {
    // 钢笔划过：band-pass noise，带轻微抖动
    const noise = makeNoiseBuffer(ctx, 0.10);
    const nFilter = ctx.createBiquadFilter();
    nFilter.type = 'bandpass';
    nFilter.frequency.value = 1400;
    nFilter.Q.value = 2.5;
    const nGain = ctx.createGain();
    noise.connect(nFilter);
    nFilter.connect(nGain);
    connectToOutput(nGain);
    nGain.gain.setValueAtTime(0.001, t);
    nGain.gain.linearRampToValueAtTime(0.07, t + 0.008);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.10);
    noise.start(t);
    noise.stop(t + 0.10);
    return;
  }

  if (type === 'whoosh') {
    // 场景切换：气动管道 whoosh + 末端落地 thud
    // Layer 1 · 350ms 带通噪声扫频（900Hz → 180Hz），模拟管道传输
    const noise = makeNoiseBuffer(ctx, 0.36);
    const nFilter = ctx.createBiquadFilter();
    nFilter.type = 'bandpass';
    nFilter.Q.value = 1.5;
    nFilter.frequency.setValueAtTime(900, t);
    nFilter.frequency.exponentialRampToValueAtTime(180, t + 0.30);
    const nGain = ctx.createGain();
    noise.connect(nFilter);
    nFilter.connect(nGain);
    connectToOutput(nGain);
    nGain.gain.setValueAtTime(0.001, t);
    nGain.gain.linearRampToValueAtTime(0.14, t + 0.04);
    nGain.gain.linearRampToValueAtTime(0.16, t + 0.20);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
    noise.start(t);
    noise.stop(t + 0.36);

    // Layer 2 · 280ms 处低频落地 thud
    const thudT = t + 0.28;
    const osc = ctx.createOscillator();
    const oGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, thudT);
    osc.frequency.exponentialRampToValueAtTime(40, thudT + 0.14);
    osc.connect(oGain);
    connectToOutput(oGain);
    oGain.gain.setValueAtTime(0.001, thudT);
    oGain.gain.linearRampToValueAtTime(0.16, thudT + 0.005);
    oGain.gain.exponentialRampToValueAtTime(0.001, thudT + 0.18);
    osc.start(thudT);
    osc.stop(thudT + 0.20);
    return;
  }

  if (type === 'punch') {
    // 打孔：尖锐 click + 极短 thud
    const noise = makeNoiseBuffer(ctx, 0.025);
    const nFilter = ctx.createBiquadFilter();
    nFilter.type = 'bandpass';
    nFilter.frequency.value = 2400;
    nFilter.Q.value = 1.5;
    const nGain = ctx.createGain();
    noise.connect(nFilter);
    nFilter.connect(nGain);
    connectToOutput(nGain);
    nGain.gain.setValueAtTime(0.18, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    noise.start(t);
    noise.stop(t + 0.04);

    const osc = ctx.createOscillator();
    const oGain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.06);
    osc.connect(oGain);
    connectToOutput(oGain);
    oGain.gain.setValueAtTime(0.001, t);
    oGain.gain.linearRampToValueAtTime(0.10, t + 0.003);
    oGain.gain.exponentialRampToValueAtTime(0.001, t + 0.10);
    osc.start(t);
    osc.stop(t + 0.10);
    return;
  }
}

// 侧链回避：playScoreSound 激活期间资源音效降 6dB
// ⚠️ 时序依赖：battle.ts 中 emitResourceSound 先于 playScoreSound 调用，
// 使得 flush microtask 执行时 flag 已设置。若调用顺序反转，ducking 将失效。
let _scoreSoundActive = false;

export function playScoreSound(score: number): void {
  _scoreSoundActive = true;
  queueMicrotask(() => { _scoreSoundActive = false; });
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

// === 资源音效系统 (Epic 33) ===
// 每种资源拥有独立合成函数，不同波形/噪声/滤波组合，蒙眼可辨识

type ResourceSynth = (ctx: AudioContext, now: number, vol: number, pitchShift?: number, decayMul?: number) => void;

/** base: 低频 triangle 下扫 + bandpass 噪声冲击，"砖块/筹码"质感 */
function synthBase(ctx: AudioContext, now: number, vol: number, pitchShift = 1, decayMul = 1): void {
  // "弹珠落盘" — square 下扫 + 噪声尾巴，清脆有存在感
  // 1) Square 主音：1500→900Hz 快速下滑
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.connect(gain);
  connectToOutput(gain);
  osc.frequency.setValueAtTime(randomize(1500 * pitchShift, 0.05), now);
  osc.frequency.exponentialRampToValueAtTime(randomize(900 * pitchShift, 0.05), now + 0.035 * decayMul);
  gain.gain.setValueAtTime(vol * 0.7, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05 * decayMul);
  osc.start(now);
  osc.stop(now + 0.055 * decayMul);
  // 2) 高频噪声点缀：增加"弹落"质感
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = getNoiseBuffer();
  const hpf = ctx.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.value = 3000;
  const noiseGain = ctx.createGain();
  noiseSrc.connect(hpf);
  hpf.connect(noiseGain);
  connectToOutput(noiseGain);
  noiseGain.gain.setValueAtTime(vol * 0.3, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02 * decayMul);
  noiseSrc.start(now);
  noiseSrc.stop(now + 0.025 * decayMul);
}

/** score: square 琶音 3 音跳跃，"硬币拾取"感 */
function synthScore(ctx: AudioContext, now: number, vol: number, pitchShift = 1, decayMul = 1): void {
  const freqs = [randomize(880 * pitchShift, 0.05), randomize(1320 * pitchShift, 0.05), randomize(1760 * pitchShift, 0.05)];
  const vols = [vol * 0.5, vol * 0.35, vol * 0.3];
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.connect(gain);
    connectToOutput(gain);
    const t = now + i * 0.025;
    osc.frequency.setValueAtTime(freq, t);
    softAttack(gain, vols[i], t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06 * decayMul);
    osc.start(t);
    osc.stop(t + 0.07 * decayMul);
  });
}

/** multiplier: 三音上行光辉琶音，"倍率提升"感 */
function synthMultiplier(ctx: AudioContext, now: number, vol: number, pitchShift = 1, decayMul = 1): void {
  // 三音快速上行 (1600→2000→2500Hz)，sawtooth+LPF 带金属光泽
  const freqs = [1600 * pitchShift, 2000 * pitchShift, 2500 * pitchShift];
  const vols = [vol * 0.6, vol * 0.5, vol * 0.4];
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const lpf = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    lpf.type = 'lowpass';
    lpf.frequency.value = 4000;
    osc.connect(lpf);
    lpf.connect(gain);
    connectToOutput(gain);
    const t = now + i * 0.03;
    osc.frequency.setValueAtTime(randomize(freq, 0.04), t);
    softAttack(gain, vols[i], t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07 * decayMul);
    osc.start(t);
    osc.stop(t + 0.08 * decayMul);
  });
}

/** time: 高频 sine 双击，"时钟滴答"感 */
function synthTime(ctx: AudioContext, now: number, vol: number, pitchShift = 1, decayMul = 1): void {
  for (let i = 0; i < 2; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.connect(gain);
    connectToOutput(gain);
    const t = now + i * 0.03;
    osc.frequency.setValueAtTime(randomize(2000 * pitchShift, 0.05), t);
    softAttack(gain, vol * 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03 * decayMul);
    osc.start(t);
    osc.stop(t + 0.04 * decayMul);
  }
}

/** shield: triangle 低-中频 + LPF + 短噪声脉冲，"金属护盾轻击"感 ·
 *  与 score/gold 的脆亮、base 的弹珠落盘对比 — 厚实、缓冲、不刺耳 */
function synthShield(ctx: AudioContext, now: number, vol: number, pitchShift = 1, decayMul = 1): void {
  // 1) Triangle 主体：500→380Hz 短下滑，LPF 1800Hz 去高频锋利
  const osc = ctx.createOscillator();
  const lpf = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  lpf.type = 'lowpass';
  lpf.frequency.value = 1800;
  osc.connect(lpf);
  lpf.connect(gain);
  connectToOutput(gain);
  osc.frequency.setValueAtTime(randomize(500 * pitchShift, 0.04), now);
  osc.frequency.exponentialRampToValueAtTime(randomize(380 * pitchShift, 0.04), now + 0.06 * decayMul);
  softAttack(gain, vol * 0.55, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1 * decayMul);
  osc.start(now);
  osc.stop(now + 0.11 * decayMul);

  // 2) 短促噪声脉冲：金属边缘"轻击"质感（短于 base 的尾巴）
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = getNoiseBuffer();
  const bpf = ctx.createBiquadFilter();
  bpf.type = 'bandpass';
  bpf.frequency.value = 2200;
  bpf.Q.value = 4;
  const noiseGain = ctx.createGain();
  noiseSrc.connect(bpf);
  bpf.connect(noiseGain);
  connectToOutput(noiseGain);
  noiseGain.gain.setValueAtTime(vol * 0.15, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02 * decayMul);
  noiseSrc.start(now);
  noiseSrc.stop(now + 0.025 * decayMul);
}

/** gold: square + 高频 sine 泛音，"金币叮当"感 */
function synthGold(ctx: AudioContext, now: number, vol: number, pitchShift = 1, decayMul = 1): void {
  // 1) Square 基音
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'square';
  osc1.connect(gain1);
  connectToOutput(gain1);
  osc1.frequency.setValueAtTime(randomize(1200 * pitchShift, 0.05), now);
  softAttack(gain1, vol * 0.4, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08 * decayMul);
  osc1.start(now);
  osc1.stop(now + 0.09 * decayMul);

  // 2) Sine 泛音（2倍频）
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.connect(gain2);
  connectToOutput(gain2);
  osc2.frequency.setValueAtTime(randomize(2400 * pitchShift, 0.05), now);
  softAttack(gain2, vol * 0.25, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12 * decayMul);
  osc2.start(now);
  osc2.stop(now + 0.13 * decayMul);
}

/** 各资源的特征基频（用于泛音增厚层的真实谐波计算） */
const RESOURCE_BASE_FREQ: Record<string, number> = {
  base: 1400,
  score: 880,
  multiplier: 1800,
  time: 2000,
  shield: 500,
  gold: 1200,
};

/** 资源合成函数调度表 */
export const RESOURCE_SYNTH: Record<string, ResourceSynth> = {
  base: synthBase,
  score: synthScore,
  multiplier: synthMultiplier,
  time: synthTime,
  shield: synthShield,
  gold: synthGold,
};

// 和弦缓冲区：收集同一微任务内所有资源产出，合并播放
const chordBuffer: Map<string, { intensity: number; chainDepth: number }> = new Map();
let chordScheduled = false;
let lastChordTime = 0;

const CHORD_COOLDOWN = 0.08;   // 80ms 硬冷却
const CHORD_BASE_VOL = 0.04;   // 每音分量基础音量（> MAX_RMS 时由 RMS 钳位，实际作为多资源间相对权重）
const CHORD_MAX_RMS = 0.03;    // RMS 总音量封顶（≤ 打字音峰值 0.035 × 60%）
const CHORD_STAGGER = 0.015;   // 15ms 连锁时间展开间隔
const MAX_PITCH_SEMITONES = 6; // 最大音高偏移（增四度）

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
export function emitResourceSound(resource: string, intensity: number, chainDepth = 0): void {
  if (!(resource in RESOURCE_SYNTH)) return;
  const prev = chordBuffer.get(resource);
  chordBuffer.set(resource, {
    intensity: Math.max(prev?.intensity ?? 0, intensity),
    chainDepth: Math.max(prev?.chainDepth ?? 0, chainDepth),
  });
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
  const rawVolumes = entries.map(([, { intensity }]) =>
    CHORD_BASE_VOL * Math.min(intensity, 2) * randomize(1, 0.08)
  );

  // RMS 缩放 + 侧链回避（playScoreSound 激活时 -6dB）
  const duckFactor = _scoreSoundActive ? 0.5 : 1.0;
  const volumes = calculateRMSVolumes(rawVolumes).map(v => v * duckFactor);

  // 为每个资源调用独立合成函数（含连锁时间展开 + 音高偏移 + 强度调制）
  entries.forEach(([resource, { intensity, chainDepth }], i) => {
    const synth = RESOURCE_SYNTH[resource];
    if (!synth) return;

    const clampedDepth = Math.min(chainDepth, MAX_PITCH_SEMITONES);
    const stagger = clampedDepth * CHORD_STAGGER;
    const pitchShift = 2 ** (clampedDepth / 12);
    const decayMul = 1 + Math.log2(Math.max(intensity, 1)) * 0.3;

    synth(ctx, now + stagger, volumes[i], pitchShift, decayMul);

    // 高强度增厚：intensity ≥ 2.0 叠加 triangle 2 次谐波
    if (intensity >= 2.0) {
      const baseFreq = RESOURCE_BASE_FREQ[resource] ?? 440;
      addHarmonicLayer(ctx, now + stagger, volumes[i] * 0.3, baseFreq, pitchShift, decayMul);
    }
  });

  chordBuffer.clear();
}

/** 泛音增厚层：高 intensity 时叠加 triangle 谐波（2 次谐波 = 基频 × 2） */
function addHarmonicLayer(ctx: AudioContext, now: number, vol: number, baseFreq: number, pitchShift: number, decayMul: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.connect(gain);
  connectToOutput(gain);
  osc.frequency.setValueAtTime(randomize(baseFreq * 2 * pitchShift, 0.05), now);
  softAttack(gain, vol, now);
  const decay = 0.15 * decayMul;
  gain.gain.exponentialRampToValueAtTime(0.001, now + decay);
  osc.start(now);
  osc.stop(now + decay + 0.01);
}

// === BGM 生成式底乐层 (B 方案) ===
// 程序化 drone，替代采样 BGM。双轴：coherence(每关) + tension(单场)。
// 详见 effects/generativeBed.ts。

export type BgmTrack = 'battle' | 'chill';

const SHOP_DUCK = 0.5; // 进入商店后底乐电平降到 50%

let bed: GenerativeBed | null = null;
let bedMode: BgmTrack | null = null;
let bgmBusGain: GainNode | null = null;  // 底乐专用总线，受 musicVolume 控制（独立于 master）
let musicVolume = 1.0;                    // 0-1，仅作用于底乐（master 已统一衰减，故默认满）

function ensureBed(): GenerativeBed | null {
  if (!audioContext) return null;
  if (!bed) {
    bgmBusGain = audioContext.createGain();
    bgmBusGain.gain.value = musicVolume;
    connectToOutput(bgmBusGain);
    // 底乐输出接入 bgm 总线（→ master），而非直接 connectToOutput
    bed = new GenerativeBed(audioContext, node => { if (bgmBusGain) node.connect(bgmBusGain); });
  }
  return bed;
}

/** 设置音乐(底乐)音量 (0-1) — 独立于 master，不影响 SFX */
export function setMusicVolume(v: number): void {
  musicVolume = Math.max(0, Math.min(1, v));
  if (bgmBusGain) bgmBusGain.gain.value = musicVolume;
}

/** 启动/切换底乐。battle: coherence 由当前关号驱动、张力可调；chill: 平静、张力归零 */
export function startBGM(track: BgmTrack): void {
  const b = ensureBed();
  if (!b) return;
  b.start();
  b.setLevel(1); // 恢复满电平（撤销商店 duck；start 幂等不会自动复位）
  bedMode = track;
  if (track === 'battle') {
    b.setCoherence(computeCoherence(state.level));
  } else {
    b.setTension(0);
  }
}

// 进入商店（含休息站；统一走 openShop → shop:opened）后把底乐调低
eventBus.on('shop:opened', () => { bed?.setLevel(SHOP_DUCK); });

/** 停止底乐 */
export function stopBGM(): void {
  bed?.stop();
  bedMode = null;
}

/** 更新单场张力 (0-4) — 仅 battle 生效 */
export function updateBGMTension(level: number): void {
  if (bedMode !== 'battle') return;
  bed?.setTension(level);
}

/** 释放张力到基线 (0) — 仅 battle 生效 */
export function releaseBGMTension(): void {
  if (bedMode !== 'battle') return;
  bed?.setTension(0);
}

// 测试辅助：暴露内部状态供测试验证
export const _chordInternals = {
  get buffer() { return chordBuffer; },
  get scheduled() { return chordScheduled; },
  get lastTime() { return lastChordTime; },
  get scoreSoundActive() { return _scoreSoundActive; },
  CHORD_BASE_VOL,
  CHORD_MAX_RMS,
  resetCooldown() { lastChordTime = 0; },
  _setMockContext(ctx: AudioContext | null) {
    bed?.stop();
    bed = null;
    bedMode = null;
    bgmBusGain = null;
    audioContext = ctx;
  },
  get bedMusicVolume() { return bgmBusGain ? bgmBusGain.gain.value : musicVolume; },
  _setLastChordTime(t: number) { lastChordTime = t; },
  _setScoreSoundActive(v: boolean) { _scoreSoundActive = v; },
  // --- 生成式底乐 (B) 测试钩子 ---
  get bedMode() { return bedMode; },
  get bedActive() { return bed?.isActive() ?? false; },
  get bedCoherence() { return bed?.getCoherence() ?? 1; },
  get bedTension() { return bed?.getTension() ?? 0; },
  get bedLevel() { return bed?.getLevel() ?? 1; },
};

// === 便捷函数 ===
export const sound = {
  type: (char?: string) => playSound('type', char),
  wrong: () => playSound('wrong'),
  skill: () => playSound('skill'),
  levelup: () => playSound('levelup'),
  gameover: () => playSound('gameover'),
  buy: () => playSound('buy'),
};
