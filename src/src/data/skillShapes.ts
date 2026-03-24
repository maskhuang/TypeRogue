// ============================================
// 打字肉鸽 - Polyomino 技能形状系统
// ============================================
// Story 40.1: 形状数据模型
// Epic 40: 多格技能形状系统

import { ADJACENT_KEYS, KEYBOARD_ROWS, PUNCTUATION_KEYBOARD_EXTENSION } from '../core/constants'
import type { SkillRarity } from './affixes'

// ===== 形状模板接口 =====

export interface ShapeTemplate {
  /** 形状唯一 ID，如 'monomino', 'domino', 'triomino_I' */
  id: string
  /** 基本形状的 cell 偏移 [[row, col], ...]，[0,0] 为锚点 */
  cells: [number, number][]
  /** 所有去重旋转态（含 rotation=0 的基本态） */
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

/** 计算一个形状的所有去重旋转态 */
function computeUniqueRotations(baseCells: [number, number][]): [number, number][][] {
  const rotations: [number, number][][] = []
  let current = normalizeCells(baseCells)
  for (let r = 0; r < 4; r++) {
    const isDuplicate = rotations.some(existing => cellsEqual(existing, current))
    if (!isDuplicate) {
      rotations.push(current)
    }
    current = rotateShape90(current)
  }
  return rotations
}

// ===== 形状模板定义 =====

function defineShape(id: string, baseCells: [number, number][]): ShapeTemplate {
  const cells = normalizeCells(baseCells)
  const rotations = computeUniqueRotations(cells)
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

// ===== 键盘坐标系统 =====

/** 行偏移量（QWERTY 标准 stagger） */
const ROW_OFFSETS = [0, 0.25, 0.75]

/**
 * 构建完整键盘行（含标点扩展）
 */
function buildFullRows(): string[][] {
  return KEYBOARD_ROWS.map((row, i) => {
    const ext = PUNCTUATION_KEYBOARD_EXTENSION[i]
    return ext ? [...row, ...ext] : [...row]
  })
}

const FULL_ROWS = buildFullRows()

/**
 * 键 → [row, col]（col 含 stagger 偏移）
 */
export const KEY_COORDS: Record<string, [number, number]> = {}

// 初始化坐标映射
for (let r = 0; r < FULL_ROWS.length; r++) {
  for (let c = 0; c < FULL_ROWS[r].length; c++) {
    const key = FULL_ROWS[r][c]
    KEY_COORDS[key] = [r, c + ROW_OFFSETS[r]]
  }
}

// ===== 键盘映射函数 =====

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

/**
 * 验证一组键位是否通过 ADJACENT_KEYS 全连通（BFS）
 */
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

/**
 * 将形状映射到键盘上的实际键位。
 *
 * @param anchorKey 锚点键（形状 cells[0]（排序后最左上 cell）对应的键）
 * @param shapeId 形状模板 ID
 * @param rotation 旋转次数（0~3）
 * @returns 映射到的键位数组（含锚点），或 null（放不下/越界/不连通）
 */
export function mapShapeToKeys(
  anchorKey: string,
  shapeId: string,
  rotation: number,
): string[] | null {
  const template = SHAPE_TEMPLATES[shapeId]
  if (!template) return null

  const anchorCoord = KEY_COORDS[anchorKey]
  if (!anchorCoord) return null

  // 获取旋转后的 cells
  const rotIdx = ((rotation % 4) + 4) % 4
  const cells = rotIdx < template.rotations.length
    ? template.rotations[rotIdx]
    : rotateShape(template.cells, rotIdx)

  const keys: string[] = []
  const keySet = new Set<string>()

  // 锚点在 cells 中是 [0,0]（标准化后 min=0）
  // 找到 cells 中 [0,0] 的偏移量（即 cells[0] 不一定是 [0,0]）
  // 标准化保证 min row=0, min col=0，但 [0,0] 不一定在 cells 中
  // 锚点对应 cells 中的第一个 cell（排序后最小的）
  const baseCellRow = cells[0][0]
  const baseCellCol = cells[0][1]

  for (const [dr, dc] of cells) {
    const targetRow = anchorCoord[0] + (dr - baseCellRow)
    const targetCol = anchorCoord[1] + (dc - baseCellCol)

    const key = findClosestKeyInRow(targetRow, targetCol)
    if (!key) return null
    if (keySet.has(key)) return null  // 两个 cell 映射到同一键
    keys.push(key)
    keySet.add(key)
  }

  // 验证 ADJACENT_KEYS 连通性
  if (!areKeysConnected(keys)) return null

  return keys
}

/**
 * 获取形状在指定旋转态下的 cells（返回浅拷贝，安全可变）
 */
export function getShapeCells(shapeId: string, rotation: number): [number, number][] | null {
  const template = SHAPE_TEMPLATES[shapeId]
  if (!template) return null
  const rotIdx = ((rotation % 4) + 4) % 4
  const cells = rotIdx < template.rotations.length
    ? template.rotations[rotIdx]
    : rotateShape(template.cells, rotIdx)
  return cells.map(c => [...c] as [number, number])
}
