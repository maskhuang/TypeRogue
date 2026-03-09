// ============================================
// 打字肉鸽 - Juice 动画系统
// ============================================

import { getElements } from '../ui/elements';

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

// === 资源产出浮字缩放（以 Lv1 产出者为基准 x1.0，log 放大，无上限，下限 x1.0） ===
const LV1_ADD_BASE: Record<string, number> = {
  base: 5, score: 15, multiplier: 0.2, time: 2, gold: 3,
};
const LV1_MUL_BASE: Record<string, number> = {
  base: 1.0, score: 0.1, multiplier: 0.15, time: 0.2, gold: 0.3,
};

/** 加算浮字缩放：delta = 实际加值 */
export function getFloatScale(resource: string, delta: number): number {
  const ref = LV1_ADD_BASE[resource] ?? 5;
  const ratio = Math.abs(delta) / ref;
  return Math.max(1, Math.log2(1 + ratio));
}

/** 乘算浮字缩放：excess = 有效乘数超额 (value-1)×totalMult */
export function getFloatScaleMul(resource: string, excess: number): number {
  const ref = LV1_MUL_BASE[resource] ?? 0.2;
  const ratio = Math.abs(excess) / ref;
  return Math.max(1, Math.log2(1 + ratio));
}

// === UI 元素弹跳 ===
export function bumpCombo(): void {
  const el = getElements();
  el.combo.classList.remove('combo-bump');
  void el.combo.offsetWidth;
  el.combo.classList.add('combo-bump');
}

export function bumpScore(wordScore = 0): void {
  const el = getElements();
  const scale = getScoreBumpScale(wordScore);
  el.score.style.setProperty('--bump-scale', String(scale));
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

export function bumpTimer(): void {
  const el = getElements();
  el.timerDisplay.classList.remove('timer-bump');
  void el.timerDisplay.offsetWidth;
  el.timerDisplay.classList.add('timer-bump');
  el.timerBar.classList.remove('timer-bar-bump');
  void el.timerBar.offsetWidth;
  el.timerBar.classList.add('timer-bar-bump');
}

// === 屏幕震动 5 档查表系统 ===
export const SHAKE_TIERS = [
  { x: 2, y: 1, duration: 100 },   // intensity 1: 微震
  { x: 4, y: 2, duration: 150 },   // intensity 2: 轻震
  { x: 6, y: 3, duration: 200 },   // intensity 3: 中震
  { x: 10, y: 5, duration: 300 },  // intensity 4: 强震
  { x: 16, y: 8, duration: 400 },  // intensity 5: 猛震
] as const;

/** 无障碍开关：设为 false 可禁用所有屏幕震动 */
export let shakeEnabled = true;
export function setShakeEnabled(v: boolean): void { shakeEnabled = v; }

let currentShakeIntensity = 0;
let shakeTimer: ReturnType<typeof setTimeout> | null = null;

export function screenShake(intensity = 1): void {
  if (!shakeEnabled) return;
  if (intensity < 1 || intensity > 5) return;
  // 最大值叠加：新震动 < 当前值时跳过
  if (intensity < currentShakeIntensity) return;

  const tier = SHAKE_TIERS[intensity - 1];
  const signX = Math.random() < 0.5 ? -1 : 1;
  const signY = Math.random() < 0.5 ? -1 : 1;

  const el = getElements();
  el.container.style.setProperty('--shake-x', `${tier.x * signX}px`);
  el.container.style.setProperty('--shake-y', `${tier.y * signY}px`);
  el.container.style.setProperty('--shake-duration', `${tier.duration}ms`);
  el.container.classList.remove('shake-dynamic');
  void el.container.offsetWidth;
  el.container.classList.add('shake-dynamic');

  currentShakeIntensity = intensity;
  if (shakeTimer) clearTimeout(shakeTimer);
  shakeTimer = setTimeout(() => {
    el.container.classList.remove('shake-dynamic');
    currentShakeIntensity = 0;
    shakeTimer = null;
  }, tier.duration);

  // 猛震（intensity 5）额外触发金色屏幕闪光
  if (intensity === 5) {
    screenFlash('#ffd700', 0.3);
  }
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

// === 计算震动强度（5 档 + 0 档） ===
export function getShakeIntensity(score: number): number {
  if (score >= 10000) return 5;
  if (score >= 5000) return 4;
  if (score >= 1000) return 3;
  if (score >= 500) return 2;
  if (score >= 100) return 1;
  return 0;
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

// === 分数滚轮计数器 ===
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export class ScoreRoller {
  private currentDisplay = 0;
  private target = 0;
  private elapsed = 0;
  private duration = 0;
  private startValue = 0;

  /** 设置新目标分数 */
  setTarget(newTarget: number): void {
    if (newTarget === this.target) return;
    // 正在滚动时跳到旧目标，开始新滚动
    this.currentDisplay = this.target;
    this.startValue = this.currentDisplay;
    this.target = newTarget;
    this.elapsed = 0;
    this.duration = ScoreRoller.getDuration(Math.abs(newTarget - this.startValue));
  }

  /** 帧更新，返回当前显示值 */
  update(dt: number): number {
    if (this.currentDisplay === this.target) return this.currentDisplay;
    this.elapsed += dt;
    const t = Math.min(this.elapsed / this.duration, 1);
    const eased = easeOutCubic(t);
    this.currentDisplay = Math.floor(this.startValue + (this.target - this.startValue) * eased);
    if (t >= 1) this.currentDisplay = this.target;
    return this.currentDisplay;
  }

  /** 纯函数：根据差值计算动画时长（0.3s-0.8s） */
  static getDuration(diff: number): number {
    if (diff <= 0) return 0.3;
    return Math.min(0.8, 0.3 + Math.log10(diff) * 0.15);
  }

  /** 重置状态（关卡切换时调用，避免从旧分数回滚） */
  reset(value = 0): void {
    this.currentDisplay = value;
    this.target = value;
    this.startValue = value;
    this.elapsed = 0;
    this.duration = 0;
  }

  getValue(): number { return this.currentDisplay; }
}

// === 弹性弹出缩放（4 档，默认 1.5 保持原有弹跳反馈） ===
export function getScoreBumpScale(score: number): number {
  if (score >= 10000) return 2.0;
  if (score >= 5000) return 1.8;
  if (score >= 1000) return 1.6;
  return 1.5;
}

// === 慢动作结算 ===
let slowMotionEndTime = 0;
let slowMotionScale = 1.0;

export function triggerSlowMotion(durationMs = 300, scale = 0.7): void {
  slowMotionEndTime = performance.now() + durationMs;
  slowMotionScale = scale;
}

export function getTimeScale(): number {
  if (performance.now() < slowMotionEndTime) return slowMotionScale;
  return 1.0;
}

// === 分数音效分级（4 档） ===
export function getScoreSoundTier(score: number): number {
  if (score >= 5000) return 3;
  if (score >= 1000) return 2;
  if (score >= 100) return 1;
  return 0;
}
