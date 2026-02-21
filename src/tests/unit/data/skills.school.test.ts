import { describe, it, expect } from 'vitest';
import { SKILLS, SKILL_SCHOOL, getSkillSchool } from '../../../src/data/skills';

describe('SKILL_SCHOOL mapping', () => {
  it('covers all 18 skills in SKILLS', () => {
    const skillIds = Object.keys(SKILLS);
    expect(skillIds.length).toBe(18);
    for (const id of skillIds) {
      expect(SKILL_SCHOOL[id]).toBeDefined();
      expect(SKILL_SCHOOL[id].label).toBeTruthy();
      expect(SKILL_SCHOOL[id].cssClass).toBeTruthy();
    }
  });

  it('has no extra entries beyond SKILLS', () => {
    const schoolIds = Object.keys(SKILL_SCHOOL);
    const skillIds = Object.keys(SKILLS);
    for (const id of schoolIds) {
      expect(skillIds).toContain(id);
    }
  });

  it('maps burst school correctly', () => {
    for (const id of ['burst', 'lone', 'void', 'gamble']) {
      expect(SKILL_SCHOOL[id].label).toBe('爆发');
      expect(SKILL_SCHOOL[id].cssClass).toBe('school-burst');
    }
  });

  it('maps multiply school correctly', () => {
    for (const id of ['amp', 'chain', 'overclock']) {
      expect(SKILL_SCHOOL[id].label).toBe('倍率');
      expect(SKILL_SCHOOL[id].cssClass).toBe('school-multiply');
    }
  });

  it('maps sustain school correctly', () => {
    for (const id of ['freeze', 'shield', 'pulse', 'sentinel']) {
      expect(SKILL_SCHOOL[id].label).toBe('续航');
      expect(SKILL_SCHOOL[id].cssClass).toBe('school-sustain');
    }
  });

  it('maps chain school correctly', () => {
    for (const id of ['echo', 'ripple', 'mirror', 'leech']) {
      expect(SKILL_SCHOOL[id].label).toBe('连锁');
      expect(SKILL_SCHOOL[id].cssClass).toBe('school-chain');
    }
  });

  it('maps passive school correctly', () => {
    for (const id of ['core', 'aura', 'anchor']) {
      expect(SKILL_SCHOOL[id].label).toBe('被动');
      expect(SKILL_SCHOOL[id].cssClass).toBe('school-passive');
    }
  });
});

describe('getSkillSchool', () => {
  it('returns correct school for known skill', () => {
    const school = getSkillSchool('burst');
    expect(school.label).toBe('爆发');
    expect(school.cssClass).toBe('school-burst');
  });

  it('returns fallback for unknown skill', () => {
    const school = getSkillSchool('nonexistent');
    expect(school.label).toBe('未知');
    expect(school.cssClass).toBe('school-unknown');
  });
});
