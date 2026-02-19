// ============================================
// 打字肉鸽 - 音效系统
// ============================================

import { SOUND_PROFILES } from '../core/constants';
import { state } from '../core/state';

let audioContext: AudioContext | null = null;

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

  // 特殊处理: type 音效根据连击数调整音高
  let profile = SOUND_PROFILES[type];
  if (type === 'type') {
    profile = [500 + state.combo * 15, 800, 0.06];
  }

  const [startFreq, endFreq, volume] = profile || [600, 800, 0.08];

  oscillator.frequency.setValueAtTime(startFreq, time);
  oscillator.frequency.exponentialRampToValueAtTime(endFreq, time + 0.1);
  gainNode.gain.setValueAtTime(volume, time);
  gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

  oscillator.start(time);
  oscillator.stop(time + 0.15);
}

// === 便捷函数 ===
export const sound = {
  type: () => playSound('type'),
  wrong: () => playSound('wrong'),
  skill: () => playSound('skill'),
  word: () => playSound('word'),
  levelup: () => playSound('levelup'),
  gameover: () => playSound('gameover'),
};
