/**
 * bossModifiers schema 测试 — meta 与分类完整性
 */

import { describe, it, expect } from 'vitest';
import { bossModifiersSchema, BOSS_MODIFIERS_DATA } from '../../../../src/data/schemas/bossModifiers.schema';
import { BOSS_MODIFIER_META, BOSS_MODIFIER_IDS } from '../../../../src/data/bossModifiers';

describe('bossModifiers schema', () => {
  it('schema parse 通过', () => {
    expect(() => bossModifiersSchema.parse(BOSS_MODIFIERS_DATA)).not.toThrow();
  });

  it('BOSS_MODIFIER_META key 与 BOSS_MODIFIER_IDS 一致', () => {
    const metaKeys = Object.keys(BOSS_MODIFIER_META).sort();
    const ids = [...BOSS_MODIFIER_IDS].sort();
    expect(metaKeys).toEqual(ids);
  });

  it('每个修饰有完整 meta', () => {
    for (const id of BOSS_MODIFIER_IDS) {
      const meta = BOSS_MODIFIER_META[id];
      expect(meta.id, `${id}.id`).toBe(id);
      expect(meta.name, `${id}.name`).toBeTruthy();
      expect(meta.icon, `${id}.icon`).toBeTruthy();
      expect(meta.description, `${id}.description`).toBeTruthy();
      expect(meta.eliteHint, `${id}.eliteHint`).toBeTruthy();
      expect(['offense', 'defense', 'disruption'], `${id}.category`).toContain(meta.category);
    }
  });

  it('三分类各有条目', () => {
    const categories = Object.values(BOSS_MODIFIER_META).map(m => m.category);
    expect(categories).toContain('offense');
    expect(categories).toContain('defense');
    expect(categories).toContain('disruption');
  });

  it('boss_fast_time / boss_decay / boss_fade 属于预期分类', () => {
    expect(BOSS_MODIFIER_META.boss_fast_time.category).toBe('offense');
    expect(BOSS_MODIFIER_META.boss_decay.category).toBe('defense');
    expect(BOSS_MODIFIER_META.boss_fade.category).toBe('disruption');
  });
});
