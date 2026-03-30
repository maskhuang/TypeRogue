import { describe, it, expect } from 'vitest';
import {
  PositionRelation,
  COLUMN_MAP,
  ROW_MAP,
  HAND_MAP,
  FINGER_MAP,
  SYMMETRIC_PAIRS,
  isAdjacent,
  isSameRow,
  isSameColumn,
  isSameHand,
  isSameFinger,
  isSymmetric,
  hasRelation,
  getRelations,
  getKeysWithRelation,
  isHomeRow,
  isIsolatedSkill,
  isInPair,
} from '../../../src/data/keyboardTopology';
import { ADJACENT_KEYS, KEYBOARD_ROWS, KEYS, PUNCTUATION_KEYBOARD_EXTENSION } from '../../../src/core/constants';

// === 数据完整性 ===

describe('数据映射完整性', () => {
  it('COLUMN_MAP 覆盖全部 26 键', () => {
    for (const key of KEYS) {
      expect(COLUMN_MAP[key]).toBeDefined();
      expect(typeof COLUMN_MAP[key]).toBe('number');
    }
  });

  it('ROW_MAP 覆盖全部 26 键', () => {
    for (const key of KEYS) {
      expect(ROW_MAP[key]).toBeDefined();
      expect(ROW_MAP[key]).toBeGreaterThanOrEqual(0);
      expect(ROW_MAP[key]).toBeLessThanOrEqual(2);
    }
  });

  it('HAND_MAP 覆盖全部 26 键', () => {
    for (const key of KEYS) {
      expect(HAND_MAP[key]).toBeDefined();
      expect(['left', 'right']).toContain(HAND_MAP[key]);
    }
  });

  it('FINGER_MAP 覆盖全部 26 键', () => {
    for (const key of KEYS) {
      expect(FINGER_MAP[key]).toBeDefined();
      expect(FINGER_MAP[key]).toBeGreaterThanOrEqual(0);
      expect(FINGER_MAP[key]).toBeLessThanOrEqual(7);
    }
  });

  it('左手 15 键，右手 11 键', () => {
    const left = KEYS.filter(k => HAND_MAP[k] === 'left');
    const right = KEYS.filter(k => HAND_MAP[k] === 'right');
    expect(left.length).toBe(15);
    expect(right.length).toBe(11);
  });

  it('SYMMETRIC_PAIRS 有 30 个条目（15 对双向映射，含标点键）', () => {
    expect(Object.keys(SYMMETRIC_PAIRS).length).toBe(30);
  });

  it('对称映射是双向的', () => {
    for (const [a, b] of Object.entries(SYMMETRIC_PAIRS)) {
      expect(SYMMETRIC_PAIRS[b]).toBe(a);
    }
  });

  it('a/z/x/c 有标点键对称位', () => {
    expect(SYMMETRIC_PAIRS['a']).toBe(';');
    expect(SYMMETRIC_PAIRS['z']).toBe('/');
    expect(SYMMETRIC_PAIRS['x']).toBe('.');
    expect(SYMMETRIC_PAIRS['c']).toBe(',');
  });
});

// === 相邻关系 (adjacent) ===

describe('isAdjacent', () => {
  it('相邻键返回 true', () => {
    expect(isAdjacent('q', 'w')).toBe(true);
    expect(isAdjacent('f', 'g')).toBe(true);
    expect(isAdjacent('s', 'e')).toBe(true);
  });

  it('不相邻键返回 false', () => {
    expect(isAdjacent('q', 'p')).toBe(false);
    expect(isAdjacent('z', 'm')).toBe(false);
  });

  it('对称性：A 相邻 B ↔ B 相邻 A', () => {
    expect(isAdjacent('q', 'w')).toBe(true);
    expect(isAdjacent('w', 'q')).toBe(true);
  });

  it('同键返回 false', () => {
    expect(isAdjacent('a', 'a')).toBe(false);
  });

  it('大小写不敏感', () => {
    expect(isAdjacent('Q', 'w')).toBe(true);
    expect(isAdjacent('Q', 'W')).toBe(true);
  });

  it('无效键返回 false', () => {
    expect(isAdjacent('1', 'q')).toBe(false);
    expect(isAdjacent('q', '!')).toBe(false);
  });

  it('与 ADJACENT_KEYS 一致', () => {
    for (const [key, neighbors] of Object.entries(ADJACENT_KEYS)) {
      for (const neighbor of neighbors) {
        expect(isAdjacent(key, neighbor)).toBe(true);
      }
      // 非邻居应返回 false
      const nonNeighbors = KEYS.filter(k => k !== key && !neighbors.includes(k));
      for (const nonNeighbor of nonNeighbors) {
        expect(isAdjacent(key, nonNeighbor)).toBe(false);
      }
    }
  });
});

// === 同行关系 (sameRow) ===

describe('isSameRow', () => {
  it('同行键返回 true', () => {
    expect(isSameRow('q', 'p')).toBe(true); // Row 0
    expect(isSameRow('a', 'l')).toBe(true); // Row 1
    expect(isSameRow('z', 'm')).toBe(true); // Row 2
  });

  it('不同行键返回 false', () => {
    expect(isSameRow('q', 'a')).toBe(false);
    expect(isSameRow('a', 'z')).toBe(false);
    expect(isSameRow('q', 'z')).toBe(false);
  });

  it('同键返回 false', () => {
    expect(isSameRow('q', 'q')).toBe(false);
  });

  it('对称性', () => {
    expect(isSameRow('q', 'w')).toBe(true);
    expect(isSameRow('w', 'q')).toBe(true);
  });

  it('Row 0 有 12 个键（含 [ ]）', () => {
    const row0 = getKeysWithRelation('q', PositionRelation.SameRow);
    expect(row0.length).toBe(11); // 12 - self (10 letters + [ ])
  });

  it('Row 1 有 10 个键（含 ;）', () => {
    const row1 = getKeysWithRelation('a', PositionRelation.SameRow);
    expect(row1.length).toBe(9); // 10 - self
  });

  it('Row 2 有 10 个键（含 , . /）', () => {
    const row2 = getKeysWithRelation('z', PositionRelation.SameRow);
    expect(row2.length).toBe(9); // 10 - self
  });
});

// === 同列关系 (sameColumn) ===

describe('isSameColumn', () => {
  it('同列键返回 true (Q-A-Z 列 0)', () => {
    expect(isSameColumn('q', 'a')).toBe(true);
    expect(isSameColumn('q', 'z')).toBe(true);
    expect(isSameColumn('a', 'z')).toBe(true);
  });

  it('同列键返回 true (W-S-X 列 1)', () => {
    expect(isSameColumn('w', 's')).toBe(true);
    expect(isSameColumn('w', 'x')).toBe(true);
    expect(isSameColumn('s', 'x')).toBe(true);
  });

  it('不同列键返回 false', () => {
    expect(isSameColumn('q', 'w')).toBe(false);
    expect(isSameColumn('a', 'd')).toBe(false);
  });

  it('同键返回 false', () => {
    expect(isSameColumn('q', 'q')).toBe(false);
  });

  it('列 7 有 3 个键 (I, K, ,)', () => {
    const col7 = getKeysWithRelation('i', PositionRelation.SameColumn);
    expect(col7.sort()).toEqual([',', 'k']);
  });

  it('列 8 有 3 个键 (O, L, .)', () => {
    const col8 = getKeysWithRelation('o', PositionRelation.SameColumn);
    expect(col8.sort()).toEqual(['.', 'l']);
  });

  it('列 9 有 P, ;, /（3 个键）', () => {
    const col9 = getKeysWithRelation('p', PositionRelation.SameColumn);
    expect(col9.sort()).toEqual(['/', ';']);
  });

  it('3 行都有的列返回 2 个键', () => {
    // Column 0: q, a, z
    const col0FromQ = getKeysWithRelation('q', PositionRelation.SameColumn);
    expect(col0FromQ.sort()).toEqual(['a', 'z']);
  });
});

// === 同手关系 (sameHand) ===

describe('isSameHand', () => {
  it('左手键返回 true', () => {
    expect(isSameHand('q', 't')).toBe(true);
    expect(isSameHand('a', 'b')).toBe(true);
  });

  it('右手键返回 true', () => {
    expect(isSameHand('y', 'p')).toBe(true);
    expect(isSameHand('h', 'm')).toBe(true);
  });

  it('不同手返回 false', () => {
    expect(isSameHand('t', 'y')).toBe(false);
    expect(isSameHand('g', 'h')).toBe(false);
    expect(isSameHand('b', 'n')).toBe(false);
  });

  it('同键返回 false', () => {
    expect(isSameHand('a', 'a')).toBe(false);
  });

  it('左手 = QWERTASDFGZXCVB', () => {
    const leftKeys = 'qwertasdfgzxcvb'.split('');
    for (const key of leftKeys) {
      expect(HAND_MAP[key]).toBe('left');
    }
  });

  it('右手 = YUIOPHJKLNM', () => {
    const rightKeys = 'yuiophjklnm'.split('');
    for (const key of rightKeys) {
      expect(HAND_MAP[key]).toBe('right');
    }
  });
});

// === 同指关系 (sameFinger) ===

describe('isSameFinger', () => {
  it('左小指键返回 true (Q, A, Z)', () => {
    expect(isSameFinger('q', 'a')).toBe(true);
    expect(isSameFinger('q', 'z')).toBe(true);
    expect(isSameFinger('a', 'z')).toBe(true);
  });

  it('左食指 6 键 (R, T, F, G, V, B)', () => {
    const leftIndex = ['r', 't', 'f', 'g', 'v', 'b'];
    for (let i = 0; i < leftIndex.length; i++) {
      for (let j = i + 1; j < leftIndex.length; j++) {
        expect(isSameFinger(leftIndex[i], leftIndex[j])).toBe(true);
      }
    }
  });

  it('右食指 6 键 (Y, U, H, J, N, M)', () => {
    const rightIndex = ['y', 'u', 'h', 'j', 'n', 'm'];
    for (let i = 0; i < rightIndex.length; i++) {
      for (let j = i + 1; j < rightIndex.length; j++) {
        expect(isSameFinger(rightIndex[i], rightIndex[j])).toBe(true);
      }
    }
  });

  it('不同手指返回 false', () => {
    expect(isSameFinger('q', 'w')).toBe(false);
    expect(isSameFinger('r', 'e')).toBe(false);
    expect(isSameFinger('y', 'i')).toBe(false);
  });

  it('P 的右小指同指键包含 ; / [ ]', () => {
    const sameFinger = getKeysWithRelation('p', PositionRelation.SameFinger);
    expect(sameFinger.sort()).toEqual(['/', ';', '[', ']']);
  });

  it('同键返回 false', () => {
    expect(isSameFinger('r', 'r')).toBe(false);
  });

  it('食指组返回 5 个同指键', () => {
    const rSameFinger = getKeysWithRelation('r', PositionRelation.SameFinger);
    expect(rSameFinger.sort()).toEqual(['b', 'f', 'g', 't', 'v']);
  });
});

// === 对称位关系 (symmetric) ===

describe('isSymmetric', () => {
  it('对称键返回 true', () => {
    expect(isSymmetric('q', 'p')).toBe(true);
    expect(isSymmetric('f', 'j')).toBe(true);
    expect(isSymmetric('g', 'h')).toBe(true);
    expect(isSymmetric('b', 'n')).toBe(true);
    expect(isSymmetric('v', 'm')).toBe(true);
  });

  it('对称性：A↔B → B↔A', () => {
    expect(isSymmetric('q', 'p')).toBe(true);
    expect(isSymmetric('p', 'q')).toBe(true);
  });

  it('非对称键返回 false', () => {
    expect(isSymmetric('q', 'o')).toBe(false);
    expect(isSymmetric('a', 'l')).toBe(false);
  });

  it('a/z/x/c 与标点键有对称位', () => {
    expect(isSymmetric('a', ';')).toBe(true);
    expect(isSymmetric('z', '/')).toBe(true);
    expect(isSymmetric('x', '.')).toBe(true);
    expect(isSymmetric('c', ',')).toBe(true);
    // 反向也成立
    expect(isSymmetric(';', 'a')).toBe(true);
    expect(isSymmetric('/', 'z')).toBe(true);
    expect(isSymmetric('.', 'x')).toBe(true);
    expect(isSymmetric(',', 'c')).toBe(true);
  });

  it('同键返回 false', () => {
    expect(isSymmetric('q', 'q')).toBe(false);
  });

  it('15 对完整验证（含标点键）', () => {
    const pairs: [string, string][] = [
      ['q', 'p'], ['w', 'o'], ['e', 'i'], ['r', 'u'], ['t', 'y'],
      ['s', 'l'], ['d', 'k'], ['f', 'j'], ['g', 'h'],
      ['v', 'm'], ['b', 'n'],
      ['a', ';'], ['z', '/'], ['x', '.'], ['c', ','],
    ];
    expect(pairs.length).toBe(15);
    for (const [a, b] of pairs) {
      expect(isSymmetric(a, b)).toBe(true);
      expect(isSymmetric(b, a)).toBe(true);
    }
  });

  it('getKeysWithRelation 对有对称位的键返回 1', () => {
    expect(getKeysWithRelation('q', PositionRelation.Symmetric)).toEqual(['p']);
    expect(getKeysWithRelation('f', PositionRelation.Symmetric)).toEqual(['j']);
  });

  it('getKeysWithRelation 对 a/z 返回标点键对称位', () => {
    expect(getKeysWithRelation('a', PositionRelation.Symmetric)).toEqual([';']);
    expect(getKeysWithRelation('z', PositionRelation.Symmetric)).toEqual(['/']);
  });
});

// === 核心 API ===

describe('hasRelation', () => {
  it('正确代理到各关系检查器（正面用例）', () => {
    expect(hasRelation('q', 'w', PositionRelation.Adjacent)).toBe(true);
    expect(hasRelation('q', 'p', PositionRelation.SameRow)).toBe(true);
    expect(hasRelation('q', 'a', PositionRelation.SameColumn)).toBe(true);
    expect(hasRelation('q', 'w', PositionRelation.SameHand)).toBe(true);
    expect(hasRelation('q', 'a', PositionRelation.SameFinger)).toBe(true);
    expect(hasRelation('q', 'p', PositionRelation.Symmetric)).toBe(true);
  });

  it('正确返回 false（负面用例）', () => {
    expect(hasRelation('q', 'p', PositionRelation.Adjacent)).toBe(false);
    expect(hasRelation('q', 'a', PositionRelation.SameRow)).toBe(false);
    expect(hasRelation('q', 'w', PositionRelation.SameColumn)).toBe(false);
    expect(hasRelation('t', 'y', PositionRelation.SameHand)).toBe(false);
    expect(hasRelation('q', 'w', PositionRelation.SameFinger)).toBe(false);
    expect(hasRelation('a', 'l', PositionRelation.Symmetric)).toBe(false);
  });
});

describe('getRelations', () => {
  it('返回所有成立的关系', () => {
    // Q 和 A: 相邻 + 同列 + 同手 + 同指
    const qa = getRelations('q', 'a');
    expect(qa).toContain(PositionRelation.Adjacent);
    expect(qa).toContain(PositionRelation.SameColumn);
    expect(qa).toContain(PositionRelation.SameHand);
    expect(qa).toContain(PositionRelation.SameFinger);
    expect(qa).not.toContain(PositionRelation.SameRow);
    expect(qa).not.toContain(PositionRelation.Symmetric);
  });

  it('Q 和 P: 同行 + 对称位', () => {
    const qp = getRelations('q', 'p');
    expect(qp).toContain(PositionRelation.SameRow);
    expect(qp).toContain(PositionRelation.Symmetric);
    expect(qp).not.toContain(PositionRelation.SameHand);
  });

  it('F 和 J: 同行 + 对称位', () => {
    const fj = getRelations('f', 'j');
    expect(fj).toContain(PositionRelation.SameRow);
    expect(fj).toContain(PositionRelation.Symmetric);
    expect(fj).not.toContain(PositionRelation.SameHand);
  });

  it('同键返回空数组', () => {
    expect(getRelations('q', 'q')).toEqual([]);
  });

  it('无效键返回空数组', () => {
    expect(getRelations('1', 'q')).toEqual([]);
    expect(getRelations('q', '!')).toEqual([]);
  });

  it('大小写不敏感', () => {
    const result = getRelations('Q', 'a');
    expect(result).toContain(PositionRelation.Adjacent);
  });
});

describe('getKeysWithRelation', () => {
  it('Adjacent 与 ADJACENT_KEYS 一致', () => {
    for (const key of KEYS) {
      const result = getKeysWithRelation(key, PositionRelation.Adjacent);
      expect(result.sort()).toEqual([...ADJACENT_KEYS[key]].sort());
    }
  });

  it('SameRow 返回同行所有其他键（含标点键扩展）', () => {
    for (let ri = 0; ri < KEYBOARD_ROWS.length; ri++) {
      const row = KEYBOARD_ROWS[ri];
      const extKeys = PUNCTUATION_KEYBOARD_EXTENSION[ri] || [];
      const fullRow = [...row, ...extKeys];
      for (const key of row) {
        const result = getKeysWithRelation(key, PositionRelation.SameRow);
        const expected = fullRow.filter(k => k !== key);
        expect(result.sort()).toEqual(expected.sort());
      }
    }
  });

  it('SameColumn 返回同列所有其他键', () => {
    // Column 3: r, f, v
    const col3 = getKeysWithRelation('r', PositionRelation.SameColumn);
    expect(col3.sort()).toEqual(['f', 'v']);
  });

  it('无效键返回空数组', () => {
    expect(getKeysWithRelation('1', PositionRelation.Adjacent)).toEqual([]);
  });

  it('不包含自身', () => {
    for (const relation of Object.values(PositionRelation)) {
      for (const key of KEYS) {
        const result = getKeysWithRelation(key, relation);
        expect(result).not.toContain(key);
      }
    }
  });
});

// === isHomeRow ===

describe('isHomeRow', () => {
  it('主行键 (ASDFGHJKL) 返回 true', () => {
    for (const key of ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l']) {
      expect(isHomeRow(key)).toBe(true);
    }
  });

  it('非主行键返回 false', () => {
    for (const key of ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', 'z', 'x', 'c', 'v', 'b', 'n', 'm']) {
      expect(isHomeRow(key)).toBe(false);
    }
  });

  it('大小写不敏感', () => {
    expect(isHomeRow('F')).toBe(true);
    expect(isHomeRow('Q')).toBe(false);
  });

  it('无效键返回 false', () => {
    expect(isHomeRow('1')).toBe(false);
    expect(isHomeRow('')).toBe(false);
  });
});

// === isIsolatedSkill ===

describe('isIsolatedSkill', () => {
  it('无相邻技能 → 孤立', () => {
    const bindings = new Map([['q', 'skill_a'], ['l', 'skill_b']]);
    expect(isIsolatedSkill('q', bindings)).toBe(true);
    expect(isIsolatedSkill('l', bindings)).toBe(true);
  });

  it('有相邻技能 → 非孤立', () => {
    const bindings = new Map([['f', 'skill_a'], ['g', 'skill_b']]);
    expect(isIsolatedSkill('f', bindings)).toBe(false);
    expect(isIsolatedSkill('g', bindings)).toBe(false);
  });

  it('唯一技能 → 孤立', () => {
    const bindings = new Map([['m', 'skill_a']]);
    expect(isIsolatedSkill('m', bindings)).toBe(true);
  });

  it('大小写不敏感', () => {
    const bindings = new Map([['q', 'skill_a']]);
    expect(isIsolatedSkill('Q', bindings)).toBe(true);
  });
});

// === isInPair ===

describe('isInPair', () => {
  it('两个相邻键 → 配对', () => {
    const bindings = new Map([['f', 'skill_a'], ['g', 'skill_b']]);
    expect(isInPair('f', bindings)).toBe(true);
    expect(isInPair('g', bindings)).toBe(true);
  });

  it('三个相邻键 → 非配对（分量=3）', () => {
    const bindings = new Map([['f', 'skill_a'], ['g', 'skill_b'], ['h', 'skill_c']]);
    expect(isInPair('f', bindings)).toBe(false);
    expect(isInPair('g', bindings)).toBe(false);
    expect(isInPair('h', bindings)).toBe(false);
  });

  it('孤立键 → 非配对（分量=1）', () => {
    const bindings = new Map([['q', 'skill_a']]);
    expect(isInPair('q', bindings)).toBe(false);
  });

  it('键不在 bindings 中 → false', () => {
    const bindings = new Map([['f', 'skill_a'], ['g', 'skill_b']]);
    expect(isInPair('q', bindings)).toBe(false);
  });

  it('两对独立配对', () => {
    const bindings = new Map([['f', 'a'], ['g', 'b'], ['j', 'c'], ['k', 'd']]);
    expect(isInPair('f', bindings)).toBe(true);
    expect(isInPair('j', bindings)).toBe(true);
  });

  it('大小写不敏感', () => {
    const bindings = new Map([['f', 'a'], ['g', 'b']]);
    expect(isInPair('F', bindings)).toBe(true);
  });
});

// === 边界情况 ===

describe('边界情况', () => {
  it('所有关系对同键返回 false', () => {
    for (const relation of Object.values(PositionRelation)) {
      for (const key of KEYS) {
        expect(hasRelation(key, key, relation)).toBe(false);
      }
    }
  });

  it('所有关系是对称的（A→B = B→A）', () => {
    for (const relation of Object.values(PositionRelation)) {
      for (const a of KEYS) {
        for (const b of KEYS) {
          if (a !== b) {
            expect(hasRelation(a, b, relation)).toBe(hasRelation(b, a, relation));
          }
        }
      }
    }
  });
});
