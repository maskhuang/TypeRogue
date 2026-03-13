// ============================================
// 打字肉鸽 - 技能数据（词条制系统）
// ============================================
// Epic 35 清理：旧系统（产出者/转化者/连接者/增幅者/附魔）已完全移除

import { t } from '../demo/demo-i18n';

// === 已删除旧技能 ID 列表（存档兼容用）===
export const DELETED_SKILL_IDS = [
  // 最早期 18 技能
  'burst', 'amp', 'freeze', 'shield', 'echo', 'ripple',
  'core', 'aura', 'lone', 'void', 'gamble', 'chain',
  'overclock', 'pulse', 'sentinel', 'mirror', 'leech', 'anchor',
  // 旧增幅者 ID（7个 add/multiply 版）
  'amp_base_add_adjacent', 'amp_mult_add_adjacent', 'amp_score_add_sameColumn',
  'amp_time_add_adjacent', 'amp_base_mul_adjacent', 'amp_mult_mul_sameRow',
  'amp_score_mul_sameHand',
  // 旧乘算产出者（Story 34.2）
  'prod_focus', 'prod_crit', 'prod_frenzy', 'prod_eternal',
  'prod_treasury', 'prod_refine', 'prod_mutagen_surge',
  // 旧乘算转化者（Story 34.3）
  'conv_base_score_mul', 'conv_base_mult_mul', 'conv_base_time_mul',
  'conv_base_fragment_mul', 'conv_base_mutagen_mul',
  'conv_score_base_mul', 'conv_score_mult_mul', 'conv_score_time_mul',
  'conv_score_fragment_mul', 'conv_score_mutagen_mul',
  'conv_mult_base_mul', 'conv_mult_score_mul', 'conv_mult_time_mul',
  'conv_mult_fragment_mul', 'conv_mult_mutagen_mul',
  'conv_time_base_mul', 'conv_time_score_mul', 'conv_time_mult_mul',
  'conv_time_fragment_mul', 'conv_time_mutagen_mul',
  'conv_gold_base_mul', 'conv_gold_score_mul', 'conv_gold_mult_mul',
  'conv_gold_time_mul', 'conv_gold_fragment_mul', 'conv_gold_mutagen_mul',
  'conv_fragment_base_mul', 'conv_fragment_score_mul', 'conv_fragment_mult_mul',
  'conv_fragment_time_mul', 'conv_fragment_gold_mul',
  'conv_mutagen_score_mul', 'conv_mutagen_base_mul', 'conv_mutagen_mult_mul',
  'conv_mutagen_time_mul', 'conv_mutagen_gold_mul',
  // === Epic 35 清理：旧产出者/转化者/连接者/复制者/增幅者全部 ID ===
  // 产出者（77 个）
  'prod_burst', 'prod_loot', 'prod_boost', 'prod_freeze', 'prod_mint', 'prod_harvest', 'prod_mutagen_drip',
  'prod_charge_base', 'prod_charge_score', 'prod_charge_multiplier', 'prod_charge_time', 'prod_charge_gold', 'prod_charge_fragment', 'prod_charge_mutagen',
  'prod_decay_base', 'prod_decay_score', 'prod_decay_multiplier', 'prod_decay_time', 'prod_decay_gold', 'prod_decay_fragment', 'prod_decay_mutagen',
  'prod_pulse_base', 'prod_pulse_score', 'prod_pulse_multiplier', 'prod_pulse_time', 'prod_pulse_gold', 'prod_pulse_fragment', 'prod_pulse_mutagen',
  'prod_crit_base', 'prod_crit_score', 'prod_crit_multiplier', 'prod_crit_time', 'prod_crit_gold', 'prod_crit_fragment', 'prod_crit_mutagen',
  'prod_void_base_adjacent', 'prod_void_base_same_row', 'prod_void_base_same_column', 'prod_void_base_same_hand', 'prod_void_base_same_finger', 'prod_void_base_symmetric',
  'prod_void_score_adjacent', 'prod_void_score_same_row', 'prod_void_score_same_column', 'prod_void_score_same_hand', 'prod_void_score_same_finger', 'prod_void_score_symmetric',
  'prod_void_multiplier_adjacent', 'prod_void_multiplier_same_row', 'prod_void_multiplier_same_column', 'prod_void_multiplier_same_hand', 'prod_void_multiplier_same_finger', 'prod_void_multiplier_symmetric',
  'prod_void_time_adjacent', 'prod_void_time_same_row', 'prod_void_time_same_column', 'prod_void_time_same_hand', 'prod_void_time_same_finger', 'prod_void_time_symmetric',
  'prod_void_gold_adjacent', 'prod_void_gold_same_row', 'prod_void_gold_same_column', 'prod_void_gold_same_hand', 'prod_void_gold_same_finger', 'prod_void_gold_symmetric',
  'prod_void_fragment_adjacent', 'prod_void_fragment_same_row', 'prod_void_fragment_same_column', 'prod_void_fragment_same_hand', 'prod_void_fragment_same_finger', 'prod_void_fragment_symmetric',
  'prod_void_mutagen_adjacent', 'prod_void_mutagen_same_row', 'prod_void_mutagen_same_column', 'prod_void_mutagen_same_hand', 'prod_void_mutagen_same_finger', 'prod_void_mutagen_symmetric',
  // 转化者（45 个）
  'conv_base_score_add', 'conv_base_mult_add', 'conv_base_time_add',
  'conv_score_base_add', 'conv_score_mult_add', 'conv_score_time_add', 'conv_score_gold_add',
  'conv_mult_base_add', 'conv_mult_score_add', 'conv_mult_time_add',
  'conv_time_base_add', 'conv_time_score_add', 'conv_time_mult_add', 'conv_time_gold_add',
  'conv_gold_base_add', 'conv_gold_score_add', 'conv_gold_mult_add', 'conv_gold_time_add',
  'conv_fragment_base_add', 'conv_fragment_score_add', 'conv_fragment_mult_add', 'conv_fragment_time_add', 'conv_fragment_gold_add',
  'conv_base_fragment_add', 'conv_score_fragment_add', 'conv_mult_fragment_add', 'conv_time_fragment_add', 'conv_gold_fragment_add',
  'conv_mutagen_score_add', 'conv_mutagen_base_add', 'conv_mutagen_mult_add', 'conv_mutagen_time_add', 'conv_mutagen_gold_add',
  'conv_base_mutagen_add', 'conv_score_mutagen_add', 'conv_mult_mutagen_add', 'conv_time_mutagen_add', 'conv_gold_mutagen_add',
  'conv_base_base_add', 'conv_score_score_add', 'conv_mult_mult_add', 'conv_time_time_add', 'conv_gold_gold_add', 'conv_fragment_fragment_add', 'conv_mutagen_mutagen_add',
  // 连接者（25 个）
  'conn_base_adjacent', 'conn_base_sameRow', 'conn_base_sameColumn', 'conn_base_sameHand', 'conn_base_sameFinger',
  'conn_score_adjacent', 'conn_score_sameRow', 'conn_score_sameColumn', 'conn_score_sameHand', 'conn_score_sameFinger',
  'conn_multiplier_adjacent', 'conn_multiplier_sameRow', 'conn_multiplier_sameColumn', 'conn_multiplier_sameHand', 'conn_multiplier_sameFinger',
  'conn_time_adjacent', 'conn_time_sameRow', 'conn_time_sameColumn', 'conn_time_sameHand', 'conn_time_sameFinger',
  'conn_gold_adjacent', 'conn_gold_sameRow', 'conn_gold_sameColumn', 'conn_gold_sameHand', 'conn_gold_sameFinger',
  // 复制者（6 个）
  'conn_copy_adjacent', 'conn_copy_sameRow', 'conn_copy_sameColumn', 'conn_copy_sameHand', 'conn_copy_sameFinger', 'conn_copy_symmetric',
  // 增幅者（36 个）
  'amp_base_adjacent', 'amp_base_sameRow', 'amp_base_sameColumn', 'amp_base_sameHand', 'amp_base_sameFinger', 'amp_base_symmetric',
  'amp_score_adjacent', 'amp_score_sameRow', 'amp_score_sameColumn', 'amp_score_sameHand', 'amp_score_sameFinger', 'amp_score_symmetric',
  'amp_mult_adjacent', 'amp_mult_sameRow', 'amp_mult_sameColumn', 'amp_mult_sameHand', 'amp_mult_sameFinger', 'amp_mult_symmetric',
  'amp_time_adjacent', 'amp_time_sameRow', 'amp_time_sameColumn', 'amp_time_sameHand', 'amp_time_sameFinger', 'amp_time_symmetric',
  'amp_gold_adjacent', 'amp_gold_sameRow', 'amp_gold_sameColumn', 'amp_gold_sameHand', 'amp_gold_sameFinger', 'amp_gold_symmetric',
  'amp_mutagen_adjacent', 'amp_mutagen_sameRow', 'amp_mutagen_sameColumn', 'amp_mutagen_sameHand', 'amp_mutagen_sameFinger', 'amp_mutagen_symmetric',
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

export function getSkillSchool(_skillId: string): SkillSchool {
  return { label: t('school.unknown'), cssClass: 'school-unknown' };
}

/**
 * 获取技能显示信息（词条制技能由调用方直接从 affixSkills 读取）
 * 保留接口签名供向后兼容，返回占位信息
 */
export function getSkillDisplayInfo(
  _skillId: string,
  _level?: number,
): { name: string; icon: string; desc: string } {
  return { name: '???', icon: '?', desc: '' };
}
