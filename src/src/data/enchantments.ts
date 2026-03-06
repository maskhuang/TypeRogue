// ============================================
// 打字肉鸽 - 附魔数据
// ============================================
// Story 19.6: 29 个附魔（24 空间型 + 5 变性型）

import type { EnchantmentDefinition } from '../core/types';
import { PositionRelation } from './keyboardTopology';

// === 29 个附魔数据 ===
export const ENCHANTMENTS: Record<string, EnchantmentDefinition> = {
  // === 空间型 — 增幅（6 个）"我因邻居变强" ===
  ench_amplify_adjacent:   { id: 'ench_amplify_adjacent',   name: '吸附', icon: '🧲',    category: 'spatial', spatialType: 'amplify', positionRelation: PositionRelation.Adjacent,   effectValue: 0.20, desc: '相邻每有一个技能，自身 +20%' },
  ench_amplify_sameRow:    { id: 'ench_amplify_sameRow',    name: '列阵', icon: '🧲📡', category: 'spatial', spatialType: 'amplify', positionRelation: PositionRelation.SameRow,    effectValue: 0.15, desc: '同行每有一个技能，自身 +15%' },
  ench_amplify_sameColumn: { id: 'ench_amplify_sameColumn', name: '立柱', icon: '🧲📌', category: 'spatial', spatialType: 'amplify', positionRelation: PositionRelation.SameColumn, effectValue: 0.25, desc: '同列每有一个技能，自身 +25%' },
  ench_amplify_sameHand:   { id: 'ench_amplify_sameHand',   name: '握拳', icon: '🧲🤝', category: 'spatial', spatialType: 'amplify', positionRelation: PositionRelation.SameHand,   effectValue: 0.08, desc: '同手每有一个技能，自身 +8%' },
  ench_amplify_sameFinger: { id: 'ench_amplify_sameFinger', name: '聚指', icon: '🧲👆', category: 'spatial', spatialType: 'amplify', positionRelation: PositionRelation.SameFinger, effectValue: 0.30, desc: '同指每有一个技能，自身 +30%' },
  ench_amplify_symmetric:  { id: 'ench_amplify_symmetric',  name: '引力', icon: '🧲🪞', category: 'spatial', spatialType: 'amplify', positionRelation: PositionRelation.Symmetric,  effectValue: 0.40, desc: '对称位有技能时，自身 +40%' },

  // === 空间型 — 溅射（6 个）"我让邻居变强" ===
  ench_splash_adjacent:   { id: 'ench_splash_adjacent',   name: '波及', icon: '💫',    category: 'spatial', spatialType: 'splash', positionRelation: PositionRelation.Adjacent,   effectValue: 0.30, desc: '触发时相邻技能获得本次效果 30%' },
  ench_splash_sameRow:    { id: 'ench_splash_sameRow',    name: '横扫', icon: '💫📡', category: 'spatial', spatialType: 'splash', positionRelation: PositionRelation.SameRow,    effectValue: 0.20, desc: '触发时同行技能获得本次效果 20%' },
  ench_splash_sameColumn: { id: 'ench_splash_sameColumn', name: '穿刺', icon: '💫📌', category: 'spatial', spatialType: 'splash', positionRelation: PositionRelation.SameColumn, effectValue: 0.35, desc: '触发时同列技能获得本次效果 35%' },
  ench_splash_sameHand:   { id: 'ench_splash_sameHand',   name: '普照', icon: '💫🤝', category: 'spatial', spatialType: 'splash', positionRelation: PositionRelation.SameHand,   effectValue: 0.10, desc: '触发时同手技能获得本次效果 10%' },
  ench_splash_sameFinger: { id: 'ench_splash_sameFinger', name: '灌注', icon: '💫👆', category: 'spatial', spatialType: 'splash', positionRelation: PositionRelation.SameFinger, effectValue: 0.40, desc: '触发时同指技能获得本次效果 40%' },
  ench_splash_symmetric:  { id: 'ench_splash_symmetric',  name: '投影', icon: '💫🪞', category: 'spatial', spatialType: 'splash', positionRelation: PositionRelation.Symmetric,  effectValue: 0.50, desc: '触发时对称位技能获得本次效果 50%' },

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

  // === 变性型（5 个）"额外产出另一种资源" ===
  ench_trans_base:       { id: 'ench_trans_base',       name: '附力', icon: '⚔️✨', category: 'transmutation', effectValue: 0.30, extraResource: 'base',       desc: '触发时额外产出 30% 基数' },
  ench_trans_score:      { id: 'ench_trans_score',      name: '附金', icon: '🪙✨', category: 'transmutation', effectValue: 0.30, extraResource: 'score',      desc: '触发时额外产出 30% 分数' },
  ench_trans_multiplier: { id: 'ench_trans_multiplier', name: '附焰', icon: '🔥✨', category: 'transmutation', effectValue: 0.10, extraResource: 'multiplier', desc: '触发时额外产出 10% 倍率' },
  ench_trans_time:       { id: 'ench_trans_time',       name: '附时', icon: '⏳✨', category: 'transmutation', effectValue: 0.20, extraResource: 'time',       desc: '触发时额外产出 20% 时间' },
  ench_trans_shield:     { id: 'ench_trans_shield',     name: '附甲', icon: '🛡️✨', category: 'transmutation', effectValue: 0.15, extraResource: 'shield',     desc: '触发时额外产出 15% 护盾' },

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

/** 从附魔池随机抽 2 个不重复的附魔 ID */
export function drawEnchantmentPair(): [string, string] {
  const all = Object.keys(ENCHANTMENTS);
  const i = Math.floor(Math.random() * all.length);
  let j = Math.floor(Math.random() * (all.length - 1));
  if (j >= i) j++;
  return [all[i], all[j]];
}
