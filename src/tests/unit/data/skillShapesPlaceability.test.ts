// ============================================
// Story 60.1 follow-up: skillShapes placeability filter
// ============================================
// 防止 "QWER 顶行无法放置主斜 domino" 等"理论旋转"形状残留导致的 bug。

import { describe, it, expect } from 'vitest'
import {
  SHAPE_TEMPLATES,
  getShapeRotationCount,
  getShapeCells,
  mapShapeToKeys,
  normalizeRotation,
} from '../../../src/data/skillShapes'
import { KEYBOARD_ROWS } from '../../../src/core/constants'

const TOP_ROW = KEYBOARD_ROWS[0]

describe('skillShapes · placeability filter (Story 60.1 follow-up)', () => {
  it('每个 shape 至少保留 1 个 rotation', () => {
    for (const id of Object.keys(SHAPE_TEMPLATES)) {
      expect(getShapeRotationCount(id)).toBeGreaterThanOrEqual(1)
    }
  })

  it('每个 rotation 在顶行（QWERTY）至少有 1 个 anchor 能放下', () => {
    for (const id of Object.keys(SHAPE_TEMPLATES)) {
      const rotCount = getShapeRotationCount(id)
      for (let r = 0; r < rotCount; r++) {
        const ok = TOP_ROW.some(k => mapShapeToKeys(k, id, r, false))
        expect(ok, `${id} rot ${r} 顶行无 anchor 可放下`).toBe(true)
      }
    }
  })

  it('每个 rotation 至少有 5 个字母键 anchor 能放下', () => {
    for (const id of Object.keys(SHAPE_TEMPLATES)) {
      const rotCount = getShapeRotationCount(id)
      for (let r = 0; r < rotCount; r++) {
        let ok = 0
        for (const row of KEYBOARD_ROWS) {
          for (const k of row) {
            if (mapShapeToKeys(k, id, r, false)) ok++
          }
        }
        expect(ok, `${id} rot ${r} 仅 ${ok} 个 anchor 可放`).toBeGreaterThanOrEqual(5)
      }
    }
  })

  it('domino 不再存在主斜 [[0,0],[1,1]] rotation（用户报告的 bug）', () => {
    const rotCount = getShapeRotationCount('domino')
    expect(rotCount).toBe(3)
    for (let r = 0; r < rotCount; r++) {
      const cells = getShapeCells('domino', r)
      expect(cells).not.toEqual([[0, 0], [1, 1]])
    }
  })

  it('domino 每个保留 rotation 都能在 Q 锚点放下（具体回归用例）', () => {
    const rotCount = getShapeRotationCount('domino')
    let workableAtQ = 0
    for (let r = 0; r < rotCount; r++) {
      if (mapShapeToKeys('q', 'domino', r, false)) workableAtQ++
    }
    // Q 角落只有 2 个邻居 (w, a)，至少能装 rot 0 (qw) 和 rot 1 (qa)
    expect(workableAtQ).toBeGreaterThanOrEqual(2)
  })
})

describe('skillShapes · normalizeRotation (老存档 migration)', () => {
  it('rotation 在范围内时不变', () => {
    expect(normalizeRotation('domino', 0)).toBe(0)
    expect(normalizeRotation('domino', 1)).toBe(1)
    expect(normalizeRotation('domino', 2)).toBe(2)
  })

  it('超界 rotation wrap 到有效范围', () => {
    // domino 现 3 rotations，老存档 rotation=3 → 应 wrap 到 0
    expect(normalizeRotation('domino', 3)).toBe(0)
    expect(normalizeRotation('domino', 4)).toBe(1)
    // tetromino_T 现 10 rotations，老存档 rotation=11 → 应 wrap 到 1
    expect(normalizeRotation('tetromino_T', 11)).toBe(1)
  })

  it('未知 shapeId 退化为 0', () => {
    expect(normalizeRotation('nonexistent', 5)).toBe(0)
  })

  it('负数 rotation 也能 wrap', () => {
    expect(normalizeRotation('domino', -1)).toBe(2) // -1 mod 3 → 2
  })

  it('monomino 永远返回 0', () => {
    expect(normalizeRotation('monomino', 0)).toBe(0)
    expect(normalizeRotation('monomino', 5)).toBe(0)
  })
})
