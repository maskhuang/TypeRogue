// ============================================
// 打字肉鸽 - 技能数据（词条制系统）
// ============================================
// Epic 35 清理：旧系统（产出者/转化者/连接者/增幅者/附魔）已完全移除
// Story 57.1: DELETED_SKILL_IDS / DELETED_EVOLUTION_IDS 迁至 data-json/skills.json

import { t } from '../demo/demo-i18n';
import { SKILLS_DATA } from './schemas/skills.schema';

// === 已删除旧技能 ID 列表（存档兼容用）===
export const DELETED_SKILL_IDS = SKILLS_DATA.deletedSkillIds;

// === 已删除进化分支 ID 列表（存档兼容用）===
export const DELETED_EVOLUTION_IDS = SKILLS_DATA.deletedEvolutionIds;

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
