// ============================================
// 打字肉鸽 - Juice 动画系统
// ============================================

import { getElements } from '../ui/elements';
import { spawnParticles } from './particles';
import { t } from '../demo/demo-i18n';

/** 重启 CSS 动画：移除 class → 下一帧添加，避免强制同步重排 */
function restartAnimation(el: HTMLElement, ...classNames: string[]): void {
  for (const c of classNames) el.classList.remove(c);
  requestAnimationFrame(() => {
    for (const c of classNames) el.classList.add(c);
  });
}

// === 基础弹跳动画 ===
export function juiceUp(element: HTMLElement | null, scale = 0.3, rotation = 3): void {
  if (!element) return;
  element.style.setProperty('--juice-rot', `${rotation}deg`);
  restartAnimation(element, scale > 0.3 ? 'juice-up-strong' : 'juice-up');
}

export function juiceUpStrong(element: HTMLElement | null): void {
  juiceUp(element, 0.4, 5);
}

// === 资源产出浮字缩放（以 Lv1 产出者为基准 x1.0，log 放大，无上限，下限 x1.0） ===
const LV1_ADD_BASE: Record<string, number> = {
  base: 4, score: 11, multiplier: 0.35, time: 2, gold: 3,
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
  restartAnimation(el.combo, 'combo-bump');
}

export function bumpScore(wordScore = 0): void {
  const el = getElements();
  const scale = getScoreBumpScale(wordScore);
  el.score.style.setProperty('--bump-scale', String(scale));
  restartAnimation(el.score, 'score-bump');
}

export function bumpMultiplier(): void {
  const el = getElements();
  restartAnimation(el.multiplier, 'mult-bump');
}

export function bumpTimer(): void {
  const el = getElements();
  restartAnimation(el.timerDisplay, 'timer-bump');
  restartAnimation(el.timerBar, 'timer-bar-bump');
}

export function bumpGold(): void {
  const el = document.getElementById('battle-gold-display');
  if (!el) return;
  restartAnimation(el, 'gold-bump');
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
  restartAnimation(el.container, 'shake-dynamic');

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

// === 分数里程碑庆祝 (Story 31.5) ===
export interface MilestoneTier {
  threshold: number;
  label: string;
  fontSize: number;
  color: string;
  flashColor: string;
  flashOpacity: number;
  particleCount: number;
  particleColor: string;
  shakeIntensity: number;
}

export const MILESTONE_TIERS: readonly MilestoneTier[] = [
  { threshold: 100,   label: '100!',   fontSize: 36, color: '#e0e0e0', flashColor: '#e0e0e0', flashOpacity: 0.15, particleCount: 0,  particleColor: '',        shakeIntensity: 0 },
  { threshold: 500,   label: '500!',   fontSize: 44, color: '#f0e6c0', flashColor: '#f0e6c0', flashOpacity: 0.2,  particleCount: 15, particleColor: '#f0e6c0', shakeIntensity: 0 },
  { threshold: 1000,  label: '1000!',  fontSize: 56, color: '#ffd700', flashColor: '#ffd700', flashOpacity: 0.3,  particleCount: 25, particleColor: '#ffd700', shakeIntensity: 2 },
  { threshold: 5000,  label: '5000!',  fontSize: 72, color: '#a855f7', flashColor: '#a855f7', flashOpacity: 0.4,  particleCount: 40, particleColor: '#a855f7', shakeIntensity: 4 },
  { threshold: 10000, label: '10000!', fontSize: 96, color: '#ffffff', flashColor: '#ffd700', flashOpacity: 0.5,  particleCount: 60, particleColor: '#ffd700', shakeIntensity: 5 },
];

/** 检测分数是否越过里程碑，返回最高新越过的 tier（无越过返回 null） */
export function checkMilestone(prevScore: number, newScore: number): MilestoneTier | null {
  for (let i = MILESTONE_TIERS.length - 1; i >= 0; i--) {
    const tier = MILESTONE_TIERS[i];
    if (newScore >= tier.threshold && prevScore < tier.threshold) {
      return tier;
    }
  }
  return null;
}

/** 显示里程碑庆祝效果（弹出文字 + 闪光 + 粒子 + 屏震） */
export function showMilestoneCelebration(tier: MilestoneTier): void {
  const el = getElements();

  // 屏幕闪光
  screenFlash(tier.flashColor, tier.flashOpacity);

  // 粒子爆发
  if (tier.particleCount > 0) {
    spawnParticles(el.score, tier.particleCount, tier.particleColor);
  }

  // 屏幕震动
  if (tier.shakeIntensity > 0) {
    screenShake(tier.shakeIntensity);
  }
}

// === 关卡评级配置 (Story 31.6) ===
export interface RatingTier {
  grade: string;
  color: string;
  glowColor: string;
  cssClass: string;
  particleCount: number;
  particleColor: string;
  shakeIntensity: number;
}

export const RATING_TIERS: readonly RatingTier[] = [
  { grade: 'C',   color: '#888888', glowColor: '',        cssClass: 'rating-c',   particleCount: 0,  particleColor: '',        shakeIntensity: 0 },
  { grade: 'B',   color: '#4a90d9', glowColor: '',        cssClass: 'rating-b',   particleCount: 0,  particleColor: '',        shakeIntensity: 0 },
  { grade: 'A',   color: '#ffd700', glowColor: '#ffd700', cssClass: 'rating-a',   particleCount: 0,  particleColor: '',        shakeIntensity: 0 },
  { grade: 'S',   color: '#a855f7', glowColor: '#a855f7', cssClass: 'rating-s',   particleCount: 0,  particleColor: '',        shakeIntensity: 0 },
  { grade: 'SS',  color: '#ffd700', glowColor: '#ffd700', cssClass: 'rating-ss',  particleCount: 30, particleColor: '#ffd700', shakeIntensity: 0 },
  { grade: 'SSS', color: '#ff6b6b', glowColor: '#ff6b6b', cssClass: 'rating-sss', particleCount: 50, particleColor: '#ff6b6b', shakeIntensity: 4 },
];

export const GRADE_ORDER = ['C', 'B', 'A', 'S', 'SS', 'SSS'] as const;

export function getRatingTier(grade: string): RatingTier {
  return RATING_TIERS.find(t => t.grade === grade) ?? RATING_TIERS[0];
}

export interface RatingInput {
  score: number;
  targetScore: number;
  perfectWords: number;
  wordsCompleted: number;
  timeRemaining: number;
  timeMax: number;
}

/** 失误率维度：perfectWords / wordsCompleted (0~1 → 0~5) */
function accuracyScore(perfect: number, total: number): number {
  if (total <= 0) return 0;
  return (perfect / total) * 5;
}

/** 完成速度维度：剩余时间占比 (0~1 → 0~5, log 缩放) */
function speedScore(timeRemaining: number, timeMax: number): number {
  if (timeMax <= 0) return 0;
  const ratio = Math.max(0, timeRemaining / timeMax);
  // log 缩放：剩 50% 时间 ≈ 2.5 分，剩 80% ≈ 4 分
  return Math.min(5, Math.log2(1 + ratio * 3) * 2);
}

/** 超杀维度：(score - target) / target (log 缩放, 0~5) */
function overkillScore(score: number, targetScore: number): number {
  if (targetScore <= 0 || score <= targetScore) return 0;
  const ratio = (score - targetScore) / targetScore;
  // log 缩放：50% 超杀 ≈ 1.7, 200% ≈ 3.2, 500% ≈ 4.1
  return Math.min(5, Math.log2(1 + ratio) * 1.8);
}

/** 三维平均 → 6 档评级 */
export function calculateRating(input: RatingInput): string {
  if (input.targetScore <= 0 || input.score < input.targetScore) return 'C';
  const avg = (
    accuracyScore(input.perfectWords, input.wordsCompleted) +
    speedScore(input.timeRemaining, input.timeMax) +
    overkillScore(input.score, input.targetScore)
  ) / 3;
  if (avg >= 4.2) return 'SSS';
  if (avg >= 3.4) return 'SS';
  if (avg >= 2.6) return 'S';
  if (avg >= 1.8) return 'A';
  return 'B';
}

/** 评级揭示 · DPCA-VT220 phosphor terminal teletype（Mock A 接入） */
export function showRatingReveal(finalGrade: string, onComplete: () => void, _soundFn?: (grade: string) => void): void {
  const goldReward = document.getElementById('gold-reward');
  const linesContainer = document.getElementById('ct-lines');
  const headerEl = document.getElementById('ct-header');
  if (!goldReward || !linesContainer) { onComplete(); return; }

  // 头：固定为 EVALUATION TERMINAL（settlement 阶段会改回 SETTLEMENT TERMINAL）
  if (headerEl) {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const MM = String(d.getMonth() + 1).padStart(2, '0');
    const DD = String(d.getDate()).padStart(2, '0');
    // 年份打码，月·日跟当天同步
    headerEl.textContent = t('tt.eval_header', { date: `████·${MM}·${DD}`, time: `${hh}:${mm}` });
  }

  // 显示 bezel（与 settlement 共享 #gold-reward 容器）
  goldReward.classList.remove('gold-reward-hidden', 'gold-reward-hide');
  goldReward.classList.add('gold-reward-show');

  linesContainer.innerHTML = '';
  void runEvaluationTeletype(linesContainer, finalGrade).then(() => {
    // 最终等级 tier 特效（沿用既有粒子/震屏/闪光）
    const tier = getRatingTier(finalGrade);
    const gradeEl = linesContainer.querySelector('.eval-grade-letter') as HTMLElement | null;
    if (gradeEl && tier.particleCount > 0) spawnParticles(gradeEl, tier.particleCount, tier.particleColor);
    if (tier.shakeIntensity > 0) screenShake(tier.shakeIntensity);
    if (tier.glowColor) screenFlash(tier.glowColor, 0.3);

    // 阅读 1000ms → 淡出 → onComplete
    setTimeout(() => {
      goldReward.classList.remove('gold-reward-show');
      goldReward.classList.add('gold-reward-hide');
      setTimeout(() => {
        goldReward.classList.add('gold-reward-hidden');
        goldReward.classList.remove('gold-reward-hide');
        onComplete();
      }, 300);
    }, 1000);
  });
}

const SCAN_FRAMES = [
  '░░░░░░░░░░░░░░░░',
  '▒░░░░░░░░░░░░░░░',
  '▒▒▒░░░░░░░░░░░░░',
  '▓▒▒▒░░░░░░░░░░░░',
  '▓▓▒▒▒░░░░░░░░░░░',
  '▓▓▓▓▒▒▒░░░░░░░░░',
  '▓▓▓▓▓▓▒▒▒░░░░░░░',
  '▓▓▓▓▓▓▓▓▒▒░░░░░░',
  '▓▓▓▓▓▓▓▓▓▓▒▒░░░░',
  '▓▓▓▓▓▓▓▓▓▓▓▓▒▒░░',
  '▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒░',
  '▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓',
];

function gradeTierClass(grade: string): string {
  return grade === 'SSS' ? 'tier-sss' :
         grade === 'SS'  ? 'tier-ss'  :
         grade === 'S'   ? 'tier-s'   :
         grade === 'A'   ? 'tier-a'   :
         grade === 'B'   ? 'tier-b'   : 'tier-c';
}

async function runEvaluationTeletype(container: HTMLElement, grade: string): Promise<void> {
  const newLine = (cls = ''): HTMLDivElement => {
    const line = document.createElement('div');
    line.className = `ct-line ${cls}`.trim();
    line.innerHTML = '<span class="typed"></span><span class="cursor"></span>';
    container.appendChild(line);
    line.classList.add('shown');
    return line;
  };

  const typeLine = (lineEl: HTMLElement, text: string, speed: number): Promise<void> => {
    return new Promise(resolve => {
      const typed = lineEl.querySelector('.typed') as HTMLElement | null;
      if (!text || speed === 0) {
        if (typed) typed.textContent = text;
        lineEl.classList.add('done');
        resolve();
        return;
      }
      let i = 0;
      const tick = () => {
        if (typed) typed.textContent = text.slice(0, ++i);
        if (i >= text.length) { lineEl.classList.add('done'); resolve(); }
        else setTimeout(tick, speed);
      };
      tick();
    });
  };

  const scanLine = (): Promise<void> => {
    const line = newLine('eval-scan');
    line.classList.add('done');
    const typed = line.querySelector('.typed') as HTMLElement;
    return new Promise(resolve => {
      let i = 0;
      const tick = () => {
        typed.textContent = `> ${SCAN_FRAMES[i]}`;
        if (++i >= SCAN_FRAMES.length) resolve();
        else setTimeout(tick, 70);
      };
      tick();
    });
  };

  await typeLine(newLine(), t('tt.eval_processed'),  16);
  await new Promise(r => setTimeout(r, 200));
  await typeLine(newLine(), t('tt.eval_scanning'),   14);
  await new Promise(r => setTimeout(r, 100));
  await scanLine();
  await new Promise(r => setTimeout(r, 200));
  await typeLine(newLine(), t('tt.eval_complete'),   14);
  await new Promise(r => setTimeout(r, 250));

  // GRADE 行：先打前缀文字，再追加大字母
  const gradeLine = newLine();
  await typeLine(gradeLine, t('tt.eval_grade_prefix'), 18);
  const typed = gradeLine.querySelector('.typed') as HTMLElement | null;
  if (typed) {
    const big = document.createElement('span');
    big.className = `eval-grade-letter ${gradeTierClass(grade)} pulse`;
    big.textContent = grade;
    typed.appendChild(big);
  }
  // 等级显示后短暂 hold（特效 + 用户阅读）
  await new Promise(r => setTimeout(r, 600));
}

// === 分数音效分级（4 档） ===
export function getScoreSoundTier(score: number): number {
  if (score >= 5000) return 3;
  if (score >= 1000) return 2;
  if (score >= 100) return 1;
  return 0;
}
