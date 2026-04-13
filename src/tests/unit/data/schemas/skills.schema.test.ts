/**
 * skills schema 测试 — 存档迁移 ID 列表
 */

import { describe, it, expect } from 'vitest';
import { skillsSchema, SKILLS_DATA } from '../../../../src/data/schemas/skills.schema';
import { DELETED_SKILL_IDS, DELETED_EVOLUTION_IDS } from '../../../../src/data/skills';

describe('skills schema', () => {
  it('schema parse 通过', () => {
    expect(() => skillsSchema.parse(SKILLS_DATA)).not.toThrow();
  });

  it('DELETED_SKILL_IDS 非空', () => {
    expect(DELETED_SKILL_IDS.length).toBeGreaterThan(0);
  });

  it('DELETED_SKILL_IDS 无重复', () => {
    expect(new Set(DELETED_SKILL_IDS).size).toBe(DELETED_SKILL_IDS.length);
  });

  it('包含早期 18 技能的已知 ID', () => {
    for (const id of ['burst', 'amp', 'freeze', 'shield', 'echo', 'ripple']) {
      expect(DELETED_SKILL_IDS, `missing ${id}`).toContain(id);
    }
  });

  it('DELETED_EVOLUTION_IDS 非空且无重复', () => {
    expect(DELETED_EVOLUTION_IDS.length).toBeGreaterThan(0);
    expect(new Set(DELETED_EVOLUTION_IDS).size).toBe(DELETED_EVOLUTION_IDS.length);
  });
});
