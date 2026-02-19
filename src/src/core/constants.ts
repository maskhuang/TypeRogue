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

// === 技能效果数值 ===
export const SKILL_EFFECTS = {
  // 被动技能加成（基于键盘布局，持续生效）
  AURA_MULTIPLIER: 1.5,           // 光环：相邻主动技能效果 +50%
  CORE_BONUS_PER_ADJACENT: 5,     // 能量核心：每个相邻技能 +5% 全局分数
  LONE_BONUS_PERCENT: 20,         // 孤狼：无相邻技能时 +20% 全局分数
  VOID_BONUS_PER_EMPTY: 3,        // 虚空：每个相邻空位 +3% 全局分数

  // 主动技能效果（技能链，影响下一个技能）
  RIPPLE_MULTIPLIER: 1.5,         // 涟漪：下一个技能效果 ×1.5
  ECHO_TRIGGER_NEXT: true,        // 回响：下一个技能也被触发
}

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
