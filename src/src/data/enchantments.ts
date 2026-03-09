// ============================================
// 打字肉鸽 - 附魔数据
// ============================================
// Story 24.2: 35 个附魔（30 空间型 + 4 变性型 + 1 独立型）

import type { EnchantmentDefinition } from '../core/types';
import { PositionRelation } from './keyboardTopology';
import { state } from '../core/state';

// === 35 个附魔数据 ===
export const ENCHANTMENTS: Record<string, EnchantmentDefinition> = {
  // === 空间型 — 成长（6 个）"邻居触发让我跨关变强" ===
  ench_growth_adjacent:   { id: 'ench_growth_adjacent',   name: '汲取', icon: '🌱🔗', category: 'spatial', spatialType: 'growth', positionRelation: PositionRelation.Adjacent,   effectValue: 0.03, desc: '🔗相邻技能触发时：自身产出永久+3%' },
  ench_growth_sameRow:    { id: 'ench_growth_sameRow',    name: '感染', icon: '🌱📡', category: 'spatial', spatialType: 'growth', positionRelation: PositionRelation.SameRow,    effectValue: 0.02, desc: '📡同行技能触发时：自身产出永久+2%' },
  ench_growth_sameColumn: { id: 'ench_growth_sameColumn', name: '脉冲', icon: '🌱📌', category: 'spatial', spatialType: 'growth', positionRelation: PositionRelation.SameColumn, effectValue: 0.04, desc: '📌同列技能触发时：自身产出永久+4%' },
  ench_growth_sameHand:   { id: 'ench_growth_sameHand',   name: '渗透', icon: '🌱🤝', category: 'spatial', spatialType: 'growth', positionRelation: PositionRelation.SameHand,   effectValue: 0.01, desc: '🤝同手技能触发时：自身产出永久+1%' },
  ench_growth_sameFinger: { id: 'ench_growth_sameFinger', name: '贯通', icon: '🌱👆', category: 'spatial', spatialType: 'growth', positionRelation: PositionRelation.SameFinger, effectValue: 0.05, desc: '👆同指技能触发时：自身产出永久+5%' },
  ench_growth_symmetric:  { id: 'ench_growth_symmetric',  name: '共振', icon: '🌱🪞', category: 'spatial', spatialType: 'growth', positionRelation: PositionRelation.Symmetric,  effectValue: 0.06, desc: '🪞对称位技能触发时：自身产出永久+6%' },

  // === 空间型 — 溅射（6 个）"我让邻居变强"，效率 = 100%/范围内技能数 ===
  ench_splash_adjacent:   { id: 'ench_splash_adjacent',   name: '波及', icon: '💫🔗', category: 'spatial', spatialType: 'splash', positionRelation: PositionRelation.Adjacent,   effectValue: 0, desc: '触发后：等分效率触发🔗相邻非连接技能（不再引发💫溅射）' },
  ench_splash_sameRow:    { id: 'ench_splash_sameRow',    name: '横扫', icon: '💫📡', category: 'spatial', spatialType: 'splash', positionRelation: PositionRelation.SameRow,    effectValue: 0, desc: '触发后：等分效率触发📡同行非连接技能（不再引发💫溅射）' },
  ench_splash_sameColumn: { id: 'ench_splash_sameColumn', name: '穿刺', icon: '💫📌', category: 'spatial', spatialType: 'splash', positionRelation: PositionRelation.SameColumn, effectValue: 0, desc: '触发后：等分效率触发📌同列非连接技能（不再引发💫溅射）' },
  ench_splash_sameHand:   { id: 'ench_splash_sameHand',   name: '普照', icon: '💫🤝', category: 'spatial', spatialType: 'splash', positionRelation: PositionRelation.SameHand,   effectValue: 0, desc: '触发后：等分效率触发🤝同手非连接技能（不再引发💫溅射）' },
  ench_splash_sameFinger: { id: 'ench_splash_sameFinger', name: '灌注', icon: '💫👆', category: 'spatial', spatialType: 'splash', positionRelation: PositionRelation.SameFinger, effectValue: 0, desc: '触发后：等分效率触发👆同指非连接技能（不再引发💫溅射）' },
  ench_splash_symmetric:  { id: 'ench_splash_symmetric',  name: '投影', icon: '💫🪞', category: 'spatial', spatialType: 'splash', positionRelation: PositionRelation.Symmetric,  effectValue: 0, desc: '触发后：等分效率触发🪞对称位非连接技能（不再引发💫溅射）' },

  // === 空间型 — 共鸣（6 个）"邻居带我白嫖" ===
  ench_resonance_adjacent:   { id: 'ench_resonance_adjacent',   name: '感应', icon: '🔔🔗', category: 'spatial', spatialType: 'resonance', positionRelation: PositionRelation.Adjacent,   effectValue: 0.50, desc: '🔗相邻技能触发时：自身触发（50%效率，不再引发🔔共鸣）' },
  ench_resonance_sameRow:    { id: 'ench_resonance_sameRow',    name: '合唱', icon: '🔔📡', category: 'spatial', spatialType: 'resonance', positionRelation: PositionRelation.SameRow,    effectValue: 0.30, desc: '📡同行技能触发时：自身触发（30%效率，不再引发🔔共鸣）' },
  ench_resonance_sameColumn: { id: 'ench_resonance_sameColumn', name: '回声', icon: '🔔📌', category: 'spatial', spatialType: 'resonance', positionRelation: PositionRelation.SameColumn, effectValue: 0.40, desc: '📌同列技能触发时：自身触发（40%效率，不再引发🔔共鸣）' },
  ench_resonance_sameHand:   { id: 'ench_resonance_sameHand',   name: '同频', icon: '🔔🤝', category: 'spatial', spatialType: 'resonance', positionRelation: PositionRelation.SameHand,   effectValue: 0.15, desc: '🤝同手技能触发时：自身触发（15%效率，不再引发🔔共鸣）' },
  ench_resonance_sameFinger: { id: 'ench_resonance_sameFinger', name: '连带', icon: '🔔👆', category: 'spatial', spatialType: 'resonance', positionRelation: PositionRelation.SameFinger, effectValue: 0.50, desc: '👆同指技能触发时：自身触发（50%效率，不再引发🔔共鸣）' },
  ench_resonance_symmetric:  { id: 'ench_resonance_symmetric',  name: '心电', icon: '🔔🪞', category: 'spatial', spatialType: 'resonance', positionRelation: PositionRelation.Symmetric,  effectValue: 0.60, desc: '🪞对称位技能触发时：自身触发（60%效率，不再引发🔔共鸣）' },

  // === 空间型 — 排斥（6 个）"空位让我更强" ===
  ench_repulsion_adjacent:   { id: 'ench_repulsion_adjacent',   name: '虚无', icon: '🕳️🔗', category: 'spatial', spatialType: 'repulsion', positionRelation: PositionRelation.Adjacent,   effectValue: 0.25, desc: '🔗相邻每空位产出+25%' },
  ench_repulsion_sameRow:    { id: 'ench_repulsion_sameRow',    name: '荒原', icon: '🕳️📡', category: 'spatial', spatialType: 'repulsion', positionRelation: PositionRelation.SameRow,    effectValue: 0.10, desc: '📡同行每空位产出+10%' },
  ench_repulsion_sameColumn: { id: 'ench_repulsion_sameColumn', name: '深渊', icon: '🕳️📌', category: 'spatial', spatialType: 'repulsion', positionRelation: PositionRelation.SameColumn, effectValue: 0.30, desc: '📌同列每空位产出+30%' },
  ench_repulsion_sameHand:   { id: 'ench_repulsion_sameHand',   name: '寂灭', icon: '🕳️🤝', category: 'spatial', spatialType: 'repulsion', positionRelation: PositionRelation.SameHand,   effectValue: 0.05, desc: '🤝同手每空位产出+5%' },
  ench_repulsion_sameFinger: { id: 'ench_repulsion_sameFinger', name: '断指', icon: '🕳️👆', category: 'spatial', spatialType: 'repulsion', positionRelation: PositionRelation.SameFinger, effectValue: 0.35, desc: '👆同指每空位产出+35%' },
  ench_repulsion_symmetric:  { id: 'ench_repulsion_symmetric',  name: '空镜', icon: '🕳️🪞', category: 'spatial', spatialType: 'repulsion', positionRelation: PositionRelation.Symmetric,  effectValue: 0.50, desc: '🪞对称位为空产出+50%' },

  // === 空间型 — 吞噬（6 个）"范围内弱技能被我吞噬" ===
  ench_devour_adjacent:   { id: 'ench_devour_adjacent',   name: '噬邻', icon: '🦷🔗', category: 'spatial', spatialType: 'devour', positionRelation: PositionRelation.Adjacent,   effectValue: 0.20, desc: '每5次触发：吞噬🔗相邻最弱技能，产出+20%/吞噬数' },
  ench_devour_sameRow:    { id: 'ench_devour_sameRow',    name: '噬行', icon: '🦷📡', category: 'spatial', spatialType: 'devour', positionRelation: PositionRelation.SameRow,    effectValue: 0.20, desc: '每5次触发：吞噬📡同行最弱技能，产出+20%/吞噬数' },
  ench_devour_sameColumn: { id: 'ench_devour_sameColumn', name: '噬列', icon: '🦷📌', category: 'spatial', spatialType: 'devour', positionRelation: PositionRelation.SameColumn, effectValue: 0.20, desc: '每5次触发：吞噬📌同列最弱技能，产出+20%/吞噬数' },
  ench_devour_sameHand:   { id: 'ench_devour_sameHand',   name: '噬掌', icon: '🦷🤝', category: 'spatial', spatialType: 'devour', positionRelation: PositionRelation.SameHand,   effectValue: 0.20, desc: '每5次触发：吞噬🤝同手最弱技能，产出+20%/吞噬数' },
  ench_devour_sameFinger: { id: 'ench_devour_sameFinger', name: '噬指', icon: '🦷👆', category: 'spatial', spatialType: 'devour', positionRelation: PositionRelation.SameFinger, effectValue: 0.20, desc: '每5次触发：吞噬👆同指最弱技能，产出+20%/吞噬数' },
  ench_devour_symmetric:  { id: 'ench_devour_symmetric',  name: '噬镜', icon: '🦷🪞', category: 'spatial', spatialType: 'devour', positionRelation: PositionRelation.Symmetric,  effectValue: 0.20, desc: '每5次触发：吞噬🪞对称位最弱技能，产出+20%/吞噬数' },

  // === 变性型（4 个）"额外产出另一种资源" ===
  ench_trans_base:       { id: 'ench_trans_base',       name: '附力', icon: '⚔️✨', category: 'transmutation', effectValue: 0.30, extraResource: 'base',       desc: '触发后：额外产出⚔️基数（本次产出的30%）' },
  ench_trans_score:      { id: 'ench_trans_score',      name: '附金', icon: '🪙✨', category: 'transmutation', effectValue: 0.30, extraResource: 'score',      desc: '触发后：额外产出🪙分数（本次产出的30%）' },
  ench_trans_multiplier: { id: 'ench_trans_multiplier', name: '附焰', icon: '🔥✨', category: 'transmutation', effectValue: 0.10, extraResource: 'multiplier', desc: '触发后：额外产出🔥倍率（本次产出的10%）' },
  ench_trans_time:       { id: 'ench_trans_time',       name: '附时', icon: '⏳✨', category: 'transmutation', effectValue: 0.20, extraResource: 'time',       desc: '触发后：额外产出⏳时间（本次产出的20%）' },
  // === 独立型（1 个）"不依赖位置关系的成长" ===
  ench_mastery: { id: 'ench_mastery', name: '精通', icon: '🏆', category: 'independent', effectValue: 0.08, desc: '每10次触发：自身产出永久+8%' },

  // === 职业专属 — 造词师（3 个）"造词驱动的成长" ===
  ench_harvest:         { id: 'ench_harvest',         name: '丰收', icon: '🌾', category: 'class-exclusive', effectValue: 0.08, desc: '每造一个词：自身产出永久+8%' },
  ench_letter_affinity: { id: 'ench_letter_affinity', name: '字母亲和', icon: '💌', category: 'class-exclusive', effectValue: 0.25, desc: '采集队列含本键字母时：产出+25%' },
  ench_overflow:        { id: 'ench_overflow',        name: '满溢', icon: '🫧', category: 'class-exclusive', effectValue: 0.20, desc: '每有1种碎片≥15：产出+20%（第2种起各+5%）' },
} as const;

// === 工具函数 ===

/** 检查 ID 是否为附魔 */
export function isEnchantment(id: string): boolean {
  return id in ENCHANTMENTS;
}

/** 生成附魔描述 */
export function getEnchantmentDesc(id: string): string {
  const ench = ENCHANTMENTS[id];
  if (!ench) return '';
  return ench.desc;
}

/**
 * 从附魔池随机抽 2 个不重复的附魔 ID
 * @param skillRelation 技能自身的 positionRelation（如增幅者）；
 *   若提供，空间类附魔只保留匹配该范围的，非空间类不受限
 */
export function drawEnchantmentPair(skillRelation?: PositionRelation): [string, string] {
  const isWordsmith = state.classId === 'wordsmith';
  const all = Object.values(ENCHANTMENTS)
    .filter(e => {
      // 职业专属附魔：仅对应职业可抽取
      if (e.category === 'class-exclusive') return isWordsmith;
      if (!skillRelation) return true;
      // 空间类必须匹配技能范围
      if (e.category === 'spatial') return e.positionRelation === skillRelation;
      return true;
    })
    .map(e => e.id);
  const i = Math.floor(Math.random() * all.length);
  let j = Math.floor(Math.random() * (all.length - 1));
  if (j >= i) j++;
  return [all[i], all[j]];
}
