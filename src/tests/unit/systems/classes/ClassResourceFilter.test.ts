// ============================================
// 职业资源条件过滤 — 单元测试
// Story 32.2 Task 8: ClassResourceFilter
// ============================================

import { describe, it, expect } from 'vitest';
import {
  isResourceActiveForClass,
  isClassResource,
  filterSkillPoolByClass,
  filterSkillIdsByClass,
} from '../../../../src/systems/classes/ClassResourceFilter';

describe('isResourceActiveForClass', () => {
  it('通用资源对任何职业激活', () => {
    for (const res of ['base', 'score', 'multiplier', 'time', 'gold'] as const) {
      expect(isResourceActiveForClass(res, 'none')).toBe(true);
      expect(isResourceActiveForClass(res, 'wordsmith')).toBe(true);
      expect(isResourceActiveForClass(res, 'metamorph')).toBe(true);
    }
  });

  it('fragment 仅对 wordsmith 激活', () => {
    expect(isResourceActiveForClass('fragment', 'wordsmith')).toBe(true);
    expect(isResourceActiveForClass('fragment', 'metamorph')).toBe(false);
    expect(isResourceActiveForClass('fragment', 'none')).toBe(false);
  });

  it('mutagen 仅对 metamorph 激活', () => {
    expect(isResourceActiveForClass('mutagen', 'metamorph')).toBe(true);
    expect(isResourceActiveForClass('mutagen', 'wordsmith')).toBe(false);
    expect(isResourceActiveForClass('mutagen', 'none')).toBe(false);
  });
});

describe('isClassResource', () => {
  it('fragment/mutagen 是职业资源', () => {
    expect(isClassResource('fragment')).toBe(true);
    expect(isClassResource('mutagen')).toBe(true);
  });

  it('通用资源不是职业资源', () => {
    expect(isClassResource('base')).toBe(false);
    expect(isClassResource('score')).toBe(false);
    expect(isClassResource('gold')).toBe(false);
  });
});

describe('filterSkillPoolByClass', () => {
  const pool = [
    { resource: 'base' as const },
    { resource: 'fragment' as const },
    { resource: 'mutagen' as const },
    { resource: 'gold' as const },
  ];

  it('wordsmith 保留 base/fragment/gold，移除 mutagen', () => {
    const result = filterSkillPoolByClass(pool, 'wordsmith');
    expect(result.map(r => r.resource)).toEqual(['base', 'fragment', 'gold']);
  });

  it('metamorph 保留 base/mutagen/gold，移除 fragment', () => {
    const result = filterSkillPoolByClass(pool, 'metamorph');
    expect(result.map(r => r.resource)).toEqual(['base', 'mutagen', 'gold']);
  });

  it('none 保留通用资源，移除 fragment 和 mutagen', () => {
    const result = filterSkillPoolByClass(pool, 'none');
    expect(result.map(r => r.resource)).toEqual(['base', 'gold']);
  });

  it('过滤 converter 的 source/target 字段', () => {
    const converterPool = [
      { source: 'base' as const, target: 'score' as const },
      { source: 'fragment' as const, target: 'score' as const },
      { source: 'base' as const, target: 'mutagen' as const },
    ];
    const result = filterSkillPoolByClass(converterPool, 'wordsmith');
    expect(result).toHaveLength(2);
    expect(result[0].source).toBe('base');
    expect(result[1].source).toBe('fragment');
  });
});

describe('filterSkillIdsByClass', () => {
  const defs: Record<string, { resource?: 'base' | 'fragment' | 'mutagen' | 'gold' }> = {
    skill_base: { resource: 'base' },
    skill_fragment: { resource: 'fragment' },
    skill_mutagen: { resource: 'mutagen' },
    skill_gold: { resource: 'gold' },
    skill_unknown: {},
  };
  const ids = Object.keys(defs);

  it('wordsmith 保留 base/fragment/gold/unknown', () => {
    const result = filterSkillIdsByClass(ids, 'wordsmith', id => defs[id]);
    expect(result).toEqual(['skill_base', 'skill_fragment', 'skill_gold', 'skill_unknown']);
  });

  it('none 移除所有职业资源技能', () => {
    const result = filterSkillIdsByClass(ids, 'none', id => defs[id]);
    expect(result).toEqual(['skill_base', 'skill_gold', 'skill_unknown']);
  });

  it('未知定义的 ID 保留', () => {
    const result = filterSkillIdsByClass(['no_def'], 'none', () => undefined);
    expect(result).toEqual(['no_def']);
  });
});

