// ============================================
// 打字肉鸽 - 转化者技能数据
// ============================================
// Story 19.4 + 21.3 + 32.5 + 32.8 → Story 34.3 → 34.4: 45 个加算转化者（38 异源 + 7 同源）

import type { ConverterDefinition, ResourceType, ResourceState } from '../core/types';
import { RESOURCE_LABELS, RESOURCE_ICONS } from '../core/constants';
import { random } from '../core/seededRandom';

// === 45 个转化者数据（Story 34.3: 移除乘算，Story 34.4: +7 同源转化者） ===
export const CONVERTERS: Record<string, ConverterDefinition> = {
  // === 基数为源（3 个）— ⚔️→ ===
  conv_base_score_add:  { id: 'conv_base_score_add',  name: '变现', icon: '💱', source: 'base', target: 'score',      formula: 'add', k: 1.0,   desc: '🪙分数+⚔️基数'},
  conv_base_mult_add:   { id: 'conv_base_mult_add',   name: '喷发', icon: '🌋', source: 'base', target: 'multiplier', formula: 'add', k: 0.02,  desc: '🔥倍率+(⚔️基数×0.02)' },
  conv_base_time_add:   { id: 'conv_base_time_add',   name: '汲血', icon: '🩸', source: 'base', target: 'time',       formula: 'add', k: 0.15,  desc: '⏳时间+(⚔️基数×0.15)' },
  // === 分数为源（4 个）— 🪙→ （mid ~1000，k 极小） ===
  conv_score_base_add:   { id: 'conv_score_base_add',   name: '投资', icon: '⚒️', source: 'score', target: 'base',       formula: 'add', k: 0.006,  desc: '⚔️基数+(🪙分数×0.006)' },
  conv_score_mult_add:   { id: 'conv_score_mult_add',   name: '乘势', icon: '🎰', source: 'score', target: 'multiplier', formula: 'add', k: 0.0002, desc: '🔥倍率+(🪙分数×0.0002)' },
  conv_score_time_add:   { id: 'conv_score_time_add',   name: '续命', icon: '💊', source: 'score', target: 'time',       formula: 'add', k: 0.002,  desc: '⏳时间+(🪙分数×0.002)' },
  conv_score_gold_add:   { id: 'conv_score_gold_add',   name: '征税', icon: '📜', source: 'score', target: 'gold',       formula: 'add', k: 0.002,  desc: '💰金币+(🪙分数×0.002)' },

  // === 倍率为源（3 个）— 🔥→ （mid ~2.0） ===
  conv_mult_base_add:   { id: 'conv_mult_base_add',   name: '锻打', icon: '🔨', source: 'multiplier', target: 'base',  formula: 'add', k: 3.0, desc: '⚔️基数+(🔥倍率×3)' },
  conv_mult_score_add:  { id: 'conv_mult_score_add',  name: '溢光', icon: '🌟', source: 'multiplier', target: 'score', formula: 'add', k: 8.0, desc: '🪙分数+(🔥倍率×8)' },
  conv_mult_time_add:   { id: 'conv_mult_time_add',   name: '烛照', icon: '🕯️', source: 'multiplier', target: 'time',  formula: 'add', k: 1.0, desc: '⏳时间+🔥倍率'},
  // === 时间为源（4 个）— ⏳→ （mid ~40s） ===
  conv_time_base_add:   { id: 'conv_time_base_add',   name: '蚀刻', icon: '⛏️', source: 'time', target: 'base',       formula: 'add', k: 0.15,  desc: '⚔️基数+(⏳时间×0.15)' },
  conv_time_score_add:  { id: 'conv_time_score_add',  name: '兑现', icon: '⌛', source: 'time', target: 'score',      formula: 'add', k: 0.4,   desc: '🪙分数+(⏳时间×0.4)' },
  conv_time_mult_add:   { id: 'conv_time_mult_add',   name: '加速', icon: '🌀', source: 'time', target: 'multiplier', formula: 'add', k: 0.005, desc: '🔥倍率+(⏳时间×0.005)' },
  conv_time_gold_add:   { id: 'conv_time_gold_add',   name: '典当', icon: '⚖️', source: 'time', target: 'gold',       formula: 'add', k: 0.05,  desc: '💰金币+(⏳时间×0.05)' },

  // === 金币为源（4 个）— 💰→ （mid ~15） ===
  conv_gold_base_add:   { id: 'conv_gold_base_add',   name: '收购', icon: '🏪', source: 'gold', target: 'base',       formula: 'add', k: 0.4,   desc: '⚔️基数+(💰金币×0.4)' },
  conv_gold_score_add:  { id: 'conv_gold_score_add',  name: '贿赂', icon: '💸', source: 'gold', target: 'score',      formula: 'add', k: 1.0,   desc: '🪙分数+💰金币'},
  conv_gold_mult_add:   { id: 'conv_gold_mult_add',   name: '雇佣', icon: '🫱', source: 'gold', target: 'multiplier', formula: 'add', k: 0.015, desc: '🔥倍率+(💰金币×0.015)' },
  conv_gold_time_add:   { id: 'conv_gold_time_add',   name: '赎买', icon: '🔑', source: 'gold', target: 'time',       formula: 'add', k: 0.13,  desc: '⏳时间+(💰金币×0.13)' },

  // === 碎片为源（5 个）— 🔤→（造词师专属，mid ~5-10） ===
  conv_fragment_base_add:   { id: 'conv_fragment_base_add',   name: '字铸',     icon: '🔩', source: 'fragment', target: 'base',       formula: 'add', k: 0.08,  desc: '⚔️基数+(🔤本关碎片产出×0.08)' },
  conv_fragment_score_add:  { id: 'conv_fragment_score_add',  name: '字面价值', icon: '📖', source: 'fragment', target: 'score',      formula: 'add', k: 0.8,   desc: '🪙分数+(🔤本关碎片产出×0.8)' },
  conv_fragment_mult_add:   { id: 'conv_fragment_mult_add',   name: '词韵',     icon: '🏷️', source: 'fragment', target: 'multiplier', formula: 'add', k: 0.015, desc: '🔥倍率+(🔤本关碎片产出×0.015)' },
  conv_fragment_time_add:   { id: 'conv_fragment_time_add',   name: '墨续',     icon: '🖋️', source: 'fragment', target: 'time',       formula: 'add', k: 0.12,  desc: '⏳时间+(🔤本关碎片产出×0.12)' },
  conv_fragment_gold_add:   { id: 'conv_fragment_gold_add',   name: '字润',     icon: '📰', source: 'fragment', target: 'gold',       formula: 'add', k: 0.3,   desc: '💰金币+(🔤本关碎片产出×0.3)' },

  // === 其他→碎片（5 个）— →🔤（造词师专属） ===
  conv_base_fragment_add:   { id: 'conv_base_fragment_add',   name: '拓印', icon: '🔡', source: 'base',       target: 'fragment', formula: 'add', k: 0.08,  desc: '🔤碎片+(⚔️基数×0.08)' },
  conv_score_fragment_add:  { id: 'conv_score_fragment_add',  name: '摘录', icon: '📋', source: 'score',      target: 'fragment', formula: 'add', k: 0.005, desc: '🔤碎片+(🪙分数×0.005)' },
  conv_mult_fragment_add:   { id: 'conv_mult_fragment_add',   name: '灵感', icon: '💡', source: 'multiplier', target: 'fragment', formula: 'add', k: 2.0,   desc: '🔤碎片+(🔥倍率×2)' },
  conv_time_fragment_add:   { id: 'conv_time_fragment_add',   name: '研读', icon: '📚', source: 'time',       target: 'fragment', formula: 'add', k: 0.1,   desc: '🔤碎片+(⏳时间×0.1)' },
  conv_gold_fragment_add:   { id: 'conv_gold_fragment_add',   name: '收藏', icon: '🗃️', source: 'gold',       target: 'fragment', formula: 'add', k: 0.3,   desc: '🔤碎片+(💰金币×0.3)' },

  // === 变异素为源（5 个）— 🧬→（蜕变师专属，mid ~5-10） ===
  conv_mutagen_score_add:  { id: 'conv_mutagen_score_add',  name: '变析', icon: '🩻', source: 'mutagen', target: 'score',      formula: 'add', k: 0.8,   desc: '🪙分数+(🧬本关变异素产出×0.8)' },
  conv_mutagen_base_add:   { id: 'conv_mutagen_base_add',   name: '菌丝', icon: '🍄', source: 'mutagen', target: 'base',       formula: 'add', k: 0.08,  desc: '⚔️基数+(🧬本关变异素产出×0.08)' },
  conv_mutagen_mult_add:   { id: 'conv_mutagen_mult_add',   name: '催变', icon: '🌿', source: 'mutagen', target: 'multiplier', formula: 'add', k: 0.015, desc: '🔥倍率+(🧬本关变异素产出×0.015)' },
  conv_mutagen_time_add:   { id: 'conv_mutagen_time_add',   name: '孢释', icon: '🪸', source: 'mutagen', target: 'time',       formula: 'add', k: 0.12,  desc: '⏳时间+(🧬本关变异素产出×0.12)' },
  conv_mutagen_gold_add:   { id: 'conv_mutagen_gold_add',   name: '分泌', icon: '🦂', source: 'mutagen', target: 'gold',       formula: 'add', k: 0.3,   desc: '💰金币+(🧬本关变异素产出×0.3)' },

  // === 其他→变异素（5 个）— →🧬（蜕变师专属） ===
  conv_base_mutagen_add:   { id: 'conv_base_mutagen_add',   name: '提炼', icon: '🗜️', source: 'base',       target: 'mutagen', formula: 'add', k: 0.08,  desc: '🧬变异素+(⚔️基数×0.08)' },
  conv_score_mutagen_add:  { id: 'conv_score_mutagen_add',  name: '孵化', icon: '🪺', source: 'score',      target: 'mutagen', formula: 'add', k: 0.005, desc: '🧬变异素+(🪙分数×0.005)' },
  conv_mult_mutagen_add:   { id: 'conv_mult_mutagen_add',   name: '裂变', icon: '🫀', source: 'multiplier', target: 'mutagen', formula: 'add', k: 2.0,   desc: '🧬变异素+(🔥倍率×2)' },
  conv_time_mutagen_add:   { id: 'conv_time_mutagen_add',   name: '培养', icon: '🌡️', source: 'time',       target: 'mutagen', formula: 'add', k: 0.1,   desc: '🧬变异素+(⏳时间×0.1)' },
  conv_gold_mutagen_add:   { id: 'conv_gold_mutagen_add',   name: '接种', icon: '🌵', source: 'gold',       target: 'mutagen', formula: 'add', k: 0.3,   desc: '🧬变异素+(💰金币×0.3)' },

  // === 同源转化者（7 个）— source === target，等效指数增长，k 值独立调低（Story 34.4）===
  conv_base_base_add:         { id: 'conv_base_base_add',         name: '自强',   icon: '🎯', source: 'base',       target: 'base',       formula: 'add', k: 0.03,   desc: '⚔️基数+(⚔️基数×0.03)' },
  conv_score_score_add:       { id: 'conv_score_score_add',       name: '复利',   icon: '🔮', source: 'score',      target: 'score',      formula: 'add', k: 0.0008, desc: '🪙分数+(🪙分数×0.0008)' },
  conv_mult_mult_add:         { id: 'conv_mult_mult_add',         name: '自燃',   icon: '⚡', source: 'multiplier', target: 'multiplier', formula: 'add', k: 0.15,   desc: '🔥倍率+(🔥倍率×0.15)' },
  conv_time_time_add:         { id: 'conv_time_time_add',         name: '回溯',   icon: '🌊', source: 'time',       target: 'time',       formula: 'add', k: 0.015,  desc: '⏳时间+(⏳时间×0.015)' },
  conv_gold_gold_add:         { id: 'conv_gold_gold_add',         name: '生息',   icon: '🧿', source: 'gold',       target: 'gold',       formula: 'add', k: 0.005,  desc: '💰金币+(💰金币×0.005)' },
  conv_fragment_fragment_add: { id: 'conv_fragment_fragment_add', name: '增殖',   icon: '🌸', source: 'fragment',   target: 'fragment',   formula: 'add', k: 0.03,   desc: '🔤碎片+(🔤本关碎片产出×0.03)' },
  conv_mutagen_mutagen_add:   { id: 'conv_mutagen_mutagen_add',   name: '自噬',   icon: '🦠', source: 'mutagen',    target: 'mutagen',    formula: 'add', k: 0.03,   desc: '🧬变异素+(🧬本关变异素产出×0.03)' },
} as const;

// === 工具函数 ===

/** 检查 ID 是否为转化者 */
export function isConverter(id: string): boolean {
  return id in CONVERTERS;
}

/** 每局 run 从 45 个转化者中加权抽 20 个 ID（异源权重 10、同源权重 3） */
export function drawConverterPool(count = 20): string[] {
  // 构建加权数组：异源 ×10 重复，同源 ×3 重复
  const weighted: string[] = [];
  for (const id of Object.keys(CONVERTERS)) {
    const c = CONVERTERS[id];
    const w = c.source === c.target ? 3 : 10;
    for (let i = 0; i < w; i++) weighted.push(id);
  }
  // Seeded shuffle
  for (let i = weighted.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [weighted[i], weighted[j]] = [weighted[j], weighted[i]];
  }
  // 去重取前 count 个唯一 ID
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of weighted) {
    if (!seen.has(id)) {
      seen.add(id);
      result.push(id);
      if (result.length >= count) break;
    }
  }
  return result;
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
export function getConverterDesc(id: string, level: number, multiplyOverride?: { formula: 'multiply'; k: number }): string {
  const conv = CONVERTERS[id];
  if (!conv) return '';
  const effectiveFormula = multiplyOverride?.formula || conv.formula;
  const effectiveK = multiplyOverride ? multiplyOverride.k : getConverterK(id, level);
  const rawSrcLabel = RESOURCE_LABELS[conv.source] || conv.source;
  const srcLabel = (conv.source === 'fragment' || conv.source === 'mutagen')
    ? `本关${rawSrcLabel}产出` : rawSrcLabel;
  const tgtLabel = RESOURCE_LABELS[conv.target] || conv.target;
  const srcIcon = RESOURCE_ICONS[conv.source] || '';
  const tgtIcon = RESOURCE_ICONS[conv.target] || '';
  const kDisplay = parseFloat(effectiveK.toPrecision(4));
  if (effectiveFormula === 'add') {
    return kDisplay === 1
      ? `${tgtIcon}${tgtLabel}+${srcIcon}${srcLabel}`
      : `${tgtIcon}${tgtLabel}+(${srcIcon}${srcLabel}×${kDisplay})`;
  }
  return `${tgtIcon}${tgtLabel}×(1+${srcIcon}${srcLabel}×${kDisplay})`;
}
