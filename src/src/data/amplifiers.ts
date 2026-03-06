// ============================================
// 打字肉鸽 - 增幅者技能数据
// ============================================
// Story 23.1: 数据结构与工具函数
// Story 23.2: 8 个增幅者数据（5 加法 + 3 乘法）

import type { AmplifierDefinition } from '../core/types';
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

// === 8 个增幅者数据 ===
export const AMPLIFIERS: Record<string, AmplifierDefinition> = {
  // === 加法增幅者（5 个）— 每层+N，稳定兜底 ===
  amp_base_add_adjacent:      { id: 'amp_base_add_adjacent',      name: '铸基', icon: '🔱', resource: 'base',       positionRelation: PositionRelation.Adjacent,   operator: 'add', valuePerStack: 1,    desc: '每层为相邻技能⚔️基数+1' },
  amp_mult_add_adjacent:      { id: 'amp_mult_add_adjacent',      name: '激励', icon: '✴️', resource: 'multiplier', positionRelation: PositionRelation.Adjacent,   operator: 'add', valuePerStack: 0.02, desc: '每层为相邻技能🔥倍率+0.02' },
  amp_score_add_sameColumn:   { id: 'amp_score_add_sameColumn',   name: '聚财', icon: '🏹', resource: 'score',      positionRelation: PositionRelation.SameColumn, operator: 'add', valuePerStack: 2,    desc: '每层为同列技能🪙分数+2' },
  amp_time_add_adjacent:      { id: 'amp_time_add_adjacent',      name: '滋润', icon: '💧', resource: 'time',       positionRelation: PositionRelation.Adjacent,   operator: 'add', valuePerStack: 0.05, desc: '每层为相邻技能⏳时间+0.05' },
  amp_shield_add_symmetric:   { id: 'amp_shield_add_symmetric',   name: '映盾', icon: '🧿', resource: 'shield',     positionRelation: PositionRelation.Symmetric,  operator: 'add', valuePerStack: 0.02, desc: '每层为对称位技能🛡️护盾+0.02' },

  // === 乘法增幅者（3 个）— 每层×N%，后期爆发 ===
  amp_base_mul_adjacent:      { id: 'amp_base_mul_adjacent',      name: '淬炼', icon: '⚗️', resource: 'base',       positionRelation: PositionRelation.Adjacent,   operator: 'multiply', valuePerStack: 0.05, desc: '每层为相邻技能⚔️基数×5%' },
  amp_mult_mul_sameRow:       { id: 'amp_mult_mul_sameRow',       name: '共振', icon: '🔊', resource: 'multiplier', positionRelation: PositionRelation.SameRow,    operator: 'multiply', valuePerStack: 0.03, desc: '每层为同行技能🔥倍率×3%' },
  amp_score_mul_sameHand:     { id: 'amp_score_mul_sameHand',     name: '点金', icon: '🪄', resource: 'score',      positionRelation: PositionRelation.SameHand,   operator: 'multiply', valuePerStack: 0.04, desc: '每层为同手技能🪙分数×4%' },
} as const;

// === 工具函数 ===

/** 检查 ID 是否为增幅者 */
export function isAmplifier(id: string): boolean {
  return id in AMPLIFIERS;
}

/** 每局 run 从增幅者池中随机抽取指定数量 */
export function drawAmplifierPool(count = 10): string[] {
  const all = Object.keys(AMPLIFIERS);
  const shuffled = [...all];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/** 获取增幅者在指定等级的每层增幅值：Lv1=×1.0, Lv2=×1.5, Lv3=×2.0 */
export function getAmplifierValue(id: string, level: number): number {
  const amp = AMPLIFIERS[id];
  if (!amp) return 0;
  const growthFactors = [1.0, 1.5, 2.0];
  const idx = Math.max(0, Math.min(level, 3) - 1);
  return amp.valuePerStack * growthFactors[idx];
}

/** 生成等级相关的增幅者描述 */
export function getAmplifierDesc(id: string, level?: number): string {
  const amp = AMPLIFIERS[id];
  if (!amp) return '';
  if (level == null) return amp.desc;
  const value = getAmplifierValue(id, level);
  const resLabel = RESOURCE_LABELS[amp.resource] || amp.resource;
  const resIcon = RESOURCE_ICONS[amp.resource] || '';
  const relLabel = RELATION_LABELS[amp.positionRelation] || amp.positionRelation;
  if (amp.operator === 'add') {
    return `每层为${relLabel}技能${resIcon}${resLabel}+${parseFloat(value.toPrecision(4))}`;
  }
  return `每层为${relLabel}技能${resIcon}${resLabel}×${parseFloat((value * 100).toPrecision(4))}%`;
}
