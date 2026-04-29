// ============================================
// 打字肉鸽 - Polyomino 技能形状系统
// ============================================
// Story 40.1: 形状数据模型
// Epic 40: 多格技能形状系统
// Story 60.1 follow-up (review): placeability filter — 排除算法生成但
// QWERTY 物理键盘上无法放下的"理论旋转"，避免主斜 domino 在顶行 fail 等 bug

import { ADJACENT_KEYS, KEYBOARD_ROWS, PUNCTUATION_KEYBOARD_EXTENSION, PUNCTUATION_KEYS } from '../core/constants'
import type { SkillRarity } from './affixes'

// ===== 形状模板接口 =====

export interface ShapeTemplate {
  /** 形状唯一 ID，如 'monomino', 'domino', 'triomino_I' */
  id: string
  /** 基本形状的 cell 偏移 [[row, col], ...]，[0,0] 为锚点 */
  cells: [number, number][]
  /** 所有去重旋转态（含 rotation=0 的基本态），已经经过 placeability filter */
  rotations: [number, number][][]
}

// ===== 旋转函数 =====

/**
 * 单次 90° 顺时针旋转：[r, c] → [c, -r]
 * 旋转后标准化到非负坐标（平移到最小 row/col = 0）
 */
export function rotateShape90(cells: [number, number][]): [number, number][] {
  const rotated = cells.map(([r, c]) => [c, -r] as [number, number])
  return normalizeCells(rotated)
}

/**
 * 旋转 N 次（N mod 4）
 */
export function rotateShape(cells: [number, number][], times: number): [number, number][] {
  const n = ((times % 4) + 4) % 4
  let result = cells
  for (let i = 0; i < n; i++) {
    result = rotateShape90(result)
  }
  return result
}

/**
 * 标准化 cells：平移使 min(row)=0, min(col)=0，并按 row,col 排序
 */
export function normalizeCells(cells: [number, number][]): [number, number][] {
  if (cells.length === 0) return []
  const minR = Math.min(...cells.map(c => c[0]))
  const minC = Math.min(...cells.map(c => c[1]))
  return cells
    .map(([r, c]) => [r - minR, c - minC] as [number, number])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])
}

/** 检查两组已标准化的 cells 是否相同 */
function cellsEqual(a: [number, number][], b: [number, number][]): boolean {
  if (a.length !== b.length) return false
  return a.every((cell, i) => cell[0] === b[i][0] && cell[1] === b[i][1])
}

/**
 * 计算一个形状的所有去重旋转态（含 stagger 补偿变体）。
 *
 * QWERTY 键盘行间有 stagger 偏移，纯正交旋转无法覆盖
 * 所有实际相邻方向（如 P+L 需要左下对角）。
 * 对每个跨行旋转态生成 skew 变体（col -= row），
 * 再旋转该变体，以产生对角方向的朝向。
 *
 * 注意：本函数会生成"理论旋转"，部分变体在 QWERTY 上根本无 anchor 可放下。
 * 由 filterPlaceableRotations 在 defineShape 时清掉。
 */
function computeUniqueRotations(baseCells: [number, number][]): [number, number][][] {
  const maxRows = KEYBOARD_ROWS.length // 键盘行数（3）
  const rotations: [number, number][][] = []
  const addVariant = (cells: [number, number][]) => {
    const norm = normalizeCells(cells)
    // 跳过跨行数超过键盘行数的变体（放不下）
    const rowSpan = Math.max(...norm.map(c => c[0])) - Math.min(...norm.map(c => c[0])) + 1
    if (rowSpan > maxRows) return
    if (!rotations.some(existing => cellsEqual(existing, norm))) {
      rotations.push(norm)
    }
  }

  // Phase 1: 标准 4 旋转
  let current = normalizeCells(baseCells)
  for (let r = 0; r < 4; r++) {
    addVariant(current)
    current = rotateShape90(current)
  }

  // Phase 2: 跨行旋转态的 stagger 补偿 + 再旋转
  const standardCount = rotations.length
  for (let i = 0; i < standardCount; i++) {
    const cells = rotations[i]
    const rows = new Set(cells.map(c => c[0]))
    if (rows.size <= 1) continue // 单行形态无需补偿
    const skewed = cells.map(([row, col]) => [row, col - row] as [number, number])
    let cur = normalizeCells(skewed)
    for (let r = 0; r < 4; r++) {
      addVariant(cur)
      cur = rotateShape90(cur)
    }
  }

  return rotations
}

// ===== 键盘坐标系统 =====
// 必须在 SHAPE_TEMPLATES 之前初始化，因为 defineShape 内的 placeability filter 要用

/** 行偏移量（QWERTY 标准 stagger） */
const ROW_OFFSETS = [0, 0.25, 0.75]

/** 构建完整键盘行（含标点扩展） */
function buildFullRows(): string[][] {
  return KEYBOARD_ROWS.map((row, i) => {
    const ext = PUNCTUATION_KEYBOARD_EXTENSION[i]
    return ext ? [...row, ...ext] : [...row]
  })
}

const FULL_ROWS = buildFullRows()

/** 键 → [row, col]（col 含 stagger 偏移） */
export const KEY_COORDS: Record<string, [number, number]> = {}
for (let r = 0; r < FULL_ROWS.length; r++) {
  for (let c = 0; c < FULL_ROWS[r].length; c++) {
    const key = FULL_ROWS[r][c]
    KEY_COORDS[key] = [r, c + ROW_OFFSETS[r]]
  }
}

/** 标点键集合（无标点解放遗物时形状不得延伸到这里） */
const PUNCTUATION_SET = new Set(PUNCTUATION_KEYS)

// ===== 键盘映射底层函数 =====

/**
 * 在指定行中找到最接近目标 col（含 stagger）的键
 * 返回 key 或 null
 */
function findClosestKeyInRow(targetRow: number, targetCol: number): string | null {
  if (targetRow < 0 || targetRow >= FULL_ROWS.length) return null
  const row = FULL_ROWS[targetRow]
  const offset = ROW_OFFSETS[targetRow]

  let bestKey: string | null = null
  let bestDist = Infinity

  for (let c = 0; c < row.length; c++) {
    const actualCol = c + offset
    const dist = Math.abs(actualCol - targetCol)
    if (dist < bestDist) {
      bestDist = dist
      bestKey = row[c]
    }
  }

  // 接受误差 ≤ 0.75 的匹配（QWERTY stagger: home→bottom 偏移差可达 0.5，top→bottom 达 0.75）
  // ADJACENT_KEYS 连通性检查会过滤掉错误匹配
  if (bestDist > 0.75) return null
  return bestKey
}

/** 验证一组键位是否通过 ADJACENT_KEYS 全连通（BFS） */
export function areKeysConnected(keys: string[]): boolean {
  if (keys.length <= 1) return true
  const keySet = new Set(keys)
  const visited = new Set<string>()
  const queue = [keys[0]]
  visited.add(keys[0])

  while (queue.length > 0) {
    const current = queue.shift()!
    const neighbors = ADJACENT_KEYS[current] || []
    for (const n of neighbors) {
      if (keySet.has(n) && !visited.has(n)) {
        visited.add(n)
        queue.push(n)
      }
    }
  }

  return visited.size === keySet.size
}

// ===== Placeability filter（Story 60.1 follow-up）=====
// 排除两类"理论影子" rotation：
//   1. 全键盘几乎放不下（< MIN_ANCHORS_TOTAL，主要是 0-1/26 的算法变体）
//   2. 顶行 anchor 全 fail 的 rotation，如 domino 主斜 [[0,0],[1,1]]
//      只在 home 行能用 → top 行 0 anchor，导致"QWER 顶行无法放置主斜 domino"bug
//
// 不要求 home / bot 都能放（vertical 3-cell 只能从顶行 anchor 出发是合理的）。

/** 一个 rotation 至少要在 N 个字母键 anchor 上能放下，否则视为"算法影子" */
const MIN_ANCHORS_TOTAL = 5

/** 顶行（QWERTY）至少要有 N 个 anchor 能放下，避免主斜 domino "顶行不可用" 问题 */
const MIN_TOP_ROW_ANCHORS = 1

/**
 * 检查给定 cells 集合（已标准化）是否能在指定 anchor 落下。
 * 与 mapShapeToKeys 的几何/连通逻辑等价，但接受 cells 直接传入（避免依赖 SHAPE_TEMPLATES）。
 */
function isCellsPlaceableAt(cells: [number, number][], anchorKey: string): boolean {
  const anchorCoord = KEY_COORDS[anchorKey]
  if (!anchorCoord) return false

  const baseCellRow = cells[0][0]
  const baseCellCol = cells[0][1]
  const keys: string[] = []
  const keySet = new Set<string>()

  for (const [dr, dc] of cells) {
    const targetRow = anchorCoord[0] + (dr - baseCellRow)
    const targetCol = anchorCoord[1] + (dc - baseCellCol)
    const key = findClosestKeyInRow(targetRow, targetCol)
    if (!key) return false
    if (PUNCTUATION_SET.has(key)) return false // 用字母键 anchor 检查，不允许延伸到标点
    if (keySet.has(key)) return false
    keys.push(key)
    keySet.add(key)
  }

  return areKeysConnected(keys)
}

/**
 * 过滤掉算法生成但物理键盘上无法在足够 anchor 放下的"理论旋转"。
 * 双门槛：≥ MIN_ANCHORS_TOTAL 字母键 anchor 总数 + ≥ MIN_TOP_ROW_ANCHORS 顶行 anchor 数。
 */
function filterPlaceableRotations(rotations: [number, number][][]): [number, number][][] {
  const filtered = rotations.filter(cells => {
    let total = 0
    let topRowAnchors = 0
    for (let r = 0; r < KEYBOARD_ROWS.length; r++) {
      for (const k of KEYBOARD_ROWS[r]) {
        if (isCellsPlaceableAt(cells, k)) {
          total++
          if (r === 0) topRowAnchors++
        }
      }
    }
    return total >= MIN_ANCHORS_TOTAL && topRowAnchors >= MIN_TOP_ROW_ANCHORS
  })
  // 安全网：filter 不应清空所有 rotations；意外清空则保留第 1 个（算法稳定性）
  return filtered.length > 0 ? filtered : [rotations[0]]
}

// ===== 形状模板定义 =====

function defineShape(id: string, baseCells: [number, number][]): ShapeTemplate {
  const cells = normalizeCells(baseCells)
  const rotations = filterPlaceableRotations(computeUniqueRotations(cells))
  return { id, cells, rotations }
}

// --- Monomino (1 cell, rarity 0) ---
const MONOMINO = defineShape('monomino', [[0, 0]])

// --- Domino (2 cells, rarity 1) ---
const DOMINO = defineShape('domino', [[0, 0], [0, 1]])

// --- Triomino (3 cells, rarity 2) ---
const TRIOMINO_I = defineShape('triomino_I', [[0, 0], [0, 1], [0, 2]])
const TRIOMINO_L = defineShape('triomino_L', [[0, 0], [0, 1], [1, 0]])

// --- Tetromino (4 cells, rarity 3) ---
const TETROMINO_T = defineShape('tetromino_T', [[0, 0], [0, 1], [0, 2], [1, 1]])
const TETROMINO_L = defineShape('tetromino_L', [[0, 0], [0, 1], [0, 2], [1, 0]])
const TETROMINO_J = defineShape('tetromino_J', [[0, 0], [0, 1], [0, 2], [1, 2]])
const TETROMINO_S = defineShape('tetromino_S', [[0, 1], [0, 2], [1, 0], [1, 1]])
const TETROMINO_Z = defineShape('tetromino_Z', [[0, 0], [0, 1], [1, 1], [1, 2]])
const TETROMINO_I = defineShape('tetromino_I', [[0, 0], [0, 1], [0, 2], [0, 3]])
const TETROMINO_O = defineShape('tetromino_O', [[0, 0], [0, 1], [1, 0], [1, 1]])

// ===== 导出形状模板表 =====

export const SHAPE_TEMPLATES: Record<string, ShapeTemplate> = {
  monomino: MONOMINO,
  domino: DOMINO,
  triomino_I: TRIOMINO_I,
  triomino_L: TRIOMINO_L,
  tetromino_T: TETROMINO_T,
  tetromino_L: TETROMINO_L,
  tetromino_J: TETROMINO_J,
  tetromino_S: TETROMINO_S,
  tetromino_Z: TETROMINO_Z,
  tetromino_I: TETROMINO_I,
  tetromino_O: TETROMINO_O,
}

/** 稀有度 → 可选形状 ID 池 */
export const RARITY_TO_SHAPE_POOL: Record<SkillRarity, string[]> = {
  0: ['monomino'],
  1: ['domino'],
  2: ['triomino_I', 'triomino_L'],
  3: ['tetromino_T', 'tetromino_L', 'tetromino_J', 'tetromino_S', 'tetromino_Z', 'tetromino_I', 'tetromino_O'],
}

// ===== 公共 API =====

/**
 * 将形状映射到键盘上的实际键位。
 *
 * @param anchorKey 锚点键（形状 cells[0]（排序后最左上 cell）对应的键）
 * @param shapeId 形状模板 ID
 * @param rotation 旋转次数（自动 wrap 到有效范围）
 * @returns 映射到的键位数组（含锚点），或 null（放不下/越界/不连通）
 */
export function mapShapeToKeys(
  anchorKey: string,
  shapeId: string,
  rotation: number,
  allowPunctuation: boolean = false,
): string[] | null {
  const template = SHAPE_TEMPLATES[shapeId]
  if (!template) return null

  const anchorCoord = KEY_COORDS[anchorKey]
  if (!anchorCoord) return null

  // 获取旋转后的 cells（modulo wrap 兼容老存档存的旋转 index 大于新 rotCount 的情况）
  const rotCount = template.rotations.length
  const rotIdx = ((rotation % rotCount) + rotCount) % rotCount
  const cells = template.rotations[rotIdx]

  const keys: string[] = []
  const keySet = new Set<string>()

  // 锚点对应 cells 中的第一个 cell（排序后最小的）
  const baseCellRow = cells[0][0]
  const baseCellCol = cells[0][1]

  for (const [dr, dc] of cells) {
    const targetRow = anchorCoord[0] + (dr - baseCellRow)
    const targetCol = anchorCoord[1] + (dc - baseCellCol)

    const key = findClosestKeyInRow(targetRow, targetCol)
    if (!key) return null
    // 无标点解放遗物时，形状不得延伸到标点键
    if (!allowPunctuation && PUNCTUATION_SET.has(key)) return null
    if (keySet.has(key)) return null  // 两个 cell 映射到同一键
    keys.push(key)
    keySet.add(key)
  }

  // 验证 ADJACENT_KEYS 连通性
  if (!areKeysConnected(keys)) return null

  return keys
}

/** 获取形状的有效旋转态数量（已经过 placeability filter） */
export function getShapeRotationCount(shapeId: string): number {
  return SHAPE_TEMPLATES[shapeId]?.rotations.length ?? 1
}

/**
 * 获取形状在指定旋转态下的 cells（返回浅拷贝，安全可变）
 * 自动 modulo wrap rotation index 以兼容老存档
 */
export function getShapeCells(shapeId: string, rotation: number): [number, number][] | null {
  const template = SHAPE_TEMPLATES[shapeId]
  if (!template) return null
  const rotCount = template.rotations.length
  const rotIdx = ((rotation % rotCount) + rotCount) % rotCount
  const cells = template.rotations[rotIdx]
  return cells.map(c => [...c] as [number, number])
}

/**
 * 把任意 rotation 整数规范化到当前 shape 的有效范围 [0, rotCount)。
 * 用于反序列化迁移：老存档可能存有被 placeability filter 移除的 rotation index，
 * 在 deserializeSkill 时调用以保证后续读写一致。
 */
export function normalizeRotation(shapeId: string, rotation: number): number {
  const rotCount = getShapeRotationCount(shapeId)
  if (rotCount <= 0) return 0
  return ((rotation % rotCount) + rotCount) % rotCount
}
