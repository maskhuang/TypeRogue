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
  p: ['o', 'l'],
  a: ['q', 'w', 's', 'z'],
  s: ['a', 'w', 'e', 'd', 'z', 'x'],
  d: ['s', 'e', 'r', 'f', 'x', 'c'],
  f: ['d', 'r', 't', 'g', 'c', 'v'],
  g: ['f', 't', 'y', 'h', 'v', 'b'],
  h: ['g', 'y', 'u', 'j', 'b', 'n'],
  j: ['h', 'u', 'i', 'k', 'n', 'm'],
  k: ['j', 'i', 'o', 'l', 'm'],
  l: ['k', 'o', 'p'],
  z: ['a', 's', 'x'],
  x: ['z', 's', 'd', 'c'],
  c: ['x', 'd', 'f', 'v'],
  v: ['c', 'f', 'g', 'b'],
  b: ['v', 'g', 'h', 'n'],
  n: ['b', 'h', 'j', 'm'],
  m: ['n', 'j', 'k'],
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

  // 倍率视觉反馈阈值
  MULT_MID_THRESHOLD: 1.5,
  MULT_HIGH_THRESHOLD: 2.5,

  // 震动强度阈值
  SHAKE_MID_THRESHOLD: 10,
  SHAKE_HIGH_THRESHOLD: 20,
};

// === 资源标签 ===
export const RESOURCE_LABELS: Record<string, string> = {
  base: '基数', score: '分数', multiplier: '倍率', time: '时间', shield: '护盾', gold: '金币',
};

// === 资源图标 ===
export const RESOURCE_ICONS: Record<string, string> = {
  base: '⚔️', score: '🪙', multiplier: '🔥', time: '⏳', shield: '🛡️', gold: '💰',
};

// === 资源颜色 ===
export const RESOURCE_COLORS = {
  base: '#e74c3c',       // 红
  score: '#f1c40f',      // 金
  multiplier: '#e67e22',  // 橙
  time: '#3498db',       // 蓝
  shield: '#bdc3c7',     // 银
  gold: '#ffd700',       // 金币
} as const;

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
};
