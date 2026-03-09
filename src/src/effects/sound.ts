// ============================================
// 打字肉鸽 - 音效系统
// ============================================

import { SOUND_PROFILES } from '../core/constants';
import { state } from '../core/state';
import { getScoreSoundTier } from './juice';

let audioContext: AudioContext | null = null;

// === 打击感 Click：高频短促，combo→音高上升+音量渐强+衰减缩短 ===
function getTypeClick(): { freq: number; vol: number; decay: number } {
  const combo = state.combo;
  // combo→频率 1000~1400Hz（每combo +20Hz，封顶20）
  const freq = Math.min(1400, 1000 + Math.min(combo, 20) * 20);
  // combo→音量 0.04~0.08
  const vol = Math.min(0.08, 0.04 + combo * 0.002);
  // combo→衰减 0.12s~0.08s（更紧凑）
  const decay = Math.max(0.08, 0.12 - combo * 0.002);
  return { freq, vol, decay };
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
  triGain.connect(audioContext.destination);
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
  noiseGain.connect(audioContext.destination);
  const noiseDec = decay * 0.5; // 噪声比主音短
  noiseGain.gain.setValueAtTime(vol * 0.5, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, time + noiseDec);
  noiseSrc.start(time);
  noiseSrc.stop(time + noiseDec);
}

// === 初始化音频上下文 ===
export function initAudio(): void {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
}

// === 播放音效 ===
export function playSound(type: keyof typeof SOUND_PROFILES): void {
  if (!audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  const time = audioContext.currentTime;

  // 特殊处理: type 音效 — 高频短促 click，combo驱动
  if (type === 'type') {
    const click = getTypeClick();
    // 窄幅下扫（click感）: freq → freq×0.85
    oscillator.frequency.setValueAtTime(click.freq, time);
    oscillator.frequency.exponentialRampToValueAtTime(click.freq * 0.85, time + click.decay * 0.3);
    gainNode.gain.setValueAtTime(click.vol, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + click.decay);
    oscillator.start(time);
    oscillator.stop(time + click.decay);
    addBodyLayer(click.freq, click.freq * 0.85, click.vol, click.decay);
    return;
  }

  const [startFreq, endFreq, volume] = SOUND_PROFILES[type] || [600, 800, 0.08];

  oscillator.frequency.setValueAtTime(startFreq, time);
  oscillator.frequency.exponentialRampToValueAtTime(endFreq, time + 0.1);
  gainNode.gain.setValueAtTime(volume, time);
  gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

  oscillator.start(time);
  oscillator.stop(time + 0.15);
  addBodyLayer(startFreq, endFreq, volume, 0.15);
}

// === 资源产出音效：每种资源独立合成，intensity 调制音量/衰减/音高 ===
// intensity = floatScale（≥1.0，以Lv1产出为基准的log比例值）
export function playResourceSound(resource: string, intensity = 1): void {
  if (!audioContext) return;
  const ctx = audioContext;
  const t = ctx.currentTime;

  // 强度调制系数（封顶避免爆音）
  const volMul = Math.min(intensity, 3);                        // 音量×intensity，封顶3倍
  const decMul = 1 + Math.log2(intensity) * 0.3;               // 衰减拉长（log缓增）
  const pitchShift = Math.pow(2, (Math.min(intensity, 4) - 1) * 2 / 12); // 最多升4半音

  switch (resource) {
    // ⚔️ base — 简洁下行 triangle 短音（柔和替代原 square + 噪声）
    case 'base': {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.connect(g);
      g.connect(ctx.destination);
      const freq = randomize(400 * pitchShift, 0.03);
      const vol = randomize(0.07 * volMul, 0.10);
      const dec = randomize(0.10 * decMul, 0.08);
      o.frequency.setValueAtTime(freq, t);
      o.frequency.exponentialRampToValueAtTime(freq * 0.5, t + 0.06 * decMul);
      softAttack(g, vol, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + dec);
      o.start(t);
      o.stop(t + dec);
      break;
    }
    // 🪙 score — 纯五度双音"叮"，降频更温暖（660+990Hz）
    case 'score': {
      const dec = randomize(0.18 * decMul, 0.08);
      for (const baseFreq of [660, 990]) { // E5 + B5 = 纯五度，更温暖
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.connect(g);
        g.connect(ctx.destination);
        o.frequency.setValueAtTime(randomize(baseFreq * pitchShift, 0.03), t);
        const vol = randomize(0.06 * volMul, 0.10);
        softAttack(g, vol, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + dec);
        o.start(t);
        o.stop(t + dec);
      }
      break;
    }
    // 🔥 multiplier — 窄幅上行大三度（420→530Hz），简洁单层 triangle
    case 'multiplier': {
      const dec = randomize(0.16 * decMul, 0.08);
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.connect(g);
      g.connect(ctx.destination);
      const startF = randomize(420 * pitchShift, 0.03);
      o.frequency.setValueAtTime(startF, t);
      o.frequency.exponentialRampToValueAtTime(startF * (530 / 420), t + 0.12 * decMul);
      const vol = randomize(0.07 * volMul, 0.10);
      softAttack(g, vol, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + dec);
      o.start(t);
      o.stop(t + dec);
      break;
    }
    // ⏳ time — 短促 tick，降频至 1100Hz
    case 'time': {
      const dec = randomize(0.06 * decMul, 0.08);
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.connect(g);
      g.connect(ctx.destination);
      const freq = randomize(1100 * pitchShift, 0.03);
      o.frequency.setValueAtTime(freq, t);
      o.frequency.exponentialRampToValueAtTime(freq * 0.89, t + dec * 0.5);
      const vol = randomize(0.05 * volMul, 0.10);
      softAttack(g, vol, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + dec);
      o.start(t);
      o.stop(t + dec);
      break;
    }
    // 💰 gold — sine 基频 600Hz + 八度泛音 1200Hz（去掉拍频）
    case 'gold': {
      const dec = randomize(0.20 * decMul, 0.08);
      // 基频 600Hz
      const o1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      o1.type = 'sine';
      o1.connect(g1);
      g1.connect(ctx.destination);
      o1.frequency.setValueAtTime(randomize(600 * pitchShift, 0.03), t);
      const vol1 = randomize(0.06 * volMul, 0.10);
      softAttack(g1, vol1, t);
      g1.gain.exponentialRampToValueAtTime(0.01, t + dec);
      o1.start(t);
      o1.stop(t + dec);
      // 八度泛音 1200Hz（轻量点缀）
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.type = 'sine';
      o2.connect(g2);
      g2.connect(ctx.destination);
      o2.frequency.setValueAtTime(randomize(1200 * pitchShift, 0.03), t);
      const vol2 = randomize(0.03 * volMul, 0.10);
      softAttack(g2, vol2, t);
      g2.gain.exponentialRampToValueAtTime(0.01, t + 0.12 * decMul);
      o2.start(t);
      o2.stop(t + 0.12 * decMul);
      break;
    }
    default:
      playSound('skill');
  }
}

// === 词语结算分数音效（4 档合成） ===
export function playScoreSound(score: number): void {
  if (!audioContext) return;
  const ctx = audioContext;
  const t = ctx.currentTime;
  const tier = getScoreSoundTier(score);

  switch (tier) {
    // Tier 0 (0-99): 清脆 — 高频 sine 短促下扫
    case 0: {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.connect(g);
      g.connect(ctx.destination);
      const freq = randomize(1200, 0.05);
      const vol = randomize(0.08, 0.08);
      const dec = randomize(0.08, 0.08);
      o.frequency.setValueAtTime(freq, t);
      o.frequency.exponentialRampToValueAtTime(freq * 0.83, t + dec * 0.5);
      softAttack(g, vol, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + dec);
      o.start(t);
      o.stop(t + dec);
      break;
    }
    // Tier 1 (100-999): 明亮 — 中频上扫 + body层
    case 1: {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.connect(g);
      g.connect(ctx.destination);
      const freq = randomize(800, 0.05);
      const endFreq = randomize(1100, 0.05);
      const vol = randomize(0.12, 0.08);
      const dec = randomize(0.12, 0.08);
      o.frequency.setValueAtTime(freq, t);
      o.frequency.exponentialRampToValueAtTime(endFreq, t + dec * 0.6);
      softAttack(g, vol, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + dec);
      o.start(t);
      o.stop(t + dec);
      addBodyLayer(freq, endFreq, vol, dec);
      break;
    }
    // Tier 2 (1000-4999): 厚重 — 低频 triangle + 双body层
    case 2: {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.connect(g);
      g.connect(ctx.destination);
      const freq = randomize(400, 0.05);
      const endFreq = randomize(550, 0.05);
      const vol = randomize(0.16, 0.08);
      const dec = randomize(0.20, 0.08);
      o.frequency.setValueAtTime(freq, t);
      o.frequency.exponentialRampToValueAtTime(endFreq, t + dec * 0.6);
      softAttack(g, vol, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + dec);
      o.start(t);
      o.stop(t + dec);
      addBodyLayer(freq, endFreq, vol, dec);
      addBodyLayer(freq * 0.5, endFreq * 0.5, vol * 0.3, dec);
      break;
    }
    // Tier 3 (5000+): 轰鸣 — 极低频 + 次谐波 + 长尾
    case 3: {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.connect(g);
      g.connect(ctx.destination);
      const freq = randomize(250, 0.05);
      const endFreq = randomize(400, 0.05);
      const vol = randomize(0.22, 0.08);
      const dec = randomize(0.35, 0.08);
      o.frequency.setValueAtTime(freq, t);
      o.frequency.exponentialRampToValueAtTime(endFreq, t + dec * 0.5);
      softAttack(g, vol, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + dec);
      o.start(t);
      o.stop(t + dec);
      // 次谐波 125Hz
      const sub = ctx.createOscillator();
      const subG = ctx.createGain();
      sub.type = 'sine';
      sub.connect(subG);
      subG.connect(ctx.destination);
      sub.frequency.setValueAtTime(randomize(125, 0.05), t);
      softAttack(subG, vol * 0.4, t);
      subG.gain.exponentialRampToValueAtTime(0.01, t + dec * 0.8);
      sub.start(t);
      sub.stop(t + dec * 0.8);
      addBodyLayer(freq, endFreq, vol, dec);
      addBodyLayer(freq * 0.5, endFreq * 0.5, vol * 0.25, dec * 0.7);
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
    o.type = cfg.type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(cfg.vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + cfg.decay);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t);
    o.stop(t + cfg.decay);
  }
}

// === 便捷函数 ===
export const sound = {
  type: () => playSound('type'),
  wrong: () => playSound('wrong'),
  skill: () => playSound('skill'),
  levelup: () => playSound('levelup'),
  gameover: () => playSound('gameover'),
  buy: () => playSound('buy'),
};
