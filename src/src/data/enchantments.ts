// ============================================
// 打字肉鸽 - 附魔数据
// ============================================
// Story 24.2: 36 个附魔（30 空间型 + 5 变性型 + 1 独立型）

import type { EnchantmentDefinition } from '../core/types';
import { PositionRelation } from './keyboardTopology';

// === 36 个附魔数据 ===
export const ENCHANTMENTS: Record<string, EnchantmentDefinition> = {
  // === 空间型 — 成长（6 个）"邻居触发让我跨关变强" ===
  ench_growth_adjacent:   { id: 'ench_growth_adjacent',   name: '汲取', icon: '🌱',    category: 'spatial', spatialType: 'growth', positionRelation: PositionRelation.Adjacent,   effectValue: 0.03, desc: '相邻技能触发时，自身永久 +3%' },
  ench_growth_sameRow:    { id: 'ench_growth_sameRow',    name: '感染', icon: '🌱📡', category: 'spatial', spatialType: 'growth', positionRelation: PositionRelation.SameRow,    effectValue: 0.02, desc: '同行技能触发时，自身永久 +2%' },
  ench_growth_sameColumn: { id: 'ench_growth_sameColumn', name: '脉冲', icon: '🌱📌', category: 'spatial', spatialType: 'growth', positionRelation: PositionRelation.SameColumn, effectValue: 0.04, desc: '同列技能触发时，自身永久 +4%' },
  ench_growth_sameHand:   { id: 'ench_growth_sameHand',   name: '渗透', icon: '🌱🤝', category: 'spatial', spatialType: 'growth', positionRelation: PositionRelation.SameHand,   effectValue: 0.01, desc: '同手技能触发时，自身永久 +1%' },
  ench_growth_sameFinger: { id: 'ench_growth_sameFinger', name: '贯通', icon: '🌱👆', category: 'spatial', spatialType: 'growth', positionRelation: PositionRelation.SameFinger, effectValue: 0.05, desc: '同指技能触发时，自身永久 +5%' },
  ench_growth_symmetric:  { id: 'ench_growth_symmetric',  name: '共振', icon: '🌱🪞', category: 'spatial', spatialType: 'growth', positionRelation: PositionRelation.Symmetric,  effectValue: 0.06, desc: '对称位技能触发时，自身永久 +6%' },

  // === 空间型 — 溅射（6 个）"我让邻居变强" ===
  ench_splash_adjacent:   { id: 'ench_splash_adjacent',   name: '波及', icon: '💫',    category: 'spatial', spatialType: 'splash', positionRelation: PositionRelation.Adjacent,   effectValue: 0.30, desc: '触发时，相邻技能各以自身 30% 效果额外触发一次' },
  ench_splash_sameRow:    { id: 'ench_splash_sameRow',    name: '横扫', icon: '💫📡', category: 'spatial', spatialType: 'splash', positionRelation: PositionRelation.SameRow,    effectValue: 0.20, desc: '触发时，同行技能各以自身 20% 效果额外触发一次' },
  ench_splash_sameColumn: { id: 'ench_splash_sameColumn', name: '穿刺', icon: '💫📌', category: 'spatial', spatialType: 'splash', positionRelation: PositionRelation.SameColumn, effectValue: 0.35, desc: '触发时，同列技能各以自身 35% 效果额外触发一次' },
  ench_splash_sameHand:   { id: 'ench_splash_sameHand',   name: '普照', icon: '💫🤝', category: 'spatial', spatialType: 'splash', positionRelation: PositionRelation.SameHand,   effectValue: 0.10, desc: '触发时，同手技能各以自身 10% 效果额外触发一次' },
  ench_splash_sameFinger: { id: 'ench_splash_sameFinger', name: '灌注', icon: '💫👆', category: 'spatial', spatialType: 'splash', positionRelation: PositionRelation.SameFinger, effectValue: 0.40, desc: '触发时，同指技能各以自身 40% 效果额外触发一次' },
  ench_splash_symmetric:  { id: 'ench_splash_symmetric',  name: '投影', icon: '💫🪞', category: 'spatial', spatialType: 'splash', positionRelation: PositionRelation.Symmetric,  effectValue: 0.50, desc: '触发时，对称位技能以自身 50% 效果额外触发一次' },

  // === 空间型 — 共鸣（6 个）"邻居带我白嫖" ===
  ench_resonance_adjacent:   { id: 'ench_resonance_adjacent',   name: '感应', icon: '🔔',    category: 'spatial', spatialType: 'resonance', positionRelation: PositionRelation.Adjacent,   effectValue: 0.50, desc: '相邻技能触发时，自身触发一次（50%效果）' },
  ench_resonance_sameRow:    { id: 'ench_resonance_sameRow',    name: '合唱', icon: '🔔📡', category: 'spatial', spatialType: 'resonance', positionRelation: PositionRelation.SameRow,    effectValue: 0.30, desc: '同行技能触发时，自身触发一次（30%效果）' },
  ench_resonance_sameColumn: { id: 'ench_resonance_sameColumn', name: '回声', icon: '🔔📌', category: 'spatial', spatialType: 'resonance', positionRelation: PositionRelation.SameColumn, effectValue: 0.40, desc: '同列技能触发时，自身触发一次（40%效果）' },
  ench_resonance_sameHand:   { id: 'ench_resonance_sameHand',   name: '同频', icon: '🔔🤝', category: 'spatial', spatialType: 'resonance', positionRelation: PositionRelation.SameHand,   effectValue: 0.15, desc: '同手技能触发时，自身触发一次（15%效果）' },
  ench_resonance_sameFinger: { id: 'ench_resonance_sameFinger', name: '连带', icon: '🔔👆', category: 'spatial', spatialType: 'resonance', positionRelation: PositionRelation.SameFinger, effectValue: 0.50, desc: '同指技能触发时，自身触发一次（50%效果）' },
  ench_resonance_symmetric:  { id: 'ench_resonance_symmetric',  name: '心电', icon: '🔔🪞', category: 'spatial', spatialType: 'resonance', positionRelation: PositionRelation.Symmetric,  effectValue: 0.60, desc: '对称位技能触发时，自身触发一次（60%效果）' },

  // === 空间型 — 排斥（6 个）"空位让我更强" ===
  ench_repulsion_adjacent:   { id: 'ench_repulsion_adjacent',   name: '虚无', icon: '🕳️',    category: 'spatial', spatialType: 'repulsion', positionRelation: PositionRelation.Adjacent,   effectValue: 0.25, desc: '相邻每个空位，自身 +25%' },
  ench_repulsion_sameRow:    { id: 'ench_repulsion_sameRow',    name: '荒原', icon: '🕳️📡', category: 'spatial', spatialType: 'repulsion', positionRelation: PositionRelation.SameRow,    effectValue: 0.10, desc: '同行每个空位，自身 +10%' },
  ench_repulsion_sameColumn: { id: 'ench_repulsion_sameColumn', name: '深渊', icon: '🕳️📌', category: 'spatial', spatialType: 'repulsion', positionRelation: PositionRelation.SameColumn, effectValue: 0.30, desc: '同列每个空位，自身 +30%' },
  ench_repulsion_sameHand:   { id: 'ench_repulsion_sameHand',   name: '寂灭', icon: '🕳️🤝', category: 'spatial', spatialType: 'repulsion', positionRelation: PositionRelation.SameHand,   effectValue: 0.05, desc: '同手每个空位，自身 +5%' },
  ench_repulsion_sameFinger: { id: 'ench_repulsion_sameFinger', name: '断指', icon: '🕳️👆', category: 'spatial', spatialType: 'repulsion', positionRelation: PositionRelation.SameFinger, effectValue: 0.35, desc: '同指每个空位，自身 +35%' },
  ench_repulsion_symmetric:  { id: 'ench_repulsion_symmetric',  name: '空镜', icon: '🕳️🪞', category: 'spatial', spatialType: 'repulsion', positionRelation: PositionRelation.Symmetric,  effectValue: 0.50, desc: '对称位为空时，自身 +50%' },

  // === 空间型 — 吞噬（6 个）"范围内弱技能被我吞噬" ===
  ench_devour_adjacent:   { id: 'ench_devour_adjacent',   name: '噬邻', icon: '🦷',    category: 'spatial', spatialType: 'devour', positionRelation: PositionRelation.Adjacent,   effectValue: 0.20, desc: '触发 N 次后吞噬相邻弱技能，每图标 +20%' },
  ench_devour_sameRow:    { id: 'ench_devour_sameRow',    name: '噬行', icon: '🦷📡', category: 'spatial', spatialType: 'devour', positionRelation: PositionRelation.SameRow,    effectValue: 0.20, desc: '触发 N 次后吞噬同行弱技能，每图标 +20%' },
  ench_devour_sameColumn: { id: 'ench_devour_sameColumn', name: '噬列', icon: '🦷📌', category: 'spatial', spatialType: 'devour', positionRelation: PositionRelation.SameColumn, effectValue: 0.20, desc: '触发 N 次后吞噬同列弱技能，每图标 +20%' },
  ench_devour_sameHand:   { id: 'ench_devour_sameHand',   name: '噬掌', icon: '🦷🤝', category: 'spatial', spatialType: 'devour', positionRelation: PositionRelation.SameHand,   effectValue: 0.20, desc: '触发 N 次后吞噬同手弱技能，每图标 +20%' },
  ench_devour_sameFinger: { id: 'ench_devour_sameFinger', name: '噬指', icon: '🦷👆', category: 'spatial', spatialType: 'devour', positionRelation: PositionRelation.SameFinger, effectValue: 0.20, desc: '触发 N 次后吞噬同指弱技能，每图标 +20%' },
  ench_devour_symmetric:  { id: 'ench_devour_symmetric',  name: '噬镜', icon: '🦷🪞', category: 'spatial', spatialType: 'devour', positionRelation: PositionRelation.Symmetric,  effectValue: 0.20, desc: '触发 N 次后吞噬对称位弱技能，每图标 +20%' },

  // === 变性型（5 个）"额外产出另一种资源" ===
  ench_trans_base:       { id: 'ench_trans_base',       name: '附力', icon: '⚔️✨', category: 'transmutation', effectValue: 0.30, extraResource: 'base',       desc: '触发时额外产出 30% 基数' },
  ench_trans_score:      { id: 'ench_trans_score',      name: '附金', icon: '🪙✨', category: 'transmutation', effectValue: 0.30, extraResource: 'score',      desc: '触发时额外产出 30% 分数' },
  ench_trans_multiplier: { id: 'ench_trans_multiplier', name: '附焰', icon: '🔥✨', category: 'transmutation', effectValue: 0.10, extraResource: 'multiplier', desc: '触发时额外产出 10% 倍率' },
  ench_trans_time:       { id: 'ench_trans_time',       name: '附时', icon: '⏳✨', category: 'transmutation', effectValue: 0.20, extraResource: 'time',       desc: '触发时额外产出 20% 时间' },
  ench_trans_shield:     { id: 'ench_trans_shield',     name: '附甲', icon: '🛡️✨', category: 'transmutation', effectValue: 0.15, extraResource: 'shield',     desc: '触发时额外产出 15% 护盾' },

  // === 独立型（1 个）"不依赖位置关系的成长" ===
  ench_mastery: { id: 'ench_mastery', name: '精通', icon: '📈', category: 'independent', effectValue: 0.08, desc: '每触发 10 次，自身永久 +8%' },
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
  const all = Object.values(ENCHANTMENTS)
    .filter(e => {
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
