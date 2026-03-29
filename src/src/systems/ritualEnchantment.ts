// ============================================
// 打字肉鸽 - 仪式附魔系统 (Story 41.1)
// ============================================
// 附魔获取三渠道之一：Act 2 固定仪式

import { state } from '../core/state';
import { random } from '../core/seededRandom';
import type { AffixSkillInstance } from '../data/affixes';
import type { AffixType } from '../data/affixes';
import { EnchantmentType as EnchantmentTypeEnum } from '../data/affixes';
import { PositionRelation } from '../data/keyboardTopology';
import {
  categorizeEnchantmentCandidates,
  getEnchantmentSlotCount,
  getTransmuteEligibleResources,
} from '../data/affixTrigger';
import {
  filterCategorizedByClass,
} from '../data/affixes';
import {
  getEnchantmentChoiceCount,
  getEnchantAnchorSlotBonus,
} from './relics/EnchantmentRelicBehaviors';
import { resolveRelicEffectsWithBehaviors } from './relics/RelicPipeline';
import { getEnchantmentDisplayInfo } from './shop';
import { hasUnownedRelics, showRelicPicker } from './relicPicker';
import { playSound } from '../effects/sound';
import { eventBus } from '../core/events/EventBus';

// === 核心接口 ===

export interface RitualCandidate {
  enchType: EnchantmentTypeEnum;
  transmuteRes?: import('../core/types').ResourceType;
  neighborRel?: PositionRelation;
}

export interface EligibleSkill {
  skillId: string;
  affixSkill: AffixSkillInstance;
  emptySlots: number;
}

/** 收集场上所有技能已装备的词条类型 */
function collectEquippedAffixTypes(): Set<AffixType> {
  const types = new Set<AffixType>();
  for (const [, skill] of state.affixSkills) {
    for (const affix of skill.affixes) {
      types.add(affix.type);
    }
  }
  return types;
}

// === 查询函数（导出供测试） ===

/** 获取所有可接受附魔的技能 */
export function getEligibleSkills(): EligibleSkill[] {
  const result: EligibleSkill[] = [];
  const anchorBonus = getEnchantAnchorSlotBonus();
  for (const [skillId, affixSkill] of state.affixSkills) {
    const slotCount = getEnchantmentSlotCount(affixSkill, anchorBonus);
    const emptySlots = slotCount - affixSkill.enchantmentIds.length;
    if (emptySlots > 0) {
      result.push({ skillId, affixSkill, emptySlots });
    }
  }
  return result;
}

/** 生成附魔候选列表（复用现有 categorize 逻辑） */
export function generateRitualCandidates(affixSkill: AffixSkillInstance): RitualCandidate[] {
  const playerClass = state.classId !== 'none' ? state.classId : undefined;
  const categorized = filterCategorizedByClass(
    categorizeEnchantmentCandidates(affixSkill, collectEquippedAffixTypes()),
    playerClass,
  );

  const ALL_POS_RELS = Object.values(PositionRelation);
  const expanded: RitualCandidate[] = [];

  const allTypes = [...categorized.apprentice, ...categorized.quest, ...categorized.transmute, ...categorized.operator];
  for (const enchType of allTypes) {
    if ((enchType as string) === 'transmute') {
      const eligible = getTransmuteEligibleResources(affixSkill.resource, playerClass);
      if (eligible.length > 0) {
        const res = eligible[Math.floor(random() * eligible.length)];
        expanded.push({ enchType, transmuteRes: res });
      }
    } else if (enchType === EnchantmentTypeEnum.ApprenticeNeighbor) {
      const rel = affixSkill.neighborPosRel ?? ALL_POS_RELS[Math.floor(random() * ALL_POS_RELS.length)];
      expanded.push({ enchType, neighborRel: rel });
    } else {
      expanded.push({ enchType });
    }
  }

  return expanded;
}

/** 从候选中随机抽取 N 个（命运分叉遗物影响数量） */
export function pickRitualChoices(candidates: RitualCandidate[]): RitualCandidate[] {
  const maxChoices = getEnchantmentChoiceCount(); // 2, or 3 with fate_fork
  if (candidates.length <= maxChoices) return [...candidates];

  const picked: RitualCandidate[] = [];
  const pool = [...candidates];
  while (picked.length < maxChoices && pool.length > 0) {
    const idx = Math.floor(random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

/** 将附魔写入技能 */
export function applyRitualEnchantment(
  skillId: string,
  affixSkill: AffixSkillInstance,
  candidate: RitualCandidate,
): void {
  affixSkill.enchantmentIds.push(candidate.enchType);

  // Transmute：分配目标资源
  if ((candidate.enchType as string) === 'transmute' && candidate.transmuteRes) {
    affixSkill.transmuteResource = candidate.transmuteRes;
  }

  // ApprenticeNeighbor：分配位置关系
  if (candidate.enchType === EnchantmentTypeEnum.ApprenticeNeighbor && candidate.neighborRel) {
    affixSkill.neighborPosRel = candidate.neighborRel;
  }

  // 触发遗物行为
  resolveRelicEffectsWithBehaviors('on_enchantment_acquire', {
    enchantedSkillId: skillId,
    enchantmentId: candidate.enchType,
  });

  playSound('buy');

  const info = getEnchantmentDisplayInfo(candidate.enchType, candidate.transmuteRes, candidate.neighborRel);
  if (info) {
    eventBus.emit('ritual:enchantment_applied', {
      skillId,
      enchantmentType: candidate.enchType,
      icon: info.icon,
      name: info.name,
    });
  }
}

/** 仪式节点是否应显示（有未拥有遗物时触发） */
export function shouldShowRitual(): boolean {
  return hasUnownedRelics();
}

// === 仪式入口：三选一传说遗物 ===

/**
 * 打开仪式界面 — 展示三选一传说遗物
 * @param onComplete 仪式结束后的回调（推进到下一关）
 */
export function openRitualEnchantment(onComplete: () => void): void {
  state.phase = 'ritual';
  showRelicPicker(onComplete, { common: 0, rare: 0, epic: 0, legendary: 100 });
}
