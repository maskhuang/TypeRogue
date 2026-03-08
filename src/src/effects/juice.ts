// ============================================
// 打字肉鸽 - Juice 动画系统
// ============================================

import { getElements } from '../ui/elements';
import { BALANCE } from '../core/constants';
import { state } from '../core/state';

// === 基础弹跳动画 ===
export function juiceUp(element: HTMLElement | null, scale = 0.3, rotation = 3): void {
  if (!element) return;
  element.style.setProperty('--juice-rot', `${rotation}deg`);
  element.classList.remove('juice-up', 'juice-up-strong');
  void element.offsetWidth; // 强制重排
  element.classList.add(scale > 0.3 ? 'juice-up-strong' : 'juice-up');
}

export function juiceUpStrong(element: HTMLElement | null): void {
  juiceUp(element, 0.4, 5);
}

// === UI 元素弹跳 ===
export function bumpCombo(): void {
  const el = getElements();
  el.combo.classList.remove('combo-bump');
  void el.combo.offsetWidth;
  el.combo.classList.add('combo-bump');
}

export function bumpScore(): void {
  const el = getElements();
  el.score.classList.remove('score-bump');
  void el.score.offsetWidth;
  el.score.classList.add('score-bump');
}

export function bumpMultiplier(): void {
  const el = getElements();
  el.multiplier.classList.remove('mult-bump');
  void el.multiplier.offsetWidth;
  el.multiplier.classList.add('mult-bump');
}

// === 屏幕震动 ===
export function screenShake(intensity = 1): void {
  const el = getElements();
  el.container.style.setProperty('--shake-x', `${3 * intensity}px`);
  el.container.style.setProperty('--shake-y', `${2 * intensity}px`);
  el.container.classList.remove('shake-dynamic');
  void el.container.offsetWidth;
  el.container.classList.add('shake-dynamic');
  setTimeout(() => el.container.classList.remove('shake-dynamic'), 150 * intensity);
}

// === 屏幕闪光 ===
export function screenFlash(color: string, opacity = 0.4): void {
  const el = getElements();
  const flash = document.createElement('div');
  flash.className = 'screen-flash';
  flash.style.background = color;
  flash.style.opacity = String(opacity);
  el.container.appendChild(flash);
  setTimeout(() => flash.remove(), 200);
}

// === 倍率视觉反馈 ===
export function updateMultiplierGlow(): void {
  const el = getElements();
  const mult = state.multiplier;

  if (mult >= BALANCE.MULT_HIGH_THRESHOLD) {
    el.container.classList.add('high-mult');
    el.container.classList.remove('mid-mult');
  } else if (mult >= BALANCE.MULT_MID_THRESHOLD) {
    el.container.classList.add('mid-mult');
    el.container.classList.remove('high-mult');
  } else {
    el.container.classList.remove('mid-mult', 'high-mult');
  }
}

// === 计算震动强度 ===
export function getShakeIntensity(score: number): number {
  if (score >= BALANCE.SHAKE_HIGH_THRESHOLD) return 3;
  if (score >= BALANCE.SHAKE_MID_THRESHOLD) return 2;
  return 1;
}

// === 分数颜色分级 ===
/**
 * 根据分数返回对应的 CSS class 名
 * - 0-99: '' (默认白色)
 * - 100-999: 'score-silver' (银白+微光)
 * - 1000-4999: 'score-gold' (金色+发光)
 * - 5000-9999: 'score-rainbow' (彩虹渐变)
 * - 10000+: 'score-legendary' (发光+脉冲)
 */
export function getScoreTier(score: number): string {
  if (score >= 10000) return 'score-legendary';
  if (score >= 5000) return 'score-rainbow';
  if (score >= 1000) return 'score-gold';
  if (score >= 100) return 'score-silver';
  return '';
}

/** 所有分数分级 CSS class，用于清除旧 class */
export const SCORE_TIER_CLASSES = ['score-silver', 'score-gold', 'score-rainbow', 'score-legendary'] as const;
