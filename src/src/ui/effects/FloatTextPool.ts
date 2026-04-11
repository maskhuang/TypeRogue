// ============================================
// 打字肉鸽 - 浮字系统 v4（纯 fillRect，零文本渲染）
// ============================================

const POOL_SIZE = 48;
const PIXEL_FONT = '"Press Start 2P", "Courier New", monospace';

interface FloatInstance {
  active: boolean;
  text: string;
  color: string;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  size: number;
  // 飞行
  flight: boolean;
  startX: number;
  startY: number;
  cpX: number;
  cpY: number;
  endX: number;
  endY: number;
  flightDuration: number;
  dwellTime: number;
  onArrive?: () => void;
}

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
const pool: FloatInstance[] = [];
let animFrameId = 0;
let lastTime = 0;

function qb(p0: number, p1: number, p2: number, t: number): number {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
}

function tick(): void {
  if (!ctx || !canvas) return;
  const now = performance.now();
  const dt = now - lastTime;
  lastTime = now;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // 保持 canvas 永远"脏"，避免空→有内容时的 GPU 纹理重分配
  ctx.globalAlpha = 0.01;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 1, 1);
  ctx.globalAlpha = 1;

  for (const f of pool) {
    if (!f.active) continue;
    f.life += dt;

    if (f.flight) {
      const fe = Math.max(0, f.life - f.dwellTime);
      const tl = Math.min(fe / f.flightDuration, 1);
      const ts = Math.floor(tl * 12) / 12;
      const x = qb(f.startX, f.cpX, f.endX, ts);
      const y = qb(f.startY, f.cpY, f.endY, ts);
      const vis = f.life >= f.dwellTime * 0.3;
      const s = ts > 0.8 ? f.size * (1 - (ts - 0.8) / 0.2) : f.size;
      if (vis && s > 0) {
        const h = Math.max(1, s / 2 | 0);
        // 投影：沿起点→终点直线（地面路径），进度与飞行同步
        const groundX = f.startX + (f.endX - f.startX) * ts;
        const groundY = f.startY + (f.endY - f.startY) * ts;
        const height = Math.max(0, groundY - y); // 球离地面的高度
        const shadowScale = Math.max(0.3, 1 - height * 0.008);
        const shadowW = Math.max(3, (h * 1.5 * shadowScale) | 0);
        const shadowH = Math.max(1, (h * 0.5 * shadowScale) | 0);
        ctx.globalAlpha = 0.35 * shadowScale;
        ctx.fillStyle = '#000';
        ctx.fillRect(groundX - shadowW, groundY + h, shadowW * 2, shadowH * 2);
        // 小球主体
        ctx.globalAlpha = 1;
        ctx.fillStyle = f.color;
        ctx.fillRect(x - h, y - h, h * 2, h * 2);
        // 残影
        if (ts > 0) {
          const pt = Math.max(0, ts - 1 / 12);
          ctx.globalAlpha = 0.3;
          const th = Math.max(1, h * 0.5 | 0);
          ctx.fillRect(qb(f.startX, f.cpX, f.endX, pt) - th, qb(f.startY, f.cpY, f.endY, pt) - th, th * 2, th * 2);
        }
      }
      if (tl >= 1) { f.active = false; f.onArrive?.(); }
    } else {
      const t = Math.min(f.life / f.maxLife, 1);
      const ts = Math.floor(t * 8) / 8;
      const y = f.y - ts * 30;
      const a = ts < 0.125 ? 1 : Math.max(0, 1 - (ts - 0.125) / 0.875);
      if (a > 0) {
        const fontSize = Math.max(12, Math.round(22 * (f.size / 6)));
        const px = Math.round(f.x);
        const py = Math.round(y);
        ctx.font = `${fontSize}px ${PIXEL_FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.imageSmoothingEnabled = false;
        // 文字阴影（随字号缩放）
        const shadowOff = Math.max(1, Math.round(fontSize / 10));
        ctx.globalAlpha = a * 0.5;
        ctx.fillStyle = '#000';
        ctx.fillText(f.text, px + shadowOff, py + shadowOff);
        // 主体
        ctx.globalAlpha = a;
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, px, py);
      }
      if (t >= 1) f.active = false;
    }
  }

  ctx.globalAlpha = 1;
  animFrameId = requestAnimationFrame(tick);
}

function acquire(): FloatInstance | null {
  for (const f of pool) if (!f.active) return f;
  let o: FloatInstance | null = null, ml = -1;
  for (const f of pool) if (f.life > ml) { ml = f.life; o = f; }
  return o;
}

function make(): FloatInstance {
  return { active: false, text: '', color: '#fff', x: 0, y: 0, life: 0, maxLife: 800, size: 6, flight: false, startX: 0, startY: 0, cpX: 0, cpY: 0, endX: 0, endY: 0, flightDuration: 500, dwellTime: 150, onArrive: undefined };
}

export function initFloatTextCanvas(container: HTMLElement): void {
  if (canvas) return;
  canvas = document.createElement('canvas');
  canvas.width = container.offsetWidth || 900;
  canvas.height = container.offsetHeight || 600;
  canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:150;';
  container.appendChild(canvas);
  ctx = canvas.getContext('2d')!;
  pool.length = 0;
  for (let i = 0; i < POOL_SIZE; i++) pool.push(make());
  lastTime = performance.now();
  animFrameId = requestAnimationFrame(tick);
}

export function preheatFloatTexts(_entries: Array<{ text: string; color: string }>): void {}

export function spawnFloatText(text: string, color: string, _scale = 1, containerW = 900, containerH = 600): void {
  const f = acquire();
  if (!f) return;
  f.active = true;
  f.text = text;
  f.color = color;
  f.x = (0.35 + Math.random() * 0.3) * containerW;
  f.y = 0.62 * containerH;
  f.life = 0; f.maxLife = 800; f.size = 8; f.flight = false;
  f.onArrive = undefined;
}

export function spawnFlightText(
  text: string, color: string, scale: number,
  startX: number, startY: number,
  cpX: number, cpY: number,
  endX: number, endY: number,
  duration: number, dwellTime: number,
  onArrive?: () => void,
): void {
  const s = Math.max(0.5, scale);
  // 就地文字——size 按 scale 放大
  const f1 = acquire();
  if (f1) {
    f1.active = true; f1.text = text; f1.color = color;
    f1.x = startX; f1.y = startY - 15;
    f1.life = 0; f1.maxLife = Math.min(1500, Math.round(400 * Math.pow(s, 0.5))); f1.size = Math.round(6 * s); f1.flight = false;
    f1.onArrive = undefined;
  }
  // 飞行小球——size 按 scale 放大
  const f2 = acquire();
  if (f2) {
    f2.active = true; f2.color = color; f2.life = 0;
    f2.flight = true; f2.size = Math.round(4 + s * 3);
    f2.startX = startX; f2.startY = startY;
    f2.cpX = cpX; f2.cpY = cpY;
    f2.endX = endX; f2.endY = endY;
    f2.flightDuration = duration; f2.dwellTime = dwellTime;
    f2.onArrive = onArrive;
  }
}

export function clearFloatTexts(): void {
  for (const f of pool) f.active = false;
  if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

export function resizeFloatCanvas(w: number, h: number): void {
  if (!canvas) return;
  canvas.width = w; canvas.height = h;
}
