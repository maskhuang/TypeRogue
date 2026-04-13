/**
 * skills JSON schema — 存档迁移用的已删除技能 ID 列表
 *
 * Epic 11 已删除旧的 5 类技能系统，本文件只剩 DELETED_SKILL_IDS /
 * DELETED_EVOLUTION_IDS 用于 RunState.deserialize 过滤老存档。
 */

import { z } from 'zod';
import skillsJson from '../../../data-json/skills.json' with { type: 'json' };

export const skillsSchema = z.object({
  deletedSkillIds: z.array(z.string()),
  deletedEvolutionIds: z.array(z.string()),
});

export type SkillsData = z.infer<typeof skillsSchema>;

function loadSkills(): SkillsData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isDev = (import.meta as any).env?.DEV !== false;
  if (isDev) {
    return skillsSchema.parse(skillsJson);
  }
  return skillsJson as SkillsData;
}

export const SKILLS_DATA: SkillsData = loadSkills();
