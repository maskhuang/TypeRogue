/**
 * classes schema 测试
 */

import { describe, it, expect } from 'vitest';
import { classesSchema, CLASSES_DATA } from '../../../../src/data/schemas/classes.schema';
import { CLASS_DEFINITIONS, getClassDefinition, getSelectableClassIds } from '../../../../src/data/classes';

describe('classes schema', () => {
  it('schema parse 通过', () => {
    expect(() => classesSchema.parse(CLASSES_DATA)).not.toThrow();
  });

  it('包含 3 个职业定义', () => {
    expect(Object.keys(CLASSES_DATA.definitions)).toEqual(
      expect.arrayContaining(['none', 'wordsmith', 'metamorph'])
    );
    expect(Object.keys(CLASSES_DATA.definitions)).toHaveLength(3);
  });

  it('职业关键字段存在', () => {
    for (const classId of ['none', 'wordsmith', 'metamorph'] as const) {
      const def = CLASSES_DATA.definitions[classId];
      expect(def.id).toBe(classId);
      expect(def.name).toBeTruthy();
      expect(def.description).toBeTruthy();
      expect(def.icon).toBeTruthy();
    }
  });

  it('wordsmith uniqueResource=energy, starterRelic=apprentice_notes', () => {
    expect(CLASSES_DATA.definitions.wordsmith.uniqueResource).toBe('energy');
    expect(CLASSES_DATA.definitions.wordsmith.starterRelic).toBe('apprentice_notes');
  });

  it('metamorph uniqueResource=mutagen, loseFeature=enchant-choice', () => {
    expect(CLASSES_DATA.definitions.metamorph.uniqueResource).toBe('mutagen');
    expect(CLASSES_DATA.definitions.metamorph.loseFeature).toBe('enchant-choice');
  });

  it('none 职业无特殊机制', () => {
    const none = CLASSES_DATA.definitions.none;
    expect(none.uniqueResource).toBeNull();
    expect(none.loseFeature).toBeNull();
    expect(none.starterRelic).toBeNull();
  });
});

describe('classes re-export 一致性', () => {
  it('CLASS_DEFINITIONS 与 CLASSES_DATA.definitions 同源', () => {
    expect(CLASS_DEFINITIONS).toBe(CLASSES_DATA.definitions);
  });

  it('getClassDefinition 仍可工作', () => {
    const def = getClassDefinition('wordsmith');
    expect(def.name).toBe('造词师');
  });

  it('getSelectableClassIds 返回 2 项', () => {
    const ids = getSelectableClassIds();
    expect(ids).toEqual(['wordsmith', 'metamorph']);
  });
});
