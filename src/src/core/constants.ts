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
export const PUNCTUATION_KEYS = [';', ',', '.', '/', '[', ']'];
export const PUNCTUATION_KEYBOARD_EXTENSION: Record<number, string[]> = {
  0: ['[', ']'],      // top row 追加 [ ]
  1: [';'],           // home row 追加 ;
  2: [',', '.', '/'], // bottom row 追加 , . /
};
export const RELIC_GARBLE_CHARS = ',.;/[]';

/** Shop redesign: 终端→工作台之间的 IN-tray 容量上限 */
export const INBOX_MAX = 5;
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
  p: ['o', 'l', ';', '['],
  a: ['q', 'w', 's', 'z'],
  s: ['a', 'w', 'e', 'd', 'z', 'x'],
  d: ['s', 'e', 'r', 'f', 'x', 'c'],
  f: ['d', 'r', 't', 'g', 'c', 'v'],
  g: ['f', 't', 'y', 'h', 'v', 'b'],
  h: ['g', 'y', 'u', 'j', 'b', 'n'],
  j: ['h', 'u', 'i', 'k', 'n', 'm'],
  k: ['j', 'i', 'o', 'l', 'm', ','],
  l: ['k', 'o', 'p', ';', ',', '.'],
  z: ['a', 's', 'x'],
  x: ['z', 's', 'd', 'c'],
  c: ['x', 'd', 'f', 'v'],
  v: ['c', 'f', 'g', 'b'],
  b: ['v', 'g', 'h', 'n'],
  n: ['b', 'h', 'j', 'm'],
  m: ['n', 'j', 'k', ','],
  // 标点键邻接（标点解放遗物）
  ';': ['l', 'p', '.', '/', '['],
  ',': ['m', '.', 'k', 'l'],
  '.': [',', '/', 'l', ';'],
  '/': ['.', ';'],
  '[': ['p', ']', ';'],
  ']': ['['],
};

// === 游戏平衡数值 ===
export const BALANCE = {
  // 基础数值
  BASE_MULTIPLIER: 1.0,
  COMBO_BONUS: 0.1,
  TIME_PER_LEVEL: 30,

  // 目标分数指数增长公式参数
  TARGET_BASE: 300,              // 第 1 关目标分数
  TARGET_GROWTH: 1.45,           // 每关目标增长倍率
  BOSS_TARGET_MULT: 1.5,        // Boss 关目标倍率

  // 商店价格
  SKILL_PRICE_MIN: 15,
  SKILL_PRICE_MAX: 30,
  SKILL_UPGRADE_PRICE: 25,
  WORD_REMOVE_BASE: 1,

  // 周目结构
  CYCLE_LENGTH: 12,          // 每 Cycle 关卡数（5 standard + ritual + 5 standard + boss）

  // 周目难度缩放
  CYCLE_TIME_DECAY: 0.9,    // 时间衰减系数（每周目 ×0.9）

  // Story 42.4: 关内时间加速（二次方：1 + rate × t²）
  ACCEL_RATE_STANDARD: 0.001,   // 标准关加速率（level 1 基准）
  ACCEL_RATE_BOSS: 0.0015,      // Boss 关加速率（更高压力）
  // Stage 渐进加速：rate × (1 + (level-1) × ACCEL_LEVEL_SCALE) — 无上限，无限循环线性递增
  // level 1 → 1.0×；level 12 → 1.55×；level 48 → 3.35×；level 100 → 5.95×；level 200 → 10.95×
  ACCEL_LEVEL_SCALE: 0.05,

  // 达标后加速：先三次方，超过窗口后转指数
  POST_TARGET_CUBIC_WINDOW: 30, // 三次方阶段持续秒数
};

// === Ascension 常量 ===
/** A2: 商店价格上涨系数 (Story 54.4) */
export const A2_PRICE_MULT = 1.15;
/** A4: 加剧的 cycle 时间衰减 (Story 54.5) */
export const A4_CYCLE_TIME_DECAY = 0.85;
/** A5: 商店刷新费用倍率 (Story 54.6) */
export const A5_REFRESH_COST_MULT = 2;
/** A7: 遗物槽位缩减值 (Story 54.7) */
export const A7_RELIC_SLOTS = 8;
/** A8: 词库压缩比例 (Story 54.7) */
export const A8_WORD_COMPRESS_RATIO = 0.3;
/** A10: 目标分增长率 (Story 54.8) */
export const A10_TARGET_GROWTH = 1.55;
/** A10: 错误扣时间秒数 (Story 54.8) */
export const A10_ERROR_TIME_PENALTY = 2;

// === Ascension: 练习关金币映射 (Story 54.2) ===
export const PRACTICE_GOLD = {
  BASE: 100,           // 底金（effectiveScore=0 也拿这么多）
  TIER1_CAP: 200,      // 第一段上限分数
  TIER1_RATE: 0.1,     // 0-200 分：0.1/分
  TIER2_CAP: 500,      // 第二段上限分数
  TIER2_RATE: 0.06,    // 200-500 分：0.06/分
  TIER3_RATE: 0.02,    // 500+ 分：0.02/分
  HARD_CAP: 160,       // 金币硬上限
  A1_MULT: 0.75,       // A1+ 效率系数
  FLOOR_PER_LEVEL: 50, // 地板分 = ascensionLevel × 此值
};

/**
 * 练习关得分 → 初始金币映射（纯函数）
 * 100 底 + 分段递减奖励，A1+ 效率 ×0.75，上限 160
 */
export function computePracticeGold(effectiveScore: number, ascensionLevel: number): number {
  const { BASE, TIER1_CAP, TIER1_RATE, TIER2_CAP, TIER2_RATE, TIER3_RATE, HARD_CAP, A1_MULT } = PRACTICE_GOLD;
  const score = Math.max(0, effectiveScore);
  let bonus = 0;
  if (score <= TIER1_CAP) {
    bonus = score * TIER1_RATE;
  } else if (score <= TIER2_CAP) {
    bonus = TIER1_CAP * TIER1_RATE + (score - TIER1_CAP) * TIER2_RATE;
  } else {
    bonus = TIER1_CAP * TIER1_RATE + (TIER2_CAP - TIER1_CAP) * TIER2_RATE + (score - TIER2_CAP) * TIER3_RATE;
  }
  const rawGold = BASE + bonus;
  const mult = ascensionLevel >= 1 ? A1_MULT : 1.0;
  return Math.min(Math.floor(rawGold * mult), HARD_CAP);
}

// === 资源标签 ===
export const RESOURCE_LABELS: Record<string, string> = {
  base: '基数', score: '分数', multiplier: '倍率', time: '时间', gold: '金币',
  energy: '能量', mutagen: '变异素',
};

// === 资源图标 ===
export const RESOURCE_ICONS: Record<string, string> = {
  base: '💥', score: '💯', multiplier: '🔥', time: '⏳', gold: '💰',
  energy: '⚡', mutagen: '🧬',
};

// === 资源颜色 ===
export const RESOURCE_COLORS: Record<string, string> = {
  base: '#4488ff',       // 蓝
  score: '#ffffff',      // 白
  multiplier: '#e74c3c', // 红
  time: '#00cccc',       // 青
  gold: '#ffd700',       // 金
  energy: '#9b59b6',     // 紫（造词师能量）
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
  // UI 交互音效
  click: [700, 500, 0.05],           // ↓短促下行，轻量点击
  hover: [900, 1100, 0.03],          // ↑极短上行，悬停提示
  confirm: [523, 1046, 0.12],        // ↑八度上行，确认/选中
  cancel: [400, 250, 0.08],          // ↓中频下行，取消/返回
  tab: [600, 750, 0.04],             // ↑轻微上行，标签切换
  toggle: [800, 600, 0.06],          // ↓中高频下行，开关切换
  equip: [350, 700, 0.10],           // ↑大跨度上行，装备/绑定
  coins: [1200, 800, 0.05],          // ↓高频下行，金币/货币
  unlock: [300, 900, 0.14],          // ↑大跨度上行，解锁
  warning: [250, 150, 0.08],         // ↓低频下行，警告
  // Story 60.12: terminal / 工作台音效层（DPCA 复古机械感）
  shop_kbd_click:    [600, 580, 0.04],   // 机械轴 thock — 字母键击（低 volume 防连击爆音）
  shop_kbd_enter:    [300, 200, 0.10],   // 继电器 thunk — 命令执行
  shop_buy_ok:       [800, 1500, 0.10],  // 点阵打印机 zip — BUY 确认上行
  shop_buy_err:      [250, 150, 0.10],   // 拨号忙音 — BUY 拒绝下行
  shop_drag_pickup:  [1200, 900, 0.05],  // 抓握刺啦 — 拖起短促
  shop_drag_drop:    [400, 200, 0.08],   // 木质 click — 落到键
  shop_drag_unbind:  [250, 150, 0.06],   // 闷响 — 卸回 IN-tray
  shop_drawer_open:  [400, 700, 0.07],   // 抽拉哗啦 — 抽屉打开
  submit_stamp:      [400, 100, 0.18],   // 重击下行 — SUBMIT 红章（替换 60-4 confirm）
};
