// ============================================
// Story 40.4: 商店形状预览 — 单元测试
// ============================================

import { describe, it, expect } from 'vitest'
import { renderShapePreview, getShapeDescription } from '../../../../src/systems/shop'
import { getShapeCells, SHAPE_TEMPLATES } from '../../../../src/data/skillShapes'

describe('renderShapePreview', () => {
  it('returns empty string for monomino (rarity 0)', () => {
    expect(renderShapePreview('monomino', 0, 0)).toBe('')
  })

  it('returns empty string for empty/falsy shapeId', () => {
    expect(renderShapePreview('', 0, 1)).toBe('')
  })

  it('returns empty string for rarity 0 even with non-monomino shapeId', () => {
    expect(renderShapePreview('domino', 0, 0)).toBe('')
  })

  it('renders domino (rarity 1) with correct grid', () => {
    const html = renderShapePreview('domino', 0, 1)
    expect(html).toContain('shape-preview')
    expect(html).toContain('shape-preview-r1')
    // Domino rotation 0: [[0,0],[0,1]] → 1 row × 2 cols
    expect(html).toContain('grid-template-columns:repeat(2,1fr)')
    // 2 filled cells
    const filledCount = (html.match(/shape-cell filled/g) || []).length
    expect(filledCount).toBe(2)
  })

  it('renders domino rotation 1 with vertical layout', () => {
    const html = renderShapePreview('domino', 1, 1)
    expect(html).toContain('shape-preview-r1')
    // Domino rotation 1: [[0,0],[1,0]] → 2 rows × 1 col
    expect(html).toContain('grid-template-columns:repeat(1,1fr)')
    const filledCount = (html.match(/shape-cell filled/g) || []).length
    expect(filledCount).toBe(2)
  })

  it('renders triomino_L (rarity 2) with correct cells', () => {
    const html = renderShapePreview('triomino_L', 0, 2)
    expect(html).toContain('shape-preview-r2')
    const filledCount = (html.match(/shape-cell filled/g) || []).length
    expect(filledCount).toBe(3)
  })

  it('renders tetromino_T (rarity 3) with correct cells', () => {
    const html = renderShapePreview('tetromino_T', 0, 3)
    expect(html).toContain('shape-preview-r3')
    const filledCount = (html.match(/shape-cell filled/g) || []).length
    expect(filledCount).toBe(4)
  })

  it('includes empty cells in the grid', () => {
    // triomino_L rotation 0: [[0,0],[0,1],[1,0]] → 2×2 grid with 3 filled + 1 empty
    const html = renderShapePreview('triomino_L', 0, 2)
    const totalCells = (html.match(/shape-cell/g) || []).length
    const filledCells = (html.match(/shape-cell filled/g) || []).length
    expect(totalCells).toBe(4) // 2×2 = 4
    expect(filledCells).toBe(3)
    expect(totalCells - filledCells).toBe(1) // 1 empty cell
  })

  it('different rotations produce different grid layouts', () => {
    const html0 = renderShapePreview('domino', 0, 1)
    const html1 = renderShapePreview('domino', 1, 1)
    // rotation 0: 1×2, rotation 1: 2×1
    expect(html0).toContain('repeat(2,1fr)')
    expect(html1).toContain('repeat(1,1fr)')
    expect(html0).not.toBe(html1)
  })

  it('handles all tetromino shapes', () => {
    const tetrominoIds = ['tetromino_T', 'tetromino_L', 'tetromino_J', 'tetromino_S', 'tetromino_Z', 'tetromino_I', 'tetromino_O']
    for (const id of tetrominoIds) {
      const html = renderShapePreview(id, 0, 3)
      expect(html).toContain('shape-preview-r3')
      const filledCount = (html.match(/shape-cell filled/g) || []).length
      expect(filledCount).toBe(4)
    }
  })

  it('returns empty string for unknown shapeId', () => {
    expect(renderShapePreview('unknown_shape', 0, 2)).toBe('')
  })
})

describe('getShapeDescription', () => {
  it('returns empty string for monomino', () => {
    expect(getShapeDescription('monomino', 1)).toBe('')
  })

  it('returns empty string for empty shapeId', () => {
    expect(getShapeDescription('', 1)).toBe('')
  })

  it('returns empty string for cellCount <= 1', () => {
    expect(getShapeDescription('domino', 1)).toBe('')
  })

  it('returns correct description for domino', () => {
    const desc = getShapeDescription('domino', 2)
    expect(desc).toBe('占据 2 格 条形区域')
  })

  it('returns correct description for triomino_L', () => {
    const desc = getShapeDescription('triomino_L', 3)
    expect(desc).toBe('占据 3 格 L 形区域')
  })

  it('returns correct description for triomino_I', () => {
    const desc = getShapeDescription('triomino_I', 3)
    expect(desc).toBe('占据 3 格 I 形区域')
  })

  it('returns correct description for tetromino_T', () => {
    const desc = getShapeDescription('tetromino_T', 4)
    expect(desc).toBe('占据 4 格 T 形区域')
  })

  it('returns correct description for all tetrominoes', () => {
    const expected: Record<string, string> = {
      tetromino_T: '占据 4 格 T 形区域',
      tetromino_L: '占据 4 格 L 形区域',
      tetromino_J: '占据 4 格 J 形区域',
      tetromino_S: '占据 4 格 S 形区域',
      tetromino_Z: '占据 4 格 Z 形区域',
      tetromino_I: '占据 4 格 I 形区域',
      tetromino_O: '占据 4 格 O 形区域',
    }
    for (const [id, desc] of Object.entries(expected)) {
      expect(getShapeDescription(id, 4)).toBe(desc)
    }
  })

  it('returns generic description for unknown shape', () => {
    const desc = getShapeDescription('custom_shape', 5)
    expect(desc).toBe('占据 5 格区域')
  })
})

describe('renderShapePreview consistency with getShapeCells', () => {
  it('filled cell count matches getShapeCells length for all shapes and rotations', () => {
    for (const [shapeId, template] of Object.entries(SHAPE_TEMPLATES)) {
      if (shapeId === 'monomino') continue
      const rarity = template.cells.length <= 2 ? 1 : template.cells.length <= 3 ? 2 : 3
      for (let rot = 0; rot < template.rotations.length; rot++) {
        const cells = getShapeCells(shapeId, rot)
        const html = renderShapePreview(shapeId, rot, rarity)
        const filledCount = (html.match(/shape-cell filled/g) || []).length
        expect(filledCount).toBe(cells!.length)
      }
    }
  })
})
