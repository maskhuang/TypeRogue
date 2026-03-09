// ============================================
// 打字肉鸽 - 连接者 + 复制者技能数据
// ============================================
// 连接者（25 个资源触发型）：被动响应范围内资源产出
// 复制者（6 个）：按键触发，随机复制范围内一个技能

import type { ConnectorDefinition, ReplicatorDefinition } from '../core/types';
import { PositionRelation } from './keyboardTopology';
import { RESOURCE_LABELS, RESOURCE_ICONS } from '../core/constants';
import { random } from '../core/seededRandom';

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

// === 6 个复制者数据 ===
export const REPLICATORS: Record<string, ReplicatorDefinition> = {
  conn_copy_adjacent:   { id: 'conn_copy_adjacent',   name: '映射', icon: '🔗', positionRelation: PositionRelation.Adjacent,   desc: '触发1个🔗相邻技能' },
  conn_copy_sameRow:    { id: 'conn_copy_sameRow',    name: '广播', icon: '📡', positionRelation: PositionRelation.SameRow,    desc: '触发1个📡同行技能' },
  conn_copy_sameColumn: { id: 'conn_copy_sameColumn', name: '钉合', icon: '📌', positionRelation: PositionRelation.SameColumn, desc: '触发1个📌同列技能' },
  conn_copy_sameHand:   { id: 'conn_copy_sameHand',   name: '握手', icon: '🤝', positionRelation: PositionRelation.SameHand,   desc: '触发1个🤝同手技能' },
  conn_copy_sameFinger: { id: 'conn_copy_sameFinger', name: '指令', icon: '👆', positionRelation: PositionRelation.SameFinger, desc: '触发1个👆同指技能' },
  conn_copy_symmetric:  { id: 'conn_copy_symmetric',  name: '链接', icon: '🪞', positionRelation: PositionRelation.Symmetric,  desc: '触发1个🪞对称位技能' },
};

// === 25 个连接者数据（资源触发型） ===
export const CONNECTORS: Record<string, ConnectorDefinition> = {
  // === 基数↑（5 个）===
  conn_base_adjacent:   { id: 'conn_base_adjacent',   name: '震荡', icon: '⚔️🔗', positionRelation: PositionRelation.Adjacent,   resource: 'base', desc: '🔗相邻技能产出⚔️基数时：触发1个🔗相邻非⚔️基数技能' },
  conn_base_sameRow:    { id: 'conn_base_sameRow',    name: '横波', icon: '⚔️📡', positionRelation: PositionRelation.SameRow,    resource: 'base', desc: '📡同行技能产出⚔️基数时：触发1个📡同行非⚔️基数技能' },
  conn_base_sameColumn: { id: 'conn_base_sameColumn', name: '纵波', icon: '⚔️📌', positionRelation: PositionRelation.SameColumn, resource: 'base', desc: '📌同列技能产出⚔️基数时：触发1个📌同列非⚔️基数技能' },
  conn_base_sameHand:   { id: 'conn_base_sameHand',   name: '战吼', icon: '⚔️🤝', positionRelation: PositionRelation.SameHand,   resource: 'base', desc: '🤝同手技能产出⚔️基数时：触发1个🤝同手非⚔️基数技能' },
  conn_base_sameFinger: { id: 'conn_base_sameFinger', name: '贯穿', icon: '⚔️👆', positionRelation: PositionRelation.SameFinger, resource: 'base', desc: '👆同指技能产出⚔️基数时：触发1个👆同指非⚔️基数技能' },

  // === 分数↑（5 个）===
  conn_score_adjacent:   { id: 'conn_score_adjacent',   name: '散财', icon: '🪙🔗', positionRelation: PositionRelation.Adjacent,   resource: 'score', desc: '🔗相邻技能产出🪙分数时：触发1个🔗相邻非🪙分数技能' },
  conn_score_sameRow:    { id: 'conn_score_sameRow',    name: '分红', icon: '🪙📡', positionRelation: PositionRelation.SameRow,    resource: 'score', desc: '📡同行技能产出🪙分数时：触发1个📡同行非🪙分数技能' },
  conn_score_sameColumn: { id: 'conn_score_sameColumn', name: '投币', icon: '🪙📌', positionRelation: PositionRelation.SameColumn, resource: 'score', desc: '📌同列技能产出🪙分数时：触发1个📌同列非🪙分数技能' },
  conn_score_sameHand:   { id: 'conn_score_sameHand',   name: '施舍', icon: '🪙🤝', positionRelation: PositionRelation.SameHand,   resource: 'score', desc: '🤝同手技能产出🪙分数时：触发1个🤝同手非🪙分数技能' },
  conn_score_sameFinger: { id: 'conn_score_sameFinger', name: '翻倍', icon: '🪙👆', positionRelation: PositionRelation.SameFinger, resource: 'score', desc: '👆同指技能产出🪙分数时：触发1个👆同指非🪙分数技能' },

  // === 倍率↑（5 个）===
  conn_multiplier_adjacent:   { id: 'conn_multiplier_adjacent',   name: '燎原', icon: '🔥🔗', positionRelation: PositionRelation.Adjacent,   resource: 'multiplier', desc: '🔗相邻技能产出🔥倍率时：触发1个🔗相邻非🔥倍率技能' },
  conn_multiplier_sameRow:    { id: 'conn_multiplier_sameRow',    name: '火线', icon: '🔥📡', positionRelation: PositionRelation.SameRow,    resource: 'multiplier', desc: '📡同行技能产出🔥倍率时：触发1个📡同行非🔥倍率技能' },
  conn_multiplier_sameColumn: { id: 'conn_multiplier_sameColumn', name: '焚柱', icon: '🔥📌', positionRelation: PositionRelation.SameColumn, resource: 'multiplier', desc: '📌同列技能产出🔥倍率时：触发1个📌同列非🔥倍率技能' },
  conn_multiplier_sameHand:   { id: 'conn_multiplier_sameHand',   name: '炙手', icon: '🔥🤝', positionRelation: PositionRelation.SameHand,   resource: 'multiplier', desc: '🤝同手技能产出🔥倍率时：触发1个🤝同手非🔥倍率技能' },
  conn_multiplier_sameFinger: { id: 'conn_multiplier_sameFinger', name: '引线', icon: '🔥👆', positionRelation: PositionRelation.SameFinger, resource: 'multiplier', desc: '👆同指技能产出🔥倍率时：触发1个👆同指非🔥倍率技能' },

  // === 时间↑（5 个）===
  conn_time_adjacent:   { id: 'conn_time_adjacent',   name: '涟漪', icon: '⏳🔗', positionRelation: PositionRelation.Adjacent,   resource: 'time', desc: '🔗相邻技能产出⏳时间时：触发1个🔗相邻非⏳时间技能' },
  conn_time_sameRow:    { id: 'conn_time_sameRow',    name: '回溯', icon: '⏳📡', positionRelation: PositionRelation.SameRow,    resource: 'time', desc: '📡同行技能产出⏳时间时：触发1个📡同行非⏳时间技能' },
  conn_time_sameColumn: { id: 'conn_time_sameColumn', name: '滴答', icon: '⏳📌', positionRelation: PositionRelation.SameColumn, resource: 'time', desc: '📌同列技能产出⏳时间时：触发1个📌同列非⏳时间技能' },
  conn_time_sameHand:   { id: 'conn_time_sameHand',   name: '共时', icon: '⏳🤝', positionRelation: PositionRelation.SameHand,   resource: 'time', desc: '🤝同手技能产出⏳时间时：触发1个🤝同手非⏳时间技能' },
  conn_time_sameFinger: { id: 'conn_time_sameFinger', name: '拨针', icon: '⏳👆', positionRelation: PositionRelation.SameFinger, resource: 'time', desc: '👆同指技能产出⏳时间时：触发1个👆同指非⏳时间技能' },

  // === 金币↑（5 个）===
  conn_gold_adjacent:   { id: 'conn_gold_adjacent',   name: '交易', icon: '💰🔗', positionRelation: PositionRelation.Adjacent,   resource: 'gold', desc: '🔗相邻技能产出💰金币时：触发1个🔗相邻非💰金币技能' },
  conn_gold_sameRow:    { id: 'conn_gold_sameRow',    name: '汇款', icon: '💰📡', positionRelation: PositionRelation.SameRow,    resource: 'gold', desc: '📡同行技能产出💰金币时：触发1个📡同行非💰金币技能' },
  conn_gold_sameColumn: { id: 'conn_gold_sameColumn', name: '金脉', icon: '💰📌', positionRelation: PositionRelation.SameColumn, resource: 'gold', desc: '📌同列技能产出💰金币时：触发1个📌同列非💰金币技能' },
  conn_gold_sameHand:   { id: 'conn_gold_sameHand',   name: '铸币', icon: '💰🤝', positionRelation: PositionRelation.SameHand,   resource: 'gold', desc: '🤝同手技能产出💰金币时：触发1个🤝同手非💰金币技能' },
  conn_gold_sameFinger: { id: 'conn_gold_sameFinger', name: '点金', icon: '💰👆', positionRelation: PositionRelation.SameFinger, resource: 'gold', desc: '👆同指技能产出💰金币时：触发1个👆同指非💰金币技能' },
} as const;

// === 工具函数 ===

/** 检查 ID 是否为复制者 */
export function isReplicator(id: string): boolean {
  return id in REPLICATORS;
}

/** 检查 ID 是否为连接者 */
export function isConnector(id: string): boolean {
  return id in CONNECTORS;
}

/** 每局 run 从 25 个连接者中随机抽 13 个 ID */
export function drawConnectorPool(count = 13): string[] {
  const all = Object.keys(CONNECTORS);
  const shuffled = [...all];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/** 每局 run 从 6 个复制者中随机抽 5 个 ID */
export function drawReplicatorPool(count = 5): string[] {
  const all = Object.keys(REPLICATORS);
  const shuffled = [...all];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/** 生成连接者描述 */
export function getConnectorDesc(id: string): string {
  const conn = CONNECTORS[id];
  if (!conn) return '';
  const relLabel = RELATION_LABELS[conn.positionRelation] || conn.positionRelation;
  const relIcon = RELATION_ICONS[conn.positionRelation] || '';
  const resLabel = RESOURCE_LABELS[conn.resource] || conn.resource;
  const resIcon = RESOURCE_ICONS[conn.resource] || '';
  return `${relIcon}${relLabel}技能产出${resIcon}${resLabel}时：触发1个${relIcon}${relLabel}非${resIcon}${resLabel}技能`;
}

/** 生成复制者描述 */
export function getReplicatorDesc(id: string): string {
  const rep = REPLICATORS[id];
  if (!rep) return '';
  const relLabel = RELATION_LABELS[rep.positionRelation] || rep.positionRelation;
  const relIcon = RELATION_ICONS[rep.positionRelation] || '';
  return `触发1个${relIcon}${relLabel}技能`;
}
