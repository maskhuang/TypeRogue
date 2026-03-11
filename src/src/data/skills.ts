// ============================================
// 打字肉鸽 - 技能数据（新系统：产出者/转化者/连接者/增幅者）
// ============================================
// Story 19.10: 旧 18 技能系统已移除，仅保留流派映射和显示查询

import { PRODUCERS, getProducerDesc } from './producers';
import { CONVERTERS, getConverterDesc } from './converters';
import { CONNECTORS, REPLICATORS, getConnectorDesc, getReplicatorDesc } from './connectors';
import { AMPLIFIERS, getAmplifierDesc } from './amplifiers';
import { ENCHANTMENTS } from './enchantments';
import { RESOURCE_LABELS, RESOURCE_ICONS } from '../core/constants';
import { t, localizeItemName, localizeItemDesc } from '../demo/demo-i18n';

// === 已删除旧技能 ID 列表（存档兼容用）===
export const DELETED_SKILL_IDS = [
  'burst', 'amp', 'freeze', 'shield', 'echo', 'ripple',
  'core', 'aura', 'lone', 'void', 'gamble', 'chain',
  'overclock', 'pulse', 'sentinel', 'mirror', 'leech', 'anchor',
  // 旧增幅者 ID（7个 add/multiply 版 → 30个统一百分比版）
  'amp_base_add_adjacent', 'amp_mult_add_adjacent', 'amp_score_add_sameColumn',
  'amp_time_add_adjacent', 'amp_base_mul_adjacent', 'amp_mult_mul_sameRow',
  'amp_score_mul_sameHand',
  // 旧乘算产出者（Story 34.2: 乘算移入附魔系统）
  'prod_focus', 'prod_crit', 'prod_frenzy', 'prod_eternal',
  'prod_treasury', 'prod_refine', 'prod_mutagen_surge',
];

// === 已删除进化分支 ID 列表（存档兼容用）===
export const DELETED_EVOLUTION_IDS = [
  'burst_inferno', 'burst_precision', 'amp_crescendo', 'amp_overdrive',
  'echo_resonance', 'echo_phantom', 'freeze_permafrost', 'freeze_chrono',
  'lone_hermit', 'lone_shadow', 'core_nexus', 'core_fusion',
];

// === 技能流派映射 ===
export interface SkillSchool {
  label: string;
  cssClass: string;
}

export function getSkillSchool(skillId: string): SkillSchool {
  if (skillId in PRODUCERS) return { label: t('school.producer'), cssClass: 'school-producer' };
  if (skillId in CONVERTERS) return { label: t('school.converter'), cssClass: 'school-converter' };
  if (skillId in CONNECTORS) return { label: t('school.connector'), cssClass: 'school-connector' };
  if (skillId in REPLICATORS) return { label: t('school.replicator'), cssClass: 'school-replicator' };
  if (skillId in AMPLIFIERS) return { label: t('school.amplifier'), cssClass: 'school-amplifier' };
  return { label: t('school.unknown'), cssClass: 'school-unknown' };
}

/**
 * 获取技能显示信息（产出者/转化者/连接者 + 附魔）
 */
export function getSkillDisplayInfo(
  skillId: string,
  level?: number,
  enchantedSkills?: Map<string, string>,
): { name: string; icon: string; desc: string } {
  // 附魔后缀
  let enchSuffix = '';
  let enchIcon = '';
  if (enchantedSkills) {
    const enchId = enchantedSkills.get(skillId);
    if (enchId && ENCHANTMENTS[enchId]) {
      const ench = ENCHANTMENTS[enchId];
      enchSuffix = ` [${ench.icon}${localizeItemName(enchId, ench.name)}]`;
      enchIcon = ench.icon;
    }
  }

  // 产出者查询（level 决定动态描述）
  const prod = PRODUCERS[skillId];
  if (prod) {
    const name = localizeItemName(skillId, prod.name);
    const isMultEnch = enchantedSkills?.get(skillId) === 'ench_multiply';
    let multiplyOverride: { operator: 'multiply'; value: number } | undefined;
    if (isMultEnch) {
      const mv = ENCHANTMENTS['ench_multiply']?.multiplyValues;
      if (mv && mv[prod.resource] && level) {
        multiplyOverride = { operator: 'multiply', value: mv[prod.resource][level - 1] };
      }
    }
    const desc = localizeItemDesc(skillId, level ? getProducerDesc(skillId, level, multiplyOverride) : prod.desc);
    return { name: name + enchSuffix, icon: isMultEnch ? '✖️' : (enchIcon || prod.icon), desc: desc + (enchSuffix ? t('skill.enchant_suffix', { suffix: enchSuffix }) : '') };
  }
  // 转化者查询
  const conv = CONVERTERS[skillId];
  if (conv) {
    const name = localizeItemName(skillId, conv.name);
    const desc = localizeItemDesc(skillId, level ? getConverterDesc(skillId, level) : conv.desc);
    return { name: name + enchSuffix, icon: enchIcon || conv.icon, desc: desc + (enchSuffix ? t('skill.enchant_suffix', { suffix: enchSuffix }) : '') };
  }
  // 连接者查询（固定 Lv1，无等级变化）
  const conn = CONNECTORS[skillId];
  if (conn) {
    return { name: localizeItemName(skillId, conn.name), icon: conn.icon, desc: getConnectorDesc(skillId) };
  }
  // 复制者查询（固定 Lv1，无等级变化）
  const rep = REPLICATORS[skillId];
  if (rep) {
    return { name: localizeItemName(skillId, rep.name), icon: rep.icon, desc: getReplicatorDesc(skillId) };
  }
  // 增幅者查询
  const amp = AMPLIFIERS[skillId];
  if (amp) {
    const name = localizeItemName(skillId, amp.name);
    const desc = level ? getAmplifierDesc(skillId, level) : amp.desc;
    // 变性附魔：显示双资源增幅说明
    let enchDesc = enchSuffix ? t('skill.enchant_suffix', { suffix: enchSuffix }) : '';
    if (enchantedSkills) {
      const enchId = enchantedSkills.get(skillId);
      if (enchId) {
        const ench = ENCHANTMENTS[enchId];
        if (ench?.category === 'transmutation' && ench.extraResource) {
          const extraIcon = RESOURCE_ICONS[ench.extraResource] || '';
          const extraLabel = t(`resource.${ench.extraResource}`);
          const pct = Math.round(ench.effectValue * 100);
          enchDesc = t('skill.amp_dual', { icon: ench.icon, name: localizeItemName(enchId, ench.name), extraIcon, extraLabel, pct });
        }
      }
    }
    return { name: name + enchSuffix, icon: enchIcon || amp.icon, desc: desc + enchDesc };
  }
  return { name: '???', icon: '?', desc: '' };
}
