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
