// ============================================
// 键盘拓扑与位置关系
// 6 种位置关系查询：相邻/同行/同列/同手/同指/对称位
// ============================================

import { ADJACENT_KEYS, KEYBOARD_ROWS, KEYS } from '../core/constants';

// === 位置关系枚举 ===
export enum PositionRelation {
  Adjacent = 'adjacent',
  SameRow = 'sameRow',
  SameColumn = 'sameColumn',
  SameHand = 'sameHand',
  SameFinger = 'sameFinger',
  Symmetric = 'symmetric',
}

// === 逻辑列号（键在其行内的索引） ===
const _COLUMN_MAP: Record<string, number> = {};
KEYBOARD_ROWS.forEach(row => row.forEach((key, col) => { _COLUMN_MAP[key] = col; }));
export const COLUMN_MAP: Readonly<Record<string, number>> = Object.freeze(_COLUMN_MAP);

// === 行号 ===
const _ROW_MAP: Record<string, number> = {};
KEYBOARD_ROWS.forEach((row, rowIdx) => row.forEach(key => { _ROW_MAP[key] = rowIdx; }));
export const ROW_MAP: Readonly<Record<string, number>> = Object.freeze(_ROW_MAP);

// === 手分配 ===
export const HAND_MAP: Record<string, 'left' | 'right'> = {
  q: 'left', w: 'left', e: 'left', r: 'left', t: 'left',
  a: 'left', s: 'left', d: 'left', f: 'left', g: 'left',
  z: 'left', x: 'left', c: 'left', v: 'left', b: 'left',
  y: 'right', u: 'right', i: 'right', o: 'right', p: 'right',
  h: 'right', j: 'right', k: 'right', l: 'right',
  n: 'right', m: 'right',
};

// === 手指分配（0-7，标准十指指法） ===
// 0=左小指, 1=左无名指, 2=左中指, 3=左食指
// 4=右食指, 5=右中指, 6=右无名指, 7=右小指
export const FINGER_MAP: Record<string, number> = {
  q: 0, a: 0, z: 0,
  w: 1, s: 1, x: 1,
  e: 2, d: 2, c: 2,
  r: 3, t: 3, f: 3, g: 3, v: 3, b: 3,
  y: 4, u: 4, h: 4, j: 4, n: 4, m: 4,
  i: 5, k: 5,
  o: 6, l: 6,
  p: 7,
};

// === 对称位映射（双向，26 字母键中 11 对） ===
export const SYMMETRIC_PAIRS: Record<string, string> = {
  q: 'p', p: 'q',
  w: 'o', o: 'w',
  e: 'i', i: 'e',
  r: 'u', u: 'r',
  t: 'y', y: 't',
  s: 'l', l: 's',
  d: 'k', k: 'd',
  f: 'j', j: 'f',
  g: 'h', h: 'g',
  v: 'm', m: 'v',
  b: 'n', n: 'b',
  // a, z, x, c: 无对称位（对应非字母键）
};

// === 关系判定函数 ===

function normalize(key: string): string {
  return key.toLowerCase();
}

export function isAdjacent(keyA: string, keyB: string): boolean {
  const a = normalize(keyA);
  const b = normalize(keyB);
  return a !== b && (ADJACENT_KEYS[a]?.includes(b) ?? false);
}

export function isSameRow(keyA: string, keyB: string): boolean {
  const a = normalize(keyA);
  const b = normalize(keyB);
  return a !== b && ROW_MAP[a] !== undefined && ROW_MAP[a] === ROW_MAP[b];
}

export function isSameColumn(keyA: string, keyB: string): boolean {
  const a = normalize(keyA);
  const b = normalize(keyB);
  return a !== b && COLUMN_MAP[a] !== undefined && COLUMN_MAP[b] !== undefined && COLUMN_MAP[a] === COLUMN_MAP[b];
}

export function isSameHand(keyA: string, keyB: string): boolean {
  const a = normalize(keyA);
  const b = normalize(keyB);
  return a !== b && HAND_MAP[a] !== undefined && HAND_MAP[a] === HAND_MAP[b];
}

export function isSameFinger(keyA: string, keyB: string): boolean {
  const a = normalize(keyA);
  const b = normalize(keyB);
  return a !== b && FINGER_MAP[a] !== undefined && FINGER_MAP[a] === FINGER_MAP[b];
}

export function isSymmetric(keyA: string, keyB: string): boolean {
  const a = normalize(keyA);
  const b = normalize(keyB);
  return SYMMETRIC_PAIRS[a] === b;
}

// === 关系检查器映射 ===
const RELATION_CHECKERS: Record<PositionRelation, (a: string, b: string) => boolean> = {
  [PositionRelation.Adjacent]: isAdjacent,
  [PositionRelation.SameRow]: isSameRow,
  [PositionRelation.SameColumn]: isSameColumn,
  [PositionRelation.SameHand]: isSameHand,
  [PositionRelation.SameFinger]: isSameFinger,
  [PositionRelation.Symmetric]: isSymmetric,
};

// === 核心查询 API ===

/** 检查两键之间是否存在指定关系 */
export function hasRelation(keyA: string, keyB: string, relation: PositionRelation): boolean {
  return RELATION_CHECKERS[relation](keyA, keyB);
}

/** 返回两键之间所有成立的位置关系 */
export function getRelations(keyA: string, keyB: string): PositionRelation[] {
  const a = normalize(keyA);
  const b = normalize(keyB);
  if (a === b || !KEYS.includes(a) || !KEYS.includes(b)) return [];
  const result: PositionRelation[] = [];
  for (const relation of Object.values(PositionRelation)) {
    if (RELATION_CHECKERS[relation](a, b)) {
      result.push(relation);
    }
  }
  return result;
}

/** 返回与指定键有某种关系的所有键 */
export function getKeysWithRelation(key: string, relation: PositionRelation): string[] {
  const k = normalize(key);
  if (!KEYS.includes(k)) return [];
  const checker = RELATION_CHECKERS[relation];
  return KEYS.filter(other => other !== k && checker(k, other));
}
