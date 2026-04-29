/**
 * 液态背景渲染层（多 style）。
 *
 * 单例：在 #game-container 里塞一个 fullsize <canvas>，渲染选中 style 的 fragment shader。
 *
 * 当前 style：
 *   - 'liquid'  Balatro 5 次迭代 trig 漩涡 + 三色 blob（默认）
 *   - 'marble'  FBM domain-warping，慢速大理石纹路
 *   - 'cells'   Voronoi 软边距离场，慢速气泡 / 蜂窝
 *
 * API:
 *   setPaletteHsl(h, s) — 从游戏 palette 选一个 base hue/sat，自动派生三色 blob。
 *   setLightnessBias(v) — combo 驱动的整屏 RGB 偏置（0..0.2）。
 *   setStyle(name)      — 切换 style，重编译 shader。
 *   ensureMounted()     — 幂等挂载。
 *
 * 调试：window.__bgStyle('marble') 可在控制台直接切。
 */

const VERTEX_SRC = `#version 100
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

// ---- Style: liquid (Balatro) -----------------------------------
const FRAGMENT_LIQUID = `#version 100
precision highp float;
uniform vec2  u_resolution;
uniform float u_time;
uniform float u_speed;
uniform float u_spin_amount;
uniform float u_contrast;
uniform vec3  u_color1;
uniform vec3  u_color2;
uniform vec3  u_color3;
uniform float u_l_bias;
#define SPIN_EASE 0.5

void main() {
  vec2 frag = gl_FragCoord.xy;
  float minSide = min(u_resolution.x, u_resolution.y);
  vec2 uv = (frag - 0.5 * u_resolution) / minSide;
  float speed = u_time * u_speed;
  float uv_len = length(uv);
  float new_pixel_angle = atan(uv.y, uv.x) + speed
      - SPIN_EASE * 20.0 * (u_spin_amount * uv_len + (1.0 - u_spin_amount));
  uv = vec2(uv_len * cos(new_pixel_angle), uv_len * sin(new_pixel_angle));
  uv *= 30.0;
  speed = u_time * 2.0;
  vec2 uv2 = vec2(uv.x + uv.y);
  for (int i = 0; i < 5; i++) {
    uv2 += sin(max(uv.x, uv.y)) + uv;
    uv  += 0.5 * vec2(
      cos(5.1123314 + 0.353 * uv2.y + speed * 0.131121),
      sin(uv2.x - 0.113 * speed)
    );
    uv  -= 1.0 * cos(uv.x + uv.y) - 1.0 * sin(uv.x * 0.711 - uv.y);
  }
  float contrast_mod = 0.25 * u_contrast + 0.5 * u_spin_amount + 1.2;
  float paint_res = min(2.0, max(0.0, length(uv) * 0.035 * contrast_mod));
  float c1p = max(0.0, 1.0 - contrast_mod * abs(1.0 - paint_res));
  float c2p = max(0.0, 1.0 - contrast_mod * abs(paint_res));
  float c3p = 1.0 - min(1.0, c1p + c2p);
  vec3 col = (0.3 / u_contrast) * u_color1
           + (1.0 - 0.3 / u_contrast) * (u_color1 * c1p + u_color2 * c2p + u_color3 * c3p);
  col += vec3(u_l_bias);
  gl_FragColor = vec4(col, 1.0);
}
`;

// ---- Style: marble (FBM domain warping) ------------------------
// Inigo Quilez "domain warping" 的简化版：3 层 FBM，第二层用第一层扭曲坐标，最终结果再扭一次
const FRAGMENT_MARBLE = `#version 100
precision highp float;
uniform vec2  u_resolution;
uniform float u_time;
uniform float u_speed;
uniform vec3  u_color1;
uniform vec3  u_color2;
uniform vec3  u_color3;
uniform float u_l_bias;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * vnoise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  float minSide = min(u_resolution.x, u_resolution.y);
  vec2 uv = (frag - 0.5 * u_resolution) / minSide * 2.5;
  float t = u_time * u_speed;
  // 第一层 domain warp 也带时间，pattern 主体会缓慢扭曲
  vec2 q = vec2(fbm(uv + vec2(t * 0.18, 0.0)),
                fbm(uv + vec2(5.2, 1.3 + t * 0.15)));
  // 第二层加速 ~2× 让墨纹流动更明显
  vec2 r = vec2(
    fbm(uv + 4.0 * q + vec2(t * 0.6, 1.7)),
    fbm(uv + 4.0 * q + vec2(8.3, t * 0.55))
  );
  float f = fbm(uv + 4.0 * r);
  vec3 col = mix(u_color1, u_color2, smoothstep(0.0, 0.55, f));
  col      = mix(col,       u_color3, smoothstep(0.55, 0.95, f));
  col += vec3(u_l_bias);
  gl_FragColor = vec4(col, 1.0);
}
`;

// ---- Style: cells (Voronoi soft edges) -------------------------
const FRAGMENT_CELLS = `#version 100
precision highp float;
uniform vec2  u_resolution;
uniform float u_time;
uniform float u_speed;
uniform vec3  u_color1;
uniform vec3  u_color2;
uniform vec3  u_color3;
uniform float u_l_bias;

vec2 hash22(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  float minSide = min(u_resolution.x, u_resolution.y);
  vec2 uv = (frag - 0.5 * u_resolution) / minSide * 4.5;
  float t = u_time * u_speed * 6.0;
  vec2 ip = floor(uv);
  vec2 fp = fract(uv);
  float d1 = 8.0;
  float d2 = 8.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash22(ip + g);
      vec2 pos = g + 0.5 + 0.5 * sin(t + 6.2831 * o) - fp;
      float d = dot(pos, pos);
      if (d < d1) { d2 = d1; d1 = d; }
      else if (d < d2) { d2 = d; }
    }
  }
  // d2 - d1 是相邻 cell 的边界距离，给软边
  float edge = sqrt(d2) - sqrt(d1);
  vec3 col = mix(u_color1, u_color2, smoothstep(0.0, 0.6, sqrt(d1)));
  col      = mix(col,       u_color3, smoothstep(0.0, 0.18, edge));
  col += vec3(u_l_bias);
  gl_FragColor = vec4(col, 1.0);
}
`;

// ---- Style: aurora (horizontal noise-driven bands) -------------
const FRAGMENT_AURORA = `#version 100
precision highp float;
uniform vec2  u_resolution;
uniform float u_time;
uniform float u_speed;
uniform vec3  u_color1;
uniform vec3  u_color2;
uniform vec3  u_color3;
uniform float u_l_bias;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  float minSide = min(u_resolution.x, u_resolution.y);
  vec2 uv = (frag - 0.5 * u_resolution) / minSide * 2.5;
  float t = u_time * u_speed * 3.0;
  float energy = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float wave = vnoise(vec2(uv.x * 1.5 + t * (0.2 + 0.1 * fi), fi * 7.0)) - 0.5;
    float y = uv.y - wave * 0.6 - (fi - 1.0) * 0.5;
    energy += smoothstep(0.45, 0.0, abs(y)) * (0.5 + 0.5 * sin(t * 0.5 + fi * 2.0));
  }
  energy = clamp(energy, 0.0, 1.5);
  vec3 col = mix(u_color1, u_color2, smoothstep(0.0, 0.7, energy));
  col      = mix(col,       u_color3, smoothstep(0.7, 1.4, energy));
  col += vec3(u_l_bias);
  gl_FragColor = vec4(col, 1.0);
}
`;

// ---- Style: ink (高对比 FBM，墨迹晕染) -------------------------
const FRAGMENT_INK = `#version 100
precision highp float;
uniform vec2  u_resolution;
uniform float u_time;
uniform float u_speed;
uniform vec3  u_color1;
uniform vec3  u_color2;
uniform vec3  u_color3;
uniform float u_l_bias;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * vnoise(p); p *= 2.0; a *= 0.5; }
  return v;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  float minSide = min(u_resolution.x, u_resolution.y);
  vec2 uv = (frag - 0.5 * u_resolution) / minSide * 1.8;
  float t = u_time * u_speed;
  vec2 q = vec2(fbm(uv + vec2(t * 0.6, 0.0)),
                fbm(uv + vec2(0.0, t * 0.45)));
  // 第二层 warp 让墨晕本身也流动，不只是 q 在动
  vec2 r = vec2(fbm(uv + 2.0 * q + vec2(t * 0.3, 1.7)),
                fbm(uv + 2.0 * q + vec2(8.3, t * 0.25)));
  float f = fbm(uv + 2.0 * r);
  // 高对比 smoothstep 让 FBM 量化成墨块边缘
  float ink = smoothstep(0.40, 0.55, f);
  vec3 col = mix(u_color1, u_color2, ink);
  col      = mix(col,       u_color3, smoothstep(0.62, 0.82, f));
  col += vec3(u_l_bias);
  gl_FragColor = vec4(col, 1.0);
}
`;

const STYLES: Record<string, { fragment: string; defaultSpeed: number }> = {
  liquid: { fragment: FRAGMENT_LIQUID, defaultSpeed: 0.0075 },
  marble: { fragment: FRAGMENT_MARBLE, defaultSpeed: 0.04   },
  cells:  { fragment: FRAGMENT_CELLS,  defaultSpeed: 0.025  },
  aurora: { fragment: FRAGMENT_AURORA, defaultSpeed: 0.05   },
  ink:    { fragment: FRAGMENT_INK,    defaultSpeed: 0.025  },
};
type StyleName = keyof typeof STYLES;

interface CompiledProgram {
  prog: WebGLProgram;
  fs: WebGLShader;
  vs: WebGLShader;
  uniforms: {
    resolution: WebGLUniformLocation | null;
    time:       WebGLUniformLocation | null;
    speed:      WebGLUniformLocation | null;
    spin:       WebGLUniformLocation | null;
    contrast:   WebGLUniformLocation | null;
    color1:     WebGLUniformLocation | null;
    color2:     WebGLUniformLocation | null;
    color3:     WebGLUniformLocation | null;
    lBias:      WebGLUniformLocation | null;
  };
}

let canvas: HTMLCanvasElement | null = null;
let gl: WebGLRenderingContext | null = null;
let compiled: CompiledProgram | null = null;
let currentStyle: StyleName = 'cells';
let rafId: number | null = null;
const t0 = performance.now();

// 用户在设置里选的模式：'off' = 关闭背景，'random' = 主菜单时随机抽，
// 其它 = 强制锁定到指定 style。setRandomStyle() 会尊重这个选择。
type UserMode = 'off' | 'random' | StyleName;
let userMode: UserMode = 'random';

const state = {
  speed: STYLES.cells.defaultSpeed,
  speedMul: 1.0,
  spin: 0,
  contrast: 3.5,
  color1: [0.05, 0.10, 0.18] as [number, number, number],
  color2: [0.20, 0.15, 0.32] as [number, number, number],
  color3: [0.10, 0.20, 0.20] as [number, number, number],
  lBias: 0,
};

function compileShader(g: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const sh = g.createShader(type);
  if (!sh) throw new Error('createShader failed');
  g.shaderSource(sh, src);
  g.compileShader(sh);
  if (!g.getShaderParameter(sh, g.COMPILE_STATUS)) {
    const log = g.getShaderInfoLog(sh) ?? '(no log)';
    throw new Error(`shader compile failed: ${log}`);
  }
  return sh;
}

function buildProgram(name: StyleName): CompiledProgram {
  if (!gl) throw new Error('gl not initialized');
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SRC);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, STYLES[name].fragment);
  const prog = gl.createProgram();
  if (!prog) throw new Error('createProgram failed');
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prog) ?? 'link failed');
  }
  return {
    prog, vs, fs,
    uniforms: {
      resolution: gl.getUniformLocation(prog, 'u_resolution'),
      time:       gl.getUniformLocation(prog, 'u_time'),
      speed:      gl.getUniformLocation(prog, 'u_speed'),
      spin:       gl.getUniformLocation(prog, 'u_spin_amount'),
      contrast:   gl.getUniformLocation(prog, 'u_contrast'),
      color1:     gl.getUniformLocation(prog, 'u_color1'),
      color2:     gl.getUniformLocation(prog, 'u_color2'),
      color3:     gl.getUniformLocation(prog, 'u_color3'),
      lBias:      gl.getUniformLocation(prog, 'u_l_bias'),
    },
  };
}

function disposeProgram(p: CompiledProgram) {
  if (!gl) return;
  gl.deleteProgram(p.prog);
  gl.deleteShader(p.vs);
  gl.deleteShader(p.fs);
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

function resize() {
  if (!canvas || !gl) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(canvas.clientWidth * dpr);
  const h = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
  }
}

function frame() {
  if (!gl || !compiled || !canvas) return;
  resize();
  const t = (performance.now() - t0) / 1000;
  const u = compiled.uniforms;
  if (u.resolution) gl.uniform2f(u.resolution, canvas.width, canvas.height);
  if (u.time)       gl.uniform1f(u.time, t);
  if (u.speed)      gl.uniform1f(u.speed, state.speed * state.speedMul);
  if (u.spin)       gl.uniform1f(u.spin, state.spin);
  if (u.contrast)   gl.uniform1f(u.contrast, state.contrast);
  if (u.lBias)      gl.uniform1f(u.lBias, state.lBias);
  if (u.color1)     gl.uniform3fv(u.color1, state.color1);
  if (u.color2)     gl.uniform3fv(u.color2, state.color2);
  if (u.color3)     gl.uniform3fv(u.color3, state.color3);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  rafId = requestAnimationFrame(frame);
}

export function ensureMounted(): boolean {
  if (userMode === 'off') return false;
  if (canvas) return true;
  const container = document.getElementById('game-container');
  if (!container) return false;

  canvas = document.createElement('canvas');
  canvas.id = 'balatro-bg-canvas';
  container.insertBefore(canvas, container.firstChild);

  const ctx = canvas.getContext('webgl', { antialias: false, alpha: false });
  if (!ctx) {
    canvas.remove();
    canvas = null;
    return false;
  }
  gl = ctx;

  try {
    compiled = buildProgram(currentStyle);
    gl.useProgram(compiled.prog);
  } catch (err) {
    console.error('[balatroBackground] shader setup failed:', err);
    canvas.remove();
    canvas = null;
    gl = null;
    return false;
  }

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,  1, -1,  -1,  1,
    -1,  1,  1, -1,   1,  1,
  ]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(compiled.prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  rafId = requestAnimationFrame(frame);

  // Debug shortcut for live tuning. 不传参数会列出可用 style。
  const w = window as unknown as { __bgStyle?: (n?: string) => void };
  w.__bgStyle = (n?: string) => {
    if (!n) {
      console.log(`Available: ${Object.keys(STYLES).join(', ')}; current = ${currentStyle}`);
      return;
    }
    setStyle(n);
  };
  return true;
}

/**
 * 主菜单进入时由 battle.ts 调用，原意是"每局随机抽一次 style"。
 * 现在尊重用户设置：off 跳过；指定 style 则锁定；random 才真随机。
 */
export function setRandomStyle(): void {
  if (userMode === 'off') return;
  if (userMode !== 'random') {
    setStyle(userMode);
    return;
  }
  const names = Object.keys(STYLES);
  setStyle(names[Math.floor(Math.random() * names.length)]);
}

/**
 * 应用用户在设置面板里选的背景模式。
 *   'off'    → 取消 RAF + 隐藏 canvas
 *   'random' → 解除锁定，下次进主菜单照常随机
 *   其它     → 立刻切到指定 style 并锁定
 */
export function setBackgroundMode(mode: UserMode): void {
  userMode = mode;
  if (mode === 'off') {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (canvas) canvas.style.display = 'none';
    return;
  }
  if (canvas) canvas.style.display = '';
  if (mode !== 'random') {
    setStyle(mode); // ensureMounted + 重编译
  } else if (!canvas) {
    ensureMounted();
  }
  if (compiled && rafId === null) {
    rafId = requestAnimationFrame(frame);
  }
}

/** 切换 style，重新编译 shader。 */
export function setStyle(name: string): void {
  if (!(name in STYLES)) {
    console.warn(`[balatroBackground] unknown style: ${name}; available: ${Object.keys(STYLES).join(', ')}`);
    return;
  }
  if (!ensureMounted() || !gl) return;
  if (compiled) disposeProgram(compiled);
  currentStyle = name as StyleName;
  state.speed = STYLES[currentStyle].defaultSpeed;
  compiled = buildProgram(currentStyle);
  gl.useProgram(compiled.prog);
  // Re-bind quad's vertex attrib for the new program (locations may differ).
  const aPos = gl.getAttribLocation(compiled.prog, 'a_pos');
  if (aPos >= 0) {
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  }
}

/** 从游戏 palette 的 (h, s) 派生三色 blob。 */
export function setPaletteHsl(h: number, s: number): void {
  if (!ensureMounted()) return;
  state.color1 = hslToRgb((h + 350) % 360, Math.min(100, s + 5), 10);
  state.color2 = hslToRgb(h,                Math.min(100, s + 8), 22);
  state.color3 = hslToRgb((h + 25) % 360,   s,                    14);
}

/** combo→亮度偏置（0..0.2 RGB additive）。0 = baseline，0.2 = 满 combo。 */
export function setLightnessBias(v: number): void {
  state.lBias = Math.max(0, Math.min(0.2, v));
}

/** 时间加速→背景动效速度倍率（夹在 0.5..4.0）。1.0 = 默认。 */
export function setSpeedMultiplier(v: number): void {
  state.speedMul = Math.max(0.5, Math.min(4.0, v));
}
