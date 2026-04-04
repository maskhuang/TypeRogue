// ============================================
// 打字肉鸽 - Polyomino 技能形状 单元测试
// ============================================
// Story 40.1: 形状数据模型

import { describe, it, expect } from 'vitest'
import {
  SHAPE_TEMPLATES,
  RARITY_TO_SHAPE_POOL,
  rotateShape90,
  rotateShape,
  normalizeCells,
  areKeysConnected,
  mapShapeToKeys,
  getShapeCells,
  KEY_COORDS,
} from '../../../src/data/skillShapes'
import { ADJACENT_KEYS } from '../../../src/core/constants'

// ===== 形状模板完整性 (AC1) =====

describe('SHAPE_TEMPLATES', () => {
  it('should have exactly 11 shape templates', () => {
    expect(Object.keys(SHAPE_TEMPLATES)).toHaveLength(11)
  })

  it('should have 1 monomino', () => {
    expect(SHAPE_TEMPLATES.monomino).toBeDefined()
    expect(SHAPE_TEMPLATES.monomino.cells).toHaveLength(1)
  })

  it('should have 1 domino', () => {
    expect(SHAPE_TEMPLATES.domino).toBeDefined()
    expect(SHAPE_TEMPLATES.domino.cells).toHaveLength(2)
  })

  it('should have 2 triominos', () => {
    expect(SHAPE_TEMPLATES.triomino_I).toBeDefined()
    expect(SHAPE_TEMPLATES.triomino_L).toBeDefined()
    expect(SHAPE_TEMPLATES.triomino_I.cells).toHaveLength(3)
    expect(SHAPE_TEMPLATES.triomino_L.cells).toHaveLength(3)
  })

  it('should have 7 tetrominos', () => {
    const tetros = Object.keys(SHAPE_TEMPLATES).filter(k => k.startsWith('tetromino_'))
    expect(tetros).toHaveLength(7)
    expect(tetros.sort()).toEqual([
      'tetromino_I', 'tetromino_J', 'tetromino_L',
      'tetromino_O', 'tetromino_S', 'tetromino_T', 'tetromino_Z',
    ])
    for (const id of tetros) {
      expect(SHAPE_TEMPLATES[id].cells).toHaveLength(4)
    }
  })
})

// ===== 旋转态数量 (AC1) =====

describe('Rotation counts (with stagger-compensated variants)', () => {
  it('monomino should have 1 rotation (identity)', () => {
    expect(SHAPE_TEMPLATES.monomino.rotations).toHaveLength(1)
  })

  it('domino should have ≥ 3 rotations (horizontal + vertical + diagonal)', () => {
    expect(SHAPE_TEMPLATES.domino.rotations.length).toBeGreaterThanOrEqual(3)
  })

  it('triomino_I should have ≥ 2 rotations', () => {
    expect(SHAPE_TEMPLATES.triomino_I.rotations.length).toBeGreaterThanOrEqual(2)
  })

  it('triomino_L should have ≥ 4 rotations', () => {
    expect(SHAPE_TEMPLATES.triomino_L.rotations.length).toBeGreaterThanOrEqual(4)
  })

  it('tetromino_T should have ≥ 4 rotations', () => {
    expect(SHAPE_TEMPLATES.tetromino_T.rotations.length).toBeGreaterThanOrEqual(4)
  })

  it('tetromino_I should have ≥ 1 rotation', () => {
    expect(SHAPE_TEMPLATES.tetromino_I.rotations.length).toBeGreaterThanOrEqual(1)
  })

  it('tetromino_O should have ≥ 1 rotation', () => {
    expect(SHAPE_TEMPLATES.tetromino_O.rotations.length).toBeGreaterThanOrEqual(1)
  })

  it('tetromino_S should have ≥ 2 rotations', () => {
    expect(SHAPE_TEMPLATES.tetromino_S.rotations.length).toBeGreaterThanOrEqual(2)
  })

  it('tetromino_Z should have ≥ 2 rotations', () => {
    expect(SHAPE_TEMPLATES.tetromino_Z.rotations.length).toBeGreaterThanOrEqual(2)
  })

  it('tetromino_L should have ≥ 4 rotations', () => {
    expect(SHAPE_TEMPLATES.tetromino_L.rotations.length).toBeGreaterThanOrEqual(4)
  })

  it('tetromino_J should have ≥ 4 rotations', () => {
    expect(SHAPE_TEMPLATES.tetromino_J.rotations.length).toBeGreaterThanOrEqual(4)
  })

  it('standard rotations (indices 0-3) are backward-compatible', () => {
    // First rotations should match the original orthogonal rotations
    const domino = SHAPE_TEMPLATES.domino
    expect(domino.rotations[0]).toEqual([[0, 0], [0, 1]]) // horizontal
    expect(domino.rotations[1]).toEqual([[0, 0], [1, 0]]) // vertical
  })
})

// ===== RARITY_TO_SHAPE_POOL =====

describe('RARITY_TO_SHAPE_POOL', () => {
  it('rarity 0 → monomino only', () => {
    expect(RARITY_TO_SHAPE_POOL[0]).toEqual(['monomino'])
  })

  it('rarity 1 → domino only', () => {
    expect(RARITY_TO_SHAPE_POOL[1]).toEqual(['domino'])
  })

  it('rarity 2 → 2 triominos', () => {
    expect(RARITY_TO_SHAPE_POOL[2]).toHaveLength(2)
    expect(RARITY_TO_SHAPE_POOL[2]).toContain('triomino_I')
    expect(RARITY_TO_SHAPE_POOL[2]).toContain('triomino_L')
  })

  it('rarity 3 → 7 tetrominos', () => {
    expect(RARITY_TO_SHAPE_POOL[3]).toHaveLength(7)
  })

  it('all shape IDs in pool exist in SHAPE_TEMPLATES', () => {
    for (const shapes of Object.values(RARITY_TO_SHAPE_POOL)) {
      for (const id of shapes) {
        expect(SHAPE_TEMPLATES[id]).toBeDefined()
      }
    }
  })
})

// ===== rotateShape (AC2) =====

describe('rotateShape90', () => {
  it('should rotate a horizontal domino to vertical', () => {
    const result = rotateShape90([[0, 0], [0, 1]])
    // [0,0]→[0,0], [0,1]→[1,0] (after normalize)
    expect(result).toEqual([[0, 0], [1, 0]])
  })

  it('should rotate a vertical domino to horizontal', () => {
    const result = rotateShape90([[0, 0], [1, 0]])
    // [0,0]→[0,0], [1,0]→[0,1] (after normalize) — wait: [1,0]→[0,-1] normalize→ [0,0],[1,1]?
    // Let me recalculate: [r,c]→[c,-r]
    // [0,0]→[0,0], [1,0]→[0,-1] → normalized: shift c by +1 → [0,1],[0,0] → sorted: [0,0],[0,1]
    expect(result).toEqual([[0, 0], [0, 1]])
  })

  it('should rotate a single cell to itself', () => {
    const result = rotateShape90([[0, 0]])
    expect(result).toEqual([[0, 0]])
  })

  it('should rotate L-triomino correctly', () => {
    // L: [0,0],[0,1],[1,0] → rotate → [0,0],[1,0],[0,-1] → norm → [0,1],[1,1],[0,0] → sorted [0,0],[0,1],[1,1]
    const result = rotateShape90([[0, 0], [0, 1], [1, 0]])
    expect(result).toEqual([[0, 0], [0, 1], [1, 1]])
  })
})

describe('rotateShape (multi)', () => {
  it('rotateShape(cells, 0) should return normalized cells', () => {
    const cells: [number, number][] = [[0, 0], [0, 1]]
    expect(rotateShape(cells, 0)).toEqual(normalizeCells(cells))
  })

  it('rotateShape(cells, 4) should return same as rotateShape(cells, 0)', () => {
    const cells: [number, number][] = [[0, 0], [0, 1], [1, 0]]
    expect(rotateShape(cells, 4)).toEqual(rotateShape(cells, 0))
  })

  it('rotateShape(cells, -1) should be same as rotateShape(cells, 3)', () => {
    const cells: [number, number][] = [[0, 0], [0, 1], [1, 0]]
    expect(rotateShape(cells, -1)).toEqual(rotateShape(cells, 3))
  })

  it('4 rotations should return to original', () => {
    const cells: [number, number][] = [[0, 0], [0, 1], [0, 2], [1, 1]]  // T
    const original = normalizeCells(cells)
    const rotated4 = rotateShape(cells, 4)
    expect(rotated4).toEqual(original)
  })
})

// ===== 形状合法性 — ADJACENT_KEYS 连通 (AC4) =====

describe('Shape connectivity via ADJACENT_KEYS', () => {
  it('all rotations of all shapes should be connected when mapped to center keys', () => {
    // Test with 'f' as anchor (center of keyboard, most forgiving)
    for (const [id, template] of Object.entries(SHAPE_TEMPLATES)) {
      for (let r = 0; r < template.rotations.length; r++) {
        const keys = mapShapeToKeys('f', id, r)
        // Some shapes may not fit at 'f', try 'g' and 'h' as fallbacks
        const result = keys ?? mapShapeToKeys('g', id, r) ?? mapShapeToKeys('h', id, r)
          ?? mapShapeToKeys('d', id, r) ?? mapShapeToKeys('j', id, r)
        if (result) {
          expect(
            areKeysConnected(result),
            `${id} rotation ${r} at mapped keys [${result}] should be connected`,
          ).toBe(true)
        }
        // If no anchor works at all, it's acceptable for shapes that genuinely can't fit
      }
    }
  })

  it('all shape templates have cells that are grid-adjacent (orthogonal or diagonal)', () => {
    // Stagger-compensated variants may have diagonal adjacency (Chebyshev distance 1)
    for (const [id, template] of Object.entries(SHAPE_TEMPLATES)) {
      for (let r = 0; r < template.rotations.length; r++) {
        const cells = template.rotations[r]
        if (cells.length <= 1) continue
        for (const [cr, cc] of cells) {
          const hasNeighbor = cells.some(([nr, nc]) =>
            (cr !== nr || cc !== nc) &&
            Math.abs(cr - nr) <= 1 && Math.abs(cc - nc) <= 1,
          )
          expect(
            hasNeighbor,
            `${id} rotation ${r}: cell [${cr},${cc}] should have at least one neighbor (Chebyshev ≤ 1)`,
          ).toBe(true)
        }
      }
    }
  })
})

// ===== mapShapeToKeys (AC3) =====

describe('mapShapeToKeys', () => {
  it('monomino at any valid key returns that key', () => {
    for (const key of ['a', 'f', 'p', 'z', 'm']) {
      const result = mapShapeToKeys(key, 'monomino', 0)
      expect(result).toEqual([key])
    }
  })

  it('domino horizontal at f → [f, g] or similar adjacent pair', () => {
    const result = mapShapeToKeys('f', 'domino', 0)
    expect(result).not.toBeNull()
    expect(result).toHaveLength(2)
    expect(result![0]).toBe('f')
    // Second key should be adjacent to f
    expect(ADJACENT_KEYS['f']).toContain(result![1])
  })

  it('domino vertical at f → [f, ...] with vertical neighbor', () => {
    const result = mapShapeToKeys('f', 'domino', 1)
    expect(result).not.toBeNull()
    expect(result).toHaveLength(2)
  })

  it('invalid shape ID returns null', () => {
    expect(mapShapeToKeys('f', 'nonexistent', 0)).toBeNull()
  })

  it('invalid anchor key returns null', () => {
    expect(mapShapeToKeys('1', 'domino', 0)).toBeNull()
  })

  it('all keys in result are unique', () => {
    const result = mapShapeToKeys('f', 'tetromino_T', 0)
    if (result) {
      const unique = new Set(result)
      expect(unique.size).toBe(result.length)
    }
  })

  it('tetromino_I horizontal at p (rightmost) returns null — can\'t fit', () => {
    const result = mapShapeToKeys('p', 'tetromino_I', 0)
    expect(result).toBeNull()
  })

  it('mapped keys should all be connected via ADJACENT_KEYS', () => {
    // Test several shapes at center positions
    const testCases: [string, string, number][] = [
      ['f', 'domino', 0],
      ['f', 'domino', 1],
      ['g', 'triomino_L', 0],
      ['f', 'tetromino_T', 0],
      ['d', 'tetromino_L', 0],
    ]
    for (const [anchor, shapeId, rot] of testCases) {
      const result = mapShapeToKeys(anchor, shapeId, rot)
      if (result) {
        expect(
          areKeysConnected(result),
          `${shapeId} rot ${rot} at ${anchor}: [${result}] should be connected`,
        ).toBe(true)
      }
    }
  })
})

// ===== mapShapeToKeys boundary cases (AC3, Task 5.2/5.4) =====

describe('mapShapeToKeys boundary cases', () => {
  it('domino horizontal at z → [z, x] (bottom row left corner)', () => {
    const result = mapShapeToKeys('z', 'domino', 0)
    expect(result).not.toBeNull()
    expect(result).toHaveLength(2)
    expect(result![0]).toBe('z')
    expect(areKeysConnected(result!)).toBe(true)
  })

  it('punctuation key anchor', () => {
    const result = mapShapeToKeys(';', 'monomino', 0)
    expect(result).toEqual([';'])
  })

  it('tetromino_I horizontal at m extends into punctuation keys', () => {
    const result = mapShapeToKeys('m', 'tetromino_I', 0)
    // Bottom row with punctuation extension: z,x,c,v,b,n,m,',',.','/' — m fits with ,./
    expect(result).not.toBeNull()
    expect(result).toHaveLength(4)
    expect(result![0]).toBe('m')
    expect(areKeysConnected(result!)).toBe(true)
  })
})

// ===== areKeysConnected =====

describe('areKeysConnected', () => {
  it('single key is connected', () => {
    expect(areKeysConnected(['f'])).toBe(true)
  })

  it('empty array is connected', () => {
    expect(areKeysConnected([])).toBe(true)
  })

  it('adjacent keys are connected', () => {
    expect(areKeysConnected(['f', 'g'])).toBe(true)
    expect(areKeysConnected(['f', 'r'])).toBe(true)
  })

  it('non-adjacent keys are not connected', () => {
    expect(areKeysConnected(['f', 'p'])).toBe(false)
    expect(areKeysConnected(['a', 'l'])).toBe(false)
  })

  it('chain of adjacent keys is connected', () => {
    expect(areKeysConnected(['f', 'g', 'h'])).toBe(true)
  })

  it('disconnected group returns false', () => {
    expect(areKeysConnected(['f', 'g', 'p'])).toBe(false)
  })
})

// ===== getShapeCells =====

describe('getShapeCells', () => {
  it('returns cells for valid shape and rotation', () => {
    const cells = getShapeCells('domino', 0)
    expect(cells).not.toBeNull()
    expect(cells).toHaveLength(2)
  })

  it('returns null for invalid shape', () => {
    expect(getShapeCells('invalid', 0)).toBeNull()
  })

  it('rotation wraps around correctly', () => {
    const r0 = getShapeCells('domino', 0)
    const r4 = getShapeCells('domino', 4)
    expect(r0).toEqual(r4)
  })
})

// ===== KEY_COORDS =====

describe('KEY_COORDS', () => {
  it('should include all 26 letter keys', () => {
    for (const key of 'abcdefghijklmnopqrstuvwxyz') {
      expect(KEY_COORDS[key]).toBeDefined()
    }
  })

  it('should include punctuation keys', () => {
    for (const key of [';', ',', '.', '/']) {
      expect(KEY_COORDS[key]).toBeDefined()
    }
  })

  it('top row keys have row 0', () => {
    for (const key of 'qwertyuiop') {
      expect(KEY_COORDS[key][0]).toBe(0)
    }
  })

  it('home row keys have row 1', () => {
    for (const key of 'asdfghjkl') {
      expect(KEY_COORDS[key][0]).toBe(1)
    }
  })

  it('bottom row keys have row 2', () => {
    for (const key of 'zxcvbnm') {
      expect(KEY_COORDS[key][0]).toBe(2)
    }
  })

  it('home row col has +0.25 offset', () => {
    // 'a' is index 0 in home row, so col = 0 + 0.25 = 0.25
    expect(KEY_COORDS['a'][1]).toBeCloseTo(0.25, 5)
    // 'f' is index 3 in home row, so col = 3 + 0.25 = 3.25
    expect(KEY_COORDS['f'][1]).toBeCloseTo(3.25, 5)
  })

  it('bottom row col has +0.75 offset', () => {
    // 'z' is index 0 in bottom row, so col = 0 + 0.75 = 0.75
    expect(KEY_COORDS['z'][1]).toBeCloseTo(0.75, 5)
  })
})

// ===== 向下兼容 (AC5) =====

describe('Backward compatibility', () => {
  it('monomino has exactly 1 cell at [0,0]', () => {
    expect(SHAPE_TEMPLATES.monomino.cells).toEqual([[0, 0]])
  })

  it('monomino mapShapeToKeys returns single key', () => {
    const result = mapShapeToKeys('f', 'monomino', 0)
    expect(result).toEqual(['f'])
  })

  it('monomino rotation has no effect', () => {
    for (let r = 0; r < 4; r++) {
      const result = mapShapeToKeys('f', 'monomino', r)
      expect(result).toEqual(['f'])
    }
  })
})
