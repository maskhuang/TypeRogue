// ============================================
// 打字肉鸽 - 常量定义
// ============================================

// === 键盘布局 ===
export const KEYBOARD_ROWS = [
  'qwertyuiop'.split(''),
  'asdfghjkl'.split(''),
  'zxcvbnm'.split('')
];

export const KEYS = KEYBOARD_ROWS.flat();

// === 标点解放遗物：扩展键位 ===
export const PUNCTUATION_KEYS = [';', ',', '.', '/'];
export const PUNCTUATION_KEYBOARD_EXTENSION: Record<number, string[]> = {
  1: [';'],           // home row 追加 ;
  2: [',', '.', '/'], // bottom row 追加 , . /
};
export const RELIC_GARBLE_CHARS = ',.;/';
export const RELIC_GARBLE_RATE = 0.15;

// === 键盘相邻关系 ===
export const ADJACENT_KEYS: Record<string, string[]> = {
  q: ['w', 'a'],
  w: ['q', 'e', 'a', 's'],
  e: ['w', 'r', 's', 'd'],
  r: ['e', 't', 'd', 'f'],
  t: ['r', 'y', 'f', 'g'],
  y: ['t', 'u', 'g', 'h'],
  u: ['y', 'i', 'h', 'j'],
  i: ['u', 'o', 'j', 'k'],
  o: ['i', 'p', 'k', 'l'],
  p: ['o', 'l', ';'],
  a: ['q', 'w', 's', 'z'],
  s: ['a', 'w', 'e', 'd', 'z', 'x'],
  d: ['s', 'e', 'r', 'f', 'x', 'c'],
  f: ['d', 'r', 't', 'g', 'c', 'v'],
  g: ['f', 't', 'y', 'h', 'v', 'b'],
  h: ['g', 'y', 'u', 'j', 'b', 'n'],
  j: ['h', 'u', 'i', 'k', 'n', 'm'],
  k: ['j', 'i', 'o', 'l', 'm', ','],
  l: ['k', 'o', 'p', ';', ','],
  z: ['a', 's', 'x'],
  x: ['z', 's', 'd', 'c'],
  c: ['x', 'd', 'f', 'v'],
  v: ['c', 'f', 'g', 'b'],
  b: ['v', 'g', 'h', 'n'],
  n: ['b', 'h', 'j', 'm'],
  m: ['n', 'j', 'k', ','],
  // 标点键邻接（标点解放遗物）
  ';': ['l', 'p', '.', '/'],
  ',': ['m', '.', 'k', 'l'],
  '.': [',', '/', 'l', ';'],
  '/': ['.', ';'],
};

// === 游戏平衡数值 ===
export const BALANCE = {
  // 基础数值
  BASE_MULTIPLIER: 1.0,
  COMBO_BONUS: 0.1,
  TIME_PER_LEVEL: 30,

  // 关卡目标公式参数
  TARGET_BASE: 80,
  TARGET_LINEAR: 40,
  TARGET_QUADRATIC: 5,

  // 商店价格
  SKILL_PRICE_MIN: 15,
  SKILL_PRICE_MAX: 30,
  SKILL_UPGRADE_PRICE: 25,
  WORD_REMOVE_BASE: 1,

  // 周目难度缩放
  CYCLE_SCORE_BASE: 2,      // 目标分数指数底数（每周目翻倍）
  CYCLE_TIME_DECAY: 0.9,    // 时间衰减系数（每周目 ×0.9）
};

// === 资源标签 ===
export const RESOURCE_LABELS: Record<string, string> = {
  base: '基数', score: '分数', multiplier: '倍率', time: '时间', gold: '金币',
  fragment: '碎片', mutagen: '变异素',
};

// === 资源图标 ===
export const RESOURCE_ICONS: Record<string, string> = {
  base: '⚔️', score: '🪙', multiplier: '🔥', time: '⏳', gold: '💰',
  fragment: '🔤', mutagen: '🧬',
};

// === 资源颜色 ===
export const RESOURCE_COLORS: Record<string, string> = {
  base: '#e74c3c',       // 红
  score: '#f1c40f',      // 金
  multiplier: '#e67e22',  // 橙
  time: '#3498db',       // 蓝
  gold: '#ffd700',       // 金币
  fragment: '#9b59b6',   // 紫（造词师碎片）
  mutagen: '#2ecc71',    // 绿（蜕变师变异素）
};

// === 动画参数 ===
export const ANIMATION = {
  JUICE_DURATION: 350,
  JUICE_STRONG_DURATION: 400,
  SHAKE_DURATION: 150,
  LETTER_ENTER_DELAY: 30,
  SKILL_FLOAT_DELAY: 200,
};

// === 音效配置 ===
export const SOUND_PROFILES: Record<string, [number, number, number]> = {
  type: [500, 800, 0.06],
  wrong: [150, 80, 0.1],
  skill: [450, 850, 0.12],
  word: [523, 784, 0.15],
  levelup: [400, 800, 0.15],
  gameover: [300, 100, 0.2],
  buy: [500, 380, 0.06],             // ↓中高频下行，轻快购买感
  crit: [800, 1600, 0.15],           // ↑高频上行，暴击冲击感
  pulse: [600, 1200, 0.12],          // ↑中高频上行，脉冲爆发感
  quest_complete: [523, 1046, 0.14], // ↑八度上行，成就感
  taboo: [200, 100, 0.10],           // ↓低频下行，警告感
};
