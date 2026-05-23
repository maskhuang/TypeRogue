// ============================================
// 键盘拓扑与位置关系
// 6 种位置关系查询：相邻/同行/同列/同手/同指/对称位
//
// 静态数据（COLUMN/ROW/HAND/FINGER/SYMMETRIC 表）从 data-json/keyboardTopology.json 加载
// 通过 schemas/keyboardTopology.schema.ts 校验，实现引擎无关的事实来源（Story 57.1）
// 运行时函数（hasRelation 等）保留在本文件，PositionRelation enum 保留为运行时类型
// ============================================

import { ADJACENT_KEYS, KEYS, PUNCTUATION_KEYS } from '../core/constants';
import { KEYBOARD_TOPOLOGY_DATA } from './schemas/keyboardTopology.schema';

// === 位置关系枚举 ===
export enum PositionRelation {
  Adjacent = 'adjacent',
  SameRow = 'sameRow',
  SameColumn = 'sameColumn',
  SameHand = 'sameHand',
  SameFinger = 'sameFinger',
  Symmetric = 'symmetric',
}

// === 技能级 posRel 锚（trigger / scope 各自统一）===
// 同一技能上所有「拓扑型」trigger（on_fire{posRel}）各自统一到 triggerPosAnchor，
// 所有「拓扑型」scope（neighbors{posRel}）各自统一到 scopePosAnchor —— 两锚相互独立。
// 由 skillId 确定性派生（FNV-1a 哈希），跨存档稳定、无需持久化、无 roll-timing 问题。
// self / matched_* / all_skills / hasted / marked 等非拓扑作用域不受影响。
const _POSREL_ANCHOR_VALUES: readonly PositionRelation[] = [
  PositionRelation.Adjacent, PositionRelation.SameRow, PositionRelation.SameColumn,
  PositionRelation.SameHand, PositionRelation.SameFinger, PositionRelation.Symmetric,
];
function _hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
/** 技能 scope 邻位锚 · 该技能所有 neighbors 作用域统一用此 posRel */
export function scopePosAnchor(skillId: string): PositionRelation {
  return _POSREL_ANCHOR_VALUES[_hashStr(skillId + '·scope') % _POSREL_ANCHOR_VALUES.length];
}
/** 技能 trigger 邻位锚 · 该技能所有 on_fire{posRel} 统一用此 posRel（与 scope 锚独立）*/
export function triggerPosAnchor(skillId: string): PositionRelation {
  return _POSREL_ANCHOR_VALUES[_hashStr(skillId + '·trigger') % _POSREL_ANCHOR_VALUES.length];
}

// === 静态拓扑表（来自 JSON，schema 校验后冻结） ===
export const COLUMN_MAP: Readonly<Record<string, number>> = KEYBOARD_TOPOLOGY_DATA.columnMap;
export const ROW_MAP: Readonly<Record<string, number>> = KEYBOARD_TOPOLOGY_DATA.rowMap;
export const HAND_MAP: Readonly<Record<string, 'left' | 'right'>> = KEYBOARD_TOPOLOGY_DATA.handMap;
export const FINGER_MAP: Readonly<Record<string, number>> = KEYBOARD_TOPOLOGY_DATA.fingerMap;
export const SYMMETRIC_PAIRS: Readonly<Record<string, string>> = KEYBOARD_TOPOLOGY_DATA.symmetricPairs;

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

// === 有效键集合（26 字母键 + 4 标点键） ===
const VALID_KEYS = new Set([...KEYS, ...PUNCTUATION_KEYS]);

// === 核心查询 API ===

/** 检查两键之间是否存在指定关系 */
export function hasRelation(keyA: string, keyB: string, relation: PositionRelation): boolean {
  return RELATION_CHECKERS[relation](keyA, keyB);
}

/** 返回两键之间所有成立的位置关系 */
export function getRelations(keyA: string, keyB: string): PositionRelation[] {
  const a = normalize(keyA);
  const b = normalize(keyB);
  if (a === b || !VALID_KEYS.has(a) || !VALID_KEYS.has(b)) return [];
  const result: PositionRelation[] = [];
  for (const relation of Object.values(PositionRelation)) {
    if (RELATION_CHECKERS[relation](a, b)) {
      result.push(relation);
    }
  }
  return result;
}

/** 检查键是否在主行（ASDFGHJKL，ROW_MAP === 1） */
export function isHomeRow(key: string): boolean {
  return ROW_MAP[normalize(key)] === 1;
}

/** 检查技能是否孤立（无相邻技能，连通分量 === 1） */
export function isIsolatedSkill(key: string, bindings: Map<string, string>): boolean {
  const k = normalize(key);
  if (!k || !(k in ADJACENT_KEYS)) return false;
  const adjacent = ADJACENT_KEYS[k];
  const bindingKeys = new Set([...bindings.keys()].map(x => x.toLowerCase()));
  return adjacent.every(adj => !bindingKeys.has(adj));
}

/** 检查技能是否在配对中（连通分量大小恰好 === 2） */
export function isInPair(key: string, bindings: Map<string, string>): boolean {
  const k = normalize(key);
  const skillKeys = new Set([...bindings.keys()].map(x => x.toLowerCase()));
  if (!skillKeys.has(k)) return false;
  const visited = new Set<string>([k]);
  const queue = [k];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    for (const adj of (ADJACENT_KEYS[curr] || [])) {
      if (skillKeys.has(adj) && !visited.has(adj)) {
        visited.add(adj);
        queue.push(adj);
      }
    }
  }
  return visited.size === 2;
}

/** 返回与指定键有某种关系的所有键 */
export function getKeysWithRelation(key: string, relation: PositionRelation): string[] {
  const k = normalize(key);
  if (!VALID_KEYS.has(k)) return [];
  const checker = RELATION_CHECKERS[relation];
  const allKeys = [...VALID_KEYS];
  return allKeys.filter(other => other !== k && checker(k, other));
}
