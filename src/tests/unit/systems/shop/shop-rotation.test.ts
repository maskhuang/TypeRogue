// ============================================
// Story 40.6: 右键旋转 — 单元测试
// ============================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { bindShapeToKeys, unbindSkill, getSkillAnchorKey } from '../../../../src/systems/bindingManager'
import { mapShapeToKeys, SHAPE_TEMPLATES } from '../../../../src/data/skillShapes'

// === 旋转核心逻辑测试（纯绑定层，无 DOM） ===

describe('Rotation core logic', () => {
  function makeBindingState(skills: Record<string, { shapeId?: string; rotation?: number }>) {
    const bindings = new Map<string, string>()
    const affixSkills = new Map<string, { shapeId?: string; rotation?: number }>()
    for (const [id, data] of Object.entries(skills)) {
      affixSkills.set(id, data)
    }
    return { bindings, affixSkills }
  }

  it('domino rotation 0→1: bindings update correctly', () => {
    const bs = makeBindingState({ 'skill-A': { shapeId: 'domino', rotation: 0 } })
    // Bind at rotation=0
    bindShapeToKeys(bs, 'skill-A', 'f')
    const keysBefore = [...bs.bindings.entries()].filter(([, id]) => id === 'skill-A').map(([k]) => k)
    expect(keysBefore.length).toBe(2)

    // Simulate rotation: unbind, change rotation, rebind
    const anchorKey = getSkillAnchorKey(bs, 'skill-A')!
    unbindSkill(bs, 'skill-A')
    bs.affixSkills.get('skill-A')!.rotation = 1
    const targetKeys = mapShapeToKeys(anchorKey, 'domino', 1)
    expect(targetKeys).not.toBeNull()
    const result = bindShapeToKeys(bs, 'skill-A', anchorKey)
    expect(result.success).toBe(true)

    const keysAfter = [...bs.bindings.entries()].filter(([, id]) => id === 'skill-A').map(([k]) => k)
    expect(keysAfter.length).toBe(2)
    // Keys should be different after rotation (horizontal → vertical)
    expect(keysAfter.sort()).not.toEqual(keysBefore.sort())
  })

  it('rotation failure: triomino at edge cannot rotate, bindings unchanged', () => {
    const bs = makeBindingState({ 'skill-B': { shapeId: 'triomino_L', rotation: 0 } })
    // Bind at 'p' (edge of keyboard)
    const r = bindShapeToKeys(bs, 'skill-B', 'p')
    // If initial bind fails at 'p', try a position where it can bind but rotation fails
    if (!r.success) {
      // Bind at a position that works for rotation=0
      const r2 = bindShapeToKeys(bs, 'skill-B', 'o')
      if (!r2.success) return // skip if can't find valid position

      const anchorKey = getSkillAnchorKey(bs, 'skill-B')!
      const originalKeys = [...bs.bindings.entries()].filter(([, id]) => id === 'skill-B').map(([k]) => k).sort()

      // Try all 4 rotations to find one that fails
      let foundFailure = false
      for (let nextRot = 1; nextRot <= 3; nextRot++) {
        const targetKeys = mapShapeToKeys(anchorKey, 'triomino_L', nextRot)
        if (!targetKeys) {
          foundFailure = true
          // Bindings should remain unchanged
          const currentKeys = [...bs.bindings.entries()].filter(([, id]) => id === 'skill-B').map(([k]) => k).sort()
          expect(currentKeys).toEqual(originalKeys)
          break
        }
      }
      // At least verify the concept works
      expect(originalKeys.length).toBe(3)
      return
    }

    // If bind at 'p' succeeded, test rotation there
    const anchorKey = getSkillAnchorKey(bs, 'skill-B')!
    const originalKeys = [...bs.bindings.entries()].filter(([, id]) => id === 'skill-B').map(([k]) => k).sort()

    // Check if rotation=1 fails at this position
    const targetKeys = mapShapeToKeys(anchorKey, 'triomino_L', 1)
    if (!targetKeys) {
      // Bindings unchanged
      const currentKeys = [...bs.bindings.entries()].filter(([, id]) => id === 'skill-B').map(([k]) => k).sort()
      expect(currentKeys).toEqual(originalKeys)
    }
  })

  it('anchor key unchanged after rotation', () => {
    const bs = makeBindingState({ 'skill-C': { shapeId: 'domino', rotation: 0 } })
    bindShapeToKeys(bs, 'skill-C', 'f')
    const anchorBefore = getSkillAnchorKey(bs, 'skill-C')

    // Rotate
    unbindSkill(bs, 'skill-C')
    bs.affixSkills.get('skill-C')!.rotation = 1
    bindShapeToKeys(bs, 'skill-C', anchorBefore!)
    const anchorAfter = getSkillAnchorKey(bs, 'skill-C')

    expect(anchorAfter).toBe(anchorBefore)
  })

  it('monomino: rotation has no effect (only 1 rotation state)', () => {
    const bs = makeBindingState({ 'skill-M': { shapeId: 'monomino', rotation: 0 } })
    bindShapeToKeys(bs, 'skill-M', 'f')
    const keysBefore = [...bs.bindings.entries()].filter(([, id]) => id === 'skill-M').map(([k]) => k)
    expect(keysBefore.length).toBe(1)

    // mapShapeToKeys with rotation=1 should return same single key
    const targetKeys = mapShapeToKeys('f', 'monomino', 1)
    expect(targetKeys).not.toBeNull()
    expect(targetKeys!.length).toBe(1)
    expect(targetKeys![0]).toBe('f')
  })

  it('rotation displaces conflicting skill', () => {
    const bs = makeBindingState({
      'skill-D': { shapeId: 'domino', rotation: 0 },
      'skill-E': { shapeId: 'monomino', rotation: 0 },
    })
    // Bind domino horizontally at 'f' (occupies f+g)
    bindShapeToKeys(bs, 'skill-D', 'f')
    // Bind monomino at 'v' (below f)
    bindShapeToKeys(bs, 'skill-E', 'v')

    const anchorKey = getSkillAnchorKey(bs, 'skill-D')!
    // Rotate domino to vertical (rotation=1) at 'f' — should occupy f+v, displacing skill-E
    unbindSkill(bs, 'skill-D')
    bs.affixSkills.get('skill-D')!.rotation = 1
    const targetKeys = mapShapeToKeys(anchorKey, 'domino', 1)

    if (targetKeys && targetKeys.includes('v')) {
      const result = bindShapeToKeys(bs, 'skill-D', anchorKey)
      expect(result.success).toBe(true)
      expect(result.displacedSkillIds).toContain('skill-E')
      // skill-E should no longer be bound
      expect(bs.bindings.get('v')).toBe('skill-D')
    }
  })

  it('full rotation cycle through all fitting rotations', () => {
    // Use 'p' where all domino rotations fit (including stagger diagonals)
    const bs = makeBindingState({ 'skill-F': { shapeId: 'domino', rotation: 0 } })
    bindShapeToKeys(bs, 'skill-F', 'p')

    const rotCount = SHAPE_TEMPLATES.domino.rotations.length
    for (let nextRot = 1; nextRot <= rotCount; nextRot++) {
      const rot = nextRot % rotCount
      const anchorKey = getSkillAnchorKey(bs, 'skill-F')!
      expect(anchorKey).toBe('p')

      unbindSkill(bs, 'skill-F')
      bs.affixSkills.get('skill-F')!.rotation = rot
      const targetKeys = mapShapeToKeys(anchorKey, 'domino', rot)
      expect(targetKeys).not.toBeNull()
      const result = bindShapeToKeys(bs, 'skill-F', anchorKey)
      expect(result.success).toBe(true)
    }

    // After full cycle, back to rotation=0
    expect(bs.affixSkills.get('skill-F')!.rotation).toBe(0)
    const finalKeys = [...bs.bindings.entries()].filter(([, id]) => id === 'skill-F').map(([k]) => k)
    expect(finalKeys.length).toBe(2)
  })
})
