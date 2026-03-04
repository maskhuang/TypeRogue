// ============================================
// 打字肉鸽 - 连接者技能数据
// ============================================
// Story 19.5: 36 个连接者（6 复制型 + 30 资源触发型）

import type { ConnectorDefinition } from '../core/types';
import { PositionRelation } from './keyboardTopology';
import { RESOURCE_LABELS, RESOURCE_ICONS } from '../core/constants';

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

// === 36 个连接者数据 ===
export const CONNECTORS: Record<string, ConnectorDefinition> = {
  // === 复制型（6 个）— 按键触发，随机复制位置关系内一个技能 ===
  conn_copy_adjacent:   { id: 'conn_copy_adjacent',   name: '映射', icon: '🔗', triggerType: 'copy', positionRelation: PositionRelation.Adjacent,   desc: '触发时复制相邻技能' },
  conn_copy_sameRow:    { id: 'conn_copy_sameRow',    name: '广播', icon: '📡', triggerType: 'copy', positionRelation: PositionRelation.SameRow,    desc: '触发时复制同行技能' },
  conn_copy_sameColumn: { id: 'conn_copy_sameColumn', name: '钉合', icon: '📌', triggerType: 'copy', positionRelation: PositionRelation.SameColumn, desc: '触发时复制同列技能' },
  conn_copy_sameHand:   { id: 'conn_copy_sameHand',   name: '握手', icon: '🤝', triggerType: 'copy', positionRelation: PositionRelation.SameHand,   desc: '触发时复制同手技能' },
  conn_copy_sameFinger: { id: 'conn_copy_sameFinger', name: '指令', icon: '👆', triggerType: 'copy', positionRelation: PositionRelation.SameFinger, desc: '触发时复制同指技能' },
  conn_copy_symmetric:  { id: 'conn_copy_symmetric',  name: '链接', icon: '🪞', triggerType: 'copy', positionRelation: PositionRelation.Symmetric,  desc: '触发时复制对称位技能' },

  // === 资源触发型：基数↑（6 个）===
  conn_base_adjacent:   { id: 'conn_base_adjacent',   name: '震荡', icon: '⚔️🔗', triggerType: 'resourceTrigger', positionRelation: PositionRelation.Adjacent,   resource: 'base', desc: '基数↑→触发相邻技能' },
  conn_base_sameRow:    { id: 'conn_base_sameRow',    name: '横波', icon: '⚔️📡', triggerType: 'resourceTrigger', positionRelation: PositionRelation.SameRow,    resource: 'base', desc: '基数↑→触发同行技能' },
  conn_base_sameColumn: { id: 'conn_base_sameColumn', name: '纵波', icon: '⚔️📌', triggerType: 'resourceTrigger', positionRelation: PositionRelation.SameColumn, resource: 'base', desc: '基数↑→触发同列技能' },
  conn_base_sameHand:   { id: 'conn_base_sameHand',   name: '战吼', icon: '⚔️🤝', triggerType: 'resourceTrigger', positionRelation: PositionRelation.SameHand,   resource: 'base', desc: '基数↑→触发同手技能' },
  conn_base_sameFinger: { id: 'conn_base_sameFinger', name: '贯穿', icon: '⚔️👆', triggerType: 'resourceTrigger', positionRelation: PositionRelation.SameFinger, resource: 'base', desc: '基数↑→触发同指技能' },
  conn_base_symmetric:  { id: 'conn_base_symmetric',  name: '共振', icon: '⚔️🪞', triggerType: 'resourceTrigger', positionRelation: PositionRelation.Symmetric,  resource: 'base', desc: '基数↑→触发对称位技能' },

  // === 资源触发型：分数↑（6 个）===
  conn_score_adjacent:   { id: 'conn_score_adjacent',   name: '散财', icon: '🪙🔗', triggerType: 'resourceTrigger', positionRelation: PositionRelation.Adjacent,   resource: 'score', desc: '分数↑→触发相邻技能' },
  conn_score_sameRow:    { id: 'conn_score_sameRow',    name: '分红', icon: '🪙📡', triggerType: 'resourceTrigger', positionRelation: PositionRelation.SameRow,    resource: 'score', desc: '分数↑→触发同行技能' },
  conn_score_sameColumn: { id: 'conn_score_sameColumn', name: '投币', icon: '🪙📌', triggerType: 'resourceTrigger', positionRelation: PositionRelation.SameColumn, resource: 'score', desc: '分数↑→触发同列技能' },
  conn_score_sameHand:   { id: 'conn_score_sameHand',   name: '施舍', icon: '🪙🤝', triggerType: 'resourceTrigger', positionRelation: PositionRelation.SameHand,   resource: 'score', desc: '分数↑→触发同手技能' },
  conn_score_sameFinger: { id: 'conn_score_sameFinger', name: '翻倍', icon: '🪙👆', triggerType: 'resourceTrigger', positionRelation: PositionRelation.SameFinger, resource: 'score', desc: '分数↑→触发同指技能' },
  conn_score_symmetric:  { id: 'conn_score_symmetric',  name: '对账', icon: '🪙🪞', triggerType: 'resourceTrigger', positionRelation: PositionRelation.Symmetric,  resource: 'score', desc: '分数↑→触发对称位技能' },

  // === 资源触发型：倍率↑（6 个）===
  conn_multiplier_adjacent:   { id: 'conn_multiplier_adjacent',   name: '燎原', icon: '🔥🔗', triggerType: 'resourceTrigger', positionRelation: PositionRelation.Adjacent,   resource: 'multiplier', desc: '倍率↑→触发相邻技能' },
  conn_multiplier_sameRow:    { id: 'conn_multiplier_sameRow',    name: '火线', icon: '🔥📡', triggerType: 'resourceTrigger', positionRelation: PositionRelation.SameRow,    resource: 'multiplier', desc: '倍率↑→触发同行技能' },
  conn_multiplier_sameColumn: { id: 'conn_multiplier_sameColumn', name: '焚柱', icon: '🔥📌', triggerType: 'resourceTrigger', positionRelation: PositionRelation.SameColumn, resource: 'multiplier', desc: '倍率↑→触发同列技能' },
  conn_multiplier_sameHand:   { id: 'conn_multiplier_sameHand',   name: '炙手', icon: '🔥🤝', triggerType: 'resourceTrigger', positionRelation: PositionRelation.SameHand,   resource: 'multiplier', desc: '倍率↑→触发同手技能' },
  conn_multiplier_sameFinger: { id: 'conn_multiplier_sameFinger', name: '引线', icon: '🔥👆', triggerType: 'resourceTrigger', positionRelation: PositionRelation.SameFinger, resource: 'multiplier', desc: '倍率↑→触发同指技能' },
  conn_multiplier_symmetric:  { id: 'conn_multiplier_symmetric',  name: '对焰', icon: '🔥🪞', triggerType: 'resourceTrigger', positionRelation: PositionRelation.Symmetric,  resource: 'multiplier', desc: '倍率↑→触发对称位技能' },

  // === 资源触发型：时间↑（6 个）===
  conn_time_adjacent:   { id: 'conn_time_adjacent',   name: '涟漪', icon: '⏳🔗', triggerType: 'resourceTrigger', positionRelation: PositionRelation.Adjacent,   resource: 'time', desc: '时间↑→触发相邻技能' },
  conn_time_sameRow:    { id: 'conn_time_sameRow',    name: '回溯', icon: '⏳📡', triggerType: 'resourceTrigger', positionRelation: PositionRelation.SameRow,    resource: 'time', desc: '时间↑→触发同行技能' },
  conn_time_sameColumn: { id: 'conn_time_sameColumn', name: '滴答', icon: '⏳📌', triggerType: 'resourceTrigger', positionRelation: PositionRelation.SameColumn, resource: 'time', desc: '时间↑→触发同列技能' },
  conn_time_sameHand:   { id: 'conn_time_sameHand',   name: '共时', icon: '⏳🤝', triggerType: 'resourceTrigger', positionRelation: PositionRelation.SameHand,   resource: 'time', desc: '时间↑→触发同手技能' },
  conn_time_sameFinger: { id: 'conn_time_sameFinger', name: '拨针', icon: '⏳👆', triggerType: 'resourceTrigger', positionRelation: PositionRelation.SameFinger, resource: 'time', desc: '时间↑→触发同指技能' },
  conn_time_symmetric:  { id: 'conn_time_symmetric',  name: '轮回', icon: '⏳🪞', triggerType: 'resourceTrigger', positionRelation: PositionRelation.Symmetric,  resource: 'time', desc: '时间↑→触发对称位技能' },

  // === 资源触发型：护盾↑（6 个）===
  conn_shield_adjacent:   { id: 'conn_shield_adjacent',   name: '联防', icon: '🛡️🔗', triggerType: 'resourceTrigger', positionRelation: PositionRelation.Adjacent,   resource: 'shield', desc: '护盾↑→触发相邻技能' },
  conn_shield_sameRow:    { id: 'conn_shield_sameRow',    name: '阵线', icon: '🛡️📡', triggerType: 'resourceTrigger', positionRelation: PositionRelation.SameRow,    resource: 'shield', desc: '护盾↑→触发同行技能' },
  conn_shield_sameColumn: { id: 'conn_shield_sameColumn', name: '壁垒', icon: '🛡️📌', triggerType: 'resourceTrigger', positionRelation: PositionRelation.SameColumn, resource: 'shield', desc: '护盾↑→触发同列技能' },
  conn_shield_sameHand:   { id: 'conn_shield_sameHand',   name: '方阵', icon: '🛡️🤝', triggerType: 'resourceTrigger', positionRelation: PositionRelation.SameHand,   resource: 'shield', desc: '护盾↑→触发同手技能' },
  conn_shield_sameFinger: { id: 'conn_shield_sameFinger', name: '坚守', icon: '🛡️👆', triggerType: 'resourceTrigger', positionRelation: PositionRelation.SameFinger, resource: 'shield', desc: '护盾↑→触发同指技能' },
  conn_shield_symmetric:  { id: 'conn_shield_symmetric',  name: '镜盾', icon: '🛡️🪞', triggerType: 'resourceTrigger', positionRelation: PositionRelation.Symmetric,  resource: 'shield', desc: '护盾↑→触发对称位技能' },
} as const;

// === 工具函数 ===

/** 检查 ID 是否为连接者 */
export function isConnector(id: string): boolean {
  return id in CONNECTORS;
}

/** 每局 run 从 36 个连接者中随机抽 18 个 ID */
export function drawConnectorPool(count = 18): string[] {
  const all = Object.keys(CONNECTORS);
  const shuffled = [...all];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/** 生成连接者描述 */
export function getConnectorDesc(id: string): string {
  const conn = CONNECTORS[id];
  if (!conn) return '';
  const relLabel = RELATION_LABELS[conn.positionRelation] || conn.positionRelation;
  if (conn.triggerType === 'copy') {
    return `触发时复制${relLabel}技能`;
  }
  const resIcon = RESOURCE_ICONS[conn.resource!] || '';
  const resLabel = RESOURCE_LABELS[conn.resource!] || conn.resource;
  return `${resIcon}${resLabel}↑→触发${relLabel}技能`;
}
