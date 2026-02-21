import { describe, it, expect } from 'vitest';
import { SKILLS, getSkillSchool } from '../../../src/data/skills';

describe('Shop skill rendering integration', () => {
  it('getSkillSchool returns valid label for every SKILLS entry', () => {
    for (const id of Object.keys(SKILLS)) {
      const school = getSkillSchool(id);
      expect(school.label).not.toBe('未知');
    }
  });

  it('upgrade card label includes school and 升级 marker', () => {
    // Simulates what shop.ts does for upgrade cards
    const school = getSkillSchool('burst');
    const upgradeLabel = `${school.label}·升级`;
    expect(upgradeLabel).toBe('爆发·升级');
    expect(upgradeLabel).toContain('升级');
  });

  it('new skill card label is just the school label', () => {
    const school = getSkillSchool('freeze');
    expect(school.label).toBe('续航');
  });

  it('each school has a distinct cssClass', () => {
    const classSet = new Set<string>();
    for (const id of Object.keys(SKILLS)) {
      classSet.add(getSkillSchool(id).cssClass);
    }
    expect(classSet.size).toBe(5);
  });
});
