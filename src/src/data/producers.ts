// ============================================
// 打字肉鸽 - 产出者技能数据
// ============================================
// Story 19.2: 10 个产出者（5 资源 × 2 运算符）

import type { ProducerDefinition } from '../core/types';

export const PRODUCERS: Record<string, ProducerDefinition> = {
  // === 基数产出者 ===
  prod_burst: {
    id: 'prod_burst',
    name: '爆发',
    icon: '⚔️',
    resource: 'base',
    operator: 'add',
    values: [5, 8, 12],
    desc: '基数+5',
  },
  prod_focus: {
    id: 'prod_focus',
    name: '聚能',
    icon: '💎',
    resource: 'base',
    operator: 'multiply',
    values: [2, 2.3, 2.6],
    desc: '基数×2',
  },

  // === 分数产出者 ===
  prod_loot: {
    id: 'prod_loot',
    name: '掠夺',
    icon: '🪙',
    resource: 'score',
    operator: 'add',
    values: [15, 24, 36],
    desc: '分数+15',
  },
  prod_crit: {
    id: 'prod_crit',
    name: '暴击',
    icon: '🎯',
    resource: 'score',
    operator: 'multiply',
    values: [1.1, 1.15, 1.2],
    desc: '分数×1.1',
  },

  // === 倍率产出者 ===
  prod_boost: {
    id: 'prod_boost',
    name: '强化',
    icon: '🔥',
    resource: 'multiplier',
    operator: 'add',
    values: [0.2, 0.32, 0.48],
    desc: '倍率+0.2',
  },
  prod_frenzy: {
    id: 'prod_frenzy',
    name: '狂热',
    icon: '🔥🔥',
    resource: 'multiplier',
    operator: 'multiply',
    values: [1.15, 1.2, 1.25],
    desc: '倍率×1.15',
  },

  // === 时间产出者 ===
  prod_freeze: {
    id: 'prod_freeze',
    name: '冻结',
    icon: '❄️',
    resource: 'time',
    operator: 'add',
    values: [2, 3.2, 4.8],
    desc: '时间+2秒',
  },
  prod_eternal: {
    id: 'prod_eternal',
    name: '永恒',
    icon: '⏳',
    resource: 'time',
    operator: 'multiply',
    values: [1.2, 1.25, 1.3],
    desc: '时间×1.2',
  },

  // === 护盾产出者 ===
  prod_shield: {
    id: 'prod_shield',
    name: '护盾',
    icon: '🛡️',
    resource: 'shield',
    operator: 'add',
    values: [1, 2, 3],
    desc: '护盾+1',
  },
  prod_fortress: {
    id: 'prod_fortress',
    name: '铁壁',
    icon: '🏰',
    resource: 'shield',
    operator: 'multiply',
    values: [2, 2.3, 2.6],
    desc: '护盾×2',
  },
};

/** 检查 ID 是否为产出者 */
export function isProducer(id: string): boolean {
  return id in PRODUCERS;
}

/** 获取产出者在指定等级的数值 */
export function getProducerValue(id: string, level: number): number {
  const p = PRODUCERS[id];
  if (!p) return 0;
  const idx = Math.max(0, Math.min(level, 3) - 1);
  return p.values[idx];
}

const RESOURCE_LABELS: Record<string, string> = {
  base: '基数', score: '分数', multiplier: '倍率', time: '时间', shield: '护盾',
};

/** 生成等级相关的产出者描述 */
export function getProducerDesc(id: string, level: number): string {
  const p = PRODUCERS[id];
  if (!p) return '';
  const val = getProducerValue(id, level);
  const label = RESOURCE_LABELS[p.resource] || p.resource;
  return p.operator === 'add' ? `${label}+${val}` : `${label}×${val}`;
}
