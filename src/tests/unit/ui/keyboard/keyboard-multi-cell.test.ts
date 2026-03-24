// ============================================
// 打字肉鸽 - Story 40.7 多格技能键盘可视化单元测试
// ============================================
// 测试纯函数：computeEdgeMasks, distributeAffixDots

import { describe, it, expect } from 'vitest'
import { computeEdgeMasks, distributeAffixDots } from '../../../../src/ui/keyboard/KeyboardVisualizer'

// QWERTY 键位行列坐标（与 KeyboardVisualizer.ROWS 一致）
function buildKeyRowCol(): Map<string, { row: number; col: number }> {
  const ROWS = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ]
  const map = new Map<string, { row: number; col: number }>()
  ROWS.forEach((row, rowIndex) => {
    row.forEach((keyName, colIndex) => {
      map.set(keyName, { row: rowIndex, col: colIndex })
    })
  })
  return map
}

describe('computeEdgeMasks', () => {
  const keyRowCol = buildKeyRowCol()

  it('7.1: domino 水平 (F+G) → F.right=false, G.left=false, 其余 true', () => {
    const skillKeyMap = new Map([['skill1', ['F', 'G']]])
    const masks = computeEdgeMasks(skillKeyMap, keyRowCol)

    const fMask = masks.get('F')!
    expect(fMask.top).toBe(true)
    expect(fMask.right).toBe(false) // 与 G 共享
    expect(fMask.bottom).toBe(true)
    expect(fMask.left).toBe(true)

    const gMask = masks.get('G')!
    expect(gMask.top).toBe(true)
    expect(gMask.right).toBe(true)
    expect(gMask.bottom).toBe(true)
    expect(gMask.left).toBe(false) // 与 F 共享
  })

  it('7.2: domino 垂直 (F+V 跨行) → 全部四边 true（跨行不共享边）', () => {
    const skillKeyMap = new Map([['skill1', ['F', 'V']]])
    const masks = computeEdgeMasks(skillKeyMap, keyRowCol)

    const fMask = masks.get('F')!
    expect(fMask.top).toBe(true)
    expect(fMask.right).toBe(true)
    expect(fMask.bottom).toBe(true)
    expect(fMask.left).toBe(true)

    const vMask = masks.get('V')!
    expect(vMask.top).toBe(true)
    expect(vMask.right).toBe(true)
    expect(vMask.bottom).toBe(true)
    expect(vMask.left).toBe(true)
  })

  it('7.3: L 形 triomino (E+R+R 下 → E+R+D) → 内外边正确', () => {
    // E(row0,col2) + R(row0,col3) + D(row1,col2) — L 形
    // E-R 同行相邻：E.right=false, R.left=false
    // E-D 跨行：不共享边
    const skillKeyMap = new Map([['skill1', ['E', 'R', 'D']]])
    const masks = computeEdgeMasks(skillKeyMap, keyRowCol)

    const eMask = masks.get('E')!
    expect(eMask.top).toBe(true)
    expect(eMask.right).toBe(false) // 与 R 共享
    expect(eMask.bottom).toBe(true) // D 跨行，不共享
    expect(eMask.left).toBe(true)

    const rMask = masks.get('R')!
    expect(rMask.top).toBe(true)
    expect(rMask.right).toBe(true)
    expect(rMask.bottom).toBe(true)
    expect(rMask.left).toBe(false) // 与 E 共享

    const dMask = masks.get('D')!
    expect(dMask.top).toBe(true) // E 跨行，不共享
    expect(dMask.right).toBe(true)
    expect(dMask.bottom).toBe(true)
    expect(dMask.left).toBe(true)
  })

  it('7.7: monomino (单格技能) → edgeMask 全 true（向后兼容）', () => {
    const skillKeyMap = new Map([['skill1', ['F']]])
    const masks = computeEdgeMasks(skillKeyMap, keyRowCol)

    const fMask = masks.get('F')!
    expect(fMask.top).toBe(true)
    expect(fMask.right).toBe(true)
    expect(fMask.bottom).toBe(true)
    expect(fMask.left).toBe(true)
  })

  it('横向三连 (F+G+H) → 中间格子左右都移除', () => {
    const skillKeyMap = new Map([['skill1', ['F', 'G', 'H']]])
    const masks = computeEdgeMasks(skillKeyMap, keyRowCol)

    const fMask = masks.get('F')!
    expect(fMask.left).toBe(true)
    expect(fMask.right).toBe(false) // 与 G 共享

    const gMask = masks.get('G')!
    expect(gMask.left).toBe(false)  // 与 F 共享
    expect(gMask.right).toBe(false) // 与 H 共享

    const hMask = masks.get('H')!
    expect(hMask.left).toBe(false)  // 与 G 共享
    expect(hMask.right).toBe(true)
  })

  it('未绑定键保持全 true', () => {
    const skillKeyMap = new Map([['skill1', ['F', 'G']]])
    const masks = computeEdgeMasks(skillKeyMap, keyRowCol)

    // Q 未参与任何技能绑定
    const qMask = masks.get('Q')!
    expect(qMask.top).toBe(true)
    expect(qMask.right).toBe(true)
    expect(qMask.bottom).toBe(true)
    expect(qMask.left).toBe(true)
  })

  it('多个技能独立计算', () => {
    const skillKeyMap = new Map([
      ['skill1', ['F', 'G']],
      ['skill2', ['J', 'K']],
    ])
    const masks = computeEdgeMasks(skillKeyMap, keyRowCol)

    expect(masks.get('F')!.right).toBe(false) // skill1 内部
    expect(masks.get('G')!.left).toBe(false)

    expect(masks.get('J')!.right).toBe(false) // skill2 内部
    expect(masks.get('K')!.left).toBe(false)

    // F 和 J 不相邻（不同技能）
    expect(masks.get('G')!.right).toBe(true)
    expect(masks.get('J')!.left).toBe(true) // H 在中间
  })
})

describe('distributeAffixDots', () => {
  it('7.4: 3 词条 / 3 格子 → 每格 1 点', () => {
    const result = distributeAffixDots(3, 3)
    expect(result).toEqual([1, 1, 1])
  })

  it('7.5: 3 词条 / 2 格子 → [2, 1]（余数分配给第一个格子）', () => {
    const result = distributeAffixDots(3, 2)
    expect(result).toEqual([2, 1])
  })

  it('2 词条 / 3 格子 → [1, 1, 0]', () => {
    const result = distributeAffixDots(2, 3)
    expect(result).toEqual([1, 1, 0])
  })

  it('1 词条 / 4 格子 → [1, 0, 0, 0]', () => {
    const result = distributeAffixDots(1, 4)
    expect(result).toEqual([1, 0, 0, 0])
  })

  it('0 词条 → 全零', () => {
    const result = distributeAffixDots(0, 3)
    expect(result).toEqual([0, 0, 0])
  })

  it('单格 → 全部分配', () => {
    const result = distributeAffixDots(3, 1)
    expect(result).toEqual([3])
  })

  it('cellCount=0 → 空数组', () => {
    const result = distributeAffixDots(3, 0)
    expect(result).toEqual([])
  })
})

describe('skillKeyGroups 分组逻辑', () => {
  it('7.8: 多键技能正确分组', () => {
    // 模拟 syncBindings 中的分组逻辑
    const bindings = new Map([
      ['f', 'skill1'], ['g', 'skill1'],
      ['j', 'skill2'],
    ])
    const skillKeyGroups = new Map<string, string[]>()
    for (const [key, skillId] of bindings) {
      const upper = key.toUpperCase()
      if (!skillKeyGroups.has(skillId)) {
        skillKeyGroups.set(skillId, [])
      }
      skillKeyGroups.get(skillId)!.push(upper)
    }

    expect(skillKeyGroups.get('skill1')).toEqual(['F', 'G'])
    expect(skillKeyGroups.get('skill2')).toEqual(['J'])
  })

  it('7.6: 锚点识别 — 第一个键即为锚点', () => {
    const bindings = new Map([
      ['f', 'skill1'], ['g', 'skill1'], ['h', 'skill1'],
    ])
    const skillKeyGroups = new Map<string, string[]>()
    for (const [key, skillId] of bindings) {
      const upper = key.toUpperCase()
      if (!skillKeyGroups.has(skillId)) {
        skillKeyGroups.set(skillId, [])
      }
      skillKeyGroups.get(skillId)!.push(upper)
    }

    const keys = skillKeyGroups.get('skill1')!
    // 第一个键是锚点
    expect(keys[0]).toBe('F')
    // isAnchor 判定逻辑
    for (const k of keys) {
      const isAnchor = keys[0] === k
      if (k === 'F') {
        expect(isAnchor).toBe(true)
      } else {
        expect(isAnchor).toBe(false)
      }
    }
  })
})
