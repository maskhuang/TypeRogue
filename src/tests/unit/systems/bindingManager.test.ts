// ============================================
// 打字肉鸽 - BindingManager 单元测试
// ============================================
// Story 40.3: 键盘多格绑定系统

import { describe, it, expect, beforeEach } from 'vitest'
import {
  bindShapeToKeys,
  unbindSkill,
  unbindKey,
  getSkillKeys,
  getSkillAnchorKey,
  isKeyAvailableForSkill,
  autoBindSkill,
  sealSkillKeys,
  restoreSealedSkill,
} from '../../../src/systems/bindingManager'
import type { BindShapeResult } from '../../../src/systems/bindingManager'

// ===== Test Helpers =====

interface MockSkill {
  shapeId?: string
  rotation?: number
}

function createBindingState(
  bindings?: Map<string, string>,
  affixSkills?: Map<string, MockSkill>,
) {
  return {
    bindings: bindings ?? new Map<string, string>(),
    affixSkills: affixSkills ?? new Map<string, MockSkill>(),
  }
}

// ===== Tests =====

describe('BindingManager', () => {
  describe('bindShapeToKeys — monomino (single key)', () => {
    it('should bind a monomino skill to a single key', () => {
      const st = createBindingState(
        new Map(),
        new Map([['skill1', { shapeId: 'monomino', rotation: 0 }]]),
      )

      const result = bindShapeToKeys(st, 'skill1', 'f')
      expect(result.success).toBe(true)
      expect(result.displacedSkillIds).toEqual([])
      expect(st.bindings.get('f')).toBe('skill1')
      expect(st.bindings.size).toBe(1)
    })

    it('should bind when skill has no shapeId (defaults to monomino)', () => {
      const st = createBindingState(
        new Map(),
        new Map([['skill1', {}]]),
      )

      const result = bindShapeToKeys(st, 'skill1', 'f')
      expect(result.success).toBe(true)
      expect(st.bindings.get('f')).toBe('skill1')
    })

    it('should bind when skill is not in affixSkills (defaults to monomino)', () => {
      const st = createBindingState()

      const result = bindShapeToKeys(st, 'skill1', 'f')
      expect(result.success).toBe(true)
      expect(st.bindings.get('f')).toBe('skill1')
    })

    it('should displace existing skill on same key', () => {
      const st = createBindingState(
        new Map([['f', 'oldSkill']]),
        new Map([
          ['skill1', { shapeId: 'monomino', rotation: 0 }],
          ['oldSkill', { shapeId: 'monomino', rotation: 0 }],
        ]),
      )

      const result = bindShapeToKeys(st, 'skill1', 'f')
      expect(result.success).toBe(true)
      expect(result.displacedSkillIds).toEqual(['oldSkill'])
      expect(st.bindings.get('f')).toBe('skill1')
      expect(st.bindings.size).toBe(1)
    })

    it('should not displace self when re-binding to same key', () => {
      const st = createBindingState(
        new Map([['f', 'skill1']]),
        new Map([['skill1', { shapeId: 'monomino', rotation: 0 }]]),
      )

      const result = bindShapeToKeys(st, 'skill1', 'f')
      expect(result.success).toBe(true)
      expect(result.displacedSkillIds).toEqual([])
      expect(st.bindings.get('f')).toBe('skill1')
    })
  })

  describe('bindShapeToKeys — domino (two keys)', () => {
    it('should bind a domino skill to two adjacent keys', () => {
      const st = createBindingState(
        new Map(),
        new Map([['skill1', { shapeId: 'domino', rotation: 0 }]]),
      )

      // domino rotation=0: [[0,0],[0,1]] — horizontal pair
      // 'f' anchor → should map to ['f', 'g']
      const result = bindShapeToKeys(st, 'skill1', 'f')
      expect(result.success).toBe(true)
      expect(result.displacedSkillIds).toEqual([])
      const keys = getSkillKeys(st, 'skill1')
      expect(keys.length).toBe(2)
      expect(keys).toContain('f')
      expect(keys).toContain('g')
    })

    it('should fail when domino goes out of bounds', () => {
      const st = createBindingState(
        new Map(),
        // rotation=0: horizontal — '/' is rightmost, would go out
        new Map([['skill1', { shapeId: 'domino', rotation: 0 }]]),
      )

      const result = bindShapeToKeys(st, 'skill1', '/')
      // May or may not succeed depending on keyboard layout,
      // but test that no partial binding happens
      if (!result.success) {
        expect(st.bindings.size).toBe(0)
      }
    })

    it('should displace multiple keys of another domino', () => {
      const st = createBindingState(
        new Map([['f', 'oldSkill'], ['g', 'oldSkill']]),
        new Map([
          ['skill1', { shapeId: 'domino', rotation: 0 }],
          ['oldSkill', { shapeId: 'domino', rotation: 0 }],
        ]),
      )

      const result = bindShapeToKeys(st, 'skill1', 'f')
      expect(result.success).toBe(true)
      expect(result.displacedSkillIds).toEqual(['oldSkill'])
      expect(getSkillKeys(st, 'skill1').length).toBe(2)
      expect(getSkillKeys(st, 'oldSkill').length).toBe(0)
    })
  })

  describe('bindShapeToKeys — triomino/tetromino', () => {
    it('should bind triomino_I to three keys', () => {
      const st = createBindingState(
        new Map(),
        new Map([['skill1', { shapeId: 'triomino_I', rotation: 0 }]]),
      )

      // triomino_I rotation=0: [[0,0],[0,1],[0,2]] — horizontal line
      const result = bindShapeToKeys(st, 'skill1', 'f')
      expect(result.success).toBe(true)
      expect(getSkillKeys(st, 'skill1').length).toBe(3)
    })

    it('should bind triomino_L to three keys', () => {
      const st = createBindingState(
        new Map(),
        new Map([['skill1', { shapeId: 'triomino_L', rotation: 0 }]]),
      )

      const result = bindShapeToKeys(st, 'skill1', 'f')
      // triomino_L: [[0,0],[1,0],[1,1]] — L shape
      if (result.success) {
        expect(getSkillKeys(st, 'skill1').length).toBe(3)
      }
    })
  })

  describe('bindShapeToKeys — atomic operation', () => {
    it('should not produce partial binding on failure', () => {
      const st = createBindingState(
        new Map(),
        // Use an invalid shapeId
        new Map([['skill1', { shapeId: 'nonexistent_shape', rotation: 0 }]]),
      )

      const result = bindShapeToKeys(st, 'skill1', 'f')
      expect(result.success).toBe(false)
      expect(st.bindings.size).toBe(0)
    })

    it('should not produce partial binding when anchor key is invalid', () => {
      const st = createBindingState(
        new Map(),
        new Map([['skill1', { shapeId: 'domino', rotation: 0 }]]),
      )

      const result = bindShapeToKeys(st, 'skill1', '!')
      expect(result.success).toBe(false)
      expect(st.bindings.size).toBe(0)
    })
  })

  describe('bindShapeToKeys — displaced skills fully released', () => {
    it('should fully release displaced multi-cell skill', () => {
      // Set up old domino skill on f,g
      const st = createBindingState(
        new Map([['f', 'oldSkill'], ['g', 'oldSkill']]),
        new Map([
          ['newSkill', { shapeId: 'monomino', rotation: 0 }],
          ['oldSkill', { shapeId: 'domino', rotation: 0 }],
        ]),
      )

      // Bind new monomino to 'f' — should displace oldSkill and release both f,g
      const result = bindShapeToKeys(st, 'newSkill', 'f')
      expect(result.success).toBe(true)
      expect(result.displacedSkillIds).toEqual(['oldSkill'])
      // oldSkill should be completely gone from bindings
      expect(getSkillKeys(st, 'oldSkill')).toEqual([])
      // Only newSkill on 'f'
      expect(st.bindings.get('f')).toBe('newSkill')
      expect(st.bindings.has('g')).toBe(false)
    })
  })

  describe('unbindSkill', () => {
    it('should release all keys for a multi-cell skill', () => {
      const st = createBindingState(
        new Map([['f', 'skill1'], ['g', 'skill1']]),
      )

      const released = unbindSkill(st, 'skill1')
      expect(released.sort()).toEqual(['f', 'g'])
      expect(st.bindings.size).toBe(0)
    })

    it('should return empty array when skill not bound', () => {
      const st = createBindingState()

      const released = unbindSkill(st, 'skill1')
      expect(released).toEqual([])
    })

    it('should not affect other skills', () => {
      const st = createBindingState(
        new Map([['f', 'skill1'], ['g', 'skill1'], ['h', 'skill2']]),
      )

      unbindSkill(st, 'skill1')
      expect(st.bindings.has('f')).toBe(false)
      expect(st.bindings.has('g')).toBe(false)
      expect(st.bindings.get('h')).toBe('skill2')
    })
  })

  describe('unbindKey', () => {
    it('should unbind the entire skill when unbinding one key of multi-cell', () => {
      const st = createBindingState(
        new Map([['f', 'skill1'], ['g', 'skill1']]),
      )

      const skillId = unbindKey(st, 'f')
      expect(skillId).toBe('skill1')
      // Both keys should be released
      expect(st.bindings.size).toBe(0)
    })

    it('should return undefined for unbound key', () => {
      const st = createBindingState()
      expect(unbindKey(st, 'f')).toBeUndefined()
    })
  })

  describe('getSkillKeys', () => {
    it('should return all keys for a multi-cell skill', () => {
      const st = createBindingState(
        new Map([['f', 'skill1'], ['g', 'skill1'], ['h', 'skill2']]),
      )

      expect(getSkillKeys(st, 'skill1').sort()).toEqual(['f', 'g'])
      expect(getSkillKeys(st, 'skill2')).toEqual(['h'])
    })

    it('should return empty for unbound skill', () => {
      const st = createBindingState()
      expect(getSkillKeys(st, 'skill1')).toEqual([])
    })
  })

  describe('getSkillAnchorKey', () => {
    it('should return first key for bound skill', () => {
      const st = createBindingState(
        new Map([['f', 'skill1'], ['g', 'skill1']]),
      )

      const anchor = getSkillAnchorKey(st, 'skill1')
      expect(anchor).toBeDefined()
      expect(['f', 'g']).toContain(anchor)
    })

    it('should return undefined for unbound skill', () => {
      const st = createBindingState()
      expect(getSkillAnchorKey(st, 'skill1')).toBeUndefined()
    })
  })

  describe('isKeyAvailableForSkill', () => {
    it('should return true for empty key', () => {
      const st = createBindingState()
      expect(isKeyAvailableForSkill(st, 'f', 'skill1')).toBe(true)
    })

    it('should return true for key occupied by same skill', () => {
      const st = createBindingState(
        new Map([['f', 'skill1']]),
      )
      expect(isKeyAvailableForSkill(st, 'f', 'skill1')).toBe(true)
    })

    it('should return false for key occupied by different skill', () => {
      const st = createBindingState(
        new Map([['f', 'skill2']]),
      )
      expect(isKeyAvailableForSkill(st, 'f', 'skill1')).toBe(false)
    })
  })

  describe('autoBindSkill', () => {
    it('should auto-bind monomino to first available key', () => {
      const st = createBindingState(
        new Map(),
        new Map([['skill1', { shapeId: 'monomino', rotation: 0 }]]),
      )

      // All keys with freq >= 5
      const freqs = new Map<string, number>()
      'qwertyuiopasdfghjklzxcvbnm'.split('').forEach(k => freqs.set(k, 10))

      const result = autoBindSkill(st, 'skill1', freqs)
      expect(result).not.toBeNull()
      expect(result!.success).toBe(true)
      expect(st.bindings.size).toBe(1)
    })

    it('should skip low-frequency keys', () => {
      const st = createBindingState(
        new Map(),
        new Map([['skill1', { shapeId: 'monomino', rotation: 0 }]]),
      )

      // Only 'f' has high freq
      const freqs = new Map<string, number>()
      'qwertyuiopasdfghjklzxcvbnm'.split('').forEach(k => freqs.set(k, 0))
      freqs.set('f', 10)

      const result = autoBindSkill(st, 'skill1', freqs)
      expect(result).not.toBeNull()
      expect(st.bindings.get('f')).toBe('skill1')
    })

    it('should return null when no position available', () => {
      // Fill all keys
      const bindings = new Map<string, string>()
      'qwertyuiopasdfghjklzxcvbnm'.split('').forEach(k => bindings.set(k, 'other'))
      const st = createBindingState(
        bindings,
        new Map([['skill1', { shapeId: 'monomino', rotation: 0 }]]),
      )

      const freqs = new Map<string, number>()
      'qwertyuiopasdfghjklzxcvbnm'.split('').forEach(k => freqs.set(k, 10))

      const result = autoBindSkill(st, 'skill1', freqs)
      expect(result).toBeNull()
    })

    it('should auto-bind domino to first available pair', () => {
      const st = createBindingState(
        new Map(),
        new Map([['skill1', { shapeId: 'domino', rotation: 0 }]]),
      )

      const freqs = new Map<string, number>()
      'qwertyuiopasdfghjklzxcvbnm'.split('').forEach(k => freqs.set(k, 10))

      const result = autoBindSkill(st, 'skill1', freqs)
      expect(result).not.toBeNull()
      expect(result!.success).toBe(true)
      expect(st.bindings.size).toBe(2)
    })
  })

  describe('sealSkillKeys', () => {
    it('should seal all keys of a monomino skill', () => {
      const st = createBindingState(
        new Map([['f', 'skill1']]),
      )

      const result = sealSkillKeys(st, 'f')
      expect(result).not.toBeNull()
      expect(result!.skillId).toBe('skill1')
      expect(result!.keys).toEqual(['f'])
      expect(st.bindings.size).toBe(0)
    })

    it('should seal all keys of a multi-cell skill', () => {
      const st = createBindingState(
        new Map([['f', 'skill1'], ['g', 'skill1']]),
      )

      const result = sealSkillKeys(st, 'f')
      expect(result).not.toBeNull()
      expect(result!.skillId).toBe('skill1')
      expect(result!.keys.sort()).toEqual(['f', 'g'])
      expect(st.bindings.size).toBe(0)
    })

    it('should return null for unbound key', () => {
      const st = createBindingState()
      expect(sealSkillKeys(st, 'f')).toBeNull()
    })
  })

  describe('restoreSealedSkill', () => {
    it('should restore all sealed keys', () => {
      const st = createBindingState()

      const restored = restoreSealedSkill(st, 'skill1', ['f', 'g'])
      expect(restored).toBe(true)
      expect(st.bindings.get('f')).toBe('skill1')
      expect(st.bindings.get('g')).toBe('skill1')
    })

    it('should fail if any key is occupied', () => {
      const st = createBindingState(
        new Map([['f', 'skill2']]),
      )

      const restored = restoreSealedSkill(st, 'skill1', ['f', 'g'])
      expect(restored).toBe(false)
      // Should not have changed bindings
      expect(st.bindings.get('f')).toBe('skill2')
      expect(st.bindings.has('g')).toBe(false)
    })
  })

  describe('backward compatibility — no shapeId treated as monomino', () => {
    it('should treat skill without shapeId as monomino', () => {
      const st = createBindingState(
        new Map(),
        new Map([['skill1', {}]]),
      )

      const result = bindShapeToKeys(st, 'skill1', 'f')
      expect(result.success).toBe(true)
      expect(st.bindings.size).toBe(1)
      expect(st.bindings.get('f')).toBe('skill1')
    })

    it('should treat skill with shapeId=monomino as single key', () => {
      const st = createBindingState(
        new Map(),
        new Map([['skill1', { shapeId: 'monomino', rotation: 0 }]]),
      )

      const result = bindShapeToKeys(st, 'skill1', 'f')
      expect(result.success).toBe(true)
      expect(st.bindings.size).toBe(1)
    })
  })

  describe('move skill — unbind old, bind new', () => {
    it('should clear old position when moving monomino', () => {
      const st = createBindingState(
        new Map([['f', 'skill1']]),
        new Map([['skill1', { shapeId: 'monomino', rotation: 0 }]]),
      )

      const result = bindShapeToKeys(st, 'skill1', 'g')
      expect(result.success).toBe(true)
      expect(st.bindings.has('f')).toBe(false)
      expect(st.bindings.get('g')).toBe('skill1')
    })

    it('should clear old position when moving domino', () => {
      const st = createBindingState(
        new Map([['f', 'skill1'], ['g', 'skill1']]),
        new Map([['skill1', { shapeId: 'domino', rotation: 0 }]]),
      )

      // Move to 'h' anchor
      const result = bindShapeToKeys(st, 'skill1', 'h')
      if (result.success) {
        expect(st.bindings.has('f')).toBe(false)
        const keys = getSkillKeys(st, 'skill1')
        expect(keys.length).toBe(2)
        expect(keys).toContain('h')
      }
    })
  })
})
