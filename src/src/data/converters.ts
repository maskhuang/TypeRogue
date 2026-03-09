// ============================================
// 打字肉鸽 - 转化者技能数据
// ============================================
// Story 19.4 + 21.3 + 32.5: 52 个转化者（5 通用源 × 目标 × 2 运算符 + 18 碎片转化者）

import type { ConverterDefinition, ResourceType, ResourceState } from '../core/types';
import { RESOURCE_LABELS, RESOURCE_ICONS } from '../core/constants';
import { random } from '../core/seededRandom';

// === 52 个转化者数据 ===
export const CONVERTERS: Record<string, ConverterDefinition> = {
  // === 基数为源（6 个）— ⚔️→ ===
  conv_base_score_add:  { id: 'conv_base_score_add',  name: '变现', icon: '💱', source: 'base', target: 'score',      formula: 'add',      k: 1.0,    desc: '触发时：🪙分数+(⚔️基数×1)' },
  conv_base_score_mul:  { id: 'conv_base_score_mul',  name: '加冕', icon: '👑', source: 'base', target: 'score',      formula: 'multiply', k: 0.005,  desc: '触发时：🪙分数×(1+⚔️基数×0.005)' },
  conv_base_mult_add:   { id: 'conv_base_mult_add',   name: '喷发', icon: '🌋', source: 'base', target: 'multiplier', formula: 'add',      k: 0.02,   desc: '触发时：🔥倍率+(⚔️基数×0.02)' },
  conv_base_mult_mul:   { id: 'conv_base_mult_mul',   name: '引爆', icon: '💥', source: 'base', target: 'multiplier', formula: 'multiply', k: 0.008,  desc: '触发时：🔥倍率×(1+⚔️基数×0.008)' },
  conv_base_time_add:   { id: 'conv_base_time_add',   name: '汲血', icon: '🩸', source: 'base', target: 'time',       formula: 'add',      k: 0.15,   desc: '触发时：⏳时间+(⚔️基数×0.15)' },
  conv_base_time_mul:   { id: 'conv_base_time_mul',   name: '再生', icon: '🧪', source: 'base', target: 'time',       formula: 'multiply', k: 0.005,  desc: '触发时：⏳时间×(1+⚔️基数×0.005)' },
  // === 分数为源（7 个）— 🪙→ （mid ~1000，k 极小） ===
  conv_score_base_add:   { id: 'conv_score_base_add',   name: '投资', icon: '⚒️', source: 'score', target: 'base',       formula: 'add',      k: 0.006,   desc: '触发时：⚔️基数+(🪙分数×0.006)' },
  conv_score_base_mul:   { id: 'conv_score_base_mul',   name: '奠基', icon: '🏗️', source: 'score', target: 'base',       formula: 'multiply', k: 0.0006,  desc: '触发时：⚔️基数×(1+🪙分数×0.0006)' },
  conv_score_mult_add:   { id: 'conv_score_mult_add',   name: '乘势', icon: '🎰', source: 'score', target: 'multiplier', formula: 'add',      k: 0.0002,  desc: '触发时：🔥倍率+(🪙分数×0.0002)' },
  conv_score_mult_mul:   { id: 'conv_score_mult_mul',   name: '膨胀', icon: '📈', source: 'score', target: 'multiplier', formula: 'multiply', k: 0.00012, desc: '触发时：🔥倍率×(1+🪙分数×0.00012)' },
  conv_score_time_add:   { id: 'conv_score_time_add',   name: '续命', icon: '💊', source: 'score', target: 'time',       formula: 'add',      k: 0.002,   desc: '触发时：⏳时间+(🪙分数×0.002)' },
  conv_score_time_mul:   { id: 'conv_score_time_mul',   name: '预言', icon: '🔮', source: 'score', target: 'time',       formula: 'multiply', k: 0.00008, desc: '触发时：⏳时间×(1+🪙分数×0.00008)' },
  conv_score_gold_add:   { id: 'conv_score_gold_add',   name: '征税', icon: '📜', source: 'score', target: 'gold',       formula: 'add',      k: 0.002,   desc: '触发时：💰金币+(🪙分数×0.002)' },

  // === 倍率为源（6 个）— 🔥→ （mid ~2.0） ===
  conv_mult_base_add:   { id: 'conv_mult_base_add',   name: '锻打', icon: '🔨', source: 'multiplier', target: 'base',       formula: 'add',      k: 3.0,  desc: '触发时：⚔️基数+(🔥倍率×3)' },
  conv_mult_base_mul:   { id: 'conv_mult_base_mul',   name: '雷铸', icon: '⚡', source: 'multiplier', target: 'base',       formula: 'multiply', k: 0.3,  desc: '触发时：⚔️基数×(1+🔥倍率×0.3)' },
  conv_mult_score_add:  { id: 'conv_mult_score_add',  name: '溢光', icon: '🌟', source: 'multiplier', target: 'score',      formula: 'add',      k: 8.0,  desc: '触发时：🪙分数+(🔥倍率×8)' },
  conv_mult_score_mul:  { id: 'conv_mult_score_mul',  name: '陨落', icon: '☄️', source: 'multiplier', target: 'score',      formula: 'multiply', k: 0.04, desc: '触发时：🪙分数×(1+🔥倍率×0.04)' },
  conv_mult_time_add:   { id: 'conv_mult_time_add',   name: '烛照', icon: '🕯️', source: 'multiplier', target: 'time',       formula: 'add',      k: 1.0,  desc: '触发时：⏳时间+(🔥倍率×1)' },
  conv_mult_time_mul:   { id: 'conv_mult_time_mul',   name: '延曦', icon: '🌅', source: 'multiplier', target: 'time',       formula: 'multiply', k: 0.05, desc: '触发时：⏳时间×(1+🔥倍率×0.05)' },
  // === 时间为源（7 个）— ⏳→ （mid ~40s） ===
  conv_time_base_add:   { id: 'conv_time_base_add',   name: '蚀刻', icon: '⛏️', source: 'time', target: 'base',       formula: 'add',      k: 0.15,  desc: '触发时：⚔️基数+(⏳时间×0.15)' },
  conv_time_base_mul:   { id: 'conv_time_base_mul',   name: '时斩', icon: '🗡️', source: 'time', target: 'base',       formula: 'multiply', k: 0.015, desc: '触发时：⚔️基数×(1+⏳时间×0.015)' },
  conv_time_score_add:  { id: 'conv_time_score_add',  name: '兑现', icon: '⌛', source: 'time', target: 'score',      formula: 'add',      k: 0.4,   desc: '触发时：🪙分数+(⏳时间×0.4)' },
  conv_time_score_mul:  { id: 'conv_time_score_mul',  name: '时运', icon: '🎪', source: 'time', target: 'score',      formula: 'multiply', k: 0.002, desc: '触发时：🪙分数×(1+⏳时间×0.002)' },
  conv_time_mult_add:   { id: 'conv_time_mult_add',   name: '加速', icon: '🌀', source: 'time', target: 'multiplier', formula: 'add',      k: 0.005, desc: '触发时：🔥倍率+(⏳时间×0.005)' },
  conv_time_mult_mul:   { id: 'conv_time_mult_mul',   name: '时暴', icon: '🌪️', source: 'time', target: 'multiplier', formula: 'multiply', k: 0.003, desc: '触发时：🔥倍率×(1+⏳时间×0.003)' },
  conv_time_gold_add:   { id: 'conv_time_gold_add',   name: '典当', icon: '⚖️', source: 'time', target: 'gold',       formula: 'add',      k: 0.05,  desc: '触发时：💰金币+(⏳时间×0.05)' },

  // === 金币为源（8 个）— 💰→ （mid ~15） ===
  conv_gold_base_add:   { id: 'conv_gold_base_add',   name: '收购', icon: '🏪', source: 'gold', target: 'base',       formula: 'add',      k: 0.4,   desc: '触发时：⚔️基数+(💰金币×0.4)' },
  conv_gold_base_mul:   { id: 'conv_gold_base_mul',   name: '镀金', icon: '✨', source: 'gold', target: 'base',       formula: 'multiply', k: 0.04,  desc: '触发时：⚔️基数×(1+💰金币×0.04)' },
  conv_gold_score_add:  { id: 'conv_gold_score_add',  name: '贿赂', icon: '💸', source: 'gold', target: 'score',      formula: 'add',      k: 1.0,   desc: '触发时：🪙分数+(💰金币×1)' },
  conv_gold_score_mul:  { id: 'conv_gold_score_mul',  name: '悬赏', icon: '🎖️', source: 'gold', target: 'score',      formula: 'multiply', k: 0.005, desc: '触发时：🪙分数×(1+💰金币×0.005)' },
  conv_gold_mult_add:   { id: 'conv_gold_mult_add',   name: '雇佣', icon: '🫱', source: 'gold', target: 'multiplier', formula: 'add',      k: 0.015, desc: '触发时：🔥倍率+(💰金币×0.015)' },
  conv_gold_mult_mul:   { id: 'conv_gold_mult_mul',   name: '投机', icon: '📊', source: 'gold', target: 'multiplier', formula: 'multiply', k: 0.008, desc: '触发时：🔥倍率×(1+💰金币×0.008)' },
  conv_gold_time_add:   { id: 'conv_gold_time_add',   name: '赎买', icon: '🔑', source: 'gold', target: 'time',       formula: 'add',      k: 0.13,  desc: '触发时：⏳时间+(💰金币×0.13)' },
  conv_gold_time_mul:   { id: 'conv_gold_time_mul',   name: '朝贡', icon: '🏺', source: 'gold', target: 'time',       formula: 'multiply', k: 0.005, desc: '触发时：⏳时间×(1+💰金币×0.005)' },

  // === 碎片为源（8 个）— 🔤→（造词师专属，mid ~5-10） ===
  conv_fragment_score_add:  { id: 'conv_fragment_score_add',  name: '字面价值', icon: '📖', source: 'fragment', target: 'score',      formula: 'add',      k: 0.8,    desc: '触发时：🪙分数+(🔤碎片×0.8)' },
  conv_fragment_score_mul:  { id: 'conv_fragment_score_mul',  name: '笔锋',     icon: '🖊️', source: 'fragment', target: 'score',      formula: 'multiply', k: 0.004,  desc: '触发时：🪙分数×(1+🔤碎片×0.004)' },
  conv_fragment_mult_add:   { id: 'conv_fragment_mult_add',   name: '词韵',     icon: '🏷️', source: 'fragment', target: 'multiplier', formula: 'add',      k: 0.015,  desc: '触发时：🔥倍率+(🔤碎片×0.015)' },
  conv_fragment_mult_mul:   { id: 'conv_fragment_mult_mul',   name: '文锋',     icon: '🗞️', source: 'fragment', target: 'multiplier', formula: 'multiply', k: 0.006,  desc: '触发时：🔥倍率×(1+🔤碎片×0.006)' },
  conv_fragment_time_add:   { id: 'conv_fragment_time_add',   name: '墨续',     icon: '🖋️', source: 'fragment', target: 'time',       formula: 'add',      k: 0.12,   desc: '触发时：⏳时间+(🔤碎片×0.12)' },
  conv_fragment_time_mul:   { id: 'conv_fragment_time_mul',   name: '篆刻',     icon: '🪪', source: 'fragment', target: 'time',       formula: 'multiply', k: 0.004,  desc: '触发时：⏳时间×(1+🔤碎片×0.004)' },
  conv_fragment_gold_add:   { id: 'conv_fragment_gold_add',   name: '字润',     icon: '📰', source: 'fragment', target: 'gold',       formula: 'add',      k: 0.3,    desc: '触发时：💰金币+(🔤碎片×0.3)' },
  conv_fragment_gold_mul:   { id: 'conv_fragment_gold_mul',   name: '版税',     icon: '📕', source: 'fragment', target: 'gold',       formula: 'multiply', k: 0.003,  desc: '触发时：💰金币×(1+🔤碎片×0.003)' },

  // === 其他→碎片（10 个）— →🔤（造词师专属） ===
  conv_base_fragment_add:   { id: 'conv_base_fragment_add',   name: '拓印', icon: '🔡', source: 'base',       target: 'fragment', formula: 'add',      k: 0.08,   desc: '触发时：🔤碎片+(⚔️基数×0.08)' },
  conv_base_fragment_mul:   { id: 'conv_base_fragment_mul',   name: '刻字', icon: '🔠', source: 'base',       target: 'fragment', formula: 'multiply', k: 0.003,  desc: '触发时：🔤碎片×(1+⚔️基数×0.003)' },
  conv_score_fragment_add:  { id: 'conv_score_fragment_add',  name: '摘录', icon: '📋', source: 'score',      target: 'fragment', formula: 'add',      k: 0.005,  desc: '触发时：🔤碎片+(🪙分数×0.005)' },
  conv_score_fragment_mul:  { id: 'conv_score_fragment_mul',  name: '编纂', icon: '📒', source: 'score',      target: 'fragment', formula: 'multiply', k: 0.0003, desc: '触发时：🔤碎片×(1+🪙分数×0.0003)' },
  conv_mult_fragment_add:   { id: 'conv_mult_fragment_add',   name: '灵感', icon: '💡', source: 'multiplier', target: 'fragment', formula: 'add',      k: 2.0,    desc: '触发时：🔤碎片+(🔥倍率×2)' },
  conv_mult_fragment_mul:   { id: 'conv_mult_fragment_mul',   name: '顿悟', icon: '🧠', source: 'multiplier', target: 'fragment', formula: 'multiply', k: 0.2,    desc: '触发时：🔤碎片×(1+🔥倍率×0.2)' },
  conv_time_fragment_add:   { id: 'conv_time_fragment_add',   name: '研读', icon: '📚', source: 'time',       target: 'fragment', formula: 'add',      k: 0.1,    desc: '触发时：🔤碎片+(⏳时间×0.1)' },
  conv_time_fragment_mul:   { id: 'conv_time_fragment_mul',   name: '沉思', icon: '🧘', source: 'time',       target: 'fragment', formula: 'multiply', k: 0.01,   desc: '触发时：🔤碎片×(1+⏳时间×0.01)' },
  conv_gold_fragment_add:   { id: 'conv_gold_fragment_add',   name: '收藏', icon: '🗃️', source: 'gold',       target: 'fragment', formula: 'add',      k: 0.3,    desc: '触发时：🔤碎片+(💰金币×0.3)' },
  conv_gold_fragment_mul:   { id: 'conv_gold_fragment_mul',   name: '投稿', icon: '📮', source: 'gold',       target: 'fragment', formula: 'multiply', k: 0.03,   desc: '触发时：🔤碎片×(1+💰金币×0.03)' },
} as const;

// === 工具函数 ===

/** 检查 ID 是否为转化者 */
export function isConverter(id: string): boolean {
  return id in CONVERTERS;
}

/** 每局 run 从 52 个转化者中随机抽 31 个 ID（非造词师过滤碎片转化者后保持 ~20） */
export function drawConverterPool(count = 31): string[] {
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
 * - fragment/mutagen 特殊处理：读取本关累计产出量（classResourceProduced），而非 resources 当前值
 * - 其他资源直接返回 resources[source]
 */
export function getSourceValue(source: ResourceType, resources: ResourceState, classResourceProduced?: Record<string, number>): number {
  if (source === 'fragment' || source === 'mutagen') {
    return classResourceProduced?.[source] ?? 0;
  }
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
    return `触发时：${tgtIcon}${tgtLabel}+(${srcIcon}${srcLabel}×${kDisplay})`;
  }
  return `触发时：${tgtIcon}${tgtLabel}×(1+${srcIcon}${srcLabel}×${kDisplay})`;
}
