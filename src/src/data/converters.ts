// ============================================
// 打字肉鸽 - 转化者技能数据
// ============================================
// Story 19.4 + 21.3: 50 个转化者（6 源 × 目标 × 2 运算符）

import type { ConverterDefinition, ResourceType, ResourceState } from '../core/types';
import { RESOURCE_LABELS, RESOURCE_ICONS } from '../core/constants';
import { random } from '../core/seededRandom';

// === 50 个转化者数据 ===
export const CONVERTERS: Record<string, ConverterDefinition> = {
  // === 基数为源（8 个）— ⚔️→ ===
  conv_base_score_add:  { id: 'conv_base_score_add',  name: '变现', icon: '💰', source: 'base', target: 'score',      formula: 'add',      k: 1.0,    desc: '获得等同于基数+1的分数' },
  conv_base_score_mul:  { id: 'conv_base_score_mul',  name: '加冕', icon: '👑', source: 'base', target: 'score',      formula: 'multiply', k: 0.005,  desc: '获得等同于基数×0.005的分数' },
  conv_base_mult_add:   { id: 'conv_base_mult_add',   name: '喷发', icon: '🌋', source: 'base', target: 'multiplier', formula: 'add',      k: 0.02,   desc: '获得等同于基数+0.02的倍率' },
  conv_base_mult_mul:   { id: 'conv_base_mult_mul',   name: '引爆', icon: '💥', source: 'base', target: 'multiplier', formula: 'multiply', k: 0.008,  desc: '获得等同于基数×0.008的倍率' },
  conv_base_time_add:   { id: 'conv_base_time_add',   name: '汲血', icon: '🩸', source: 'base', target: 'time',       formula: 'add',      k: 0.15,   desc: '获得等同于基数+0.15的时间' },
  conv_base_time_mul:   { id: 'conv_base_time_mul',   name: '再生', icon: '🧬', source: 'base', target: 'time',       formula: 'multiply', k: 0.005,  desc: '获得等同于基数×0.005的时间' },
  conv_base_shield_add: { id: 'conv_base_shield_add', name: '铸盾', icon: '🔩', source: 'base', target: 'shield',     formula: 'add',      k: 0.08,   desc: '获得等同于基数+0.08的护盾' },
  conv_base_shield_mul: { id: 'conv_base_shield_mul', name: '筑城', icon: '🏰', source: 'base', target: 'shield',     formula: 'multiply', k: 0.04,   desc: '获得等同于基数×0.04的护盾' },

  // === 分数为源（9 个）— 🪙→ （mid ~1000，k 极小） ===
  conv_score_base_add:   { id: 'conv_score_base_add',   name: '投资', icon: '⚒️', source: 'score', target: 'base',       formula: 'add',      k: 0.006,   desc: '获得等同于分数+0.006的基数' },
  conv_score_base_mul:   { id: 'conv_score_base_mul',   name: '奠基', icon: '🏗️', source: 'score', target: 'base',       formula: 'multiply', k: 0.0006,  desc: '获得等同于分数×0.0006的基数' },
  conv_score_mult_add:   { id: 'conv_score_mult_add',   name: '乘势', icon: '🎰', source: 'score', target: 'multiplier', formula: 'add',      k: 0.0002,  desc: '获得等同于分数+0.0002的倍率' },
  conv_score_mult_mul:   { id: 'conv_score_mult_mul',   name: '膨胀', icon: '📈', source: 'score', target: 'multiplier', formula: 'multiply', k: 0.00012, desc: '获得等同于分数×0.00012的倍率' },
  conv_score_time_add:   { id: 'conv_score_time_add',   name: '续命', icon: '💊', source: 'score', target: 'time',       formula: 'add',      k: 0.002,   desc: '获得等同于分数+0.002的时间' },
  conv_score_time_mul:   { id: 'conv_score_time_mul',   name: '预言', icon: '🔮', source: 'score', target: 'time',       formula: 'multiply', k: 0.00008, desc: '获得等同于分数×0.00008的时间' },
  conv_score_shield_add: { id: 'conv_score_shield_add', name: '武装', icon: '🪖', source: 'score', target: 'shield',     formula: 'add',      k: 0.001,   desc: '获得等同于分数+0.001的护盾' },
  conv_score_shield_mul: { id: 'conv_score_shield_mul', name: '结晶', icon: '💎', source: 'score', target: 'shield',     formula: 'multiply', k: 0.0006,  desc: '获得等同于分数×0.0006的护盾' },
  conv_score_gold_add:   { id: 'conv_score_gold_add',   name: '征税', icon: '📜', source: 'score', target: 'gold',       formula: 'add',      k: 0.002,   desc: '获得等同于分数+0.002的金币' },

  // === 倍率为源（8 个）— 🔥→ （mid ~2.0） ===
  conv_mult_base_add:   { id: 'conv_mult_base_add',   name: '锻打', icon: '🔨', source: 'multiplier', target: 'base',       formula: 'add',      k: 3.0,  desc: '获得等同于倍率+3的基数' },
  conv_mult_base_mul:   { id: 'conv_mult_base_mul',   name: '雷铸', icon: '⚡', source: 'multiplier', target: 'base',       formula: 'multiply', k: 0.3,  desc: '获得等同于倍率×0.3的基数' },
  conv_mult_score_add:  { id: 'conv_mult_score_add',  name: '溢光', icon: '🌟', source: 'multiplier', target: 'score',      formula: 'add',      k: 8.0,  desc: '获得等同于倍率+8的分数' },
  conv_mult_score_mul:  { id: 'conv_mult_score_mul',  name: '陨落', icon: '☄️', source: 'multiplier', target: 'score',      formula: 'multiply', k: 0.04, desc: '获得等同于倍率×0.04的分数' },
  conv_mult_time_add:   { id: 'conv_mult_time_add',   name: '烛照', icon: '🕯️', source: 'multiplier', target: 'time',       formula: 'add',      k: 1.0,  desc: '获得等同于倍率+1的时间' },
  conv_mult_time_mul:   { id: 'conv_mult_time_mul',   name: '延曦', icon: '🌅', source: 'multiplier', target: 'time',       formula: 'multiply', k: 0.05, desc: '获得等同于倍率×0.05的时间' },
  conv_mult_shield_add: { id: 'conv_mult_shield_add', name: '炎壁', icon: '🧱', source: 'multiplier', target: 'shield',     formula: 'add',      k: 0.5,  desc: '获得等同于倍率+0.5的护盾' },
  conv_mult_shield_mul: { id: 'conv_mult_shield_mul', name: '符印', icon: '🪬', source: 'multiplier', target: 'shield',     formula: 'multiply', k: 0.3,  desc: '获得等同于倍率×0.3的护盾' },

  // === 时间为源（9 个）— ⏳→ （mid ~40s） ===
  conv_time_base_add:   { id: 'conv_time_base_add',   name: '蚀刻', icon: '⛏️', source: 'time', target: 'base',       formula: 'add',      k: 0.15,  desc: '获得等同于时间+0.15的基数' },
  conv_time_base_mul:   { id: 'conv_time_base_mul',   name: '时斩', icon: '🗡️', source: 'time', target: 'base',       formula: 'multiply', k: 0.015, desc: '获得等同于时间×0.015的基数' },
  conv_time_score_add:  { id: 'conv_time_score_add',  name: '兑现', icon: '⌛', source: 'time', target: 'score',      formula: 'add',      k: 0.4,   desc: '获得等同于时间+0.4的分数' },
  conv_time_score_mul:  { id: 'conv_time_score_mul',  name: '时运', icon: '🎪', source: 'time', target: 'score',      formula: 'multiply', k: 0.002, desc: '获得等同于时间×0.002的分数' },
  conv_time_mult_add:   { id: 'conv_time_mult_add',   name: '加速', icon: '🌀', source: 'time', target: 'multiplier', formula: 'add',      k: 0.005, desc: '获得等同于时间+0.005的倍率' },
  conv_time_mult_mul:   { id: 'conv_time_mult_mul',   name: '时暴', icon: '🌪️', source: 'time', target: 'multiplier', formula: 'multiply', k: 0.003, desc: '获得等同于时间×0.003的倍率' },
  conv_time_shield_add: { id: 'conv_time_shield_add', name: '冰甲', icon: '❄️', source: 'time', target: 'shield',     formula: 'add',      k: 0.03,  desc: '获得等同于时间+0.03的护盾' },
  conv_time_shield_mul: { id: 'conv_time_shield_mul', name: '化石', icon: '🪸', source: 'time', target: 'shield',     formula: 'multiply', k: 0.015, desc: '获得等同于时间×0.015的护盾' },
  conv_time_gold_add:   { id: 'conv_time_gold_add',   name: '典当', icon: '⚖️', source: 'time', target: 'gold',       formula: 'add',      k: 0.05,  desc: '获得等同于时间+0.05的金币' },

  // === 护盾为源（8 个）— 🛡️→ （mid ~3） ===
  conv_shield_base_add:  { id: 'conv_shield_base_add',  name: '盾击', icon: '🪓', source: 'shield', target: 'base',       formula: 'add',      k: 2.0,  desc: '获得等同于护盾+2的基数' },
  conv_shield_base_mul:  { id: 'conv_shield_base_mul',  name: '龟息', icon: '🐢', source: 'shield', target: 'base',       formula: 'multiply', k: 0.2,  desc: '获得等同于护盾×0.2的基数' },
  conv_shield_score_add: { id: 'conv_shield_score_add', name: '铁币', icon: '🏅', source: 'shield', target: 'score',      formula: 'add',      k: 5.0,  desc: '获得等同于护盾+5的分数' },
  conv_shield_score_mul: { id: 'conv_shield_score_mul', name: '熔铸', icon: '💍', source: 'shield', target: 'score',      formula: 'multiply', k: 0.03, desc: '获得等同于护盾×0.03的分数' },
  conv_shield_mult_add:  { id: 'conv_shield_mult_add',  name: '狮吼', icon: '🦁', source: 'shield', target: 'multiplier', formula: 'add',      k: 0.07, desc: '获得等同于护盾+0.07的倍率' },
  conv_shield_mult_mul:  { id: 'conv_shield_mult_mul',  name: '龙鳞', icon: '🐉', source: 'shield', target: 'multiplier', formula: 'multiply', k: 0.05, desc: '获得等同于护盾×0.05的倍率' },
  conv_shield_time_add:  { id: 'conv_shield_time_add',  name: '脉搏', icon: '🫀', source: 'shield', target: 'time',       formula: 'add',      k: 0.7,  desc: '获得等同于护盾+0.7的时间' },
  conv_shield_time_mul:  { id: 'conv_shield_time_mul',  name: '滋养', icon: '🌿', source: 'shield', target: 'time',       formula: 'multiply', k: 0.05, desc: '获得等同于护盾×0.05的时间' },

  // === 金币为源（8 个）— 💰→ （mid ~15） ===
  conv_gold_base_add:   { id: 'conv_gold_base_add',   name: '收购', icon: '🏪', source: 'gold', target: 'base',       formula: 'add',      k: 0.4,   desc: '获得等同于金币+0.4的基数' },
  conv_gold_base_mul:   { id: 'conv_gold_base_mul',   name: '镀金', icon: '✨', source: 'gold', target: 'base',       formula: 'multiply', k: 0.04,  desc: '获得等同于金币×0.04的基数' },
  conv_gold_score_add:  { id: 'conv_gold_score_add',  name: '贿赂', icon: '💸', source: 'gold', target: 'score',      formula: 'add',      k: 1.0,   desc: '获得等同于金币+1的分数' },
  conv_gold_score_mul:  { id: 'conv_gold_score_mul',  name: '悬赏', icon: '🎖️', source: 'gold', target: 'score',      formula: 'multiply', k: 0.005, desc: '获得等同于金币×0.005的分数' },
  conv_gold_mult_add:   { id: 'conv_gold_mult_add',   name: '雇佣', icon: '🤝', source: 'gold', target: 'multiplier', formula: 'add',      k: 0.015, desc: '获得等同于金币+0.015的倍率' },
  conv_gold_mult_mul:   { id: 'conv_gold_mult_mul',   name: '投机', icon: '📊', source: 'gold', target: 'multiplier', formula: 'multiply', k: 0.008, desc: '获得等同于金币×0.008的倍率' },
  conv_gold_time_add:   { id: 'conv_gold_time_add',   name: '赎买', icon: '🔑', source: 'gold', target: 'time',       formula: 'add',      k: 0.13,  desc: '获得等同于金币+0.13的时间' },
  conv_gold_time_mul:   { id: 'conv_gold_time_mul',   name: '朝贡', icon: '🏺', source: 'gold', target: 'time',       formula: 'multiply', k: 0.005, desc: '获得等同于金币×0.005的时间' },
} as const;

// === 工具函数 ===

/** 检查 ID 是否为转化者 */
export function isConverter(id: string): boolean {
  return id in CONVERTERS;
}

/** 每局 run 从 50 个转化者中随机抽 20 个 ID */
export function drawConverterPool(count = 20): string[] {
  const all = Object.keys(CONVERTERS);
  const shuffled = [...all];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/** 获取转化者在指定等级的 k 系数：Lv1=k×1.0, Lv2=k×1.5, Lv3=k×2.0 */
export function getConverterK(id: string, level: number): number {
  const conv = CONVERTERS[id];
  if (!conv) return 0;
  const growthFactors = [1.0, 1.5, 2.0];
  const idx = Math.max(0, Math.min(level, 3) - 1);
  return conv.k * growthFactors[idx];
}

/**
 * 读取源资源当前值
 * - score 特殊处理：返回本关累计得分 = resources.score + resources.base × resources.multiplier
 * - 其他资源直接返回 resources[source]
 */
export function getSourceValue(source: ResourceType, resources: ResourceState): number {
  if (source === 'score') {
    return resources.score + resources.base * resources.multiplier;
  }
  return resources[source];
}

/** 生成等级相关的转化者描述 */
export function getConverterDesc(id: string, level: number): string {
  const conv = CONVERTERS[id];
  if (!conv) return '';
  const k = getConverterK(id, level);
  const srcLabel = RESOURCE_LABELS[conv.source] || conv.source;
  const tgtLabel = RESOURCE_LABELS[conv.target] || conv.target;
  const srcIcon = RESOURCE_ICONS[conv.source] || '';
  const tgtIcon = RESOURCE_ICONS[conv.target] || '';
  const kDisplay = parseFloat(k.toPrecision(4));
  if (conv.formula === 'add') {
    return `获得等同于${srcIcon}${srcLabel}+${kDisplay}的${tgtIcon}${tgtLabel}`;
  }
  return `获得等同于${srcIcon}${srcLabel}×${kDisplay}的${tgtIcon}${tgtLabel}`;
}
