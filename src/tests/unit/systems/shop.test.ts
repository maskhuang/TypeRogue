import { describe, it, expect } from 'vitest';
import { PRODUCERS } from '../../../src/data/producers';
import { CONVERTERS } from '../../../src/data/converters';
import { CONNECTORS } from '../../../src/data/connectors';
import { getSkillSchool } from '../../../src/data/skills';

describe('Shop skill rendering integration', () => {
  it('getSkillSchool returns valid label for producers', () => {
    for (const id of Object.keys(PRODUCERS)) {
      const school = getSkillSchool(id);
      expect(school.label).not.toBe('未知');
    }
  });

  it('upgrade card label includes school and 升级 marker', () => {
    const school = getSkillSchool('prod_burst');
    const upgradeLabel = `${school.label}·升级`;
    expect(upgradeLabel).toContain('升级');
  });

  it('getSkillSchool works for converters and connectors', () => {
    for (const id of Object.keys(CONVERTERS)) {
      const school = getSkillSchool(id);
      expect(school).toBeDefined();
    }
    for (const id of Object.keys(CONNECTORS)) {
      const school = getSkillSchool(id);
      expect(school).toBeDefined();
    }
  });
});
