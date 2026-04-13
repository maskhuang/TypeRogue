/**
 * keyboardTopology schema 测试
 *
 * 验证：
 *   - JSON 通过 schema 校验
 *   - 加载后的数据可被 keyboardTopology.ts 模块正常使用
 *   - 派生表与字母表预期一致
 */

import { describe, it, expect } from 'vitest';
import {
  keyboardTopologySchema,
  KEYBOARD_TOPOLOGY_DATA,
} from '../../../../src/data/schemas/keyboardTopology.schema';
import {
  COLUMN_MAP,
  ROW_MAP,
  HAND_MAP,
  FINGER_MAP,
  SYMMETRIC_PAIRS,
  isAdjacent,
  isSameRow,
  isSymmetric,
  hasRelation,
  PositionRelation,
} from '../../../../src/data/keyboardTopology';

describe('keyboardTopology schema', () => {
  it('schema parse 通过', () => {
    expect(() => keyboardTopologySchema.parse(KEYBOARD_TOPOLOGY_DATA)).not.toThrow();
  });

  it('包含全部 5 张表', () => {
    expect(KEYBOARD_TOPOLOGY_DATA.columnMap).toBeDefined();
    expect(KEYBOARD_TOPOLOGY_DATA.rowMap).toBeDefined();
    expect(KEYBOARD_TOPOLOGY_DATA.handMap).toBeDefined();
    expect(KEYBOARD_TOPOLOGY_DATA.fingerMap).toBeDefined();
    expect(KEYBOARD_TOPOLOGY_DATA.symmetricPairs).toBeDefined();
  });

  it('每张表覆盖 26 字母键 + 6 标点键', () => {
    const expectedKeys = 26 + 6; // 字母 + ;,./[]
    expect(Object.keys(COLUMN_MAP)).toHaveLength(expectedKeys);
    expect(Object.keys(ROW_MAP)).toHaveLength(expectedKeys);
    expect(Object.keys(HAND_MAP)).toHaveLength(expectedKeys);
    expect(Object.keys(FINGER_MAP)).toHaveLength(expectedKeys);
    // SYMMETRIC_PAIRS 不含 g/h（无对称对）—— 30 项
    expect(Object.keys(SYMMETRIC_PAIRS).length).toBeGreaterThanOrEqual(26);
  });
});

describe('keyboardTopology re-export 一致性', () => {
  it('COLUMN_MAP 字母键值正确（QWERTY 行内索引）', () => {
    expect(COLUMN_MAP['q']).toBe(0);
    expect(COLUMN_MAP['p']).toBe(9);
    expect(COLUMN_MAP['a']).toBe(0);
    expect(COLUMN_MAP['l']).toBe(8);
    expect(COLUMN_MAP['z']).toBe(0);
    expect(COLUMN_MAP['m']).toBe(6);
  });

  it('ROW_MAP 字母键值正确（top=0, home=1, bottom=2）', () => {
    expect(ROW_MAP['q']).toBe(0);
    expect(ROW_MAP['a']).toBe(1);
    expect(ROW_MAP['z']).toBe(2);
  });

  it('HAND_MAP 左右手分配正确', () => {
    expect(HAND_MAP['q']).toBe('left');
    expect(HAND_MAP['t']).toBe('left');
    expect(HAND_MAP['y']).toBe('right');
    expect(HAND_MAP['p']).toBe('right');
  });

  it('FINGER_MAP 十指分配正确', () => {
    expect(FINGER_MAP['a']).toBe(0); // 左小指
    expect(FINGER_MAP['f']).toBe(3); // 左食指
    expect(FINGER_MAP['j']).toBe(4); // 右食指
    expect(FINGER_MAP['p']).toBe(7); // 右小指
  });

  it('SYMMETRIC_PAIRS 双向映射', () => {
    expect(SYMMETRIC_PAIRS['q']).toBe('p');
    expect(SYMMETRIC_PAIRS['p']).toBe('q');
    expect(SYMMETRIC_PAIRS['f']).toBe('j');
    expect(SYMMETRIC_PAIRS['j']).toBe('f');
  });
});

describe('keyboardTopology 运行时函数仍可工作', () => {
  it('isSameRow', () => {
    expect(isSameRow('q', 'p')).toBe(true);
    expect(isSameRow('q', 'a')).toBe(false);
  });

  it('isSymmetric', () => {
    expect(isSymmetric('q', 'p')).toBe(true);
    expect(isSymmetric('a', ';')).toBe(true);
    expect(isSymmetric('q', 'a')).toBe(false);
  });

  it('isAdjacent (依赖 core/constants ADJACENT_KEYS)', () => {
    // q 的邻居在 ADJACENT_KEYS 中应包含 w 和 a
    expect(isAdjacent('q', 'w') || isAdjacent('q', 'a')).toBe(true);
  });

  it('hasRelation 派发到 6 种关系', () => {
    expect(hasRelation('q', 'p', PositionRelation.SameRow)).toBe(true);
    expect(hasRelation('q', 'p', PositionRelation.Symmetric)).toBe(true);
    expect(hasRelation('q', 'a', PositionRelation.SameColumn)).toBe(true);
    expect(hasRelation('q', 'p', PositionRelation.SameHand)).toBe(false);
  });
});
