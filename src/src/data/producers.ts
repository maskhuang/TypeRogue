// ============================================
// 打字肉鸽 - 产出者技能数据
// ============================================
// Story 19.2 + 32.5: 14 个原始产出者
// Story 34.1: +70 新机制产出者（charge/decay/pulse/crit/void）

import type { ProducerDefinition, ResourceType, ProducerMechanic } from '../core/types';
import { PositionRelation } from './keyboardTopology';
import { RESOURCE_LABELS, RESOURCE_ICONS } from '../core/constants';

// === 机制中文标签 ===
const MECHANIC_LABELS: Record<string, string> = {
  charge: '蓄力',
  decay: '衰减',
  pulse: '脉冲',
  crit: '暴击',
  void: '虚无',
};

// === 位置关系标签 ===
const RELATION_LABELS: Record<string, string> = {
  [PositionRelation.Adjacent]: '相邻',
  [PositionRelation.SameRow]: '同行',
  [PositionRelation.SameColumn]: '同列',
  [PositionRelation.SameHand]: '同手',
  [PositionRelation.SameFinger]: '同指',
  [PositionRelation.Symmetric]: '对称位',
};

const RELATION_ICONS: Record<string, string> = {
  [PositionRelation.Adjacent]: '🔗',
  [PositionRelation.SameRow]: '📡',
  [PositionRelation.SameColumn]: '📌',
  [PositionRelation.SameHand]: '🤝',
  [PositionRelation.SameFinger]: '👆',
  [PositionRelation.Symmetric]: '🪞',
};

// === 资源基础值表（复用现有加算产出者的 Lv1/2/3） ===
const BASE_VALUES: Record<ResourceType, [number, number, number]> = {
  base: [5, 8, 12],
  score: [15, 24, 36],
  multiplier: [0.2, 0.32, 0.48],
  time: [2, 3.2, 4.8],
  gold: [3, 5, 8],
  fragment: [1, 1.6, 2.4],
  mutagen: [1, 1.6, 2.4],
};

// === 机制图标前缀 ===
const MECHANIC_ICONS: Record<string, string> = {
  charge: '🔌',
  decay: '📉',
  pulse: '💗',
  crit: '🎲',
  void: '⬛',
};

// === 资源 ID 缩写 ===
const RES_ID: Record<ResourceType, string> = {
  base: 'base', score: 'score', multiplier: 'multiplier',
  time: 'time', gold: 'gold', fragment: 'fragment', mutagen: 'mutagen',
};

// === 虚无 bonusPerSlot 值（AC6 规范） ===
const VOID_BONUS: Record<string, number> = {
  [PositionRelation.Adjacent]: 0.25,
  [PositionRelation.SameRow]: 0.10,
  [PositionRelation.SameColumn]: 0.30,
  [PositionRelation.SameHand]: 0.05,
  [PositionRelation.SameFinger]: 0.35,
  [PositionRelation.Symmetric]: 0.50,
};

// === 名称表 ===
const CHARGE_NAMES: Record<ResourceType, string> = {
  base: '蓄力', score: '蓄锐', multiplier: '蓄势',
  time: '蓄时', gold: '蓄财', fragment: '蓄文', mutagen: '蓄变',
};

const DECAY_NAMES: Record<ResourceType, string> = {
  base: '烈击', score: '锐掠', multiplier: '燃尽',
  time: '灼时', gold: '挥金', fragment: '裂取', mutagen: '烈变',
};

const PULSE_NAMES: Record<ResourceType, string> = {
  base: '脉冲', score: '潮涌', multiplier: '鼓动',
  time: '潮汐', gold: '涌金', fragment: '碎波', mutagen: '涌变',
};

const CRIT_NAMES: Record<ResourceType, string> = {
  base: '狙击', score: '天赐', multiplier: '赌注',
  time: '偶得', gold: '横财', fragment: '巧取', mutagen: '异变',
};

const VOID_NAMES: Record<ResourceType, Record<string, string>> = {
  base:       { [PositionRelation.Adjacent]: '虚击', [PositionRelation.SameRow]: '虚阵', [PositionRelation.SameColumn]: '虚柱', [PositionRelation.SameHand]: '虚掌', [PositionRelation.SameFinger]: '虚指', [PositionRelation.Symmetric]: '虚镜' },
  score:      { [PositionRelation.Adjacent]: '虚掠', [PositionRelation.SameRow]: '虚潮', [PositionRelation.SameColumn]: '虚渊', [PositionRelation.SameHand]: '虚握', [PositionRelation.SameFinger]: '虚触', [PositionRelation.Symmetric]: '虚影' },
  multiplier: { [PositionRelation.Adjacent]: '虚燃', [PositionRelation.SameRow]: '虚横', [PositionRelation.SameColumn]: '虚纵', [PositionRelation.SameHand]: '虚合', [PositionRelation.SameFinger]: '虚尖', [PositionRelation.Symmetric]: '虚对' },
  time:       { [PositionRelation.Adjacent]: '虚刻', [PositionRelation.SameRow]: '虚流', [PositionRelation.SameColumn]: '虚泉', [PositionRelation.SameHand]: '虚腕', [PositionRelation.SameFinger]: '虚点', [PositionRelation.Symmetric]: '虚映' },
  gold:       { [PositionRelation.Adjacent]: '虚财', [PositionRelation.SameRow]: '虚矿', [PositionRelation.SameColumn]: '虚井', [PositionRelation.SameHand]: '虚宝', [PositionRelation.SameFinger]: '虚珠', [PositionRelation.Symmetric]: '虚金' },
  fragment:   { [PositionRelation.Adjacent]: '虚文', [PositionRelation.SameRow]: '虚篇', [PositionRelation.SameColumn]: '虚章', [PositionRelation.SameHand]: '虚书', [PositionRelation.SameFinger]: '虚笔', [PositionRelation.Symmetric]: '虚字' },
  mutagen:    { [PositionRelation.Adjacent]: '虚蚀', [PositionRelation.SameRow]: '虚基', [PositionRelation.SameColumn]: '虚链', [PositionRelation.SameHand]: '虚核', [PositionRelation.SameFinger]: '虚刺', [PositionRelation.Symmetric]: '虚因' },
};

// === 描述构建辅助 ===
function buildDesc(resource: ResourceType, values: [number, number, number], mechanic: ProducerMechanic, posRel?: PositionRelation): string {
  const resIcon = RESOURCE_ICONS[resource] || '';
  const resLabel = RESOURCE_LABELS[resource] || resource;
  const mechLabel = MECHANIC_LABELS[mechanic] || '';
  if (mechanic === 'void' && posRel) {
    const relLabel = RELATION_LABELS[posRel] || posRel;
    return `${resIcon}${resLabel}+${values[0]}(${mechLabel}·${relLabel})`;
  }
  return `${resIcon}${resLabel}+${values[0]}(${mechLabel})`;
}

// === 原始 14 个产出者 ===
export const PRODUCERS: Record<string, ProducerDefinition> = {
  // === 基数产出者 ===
  prod_burst: {
    id: 'prod_burst',
    name: '爆发',
    icon: '⚔️',
    resource: 'base',
    operator: 'add',
    values: [5, 8, 12],
    desc: '⚔️基数+5',
  },
  // === 分数产出者 ===
  prod_loot: {
    id: 'prod_loot',
    name: '掠夺',
    icon: '🪙',
    resource: 'score',
    operator: 'add',
    values: [15, 24, 36],
    desc: '🪙分数+15',
  },
  // === 倍率产出者 ===
  prod_boost: {
    id: 'prod_boost',
    name: '强化',
    icon: '🔥',
    resource: 'multiplier',
    operator: 'add',
    values: [0.2, 0.32, 0.48],
    desc: '🔥倍率+0.2',
  },
  // === 时间产出者 ===
  prod_freeze: {
    id: 'prod_freeze',
    name: '冻结',
    icon: '❄️',
    resource: 'time',
    operator: 'add',
    values: [2, 3.2, 4.8],
    desc: '⏳时间+2',
  },
  // === 金币产出者 ===
  prod_mint: {
    id: 'prod_mint',
    name: '铸币',
    icon: '💰',
    resource: 'gold',
    operator: 'add',
    values: [3, 5, 8],
    desc: '💰金币+3',
  },
  // === 碎片产出者（造词师专属）===
  prod_harvest: {
    id: 'prod_harvest',
    name: '采集',
    icon: '📝',
    resource: 'fragment',
    operator: 'add',
    values: [1, 1.6, 2.4],
    desc: '🔤碎片+1',
  },
  // === 变异素产出者（蜕变师专属）===
  prod_mutagen_drip: {
    id: 'prod_mutagen_drip',
    name: '渗变',
    icon: '💉',
    resource: 'mutagen',
    operator: 'add',
    values: [1, 1.6, 2.4],
    desc: '🧬变异素+1',
  },
};

// === 程序化生成新机制产出者（Story 34.1） ===

const ALL_RESOURCES: ResourceType[] = ['base', 'score', 'multiplier', 'time', 'gold', 'fragment', 'mutagen'];
const ALL_RELATIONS: PositionRelation[] = [
  PositionRelation.Adjacent, PositionRelation.SameRow, PositionRelation.SameColumn,
  PositionRelation.SameHand, PositionRelation.SameFinger, PositionRelation.Symmetric,
];

// --- 蓄力产出者（7 个）---
for (const res of ALL_RESOURCES) {
  const id = `prod_charge_${RES_ID[res]}`;
  const vals = BASE_VALUES[res];
  PRODUCERS[id] = {
    id,
    name: CHARGE_NAMES[res],
    icon: `${MECHANIC_ICONS.charge}${RESOURCE_ICONS[res]}`,
    resource: res,
    operator: 'add',
    values: [...vals],
    desc: buildDesc(res, vals, 'charge'),
    mechanic: 'charge',
    mechanicParams: { gainPerSec: 0.08, maxBonus: 2.0 },
  };
}

// --- 衰减产出者（7 个）---
for (const res of ALL_RESOURCES) {
  const id = `prod_decay_${RES_ID[res]}`;
  const vals = BASE_VALUES[res];
  PRODUCERS[id] = {
    id,
    name: DECAY_NAMES[res],
    icon: `${MECHANIC_ICONS.decay}${RESOURCE_ICONS[res]}`,
    resource: res,
    operator: 'add',
    values: [...vals],
    desc: buildDesc(res, vals, 'decay'),
    mechanic: 'decay',
    mechanicParams: { initialMult: 2.0, decayPerTrigger: 0.15, floor: 0.5 },
  };
}

// --- 脉冲产出者（7 个）---
for (const res of ALL_RESOURCES) {
  const id = `prod_pulse_${RES_ID[res]}`;
  const vals = BASE_VALUES[res];
  PRODUCERS[id] = {
    id,
    name: PULSE_NAMES[res],
    icon: `${MECHANIC_ICONS.pulse}${RESOURCE_ICONS[res]}`,
    resource: res,
    operator: 'add',
    values: [...vals],
    desc: buildDesc(res, vals, 'pulse'),
    mechanic: 'pulse',
    mechanicParams: { interval: 4, burstMult: 3.0 },
  };
}

// --- 暴击产出者（7 个）---
for (const res of ALL_RESOURCES) {
  const id = `prod_crit_${RES_ID[res]}`;
  const vals = BASE_VALUES[res];
  PRODUCERS[id] = {
    id,
    name: CRIT_NAMES[res],
    icon: `${MECHANIC_ICONS.crit}${RESOURCE_ICONS[res]}`,
    resource: res,
    operator: 'add',
    values: [...vals],
    desc: buildDesc(res, vals, 'crit'),
    mechanic: 'crit',
    mechanicParams: { chance: 0.5, critMult: 2.0 },
  };
}

// --- 虚无产出者（42 个 = 7 资源 × 6 位置关系）---
for (const res of ALL_RESOURCES) {
  for (const rel of ALL_RELATIONS) {
    const relSuffix = rel.replace(/([A-Z])/g, '_$1').toLowerCase(); // sameRow → same_row
    const id = `prod_void_${RES_ID[res]}_${relSuffix}`;
    const vals = BASE_VALUES[res];
    PRODUCERS[id] = {
      id,
      name: VOID_NAMES[res][rel],
      icon: `${MECHANIC_ICONS.void}${RELATION_ICONS[rel]}`,
      resource: res,
      operator: 'add',
      values: [...vals],
      desc: buildDesc(res, vals, 'void', rel),
      mechanic: 'void',
      mechanicParams: { posRel: rel, bonusPerSlot: VOID_BONUS[rel] },
    };
  }
}

// === 工具函数 ===

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

/** 生成等级相关的产出者描述 */
export function getProducerDesc(id: string, level: number, multiplyOverride?: { operator: 'multiply'; value: number }): string {
  const p = PRODUCERS[id];
  if (!p) return '';
  const label = RESOURCE_LABELS[p.resource] || p.resource;
  const icon = RESOURCE_ICONS[p.resource] || '';
  const operator = multiplyOverride?.operator || p.operator;
  const val = multiplyOverride?.value ?? getProducerValue(id, level);
  const base = operator === 'add'
    ? `${icon}${label}+${val}`
    : `${icon}${label}×${val}`;
  const mechanic = p.mechanic || 'standard';
  if (mechanic === 'standard') return base;
  const mechLabel = MECHANIC_LABELS[mechanic] || '';
  if (mechanic === 'void' && p.mechanicParams && 'posRel' in p.mechanicParams) {
    const relLabel = RELATION_LABELS[p.mechanicParams.posRel as string] || '';
    return `${base}(${mechLabel}·${relLabel})`;
  }
  return `${base}(${mechLabel})`;
}
