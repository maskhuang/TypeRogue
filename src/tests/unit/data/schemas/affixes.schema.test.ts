/**
 * affixes schema 测试 — sanity check 核心表条目数与关键字段
 */

import { describe, it, expect } from 'vitest';
import { affixesSchema, AFFIXES_DATA } from '../../../../src/data/schemas/affixes.schema';
import {
  AFFIX_CATEGORY_MAP,
  AFFIX_NAMES,
  AFFIX_DESCRIPTIONS,
  BASE_VALUES,
  RARITY_NAMES,
  RARITY_COLORS,
  RARITY_PROBABILITIES,
  VOID_BONUS_TABLE,
  CRIT_MULTIPLIER,
  AFFIX_WEIGHT_TIERS,
} from '../../../../src/data/affixes';

describe('affixes schema', () => {
  it('schema parse 通过', () => {
    expect(() => affixesSchema.parse(AFFIXES_DATA)).not.toThrow();
  });

  it('AFFIX_CATEGORY_MAP 非空且值为数组', () => {
    const keys = Object.keys(AFFIX_CATEGORY_MAP);
    expect(keys.length).toBeGreaterThan(20); // 至少 22+ AffixType
    for (const [k, v] of Object.entries(AFFIX_CATEGORY_MAP)) {
      expect(Array.isArray(v), `${k} should be array`).toBe(true);
      expect(v.length, `${k} has at least 1 category`).toBeGreaterThan(0);
    }
  });

  it('AFFIX_NAMES 与 AFFIX_DESCRIPTIONS key 集合一致', () => {
    expect(Object.keys(AFFIX_NAMES).sort()).toEqual(Object.keys(AFFIX_DESCRIPTIONS).sort());
  });

  it('BASE_VALUES 每个资源 4 级', () => {
    for (const [resource, levels] of Object.entries(BASE_VALUES)) {
      expect(levels, `${resource} levels`).toHaveLength(4);
      // 数值应非负且递增
      for (let i = 1; i < levels.length; i++) {
        expect(levels[i], `${resource} level ${i}`).toBeGreaterThan(levels[i - 1]);
      }
    }
  });

  it('RARITY_NAMES / RARITY_COLORS 覆盖 0-3', () => {
    for (const key of ['0', '1', '2', '3']) {
      expect(RARITY_NAMES[key as unknown as 0 | 1 | 2 | 3]).toBeTruthy();
      expect(RARITY_COLORS[key as unknown as 0 | 1 | 2 | 3]).toBeTruthy();
    }
  });

  it('RARITY_PROBABILITIES 总和 ≈ 1', () => {
    const sum = RARITY_PROBABILITIES.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it('VOID_BONUS_TABLE 覆盖 6 种 PositionRelation', () => {
    expect(Object.keys(VOID_BONUS_TABLE).length).toBe(6);
  });

  it('CRIT_MULTIPLIER 存在且是数字', () => {
    expect(typeof CRIT_MULTIPLIER).toBe('number');
    expect(CRIT_MULTIPLIER).toBeGreaterThan(1);
  });

  it('AFFIX_WEIGHT_TIERS 值只含 high/low/none', () => {
    for (const [k, v] of Object.entries(AFFIX_WEIGHT_TIERS)) {
      expect(['high', 'low', 'none'], `${k}: ${v}`).toContain(v);
    }
  });
});
