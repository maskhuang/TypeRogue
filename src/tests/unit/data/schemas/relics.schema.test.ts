/**
 * relics schema 测试 — 条目数与关键字段完整性
 */

import { describe, it, expect } from 'vitest';
import { relicsSchema, RELICS_DATA } from '../../../../src/data/schemas/relics.schema';
import { RELICS, MAX_RELIC_SLOTS, DELETED_RELIC_IDS } from '../../../../src/data/relics';

describe('relics schema', () => {
  it('schema parse 通过', () => {
    expect(() => relicsSchema.parse(RELICS_DATA)).not.toThrow();
  });

  it('RELICS 条目数 ≥ 50', () => {
    expect(Object.keys(RELICS).length).toBeGreaterThanOrEqual(50);
  });

  it('每个 relic 有完整字段', () => {
    for (const [id, relic] of Object.entries(RELICS)) {
      expect(relic.id, `${id}.id`).toBe(id);
      expect(relic.name, `${id}.name`).toBeTruthy();
      expect(relic.icon, `${id}.icon`).toBeTruthy();
      expect(relic.description, `${id}.description`).toBeTruthy();
      expect(['common', 'rare', 'epic', 'legendary'], `${id}.rarity`).toContain(relic.rarity);
      expect(typeof relic.basePrice, `${id}.basePrice`).toBe('number');
      expect(Array.isArray(relic.effects), `${id}.effects`).toBe(true);
    }
  });

  it('MAX_RELIC_SLOTS 是正整数', () => {
    expect(Number.isInteger(MAX_RELIC_SLOTS)).toBe(true);
    expect(MAX_RELIC_SLOTS).toBeGreaterThan(0);
  });

  it('apprentice_notes (造词师初始) 存在且 common', () => {
    expect(RELICS.apprentice_notes).toBeDefined();
    expect(RELICS.apprentice_notes.rarity).toBe('common');
    expect(RELICS.apprentice_notes.basePrice).toBe(0);
  });

  it('primal_mutant (蜕变师初始) 存在', () => {
    expect(RELICS.primal_mutant).toBeDefined();
  });

  it('DELETED_RELIC_IDS 非空（存档迁移用）', () => {
    expect(DELETED_RELIC_IDS.length).toBeGreaterThan(0);
  });

  it('relic effect 字段形状完整', () => {
    for (const [id, relic] of Object.entries(RELICS)) {
      for (const effect of relic.effects) {
        expect(effect.type, `${id} effect.type`).toBeTruthy();
        expect(effect.modifier, `${id} effect.modifier`).toBeTruthy();
        expect(typeof effect.value, `${id} effect.value`).toBe('number');
      }
    }
  });
});
